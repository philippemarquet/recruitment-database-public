import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Loader2 } from "lucide-react";

interface PasswordManagementProps {
  isCurrentUser?: boolean;
  userEmail?: string;
  onPasswordReset?: () => void;
}

export const PasswordManagement = ({ 
  isCurrentUser = true, 
  userEmail,
  onPasswordReset 
}: PasswordManagementProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Wachtwoorden komen niet overeen",
        description: "Het nieuwe wachtwoord en bevestiging moeten gelijk zijn.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Wachtwoord te kort",
        description: "Het wachtwoord moet minimaal 6 karakters lang zijn.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Wachtwoord bijgewerkt",
        description: "Je wachtwoord is succesvol gewijzigd.",
      });

      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        title: "Fout bij wijzigen wachtwoord",
        description: error.message || "Er is een fout opgetreden bij het wijzigen van je wachtwoord.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!userEmail) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: "https://pvlowtgvkkpwepvzhaox.supabase.co/auth/v1/verify?type=recovery&redirect_to=" + encodeURIComponent(`${window.location.protocol}//${window.location.host}/auth`)
      });

      if (error) throw error;

      toast({
        title: "Wachtwoord reset verzonden",
        description: `Er is een wachtwoord reset e-mail verzonden naar ${userEmail}.`,
      });

      onPasswordReset?.();
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Fout bij wachtwoord reset",
        description: error.message || "Er is een fout opgetreden bij het resetten van het wachtwoord.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isCurrentUser) {
    // Password change form for current user
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Wachtwoord wijzigen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="new_password">Nieuw wachtwoord</Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nieuw wachtwoord (min. 6 karakters)"
              minLength={6}
            />
          </div>
          
          <div>
            <Label htmlFor="confirm_password">Bevestig nieuw wachtwoord</Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Bevestig nieuw wachtwoord"
              minLength={6}
            />
          </div>

          <Button 
            onClick={handlePasswordChange}
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wijzigen...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Wachtwoord wijzigen
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  } else {
    // Password reset button for HR managers
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handlePasswordReset}
        disabled={loading || !userEmail}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Lock className="h-4 w-4 mr-2" />
        )}
        Wachtwoord resetten
      </Button>
    );
  }
};