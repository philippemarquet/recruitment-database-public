import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type RecruitmentPhase = Database['public']['Enums']['recruitment_phase'];

interface PhaseFilterProps {
  selectedPhase: RecruitmentPhase | "all" | "active" | "hired";
  onPhaseChange: (phase: RecruitmentPhase | "all" | "active" | "hired") => void;
}

const phaseLabels: Record<RecruitmentPhase | "all" | "active" | "hired", string> = {
  all: "Alle fases",
  active: "Actief",
  hired: "Aangenomen",
  screening: "Screening",
  first_interview: "1e gesprek",
  second_interview: "2e gesprek",
  third_interview: "3e gesprek",
  negotiation: "Onderhandeling",
  on_hold: "On hold",
  rejected: "Afgewezen"
};

export const PhaseFilter = ({ selectedPhase, onPhaseChange }: PhaseFilterProps) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Filter:</span>
      <Select value={selectedPhase} onValueChange={onPhaseChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle fases</SelectItem>
          <SelectItem value="active">Actief</SelectItem>
          <SelectItem value="hired">Aangenomen</SelectItem>
          <SelectItem value="screening">Screening</SelectItem>
          <SelectItem value="first_interview">1e gesprek</SelectItem>
          <SelectItem value="second_interview">2e gesprek</SelectItem>
          <SelectItem value="third_interview">3e gesprek</SelectItem>
          <SelectItem value="negotiation">Onderhandeling</SelectItem>
          <SelectItem value="on_hold">On hold</SelectItem>
          <SelectItem value="rejected">Afgewezen</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};