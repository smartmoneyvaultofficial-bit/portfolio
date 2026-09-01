/**
 * app.js — Javier Cobo portfolio
 * Vanilla JS, no dependencies.
 *
 * Responsibilities:
 *  1. Fetch pieces.json and render the grid
 *  2. IntersectionObserver for lazy video play/pause
 *  3. Max concurrent video cap (2 desktop / 1 mobile)
 *  4. Lightbox (keyboard, focus-trap, scroll-lock)
 *  5. Copy-email button
 *  6. Footer year
 *  7. prefers-reduced-motion: no autoplay
 */

(function () {
  "use strict";

  /* ── Config ─────────────────────────────────────────── */
  const MAX_PLAYING_DESKTOP = 2;
  const MAX_PLAYING_MOBILE  = 1;
  const MOBILE_BREAKPOINT   = 768;

  /* ── State ──────────────────────────────────────────── */
  // Ordered queue of cards whose video is currently playing
  const playingQueue = [];
  let   lightboxTriggerEl = null; // card that opened the lightbox

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── Helpers ─────────────────────────────────────────── */
  function isMobile() {
    return window.innerWidth < MOBILE_BREAKPOINT;
  }

  function maxPlaying() {
    return isMobile() ? MAX_PLAYING_MOBILE : MAX_PLAYING_DESKTOP;
  }

  /** Safely call video.play(), ignore AbortError from rapid load/pause cycles */
  function safePlay(video) {
    const p = video.play();
    if (p && p.catch) {
      p.catch(function (err) {
        if (err.name !== "AbortError") {
          console.warn("[portfolio] video.play() error:", err.message);
        }
      });
    }
  }

  /** Enqueue a card into the playing queue, pausing oldest if over cap */
  function enqueuePlay(card) {
    const video = card.querySelector("video");
    if (!video) return;

    // Already in queue — do nothing
    if (playingQueue.includes(card)) return;

    // If at cap, pause the oldest
    while (playingQueue.length >= maxPlaying()) {
      const oldest = playingQueue.shift();
      const oldVideo = oldest.querySelector("video");
      if (oldVideo) oldVideo.pause();
    }

    playingQueue.push(card);
    if (!video.src && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
      video.addEventListener("canplay", function () { safePlay(video); }, { once: true });
    } else {
      safePlay(video);
    }
  }

  /** Remove a card from queue and pause its video */
  function dequeuePlay(card) {
    const idx = playingQueue.indexOf(card);
    if (idx !== -1) playingQueue.splice(idx, 1);
    const video = card.querySelector("video");
    if (video) video.pause();
  }

  /* ── Render grid ─────────────────────────────────────── */
  function renderGrid(pieces) {
    const grid = document.getElementById("grid");
    grid.setAttribute("aria-busy", "false");
    grid.innerHTML = "";

    pieces.forEach(function (piece, idx) {
      const card = buildCard(piece, idx);
      grid.appendChild(card);
    });

    // Start observing after all cards are in the DOM
    setupObserver(grid);
  }

  function buildCard(piece, idx) {
    const isFirst    = idx === 0;
    const isFeatured = piece.featured === true;

    /* Wrapper */
    const article = document.createElement("article");
    article.className   = "card" + (isFeatured ? " card--featured" : "");
    article.role        = "listitem";
    article.tabIndex    = 0;
    article.dataset.id  = piece.id;
    article.dataset.type = piece.type;
    article.setAttribute("aria-label", piece.title);

    /* ── Media wrapper ── */
    const mediaWrap = document.createElement("div");
    mediaWrap.className     = "card-media";
    mediaWrap.dataset.ratio = piece.ratio;

    if (piece.type === "video") {
      const video = document.createElement("video");
      video.muted     = true;
      video.playsInline = true;
      video.loop      = true;
      video.preload   = "none";
      // Store src in data attribute — actual src set by observer on demand
      video.dataset.src = piece.src;
      if (piece.poster) video.poster = piece.poster;
      video.setAttribute("aria-hidden", "true");
      // On error: just keep poster, no broken UI
      video.addEventListener("error", function () {
        video.style.display = "none";
      });
      mediaWrap.appendChild(video);

      // Play hint icon (visible on hover / always if reduced-motion)
      const playHint = document.createElement("div");
      playHint.className       = "card-play-hint";
      playHint.setAttribute("aria-hidden", "true");
      playHint.innerHTML = `<svg viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="26" cy="26" r="25" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
        <polygon points="21,17 21,35 37,26" fill="rgba(255,255,255,0.9)"/>
      </svg>`;
      mediaWrap.appendChild(playHint);
    } else {
      /* Image piece */
      const img  = document.createElement("img");
      img.src    = piece.src;
      img.alt    = piece.title;
      img.width  = 800;
      img.height = 800;
      if (!isFirst) img.loading = "lazy";
      img.decoding = "async";
      mediaWrap.appendChild(img);
    }

    /* Spec badge */
    if (piece.spec) {
      const badge = document.createElement("span");
      badge.className = "badge-spec";
      badge.textContent = "Spec";
      badge.setAttribute("aria-label", "Spec work — not a client project");
      mediaWrap.appendChild(badge);
    }

    article.appendChild(mediaWrap);

    /* ── Card info ── */
    const info = document.createElement("div");
    info.className = "card-info";

    const title = document.createElement("h2");
    title.className   = "card-title";
    title.textContent = piece.title;
    info.appendChild(title);

    if (piece.blurb) {
      const blurb = document.createElement("p");
      blurb.className   = "card-blurb";
      blurb.textContent = piece.blurb;
      info.appendChild(blurb);
    }

    if (piece.tools && piece.tools.length) {
      const meta = document.createElement("div");
      meta.className = "card-meta";
      piece.tools.forEach(function (tool) {
        const tag = document.createElement("span");
        tag.className   = "card-tool";
        tag.textContent = tool;
        meta.appendChild(tag);
      });
      info.appendChild(meta);
    }

    article.appendChild(info);

    /* ── Click / Enter → lightbox (videos only) ── */
    if (piece.type === "video") {
      function openLightboxHandler(e) {
        if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
        if (e.type === "keydown") e.preventDefault();
        openLightbox(piece, article);
      }
      article.addEventListener("click", openLightboxHandler);
      article.addEventListener("keydown", openLightboxHandler);
    }

    return article;
  }

  /* ── IntersectionObserver ────────────────────────────── */
  function setupObserver(grid) {
    if (!("IntersectionObserver" in window)) {
      // Fallback: no autoplay
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          const card = entry.target;
          if (card.dataset.type !== "video") return;

          if (entry.isIntersecting) {
            if (!prefersReducedMotion) {
              enqueuePlay(card);
            }
          } else {
            dequeuePlay(card);
          }
        });
      },
      {
        threshold: 0.25,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    grid.querySelectorAll(".card[data-type='video']").forEach(function (card) {
      observer.observe(card);
    });
  }

  /* ── Lightbox ────────────────────────────────────────── */
  const lightbox      = document.getElementById("lightbox");
  const lightboxVideo = document.getElementById("lightbox-video");
  const lightboxClose = document.getElementById("lightbox-close");
  const lightboxBack  = document.getElementById("lightbox-backdrop");

  function openLightbox(piece, triggerEl) {
    lightboxTriggerEl = triggerEl;

    // Set video source
    lightboxVideo.src         = piece.src;
    lightboxVideo.poster      = piece.poster || "";
    lightboxVideo.muted       = false;
    lightboxVideo.setAttribute("aria-label", piece.title + " — full screen video");
    lightboxVideo.load();

    // Pause grid video for this card
    dequeuePlay(triggerEl);

    // Show lightbox
    lightbox.hidden = false;
    lockScroll();
    lightboxClose.focus();
    lightboxVideo.play().catch(function () {
      // Autoplay might be blocked with sound; user can press play
    });

    document.addEventListener("keydown", handleLightboxKey);
  }

  function closeLightbox() {
    lightboxVideo.pause();
    lightboxVideo.src = "";
    lightbox.hidden   = true;
    unlockScroll();
    document.removeEventListener("keydown", handleLightboxKey);

    if (lightboxTriggerEl) {
      lightboxTriggerEl.focus();
      lightboxTriggerEl = null;
    }
  }

  function handleLightboxKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeLightbox();
    }
    // Basic focus trap: keep focus inside lightbox
    if (e.key === "Tab") {
      const focusables = lightbox.querySelectorAll(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
      );
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxBack.addEventListener("click", closeLightbox);

  /* ── Scroll lock ─────────────────────────────────────── */
  function lockScroll() {
    const sb = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty("--scrollbar-width", sb + "px");
    document.body.classList.add("scroll-locked");
  }

  function unlockScroll() {
    document.body.classList.remove("scroll-locked");
    document.documentElement.style.removeProperty("--scrollbar-width");
  }

  /* ── Copy email ──────────────────────────────────────── */
  const copyBtn = document.getElementById("btn-copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      const email = copyBtn.dataset.email;
      if (!navigator.clipboard) {
        // Fallback for very old browsers
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showCopied(copyBtn);
        return;
      }
      navigator.clipboard.writeText(email).then(function () {
        showCopied(copyBtn);
      }).catch(function () {
        // Silent fail — Email button is always there as fallback
      });
    });
  }

  function showCopied(btn) {
    const original = btn.textContent;
    btn.textContent = "Copied!";
    btn.classList.add("copied");
    btn.setAttribute("aria-label", "Email address copied to clipboard");
    setTimeout(function () {
      btn.textContent = original;
      btn.classList.remove("copied");
      btn.setAttribute("aria-label", "Copy email address to clipboard");
    }, 2000);
  }

  /* ── Footer year ─────────────────────────────────────── */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = "© " + new Date().getFullYear();

  /* ── Boot: fetch & render ─────────────────────────────── */
  fetch("/pieces.json")
    .then(function (r) {
      if (!r.ok) throw new Error("Failed to load pieces.json: " + r.status);
      return r.json();
    })
    .then(renderGrid)
    .catch(function (err) {
      console.error("[portfolio]", err);
      const grid = document.getElementById("grid");
      if (grid) {
        grid.setAttribute("aria-busy", "false");
        grid.innerHTML = '<p style="color:#7a7570;padding:2rem">Work loading — check back soon.</p>';
      }
    });

})();
