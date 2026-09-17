/**
 * app.js — Javier Cobo portfolio
 * Vanilla JS, no dependencies.
 *
 *  1. Fetch pieces.json, render the work list (video / image / campaign strip)
 *  2. IntersectionObserver: lazy autoplay for videos, capped (2 desktop / 1 mobile)
 *  3. <dialog> lightbox for video AND images, with gallery arrows on campaigns
 *  4. Copy-email button, footer year
 *  5. prefers-reduced-motion: no autoplay, no entrance animation
 */

(function () {
  "use strict";

  var MAX_PLAYING_DESKTOP = 2;
  var MAX_PLAYING_MOBILE = 1;
  var MOBILE_BP = 768;

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var playingQueue = [];

  function maxPlaying() {
    return window.innerWidth < MOBILE_BP ? MAX_PLAYING_MOBILE : MAX_PLAYING_DESKTOP;
  }

  function safePlay(video) {
    var p = video.play();
    if (p && p.catch) {
      p.catch(function (err) {
        if (err.name !== "AbortError") {
          console.warn("[portfolio] video.play():", err.message);
        }
      });
    }
  }

  /* ── Grid video queue ─────────────────────────────────── */
  function enqueuePlay(video) {
    if (playingQueue.indexOf(video) !== -1) return;
    while (playingQueue.length >= maxPlaying()) {
      var oldest = playingQueue.shift();
      oldest.pause();
    }
    playingQueue.push(video);
    if (!video.src && video.dataset.src) {
      video.src = video.dataset.src;
      video.load();
      video.addEventListener("canplay", function () { safePlay(video); }, { once: true });
    } else {
      safePlay(video);
    }
  }

  function dequeuePlay(video) {
    var i = playingQueue.indexOf(video);
    if (i !== -1) playingQueue.splice(i, 1);
    video.pause();
  }

  function pauseAllGridVideos() {
    playingQueue.slice().forEach(dequeuePlay);
  }

  /* ── Icons ────────────────────────────────────────────── */
  var ICON_PLAY =
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">' +
    '<path d="M3.5 2.2v9.6L11.6 7 3.5 2.2z"/></svg>';
  var ICON_ZOOM =
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="6" cy="6" r="4.2"/><line x1="9.2" y1="9.2" x2="12.6" y2="12.6"/></svg>';

  /* ── Builders ─────────────────────────────────────────── */

  function mediaButton(entry, ariaLabel) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "media";
    btn.dataset.ratio = entry.ratio;
    btn.setAttribute("aria-label", ariaLabel);

    if (entry.kind === "video") {
      var video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.loop = true;
      video.preload = "none";
      video.dataset.src = entry.src;
      if (entry.poster) video.poster = entry.poster;
      video.setAttribute("aria-hidden", "true");
      video.setAttribute("tabindex", "-1");
      video.addEventListener("error", function () {
        // Keep the poster: swap the broken video for a plain image.
        if (!entry.poster) return;
        var img = document.createElement("img");
        img.src = entry.poster;
        img.alt = "";
        video.replaceWith(img);
      });
      btn.appendChild(video);
    } else {
      var img = document.createElement("img");
      img.className = "loading";
      img.src = entry.src;
      img.alt = entry.alt || "";
      img.decoding = "async";
      img.loading = "lazy";
      if (img.complete) img.classList.remove("loading");
      else img.addEventListener("load", function () { img.classList.remove("loading"); }, { once: true });
      btn.appendChild(img);
    }

    var chip = document.createElement("span");
    chip.className = "media-chip";
    chip.setAttribute("aria-hidden", "true");
    chip.innerHTML = entry.kind === "video" ? ICON_PLAY : ICON_ZOOM;
    btn.appendChild(chip);

    return btn;
  }

  function textBlock(piece, index) {
    var frag = document.createDocumentFragment();

    var idx = document.createElement("p");
    idx.className = "work-index";
    idx.textContent = String(index + 1).padStart(2, "0");
    frag.appendChild(idx);

    var brand = document.createElement("h2");
    brand.className = "work-brand display";
    brand.textContent = piece.brand;
    frag.appendChild(brand);

    var name = document.createElement("p");
    name.className = "work-name";
    name.textContent = piece.name;
    frag.appendChild(name);

    var meta = document.createElement("p");
    meta.className = "work-meta";
    meta.textContent = piece.meta;
    frag.appendChild(meta);

    var tools = document.createElement("p");
    tools.className = "work-tools";
    tools.textContent = piece.tools;
    frag.appendChild(tools);

    var blurb = document.createElement("p");
    blurb.className = "work-blurb";
    blurb.textContent = piece.blurb;
    frag.appendChild(blurb);

    return frag;
  }

  function galleryOf(piece) {
    if (piece.kind === "campaign") {
      return piece.items.map(function (item) {
        return {
          kind: item.kind,
          src: item.src,
          poster: item.poster || "",
          alt: item.alt || "",
          caption: piece.brand + " — " + item.label
        };
      });
    }
    return [{
      kind: piece.kind,
      src: piece.src,
      poster: piece.poster || "",
      alt: piece.alt || "",
      caption: piece.brand + " — " + piece.name
    }];
  }

  function buildWork(piece, index, flip) {
    var li = document.createElement("li");
    var isPortraitSolo = piece.kind !== "campaign" && piece.ratio === "9:16";
    li.className = "work " + (isPortraitSolo ? "work--portrait" : "work--landscape") +
      (isPortraitSolo && flip ? " work--flip" : "");

    var gallery = galleryOf(piece);

    if (isPortraitSolo) {
      var body = document.createElement("div");
      body.className = "work-body";

      var mediaWrap = document.createElement("div");
      mediaWrap.className = "work-media";
      var label = (piece.kind === "video" ? "Play " : "View ") + piece.brand + " — " + piece.name;
      var btn = mediaButton(piece, label);
      btn.addEventListener("click", function () { openLightbox(gallery, 0, btn); });
      mediaWrap.appendChild(btn);

      var text = document.createElement("div");
      text.className = "work-text";
      text.appendChild(textBlock(piece, index));

      body.appendChild(text);
      body.appendChild(mediaWrap);
      li.appendChild(body);
      return li;
    }

    /* Landscape / campaign */
    var top = document.createElement("div");
    top.appendChild(textBlock(piece, index));
    li.appendChild(top);

    if (piece.kind === "campaign") {
      var strip = document.createElement("div");
      strip.className = "strip";
      strip.setAttribute("role", "group");
      strip.setAttribute("aria-label", piece.brand + " campaign assets");
      piece.items.forEach(function (item, i) {
        var action = item.kind === "video" ? "Play " : "View ";
        var b = mediaButton(item, action + piece.brand + " — " + item.label);
        b.addEventListener("click", function () { openLightbox(gallery, i, b); });
        strip.appendChild(b);
      });
      li.appendChild(strip);

      var hint = document.createElement("p");
      hint.className = "strip-hint";
      hint.textContent = piece.items.length + " assets · scroll →";
      li.appendChild(hint);
    } else {
      var mediaWrap2 = document.createElement("div");
      mediaWrap2.className = "work-media";
      var label2 = (piece.kind === "video" ? "Play " : "View ") + piece.brand + " — " + piece.name;
      var btn2 = mediaButton(piece, label2);
      btn2.addEventListener("click", function () { openLightbox(gallery, 0, btn2); });
      mediaWrap2.appendChild(btn2);
      li.appendChild(mediaWrap2);
    }

    return li;
  }

  /* ── Render ───────────────────────────────────────────── */
  function render(pieces) {
    var list = document.getElementById("works");
    list.setAttribute("aria-busy", "false");
    list.innerHTML = "";

    var portraitCount = 0;
    pieces.forEach(function (piece, i) {
      var flip = false;
      if (piece.kind !== "campaign" && piece.ratio === "9:16") {
        flip = portraitCount % 2 === 1;
        portraitCount++;
      }
      list.appendChild(buildWork(piece, i, flip));
    });

    setupObserver(list);
  }

  function setupObserver(root) {
    if (!("IntersectionObserver" in window) || prefersReducedMotion) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target.querySelector("video");
        if (!video) return;
        if (entry.isIntersecting) enqueuePlay(video);
        else dequeuePlay(video);
      });
    }, { threshold: 0.3 });

    root.querySelectorAll(".media").forEach(function (btn) {
      if (btn.querySelector("video")) observer.observe(btn);
    });
  }

  /* ── Lightbox ─────────────────────────────────────────── */
  var lightbox = document.getElementById("lightbox");
  var lbStage = document.getElementById("lb-stage");
  var lbCaption = document.getElementById("lb-caption");
  var lbClose = document.getElementById("lb-close");
  var lbPrev = document.getElementById("lb-prev");
  var lbNext = document.getElementById("lb-next");

  var lbGallery = [];
  var lbIndex = 0;
  var lbTrigger = null;

  function showSlide(i) {
    lbIndex = (i + lbGallery.length) % lbGallery.length;
    var entry = lbGallery[lbIndex];
    lbStage.innerHTML = "";

    if (entry.kind === "video") {
      var video = document.createElement("video");
      video.controls = true;
      video.playsInline = true;
      video.src = entry.src;
      if (entry.poster) video.poster = entry.poster;
      video.setAttribute("aria-label", entry.caption);
      lbStage.appendChild(video);
      safePlay(video);
    } else {
      var img = document.createElement("img");
      img.src = entry.src;
      img.alt = entry.alt || entry.caption;
      lbStage.appendChild(img);
    }

    lbCaption.textContent = entry.caption +
      (lbGallery.length > 1 ? "  ·  " + (lbIndex + 1) + "/" + lbGallery.length : "");

    var multi = lbGallery.length > 1;
    lbPrev.hidden = !multi;
    lbNext.hidden = !multi;
  }

  function openLightbox(gallery, index, triggerEl) {
    lbGallery = gallery;
    lbTrigger = triggerEl || null;
    pauseAllGridVideos();
    showSlide(index);
    lightbox.showModal();
    document.addEventListener("keydown", onLbKey);
  }

  function closeLightbox() {
    if (lightbox.open) lightbox.close();
  }

  lightbox.addEventListener("close", function () {
    lbStage.innerHTML = ""; // stops any playing video
    document.removeEventListener("keydown", onLbKey);
    if (lbTrigger) {
      lbTrigger.focus();
      lbTrigger = null;
    }
  });

  function onLbKey(e) {
    if (!lightbox.open || lbGallery.length < 2) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); showSlide(lbIndex - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); showSlide(lbIndex + 1); }
  }

  lbClose.addEventListener("click", closeLightbox);
  lbPrev.addEventListener("click", function () { showSlide(lbIndex - 1); });
  lbNext.addEventListener("click", function () { showSlide(lbIndex + 1); });

  // Click on the backdrop (outside the figure) closes.
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  /* ── Copy email ───────────────────────────────────────── */
  var copyBtn = document.getElementById("btn-copy");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var email = copyBtn.dataset.email;

      function done() {
        var original = "Copy address";
        copyBtn.textContent = "Copied";
        copyBtn.classList.add("copied");
        setTimeout(function () {
          copyBtn.textContent = original;
          copyBtn.classList.remove("copied");
        }, 2000);
      }

      function fallback() {
        try {
          var ta = document.createElement("textarea");
          ta.value = email;
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand("copy");
          document.body.removeChild(ta);
          if (ok) done();
          else copyBtn.textContent = email; // worst case: show it, it's selectable
        } catch (err) {
          copyBtn.textContent = email;
        }
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done).catch(fallback);
      } else {
        fallback();
      }
    });
  }

  /* ── Year ─────────────────────────────────────────────── */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = "© " + new Date().getFullYear();

  /* ── Boot ─────────────────────────────────────────────── */
  fetch("/pieces.json")
    .then(function (r) {
      if (!r.ok) throw new Error("pieces.json " + r.status);
      return r.json();
    })
    .then(render)
    .catch(function (err) {
      console.error("[portfolio]", err);
      var list = document.getElementById("works");
      if (list) {
        list.setAttribute("aria-busy", "false");
        list.innerHTML =
          '<li class="js-note">The reel didn’t load. Refresh the page, or just email me: javierc.dom@gmail.com</li>';
      }
    });
})();
