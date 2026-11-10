# Stream — AniList-powered anime catalogue

Stream is a full-stack anime catalogue and episode player built with static HTML/CSS/vanilla JavaScript, Express for local development, Vercel Serverless Functions for deployment, and Turso/libSQL for the database. Anime metadata is fetched automatically from AniList; administrators can import titles rather than retyping metadata. Video files are never uploaded or hosted by Stream: an administrator attaches an HTTPS embed URL from Streamtape, Doodstream, Mixdrop, or YouTube.

## Requirements

- Node.js 22.x and npm
- A Turso database for production (local development defaults to `file:./local.db`)
- An AniList account is **not** required; AniList's public GraphQL endpoint needs no API key

## Local setup

1. Copy `.env.example` to `.env`. Set `JWT_SECRET` to a private random value of at least 32 characters. Set a strong `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters).
2. For local work, leave `TURSO_DATABASE_URL=file:./local.db` and `TURSO_AUTH_TOKEN` blank. For a hosted database, use the Turso steps below and set both values.
3. Install packages and create the SQLite schema:

   ```sh
   npm install
   npm run db:push
   ```

   `npm run db:migrate` is also available to apply the checked-in `schema.sql` directly.
4. Create the initial admin account, default settings, and import AniList trending titles:

   ```sh
   npm run db:seed
   ```

   The seed creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`, saves default site settings, imports the top ten AniList trending titles, and creates empty episodes for those titles. It needs network access to `https://graphql.anilist.co`.
5. Run the site:

   ```sh
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The admin login is at [http://localhost:3000/admin](http://localhost:3000/admin). Sign in with the values from `.env`. Use **Anime catalogue → Import from AniList**, or **Dashboard → Import trending top 10**. Add server links from **Episodes & servers** when you have provider embed URLs.

`npm start` runs the same local Express server without nodemon. A local database file is created in the repository root and ignored by Git.

## Create a Turso database

Install the Turso CLI if needed, then authenticate and create a database:

```sh
turso auth login
turso db create anime-db
turso db show anime-db --url
turso db tokens create anime-db
```

Copy the database URL and token into `.env` as `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, then run:

```sh
npm install
npm run db:push
npm run db:seed
npm run dev
```

The admin seed is safe to re-run: it upserts the configured admin and leaves existing settings and catalogue records intact. The seed refreshes the admin password to the current `ADMIN_PASSWORD`, so keep that value in a secure environment file.

## Vercel deployment

1. Push this repository to GitHub and import it into Vercel. The checked-in `vercel.json` deploys `api/` as Node functions and serves `public/` (including the admin dashboard at `public/admin/`) as static files.
2. Create a Turso database and apply the schema locally or from a trusted setup machine using `npm run db:push`. Run `npm run db:seed` once with the production database URL and the intended admin credentials. Do not run the seed on every web request.
3. Add these environment variables to the Vercel project for the Production environment (and Preview if desired):
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET` (random, private, at least 32 characters)
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD` (at least 12 characters; needed only when seeding)
   - `FRONTEND_URL` (optional; current browser requests use same-origin relative URLs)
4. Redeploy. Open `/admin/` on the deployed domain and sign in. Use the admin dashboard to import AniList titles and populate episode embeds.

The site and API are same-origin, so browser requests use relative URLs and the JWT is kept in an HttpOnly, SameSite=Lax cookie. Set `JWT_SECRET` on Vercel before serving login traffic. AniList responses are cached in memory for one hour per warm function instance; cold starts may request the same metadata again. Rate limiting is also process-local and intended as best-effort protection for serverless instances.

## Admin workflow

- **Anime catalogue:** AniList title search is debounced. Select a result to import all catalogue metadata and genres. The auto-create checkbox generates the known episode count (up to 5,000); when AniList has no count, it creates one playable entry for movies and 12 placeholder episodes for other formats. Bulk import offers the AniList trending and popularity lists. Manual entry is available for titles AniList does not contain.
- **Episodes & servers:** select an anime, add/delete episode rows, manage the episode's server list, or apply one or more `{ep}` URL templates across all episodes. Existing server links can be replaced or retained.
- **Comments / Users / Settings:** moderate user comments, manage accounts, and configure public site name, footer, and contact details. Admin secrets and database credentials are never editable from the settings screen.

## API overview

Public endpoints include `/api/anime`, `/api/anime/:slug`, `/api/anime/:slug/episodes`, `/api/search`, `/api/trending`, `/api/latest`, `/api/genres`, `/api/episode/:id/servers`, `/api/watchlist`, and AniList proxy routes under `/api/anilist/`. Admin endpoints under `/api/admin/` require a valid JWT and an active `admin` account. New comments are held for moderator approval. Server URL validation permits HTTPS embeds from the supported provider domains only.

## Operational notes

- The project uses a restrictive same-origin model and does not enable cross-origin API access. Keep the frontend and API on one domain.
- Public episode iframes connect directly to the selected embed provider. Providers may have their own cookies, tracking, and availability limitations.
- AniList cover art/banner URLs are used directly; there is no image upload or Cloudinary integration.
- Configure your own legal contact information and review the included privacy / copyright pages for the jurisdiction and practices of your deployment.
- Back up Turso data and rotate `JWT_SECRET` if it is exposed. Changing the secret invalidates existing sessions.
