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
