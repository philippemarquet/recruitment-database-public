
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PublicProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role?: string;
}

export const usePublicProfiles = (profileIds: string[]) => {
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});
  const [loading, setLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Create stable dependency key: deduplicate and sort IDs
    const uniqueSortedIds = [...new Set(profileIds)].sort();
    const idsKey = JSON.stringify(uniqueSortedIds);
    
    if (uniqueSortedIds.length === 0) {
      setProfiles({});
      return;
    }

    fetchProfiles(uniqueSortedIds);
  }, [JSON.stringify([...new Set(profileIds)].sort())]);

  const fetchProfiles = async (idsToFetch: string[]) => {
    if (idsToFetch.length === 0) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_public_profiles', {
        ids: idsToFetch
      });

      if (error) throw error;

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      const profileMap: Record<string, PublicProfile> = {};
      data?.forEach((profile) => {
        profileMap[profile.id] = profile;
      });

      setProfiles(profileMap);
    } catch (error) {
      console.error("Error fetching public profiles:", error);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const getProfile = (id: string): PublicProfile | null => {
    return profiles[id] || null;
  };

  const getDisplayName = (id: string): string => {
    const profile = getProfile(id);
    if (!profile) return "Onbekend";
    
    const firstName = profile.first_name || "";
    const lastName = profile.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Onbekend";
  };

  return {
    profiles,
    loading,
    getProfile,
    getDisplayName
  };
};
