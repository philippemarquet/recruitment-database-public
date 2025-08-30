import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Position {
  id: string;
  name: string;
}

interface PositionSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export const PositionSelect = ({ value, onValueChange, placeholder = "Selecteer positie" }: PositionSelectProps) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from("positions")
        .select("id, name")
        .eq("active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error("Error fetching positions:", error);
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
        {positions.map((position) => (
          <SelectItem key={position.id} value={position.name}>
            {position.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};