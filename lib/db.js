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
export async function addComment(userId, recipeId, text, rating = null) {
  const row = { user_id: userId, recipe_id: recipeId, text };
  if (rating) row.rating = rating;
  const { data, error } = await sb().from('recipe_comments').insert(row).select('*, profiles!recipe_comments_profile_fkey(name, avatar_url)').single();
  return { data, error };
}
export async function deleteComment(commentId) { return await sb().from('recipe_comments').delete().eq('id', commentId); }
export async function updateComment(commentId, text) {
  const { data, error } = await sb().from('recipe_comments').update({ text, updated_at: new Date().toISOString() }).eq('id', commentId).select('*, profiles!recipe_comments_profile_fkey(name, avatar_url)').single();
  return { data, error };
}

// ─── LIKES: who liked ───
export async function getRecipeLikers(recipeId) {
  const { data, error } = await sb().from('recipe_likes')
    .select('user_id, created_at, profiles!recipe_likes_profile_fkey(id, name, avatar_url)')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

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

// ─── MESSAGES ───
export async function sendMessage(senderId, recipientId, text) {
  const { data, error } = await sb().from('messages')
    .insert({ sender_id: senderId, recipient_id: recipientId, text })
    .select().single();
  return { data, error };
}
export async function getMessages(userId, otherUserId) {
  const { data, error } = await sb().from('messages').select('*')
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .order('created_at', { ascending: true });
  return { data: data || [], error };
}
export async function markMessagesRead(userId, otherUserId) {
  return await sb().from('messages').update({ read: true })
    .eq('recipient_id', userId).eq('sender_id', otherUserId).eq('read', false);
}
export async function getUnreadBySender(userId) {
  const { data } = await sb().from('messages').select('sender_id')
    .eq('recipient_id', userId).eq('read', false);
  const counts = {};
  (data || []).forEach(m => { counts[m.sender_id] = (counts[m.sender_id] || 0) + 1; });
  return { data: counts };
}

// ─── BLOG POSTS ───
export async function getBlogPosts() {
  const { data, error } = await sb().from('blog_posts')
    .select('*, profiles!blog_posts_profile_fkey(id, name, avatar_url)')
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}
export async function getBlogPost(id) {
  const { data, error } = await sb().from('blog_posts')
    .select('*, profiles!blog_posts_profile_fkey(id, name, avatar_url)')
    .eq('id', id).single();
  return { data, error };
}
export async function createBlogPost(post) {
  const { data, error } = await sb().from('blog_posts').insert(post).select().single();
  return { data, error };
}
export async function updateBlogPost(id, updates) {
  const { data, error } = await sb().from('blog_posts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  return { data, error };
}
export async function deleteBlogPost(id) {
  return await sb().from('blog_posts').delete().eq('id', id);
}

// ─── BLOG COMMENTS ───
export async function getBlogComments(blogPostId) {
  const { data } = await sb().from('blog_post_comments').select('*, profiles!blog_post_comments_profile_fkey(name, avatar_url)').eq('blog_post_id', blogPostId).order('created_at', { ascending: true });
  return { data: data || [] };
}
export async function addBlogComment(userId, blogPostId, text) {
  const { data, error } = await sb().from('blog_post_comments').insert({ user_id: userId, blog_post_id: blogPostId, text }).select('*, profiles!blog_post_comments_profile_fkey(name, avatar_url)').single();
  return { data, error };
}
export async function updateBlogComment(commentId, text) {
  const { data, error } = await sb().from('blog_post_comments').update({ text, updated_at: new Date().toISOString() }).eq('id', commentId).select('*, profiles!blog_post_comments_profile_fkey(name, avatar_url)').single();
  return { data, error };
}
export async function deleteBlogComment(commentId) { return await sb().from('blog_post_comments').delete().eq('id', commentId); }

// ─── PRIVATE NOTES (notes to self, only visible to their author) ───
export async function getPrivateNote(userId, recipeId) {
  const { data } = await sb().from('recipe_private_notes').select('*').eq('user_id', userId).eq('recipe_id', recipeId).maybeSingle();
  return { data };
}
export async function savePrivateNote(userId, recipeId, text) {
  const { data, error } = await sb().from('recipe_private_notes')
    .upsert({ user_id: userId, recipe_id: recipeId, text, updated_at: new Date().toISOString() }, { onConflict: 'user_id,recipe_id' })
    .select().single();
  return { data, error };
}

// ─── SITE SETTINGS (admin-editable app copy) ───
export async function getSiteSettings() {
  const { data } = await sb().from('site_settings').select('key, value');
  const map = {};
  (data || []).forEach(s => { map[s.key] = s.value; });
  return { data: map };
}
export async function setSiteSetting(key, value) {
  const { data, error } = await sb().from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select().single();
  return { data, error };
}

// ─── ADMIN ───
export async function getAllUsersWithStats() {
  const { data, error } = await sb().from('profiles')
    .select('id, name, bio, avatar_url, created_at, is_admin, recipes!recipes_profile_fkey(count), followers:follows!follows_following_profile_fkey(count)')
    .order('created_at', { ascending: false });
  return {
    data: (data || []).map(p => ({
      ...p,
      recipe_count: p.recipes?.[0]?.count || 0,
      follower_count: p.followers?.[0]?.count || 0,
    })),
    error,
  };
}
export async function getRecentActivity(limitPer = 20) {
  const [users, recipes, comments, blogComments, posts, photos, likes, followRows] = await Promise.all([
    sb().from('profiles').select('id, name, created_at').order('created_at', { ascending: false }).limit(limitPer),
    sb().from('recipes').select('id, title, created_at, profiles!recipes_profile_fkey(name)').order('created_at', { ascending: false }).limit(limitPer),
    sb().from('recipe_comments').select('id, text, rating, created_at, profiles!recipe_comments_profile_fkey(name), recipes(title)').order('created_at', { ascending: false }).limit(limitPer),
    sb().from('blog_post_comments').select('id, text, created_at, profiles!blog_post_comments_profile_fkey(name), blog_posts(title)').order('created_at', { ascending: false }).limit(limitPer),
    sb().from('blog_posts').select('id, title, created_at, profiles!blog_posts_profile_fkey(name)').order('created_at', { ascending: false }).limit(limitPer),
    sb().from('cooked_photos').select('id, created_at, profiles!cooked_photos_profile_fkey(name), recipes(title)').order('created_at', { ascending: false }).limit(limitPer),
    sb().from('recipe_likes').select('created_at, profiles!recipe_likes_profile_fkey(name), recipes(title)').order('created_at', { ascending: false }).limit(limitPer),
    sb().from('follows').select('created_at, follower:profiles!follows_follower_profile_fkey(name), followed:profiles!follows_following_profile_fkey(name)').order('created_at', { ascending: false }).limit(limitPer),
  ]);
  const items = [];
  (users.data || []).forEach(u => items.push({ type: 'user', when: u.created_at, who: u.name, what: 'joined Stewdium' }));
  (recipes.data || []).forEach(r => items.push({ type: 'recipe', when: r.created_at, who: r.profiles?.name, what: `added recipe "${r.title}"` }));
  (comments.data || []).forEach(c => items.push({ type: 'comment', when: c.created_at, who: c.profiles?.name, what: `commented on "${c.recipes?.title || 'a recipe'}"${c.rating ? ` (${c.rating}★)` : ''}: ${c.text}` }));
  (blogComments.data || []).forEach(c => items.push({ type: 'comment', when: c.created_at, who: c.profiles?.name, what: `commented on blog post "${c.blog_posts?.title || ''}": ${c.text}` }));
  (posts.data || []).forEach(p => items.push({ type: 'blog', when: p.created_at, who: p.profiles?.name, what: `published blog post "${p.title}"` }));
  (photos.data || []).forEach(p => items.push({ type: 'photo', when: p.created_at, who: p.profiles?.name, what: `posted a cooked photo on "${p.recipes?.title || 'a recipe'}"` }));
  (likes.data || []).forEach(l => items.push({ type: 'like', when: l.created_at, who: l.profiles?.name, what: `liked "${l.recipes?.title || 'a recipe'}"` }));
  (followRows.data || []).forEach(f => items.push({ type: 'follow', when: f.created_at, who: f.follower?.name, what: `followed ${f.followed?.name || 'someone'}` }));
  items.sort((a, b) => new Date(b.when) - new Date(a.when));
  return { data: items.slice(0, 60) };
}

// ─── BULK ───
export async function bulkCreateRecipes(recipes) {
  const { data, error } = await sb().from('recipes').insert(recipes).select();
  return { data: data || [], error };
}
