import { createClient } from './supabase';

// Lazy singleton - avoids auth token lock race conditions
let _client = null;
function sb() {
  if (!_client) _client = createClient();
  return _client;
}

// ─── AUTH ───
export async function signUp(email, password, metadata = {}) {
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
  const { data, error } = await sb().auth.signUp({ email, password, options: { data: metadata, emailRedirectTo: redirectTo } });
  return { data, error };
}
export async function signIn(email, password) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  return { data, error };
}
export async function signOut() { return await sb().auth.signOut(); }
export async function getSession() { const { data: { session } } = await sb().auth.getSession(); return session; }
export function onAuthChange(callback) { return sb().auth.onAuthStateChange(callback); }

// ─── PROFILES ───
export async function getProfile(userId) {
  const { data, error } = await sb().from('profiles').select('*').eq('id', userId).single();
  return { data, error };
}
export async function updateProfile(userId, updates) {
  const { data, error } = await sb().from('profiles').update(updates).eq('id', userId).select().single();
  return { data, error };
}
export async function searchProfiles(query) {
  const { data, error } = await sb().from('profiles').select('id, name, bio, avatar_url')
    .ilike('name', `%${query}%`).limit(20);
  return { data: data || [], error };
}
export async function getPublicProfile(userId) {
  const { data, error } = await sb().from('profiles').select('id, name, bio, avatar_url, allergies, allergies_public, created_at').eq('id', userId).single();
  return { data, error };
}

// ─── RECIPES ───
export async function getRecipes({ category, search } = {}) {
  let query = sb().from('recipes').select('*, profiles!recipes_profile_fkey(name, avatar_url)').order('created_at', { ascending: false });
  if (category && category !== 'All') query = query.eq('category', category);
  if (search) query = query.or(`title.ilike.%${search}%`);
  const { data, error } = await query;
  return { data: data || [], error };
}
export async function getRecipe(id) {
  const { data, error } = await sb().from('recipes').select('*, profiles!recipes_profile_fkey(name, avatar_url)').eq('id', id).single();
  return { data, error };
}
export async function createRecipe(recipe) {
  const { data, error } = await sb().from('recipes').insert(recipe).select().single();
  return { data, error };
}
export async function updateRecipe(id, updates) {
  const { data, error } = await sb().from('recipes').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  return { data, error };
}
export async function deleteRecipe(id) { return await sb().from('recipes').delete().eq('id', id); }
export async function getUserRecipes(userId) {
  const { data, error } = await sb().from('recipes').select('*, profiles!recipes_profile_fkey(name, avatar_url)').eq('user_id', userId).order('created_at', { ascending: false });
  return { data: data || [], error };
}
export async function getPublicRecipesByUser(userId) {
  const { data, error } = await sb().from('recipes').select('*, profiles!recipes_profile_fkey(name, avatar_url)').eq('user_id', userId).eq('is_public', true).order('created_at', { ascending: false });
  return { data: data || [], error };
}

// ─── SAVED RECIPES ───
export async function getSavedRecipes(userId) {
  const { data, error } = await sb().from('saved_recipes').select('recipe_id, recipes(*, profiles!recipes_profile_fkey(name, avatar_url))').eq('user_id', userId).order('created_at', { ascending: false });
  return { data: data?.map(d => d.recipes).filter(Boolean) || [], error };
}
export async function getSavedRecipeIds(userId) {
  const { data } = await sb().from('saved_recipes').select('recipe_id').eq('user_id', userId);
  return { data: data?.map(d => d.recipe_id) || [] };
}
export async function saveRecipe(userId, recipeId) { return await sb().from('saved_recipes').insert({ user_id: userId, recipe_id: recipeId }); }
export async function unsaveRecipe(userId, recipeId) { return await sb().from('saved_recipes').delete().eq('user_id', userId).eq('recipe_id', recipeId); }

// ─── LIKES ───
export async function likeRecipe(userId, recipeId) { return await sb().from('recipe_likes').insert({ user_id: userId, recipe_id: recipeId }); }
export async function unlikeRecipe(userId, recipeId) { return await sb().from('recipe_likes').delete().eq('user_id', userId).eq('recipe_id', recipeId); }
export async function getUserLikes(userId) {
  const { data } = await sb().from('recipe_likes').select('recipe_id').eq('user_id', userId);
  return { data: data?.map(d => d.recipe_id) || [] };
}

// ─── COOKED PHOTOS ───
export async function getCookedPhotos(recipeId) {
  const { data } = await sb().from('cooked_photos').select('*, profiles!cooked_photos_profile_fkey(name)').eq('recipe_id', recipeId).order('created_at', { ascending: false });
  return { data: data || [] };
}
export async function addCookedPhoto(userId, recipeId, imageUrl) {
  const { data, error } = await sb().from('cooked_photos').insert({ user_id: userId, recipe_id: recipeId, image_url: imageUrl }).select('*, profiles!cooked_photos_profile_fkey(name)').single();
  return { data, error };
}

// ─── COMMENTS ───
export async function getComments(recipeId) {
  const { data } = await sb().from('recipe_comments').select('*, profiles!recipe_comments_profile_fkey(name, avatar_url)').eq('recipe_id', recipeId).order('created_at', { ascending: true });
  return { data: data || [] };
}
export async function addComment(userId, recipeId, text) {
  const { data, error } = await sb().from('recipe_comments').insert({ user_id: userId, recipe_id: recipeId, text }).select('*, profiles!recipe_comments_profile_fkey(name, avatar_url)').single();
  return { data, error };
}
export async function deleteComment(commentId) { return await sb().from('recipe_comments').delete().eq('id', commentId); }

// ─── FOLLOWS ───
export async function followUser(followerId, followingId) { return await sb().from('follows').insert({ follower_id: followerId, following_id: followingId }); }
export async function unfollowUser(followerId, followingId) { return await sb().from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId); }
export async function getFollowing(userId) {
  const { data } = await sb().from('follows').select('following_id, profiles!follows_following_profile_fkey(id, name, bio, avatar_url)').eq('follower_id', userId);
  return { data: data?.map(d => d.profiles).filter(Boolean) || [] };
}
export async function getFollowers(userId) {
  const { data } = await sb().from('follows').select('follower_id, profiles!follows_follower_profile_fkey(id, name, bio, avatar_url)').eq('following_id', userId);
  return { data: data?.map(d => d.profiles).filter(Boolean) || [] };
}
export async function getFollowingIds(userId) {
  const { data } = await sb().from('follows').select('following_id').eq('follower_id', userId);
  return { data: data?.map(d => d.following_id) || [] };
}

// ─── MEAL PLANS ───
export async function getMealPlan(userId, weekStart) {
  const { data } = await sb().from('meal_plans').select('*, recipes(id, title, emoji, image_url)').eq('user_id', userId).eq('week_start', weekStart);
  return { data: data || [] };
}
export async function setMealPlanSlot(userId, dayOfWeek, mealType, recipeId, weekStart) {
  await sb().from('meal_plans').delete().eq('user_id', userId).eq('day_of_week', dayOfWeek).eq('meal_type', mealType).eq('week_start', weekStart);
  if (!recipeId) return { error: null };
  return await sb().from('meal_plans').insert({ user_id: userId, day_of_week: dayOfWeek, meal_type: mealType, recipe_id: recipeId, week_start: weekStart });
}

// ─── NEWSLETTER ───
// Plain insert + swallow unique-violation so repeat subscribes are idempotent.
// upsert() won't work: anon has INSERT but not UPDATE in RLS on this table.
export async function subscribeNewsletter(email) {
  const { error } = await sb().from('newsletter_subscribers').insert({ email });
  if (error && error.code !== '23505') return { error };
  return { error: null };
}

// ─── FILE UPLOADS ───
export async function uploadImage(bucket, path, file) {
  const { data, error } = await sb().storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) return { url: null, error };
  const { data: { publicUrl } } = sb().storage.from(bucket).getPublicUrl(data.path);
  return { url: publicUrl, error: null };
}

// ─── BULK ───
export async function bulkCreateRecipes(recipes) {
  const { data, error } = await sb().from('recipes').insert(recipes).select();
  return { data: data || [], error };
}
