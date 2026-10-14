# Social OSINT

A small evidence-first workspace for verifying public claims using public YouTube search and public Mastodon status search.

## Features
- YouTube Data API search via a Vercel serverless function; the API key remains server-side.
- Public Mastodon status search on a user-selected instance; availability depends on that instance's indexing and CORS policy.
- Evidence ledger with source URL, publication date, notes, assessment status, and JSON export.
- No scraping of private accounts, private-person profiling, location inference, or relationship inference.

## Deployment
The app is deployed on Vercel from a direct source deployment. To enable automatic deployments on GitHub pushes, connect the GitHub integration in Vercel and link the repository `jsksosplals/IosSwipe` with root directory `social-osint`.

Add the environment variable `YOUTUBE_API_KEY` in Vercel Project Settings → Environment Variables for Production (and Preview if needed). Never place this key in frontend code or commit it to Git.

## Files
- `index.html`: static UI and evidence ledger.
- `api/youtube-search.js`: Vercel serverless API route.
- `netlify/functions/youtube-search.mjs` and `netlify.toml`: optional Netlify-compatible deployment path.

## Evidence practice
Record direct URLs, preserve publication dates and context, and distinguish what a source directly establishes from interpretation. A search result is a lead, not independent verification. Keep exported evidence files secure and remove unrelated personal data.
