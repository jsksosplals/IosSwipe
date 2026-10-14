# Social OSINT

A small evidence-first workspace for verifying public claims using public YouTube search and public Mastodon status search.

## Features
- YouTube Data API search via a Netlify Function (API key stays server-side).
- Public Mastodon status search on a user-selected instance; availability depends on that instance's indexing and CORS policy.
- Evidence ledger with source URL, publication date, notes, assessment status, and JSON export.
- No scraping of private accounts, private-person profiling, location inference, or relationship inference.

## Deploy on Netlify
1. Import the GitHub repository `jsksosplals/IosSwipe` into Netlify.
2. In **Site configuration → Build & deploy → Build settings**, set **Base directory** to `social-osint`. The included `netlify.toml` then configures publish directory and functions relative to this folder.
3. In **Environment variables**, add `YOUTUBE_API_KEY` with a YouTube Data API v3 key. Do not put the key in frontend files or commit it to Git.
4. Deploy the site. Confirm that the deploy log shows the `youtube-search` function.
5. Test the YouTube search and the evidence export. Mastodon search may be restricted by the selected server.

## Local preview
The static page can be opened directly for the evidence ledger, but API search needs Netlify Functions and a configured API key. For local function testing, install Netlify CLI and run `netlify dev` from this directory after setting `YOUTUBE_API_KEY` in your local environment.

## Evidence practice
Record direct URLs, preserve publication dates and context, and distinguish what a source directly establishes from interpretation. A search result is a lead, not independent verification. Keep exported evidence files secure and remove unrelated personal data.
