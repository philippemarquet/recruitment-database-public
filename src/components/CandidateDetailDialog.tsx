import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { sanitizeHTML } from "@/lib/security";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Building, DollarSign, FileText, Calendar, MapPin, Edit3, Save, X, MessageSquare, Trash2 } from "lucide-react";
import { CVUpload } from "./CVUpload";
import { CVViewer } from "./CVViewer";
import { CandidateSourceSelect } from "./CandidateSourceSelect";
import { SeniorityLevelSelect } from "./SeniorityLevelSelect";
import { usePublicProfiles } from "@/hooks/usePublicProfiles";
import { RichTextEditor } from "./ui/rich-text-editor";
import { SafeHtml } from "@/lib/safe-html";

type RecruitmentPhase = Database['public']['Enums']['recruitment_phase'];

interface Interview {
  id: string;
  interviewer_id: string;
  scheduled_date?: string;
  location?: Database['public']['Enums']['interview_location'];
  interview_notes?: string;
  phase: RecruitmentPhase;
  notes_submitted_at?: string;
  interviewer?: {
    first_name?: string;
    last_name?: string;
  };
}

interface Candidate {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position_applied: string;
  current_phase: RecruitmentPhase;
  seniority_level?: string;
  gender?: string;
  source?: string;
  application_date?: string;
  salary_requirements?: string;
  cv_url?: string;
  linkedin_url?: string;
  notes?: string;
  general_information?: string;
  assigned_to?: string;
  profiles?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
}

interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface CandidateDetailDialogProps {
  candidate: Candidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCandidateUpdated: () => void;
  currentUserRole?: string;
  isReadOnly?: boolean;
}

const phaseLabels: Record<RecruitmentPhase, string> = {
  screening: "Screening",
  first_interview: "1e gesprek",
  second_interview: "2e gesprek",
  third_interview: "3e gesprek",
  negotiation: "Onderhandeling",
  on_hold: "On hold",
  rejected: "Afgewezen"
};

const phaseColors: Record<RecruitmentPhase, string> = {
  screening: "bg-blue-50 text-blue-700 border-blue-200",
  first_interview: "bg-yellow-50 text-yellow-700 border-yellow-200",
  second_interview: "bg-orange-50 text-orange-700 border-orange-200",
  third_interview: "bg-purple-50 text-purple-700 border-purple-200",
  negotiation: "bg-green-50 text-green-700 border-green-200",
  on_hold: "bg-gray-50 text-gray-700 border-gray-200",
  rejected: "bg-red-50 text-red-700 border-red-200"
};

export const CandidateDetailDialog = ({ 
  candidate, 
  open, 
  onOpenChange, 
  onCandidateUpdated,
  currentUserRole = "medewerker",
  isReadOnly = false
}: CandidateDetailDialogProps) => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<Partial<Candidate>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false); // NEW
  const { toast } = useToast();

  const canEdit = !isReadOnly && (currentUserRole === "manager" || currentUserRole === "hr_manager");
  const canViewSalary = currentUserRole === "manager" || currentUserRole === "hr_manager" || currentUserRole === "externe_recruiter";
  const isManager = currentUserRole === "manager" || currentUserRole === "hr_manager";
  const isHRManager = currentUserRole === "hr_manager";
  const isExternalRecruiter = currentUserRole === "externe_recruiter";
  const canEditLimitedFields = isExternalRecruiter && !isReadOnly;

  // Memoize profile IDs for stable hook dependency
  const allProfileIds = useMemo(() => {
    const ids: string[] = [];
    if (candidate?.assigned_to) ids.push(candidate.assigned_to);
    interviews.forEach(interview => {
      if (interview.interviewer_id) ids.push(interview.interviewer_id);
    });
    return [...new Set(ids)];
  }, [candidate?.assigned_to, interviews]);

  const { getDisplayName } = usePublicProfiles(allProfileIds);

  useEffect(() => {
    if (candidate) {
      setFormData(candidate);
    }
  }, [candidate]);

  // Reset editMode and form when dialog closes
  useEffect(() => {
    if (!open) {
      setEditMode(false);
      if (candidate) setFormData(candidate);
    }
  }, [open, candidate]);

  useEffect(() => {
    if (open && candidate) {
      fetchProfiles();
      fetchInterviews();
    }
  }, [open, candidate]);

  const fetchProfiles = async () => {
    // Only fetch profiles for assignment if user is manager (to avoid RLS issues)
    if (!isManager) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, role")
        .neq("role", "externe_recruiter"); // Exclude external recruiters from assignment

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const fetchInterviews = async () => {
    if (!candidate) return;
    
    try {
      // Fetch interviews without profile joins to avoid RLS issues
      // We'll use the RPC hook for display names instead
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .eq("candidate_id", candidate.id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;
      setInterviews(data || []);
    } catch (error) {
      console.error("Error fetching interviews:", error);
    }
  };

  // Detect unsaved changes (simple deep check via JSON; good enough for this form)
  const hasUnsavedChanges = useMemo(() => {
    if (!candidate) return false;
    return JSON.stringify(formData) !== JSON.stringify(candidate);
  }, [formData, candidate]);

  // Intercept dialog close (X / outside)
  const handleDialogClose = (nextOpen: boolean) => {
    if (!nextOpen && editMode && hasUnsavedChanges) {
      setShowUnsavedAlert(true);
      return;
    }
    onOpenChange(nextOpen);
  };

  // Annuleren button behavior
  const handleCancel = () => {
    if (editMode && hasUnsavedChanges) {
      setShowUnsavedAlert(true);
    } else {
      setEditMode(false);
      if (candidate) setFormData(candidate);
    }
  };

  const handleSave = async (): Promise<boolean> => {
    if (!candidate) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("candidates")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          position_applied: formData.position_applied,
          current_phase: formData.current_phase,
          seniority_level: formData.seniority_level,
          gender: formData.gender,
          source: formData.source,
          application_date: formData.application_date,
          salary_requirements: formData.salary_requirements ? sanitizeHTML(formData.salary_requirements) : formData.salary_requirements,
          linkedin_url: formData.linkedin_url,
          notes: formData.notes ? sanitizeHTML(formData.notes) : formData.notes,
          general_information: formData.general_information ? sanitizeHTML(formData.general_information) : formData.general_information,
          assigned_to: formData.assigned_to || null
        })
        .eq("id", candidate.id);

      if (error) throw error;

      toast({
        title: "Bijgewerkt",
        description: "Kandidaatgegevens zijn opgeslagen.",
      });

      setEditMode(false);
      onCandidateUpdated();
      return true;
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon gegevens niet opslaan.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handlePhaseChange = async (newPhase: RecruitmentPhase) => {
    if (!candidate) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("candidates")
        .update({ current_phase: newPhase })
        .eq("id", candidate.id);

      if (error) throw error;

      toast({
        title: "Fase bijgewerkt",
        description: `Verplaatst naar ${phaseLabels[newPhase]}.`,
      });

      setFormData({ ...formData, current_phase: newPhase });
      onCandidateUpdated();
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon fase niet wijzigen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentChange = async (value: string) => {
    if (!candidate) return;

    const newAssigned = value === "unassigned" ? null : value;

    setLoading(true);
    try {
      // Update candidate assignment
      const { error } = await supabase
        .from("candidates")
        .update({ assigned_to: newAssigned })
        .eq("id", candidate.id);

      if (error) throw error;

      // If assigning to someone (not unassigning), create appropriate action based on phase
      if (newAssigned) {
        let actionType = "screening_review";
        let actionPhase = candidate.current_phase;
        
        if (candidate.current_phase === "screening") {
          actionType = "screening_review";
        } else if (candidate.current_phase === "first_interview" || 
                  candidate.current_phase === "second_interview" || 
                  candidate.current_phase === "third_interview") {
          actionType = "schedule_interview";
        } else if (candidate.current_phase === "negotiation") {
          actionType = "make_offer";
        }

        const { error: actionError } = await supabase
          .from("candidate_actions")
          .insert({
            candidate_id: candidate.id,
            assigned_to: newAssigned,
            action_type: actionType,
            phase: actionPhase,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          });

        if (actionError) {
          console.error("Error creating action:", actionError);
        }
      }

      const assignedProfile = profiles.find(p => p.id === newAssigned);
      const assignedName = assignedProfile ? `${assignedProfile.first_name} ${assignedProfile.last_name}` : "Niemand";

      toast({
        title: "Toegewezen",
        description: `Kandidaat toegewezen aan ${assignedName}.`,
      });

      setFormData({ ...formData, assigned_to: newAssigned ?? undefined });
      onCandidateUpdated();
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon toewijzing niet wijzigen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!candidate) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", candidate.id);

      if (error) throw error;

      toast({
        title: "Verwijderd",
        description: "Kandidaat is succesvol verwijderd.",
      });

      onOpenChange(false);
      onCandidateUpdated();
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kon kandidaat niet verwijderen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!candidate) return null;

  const cvUrl = formData.cv_url ?? candidate.cv_url;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <div className="flex items-start justify-between">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                {candidate.first_name} {candidate.last_name}
                {hasUnsavedChanges && editMode && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
                    ⚠ Niet opgeslagen
                  </span>
                )}
              </DialogTitle>
            </div>
            {((!isReadOnly && isManager) || canEditLimitedFields) && (
              <div className="flex items-center gap-3 mt-3">
                {editMode ? (
                  <>
                    <Button size="sm" onClick={handleSave} disabled={loading} className="gap-2">
                      <Save className="h-3 w-3" />
                      Opslaan
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel} className="gap-2">
                      <X className="h-3 w-3" />
                      Annuleren
                    </Button>
                  </>
                ) : (
                 <div className="flex gap-2">
                   <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-2">
                     <Edit3 className="h-3 w-3" />
                     {isExternalRecruiter ? "Bewerk kandidaatgegevens" : "Bewerken"}
                   </Button>
                   {isHRManager && (
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                         <Button size="sm" variant="destructive" className="gap-2">
                           <Trash2 className="h-3 w-3" />
                           Verwijderen
                         </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Kandidaat verwijderen</AlertDialogTitle>
                           <AlertDialogDescription>
                             Weet je zeker dat je {candidate.first_name} {candidate.last_name} wilt verwijderen? 
                             Deze actie kan niet ongedaan worden gemaakt en alle bijbehorende gegevens (interviews, acties, etc.) zullen verloren gaan.
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Annuleren</AlertDialogCancel>
                           <AlertDialogAction 
                             onClick={handleDelete}
                             disabled={loading}
                             className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                           >
                             Definitief verwijderen
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                   )}
                 </div>
               )}
              </div>
            )}
          </DialogHeader>
          <DialogDescription className="sr-only">
            Kandidaatdetails en documenten, status en notities.
          </DialogDescription>

          <div className="space-y-6">
            {/* Status en Toewijzing */}
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <Label className="text-xs text-muted-foreground">STATUS</Label>
                <div className="mt-1">
                  {!isReadOnly && isManager ? (
                    <Select
                      value={formData.current_phase || candidate.current_phase}
                      onValueChange={handlePhaseChange}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(phaseLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={phaseColors[candidate.current_phase]}>
                      {phaseLabels[candidate.current_phase]}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">TOEGEWEZEN AAN</Label>
                <div className="mt-1">
                  {!isReadOnly && isManager ? (
                    <Select
                      value={formData.assigned_to ?? "unassigned"}
                      onValueChange={handleAssignmentChange}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Niet toegewezen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Niemand</SelectItem>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.first_name} {profile.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm font-medium">
                      {candidate.assigned_to ? (
                        getDisplayName(candidate.assigned_to)
                      ) : (
                        'Niet toegewezen'
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact
                </h3>
                
                <div className="space-y-2 text-sm">
                   <div className="flex items-center gap-2">
                     <Mail className="h-3 w-3 text-muted-foreground" />
                     {editMode && (canEdit || canEditLimitedFields) ? (
                       <Input
                         value={formData.email || ""}
                         onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                         className="h-8"
                       />
                     ) : (
                       <span>{candidate.email}</span>
                     )}
                   </div>
                  
                  {(candidate.phone || editMode) && (
                     <div className="flex items-center gap-2">
                       <Phone className="h-3 w-3 text-muted-foreground" />
                       {editMode && (canEdit || canEditLimitedFields) ? (
                         <Input
                           value={formData.phone || ""}
                           onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                           placeholder="Telefoonnummer"
                           className="h-8"
                         />
                       ) : (
                         <span>{candidate.phone || "Niet opgegeven"}</span>
                       )}
                     </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Functie
                </h3>
                
                <div className="space-y-2 text-sm">
                   <div>
                     {editMode && (canEdit || canEditLimitedFields) ? (
                       <Input
                         value={formData.position_applied || ""}
                         onChange={(e) => setFormData({ ...formData, position_applied: e.target.value })}
                         className="h-8"
                       />
                     ) : (
                       <span className="font-medium">{candidate.position_applied}</span>
                     )}
                   </div>
                  
                  {(candidate.seniority_level || editMode) && (
                     <div className="text-muted-foreground">
                       {editMode && (canEdit || canEditLimitedFields) ? (
                         <SeniorityLevelSelect
                           value={formData.seniority_level || ""}
                           onValueChange={(value) => setFormData({ ...formData, seniority_level: value })}
                         />
                       ) : (
                         <span>{candidate.seniority_level}</span>
                       )}
                     </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Datum aangemaakt:</span>
                <span>{candidate.application_date ? new Date(candidate.application_date).toLocaleDateString("nl-NL") : "Onbekend"}</span>
              </div>
              
              {(candidate.source || editMode) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Bron:</span>
                   {editMode && canEdit && !isExternalRecruiter ? (
                     <CandidateSourceSelect
                       value={formData.source || ""}
                       onValueChange={(value) => setFormData({ ...formData, source: value })}
                     />
                   ) : (
                     <span>{candidate.source}</span>
                   )}
                </div>
              )}
            </div>

            {/* Files and CV Upload */}
            <Separator />
            <div className="space-y-3">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documenten
              </h3>
              
              <div className="flex gap-2">
                <CVViewer
                  cvUrl={cvUrl}
                  candidateName={`${candidate.first_name} ${candidate.last_name}`}
                  candidateId={candidate.id}
                />
                {candidate.linkedin_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">
                      LinkedIn
                    </a>
                  </Button>
                )}
              </div>
              
              {editMode && (canEdit || canEditLimitedFields) && (
                <CVUpload
                  candidateId={candidate.id}
                  onCVUploaded={(url) => {
                    setFormData({ ...formData, cv_url: url });
                    onCandidateUpdated();
                  }}
                />
              )}
            </div>

            {/* Salary Requirements */}
            {canViewSalary && (candidate.salary_requirements || editMode) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Salariswens
                  </h3>
                   {editMode && (canEdit || canEditLimitedFields) ? (
                     <RichTextEditor
                       value={formData.salary_requirements || ""}
                       onChange={(value) => setFormData({ ...formData, salary_requirements: value })}
                       placeholder="Salariswens van de kandidaat..."
                       minHeight="100px"
                     />
                   ) : (
                     <div className="bg-muted/50 p-3 rounded-lg">
                       <SafeHtml html={candidate.salary_requirements || ""} className="text-sm prose prose-sm max-w-none" />
                     </div>
                   )}
                </div>
              </>
            )}

            {/* Interview Notes */}
            {interviews.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Gespreksnotities
                  </h3>
                  
                  <Tabs defaultValue="first_interview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="first_interview">1e gesprek</TabsTrigger>
                      <TabsTrigger value="second_interview">2e gesprek</TabsTrigger>
                      <TabsTrigger value="third_interview">3e gesprek</TabsTrigger>
                    </TabsList>
                    
                    {(['first_interview', 'second_interview', 'third_interview'] as const).map((phase) => {
                      const interview = interviews.find(i => i.phase === phase && i.interview_notes);
                      
                      return (
                        <TabsContent key={phase} value={phase} className="mt-4">
                          {interview ? (
                            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Interviewer:</span>
                                  <p className="font-medium">
                                    {interview.interviewer_id ? getDisplayName(interview.interviewer_id) : 'Onbekend'}
                                  </p>
                                </div>
                                
                                {interview.scheduled_date && (
                                  <div>
                                    <span className="text-muted-foreground">Datum:</span>
                                    <p className="font-medium">
                                      {new Date(interview.scheduled_date).toLocaleDateString('nl-NL', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                )}
                                
                                {interview.location && (
                                  <div>
                                    <span className="text-muted-foreground">Locatie:</span>
                                    <p className="font-medium">{interview.location}</p>
                                  </div>
                                )}
                              </div>
                              
                              <div>
                                <span className="text-muted-foreground text-sm">Notities:</span>
                                <div className="mt-1 bg-background p-3 rounded border">
                                  <SafeHtml html={interview.interview_notes || ""} className="text-sm prose prose-sm max-w-none" />
                                </div>
                              </div>
                              
                              {interview.notes_submitted_at && (
                                <div className="text-xs text-muted-foreground">
                                  Ingediend op: {new Date(interview.notes_submitted_at).toLocaleDateString('nl-NL', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-6 text-muted-foreground">
                              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>Nog geen notities voor dit gesprek</p>
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </div>
              </>
            )}

            {/* Notes */}
            {(candidate.notes || candidate.general_information || editMode) && (
              <>
                <Separator />
                <div className="space-y-3">
                  {(candidate.general_information || editMode) && (
                    <div>
                      <Label className="text-sm font-medium">Algemene informatie</Label>
                       {editMode && (canEdit || canEditLimitedFields) ? (
                         <RichTextEditor
                           value={formData.general_information || ""}
                           onChange={(value) => setFormData({ ...formData, general_information: value })}
                           placeholder="Algemene informatie over de kandidaat..."
                           minHeight="120px"
                           className="mt-1"
                         />
                       ) : candidate.general_information ? (
                         <SafeHtml html={candidate.general_information} className="text-sm mt-1 prose prose-sm max-w-none" />
                       ) : null}
                    </div>
                  )}

                  {(candidate.notes || editMode) && (
                    <div>
                      <Label className="text-sm font-medium">Interne notities</Label>
                       {editMode && canEdit && !isExternalRecruiter ? (
                         <RichTextEditor
                           value={formData.notes || ""}
                           onChange={(value) => setFormData({ ...formData, notes: value })}
                           placeholder="Interne notities..."
                           minHeight="120px"
                           className="mt-1"
                         />
                       ) : candidate.notes ? (
                         <SafeHtml html={candidate.notes} className="text-sm mt-1 prose prose-sm max-w-none" />
                       ) : null}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes confirmation */}
      <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Niet-opgeslagen wijzigingen</AlertDialogTitle>
            <AlertDialogDescription>
              Je hebt wijzigingen aangebracht die nog niet zijn opgeslagen. Wil je ze opslaan of sluiten zonder op te slaan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedAlert(false)}>
              Terug
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnsavedAlert(false);
                setEditMode(false);
                if (candidate) setFormData(candidate);
                onOpenChange(false); // close without saving
              }}
            >
              Sluiten zonder opslaan
            </AlertDialogAction>
            <Button
              onClick={async () => {
                const ok = await handleSave();
                if (ok) {
                  setShowUnsavedAlert(false);
                  onOpenChange(false); // close after successful save
                }
              }}
            >
              Opslaan en sluiten
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};