import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface SeniorityLevel {
  id: string;
  name: string;
  active: boolean;
}

interface SeniorityLevelSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const SeniorityLevelSelect = ({ 
  value, 
  onValueChange, 
  placeholder = "Selecteer niveau" 
}: SeniorityLevelSelectProps) => {
  const [levels, setLevels] = useState<SeniorityLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from("seniority_levels")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error("Error fetching seniority levels:", error);
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
        {levels.map((level) => (
          <SelectItem key={level.id} value={level.name}>
            {level.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};