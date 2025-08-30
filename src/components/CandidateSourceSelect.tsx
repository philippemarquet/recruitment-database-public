import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface CandidateSource {
  id: string;
  name: string;
  active: boolean;
}

interface CandidateSourceSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const CandidateSourceSelect = ({ 
  value, 
  onValueChange, 
  placeholder = "Selecteer bron" 
}: CandidateSourceSelectProps) => {
  const [sources, setSources] = useState<CandidateSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const { data, error } = await supabase
        .from("candidate_sources")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setSources(data || []);
    } catch (error) {
      console.error("Error fetching candidate sources:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className="h-8">
          <SelectValue placeholder="Laden..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="loading">Laden...</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-8">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {sources.map((source) => (
          <SelectItem key={source.id} value={source.name}>
            {source.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};