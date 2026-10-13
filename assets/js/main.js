/* ============================================================================
   An Vu Gia Ltd — anvugia.io
   Progressive enhancement only. Every section of the page renders and reads
   correctly with JavaScript disabled; this file adds motion, navigation state
   and the interactive chart readout.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- year -- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------- sticky nav ----- */
  var nav = document.getElementById("nav");
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-navlink]"));
  var navSections = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute("data-navlink")); })
    .filter(Boolean);

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      ticking = false;
      if (nav) nav.classList.toggle("is-stuck", window.scrollY > 12);

      if (!navSections.length) return;
      var probe = window.scrollY + (window.innerHeight * 0.38);
      var current = null;
      for (var i = 0; i < navSections.length; i++) {
        if (navSections[i].offsetTop <= probe) current = navSections[i].id;
      }
      navLinks.forEach(function (a) {
        var on = a.getAttribute("data-navlink") === current;
        a.classList.toggle("is-active", on);
        if (on) { a.setAttribute("aria-current", "true"); }
        else { a.removeAttribute("aria-current"); }
      });
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* --------------------------------------------------- reveal on scroll --- */
  var revealTargets = document.querySelectorAll(".reveal, #monitor");

  if (!("IntersectionObserver" in window) || reduceMotion) {
    Array.prototype.forEach.call(revealTargets, function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    Array.prototype.forEach.call(revealTargets, function (el) { io.observe(el); });
  }

  /* --------------------------------------------------- equity chart ------- */
  /* Sample series and plot geometry are generated together, so the drawn path
     and the readout values can never disagree. See README for regeneration. */
  var SERIES = [100,101.11,100.85,99.93,100.84,100.72,100.16,100.2,99.74,99.6,99.52,99.09,99.64,100.01,99.13,99.97,100.25,100.87,101.09,100.69,101.28,101.17,101.22,102.74,102.56,102.23,101.67,102.76,103.04,102.51,101.81,102.27,103.78,103.84,105.42,105.76,105.63,104.75,101.02,100.25,98.2,97.03,96.32,96.62,96.32,96.03,94.23,93.13,92.41,90.28,91.18,90.11,91.15,90.89,91.36,90.54,91.82,94.71,95.73,95.08,94.8,95.27,96.21,97.91,96.54,97.13,98.56,99.2,98.61,99.04,97.98,96.58,97.57,99.01,99.04,98.91,99.12,98.96,98.43,98.63,97.4,97,96.44,95.81,95.61,97.11,97.61,97.17,97.01,96.27,96.5,95.97,96.14,97.24,96.88,96.55,96.4,96.4,97.75,97.85,97.62,99.38,99.86,100.91,101.23,100.29,100.72,100.3,99.63,100.62,101.27,101.58,101.79,102.29,102.61,102.62,102.22,102.02,103.51,104.44];
  var GEO = { x0: 44, x1: 620, y0: 30, y1: 208, lo: 89.02, hi: 106.85 };

  var chart = document.getElementById("equityChart");
  if (chart && SERIES.length > 1) {
    var svg = chart.querySelector("svg");
    var cross = chart.querySelector("#crosshair");
    var line = cross ? cross.querySelector("path") : null;
    var dot = cross ? cross.querySelector("circle") : null;
    var roDay = document.getElementById("roDay");
    var roVal = document.getElementById("roVal");
    var roChg = document.getElementById("roChg");
    var roDd = document.getElementById("roDd");
    var count = SERIES.length;

    /* Maximum drawdown from the running peak, derived rather than hardcoded so
       the label can never drift away from the plotted series. */
    var peak = -Infinity;
    var mdd = 0;
    for (var k = 0; k < count; k++) {
      peak = Math.max(peak, SERIES[k]);
      mdd = Math.min(mdd, SERIES[k] / peak - 1);
    }
    if (roDd) roDd.textContent = "\u2212" + Math.abs(mdd * 100).toFixed(2) + "%";

    var px = function (i) {
      return GEO.x0 + (i * (GEO.x1 - GEO.x0)) / (count - 1);
    };
    var py = function (v) {
      return GEO.y1 - ((v - GEO.lo) / (GEO.hi - GEO.lo)) * (GEO.y1 - GEO.y0);
    };
    var fmt = function (n) { return n.toFixed(2); };

    function show(i) {
      i = Math.max(0, Math.min(count - 1, i));
      var v = SERIES[i];
      var x = px(i);
      var y = py(v);
      if (line) line.setAttribute("d", "M" + x.toFixed(2) + " " + GEO.y0 + "V" + GEO.y1);
      if (dot) { dot.setAttribute("cx", x.toFixed(2)); dot.setAttribute("cy", y.toFixed(2)); }
      if (cross) cross.setAttribute("opacity", "1");
      if (roDay) roDay.textContent = "D" + (i + 1);
      if (roVal) roVal.textContent = fmt(v);
      if (roChg) {
        var chg = (v / SERIES[0] - 1) * 100;
        roChg.textContent = (chg >= 0 ? "+" : "\u2212") + Math.abs(chg).toFixed(2) + "%";
        roChg.classList.toggle("is-up", chg >= 0);
        roChg.classList.toggle("is-down", chg < 0);
      }
    }

    function hide() { if (cross) cross.setAttribute("opacity", "0"); }

    function indexFromEvent(evt) {
      var pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      var ctm = svg.getScreenCTM();
      if (!ctm) return null;
      var local = pt.matrixTransform(ctm.inverse());
      var step = (GEO.x1 - GEO.x0) / (count - 1);
      return Math.round((local.x - GEO.x0) / step);
    }

    svg.addEventListener("pointermove", function (evt) {
      var i = indexFromEvent(evt);
      if (i !== null) show(i);
    });
    svg.addEventListener("pointerleave", hide);
    svg.addEventListener("pointerdown", function (evt) {
      var i = indexFromEvent(evt);
      if (i !== null) show(i);
    });

    /* Keyboard scrubbing: the chart is a data readout, so it should be
       reachable and inspectable without a pointer. */
    svg.setAttribute("tabindex", "0");
    svg.setAttribute("aria-describedby", "chartHint");
    var kbdIndex = count - 1;
    svg.addEventListener("keydown", function (evt) {
      var k = evt.key;
      if (k === "ArrowRight" || k === "ArrowUp") { kbdIndex += evt.shiftKey ? 10 : 1; }
      else if (k === "ArrowLeft" || k === "ArrowDown") { kbdIndex -= evt.shiftKey ? 10 : 1; }
      else if (k === "Home") { kbdIndex = 0; }
      else if (k === "End") { kbdIndex = count - 1; }
      else { return; }
      evt.preventDefault();
      show(kbdIndex);
    });
    svg.addEventListener("focus", function () { show(kbdIndex); });
    svg.addEventListener("blur", hide);

    show(count - 1);
    hide();
  }
})();
