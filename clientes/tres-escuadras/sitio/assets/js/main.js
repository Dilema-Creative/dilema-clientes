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
    chips.forEach(function (ch) {
      ch.addEventListener("click", function () { setRegion(ch.getAttribute("data-region")); apply(); });
    });
    tagBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var t = b.getAttribute("data-tag"), i = activeTags.indexOf(t);
        if (i === -1) activeTags.push(t); else activeTags.splice(i, 1);
        b.setAttribute("aria-pressed", i === -1 ? "true" : "false");
        apply();
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

    var show = function (i) {
      idx = (i + items.length) % items.length;
      var a = items[idx];
      var next = a.getAttribute("href");
      if (lbImg.getAttribute("src") && lbImg.getAttribute("src") !== next && !reduce) {
        lbImg.classList.add("is-swapping");
        lbImg.addEventListener("load", function () { lbImg.classList.remove("is-swapping"); }, { once: true });
      }
      lbImg.src = next;
      lbImg.alt = (a.querySelector("img") || {}).alt || "";
      lbCap.textContent = (idx + 1) + " de " + items.length;
      var nxt = items[(idx + 1) % items.length];
      if (nxt) { var pre = new Image(); pre.src = nxt.getAttribute("href"); }
    };
    var open = function (list, i) {
      items = list; lastFocus = document.activeElement;
      show(i);
      lb.classList.add("is-open");
      document.body.classList.add("menu-open");
      closeBtn.focus();
    };
    var close = function () {
      lb.classList.remove("is-open");
      document.body.classList.remove("menu-open");
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
})();
