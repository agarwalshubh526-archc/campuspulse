# Deploy CampusPulse in five minutes

## Vercel (browser only)
1. Go to [github.com/new](https://github.com/new), name the repository `campuspulse`, select **Public**, then **Create repository**.
2. On the repository page, click **Add file → Upload files**.
3. Drag in every project file—especially `index.html`, `style.css`, `detail.css`, `functional.css`, `app.js`, `favicon.svg`, and `slides.html`—then click **Commit changes**.
4. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, and select the `campuspulse` repository.
5. Keep the detected static settings unchanged and click **Deploy**. Vercel displays the live URL—open it once before submitting.

## Emergency fallback
If Vercel has an issue, open `index.html` directly in Chrome for the live judging demo. For a shareable URL, go to [netlify.com/drop](https://app.netlify.com/drop) and drag the project folder into the page. It publishes the static site immediately.

The site has no build step, server, environment variables, or dependencies. `index.html` is the entry point.
