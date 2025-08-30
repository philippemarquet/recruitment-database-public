
-- 1) Functie: na het voltooien van een interview mét notities, maak HR-actie aan
create or replace function public.create_phase_decision_action_on_interview_complete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hr uuid;
begin
  -- Bepaal HR manager (veilig via security definer)
  select public.get_hr_manager() into v_hr;

  if v_hr is null then
    -- Geen HR manager gevonden => doe niets
    return new;
  end if;

  -- Voorwaarde: interview is afgerond en er staan notities
  if new.status = 'completed'
     and coalesce(trim(new.interview_notes), '') <> '' then
     
     -- Check: bestaat er al een openstaande phase_decision-actie voor deze kandidaat+fase?
     if not exists (
       select 1
       from public.candidate_actions a
       where a.candidate_id = new.candidate_id
         and a.phase = new.phase
         and a.action_type = 'phase_decision'
         and a.completed = false
     ) then
       insert into public.candidate_actions (
         candidate_id, assigned_to, action_type, phase, due_date
       ) values (
         new.candidate_id, v_hr, 'phase_decision', new.phase, now() + interval '3 days'
       );
     end if;
  end if;

  return new;
end;
$$;

-- 2) Trigger: activeer de functie na updates waarbij status/interview_notes betrokken zijn
drop trigger if exists trg_create_phase_decision_after_notes on public.interviews;

create trigger trg_create_phase_decision_after_notes
after update of interview_notes, status on public.interviews
for each row
when (new.status = 'completed')
execute procedure public.create_phase_decision_action_on_interview_complete();

-- 3) Unieke index: één openstaande phase_decision per kandidaat+fase
create unique index if not exists ux_candidate_phase_open_phase_decision
on public.candidate_actions (candidate_id, phase)
where action_type = 'phase_decision' and completed = false;

-- 4) Backfill: maak ontbrekende HR-acties voor reeds afgeronde interviews met notities
insert into public.candidate_actions (candidate_id, assigned_to, action_type, phase, due_date)
select i.candidate_id,
       public.get_hr_manager(),
       'phase_decision',
       i.phase,
       now() + interval '3 days'
from public.interviews i
where i.status = 'completed'
  and coalesce(trim(i.interview_notes), '') <> ''
  and not exists (
    select 1
    from public.candidate_actions a
    where a.candidate_id = i.candidate_id
      and a.phase = i.phase
      and a.action_type = 'phase_decision'
      and a.completed = false
  );
