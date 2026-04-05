# STEWDIUM - Project Briefing for Claude Code

## What This Is

Stewdium (stewdium.com) is a social media website exclusively for recipes. The domain was purchased on Namecheap and is pointed at Vercel. The Supabase project exists and has the v1 schema deployed. The site is live but has bugs and missing features.

The founder is John (a DP/business owner, not a professional developer). His daughter conceived the product. They want a polished, functional MVP.

---

## Current Stack

- **Frontend:** Next.js 14 (App Router)
- **Database + Auth + Storage:** Supabase (free tier)
- **Hosting:** Vercel (free tier)
- **Domain:** stewdium.com via Namecheap, DNS pointed to Vercel and working

## Supabase Status

- v1 schema is deployed (profiles, recipes, saved_recipes, cooked_photos, meal_plans, newsletter_subscribers, storage buckets)
- v2 schema (allergen_tags, nutrition columns, recipe_likes table, like_count cache) may or may not be deployed -- check before running
- v3 schema (follows table, recipe_comments table) has NOT been deployed yet
- Auth is set to require email confirmation
- Site URL may not be set to https://stewdium.com yet -- needs to be verified
- Redirect URL https://stewdium.com/auth/callback may not be added yet

## What Has Been Built (in code, not all tested/working)

The project zip exists with these files, but much of it was written blind without testing. Treat the code as a rough draft, not production-ready.

### Files:
```
stewdium/
  app/
    layout.js              -- Root layout, fonts, meta
    globals.css             -- Tailwind imports
    page.js                 -- Main SPA (all pages in one component)
    auth/callback/route.js  -- Handles Supabase email verification redirect
    recipe/[id]/page.js     -- Server-rendered public recipe page for SEO
  lib/
    supabase.js             -- Browser client init
    db.js                   -- All Supabase operations
    nutrition.js             -- 200+ ingredient nutrition database, allergen detection
    parse-ingredients.js     -- Paste-and-parse ingredient lists
  public/
    logo.png                -- Stewdium logo (mixing bowl illustration)
  supabase-schema.sql       -- v1 database schema
  supabase-schema-v2.sql    -- v2 migration (likes, allergens, nutrition)
  supabase-schema-v3.sql    -- v3 migration (follows, comments)
  .env.example
  package.json
  next.config.js
  tailwind.config.js
  postcss.config.js
```

---

## Design Specifications

### Colors
- Light pink: #fdf2f4 to #e04d73
- Sage green: #f4f7f4 to #476e47
- Blue accents: #eff6ff to #3b82f6
- White cards, subtle gradients

### Fonts
- Display/headings: DM Serif Display
- Body: Nunito

### Logo
- Custom illustration of a mixing bowl with wooden spoon (public/logo.png)
- Nav shows: [logo image] stewdium (where "stew" is pink and "dium" is sage green, NO gap between them)
- Footer matches nav logo treatment

---

## Feature Requirements (Complete Spec)

### 1. Accounts & Profiles
- Email/password signup with Supabase Auth
- Email verification required, redirects to /auth/callback
- Newsletter opt-in checkbox on signup (pre-checked)
- Profile page with: avatar upload, display name, bio
- Email and password are PRIVATE (never shown to others)
- Food allergies/intolerances selection (dairy, gluten, nuts, peanuts, eggs, soy, shellfish, fish, sesame, sulfites, corn, nightshades)
- Toggle allergies public or private

### 2. Recipes
- Anyone can browse and search public recipes WITHOUT signing in
- Must sign in to: create, save, like, print, download, comment
- Recipe fields: title, description, category, prep time, cook time, servings, photo upload, ingredients, steps, public/private toggle
- Ingredients: manual entry (amount/unit/name rows) OR paste-a-list mode that parses "2 cups flour" format
- Steps: manual entry OR paste mode that parses numbered lists
- Fractions must display as fractions (1/2, 1/4) not decimals
- Auto-detect allergens from ingredients
- Auto-suggest diet tags (gluten-free, dairy-free, vegan, keto, etc.) that user can override
- Each recipe gets its own SEO URL at /recipe/[id] with JSON-LD structured data for Google rich results

### 3. Recipe Viewing
- Nutrition panel showing calories, protein, carbs, fat per serving (calculated from built-in USDA-referenced ingredient database)
- Allergen badges on recipes
- Warning banner if recipe contains user's allergens
- Recipe scaling: 1x/2x/3x buttons or type number of people feeding -- converts to usable measurements (tsp -> tbsp -> cup etc.)
- Print button (clean print layout, hides nav/footer/buttons)
- Download as .txt file
- "I cooked this!" photo upload with community photo gallery + lightbox
- Like/upvote button with count
- Comment section (avatar, name, date, text)
- Clicking author name goes to their public profile

### 4. Recipe Board (My Board)
- Two tabs: Saved (hearted) and My Recipes (created)
- CSV import with column mapping UI (user maps their CSV headers to recipe fields, previews first 3 rows, then imports)
- CSV export (my recipes, saved, or all public)
- Add Recipe button

### 5. Meal Planner
- Weekly grid (Mon-Sun) x (Breakfast, Lunch, Dinner)
- Click slot to pick from available recipes
- Remove meals from slots
- Helpful message when no recipes exist yet

### 6. Friends
- Nav link to Friends page
- Search people by name
- Follow/unfollow
- View public profiles (avatar, name, bio, public allergies if enabled, their public recipes)

### 7. Footer
- Logo + brand description
- Explore links (Browse, Meal Planner, Find Friends)
- Account links (dynamic based on sign-in state)
- Newsletter signup form with email input
- Copyright line

### 8. Allergen Filtering
- Toggle on browse page: "Hide allergens" filters out recipes containing user's allergens
- Allergen warning badges on recipe cards for signed-in users

### 9. Rating System
- Thumbs up / like button on recipe cards and detail pages
- Like count displayed
- Sort by "Newest" or "Most Popular" on browse page

---

## Known Bugs / Issues to Fix

1. **Auth token lock error** on CSV import ("Lock was released because another request stole it") -- caused by Supabase client initialization. db.js was rewritten with lazy singleton but not tested.
2. **Profile page was blank** -- the component required both `user` and `profile` to be truthy but profile wasn't loading fast enough. Added loading spinner fallback but untested.
3. **Email verification redirect** wasn't working -- auth/callback route was added, signUp function was updated with emailRedirectTo, but Supabase URL Configuration may not be set.
4. **The entire app is untested.** Every feature was written blind without a browser or dev server. Assume nothing works until verified.

---

## How to Proceed with Claude Code

### Step 1: Verify Supabase Setup
```
- Check if v1 schema tables exist (profiles, recipes, saved_recipes, etc.)
- Run v2 migration if not done (supabase-schema-v2.sql)
- Run v3 migration (supabase-schema-v3.sql)
- Verify Authentication > URL Configuration has:
  - Site URL: https://stewdium.com
  - Redirect URL: https://stewdium.com/auth/callback
```

### Step 2: Get the App Running Locally
```
cd stewdium
cp .env.example .env.local
# Add Supabase URL and anon key to .env.local
npm install
npm run dev
# Open localhost:3000
```

### Step 3: Fix and Test Every Feature
Go through each feature systematically. Test in the browser. Fix bugs as you find them. The code is a starting point, not finished work. Key areas that likely need debugging:
- Auth flow (signup, email verification redirect, login, signout)
- Profile loading and editing
- Recipe CRUD (create, read, display, save, like)
- Image uploads (recipe photos, avatars, cooked photos)
- Ingredient paste parser
- Steps paste parser
- CSV import with column mapping
- Meal planner
- Friends (search, follow, view profiles)
- Comments
- Nutrition calculation
- Allergen detection and filtering
- Print and download
- SEO recipe pages (/recipe/[id])

### Step 4: Deploy
```
git add . && git commit -m "v4 fixes" && git push
```
Vercel auto-deploys from GitHub.

---

## Style Rules (from John's preferences)
- Do not use em dashes in any content meant for copy and paste
- Clean, colorful, not cluttered
- Mobile responsive
- The site should feel like a real social media platform, not a developer prototype

---

## Supabase Credentials
The .env.local file needs:
```
NEXT_PUBLIC_SUPABASE_URL=<from Supabase Settings > API>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from same page, the anon/public key>
```

The Supabase project ID contains "erxpnerohordckxzcznp" based on the error message in the chat.
