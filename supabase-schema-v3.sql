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
