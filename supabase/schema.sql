create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_url text not null default '',
  file_path text not null default '',
  extracted_text text not null default '',
  parsed_skills text[] not null default '{}',
  parsed_projects text[] not null default '{}',
  parsed_education text not null default '',
  resume_summary text not null default '',
  uploaded_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'resumes'
      and column_name = 'storage_path'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'resumes'
      and column_name = 'file_path'
  ) then
    alter table public.resumes rename column storage_path to file_path;
  end if;
end $$;

alter table public.resumes
  add column if not exists file_path text not null default '';

alter table public.resumes
  add column if not exists resume_summary text not null default '';

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  role text not null,
  target_role text not null default '',
  target_company text not null default '',
  job_description text not null default '',
  type text not null,
  interview_type text not null,
  difficulty text not null,
  mode text not null default 'text' check (mode in ('text', 'voice', 'video')),
  question_count integer not null default 5 check (question_count between 1 and 20),
  status text not null default 'in-progress' check (status in ('in-progress', 'completed', 'cancelled')),
  overall_score integer check (overall_score is null or overall_score between 0 and 100),
  final_report jsonb,
  generated_questions jsonb,
  current_question_index integer not null default 0,
  attempt_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz
);

alter table public.interview_sessions
  add column if not exists generated_questions jsonb,
  add column if not exists current_question_index integer not null default 0,
  add column if not exists attempt_id uuid,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists cancelled_at timestamptz;

alter table public.interview_sessions
  drop constraint if exists interview_sessions_status_check;

alter table public.interview_sessions
  add constraint interview_sessions_status_check
  check (status in ('in-progress', 'completed', 'cancelled'));

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id integer not null,
  question_text text not null,
  answer_text text not null,
  feedback jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  strengths text[] not null default '{}',
  weaknesses text[] not null default '{}',
  improved_answer text not null default '',
  summary text not null default '',
  interview_tip text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.speech_metrics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.visual_metrics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists resumes_user_id_uploaded_at_idx
  on public.resumes (user_id, uploaded_at desc);

create index if not exists interview_sessions_user_id_created_at_idx
  on public.interview_sessions (user_id, created_at desc);

create index if not exists answers_session_id_question_id_idx
  on public.answers (session_id, question_id);

create unique index if not exists answers_session_id_question_id_unique_idx
  on public.answers (session_id, question_id);

create index if not exists answers_user_id_created_at_idx
  on public.answers (user_id, created_at desc);

create index if not exists speech_metrics_user_id_created_at_idx
  on public.speech_metrics (user_id, created_at desc);

create index if not exists visual_metrics_user_id_created_at_idx
  on public.visual_metrics (user_id, created_at desc);

create index if not exists speech_metrics_session_id_created_at_idx
  on public.speech_metrics (session_id, created_at desc);

create index if not exists visual_metrics_session_id_created_at_idx
  on public.visual_metrics (session_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_interview_sessions_updated_at on public.interview_sessions;
create trigger set_interview_sessions_updated_at
before update on public.interview_sessions
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update
  set
    name = excluded.name,
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.answers enable row level security;
alter table public.speech_metrics enable row level security;
alter table public.visual_metrics enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Users can read own resumes" on public.resumes;
create policy "Users can read own resumes"
on public.resumes for select
using (user_id = auth.uid());

drop policy if exists "Users can insert own resumes" on public.resumes;
create policy "Users can insert own resumes"
on public.resumes for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own resumes" on public.resumes;
create policy "Users can update own resumes"
on public.resumes for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own resumes" on public.resumes;
create policy "Users can delete own resumes"
on public.resumes for delete
using (user_id = auth.uid());

drop policy if exists "Users can read own interview sessions" on public.interview_sessions;
create policy "Users can read own interview sessions"
on public.interview_sessions for select
using (user_id = auth.uid());

drop policy if exists "Users can insert own interview sessions" on public.interview_sessions;
create policy "Users can insert own interview sessions"
on public.interview_sessions for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own interview sessions" on public.interview_sessions;
create policy "Users can update own interview sessions"
on public.interview_sessions for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own interview sessions" on public.interview_sessions;
create policy "Users can delete own interview sessions"
on public.interview_sessions for delete
using (user_id = auth.uid());

drop policy if exists "Users can read own answers" on public.answers;
create policy "Users can read own answers"
on public.answers for select
using (user_id = auth.uid());

drop policy if exists "Users can insert own answers" on public.answers;
create policy "Users can insert own answers"
on public.answers for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own answers" on public.answers;
create policy "Users can update own answers"
on public.answers for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own answers" on public.answers;
create policy "Users can delete own answers"
on public.answers for delete
using (user_id = auth.uid());

drop policy if exists "Users can read own speech metrics" on public.speech_metrics;
create policy "Users can read own speech metrics"
on public.speech_metrics for select
using (user_id = auth.uid());

drop policy if exists "Users can insert own speech metrics" on public.speech_metrics;
create policy "Users can insert own speech metrics"
on public.speech_metrics for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own speech metrics" on public.speech_metrics;
create policy "Users can update own speech metrics"
on public.speech_metrics for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own speech metrics" on public.speech_metrics;
create policy "Users can delete own speech metrics"
on public.speech_metrics for delete
using (user_id = auth.uid());

drop policy if exists "Users can read own visual metrics" on public.visual_metrics;
create policy "Users can read own visual metrics"
on public.visual_metrics for select
using (user_id = auth.uid());

drop policy if exists "Users can insert own visual metrics" on public.visual_metrics;
create policy "Users can insert own visual metrics"
on public.visual_metrics for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own visual metrics" on public.visual_metrics;
create policy "Users can update own visual metrics"
on public.visual_metrics for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own visual metrics" on public.visual_metrics;
create policy "Users can delete own visual metrics"
on public.visual_metrics for delete
using (user_id = auth.uid());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'resumes',
  'resumes',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read resume files" on storage.objects;
drop policy if exists "Users can read own resume files" on storage.objects;
create policy "Users can read own resume files"
on storage.objects for select
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = 'resumes'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can upload own resume files" on storage.objects;
create policy "Users can upload own resume files"
on storage.objects for insert
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = 'resumes'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can update own resume files" on storage.objects;
create policy "Users can update own resume files"
on storage.objects for update
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = 'resumes'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = 'resumes'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Users can delete own resume files" on storage.objects;
create policy "Users can delete own resume files"
on storage.objects for delete
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = 'resumes'
  and (storage.foldername(name))[2] = auth.uid()::text
);
