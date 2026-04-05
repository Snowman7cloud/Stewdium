# 🍲 Stewdium - Launch Guide

---

## Step 1: Run the Database Schema (2 min)

In your Supabase project, go to **SQL Editor → New Query**, paste the entire contents of `supabase-schema.sql`, and hit **Run**. This creates all tables, auth triggers, storage buckets, and security policies in one shot.

Then go to **Authentication → Settings** and decide whether you want email confirmation on signup. For tonight, turning it off makes testing faster. Flip it back on once you're live.

---

## Step 2: Set Up the Project Locally (3 min)

```bash
cd stewdium
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase keys from **Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

```bash
npm install
npm run dev
```

Test at `http://localhost:3000`. Create an account, add a recipe, confirm everything works.

---

## Step 3: Push to GitHub and Deploy to Vercel (5 min)

```bash
git init && git add . && git commit -m "Stewdium MVP"
git remote add origin https://github.com/YOUR_USERNAME/stewdium.git
git branch -M main && git push -u origin main
```

In Vercel, import the repo. Add the same two env vars (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) before deploying. Click Deploy.

---

## Step 4: Point stewdium.com (5 min)

In Vercel, go to **Settings → Domains** and add `stewdium.com` and `www.stewdium.com`. It will give you DNS records.

In Namecheap, go to **Advanced DNS** for stewdium.com, delete existing A/CNAME records, and add:

- **A Record**: Host `@`, Value `76.76.21.21`
- **CNAME**: Host `www`, Value `cname.vercel-dns.com`

Propagation takes 5-30 minutes.

---

## You're Live 🎉

Add a few seed recipes so the site has content when visitors land. Total cost: $0/month on free tiers.

---

## Post-Launch

- Turn email confirmation back on in Supabase Auth
- Connect a newsletter tool (Beehiiv, etc.) to the `newsletter_subscribers` table
- Add analytics (Plausible or GA)
- Build out the blog page

---

## File Structure

```
stewdium/
├── app/
│   ├── layout.js          # HTML shell, fonts, metadata
│   ├── globals.css         # Tailwind imports
│   └── page.js             # Full app
├── lib/
│   ├── supabase.js         # Client init
│   └── db.js               # All database operations
├── supabase-schema.sql     # Run once in SQL Editor
├── package.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
└── .env.example
```