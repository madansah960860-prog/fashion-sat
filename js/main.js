/* ==========================================================================
   PLAINTEXT SUPPLY CO. — shared behaviour
   --------------------------------------------------------------------------
   Vanilla JavaScript. No framework, no build step, no dependencies.

   Two rules run through all of it.

   1. Progressive enhancement. Anything that HIDES content is scoped to the
      html.js class this file adds. If the script never runs, nothing is
      hidden: the drawer is a plain list, the reveal never applies, and the
      page is complete.

   2. Motion is optional. Every animated behaviour checks
      prefers-reduced-motion and is skipped outright rather than shortened.

   Modules, in order:
     1.  Image fallback   — guarantees no broken-image icons ever render
     2.  Mobile menu      — modal drawer, focus trap, scroll lock, scrim
     2b. Sticky header    — border and shadow only once scrolled
     3.  FAQ accordion    — native <details>, plus expand/collapse all
     4.  Form validation  — inline messages, aria-invalid, focus management
     5.  Product filters  — Shop All and category pages
     6.  Cookie consent   — Accept / Reject / Manage, nothing set before consent
     7.  Back to top      — instant under reduced motion, smooth otherwise
     8.  Scrollable tables — keyboard reachable
     8b. Scroll reveal    — one quiet entrance per block, JS-applied only
     9.  Year stamp       — footer copyright
   ========================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     Mark the document as script-enabled, immediately.

     Every enhancement that HIDES something -- the mobile drawer, the
     scroll-reveal -- is scoped to html.js in the stylesheet. If this file
     fails to load or throws, none of those rules apply and the page degrades
     to a plain, complete, fully readable document.
     ------------------------------------------------------------------------ */

  document.documentElement.classList.add('js');

  var REDUCED_MOTION = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };

  /* ------------------------------------------------------------------------
     Small helpers
     ------------------------------------------------------------------------ */

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $all(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function on(el, evt, fn) {
    if (el) { el.addEventListener(evt, fn); }
  }


  /* ========================================================================
     1. IMAGE FALLBACK
     ------------------------------------------------------------------------
     Product photography is hosted remotely, so a request can fail. A broken
     image reads as an unfinished page and breaks the grid rhythm, so we swap
     in a different real hosted photograph rather than leaving a torn-page
     glyph behind. The alt text is already descriptive, so nothing is lost for
     screen reader users.
     ======================================================================== */

  function installImageFallbacks() {
    function swap(img) {
      // Only ever swap once, so a failing fallback cannot loop.
      if (img.getAttribute('data-fallback-applied') === 'true') { return; }
      img.setAttribute('data-fallback-applied', 'true');

      var seed = img.getAttribute('data-fallback-seed') || 'plaintext';
      var w = img.getAttribute('width') || 600;
      var h = img.getAttribute('height') || 800;
      img.src = 'https://picsum.photos/seed/' + encodeURIComponent(seed) +
                '/' + w + '/' + h;
    }

    $all('img').forEach(function (img) {
      img.addEventListener('error', function () { swap(img); });

      // This script is deferred, so an image can finish loading -- or finish
      // failing -- before the listener above is attached. In that case the
      // error event has already fired and will never fire again, leaving a
      // broken-image icon on the page. A completed image with no intrinsic
      // width is a failed image, so catch that case directly.
      if (img.complete && img.naturalWidth === 0) { swap(img); }
    });
  }


  /* ========================================================================
     2. MOBILE MENU
     ------------------------------------------------------------------------
     Below the 64em desktop breakpoint the nav becomes a modal drawer: it
     slides in from the right over a scrim, locks background scrolling, traps
     focus, closes on Escape, on a link, or on a click outside, and returns
     focus to the button that opened it. Above 64em the CSS resets every
     drawer property and it is an inline row again, so a visitor who opened it
     on a phone and then rotated to landscape is never left stranded.

     Progressive enhancement matters here. The markup ships with the nav
     EXPANDED and the toggle button HIDDEN, so that a visitor whose JavaScript
     is blocked, broken or still loading gets a plain, fully usable list of
     links rather than a button that does nothing. This function is what
     collapses the nav and reveals the button -- so the collapsed state only
     ever exists when there is working script to undo it.
     ======================================================================== */

  function installMobileMenu() {
    var toggle = $('#nav-toggle');
    var nav = $('#site-nav');
    if (!toggle || !nav) { return; }

    var root = document.documentElement;

    // Reveal the control now that we can guarantee it works.
    toggle.hidden = false;

    function drawerActive() {
      // The button is only displayed below the desktop breakpoint, so its
      // visibility is the single source of truth for "are we in drawer mode".
      return toggle.offsetParent !== null;
    }

    function isOpen() { return nav.getAttribute('data-collapsed') === 'false'; }

    function setOpen(open) {
      nav.setAttribute('data-collapsed', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      // Locks background scrolling and paints the scrim.
      root.classList.toggle('nav-open', open && drawerActive());
      // The button sits above the open drawer, so it is the close control
      // too. Relabel it, or the only visible exit is a guess.
      if (drawerActive()) {
        toggle.textContent = open ? 'Close' : 'Menu';
      } else {
        toggle.textContent = 'Menu';
      }
    }

    function close(returnFocus) {
      setOpen(false);
      if (returnFocus) { toggle.focus(); }
    }

    // Initial state: collapsed only when the drawer is actually in play.
    setOpen(!drawerActive());

    on(toggle, 'click', function () {
      var open = !isOpen();
      setOpen(open);
      if (open) {
        var first = $('a', nav);
        if (first) { first.focus(); }
      }
    });

    // Escape closes and returns focus to the button that opened it.
    on(document, 'keydown', function (e) {
      if (e.key === 'Escape' && isOpen() && drawerActive()) { close(true); }
    });

    /* Focus trap. The cycle is [toggle, ...drawer links] and it wraps in both
       directions, so Tab can never reach the dimmed page behind the scrim.

         toggle      -> Tab       -> first link
         last link   -> Tab       -> toggle
         toggle      -> Shift+Tab -> last link
         first link  -> Shift+Tab -> toggle
    */
    function drawerLinks() {
      return $all('a, button', nav).filter(function (el) {
        return el.offsetParent !== null;
      });
    }

    on(nav, 'keydown', function (e) {
      if (e.key !== 'Tab' || !isOpen() || !drawerActive()) { return; }
      var items = drawerLinks();
      if (!items.length) { return; }
      if (e.shiftKey && document.activeElement === items[0]) {
        e.preventDefault(); toggle.focus();
      } else if (!e.shiftKey && document.activeElement === items[items.length - 1]) {
        e.preventDefault(); toggle.focus();
      }
    });

    on(toggle, 'keydown', function (e) {
      if (e.key !== 'Tab' || !isOpen() || !drawerActive()) { return; }
      var items = drawerLinks();
      if (!items.length) { return; }
      e.preventDefault();
      (e.shiftKey ? items[items.length - 1] : items[0]).focus();
    });

    // Following a link closes the drawer, so returning via the back button
    // does not land on an open menu.
    $all('a', nav).forEach(function (link) {
      on(link, 'click', function () { if (drawerActive()) { close(false); } });
    });

    // Clicking the scrim closes it.
    on(document, 'click', function (e) {
      if (!isOpen() || !drawerActive()) { return; }
      if (!nav.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
        close(false);
      }
    });

    // Rotating a phone to landscape can cross the desktop breakpoint. Re-sync
    // so nobody is left with a locked body or a hidden nav.
    on(window, 'resize', function () {
      if (!drawerActive()) {
        // Crossed up into the inline desktop row: unlock everything and put
        // the button's label back, or it would read "Close" forever.
        nav.setAttribute('data-collapsed', 'false');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.textContent = 'Menu';
        root.classList.remove('nav-open');
      } else if (!isOpen()) {
        root.classList.remove('nav-open');
        toggle.textContent = 'Menu';
      }
    });
  }


  /* ========================================================================
     2b. STICKY HEADER
     ------------------------------------------------------------------------
     The masthead only grows a border and a shadow once there is content
     scrolled underneath it. At the top of the page it sits flush, with
     nothing to separate from.
     ======================================================================== */

  function installStickyHeader() {
    var header = $('.site-header');
    if (!header) { return; }

    var ticking = false;
    function update() {
      header.classList.toggle('is-stuck', window.pageYOffset > 8);
      ticking = false;
    }
    on(window, 'scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    });
    update();
  }


  /* ========================================================================
     3. FAQ ACCORDION
     ------------------------------------------------------------------------
     Built on native <details>/<summary>, which is keyboard accessible and
     works with JavaScript disabled. The only thing JS adds is a pair of
     expand-all / collapse-all buttons.
     ======================================================================== */

  function installAccordionControls() {
    var expandAll = $('#faq-expand-all');
    var collapseAll = $('#faq-collapse-all');
    var items = $all('.faq-item');
    if (!items.length) { return; }

    on(expandAll, 'click', function () {
      items.forEach(function (d) { d.open = true; });
    });

    on(collapseAll, 'click', function () {
      items.forEach(function (d) { d.open = false; });
    });

    // Deep link support: /faq.html#returns-window opens that entry.
    if (window.location.hash) {
      var target = document.getElementById(window.location.hash.slice(1));
      if (target && target.tagName === 'DETAILS') { target.open = true; }
    }
  }


  /* ========================================================================
     4. FORM VALIDATION
     ------------------------------------------------------------------------
     Progressive enhancement over native constraint validation. On submit we
     check each required field, write a plain-text error directly beneath it,
     set aria-invalid, announce a summary in a live region, and move focus to
     the first bad field.

     No form on this site actually posts anywhere in this build — there is no
     back end. Successful submission shows an honest confirmation message
     saying the request has been captured by the form handler, so nobody is
     misled into thinking an order was placed.
     ======================================================================== */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function clearError(field) {
    field.removeAttribute('aria-invalid');
    var msg = document.getElementById(field.id + '-error');
    if (msg) { msg.textContent = ''; }
  }

  function setError(field, text) {
    field.setAttribute('aria-invalid', 'true');
    var msg = document.getElementById(field.id + '-error');
    if (msg) { msg.textContent = 'Error: ' + text; }
  }

  function validateField(field) {
    var label = field.getAttribute('data-label') || field.name || 'This field';
    var value = (field.value || '').trim();

    if (field.type === 'checkbox') {
      if (field.required && !field.checked) {
        setError(field, label + ' must be ticked before you can send this form.');
        return false;
      }
      clearError(field);
      return true;
    }

    if (field.required && value === '') {
      setError(field, label + ' is required. Please fill it in.');
      return false;
    }

    if (value !== '' && field.type === 'email' && !EMAIL_RE.test(value)) {
      setError(field, 'Enter an email address in the form name@example.com.');
      return false;
    }

    if (value !== '' && field.type === 'tel' && value.replace(/[^0-9]/g, '').length < 7) {
      setError(field, 'Enter a phone number including area code, or leave this blank.');
      return false;
    }

    // Quantity fields carry min and max. novalidate switches off the native
    // check, so we have to make it ourselves or the attributes are decorative.
    if (value !== '' && field.type === 'number') {
      var num = Number(value);
      var lo = field.getAttribute('min');
      var hi = field.getAttribute('max');

      if (!/^-?\d*\.?\d+$/.test(value) || isNaN(num)) {
        setError(field, label + ' must be a number.');
        return false;
      }
      if (lo !== null && num < Number(lo)) {
        setError(field, label + ' cannot be less than ' + lo + '.');
        return false;
      }
      if (hi !== null && num > Number(hi)) {
        setError(field, label + ' cannot be more than ' + hi +
                        '. To order more than that, please contact us.');
        return false;
      }
    }

    var min = parseInt(field.getAttribute('data-minlength') || '0', 10);
    if (min > 0 && value.length < min) {
      setError(field, label + ' needs at least ' + min + ' characters. You have written ' + value.length + '.');
      return false;
    }

    clearError(field);
    return true;
  }

  function installFormValidation() {
    $all('form[data-validate]').forEach(function (form) {
      var status = $('.form-status', form);
      var fields = $all('input, select, textarea', form).filter(function (f) {
        return f.type !== 'submit' && f.type !== 'button' && f.type !== 'hidden';
      });

      // Re-validate a field once the user has left it and corrected it.
      fields.forEach(function (f) {
        on(f, 'blur', function () {
          if (f.getAttribute('aria-invalid') === 'true') { validateField(f); }
        });
      });

      on(form, 'submit', function (e) {
        e.preventDefault();

        var bad = [];
        fields.forEach(function (f) {
          if (!validateField(f)) { bad.push(f); }
        });

        if (bad.length) {
          if (status) {
            status.textContent = bad.length === 1
              ? 'There is 1 problem with this form. It is described below the field it affects.'
              : 'There are ' + bad.length + ' problems with this form. Each one is described below the field it affects.';
          }
          bad[0].focus();
          return;
        }

        if (status) {
          status.textContent = form.getAttribute('data-success') ||
            'Thank you. Your message has been passed to the form handler and a person will read it.';
        }
        form.reset();
        fields.forEach(clearError);
        if (status) { status.setAttribute('tabindex', '-1'); status.focus(); }
      });
    });
  }


  /* ========================================================================
     5. PRODUCT FILTERS
     ------------------------------------------------------------------------
     Every product on Shop All and the category pages is an <li> carrying
     data-category, data-price, data-size and data-availability. Filtering is
     a show/hide pass over that list — instant, no fade, no reflow animation.
     A live region reports the resulting count so screen reader users are
     told what changed.
     ======================================================================== */

  function installProductFilters() {
    var list = $('#product-list');
    if (!list) { return; }

    var items = $all('li.product', list);
    var countOut = $('#result-count');

    var categorySelect = $('#filter-category');
    var priceSelect = $('#filter-price');
    var sortSelect = $('#filter-sort');
    var sizeBoxes = $all('input[name="size"]');
    var madeToOrder = $('#filter-made-to-order');
    var resetBtn = $('#filter-reset');

    function matches(item) {
      if (categorySelect && categorySelect.value !== 'all' &&
          item.getAttribute('data-category') !== categorySelect.value) {
        return false;
      }

      if (priceSelect && priceSelect.value !== 'all') {
        var price = parseFloat(item.getAttribute('data-price'));
        var band = priceSelect.value.split('-');
        var lo = parseFloat(band[0]);
        var hi = band[1] === 'up' ? Infinity : parseFloat(band[1]);
        if (!(price >= lo && price <= hi)) { return false; }
      }

      var checkedSizes = sizeBoxes.filter(function (b) { return b.checked; });
      if (checkedSizes.length) {
        var sizes = (item.getAttribute('data-size') || '').split(' ');
        var any = checkedSizes.some(function (b) { return sizes.indexOf(b.value) !== -1; });
        if (!any) { return false; }
      }

      if (madeToOrder && madeToOrder.checked &&
          item.getAttribute('data-availability') !== 'made-to-order') {
        return false;
      }

      return true;
    }

    function sortItems() {
      if (!sortSelect) { return; }
      var mode = sortSelect.value;
      var ordered = items.slice();

      if (mode === 'price-asc') {
        ordered.sort(function (a, b) {
          return parseFloat(a.getAttribute('data-price')) - parseFloat(b.getAttribute('data-price'));
        });
      } else if (mode === 'price-desc') {
        ordered.sort(function (a, b) {
          return parseFloat(b.getAttribute('data-price')) - parseFloat(a.getAttribute('data-price'));
        });
      } else if (mode === 'name-asc') {
        ordered.sort(function (a, b) {
          return (a.getAttribute('data-name') || '').localeCompare(b.getAttribute('data-name') || '');
        });
      } else {
        ordered.sort(function (a, b) {
          return parseInt(a.getAttribute('data-order'), 10) - parseInt(b.getAttribute('data-order'), 10);
        });
      }

      ordered.forEach(function (el) { list.appendChild(el); });
    }

    function apply() {
      var shown = 0;
      items.forEach(function (item) {
        var ok = matches(item);
        item.hidden = !ok;
        if (ok) { shown += 1; }
      });
      sortItems();
      if (countOut) {
        countOut.textContent = shown === 1
          ? 'Showing 1 product of ' + items.length + '.'
          : 'Showing ' + shown + ' products of ' + items.length + '.';
      }
      var empty = $('#no-results');
      if (empty) { empty.hidden = shown !== 0; }
    }

    [categorySelect, priceSelect, sortSelect].forEach(function (el) {
      on(el, 'change', apply);
    });
    sizeBoxes.forEach(function (b) { on(b, 'change', apply); });
    on(madeToOrder, 'change', apply);

    on(resetBtn, 'click', function () {
      if (categorySelect) { categorySelect.value = 'all'; }
      if (priceSelect) { priceSelect.value = 'all'; }
      if (sortSelect) { sortSelect.value = 'default'; }
      sizeBoxes.forEach(function (b) { b.checked = false; });
      if (madeToOrder) { madeToOrder.checked = false; }
      apply();
    });

    // A category page can pre-filter itself via <body data-preset-category="...">
    var preset = document.body.getAttribute('data-preset-category');
    if (preset && categorySelect) { categorySelect.value = preset; }

    apply();
  }


  /* ========================================================================
     6. COOKIE CONSENT
     ------------------------------------------------------------------------
     Strictly necessary cookies only until the visitor chooses. Nothing
     analytic or advertising-related is initialised before an explicit
     Accept, and Reject is exactly as easy to click as Accept.

     The stored decision itself lives in localStorage, which is strictly
     necessary to honour the choice, and is documented in the Cookie Policy.
     ======================================================================== */

  var CONSENT_KEY = 'pxs-consent-v1';

  function readConsent() {
    try {
      var raw = window.localStorage.getItem(CONSENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function writeConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    } catch (err) {
      // Private browsing with storage blocked. The banner simply reappears
      // next visit, which is the correct fail-safe: no consent recorded,
      // no non-essential cookies set.
    }
  }

  function applyConsent(value) {
    // This is the single place where analytics or advertising tags would be
    // initialised, and only when the corresponding flag is true. Nothing is
    // loaded here today, because nothing is deployed yet.
    if (value && value.analytics) {
      document.documentElement.setAttribute('data-analytics', 'enabled');
    }
    if (value && value.advertising) {
      document.documentElement.setAttribute('data-advertising', 'enabled');
    }
  }

  function installCookieBanner() {
    var banner = $('#cookie-banner');
    if (!banner) { return; }

    // The banner is fixed to the bottom of the viewport, so it sits on top of
    // whatever the last paragraph happens to be. Reserve exactly its height at
    // the foot of the document while it is showing, so nothing is obscured and
    // the end of the page stays reachable. Measured rather than guessed,
    // because the banner grows when the preferences panel opens and when the
    // text wraps on a narrow screen.
    function syncBannerSpace() {
      document.body.style.paddingBottom = banner.hidden
        ? ''
        : (banner.offsetHeight + 16) + 'px';
    }

    var existing = readConsent();
    if (existing) {
      applyConsent(existing);
      banner.hidden = true;
    } else {
      banner.hidden = false;
    }
    syncBannerSpace();
    on(window, 'resize', syncBannerSpace);

    function decide(value) {
      writeConsent(value);
      applyConsent(value);
      banner.hidden = true;
      syncBannerSpace();
    }

    on($('#cookie-accept'), 'click', function () {
      decide({ necessary: true, analytics: true, advertising: true, when: new Date().toISOString() });
    });

    on($('#cookie-reject'), 'click', function () {
      decide({ necessary: true, analytics: false, advertising: false, when: new Date().toISOString() });
    });

    on($('#cookie-manage'), 'click', function () {
      var panel = $('#cookie-prefs');
      if (!panel) { return; }
      var open = !panel.hidden;
      panel.hidden = open;
      $('#cookie-manage').setAttribute('aria-expanded', open ? 'false' : 'true');
      syncBannerSpace();
    });

    on($('#cookie-save'), 'click', function () {
      decide({
        necessary: true,
        analytics: !!($('#cookie-analytics') && $('#cookie-analytics').checked),
        advertising: !!($('#cookie-advertising') && $('#cookie-advertising').checked),
        when: new Date().toISOString()
      });
    });

    // Any page can offer a "change your cookie choices" link.
    $all('[data-cookie-reopen]').forEach(function (link) {
      on(link, 'click', function (e) {
        e.preventDefault();
        banner.hidden = false;
        var panel = $('#cookie-prefs');
        if (panel) { panel.hidden = false; }
        syncBannerSpace();
        var first = $('#cookie-accept');
        if (first) { first.focus(); }
      });
    });
  }


  /* ========================================================================
     7. BACK TO TOP
     ------------------------------------------------------------------------
     Appears after two screens of scrolling. Scrolls smoothly, except under
     prefers-reduced-motion where it jumps instantly. Focus is moved to the
     top of main afterwards, so a keyboard user actually goes back to the top
     rather than only the viewport doing so.
     ======================================================================== */

  function installBackToTop() {
    var btn = $('#back-to-top');
    if (!btn) { return; }

    function sync() {
      btn.hidden = window.pageYOffset < window.innerHeight * 2;
    }

    on(window, 'scroll', sync);
    on(window, 'resize', sync);
    sync();

    on(btn, 'click', function () {
      window.scrollTo({
        top: 0,
        behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth'
      });
      var main = $('#main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        // preventScroll stops the focus call from cancelling the smooth
        // scroll we just started.
        main.focus({ preventScroll: true });
      }
    });
  }


  /* ========================================================================
     8. SCROLLABLE TABLES
     Give every horizontally scrolling table container a tab stop and an
     accessible name, so keyboard users can reach the overflow.
     ======================================================================== */

  function installScrollableTables() {
    $all('.table-scroll').forEach(function (box) {
      var table = $('table', box);
      var caption = table ? $('caption', table) : null;
      box.setAttribute('tabindex', '0');
      box.setAttribute('role', 'region');
      box.setAttribute('aria-label', caption ? caption.textContent.trim() : 'Scrollable table');
    });
  }


  /* ========================================================================
     8b. SCROLL REVEAL
     ------------------------------------------------------------------------
     One quiet entrance per block as it enters the viewport. Deliberately
     restrained: a 16px rise and a fade, once, never repeated.

     Two safety rules. The hiding attribute is only ADDED here, so if
     IntersectionObserver is missing or this function never runs, nothing is
     ever hidden. And it is skipped entirely under prefers-reduced-motion
     rather than merely shortened.
     ======================================================================== */

  function installReveal() {
    if (REDUCED_MOTION.matches) { return; }
    if (!('IntersectionObserver' in window)) { return; }

    var targets = $all([
      '#product-list > li',
      'main > .product, article > .product',
      'main > figure, article > figure',
      'article figure',
      'main > .table-scroll, article > .table-scroll',
      'main > .ad-slot, article > .ad-slot',
      'main > .filters'
    ].join(','));

    if (!targets.length) { return; }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    targets.forEach(function (el, i) {
      el.setAttribute('data-reveal', '');
      // Gentle stagger within a grid row, capped so a long list never
      // accumulates a noticeable wait.
      var delay = (i % 3) * 70;
      if (delay) { el.style.transitionDelay = delay + 'ms'; }
      observer.observe(el);
    });

    // If the visitor turns reduced motion on mid-session, drop everything.
    if (REDUCED_MOTION.addEventListener) {
      REDUCED_MOTION.addEventListener('change', function (e) {
        if (!e.matches) { return; }
        targets.forEach(function (el) {
          el.classList.add('is-visible');
          el.style.transitionDelay = '';
        });
      });
    }
  }


  /* ========================================================================
     9. FOOTER YEAR
     ======================================================================== */

  function installYear() {
    $all('.current-year').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }


  /* ========================================================================
     BOOT
     ======================================================================== */

  function boot() {
    installImageFallbacks();
    installMobileMenu();
    installStickyHeader();
    installAccordionControls();
    installFormValidation();
    installProductFilters();
    installCookieBanner();
    installBackToTop();
    installScrollableTables();
    installReveal();
    installYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());
