
// ── MAPA TABS ──────────────────────────────────────────────────────────────
function mapaSwitchTab(idx,btn){
  [0,1,2].forEach(function(i){
    var t=document.getElementById('mapaTab'+i);
    if(t)t.style.display=i===idx?'block':'none';
  });
  document.querySelectorAll('.mtab').forEach(function(b){b.classList.remove('on');});
  if(btn)btn.classList.add('on');
  var glider=document.getElementById('tabsGlider');
  if(glider)glider.style.transform='translateX('+(idx*100)+'%)';
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
function abrirModalParadas(){
  if(document.getElementById('paradasModal'))return;
  const modal=document.createElement('div');
  modal.id='paradasModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99998;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .2s ease';
  modal.addEventListener('click',function(e){if(e.target===modal)cerrarModalParadas();});

  const rows=(typeof STOPS!=='undefined'?STOPS:[]).map(function(s,i){
    return '<button class="parada-row" onclick="elegirParada('+i+')">'+
      '<span class="pr-num">'+s.n+'</span>'+
      '<span class="pr-name">'+s.name+'</span>'+
      '<span class="pr-arrow">›</span>'+
    '</button>';
  }).join('');

  modal.innerHTML=`
    <div style="background:#fff;border-radius:24px 24px 0 0;width:100%;max-width:480px;max-height:82vh;display:flex;flex-direction:column;animation:fadeUp .3s ease">
      <div style="display:flex;justify-content:center;padding-top:10px;flex-shrink:0">
        <div style="width:38px;height:5px;border-radius:20px;background:#e0ddd6"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px 10px;flex-shrink:0">
        <div style="font-size:15px;font-weight:800;color:#7B1D1D">🔍 ¿Cuándo llega a mi parada?</div>
        <button onclick="cerrarModalParadas()" style="background:#f4f4f2;border:none;border-radius:20px;padding:7px 14px 7px 12px;font-size:12px;font-weight:800;color:#7B1D1D;cursor:pointer;flex-shrink:0;display:flex;align-items:center;gap:4px">✕ Cerrar</button>
      </div>
      <input type="text" id="paradaFilter" placeholder="Escribe el nombre de tu parada..." oninput="filtrarParadas(this.value)"
        style="margin:0 18px 10px;padding:12px 14px;border-radius:12px;border:1.5px solid #e0ddd6;font-size:14px;font-family:inherit;flex-shrink:0">
      <div id="paradasListWrap" style="overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 10px 16px;flex:1">
        ${rows}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
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
}

function cerrarModalParadas(){
  const modal=document.getElementById('paradasModal');
  if(modal)modal.remove();
}

function actualizarBotonBusqueda(idx){
  const lbl=document.getElementById('stopSearchLabel');
  if(!lbl)return;
  const s=(typeof STOPS!=='undefined')?STOPS[idx]:null;
  lbl.textContent=s?(s.n+'. '+s.name):'¿Cuándo llega a mi parada?';
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
  const tab1=document.getElementById('mapaTab1');
  if(proxWrap&&tab1)tab1.appendChild(proxWrap);
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
      <span class="hchip-dot"></span>🕐 <span id="hchipHora">Próxima salida</span>
      <span class="hchip-arrow">⌃</span>
    </button>
  `;
  wrap.appendChild(chip);
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

function openSection(sec){
  document.getElementById('splash').classList.add('hide');
  setTimeout(function(){
    document.getElementById('splash').style.display='none';
    document.getElementById('app').style.display='block';
  },600);
  document.querySelectorAll('.section-page').forEach(function(s){s.classList.remove('active');});
  document.getElementById('sec-'+sec).classList.add('active');
  document.getElementById('navTitle').textContent = sectionTitles[sec]||'SITT T101';
  if(sec==='mapa'){
    initMapaSheet();
    setTimeout(function(){
      if(typeof map!=='undefined')map.invalidateSize({animate:false});
    },50);
    setTimeout(function(){
      if(typeof map!=='undefined'){
        map.invalidateSize({animate:false});
        map.eachLayer(function(layer){if(layer.redraw)layer.redraw();});
        verRuta();
      }
      jumpNow();update();updateProx();
    },350);
    setTimeout(function(){
      if(typeof map!=='undefined')map.invalidateSize({animate:false});
    },700);
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
  {name:"Central Camionera",lat:32.51647,lng:-116.9624,n:10,t:21},
  {name:"Guadalupe Victoria",lat:32.51597,lng:-116.96771,n:11,t:23},
  {name:"Alvaro Obregón",lat:32.51653,lng:-116.9757,n:12,t:25},
  {name:"Buena Vista",lat:32.51742,lng:-116.98735,n:13,t:27},
  {name:"Centinela",lat:32.51797,lng:-116.99527,n:14,t:29},
  {name:"Juan Ojeda Robles",lat:32.52073,lng:-117.00293,n:15,t:31},
  {name:"Hospital General",lat:32.52608,lng:-117.00895,n:16,t:33},
  {name:"CREA",lat:32.52885,lng:-117.01262,n:17,t:35},
  {name:"Palacio Municipal",lat:32.53241,lng:-117.01701,n:18,t:37},
  {name:"Diana Cazadora",lat:32.53521,lng:-117.02217,n:19,t:39},
  {name:"Pueblo Amigo",lat:32.53798,lng:-117.02598,n:20,t:41},
  {name:"Garita Puerta Mexico",lat:32.54086,lng:-117.02676,n:21,t:43},
  {name:"Amistad",lat:32.54046,lng:-117.02982,n:22,t:45},
  {name:"TERMINAL CENTRO",lat:32.5396,lng:-117.03749,n:23,t:47},
  {name:"Calle Tercera",lat:32.5347,lng:-117.03693,n:24,t:50},
  {name:"Jai Alai",lat:32.52846,lng:-117.03622,n:25,t:53},
  {name:"Seminario Sur",lat:32.52577,lng:-117.03232,n:26,t:55},
  {name:"Telefónica Sur",lat:32.52649,lng:-117.02813,n:27,t:57},
  {name:"Plaza Río",lat:32.52723,lng:-117.02098,n:28,t:59},
  {name:"Cuauhtémoc",lat:32.52401,lng:-117.01644,n:29,t:61},
  {name:"Ignacio Zaragoza",lat:32.52114,lng:-117.01155,n:30,t:63},
  {name:"Minarete",lat:32.51846,lng:-117.00667,n:31,t:65},
  {name:"Ferrocarril",lat:32.51734,lng:-117.00084,n:32,t:67},
  {name:"20 de Noviembre",lat:32.51636,lng:-116.9956,n:33,t:69},
  {name:"Américas",lat:32.51566,lng:-116.98755,n:34,t:71},
  {name:"Unidad Deportiva Tijuana",lat:32.5146,lng:-116.97374,n:35,t:73},
  {name:"Ermita",lat:32.51325,lng:-116.96898,n:36,t:75},
  {name:"Cruz Roja",lat:32.50757,lng:-116.96111,n:37,t:79},
  {name:"Cienega",lat:32.49238,lng:-116.93959,n:38,t:83},
  {name:"División del Norte",lat:32.48532,lng:-116.935,n:39,t:86},
  {name:"Constitucion del 17",lat:32.48251,lng:-116.93254,n:40,t:88},
  {name:"Arboledas",lat:32.47603,lng:-116.92906,n:41,t:90},
  {name:"México Lindo",lat:32.46815,lng:-116.92532,n:42,t:93},
  {name:"Simón Bolívar Sur",lat:32.46453,lng:-116.92289,n:43,t:96}
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
L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',{
  attribution:'© <a href="https://stadiamaps.com/">Stadia Maps</a> © <a href="https://openmaptiles.org/">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom:20,
  minZoom:10
}).addTo(map);
L.polyline(STOPS.map(s=>[s.lat,s.lng]),{color:'#ddd',weight:6,opacity:.6}).addTo(map);
L.polyline(STOPS.map(s=>[s.lat,s.lng]),{color:'#7B1D1D',weight:4,opacity:.9}).addTo(map);
const trA=L.polyline([],{color:'#1D9E75',weight:6,opacity:.95}).addTo(map);
const trB=L.polyline([],{color:'#378ADD',weight:6,opacity:.95}).addTo(map);

const sMarkers=STOPS.map((s,i)=>{
  const isT=s.name.startsWith('TERMINAL');
  const ic=L.divIcon({className:'',html:'<div style="width:'+(isT?15:8)+'px;height:'+(isT?15:8)+'px;border-radius:50%;background:'+(isT?'#7B1D1D':'#fff')+';border:'+(isT?'3px solid #C9A84C':'2px solid #7B1D1D')+';box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',iconAnchor:[isT?7:4,isT?7:4]});
  const m=L.marker([s.lat,s.lng],{icon:ic}).addTo(map);
  m.bindPopup('<b style="color:#7B1D1D">'+s.n+'. '+s.name+'</b>');
  return m;
});

function busIco(label,color,active){
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
  return L.divIcon({className:'',html:'<div style="opacity:'+op+';filter:drop-shadow(0 2px 5px rgba(0,0,0,.4));text-align:center">'+svg+'<div style="background:'+uc+';color:#fff;font-size:9px;font-weight:800;padding:1px 6px;border-radius:8px;border:1.5px solid #fff;margin-top:1px;display:inline-block">'+label+'</div></div>',iconAnchor:[35,42]});
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
    busA.setLatLng([sA.lat,sA.lng]);busA.setIcon(busIco('T-01-023','#1D9E75',true));
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
    busB.setLatLng([sB.lat,sB.lng]);busB.setIcon(busIco('T-01-015','#378ADD',true));
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
  const g=document.getElementById('tg');if(!g)return;g.innerHTML='';
  DA.forEach((d,i)=>{
    const dur=DUA[i],on=simMin>=d&&simMin<=(d+dur),past=simMin>(d+dur);
    g.innerHTML+='<div class="tp'+(on?' cur':past?' past':'')+'"><span class="td da"></span>'+hhmm(d)+' <small>T-023</small></div>';
  });
  DB.forEach((d,i)=>{
    const dur=DUB[i],on=simMin>=d&&simMin<=(d+dur),past=simMin>(d+dur);
    g.innerHTML+='<div class="tp'+(on?' cur':past?' past':'')+'"><span class="td db"></span>'+hhmm(d)+' <small>T-015</small></div>';
  });
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
  setEl('hchipHora',fh(next));
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
  if(s.on)map.setView([s.lat,s.lng],16,{animate:true});
  else map.setView([STOPS[0].lat,STOPS[0].lng],14,{animate:true});
  // Scroll al mapa
  const mapEl=document.getElementById('map');
  if(mapEl)mapEl.scrollIntoView({behavior:'smooth',block:'center'});
}
function verRuta(){map.fitBounds(L.latLngBounds(STOPS.map(s=>[s.lat,s.lng])),{padding:[20,20],animate:true});}

// ── UBICACIÓN ─────────────────────────────────────────────────────────────
let uMark=null,uCirc=null;
function distM(a,b,c,d){const R=6371000,dL=(c-a)*Math.PI/180,dG=(d-b)*Math.PI/180,x=Math.sin(dL/2)*Math.sin(dL/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dG/2)*Math.sin(dG/2);return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}

function locateUser(){
  if(!navigator.geolocation){alert('Tu dispositivo no soporta geolocalización');return;}
  const fab=document.getElementById('fabLocate');
  if(fab){fab.classList.add('mfab-loading');fab.innerHTML='<span class="mfab-spin"></span>';}
  function restoreFab(){if(fab){fab.classList.remove('mfab-loading');fab.innerHTML='📍';}}
  navigator.geolocation.getCurrentPosition(function(pos){
    restoreFab();
    uLat=pos.coords.latitude;uLng=pos.coords.longitude;
    if(uMark){map.removeLayer(uMark);map.removeLayer(uCirc);}
    uCirc=L.circle([uLat,uLng],{radius:pos.coords.accuracy,color:'#378ADD',fillColor:'#378ADD',fillOpacity:.1,weight:1}).addTo(map);
    uMark=L.circleMarker([uLat,uLng],{radius:10,color:'#fff',weight:3,fillColor:'#378ADD',fillOpacity:1}).addTo(map);
    map.setView([uLat,uLng],15,{animate:true});
    prepararInfoUbicacion(uLat,uLng);
    // Ir directo al tab "Llegar" con toda la información junta
    const tabs=document.querySelectorAll('.mtab');
    if(tabs[2])mapaSwitchTab(2,tabs[2]);
  },function(){restoreFab();alert('No se pudo obtener tu ubicación.');});
}

// Calcula todo (parada más cercana, tiempo caminando, llegada de camiones)
// y lo guarda para pintarlo en el tab "Llegar"
function prepararInfoUbicacion(lat,lng){
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

  if(uMark)uMark.bindPopup('<b>📍 Estás aquí</b><br>'+near.n+'. '+near.name+'<br><small>'+metros+'m</small>').openPopup();

  // Trazar ruta punteada hacia la parada + burbuja de tiempo, estilo Maps
  if(window._routeLine){map.removeLayer(window._routeLine);window._routeLine=null;}
  if(window._routeBubble){map.removeLayer(window._routeBubble);window._routeBubble=null;}
  window._routeLine=L.polyline([[lat,lng],[near.lat,near.lng]],{color:'#4285F4',weight:4,opacity:.85,dashArray:'2,10',lineCap:'round'}).addTo(map);
  const midLat=(lat+near.lat)/2,midLng=(lng+near.lng)/2;
  window._routeBubble=L.marker([midLat,midLng],{icon:L.divIcon({className:'',html:'<div class="walk-bubble">🚶 '+camStr+'</div>',iconAnchor:[34,14]}),interactive:false}).addTo(map);
  map.fitBounds(L.latLngBounds([[lat,lng],[near.lat,near.lng]]),{padding:[70,90]});

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

  function busRow(arr,label){
    if(!arr)return'<div class="cll-busrow" style="background:#f5f5f5;color:#999"><span>😴</span> '+label+': Sin más viajes hoy</div>';
    const mins=Math.round(arr-simMin),llega=cam<=mins;
    const bg=llega?'#E8F8F0':'#FEF0EF',bc=llega?'#1D9E75':'#E74C3C',tc=llega?'#0F6E56':'#C0392B';
    return'<div class="cll-busrow" style="background:'+bg+';border:2px solid '+bc+'">'+
      '<div style="font-size:13.5px;font-weight:800;color:'+tc+';margin-bottom:5px">'+(llega?'✅ ¡SÍ LLEGAS!':'⚠️ ¡APÚRATE!')+' — '+label+'</div>'+
      '<div style="font-size:13px;color:#444;line-height:1.7">🚌 El camión llega en <b style="font-size:14.5px;color:'+tc+'">'+mins+' min</b> a esa parada</div></div>';
  }

  if(head)head.innerHTML=
    '<div class="cll-summary">'+
      '<div class="cll-walkrow">'+
        '<div class="cll-walkico">🚶</div>'+
        '<div><div class="cll-walktime">'+camStr+' caminando</div>'+
        '<div class="cll-arr">Llegarías ahí a las <b>'+window._llegaHora+'</b></div></div>'+
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
  const d={title:'SITT Tijuana – Ruta T101',text:'🚌 Sigue la Ruta T101 del SITT Tijuana en tiempo real.',url:'https://sitt-ruta-t101.netlify.app'};
  if(navigator.share)navigator.share(d).catch(function(){});
  else navigator.clipboard.writeText(d.url).then(function(){alert('¡Link copiado! 📋');}). catch(function(){prompt('Copia este link:','https://sitt-ruta-t101.netlify.app');});
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

function enviarWSP(){
  if(!validarSug())return;
  const texto=getSugTexto();
  const tipo=tipoSeleccionado||'General';
  // Anónimo — no pide nombre
  const msg='🚌 *Sugerencia SITT T101*%0A%0A'
    +'📂 *Categoría:* '+encodeURIComponent(tipo)+'%0A'
    +'💬 '+encodeURIComponent(texto);
  window.open('https://wa.me/526121425724?text='+msg,'_blank');
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
