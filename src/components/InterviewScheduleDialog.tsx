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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type InterviewLocation = Database['public']['Enums']['interview_location'];

interface InterviewScheduleDialogProps {
  action: {
    id: string;
    candidate_id: string;
    assigned_to: string;
    phase: Database['public']['Enums']['recruitment_phase'];
    interview_id?: string;
    interviews?: {
      id: string;
      scheduled_date?: string;
      location?: InterviewLocation;
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
  onScheduled: () => void;
}

const locationOptions: { value: InterviewLocation; label: string }[] = [
  { value: "Kantoor", label: "Kantoor" },
  { value: "Digitaal", label: "Digitaal" },
  { value: "Elders", label: "Elders" },
];

export const InterviewScheduleDialog = ({
  action,
  open,
  onOpenChange,
  onScheduled,
}: InterviewScheduleDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [location, setLocation] = useState<InterviewLocation>("Kantoor");
  const { toast } = useToast();

  useEffect(() => {
    if (action?.interviews) {
      if (action.interviews.scheduled_date) {
        // Convert to local datetime-local format
        const date = new Date(action.interviews.scheduled_date);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setScheduledDate(`${year}-${month}-${day}T${hours}:${minutes}`);
      }
      if (action.interviews.location) {
        setLocation(action.interviews.location);
      }
    }
  }, [action]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!action || !scheduledDate) return;

    setLoading(true);
    try {
      const scheduledDateTime = new Date(scheduledDate).toISOString();

      if (action.interview_id) {
        // Update existing interview
        const { error: updateError } = await supabase
          .from("interviews")
          .update({
            scheduled_date: scheduledDateTime,
            location: location,
            updated_at: new Date().toISOString(),
          })
          .eq("id", action.interview_id);

        if (updateError) throw updateError;
      } else {
        // Create new interview using the assigned profile ID
        const { data: interviewData, error: insertError } = await supabase
          .from("interviews")
          .insert({
            candidate_id: action.candidate_id,
            interviewer_id: action.assigned_to,
            scheduled_by: action.assigned_to,
            phase: action.phase,
            scheduled_date: scheduledDateTime,
            location: location,
            status: "scheduled",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Update the action with the interview_id and change action type to submit_notes
        const { error: actionUpdateError } = await supabase
          .from("candidate_actions")
          .update({ 
            interview_id: interviewData.id,
            action_type: "submit_notes",
            updated_at: new Date().toISOString(),
          })
          .eq("id", action.id);

        if (actionUpdateError) throw actionUpdateError;
      }

      // If this was an existing interview, also update action type to submit_notes
      if (action.interview_id) {
        const { error: actionTypeUpdateError } = await supabase
          .from("candidate_actions")
          .update({ 
            action_type: "submit_notes",
            updated_at: new Date().toISOString(),
          })
          .eq("id", action.id);

        if (actionTypeUpdateError) throw actionTypeUpdateError;
      }

      toast({
        title: "Interview gepland",
        description: `Het interview is ${action.interview_id ? 'bijgewerkt' : 'gepland'} voor ${new Date(scheduledDateTime).toLocaleDateString('nl-NL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}.`,
      });

      onScheduled();
      onOpenChange(false);
    } catch (error) {
      console.error("Error scheduling interview:", error);
      toast({
        title: "Fout bij plannen interview",
        description: "Er is een fout opgetreden bij het plannen van het interview.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Interview Plannen
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Plan of wijzig een interviewdatum en -locatie voor deze kandidaat.
        </DialogDescription>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <h4 className="font-medium text-sm">Kandidaat</h4>
            <p className="text-sm">
              {action.candidates.first_name} {action.candidates.last_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {action.candidates.position_applied}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled-date" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Datum en tijd
              </Label>
              <Input
                id="scheduled-date"
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                required
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Locatie
              </Label>
              <Select value={location} onValueChange={(value: InterviewLocation) => setLocation(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={loading || !scheduledDate}>
                {loading ? "Bezig..." : action.interview_id ? "Bijwerken" : "Plannen"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};