/* Método Tres Escuadras - interacciones del sitio. Sin dependencias. */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function icon(name) {
    var tpl = document.getElementById("i-" + name);
    return tpl ? tpl.content.firstElementChild.cloneNode(true) : null;
  }

  /* ---------- Tema claro/oscuro ---------- */
  var themeBtn = document.querySelector("[data-theme-toggle]");
  function currentTheme() {
    var t = doc.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function paintThemeLabel() {
    if (themeBtn) themeBtn.textContent = currentTheme() === "dark" ? "Modo claro" : "Modo oscuro";
  }
  if (themeBtn) {
    paintThemeLabel();
    themeBtn.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      doc.setAttribute("data-theme", next);
      try { localStorage.setItem("mte-theme", next); } catch (e) {}
      paintThemeLabel();
    });
  }

  /* ---------- Header con borde al scrollear ---------- */
  var header = document.querySelector(".site-header");
  var sentinel = document.querySelector("[data-header-sentinel]");
  if (header && sentinel && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      header.classList.toggle("is-stuck", !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ---------- Menú móvil ---------- */
  var menu = document.querySelector("[data-mobile-menu]");
  var openers = document.querySelectorAll("[data-menu-open]");
  var closers = document.querySelectorAll("[data-menu-close]");
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle("is-open", open);
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    if (open) menu.removeAttribute("inert"); else menu.setAttribute("inert", "");
    document.body.classList.toggle("menu-open", open);
    openers.forEach(function (b) { b.setAttribute("aria-expanded", open ? "true" : "false"); });
    if (open) { var f = menu.querySelector("nav a"); if (f) f.focus(); }
    else if (openers[0]) openers[0].focus();
  }
  openers.forEach(function (b) { b.addEventListener("click", function () { setMenu(true); }); });
  closers.forEach(function (b) { b.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && menu && menu.classList.contains("is-open")) setMenu(false);
  });

  /* ---------- Historia: línea de tiempo interactiva ---------- */
  var tlRoot = document.querySelector("[data-tl]");
  if (tlRoot) (function () {
    var ticks = Array.prototype.slice.call(tlRoot.querySelectorAll(".tl__tick"));
    var panels = tlRoot.querySelectorAll(".tl__panel");
    var rail = tlRoot.querySelector(".tl__rail");
    var prev = tlRoot.querySelector("[data-tl-prev]");
    var next = tlRoot.querySelector("[data-tl-next]");
    var nEl = tlRoot.querySelector("[data-tl-n]");
    var cur = 0;
    var show = function (i, focus) {
      if (i < 0 || i >= ticks.length) return;
      cur = i;
      ticks.forEach(function (t, k) { t.setAttribute("aria-selected", k === i ? "true" : "false"); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach(function (p, k) { p.classList.toggle("is-active", k === i); });
      if (nEl) nEl.textContent = i + 1;
      prev.disabled = i === 0;
      next.disabled = i === ticks.length - 1;
      var t = ticks[i], r = rail.getBoundingClientRect(), b = t.getBoundingClientRect();
      if (b.left < r.left + 24 || b.right > r.right - 24) {
        rail.scrollTo({ left: rail.scrollLeft + (b.left - r.left) - r.width / 2 + b.width / 2, behavior: reduce ? "auto" : "smooth" });
      }
      if (focus) t.focus();
    };
    ticks.forEach(function (t, k) {
      t.addEventListener("click", function () { show(k); });
      t.addEventListener("keydown", function (e) {
        var to = { ArrowRight: cur + 1, ArrowLeft: cur - 1, Home: 0, End: ticks.length - 1 }[e.key];
        if (to !== undefined) { e.preventDefault(); show(Math.max(0, Math.min(ticks.length - 1, to)), true); }
      });
    });
    prev.addEventListener("click", function () { show(cur - 1); });
    next.addEventListener("click", function () { show(cur + 1); });
    show(0);
  })();

  /* ---------- Home: las posturas contadas con scroll (desktop con movimiento) ---------- */
  var story = document.querySelector("[data-story]");
  var storyMq = window.matchMedia("(min-width: 960px)");
  if (story && !reduce && "IntersectionObserver" in window && storyMq.matches) (function () {
    story.classList.add("is-on");
    var esc = story.querySelector(".escuadras");
    if (esc) esc.removeAttribute("data-moment"); // en este modo el foco lo marca el paso activo
    var steps = story.querySelectorAll(".escuadra");
    var imgs = story.querySelectorAll(".story__img");
    var ticks = story.querySelectorAll(".story__tick");
    var num = story.querySelector("[data-story-num]");
    var angle = story.querySelector(".story__angle");
    var cur = -1;
    var set = function (i) {
      if (i < 0 || i === cur) return;
      cur = i;
      steps.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
      imgs.forEach(function (s, k) { s.classList.toggle("is-active", k === i); });
      ticks.forEach(function (s, k) { s.classList.toggle("is-active", k <= i); });
      if (num) num.textContent = (i < 9 ? "0" : "") + (i + 1);
      if (angle) { angle.classList.remove("is-drawing"); angle.getBoundingClientRect(); angle.classList.add("is-drawing"); }
    };
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) set(Array.prototype.indexOf.call(steps, en.target)); });
    }, { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach(function (s) { so.observe(s); });
    set(0);
    var off = function (e) { if (!e.matches) { story.classList.remove("is-on"); so.disconnect(); } };
    if (storyMq.addEventListener) storyMq.addEventListener("change", off);
  })();

  /* ---------- Momento de autor: escuadras y fases ---------- */
  var moments = document.querySelectorAll("[data-moment]");
  if (!reduce && "IntersectionObserver" in window) {
    var mo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); mo.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.18 });
    moments.forEach(function (m) { mo.observe(m); });
  } else {
    moments.forEach(function (m) { m.classList.add("is-in"); });
  }

  /* ---------- Revelado al entrar en viewport ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var t = en.target;
          t.classList.add("is-in"); ro.unobserve(t);
          setTimeout(function () { t.style.removeProperty("--d"); }, 900);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    var reveal = function (node, cls, d) {
      if (!node) return;
      // Si ya está visible al cargar, se deja como está (sin parpadeo).
      if (node.getBoundingClientRect().top < window.innerHeight * 0.92) return;
      node.classList.add("reveal");
      if (cls) node.classList.add(cls);
      if (d) node.style.setProperty("--d", d + "ms");
      ro.observe(node);
    };
    var singles = ".history__head,.escuadras__head,.section-head,.finder,.course,.cta-band>div,.quote,.faq-grid>div,.index-grid>div,.split>div,.callout,.bio,.pub-group,.lt-prose>h2,.lt-prose>.lt-sign,.lt-fr";
    document.querySelectorAll(singles).forEach(function (n) { reveal(n, null, 0); });
    var groups = ".index-list,.facts-list,.evidence,.team-list,.steps,.timeline,.two-col,.people,.figure-row,.channels,.tags,.memoriam";
    document.querySelectorAll(groups).forEach(function (container) {
      Array.prototype.forEach.call(container.children, function (k, i) {
        reveal(k, null, Math.min(i, 6) * 70);
      });
    });
  }

  /* ---------- Conteo animado en las estadísticas ---------- */
  if (!reduce && "IntersectionObserver" in window) {
    var nums = document.querySelectorAll(".evidence dt");
    if (nums.length) {
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          co.unobserve(en.target);
          var node = en.target, full = node.textContent;
          var m = full.match(/^\s*(\d{1,4})(?![\d.,])/);
          if (!m) return;
          var target = parseInt(m[1], 10);
          var suffix = full.slice(m[0].length), t0 = null, dur = 1000;
          var step = function (ts) {
            if (t0 === null) t0 = ts;
            var p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
            node.textContent = String(Math.round(e * target)) + suffix;
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0.4 });
      nums.forEach(function (n) { co.observe(n); });
    }
  }

  /* ---------- Hero: título palabra por palabra ---------- */
  if (!reduce) {
    document.querySelectorAll("[data-split]").forEach(function (h) {
      var n = 0;
      h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
      var walk = function (node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (c) {
          if (c.nodeType === 3) {
            var frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var s = document.createElement("span");
              s.className = "split-w"; s.style.setProperty("--wi", n++); s.textContent = part;
              s.setAttribute("aria-hidden", "true");
              frag.appendChild(s);
            });
            node.replaceChild(frag, c);
          } else if (c.nodeType === 1) { walk(c); }
        });
      };
      walk(h);
    });
  }

  /* ---------- Hero: carrusel de las posturas ---------- */
  var slideBox = document.querySelector("[data-slides]");
  if (slideBox) (function () {
    var slides = slideBox.querySelectorAll(".hero__slide");
    var dots = slideBox.querySelectorAll(".hero__dotbtn");
    var label = slideBox.querySelector("[data-slide-label]");
    var pause = slideBox.querySelector("[data-pause]");
    var cur = 0;
    var go = function (i) {
      var next = (i + slides.length) % slides.length;
      if (next === cur) return;
      slides.forEach(function (s, k) {
        s.classList.toggle("is-prev", k === cur);
        s.classList.toggle("is-active", k === next);
        if (k === next) s.removeAttribute("aria-hidden"); else s.setAttribute("aria-hidden", "true");
      });
      cur = next;
      dots.forEach(function (d, k) { if (k === cur) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
      // el nombre cambia cuando la foto nueva ya está entrando
      setTimeout(function () { if (label) label.textContent = slides[cur].getAttribute("data-label"); }, 180);
    };
    dots.forEach(function (d) {
      d.addEventListener("click", function () {
        if (label) label.setAttribute("aria-live", "polite"); // se anuncia solo si la persona eligió
        go(parseInt(d.getAttribute("data-go"), 10));
      });
      var bar = d.querySelector("i");
      // La barrita del punto activo marca el tiempo; al completarse pasa a la siguiente (se pausa con el mouse encima).
      if (bar) bar.addEventListener("animationend", function () { if (d.getAttribute("aria-current")) go(cur + 1); });
    });
    if (pause) {
      if (reduce) pause.hidden = true; // con movimiento reducido no avanza solo
      pause.addEventListener("click", function () {
        var on = pause.getAttribute("aria-pressed") !== "true";
        pause.setAttribute("aria-pressed", on ? "true" : "false");
        pause.setAttribute("aria-label", on ? "Reanudar el carrusel" : "Pausar el carrusel");
        slideBox.classList.toggle("is-paused", on);
      });
    }
  })();

  /* Hero fuera de pantalla: se frena el carrusel y el parallax */
  var heroEl = document.querySelector("[data-hero]");
  var heroOn = true;
  if (heroEl && "IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      heroOn = en[0].isIntersecting;
      heroEl.classList.toggle("is-off", !heroOn);
    }).observe(heroEl);
  }

  /* ---------- Hero: parallax suave del fondo ---------- */
  var heroBg = document.querySelector(".hero__bg img");
  if (heroBg && !reduce) {
    var pTick = 0;
    window.addEventListener("scroll", function () {
      if (pTick) return;
      pTick = requestAnimationFrame(function () {
        pTick = 0;
        if (!heroOn) return;
        heroBg.style.setProperty("--py", (window.scrollY * 0.28).toFixed(1) + "px");
      });
    }, { passive: true });
  }

  /* ---------- Efecto dock (macOS): agranda lo que está bajo el cursor y un poco los vecinos ---------- */
  if (!reduce && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    [[".dir-grid", 0.025, -5], [".gallery", 0.08, -4], [".mosaic", 0.03, -4], [".story:not(.is-on) .escuadras", 0.03, -6], [".figure-row--3", 0.05, -4]]
      .forEach(function (cfg) {
        document.querySelectorAll(cfg[0]).forEach(function (grid) {
          grid.classList.add("is-dock");
          grid.style.setProperty("--k", cfg[1]);
          grid.style.setProperty("--lift", cfg[2] + "px");
          var items = grid.children, px = 0, py = 0, raf = 0, boxes = null, last = [];
          // Medidas en coordenadas de la página, tomadas sin el aumento aplicado (offset*), y válidas hasta scroll/resize.
          var measure = function () {
            boxes = [];
            for (var i = 0; i < items.length; i++) {
              var it = items[i];
              if (!it.offsetParent) { boxes.push(null); continue; }
              var r = it.getBoundingClientRect(), sx = window.scrollX, sy = window.scrollY;
              var w = it.offsetWidth, h = it.offsetHeight;
              var cx = r.left + r.width / 2 + sx, cy = r.top + r.height / 2 + sy;
              boxes.push({ l: cx - w / 2, t: cy - h / 2, w: w, h: h });
            }
          };
          var paint = function () {
            raf = 0;
            if (!boxes) measure();
            var gx = px + window.scrollX, gy = py + window.scrollY, out = [];
            for (var i = 0; i < boxes.length; i++) {
              var b = boxes[i];
              if (!b) { out.push(null); continue; }
              var inside = gx >= b.l && gx <= b.l + b.w && gy >= b.t && gy <= b.t + b.h;
              var R = Math.max(b.w, b.h) * 1.25;
              var mc = Math.max(0, 1 - Math.hypot(gx - (b.l + b.w / 2), gy - (b.t + b.h / 2)) / R);
              var m = inside ? Math.max(0.85, mc) : mc * mc * 0.55;
              out.push({ m: Math.round(m * 100) / 100, inside: inside, mx: gx - b.l, my: gy - b.t });
            }
            for (var j = 0; j < out.length; j++) {
              var o = out[j];
              if (!o) continue;
              var it2 = items[j];
              if (last[j] !== o.m) {
                it2.style.setProperty("--m", o.m);
                it2.style.setProperty("--z", o.inside ? 3 : (o.m > 0.05 ? 2 : 0));
                last[j] = o.m;
              }
              if (o.inside) { it2.style.setProperty("--mx", o.mx + "px"); it2.style.setProperty("--my", o.my + "px"); }
            }
          };
          var reset = function () {
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
            for (var i = 0; i < items.length; i++) { items[i].style.setProperty("--m", 0); items[i].style.setProperty("--z", 0); }
            last = [];
          };
          grid.addEventListener("pointerenter", function () { boxes = null; });
          grid.addEventListener("pointermove", function (e) {
            if (e.pointerType && e.pointerType !== "mouse") return;
            px = e.clientX; py = e.clientY;
            if (!raf) raf = requestAnimationFrame(paint);
          });
          grid.addEventListener("pointerleave", reset);
          window.addEventListener("resize", function () { boxes = null; }, { passive: true });
          // si cambia el filtro o se muestran más fotos, se vuelve a medir
          new MutationObserver(function () { boxes = null; }).observe(grid, { attributes: true, subtree: true, attributeFilter: ["class", "hidden"] });
        });
      });
  }

  /* ---------- Fotos: fundido al terminar de cargar ---------- */
  document.querySelectorAll(".gallery img, .mosaic img").forEach(function (im) {
    var done = function () { im.classList.add("is-loaded"); };
    if (im.complete && im.naturalWidth) done();
    else { im.addEventListener("load", done, { once: true }); im.addEventListener("error", done, { once: true }); }
  });

  /* ---------- Índice lateral activo ---------- */
  var tocLinks = document.querySelectorAll(".toc a[href^='#']");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var to = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          tocLinks.forEach(function (a) { a.classList.remove("is-active"); });
          map[en.target.id].classList.add("is-active");
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) to.observe(s); });
  }

  /* ---------- Directorio de profesionales ---------- */
  var dir = document.querySelector("[data-directory]");
  if (dir) {
    var input = dir.querySelector("[data-dir-search]");
    var chips = dir.querySelectorAll("[data-region]");
    var cards = dir.querySelectorAll(".pro");
    var regionsEls = dir.querySelectorAll(".dir-region");
    var countEl = dir.querySelector("[data-dir-count]");
    var empty = dir.querySelector(".empty");
    var activeRegion = "todas";
    var tagBtns = dir.querySelectorAll("[data-tag]");
    var activeTags = [];
    var norm = function (s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };
    cards.forEach(function (c) { c._txt = norm(c.textContent + " " + (c.getAttribute("data-region-name") || "")); });

    var apply = function () {
      var q = norm(input.value.trim());
      var terms = q.split(/\s+/).filter(Boolean);
      var shown = 0, names = {};
      cards.forEach(function (c) {
        var okRegion = activeRegion === "todas" || c.getAttribute("data-region-slug") === activeRegion;
        var okText = terms.every(function (t) { return c._txt.indexOf(t) !== -1; });
        var ctags = (c.getAttribute("data-tags") || "").split(" ");
        var okTags = activeTags.every(function (t) { return ctags.indexOf(t) !== -1; });
        var vis = okRegion && okText && okTags;
        c.classList.toggle("is-hidden", !vis);
        if (vis && !names[c.getAttribute("data-name")]) { names[c.getAttribute("data-name")] = 1; shown++; }
      });
      regionsEls.forEach(function (r) {
        var n = r.querySelectorAll(".pro:not(.is-hidden)").length;
        r.classList.toggle("is-hidden", n === 0);
        var sm = r.querySelector("h2 small"); if (sm) sm.textContent = n;
      });
      if (countEl) countEl.textContent = (shown === 1 ? "1 profesional" : shown + " profesionales") + " en la lista";
      empty.classList.toggle("is-visible", shown === 0);
      var params = new URLSearchParams();
      if (q) params.set("q", input.value.trim());
      if (activeRegion !== "todas") params.set("zona", activeRegion);
      if (activeTags.length) params.set("filtro", activeTags.join(","));
      var qs = params.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
    };
    var setRegion = function (slug) {
      activeRegion = slug;
      chips.forEach(function (ch) { ch.setAttribute("aria-pressed", ch.getAttribute("data-region") === slug ? "true" : "false"); });
    };
    // Al filtrar con los chips, las fichas se reacomodan con View Transitions en vez de saltar.
    // (No se usa al tipear en el buscador: congelaría el campo durante la transición.)
    var vtItems = [];
    cards.forEach(function (c, i) { vtItems.push([c, "pro-" + i]); });
    regionsEls.forEach(function (r, i) { var h = r.querySelector("h2"); if (h) vtItems.push([h, "reg-" + i]); });
    if (empty) vtItems.push([empty, "dir-empty"]);
    var nameAll = function (on) { vtItems.forEach(function (p) { p[0].style.viewTransitionName = on ? p[1] : ""; }); };
    var animated = function (fn) {
      if (reduce || !document.startViewTransition) { fn(); return; }
      nameAll(true);
      doc.classList.add("vt-filter");
      var done = function () { nameAll(false); doc.classList.remove("vt-filter"); };
      document.startViewTransition(fn).finished.then(done, done);
    };
    chips.forEach(function (ch) {
      ch.addEventListener("click", function () { animated(function () { setRegion(ch.getAttribute("data-region")); apply(); }); });
    });
    tagBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        animated(function () {
          var t = b.getAttribute("data-tag"), i = activeTags.indexOf(t);
          if (i === -1) activeTags.push(t); else activeTags.splice(i, 1);
          b.setAttribute("aria-pressed", i === -1 ? "true" : "false");
          apply();
        });
      });
    });
    var timer;
    input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(apply, 90); });
    dir.querySelectorAll("[data-dir-reset]").forEach(function (b) {
      b.addEventListener("click", function () {
        input.value = ""; setRegion("todas"); activeTags = [];
        tagBtns.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        apply(); input.focus();
      });
    });
    var sp = new URLSearchParams(location.search);
    if (sp.get("q")) input.value = sp.get("q");
    if (sp.get("zona") && dir.querySelector('[data-region="' + sp.get("zona") + '"]')) setRegion(sp.get("zona"));
    (sp.get("filtro") || "").split(",").forEach(function (t) {
      var b = t && dir.querySelector('[data-tag="' + t + '"]');
      if (b) { activeTags.push(t); b.setAttribute("aria-pressed", "true"); }
    });
    apply();
  }

  /* ---------- Galería con lightbox ---------- */
  var galleries = document.querySelectorAll("[data-lightbox]");
  if (galleries.length) {
    var lbImg = el("img", { alt: "" });
    var lbCap = el("figcaption");
    var prevBtn = el("button", { class: "lb-btn lb-prev", type: "button", "aria-label": "Anterior" }, [icon("caret-left")]);
    var nextBtn = el("button", { class: "lb-btn lb-next", type: "button", "aria-label": "Siguiente" }, [icon("caret-right")]);
    var closeBtn = el("button", { class: "lb-btn lb-close", type: "button", "aria-label": "Cerrar" }, [icon("x")]);
    var lb = el("div", { class: "lightbox", role: "dialog", "aria-modal": "true", "aria-label": "Imagen ampliada" },
      [prevBtn, el("figure", {}, [lbImg, lbCap]), nextBtn, closeBtn]);
    document.body.appendChild(lb);
    var items = [], idx = 0, lastFocus = null;

    var show = function (i, instant) {
      idx = (i + items.length) % items.length;
      var a = items[idx];
      var next = a.getAttribute("href");
      if (!instant && lbImg.getAttribute("src") && lbImg.getAttribute("src") !== next && !reduce) {
        lbImg.classList.add("is-swapping");
        lbImg.addEventListener("load", function () { lbImg.classList.remove("is-swapping"); }, { once: true });
      }
      lbImg.src = next;
      lbImg.alt = (a.querySelector("img") || {}).alt || "";
      lbCap.textContent = (idx + 1) + " de " + items.length;
      var nxt = items[(idx + 1) % items.length];
      if (nxt) { var pre = new Image(); pre.src = nxt.getAttribute("href"); }
    };
    // La foto crece desde la miniatura que se tocó y vuelve a ella al cerrar (View Transitions).
    var canMorph = function (img) {
      if (reduce || !document.startViewTransition || !img) return false;
      var r = img.getBoundingClientRect();
      return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
    };
    var morph = function (from, to, update) {
      doc.classList.add("vt-lb");
      from.style.viewTransitionName = "lb-photo";
      var t = document.startViewTransition(function () {
        from.style.viewTransitionName = "";
        update();
        to.style.viewTransitionName = "lb-photo";
        if (to === lbImg && lbImg.decode) {
          return Promise.race([lbImg.decode().catch(function () {}), new Promise(function (r) { setTimeout(r, 450); })]);
        }
      });
      var clean = function () { to.style.viewTransitionName = ""; doc.classList.remove("vt-lb"); };
      t.finished.then(clean, clean);
    };
    var open = function (list, i) {
      items = list; lastFocus = document.activeElement;
      var thumb = list[i] && list[i].querySelector("img");
      var doOpen = function () {
        show(i, true);
        lb.classList.add("is-open");
        document.body.classList.add("menu-open");
      };
      if (canMorph(thumb)) morph(thumb, lbImg, doOpen); else doOpen();
      closeBtn.focus();
    };
    var close = function () {
      var thumb = items[idx] && items[idx].querySelector("img");
      var doClose = function () {
        lb.classList.remove("is-open");
        document.body.classList.remove("menu-open");
      };
      if (canMorph(thumb)) morph(lbImg, thumb, doClose); else doClose();
      if (lastFocus) lastFocus.focus();
    };
    galleries.forEach(function (g) {
      g.addEventListener("click", function (e) {
        var a = e.target.closest("a");
        if (!a || !g.contains(a)) return;
        e.preventDefault();
        var list = Array.prototype.slice.call(g.querySelectorAll("a")).filter(function (x) { return !x.hidden; });
        open(list, list.indexOf(a));
      });
    });
    prevBtn.addEventListener("click", function () { show(idx - 1); });
    nextBtn.addEventListener("click", function () { show(idx + 1); });
    closeBtn.addEventListener("click", close);
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.tagName === "FIGURE") close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("is-open")) return;
      if (e.key === "Tab") {
        var f = [prevBtn, nextBtn, closeBtn], i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? f.length - 1 : 1) + f.length) % f.length].focus();
      }
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    });
    var sx = null;
    lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
      sx = null;
    });
  }

  /* "Ver más fotos": muestra el siguiente bloque oculto */
  document.querySelectorAll("[data-more]").forEach(function (btn) {
    var target = document.getElementById(btn.getAttribute("data-more"));
    if (!target) return;
    btn.addEventListener("click", function () {
      var hidden = target.querySelectorAll("a[hidden]");
      for (var i = 0; i < Math.min(24, hidden.length); i++) hidden[i].hidden = false;
      if (target.querySelectorAll("a[hidden]").length === 0) btn.parentElement.remove();
    });
  });

  /* ---------- Formulario de consultas ---------- */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var motivo = new URLSearchParams(location.search).get("motivo");
    if (motivo) { var opt = form.querySelector('option[value="' + motivo + '"]'); if (opt) opt.selected = true; }
    var status = form.querySelector(".form-status");
    var say = function (msg) { status.textContent = msg; status.classList.add("is-visible"); };
    var rules = {
      nombre: function (v) { return v.trim().length >= 3 || "Escribí tu nombre y apellido."; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Revisá el email: parece incompleto."; },
      mensaje: function (v) { return v.trim().length >= 10 || "Contanos brevemente tu consulta."; }
    };
    var validate = function (name) {
      var input = form.elements[name];
      var res = rules[name](input.value);
      var field = input.closest(".field");
      field.classList.toggle("has-error", res !== true);
      field.querySelector(".error").textContent = res === true ? "" : res;
      input.setAttribute("aria-invalid", res === true ? "false" : "true");
      return res === true;
    };
    Object.keys(rules).forEach(function (n) {
      form.elements[n].addEventListener("blur", function () { if (form.elements[n].value) validate(n); });
      form.elements[n].addEventListener("input", function () {
        if (form.elements[n].closest(".field").classList.contains("has-error")) validate(n);
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = Object.keys(rules).map(validate).every(Boolean);
      if (!ok) { var bad = form.querySelector("[aria-invalid='true']"); if (bad) bad.focus(); return; }
      var data = new FormData(form);
      var endpoint = form.getAttribute("data-endpoint");
      var btn = form.querySelector("button[type=submit]");
      if (endpoint) {
        btn.disabled = true; btn.textContent = "Enviando...";
        fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
          .then(function (r) { if (!r.ok) throw new Error("envio"); form.reset(); say("Gracias. Recibimos tu consulta y te respondemos a la brevedad."); })
          .catch(function () { say("No pudimos enviar la consulta. Probá de nuevo o escribinos directo por email."); })
          .then(function () { btn.disabled = false; btn.textContent = "Enviar consulta"; });
      } else {
        var to = form.getAttribute("data-mailto");
        var body = "Nombre: " + data.get("nombre") + "\nLocalidad: " + (data.get("localidad") || "-") +
          "\nTeléfono: " + (data.get("telefono") || "-") + "\nEmail: " + data.get("email") +
          "\nMotivo: " + data.get("motivo") + "\n\n" + data.get("mensaje");
        location.href = "mailto:" + to + "?subject=" + encodeURIComponent("Consulta web: " + form.elements.motivo.selectedOptions[0].text) + "&body=" + encodeURIComponent(body);
        say("Se abrió tu programa de correo con la consulta lista para enviar.");
      }
    });
  }
  window.__mte = 1;
})();
