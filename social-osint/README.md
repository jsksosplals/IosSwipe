# Social OSINT

A Russian-language, evidence-first workspace for reviewing public search results and documenting sources. The site does not use YouTube APIs or require API keys.

## Features
- Public keyword search links for Mastodon, Reddit, Bluesky, GitHub, X, and DuckDuckGo.
- Public Mastodon status search on a user-selected instance; availability depends on the instance's search policy and browser CORS support.
- Self-audit search links for your own public username or a project/organization name. These open platform search pages; the app does not automatically confirm account existence or correlate profiles.
- Evidence journal with source URL, publication date, notes, assessment status, add-from-Mastodon flow, JSON export/import, and deletion.
- Journal stored in the current browser's localStorage. It is not a shared database and does not sync across devices.
- No private-account scraping, login bypass, personal location inference, or relationship inference.

## Deployment
The static page is deployed on Vercel. The app does not require API keys. GitHub automatic deployments are not connected yet; until the GitHub integration is linked in Vercel, publish changes with a direct deployment.

## Files
- `index.html`: UI, public-source search links, Mastodon search, and local evidence journal.
- `netlify.toml`: optional static-site settings for Netlify.

## Evidence practice
Treat search results as leads, not proof. Check original context, dates, and independent sources. Export journal backups periodically and keep them secure.
