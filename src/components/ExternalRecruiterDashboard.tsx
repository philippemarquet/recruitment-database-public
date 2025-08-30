
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Phone, Mail, FileText, User, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AddCandidateDialog } from "./AddCandidateDialog";
import { useToast } from "@/hooks/use-toast";
import { CandidateDetailDialog } from "./CandidateDetailDialog";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";


type RecruitmentPhase = Database['public']['Enums']['recruitment_phase'];

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position_applied: string;
  current_phase: RecruitmentPhase;
  source?: string;
  created_at: string;
  assigned_to?: string;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  } | null;
}

interface Interview {
  id: string;
  scheduled_date?: string;
  interview_notes?: string;
  phase: string;
  status: string;
  candidate_id: string;
  interviewer_id?: string; // added so we can safely reference the interviewer profile id
  interviewer?: {
    first_name?: string;
    last_name?: string;
  };
}

interface ExternalRecruiterDashboardProps {
  currentUserId: string;
  recruiterSource: string;
}

const phaseLabels = {
  screening: "Screening",
  first_interview: "1e gesprek",
  second_interview: "2e gesprek", 
  third_interview: "3e gesprek",
  negotiation: "Onderhandeling",
  on_hold: "On hold",
  rejected: "Afgewezen"
};

const phaseColors = {
  screening: "bg-blue-500",
  first_interview: "bg-yellow-500",
  second_interview: "bg-orange-500",
  third_interview: "bg-purple-500",
  negotiation: "bg-green-500",
  on_hold: "bg-gray-500",
  rejected: "bg-red-500"
};

export const ExternalRecruiterDashboard = ({ 
  currentUserId, 
  recruiterSource 
}: ExternalRecruiterDashboardProps) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Record<string, Interview[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<RecruitmentPhase | "all" | "active" | "hired">("active");
  const { toast } = useToast();

  // Get unique profile IDs for public profile lookup
  // Memoize profile IDs for stable hook dependency
  const allProfileIds = useMemo(() => {
    const assignedToIds = candidates
      .map(c => c.assigned_to)
      .filter((id): id is string => !!id);
    
    const interviewerIds = Object.values(interviews)
      .flat()
      .map(i => i.interviewer_id)
      .filter((id): id is string => !!id);

    return [...new Set([...assignedToIds, ...interviewerIds])];
  }, [candidates, interviews]);
  
  const { getDisplayName } = usePublicProfiles(allProfileIds);

  useEffect(() => {
    fetchCandidates();
  }, [recruiterSource]);

  const fetchCandidates = async () => {
    if (!recruiterSource) return;
    
    try {
      setLoading(true);
      
      // Fetch candidates from recruiter's source
      const { data: candidateData, error } = await supabase
        .from("candidates")
        .select(`
          *,
          profiles!candidates_assigned_to_fkey(
            id,
            first_name,
            last_name,
            role
          )
        `)
        .eq("source", recruiterSource)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Normalize profiles data (could be array or single object)
      const normalizedCandidates = (candidateData || []).map(candidate => ({
        ...candidate,
        profiles: Array.isArray(candidate.profiles) 
          ? candidate.profiles[0] || null 
          : candidate.profiles || null
      }));
      
      setCandidates(normalizedCandidates);

      // Fetch interviews for all candidates
      if (candidateData?.length) {
        const candidateIds = candidateData.map(c => c.id);
        const { data: interviewData, error: interviewError } = await supabase
          .from("interviews")
          .select(`
            *,
            interviewer:profiles!interviews_interviewer_id_fkey(
              first_name,
              last_name
            ),
            scheduled_by_profile:profiles!interviews_scheduled_by_fkey(
              first_name,
              last_name
            )
          `)
          .in("candidate_id", candidateIds)
          .order("scheduled_date", { ascending: true });

        if (interviewError) throw interviewError;

        // Group interviews by candidate ID
        const interviewsByCandidate: Record<string, Interview[]> = {};
        interviewData?.forEach(interview => {
          if (!interviewsByCandidate[interview.candidate_id]) {
            interviewsByCandidate[interview.candidate_id] = [];
          }
          interviewsByCandidate[interview.candidate_id].push(interview as unknown as Interview);
        });

        setInterviews(interviewsByCandidate);
      }

    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast({
        title: "Fout bij laden kandidaten",
        description: "Er is een fout opgetreden bij het laden van de kandidaten.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setDetailDialogOpen(true);
  };

  const getUpcomingInterview = (candidateId: string) => {
    const candidateInterviews = interviews[candidateId] || [];
    return candidateInterviews.find(interview => 
      interview.status === 'scheduled' && 
      interview.scheduled_date &&
      new Date(interview.scheduled_date) > new Date()
    );
  };

  const getLatestInterviewNotes = (candidateId: string) => {
    const candidateInterviews = interviews[candidateId] || [];
    const completedInterviews = candidateInterviews
      .filter(interview => interview.status === 'completed' && interview.interview_notes)
      .sort((a, b) => new Date(b.scheduled_date || '').getTime() - new Date(a.scheduled_date || '').getTime());
    
    return completedInterviews[0]?.interview_notes;
  };

  const getLatestInterviewerId = (candidateId: string) => {
    const candidateInterviews = interviews[candidateId] || [];
    const completedInterviews = candidateInterviews
      .filter(interview => interview.status === 'completed' && interview.interviewer_id)
      .sort((a, b) => new Date(b.scheduled_date || '').getTime() - new Date(a.scheduled_date || '').getTime());
    
    return completedInterviews[0]?.interviewer_id;
  };

  const getPhaseStats = () => {
    const stats = {
      active: candidates.filter(c => !["rejected", "on_hold"].includes(c.current_phase)).length,
      onHold: candidates.filter(c => c.current_phase === "on_hold").length,
      rejected: candidates.filter(c => c.current_phase === "rejected").length,
      hired: 0 // No specific "hired" phase exists in the system
    };
    return stats;
  };

  // Filter candidates based on selected phase
  const filteredCandidates = useMemo(() => {
    if (selectedPhase === "all") return candidates;
    if (selectedPhase === "active") {
      return candidates.filter(c => !["rejected", "on_hold"].includes(c.current_phase));
    }
    if (selectedPhase === "hired") {
      return []; // No specific "hired" phase exists in the system
    }
    return candidates.filter(c => c.current_phase === selectedPhase);
  }, [candidates, selectedPhase]);

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mijn Kandidaten</h1>
          <p className="text-muted-foreground">
            Kandidaten van bron: <span className="font-medium">{recruiterSource}</span>
          </p>
        </div>
        <AddCandidateDialog 
          onCandidateAdded={fetchCandidates}
          isExternalRecruiter={true}
          forcedSource={recruiterSource}
        />
      </div>

      {/* Filter Blokken */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedPhase === "active" ? "ring-2 ring-primary bg-primary/5" : ""}`} 
          onClick={() => setSelectedPhase("active")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actief</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getPhaseStats().active}</div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedPhase === "on_hold" ? "ring-2 ring-primary bg-primary/5" : ""}`} 
          onClick={() => setSelectedPhase("on_hold")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Hold</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getPhaseStats().onHold}</div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedPhase === "rejected" ? "ring-2 ring-primary bg-primary/5" : ""}`} 
          onClick={() => setSelectedPhase("rejected")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Afgewezen</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getPhaseStats().rejected}</div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${selectedPhase === "hired" ? "ring-2 ring-primary bg-primary/5" : ""}`} 
          onClick={() => setSelectedPhase("hired")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aangenomen</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getPhaseStats().hired}</div>
          </CardContent>
        </Card>
      </div>

      {filteredCandidates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {candidates.length === 0 ? "Nog geen kandidaten" : "Geen kandidaten gevonden"}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {candidates.length === 0 
                ? "Je hebt nog geen kandidaten toegevoegd van jouw bron. Klik op \"Nieuwe kandidaat\" om te beginnen."
                : "Er zijn geen kandidaten die voldoen aan de geselecteerde filter."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCandidates.map((candidate) => {
            const upcomingInterview = getUpcomingInterview(candidate.id);
            const latestNotes = getLatestInterviewNotes(candidate.id);
            const latestInterviewerId = getLatestInterviewerId(candidate.id);
            
            return (
              <Card 
                key={candidate.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleCandidateClick(candidate)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {candidate.first_name} {candidate.last_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {candidate.position_applied}
                      </p>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`${phaseColors[candidate.current_phase as keyof typeof phaseColors]} text-white`}
                    >
                      {phaseLabels[candidate.current_phase as keyof typeof phaseLabels]}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    {candidate.email}
                  </div>
                  
                  {candidate.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {candidate.phone}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {candidate.assigned_to ? (
                      <span>Toegewezen aan: {getDisplayName(candidate.assigned_to)}</span>
                    ) : (
                      <span>Niet toegewezen</span>
                    )}
                  </div>
                  
                  {upcomingInterview && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Volgend gesprek: {new Date(upcomingInterview.scheduled_date!).toLocaleDateString('nl-NL')}
                      </span>
                    </div>
                  )}
                  
                  {latestNotes && (
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-muted-foreground text-xs mb-1">Laatste notities:</p>
                        <p className="line-clamp-2 text-sm">
                          {latestNotes.length > 100 
                            ? `${latestNotes.substring(0, 100)}...` 
                            : latestNotes}
                        </p>
                      </div>
                    </div>
                   )}
                   
                   {latestInterviewerId && (
                     <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <User className="h-4 w-4" />
                       <span>
                         Laatste interviewer: {getDisplayName(latestInterviewerId)}
                       </span>
                     </div>
                   )}
                   
                   <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Toegevoegd: {new Date(candidate.created_at).toLocaleDateString('nl-NL')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedCandidate && (
        <CandidateDetailDialog
          candidate={selectedCandidate}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          onCandidateUpdated={fetchCandidates}
          currentUserRole="externe_recruiter"
        />
      )}
    </div>
  );
};
