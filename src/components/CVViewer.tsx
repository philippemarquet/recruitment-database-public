import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Download, Loader2, FileText, AlertCircle } from "lucide-react";

interface CVViewerProps {
  cvUrl: string | null;
  candidateName: string;
  candidateId: string;
}

export const CVViewer = ({ cvUrl, candidateName, candidateId }: CVViewerProps) => {
  const [loading, setLoading] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const { toast } = useToast();

  const extractStoragePath = (url: string): string | null => {
    try {
      // Extract path from signed URL or public URL
      if (url.includes('/storage/v1/object/sign/cv-uploads/')) {
        const match = url.match(/\/storage\/v1\/object\/sign\/cv-uploads\/(.+?)\?/);
        return match ? match[1] : null;
      }
      if (url.includes('/storage/v1/object/public/cv-uploads/')) {
        const match = url.match(/\/storage\/v1\/object\/public\/cv-uploads\/(.+)$/);
        return match ? match[1] : null;
      }
      
      // Handle stored paths - remove cv-uploads/ prefix if present
      let path = url;
      if (path.startsWith('cv-uploads/')) {
        path = path.substring('cv-uploads/'.length);
      }
      
      // If it's just a path (like "candidateId/filename" or with cv-uploads/ prefix)
      if (path.startsWith(candidateId + '/') || path.includes('/')) {
        return path;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting storage path:', error);
      return null;
    }
  };

  const generateFreshUrls = async () => {
    if (!cvUrl) return;
    
    setLoading(true);
    try {
      const storagePath = extractStoragePath(cvUrl);
      
      if (!storagePath) {
        throw new Error('Kon bestandspad niet bepalen uit CV URL');
      }

      // Determine file type from path
      const extension = storagePath.split('.').pop()?.toLowerCase() || '';
      setFileType(extension);

      // Generate signed URLs for viewing and downloading
      const { data: signedData, error: signedError } = await supabase.storage
        .from('cv-uploads')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (signedError) throw signedError;

      setViewerUrl(signedData.signedUrl);
      setDownloadUrl(signedData.signedUrl);
    } catch (error: any) {
      console.error('Error generating URLs:', error);
      toast({
        title: "Fout bij laden CV",
        description: error.message || "Kon CV niet laden voor weergave",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cvUrl) {
      generateFreshUrls();
    }
  }, [cvUrl]);

  const handleDownload = async () => {
    if (!cvUrl) return;
    setLoading(true);
    try {
      // Prefer signed URL to avoid requiring Storage RLS for downloads
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        // Let browser decide filename from headers
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: 'Download gestart',
          description: `CV van ${candidateName} wordt gedownload.`,
        });
        return;
      }

      // Fallback: use SDK download (requires RLS permissions)
      const storagePath = extractStoragePath(cvUrl);
      if (!storagePath) throw new Error('Kon bestandspad niet bepalen uit CV URL');

      const { data, error } = await supabase.storage
        .from('cv-uploads')
        .download(storagePath);
      if (error) throw error;
      if (!data) throw new Error('Geen data ontvangen bij download');

      const blobUrl = URL.createObjectURL(data);
      const filename = storagePath.split('/').pop() || `CV_${candidateName.replace(/\s+/g, '_')}`;

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast({
        title: 'Download gestart',
        description: `CV van ${candidateName} wordt gedownload.`,
      });
    } catch (error: any) {
      console.error('Error downloading CV:', error);
      toast({
        title: 'Download fout',
        description: error.message || 'Er is een fout opgetreden bij het downloaden van het CV.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!cvUrl) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">Geen CV beschikbaar</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={generateFreshUrls}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            CV bekijken
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>CV - {candidateName}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-background rounded border">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>CV laden...</span>
                </div>
              </div>
            ) : viewerUrl ? (
              fileType === 'pdf' ? (
                <iframe
                  src={viewerUrl}
                  className="w-full h-full rounded"
                  title={`CV van ${candidateName}`}
                  style={{ minHeight: '500px' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                  <div className="text-center">
                    <h3 className="font-medium mb-2">CV beschikbaar ({fileType.toUpperCase()})</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Dit bestandstype kan niet worden weergegeven in de browser.
                      <br />
                      Klik op 'Download' om het bestand te openen.
                    </p>
                    <Button onClick={handleDownload} disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download CV
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <FileText className="h-12 w-12" />
                  <span>CV kon niet geladen worden</span>
                  <Button onClick={generateFreshUrls} variant="outline" size="sm">
                    Opnieuw proberen
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        Download
      </Button>
    </div>
  );
};