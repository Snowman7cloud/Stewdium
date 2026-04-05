import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// This page is server-rendered for SEO
// Google sees full recipe content, JSON-LD structured data
// No auth required to view public recipes

async function getRecipe(id) {
  // Basic UUID guard so random paths don't hit Postgres with a type error
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );
  const { data } = await supabase
    .from('recipes')
    .select('*, profiles!recipes_profile_fkey(name, avatar_url)')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }) {
  const recipe = await getRecipe(params.id);
  if (!recipe) return { title: 'Recipe Not Found - Stewdium' };
  return {
    title: `${recipe.title} - Stewdium`,
    description: recipe.description || `${recipe.title} recipe on Stewdium. ${recipe.cook_time} cook time, serves ${recipe.servings}.`,
    openGraph: {
      title: `${recipe.title} - Stewdium`,
      description: recipe.description,
      type: 'article',
      ...(recipe.image_url && { images: [recipe.image_url] }),
    },
  };
}

export default async function RecipePage({ params }) {
  const recipe = await getRecipe(params.id);

  if (!recipe) {
    return (
      <div style={{ fontFamily: 'Nunito, sans-serif', textAlign: 'center', padding: '80px 20px' }}>
        <h1>Recipe not found</h1>
        <p>This recipe may be private or no longer exists.</p>
        <a href="/" style={{ color: '#5a8a5a', fontWeight: 700 }}>← Back to Stewdium</a>
      </div>
    );
  }

  const ingredients = recipe.ingredients || [];
  const steps = recipe.steps || [];
  const authorName = recipe.profiles?.name || 'Unknown';

  // JSON-LD structured data for Google rich results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description,
    author: { '@type': 'Person', name: authorName },
    datePublished: recipe.created_at,
    prepTime: recipe.prep_time ? `PT${recipe.prep_time.replace(/\D+/g, '')}M` : undefined,
    cookTime: recipe.cook_time ? `PT${recipe.cook_time.replace(/\D+/g, '')}M` : undefined,
    recipeYield: `${recipe.servings} servings`,
    recipeCategory: recipe.category,
    ...(recipe.image_url && { image: recipe.image_url }),
    recipeIngredient: ingredients.map(i => `${i.amount} ${i.unit} ${i.name}`),
    recipeInstructions: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text: s,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px', fontFamily: 'Nunito, sans-serif' }}>
        <a href="/" style={{ color: '#5a8a5a', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>← Back to Stewdium</a>

        {recipe.image_url && (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            style={{ width: '100%', height: 300, objectFit: 'cover', borderRadius: 16, marginTop: 20 }}
          />
        )}

        <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 36, marginTop: 24, color: '#262626' }}>
          {recipe.title}
        </h1>
        <p style={{ color: '#5a8a5a', fontWeight: 600, fontSize: 14 }}>by {authorName}</p>
        <p style={{ color: '#737373', lineHeight: 1.6, marginTop: 8 }}>{recipe.description}</p>

        <div style={{ display: 'flex', gap: 24, margin: '20px 0', fontSize: 14 }}>
          <div><strong style={{ color: '#a3a3a3', fontSize: 12, textTransform: 'uppercase' }}>Prep</strong><br />{recipe.prep_time}</div>
          <div><strong style={{ color: '#a3a3a3', fontSize: 12, textTransform: 'uppercase' }}>Cook</strong><br />{recipe.cook_time}</div>
          <div><strong style={{ color: '#a3a3a3', fontSize: 12, textTransform: 'uppercase' }}>Servings</strong><br />{recipe.servings}</div>
        </div>

        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, borderBottom: '2px solid #fce7eb', paddingBottom: 8, marginTop: 32 }}>Ingredients</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {ingredients.map((ing, i) => (
            <li key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5', display: 'flex', gap: 8 }}>
              <span style={{ fontWeight: 700, color: '#5a8a5a', minWidth: 90 }}>{ing.amount} {ing.unit}</span>
              <span style={{ color: '#525252' }}>{ing.name}</span>
            </li>
          ))}
        </ul>

        <h2 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 22, borderBottom: '2px solid #fce7eb', paddingBottom: 8, marginTop: 32 }}>Instructions</h2>
        <ol style={{ padding: 0, listStyle: 'none', counterReset: 'step' }}>
          {steps.map((step, i) => (
            <li key={i} style={{ padding: '14px 0 14px 48px', borderBottom: '1px solid #f5f5f5', position: 'relative', lineHeight: 1.6, color: '#525252' }}>
              <span style={{
                position: 'absolute', left: 0, top: 14, width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, #f9ced8, #f4a5b8)', color: 'white',
                fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>

        <div style={{ textAlign: 'center', margin: '48px 0 24px', padding: 24, background: '#f4f7f4', borderRadius: 16 }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#404040' }}>Want to save, print, or scale this recipe?</p>
          <a href="/" style={{
            display: 'inline-block', marginTop: 12, padding: '10px 24px', borderRadius: 99,
            background: 'linear-gradient(135deg, #7ba67b, #5a8a5a)', color: 'white',
            fontWeight: 700, fontSize: 14, textDecoration: 'none'
          }}>Join Stewdium - It&apos;s Free</a>
        </div>
      </div>
    </>
  );
}
