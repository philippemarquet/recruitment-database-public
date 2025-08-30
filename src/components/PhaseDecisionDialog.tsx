import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

type RecruitmentPhase = Database['public']['Enums']['recruitment_phase'];

interface CandidateAction {
  id: string;
  candidate_id: string;
  assigned_to: string;
  action_type: string;
  phase: RecruitmentPhase;
  due_date?: string;
  interview_id?: string;
  candidates?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    position_applied: string;
    current_phase: RecruitmentPhase;
    notes?: string;
  };
}

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface RejectionReason {
  id: string;
  reason: string;
  category: string;
}

interface PhaseDecisionDialogProps {
  action: CandidateAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionCompleted: () => void;
}

const getNextPhase = (currentPhase: RecruitmentPhase): RecruitmentPhase | null => {
  switch (currentPhase) {
    case 'screening':
      return 'first_interview';
    case 'first_interview':
      return 'second_interview';
    case 'second_interview':
      return 'third_interview';
    case 'third_interview':
      return 'negotiation';
    default:
      return null;
  }
};

const getPhaseLabel = (phase: RecruitmentPhase): string => {
  const labels = {
    screening: "Screening",
    first_interview: "1e gesprek",
    second_interview: "2e gesprek", 
    third_interview: "3e gesprek",
    negotiation: "Onderhandeling",
    on_hold: "On hold",
    rejected: "Afgewezen"
  };
  return labels[phase];
};

export const PhaseDecisionDialog = ({ 
  action, 
  open, 
  onOpenChange, 
  onActionCompleted 
}: PhaseDecisionDialogProps) => {
  const [decision, setDecision] = useState<'advance' | 'reject' | ''>('');
  const [assignedTo, setAssignedTo] = useState('');
  const [rejectionReasonId, setRejectionReasonId] = useState('');
  const [rejectedBy, setRejectedBy] = useState<'company' | 'candidate' | ''>('');
  const [notes, setNotes] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rejectionReasons, setRejectionReasons] = useState<RejectionReason[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const nextPhase = action?.candidates ? getNextPhase(action.candidates.current_phase) : null;
  const isNegotiationPhase = action?.candidates?.current_phase === 'negotiation';

  useEffect(() => {
    if (open) {
      fetchProfiles();
      fetchRejectionReasons();
    }
  }, [open]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .neq("role", "externe_recruiter");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const fetchRejectionReasons = async () => {
    try {
      const { data, error } = await supabase
        .from("rejection_reasons")
        .select("id, reason, category")
        .eq("active", true)
        .order("category", { ascending: true })
        .order("reason", { ascending: true });

      if (error) throw error;
      setRejectionReasons(data || []);
    } catch (error) {
      console.error("Error fetching rejection reasons:", error);
    }
  };

  const handleSubmit = async () => {
    if (!action?.candidates) return;

    setLoading(true);
    try {
      if (decision === 'advance') {
        if (isNegotiationPhase) {
          // Handle offer acceptance
          const { error: candidateError } = await supabase
            .from("candidates")
            .update({ 
              current_phase: 'negotiation',
              final_decision_date: new Date().toISOString()
            })
            .eq("id", action.candidate_id);

          if (candidateError) throw candidateError;
        } else if (nextPhase) {
          // Advance to next phase
          const { error: candidateError } = await supabase
            .from("candidates")
            .update({ 
              current_phase: nextPhase,
              assigned_to: assignedTo || null
            })
            .eq("id", action.candidate_id);

          if (candidateError) throw candidateError;

          // Create new action for assigned colleague if interview phase
          if (assignedTo && (nextPhase === 'first_interview' || nextPhase === 'second_interview' || nextPhase === 'third_interview')) {
            const { error: actionError } = await supabase
              .from("candidate_actions")
              .insert({
                candidate_id: action.candidate_id,
                assigned_to: assignedTo,
                action_type: "schedule_interview",
                phase: nextPhase,
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              });

            if (actionError) throw actionError;
          }
        }
      } else if (decision === 'reject') {
        // Handle rejection
        const { error: candidateError } = await supabase
          .from("candidates")
          .update({ 
            current_phase: 'rejected',
            rejection_reason_id: rejectionReasonId,
            rejected_by: rejectedBy,
            notes: notes ? `${action.candidates.notes || ''}\n\nAfwijzing: ${notes}`.trim() : action.candidates.notes
          })
          .eq("id", action.candidate_id);

        if (candidateError) throw candidateError;
      }

      // Mark action as completed
      const { error: actionUpdateError } = await supabase
        .from("candidate_actions")
        .update({ 
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq("id", action.id);

      if (actionUpdateError) throw actionUpdateError;

      toast({
        title: "Beslissing verwerkt",
        description: decision === 'advance' 
          ? `Kandidaat doorgestuurd naar ${nextPhase ? getPhaseLabel(nextPhase) : 'volgende fase'}`
          : "Kandidaat afgewezen",
      });

      // Reset form
      setDecision('');
      setAssignedTo('');
      setRejectionReasonId('');
      setRejectedBy('');
      setNotes('');
      
      onActionCompleted();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon beslissing niet verwerken.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!action?.candidates) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Beslissing - {action.candidates.first_name} {action.candidates.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Huidige fase</Label>
            <p className="text-sm text-muted-foreground">
              {getPhaseLabel(action.candidates.current_phase)}
            </p>
          </div>

          <Separator />

          <div>
            <Label className="text-sm font-medium">Beslissing</Label>
            <Select value={decision} onValueChange={(value: 'advance' | 'reject') => setDecision(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Kies een beslissing" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="advance">
                  {isNegotiationPhase ? "Geaccepteerd" : `Zet door naar ${nextPhase ? getPhaseLabel(nextPhase) : 'volgende fase'}`}
                </SelectItem>
                <SelectItem value="reject">Afwijzen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {decision === 'advance' && !isNegotiationPhase && nextPhase && (nextPhase === 'first_interview' || nextPhase === 'second_interview' || nextPhase === 'third_interview') && (
            <div>
              <Label className="text-sm font-medium">Toewijzen aan</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer collega" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.first_name} {profile.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {decision === 'reject' && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Wie heeft afgewezen?</Label>
                <Select value={rejectedBy} onValueChange={(value: 'company' | 'candidate') => setRejectedBy(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">NHANCED</SelectItem>
                    <SelectItem value="candidate">Kandidaat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {rejectedBy && (
                <div>
                  <Label className="text-sm font-medium">Reden</Label>
                  <Select value={rejectionReasonId} onValueChange={setRejectionReasonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer reden..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rejectionReasons
                        .filter(reason => reason.category === rejectedBy)
                        .map((reason) => (
                        <SelectItem key={reason.id} value={reason.id}>
                          {reason.reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Aanvullende notities</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optionele aanvullende informatie..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading || !decision || (decision === 'reject' && (!rejectedBy || !rejectionReasonId))}
              className="flex-1"
            >
              {loading ? "Bezig..." : "Bevestigen"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuleren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};