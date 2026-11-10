/* =========================================================
   ROMEIRO DEVELOPER — Interações
   Tudo funciona sem as bibliotecas: GSAP/Lenis apenas refinam.
   ========================================================= */
(() => {
  "use strict";

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const RM = mqReduce.matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  let menuOpen = false;
  root.classList.add("is-ready");

  /* ---------- Ano ---------- */
  const year = $("#current-year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Rolagem suave ---------- */
  let lenis = null;
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  if (!RM && typeof window.Lenis === "function") {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });
    if (hasGSAP) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollToTarget(hash) {
    const target = hash === "#inicio" || hash === "#topo" ? null : document.querySelector(hash);
    if (hash !== "#inicio" && hash !== "#topo" && !target) return false;
    const done = () => {
      const el = target || $("#inicio");
      if (!el) return;
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    };
    if (lenis) {
      lenis.scrollTo(target || 0, { offset: 0, duration: 1.4, onComplete: done });
    } else {
      if (target) target.scrollIntoView({ behavior: RM ? "auto" : "smooth" });
      else window.scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" });
      done();
    }
    return true;
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute("href");
    if (hash.length < 2) return;
    if (menuOpen) closeMenu(false);
    if (scrollToTarget(hash)) {
      e.preventDefault();
      if (history.replaceState) history.replaceState(null, "", hash === "#inicio" ? location.pathname : hash);
    }
  });

  /* ---------- Cabeçalho ---------- */
  const header = $(".header");
  let lastY = window.scrollY;
  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 8);
    if (!menuOpen) header.classList.toggle("is-hidden", y > 640 && y > lastY + 2);
    if (y < lastY - 2 || y < 640) header.classList.remove("is-hidden");
    lastY = y;
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Menu (celular) ---------- */
  const toggle = $(".menu-toggle");
  const menu = $("#menu");

  function openMenu() {
    menuOpen = true;
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    toggle.querySelector(".menu-toggle__text").textContent = "Fechar";
    root.classList.add("menu-open");
    header.classList.remove("is-hidden");
    if (lenis) lenis.stop();
    const first = $("a", menu);
    if (first) first.focus();
  }
  function closeMenu(returnFocus = true) {
    menuOpen = false;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.querySelector(".menu-toggle__text").textContent = "Menu";
    root.classList.remove("menu-open");
    if (lenis) lenis.start();
    if (returnFocus) toggle.focus();
  }
  if (toggle && menu) {
    toggle.addEventListener("click", () => (menuOpen ? closeMenu() : openMenu()));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menuOpen) closeMenu();
    });
    window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
      if (e.matches && menuOpen) closeMenu(false);
    });
  }

  /* ---------- Link ativo + barra mobile ---------- */
  const navLinks = $$('.nav a[href^="#"]');
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = "#" + en.target.id;
        navLinks.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach((s) => io.observe(s));

    const bar = $(".mobile-bar");
    const contact = $("#contato");
    if (bar && contact) {
      new IntersectionObserver(([en]) => bar.classList.toggle("is-hidden", en.isIntersecting), { threshold: .15 })
        .observe(contact);
    }
  }

  /* =========================================================
     HERO · introdução + raio-X
     ========================================================= */
  const xray = $("[data-xray]");
  const view = xray ? $("[data-xray-view]", xray) : null;
  let lens = null;

  if (view) {
    const cur = { x: 0, y: 0, r: 0 };
    const tgt = { x: 0, y: 0, r: 0 };
    let raf = null;
    let interacting = false;
    let started = false;

    const radius = () => Math.round(clamp(view.clientWidth * .14, 58, 120));
    const park = () => ({ x: view.clientWidth * .73, y: view.clientHeight * .5 });

    const apply = () => {
      view.style.setProperty("--x", cur.x.toFixed(1) + "px");
      view.style.setProperty("--y", cur.y.toFixed(1) + "px");
      view.style.setProperty("--r", cur.r.toFixed(1) + "px");
    };
    const tick = () => {
      const k = RM ? 1 : .16;
      cur.x += (tgt.x - cur.x) * k;
      cur.y += (tgt.y - cur.y) * k;
      cur.r += (tgt.r - cur.r) * (RM ? 1 : .12);
      apply();
      const moving = Math.abs(tgt.x - cur.x) + Math.abs(tgt.y - cur.y) + Math.abs(tgt.r - cur.r) > .4;
      raf = moving ? requestAnimationFrame(tick) : null;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    const local = (e) => {
      const b = view.getBoundingClientRect();
      return { x: clamp(e.clientX - b.left, 0, b.width), y: clamp(e.clientY - b.top, 0, b.height) };
    };

    lens = {
      start() {
        if (started) return;
        started = true;
        xray.classList.add("is-live");
        const p = park();
        if (RM || !hasGSAP) {
          Object.assign(cur, p, { r: radius() });
          Object.assign(tgt, cur);
          apply();
          return;
        }
        // Varredura inicial: a lente atravessa a página e repousa sobre a imagem
        Object.assign(cur, { x: view.clientWidth * .12, y: view.clientHeight * .3, r: 0 });
        Object.assign(tgt, cur);
        apply();
        gsap.timeline()
          .to(tgt, { r: radius(), duration: .6, ease: "power2.out", onUpdate: kick })
          .to(tgt, { x: view.clientWidth * .42, y: view.clientHeight * .62, duration: 1.1, ease: "power2.inOut", onUpdate: () => { if (!interacting) kick(); } }, "<")
          .to(tgt, { x: p.x, y: p.y, duration: 1.1, ease: "power2.inOut", onUpdate: () => { if (!interacting) kick(); } });
      }
    };

    view.addEventListener("pointermove", (e) => {
      if (!started) lens.start();
      interacting = true;
      if (hasGSAP) gsap.killTweensOf(tgt, "x,y");
      Object.assign(tgt, local(e), { r: radius() });
      kick();
    });
    view.addEventListener("pointerdown", (e) => {
      if (!started) lens.start();
      interacting = true;
      if (hasGSAP) gsap.killTweensOf(tgt, "x,y");
      Object.assign(tgt, local(e), { r: radius() });
      kick();
    });
    view.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "touch") return;
      interacting = false;
      Object.assign(tgt, park());
      kick();
    });
    window.addEventListener("resize", () => {
      if (!started) return;
      if (!interacting) Object.assign(tgt, park());
      tgt.r = radius();
      kick();
    });
  }

  if (hasGSAP && !RM) {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.from(".hero__title .line > span", { yPercent: 115, duration: 1.15, stagger: .1 })
      .from("[data-hero-meta] > *", { opacity: 0, y: 10, duration: .7, stagger: .06 }, .15)
      .from("[data-hero-copy] > *", { opacity: 0, y: 18, duration: .9, stagger: .07 }, .4)
      .from(".xray .browser", { opacity: 0, y: 48, duration: 1.2 }, .3)
      .from(".demo--final .demo__nav, .demo--final .demo__text > *, .demo--final .demo__media, .demo--final .demo__card",
        { opacity: 0, y: 14, duration: .8, stagger: .045, ease: "power3.out" }, .7)
      .from(".xray__hint", { opacity: 0, duration: .6 }, 1.3)
      .add(() => lens && lens.start(), 1.35);
  } else if (lens) {
    lens.start();
  }

  /* =========================================================
     SOBRE · revelação por palavras
     ========================================================= */
  const statement = $("[data-words]");
  if (statement) {
    const words = statement.textContent.trim().split(/\s+/);
    statement.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
    if (hasGSAP && !RM) {
      gsap.fromTo($$(".w", statement), { opacity: .14 }, {
        opacity: 1,
        ease: "none",
        stagger: .05,
        scrollTrigger: { trigger: statement, start: "top 82%", end: "bottom 45%", scrub: true }
      });
    }
  }

  /* ---------- Revelações genéricas ---------- */
  if (hasGSAP && !RM) {
    $$("[data-reveal]").forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 32,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true }
      });
    });
  }

  /* =========================================================
     SERVIÇOS · lista sincronizada com o visor
     ========================================================= */
  const svcs = $$(".svc");
  const arts = $$(".visor .art");
  const visorNum = $("[data-visor-num]");
  const visorName = $("[data-visor-name]");

  function activateService(i) {
    svcs.forEach((s, k) => s.classList.toggle("is-active", k === i));
    arts.forEach((a, k) => a.classList.toggle("is-active", k === i));
    if (visorNum) visorNum.textContent = String(i + 1).padStart(2, "0");
    if (visorName && svcs[i]) visorName.textContent = $(".svc__title", svcs[i]).textContent;
  }

  // Cópias das ilustrações para o layout de uma coluna
  arts.forEach((art, i) => {
    const slot = svcs[i] && $(".svc__art-slot", svcs[i]);
    if (!slot) return;
    const frame = document.createElement("div");
    frame.className = "visor__frame";
    const clone = art.cloneNode(true);
    clone.classList.remove("is-active");
    frame.appendChild(clone);
    slot.appendChild(frame);
  });

  svcs.forEach((s, i) => {
    s.addEventListener("mouseenter", () => activateService(i));
    s.addEventListener("focus", () => activateService(i));
  });

  if ("IntersectionObserver" in window) {
    const ioSvc = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) activateService(svcs.indexOf(en.target));
      });
    }, { rootMargin: "-48% 0px -48% 0px" });
    svcs.forEach((s) => ioSvc.observe(s));

    const ioSlot = new IntersectionObserver((entries, obs) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const art = $(".art", en.target);
        if (art) art.classList.add("is-active");
        obs.unobserve(en.target);
      });
    }, { threshold: .35 });
    $$(".svc__art-slot").forEach((s) => ioSlot.observe(s));
  } else {
    $$(".svc__art-slot .art").forEach((a) => a.classList.add("is-active"));
  }

  /* =========================================================
     PROJETOS · rolagem dentro do navegador
     ========================================================= */
  const screen = $("[data-case-screen]");
  if (screen && hasGSAP && !RM) {
    const img = $("img", screen);
    gsap.to(img, {
      y: () => -Math.max(0, img.offsetHeight - screen.clientHeight),
      ease: "none",
      scrollTrigger: {
        trigger: screen,
        start: "top 70%",
        end: () => "+=" + Math.round(window.innerHeight * 1.1),
        scrub: .8,
        invalidateOnRefresh: true
      }
    });
    gsap.fromTo("[data-case-phone]", { yPercent: 10 }, {
      yPercent: -8,
      ease: "none",
      scrollTrigger: { trigger: ".case", start: "top bottom", end: "bottom top", scrub: true }
    });
  }

  /* =========================================================
     DIFERENCIAIS · laboratório responsivo
     ========================================================= */
  const lab = $("[data-lab]");
  if (lab) {
    const stage = $("[data-lab-stage]", lab);
    const frame = $("[data-lab-frame]", lab);
    const handle = $("[data-lab-handle]", lab);
    const out = $("[data-lab-px]", lab);
    const dev = $("[data-lab-device]", lab);
    const presets = $$("[data-preset]", lab);
    const mini = $(".mini", lab);
    let width = null; // null = largura máxima
    const timers = [];

    const minW = () => (window.innerWidth < 640 ? 240 : 300);
    const maxW = () => {
      const cs = getComputedStyle(stage);
      return Math.floor(stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    };
    const device = (w) => (w <= 420 ? "celular" : w <= 600 ? "tablet" : "desktop");

    function setWidth(v, animate = false) {
      const mx = maxW();
      const mn = Math.min(minW(), mx);
      width = v == null ? null : clamp(v, mn, mx);
      const val = width == null ? mx : width;
      frame.classList.toggle("is-anim", animate && !RM);
      frame.style.setProperty("--w", val + "px");
      out.textContent = String(Math.round(val));
      dev.textContent = device(val);
      handle.setAttribute("aria-valuemin", String(mn));
      handle.setAttribute("aria-valuemax", String(mx));
      handle.setAttribute("aria-valuenow", String(Math.round(val)));
      handle.setAttribute("aria-valuetext", `${Math.round(val)} pixels, layout ${device(val)}`);
      presets.forEach((b) => {
        const p = b.dataset.preset;
        b.classList.toggle("is-on", (p === "max" && width == null) || Number(p) === width);
      });
    }
    const clearTimers = () => { while (timers.length) clearTimeout(timers.pop()); };

    setWidth(null);
    window.addEventListener("resize", () => setWidth(width));

    presets.forEach((b) => b.addEventListener("click", () => {
      clearTimers();
      setWidth(b.dataset.preset === "max" ? null : Number(b.dataset.preset), true);
    }));

    // Arrastar
    let drag = null;
    handle.addEventListener("pointerdown", (e) => {
      clearTimers();
      drag = { x: e.clientX, w: frame.getBoundingClientRect().width };
      handle.setPointerCapture(e.pointerId);
      handle.classList.add("is-drag");
      e.preventDefault();
    });
    handle.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const next = drag.w + (e.clientX - drag.x);
      setWidth(next >= maxW() - 2 ? null : next);
    });
    const endDrag = () => { drag = null; handle.classList.remove("is-drag"); };
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);

    // Teclado
    handle.addEventListener("keydown", (e) => {
      const cur = width == null ? maxW() : width;
      const step = e.shiftKey ? 80 : 20;
      let next = null;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = cur - step;
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = cur + step;
      else if (e.key === "Home") next = minW();
      else if (e.key === "End") next = maxW();
      else return;
      e.preventDefault();
      clearTimers();
      setWidth(next >= maxW() ? null : next);
    });

    // Princípios → destaques
    const regions = {
      brand: ["brand", "brand-img"],
      responsive: [],
      nav: ["nav", "nav-btn"],
      grid: ["grid"],
      copy: ["copy"],
      code: ["code"]
    };
    const prs = $$(".pr");
    function clearHighlights() {
      $$(".is-hl", mini).forEach((el) => el.classList.remove("is-hl"));
      frame.classList.remove("is-hl-frame");
    }
    prs.forEach((btn) => btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-pressed") === "true";
      prs.forEach((b) => b.setAttribute("aria-pressed", "false"));
      clearHighlights();
      clearTimers();
      if (on) return;
      btn.setAttribute("aria-pressed", "true");
      const key = btn.dataset.region;
      (regions[key] || []).forEach((r) => {
        const el = $(`[data-region-el="${r}"]`, mini);
        if (el) el.classList.add("is-hl");
      });
      if (key === "responsive") {
        frame.classList.add("is-hl-frame");
        if (RM) { setWidth(375); return; }
        setWidth(375, true);
        timers.push(setTimeout(() => setWidth(768, true), 1400));
        timers.push(setTimeout(() => setWidth(null, true), 2800));
      }
    }));
  }

  /* =========================================================
     PROCESSO · a página se constrói conforme a rolagem
     ========================================================= */
  const stageEl = $("[data-stage]");
  const steps = $$(".step");
  if (stageEl && steps.length) {
    const count = $("[data-stage-count]", stageEl);
    const name = $("[data-stage-name]", stageEl);
    const meter = $("[data-stage-meter]", stageEl);
    const total = steps.length;
    let current = 0;

    function setStep(n) {
      if (n === current) return;
      current = n;
      for (let k = 1; k <= total; k++) stageEl.classList.toggle("is-s" + k, k <= n);
      steps.forEach((s) => s.classList.toggle("is-active", Number(s.dataset.step) === n));
      count.textContent = `${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
      name.textContent = $("h3", steps[n - 1]).textContent;
      meter.style.transform = `scaleX(${n / total})`;
    }
    setStep(1);

    if ("IntersectionObserver" in window) {
      const ioStep = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) setStep(Number(en.target.dataset.step));
        });
      }, { rootMargin: "-52% 0px -38% 0px" });
      steps.forEach((s) => ioStep.observe(s));
    }
  }

  /* =========================================================
     CONTATO · mini briefing para WhatsApp
     ========================================================= */
  const form = $("[data-brief]");
  if (form) {
    const preview = $("[data-brief-preview]", form);
    const hidden = $("[data-brief-text]", form);
    const PHONE = "5522992169395";

    function build() {
      const fd = new FormData(form);
      const nome = String(fd.get("nome") || "").trim();
      const negocio = String(fd.get("negocio") || "").trim();
      const tipo = fd.get("tipo") || "um projeto";
      const momento = fd.get("momento") || "";
      let msg = "Olá!";
      if (nome) msg += ` Meu nome é ${nome}.`;
      if (negocio) msg += ` Meu negócio: ${negocio}.`;
      msg += ` Quero conversar sobre ${tipo}. ${momento}`.trimEnd();
      preview.textContent = msg;
      hidden.value = msg;
      return msg;
    }
    form.addEventListener("input", build);
    form.addEventListener("change", build);
    build();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const url = `https://wa.me/${PHONE}?text=${encodeURIComponent(build())}`;
      const w = window.open(url, "_blank");
      if (w) w.opener = null;
      else window.location.href = url;
    });
  }

  /* ---------- Recalcular após fontes e imagens ---------- */
  if (hasGSAP) {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener("load", () => ScrollTrigger.refresh());
  }
})();
