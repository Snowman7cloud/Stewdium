-- ============================================
-- STEWDIUM V5 MIGRATION
-- Adds: direct messages, blog posts
-- Also: expands comment permissions (edit own, recipe owner can delete)
-- Run AFTER schema v1-v4
-- ============================================

-- ─── DIRECT MESSAGES ───
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CHECK (sender_id != recipient_id)
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Recipient can mark read" ON public.messages
  FOR UPDATE USING (auth.uid() = recipient_id);
CREATE POLICY "Sender can delete own message" ON public.messages
  FOR DELETE USING (auth.uid() = sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_pair_time ON public.messages(sender_id, recipient_id, created_at);

-- ─── BLOG POSTS (Ellie B. only, enforced at app layer + RLS on author) ───
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  cover_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read blog posts" ON public.blog_posts FOR SELECT USING (true);
CREATE POLICY "Author can insert blog post" ON public.blog_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Author can update own blog post" ON public.blog_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Author can delete own blog post" ON public.blog_posts FOR DELETE USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created ON public.blog_posts(created_at DESC);

-- Expose profile join for blog posts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_profile_fkey') THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_profile_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_sender_profile_fkey') THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_sender_profile_fkey
      FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_recipient_profile_fkey') THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_recipient_profile_fkey
      FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recipe_likes_profile_fkey') THEN
    ALTER TABLE public.recipe_likes
      ADD CONSTRAINT recipe_likes_profile_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── COMMENT PERMISSIONS ───
-- Allow the comment author to edit their own comment
DROP POLICY IF EXISTS "Users can update own comments" ON public.recipe_comments;
CREATE POLICY "Users can update own comments" ON public.recipe_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow the recipe owner to delete any comment on their own recipe
DROP POLICY IF EXISTS "Recipe owner can delete comments" ON public.recipe_comments;
CREATE POLICY "Recipe owner can delete comments" ON public.recipe_comments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_comments.recipe_id AND r.user_id = auth.uid())
  );

-- Track comment edit time
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipe_comments' AND column_name='updated_at') THEN
    ALTER TABLE public.recipe_comments ADD COLUMN updated_at timestamptz;
  END IF;
END $$;

-- ─── STORAGE BUCKET FOR BLOG COVERS ───
INSERT INTO storage.buckets (id, name, public)
  VALUES ('blog-covers', 'blog-covers', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "blog-covers public read" ON storage.objects;
CREATE POLICY "blog-covers public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-covers');
DROP POLICY IF EXISTS "blog-covers author write" ON storage.objects;
CREATE POLICY "blog-covers author write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'blog-covers' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "blog-covers author update" ON storage.objects;
CREATE POLICY "blog-covers author update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'blog-covers' AND auth.role() = 'authenticated');

NOTIFY pgrst, 'reload schema';
