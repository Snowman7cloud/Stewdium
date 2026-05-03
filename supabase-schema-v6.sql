-- ============================================
-- STEWDIUM V6 MIGRATION
-- Adds: notes/private_notes columns on recipes
--       blog_post_comments table
-- Run AFTER schema v1-v5
-- ============================================

-- ─── RECIPE NOTES COLUMNS ───
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN notes text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'private_notes'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN private_notes text DEFAULT '';
  END IF;
END $$;

-- ─── BLOG POST COMMENTS ───
CREATE TABLE IF NOT EXISTS public.blog_post_comments (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id    uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  blog_post_id uuid REFERENCES public.blog_posts ON DELETE CASCADE NOT NULL,
  text         text NOT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz
);

ALTER TABLE public.blog_post_comments ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous) can read comments
DROP POLICY IF EXISTS "Anyone can read blog comments" ON public.blog_post_comments;
CREATE POLICY "Anyone can read blog comments" ON public.blog_post_comments
  FOR SELECT USING (true);

-- Signed-in users can post comments
DROP POLICY IF EXISTS "Authenticated users can insert blog comments" ON public.blog_post_comments;
CREATE POLICY "Authenticated users can insert blog comments" ON public.blog_post_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Authors can delete their own comments
DROP POLICY IF EXISTS "Author can delete own blog comment" ON public.blog_post_comments;
CREATE POLICY "Author can delete own blog comment" ON public.blog_post_comments
  FOR DELETE USING (auth.uid() = author_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_post_comments_post ON public.blog_post_comments(blog_post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_comments_author ON public.blog_post_comments(author_id);

-- Profile foreign key for JOIN in db.js
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'blog_post_comments_author_id_fkey'
      AND conrelid = 'public.blog_post_comments'::regclass
  ) THEN
    ALTER TABLE public.blog_post_comments
      ADD CONSTRAINT blog_post_comments_author_id_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
