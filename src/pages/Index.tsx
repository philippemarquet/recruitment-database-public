import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CandidatesDashboard } from "@/components/CandidatesDashboard";
import { ExternalRecruiterDashboard } from "@/components/ExternalRecruiterDashboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { UserManagement } from "@/components/UserManagement";
import { useUserProfile } from "@/hooks/useUserProfile";
import { NhancedLogo } from "@/components/NhancedLogo";

import type { User, Session } from '@supabase/supabase-js';
const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const {
    profile
  } = useUserProfile(user?.id);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Redirect to auth if not authenticated
      if (!session?.user) {
        navigate("/auth");
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate("/auth");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  const handleSignOut = async () => {
    try {
      // Sign out locally to avoid server-side session errors across environments
      await supabase.auth.signOut({ scope: 'local' as any });

      // Best-effort global signout (ignore "session not found" noise)
      const { error: globalErr } = await supabase.auth.signOut({ scope: 'global' as any });
      if (globalErr) {
        const msg = (globalErr as any)?.message || '';
        const code = (globalErr as any)?.code || '';
        if (!msg.includes('Session not found') && !code.includes('session_not_found')) {
          throw globalErr;
        }
      }

      toast({
        title: "Uitgelogd",
        description: "Je bent succesvol uitgelogd."
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: "Fout bij uitloggen",
        description: "Er is een fout opgetreden bij het uitloggen.",
        variant: "destructive"
      });
    } finally {
      // Force-clear any lingering Supabase auth tokens
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('sb-'))
          .forEach((k) => localStorage.removeItem(k));
      } catch (_) {}

      setUser(null);
      setSession(null);
      navigate("/auth");
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  if (!user) {
    // Show loading while redirecting to auth page
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;
  }
  return <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <NhancedLogo variant="compact" />
            <div className="border-l border-border pl-4">
              <h1 className="text-xl font-semibold text-primary">Recruitment</h1>
              <p className="text-sm text-muted-foreground">
                Ingelogd als: {user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(profile?.role === "manager" || profile?.role === "hr_manager") && user && <UserManagement currentUser={user} currentUserRole={profile.role} />}
            <UserProfileDialog user={user} />
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Uitloggen
            </Button>
          </div>
        </div>
      </header>
      {profile?.role === "externe_recruiter" ? (
        <ExternalRecruiterDashboard 
          currentUserId={user.id} 
          recruiterSource={profile.recruiter_source || ""} 
        />
      ) : profile?.role === "hr_manager" ? (
      <CandidatesDashboard 
        currentUserRole={profile?.role} 
        currentUserId={user.id} 
      />
      ) : (
        <CandidatesDashboard 
          currentUserRole={profile?.role} 
          currentUserId={user.id} 
        />
      )}
    </div>;
};
export default Index;