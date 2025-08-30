import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Gender {
  id: string;
  name: string;
}

interface GenderSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const GenderSelect = ({ value, onValueChange, placeholder = "Selecteer geslacht" }: GenderSelectProps) => {
  const [genders, setGenders] = useState<Gender[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGenders();
  }, []);

  const fetchGenders = async () => {
    try {
      const { data, error } = await supabase
        .from("genders")
        .select("id, name")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setGenders(data || []);
    } catch (error) {
      console.error("Error fetching genders:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange} disabled={loading}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {genders.map((gender) => (
          <SelectItem key={gender.id} value={gender.name}>
            {gender.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};