import DOMPurify from 'dompurify';
import { supabase } from "@/integrations/supabase/client";

// Input sanitization utility
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

// HTML sanitization for rich text (allows basic formatting)
export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
};

// Enhanced file validation
export const validateFile = (file: File, allowedTypes: string[], maxSizeMB: number = 5) => {
  const errors: string[] = [];
  
  // Check file type
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!fileExtension || !allowedTypes.includes(fileExtension)) {
    errors.push(`Bestandstype niet toegestaan. Alleen ${allowedTypes.join(', ')} bestanden zijn toegestaan.`);
  }
  
  // Check MIME type
  const allowedMimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  
  const expectedMimeType = allowedMimeTypes[fileExtension as keyof typeof allowedMimeTypes];
  if (expectedMimeType && file.type !== expectedMimeType) {
    errors.push('Bestandstype komt niet overeen met de extensie.');
  }
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push(`Bestand is te groot. Maximum grootte is ${maxSizeMB}MB.`);
  }
  
  // Basic file name validation
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(file.name)) {
    errors.push('Bestandsnaam bevat ongeldige karakters.');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generate secure file path (RELATIVE to bucket, NO bucket prefix)
export const generateSecureFilePath = (originalName: string, candidateId: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop()?.toLowerCase();
  // Store only relative path e.g. "<candidateId>/<timestamp>-<random>.<ext>"
  return `${candidateId}/${timestamp}-${randomString}.${extension}`;
};

// Security logging utility
export const logSecurityEvent = async (eventType: string, details: any = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.rpc('log_security_event', {
        event_type: eventType,
        user_id: user.id,
        details: details
      });
    }
  } catch (error) {
    console.error('Security logging failed:', error);
  }
};

// Rate limiting utility (simple client-side implementation)
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 300000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs);
    
    if (validAttempts.length >= maxAttempts) {
      return false;
    }
    
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

// Content Security Policy helpers
export const cspNonce = () => {
  return Math.random().toString(36).substring(2, 15);
};

// XSS Protection for dynamic content
export const escapeHTML = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Secure data masking for external users
export const maskSensitiveData = (data: any, userRole: string) => {
  if (userRole === 'externe_recruiter') {
    return {
      ...data,
      email: data.email ? data.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '',
      phone: data.phone ? data.phone.replace(/(.{3})(.*)(.{2})/, '$1***$3') : ''
    };
  }
  
  if (userRole === 'medewerker') {
    return {
      ...data,
      salary_requirements: '***'
    };
  }
  
  return data;
};