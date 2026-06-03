
-- ============= CERTIFICATES =============
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid not null,
  code text not null unique default encode(gen_random_bytes(9), 'hex'),
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table public.certificates enable row level security;

-- Public read by code (verification)
create policy "Certificates are publicly verifiable"
on public.certificates for select
to anon, authenticated
using (true);

-- Users can self-issue ONLY when they have completed every lesson of the course
create policy "Users issue own certificate after completion"
on public.certificates for insert
to authenticated
with check (
  user_id = auth.uid()
  and not exists (
    select 1 from public.lessons l
    where l.course_id = certificates.course_id
    and not exists (
      select 1 from public.lesson_progress lp
      where lp.lesson_id = l.id
      and lp.user_id = auth.uid()
      and lp.completed = true
    )
  )
);

-- ============= APPLICATIONS =============
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  applicant_id uuid not null,
  cover_letter text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, applicant_id)
);

alter table public.applications enable row level security;

-- Applicant can view own applications; opportunity owner & admin can view applications to their listing
create policy "View own applications or as opportunity owner"
on public.applications for select
to authenticated
using (
  applicant_id = auth.uid()
  or has_role(auth.uid(), 'admin')
  or exists (
    select 1 from public.opportunities o
    where o.id = applications.opportunity_id
    and o.posted_by = auth.uid()
  )
);

create policy "Applicants can apply"
on public.applications for insert
to authenticated
with check (applicant_id = auth.uid());

-- Applicant updates own application; owner/admin updates status
create policy "Applicants and owners update applications"
on public.applications for update
to authenticated
using (
  applicant_id = auth.uid()
  or has_role(auth.uid(), 'admin')
  or exists (
    select 1 from public.opportunities o
    where o.id = applications.opportunity_id
    and o.posted_by = auth.uid()
  )
);

create policy "Applicants delete own applications"
on public.applications for delete
to authenticated
using (applicant_id = auth.uid());

create trigger applications_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create index applications_opp_idx on public.applications(opportunity_id);
create index applications_applicant_idx on public.applications(applicant_id);
create index certificates_user_idx on public.certificates(user_id);
