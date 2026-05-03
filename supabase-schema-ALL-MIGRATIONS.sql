-- ============================================
-- STEWDIUM V2 MIGRATION
-- Run this in Supabase SQL Editor AFTER the original schema
-- This is additive -- won't touch existing data
-- ============================================

-- Add allergen tags to recipes
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS allergen_tags jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS nutrition jsonb DEFAULT NULL;

-- Add allergies/intolerances to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allergies jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS allergies_public boolean DEFAULT false;

-- Recipe Likes / Upvotes
CREATE TABLE IF NOT EXISTS public.recipe_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES public.recipes ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

ALTER TABLE public.recipe_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.recipe_likes FOR SELECT USING (true);
CREATE POLICY "Users can like recipes" ON public.recipe_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike recipes" ON public.recipe_likes FOR DELETE USING (auth.uid() = user_id);

-- Like count cache on recipes for fast sorting
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0;

-- Function to update like count
CREATE OR REPLACE FUNCTION public.update_like_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.recipes SET like_count = like_count + 1 WHERE id = NEW.recipe_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.recipes SET like_count = like_count - 1 WHERE id = OLD.recipe_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON public.recipe_likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.recipe_likes
  FOR EACH ROW EXECUTE PROCEDURE public.update_like_count();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipe_likes_recipe_id ON public.recipe_likes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_likes_user_id ON public.recipe_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_like_count ON public.recipes(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON public.recipes(created_at DESC);
-- ============================================
-- STEWDIUM V3 MIGRATION
-- Adds: friends/follows, recipe comments
-- Run AFTER schema v1 and v2
-- ============================================

-- Follows (friend system)
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Recipe Comments
CREATE TABLE IF NOT EXISTS public.recipe_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES public.recipes ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.recipe_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments on public recipes" ON public.recipe_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON public.recipe_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.recipe_comments FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_comments_recipe ON public.recipe_comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.recipe_comments(user_id);

-- Make profiles searchable
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles USING gin(to_tsvector('english', name));
-- ============================================
-- STEWDIUM V4 MIGRATION (v2)
-- Adds extra foreign keys from *.user_id to public.profiles(id)
-- so PostgREST can resolve the profiles() joins used throughout lib/db.js.
-- These coexist with the existing FKs to auth.users (which share names like
-- recipes_user_id_fkey), so we use distinct constraint names.
-- Safe to re-run.
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recipes_profile_fkey') THEN
    ALTER TABLE public.recipes
      ADD CONSTRAINT recipes_profile_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cooked_photos_profile_fkey') THEN
    ALTER TABLE public.cooked_photos
      ADD CONSTRAINT cooked_photos_profile_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recipe_comments_profile_fkey') THEN
    ALTER TABLE public.recipe_comments
      ADD CONSTRAINT recipe_comments_profile_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_follower_profile_fkey') THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_follower_profile_fkey
      FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_following_profile_fkey') THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_following_profile_fkey
      FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
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
