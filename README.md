# Javier Cobo — AI Ad Portfolio

Static portfolio. One page. Zero build step.

## Stack

HTML + CSS + Vanilla JS. No npm. No framework. No CDN fonts.
Deploy: GitHub repo imported in Vercel.
Videos: Cloudflare R2 with custom domain (not `*.r2.dev`).

---

## Adding a piece

1. Open `pieces.json`.
2. Add an entry following this schema:

```json
{
  "id": "unique-kebab-id",
  "title": "BRAND — Product name",
  "type": "video",
  "ratio": "9:16",
  "src": "https://cdn.YOURDOMAIN.com/filename.mp4",
  "poster": "/posters/filename.webp",
  "blurb": "One line, max 90 characters.",
  "role": "Concept, generation, edit",
  "tools": ["Veo 3.1", "Nano Banana Pro"],
  "spec": true,
  "featured": false
}
```

**Fields:**
- `id` — unique string, used as data attribute.
- `type` — `"video"` or `"image"`.
- `ratio` — `"9:16"`, `"16:9"`, `"4:5"`, or `"1:1"`.
- `src` — absolute URL (R2 CDN) for video; `/posters/file.webp` for image.
- `poster` — WebP thumb in `/posters/`, shown before video loads.
- `blurb` — short description, max 90 chars.
- `spec` — `true` shows a "Spec" badge. Use for work without a real client.
- `featured` — `true` makes the card double-width on desktop (use once per row max).

3. Save. No rebuild needed — Vercel will redeploy on git push.

---

## Poster images

1. Export a representative frame as JPEG or PNG.
2. Convert to WebP at 85% quality, max 800px wide:
   ```
   cwebp -q 85 -resize 800 0 frame.jpg -o posters/filename.webp
   ```
   (or use Squoosh, GIMP, or any converter)
3. Place in `/posters/`. Commit and push.

---

## Uploading a video to Cloudflare R2

### Prerequisites
- Cloudflare account with R2 enabled.
- A bucket created (e.g., `portfolio-videos`).
- A **custom domain** connected to the bucket via a Cloudflare Worker or R2 public access
  (Settings → Public access → Custom domain). Do NOT use the default `*.r2.dev` endpoint —
  it is rate-limited and not suitable for production.

### Steps

1. In the R2 dashboard, open your bucket and click **Upload object**.
2. Choose the `.mp4` file.
3. Before confirming, set the **Content-Type** header to `video/mp4`.
   (Without this, some browsers may not stream the video correctly.)
4. After upload, the file is accessible at:
   ```
   https://cdn.YOURDOMAIN.com/filename.mp4
   ```
5. Paste that full URL into `pieces.json` → `"src"`.

### OG image
`/posters/og.webp` must also be reachable at an absolute URL in the meta tags.
Update `og:image` and `twitter:image` in `index.html` once you have your domain.

---

## Deploy on Vercel

```bash
cd portfolio
git init
git add .
git commit -m "chore: initial portfolio"
# Create a repo on GitHub (no template, no .gitignore, public or private)
git remote add origin https://github.com/YOUR_USERNAME/portfolio.git
git push -u origin main
```

Then:
1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Import your GitHub repo.
3. Framework preset: **Other** (static site — no framework).
4. Root directory: leave as `./` (or the subfolder if the repo is nested).
5. Build command: **leave empty**.
6. Output directory: **leave empty** (or `.`).
7. Click **Deploy**.

Vercel auto-deploys on every `git push`.

---

## What is NOT in this repo (by design)

- No analytics, no cookies, no consent banner.
- No serverless functions.
- No environment variables.
- No blog, no about page, no contact form.

---

## Suggestions (not implemented)

- **Password protection** via a Vercel password page if you want the portfolio private.
- **WebM alongside MP4** for smaller file sizes on Chrome/Firefox.
- **Plausible or Fathom** for privacy-respecting analytics if you ever need view counts.
