ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS education jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experience jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;