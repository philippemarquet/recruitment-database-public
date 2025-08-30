import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, FileText, CheckCircle2, CheckCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InterviewScheduleDialog } from "./InterviewScheduleDialog";
import { InterviewNotesDialog } from "./InterviewNotesDialog";
import { PhaseDecisionDialog } from "./PhaseDecisionDialog";
import type { Database } from "@/integrations/supabase/types";

type CandidateAction = {
  id: string;
  candidate_id: string;
  assigned_to: string;
  action_type: string;
  phase: Database['public']['Enums']['recruitment_phase'];
  due_date?: string;
  completed: boolean;
  interview_id?: string;
  candidates: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    position_applied: string;
    current_phase: Database['public']['Enums']['recruitment_phase'];
    notes?: string;
  };
  interviews?: {
    id: string;
    scheduled_date?: string;
    location?: Database['public']['Enums']['interview_location'];
    interview_notes?: string;
    status: string;
  };
};

const phaseLabels: Record<Database['public']['Enums']['recruitment_phase'], string> = {
  screening: "Screening",
  first_interview: "1e gesprek",
  second_interview: "2e gesprek", 
  third_interview: "3e gesprek",
  negotiation: "In onderhandeling",
  on_hold: "On hold",
  rejected: "Afgewezen"
};

const locationLabels: Record<Database['public']['Enums']['interview_location'], string> = {
  "Kantoor": "Kantoor",
  "Digitaal": "Digitaal",
  "Elders": "Elders"
};

export const MyActionsTab = ({ currentUserId, onActionsChange, onCandidateView }: { 
  currentUserId?: string;
  onActionsChange?: (count: number) => void;
  onCandidateView?: (candidateId: string) => void;
}) => {
  const [actions, setActions] = useState<CandidateAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<CandidateAction | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [decisionDialogOpen, setDecisionDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUserId) {
      fetchMyActions();
    }
  }, [currentUserId]);

  const fetchMyActions = async () => {
    if (!currentUserId) return;

    try {
      console.log("Fetching actions for user:", currentUserId);
      
      // Get current user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", currentUserId)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        throw profileError;
      }
      
      console.log("User profile found:", profileData);

      // Get all actions assigned to current user
      console.log("Fetching actions for profile ID:", profileData.id);
      
      const { data: actionsData, error: actionsError } = await supabase
        .from("candidate_actions")
        .select(`
          *,
          candidates (
            id,
            first_name,
            last_name,
            email,
            position_applied,
            current_phase,
            notes
          ),
          interviews (
            id,
            scheduled_date,
            location,
            interview_notes,
            status
          )
        `)
        .eq("assigned_to", profileData.id)
        .eq("completed", false)
        .order("created_at", { ascending: false });

      if (actionsError) {
        console.error("Actions fetch error:", actionsError);
        throw actionsError;
      }
      
      console.log("Actions fetched:", actionsData);

      setActions(actionsData as CandidateAction[]);
      
      // Notify parent about actions count
      if (onActionsChange) {
        onActionsChange(actionsData?.length || 0);
      }
    } catch (error) {
      console.error("Error fetching my actions:", error);
      toast({
        title: "Fout bij ophalen acties",
        description: "Er is een fout opgetreden bij het ophalen van je acties.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInterview = (action: CandidateAction) => {
    setSelectedAction(action);
    setScheduleDialogOpen(true);
  };

  const handleAddNotes = (action: CandidateAction) => {
    setSelectedAction(action);
    setNotesDialogOpen(true);
  };

  const handlePhaseDecision = (action: CandidateAction) => {
    setSelectedAction(action);
    setDecisionDialogOpen(true);
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "schedule_interview":
        return <Calendar className="h-4 w-4" />;
      case "submit_notes":
        return <FileText className="h-4 w-4" />;
      case "screening_review":
      case "phase_decision":
      case "make_offer":
      case "final_decision":
      case "negotiation_result":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case "schedule_interview":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "submit_notes":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getActionLabel = (actionType: string) => {
    switch (actionType) {
      case "schedule_interview":
        return "Interview inplannen";
      case "submit_notes":
        return "Notities invoeren";
      case "screening_review":
        return "Screening beoordelen";
      case "phase_decision":
        return "Fase beslissing";
      case "make_offer":
        return "Aanbod uitbrengen";
      case "final_decision":
        return "Finale beslissing";
      case "negotiation_result":
        return "Onderhandelingsresultaat";
      default:
        return actionType;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-48 mb-4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded mb-4"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Mijn Acties</h2>
        <Badge variant="secondary" className="text-sm">
          {actions.length} openstaande actie{actions.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {actions.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Geen openstaande acties</h3>
            <p className="text-muted-foreground">
              Je hebt momenteel geen acties die aandacht vereisen.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {actions.map((action) => (
            <Card key={action.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {action.candidates.first_name} {action.candidates.last_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {action.candidates.position_applied}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {action.candidates.email}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge 
                      variant="outline" 
                      className={getActionColor(action.action_type)}
                    >
                      <span className="flex items-center gap-1">
                        {getActionIcon(action.action_type)}
                        {getActionLabel(action.action_type)}
                      </span>
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {phaseLabels[action.phase]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Show scheduled interview details if available */}
                  {action.interviews && action.interviews.scheduled_date && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Gepland:</span>
                        <span>
                          {new Date(action.interviews.scheduled_date).toLocaleDateString('nl-NL', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {action.interviews.location && (
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <MapPin className="h-4 w-4" />
                          <span className="font-medium">Locatie:</span>
                          <span>{locationLabels[action.interviews.location]}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {/* View candidate details button - always shown */}
                    <Button
                      onClick={() => onCandidateView && onCandidateView(action.candidates.id)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Kandidaat bekijken
                    </Button>

                    {action.action_type === "screening_review" && (
                      <Button
                        onClick={() => handlePhaseDecision(action)}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Screening beoordelen
                      </Button>
                    )}
                    {action.action_type === "schedule_interview" && (
                      <Button
                        onClick={() => handleScheduleInterview(action)}
                        className="flex items-center gap-2"
                        variant={action.interviews?.scheduled_date ? "outline" : "default"}
                      >
                        <Calendar className="h-4 w-4" />
                        {action.interviews?.scheduled_date ? "Wijzig afspraak" : "Plan interview"}
                      </Button>
                    )}
                    {action.action_type === "submit_notes" && action.interviews?.scheduled_date && (
                      <Button
                        onClick={() => handleAddNotes(action)}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Notities invoeren
                      </Button>
                    )}
                    {(action.action_type === "phase_decision" || action.action_type === "make_offer" || action.action_type === "final_decision") && (
                      <Button
                        onClick={() => handlePhaseDecision(action)}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Beslissing maken
                      </Button>
                    )}
                    {action.action_type === "negotiation_result" && (
                      <Button
                        onClick={() => handlePhaseDecision(action)}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Resultaat invoeren
                      </Button>
                    )}
                  </div>

                  {action.due_date && (
                    <p className="text-xs text-muted-foreground">
                      Vervaldatum: {new Date(action.due_date).toLocaleDateString('nl-NL')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <InterviewScheduleDialog
        action={selectedAction}
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onScheduled={fetchMyActions}
      />
      
      <InterviewNotesDialog
        action={selectedAction}
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        onNotesSubmitted={fetchMyActions}
      />

      <PhaseDecisionDialog
        action={selectedAction}
        open={decisionDialogOpen}
        onOpenChange={setDecisionDialogOpen}
        onActionCompleted={fetchMyActions}
      />
    </div>
  );
};