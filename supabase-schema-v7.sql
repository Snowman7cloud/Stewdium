-- ============================================
-- STEWDIUM V7 MIGRATION
-- Run AFTER schema v1-v5. Supersedes v6 (which was never applied) --
-- run this INSTEAD of v6.
--
-- Adds:
--   1. Public "Notes" column on recipes (written by the recipe author)
--   2. Private notes-to-self (separate table so RLS can hide it --
--      a column on recipes would be readable by anyone via the API)
--   3. Star rating (1-5, optional) on recipe comments
--   4. Blog post comments
--   5. Real admin role (profiles.is_admin) + admin moderation policies
--      - column-level grants stop users from setting is_admin themselves
--      - Ellie B. is made admin at the bottom
--   6. site_settings table: admin-editable app copy (hero text, footer, etc.)
-- ============================================

-- ─── 1. PUBLIC RECIPE NOTES ───
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'recipes' AND column_name = 'notes') THEN
    ALTER TABLE public.recipes ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

-- ─── 2. PRIVATE NOTES TO SELF ───
CREATE TABLE IF NOT EXISTS public.recipe_private_notes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  recipe_id  uuid REFERENCES public.recipes ON DELETE CASCADE NOT NULL,
  text       text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

ALTER TABLE public.recipe_private_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner full access to own private notes" ON public.recipe_private_notes;
CREATE POLICY "Owner full access to own private notes" ON public.recipe_private_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_private_notes_user_recipe
  ON public.recipe_private_notes(user_id, recipe_id);

-- ─── 3. STAR RATING ON RECIPE COMMENTS ───
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'recipe_comments' AND column_name = 'rating') THEN
    ALTER TABLE public.recipe_comments
      ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5);
  END IF;
END $$;

-- ─── 4. BLOG POST COMMENTS ───
CREATE TABLE IF NOT EXISTS public.blog_post_comments (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  blog_post_id uuid REFERENCES public.blog_posts ON DELETE CASCADE NOT NULL,
  text         text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz
);

ALTER TABLE public.blog_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read blog comments" ON public.blog_post_comments;
CREATE POLICY "Anyone can read blog comments" ON public.blog_post_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can post blog comments" ON public.blog_post_comments;
CREATE POLICY "Users can post blog comments" ON public.blog_post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can edit own blog comments" ON public.blog_post_comments;
CREATE POLICY "Users can edit own blog comments" ON public.blog_post_comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own blog comments" ON public.blog_post_comments;
CREATE POLICY "Users can delete own blog comments" ON public.blog_post_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_blog_post_comments_post ON public.blog_post_comments(blog_post_id);

-- Named FK to profiles so db.js can join (same pattern as other tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_post_comments_profile_fkey') THEN
    ALTER TABLE public.blog_post_comments
      ADD CONSTRAINT blog_post_comments_profile_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── 5. ADMIN ROLE ───
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Users may update/insert only these columns of their own profile.
-- Without this, anyone could set is_admin = true on their own row.
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (name, bio, avatar_url, newsletter, allergies, allergies_public)
  ON public.profiles TO authenticated;
REVOKE INSERT ON public.profiles FROM authenticated, anon;
GRANT INSERT (id, name, bio, avatar_url, newsletter, allergies, allergies_public)
  ON public.profiles TO authenticated;

-- SECURITY DEFINER so it can read profiles without recursive RLS issues
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
$$;

-- Admin moderation policies (permissive policies OR together with existing ones)
DROP POLICY IF EXISTS "Admins can delete any recipe comment" ON public.recipe_comments;
CREATE POLICY "Admins can delete any recipe comment" ON public.recipe_comments
  FOR DELETE USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can delete any blog comment" ON public.blog_post_comments;
CREATE POLICY "Admins can delete any blog comment" ON public.blog_post_comments
  FOR DELETE USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can update any recipe" ON public.recipes;
CREATE POLICY "Admins can update any recipe" ON public.recipes
  FOR UPDATE USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can delete any recipe" ON public.recipes;
CREATE POLICY "Admins can delete any recipe" ON public.recipes
  FOR DELETE USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can view all recipes" ON public.recipes;
CREATE POLICY "Admins can view all recipes" ON public.recipes
  FOR SELECT USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can update any blog post" ON public.blog_posts;
CREATE POLICY "Admins can update any blog post" ON public.blog_posts
  FOR UPDATE USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can delete any blog post" ON public.blog_posts;
CREATE POLICY "Admins can delete any blog post" ON public.blog_posts
  FOR DELETE USING (public.is_app_admin());

-- ─── 6. SITE SETTINGS (admin-editable app copy) ───
CREATE TABLE IF NOT EXISTS public.site_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site settings" ON public.site_settings;
CREATE POLICY "Anyone can read site settings" ON public.site_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert site settings" ON public.site_settings;
CREATE POLICY "Admins can insert site settings" ON public.site_settings
  FOR INSERT WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can update site settings" ON public.site_settings;
CREATE POLICY "Admins can update site settings" ON public.site_settings
  FOR UPDATE USING (public.is_app_admin());

INSERT INTO public.site_settings (key, value) VALUES
  ('hero_title',         'Welcome to Stewdium'),
  ('hero_subtitle',      'Discover recipes, build your collection, and plan your meals.'),
  ('footer_description', 'Your home for discovering, sharing, and organizing recipes.'),
  ('blog_subtitle',      'Stories and updates from Ellie B.')
ON CONFLICT (key) DO NOTHING;

-- ─── MAKE ELLIE B. ADMIN ───
UPDATE public.profiles SET is_admin = true
WHERE id = '2476db25-5494-40d4-9810-f2ff18f1c8c3';

NOTIFY pgrst, 'reload schema';
