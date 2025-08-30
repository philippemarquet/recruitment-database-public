import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role: string;
  avatar_url?: string;
  recruiter_source?: string;
}

export const useUserProfile = (userId?: string) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: "view_salary" | "edit_all" | "manage_users") => {
    if (!profile) return false;

    switch (permission) {
      case "view_salary":
        return profile.role === "manager";
      case "edit_all":
        return profile.role === "manager";
      case "manage_users":
        return profile.role === "manager";
      default:
        return false;
    }
  };

  const isManager = profile?.role === "manager";
  const isMedewerker = profile?.role === "medewerker";
  const isExterneRecruiter = profile?.role === "externe_recruiter";

  return {
    profile,
    loading,
    hasPermission,
    isManager,
    isMedewerker,
    isExterneRecruiter,
    refetch: fetchProfile
  };
};