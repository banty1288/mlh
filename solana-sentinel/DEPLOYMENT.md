# Deployment quick guide

## GitHub Pages (static frontend)

1. Push the project to the repository's `main` branch.
2. Open the repository on GitHub → **Settings** → **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then save.
5. Wait for GitHub Pages to publish and open the URL shown on the Pages settings screen.
6. Test wallet scan and Gemini API calls from the deployed URL. Some public RPC providers may impose browser-origin or rate restrictions.

Do not place a Gemini API key in repository code, GitHub Pages settings as frontend source, or a public `.env` file. The current demo lets each user paste their own key into the browser. For a shared production deployment, implement a server-side API proxy.

## Alternative: any static host

The site consists of `index.html`, `src/`, and `favicon.svg`. Upload those files to a static hosting provider. `server.mjs` is only a local preview server; static hosting does not need Node.js.
