// Aplica el tema guardado ANTES del primer paint (por eso se carga sin defer).
// Vive en archivo aparte porque la CSP no permite scripts inline (script-src 'self').
try{if(localStorage.getItem('gtsa_tema')==='claro'){document.documentElement.setAttribute('data-theme','light');document.querySelector('meta[name=theme-color]').setAttribute('content','#eef1f4');}}catch(e){}
