import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidateSourceSelect } from "./CandidateSourceSelect";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Loader2, Trash2, Users } from "lucide-react";
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
  recruiter_source?: string;
  created_at: string;
}

interface UserManagementProps {
  currentUser: SupabaseUser;
  currentUserRole?: string;
}

export const UserManagement = ({ currentUser, currentUserRole }: UserManagementProps) => {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone: "",
    role: "medewerker",
    recruiter_source: ""
  });
  const { toast } = useToast();

  // Managers and HR managers can access user management
  const canManageUsers = currentUserRole === "manager" || currentUserRole === "hr_manager";

  useEffect(() => {
    if (open && canManageUsers) {
      fetchUsers();
    }
  }, [open, canManageUsers]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Fout bij ophalen gebruikers",
        description: "Er is een fout opgetreden bij het ophalen van gebruikers.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    setCreating(true);
    try {
      // Call the Edge Function for user creation
      const { data, error } = await supabase.functions.invoke('user-management', {
        body: {
          action: 'createUser',
          userData: {
            email: formData.email,
            password: formData.password,
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
            role: formData.role,
            recruiter_source: formData.recruiter_source,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Gebruiker aangemaakt",
        description: `${formData.first_name} ${formData.last_name} is succesvol aangemaakt.`,
      });

      // Reset form and refresh users
      setFormData({
        email: "",
        password: "",
        first_name: "",
        last_name: "",
        phone: "",
        role: "medewerker",
        recruiter_source: ""
      });
      
      await fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      let errorMessage = "Er is een fout opgetreden bij het aanmaken van de gebruiker.";
      if (error.message?.includes("already registered")) {
        errorMessage = "Er bestaat al een gebruiker met dit e-mailadres.";
      } else if (error.message?.includes("password")) {
        errorMessage = "Het wachtwoord voldoet niet aan de eisen.";
      }
      
      toast({
        title: "Fout bij aanmaken gebruiker",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Weet je zeker dat je ${userEmail} wilt verwijderen?`)) {
      return;
    }

    try {
      // Call the Edge Function for user deletion
      const { error } = await supabase.functions.invoke('user-management', {
        body: {
          action: 'deleteUser',
          userData: { userId }
        }
      });

      if (error) throw error;

      toast({
        title: "Gebruiker verwijderd",
        description: `${userEmail} is succesvol verwijderd.`,
      });

      await fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Fout bij verwijderen",
        description: "Er is een fout opgetreden bij het verwijderen van de gebruiker.",
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (profileId: string, newRole: string, userEmail: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", profileId);

      if (error) throw error;

      toast({
        title: "Rol bijgewerkt",
        description: `Rol van ${userEmail} is bijgewerkt naar ${getRoleLabel(newRole)}.`,
      });

      await fetchUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Fout bij bijwerken rol",
        description: "Er is een fout opgetreden bij het bijwerken van de rol.",
        variant: "destructive",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "manager": return "Manager";
      case "hr_manager": return "HR Manager";
      case "medewerker": return "Medewerker";
      case "externe_recruiter": return "Externe recruiter";
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "manager": return "bg-red-100 text-red-800 border-red-200";
      case "hr_manager": return "bg-purple-100 text-purple-800 border-purple-200";
      case "medewerker": return "bg-blue-100 text-blue-800 border-blue-200";
      case "externe_recruiter": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (!canManageUsers) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Gebruikers beheren
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gebruikersbeheer</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create User Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Nieuwe gebruiker aanmaken
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  placeholder="gebruiker@bedrijf.nl"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Tijdelijk wachtwoord</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Tijdelijk wachtwoord (min. 6 karakters)"
                  required
                  minLength={6}
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

              <div>
                <Label htmlFor="role">Rol</Label>
                <Select value={formData.role} onValueChange={(value) => {
                  setFormData({ ...formData, role: value });
                  // Reset recruiter_source when role changes
                  if (value !== "externe_recruiter") {
                    setFormData(prev => ({ ...prev, recruiter_source: "" }));
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medewerker">Medewerker</SelectItem>
                    <SelectItem value="externe_recruiter">Externe recruiter</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="hr_manager">HR Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.role === "externe_recruiter" && (
                <div>
                  <Label htmlFor="recruiter_source">Gekoppelde bron</Label>
                  <CandidateSourceSelect
                    value={formData.recruiter_source}
                    onValueChange={(value) => setFormData({ ...formData, recruiter_source: value })}
                    placeholder="Selecteer bron voor externe recruiter"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deze externe recruiter ziet alleen kandidaten met deze bron
                  </p>
                </div>
              )}

              <Button 
                onClick={createUser} 
                disabled={creating || !formData.email || !formData.password || (formData.role === "externe_recruiter" && !formData.recruiter_source)}
                className="w-full"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aanmaken...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Gebruiker aanmaken
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Bestaande gebruikers</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nog geen gebruikers gevonden.
                </p>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-medium">
                              {user.first_name} {user.last_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.phone && (
                              <p className="text-sm text-muted-foreground">{user.phone}</p>
                            )}
                            {user.role === "externe_recruiter" && user.recruiter_source && (
                              <p className="text-xs text-muted-foreground">Bron: {user.recruiter_source}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Only show role to HR managers */}
                        {currentUserRole === "hr_manager" && (
                          <>
                            <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                            
                            <Select
                              value={user.role}
                              onValueChange={(newRole) => updateUserRole(user.id, newRole, user.email || "")}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="medewerker">Medewerker</SelectItem>
                                <SelectItem value="externe_recruiter">Externe recruiter</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="hr_manager">HR Manager</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        )}
                        
                        {/* Password Reset for HR Managers */}
                        {currentUserRole === "hr_manager" && user.user_id !== currentUser.id && (
                          <PasswordManagement
                            isCurrentUser={false}
                            userEmail={user.email || ""}
                            onPasswordReset={fetchUsers}
                          />
                        )}
                        
                        {/* Only HR Managers can delete users */}
                        {currentUserRole === "hr_manager" && user.user_id !== currentUser.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteUser(user.user_id, user.email || "")}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};