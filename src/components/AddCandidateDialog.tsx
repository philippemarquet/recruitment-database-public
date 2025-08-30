import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CandidateSourceSelect } from "./CandidateSourceSelect";
import { SeniorityLevelSelect } from "./SeniorityLevelSelect";
import { PositionSelect } from "./PositionSelect";
import { GenderSelect } from "./GenderSelect";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Upload } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeInput, sanitizeHTML, validateFile, generateSecureFilePath, logSecurityEvent, rateLimiter } from "@/lib/security";
import { RichTextEditor } from "./ui/rich-text-editor";

const candidateSchema = z.object({
  first_name: z.string().min(1, "Voornaam is verplicht"),
  last_name: z.string().min(1, "Achternaam is verplicht"),
  email: z.string().email("Ongeldig email adres"),
  phone: z.string().optional(),
  position_applied: z.string().min(1, "Positie is verplicht"),
  seniority_level: z.string().optional(),
  gender: z.string().optional(),
  salary_requirements: z.string().optional(),
  source: z.string().optional(),
  application_date: z.string().optional(),
  general_information: z.string().optional(),
});

type CandidateFormData = z.infer<typeof candidateSchema>;

interface AddCandidateDialogProps {
  onCandidateAdded: () => void;
  isExternalRecruiter?: boolean;
  forcedSource?: string;
}

export const AddCandidateDialog = ({ 
  onCandidateAdded, 
  isExternalRecruiter = false, 
  forcedSource 
}: AddCandidateDialogProps) => {
  const [open, setOpen] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<CandidateFormData>({
    resolver: zodResolver(candidateSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      position_applied: "",
      application_date: new Date().toISOString().split('T')[0],
      source: forcedSource || "",
    },
  });

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

  const uploadCV = async (candidateId: string): Promise<string | null> => {
    if (!cvFile) return null;

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

      return filePath;
    } catch (error) {
      console.error('Error uploading CV:', error);
      toast({
        title: "Fout bij CV upload",
        description: "Er is een fout opgetreden bij het uploaden van het CV.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const onSubmit = async (data: CandidateFormData) => {
    try {
      // Rate limiting
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !rateLimiter.isAllowed(`add_candidate_${user.id}`, 10, 60000)) { // 10 attempts per minute
        toast({
          title: "Te veel verzoeken",
          description: "Wacht even voordat je een nieuwe kandidaat toevoegt.",
          variant: "destructive",
        });
        return;
      }

      setUploading(true);

      // Sanitize input data
      const sanitizedData = {
        ...data,
        first_name: sanitizeInput(data.first_name),
        last_name: sanitizeInput(data.last_name),
        email: sanitizeInput(data.email),
        phone: data.phone ? sanitizeInput(data.phone) : null,
        position_applied: sanitizeInput(data.position_applied),
        seniority_level: data.seniority_level ? sanitizeInput(data.seniority_level) : null,
        gender: data.gender ? sanitizeInput(data.gender) : null,
        source: data.source ? sanitizeInput(data.source) : null,
        salary_requirements: data.salary_requirements ? sanitizeHTML(data.salary_requirements) : null,
        general_information: data.general_information ? sanitizeHTML(data.general_information) : null,
      };

      // Find HR manager to auto-assign candidates
      const { data: hrManager } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "hr_manager")
        .limit(1)
        .single();

      // Pre-generate candidate ID so we can attach CV before insert
      const candidateId = crypto.randomUUID();

      // Upload CV first (so we can include it in the initial insert to avoid extra update)
      let cvUrl: string | null = null;
      if (cvFile) {
        try {
          cvUrl = await uploadCV(candidateId);
          
          // Log CV upload
          await logSecurityEvent('cv_upload', {
            candidate_id: candidateId,
            file_name: cvFile.name,
            file_size: cvFile.size
          });
        } catch (e) {
          console.error("CV upload failed before insert:", e);
          // Continue without CV if upload fails
        }
      }

      // Create the candidate including the CV path if available
      const { error: insertError } = await supabase
        .from("candidates")
        .insert({
          id: candidateId,
          first_name: sanitizedData.first_name,
          last_name: sanitizedData.last_name,
          email: sanitizedData.email,
          phone: sanitizedData.phone,
          position_applied: sanitizedData.position_applied,
          seniority_level: sanitizedData.seniority_level,
          gender: sanitizedData.gender,
          salary_requirements: sanitizedData.salary_requirements,
          source: sanitizedData.source,
          application_date: data.application_date || null,
          general_information: sanitizedData.general_information,
          current_phase: "screening",
          assigned_to: hrManager?.id || null,
          cv_url: cvUrl,
        });

      if (insertError) throw insertError;

      // Create screening action for HR manager
      if (hrManager) {
        const { error: actionError } = await supabase
          .from("candidate_actions")
          .insert({
            candidate_id: candidateId,
            assigned_to: hrManager.id,
            action_type: "screening_review",
            phase: "screening",
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });

        if (actionError) {
          console.error("Error creating screening action:", actionError);
        }
      }

      // Log candidate creation
      await logSecurityEvent('candidate_created', {
        candidate_id: candidateId,
        source: sanitizedData.source
      });

      toast({
        title: "Kandidaat toegevoegd",
        description: `${sanitizedData.first_name} ${sanitizedData.last_name} is succesvol toegevoegd.`,
      });

      form.reset();
      setCvFile(null);
      setOpen(false);
      onCandidateAdded();
    } catch (error) {
      console.error("Error adding candidate:", error);
      toast({
        title: "Fout bij toevoegen kandidaat",
        description: "Er is een fout opgetreden bij het toevoegen van de kandidaat.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nieuwe kandidaat
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe kandidaat toevoegen</DialogTitle>
          <DialogDescription className="sr-only">
            Voeg een nieuwe kandidaat toe inclusief contactgegevens en CV.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Voornaam *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Achternaam *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefoon</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="position_applied"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Positie *</FormLabel>
                  <FormControl>
                    <PositionSelect
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      placeholder="Selecteer positie"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="seniority_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Functieniveau</FormLabel>
                    <FormControl>
                      <SeniorityLevelSelect
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder="Selecteer niveau"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geslacht</FormLabel>
                    <FormControl>
                      <GenderSelect
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder="Selecteer geslacht"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {!isExternalRecruiter && (
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bron</FormLabel>
                      <FormControl>
                        <CandidateSourceSelect
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Selecteer bron"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {isExternalRecruiter && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">Bron:</span>
                  <span className="font-medium">{forcedSource}</span>
                </div>
              )}

              <FormField
                control={form.control}
                name="application_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aanmeldingsdatum</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="salary_requirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Salariseisen</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Bijv. €3000-€4000 per maand"
                      minHeight="80px"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>CV Upload</FormLabel>
              <div className="mt-2">
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="h-10 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC of DOCX bestanden (max 5MB)
                </p>
                {cvFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Geselecteerd: {cvFile.name}
                  </p>
                )}
              </div>
            </div>

            <FormField
              control={form.control}
              name="general_information"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Algemene informatie</FormLabel>
                  <FormControl>
                    <RichTextEditor
                      value={field.value || ""}
                      onChange={field.onChange}
                      placeholder="Aanvullende informatie over de kandidaat..."
                      minHeight="120px"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={uploading}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Bezig met opslaan...
                  </>
                ) : (
                  "Kandidaat toevoegen"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};