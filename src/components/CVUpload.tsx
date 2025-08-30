import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateFile, generateSecureFilePath, logSecurityEvent } from "@/lib/security";

interface CVUploadProps {
  candidateId: string;
  onCVUploaded: (url: string) => void;
}

export const CVUpload = ({ candidateId, onCVUploaded }: CVUploadProps) => {
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Enhanced file validation
      const validation = validateFile(file, ['pdf', 'doc', 'docx'], 5);
      
      if (!validation.isValid) {
        toast({
          title: "Bestandsvalidatie mislukt",
          description: validation.errors.join(' '),
          variant: "destructive",
        });
        return;
      }
      
      setCvFile(file);
    }
  };

  const uploadCV = async () => {
    if (!cvFile) return;

    setUploading(true);
    try {
      // Generate secure file path
      const filePath = generateSecureFilePath(cvFile.name, candidateId);

      const { error: uploadError } = await supabase.storage
        .from('cv-uploads')
        .upload(filePath, cvFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Update candidate with CV path (relative path without bucket name)
      const { error: updateError } = await supabase
        .from("candidates")
        .update({ cv_url: filePath })
        .eq("id", candidateId);

      if (updateError) throw updateError;

      // Log security event
      await logSecurityEvent('cv_upload', {
        candidate_id: candidateId,
        file_name: cvFile.name,
        file_size: cvFile.size,
        file_path: filePath
      });

      toast({
        title: "CV geüpload",
        description: "Het CV is succesvol geüpload.",
      });

      onCVUploaded(filePath);
      setCvFile(null);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      console.error('Error uploading CV:', error);
      toast({
        title: "Upload fout",
        description: "Er is een fout opgetreden bij het uploaden van het CV.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">CV uploaden/vervangen</Label>
      <div className="flex gap-2">
        <Input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          className="flex-1"
          disabled={uploading}
        />
        <Button
          onClick={uploadCV}
          disabled={!cvFile || uploading}
          size="sm"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
      </div>
      {cvFile && (
        <p className="text-xs text-muted-foreground">
          Geselecteerd: {cvFile.name}
        </p>
      )}
    </div>
  );
};