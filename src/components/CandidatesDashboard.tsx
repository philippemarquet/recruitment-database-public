import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Clock, CheckCircle2, XCircle, User, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddCandidateDialog } from "./AddCandidateDialog";
import { CandidateDetailDialog } from "./CandidateDetailDialog";
import { useUserProfile } from "@/hooks/useUserProfile";
import { MyActionsTab } from "./MyActionsTab";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
type RecruitmentPhase = Database['public']['Enums']['recruitment_phase'];
type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position_applied: string;
  current_phase: RecruitmentPhase;
  seniority_level?: string;
  gender?: string;
  salary_requirements?: string;
  source?: string;
  application_date?: string;
  general_information?: string;
  assigned_to?: string;
  created_at: string;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
};
const phaseLabels: Record<RecruitmentPhase, string> = {
  screening: "Screening",
  first_interview: "1e gesprek",
  second_interview: "2e gesprek",
  third_interview: "3e gesprek",
  negotiation: "In onderhandeling",
  on_hold: "On hold",
  rejected: "Afgewezen"
};
const phaseColors: Record<RecruitmentPhase, string> = {
  screening: "bg-blue-100 text-blue-800 border-blue-200",
  first_interview: "bg-yellow-100 text-yellow-800 border-yellow-200",
  second_interview: "bg-orange-100 text-orange-800 border-orange-200",
  third_interview: "bg-purple-100 text-purple-800 border-purple-200",
  negotiation: "bg-green-100 text-green-800 border-green-200",
  on_hold: "bg-gray-100 text-gray-800 border-gray-200",
  rejected: "bg-red-100 text-red-800 border-red-200"
};
export const CandidatesDashboard = ({
  currentUserRole,
  currentUserId
}: {
  currentUserRole?: string;
  currentUserId?: string;
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<RecruitmentPhase | "all" | "active" | "hired">("active");
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [actionsCount, setActionsCount] = useState(0);
  const {
    toast
  } = useToast();
  const {
    profile
  } = useUserProfile(currentUserId);

  // Get unique profile IDs from candidates for public profile lookup (memoized for stability)
  const assignedToIds = useMemo(() => candidates.map(c => c.assigned_to).filter((id): id is string => !!id), [candidates]);
  const {
    getDisplayName
  } = usePublicProfiles(assignedToIds);
  useEffect(() => {
    fetchCandidates();
    if (currentUserId) {
      fetchActionsCount();
    }
  }, [currentUserId]);
  const fetchCandidates = async () => {
    try {
      let query = supabase.from("candidates").select(`
          *,
          profiles!candidates_assigned_to_fkey(
            id,
            first_name,
            last_name,
            role
          )
        `).order("created_at", {
        ascending: false
      });

      // Filter for external recruiters based on source
      if (currentUserRole === "externe_recruiter" && profile?.recruiter_source) {
        query = query.eq("source", profile.recruiter_source);
      }
      const {
        data: candidatesData,
        error: candidatesError
      } = await query;
      if (candidatesError) throw candidatesError;

      // Normalize profiles data (could be array or single object)
      const candidatesWithProfiles = (candidatesData || []).map(candidate => ({
        ...candidate,
        profiles: Array.isArray(candidate.profiles) ? candidate.profiles[0] || null : candidate.profiles || null
      }));
      setCandidates(candidatesWithProfiles);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      toast({
        title: "Fout bij ophalen kandidaten",
        description: "Er is een fout opgetreden bij het ophalen van de kandidaten.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const fetchActionsCount = async () => {
    if (!currentUserId) return;
    try {
      // Get current user profile
      const {
        data: profileData,
        error: profileError
      } = await supabase.from("profiles").select("id").eq("user_id", currentUserId).single();
      if (profileError) throw profileError;

      // Count open actions for this user
      const {
        count,
        error: countError
      } = await supabase.from("candidate_actions").select("*", {
        count: "exact",
        head: true
      }).eq("assigned_to", profileData.id).eq("completed", false);
      if (countError) throw countError;
      setActionsCount(count || 0);
    } catch (error) {
      console.error("Error fetching actions count:", error);
    }
  };
  const getPhaseStats = (candidateList: Candidate[]) => {
    const stats = {
      active: candidateList.filter(c => !["rejected", "on_hold"].includes(c.current_phase)).length,
      onHold: candidateList.filter(c => c.current_phase === "on_hold").length,
      rejected: candidateList.filter(c => c.current_phase === "rejected").length,
      hired: 0 // No actual "hired" phase in database yet
    };
    return stats;
  };
  const handleCandidateClick = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setDetailDialogOpen(true);
  };
  const openCandidateById = async (candidateId: string) => {
    const existing = candidates.find(c => c.id === candidateId);
    if (existing) {
      setSelectedCandidate(existing);
      setDetailDialogOpen(true);
      return;
    }
    try {
      const {
        data,
        error
      } = await supabase.from("candidates").select("*").eq("id", candidateId).single();
      if (error) throw error;
      let candidate = data as Candidate;

      // Only fetch profile data if user is manager (to avoid RLS issues)
      if (candidate.assigned_to && (currentUserRole === "manager" || currentUserRole === "hr_manager")) {
        try {
          const {
            data: assignedProfile
          } = await supabase.from("profiles").select("id, first_name, last_name, email").eq("id", candidate.assigned_to).single();
          candidate = {
            ...candidate,
            profiles: assignedProfile || null
          } as Candidate;
        } catch (error) {
          // RLS error - use hook for display name instead
          console.log("Profile fetch restricted, using RPC hook for display");
        }
      }
      setSelectedCandidate(candidate);
      setDetailDialogOpen(true);
    } catch (err) {
      console.error("Error fetching candidate details:", err);
      toast({
        title: "Fout bij ophalen kandidaat",
        description: "Kon kandidaatdetails niet laden.",
        variant: "destructive"
      });
    }
  };
  const renderCandidateGrid = (candidateList: Candidate[], title: string) => {
    // Filter candidates by phase if a specific phase is selected
    const filteredCandidates = selectedPhase === "all" ? candidateList : selectedPhase === "active" ? candidateList.filter(candidate => !["rejected", "on_hold"].includes(candidate.current_phase)) : selectedPhase === "hired" ? candidateList.filter(candidate => false) // No hired phase yet
    : candidateList.filter(candidate => candidate.current_phase === selectedPhase);
    const stats = getPhaseStats(candidateList);
    return <div className="space-y-4">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="flex justify-end">
            {(currentUserRole === "manager" || currentUserRole === "hr_manager") && <AddCandidateDialog onCandidateAdded={fetchCandidates} />}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className={`cursor-pointer transition-all hover:shadow-md ${selectedPhase === "active" ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => setSelectedPhase("active")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actief</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all hover:shadow-md ${selectedPhase === "on_hold" ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => setSelectedPhase("on_hold")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Hold</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.onHold}</div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all hover:shadow-md ${selectedPhase === "rejected" ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => setSelectedPhase("rejected")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Afgewezen</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejected}</div>
            </CardContent>
          </Card>

          <Card className={`cursor-pointer transition-all hover:shadow-md ${selectedPhase === "hired" ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => setSelectedPhase("hired")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aangenomen</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hired}</div>
            </CardContent>
          </Card>
        </div>

        {/* Candidates Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCandidates.map(candidate => <Card key={candidate.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleCandidateClick(candidate)}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {candidate.first_name} {candidate.last_name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{candidate.position_applied}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {candidate.assigned_to ? <>Toegewezen aan: {getDisplayName(candidate.assigned_to)}</> : <>Niet toegewezen</>}
                    </p>
                  </div>
                  <Badge variant="outline" className={phaseColors[candidate.current_phase]}>
                    {phaseLabels[candidate.current_phase]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Email:</span> {candidate.email}
                  </p>
                  {candidate.phone && <p className="text-sm">
                      <span className="font-medium">Telefoon:</span> {candidate.phone}
                    </p>}
                  {candidate.seniority_level && <p className="text-sm">
                      <span className="font-medium">Niveau:</span> {candidate.seniority_level}
                    </p>}
                  {candidate.source && <p className="text-sm">
                      <span className="font-medium">Bron:</span> {candidate.source}
                    </p>}
                  <p className="text-xs text-muted-foreground">
                    Toegevoegd: {new Date(candidate.created_at).toLocaleDateString('nl-NL')}
                  </p>
                </div>
              </CardContent>
            </Card>)}
        </div>

        {filteredCandidates.length === 0 && candidateList.length > 0 && <Card className="text-center py-12 md:col-span-2 lg:col-span-3">
            <CardContent>
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Geen kandidaten gevonden</h3>
              <p className="text-muted-foreground mb-4">
                Er zijn geen kandidaten in de geselecteerde fase.
              </p>
            </CardContent>
          </Card>}

        {candidateList.length === 0 && <Card className="text-center py-12 md:col-span-2 lg:col-span-3">
            <CardContent>
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Geen kandidaten gevonden</h3>
              <p className="text-muted-foreground mb-4">
                Er zijn nog geen kandidaten gevonden.
              </p>
              {(currentUserRole === "manager" || currentUserRole === "hr_manager") && <AddCandidateDialog onCandidateAdded={fetchCandidates} />}
            </CardContent>
          </Card>}
      </div>;
  };
  if (loading) {
    return <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded"></div>)}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>;
  }
  return <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        
      </div>

      <Tabs defaultValue={"candidates"} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="actions" className="flex items-center gap-2 relative">
            <ClipboardList className="h-4 w-4" />
            <span className="relative">
              Mijn Acties
              {actionsCount > 0 && <span className="absolute -top-2 -right-5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {actionsCount}
                </span>}
            </span>
          </TabsTrigger>
          <TabsTrigger value="candidates" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Kandidaten
          </TabsTrigger>
        </TabsList>

        <TabsContent value="actions" className="space-y-6">
          <MyActionsTab currentUserId={currentUserId} onActionsChange={setActionsCount} onCandidateView={openCandidateById} />
        </TabsContent>

        <TabsContent value="candidates" className="space-y-6">
          {renderCandidateGrid(candidates, "Kandidaten")}
        </TabsContent>
      </Tabs>

      <CandidateDetailDialog candidate={selectedCandidate} open={detailDialogOpen} onOpenChange={setDetailDialogOpen} onCandidateUpdated={fetchCandidates} currentUserRole={currentUserRole || "medewerker"} />
    </div>;
};