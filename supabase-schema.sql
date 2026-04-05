-- ============================================
-- STEWDIUM DATABASE SCHEMA
-- Run this in Supabase SQL Editor (supabase.com/dashboard → SQL Editor)
-- ============================================

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  bio text default '',
  avatar_url text default '',
  newsletter boolean default true,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, bio, newsletter)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'bio', 'I love cooking!'),
    coalesce((new.raw_user_meta_data->>'newsletter')::boolean, true)
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Recipes
create table public.recipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text default '',
  category text default 'Dinner',
  prep_time text default '',
  cook_time text default '',
  servings integer default 4,
  is_public boolean default true,
  image_url text default '',
  emoji text default '🍽️',
  ingredients jsonb default '[]'::jsonb,
  steps jsonb default '[]'::jsonb,
  tags jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.recipes enable row level security;

create policy "Public recipes are viewable by everyone"
  on public.recipes for select
  using (is_public = true or auth.uid() = user_id);

create policy "Users can create recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on public.recipes for update
  using (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- Saved Recipes (bookmarks)
create table public.saved_recipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  recipe_id uuid references public.recipes on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, recipe_id)
);

alter table public.saved_recipes enable row level security;

create policy "Users can view own saved recipes"
  on public.saved_recipes for select
  using (auth.uid() = user_id);

create policy "Users can save recipes"
  on public.saved_recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave recipes"
  on public.saved_recipes for delete
  using (auth.uid() = user_id);

-- Cooked Photos (community gallery)
create table public.cooked_photos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  recipe_id uuid references public.recipes on delete cascade not null,
  image_url text not null,
  created_at timestamptz default now()
);

alter table public.cooked_photos enable row level security;

create policy "Cooked photos are viewable by everyone"
  on public.cooked_photos for select using (true);

create policy "Users can upload cooked photos"
  on public.cooked_photos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own cooked photos"
  on public.cooked_photos for delete
  using (auth.uid() = user_id);

-- Meal Plans
create table public.meal_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  day_of_week text not null,
  meal_type text not null,
  recipe_id uuid references public.recipes on delete cascade not null,
  week_start date default current_date,
  created_at timestamptz default now(),
  unique(user_id, day_of_week, meal_type, week_start)
);

alter table public.meal_plans enable row level security;

create policy "Users can view own meal plans"
  on public.meal_plans for select
  using (auth.uid() = user_id);

create policy "Users can create meal plans"
  on public.meal_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own meal plans"
  on public.meal_plans for update
  using (auth.uid() = user_id);

create policy "Users can delete own meal plans"
  on public.meal_plans for delete
  using (auth.uid() = user_id);

-- Newsletter Subscribers (non-authenticated visitors)
create table public.newsletter_subscribers (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  created_at timestamptz default now()
);

alter table public.newsletter_subscribers enable row level security;

create policy "Anyone can subscribe to newsletter"
  on public.newsletter_subscribers for insert
  with check (true);

-- ============================================
-- STORAGE BUCKETS
-- Run these in Supabase SQL Editor too
-- ============================================

insert into storage.buckets (id, name, public) values ('recipe-images', 'recipe-images', true);
insert into storage.buckets (id, name, public) values ('profile-avatars', 'profile-avatars', true);
insert into storage.buckets (id, name, public) values ('cooked-photos', 'cooked-photos', true);

-- Storage policies
create policy "Anyone can view recipe images"
  on storage.objects for select
  using (bucket_id in ('recipe-images', 'profile-avatars', 'cooked-photos'));

create policy "Authenticated users can upload recipe images"
  on storage.objects for insert
  with check (bucket_id in ('recipe-images', 'profile-avatars', 'cooked-photos') and auth.role() = 'authenticated');

create policy "Users can update own uploads"
  on storage.objects for update
  using (auth.uid() = owner);

create policy "Users can delete own uploads"
  on storage.objects for delete
  using (auth.uid() = owner);

-- ============================================
-- INDEXES for performance
-- ============================================
create index idx_recipes_user_id on public.recipes(user_id);
create index idx_recipes_is_public on public.recipes(is_public);
create index idx_recipes_category on public.recipes(category);
create index idx_saved_recipes_user_id on public.saved_recipes(user_id);
create index idx_cooked_photos_recipe_id on public.cooked_photos(recipe_id);
create index idx_meal_plans_user_id on public.meal_plans(user_id);
