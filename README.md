# Javier Cobo — AI Ad Portfolio

Static portfolio. One page. Zero build step.

## Stack

HTML + CSS + Vanilla JS. No npm, no framework, no CDN — the only font (Archivo variable) is self-hosted in `/fonts`.
Deploy: GitHub repo imported in Vercel (framework preset "Other", no build command).
Videos: Cloudflare R2 public bucket over `r2.dev`.

> ⚠️ `r2.dev` is rate-limited and intended by Cloudflare for development traffic only.
> Decision (17 sep 2026): accepted for now. If it ever throttles real visitors, connect a
> custom domain to the bucket (requires the domain as a zone in the same Cloudflare account)
> and update the video `src` values plus the OG meta tags in `index.html`.

---

## Adding a piece

Edit `pieces.json`. Pieces render in array order (the number badge is the array position).

**Video or image piece:**

```json
{
  "id": "brand-slug",
  "kind": "video",
  "brand": "BRAND",
  "name": "Product — format",
  "meta": "SPEC · UGC FILM · 30 S · 9:16 · EN",
  "tools": "Veo 3.1 · ElevenLabs",
  "blurb": "One or two lines, process numbers beat adjectives.",
  "ratio": "9:16",
  "src": "https://pub-XXXX.r2.dev/file.mp4",
  "poster": "/posters/file.webp"
}
```

- `kind`: `"video"`, `"image"` or `"campaign"`.
- `ratio`: `"9:16"`, `"16:9"`, `"4:3"` or `"4:5"` — must match the real file, it controls the frame.
- For `"image"`, `src` is the image itself (it is reused full-size in the lightbox) and `alt` is required.
- 9:16 videos lay out as portrait rows (media beside text, sides alternate automatically);
  everything else lays out full-width.

**Campaign piece:** same text fields plus an `items` array of `{kind, label, ratio, src, poster?, alt?}`.
Items render as a horizontal contact strip and open in the lightbox as a gallery (arrow keys work).

## Assets

- Posters: WebP, ≤150 KB, same frame you want as the still. `ffmpeg -ss <t> -i in.mp4 -frames:v 1 -vf scale=720:-2 -c:v libwebp -quality 84 out.webp`
- Statics for the lightbox live in `/posters/full/` at their native resolution.
- Videos: compress for web before uploading to R2 — `ffmpeg -i in.mp4 -c:v libx264 -crf 26 -preset medium -c:a aac -b:a 128k -movflags +faststart out.mp4`. Set Content-Type `video/mp4` when uploading.

## Local preview

Any static server from the repo root works, e.g. `python -m http.server` or a 30-line Node server. No build.

## What is NOT in this repo (by design)

- No analytics, no cookies, no consent banner.
- No serverless functions, no environment variables.
- No client names anywhere: every brand shown is fictional spec work, and the page says so.
