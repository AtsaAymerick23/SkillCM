
-- COURSES
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  title_fr text,
  description text,
  description_fr text,
  category text not null default 'general',
  level text not null default 'beginner',
  language text not null default 'en',
  duration_minutes int not null default 0,
  thumbnail_url text,
  instructor_id uuid,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.courses enable row level security;

create policy "Published courses viewable by authenticated"
on public.courses for select to authenticated
using (published = true or instructor_id = auth.uid() or has_role(auth.uid(),'admin'));

create policy "Trainers/admins can insert own courses"
on public.courses for insert to authenticated
with check (
  instructor_id = auth.uid()
  and (has_role(auth.uid(),'trainer') or has_role(auth.uid(),'admin'))
);

create policy "Owners or admins can update courses"
on public.courses for update to authenticated
using (instructor_id = auth.uid() or has_role(auth.uid(),'admin'));

create policy "Owners or admins can delete courses"
on public.courses for delete to authenticated
using (instructor_id = auth.uid() or has_role(auth.uid(),'admin'));

create trigger trg_courses_updated before update on public.courses
for each row execute function public.set_updated_at();

-- LESSONS
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position int not null default 0,
  title text not null,
  title_fr text,
  content text,
  content_fr text,
  video_url text,
  attachment_url text,
  duration_minutes int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lessons enable row level security;
create index lessons_course_idx on public.lessons(course_id, position);

create policy "Lessons viewable when course visible"
on public.lessons for select to authenticated
using (exists (
  select 1 from public.courses c
  where c.id = lessons.course_id
    and (c.published = true or c.instructor_id = auth.uid() or has_role(auth.uid(),'admin'))
));

create policy "Course owners/admins manage lessons"
on public.lessons for all to authenticated
using (exists (
  select 1 from public.courses c
  where c.id = lessons.course_id
    and (c.instructor_id = auth.uid() or has_role(auth.uid(),'admin'))
))
with check (exists (
  select 1 from public.courses c
  where c.id = lessons.course_id
    and (c.instructor_id = auth.uid() or has_role(auth.uid(),'admin'))
));

create trigger trg_lessons_updated before update on public.lessons
for each row execute function public.set_updated_at();

-- ENROLLMENTS
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (user_id, course_id)
);
alter table public.enrollments enable row level security;

create policy "Users view own enrollments"
on public.enrollments for select to authenticated
using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "Users insert own enrollments"
on public.enrollments for insert to authenticated
with check (user_id = auth.uid());
create policy "Users delete own enrollments"
on public.enrollments for delete to authenticated
using (user_id = auth.uid());

-- LESSON PROGRESS
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  last_position_seconds int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
alter table public.lesson_progress enable row level security;
create index lp_user_course_idx on public.lesson_progress(user_id, course_id);

create policy "Users view own progress"
on public.lesson_progress for select to authenticated
using (user_id = auth.uid() or has_role(auth.uid(),'admin'));
create policy "Users upsert own progress (insert)"
on public.lesson_progress for insert to authenticated
with check (user_id = auth.uid());
create policy "Users upsert own progress (update)"
on public.lesson_progress for update to authenticated
using (user_id = auth.uid());

create trigger trg_lp_updated before update on public.lesson_progress
for each row execute function public.set_updated_at();

-- OPPORTUNITIES
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'job',
  title text not null,
  organization text not null,
  location text,
  description text,
  url text,
  deadline date,
  status text not null default 'open',
  posted_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.opportunities enable row level security;

create policy "Open opportunities viewable by authenticated"
on public.opportunities for select to authenticated
using (status = 'open' or posted_by = auth.uid() or has_role(auth.uid(),'admin'));

create policy "Employers/admins can post opportunities"
on public.opportunities for insert to authenticated
with check (
  posted_by = auth.uid()
  and (has_role(auth.uid(),'employer') or has_role(auth.uid(),'admin'))
);

create policy "Owners/admins can update opportunities"
on public.opportunities for update to authenticated
using (posted_by = auth.uid() or has_role(auth.uid(),'admin'));

create policy "Owners/admins can delete opportunities"
on public.opportunities for delete to authenticated
using (posted_by = auth.uid() or has_role(auth.uid(),'admin'));

create trigger trg_opps_updated before update on public.opportunities
for each row execute function public.set_updated_at();
