/* Evita el parpadeo: fija el tema antes de pintar. */
(function () {
  try {
    var t = localStorage.getItem('riva-sgi-tema');
    if (t === 'oscuro' || t === 'claro') {
      document.documentElement.setAttribute('data-tema', t);
    }
  } catch (e) {}
})();
