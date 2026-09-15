/* Contents dialog, reading position, language switch, color scheme. All
   optional: the rules are in the HTML and every link works without this. */
(function () {
  'use strict';

  /* Picking the scheme the system already uses clears the choice, so the page
     follows the system again without a third "auto" button. */
  var themeButtons = document.querySelectorAll('[data-theme-set]');
  if (themeButtons.length) {
    var systemDark = matchMedia('(prefers-color-scheme: dark)');
    var store = function (v) { try { v ? localStorage.setItem('theme', v) : localStorage.removeItem('theme'); } catch (e) {} };
    var paint = function () {
      var chosen = document.documentElement.dataset.theme;
      var on = chosen || (systemDark.matches ? 'dark' : 'light');
      themeButtons.forEach(function (b) { b.classList.toggle('on', b.dataset.themeSet === on); });
    };
    themeButtons.forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.themeSet, system = systemDark.matches ? 'dark' : 'light';
        if (v === system) { delete document.documentElement.dataset.theme; store(null); }
        else { document.documentElement.dataset.theme = v; store(v); }
        paint();
      });
    });
    systemDark.addEventListener('change', paint);
    paint();
  }

  var dialog = document.getElementById('toc-dialog');
  if (dialog && dialog.showModal) {
    document.querySelectorAll('[data-toc-open]').forEach(function (b) {
      b.addEventListener('click', function () { dialog.showModal(); });
    });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target.closest('a') || e.target.closest('[data-close]')) dialog.close();
    });
  }

  var index = document.querySelector('.index');
  var links = {};
  document.querySelectorAll('.index a[href^="#"]').forEach(function (a) {
    links[a.getAttribute('href').slice(1)] = a;
  });
  var heads = [].slice.call(document.querySelectorAll('.rules h2, .rules h3'));
  var current = null;

  /* scroll the column, not the page. The pads clear the mask's fades. */
  function reveal(a) {
    if (!index) return;
    var r = a.getBoundingClientRect(), box = index.getBoundingClientRect(), top = 40, bottom = 84;
    if (r.top < box.top + top) index.scrollTop += r.top - box.top - top;
    else if (r.bottom > box.bottom - bottom) index.scrollTop += r.bottom - box.bottom + bottom;
  }

  function setCurrent(id) {
    if (id === current) return;
    current = id;
    for (var key in links) links[key].classList.toggle('current', key === id);
    if (id && links[id]) reveal(links[id]);
    else if (!id && index) index.scrollTop = 0;
  }

  /* read positions rather than observed crossings, so jumping to an anchor or
     to the end of the book still lands on the right entry */
  var pending = false;
  function spy() {
    pending = false;
    var mark = Math.min(160, window.innerHeight * 0.25), found = null;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].getBoundingClientRect().top <= mark) found = heads[i].id; else break;
    }
    setCurrent(found);
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(spy); } }

  if (heads.length) {
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    spy();
  }

  /* land where the reader actually is, not on a #hash left over from an
     earlier click: on the cover that means the top of the other page */
  document.querySelectorAll('a[data-lang-switch]').forEach(function (a) {
    var base = a.getAttribute('href').split('#')[0];
    a.addEventListener('click', function () { a.href = base + (current ? '#' + current : ''); });
  });

  /* the cover art leans towards the cursor. Mouse only: on a touch screen
     there is nothing to follow, and the CSS drops it for reduced motion. */
  var cover = document.querySelector('.cover');
  if (cover && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var art = cover.querySelector('.cover-art'), frame = null;
    cover.addEventListener('pointermove', function (e) {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = null;
        var box = cover.getBoundingClientRect();
        art.style.setProperty('--px', ((e.clientX - box.left) / box.width * 2 - 1).toFixed(3));
        art.style.setProperty('--py', ((e.clientY - box.top) / box.height * 2 - 1).toFixed(3));
      });
    });
    cover.addEventListener('pointerleave', function () {
      art.style.setProperty('--px', 0);
      art.style.setProperty('--py', 0);
    });
  }
})();
