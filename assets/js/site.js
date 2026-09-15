/* Contents dialog, reading position, language switch. All optional: the rules
   are in the HTML and every link works without this. */
(function () {
  'use strict';

  var dialog = document.getElementById('toc-dialog');
  if (dialog && dialog.showModal) {
    document.querySelectorAll('[data-toc-open]').forEach(function (b) {
      b.addEventListener('click', function () { dialog.showModal(); });
    });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target.closest('a') || e.target.closest('[data-close]')) dialog.close();
    });
  }

  /* carry the current #section across the language switch */
  document.querySelectorAll('a[data-lang-switch]').forEach(function (a) {
    var href = a.getAttribute('href');
    a.addEventListener('click', function () { a.href = href.split('#')[0] + location.hash; });
  });

  var index = document.querySelector('.index');
  var links = {};
  document.querySelectorAll('.index a[href^="#"]').forEach(function (a) {
    links[a.getAttribute('href').slice(1)] = a;
  });
  var heads = [].slice.call(document.querySelectorAll('.rules h2, .rules h3'));
  if (!heads.length) return;
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

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  spy();
})();
