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
