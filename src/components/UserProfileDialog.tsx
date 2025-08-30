import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Loader2, ChevronDown } from "lucide-react";
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { PasswordManagement } from "./PasswordManagement";

interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role: string;
}

interface UserProfileDialogProps {
  user: SupabaseUser;
}

export const UserProfileDialog = ({ user }: UserProfileDialogProps) => {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchProfile();
    }
  }, [open, user.id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Profile doesn't exist, create one
          await createProfile();
        } else {
          throw error;
        }
      } else {
        setProfile(data);
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || user.email || "",
          phone: data.phone || ""
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Fout bij ophalen profiel",
        description: "Er is een fout opgetreden bij het ophalen van je profiel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert({
          user_id: user.id,
          email: user.email,
          role: "medewerker"
        })
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      setFormData({
        first_name: "",
        last_name: "",
        email: user.email || "",
        phone: ""
      });
    } catch (error) {
      console.error("Error creating profile:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name || null,
          last_name: formData.last_name || null,
          email: formData.email || null,
          phone: formData.phone || null
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "Profiel bijgewerkt",
        description: "Je profiel is succesvol bijgewerkt.",
      });

      // Refresh profile data
      await fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Fout bij bijwerken",
        description: "Er is een fout opgetreden bij het bijwerken van je profiel.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <User className="h-4 w-4 mr-2" />
          Profiel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mijn profiel</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Form Fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">Voornaam</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="Voornaam"
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Achternaam</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Achternaam"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">E-mailadres</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="E-mailadres"
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefoonnummer</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Telefoonnummer"
                />
              </div>
            </div>

            {/* Password Management - Simple Toggle */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-between"
                onClick={() => setPasswordOpen(!passwordOpen)}
                type="button"
              >
                Wachtwoord wijzigen
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${passwordOpen ? 'rotate-180' : ''}`} />
              </Button>
              
              {passwordOpen && (
                <div className="space-y-4 pt-2">
                  <PasswordManagement isCurrentUser={true} />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opslaan...
                  </>
                ) : (
                  "Opslaan"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};