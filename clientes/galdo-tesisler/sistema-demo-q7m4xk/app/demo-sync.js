// Reemplazo de sync.js para la maqueta: sin servidor. Arranca con los datos de ejemplo (app/datos-ejemplo.js)
// y guarda lo que se cargue en el navegador de quien la mira. "Reiniciar" vuelve a los datos de ejemplo.
(function(){
'use strict';
var KEY='gtsa_maqueta_v1';
var t=null;
function guardar(){clearTimeout(t);t=setTimeout(function(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}},400);}
function pintarTemaBtn(){
  var claro=document.documentElement.getAttribute('data-theme')==='light';
  var b=document.getElementById('tema-btn');
  if(b){var x=claro?'Cambiar a modo oscuro':'Cambiar a modo claro';b.setAttribute('aria-label',x);b.title=x;}
}
window.GTSATema={alternar:function(){
  var aClaro=document.documentElement.getAttribute('data-theme')!=='light';
  if(aClaro)document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  try{localStorage.setItem('gtsa_tema',aClaro?'claro':'oscuro');}catch(e){}
  var m=document.querySelector('meta[name=theme-color]');
  if(m)m.setAttribute('content',aClaro?'#eef1f4':'#0e141c');
  pintarTemaBtn();
}};
function reiniciar(){
  if(!confirm('Volver a los datos de ejemplo? Se borra lo que cargaste en esta maqueta.'))return;
  try{localStorage.removeItem(KEY);}catch(e){}
  location.reload();
}
function iniciar(){
  var s=null;
  try{var g=localStorage.getItem(KEY);if(g)s=JSON.parse(g);}catch(e){s=null;}
  if(!s)s=JSON.parse(JSON.stringify(window.GTSA_DEMO));
  S=migrar(ensureShape(s));
  S.role='total';
  var un=document.getElementById('user-nombre');
  if(un)un.textContent='Datos de ejemplo';
  var salir=document.querySelector('.userchip .btn');
  if(salir){salir.textContent='Reiniciar';salir.title='Volver a los datos de ejemplo';}
  var st=document.getElementById('syncstate-txt');
  if(st)st.textContent='Maqueta';
  var tt=document.querySelector('.topbar .tt');
  if(tt&&!document.getElementById('demo-tag')){var tag=document.createElement('div');tag.id='demo-tag';
    tag.textContent='Maqueta · datos de ejemplo';
    tag.style.cssText='display:inline-block;margin-top:4px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:.02em;background:rgba(207,44,72,.14);color:#e35e78';
    tt.appendChild(tag);}
  pintarTemaBtn();
  document.body.classList.add('listo');
  render();
}
window.GTSASync={
  iniciar:iniciar,programar:guardar,salir:reiniciar,
  listo:function(){return true;},
  estado:function(){return 'ok';},
  pendientes:function(){return 0;},
  autor:function(){return null;}
};
iniciar();
})();
