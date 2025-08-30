
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Calendar, MapPin } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { sanitizeHTML } from "@/lib/security";
import { RichTextEditor } from "./ui/rich-text-editor";

interface InterviewNotesDialogProps {
  action: {
    id: string;
    candidate_id: string;
    assigned_to: string;
    phase: Database['public']['Enums']['recruitment_phase'];
    interview_id?: string;
    interviews?: {
      id: string;
      scheduled_date?: string;
      location?: Database['public']['Enums']['interview_location'];
      interview_notes?: string;
    };
    candidates: {
      first_name: string;
      last_name: string;
      email: string;
      position_applied: string;
    };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNotesSubmitted: () => void;
}

const locationLabels: Record<Database['public']['Enums']['interview_location'], string> = {
  "Kantoor": "Kantoor",
  "Digitaal": "Digitaal",
  "Elders": "Elders"
};

export const InterviewNotesDialog = ({
  action,
  open,
  onOpenChange,
  onNotesSubmitted,
}: InterviewNotesDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (action?.interviews?.interview_notes) {
      setNotes(action.interviews.interview_notes);
    } else {
      setNotes("");
    }
  }, [action]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const interviewId = action?.interview_id ?? action?.interviews?.id;
    if (!interviewId || !notes.trim()) return;

    setLoading(true);
    try {
      // Update interview with notes and mark as completed
      // The database trigger will automatically create the HR manager action
      const { error: updateError } = await supabase
        .from("interviews")
        .update({
          interview_notes: sanitizeHTML(notes.trim()),
          notes_submitted_at: new Date().toISOString(),
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", interviewId);

      if (updateError) throw updateError;

      // Mark the current action as completed
      const { error: actionError } = await supabase
        .from("candidate_actions")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", action.id);

      if (actionError) throw actionError;

      toast({
        title: "Notities opgeslagen",
        description: "De interview notities zijn opgeslagen en de HR manager krijgt automatisch een beslissingsactie.",
      });

      onNotesSubmitted();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting notes:", error);
      toast({
        title: "Fout bij opslaan notities",
        description: "Er is een fout opgetreden bij het opslaan van de notities.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Interview Notities Invoeren
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Voer gespreksnotities in en rond het interview af voor terugkoppeling.
        </DialogDescription>

        <div className="space-y-4">
          {/* Candidate and interview info */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div>
              <h4 className="font-medium text-sm">Kandidaat</h4>
              <p className="text-sm">
                {action.candidates.first_name} {action.candidates.last_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {action.candidates.position_applied}
              </p>
            </div>

            {action.interviews?.scheduled_date && (
              <div>
                <h4 className="font-medium text-sm flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Interview Details
                </h4>
                <p className="text-sm">
                  {new Date(action.interviews.scheduled_date).toLocaleDateString('nl-NL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {action.interviews.location && (
                  <p className="text-sm flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {locationLabels[action.interviews.location]}
                  </p>
                )}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interview-notes">
                Interview Notities
              </Label>
              <RichTextEditor
                value={notes}
                onChange={setNotes}
                placeholder="Voer hier je notities van het interview in..."
                minHeight="200px"
              />
              <p className="text-xs text-muted-foreground">
                Beschrijf je bevindingen, indrukken en aanbevelingen voor deze kandidaat.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuleren
              </Button>
              <Button 
                type="submit" 
                disabled={loading || !notes.trim()}
                className="gap-2"
              >
                {loading ? "Bezig..." : "Notities Indienen"}
              </Button>
            </div>
          </form>

          <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
            <p className="font-medium">Let op:</p>
            <p>
              Na het indienen van de notities wordt automatisch een beslissingsactie 
              aangemaakt voor de HR manager om de volgende fase te bepalen.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
