/* Aplica el tema guardado antes de pintar, para que no parpadee. Va en archivo propio por la CSP. */
(function () {
  try {
    var t = localStorage.getItem('momo-tema');
    if (t === 'claro' || t === 'oscuro') document.documentElement.setAttribute('data-theme', t === 'claro' ? 'light' : 'dark');
  } catch (e) { /* sin almacenamiento: sigue el sistema */ }
})();
