# Bonus Hunt Tracker - Full Architecture & Build Plan

## Context

We need a standalone SaaS bonus hunt tracker for streamers. Streamers sign up, pick a subscription plan, create bonus hunts by selecting games from our game catalog, track results live, and share a real-time public viewer page with their audience. The product lives at `sucksmedia.com/bonushunt` — either as a subpath on the existing sucksmedia.com domain (via Vercel rewrites) or as a separate Vercel project with a basePath config.

**The tracker owns its own games database.** It is seeded once from Wagerrace's 7,700+ existing games, then kept up-to-date automatically by scraping BigWinBoard.com every 12 hours for new game releases. This makes the tracker fully self-sufficient — no runtime dependency on Wagerrace for game data.

**This plan covers four things:**
1. A small change in **Wagerrace** (this project) — one public API endpoint to serve game catalog data for the initial seed
2. The full architecture for the **new Bonus Hunt Tracker project** — to be built in a separate repo
3. A **BigWinBoard scraper** that runs every 12 hours to detect and import new games automatically
4. A **Stream Overlay Editor** — visual canvas editor with scenes, chat bot commands, and mod controls

---

## Part 1: Wagerrace Changes (This Project)

### New File: `app/api/public/games/route.ts`

A CORS-enabled public API endpoint that serves game data from the existing `games` table.

**Endpoints:**
- `GET /api/public/games?q=gates&limit=20` — Search/autocomplete games by name
- `GET /api/public/games?provider=pragmatic&limit=50` — Filter by provider
- `GET /api/public/games?slug=gates-of-olympus` — Get single game by slug

**Returns per game:**
```json
{
  "slug": "gates-of-olympus",
  "name": "Gates of Olympus",
  "provider": "Pragmatic Play",
  "image_url": "https://...",
  "rtp": "96.50",
  "volatility": "High",
  "max_win": "5000x"
}
```

**Uses existing function:** `getGames()` from `lib/db/games.ts` (already has search, provider filter, pagination).

**CORS headers:** Allow requests from the tracker domain. Set `Access-Control-Allow-Origin` to the tracker's domain.

**Caching:** `Cache-Control: public, s-maxage=3600` — game catalog rarely changes, aggressive caching is safe.

This endpoint is used **once** for the initial seed import. After that, the tracker's own database is the source of truth, kept fresh by the BigWinBoard scraper.

This is the ONLY change to Wagerrace.

---

## Part 2: Bonus Hunt Tracker — New Separate Project

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL (Neon) + Prisma ORM
- **Auth:** NextAuth (Google + Discord providers)
- **Billing:** Stripe (Checkout + Customer Portal + Webhooks)
- **Real-time:** Pusher (hosted WebSocket service — required because Vercel serverless can't hold persistent connections)
- **Styling:** Tailwind CSS
- **Hosting:** Vercel (separate project, own domain)
- **Game data:** Own PostgreSQL `Game` table, seeded from Wagerrace, kept fresh by BigWinBoard scraper
- **Scraping:** Cheerio (HTML parsing) + rotating residential proxies for anti-ban
- **Cron:** Vercel Cron or Upstash QStash for 12-hour scraper schedule

### Database Schema (Prisma)

```prisma
model Game {
  id                String    @id @default(uuid())
  slug              String    @unique          // gates-of-olympus
  name              String                      // Gates of Olympus
  provider          String                      // Pragmatic Play
  imageUrl          String?
  rtp               Decimal?                    // 96.50
  volatility        String?                     // "High" or "5/5"
  maxWin            String?                     // "5000x"
  betRange          String?                     // "0.20 - 100"
  releaseDate       DateTime?
  features          String[]                    // ["bonus-buy", "cascades", "multipliers"]
  gridLayout        String?                     // "6x5"
  source            String    @default("wagerrace") // wagerrace | bigwinboard | manual
  bwbUrl            String?                     // bigwinboard review page URL
  bwbScore          Decimal?                    // bigwinboard rating (e.g. 9/10)
  timesUsedInHunts  Int       @default(0)       // tracker-specific popularity stat
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model ScrapeLog {
  id              String    @id @default(uuid())
  startedAt       DateTime  @default(now())
  completedAt     DateTime?
  status          String    @default("running")  // running | completed | failed
  gamesFound      Int       @default(0)          // new games detected on listing pages
  gamesAdded      Int       @default(0)          // successfully scraped & inserted
  gamesUpdated    Int       @default(0)          // existing games with updated data
  errors          Json?                           // [{ game, error }] for debugging
  durationMs      Int?
}

model User {
  id                 String   @id @default(uuid())
  name               String
  email              String   @unique
  image              String?
  isAdmin            Boolean  @default(false)       // access to /admin pages & scraper controls
  stripeCustomerId   String?  @unique
  stripePriceId      String?                        // active Stripe price ID
  subscriptionTier   String   @default("free")      // free | basic | pro
  subscriptionStatus String   @default("inactive")  // inactive | trialing | active | canceled | past_due
  trialEndsAt        DateTime?                      // nullable — set on first sign-up if trial offered
  huntsThisMonth     Int      @default(0)           // counter for free-tier limit, reset monthly
  huntsResetAt       DateTime?                      // when huntsThisMonth was last reset
  onboardingDone     Boolean  @default(false)       // has the user completed onboarding?
  hunts              Hunt[]
  presets            HuntPreset[]
  gameStats          GameStat[]
  overlayProjects    OverlayProject[]
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model Hunt {
  id          String      @id @default(uuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  title       String      // "Tuesday Night Hunt"
  status      String      @default("preparing") // preparing | live | completed
  totalCost   Decimal     @default(0)
  totalWon    Decimal     @default(0)
  shareSlug   String      @unique // short URL slug for public viewing
  startedAt   DateTime?
  completedAt DateTime?
  entries     HuntEntry[]
  createdAt   DateTime    @default(now())
}

model HuntEntry {
  id           String   @id @default(uuid())
  huntId       String
  hunt         Hunt     @relation(fields: [huntId], references: [id], onDelete: Cascade)
  gameSlug     String?  // references Game.slug (null for quick-add custom games)
  gameName     String   // denormalized for fast reads
  gameImage    String?
  gameProvider String?
  betSize      Decimal
  cost         Decimal  // bonus buy cost
  result       Decimal? // null until played
  multiplier   Decimal? // computed: result / cost
  position     Int      // order in the hunt
  status       String   @default("pending") // pending | playing | completed
  createdAt    DateTime @default(now())
}

model HuntPreset {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  name      String   // "My Favorites", "High Vol Pack"
  games     Json     // [{ gameSlug, gameName, gameImage, gameProvider, defaultBet }]
  createdAt DateTime @default(now())
}

model GameStat {
  id               String  @id @default(uuid())
  userId           String
  user             User    @relation(fields: [userId], references: [id])
  gameSlug         String
  gameName         String
  timesPlayed      Int     @default(0)
  totalSpent       Decimal @default(0)
  totalWon         Decimal @default(0)
  biggestWin       Decimal @default(0)
  biggestMultiplier Decimal @default(0)
  avgMultiplier    Decimal @default(0)

  @@unique([userId, gameSlug])
}

// ─── Overlay Editor Models ───

model OverlayProject {
  id              String          @id @default(uuid())
  userId          String
  user            User            @relation(fields: [userId], references: [id])
  name            String                              // "My Stream Setup"
  slug            String          @unique             // URL slug: sucksmedia.com/bonushunt/o/[slug]
  activeSceneId   String?                             // currently displayed scene
  activeHuntId    String?                             // linked bonus hunt (data source for widgets)
  kickChannelSlug String?                             // "johnessy" — Kick channel slug for chat bot
  kickChannelId   String?                             // Kick channel ID (numeric)
  chatBotEnabled  Boolean         @default(false)     // listen for chat commands?
  scenes          OverlayScene[]
  chatCommands    ChatCommand[]
  modTokens       ModToken[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model OverlayScene {
  id              String          @id @default(uuid())
  projectId       String
  project         OverlayProject  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name            String                              // "Hunting", "Opening", "Full Screen"
  slug            String                              // "hunting" — used in chat commands (!hunting)
  width           Int             @default(1920)
  height          Int             @default(1080)
  background      String          @default("transparent") // "transparent" | "#000000" | image URL
  transition      String          @default("fade")    // fade | slide | cut | none
  transitionMs    Int             @default(500)        // transition duration
  position        Int                                  // order in scene list
  widgets         OverlayWidget[]
  chatCommands    ChatCommand[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@unique([projectId, slug])
}

model OverlayWidget {
  id              String          @id @default(uuid())
  sceneId         String
  scene           OverlayScene    @relation(fields: [sceneId], references: [id], onDelete: Cascade)
  type            String                              // widget type (see widget types below)
  label           String?                             // optional label shown in editor
  x               Int             @default(0)         // position on canvas (px)
  y               Int             @default(0)
  width           Int             @default(400)
  height          Int             @default(200)
  rotation        Int             @default(0)         // degrees
  zIndex          Int             @default(0)
  visible         Boolean         @default(true)
  locked          Boolean         @default(false)     // prevent accidental moves in editor
  opacity         Float           @default(1.0)       // 0.0 – 1.0
  config          Json            @default("{}")      // widget-specific settings (see below)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model ChatCommand {
  id              String          @id @default(uuid())
  projectId       String
  project         OverlayProject  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  command         String                              // "!hunting" (including the !)
  action          String          @default("switch_scene") // switch_scene | custom (future)
  targetSceneId   String?
  targetScene     OverlayScene?   @relation(fields: [targetSceneId], references: [id])
  allowedRoles    String[]        @default(["broadcaster", "moderator"]) // who can trigger
  cooldownMs      Int             @default(5000)      // prevent spam
  enabled         Boolean         @default(true)
  createdAt       DateTime        @default(now())

  @@unique([projectId, command])
}

model ModToken {
  id              String          @id @default(uuid())
  projectId       String
  project         OverlayProject  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  token           String          @unique             // random token for mod dashboard URL
  label           String                              // "My mod team", "KickMod_Dave"
  permissions     String[]        @default(["switch_scene", "update_hunt"]) // what they can do
  expiresAt       DateTime?                           // optional expiry
  createdAt       DateTime        @default(now())
}
```

### Pages & Routes

```
Public (no auth):
/                        — Landing/home page (marketing, pricing, sign up CTA)
/login                   — Auth page (Google + Discord sign-in)
/hunt/[id]/live          — PUBLIC viewer page (no auth, shareable URL, real-time updates)
/hunt/[id]/overlay       — OBS overlay (minimal clean view, transparent bg, for stream)

Authenticated (requires sign-in):
/dashboard               — Streamer home (stats overview, recent hunts, quick start button)
/hunt/new                — Create new hunt (title, load preset or start empty)
/hunt/[id]               — Hunt control panel (add games, record results, go live)
/presets                 — Manage saved game lists (Pro only)
/stats                   — Detailed personal statistics & game history
/billing                 — Subscription management (Stripe Customer Portal)
/settings                — Account settings
/editor                  — List overlay projects + create new
/editor/[projectId]      — Visual canvas editor (drag/drop widgets, manage scenes)
/editor/[projectId]/commands — Chat command configuration
/editor/[projectId]/mods — Mod access management (generate mod tokens)

Public overlay (no auth — this is the OBS browser source URL):
/o/[slug]                — Master overlay URL (renders active scene, switches via Pusher)

Mod dashboard (token-based auth, no account needed):
/mod/[token]             — Mod control panel (switch scenes, control hunt)

Admin (requires isAdmin):
/admin/scraper           — Scraper dashboard (last run, status, errors)
/admin/scraper/logs      — Full scrape history
/admin/games             — Browse/search/edit local game database
/admin/games/[slug]      — Edit individual game
/admin/users             — User management (view plans, toggle admin)
```

### Home Page (`/`) — Landing & Marketing

The home page is the public-facing sales page. Visitors land here, see what the product does, and sign up.

**Layout (top to bottom):**

1. **Hero Section**
   - Bold headline: e.g. "Track Your Bonus Hunts Like a Pro"
   - Subheadline: "Real-time tracking, live viewer pages, OBS overlays — built for streamers"
   - Two CTAs: "Get Started Free" (→ `/login`) | "See a Live Hunt" (→ demo hunt `/hunt/[demo-id]/live`)
   - Hero image/video: screenshot or animated preview of the hunt control panel

2. **Feature Highlights** (3-4 cards)
   - "7,700+ Games" — Search our massive catalog, add games instantly
   - "Go Live" — Share a real-time viewer page with your audience
   - "OBS Overlay" — Clean overlay that drops straight into your stream
   - "Track Everything" — Stats, multipliers, profit/loss across all your hunts

3. **How It Works** (3 steps)
   - Step 1: "Create a hunt" — pick a title, add games from the catalog
   - Step 2: "Go live" — share the link, your viewers watch in real-time
   - Step 3: "Record results" — log each bonus result, totals update live

4. **Live Demo Embed**
   - Embedded iframe or screenshot of a sample `/hunt/[id]/live` page
   - Shows what viewers see — real-time grid with results, running totals

5. **Pricing Section**
   - 3-column pricing cards (Free / Basic / Pro) with feature comparison
   - "Get Started Free" CTA on each card → `/login`
   - Highlight the Pro card as "Most Popular"

6. **Social Proof / Testimonials** (future — placeholder section)
   - Streamer quotes, viewer count stats, etc.

7. **Footer**
   - Links: About, Terms, Privacy, Contact
   - Social links: Twitter/X, Discord

**Key behaviour:**
- If user is already signed in, the hero CTA changes to "Go to Dashboard" (→ `/dashboard`)
- Fully static/cached page (ISR or static generation) — loads instantly
- SEO optimized: meta title, description, Open Graph tags for social sharing

### Authentication & Sign-In (`/login`)

**Providers:** Google + Discord (via NextAuth.js)

**Flow:**
```
1. User clicks "Get Started Free" or "Sign In" → lands on /login
2. /login shows two buttons: "Continue with Google" | "Continue with Discord"
3. User clicks one → NextAuth OAuth flow → provider consent screen
4. On success → NextAuth callback:
   a. FIRST TIME: Create User record (subscriptionTier="free", subscriptionStatus="inactive")
   b. RETURNING: Load existing User record
5. Redirect to /dashboard (or /onboarding if onboardingDone=false)
```

**NextAuth config:**
- Session strategy: JWT (stateless, no session table needed)
- Callbacks:
  - `jwt` callback: attach `userId`, `subscriptionTier`, `isAdmin` to the JWT
  - `session` callback: expose `userId`, `subscriptionTier`, `isAdmin` on the client session
- This means any component can call `useSession()` and immediately know the user's tier and admin status

### User Rights & Feature Gating

All feature access is determined by `subscriptionTier` on the User model. The app checks this server-side (API routes) and client-side (UI visibility).

**Middleware approach:**
- Next.js middleware at `middleware.ts` protects authenticated routes
- Checks for valid NextAuth session — redirects to `/login` if missing
- Does NOT check tier in middleware (that's per-feature, not per-route)

**Server-side gating (API routes):**
```typescript
// Helper used in every protected API route
function checkFeature(user: User, feature: string): boolean {
  const tierFeatures = {
    free: ["hunt_create", "game_search", "quick_add", "basic_stats"],
    basic: ["hunt_create", "game_search", "quick_add", "basic_stats",
            "public_viewer", "realtime", "full_stats", "unlimited_hunts"],
    pro:   ["hunt_create", "game_search", "quick_add", "basic_stats",
            "public_viewer", "realtime", "full_stats", "unlimited_hunts",
            "presets", "obs_overlay", "custom_branding", "viewer_count"],
  };
  return tierFeatures[user.subscriptionTier]?.includes(feature) ?? false;
}
```

**Free tier hunt limit enforcement:**
```
- User.huntsThisMonth tracks how many hunts created this calendar month
- User.huntsResetAt tracks when the counter was last reset
- On POST /api/hunts: if tier=free, check huntsThisMonth < 3
  - If huntsResetAt is in a previous month, reset counter to 0 first
  - If limit reached, return 403 with upgrade prompt
```

**Client-side gating (UI):**
```typescript
// React hook for conditional rendering
function useCanAccess(feature: string): boolean {
  const { data: session } = useSession();
  return checkFeature(session.user.subscriptionTier, feature);
}

// Usage in components:
const canGoLive = useCanAccess("public_viewer");
// Show "Go Live" button if true, show "Upgrade to Basic" prompt if false
```

**Feature gating summary:**

| Feature | Check | Free | Basic | Pro |
|---------|-------|------|-------|-----|
| Create hunt | `hunt_create` + monthly limit | 3/month | Unlimited | Unlimited |
| Game autocomplete | `game_search` | Yes | Yes | Yes |
| Quick-add games | `quick_add` | Yes | Yes | Yes |
| Public viewer page | `public_viewer` | Locked | Yes | Yes |
| Real-time updates | `realtime` | Locked | Yes | Yes |
| Preset game lists | `presets` | Locked | Locked | Yes |
| OBS overlay URL | `obs_overlay` | Locked | Locked | Yes |
| Detailed game stats | `full_stats` | Basic only | Full | Full |
| Custom branding | `custom_branding` | Locked | Locked | Yes |
| Viewer count | `viewer_count` | Locked | Locked | Yes |

**"Locked" UI pattern:**
- When a feature is locked for the user's tier, the UI still shows it but greyed out / disabled
- Clicking a locked feature shows an inline upgrade prompt: "Upgrade to [Basic/Pro] to unlock this feature" with a CTA to `/billing`
- This teases the feature and drives upgrades

### Real-Time Architecture (Pusher)

```
Streamer records a result in /hunt/[id]
  → POST /api/hunts/[id]/entries/[entryId]  (saves to DB)
  → Server triggers Pusher event: channel="hunt-{id}", event="entry-updated"
  → All viewers on /hunt/[id]/live receive the event instantly
  → React state updates, UI reflects new result with animation
```

**Pusher channels:**
- `hunt-{huntId}` — entry updates, hunt status changes
- `presence-hunt-{huntId}` — viewer count (optional, pro feature)

### Subscription Tiers

| Feature | Free | Basic | Pro |
|---------|------|-------|-----|
| Hunts per month | 3 | Unlimited | Unlimited |
| Game autocomplete | Yes | Yes | Yes |
| Quick-add games | Yes | Yes | Yes |
| Public viewer page | No | Yes | Yes |
| Real-time updates | No | Yes | Yes |
| Preset game lists | No | No | Yes |
| OBS overlay URL | No | No | Yes |
| Detailed game stats | Basic | Full | Full |
| Custom branding | No | No | Yes |

### Stripe Integration

- **Checkout:** `/api/billing/checkout` creates a Stripe Checkout Session
- **Webhook:** `/api/billing/webhook` handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- **Portal:** `/api/billing/portal` redirects to Stripe Customer Portal for self-serve management
- Products/prices configured in Stripe Dashboard

### API Routes

```
Auth:
  /api/auth/[...nextauth]        — NextAuth (Google + Discord)

Hunts:
  GET    /api/hunts               — List my hunts
  POST   /api/hunts               — Create hunt
  GET    /api/hunts/[id]          — Get hunt (with entries)
  PATCH  /api/hunts/[id]          — Update hunt (title, status)
  DELETE /api/hunts/[id]          — Delete hunt

  POST   /api/hunts/[id]/entries        — Add entry to hunt
  PATCH  /api/hunts/[id]/entries/[eid]  — Update entry (record result)
  DELETE /api/hunts/[id]/entries/[eid]  — Remove entry
  POST   /api/hunts/[id]/reorder        — Reorder entries

  GET    /api/hunts/[id]/public         — Public hunt data (no auth, for viewer page)

Presets:
  GET    /api/presets              — List my presets
  POST   /api/presets              — Create preset
  PATCH  /api/presets/[id]         — Update preset
  DELETE /api/presets/[id]         — Delete preset

Stats:
  GET    /api/stats                — My aggregated stats
  GET    /api/stats/games          — Per-game stats

Games (local database):
  GET    /api/games/search?q=...   — Search local game catalog (autocomplete)
  GET    /api/games/[slug]         — Get single game details
  GET    /api/games/popular        — Most-used games in hunts

Overlay Editor:
  GET    /api/overlays                          — List my overlay projects
  POST   /api/overlays                          — Create overlay project
  GET    /api/overlays/[id]                     — Get project (with scenes + widgets)
  PATCH  /api/overlays/[id]                     — Update project settings (name, kick channel, etc.)
  DELETE /api/overlays/[id]                     — Delete project

  POST   /api/overlays/[id]/scenes              — Create scene
  PATCH  /api/overlays/[id]/scenes/[sid]        — Update scene (name, background, transition)
  DELETE /api/overlays/[id]/scenes/[sid]        — Delete scene
  POST   /api/overlays/[id]/scenes/reorder      — Reorder scenes

  POST   /api/overlays/[id]/scenes/[sid]/widgets      — Add widget to scene
  PATCH  /api/overlays/[id]/scenes/[sid]/widgets/[wid] — Update widget (position, size, config)
  DELETE /api/overlays/[id]/scenes/[sid]/widgets/[wid] — Delete widget
  POST   /api/overlays/[id]/scenes/[sid]/widgets/reorder — Update z-index ordering

  POST   /api/overlays/[id]/switch-scene        — Switch active scene (triggers Pusher event)
  GET    /api/overlays/[id]/public              — Public overlay data (no auth, for /o/[slug])

  POST   /api/overlays/[id]/commands            — Create chat command
  PATCH  /api/overlays/[id]/commands/[cid]      — Update chat command
  DELETE /api/overlays/[id]/commands/[cid]      — Delete chat command

  POST   /api/overlays/[id]/mod-tokens          — Generate mod access token
  DELETE /api/overlays/[id]/mod-tokens/[tid]    — Revoke mod token

  GET    /api/mod/[token]                       — Get mod dashboard data (token-based auth)
  POST   /api/mod/[token]/switch-scene          — Mod switches scene (triggers Pusher)
  POST   /api/mod/[token]/update-hunt           — Mod updates hunt entry (if permitted)

Kick Chat Bot:
  POST   /api/kick/webhook                      — Kick chat webhook (receives chat commands)
  GET    /api/kick/auth                         — OAuth flow for connecting Kick account
  GET    /api/kick/callback                     — OAuth callback

Scraper (admin only):
  POST   /api/admin/scrape/trigger — Manually trigger a BigWinBoard scrape
  GET    /api/admin/scrape/logs    — View recent scrape history & results
  POST   /api/admin/seed           — One-time seed from Wagerrace API
  POST   /api/cron/scrape          — Cron endpoint (called by Vercel Cron every 12h, secured by CRON_SECRET)

Billing:
  POST   /api/billing/checkout     — Create Stripe checkout session
  POST   /api/billing/portal       — Create Stripe portal session
  POST   /api/billing/webhook      — Stripe webhook handler
```

### Key UI Components

**Hunt Control Panel (`/hunt/[id]`):**
- Game search bar with autocomplete (queries local Game table — instant, no external calls)
- Quick-add button for unlisted games
- Draggable entry list showing: position, game image, name, provider, bet, cost, result, multiplier
- "Record Result" button per entry — opens input for win amount
- Running totals bar: Total Cost | Total Won | Profit/Loss | Avg Multiplier
- "Go Live" button to make hunt public
- "Load Preset" button to bulk-add games

**Public Viewer Page (`/hunt/[id]/live`):**
- No auth required, shareable URL
- Hunt title + streamer name
- Live-updating entry grid with animations on new results
- Running totals prominently displayed
- Current game highlighted
- Viewer count (pro tier)

**OBS Overlay (`/hunt/[id]/overlay`):**
- Transparent background
- Compact layout showing: current game, running total, profit/loss
- Smooth animations for result updates
- Configurable via query params (?theme=dark&compact=true)

**Dashboard (`/dashboard`):**
- Stats cards: Total hunts, Total profit, Biggest win, Best game
- Recent hunts list with status badges
- "Start New Hunt" CTA
- Quick preset access
- Subscription badge showing current tier + days remaining (if trial)

**Settings (`/settings`):**
- Profile: name, avatar (from OAuth provider)
- Subscription info: current plan, status, next billing date
- "Manage Subscription" button → Stripe Customer Portal
- Danger zone: delete account (with confirmation)

### Detailed Page Flows

#### Onboarding Flow (first-time users)

When `onboardingDone=false`, the user is redirected to a simple onboarding wizard after first sign-in:

```
Step 1: "Welcome!" — Explain what the tracker does (30 second read)
Step 2: "Pick your display name" — Pre-filled from OAuth, editable
Step 3: "Try it out" — Create their first hunt with a guided walkthrough
         → Auto-creates a hunt titled "My First Hunt"
         → Shows how to search games, add entries, record results
Step 4: "You're all set!" — CTA to dashboard
         → Sets onboardingDone=true on User
```

This is skippable — a "Skip" link at every step sets `onboardingDone=true` and goes to `/dashboard`.

#### Create Hunt Flow (`/hunt/new`)

```
1. User clicks "Start New Hunt" from dashboard
2. Modal or page with:
   - Title input (required): "Tuesday Night Hunt"
   - Optional: Load from preset dropdown (Pro only, shows upgrade prompt otherwise)
   - "Create Hunt" button
3. POST /api/hunts → creates Hunt with status="preparing"
4. Redirect to /hunt/[id] (the control panel)
```

#### Hunt Control Panel Flow (`/hunt/[id]`)

This is the main workspace. The streamer spends most of their time here.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Hunt: "Tuesday Night Hunt"              Status: PREPARING  [Go Live] │
├─────────────────────────────────────────────────────────────────────┤
│  [Search games... 🔍]                              [+ Quick Add]  │
├─────────────────────────────────────────────────────────────────────┤
│  #  │ Game             │ Provider     │ Bet   │ Cost  │ Result │ X  │
│ ────┼──────────────────┼──────────────┼───────┼───────┼────────┼──  │
│  1  │ 🎰 Gates of Oly  │ Pragmatic    │ $2.00 │ $200  │   —    │ ▶  │
│  2  │ 🎰 Sweet Bonanza │ Pragmatic    │ $1.00 │ $100  │ $450   │ ✓  │
│  3  │ 🎰 Mental         │ NoLimit City │ $5.00 │ $500  │   —    │ ▶  │
├─────────────────────────────────────────────────────────────────────┤
│  Total Cost: $800   │  Total Won: $450  │  P/L: -$350  │  Avg: 4.5x │
└─────────────────────────────────────────────────────────────────────┘
```

**Adding games:**
1. Type in search bar → debounced query to `/api/games/search?q=...` → dropdown with results
2. Click a result → modal with bet size + bonus cost inputs → "Add to Hunt"
3. POST `/api/hunts/[id]/entries` → entry appears at bottom of list
4. Drag to reorder → POST `/api/hunts/[id]/reorder`

**Quick Add (for unlisted games):**
1. Click "+ Quick Add" → modal with: game name, provider (optional), bet size, cost
2. Creates entry with `gameSlug=null` — works fine, just no image/catalog data

**Recording results:**
1. Click "▶" (play) on an entry → entry status changes to "playing", row highlights
2. Click the result cell → inline input or modal → enter win amount
3. PATCH `/api/hunts/[id]/entries/[eid]` with result → multiplier auto-calculated
4. Entry status → "completed", checkmark shows
5. Running totals update instantly
6. If Pusher is active (hunt is live), event fires to all viewers

**Going live:**
1. Click "Go Live" button (requires Basic+ tier, shows upgrade prompt on Free)
2. PATCH `/api/hunts/[id]` → status changes to "live"
3. Share URL appears: `sucksmedia.com/bonushunt/h/[shareSlug]` (short, shareable)
4. Copy button for easy sharing
5. From this point, all result updates trigger Pusher events

**Completing the hunt:**
1. After all entries have results, a "Complete Hunt" button appears
2. Click → PATCH `/api/hunts/[id]` → status="completed", completedAt=now()
3. Final summary shows: total cost, total won, profit/loss, best game, best multiplier

#### Public Viewer Page (`/hunt/[id]/live`)

Shareable URL, no auth needed. This is what the streamer's audience sees.

```
┌─────────────────────────────────────────────────────────────────────┐
│           🔴 LIVE   "Tuesday Night Hunt" by JohnEssy               │
│                        👁 1,247 watching                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Total Cost: $12,500    Total Won: $8,750    P/L: -$3,750          │
│  ████████████████████████░░░░░░░  70% complete                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  #  │ Game             │ Provider     │ Cost   │ Result  │ Multi   │
│ ────┼──────────────────┼──────────────┼────────┼─────────┼─────────│
│  1  │ Gates of Olympus │ Pragmatic    │ $200   │ $1,200  │  6.0x   │
│  2  │ Sweet Bonanza    │ Pragmatic    │ $100   │ $50     │  0.5x   │
│ ▶3  │ Mental           │ NoLimit City │ $500   │  ...    │   —     │ ← PLAYING
│  4  │ Wanted Dead      │ Hacksaw      │ $400   │   —     │   —     │
│  5  │ Book of Dead     │ Play'n GO    │ $100   │   —     │   —     │
└─────────────────────────────────────────────────────────────────────┘
```

**Real-time behaviour:**
- Pusher subscription on `hunt-{huntId}` channel
- On `entry-updated` event: animate the updated row (flash/highlight), update totals
- On `hunt-status-changed` event: update header (PREPARING → LIVE → COMPLETED)
- Current game (status=playing) is highlighted with pulsing border
- Completed entries show result + multiplier, colour-coded (green if >1x, red if <1x)
- Progress bar shows % of entries completed

**Completed state:**
- When hunt is completed, header shows "COMPLETED" instead of "LIVE"
- Final summary displayed prominently
- Page stays accessible forever as a record

#### OBS Overlay Page (`/hunt/[id]/overlay`)

Minimal, clean layout designed to be captured as a browser source in OBS.

```
┌──────────────────────────────────────────────────┐
│  Now Playing: Mental (NoLimit City)    $500 buy  │
│  ───────────────────────────────────────────────  │
│  Total: $12,500  │  Won: $8,750  │  P/L: -$3,750 │
│  Progress: 12/40 bonuses  │  Avg: 2.3x           │
└──────────────────────────────────────────────────┘
```

**Key requirements:**
- `background: transparent` — OBS picks this up with browser source
- Configurable via query params:
  - `?theme=dark` or `?theme=light` — text colour
  - `?compact=true` — single line mode
  - `?showProgress=true` — show progress bar
  - `?fontSize=24` — custom font size
- Smooth CSS transitions on data changes (no jarring jumps)
- Auto-updates via Pusher (same channel as viewer page)
- Minimal DOM — no scrolling, no overflow, fixed size

#### Billing Page (`/billing`)

```
1. Shows current plan info:
   - Tier: "Basic" / "Pro" / "Free"
   - Status: "Active" / "Trialing (5 days left)" / "Canceled"
   - Next billing date (if active)
2. If free tier → pricing cards with upgrade CTAs
   - Click "Upgrade to Basic" → POST /api/billing/checkout → Stripe Checkout redirect
3. If paid tier → "Manage Subscription" button
   - Click → POST /api/billing/portal → Stripe Customer Portal redirect
   - Customer Portal handles: change plan, update payment, cancel, view invoices
```

#### Stats Page (`/stats`)

```
Overview cards:
  - Total hunts completed
  - Total money spent / won / profit
  - Average multiplier across all hunts
  - Best single win (game name + amount)
  - Most profitable game

Per-game breakdown table:
  - Game name | Times played | Total spent | Total won | Avg multiplier | Best win
  - Sortable by any column
  - Searchable

Charts (future enhancement):
  - Profit/loss trend over time
  - Multiplier distribution histogram
```

Stats are computed from `GameStat` records, which are updated whenever a hunt entry result is recorded.

### Project File Structure

```
bonus-hunt-tracker/
├── app/
│   ├── layout.tsx                    — Root layout (providers, nav, footer)
│   ├── page.tsx                      — Home/landing page
│   ├── login/
│   │   └── page.tsx                  — Auth page
│   ├── onboarding/
│   │   └── page.tsx                  — First-time user wizard
│   ├── dashboard/
│   │   └── page.tsx                  — Streamer dashboard
│   ├── hunt/
│   │   ├── new/
│   │   │   └── page.tsx              — Create new hunt
│   │   └── [id]/
│   │       ├── page.tsx              — Hunt control panel
│   │       ├── live/
│   │       │   └── page.tsx          — Public viewer page (no auth)
│   │       └── overlay/
│   │           └── page.tsx          — OBS overlay (no auth)
│   ├── presets/
│   │   └── page.tsx                  — Manage preset game lists
│   ├── stats/
│   │   └── page.tsx                  — Personal statistics
│   ├── billing/
│   │   └── page.tsx                  — Subscription management
│   ├── settings/
│   │   └── page.tsx                  — Account settings
│   ├── editor/
│   │   ├── page.tsx                  — List overlay projects + create new
│   │   └── [projectId]/
│   │       ├── page.tsx              — Visual canvas editor
│   │       ├── commands/
│   │       │   └── page.tsx          — Chat command configuration
│   │       └── mods/
│   │           └── page.tsx          — Mod access management
│   ├── o/
│   │   └── [slug]/
│   │       └── page.tsx              — Master OBS overlay URL (public, no auth)
│   ├── mod/
│   │   └── [token]/
│   │       └── page.tsx              — Mod dashboard (token-based auth)
│   ├── h/
│   │   └── [shareSlug]/
│   │       └── page.tsx              — Public hunt share page (enhanced with OG + share toolbar)
│   ├── embed/
│   │   └── [shareSlug]/
│   │       └── page.tsx              — Embeddable compact hunt summary (iframe)
│   ├── admin/
│   │   ├── scraper/
│   │   │   ├── page.tsx              — Scraper dashboard
│   │   │   └── logs/
│   │   │       └── page.tsx          — Scrape history
│   │   ├── games/
│   │   │   ├── page.tsx              — Game browser/editor
│   │   │   └── [slug]/
│   │   │       └── page.tsx          — Edit individual game
│   │   └── users/
│   │       └── page.tsx              — User management
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts          — NextAuth handler
│       ├── hunts/
│       │   ├── route.ts              — List/create hunts
│       │   └── [id]/
│       │       ├── route.ts          — Get/update/delete hunt
│       │       ├── public/
│       │       │   └── route.ts      — Public hunt data (no auth)
│       │       ├── entries/
│       │       │   ├── route.ts      — Add entry
│       │       │   └── [eid]/
│       │       │       └── route.ts  — Update/delete entry
│       │       └── reorder/
│       │           └── route.ts      — Reorder entries
│       ├── presets/
│       │   ├── route.ts              — List/create presets
│       │   └── [id]/
│       │       └── route.ts          — Update/delete preset
│       ├── stats/
│       │   ├── route.ts              — Aggregated stats
│       │   └── games/
│       │       └── route.ts          — Per-game stats
│       ├── games/
│       │   ├── search/
│       │   │   └── route.ts          — Game autocomplete search
│       │   ├── popular/
│       │   │   └── route.ts          — Most-used games
│       │   └── [slug]/
│       │       └── route.ts          — Single game details
│       ├── billing/
│       │   ├── checkout/
│       │   │   └── route.ts          — Create Stripe checkout
│       │   ├── portal/
│       │   │   └── route.ts          — Create Stripe portal session
│       │   └── webhook/
│       │       └── route.ts          — Stripe webhook handler
│       ├── admin/
│       │   ├── scrape/
│       │   │   ├── trigger/
│       │   │   │   └── route.ts      — Manual scrape trigger
│       │   │   └── logs/
│       │   │       └── route.ts      — Scrape history
│       │   └── seed/
│       │       └── route.ts          — One-time Wagerrace seed
│       ├── overlays/
│       │   ├── route.ts              — List/create overlay projects
│       │   └── [id]/
│       │       ├── route.ts          — Get/update/delete project
│       │       ├── switch-scene/
│       │       │   └── route.ts      — Switch active scene
│       │       ├── public/
│       │       │   └── route.ts      — Public overlay data (no auth)
│       │       ├── scenes/
│       │       │   ├── route.ts      — Create scene
│       │       │   ├── reorder/
│       │       │   │   └── route.ts  — Reorder scenes
│       │       │   └── [sid]/
│       │       │       ├── route.ts  — Update/delete scene
│       │       │       └── widgets/
│       │       │           ├── route.ts      — Add widget
│       │       │           ├── reorder/
│       │       │           │   └── route.ts  — Update z-index
│       │       │           └── [wid]/
│       │       │               └── route.ts  — Update/delete widget
│       │       ├── commands/
│       │       │   ├── route.ts      — Create chat command
│       │       │   └── [cid]/
│       │       │       └── route.ts  — Update/delete command
│       │       └── mod-tokens/
│       │           ├── route.ts      — Generate mod token
│       │           └── [tid]/
│       │               └── route.ts  — Revoke token
│       ├── mod/
│       │   └── [token]/
│       │       ├── route.ts          — Get mod dashboard data
│       │       ├── switch-scene/
│       │       │   └── route.ts      — Mod switches scene
│       │       └── update-hunt/
│       │           └── route.ts      — Mod updates hunt entry
│       ├── kick/
│       │   ├── auth/
│       │   │   └── route.ts          — Kick OAuth flow
│       │   ├── callback/
│       │   │   └── route.ts          — Kick OAuth callback
│       │   └── webhook/
│       │       └── route.ts          — Kick chat webhook
│       ├── og/
│       │   └── hunt/
│       │       └── [shareSlug]/
│       │           └── route.ts      — Dynamic OG image generation
│       ├── embed/
│       │   └── [shareSlug]/
│       │       └── route.ts          — Embed data endpoint (JSON)
│       ├── share/
│       │   └── discord/
│       │       └── route.ts          — Post hunt summary to Discord webhook
│       └── cron/
│           └── scrape/
│               └── route.ts          — Cron scrape endpoint
├── components/
│   ├── ui/                           — Reusable UI primitives (buttons, cards, inputs, modals)
│   ├── layout/
│   │   ├── Navbar.tsx                — Top navigation bar
│   │   ├── Sidebar.tsx               — Dashboard sidebar nav
│   │   └── Footer.tsx                — Site footer
│   ├── hunt/
│   │   ├── GameSearchBar.tsx         — Autocomplete game search
│   │   ├── HuntEntryRow.tsx          — Single entry in the hunt table
│   │   ├── HuntEntryList.tsx         — Draggable list of entries
│   │   ├── RunningTotals.tsx         — Cost/won/profit/avg bar
│   │   ├── RecordResultModal.tsx     — Modal for entering win amount
│   │   ├── QuickAddModal.tsx         — Modal for adding unlisted game
│   │   └── ShareUrlBar.tsx           — Share URL display + copy button
│   ├── viewer/
│   │   ├── ViewerGrid.tsx            — Public viewer entry grid
│   │   ├── ViewerHeader.tsx          — Hunt title, streamer, live badge
│   │   └── ViewerTotals.tsx          — Running totals for viewer
│   ├── overlay/
│   │   └── OverlayDisplay.tsx        — Simple OBS overlay component (legacy, per-hunt)
│   ├── editor/
│   │   ├── Canvas.tsx                — Main editor canvas (1920x1080 viewport)
│   │   ├── ScenePanel.tsx            — Scene list sidebar
│   │   ├── WidgetToolbox.tsx         — Draggable widget type list
│   │   ├── PropertiesPanel.tsx       — Selected widget properties editor
│   │   ├── WidgetRenderer.tsx        — Renders a widget by type on canvas
│   │   ├── DraggableWidget.tsx       — Wrapper for drag/resize on canvas
│   │   ├── EditorToolbar.tsx         — Save, Preview, Copy URL toolbar
│   │   └── widgets/                  — Individual widget renderers
│   │       ├── HuntTableWidget.tsx
│   │       ├── CurrentGameWidget.tsx
│   │       ├── BiggestWinWidget.tsx
│   │       ├── RunningTotalsWidget.tsx
│   │       ├── ProgressBarWidget.tsx
│   │       ├── NextUpWidget.tsx
│   │       ├── RecentResultsWidget.tsx
│   │       ├── ViewerCountWidget.tsx
│   │       ├── CustomTextWidget.tsx
│   │       ├── ImageWidget.tsx
│   │       ├── TimerWidget.tsx
│   │       ├── GameImageWidget.tsx
│   │       └── LeaderboardWidget.tsx
│   ├── overlay-renderer/
│   │   ├── SceneRenderer.tsx         — Renders a full scene (all widgets at positions)
│   │   ├── SceneTransition.tsx       — Handles fade/slide/cut between scenes
│   │   └── OverlayShell.tsx          — Top-level shell for /o/[slug] (Pusher, scene switching)
│   ├── mod/
│   │   ├── SceneButtons.tsx          — Scene switching buttons for mod dashboard
│   │   ├── HuntControls.tsx          — Record result, next game, pause
│   │   └── ModLayout.tsx             — Mod dashboard layout
│   ├── sharing/
│   │   ├── ShareToolbar.tsx          — Copy link, Share on X, Discord, Embed, Download
│   │   ├── EmbedCodeModal.tsx        — Shows iframe embed code
│   │   └── EmbedCard.tsx             — Compact embed widget for /embed/[shareSlug]
│   ├── dashboard/
│   │   ├── StatsCards.tsx            — Overview stat cards
│   │   ├── RecentHunts.tsx           — Recent hunt list
│   │   └── SubscriptionBadge.tsx     — Current tier display
│   ├── billing/
│   │   ├── PricingCards.tsx          — Free/Basic/Pro comparison
│   │   └── UpgradePrompt.tsx         — Inline upgrade CTA for locked features
│   └── auth/
│       ├── SignInButtons.tsx         — Google + Discord sign-in buttons
│       └── AuthGuard.tsx             — Wrapper that redirects if not signed in
├── lib/
│   ├── auth.ts                       — NextAuth config (providers, callbacks, JWT)
│   ├── prisma.ts                     — Prisma client singleton
│   ├── pusher.ts                     — Pusher server client
│   ├── pusher-client.ts              — Pusher browser client
│   ├── stripe.ts                     — Stripe client + helpers
│   ├── features.ts                   — checkFeature() + tier definitions
│   ├── kick.ts                       — Kick API client (chat bot, OAuth)
│   ├── discord-webhook.ts            — Discord webhook posting helper
│   ├── overlay/
│   │   ├── widget-registry.ts        — Widget type definitions + default configs
│   │   └── scene-manager.ts          — Scene switching + Pusher event helpers
│   ├── scraper/
│   │   ├── index.ts                  — Main scrape orchestrator (discover → scrape → upsert → log)
│   │   ├── discover.ts               — Fetch BWB listing pages, extract new game URLs
│   │   ├── parse-review.ts           — Parse a BWB review page with Cheerio
│   │   ├── proxy.ts                  — Proxy agent setup + rotation
│   │   ├── headers.ts                — User-Agent pool + realistic request headers
│   │   ├── delay.ts                  — Random delay + exponential backoff helpers
│   │   └── seed.ts                   — One-time seed from Wagerrace API
│   └── utils/
│       ├── slugify.ts                — Generate URL-safe slugs
│       ├── format.ts                 — Currency/number formatting
│       └── share-slug.ts             — Generate short share slugs for hunts
├── hooks/
│   ├── useCanAccess.ts               — Feature gating hook
│   ├── usePusher.ts                  — Pusher subscription hook
│   ├── useGameSearch.ts              — Debounced game search hook
│   ├── useHuntUpdates.ts             — Real-time hunt update hook
│   ├── useSceneSwitch.ts             — Listen for scene-switch Pusher events
│   ├── useOverlayData.ts             — Fetch + subscribe to overlay project data
│   └── useWidgetDrag.ts              — Drag/resize logic for editor canvas
├── prisma/
│   ├── schema.prisma                 — Database schema
│   └── seed.ts                       — Dev seed data
├── middleware.ts                      — Auth protection for /dashboard, /hunt, /admin routes
├── vercel.json                        — Cron config
├── .env.local                         — Local environment variables
├── tailwind.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...@...neon.tech/bonushunt?sslmode=require

# NextAuth
NEXTAUTH_URL=https://sucksmedia.com/bonushunt    # basePath-aware
NEXTAUTH_SECRET=...                         # openssl rand -base64 32

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASIC_PRICE_ID=price_...             # Monthly Basic plan price
STRIPE_PRO_PRICE_ID=price_...               # Monthly Pro plan price

# Pusher
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=eu                            # or us2, ap1, etc.
NEXT_PUBLIC_PUSHER_KEY=...                   # Same as PUSHER_KEY, exposed to client
NEXT_PUBLIC_PUSHER_CLUSTER=eu

# Scraper
PROXY_URL=http://user:pass@proxy.provider.com:port
PROXY_ENABLED=true
SCRAPE_DELAY_MIN=3000
SCRAPE_DELAY_MAX=8000
SCRAPE_MAX_NEW_GAMES=50
BWB_BASE_URL=https://www.bigwinboard.com

# Cron
CRON_SECRET=...                              # Vercel Cron authorization secret

# Wagerrace (for initial seed only)
WAGERRACE_API_URL=https://www.johnessyslots.com/api/public/games

# App
NEXT_PUBLIC_APP_URL=https://sucksmedia.com/bonushunt
NEXT_PUBLIC_BASE_PATH=/bonushunt                    # Next.js basePath config

# Kick (chat bot)
KICK_CLIENT_ID=...
KICK_CLIENT_SECRET=...
KICK_WEBHOOK_SECRET=...                 # Secret for verifying Kick webhook signatures

# Discord (webhook sharing)
# Per-user setting — configured in /settings, stored on User model
# No global env var needed
```

---

## Part 3: BigWinBoard Scraper

### How BigWinBoard Is Structured

BigWinBoard is a WordPress site with game review pages at predictable URLs:
- **Listing pages:** `/bonus-buy-slots/`, plus category/mechanic pages — each shows game cards with a "Load more" AJAX button
- **Review pages:** `/{game-name}-{provider}-slot-review/` — full game detail pages
- **Search API:** `/wp-json/bwb/v1/search?term=...` — instant search endpoint

### Data Available Per Game (from review pages)

| Field | Example | Availability |
|-------|---------|-------------|
| Game name | Gates of Olympus | Always |
| Provider | Pragmatic Play | Always |
| RTP | 96.50% (multiple variants) | Usually |
| Volatility | High (5/5) | Usually |
| Max win | 5,000x | Usually |
| Grid layout | 6x5 | Usually |
| Bet range | 0.20 – 100 | Usually |
| Release date | February 25, 2021 | Usually |
| Features | Bonus buy, cascades, multipliers | Usually |
| BWB score | 9/10 | Always |
| Image | Thumbnail/featured image URL | Always |

### Scraper Architecture

```
Every 12 hours (Vercel Cron → POST /api/cron/scrape):

1. DISCOVER — Hit BigWinBoard listing pages to find new games
   ├── Fetch /bonus-buy-slots/ (and "Load more" pages)
   ├── Fetch latest releases / new demo slots pages
   ├── Parse game cards: extract game name, provider, review URL
   └── Compare against existing Game slugs in DB → identify NEW games

2. SCRAPE — For each new game, fetch the full review page
   ├── GET /{game-name}-{provider}-slot-review/
   ├── Parse with Cheerio: extract RTP, volatility, max win, bet range,
   │   release date, grid layout, features, image URL, BWB score
   └── Build a Game record

3. UPSERT — Write to database
   ├── New games → INSERT into Game table (source: "bigwinboard")
   ├── Existing games with stale data → UPDATE (e.g. BWB score changed)
   └── Log results to ScrapeLog table

4. LOG — Record scrape results
   └── ScrapeLog { gamesFound, gamesAdded, gamesUpdated, errors, durationMs }
```

### Anti-Ban Strategy

The scraper must be respectful and stealthy to avoid getting blocked:

| Measure | Implementation |
|---------|---------------|
| **Rotating residential proxies** | Use a proxy provider (Bright Data, Oxylabs, or Webshare). Rotate IP on every request. Configure via `PROXY_URL` env var. |
| **Random delays** | Wait 3–8 seconds between requests (randomized). Never burst. |
| **Randomized User-Agent** | Rotate through a pool of 20+ real browser User-Agent strings per request. |
| **Request headers** | Include realistic `Accept`, `Accept-Language`, `Referer` headers to look like a real browser. |
| **Gentle schedule** | 12-hour interval is very light. Each run only scrapes NEW games (typically 0–5 new review pages per run, not the whole catalog). |
| **Respect robots.txt** | Check robots.txt on first run, obey disallowed paths. |
| **Exponential backoff** | If a request fails (429/503), back off exponentially. If 3+ consecutive failures, abort the run and log the error. |
| **Circuit breaker** | If 3 consecutive scrape runs fail entirely, disable auto-scraping and alert via ScrapeLog status. Requires manual re-enable. |

### Scraper Tech Stack

```
cheerio          — Fast HTML parsing (no headless browser needed, BWB is server-rendered)
node-fetch       — HTTP requests with proxy support
https-proxy-agent — Route requests through rotating proxy
user-agents      — Realistic User-Agent string rotation
```

### Scraper Config (Environment Variables)

```env
# Proxy
PROXY_URL=http://user:pass@proxy.provider.com:port    # Rotating residential proxy endpoint
PROXY_ENABLED=true                                      # Toggle proxy on/off for dev

# Scraper
SCRAPE_DELAY_MIN=3000                                   # Min delay between requests (ms)
SCRAPE_DELAY_MAX=8000                                   # Max delay between requests (ms)
SCRAPE_MAX_NEW_GAMES=50                                 # Safety cap per run
BWB_BASE_URL=https://www.bigwinboard.com

# Cron security
CRON_SECRET=...                                         # Vercel Cron secret to secure the endpoint
```

### Vercel Cron Configuration

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/scrape",
      "schedule": "0 */12 * * *"
    }
  ]
}
```

**Note:** Vercel Cron has a 60-second timeout on Hobby plan, 300 seconds on Pro. If a scrape run exceeds this (many new games at once), it should process in batches — scrape up to N games per invocation, and the next cron run picks up the rest.

### Admin Pages

```
/admin/scraper              — Scraper dashboard (last run status, games added, errors)
/admin/scraper/logs         — Full scrape history table
/admin/games                — Browse/search/edit the local Game table
/admin/games/[slug]         — Edit individual game details (manual corrections)
```

These admin pages are protected — only accessible to users with an `isAdmin` flag on their User record.

---

## Part 4: Stream Overlay Editor

### Concept

The overlay editor lets streamers build their entire stream layout visually — drag widgets onto a canvas, create multiple scenes, and control everything through one OBS browser source URL. Mods can switch scenes via Kick chat commands or a dedicated mod dashboard.

**One URL to rule them all:**
```
sucksmedia.com/bonushunt/o/johnessy-stream
```
This single URL goes into OBS as a browser source. It renders the currently active scene with all its widgets. When a scene switches (via chat command, mod dashboard, or streamer control), the overlay transitions smoothly — no URL change needed.

### Widget Types

Each widget is a self-contained component that renders on the canvas. Widgets pull live data from the linked hunt and update in real-time via Pusher.

| Widget Type | What It Shows | Key Config Options |
|-------------|---------------|-------------------|
| `hunt-table` | Full bonus hunt entry list (scrollable) | rows visible, show/hide columns, font size, row colours |
| `current-game` | The game currently being played | show image, show provider, font size, layout (horizontal/vertical) |
| `biggest-win` | Best result in the current hunt | show multiplier, show game image, animation on new best |
| `running-totals` | Cost / Won / P&L / Avg multiplier | layout (horizontal/vertical/compact), which stats to show |
| `progress-bar` | Visual progress through the hunt | bar style, colour gradient, show percentage text |
| `next-up` | Next N games in the queue | how many to show, show images |
| `recent-results` | Last N completed entries | how many, show multiplier, flash animation |
| `viewer-count` | Live viewer count (Pusher presence) | icon style, font size |
| `custom-text` | Any static or dynamic text | text content, font, size, colour, alignment, supports variables like `{totalWon}` |
| `image` | Static image (logo, branding, border) | image URL, fit mode (cover/contain/stretch) |
| `timer` | Stopwatch / countdown | start time, direction (up/down), format (HH:MM:SS) |
| `game-image` | Large display of current game's image | border radius, shadow, animation |
| `leaderboard` | Top games by multiplier in this hunt | how many, sort by (multiplier/win amount) |

**Widget config structure (stored as JSON):**
```json
// Example: hunt-table widget config
{
  "fontFamily": "Inter",
  "fontSize": 14,
  "headerBg": "#1a1a2e",
  "headerText": "#ffffff",
  "rowBg": "#16213e",
  "rowAltBg": "#0f3460",
  "rowText": "#e0e0e0",
  "highlightPlaying": true,
  "playingBorder": "#e94560",
  "showColumns": ["position", "gameImage", "gameName", "provider", "cost", "result", "multiplier"],
  "maxRows": 15,
  "scrollBehavior": "auto",
  "greenThreshold": 1.0,
  "redThreshold": 1.0
}
```

### Visual Canvas Editor (`/editor/[projectId]`)

The editor is the core creative tool. Think Figma/Canva but purpose-built for stream overlays.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ◀ Back to Dashboard    "My Stream Setup"    [Preview] [Save] [Copy OBS URL]│
├────────────┬─────────────────────────────────────────────┬───────────────────┤
│            │                                             │                   │
│  SCENES    │              CANVAS (1920×1080)             │   PROPERTIES      │
│            │                                             │                   │
│  ▶ Opening │   ┌─────────────────┐  ┌──────────────┐    │   Widget: Hunt    │
│    Hunting │   │  hunt-table     │  │ current-game │    │   Table           │
│    Fullscr │   │  ░░░░░░░░░░░░░  │  │  🎰          │    │                   │
│    Results │   │  ░░░░░░░░░░░░░  │  └──────────────┘    │   X: 50  Y: 100   │
│            │   │  ░░░░░░░░░░░░░  │                      │   W: 800  H: 600  │
│  [+ Scene] │   │  ░░░░░░░░░░░░░  │  ┌──────────────┐    │   Font: 14px      │
│            │   └─────────────────┘  │ running-tots │    │   Rows: 15        │
│ ────────── │                        └──────────────┘    │   Columns: [...]   │
│  WIDGETS   │                                             │   Header BG: #1a  │
│            │   ┌─────────────┐                           │   Row BG: #16     │
│  + Table   │   │ biggest-win │                           │   Highlight: ✓    │
│  + Current │   └─────────────┘                           │                   │
│  + Biggest │                                             │   [Delete Widget] │
│  + Totals  │                                             │                   │
│  + Progress│                                             │                   │
│  + Text    │                                             │                   │
│  + Image   │                                             │                   │
│  + Timer   │                                             │                   │
├────────────┴─────────────────────────────────────────────┴───────────────────┤
│  Linked Hunt: "Tuesday Night Hunt" ▼     OBS URL: sucksmedia.com/bonushunt/o/my-s... │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Editor features:**
- **Scene panel (left):** List of scenes, click to switch, drag to reorder, + to add
- **Widget toolbox (left):** Click or drag a widget type onto the canvas
- **Canvas (center):** 1920x1080 viewport (scaled to fit screen), widgets are draggable/resizable
- **Properties panel (right):** Appears when a widget is selected, shows all config options
- **Toolbar (top):** Preview, Save, Copy OBS URL
- **Hunt link (bottom):** Select which hunt provides data to the widgets

**Canvas interactions:**
- Click widget to select → shows resize handles + properties panel
- Drag to move, handles to resize
- Right-click → context menu (duplicate, delete, lock, send to front/back)
- Ctrl+Z / Ctrl+Y for undo/redo
- Multi-select with shift+click or drag-select
- Snap-to-grid (toggleable)
- Zoom in/out on canvas

**Tech for the editor:**
- Canvas rendering with React + absolute positioning (not HTML canvas — we need DOM widgets for real content)
- `react-dnd` or custom drag implementation for widget placement
- `react-resizable` for resize handles
- Changes auto-save (debounced PATCH to API) or explicit Save button
- Preview opens the `/o/[slug]` URL in a new tab

### Scene System

**Creating scenes:**
1. Click "+ Scene" in the editor
2. Name it (e.g., "Hunting") — auto-generates slug (`hunting`)
3. Set canvas size (default 1920x1080), background, transition type
4. Add widgets to the scene
5. Each scene has completely independent widget layouts

**Scene transitions:**
When the active scene changes, the overlay URL transitions between them:
- `fade` — crossfade (default, 500ms)
- `slide` — slide left/right
- `cut` — instant switch
- `none` — instant, no animation

**Typical scene setup for a slot streamer:**
| Scene | Slug | What's On It | When Used |
|-------|------|-------------|-----------|
| Opening Hunt | `opening` | Hunt table (full), running totals, timer | Starting the hunt, showing all bonuses |
| Hunting | `hunting` | Current game (large), next up, running totals, progress bar | Playing through bonuses |
| Full Screen | `fullscreen` | Minimal — just running totals bar at bottom | Gameplay fills the screen |
| Big Win | `bigwin` | Biggest win widget (large, animated), current game | After a big hit |
| Results | `results` | Hunt table (completed), final totals, leaderboard | Hunt finished, reviewing |
| Gambling | `gambling` | Custom text, image/logo, timer | Regular gambling (no hunt) |

### Chat Bot Integration (Kick)

Mods type commands in Kick chat to switch scenes. The overlay updates in real-time. We will use Kick's API and chat system for this — exact implementation details to be determined during build based on Kick's available API at that time.

**Architecture:**
```
Mod types "!hunting" in Kick chat
  → Kick sends chat event to our webhook/bot
  → Server validates: is this channel linked to an overlay project?
  → Server checks: is "!hunting" a configured command? Is the user a mod/broadcaster?
  → Server matches command → finds target scene
  → Server updates OverlayProject.activeSceneId in DB
  → Server fires Pusher event: channel="overlay-{projectId}", event="scene-switch"
  → OBS browser source at /o/[slug] receives event → transitions to new scene
```

**Kick setup:**
1. Streamer connects their Kick account via OAuth (`/api/kick/auth`)
2. We subscribe to chat events for their channel
3. Kick sends chat messages to our webhook endpoint
4. We filter for messages starting with `!` from authorized roles (mod/broadcaster)
5. Match against configured `ChatCommand` records
6. Commands have a cooldown (default 5s) to prevent spam

**Environment variables:**
```env
KICK_CLIENT_ID=...
KICK_CLIENT_SECRET=...
KICK_WEBHOOK_SECRET=...               # secret for verifying Kick webhook signatures
```

### Mod Dashboard (`/mod/[token]`)

A lightweight control panel that mods can access without creating an account. The streamer generates a mod token URL and shares it with their mod team.

```
┌──────────────────────────────────────────────────────────────────┐
│  🎮 Mod Dashboard — JohnEssy's Stream                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SCENE CONTROL                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Opening  │ │▶Hunting  │ │FullScreen│ │ Results  │           │
│  │          │ │ (ACTIVE) │ │          │ │          │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                  │
│  HUNT CONTROL (if permitted)                                     │
│  Current Hunt: "Tuesday Night Hunt"                              │
│  Status: LIVE  │  Progress: 12/40  │  P/L: -$3,750              │
│                                                                  │
│  Currently Playing: Mental (NoLimit City) — $500 buy             │
│  [Record Result: $_______ ] [Submit]                             │
│                                                                  │
│  [Next Game ▶]  [Pause Hunt ⏸]                                  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Chat commands: !opening !hunting !fullscreen !results           │
└──────────────────────────────────────────────────────────────────┘
```

**Mod token flow:**
1. Streamer goes to `/editor/[projectId]/mods`
2. Clicks "Generate Mod Link" → creates `ModToken` with random token
3. Sets permissions: `switch_scene`, `update_hunt` (checkboxes)
4. Copies the link: `sucksmedia.com/bonushunt/mod/abc123xyz`
5. Shares with mods via Discord/DM
6. Mod opens the link — no sign-in needed, token authenticates them
7. Streamer can revoke tokens at any time

**Mod permissions:**
| Permission | What It Allows |
|------------|---------------|
| `switch_scene` | Click scene buttons to switch the overlay |
| `update_hunt` | Record results, advance to next game, pause/resume hunt |
| `view_only` | See the dashboard but can't change anything |

### Pusher Channels for Overlay

```
overlay-{projectId}     — Scene switches, widget config updates
hunt-{huntId}           — Hunt data updates (existing channel, shared with viewer page)
```

**Events:**
| Channel | Event | Payload | Trigger |
|---------|-------|---------|---------|
| `overlay-{id}` | `scene-switch` | `{ sceneId, transition }` | Chat command, mod dashboard, or editor |
| `overlay-{id}` | `widget-update` | `{ widgetId, config }` | Editor saves widget config |
| `overlay-{id}` | `hunt-linked` | `{ huntId }` | Streamer links a different hunt |
| `hunt-{id}` | `entry-updated` | `{ entry }` | Result recorded (reused from Part 2) |
| `hunt-{id}` | `hunt-status-changed` | `{ status }` | Hunt goes live/completes (reused) |

### How the OBS URL Works (`/o/[slug]`)

This is a React page that:
1. Loads the overlay project by slug (public endpoint, no auth)
2. Fetches the active scene + all its widgets
3. Fetches linked hunt data (if any)
4. Subscribes to Pusher channels: `overlay-{projectId}` + `hunt-{huntId}`
5. Renders all widgets at their configured positions
6. On `scene-switch` event: transitions to the new scene with configured animation
7. On `entry-updated` event: widgets that show hunt data update in real-time

**Key requirements:**
- Background is transparent by default (OBS browser source)
- Page never navigates — all updates are in-place via Pusher
- No scrollbars, no overflow — everything fits the configured canvas size
- CSS transitions on all widget data changes
- Preloads all scenes in the DOM (hidden) for instant transitions
- URL never changes — OBS only needs to set this once

### Overlay Feature Gating

| Feature | Free | Basic | Pro |
|---------|------|-------|-----|
| Overlay projects | 0 | 1 | Unlimited |
| Scenes per project | — | 2 | Unlimited |
| Widgets per scene | — | 5 | Unlimited |
| Chat bot commands | — | No | Yes |
| Mod dashboard | — | No | Yes |
| Custom widget styling | — | Basic | Full |
| Scene transitions | — | Fade only | All types |

---

## Part 5: Sharing & Embeds

### Concept

After a hunt is completed, the streamer should be able to share it everywhere — social media, Discord, websites — with rich previews and easy embedding. Viewers can revisit any past hunt.

### Share URLs

Every hunt gets a clean, short shareable URL:
```
sucksmedia.com/bonushunt/h/[shareSlug]
```

Example: `sucksmedia.com/bonushunt/h/tuesday-night-feb25`

This URL serves double duty:
- **During hunt:** Shows the live viewer page with real-time updates
- **After hunt:** Shows the completed results as a permanent record

### Social Media Sharing (Open Graph / Twitter Cards)

When someone pastes a hunt URL into Discord, Twitter/X, or any social platform, it should show a rich preview card.

**Open Graph meta tags on `/h/[shareSlug]`:**
```html
<meta property="og:title" content="Tuesday Night Hunt by JohnEssy" />
<meta property="og:description" content="40 bonuses | $12,500 spent | $18,750 won | +$6,250 profit | Best: Gates of Olympus 87.5x" />
<meta property="og:image" content="https://sucksmedia.com/bonushunt/api/og/hunt/[shareSlug]" />
<meta property="og:url" content="https://sucksmedia.com/bonushunt/h/tuesday-night-feb25" />
<meta property="og:type" content="website" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Tuesday Night Hunt by JohnEssy" />
<meta name="twitter:description" content="40 bonuses | +$6,250 profit | Best: 87.5x on Gates of Olympus" />
<meta name="twitter:image" content="https://sucksmedia.com/bonushunt/api/og/hunt/[shareSlug]" />
```

### Dynamic OG Image Generation (`/api/og/hunt/[shareSlug]`)

Auto-generated summary image using **Vercel OG (@vercel/og)** — renders a React component as a PNG on the fly.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  🏆 Tuesday Night Hunt                                       │
│  by JohnEssy                                                 │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  40          │  │  $12,500    │  │  $18,750    │          │
│  │  Bonuses     │  │  Total Cost │  │  Total Won  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐                            │
│  │  +$6,250    │  │  87.5x      │                            │
│  │  PROFIT ✅   │  │  Best Multi │                            │
│  └─────────────┘  └─────────────┘                            │
│                                                              │
│  Best Game: Gates of Olympus (Pragmatic Play)                │
│                                                              │
│  sucksmedia.com/bonushunt                                              │
└──────────────────────────────────────────────────────────────┘
```

**Cached:** The OG image is generated once when the hunt is completed and cached via `Cache-Control: public, s-maxage=86400, immutable`. Regenerated if hunt data changes.

### Embed Widget (iframe)

Streamers can embed a compact hunt summary on any website (their own site, blog, etc.) using a simple iframe or embed code.

**Embed URL:**
```
sucksmedia.com/bonushunt/embed/[shareSlug]
```

**Embed code (copy-paste):**
```html
<iframe
  src="https://sucksmedia.com/bonushunt/embed/tuesday-night-feb25"
  width="600"
  height="400"
  frameborder="0"
  style="border-radius: 12px; border: 1px solid #333;"
></iframe>
```

**Embed page features:**
- Compact summary card layout (not the full viewer page)
- Shows: hunt title, streamer, total cost, total won, profit/loss, best game, top 5 entries
- Responsive — adapts to iframe size
- Light and dark theme via query param: `?theme=dark`
- "View Full Hunt →" link opens the full `/h/[shareSlug]` page
- During live hunts: shows live data with "🔴 LIVE" badge
- Minimal JS — loads fast, no heavy dependencies

**Embed page layout:**
```
┌─────────────────────────────────────────────────┐
│  Tuesday Night Hunt             🔴 LIVE          │
│  by JohnEssy                                     │
├─────────────────────────────────────────────────┤
│  Cost: $12,500  │  Won: $18,750  │  P/L: +$6,250 │
├─────────────────────────────────────────────────┤
│  🏆 Best: Gates of Olympus — 87.5x ($17,500)    │
├─────────────────────────────────────────────────┤
│  #1 Gates of Olympus    $200  →  $17,500  87.5x │
│  #2 Sweet Bonanza       $100  →  $450     4.5x  │
│  #3 Mental              $500  →  $375     0.8x  │
│  #4 Wanted Dead         $400  →  $200     0.5x  │
│  #5 Book of Dead        $100  →  $225     2.3x  │
│                          ... 35 more entries     │
├─────────────────────────────────────────────────┤
│  View Full Hunt →           Powered by SucksHunts│
└─────────────────────────────────────────────────┘
```

### Discord Bot Integration (Future)

Optional Discord bot that can:
- Post hunt summaries to a Discord channel when a hunt completes
- Share a rich embed (using Discord's embed format) with stats + link
- Triggered via webhook: streamer configures a Discord webhook URL in settings
- On hunt completion → POST to Discord webhook with formatted embed

**Discord webhook payload:**
```json
{
  "embeds": [{
    "title": "🏆 Tuesday Night Hunt — Complete!",
    "description": "40 bonuses played",
    "url": "https://sucksmedia.com/bonushunt/h/tuesday-night-feb25",
    "color": 5025616,
    "fields": [
      { "name": "Total Cost", "value": "$12,500", "inline": true },
      { "name": "Total Won", "value": "$18,750", "inline": true },
      { "name": "Profit", "value": "+$6,250 ✅", "inline": true },
      { "name": "Best Game", "value": "Gates of Olympus — 87.5x", "inline": false }
    ],
    "image": { "url": "https://sucksmedia.com/bonushunt/api/og/hunt/tuesday-night-feb25" },
    "footer": { "text": "Powered by SucksHunts" }
  }]
}
```

**Settings for Discord sharing:**
- Discord webhook URL (configured in `/settings`)
- Toggle auto-post on hunt completion
- Configurable channel message template

### Share Button UI

On the completed hunt page (`/h/[shareSlug]`), a share toolbar:

```
[📋 Copy Link] [🐦 Share on X] [📱 Share on Discord] [</> Embed Code] [📥 Download Image]
```

- **Copy Link:** Copies the hunt URL to clipboard
- **Share on X:** Opens Twitter intent with pre-filled text + URL
- **Share on Discord:** If webhook configured, posts to channel. Otherwise copies formatted text.
- **Embed Code:** Modal showing the iframe code, click to copy
- **Download Image:** Downloads the OG image as PNG (for manual sharing)

### API Routes for Sharing

```
GET    /api/og/hunt/[shareSlug]         — Dynamic OG image generation (Vercel OG)
GET    /api/embed/[shareSlug]           — Embed data endpoint (JSON for the embed widget)
POST   /api/share/discord               — Post hunt summary to Discord webhook
```

### New Pages

```
/h/[shareSlug]              — Already exists (viewer page), enhanced with OG tags + share toolbar
/embed/[shareSlug]          — Embeddable compact hunt summary (for iframes)
```

---

These admin pages are protected — only accessible to users with an `isAdmin` flag on their User record.

---

## Build Order

### Phase 1: Foundation (in Wagerrace — this project)
1. Create `/api/public/games` endpoint with CORS + caching (for initial seed)

### Phase 2: New Project Setup
1. Create new Next.js 15 project
2. Set up Prisma + Neon PostgreSQL
3. Configure `Game`, `ScrapeLog`, `User`, `Hunt`, `HuntEntry`, `HuntPreset`, `GameStat` models
4. Set up NextAuth (Google + Discord)
5. Set up Tailwind + base layout
6. Deploy to Vercel with custom domain

### Phase 3: Game Database & Scraper
1. Build the `Game` model and local game search API (`/api/games/search`)
2. Build one-time seed script — pull all 7,700 games from Wagerrace's public API, map fields, bulk insert into local `Game` table
3. Run the seed (once) to populate the database
4. Build BigWinBoard scraper module:
   a. Listing page parser — fetch category pages, extract game cards, detect new games not in DB
   b. Review page parser — fetch individual review URLs, extract full game data with Cheerio
   c. Proxy rotation + randomized User-Agent + realistic headers
   d. Random delays (3–8s between requests) + exponential backoff on errors
   e. Upsert logic — match on slug, insert new games, update stale data
   f. ScrapeLog recording — track every run's results
5. Create `/api/cron/scrape` endpoint secured by `CRON_SECRET`
6. Configure Vercel Cron (`0 */12 * * *`) in `vercel.json`
7. Build admin pages: scraper dashboard, scrape logs, game browser/editor
8. Test: trigger manual scrape, verify new games appear in DB, verify logs

### Phase 4: Core Hunt Tracker (MVP)
1. Create hunt CRUD (create, list, manage)
2. Game search with autocomplete (queries local Game table — instant)
3. Quick-add for unlisted/custom games
4. Hunt entry management (add, reorder, delete)
5. Record results flow
6. Running totals calculation
7. Dashboard with basic stats

### Phase 5: Real-Time & Public Pages
1. Integrate Pusher
2. Public viewer page with live updates
3. OBS overlay page
4. Share URL generation

### Phase 6: Presets & Stats
1. Preset game lists (save, load, manage)
2. Per-game statistics tracking
3. Detailed stats dashboard
4. Personal bests tracking

### Phase 7: Billing
1. Stripe product/price setup
2. Checkout flow
3. Webhook handling
4. Feature gating by tier
5. Customer portal integration

### Phase 8: Stream Overlay Editor
1. Create `OverlayProject`, `OverlayScene`, `OverlayWidget`, `ChatCommand`, `ModToken` models
2. Build overlay CRUD API routes (projects, scenes, widgets)
3. Build the visual canvas editor page (`/editor/[projectId]`):
   a. Scene panel — create, rename, reorder, delete scenes
   b. Widget toolbox — drag widget types onto canvas
   c. Canvas — drag/resize widgets, snap-to-grid, multi-select
   d. Properties panel — per-widget config editor
   e. Auto-save or explicit save
4. Build all widget renderer components (hunt-table, current-game, biggest-win, etc.)
5. Build the OBS overlay renderer page (`/o/[slug]`):
   a. Loads active scene + widgets
   b. Subscribes to Pusher for scene-switch and hunt-update events
   c. Renders widgets at configured positions
   d. Handles scene transitions (fade/slide/cut)
   e. Transparent background for OBS browser source
6. Test: create overlay project, add scenes + widgets, verify OBS URL renders correctly

### Phase 9: Chat Bot & Mod Dashboard
1. Kick OAuth flow — streamer connects their Kick account
2. Kick chat webhook setup — subscribe to chat events for the streamer's channel
3. Chat command configuration page (`/editor/[projectId]/commands`)
4. Chat command processing — receive message, match command, switch scene, fire Pusher
5. Mod token system — generate/revoke tokens, configure permissions
6. Mod dashboard page (`/mod/[token]`) — scene switching, hunt controls
7. Test: type `!hunting` in Kick chat, verify overlay switches scene in OBS

### Phase 10: Sharing & Embeds
1. Dynamic OG image generation (`/api/og/hunt/[shareSlug]`) using @vercel/og
2. Open Graph + Twitter Card meta tags on `/h/[shareSlug]`
3. Embeddable hunt summary page (`/embed/[shareSlug]`)
4. Share toolbar component (copy link, share on X, Discord, embed code, download image)
5. Discord webhook posting — auto-post hunt summary when hunt completes
6. Discord webhook configuration in `/settings`
7. Test: paste hunt URL into Discord/X, verify rich preview with image + stats

---

## Verification

### Wagerrace (this project):
- `curl https://www.johnessyslots.com/api/public/games?q=gates&limit=5` returns game results with CORS headers
- Response is cached (check `Cache-Control` header)
- Response includes: slug, name, provider, image_url, rtp, volatility, max_win

### Game Database & Scraper:
- Seed script imports 7,700+ games from Wagerrace into local Game table
- `GET /api/games/search?q=gates` returns results from local DB instantly
- Manual scrape trigger discovers new games on BigWinBoard and inserts them
- ScrapeLog records show gamesFound, gamesAdded, gamesUpdated, errors
- Proxy rotation works (requests show different IPs in logs)
- Vercel Cron fires every 12 hours and completes within timeout
- Admin pages show scrape history and allow game editing
- Circuit breaker disables auto-scraping after 3 consecutive failures

### Auth & User Rights:
- Google sign-in creates a new User with tier=free, subscriptionStatus=inactive
- Discord sign-in creates a new User (same flow)
- Returning user sign-in loads existing User, redirects to /dashboard
- First-time user sees onboarding wizard, onboardingDone=false → true on completion
- JWT session contains userId, subscriptionTier, isAdmin
- /dashboard, /hunt/*, /presets, /stats, /billing, /settings all redirect to /login if not signed in
- /admin/* routes return 403 if user.isAdmin=false
- Free tier user can create 3 hunts per month — 4th attempt returns 403 with upgrade prompt
- Free tier user sees "Go Live" button greyed out with "Upgrade to Basic" prompt
- Free tier user sees Presets nav item locked with "Upgrade to Pro" prompt
- Basic tier user can go live, gets public viewer page + real-time
- Pro tier user can access presets, OBS overlay, custom branding, viewer count

### Tracker (new project):
- Streamer can sign up, create a hunt, search & add games, record results
- Public viewer page loads without auth and shows hunt data
- Real-time: open viewer page in one tab, record result in another, viewer updates instantly
- OBS overlay renders correctly with transparent background
- Stripe checkout creates subscription, webhook updates user tier
- Free tier correctly limits hunts per month
- Onboarding flow completes and sets onboardingDone=true
- Home page shows "Go to Dashboard" if signed in, "Get Started Free" if not
- Settings page shows correct plan info
- Account deletion works with confirmation

### Overlay Editor:
- Can create an overlay project with name and slug
- Can add multiple scenes to a project (Opening, Hunting, Full Screen, etc.)
- Can drag widgets onto the canvas and position/resize them
- Widget properties panel updates widget config and saves
- OBS URL (`/o/[slug]`) renders the active scene with all widgets
- OBS URL has transparent background
- Switching active scene (via editor) triggers Pusher event → OBS URL transitions smoothly
- All widget types render correctly with live hunt data
- Widgets update in real-time when hunt entries change
- Scene transitions work (fade, slide, cut)
- Free tier cannot create overlay projects (shows upgrade prompt)
- Basic tier limited to 1 project, 2 scenes, 5 widgets per scene
- Pro tier unlimited

### Chat Bot & Mod Dashboard:
- Streamer can connect Kick account via OAuth
- Kick chat webhook receives chat messages
- Typing `!hunting` in Kick chat (as mod) switches the overlay scene
- Chat commands respect cooldown (no spam)
- Only configured roles (mod/broadcaster) can trigger commands
- Mod token URL works without sign-in
- Mod can switch scenes via dashboard
- Mod can record hunt results (if permitted)
- Streamer can revoke mod tokens
- Invalid/expired tokens show access denied

### Sharing & Embeds:
- Pasting hunt URL into Discord shows rich embed with image, title, stats
- Pasting hunt URL into Twitter/X shows summary_large_image card
- OG image generates correctly with hunt stats (via @vercel/og)
- Embed iframe at `/embed/[shareSlug]` renders compact hunt summary
- Embed is responsive and works in both light and dark themes
- Share toolbar shows on completed hunts with all share options
- Copy link button works
- Discord webhook auto-posts summary when hunt completes (if configured)
- Download image button downloads the OG image as PNG
- All public URLs work at sucksmedia.com/bonushunt base path
