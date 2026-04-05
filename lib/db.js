import { createClient } from './supabase';

const supabase = createClient();

// ─── AUTH ───
export async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

// ─── PROFILES ───
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('id', userId).single();
  return { data, error };
}

export async function updateProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles').update(updates).eq('id', userId).select().single();
  return { data, error };
}

// ─── RECIPES ───
export async function getRecipes({ category, search, userId } = {}) {
  let query = supabase.from('recipes').select(`
    *, profiles!recipes_user_id_fkey(name, avatar_url)
  `).order('created_at', { ascending: false });

  if (category && category !== 'All') query = query.eq('category', category);
  if (search) query = query.or(`title.ilike.%${search}%,tags.cs.["${search.toLowerCase()}"]`);

  const { data, error } = await query;
  return { data: data || [], error };
}

export async function getRecipe(id) {
  const { data, error } = await supabase
    .from('recipes')
    .select('*, profiles!recipes_user_id_fkey(name, avatar_url)')
    .eq('id', id).single();
  return { data, error };
}

export async function createRecipe(recipe) {
  const { data, error } = await supabase
    .from('recipes').insert(recipe).select().single();
  return { data, error };
}

export async function updateRecipe(id, updates) {
  const { data, error } = await supabase
    .from('recipes').update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  return { data, error };
}

export async function deleteRecipe(id) {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  return { error };
}

export async function getUserRecipes(userId) {
  const { data, error } = await supabase
    .from('recipes').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// ─── SAVED RECIPES ───
export async function getSavedRecipes(userId) {
  const { data, error } = await supabase
    .from('saved_recipes')
    .select('recipe_id, recipes(*, profiles!recipes_user_id_fkey(name, avatar_url))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data: data?.map(d => d.recipes).filter(Boolean) || [], error };
}

export async function getSavedRecipeIds(userId) {
  const { data, error } = await supabase
    .from('saved_recipes').select('recipe_id').eq('user_id', userId);
  return { data: data?.map(d => d.recipe_id) || [], error };
}

export async function saveRecipe(userId, recipeId) {
  const { error } = await supabase
    .from('saved_recipes').insert({ user_id: userId, recipe_id: recipeId });
  return { error };
}

export async function unsaveRecipe(userId, recipeId) {
  const { error } = await supabase
    .from('saved_recipes').delete()
    .eq('user_id', userId).eq('recipe_id', recipeId);
  return { error };
}

// ─── COOKED PHOTOS ───
export async function getCookedPhotos(recipeId) {
  const { data, error } = await supabase
    .from('cooked_photos')
    .select('*, profiles!cooked_photos_user_id_fkey(name)')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

export async function addCookedPhoto(userId, recipeId, imageUrl) {
  const { data, error } = await supabase
    .from('cooked_photos')
    .insert({ user_id: userId, recipe_id: recipeId, image_url: imageUrl })
    .select('*, profiles!cooked_photos_user_id_fkey(name)')
    .single();
  return { data, error };
}

// ─── MEAL PLANS ───
export async function getMealPlan(userId, weekStart) {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*, recipes(id, title, emoji, image_url)')
    .eq('user_id', userId)
    .eq('week_start', weekStart);
  return { data: data || [], error };
}

export async function setMealPlanSlot(userId, dayOfWeek, mealType, recipeId, weekStart) {
  // Upsert: delete existing then insert
  await supabase.from('meal_plans').delete()
    .eq('user_id', userId).eq('day_of_week', dayOfWeek)
    .eq('meal_type', mealType).eq('week_start', weekStart);

  if (!recipeId) return { error: null }; // just clearing

  const { error } = await supabase.from('meal_plans').insert({
    user_id: userId, day_of_week: dayOfWeek,
    meal_type: mealType, recipe_id: recipeId, week_start: weekStart,
  });
  return { error };
}

// ─── NEWSLETTER ───
export async function subscribeNewsletter(email) {
  const { error } = await supabase
    .from('newsletter_subscribers').upsert({ email }, { onConflict: 'email' });
  return { error };
}

// ─── FILE UPLOADS ───
export async function uploadImage(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket).upload(path, file, { cacheControl: '3600', upsert: true });
  if (error) return { url: null, error };
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { url: publicUrl, error: null };
}

// ─── BULK IMPORT ───
export async function bulkCreateRecipes(recipes) {
  const { data, error } = await supabase
    .from('recipes').insert(recipes).select();
  return { data: data || [], error };
}
