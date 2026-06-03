
-- Gamification: badges, user_badges, user_points
CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'Award',
  points integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges viewable by everyone" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Admins manage badges" ON public.badges FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
GRANT SELECT, INSERT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User badges viewable by authenticated" ON public.user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "System awards badges to self" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.user_points (
  user_id uuid PRIMARY KEY,
  points integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_points TO authenticated;
GRANT ALL ON public.user_points TO service_role;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Points viewable by authenticated" ON public.user_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users upsert own points (insert)" ON public.user_points FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users upsert own points (update)" ON public.user_points FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);

-- Seed badges
INSERT INTO public.badges (code, name, description, icon, points) VALUES
  ('first_lesson', 'First Steps', 'Completed your first lesson', 'Footprints', 10),
  ('first_certificate', 'Certified Cadet', 'Earned your first certificate', 'Award', 50),
  ('startup_founder', 'Startup Founder', 'Generated your first business plan', 'Rocket', 30),
  ('cv_ready', 'CV Ready', 'Completed your profile', 'FileText', 20),
  ('mentor_connected', 'Connected', 'Booked your first mentor session', 'Users', 20),
  ('digital_citizen', 'Digital Citizen', 'Completed Digital Citizenship course', 'ShieldCheck', 40);

-- Digital Citizenship course
WITH c AS (
  INSERT INTO public.courses (slug, title, title_fr, description, description_fr, category, level, language, duration_minutes, published)
  VALUES (
    'digital-citizenship',
    'Digital Citizenship in Cameroon',
    'Citoyenneté numérique au Cameroun',
    'Learn cybersecurity basics, online ethics, productivity habits and mental health in the digital age — built for Cameroonian youth.',
    'Apprenez les bases de la cybersécurité, l''éthique en ligne, la productivité et la santé mentale à l''ère numérique — conçu pour la jeunesse camerounaise.',
    'citizenship', 'beginner', 'en', 90, true
  ) RETURNING id
)
INSERT INTO public.lessons (course_id, position, title, title_fr, content, content_fr, duration_minutes)
SELECT c.id, p.position, p.title, p.title_fr, p.content, p.content_fr, p.duration FROM c, (VALUES
  (1, 'Staying safe online', 'Rester en sécurité en ligne',
    'Strong passwords, two-factor authentication, recognizing phishing on WhatsApp and SMS scams common in Cameroon.',
    'Mots de passe forts, authentification à deux facteurs, reconnaître le phishing sur WhatsApp et les arnaques SMS au Cameroun.', 20),
  (2, 'Protecting your data and mobile money', 'Protéger vos données et mobile money',
    'How to secure MTN MoMo and Orange Money accounts, spot fake agents and avoid SIM-swap fraud.',
    'Comment sécuriser MTN MoMo et Orange Money, repérer les faux agents et éviter la fraude SIM swap.', 25),
  (3, 'Online ethics and digital reputation', 'Éthique en ligne et réputation numérique',
    'Respectful communication, fact-checking before sharing, and building a professional online presence.',
    'Communication respectueuse, vérification des faits avant partage, et construction d''une présence professionnelle en ligne.', 20),
  (4, 'Productivity and mental wellbeing', 'Productivité et bien-être mental',
    'Managing screen time, focused work habits, and protecting mental health while online.',
    'Gérer le temps d''écran, habitudes de travail concentré et protéger sa santé mentale en ligne.', 25)
) AS p(position, title, title_fr, content, content_fr, duration);
