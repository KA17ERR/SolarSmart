-- Keep the project header, roof/system configuration, and latest calculation
-- in a single transaction. Authenticated callers remain protected by RLS.
create or replace function public.save_solar_project_atomic(
  p_project_id uuid,
  p_name text,
  p_location_label text,
  p_inputs jsonb,
  p_outputs jsonb,
  p_monthly_consumption_kwh numeric,
  p_tariff_usd_per_kwh numeric,
  p_calculation_version text,
  p_roof jsonb,
  p_system jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_project_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_name is null or char_length(trim(p_name)) not between 1 and 120
     or p_location_label is null or char_length(p_location_label) > 120
     or jsonb_typeof(p_inputs) <> 'object' or jsonb_typeof(p_outputs) <> 'object'
     or jsonb_typeof(p_roof) <> 'object' or jsonb_typeof(p_system) <> 'object'
     or p_monthly_consumption_kwh not between 1 and 30000
     or p_tariff_usd_per_kwh not between 0.001 and 1000
     or p_calculation_version is null or char_length(p_calculation_version) > 120 then
    raise exception 'Invalid solar project data';
  end if;

  if p_project_id is null then
    insert into public.solar_projects(owner_id, name, location_label, assessment_status)
    values (v_user_id, trim(p_name), p_location_label, 'estimated')
    returning id into v_project_id;
  else
    update public.solar_projects
      set name = trim(p_name), location_label = p_location_label, assessment_status = 'estimated'
      where id = p_project_id and owner_id = v_user_id
      returning id into v_project_id;
    if v_project_id is null then raise exception 'Project unavailable'; end if;
  end if;

  insert into public.roof_configurations(project_id, width_m, length_m, area_m2, panel_orientation, roof_facing, tilt_degrees, shading, assumptions)
  values (v_project_id, (p_roof->>'width_m')::numeric, (p_roof->>'length_m')::numeric,
    (p_roof->>'area_m2')::numeric, p_roof->>'panel_orientation', p_roof->>'roof_facing',
    (p_roof->>'tilt_degrees')::numeric, p_roof->>'shading', coalesce(p_roof->'assumptions', '{}'::jsonb))
  on conflict (project_id) do update set width_m = excluded.width_m, length_m = excluded.length_m,
    area_m2 = excluded.area_m2, panel_orientation = excluded.panel_orientation,
    roof_facing = excluded.roof_facing, tilt_degrees = excluded.tilt_degrees,
    shading = excluded.shading, assumptions = excluded.assumptions;

  insert into public.solar_system_configurations(project_id, panel_watts, panel_count, panel_positions, installed_capacity_kw, battery_capacity_kwh, assumptions)
  values (v_project_id, (p_system->>'panel_watts')::integer, (p_system->>'panel_count')::integer,
    coalesce(p_system->'panel_positions', '[]'::jsonb), (p_system->>'installed_capacity_kw')::numeric,
    (p_system->>'battery_capacity_kwh')::numeric, coalesce(p_system->'assumptions', '{}'::jsonb))
  on conflict (project_id) do update set panel_watts = excluded.panel_watts,
    panel_count = excluded.panel_count, panel_positions = excluded.panel_positions,
    installed_capacity_kw = excluded.installed_capacity_kw,
    battery_capacity_kwh = excluded.battery_capacity_kwh, assumptions = excluded.assumptions;

  insert into public.energy_assessments(project_id, monthly_consumption_kwh, tariff_usd_per_kwh,
    estimated_generation_kwh, estimated_savings_usd, estimated_payback_years,
    calculation_version, inputs, outputs)
  values (v_project_id, p_monthly_consumption_kwh, p_tariff_usd_per_kwh,
    (p_outputs->>'annualProductionKwh')::numeric, (p_outputs->>'annualSavings')::numeric,
    (p_outputs->>'paybackYears')::numeric, p_calculation_version, p_inputs, p_outputs);

  return v_project_id;
end;
$$;

revoke all on function public.save_solar_project_atomic(uuid, text, text, jsonb, jsonb, numeric, numeric, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_solar_project_atomic(uuid, text, text, jsonb, jsonb, numeric, numeric, text, jsonb, jsonb) to authenticated;
