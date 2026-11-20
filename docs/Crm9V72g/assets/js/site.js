/*
 * Behaviour for the generated portfolio page: scroll reveal, the project reader (with
 * #/p/<id> links and the back button), the image viewer, and the palette picker.
 * All content is already in the page, built by build.py.
 */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const root = document.documentElement;

  const ICON = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    left: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    zoom: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2M11 8v6M8 11h6"/></svg>'
  };

  /* ------------------------------------------------------------------ helpers */
  function trapFocus(container, e) {
    if (e.key !== "Tab") return;
    const nodes = $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
      .filter((n) => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }
  const anyOpen = () => !!document.querySelector(".reader.is-open, .lb.is-open");
  const lock = () => root.classList.add("pf-lock");
  const unlock = () => { if (!anyOpen()) root.classList.remove("pf-lock"); };

  /* ------------------------------------------------------------ scroll reveal */
  (function reveal() {
    const items = $$("[data-reveal]");
    if (reduced.matches || !("IntersectionObserver" in window)) { items.forEach((el) => el.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  })();

  /* -------------------------------------------------------------- image viewer */
  const lightbox = (() => {
    let el, items = [], index = 0, returnFocus = null;
    function build() {
      el = document.createElement("div");
      el.className = "lb";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("aria-label", "Image viewer");
      el.innerHTML = `
        <div class="lb-bar"><span class="lb-count" aria-live="polite"></span>
          <button class="lb-zoom" type="button" aria-label="Toggle zoom">${ICON.zoom}</button>
          <button class="lb-close" type="button" aria-label="Close image viewer">${ICON.close}</button></div>
        <div class="lb-stage"><img class="lb-img" alt="">
          <button class="lb-nav lb-prev" type="button" aria-label="Previous image">${ICON.left}</button>
          <button class="lb-nav lb-next" type="button" aria-label="Next image">${ICON.right}</button></div>
        <div class="lb-cap"><span class="lb-kind sc"></span><span class="lb-text"></span></div>`;
      document.body.appendChild(el);
      $(".lb-close", el).addEventListener("click", close);
      $(".lb-prev", el).addEventListener("click", () => go(-1));
      $(".lb-next", el).addEventListener("click", () => go(1));
      $(".lb-zoom", el).addEventListener("click", () => el.classList.toggle("is-zoomed"));
      $(".lb-img", el).addEventListener("click", () => el.classList.toggle("is-zoomed"));
      $(".lb-stage", el).addEventListener("click", (e) => { if (e.target === e.currentTarget) close(); });
      el.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { e.stopPropagation(); close(); }
        else if (e.key === "ArrowLeft") go(-1);
        else if (e.key === "ArrowRight") go(1);
        else trapFocus(el, e);
      });
      let x0 = null;
      el.addEventListener("touchstart", (e) => { x0 = el.classList.contains("is-zoomed") ? null : e.touches[0].clientX; }, { passive: true });
      el.addEventListener("touchend", (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        x0 = null;
      });
    }
    function show() {
      const item = items[index], img = $(".lb-img", el);
      img.style.opacity = "0";
      img.onload = () => { img.style.opacity = "1"; };
      img.src = item.src;
      img.alt = item.caption;
      $(".lb-count", el).textContent = items.length > 1 ? `${index + 1} / ${items.length}` : "";
      const kind = $(".lb-kind", el);
      kind.textContent = item.label;
      kind.classList.toggle("mock", item.mock);
      $(".lb-text", el).textContent = item.caption;
      $$(".lb-nav", el).forEach((b) => { b.hidden = items.length < 2; });
      el.classList.remove("is-zoomed");
    }
    function go(step) { if (items.length < 2) return; index = (index + step + items.length) % items.length; show(); }
    function open(list, start) {
      if (!el) build();
      items = list; index = start || 0;
      returnFocus = document.activeElement;
      show();
      el.classList.add("is-open");
      lock();
      $(".lb-close", el).focus({ preventScroll: true });
    }
    function close() {
      if (!el || !el.classList.contains("is-open")) return;
      el.classList.remove("is-open", "is-zoomed");
      unlock();
      if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
    }
    return { open, close, isOpen: () => !!el && el.classList.contains("is-open") };
  })();

  /* ------------------------------------------------------------- project reader */
  const reader = $("#reader"), art = $("#r-article");
  let returnFocus = null;
  const hashId = () => { const m = location.hash.match(/^#\/p\/([\w-]+)/); return m ? m[1] : null; };

  function open(id, fromHistory) {
    const tpl = document.getElementById("p-" + id);
    if (!tpl) return;
    if (!reader.classList.contains("is-open")) returnFocus = document.activeElement;
    art.replaceChildren(tpl.content.cloneNode(true));
    $("#r-crumb").textContent = tpl.dataset.crumb;
    const figs = $$("figure.fig", art).map((f) => {
      const k = $(".k", f);
      return { src: $("img", f).src, caption: $(".cap", f).textContent, label: k ? k.textContent : "", mock: !!k && k.classList.contains("mock") };
    });
    $$(".fig-open", art).forEach((b, i) => b.addEventListener("click", () => lightbox.open(figs, i)));
    reader.scrollTop = 0;
    reader.classList.add("is-open");
    reader.setAttribute("aria-hidden", "false");
    lock();
    $(".r-title", art).focus({ preventScroll: true });
    if (!fromHistory && hashId() !== id) history.pushState({ pf: id }, "", "#/p/" + id);
  }
  function close(fromHistory) {
    if (!reader.classList.contains("is-open")) return;
    reader.classList.remove("is-open");
    reader.setAttribute("aria-hidden", "true");
    unlock();
    if (returnFocus && returnFocus.focus) returnFocus.focus({ preventScroll: true });
    if (!fromHistory) {
      if (history.state && history.state.pf) history.back();
      else if (hashId()) history.replaceState(null, "", location.pathname + location.search);
    }
  }
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open]");
    if (t) open(t.dataset.open);
  });
  $("#r-close").addEventListener("click", () => close());
  reader.addEventListener("keydown", (e) => {
    if (lightbox.isOpen()) return;
    if (e.key === "Escape") close(); else trapFocus(reader, e);
  });
  window.addEventListener("popstate", () => { const id = hashId(); id ? open(id, true) : close(true); });
  if (hashId()) open(hashId(), true);

  /* ------------------------------------------------------------- palette picker */
  const pal = $("#pal");
  if (pal) {
    const btn = $("#pal-btn"), menu = $("#pal-menu"), code = $("#pal-code");
    const mark = () => {
      const cur = root.getAttribute("data-palette");
      $$("[data-pal]", menu).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pal === cur)));
      if (code) code.textContent = "palette: " + cur;
    };
    const setOpen = (on) => { menu.hidden = !on; btn.setAttribute("aria-expanded", String(on)); };
    btn.addEventListener("click", () => setOpen(menu.hidden));
    menu.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pal]");
      if (!b) return;
      root.setAttribute("data-palette", b.dataset.pal);
      try { localStorage.setItem("pf-palette", b.dataset.pal); } catch (err) { /* private mode */ }
      mark();
    });
    document.addEventListener("click", (e) => { if (!pal.contains(e.target)) setOpen(false); });
    pal.addEventListener("keydown", (e) => { if (e.key === "Escape") { setOpen(false); btn.focus(); } });
    mark();
  }
})();
