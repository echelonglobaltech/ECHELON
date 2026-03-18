/**
 * ECHELON v2 — Main Script
 * Canvas particles · 3D tilt · Magnetic buttons · GSAP · Lenis
 * Custom cursor · Theme toggle · Terminal GitHub API · Form
 */
(function () {
  'use strict';

  /* ─────────────────────────────────────────
     UTILS
  ───────────────────────────────────────── */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function sanitize(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(String(str)));
    return d.innerHTML;
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).toLowerCase());
  }

  function isUrl(v) {
    try { var u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:'; }
    catch (e) { return false; }
  }

  /* ─────────────────────────────────────────
     PRELOADER
  ───────────────────────────────────────── */
  function initPreloader() {
    var pl = qs('#preloader');
    if (!pl) return;
    // After CSS bar animation (~1.8s) + small delay, hide it
    setTimeout(function () {
      pl.classList.add('done');
      document.body.classList.add('loaded');
    }, 2100);
  }

  /* ─────────────────────────────────────────
     THEME
  ───────────────────────────────────────── */
  function getTheme() {
    try { return localStorage.getItem('echelon-theme'); } catch (e) { return null; }
  }
  function saveTheme(dark) {
    try { localStorage.setItem('echelon-theme', dark ? 'dark' : 'light'); } catch (e) {}
  }

  function applyTheme(dark) {
    var html = document.documentElement;
    var icon = qs('#theme-icon');
    if (dark) {
      html.classList.add('dark');
      html.classList.remove('light-mode');
      if (icon) icon.textContent = '🌙';
    } else {
      html.classList.remove('dark');
      html.classList.add('light-mode');
      if (icon) icon.textContent = '☀️';
    }
    saveTheme(dark);
    // Update canvas colors
    if (window._particles) window._particles.updateColors(dark);
  }

  function initTheme() {
    var stored = getTheme();
    var dark = stored !== null ? stored === 'dark' : true;
    applyTheme(dark);
    var btn = qs('#theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        applyTheme(!document.documentElement.classList.contains('dark'));
      });
    }
  }

  /* ─────────────────────────────────────────
     CANVAS PARTICLE NETWORK
  ───────────────────────────────────────── */
  function initCanvas() {
    var canvas = qs('#hero-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H, particles, isDark;

    function resize() {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    function isDarkMode() {
      return document.documentElement.classList.contains('dark');
    }

    var COLORS_DARK  = ['rgba(99,102,241,.6)', 'rgba(34,211,238,.5)', 'rgba(167,139,250,.55)'];
    var COLORS_LIGHT = ['rgba(99,102,241,.35)', 'rgba(34,211,238,.3)', 'rgba(99,102,241,.4)'];

    function getColors() { return isDarkMode() ? COLORS_DARK : COLORS_LIGHT; }

    function Particle() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - .5) * .4;
      this.vy = (Math.random() - .5) * .4;
      this.r  = Math.random() * 1.8 + .8;
      this.c  = getColors()[Math.floor(Math.random() * 3)];
      this.alpha = Math.random() * .5 + .2;
    }

    Particle.prototype.update = function () {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > W) this.vx *= -1;
      if (this.y < 0 || this.y > H) this.vy *= -1;
    };

    Particle.prototype.draw = function () {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.c;
      ctx.globalAlpha = this.alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    function init() {
      resize();
      particles = [];
      var count = Math.min(Math.floor(W * H / 14000), 80);
      for (var i = 0; i < count; i++) particles.push(new Particle());
    }

    function drawLines() {
      var threshold = 130;
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < threshold) {
            var alpha = (1 - dist / threshold) * (isDarkMode() ? .12 : .08);
            ctx.beginPath();
            ctx.strokeStyle = isDarkMode()
              ? 'rgba(99,102,241,' + alpha + ')'
              : 'rgba(99,102,241,' + alpha + ')';
            ctx.lineWidth = .8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    var rafId;
    function loop() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      drawLines();
      rafId = requestAnimationFrame(loop);
    }

    init();
    loop();

    window.addEventListener('resize', function () {
      resize();
      init();
    }, { passive: true });

    window._particles = {
      updateColors: function () {
        if (particles) {
          particles.forEach(function (p) {
            p.c = getColors()[Math.floor(Math.random() * 3)];
          });
        }
      }
    };
  }

  /* ─────────────────────────────────────────
     LENIS
  ───────────────────────────────────────── */
  var lenis;
  function initLenis() {
    if (typeof Lenis === 'undefined') return;
    lenis = new Lenis({
      duration: 1.3,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    if (window.gsap) {
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { requestAnimationFrame(raf); lenis.raf(t); })();
    }
  }

  /* ─────────────────────────────────────────
     SCROLL PROGRESS
  ───────────────────────────────────────── */
  function initScrollProgress() {
    var bar = qs('#scroll-prog');
    if (!bar) return;
    window.addEventListener('scroll', function () {
      var scrolled = document.documentElement.scrollTop;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (scrolled / max) + ')';
    }, { passive: true });
  }

  /* ─────────────────────────────────────────
     BACK TO TOP
  ───────────────────────────────────────── */
  function initBackToTop() {
    var btn = qs('#btt');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      btn.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    btn.addEventListener('click', function () {
      if (lenis) lenis.scrollTo(0, { duration: 1.4 });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ─────────────────────────────────────────
     NAVBAR
  ───────────────────────────────────────── */
  function initNavbar() {
    var nav = qs('#navbar');
    if (!nav) return;

    function tick() {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', tick, { passive: true });
    tick();

    // Smooth scroll anchor links
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      var target = qs(href);
      if (!target) return;
      e.preventDefault();
      closeMobile();
      if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Active section tracking
    var sections = qsa('section[id]');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        qsa('.nav-link').forEach(function (l) { l.classList.remove('active'); });
        var a = qs('.nav-link[href="' + id + '"]');
        if (a) a.classList.add('active');
      });
    }, { threshold: 0.25, rootMargin: '-80px 0px -20% 0px' });
    sections.forEach(function (s) { observer.observe(s); });
  }

  /* ─────────────────────────────────────────
     MOBILE MENU
  ───────────────────────────────────────── */
  function openMobile() {
    var mn = qs('#mobile-nav');
    var ham = qs('#hamburger');
    if (!mn) return;
    mn.classList.add('open');
    mn.setAttribute('aria-hidden', 'false');
    if (ham) { ham.classList.add('open'); ham.setAttribute('aria-expanded', 'true'); }
    document.body.classList.add('no-scroll');
  }
  function closeMobile() {
    var mn = qs('#mobile-nav');
    var ham = qs('#hamburger');
    if (!mn) return;
    mn.classList.remove('open');
    mn.setAttribute('aria-hidden', 'true');
    if (ham) { ham.classList.remove('open'); ham.setAttribute('aria-expanded', 'false'); }
    document.body.classList.remove('no-scroll');
  }
  function initMobileMenu() {
    var ham      = qs('#hamburger');
    var closeBtn = qs('.mn-close');
    var backdrop = qs('.mn-backdrop');
    
    // Updated logic: Toggle open/close based on current state
    if (ham) {
      ham.addEventListener('click', function() {
        var mn = qs('#mobile-nav');
        if (mn && mn.classList.contains('open')) {
          closeMobile();
        } else {
          openMobile();
        }
      });
    }
    
    if (closeBtn) closeBtn.addEventListener('click', closeMobile);
    if (backdrop) backdrop.addEventListener('click', closeMobile);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMobile(); });
  }

  /* ─────────────────────────────────────────
     CUSTOM CURSOR
  ───────────────────────────────────────── */
  function initCursor() {
    var dot  = qs('.cur-dot');
    var ring = qs('.cur-ring');
    if (!dot || !ring) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    var mx = -300, my = -300;
    var rx = -300, ry = -300;
    var pressing = false;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top  = my + 'px';
    }, { passive: true });

    document.addEventListener('mousedown', function () {
      pressing = true; ring.classList.add('clicking'); dot.style.transform = 'translate(-50%,-50%) scale(1.5)';
    });
    document.addEventListener('mouseup', function () {
      pressing = false; ring.classList.remove('clicking'); dot.style.transform = '';
    });

    // Hover state on interactive elements
    function addHoverListeners() {
      qsa('a,button,[tabindex="0"],.svc-card,.vault-card,.faq-q').forEach(function (el) {
        el.addEventListener('mouseenter', function () { ring.classList.add('hovering'); });
        el.addEventListener('mouseleave', function () { ring.classList.remove('hovering'); });
      });
    }
    addHoverListeners();

    (function loop() {
      requestAnimationFrame(loop);
      rx = lerp(rx, mx, .11);
      ry = lerp(ry, my, .11);
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
    })();
  }

  /* ─────────────────────────────────────────
     MAGNETIC BUTTONS
  ───────────────────────────────────────── */
  function initMagnetic() {
    qsa('.magnetic').forEach(function (btn) {
      var strength = 0.35;
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        var cx = rect.left + rect.width  / 2;
        var cy = rect.top  + rect.height / 2;
        var dx = (e.clientX - cx) * strength;
        var dy = (e.clientY - cy) * strength;
        btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
        btn.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
      });
      btn.addEventListener('mouseenter', function () {
        btn.style.transition = 'transform .2s ease';
      });
    });
  }

  /* ─────────────────────────────────────────
     3D TILT CARDS
  ───────────────────────────────────────── */
  function initTilt() {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    qsa('.svc-card, .vault-card').forEach(function (card) {
      var MAX = 10;
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var cx = rect.width  / 2;
        var cy = rect.height / 2;
        var rx = ((y - cy) / cy) * -MAX;
        var ry = ((x - cx) / cx) * MAX;
        var glowX = (x / rect.width  * 100).toFixed(1);
        var glowY = (y / rect.height * 100).toFixed(1);
        card.style.transform     = 'perspective(700px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateZ(8px)';
        card.style.setProperty('--mx', glowX + '%');
        card.style.setProperty('--my', glowY + '%');
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
        card.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1)';
        setTimeout(function () { card.style.transition = ''; }, 600);
      });
    });
  }

  /* ─────────────────────────────────────────
     COUNTER ANIMATION
  ───────────────────────────────────────── */
  function initCounters() {
    var counters = qsa('.counter');
    if (!counters.length) return;
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);
        animateCount(entry.target);
      });
    }, { threshold: .5 });
    counters.forEach(function (c) { io.observe(c); });
  }

  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-target'), 10) || 0;
    var dur = 2000;
    var start = performance.now();
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    (function step(now) {
      var p = Math.min((now - start) / dur, 1);
      el.textContent = Math.floor(ease(p) * target);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target;
    })(performance.now());
  }

  /* ─────────────────────────────────────────
     SCROLL REVEAL (IntersectionObserver)
  ───────────────────────────────────────── */
  function initReveal() {
    var items = qsa('.reveal, .reveal-left, .reveal-scale');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });

    // Stagger groups
    var staggerGroups = qsa('.stagger');
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    staggerGroups.forEach(function (g) { io2.observe(g); });
  }

  /* ─────────────────────────────────────────
     GSAP ANIMATIONS
  ───────────────────────────────────────── */
  function initGSAP() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    // Process connector line animation
    var connector = qs('#proc-connector');
    if (connector) {
      ScrollTrigger.create({
        trigger: connector,
        start: 'top 80%',
        once: true,
        onEnter: function () { connector.classList.add('animated'); }
      });
    }

    // Parallax on service cards
    qsa('.svc-card').forEach(function (card, i) {
      var depth = 0.04 + (i % 2) * 0.025;
      gsap.to(card, {
        scrollTrigger: {
          trigger: card.closest('section'),
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.5
        },
        y: -(60 * depth),
        ease: 'none'
      });
    });

    // Hero parallax
    gsap.to('.hero-visual', {
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      },
      y: 80,
      ease: 'none'
    });

    // Orb parallax
    var orbs = qsa('.orb');
    orbs.forEach(function (orb, i) {
      gsap.to(orb, {
        scrollTrigger: {
          trigger: '#hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 1.5 + i * .5
        },
        y: (i + 1) * 60,
        ease: 'none'
      });
    });
  }

  /* ─────────────────────────────────────────
     FAQ ACCORDION
  ───────────────────────────────────────── */
  function initFAQ() {
    var items = qsa('.faq-item');
    items.forEach(function (item) {
      var q = item.querySelector('.faq-q');
      if (!q) return;
      function toggle() {
        var isOpen = item.classList.contains('open');
        // Close all
        items.forEach(function (it) {
          it.classList.remove('open');
          var qa = it.querySelector('.faq-q');
          if (qa) qa.setAttribute('aria-expanded', 'false');
        });
        // Open clicked if was closed
        if (!isOpen) {
          item.classList.add('open');
          q.setAttribute('aria-expanded', 'true');
        }
      }
      q.addEventListener('click', toggle);
      q.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  /* ─────────────────────────────────────────
     TERMINAL — GitHub API Analyzer
  ───────────────────────────────────────── */
  function parseGHUrl(url) {
    try {
      var u = new URL(url);
      if (u.hostname !== 'github.com') return null;
      var parts = u.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
      if (parts.length < 2 || !parts[0] || !parts[1]) return null;
      return { owner: parts[0], repo: parts[1] };
    } catch (e) { return null; }
  }

  function ghGet(apiUrl, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiUrl, true);
    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
    xhr.timeout = 12000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status === 200) {
        try { cb(null, JSON.parse(xhr.responseText)); }
        catch (e) { cb('parse', null); }
      } else if (xhr.status === 403) { cb('rate-limit', null); }
      else { cb(xhr.status, null); }
    };
    xhr.onerror   = function () { cb('network', null); };
    xhr.ontimeout = function () { cb('timeout', null); };
    xhr.send();
  }

  function calcScores(repo, readme) {
    var now      = new Date();
    var pushed   = new Date(repo.pushed_at);
    var monthsAgo = (now - pushed) / (1000 * 60 * 60 * 24 * 30);

    // Code Quality
    var q = 20;
    if (repo.description && repo.description.length > 10) q += 14;
    if (monthsAgo < 3)       q += 20;
    else if (monthsAgo < 6)  q += 13;
    else if (monthsAgo < 12) q += 6;
    if (repo.size > 200)     q += 12;
    else if (repo.size > 50) q += 7;
    else if (repo.size > 10) q += 3;
    if (repo.topics && repo.topics.length >= 3) q += 12;
    else if (repo.topics && repo.topics.length >= 1) q += 6;
    if (repo.open_issues_count === 0)      q += 10;
    else if (repo.open_issues_count < 5)   q += 7;
    else if (repo.open_issues_count < 20)  q += 3;
    if (repo.stargazers_count > 0 || repo.forks_count > 0) q += 7;

    // Documentation
    var d = 10;
    if (readme) {
      d += 25;
      if (readme.size > 8000)       d += 30;
      else if (readme.size > 3000)  d += 22;
      else if (readme.size > 800)   d += 12;
      else                          d += 5;
    }
    if (repo.description && repo.description.length > 10) d += 13;
    if (repo.license)  d += 12;
    if (repo.has_wiki) d += 10;

    // Security
    var s = 25;
    if (repo.license)                    s += 28;
    if (monthsAgo < 3)                   s += 18;
    else if (monthsAgo < 6)              s += 12;
    else if (monthsAgo < 12)             s += 6;
    if (repo.open_issues_count < 3)      s += 14;
    else if (repo.open_issues_count < 10) s += 8;
    if (repo.description)                s += 10;

    return {
      q: Math.min(q, 100),
      d: Math.min(d, 100),
      s: Math.min(s, 100)
    };
  }

  function appendLine(html, cls) {
    var out = qs('#t-out');
    if (!out) return;
    var p = document.createElement('p');
    p.className = 't-line' + (cls ? ' ' + cls : '');
    p.innerHTML = html;
    out.appendChild(p);
    out.scrollTop = out.scrollHeight;
  }

  function setProgress(pct, label) {
    var fill  = qs('#t-fill');
    var plbl  = qs('#t-plbl');
    if (fill) fill.style.width = pct + '%';
    if (plbl) plbl.textContent = label;
  }

  function resetRunBtn() {
    var btn  = qs('#run-btn');
    var txt  = qs('#run-txt');
    var load = qs('#run-load');
    if (btn)  btn.disabled = false;
    if (txt)  txt.classList.remove('hidden');
    if (load) load.classList.add('hidden');
  }

  function initTerminal() {
    var runBtn = qs('#run-btn');
    var input  = qs('#repo-url');
    if (!runBtn || !input) return;

    runBtn.addEventListener('click', function () {
      var url = input.value.trim();
      if (!url) { appendLine('Enter a GitHub repository URL first.', 't-warn'); input.focus(); return; }
      if (!isUrl(url)) { appendLine('Invalid URL. Expected: https://github.com/…', 't-warn'); input.focus(); return; }
      runAnalysis(url);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') runBtn.click();
    });
  }

  function runAnalysis(url) {
    var prog    = qs('#t-prog');
    var result  = qs('#t-result');
    var out     = qs('#t-out');
    var txt     = qs('#run-txt');
    var load    = qs('#run-load');
    var runBtn  = qs('#run-btn');

    // Reset
    if (result)  result.classList.add('hidden');
    if (out)     out.innerHTML = '';
    if (prog)    prog.classList.remove('hidden');
    if (runBtn)  runBtn.disabled = true;
    if (txt)     txt.classList.add('hidden');
    if (load)    load.classList.remove('hidden');
    setProgress(0, 'Validating URL…');

    var parsed = parseGHUrl(url);
    if (!parsed) {
      if (prog) prog.classList.add('hidden');
      appendLine('Only GitHub repo URLs are supported.', 't-warn');
      appendLine('  Format: https://github.com/username/repo', 't-dim');
      resetRunBtn();
      return;
    }

    var sOwner = sanitize(parsed.owner);
    var sRepo  = sanitize(parsed.repo);
    var base   = 'https://api.github.com/repos/' + parsed.owner + '/' + parsed.repo;

    setProgress(12, 'Connecting to GitHub API…');
    appendLine('$ analyze ' + sOwner + '/' + sRepo, 't-dim');

    ghGet(base, function (err, repo) {
      if (err) {
        if (prog) prog.classList.add('hidden');
        var msg = err === 404          ? 'Repository not found or private.'
                : err === 'rate-limit' ? 'GitHub API rate limit reached (60/hr). Try in a few minutes.'
                : err === 'timeout'    ? 'Request timed out. Check your connection.'
                : 'GitHub API error: ' + sanitize(String(err));
        appendLine('✗ ' + msg, 't-warn');
        resetRunBtn();
        return;
      }

      setProgress(40, 'Scanning repository metadata…');
      appendLine('▶ <strong>' + sanitize(repo.full_name) + '</strong>', 't-success');
      appendLine('  ' + (repo.description ? sanitize(repo.description) : '<em>No description</em>'), 't-dim');
      appendLine(
        '  Language: ' + sanitize(repo.language || 'N/A') +
        ' &nbsp;·&nbsp; Size: ' + (repo.size > 1024 ? Math.round(repo.size / 1024) + ' MB' : repo.size + ' KB') +
        ' &nbsp;·&nbsp; ⭐ ' + repo.stargazers_count +
        ' &nbsp;·&nbsp; 🍴 ' + repo.forks_count,
        't-dim'
      );
      appendLine(
        '  Issues: ' + repo.open_issues_count +
        ' &nbsp;·&nbsp; License: ' + sanitize(repo.license ? repo.license.name : 'None') +
        ' &nbsp;·&nbsp; Pushed: ' + new Date(repo.pushed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        't-dim'
      );
      if (repo.topics && repo.topics.length > 0) {
        appendLine('  Topics: ' + repo.topics.slice(0, 6).map(sanitize).join(', '), 't-dim');
      }

      setProgress(65, 'Checking documentation…');
      appendLine('▶ Fetching README…', 't-dim');

      ghGet(base + '/readme', function (rErr, readme) {
        var hasReadme = !rErr && readme;
        if (hasReadme) {
          appendLine('  README: ✓ Found (' + (readme.size / 1024).toFixed(1) + ' KB)', 't-success');
        } else {
          appendLine('  README: ✗ Not found — documentation score will be low', 't-warn');
        }

        setProgress(85, 'Computing quality scores…');
        appendLine('▶ Evaluating signals…', 't-dim');

        setTimeout(function () {
          setProgress(100, 'Complete');
          var scores = calcScores(repo, hasReadme ? readme : null);
          var avg    = Math.round((scores.q + scores.d + scores.s) / 3);
          var grade  = avg >= 75 ? 'solid codebase ✓' : avg >= 55 ? 'room for improvement ⚠' : 'significant gaps ✗';

          appendLine(
            '✓ Done — Overall: <strong>' + avg + '/100</strong> — ' + grade,
            'th-success'
          );

          var resEl  = qs('#t-result');
          var subEl  = qs('#tr-sub');
          var scQ    = qs('#sc-q');
          var scD    = qs('#sc-d');
          var scS    = qs('#sc-s');

          if (prog) prog.classList.add('hidden');
          if (scQ) scQ.textContent = scores.q + '/100';
          if (scD) scD.textContent = scores.d + '/100';
          if (scS) scS.textContent = scores.s + '/100';
          if (subEl) subEl.textContent = sanitize(repo.full_name) + ' — Overall: ' + avg + '/100';
          if (resEl) resEl.classList.remove('hidden');
          resetRunBtn();
        }, 500);
      });
    });
  }

  /* ─────────────────────────────────────────
     CONTACT FORM
  ───────────────────────────────────────── */
  function initForm() {
    var form = qs('#contact-form');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateAll()) return;
      submitForm();
    });

    // Added f-num to the array
    ['f-name', 'f-email', 'f-num', 'f-type', 'f-msg'].forEach(function (id) {
      var el = qs('#' + id);
      if (!el) return;
      el.addEventListener('blur', function () { validateField(id); });
      el.addEventListener('input', function () {
        if (el.classList.contains('err')) validateField(id);
      });
    });
  }

  function validateField(id) {
    var el  = qs('#' + id);
    if (!el) return true;
    var val = el.value.trim();
    var msg = '';

    if (id === 'f-name') {
      if (!val) msg = 'Full name is required.';
      else if (val.length < 2) msg = 'Name must be at least 2 characters.';
    } else if (id === 'f-email') {
      if (!val) msg = 'Email address is required.';
      else if (!isEmail(val)) msg = 'Please enter a valid email address.';
    } else if (id === 'f-num') {
      if (!val) msg = 'Contact number is required.';
      else if (!/^\d{10}$/.test(val)) msg = 'Please enter a valid 10-digit number.';
    } else if (id === 'f-type') {
      if (!val) msg = 'Please select your project level.';
    } else if (id === 'f-msg') {
      if (!val) msg = 'Project brief is required.';
      else if (val.length < 20) msg = 'Please provide at least 20 characters.';
    }

    var errEl = qs('#err-' + id.replace('f-', ''));
    if (msg) {
      el.classList.add('err');
      if (errEl) errEl.textContent = sanitize(msg);
    } else {
      el.classList.remove('err');
      if (errEl) errEl.textContent = '';
    }
    return !msg;
  }

  function validateAll() {
    var ok = true;
    // Added f-num here too
    ['f-name', 'f-email', 'f-num', 'f-type', 'f-msg'].forEach(function (id) {
      if (!validateField(id)) ok = false;
    });
    return ok;
  }

  function submitForm() {
    var subBtn  = qs('#submit-btn');
    var subTxt  = qs('#sub-txt');
    var subLoad = qs('#sub-load');
    var fb      = qs('#form-feedback');

    if (subBtn)  subBtn.disabled = true;
    if (subTxt)  subTxt.classList.add('hidden');
    if (subLoad) subLoad.classList.remove('hidden');
    if (fb)      fb.classList.add('hidden');

    // Payload sending to Vercel backend
    var payload = {
      name: sanitize(qs('#f-name').value.trim()),
      email: sanitize(qs('#f-email').value.trim()),
      phone: sanitize(qs('#f-num').value.trim()),
      project_type: sanitize(qs('#f-type').value.trim()),
      message: sanitize(qs('#f-msg').value.trim())
    };

    sendEmail(payload, function (ok) {
      if (subBtn)  subBtn.disabled = false;
      if (subTxt)  subTxt.classList.remove('hidden');
      if (subLoad) subLoad.classList.add('hidden');
      if (ok) {
        showFeedback(true, "✓ Your enquiry has been received! We'll be in touch within 4 hours.");
        qs('#contact-form').reset();
        ['f-name','f-email','f-num','f-type','f-msg'].forEach(function(id){
          var el = qs('#'+id); if(el) el.classList.remove('err');
          var er = qs('#err-'+id.replace('f-','')); if(er) er.textContent='';
        });
      } else {
        showFeedback(false, 'Something went wrong. Please email hello@echelon.dev directly.');
      }
    });
  }

function sendEmail(payload, cb) {
  var formData = {
    access_key: "a32b2043-030c-4b78-a356-40258a27e8bb", 
    subject: "New ECHELON Enquiry: " + payload.name,
    from_name: payload.name,
    email: payload.email,
    phone: payload.phone,
    project_level: payload.project_type,
    message: payload.message
  };

  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'https://api.web3forms.com/submit', true);
  
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', 'application/json');
  
  xhr.onreadystatechange = function () {
    if (xhr.readyState !== 4) return;
    
    // --- THIS WILL PRINT THE EXACT ERROR IN YOUR CONSOLE ---
    console.log("Web3Forms Status:", xhr.status);
    console.log("Web3Forms Response:", xhr.responseText);
    // -------------------------------------------------------

    cb(xhr.status >= 200 && xhr.status < 300);
  };
  
  xhr.send(JSON.stringify(formData));
}
  function showFeedback(ok, msg) {
    var fb = qs('#form-feedback');
    if (!fb) return;
    fb.textContent = msg;
    fb.className = 'form-feedback ' + (ok ? 'ok' : 'fail');
    fb.classList.remove('hidden');
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ─────────────────────────────────────────
     HERO CANVAS RESIZE HANDLING
  ───────────────────────────────────────── */
  function syncHeroCanvas() {
    var canvas = qs('#hero-canvas');
    var hero   = qs('#hero');
    if (!canvas || !hero) return;
    function resize() {
      canvas.style.width  = hero.offsetWidth  + 'px';
      canvas.style.height = hero.offsetHeight + 'px';
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
  }

  /* ─────────────────────────────────────────
     INIT
  ───────────────────────────────────────── */
  function init() {
    initPreloader();
    initTheme();
    syncHeroCanvas();
    initCanvas();
    initLenis();
    initScrollProgress();
    initBackToTop();
    initNavbar();
    initMobileMenu();
    initCursor();
    initMagnetic();
    initTilt();
    initCounters();
    initReveal();
    initGSAP();
    initFAQ();
    initTerminal();
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
