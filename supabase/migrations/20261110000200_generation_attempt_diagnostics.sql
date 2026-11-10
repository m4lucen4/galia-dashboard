begin;
set local lock_timeout = '5s';

-- Never create an accidentally PUBLIC summary if the prerequisite is absent.
do $$
begin
  if to_regprocedure('public.publication_generation_summary(uuid)') is null
    or to_regprocedure('public.publication_generation_finish(uuid,integer,uuid,text,text,text)') is null then
    raise exception 'Generation prerequisites missing';
  end if;
end;
$$;

-- Existing table-level SELECT/RLS applies: only content-free metadata belongs here.
alter table public.publication_generation_slots
  add column attempt_diagnostics jsonb not null default '[]'::jsonb
  check (jsonb_typeof(attempt_diagnostics) = 'array' and jsonb_array_length(attempt_diagnostics) <= 9);

create or replace function public.publication_generation_summary(p_job uuid)
returns jsonb language sql volatile security definer set search_path = '' as $$
  select jsonb_build_object(
    'jobId', j.id, 'projectId', j.project_id::text, 'status', j.status,
    'total', j.total, 'retryCount', j.retry_count, 'updatedAt', j.updated_at,
    'requestedModel', j.requested_model, 'promptVersion', j.prompt_version,
    'succeeded', (select count(*) from public.publication_generation_slots s where s.job_id = j.id and s.state = 'succeeded'),
    'failed', (select count(*) from public.publication_generation_slots s where s.job_id = j.id and s.state = 'failed'),
    'pending', (select count(*) from public.publication_generation_slots s where s.job_id = j.id and s.state in ('queued', 'running')),
    'canRetry', j.status in ('partial', 'failed') and j.retry_count < 2 and exists (
      select 1 from public.publication_generation_slots s where s.job_id = j.id and s.state = 'failed' and s.retryable
    ),
    'slots', (select jsonb_agg(jsonb_build_object(
      'slot', s.slot, 'state', s.state, 'attempts', s.attempts,
      'previewId', s.preview_id::text, 'errorCode', s.error_code,
      'retryable', s.retryable, 'actualModel', s.actual_model,
      'attemptDiagnostics', s.attempt_diagnostics
    ) order by s.slot) from public.publication_generation_slots s where s.job_id = j.id)
  ) from public.publication_generation_jobs j where j.id = p_job;
$$;

create function public.publication_generation_finish_with_diagnostics(
  p_job uuid, p_slot integer, p_token uuid,
  p_description text, p_actual_model text, p_error text, p_diagnostics jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_key text;
  v_value jsonb;
  v_number numeric;
begin
  if p_diagnostics is null or jsonb_typeof(p_diagnostics) <> 'object'
    or octet_length(p_diagnostics::text) > 2048
    or not (p_diagnostics ? 'reason') then raise exception 'invalid_request'; end if;
  for v_key, v_value in select key, value from jsonb_each(p_diagnostics) loop
    case
      when v_key = 'reason' then
        if jsonb_typeof(v_value) <> 'string' or v_value #>> '{}' not in (
          'completed', 'non_ai', 'output_token_limit', 'content_filter', 'incomplete_response',
          'provider_failed', 'provider_refusal', 'invalid_json', 'invalid_structure', 'missing_output',
          'multiple_outputs', 'empty_text', 'text_too_long', 'word_limit', 'line_breaks',
          'markup_not_allowed', 'hashtags_not_allowed', 'provider_timeout', 'network_error',
          'http_error', 'invalid_project', 'internal_error'
        ) then raise exception 'invalid_request'; end if;
      when v_key = 'responseStatus' then
        if jsonb_typeof(v_value) <> 'string' or v_value #>> '{}' not in (
          'completed', 'incomplete', 'failed', 'cancelled', 'queued', 'in_progress', 'unknown'
        ) then raise exception 'invalid_request'; end if;
      when v_key = 'incompleteReason' then
        if jsonb_typeof(v_value) <> 'string' or v_value #>> '{}' not in (
          'max_output_tokens', 'content_filter', 'max_messages', 'steered', 'other'
        ) then raise exception 'invalid_request'; end if;
      when v_key = 'normalizedLineBreaks' then
        if jsonb_typeof(v_value) <> 'boolean' then raise exception 'invalid_request'; end if;
      when v_key in ('inputTokens', 'outputTokens', 'reasoningTokens', 'maxOutputTokens',
        'durationMs', 'wordCount', 'characterCount', 'httpStatus') then
        if jsonb_typeof(v_value) <> 'number' then raise exception 'invalid_request'; end if;
        v_number := (v_value #>> '{}')::numeric;
        if v_number <> trunc(v_number) or v_number < 0 or v_number > 1000000000
          or (v_key = 'httpStatus' and (v_number < 100 or v_number > 599)) then
          raise exception 'invalid_request';
        end if;
      else raise exception 'invalid_request';
    end case;
  end loop;
  if (p_error is null) <> ((p_diagnostics->>'reason') in ('completed', 'non_ai')) then
    raise exception 'invalid_request';
  end if;

  -- Do not lock slots first. The legacy RPC acquires the existing advisory /
  -- project / job / slot locks and retains them until THIS transaction ends.
  -- A fenced or ambiguous finish must never be followed by a compensating write.
  if not public.publication_generation_finish(p_job, p_slot, p_token,
    p_description, p_actual_model, p_error) then return false; end if;
  update public.publication_generation_slots s set attempt_diagnostics =
    s.attempt_diagnostics || jsonb_build_array(jsonb_build_object(
      'attempt', s.attempts, 'recordedAt', s.updated_at,
      'outcome', case when p_error is null then 'succeeded' else 'failed' end,
      'errorCode', p_error, 'details', p_diagnostics
    )) where s.job_id = p_job and s.slot = p_slot;
  return true;
end;
$$;
revoke all on function public.publication_generation_finish_with_diagnostics(uuid, integer, uuid, text, text, text, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.publication_generation_finish_with_diagnostics(uuid, integer, uuid, text, text, text, jsonb)
  to service_role;

-- Legacy finish, summary ownership/ACL, table grants and all RLS policies remain.
-- Missing historical/crashed/fenced attempts are intentionally not reconstructed.
notify pgrst, 'reload schema';
commit;
