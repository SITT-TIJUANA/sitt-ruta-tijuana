
// ── MAPA TABS ──────────────────────────────────────────────────────────────
function moverGliderTabs(btn){
  var glider=document.getElementById('tabsGlider');
  var container=document.getElementById('mapa-tabs');
  if(!glider||!container||!btn)return;
  var cRect=container.getBoundingClientRect();
  var bRect=btn.getBoundingClientRect();
  glider.style.width=bRect.width+'px';
  glider.style.transform='translateX('+(bRect.left-cRect.left)+'px)';
}
function mapaSwitchTab(idx,btn){
  [0,1,2,3,4].forEach(function(i){
    var t=document.getElementById('mapaTab'+i);
    if(t)t.style.display=i===idx?'block':'none';
  });
  document.querySelectorAll('.mtab').forEach(function(b){b.classList.remove('on');});
  if(btn)btn.classList.add('on');
  moverGliderTabs(btn);
  // Si el sheet está colapsado, ábrelo a la mitad al tocar un tab
  var sheet=document.getElementById('mapa-sheet');
  if(sheet&&sheet.dataset.state==='collapsed'&&typeof mapaSheetSet==='function'){
    mapaSheetSet('mid');
  }
  // Si es tab de mapa (0), refresh
  if(idx===0&&typeof map!=='undefined'){
    setTimeout(function(){map.invalidateSize({animate:false});},100);
  }
  if(idx===2&&typeof renderComoLlegar==='function'){
    renderComoLlegar();
  }
  if(idx===3&&typeof renderTrips==='function'){
    renderTrips();
  }
  if(idx===4&&typeof renderStationsList==='function'){
    renderStationsList();
  }
}

// ── BOTTOM SHEET ARRASTRABLE ────────────────────────────────────────────────
function mapaSheetSet(state){
  var sheet=document.getElementById('mapa-sheet');
  if(!sheet)return;
  if(window.matchMedia('(min-width:700px)').matches)return; // en desktop es panel fijo
  var h;
  if(state==='collapsed')h=118;
  else if(state==='expanded')h=Math.round(window.innerHeight*0.88);
  else{state='mid';h=Math.round(window.innerHeight*0.5);}
  sheet.dataset.state=state;
  sheet.style.height=h+'px';
  var lbl=document.getElementById('handleLabelText');
  if(lbl)lbl.textContent=state==='collapsed'?'Mostrar':'Ocultar';
  setTimeout(function(){if(typeof map!=='undefined')map.invalidateSize({animate:false});},330);
}
window.mapaSheetSet=mapaSheetSet;

function initMapaSheet(){
  var sheet=document.getElementById('mapa-sheet');
  var handle=document.getElementById('mapa-sheet-handle');
  if(!sheet||!handle||sheet._sheetInit)return;
  sheet._sheetInit=true;

  var dragging=false,startY=0,startH=0,moved=false,lastToggle=0;

  function isDesktop(){return window.matchMedia('(min-width:700px)').matches;}

  function onDown(e){
    if(isDesktop())return;
    if(dragging)return; // evita doble-disparo (touchstart + mousedown sintético)
    dragging=true;moved=false;
    sheet.classList.add('dragging');
    startY=(e.touches?e.touches[0].clientY:e.clientY);
    startH=sheet.getBoundingClientRect().height;
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
    document.addEventListener('touchmove',onMove,{passive:false});
    document.addEventListener('touchend',onUp);
  }
  function onMove(e){
    if(!dragging)return;
    var y=(e.touches?e.touches[0].clientY:e.clientY);
    if(Math.abs(startY-y)>6)moved=true;
    if(e.cancelable)e.preventDefault();
    var delta=startY-y;
    var newH=Math.min(window.innerHeight*0.92,Math.max(100,startH+delta));
    sheet.style.height=newH+'px';
  }
  function onUp(){
    if(!dragging)return;
    dragging=false;
    sheet.classList.remove('dragging');
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    document.removeEventListener('touchmove',onMove);
    document.removeEventListener('touchend',onUp);
    if(!moved){ // fue un tap, no un arrastre real: toggle simple mostrar/ocultar
      var now=Date.now();
      if(now-lastToggle<400)return; // ignora el evento sintético duplicado
      lastToggle=now;
      var cur=sheet.dataset.state;
      mapaSheetSet(cur==='collapsed'?'mid':'collapsed');
      return;
    }
    var h=sheet.getBoundingClientRect().height;
    var vh=window.innerHeight;
    var mid=vh*0.5,exp=vh*0.88;
    var dc=Math.abs(h-118),dm=Math.abs(h-mid),de=Math.abs(h-exp);
    if(dc<=dm&&dc<=de)mapaSheetSet('collapsed');
    else if(dm<=de)mapaSheetSet('mid');
    else mapaSheetSet('expanded');
  }
  handle.addEventListener('mousedown',onDown);
  handle.addEventListener('touchstart',onDown,{passive:true});

  mapaSheetSet('mid');
}

// ── MODAL DE PARADAS (buscador) ─────────────────────────────────────────────
function getFavStops(){
  try{const v=JSON.parse(localStorage.getItem('sittFavStops')||'[]');return Array.isArray(v)?v:[];}catch(e){return [];}
}
function toggleFavStop(idx,e){
  if(e)e.stopPropagation();
  let favs=getFavStops();
  const pos=favs.indexOf(idx);
  if(pos>-1){
    favs.splice(pos,1);
  }else{
    if(favs.length>=3){
      alert('⭐ Ya tienes 3 paradas favoritas.\n\nQuita una (toca su estrella dorada) para agregar otra.');
      return;
    }
    favs.push(idx);
  }
  localStorage.setItem('sittFavStops',JSON.stringify(favs));
  renderParadaRows();
  renderFavQuick();
}
function buildParadaRow(s,i){
  const isFav=getFavStops().indexOf(i)>-1;
  return '<div class="parada-row">'+
    '<button class="pr-fav'+(isFav?' on':'')+'" onclick="toggleFavStop('+i+',event)" aria-label="Marcar como favorita">'+(isFav?'⭐':'☆')+'</button>'+
    '<button class="pr-main" onclick="elegirParada('+i+')">'+
      '<span class="pr-num">'+s.n+'</span>'+
      '<span class="pr-name">'+s.name+'</span>'+
      '<span class="pr-arrow">›</span>'+
    '</button>'+
  '</div>';
}
function renderParadaRows(){
  const wrap=document.getElementById('paradasListWrap');
  if(!wrap)return;
  const stops=(typeof STOPS!=='undefined'?STOPS:[]);
  wrap.innerHTML=stops.map(function(s,i){return buildParadaRow(s,i);}).join('');
  const filt=document.getElementById('paradaFilter');
  if(filt&&filt.value)filtrarParadas(filt.value);
}
function renderFavQuick(){
  const box=document.getElementById('favQuickBox');
  if(!box)return;
  const favs=getFavStops();
  if(!favs.length||typeof STOPS==='undefined'){box.innerHTML='';return;}
  box.innerHTML='<div style="font-size:10px;font-weight:800;color:#a8863a;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;padding-left:2px">⭐ Tus favoritas</div>'+
    favs.map(function(idx){
      const s=STOPS[idx];
      if(!s)return'';
      return '<button class="fav-quick" onclick="elegirParada('+idx+')">'+
        '<span style="font-size:16px">⭐</span>'+
        '<span style="flex:1;text-align:left;font-size:14px;font-weight:800;color:#4a3210">'+s.n+'. '+s.name+'</span>'+
        '<span class="pr-arrow">›</span>'+
      '</button>';
    }).join('');
}

function abrirModalParadas(){
  if(document.getElementById('paradasModal'))return;
  const modal=document.createElement('div');
  modal.id='paradasModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99998;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s ease';
  modal.addEventListener('click',function(e){if(e.target===modal)cerrarModalParadas();});

  modal.innerHTML=`
    <div style="background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:480px;max-height:82vh;display:flex;flex-direction:column;animation:fadeUp .3s ease">
      <div style="display:flex;justify-content:center;padding-top:10px;flex-shrink:0">
        <div style="width:38px;height:5px;border-radius:20px;background:#e0ddd6"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;flex-shrink:0">
        <div style="font-size:15px;font-weight:800;color:#7B1D1D">🔍 ¿Cuándo llega a mi parada?</div>
        <button onclick="cerrarModalParadas()" style="background:#f4f4f2;border:none;border-radius:20px;padding:7px 14px 7px 12px;font-size:12px;font-weight:800;color:#7B1D1D;cursor:pointer;flex-shrink:0;display:flex;align-items:center;gap:4px">✕ Cerrar</button>
      </div>
      <div style="margin:0 18px 8px;background:#FFF8E7;border:1px solid #f0d070;border-radius:10px;padding:8px 10px;font-size:11.5px;color:#7a5c00;display:flex;align-items:center;gap:6px;flex-shrink:0">
        💡 Toca la <span style="color:#C9A84C;font-weight:800">☆ estrella</span> para guardar hasta 3 paradas favoritas
      </div>
      <div id="favQuickBox" style="padding:0 18px;flex-shrink:0"></div>
      <input type="text" id="paradaFilter" placeholder="Escribe el nombre de tu parada..." oninput="filtrarParadas(this.value)"
        style="margin:10px 18px 10px;padding:12px 14px;border-radius:12px;border:1.5px solid #e0ddd6;font-size:14px;font-family:inherit;flex-shrink:0">
      <div id="paradasListWrap" style="overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 10px 16px;flex:1"></div>
    </div>
  `;
  document.body.appendChild(modal);
  renderFavQuick();
  renderParadaRows();
}

function filtrarParadas(txt){
  const q=(txt||'').toLowerCase();
  document.querySelectorAll('.parada-row').forEach(function(row){
    const name=row.querySelector('.pr-name').textContent.toLowerCase();
    row.style.display=name.indexOf(q)>-1?'flex':'none';
  });
}

function elegirParada(idx){
  const sel=document.getElementById('esel');
  if(sel)sel.value=idx;
  calcETA();
  actualizarBotonBusqueda(idx);
  cerrarModalParadas();
  setTimeout(function(){ofrecerFavorito(idx);},450);
}

// ── OFRECER AGREGAR A FAVORITOS AL ELEGIR UNA PARADA ─────────────────────────
function ofrecerFavorito(idx){
  if(typeof STOPS==='undefined'||!STOPS[idx])return;
  if(getFavStops().indexOf(idx)>-1)return; // ya es favorita
  const dismissed=localStorage.getItem('sittFavPromptDismissed');
  if(dismissed&&(Date.now()-parseInt(dismissed,10))<30*24*60*60*1000)return; // pidió no preguntar, y no ha pasado 1 mes
  if(document.getElementById('favPrompt'))return;
  const s=STOPS[idx];
  const t=document.createElement('div');
  t.id='favPrompt';
  t.style.cssText='position:fixed;left:14px;right:14px;bottom:20px;z-index:99999;background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.3);border:1.5px solid #E8C877;animation:fadeUp .3s ease;max-width:400px;margin:0 auto';
  t.innerHTML=
    '<div style="font-size:13.5px;font-weight:700;color:#333;margin-bottom:10px">⭐ ¿Agregar <b>'+s.n+'. '+s.name+'</b> a tus favoritas?</div>'+
    '<div style="display:flex;gap:8px;margin-bottom:8px">'+
      '<button onclick="confirmarFavorito('+idx+')" style="flex:1;background:linear-gradient(135deg,#E8C877,#C9A84C);color:#4a1010;border:none;border-radius:10px;padding:10px;font-size:13px;font-weight:800;cursor:pointer">⭐ Sí, agregar</button>'+
      '<button onclick="cerrarFavPrompt()" style="flex:1;background:#f4f4f2;color:#666;border:none;border-radius:10px;padding:10px;font-size:13px;font-weight:700;cursor:pointer">Ahora no</button>'+
    '</div>'+
    '<button onclick="noVolverPreguntarFav()" style="width:100%;background:none;border:none;color:#999;font-size:11.5px;text-decoration:underline;cursor:pointer;padding:4px">No volver a preguntar (1 mes)</button>';
  document.body.appendChild(t);
}
function confirmarFavorito(idx){
  let favs=getFavStops();
  if(favs.indexOf(idx)===-1){
    if(favs.length>=3){
      cerrarFavPrompt();
      alert('⭐ Ya tienes 3 paradas favoritas.\n\nQuita una desde el buscador (toca su estrella dorada) para agregar otra.');
      return;
    }
    favs.push(idx);
    localStorage.setItem('sittFavStops',JSON.stringify(favs));
  }
  cerrarFavPrompt();
}
function cerrarFavPrompt(){const t=document.getElementById('favPrompt');if(t)t.remove();}
function noVolverPreguntarFav(){
  localStorage.setItem('sittFavPromptDismissed',Date.now().toString());
  cerrarFavPrompt();
}

function cerrarModalParadas(){
  const modal=document.getElementById('paradasModal');
  if(modal)modal.remove();
}

function actualizarBotonBusqueda(idx){
  const lbl=document.getElementById('stopSearchLabel');
  if(!lbl)return;
  const s=(typeof STOPS!=='undefined')?STOPS[idx]:null;
  const idiomaActual=localStorage.getItem('sittIdioma')||'es';
  const porDefecto=idiomaActual==='en'?'When does my bus arrive?':'¿Cuándo llega a mi parada?';
  lbl.textContent=s?(s.n+'. '+s.name):porDefecto;
  lbl.style.color=s?'#2a2a2a':'#555';
}

function closeSearchResults(){
  const sel=document.getElementById('esel');
  if(sel)sel.value='';
  calcETA();
  actualizarBotonBusqueda('');
}

// ── MODAL DE HORARIO (automático al entrar al mapa) ─────────────────────────
function mostrarHorarioModal(){
  cerrarChipHorario();
  if(document.getElementById('horarioModal'))return;
  const proxWrap=document.getElementById('proxCardWrap');
  if(!proxWrap)return;
  const modal=document.createElement('div');
  modal.id='horarioModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:99997;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s ease';
  modal.addEventListener('click',function(e){if(e.target===modal)minimizarHorarioModal();});
  modal.innerHTML=`
    <div class="horario-modal-card">
      <div class="hmc-shine"></div>
      <div style="display:flex;justify-content:center;margin-bottom:10px;position:relative">
        <div style="width:42px;height:5px;border-radius:20px;background:rgba(255,255,255,.35)"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:16px;position:relative">
        <span style="width:9px;height:9px;border-radius:50%;background:#4ade80;display:inline-block;animation:pulse 2s infinite;box-shadow:0 0 8px #4ade80"></span>
        <div style="font-size:14px;font-weight:900;color:#F5D77A;letter-spacing:.06em;text-transform:uppercase;text-shadow:0 1px 3px rgba(0,0,0,.3)">✨ Horario en vivo · Ruta T101</div>
      </div>
      <div id="horarioModalSlot" style="position:relative"></div>
      <button onclick="minimizarHorarioModal()" class="hmc-minbtn shine-btn gold" style="border-radius:16px">
        ⌄ Minimizar
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('horarioModalSlot').appendChild(proxWrap);
}

function minimizarHorarioModal(){
  const proxWrap=document.getElementById('proxCardWrap');
  const holder=document.getElementById('proxHiddenHolder');
  if(proxWrap&&holder)holder.appendChild(proxWrap);
  const modal=document.getElementById('horarioModal');
  if(modal)modal.remove();
  mostrarChipHorario();
}

function mostrarChipHorario(){
  if(document.getElementById('horarioChip'))return;
  const wrap=document.getElementById('mapa-map-wrap');
  if(!wrap)return;
  const chip=document.createElement('div');
  chip.id='horarioChip';
  chip.innerHTML=`
    <button onclick="mostrarHorarioModal()" class="hchip-main">
      <span class="hchip-dot"></span>
      <span class="hchip-txt">
        <span class="hchip-badge">Próxima salida</span>
        <span class="hchip-time" id="hchipHora">--:--</span>
      </span>
      <span class="hchip-arrow">⌃</span>
    </button>
  `;
  wrap.appendChild(chip);
  if(typeof updateProx==='function')updateProx();
}

function cerrarChipHorario(){
  const chip=document.getElementById('horarioChip');
  if(chip)chip.remove();
}
window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  gtag('js',new Date());
  gtag('config','G-PMPPMLG45Q');

// ── NAVEGACIÓN ──────────────────────────────────────────────────────────────
const sectionTitles = {
  mapa: '🗺️ Mapa y Ubicación',
  info: '📋 Información',
  encuesta: '⭐ Encuesta',
  compartir: '📤 Compartir App'
};
const sectionTitlesEN = {
  mapa: '🗺️ Map & Location',
  info: '📋 Information',
  encuesta: '⭐ Survey',
  compartir: '📤 Share App'
};

let sectionActual=null;
function openSection(sec){
  sectionActual=sec;
  document.getElementById('splash').classList.add('hide');
  setTimeout(function(){
    document.getElementById('splash').style.display='none';
    document.getElementById('app').style.display='block';
  },600);
  document.querySelectorAll('.section-page').forEach(function(s){s.classList.remove('active');});
  document.getElementById('sec-'+sec).classList.add('active');
  const idiomaActual=localStorage.getItem('sittIdioma')||'es';
  const titulos=idiomaActual==='en'?sectionTitlesEN:sectionTitles;
  document.getElementById('navTitle').textContent = titulos[sec]||'SITT T101';
  if(sec!=='mapa')detenerSeguimientoUbicacion();
  if(sec==='info'&&typeof window._activarScrollReveal==='function'){
    setTimeout(window._activarScrollReveal,100);
  }
  if(sec==='mapa'){
    initMapaSheet();
    setTimeout(function(){
      var activo=document.querySelector('.mtab.on');
      if(activo)moverGliderTabs(activo);
    },60);
    setTimeout(function(){
      if(typeof map!=='undefined')map.invalidateSize({animate:false});
    },50);
    setTimeout(function(){
      if(typeof map!=='undefined'){
        map.invalidateSize({animate:false});
        map.eachLayer(function(layer){if(layer.redraw)layer.redraw();});
      }
      jumpNow();update();updateProx();
    },350);
    setTimeout(function(){
      if(typeof map!=='undefined'){
        map.invalidateSize({animate:false});
        verRuta();
      }
    },700);
    setTimeout(function(){
      if(typeof map!=='undefined'){
        map.invalidateSize({animate:false});
        verRuta();
      }
    },1200);
    // Respaldo extra para celulares donde el layout tarda más en asentarse
    setTimeout(function(){
      if(typeof map!=='undefined'){
        map.invalidateSize({animate:false});
        verRuta();
      }
    },1300);
    // Y en cuanto el panel termine su animación de apertura, ajustar una vez más
    var sheetEl=document.getElementById('mapa-sheet');
    if(sheetEl&&!sheetEl._verRutaListener){
      sheetEl._verRutaListener=true;
      sheetEl.addEventListener('transitionend',function(){
        if(typeof map!=='undefined'){
          map.invalidateSize({animate:false});
        }
      });
    }
    setTimeout(function(){
      if(!window._horarioShownOnce){
        window._horarioShownOnce=true;
        mostrarHorarioModal();
      }else if(!document.getElementById('horarioModal')){
        mostrarChipHorario();
      }
    },500);
  }
}

function goBack(){
  document.getElementById('app').style.display='none';
  document.getElementById('splash').style.display='flex';
  document.getElementById('splash').classList.remove('hide');
  detenerSeguimientoUbicacion();
}

function salirSinCalificar(btn){
  // Cerrar modal
  const modal=btn.closest('div[style*="inset"]');
  if(modal)document.body.removeChild(modal);
  // Intentar cerrar
  window.close();
  // Si no cierra (navegador móvil), mostrar pantalla de despedida
  setTimeout(function(){
    const despedida=document.createElement('div');
    despedida.style.cssText='position:fixed;inset:0;z-index:99999;background:linear-gradient(135deg,#4a1010,#7B1D1D);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;text-align:center;animation:fadeIn .3s ease';
    despedida.innerHTML=`
      <div style="font-size:60px;margin-bottom:16px;animation:bounce 1s ease-in-out 3">👋</div>
      <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:8px">¡Hasta pronto!</div>
      <div style="font-size:14px;color:rgba(255,255,255,.75);line-height:1.7;margin-bottom:28px">
        Gracias por usar la app del SITT.<br>
        Para cerrar, presiona el botón<br>
        <b style="color:var(--o)">Inicio</b> o <b style="color:var(--o)">Atrás</b> de tu celular.
      </div>
      <div style="background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:14px 20px;margin-bottom:20px">
        <div style="font-size:12px;color:rgba(255,255,255,.6);margin-bottom:8px">O cierra esta pestaña manualmente</div>
        <div style="display:flex;justify-content:center;gap:16px;font-size:28px">
          <span>⬅️</span><span>🏠</span><span>⬜</span>
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:6px">Atrás · Inicio · Recientes</div>
      </div>
      <button onclick="this.closest('div[style*=inset]').remove()" 
        style="background:rgba(255,255,255,.15);color:#fff;border:1.5px solid rgba(255,255,255,.3);border-radius:20px;padding:10px 24px;font-size:13px;font-weight:600;cursor:pointer">
        ← Volver a la app
      </button>
    `;
    document.body.appendChild(despedida);
  },300);
}

function salirApp(){
  // Modal personalizado
  const modal=document.createElement('div');
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .2s ease';
  modal.innerHTML=`
    <div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:320px;width:100%;text-align:center;animation:fadeUp .3s ease">
      <div style="font-size:44px;margin-bottom:10px">😊</div>
      <div style="font-size:18px;font-weight:800;color:#1a1a1a;margin-bottom:8px">¡Antes de irte!</div>
      <div style="font-size:14px;color:#666;line-height:1.6;margin-bottom:20px">¿Te gustaría contestar una breve encuesta para ayudarnos a mejorar el servicio?</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button onclick="document.body.removeChild(this.closest('[style*=inset]'));openSection('encuesta');document.getElementById('splash').style.display='none';document.getElementById('app').style.display='block';"
          style="background:#7B1D1D;color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer">
          ⭐ Sí, quiero calificar el servicio
        </button>
        <button onclick="salirSinCalificar(this)"
          style="background:#f4f4f2;color:#666;border:none;border-radius:12px;padding:12px;font-size:13px;font-weight:600;cursor:pointer">
          🚪 Salir sin calificar
        </button>
        <button onclick="document.body.removeChild(this.closest('[style*=inset]'))"
          style="background:none;color:#aaa;border:none;font-size:12px;cursor:pointer;padding:4px">
          Cancelar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// ── RELOJ ──────────────────────────────────────────────────────────────────
function tick(){
  const n=new Date();
  const t=n.toLocaleTimeString('es-MX',{timeZone:'America/Tijuana',hour:'2-digit',minute:'2-digit'});
  const d=n.toLocaleDateString('es-MX',{timeZone:'America/Tijuana',weekday:'short',day:'numeric',month:'short'});
  const els=['clock','navClock'];
  els.forEach(function(id){const e=document.getElementById(id);if(e)e.textContent=t;});
  const dl=document.getElementById('dateLabel');
  if(dl)dl.textContent=d.toUpperCase();
}
setInterval(tick,1000);tick();


// ── DATOS ──────────────────────────────────────────────────────────────────
const STOPS=[
  {name:"TERMINAL INSURGENTES",lat:32.46488,lng:-116.91359,n:1,t:0},
  {name:"Simón Bolívar Norte",lat:32.46672,lng:-116.92221,n:2,t:5},
  {name:"Clínica 1",lat:32.47808,lng:-116.92814,n:3,t:7},
  {name:"Paseo del Guaycura",lat:32.48334,lng:-116.93121,n:4,t:9},
  {name:"Templo",lat:32.48644,lng:-116.93407,n:5,t:11},
  {name:"Parque Morelos",lat:32.49326,lng:-116.93822,n:6,t:13},
  {name:"CEART",lat:32.49909,lng:-116.94592,n:7,t:15},
  {name:"Mezzanine",lat:32.50497,lng:-116.9535,n:8,t:17},
  {name:"Álamos",lat:32.50884,lng:-116.95982,n:9,t:19},
  {name:"Central Camionera",lat:32.51647,lng:-116.9624,n:11,t:21},
  {name:"Guadalupe Victoria",lat:32.51597,lng:-116.96771,n:12,t:23},
  {name:"Alvaro Obregón",lat:32.51653,lng:-116.9757,n:13,t:25},
  {name:"Buena Vista",lat:32.51742,lng:-116.98735,n:14,t:27},
  {name:"Centinela",lat:32.51797,lng:-116.99527,n:15,t:29},
  {name:"Juan Ojeda Robles",lat:32.52073,lng:-117.00293,n:16,t:31},
  {name:"Hospital General",lat:32.52608,lng:-117.00895,n:17,t:33},
  {name:"CREA",lat:32.52885,lng:-117.01262,n:18,t:35},
  {name:"Palacio Municipal",lat:32.53241,lng:-117.01701,n:19,t:37},
  {name:"Diana Cazadora",lat:32.53521,lng:-117.02217,n:20,t:39},
  {name:"Pueblo Amigo",lat:32.53798,lng:-117.02598,n:21,t:41},
  {name:"Garita Puerta Mexico",lat:32.54086,lng:-117.02676,n:22,t:43},
  {name:"Amistad",lat:32.54046,lng:-117.02982,n:23,t:45},
  {name:"TERMINAL CENTRO",lat:32.5396,lng:-117.03749,n:24,t:47},
  {name:"Calle Tercera",lat:32.5347,lng:-117.03693,n:25,t:50},
  {name:"Jai Alai",lat:32.52846,lng:-117.03622,n:26,t:53},
  {name:"Seminario Sur",lat:32.52577,lng:-117.03232,n:27,t:55},
  {name:"Telefónica Sur",lat:32.52649,lng:-117.02813,n:28,t:57},
  {name:"Plaza Río",lat:32.52723,lng:-117.02098,n:30,t:59},
  {name:"Cuauhtémoc",lat:32.52401,lng:-117.01644,n:31,t:61},
  {name:"Ignacio Zaragoza",lat:32.52114,lng:-117.01155,n:32,t:63},
  {name:"Minarete",lat:32.51846,lng:-117.00667,n:33,t:65},
  {name:"Ferrocarril",lat:32.51734,lng:-117.00084,n:34,t:67},
  {name:"20 de Noviembre",lat:32.51636,lng:-116.9956,n:35,t:69},
  {name:"Américas",lat:32.51566,lng:-116.98755,n:36,t:71},
  {name:"Unidad Deportiva Tijuana",lat:32.5146,lng:-116.97374,n:37,t:73},
  {name:"Ermita",lat:32.51325,lng:-116.96898,n:38,t:75},
  {name:"Cruz Roja",lat:32.50757,lng:-116.96111,n:39,t:79},
  {name:"Cienega",lat:32.49238,lng:-116.93959,n:42,t:83},
  {name:"División del Norte",lat:32.48532,lng:-116.935,n:43,t:86},
  {name:"Constitucion del 17",lat:32.48251,lng:-116.93254,n:44,t:88},
  {name:"Arboledas",lat:32.47603,lng:-116.92906,n:45,t:90},
  {name:"México Lindo",lat:32.46815,lng:-116.92532,n:46,t:93},
  {name:"Simón Bolívar Sur",lat:32.46453,lng:-116.92289,n:47,t:96}
];
const SM=[0,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,50,53,55,57,59,61,63,65,67,69,71,73,75,79,83,86,88,90,93,96]; // Stop Minutes (% de 100)
const DA=[360,480,600,720,870,1020];  // T-023 salidas
const DB=[420,540,660,780,960,1110];  // T-015 salidas
const DUA=[107,87,74,70,92,96];       // T-023 duraciones reales
const DUB=[78,78,70,76,82,77];        // T-015 duraciones reales
const ALL_DEPS=[...DA,...DB].sort((a,b)=>a-b);

let simMin=360, playing=false, playIv=null;
let uLat=null, uLng=null;

// ── MAPA ───────────────────────────────────────────────────────────────────
const map=L.map('map',{zoomControl:false}).setView([32.505,-116.975],13);
map.attributionControl.setPrefix(false);
const capaCalles=L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',{
  attribution:'© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom:20,
  minZoom:10
}).addTo(map);
const capaCallesOscura=L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',{
  attribution:'© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom:20,
  minZoom:10
});
const capaSatelite=L.layerGroup([
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,minZoom:10,attribution:'© Esri'}),
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,minZoom:10})
]);
function capaCallesActiva(){
  return (localStorage.getItem('sittDark')==='1')?capaCallesOscura:capaCalles;
}
function toggleCapaMapa(){
  const btn=document.getElementById('fabCapa');
  const calles=capaCallesActiva();
  if(map.hasLayer(calles)){
    map.removeLayer(calles);
    capaSatelite.addTo(map);
    if(btn)btn.classList.add('mfab-activo');
  }else{
    map.removeLayer(capaSatelite);
    calles.addTo(map);
    if(btn)btn.classList.remove('mfab-activo');
  }
}
L.polyline(STOPS.map(s=>[s.lat,s.lng]),{color:'#ddd',weight:6,opacity:.6}).addTo(map);
L.polyline(STOPS.map(s=>[s.lat,s.lng]),{color:'#7B1D1D',weight:4,opacity:.9}).addTo(map);
const trA=L.polyline([],{color:'#1D9E75',weight:6,opacity:.95}).addTo(map);
const trB=L.polyline([],{color:'#378ADD',weight:6,opacity:.95}).addTo(map);

const gruposParadas=L.layerGroup();
const sMarkers=STOPS.map((s,i)=>{
  const isT=s.name.startsWith('TERMINAL');
  const size=isT?26:20;
  const emoji=iconoParada(s.name);
  const ic=L.divIcon({className:'',html:'<div style="position:relative;width:'+size+'px;height:'+size+'px;border-radius:50%;background:'+(isT?'#7B1D1D':'#fff')+';border:'+(isT?'3px solid #C9A84C':'2px solid #7B1D1D')+';box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:'+(isT?'13px':'11px')+'">'+emoji+'<span style="position:absolute;bottom:-4px;right:-4px;background:#7B1D1D;color:#fff;font-size:8px;font-weight:800;border-radius:50%;width:13px;height:13px;display:flex;align-items:center;justify-content:center;border:1.3px solid #fff">'+s.n+'</span></div>',iconAnchor:[size/2,size/2]});
  const m=L.marker([s.lat,s.lng],{icon:ic});
  m.on('click',function(){mostrarInfoEstacion(i);});
  m.bindTooltip(s.n+'. '+s.name,{permanent:true,direction:'top',offset:[0,-(size/2)-2],className:'stop-label',opacity:1});
  gruposParadas.addLayer(m);
  return m;
});
map.addLayer(gruposParadas);

// Alejado: solo se ve la línea de la ruta, sin marcar las 43 paradas (se ve muy saturado).
// Al acercarte lo suficiente, las paradas aparecen solas.
const ZOOM_MIN_PARADAS=14;
function actualizarVisibilidadParadas(){
  if(map.getZoom()>=ZOOM_MIN_PARADAS){
    if(!map.hasLayer(gruposParadas))map.addLayer(gruposParadas);
  }else{
    if(map.hasLayer(gruposParadas))map.removeLayer(gruposParadas);
  }
}
map.on('zoomend',actualizarVisibilidadParadas);
actualizarVisibilidadParadas();

function calcularRumbo(lat1,lng1,lat2,lng2){
  const toRad=d=>d*Math.PI/180,toDeg=r=>r*180/Math.PI;
  const dLng=toRad(lng2-lng1);
  const y=Math.sin(dLng)*Math.cos(toRad(lat2));
  const x=Math.cos(toRad(lat1))*Math.sin(toRad(lat2))-Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(dLng);
  return (toDeg(Math.atan2(y,x))+360)%360;
}

function iconoParada(name){
  const n=name.toUpperCase();
  if(n.includes('TERMINAL'))return'🚏';
  if(n.includes('HOSPITAL')||n.includes('CLINICA')||n.includes('CLÍNICA')||n.includes('CRUZ ROJA'))return'🏥';
  if(n.includes('PALACIO')||n.includes('MUNICIPAL')||n.includes('AYUNTAMIENTO'))return'🏛️';
  if(n.includes('GARITA')||n.includes('PUERTA MEXICO')||n.includes('PUERTA MÉXICO'))return'🛂';
  if(n.includes('CAMIONERA')||n.includes('CENTRAL'))return'🚌';
  if(n.includes('IGLESIA')||n.includes('TEMPLO')||n.includes('SEMINARIO'))return'⛪';
  if(n.includes('PARQUE')||n.includes('ZARAGOZA'))return'🌳';
  if(n.includes('PLAZA')||n.includes('MERCADO'))return'🛍️';
  if(n.includes('ESCUELA')||n.includes('CREA')||n.includes('UNIVERSIDAD'))return'🏫';
  if(n.includes('DEPORTIVA')||n.includes('UNIDAD DEPORTIVA'))return'⚽';
  if(n.includes('CAZADORA')||n.includes('DIANA'))return'🗽';
  if(n.includes('AMISTAD')||n.includes('CHAPARRAL'))return'🤝';
  return'📍';
}

function busIco(label,color,active,bearing){
  const op=active?'1':'0.4';
  const uc=label.includes('023')?'#1D9E75':'#378ADD';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="70" height="38" viewBox="0 0 70 38">'
    +'<ellipse cx="35" cy="36" rx="25" ry="3" fill="rgba(0,0,0,.2)"/>'
    +'<rect x="4" y="15" width="58" height="16" rx="3" fill="#fff" stroke="#ccc" stroke-width=".5"/>'
    +'<rect x="4" y="4" width="58" height="13" rx="3" fill="#C0392B"/>'
    +'<rect x="4" y="14" width="58" height="2.5" fill="#7B1D1D"/>'
    +'<rect x="13" y="6" width="7" height="6" rx="1" fill="#AED6F1" opacity=".9"/>'
    +'<rect x="23" y="6" width="7" height="6" rx="1" fill="#AED6F1" opacity=".9"/>'
    +'<rect x="33" y="6" width="7" height="6" rx="1" fill="#AED6F1" opacity=".9"/>'
    +'<rect x="43" y="6" width="7" height="6" rx="1" fill="#AED6F1" opacity=".9"/>'
    +'<rect x="4" y="4" width="8" height="25" rx="3" fill="#C0392B"/>'
    +'<rect x="5" y="7" width="5" height="5" rx="1" fill="#AED6F1" opacity=".9"/>'
    +'<rect x="5" y="19" width="5" height="3" rx="1" fill="#F9E79F"/>'
    +'<rect x="53" y="15" width="7" height="14" rx="1" fill="#E8E8E8" stroke="#bbb" stroke-width=".5"/>'
    +'<circle cx="17" cy="32" r="4.5" fill="#2C3E50"/><circle cx="17" cy="32" r="2" fill="#7F8C8D"/>'
    +'<circle cx="51" cy="32" r="4.5" fill="#2C3E50"/><circle cx="51" cy="32" r="2" fill="#7F8C8D"/>'
    +'<rect x="11" y="4" width="17" height="5" rx="1" fill="#922B21"/>'
    +'<text x="19.5" y="8.2" font-size="3.2" fill="#FFD700" text-anchor="middle" font-family="sans-serif" font-weight="bold">ZONA CENTRO</text>'
    +'</svg>';
  const flecha=active?'<svg width="24" height="24" viewBox="0 0 24 24" style="margin:0 auto 2px;display:block;transform:rotate('+(bearing||0)+'deg);filter:drop-shadow(0 2px 3px rgba(0,0,0,.55))"><path d="M12 1.5 L20.5 19 L12 14.8 L3.5 19 Z" fill="'+uc+'" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>':'';
  return L.divIcon({className:'',html:'<div style="opacity:'+op+';filter:drop-shadow(0 2px 5px rgba(0,0,0,.4));text-align:center">'+flecha+svg+'<div style="background:'+uc+';color:#fff;font-size:9px;font-weight:800;padding:1px 6px;border-radius:8px;border:1.5px solid #fff;margin-top:1px;display:inline-block">'+label+'</div></div>',iconAnchor:[35,active?65:42]});
}

const busA=L.marker([STOPS[0].lat,STOPS[0].lng],{icon:busIco('T-01-023','#1D9E75',false),zIndexOffset:1000}).addTo(map);
const busB=L.marker([STOPS[0].lat,STOPS[0].lng],{icon:busIco('T-01-015','#378ADD',false),zIndexOffset:1000}).addTo(map);

// (Botones "Mi ubicación" / "Ampliar mapa" ya existen como FABs flotantes en el HTML —
// se quitaron estos controles nativos de Leaflet para no duplicar la función)

// ── LÓGICA ─────────────────────────────────────────────────────────────────
function getBus(now,deps,durs){
  let ai=-1,ad=null;
  for(let i=deps.length-1;i>=0;i--){if(deps[i]<=now){ai=i;ad=deps[i];break;}}
  if(ai===-1)return{on:false};
  const el=now-ad, dur=durs[ai];
  if(el>dur)return{on:false};
  let si=0;
  for(let i=0;i<SM.length-1;i++){if(el>=(SM[i]/100*dur))si=i;else break;}
  si=Math.min(si,STOPS.length-2);
  const t1=SM[si]/100*dur, t2=SM[Math.min(si+1,SM.length-1)]/100*dur;
  const sub=t2>t1?(el-t1)/(t2-t1):0;
  const lat=STOPS[si].lat+(STOPS[si+1].lat-STOPS[si].lat)*sub;
  const lng=STOPS[si].lng+(STOPS[si+1].lng-STOPS[si].lng)*sub;
  return{on:true,si,lat,lng,prog:Math.round(el/dur*100)};
}

function hhmm(m){const h=Math.floor(m/60)%24,mm=m%60,ap=h<12?'a.m.':'p.m.',hh=h===0?12:h>12?h-12:h;return hh+':'+(mm.toString().padStart(2,'0'))+' '+ap;}
// Estimado de tiempo en carro: la distancia en línea recta no es la distancia real
// de calles, así que le aplicamos un factor de ruta + velocidad urbana promedio con tráfico.
function estimarTiempoAuto(metrosLinea){
  const factorRuta=1.35,velKmh=28;
  const metrosRuta=metrosLinea*factorRuta;
  return Math.max(1,Math.round((metrosRuta/1000)/velKmh*60));
}
function fmtMinutos(min){
  if(min<60)return min+' min';
  const h=Math.floor(min/60),m=min%60;
  return h+' hora'+(h>1?'s':'')+(m>0?' '+m+' min':'');
}
function plain(m){m=((m%1440)+1440)%1440;const h=Math.floor(m/60),mm=m%60,ap=h<12?'AM':'PM',hh=h===0?12:h>12?h-12:h;return hh+':'+(mm.toString().padStart(2,'0'))+' '+ap;}

function setEl(id,val,prop){const e=document.getElementById(id);if(e){if(prop)e[prop]=val;else e.textContent=val;}}

function update(){
  // Admin overrides
var _rawA=window._pauseA?{on:false}:(window._overrideA!=null?Object.assign({},getBus(simMin,DA,DUA),{on:true,si:window._overrideA}):getBus(simMin,DA,DUA));
var _rawB=window._pauseB?{on:false}:(window._overrideB!=null?Object.assign({},getBus(simMin,DB,DUB),{on:true,si:window._overrideB}):getBus(simMin,DB,DUB));
// Intercambiar si está activo
const sA=window._swapAB?_rawB:_rawA;
const sB=window._swapAB?_rawA:_rawB;
// Mensajes especiales
if(window._msgA)setEl('stA',window._msgA);
if(window._msgB)setEl('stB',window._msgB);
  // Bus A
  if(sA.on){
    busA.setLatLng([sA.lat,sA.lng]);
    var rumboA=calcularRumbo(STOPS[sA.si].lat,STOPS[sA.si].lng,STOPS[Math.min(sA.si+1,STOPS.length-1)].lat,STOPS[Math.min(sA.si+1,STOPS.length-1)].lng);
    busA.setIcon(busIco('T-01-023','#1D9E75',true,rumboA));
    setEl('stA',STOPS[sA.si].name);setEl('nxA',STOPS[Math.min(sA.si+1,STOPS.length-1)].name);
    setEl('pgA','width:'+sA.prog+'%','style');setEl('pglA',sA.prog+'%');
    const b=document.getElementById('bdgA');if(b)b.style.display='inline-block';
    const tc=STOPS.slice(0,sA.si+1).map(s=>[s.lat,s.lng]);tc.push([sA.lat,sA.lng]);trA.setLatLngs(tc);
  }else{
    busA.setLatLng([STOPS[0].lat,STOPS[0].lng]);busA.setIcon(busIco('T-01-023','#1D9E75',false));
    // Mensaje cuando no está en ruta
    const nextDepA=DA.find(function(d){return d>simMin;});
    const msgA=nextDepA
      ?'⏳ Esperando salida a las '+hhmm(nextDepA)
      :'🌙 Servicio terminado · Nos vemos mañana';
    setEl('stA',msgA);setEl('nxA','–');setEl('pgA','width:0%','style');setEl('pglA','');
    const b=document.getElementById('bdgA');if(b)b.style.display='none';trA.setLatLngs([]);
  }
  // Bus B
  if(sB.on){
    busB.setLatLng([sB.lat,sB.lng]);
    var rumboB=calcularRumbo(STOPS[sB.si].lat,STOPS[sB.si].lng,STOPS[Math.min(sB.si+1,STOPS.length-1)].lat,STOPS[Math.min(sB.si+1,STOPS.length-1)].lng);
    busB.setIcon(busIco('T-01-015','#378ADD',true,rumboB));
    setEl('stB',STOPS[sB.si].name);setEl('nxB',STOPS[Math.min(sB.si+1,STOPS.length-1)].name);
    setEl('pgB','width:'+sB.prog+'%','style');setEl('pglB',sB.prog+'%');
    const b=document.getElementById('bdgB');if(b)b.style.display='inline-block';
    const tc=STOPS.slice(0,sB.si+1).map(s=>[s.lat,s.lng]);tc.push([sB.lat,sB.lng]);trB.setLatLngs(tc);
  }else{
    busB.setLatLng([STOPS[0].lat,STOPS[0].lng]);busB.setIcon(busIco('T-01-015','#378ADD',false));
    // Mensaje cuando no está en ruta
    const nextDepB=DB.find(function(d){return d>simMin;});
    const msgB=nextDepB
      ?'⏳ Esperando salida a las '+hhmm(nextDepB)
      :'🌙 Servicio terminado · Nos vemos mañana';
    setEl('stB',msgB);setEl('nxB','–');setEl('pgB','width:0%','style');setEl('pglB','');
    const b=document.getElementById('bdgB');if(b)b.style.display='none';trB.setLatLngs([]);
  }
  renderTrips();
  const sel=document.getElementById('esel');
  if(sel&&sel.value!=='')calcETA();
  if(uLat!==null)prepararInfoUbicacion(uLat,uLng);
}

function renderTrips(){
  const gAM=document.getElementById('tgAM'),gPM=document.getElementById('tgPM');
  const banner=document.getElementById('horarioTerminadoBanner');
  if(!gAM||!gPM)return;
  gAM.innerHTML='';gPM.innerHTML='';
  const MEDIODIA=720; // 12:00 p.m.
  let ultimoFin=0;
  function pintar(deps,durs,claseUnidad,etiqueta){
    deps.forEach((d,i)=>{
      const dur=durs[i],on=simMin>=d&&simMin<=(d+dur),past=simMin>(d+dur);
      if(d+dur>ultimoFin)ultimoFin=d+dur;
      const html='<div class="tp'+(on?' cur':past?' past':'')+'">'+hhmm(d)+' <small class="tp-unidad '+claseUnidad+'">'+etiqueta+'</small></div>';
      if(d<MEDIODIA)gAM.innerHTML+=html;else gPM.innerHTML+=html;
    });
  }
  pintar(DA,DUA,'da','T-023');
  pintar(DB,DUB,'db','T-015');
  if(banner)banner.style.display=(simMin>ultimoFin)?'flex':'none';
}

function renderStationsList(){
  const box=document.getElementById('stationsListInfo');
  if(!box||typeof STOPS==='undefined')return;
  box.innerHTML=STOPS.map(function(s,i){
    return '<div class="stn-row" onclick="verEstacionEnMapa('+i+')" style="cursor:pointer"><span class="stn-num">'+s.n+'</span><span>'+s.name+'</span><span class="pr-arrow">›</span></div>';
  }).join('');
}

function updateProx(){
  const SORTED=ALL_DEPS.slice().sort((a,b)=>a-b);
  const FIRST=SORTED[0],LAST=SORTED[SORTED.length-1];
  let next=null,ni=-1;
  for(let i=0;i<SORTED.length;i++){if(SORTED[i]>simMin){next=SORTED[i];ni=i;break;}}
  function fh(m){return hhmm(m);}
  function fc(d){if(d<=0)return'¡Saliendo ahora!';if(d<60)return'En '+d+' minuto'+(d!==1?'s':'');const h=Math.floor(d/60),m=d%60;return m>0?'En '+h+'h '+m+'min':'En '+h+' hora'+(h!==1?'s':'');}
  if(next===null){
    setEl('proxBadge','🌙 Servicio terminado');
    setEl('proxHora','6:30 p.m.');
    setEl('proxLbl','El último camión ya salió');
    setEl('proxCd','Nos vemos mañana a las 6:00 a.m.');
    const c=document.getElementById('proxCd');if(c)c.className='prox-cd';
    setEl('proxAv','Salidas desde Terminal Insurgentes · Blvd. Insurgentes, Col. Azteca');
    setEl('proxUlt','El primer camión de mañana sale a las 6:00 a.m. puntual');
    setEl('hchipHora','Servicio terminado');
    return;
  }
  const diff=Math.round(next-simMin);
  const isFirst=next===FIRST,isLast=next===LAST;
  setEl('proxBadge',isFirst?'🌅 Primera salida del día':isLast?'🔔 Próxima y última salida':'🚌 Próxima salida');
  setEl('proxHora',fh(next));
  setEl('proxLbl',isFirst?'Primer viaje del día — Terminal Insurgentes':isLast?'Último viaje del día — Terminal Insurgentes':'Viaje '+(ni+1)+' de '+SORTED.length+' — Terminal Insurgentes');
  setEl('proxCd',fc(diff));
  const c=document.getElementById('proxCd');if(c)c.className='prox-cd'+(diff<=5?' urg':'');
  setEl('proxAv',diff<=2?'⚡ El camión puede salir en cualquier momento':diff<=10?'⚠️ Los camiones no esperan — llega con tiempo':'Los camiones salen puntual · Llega 2-3 min antes');
  const ul=document.getElementById('proxUlt');
  if(ul)ul.innerHTML=!isLast?'Última salida del día: <strong>'+fh(LAST)+'</strong>':'Primera salida mañana: <strong>'+fh(FIRST)+'</strong>';
  setEl('hchipHora',diff<60?('En '+Math.max(diff,0)+' min'):fh(next));
}

function calcETA(){
  const idx=parseInt(document.getElementById('esel').value);
  if(isNaN(idx)){
    document.getElementById('mapa-search-results').style.display='none';
    return;
  }
  if(!STOPS[idx])return;
  const isTerminal=idx===0; // Solo Terminal Insurgentes tiene horarios de salida

  function fmtH(m){const h=Math.floor(m/60)%24,mm=m%60,ap=h<12?'a.m.':'p.m.',hh=h===0?12:h>12?h-12:h;return hh+':'+(mm.toString().padStart(2,'0'))+' '+ap;}
  function fmtT(d){d=Math.abs(Math.round(d));if(d>=60){const h=Math.floor(d/60),m=d%60;return h+' hora'+(h>1?'s':'')+(m>0?' '+m+' min':'');}return d+' minuto'+(d!==1?'s':'');}

  function smartFmt(deps,durs){
    for(let i=0;i<deps.length;i++){
      const dep=deps[i],dur=durs[i];
      const tripEnd=dep+dur;
      const stopEta=Math.round(dep+(SM[idx]/100*dur));
      const diff=stopEta-simMin;

      // TERMINAL INSURGENTES only: check departure logic
      if(isTerminal&&idx===0){
        const diffDep=dep-simMin;
        if(diffDep>0&&diffDep<=15) return{t:'⚡ Sale en '+fmtT(diffDep),m:'a las '+fmtH(dep),ok:true};
        if(diffDep>15) return{t:'Próxima salida en '+fmtT(diffDep),m:'a las '+fmtH(dep),ok:false};
        if(diffDep<0&&diffDep>=-5) return{t:'Acaba de salir',m:'Salió a las '+fmtH(dep),ok:false};
        // Check if bus is returning to terminal
        const arrTerminal=tripEnd;
        const diffArr=arrTerminal-simMin;
        if(diffArr>0&&simMin>=dep){
          return{t:'Llega en '+fmtT(diffArr),m:'a las '+fmtH(arrTerminal),ok:diffArr<=20};
        }
        continue;
      }

      // ALL OTHER STOPS (including TERMINAL CENTRO) - just a regular stop
      if(diff>0&&dep<=simMin&&tripEnd>=simMin){
        // Bus is on this trip and hasn't passed this stop yet
        return{t:'Llega en '+fmtT(diff),m:'a las '+fmtH(stopEta),ok:diff<=20};
      }
      if(diff>0&&dep>simMin){
        // Future trip
        return{t:'Llega en '+fmtT(diff),m:'a las '+fmtH(stopEta),ok:false};
      }
      if(diff<=0&&diff>=-15){
        // Passed recently
        return{t:'Pasó hace '+fmtT(Math.abs(diff)),m:'',ok:false};
      }
      // Passed more than 15 min ago, try next trip
    }
    return{t:'Sin más viajes hoy',m:'',ok:false};
  }

  const fA=smartFmt(DA,DUA),fB=smartFmt(DB,DUB);
  document.getElementById('mapa-search-results').style.display='block';
  setEl('etaLbl','📍 '+STOPS[idx].name);
  setEl('etaTA',fA.t);setEl('etaMA',fA.m);
  setEl('etaTB',fB.t);setEl('etaMB',fB.m);
  const cuA=document.querySelector('#etaCA .ecu');
  const cuB=document.querySelector('#etaCB .ecu');
  if(cuA)cuA.textContent='🚌 Camión T-01-023';
  if(cuB)cuB.textContent='🚌 Camión T-01-015';
  document.getElementById('etaCA').className='ecd'+(fA.ok?' ok':'');
  document.getElementById('etaCB').className='ecd'+(fB.ok?' ok':'');
}

// ── SLIDER ─────────────────────────────────────────────────────────────────
const slider=document.getElementById('slider');
slider.addEventListener('input',function(){
  simMin=parseInt(this.value);
  setEl('sval',plain(simMin));
  update();updateProx();
});
function setSlider(m){simMin=m;slider.value=m;setEl('sval',plain(m));update();updateProx();}
function getTijuanaMin(){
  // Hora real de Tijuana, Baja California
  const now=new Date();
  const tjStr=now.toLocaleString('en-US',{timeZone:'America/Tijuana',hour:'numeric',minute:'numeric',hour12:false});
  const parts=tjStr.split(':');
  return Math.min(Math.max(parseInt(parts[0])*60+parseInt(parts[1]),0),1379);
}

function jumpNow(){
  const m=getTijuanaMin();
  if(!window._userMovedSlider){
    simMin=m;
    const sl=document.getElementById('slider');
    if(sl)sl.value=m;
    const sv=document.getElementById('sval');
    if(sv)sv.textContent=plain(m);
    update();updateProx();
  }
}

// ── AUTO-UPDATE CADA MINUTO ──────────────────────────────────────────────
function autoRefresh(){
  if(!window._userMovedSlider){
    const m=getTijuanaMin();
    simMin=m;
    const sl=document.getElementById('slider');
    if(sl)sl.value=m;
    const sv=document.getElementById('sval');
    if(sv)sv.textContent=plain(m);
    update();
    updateProx();
    // Actualizar ETA si hay parada seleccionada
    const sel=document.getElementById('esel');
    if(sel&&sel.value!=='')calcETA();
    // Actualizar info de ubicación si hay una activa
    if(typeof uLat!=='undefined'&&uLat!==null)prepararInfoUbicacion(uLat,uLng);
    // Flash sutil en indicador en vivo
    const dots=document.querySelectorAll('.live-dot');
    dots.forEach(function(d){
      d.style.background='#fff';
      setTimeout(function(){d.style.background='#0F6E56';},300);
    });
  }
}
setInterval(autoRefresh,60000);

// Mark when user manually moves slider
document.addEventListener('DOMContentLoaded',function(){
  const sl=document.getElementById('slider');
  if(sl){
    sl.addEventListener('mousedown',function(){window._userMovedSlider=true;});
    sl.addEventListener('touchstart',function(){window._userMovedSlider=true;});
    // Reset after 5 minutes of inactivity
    sl.addEventListener('change',function(){
      clearTimeout(window._sliderResetTimer);
      window._sliderResetTimer=setTimeout(function(){
        window._userMovedSlider=false;
      },300000);
    });
  }
});

// ── PLAY ───────────────────────────────────────────────────────────────────
document.getElementById('btnPlay').addEventListener('click',function(){
  if(playing){clearInterval(playIv);playing=false;this.textContent='▶ Reproducir';this.classList.remove('pr');}
  else{playing=true;this.textContent='⏸ Pausar';this.classList.add('pr');
    playIv=setInterval(function(){simMin=(simMin+5)%1440;if(simMin>1139)simMin=360;slider.value=simMin;setEl('sval',plain(simMin));update();updateProx();},200);
  }
});

// ── TRACK ──────────────────────────────────────────────────────────────────
function trackBus(u){
  const s=u==='A'?getBus(simMin,DA,DUA):getBus(simMin,DB,DUB);
  if(typeof mapaSheetSet==='function')mapaSheetSet('collapsed');
  setTimeout(function(){
    if(typeof map!=='undefined'){
      map.invalidateSize({animate:false});
      if(s.on)map.setView([s.lat,s.lng],16,{animate:true});
      else map.setView([STOPS[0].lat,STOPS[0].lng],14,{animate:true});
    }
  },280);
}
function verRuta(){map.fitBounds(L.latLngBounds(STOPS.map(s=>[s.lat,s.lng])),{padding:[20,20],animate:true});}

// ── UBICACIÓN ─────────────────────────────────────────────────────────────
let uMark=null,uCirc=null;
function distM(a,b,c,d){const R=6371000,dL=(c-a)*Math.PI/180,dG=(d-b)*Math.PI/180,x=Math.sin(dL/2)*Math.sin(dL/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)*Math.sin(dG/2);return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}

function locateUser(){
  if(!navigator.geolocation){alert('Tu dispositivo no soporta geolocalización');return;}
  window._targetStopIdx=null;
  const fab=document.getElementById('fabLocate');
  if(fab){fab.classList.add('mfab-loading');fab.innerHTML='<span class="mfab-spin"></span>';}
  function restoreFab(){if(fab){fab.classList.remove('mfab-loading');fab.innerHTML='📍';}}

  if(window._geoWatchId!=null){
    navigator.geolocation.clearWatch(window._geoWatchId);
    window._geoWatchId=null;
  }

  let primeraVez=true;
  window._geoWatchId=navigator.geolocation.watchPosition(function(pos){
    uLat=pos.coords.latitude;uLng=pos.coords.longitude;
    actualizarMarcadorUsuario(uLat,uLng,pos.coords.accuracy);
    prepararInfoUbicacion(uLat,uLng,primeraVez);
    if(primeraVez){
      restoreFab();
      if(window._pendingRouteStop!=null){
        const pend=window._pendingRouteStop;
        window._pendingRouteStop=null;
        dibujarRutaHaciaParada(pend);
      }else{
        const tabs=document.querySelectorAll('.mtab');
        if(tabs[2])mapaSwitchTab(2,tabs[2]);
      }
      primeraVez=false;
    }
  },function(){restoreFab();alert('No se pudo obtener tu ubicación.');},{enableHighAccuracy:true,maximumAge:5000});
}

function detenerSeguimientoUbicacion(){
  if(window._geoWatchId!=null){
    navigator.geolocation.clearWatch(window._geoWatchId);
    window._geoWatchId=null;
  }
}

// El usuario pidió explícitamente quitar su ubicación del mapa por completo.
// A diferencia de detenerSeguimientoUbicacion() (que solo para el GPS al cambiar de sección),
// esta apaga y borra todo: marcador, círculo, ruta trazada, y la info del tab "Llegar".
function detenerUbicacionCompleta(){
  detenerSeguimientoUbicacion();
  if(uMark){map.removeLayer(uMark);uMark=null;}
  if(uCirc){map.removeLayer(uCirc);uCirc=null;}
  if(window._routeLine){map.removeLayer(window._routeLine);window._routeLine=null;}
  if(window._routeBubble){map.removeLayer(window._routeBubble);window._routeBubble=null;}
  if(window._targetMarker){map.removeLayer(window._targetMarker);window._targetMarker=null;}
  window._targetStopIdx=null;
  uLat=null;uLng=null;
  window._nearStop=null;window._userLL=null;
  const infoBox=document.getElementById('rutaEstacionInfo');
  if(infoBox)infoBox.remove();
  if(typeof renderComoLlegar==='function')renderComoLlegar();
}

// Ícono de "vas caminando" en tu posición real (se mueve solo con el GPS)
function actualizarMarcadorUsuario(lat,lng,accuracy){
  if(uMark)map.removeLayer(uMark);
  if(uCirc)map.removeLayer(uCirc);
  uCirc=L.circle([lat,lng],{radius:accuracy||30,color:'#378ADD',fillColor:'#378ADD',fillOpacity:.1,weight:1}).addTo(map);
  uMark=L.marker([lat,lng],{icon:L.divIcon({className:'',html:'<div class="walker-icon">🚶</div>',iconSize:[34,34],iconAnchor:[17,17]}),zIndexOffset:500}).addTo(map);
}

// Calcula todo (parada más cercana, tiempo caminando, llegada de camiones)
// y lo guarda para pintarlo en el tab "Llegar"
function prepararInfoUbicacion(lat,lng,ajustarVista){
  let minD=Infinity,near=null,ni=0;
  STOPS.forEach((s,i)=>{const d=distM(lat,lng,s.lat,s.lng);if(d<minD){minD=d;near=s;ni=i;}});
  const metros=Math.round(minD),camRaw=Math.round(metros/80);
  function fmtCam(min){
    if(min<60)return min+' min';
    const h=Math.floor(min/60),m=min%60;
    return h+' hora'+(h>1?'s':'')+(m>0?' '+m+' min':'');
  }
  const camStr=fmtCam(camRaw);
  const llegaHora=hhmm(simMin+camRaw);
  function nextArr(deps,durs){
    for(let i=0;i<deps.length;i++){
      const eta=deps[i]+(SM[ni]/100*(durs[i]||82));
      if(eta>simMin)return Math.round(eta);
    }return null;
  }
  const aA=nextArr(DA,DUA),aB=nextArr(DB,DUB);

  window._nearStop=near;window._userLL=[lat,lng];window._camStr=camStr;
  window._camRaw=camRaw;window._llegaHora=llegaHora;window._metros=metros;
  window._busEtaA=aA;window._busEtaB=aB;

  if(uMark){
    uMark.bindPopup(
      '<div style="text-align:center">'+
        '<b>📍 Estás aquí</b><br>'+near.n+'. '+near.name+'<br><small>'+metros+'m</small><br>'+
        '<button onclick="detenerUbicacionCompleta()" style="margin-top:8px;background:var(--g);color:#fff;border:none;border-radius:14px;padding:6px 14px;font-size:11px;font-weight:800;cursor:pointer">✕ Quitar mi ubicación</button>'+
      '</div>',
      {autoPan:false,closeButton:false}
    );
    if(ajustarVista)uMark.openPopup();
  }

  // Trazar ruta punteada hacia la parada + burbuja de tiempo, estilo Maps.
  // Si el usuario eligió una estación específica ("Trazar ruta"), respetamos esa,
  // no la más cercana — así no se "congela" de vuelta cada vez que llega el GPS.
  const destino=(window._targetStopIdx!=null&&STOPS[window._targetStopIdx])?STOPS[window._targetStopIdx]:near;
  const destMetros=destino===near?metros:Math.round(distM(lat,lng,destino.lat,destino.lng));
  const destCamRaw=destino===near?camRaw:Math.round(destMetros/80);
  const destCamStr=fmtCam(destCamRaw);

  if(window._routeLine){map.removeLayer(window._routeLine);window._routeLine=null;}
  if(window._routeBubble){map.removeLayer(window._routeBubble);window._routeBubble=null;}
  if(window._targetMarker){map.removeLayer(window._targetMarker);window._targetMarker=null;}
  window._routeLine=L.polyline([[lat,lng],[destino.lat,destino.lng]],{color:'#4285F4',weight:4,opacity:.85,dashArray:'2,10',lineCap:'round'}).addTo(map);
  const midLat=(lat+destino.lat)/2,midLng=(lng+destino.lng)/2;
  window._routeBubble=L.marker([midLat,midLng],{icon:L.divIcon({className:'',html:'<div class="walk-bubble">'+destCamStr+'</div>',iconAnchor:[26,14]}),interactive:false}).addTo(map);
  // Resaltar la estación a la que vas — para que se note que ahí es a donde tienes que llegar
  window._targetMarker=L.marker([destino.lat,destino.lng],{icon:L.divIcon({className:'',html:'<div class="target-pin"><div class="target-pulse"></div><div class="target-flag">🚩</div></div>',iconSize:[46,46],iconAnchor:[23,40]}),zIndexOffset:600,interactive:false}).addTo(map);

  if(ajustarVista&&window._targetStopIdx==null){
    map.fitBounds(L.latLngBounds([[lat,lng],[near.lat,near.lng]]),{padding:[70,90]});
  }

  renderComoLlegar();
}

function renderComoLlegar(){
  const near=window._nearStop,ll=window._userLL;
  const prompt=document.getElementById('comoLlegarPrompt');
  const opts=document.getElementById('comoLlegarOpts');
  const head=document.getElementById('comoLlegarHeader');
  if(!near||!ll){
    if(prompt)prompt.style.display='block';
    if(opts)opts.style.display='none';
    if(head)head.innerHTML='';
    return;
  }
  if(prompt)prompt.style.display='none';
  if(opts)opts.style.display='block';
  const lat=ll[0],lng=ll[1];
  const camStr=window._camStr,camRaw=window._camRaw,cam=camRaw;
  const aA=window._busEtaA,aB=window._busEtaB;

  function fmtMin(m){
    if(m<60)return m+' min';
    const h=Math.floor(m/60),r=m%60;
    return h+' hora'+(h>1?'s':'')+(r>0?' '+r+' min':'');
  }
  function busRow(arr,label){
    if(!arr)return'<div class="cll-busrow" style="background:#f5f5f5;color:#999"><span>😴</span> '+label+': Sin más viajes hoy</div>';
    const mins=Math.round(arr-simMin),llega=cam<=mins;
    const bg=llega?'#E8F8F0':'#FEF0EF',bc=llega?'#1D9E75':'#E74C3C',tc=llega?'#0F6E56':'#C0392B';
    return'<div class="cll-busrow" style="background:'+bg+';border:2px solid '+bc+'">'+
      '<div style="font-size:13.5px;font-weight:800;color:'+tc+';margin-bottom:5px">'+(llega?'✅ ¡SÍ LLEGAS!':'⚠️ ¡APÚRATE!')+' — '+label+'</div>'+
      '<div style="font-size:13px;color:#444;line-height:1.7">🚌 El camión llega en <b style="font-size:14.5px;color:'+tc+'">'+fmtMin(mins)+'</b> a esa parada</div></div>';
  }

  if(head)head.innerHTML=
    '<div class="cll-summary">'+
      '<div class="cll-walkrow">'+
        '<div class="cll-walkico">🚶</div>'+
        '<div><div class="cll-walktime">'+camStr+' caminando</div>'+
        '<div class="cll-arr">Llegarías ahí a las <b>'+window._llegaHora+'</b></div></div>'+
      '</div>'+
      '<div class="cll-carrow">'+
        '<div class="cll-carico">🚗</div>'+
        '<div class="cll-cartime">~'+fmtMinutos(estimarTiempoAuto(window._metros))+' en carro</div>'+
      '</div>'+
      '<div class="cll-stopnote">📍 Esta es tu parada más cercana a donde estás ahora:</div>'+
      '<div class="cll-stopname">'+near.n+'. '+near.name+' <span class="cll-dist">· '+window._metros+' m</span></div>'+
    '</div>'+
    '<div class="cll-bustitle">🚌 ¿El camión llega antes que tú?</div>'+
    busRow(aA,'T-01-023')+busRow(aB,'T-01-015');

  const gm='https://www.google.com/maps/dir/?api=1&origin='+lat+','+lng+'&destination='+near.lat+','+near.lng+'&travelmode=walking';
  const ub='https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]='+near.lat+'&dropoff[longitude]='+near.lng+'&dropoff[nickname]='+encodeURIComponent(near.name);
  if(opts)opts.innerHTML=
    '<div class="cll-bustitle" style="margin-top:14px">🚕 ¿Cómo quieres llegar a la parada?</div>'+
    '<a href="'+gm+'" target="_blank" rel="noopener" class="cll-card">'+
      '<div class="cll-ico" style="background:#4285F4">🗺️</div>'+
      '<div class="cll-info"><div class="cll-title">Google Maps</div><div class="cll-note">Ruta a pie paso a paso, gratis</div></div>'+
      '<span class="cll-go">Abrir ›</span>'+
    '</a>'+
    '<a href="'+ub+'" target="_blank" rel="noopener" class="cll-card">'+
      '<div class="cll-ico" style="background:#000">🚕</div>'+
      '<div class="cll-info"><div class="cll-title">Uber</div><div class="cll-note">Viaje directo a la parada, paga con tarjeta</div></div>'+
      '<span class="cll-go">Abrir ›</span>'+
    '</a>'+
    '<button onclick="abrirDidi('+near.lat+','+near.lng+')" class="cll-card cll-btn">'+
      '<div class="cll-ico" style="background:#FF6600">🚖</div>'+
      '<div class="cll-info"><div class="cll-title">DiDi</div><div class="cll-note">Otra opción de viaje, compara el precio</div></div>'+
      '<span class="cll-go">Abrir ›</span>'+
    '</button>';
}

function abrirDidi(lat,lng){
  const esA=/Android/i.test(navigator.userAgent),esI=/iPhone|iPad|iPod/i.test(navigator.userAgent);
  if(esA){
    var fallback='https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.sdu.didi.psnger';
    window.location.href='intent://passenger/v1/set-destination?lat='+lat+'&lng='+lng+'#Intent;scheme=didi;package=com.sdu.didi.psnger;S.browser_fallback_url='+fallback+';end';
  } else if(esI){
    window.location.href='didi://passenger/v1/set-destination?lat='+lat+'&lng='+lng;
    setTimeout(function(){window.open('https://apps.apple.com/mx/app/didi-solicita-taxi-y-m%C3%A1s/id1082992662','_blank');},1500);
  } else {
    window.open('https://web.didiglobal.com/mx/passenger/','_blank');
  }
}

// ── RELOJ ──────────────────────────────────────────────────────────────────
function tick(){
  const n=new Date();
  setEl('clock',n.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}));
  setEl('dateLabel',n.toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'}));
}
setInterval(tick,1000);tick();

// ── MENUS ──────────────────────────────────────────────────────────────────
function toggleMenu(id){const m=document.getElementById(id);if(m)m.style.display=m.style.display==='none'?'block':'none';}
function compartirApp(){
  toggleMenu('qrAppMenu');
  const d={title:'SITT Tijuana – Ruta T101',text:'🚌 Sigue la Ruta T101 del SITT Tijuana en tiempo real.',url:'https://sitt-tijuana.github.io/sitt-ruta-tijuana/'};
  if(navigator.share)navigator.share(d).catch(function(){});
  else navigator.clipboard.writeText(d.url).then(function(){alert('¡Link copiado! 📋');}). catch(function(){prompt('Copia este link:','https://sitt-tijuana.github.io/sitt-ruta-tijuana/');});
}
function guardarQRApp(){toggleMenu('qrAppMenu');const a=document.createElement('a');a.href=document.getElementById('qrAppImg').src;a.download='SITT-App-QR.jpg';a.click();}
function compartirEnc(){toggleMenu('qrEncMenu');const d={title:'Encuesta SITT',text:'Califica el servicio del SITT Tijuana Ruta T101.',url:'https://forms.gle/7oH2N7veHtkUmhsBA'};if(navigator.share)navigator.share(d).catch(function(){});else navigator.clipboard.writeText(d.url).then(function(){alert('¡Link copiado!');}).catch(function(){});}
function guardarQREnc(){toggleMenu('qrEncMenu');const a=document.createElement('a');a.href=document.getElementById('qrEncImg').src;a.download='SITT-Encuesta-QR.jpg';a.click();}

// ── ENCUESTA ───────────────────────────────────────────────────────────────
const ratings=[0,0,0,0,0,0];
['ct0','ct1','ct2','ct3','ct4','ct5'].forEach(function(id,ci){
  const c=document.getElementById(id);if(!c)return;
  for(let s=1;s<=5;s++){
    const b=document.createElement('button');b.textContent='★';
    b.onclick=(function(star,catIdx,cont){return function(){ratings[catIdx]=star;cont.querySelectorAll('button').forEach(function(bb,bi){bb.classList.toggle('on',bi<star);});}}) (s,ci,c);
    c.appendChild(b);
  }
});
function enviarEnc(){
  if(ratings.every(function(r){return r===0;})){alert('Por favor califica al menos una categoría.');return;}
  const entries=['entry.756012692','entry.1447228189','entry.820140166','entry.1967601653','entry.2025664217','entry.728306715'];
  const sug=document.getElementById('sug').value||'';
  const genEl=document.querySelector('input[name="genero"]:checked');
  const gen=genEl?genEl.value:'';
  // Abrir Google Forms pre-llenado
  const formBase='https://docs.google.com/forms/d/e/1FAIpQLSeNudnD__SFG1REtKBFxS0C7gfUES6B51CT2UMI0RpbYM3NHg/viewform';
  const formEntries=['entry.756012692','entry.1447228189','entry.820140166','entry.1967601653','entry.2025664217','entry.728306715'];
  let formUrl=formBase+'?entry.236904433='+encodeURIComponent(gen);
  ratings.forEach(function(v,i){formUrl+='&'+formEntries[i]+'='+encodeURIComponent(v);});
  if(sug)formUrl+='&entry.172172373='+encodeURIComponent(sug);
  window.open(formUrl,'_blank');
  document.getElementById('encForm').style.display='none';
  document.getElementById('encGr').style.display='block';
}


function refreshBus(u){
  jumpNow();
  update();
  // Centrar mapa en el camión actualizado
  setTimeout(function(){trackBus(u);},100);
  // Flash feedback
  const card=document.getElementById('c'+u);
  if(card){
    card.style.transition='opacity 0.2s';
    card.style.opacity='0.5';
    setTimeout(function(){card.style.opacity='1';},300);
  }
}

// ── COMPARTIR SUGERENCIAS ─────────────────────────────────────────────────
let tipoSeleccionado='';
function selTipo(btn,tipo){
  tipoSeleccionado=tipo;
  document.querySelectorAll('.tipo-btn').forEach(function(b){b.classList.remove('sel');});
  btn.classList.add('sel');
}

function getSugTexto(){
  return document.getElementById('sugerenciaTexto').value.trim();
}
function validarSug(){
  const t=getSugTexto();
  if(!t){
    document.getElementById('sugerenciaTexto').style.borderColor='#E74C3C';
    setTimeout(function(){document.getElementById('sugerenciaTexto').style.borderColor='#e0ddd6';},2000);
    return false;
  }
  return true;
}
function mostrarConfirm(){
  document.getElementById('sugConfirm').style.display='block';
  document.getElementById('sugerenciaTexto').value='';
  tipoSeleccionado='';
  document.querySelectorAll('.tipo-btn').forEach(function(b){b.classList.remove('sel');});
}

function enviarSheets(){
  if(!validarSug())return;
  const texto=getSugTexto();
  const btn=document.getElementById('btnSheets');
  btn.textContent='Enviando...';btn.disabled=true;
  const url='https://script.google.com/macros/s/AKfycbw_SV9_rBe7ybvVm10rKc4nMLbIM2qxLAbiEV_sGuAMLtMtBlDg60QjYTVU624pG9o/exec';
  const form=document.createElement('form');
  form.method='POST';form.action=url;form.target='_sugIframe';form.style.display='none';
  const fields={tipo:tipoSeleccionado||'General',sugerencia:texto,nombre:'Anónimo',fuente:'app'};
  Object.keys(fields).forEach(function(k){
    const i=document.createElement('input');i.type='hidden';i.name=k;i.value=fields[k];form.appendChild(i);
  });
  let iframe=document.getElementById('_sugIframe');
  if(!iframe){iframe=document.createElement('iframe');iframe.name='_sugIframe';iframe.id='_sugIframe';iframe.style.display='none';document.body.appendChild(iframe);}
  document.body.appendChild(form);form.submit();
  setTimeout(function(){document.body.removeChild(form);},3000);
  setTimeout(function(){
    mostrarConfirm();
    btn.innerHTML='📊 Enviar';btn.disabled=false;
  },800);
}

function enviarCorreo(){
  if(!validarSug())return;
  const texto=getSugTexto();
  const tipo=tipoSeleccionado||'General';
  const asunto=encodeURIComponent('Sugerencia SITT T101 — '+tipo);
  const cuerpo=encodeURIComponent('Categoría: '+tipo+'\n\n'+texto);
  window.location.href='mailto:jairpalma2910@gmail.com?subject='+asunto+'&body='+cuerpo;
  setTimeout(function(){mostrarConfirm();},500);
}


// ── POPULATE STOPS ────────────────────────────────────────────────────────
function populateStops(){
  const sel=document.getElementById('esel');
  if(!sel)return;
  // Clear existing options except first
  while(sel.options.length>1)sel.remove(1);
  STOPS.forEach(function(s,i){
    const o=document.createElement('option');
    o.value=i;
    o.textContent=s.n+'. '+s.name;
    sel.appendChild(o);
  });
}
// ── INIT ───────────────────────────────────────────────────────────────────
populateStops();
renderStationsList();
jumpNow();
update();
updateProx();

// Registrar Service Worker + detectar actualizaciones
if('serviceWorker' in navigator){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('sw.js').then(function(reg){
      console.log('SW registrado');

      // Si ya había una versión nueva esperando cuando abriste la app
      if(reg.waiting) mostrarBannerActualizar(reg);

      // Cuando se detecta una descarga de nueva versión
      reg.addEventListener('updatefound',function(){
        var nuevo=reg.installing;
        if(!nuevo)return;
        nuevo.addEventListener('statechange',function(){
          if(nuevo.state==='installed'&&navigator.serviceWorker.controller){
            mostrarBannerActualizar(reg);
          }
        });
      });

      // Revisar si hay versión nueva cada vez que se vuelve a abrir la app
      document.addEventListener('visibilitychange',function(){
        if(document.visibilityState==='visible')reg.update();
      });
      // Y cada hora si la app se queda abierta
      setInterval(function(){reg.update();},60*60*1000);

    }).catch(function(err){
      console.log('SW error:',err);
    });

    // Cuando el usuario confirma la actualización, recargar una sola vez
    var recargando=false;
    navigator.serviceWorker.addEventListener('controllerchange',function(){
      if(recargando)return;
      recargando=true;
      window.location.reload();
    });
  });
}

function mostrarBannerActualizar(reg){
  if(document.getElementById('updateBanner'))return;
  var banner=document.createElement('div');
  banner.id='updateBanner';
  banner.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#1D9E75;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 -4px 20px rgba(0,0,0,.2);animation:fadeUp .4s ease';
  banner.innerHTML=`
    <div style="font-size:22px;flex-shrink:0">🔄</div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:800">Nueva versión disponible</div>
      <div style="font-size:11px;opacity:.9;margin-top:1px">Toca para actualizar la app</div>
    </div>
    <button onclick="aplicarActualizacion()" class="shine-btn" style="background-color:#0F6E56;padding:10px 18px;font-size:12px;white-space:nowrap">
      Actualizar
    </button>
  `;
  document.body.appendChild(banner);
}

function aplicarActualizacion(){
  var btn=document.querySelector('#updateBanner button');
  if(btn){btn.textContent='Actualizando...';btn.disabled=true;}
  navigator.serviceWorker.getRegistration().then(function(reg){
    if(reg&&reg.waiting){
      reg.waiting.postMessage({type:'SKIP_WAITING'});
    }else{
      window.location.reload();
    }
  });
}

// Banner de instalación
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',function(e){
  e.preventDefault();
  deferredPrompt=e;
  // Mostrar banner personalizado después de 3 segundos
  setTimeout(function(){
    if(deferredPrompt)mostrarBannerInstalar();
  },3000);
});

function mostrarBannerInstalar(){
  const banner=document.createElement('div');
  banner.id='installBanner';
  banner.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:9998;background:#fff;border-top:3px solid #7B1D1D;padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 -4px 20px rgba(0,0,0,.15);animation:fadeUp .4s ease';
  banner.innerHTML=`
    <img src="icon-192.png" style="width:44px;height:44px;border-radius:10px;flex-shrink:0" alt="SITT">
    <div style="flex:1">
      <div style="font-size:13px;font-weight:800;color:#7B1D1D">Instalar app SITT T101</div>
      <div style="font-size:11px;color:#666;margin-top:1px">Agrégala a tu pantalla de inicio para acceder rápido</div>
    </div>
    <button onclick="instalarApp()" style="background:#7B1D1D;color:#fff;border:none;border-radius:10px;padding:9px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">
      📲 Instalar
    </button>
    <button onclick="document.getElementById('installBanner').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;padding:0 4px">✕</button>
  `;
  document.body.appendChild(banner);
}

function instalarApp(){
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(result){
      if(result.outcome==='accepted'){
        console.log('App instalada');
      }
      deferredPrompt=null;
      const b=document.getElementById('installBanner');
      if(b)b.remove();
    });
  }
}

// Para iOS — mostrar instrucciones
const esIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent);
const esStandalone=window.navigator.standalone;
if(esIOS&&!esStandalone){
  setTimeout(function(){
    const banner=document.createElement('div');
    banner.id='iosInstallBanner';
    banner.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:9998;background:#fff;border-top:3px solid #7B1D1D;padding:14px 16px;box-shadow:0 -4px 20px rgba(0,0,0,.15);animation:fadeUp .4s ease';
    banner.innerHTML=`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <img src="icon-192.png" style="width:40px;height:40px;border-radius:10px" alt="SITT">
        <div>
          <div style="font-size:13px;font-weight:800;color:#7B1D1D">Instalar app SITT T101</div>
          <div style="font-size:11px;color:#666">Para acceder rápido desde tu iPhone</div>
        </div>
        <button onclick="document.getElementById('iosInstallBanner').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#999;margin-left:auto;flex-shrink:0">✕</button>
      </div>
      <div style="background:#f4f4f2;border-radius:10px;padding:10px 12px;font-size:12px;color:#444;line-height:1.7">
        1. Toca el botón <b>Compartir</b> ⬆️ de Safari<br>
        2. Selecciona <b>"Agregar a pantalla de inicio"</b><br>
        3. Toca <b>"Agregar"</b> ✓
      </div>
    `;
    document.body.appendChild(banner);
  },3000);
}

// ── MODO OSCURO ──────────────────────────────────────────────────────────────
function toggleDarkMode(){
  const on=document.body.classList.toggle('dark');
  localStorage.setItem('sittDark',on?'1':'0');
  const btn=document.getElementById('darkToggleBtn');
  if(btn)btn.textContent=on?'☀️':'🌙';
  if(typeof map!=='undefined'){
    if(on&&map.hasLayer(capaCalles)){
      map.removeLayer(capaCalles);
      capaCallesOscura.addTo(map);
    }else if(!on&&map.hasLayer(capaCallesOscura)){
      map.removeLayer(capaCallesOscura);
      capaCalles.addTo(map);
    }
  }
}
(function initDarkMode(){
  if(localStorage.getItem('sittDark')==='1'){
    document.body.classList.add('dark');
    const btn=document.getElementById('darkToggleBtn');
    if(btn)btn.textContent='☀️';
    if(typeof map!=='undefined'&&map.hasLayer(capaCalles)){
      map.removeLayer(capaCalles);
      capaCallesOscura.addTo(map);
    }
  }
})();

// ── COMPARTIR VIAJE EN VIVO ──────────────────────────────────────────────────
function compartirViaje(u){
  const s=u==='A'?getBus(simMin,DA,DUA):getBus(simMin,DB,DUB);
  const nombre=u==='A'?'T-01-023':'T-01-015';
  const link='https://sitt-tijuana.github.io/sitt-ruta-tijuana/';
  let msg;
  if(s.on){
    msg='🚌 Voy en el camión '+nombre+' de la Ruta T101 (SITT Tijuana). Sigue mi viaje en vivo aquí: '+link;
  }else{
    msg='🚌 Te comparto la Ruta T101 del SITT Tijuana, para que veas cuándo llega tu camión: '+link;
  }
  if(navigator.share){
    navigator.share({title:'Ruta T101 SITT',text:msg}).catch(function(){});
  }else{
    window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
  }
}

// ── PANTALLA COMPLETA DEL MAPA ──────────────────────────────────────────────
function toggleFullscreenMap(){
  document.body.classList.toggle('map-fullscreen');
  setTimeout(function(){
    if(typeof map!=='undefined')map.invalidateSize({animate:false});
  },60);
}

// ── NAVEGAR A INFORMACIÓN DESDE EL MAPA ──────────────────────────────────────
function irAInformacion(){
  openSection('info');
}

// ── VER IMAGEN DE RUTA EN GRANDE ─────────────────────────────────────────────
function preguntarAmpliarRuta(){
  if(confirm('¿Quieres ver la imagen de la ruta completa, en pantalla grande?')){
    ampliarImagenRuta();
  }
}
function ampliarImagenRuta(){
  cerrarImagenRuta();
  const modal=document.createElement('div');
  modal.id='rutaLightbox';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease';
  modal.innerHTML=`
    <button onclick="cerrarImagenRuta()" style="position:absolute;top:calc(16px + env(safe-area-inset-top));right:16px;background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:9px 16px;font-size:13px;font-weight:800;cursor:pointer;z-index:2">✕ Cerrar</button>
    <img src="ruta-mapa.png" alt="Mapa de la Ruta T101" style="max-width:100%;max-height:90vh;border-radius:10px;object-fit:contain;position:relative;z-index:1">
  `;
  modal.addEventListener('click',function(e){if(e.target===modal)cerrarImagenRuta();});
  document.body.appendChild(modal);
}
function cerrarImagenRuta(){
  const m=document.getElementById('rutaLightbox');
  if(m)m.remove();
}

// ── MODAL DE INFORMACIÓN DE PARADA (al tocarla en el mapa o en la lista) ────
function mostrarInfoEstacion(idx){
  const s=STOPS[idx];
  if(!s)return;
  cerrarInfoEstacion();
  const modal=document.createElement('div');
  modal.id='estacionModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99998;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s ease';
  modal.addEventListener('click',function(e){if(e.target===modal)cerrarInfoEstacion();});
  const gm='https://www.google.com/maps/dir/?api=1&destination='+s.lat+','+s.lng;
  const ub='https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]='+s.lat+'&dropoff[longitude]='+s.lng+'&dropoff[nickname]='+encodeURIComponent(s.name);
  modal.innerHTML=`
    <div style="background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:480px;padding:10px 20px 22px;animation:fadeUp .3s ease;max-height:85vh;overflow-y:auto">
      <div style="display:flex;justify-content:center;margin-bottom:14px;position:sticky;top:0"><div style="width:38px;height:5px;border-radius:20px;background:#e0ddd6"></div></div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
        <div style="width:52px;height:52px;border-radius:50%;background:var(--gl);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;border:2px solid var(--g)">${iconoParada(s.name)}</div>
        <div style="min-width:0">
          <div style="font-size:11px;font-weight:800;color:#a8863a;text-transform:uppercase;letter-spacing:.04em">Parada ${s.n}</div>
          <div style="font-size:17px;font-weight:800;color:var(--g);line-height:1.2">${s.name}</div>
        </div>
      </div>
      <button onclick="trazarRutaAEstacion(${idx})" class="shine-btn" style="width:100%;background-color:var(--g);margin-bottom:14px">🧭 Trazar ruta y ver tiempo</button>
      <div style="font-size:11px;font-weight:800;color:var(--g);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em">¿Cómo llegar?</div>
      <a href="${gm}" target="_blank" rel="noopener" class="cll-card">
        <div class="cll-ico" style="background:#4285F4">🗺️</div>
        <div class="cll-info"><div class="cll-title">Google Maps</div><div class="cll-note">Ruta a pie paso a paso, gratis</div></div>
        <span class="cll-go">Abrir ›</span>
      </a>
      <a href="${ub}" target="_blank" rel="noopener" class="cll-card">
        <div class="cll-ico" style="background:#000">🚕</div>
        <div class="cll-info"><div class="cll-title">Uber</div><div class="cll-note">Viaje directo a la parada</div></div>
        <span class="cll-go">Abrir ›</span>
      </a>
      <button onclick="abrirDidi(${s.lat},${s.lng})" class="cll-card cll-btn">
        <div class="cll-ico" style="background:#FF6600">🚖</div>
        <div class="cll-info"><div class="cll-title">DiDi</div><div class="cll-note">Otra opción de viaje</div></div>
        <span class="cll-go">Abrir ›</span>
      </button>
      <button onclick="cerrarInfoEstacion()" style="width:100%;margin-top:8px;background:#f4f4f2;color:#666;border:none;border-radius:12px;padding:12px;font-size:13px;font-weight:700;cursor:pointer">✕ Cerrar</button>
    </div>
  `;
  document.body.appendChild(modal);
}
function cerrarInfoEstacion(){
  const m=document.getElementById('estacionModal');
  if(m)m.remove();
}

// ── VER UNA ESTACIÓN EN EL MAPA (desde la lista o desde el modal) ───────────
function verEstacionEnMapa(idx){
  const s=STOPS[idx];
  if(!s)return;
  cerrarInfoEstacion();
  const tabs=document.querySelectorAll('.mtab');
  if(tabs[0])mapaSwitchTab(0,tabs[0]);
  if(typeof mapaSheetSet==='function')mapaSheetSet('collapsed');
  setTimeout(function(){
    if(typeof map!=='undefined'){
      map.invalidateSize({animate:false});
      map.setView([s.lat,s.lng],17,{animate:true});
    }
  },280);
}

// ── TRAZAR RUTA DE MI UBICACIÓN A UNA ESTACIÓN ELEGIDA ───────────────────────
function trazarRutaAEstacion(idx){
  const s=STOPS[idx];
  if(!s)return;
  if(uLat==null||uLng==null){
    cerrarInfoEstacion();
    window._pendingRouteStop=idx;
    locateUser();
    return;
  }
  dibujarRutaHaciaParada(idx);
}

function mostrarInfoRutaEstacion(nombre,camStr,llegaHora,autoMin){
  let box=document.getElementById('rutaEstacionInfo');
  if(!box){
    box=document.createElement('div');
    box.id='rutaEstacionInfo';
    box.className='ruta-estacion-info';
    const wrap=document.getElementById('mapa-map-wrap');
    if(wrap)wrap.appendChild(box);
  }
  box.innerHTML=
    '<button class="msr-close" onclick="detenerUbicacionCompleta()"><span>✕</span> Cerrar</button>'+
    '<div style="font-size:14px;font-weight:800;color:#2f6fd6;margin-bottom:2px">🚶 '+camStr+' caminando</div>'+
    '<div style="font-size:12px;color:#444;margin-bottom:6px">a <b>'+nombre+'</b> · llegarías a las <b>'+llegaHora+'</b></div>'+
    (autoMin?'<div style="font-size:12.5px;color:#555;padding-top:6px;border-top:1px solid #eee">🚗 ~'+fmtMinutos(autoMin)+' si vas en carro</div>':'');
}

function dibujarRutaHaciaParada(idx){
  const s=STOPS[idx];
  if(!s||uLat==null)return;
  window._targetStopIdx=idx;
  const metros=Math.round(distM(uLat,uLng,s.lat,s.lng));
  const camRaw=Math.round(metros/80);
  function fmtCam(min){
    if(min<60)return min+' min';
    const h=Math.floor(min/60),m=min%60;
    return h+' hora'+(h>1?'s':'')+(m>0?' '+m+' min':'');
  }
  const camStr=fmtCam(camRaw);
  if(window._routeLine){map.removeLayer(window._routeLine);window._routeLine=null;}
  if(window._routeBubble){map.removeLayer(window._routeBubble);window._routeBubble=null;}
  if(window._targetMarker){map.removeLayer(window._targetMarker);window._targetMarker=null;}
  window._routeLine=L.polyline([[uLat,uLng],[s.lat,s.lng]],{color:'#4285F4',weight:4,opacity:.85,dashArray:'2,10',lineCap:'round'}).addTo(map);
  const midLat=(uLat+s.lat)/2,midLng=(uLng+s.lng)/2;
  window._routeBubble=L.marker([midLat,midLng],{icon:L.divIcon({className:'',html:'<div class="walk-bubble">'+camStr+'</div>',iconAnchor:[26,14]}),interactive:false}).addTo(map);
  window._targetMarker=L.marker([s.lat,s.lng],{icon:L.divIcon({className:'',html:'<div class="target-pin"><div class="target-pulse"></div><div class="target-flag">🚩</div></div>',iconSize:[46,46],iconAnchor:[23,40]}),zIndexOffset:600,interactive:false}).addTo(map);
  mostrarInfoRutaEstacion(s.n+'. '+s.name,camStr,hhmm(simMin+camRaw),estimarTiempoAuto(metros));
  cerrarInfoEstacion();
  const tabs=document.querySelectorAll('.mtab');
  if(tabs[0])mapaSwitchTab(0,tabs[0]);
  if(typeof mapaSheetSet==='function')mapaSheetSet('collapsed');
  setTimeout(function(){
    if(typeof map!=='undefined'){
      map.invalidateSize({animate:false});
      map.fitBounds(L.latLngBounds([[uLat,uLng],[s.lat,s.lng]]),{padding:[70,90]});
    }
  },280);
}

// ── IDIOMA (ES/EN) — por ahora traduce la pantalla de inicio ────────────────
const IDIOMA_TXT={
  es:{
    txtServicio:'Ruta Troncal Oficial',
    pill1:'🚌 2 Unidades',
    pill2:'📅 Lunes a Sábado',
    pill3:'📍 43 paradas',
    txtMainTitle:'¿Dónde viene el camión?',
    txtMainSub:'Mapa en vivo · Paradas · Horario de llegada',
    txtInfoTitle:'Información',
    txtInfoSub:'Tarifas · Horarios',
    txtEncTitle:'Encuesta',
    txtEncSub:'Califica el servicio',
    txtCompTitle:'Compartir',
    txtCompSub:'Comparte la app',
    txtSalir:'🚪 Salir de la aplicación',
    txtNavInicio:'← Inicio',
    stopSearchLabel:'¿Cuándo llega a mi parada?',
    eselDefault:'¿Cuándo llega a mi parada?',
    txtCerrar1:'Cerrar',
    txtVariacion:'⏱️ Variación de <b>hasta 15 min</b> · 👉 llega <b>10-15 min antes</b>',
    txtEnVivo:'En vivo',
    txtSalirPantallaCompleta:'✕ Salir de pantalla completa',
    txtTabCamiones:'Camiones',
    txtTabSimulador:'Simulador',
    txtTabLlegar:'Llegar',
    txtTabHorarios:'Horarios',
    txtTabRuta:'Ruta',
    txtNotaGPS:'⚠️ Ubicación estimada por horario — No es GPS en tiempo real',
    txtUnidadA:'Unidad A',
    txtUnidadB:'Unidad B',
    txtParadaActual1:'Parada actual',
    txtParadaActual2:'Parada actual',
    txtSiguiente1:'Siguiente:',
    txtSiguiente2:'Siguiente:',
    txtTerminal1:'Terminal Insurgentes',
    txtTerminal2:'Terminal Insurgentes',
    txtVerMapa1:'📍 Ver en mapa →',
    txtVerMapa2:'📍 Ver en mapa →',
    txtHoraActualCamion:'🕐 Hora actual del camión',
    txtSeActualizaSolo:'Se actualiza solo · Mueve la barra para explorar otras horas',
    txtHoraActualBtn:'🔄 Hora actual',
    txtEncuentraLlegar:'Encuentra cómo llegar',
    txtTocaUbicacion:'Toca el botón de ubicación en el mapa<br>para ver tus opciones de viaje',
    txtUsarUbicacion:'Usar mi ubicación',
    txtVerUberDidi:'Ver Uber, DiDi y Google Maps',
    txtHorariosTitulo:'🕐 Horarios — Lunes a Sábado',
    txtServicioTerminado:'🌙 Servicio terminado por hoy — el primer camión de mañana sale a las 6:00 a.m.',
    txtYaPaso:'Ya pasó',
    txtAhorita:'Ahorita',
    txtPorVenir:'Por venir',
    txtMatutino:'🌅 Matutino',
    txtVespertino:'🌇 Vespertino',
    txtMasInfo1:'ℹ️ Más información del servicio SITT',
    txtMasInfo2:'ℹ️ Más información del servicio SITT',
    txtRutaCompleta:'🗺️ Ruta completa',
    txtVerGrande:'⛶ Ver en grande',
    txtEstaciones:'📍 Estaciones (43)',
    txtEncHero1:'¡Tu opinión importa!',
    txtEncHero2:'Califica el servicio del SITT y ayúdanos<br>a mejorar el transporte de Tijuana',
    txtEncTit:'📋 Encuesta de satisfacción',
    txtEncSub2:'Tu opinión mejora el transporte de Tijuana.',
    txtGenero:'👤 Género',
    txtHombre:'👨 Hombre',
    txtMujer:'👩 Mujer',
    txtSatisfaccion:'Satisfacción',
    txtComodidad:'Comodidad',
    txtTrato:'Trato',
    txtLimpieza:'Limpieza',
    txtRapidez:'Rapidez',
    txtAccesibilidadEnc:'Accesibilidad',
    txtEscaneaQR:'para la encuesta oficial.',
    txtTocaCompartir:'👆 Toca para compartir',
    txtCompartir1:'📤 Compartir',
    txtGuardar1:'💾 Guardar',
    txtEnviarOpinion:'Enviar opinión ✓',
    txtGraciasOpinion:'¡Gracias por tu opinión!',
    txtJuntosConstruimos:'Juntos construimos un mejor<br>transporte para Tijuana 🚌',
    txtIrEncuestaOficial:'📋 Ir a la encuesta oficial completa del SITT',
    txtComparteApp:'¡Comparte la app!',
    txtAyudaMasPersonas:'Ayuda a más personas a saber cuándo viene el camión de la Ruta T101',
    txtTocaQR:'👆 Toca el QR para compartir o guardar',
    txtCompartirLink:'📤 Compartir link',
    txtGuardarQR:'💾 Guardar QR',
    txtCompartirContactos:'📤 Compartir con mis contactos',
    txtIdeaSugerencia:'¿Tienes una idea o sugerencia?',
    txtOpinionAyuda:'Tu opinión nos ayuda a mejorar el servicio para todos',
    txtSobreQueEs:'¿Sobre qué es tu sugerencia?',
    txtTipoHorarios:'🕐 Horarios',
    txtTipoRutas:'🗺️ Rutas',
    txtTipoCamiones:'🚌 Camiones',
    txtTipoAtencion:'😊 Atención',
    txtTipoOtro:'✏️ Otro',
    txtEnviar:'📊 Enviar',
    txtEnviarWSP:'Enviar por WhatsApp',
    txtGraciasSugerencia:'¡Gracias por tu sugerencia!',
    txtTomamosEnCuenta:'La tomamos en cuenta para mejorar el servicio',
    txtStatUnidades:'Unidades',
    txtStatParadas:'Paradas',
    txtStatDias:'Días/semana',
    txtInfoHeroTag:'Transporte seguro, accesible y eficiente',
    txtInfoHeroTitle:'¡Muévete<br>con <span style="color:var(--o)">SITT</span>!',
    txtTransporteTodos:'♿ Un transporte para todos',
    txtMayorCapacidad:'Mayor capacidad',
    txtMayorCapacidadTxt:'Unidades grandes para mover a más personas',
    txtAccUniversal:'Accesibilidad universal',
    txtAccUniversalTxt:'Diseñado para personas con discapacidad, adultos mayores y todos los usuarios',
    txtTarifaPref:'Tarifa preferente',
    txtTarifaPrefTxt:'Beneficios especiales para estudiantes, adultos mayores y personas con discapacidad',
    txtSegComodidad:'Seguridad y comodidad',
    txtSegComodidadTxt:'Choferes capacitados, unidades modernas y viajes más seguros',
    txtPuntoSalida:'🏁 Punto de salida',
    txtTerminalIns:'Terminal Insurgentes',
    txtPrimeraSal:'Primera: 6:00 a.m.',
    txtUltimaSal:'Última: 6:30 p.m.',
    txt12Salidas:'12 salidas al día',
    txtHorariosSalidaTit:'🕐 Horarios de salida — Lunes a Sábado',
    txtTodosHorarios:'*Todos los horarios son de salida en Terminal Insurgentes',
    txtMatutino2:'🌅 Matutino',
    txtVespertino2:'🌇 Vespertino',
    txtVerHorariosVivo:'🗺️ Ver horarios en vivo en el mapa',
    txtPuntoNaranjaTit:'El SITT es Punto Naranja',
    txtPuntoNaranjaTxt:'La <b>Terminal Insurgentes</b> es un espacio seguro. En caso de emergencia, acude al <b>edificio SITT</b>.',
    txtPuntoNaranjaFrase:'El Punto es que estemos todas seguras 🧡',
    txtTipsSeg:'🛡️ Tips de seguridad en el transporte público',
    txtTip1:'Ten listo el dinero exacto para el pago antes de subir',
    txtTip2:'Al caminar hacia la parada, hazlo de preferencia por calles transitadas',
    txtTip3:'Mantente atento a tus pertenencias; lleva tu bolsa o mochila al frente',
    txtAtencionUsuario:'📞 Atención al usuario',
    txtLunesViernes:'Lunes a viernes · 8:00 a.m. a 5:00 p.m.',
    txtDireccionCompleta:'Blvd. Insurgentes s/n, Colonia Azteca<br>C.P. 2224, Tijuana, B.C.',
    txtConoceMas:'🔗 Conoce más sobre el SITT',
    txtPaginaOficial:'Página oficial',
    txtAbrir1:'Abrir ›',
    txtNoticiasAvisos:'Noticias y avisos del servicio',
    txtAbrir2:'Abrir ›',
    txtTarifasServicio:'Tarifas de servicio',
    txtTarifaGeneral:'TARIFA GENERAL',
    txtTarifaPreferente:'TARIFA PREFERENTE',
    txtQuienPaga:'¿Quién paga $7? — Con credencial vigente en mano',
    txtEstudiantes2:'Estudiantes',
    txtAdultosMayores2:'Adultos mayores',
    txtDiscapacidad2:'Discapacidad',
    txtPagoExacto:'Pago exacto en monedas',
    txtNoBilletes:'No se aceptan billetes · No se da cambio',
    txtSitioWebBtn:'Sitio web'
  },
  en:{
    txtServicio:'Official Trunk Route',
    pill1:'🚌 2 Buses',
    pill2:'📅 Mon – Sat',
    pill3:'📍 43 stops',
    txtMainTitle:"Where's my bus?",
    txtMainSub:'Live map · Stops · Arrival time',
    txtInfoTitle:'Info',
    txtInfoSub:'Fares · Schedules',
    txtEncTitle:'Survey',
    txtEncSub:'Rate the service',
    txtCompTitle:'Share',
    txtCompSub:'Share the app',
    txtSalir:'🚪 Exit app',
    txtNavInicio:'← Home',
    stopSearchLabel:'When does my bus arrive?',
    eselDefault:'When does my bus arrive?',
    txtCerrar1:'Close',
    txtVariacion:'⏱️ Varies by <b>up to 15 min</b> · 👉 arrives <b>10-15 min early</b>',
    txtEnVivo:'Live',
    txtSalirPantallaCompleta:'✕ Exit full screen',
    txtTabCamiones:'Buses',
    txtTabSimulador:'Simulator',
    txtTabLlegar:'Get there',
    txtTabHorarios:'Schedule',
    txtTabRuta:'Route',
    txtNotaGPS:'⚠️ Estimated location by schedule — Not real-time GPS',
    txtUnidadA:'Unit A',
    txtUnidadB:'Unit B',
    txtParadaActual1:'Current stop',
    txtParadaActual2:'Current stop',
    txtSiguiente1:'Next:',
    txtSiguiente2:'Next:',
    txtTerminal1:'Insurgentes Terminal',
    txtTerminal2:'Insurgentes Terminal',
    txtVerMapa1:'📍 View on map →',
    txtVerMapa2:'📍 View on map →',
    txtHoraActualCamion:'🕐 Current bus time',
    txtSeActualizaSolo:'Updates automatically · Drag the bar to explore other times',
    txtHoraActualBtn:'🔄 Current time',
    txtEncuentraLlegar:'Find how to get there',
    txtTocaUbicacion:'Tap the location button on the map<br>to see your travel options',
    txtUsarUbicacion:'Use my location',
    txtVerUberDidi:'See Uber, DiDi & Google Maps',
    txtHorariosTitulo:'🕐 Schedule — Monday to Saturday',
    txtServicioTerminado:'🌙 Service ended for today — the first bus tomorrow leaves at 6:00 a.m.',
    txtYaPaso:'Already left',
    txtAhorita:'Right now',
    txtPorVenir:'Upcoming',
    txtMatutino:'🌅 Morning',
    txtVespertino:'🌇 Afternoon',
    txtMasInfo1:'ℹ️ More about the SITT service',
    txtMasInfo2:'ℹ️ More about the SITT service',
    txtRutaCompleta:'🗺️ Full route',
    txtVerGrande:'⛶ View full size',
    txtEstaciones:'📍 Stops (43)',
    txtEncHero1:'Your opinion matters!',
    txtEncHero2:'Rate the SITT service and help us<br>improve transportation in Tijuana',
    txtEncTit:'📋 Satisfaction survey',
    txtEncSub2:'Your opinion improves transportation in Tijuana.',
    txtGenero:'👤 Gender',
    txtHombre:'👨 Man',
    txtMujer:'👩 Woman',
    txtSatisfaccion:'Satisfaction',
    txtComodidad:'Comfort',
    txtTrato:'Service',
    txtLimpieza:'Cleanliness',
    txtRapidez:'Speed',
    txtAccesibilidadEnc:'Accessibility',
    txtEscaneaQR:'for the official survey.',
    txtTocaCompartir:'👆 Tap to share',
    txtCompartir1:'📤 Share',
    txtGuardar1:'💾 Save',
    txtEnviarOpinion:'Submit opinion ✓',
    txtGraciasOpinion:'Thanks for your opinion!',
    txtJuntosConstruimos:'Together we build better<br>transportation for Tijuana 🚌',
    txtIrEncuestaOficial:'📋 Go to the full official SITT survey',
    txtComparteApp:'Share the app!',
    txtAyudaMasPersonas:'Help more people know when the T101 Route bus is coming',
    txtTocaQR:'👆 Tap the QR to share or save',
    txtCompartirLink:'📤 Share link',
    txtGuardarQR:'💾 Save QR',
    txtCompartirContactos:'📤 Share with my contacts',
    txtIdeaSugerencia:'Have an idea or suggestion?',
    txtOpinionAyuda:'Your opinion helps us improve the service for everyone',
    txtSobreQueEs:'What is your suggestion about?',
    txtTipoHorarios:'🕐 Schedules',
    txtTipoRutas:'🗺️ Routes',
    txtTipoCamiones:'🚌 Buses',
    txtTipoAtencion:'😊 Service',
    txtTipoOtro:'✏️ Other',
    txtEnviar:'📊 Send',
    txtEnviarWSP:'Send via WhatsApp',
    txtGraciasSugerencia:'Thanks for your suggestion!',
    txtTomamosEnCuenta:'We take it into account to improve the service',
    txtStatUnidades:'Buses',
    txtStatParadas:'Stops',
    txtStatDias:'Days/week',
    txtInfoHeroTag:'Safe, accessible and efficient transportation',
    txtInfoHeroTitle:'Move around<br>with <span style="color:var(--o)">SITT</span>!',
    txtTransporteTodos:'♿ Transportation for everyone',
    txtMayorCapacidad:'Higher capacity',
    txtMayorCapacidadTxt:'Large buses to move more people',
    txtAccUniversal:'Universal accessibility',
    txtAccUniversalTxt:'Designed for people with disabilities, older adults and all users',
    txtTarifaPref:'Reduced fare',
    txtTarifaPrefTxt:'Special benefits for students, older adults and people with disabilities',
    txtSegComodidad:'Safety and comfort',
    txtSegComodidadTxt:'Trained drivers, modern buses and safer trips',
    txtPuntoSalida:'🏁 Departure point',
    txtTerminalIns:'Insurgentes Terminal',
    txtPrimeraSal:'First: 6:00 a.m.',
    txtUltimaSal:'Last: 6:30 p.m.',
    txt12Salidas:'12 departures a day',
    txtHorariosSalidaTit:'🕐 Departure schedule — Monday to Saturday',
    txtTodosHorarios:'*All times are departures from Insurgentes Terminal',
    txtMatutino2:'🌅 Morning',
    txtVespertino2:'🌇 Afternoon',
    txtVerHorariosVivo:'🗺️ See live schedule on the map',
    txtPuntoNaranjaTit:'SITT is an Orange Point',
    txtPuntoNaranjaTxt:'The <b>Insurgentes Terminal</b> is a safe space. In an emergency, go to the <b>SITT building</b>.',
    txtPuntoNaranjaFrase:'The point is for all of us to be safe 🧡',
    txtTipsSeg:'🛡️ Safety tips on public transportation',
    txtTip1:'Have the exact fare ready before boarding',
    txtTip2:'When walking to the stop, prefer busy streets',
    txtTip3:'Keep an eye on your belongings; carry your bag in front of you',
    txtAtencionUsuario:'📞 Customer service',
    txtLunesViernes:'Monday to Friday · 8:00 a.m. to 5:00 p.m.',
    txtDireccionCompleta:'Blvd. Insurgentes s/n, Colonia Azteca<br>C.P. 2224, Tijuana, B.C.',
    txtConoceMas:'🔗 Learn more about SITT',
    txtPaginaOficial:'Official website',
    txtAbrir1:'Open ›',
    txtNoticiasAvisos:'Service news and notices',
    txtAbrir2:'Open ›',
    txtTarifasServicio:'Service fares',
    txtTarifaGeneral:'GENERAL FARE',
    txtTarifaPreferente:'REDUCED FARE',
    txtQuienPaga:'Who pays $7? — With valid ID in hand',
    txtEstudiantes2:'Students',
    txtAdultosMayores2:'Older adults',
    txtDiscapacidad2:'Disability',
    txtPagoExacto:'Exact change in coins',
    txtNoBilletes:'Bills not accepted · No change given',
    txtSitioWebBtn:'Website'
  }
};
function aplicarIdioma(idioma){
  const dict=IDIOMA_TXT[idioma]||IDIOMA_TXT.es;
  Object.keys(dict).forEach(function(id){
    const el=document.getElementById(id);
    if(el)el.innerHTML=dict[id];
  });
  const fabTxt=idioma==='en'
    ?{fabActualizar:'Refresh',fabVerRuta:'View full route',fabPantallaCompleta:'Full screen'}
    :{fabActualizar:'Actualizar',fabVerRuta:'Ver ruta completa',fabPantallaCompleta:'Pantalla completa'};
  Object.keys(fabTxt).forEach(function(id){
    const el=document.getElementById(id);
    if(el)el.setAttribute('aria-label',fabTxt[id]);
  });
  const btn=document.getElementById('langToggleBtn');
  if(btn)btn.textContent=idioma==='es'?'🌐 ES':'🌐 EN';
  document.documentElement.lang=idioma;
  const navTitle=document.getElementById('navTitle');
  if(navTitle&&typeof sectionActual!=='undefined'&&sectionActual){
    const titulos=idioma==='en'?sectionTitlesEN:sectionTitles;
    navTitle.textContent=titulos[sectionActual]||navTitle.textContent;
  }
}
function toggleIdioma(){
  const cur=localStorage.getItem('sittIdioma')||'es';
  const nuevo=cur==='es'?'en':'es';
  localStorage.setItem('sittIdioma',nuevo);
  aplicarIdioma(nuevo);
  ocultarLangTip();
}
function ocultarLangTip(){
  const tip=document.getElementById('langTip');
  if(tip)tip.classList.remove('show');
  localStorage.setItem('sittLangTipSeen','1');
}
(function initIdioma(){
  const idioma=localStorage.getItem('sittIdioma')||'es';
  aplicarIdioma(idioma);
  if(!localStorage.getItem('sittLangTipSeen')){
    setTimeout(function(){
      const tip=document.getElementById('langTip');
      if(tip)tip.classList.add('show');
    },1600);
    setTimeout(ocultarLangTip,9000);
  }
})();

// ── CLIMA DE TIJUANA (Open-Meteo, gratis, sin API key) ───────────────────────
function iconoClima(code){
  if(code===0)return'☀️';
  if(code<=3)return'⛅';
  if(code===45||code===48)return'🌫️';
  if(code>=51&&code<=67)return'🌧️';
  if(code>=71&&code<=77)return'❄️';
  if(code>=80&&code<=82)return'🌦️';
  if(code>=95)return'⛈️';
  return'🌤️';
}
function cargarClima(){
  const box=document.getElementById('weatherWidget');
  if(!box||typeof fetch==='undefined')return;
  fetch('https://api.open-meteo.com/v1/forecast?latitude=32.5149&longitude=-117.0382&current=temperature_2m,weather_code&timezone=America/Tijuana')
    .then(function(r){return r.json();})
    .then(function(data){
      const t=Math.round(data.current.temperature_2m);
      box.textContent=iconoClima(data.current.weather_code)+' '+t+'°';
    })
    .catch(function(){box.textContent='🌤️ --°';});
}
try{cargarClima();}catch(e){}

// ── ANIMACIÓN "APARECER AL BAJAR" (Información) ──────────────────────────────
(function initScrollReveal(){
  if(typeof IntersectionObserver==='undefined')return;
  const obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  },{threshold:0.12});
  function activar(){
    document.querySelectorAll('.reveal:not(.visible)').forEach(function(el){obs.observe(el);});
  }
  // Al cargar y cada vez que se entra a una sección (por si el DOM cambia)
  document.addEventListener('DOMContentLoaded',activar);
  activar();
  window._activarScrollReveal=activar;
  // Red de seguridad: si algo falla, el contenido no debe quedarse invisible
  setTimeout(function(){
    document.querySelectorAll('.reveal').forEach(function(el){el.classList.add('visible');});
  },4000);
})();

// ── PANEL DE ACCESIBILIDAD ──────────────────────────────────────────────────
function abrirPanelAccesibilidad(){
  if(document.getElementById('accesModal'))return;
  const tamActual=localStorage.getItem('sittTextSize')||'normal';
  const contraste=localStorage.getItem('sittContraste')==='1';
  const voz=localStorage.getItem('sittVoz')==='1';
  const modal=document.createElement('div');
  modal.id='accesModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99996;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s ease';
  modal.addEventListener('click',function(e){if(e.target===modal)cerrarPanelAccesibilidad();});
  modal.innerHTML=`
    <div style="background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:480px;padding:10px 22px 26px;animation:fadeUp .3s ease">
      <div style="display:flex;justify-content:center;margin-bottom:14px"><div style="width:38px;height:5px;border-radius:20px;background:#e0ddd6"></div></div>
      <div style="font-size:16px;font-weight:800;color:var(--g);margin-bottom:18px;text-align:center">♿ Accesibilidad</div>

      <div style="margin-bottom:20px">
        <div style="font-size:11.5px;font-weight:800;color:var(--t2);margin-bottom:10px;letter-spacing:.05em">TAMAÑO DE TEXTO</div>
        <div style="display:flex;gap:8px">
          <button onclick="cambiarTamanoTexto('chico')" class="acces-opt" id="accOptChico" style="font-size:13px">Chico</button>
          <button onclick="cambiarTamanoTexto('normal')" class="acces-opt" id="accOptNormal" style="font-size:16px">Normal</button>
          <button onclick="cambiarTamanoTexto('grande')" class="acces-opt" id="accOptGrande" style="font-size:19px">Grande</button>
        </div>
      </div>

      <div class="acces-row">
        <div><div class="acces-row-tit">Alto contraste</div><div class="acces-row-sub">Colores más marcados</div></div>
        <label class="acces-switch"><input type="checkbox" id="toggleContraste" onchange="toggleAltoContraste()" ${contraste?'checked':''}><span class="acces-slider"></span></label>
      </div>

      <div class="acces-row" style="border-bottom:none;margin-bottom:20px">
        <div><div class="acces-row-tit">🔊 Leer en voz alta</div><div class="acces-row-sub">Agrega botones de audio en el mapa</div></div>
        <label class="acces-switch"><input type="checkbox" id="toggleVoz" onchange="toggleLeerVoz()" ${voz?'checked':''}><span class="acces-slider"></span></label>
      </div>

      <button onclick="cerrarPanelAccesibilidad()" class="shine-btn" style="width:100%;background-color:var(--g)">Listo</button>
    </div>
  `;
  document.body.appendChild(modal);
  marcarTamanoActivo(tamActual);
}
function cerrarPanelAccesibilidad(){
  const m=document.getElementById('accesModal');
  if(m)m.remove();
}
function marcarTamanoActivo(tam){
  ['Chico','Normal','Grande'].forEach(function(t){
    const btn=document.getElementById('accOpt'+t);
    if(btn)btn.classList.toggle('on',t.toLowerCase()===tam);
  });
}
function cambiarTamanoTexto(tam){
  document.body.classList.remove('text-chico','text-grande');
  if(tam==='chico')document.body.classList.add('text-chico');
  if(tam==='grande')document.body.classList.add('text-grande');
  localStorage.setItem('sittTextSize',tam);
  marcarTamanoActivo(tam);
  setTimeout(function(){if(typeof map!=='undefined')map.invalidateSize({animate:false});},100);
}
function toggleAltoContraste(){
  const chk=document.getElementById('toggleContraste');
  const on=chk?chk.checked:false;
  document.body.classList.toggle('alto-contraste',on);
  localStorage.setItem('sittContraste',on?'1':'0');
}
function toggleLeerVoz(){
  const chk=document.getElementById('toggleVoz');
  const on=chk?chk.checked:false;
  document.body.classList.toggle('leer-voz',on);
  localStorage.setItem('sittVoz',on?'1':'0');
}
function leerTexto(id){
  const el=document.getElementById(id);
  if(!el||typeof window.speechSynthesis==='undefined')return;
  const texto=(el.innerText||el.textContent||'').replace(/\s+/g,' ').trim();
  if(!texto)return;
  const idioma=localStorage.getItem('sittIdioma')||'es';
  const utter=new SpeechSynthesisUtterance(texto);
  utter.lang=idioma==='en'?'en-US':'es-MX';
  utter.rate=0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}
(function initAccesibilidad(){
  const tam=localStorage.getItem('sittTextSize');
  if(tam==='chico')document.body.classList.add('text-chico');
  if(tam==='grande')document.body.classList.add('text-grande');
  if(localStorage.getItem('sittContraste')==='1')document.body.classList.add('alto-contraste');
  if(localStorage.getItem('sittVoz')==='1')document.body.classList.add('leer-voz');
})();
