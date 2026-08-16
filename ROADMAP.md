# Stewdium Roadmap

**The goal (Ellie's words): the ultimate social media platform for recipe sharing.**

This file is the single list of what's built, what's next, and what's someday.
When a feature ships, move it to Shipped with the date. When someone asks for
something new, add it here so it never gets lost.

---

## Shipped

### Edit mode (Ellie's page designer) -- deployed 8/16/2026

- A pencil "Edit" toggle appears in the top nav for Ellie only. Flip it on and
  every piece of site text (homepage headline and subtitle, page titles, blog
  title/subtitle, all footer text including the copyright line) gets a dashed
  outline; click it, type, done. On the home page, each section (welcome
  header / search bar / filter row / recipe grid) gets up/down arrows to
  reorder the page. Save publishes everything for all visitors at once (stored
  in site_settings; no database migration needed); Discard throws the drafts
  away. Leaving edit mode with unsaved changes asks first. Non-admins never
  see any of it.

### August 2026 release (Ellie's feature list)
- Comments on blog posts (with edit/delete, admin moderation)
- Star ratings (1-5, optional) attached to recipe comments, with average shown
- Real admin role for Ellie B. -- database-enforced, not just hidden buttons:
  - delete any comment (recipes and blog), edit/delete any recipe or blog post
  - Admin Dashboard: live activity feed, master user list, editable site copy
    (homepage headline/subtitle, footer text, blog subtitle)
- Public "Notes" section on recipes (author-written, under Instructions)
- Private "Notes to Self" on your own recipes (tweaks/improvements -- only the
  author can ever see these, enforced by database rules)
- Mobile menu (hamburger) -- Messages, My Board, Meal Plan, Friends, Blog were
  unreachable on phones before
- Message bubbles now show date + time, not just time
- Removed the toolbox emoji from the Filter button
- Fixed a page-load flash (hydration error) that made every visit re-render

### Earlier (spring 2026)
- Recipes: create/edit, photos, ingredient paste-parsing, scaling, fractions,
  nutrition panel, allergen detection + warnings, diet tags, print, download
- Accounts, profiles, avatars, allergy settings
- Likes, saves, comments, "I cooked this" photo gallery
- Friends (follow/search), direct messages with unread badges
- Meal planner with auto-fill, CSV import/export, blog, newsletter signups
- SEO recipe pages at /recipe/[id] with Google rich-result markup

---

## Next up (quick wins, roughly in order)

1. **Share button on recipes** -- copies the /recipe/[id] link. Recipes only
   spread if people can send them. (Small)
2. **Sitemap + robots.txt** -- Google can't find the recipe pages on its own
   yet. This is free SEO for every public recipe. (Small)
3. **Ingredient search** -- search by what's IN the recipe ("chicken", "no
   nuts"), not just the title. (Small-medium)
4. **Email notifications** -- "someone commented on your recipe", "new
   follower". Brings people BACK to the site; right now nothing does. Needs a
   send-email service (e.g. Resend, free tier). (Medium)
5. **Actually send the newsletter** -- there are real subscribers and no
   newsletter. Even a monthly "5 new recipes on Stewdium" email helps. (Medium,
   needs the same email service)
6. **Recipe collections** -- let users group saves into named boards ("Holiday
   baking", "Weeknight dinners"). Pinterest-style stickiness. (Medium)

## Later (bigger bets)

- **Make it feel alive on day one**: featured recipe on the homepage, "new this
  week" row, most-loved row. An empty-feeling site loses new visitors fast.
- **Weekly cooking challenge** -- Ellie posts a theme on the blog, people post
  their photo in comments / a challenge page. Community habit-building.
- **Follow feed** -- a "Following" tab on home showing only friends' recipes.
  It's a social network; the feed is the product.
- **PWA / add-to-home-screen** -- one tap from a phone home screen, app icon,
  maybe push notifications later. The mobile fix this release was step one.
- **Import a recipe from a URL** -- paste any recipe link, we parse it. Huge
  onboarding win (everyone has recipes saved somewhere else).
- **Shopping list** -- tick ingredients across your meal plan, get one list.
- **Reply threads / @mentions in comments.**

## Someday / ideas parking lot

- Video / TikTok-style short clips on recipes
- Recipe forking ("my version of...") with credit to the original
- "What can I make with what I have" pantry matcher
- Seasonal collections, holiday hubs
- Verified home-cook badges; recipe of the month awards

---

## Growing users (not code -- habits)

The app now has the social features it needs. Growth is mostly about content
and rhythm, and it's Ellie's superpower, not the code's:

1. **Post consistently.** 2-3 recipes a week and a blog post every week or two.
   Google indexes every public recipe page; each one is a fishing line.
2. **Ask every visitor to do ONE thing** -- save a recipe or follow Ellie.
   The site should never be a dead end.
3. **Share every new recipe** somewhere real people are: family group chats,
   school friends, a future Instagram/TikTok for Stewdium. The share button
   (Next up #1) makes this one tap.
4. **Recruit the first 20 users personally.** Family, friends, classmates.
   Ten active commenters beat a thousand silent visitors -- comments and star
   ratings make the site look alive, which keeps strangers.
5. **Newsletter as the retention loop** once sending works.

## Infrastructure notes (John)

- **Supabase auto-pause: HANDLED.** The free tier pauses after 7 quiet days
  (took the site down 7/21-8/5), but a daily keep-alive already runs at
  6:10 AM from the iMac (uptime-check launchd job, real query against the
  recipes table). As long as that Mac stays on, the clock never runs out.
  Upgrading to Pro (~$25/mo) is only needed if the site outgrows free-tier
  limits or the iMac safety net isn't enough.
- Push credentials: this Mac cannot push to GitHub (deploys happen via
  Snowman7cloud web upload). Fine for now; worth adding a token if deploys
  get frequent.
