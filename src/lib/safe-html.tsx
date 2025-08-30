import DOMPurify from 'dompurify';

interface SafeHtmlProps {
  html: string;
  className?: string;
}

export const SafeHtml = ({ html, className = "" }: SafeHtmlProps) => {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ADD_ATTR: ['target', 'rel'],
    FORBID_TAGS: ['script', 'style', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style']
  });

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};