/** NEON LASTLINE — original, hand-drawn pixel artwork. No external art assets. */
export const SCENE_WIDTH = 1000;
export const SCENE_HEIGHT = 430;
const P = {
  ink:'#07151f', edge:'#101c29', night:'#0b1a2b', cyan:'#68f0df', teal:'#249c9d',
  pale:'#d7f3df', yellow:'#efc85f', orange:'#ee8e52', red:'#f17c75', green:'#89ac84',
};
const fract = v => v - Math.floor(v);
const noise = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const rect = (c,x,y,w,h,color) => { c.fillStyle=color; c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };
function poly(c,pts,color) { c.fillStyle=color;c.beginPath();c.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<pts.length;i++)c.lineTo(pts[i][0],pts[i][1]); c.closePath();c.fill(); }
function line(c,x1,y1,x2,y2,color,width=1) { c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x1)+.5,Math.round(y1)+.5);c.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);c.stroke(); }
function text(c,str,x,y,size,color,align='left') { c.fillStyle=color;c.font=`${size<10?'':'bold '}${size}px "Courier New", monospace`;c.textAlign=align;c.textBaseline='top';c.fillText(str,x,y); }
function glow(c,x,y,r,color,alpha=.12) { c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore(); }
function pixelEllipse(c,x,y,w,h,color) { const s=Math.max(2,Math.floor(h/4));rect(c,x+s,y,w-s*2,h,color);rect(c,x,y+s,w,h-s*2,color); }
function hpBar(c,x,y,hp,max,color,width=32) { if(!(max>0))return; const amount=clamp(hp/max,0,1);rect(c,x-width/2-1,y-1,width+2,5,'#071019');rect(c,x-width/2,y,width,3,'#364049');rect(c,x-width/2,y,Math.max(0,width*amount),3,color); }
const bgCache = new Map(), busCache = new Map();
const vignetteCache = new WeakMap(), entityTeams = new WeakMap(), entityBuffer = [];
const rainSeeds = Array.from({length:43},(_,i)=>[noise(i+753)*1130,noise(i+923)*480]);
const drawOrder = (a,b)=>(a.y??355)-(b.y??355)||(a.x??0)-(b.x??0);
function makeCanvas(w,h){
  try{
    let canvas;
    if(typeof OffscreenCanvas!=='undefined')canvas=new OffscreenCanvas(w,h);
    else if(typeof document!=='undefined'&&typeof document.createElement==='function'){canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;}
    if(!canvas||typeof canvas.getContext!=='function')return null;
    const ctx=canvas.getContext('2d');return ctx?{canvas,ctx}:null;
  }catch{return null;}
}
function stageIndex(stage) { if(typeof stage==='number')return stage; if(stage&&typeof stage==='object')return Number(stage.index??stage.id??stage.number??0)||0;return 0; }
function paintSky(c,stage=0) {
  const index=clamp(Math.floor(stageIndex(stage)||0),0,2), g=c.createLinearGradient(0,0,0,345);
  const sky=[['#122c3f','#344b57','#a06b65'],['#112b32','#48413f','#af8052'],['#20243c','#575066','#a98588']][Math.min(2,index)]||['#122c3f','#344b57','#a06b65'];g.addColorStop(0,sky[0]);g.addColorStop(.48,sky[1]);g.addColorStop(1,sky[2]);c.fillStyle=g;c.fillRect(0,0,1000,350);
  // Layered, stepped clouds deliberately retain the low-resolution silhouette.
  for(let k=0;k<20;k++){const x=noise(k+90)*1100-60,y=14+noise(k+43)*170,w=45+noise(k+2)*200;rect(c,x,y,w,3+noise(k+3)*8,k%2?'#273b4c55':'#78909816');}
  for(let i=0;i<58;i++){const x=noise(i+190)*1000,y=noise(i+820)*110;rect(c,x,y,i%13===0?2:1,1,'#b7d9d956');}
  // A pale moon, its lower edge lost in smog.
  pixelEllipse(c,822,33,52,52,'#d3d9c0');rect(c,830,40,6,4,'#b1bba9');rect(c,852,59,11,6,'#bcc5b0');rect(c,839,70,5,3,'#bcc5b0');rect(c,814,78,67,6,'#56607577');
  for(let i=0;i<28;i++){
    const x=i*39-15,w=24+noise(i+33)*34,h=40+noise(i+93)*112,y=280-h;
    rect(c,x,y,w,h,'#263c4c');rect(c,x+4,y-4,w-10,4,'#263c4c');
    if(i%4===0)rect(c,x+w/2,y-22,2,22,'#263c4c');
    for(let a=4;a<w-3;a+=7)for(let b=7;b<h-10;b+=11)if(noise(i*100+a+b)>.64)rect(c,x+a,y+b,2,3,'#6d827b5c');
  }
  // Distant elevated rail, broken train and overhead wires.
  rect(c,0,243,1000,5,'#263443');rect(c,0,254,1000,3,'#223341');
  for(let x=35;x<1000;x+=144){rect(c,x,256,7,71,'#223341');poly(c,[[x-18,257],[x+7,257],[x+7,276]],'#223341');}
  rect(c,570,230,138,12,'#2e434e');rect(c,575,225,112,5,'#2e434e');for(let x=580;x<700;x+=15)rect(c,x,229,9,5,'#75817b66');
  line(c,0,207,1000,192,'#2b3441');line(c,0,211,1000,196,'#2b3441');
  // The near architecture uses distinct rooflines rather than repeated towers.
  drawBuilding(c,0,148,106,191,6); drawBuilding(c,107,176,85,163,11);drawBuilding(c,194,215,110,124,25);
  drawBuilding(c,312,169,136,170,37);drawBuilding(c,446,208,96,131,46);drawBuilding(c,545,163,117,176,59);
  drawBuilding(c,667,203,72,136,62);drawBuilding(c,742,121,109,218,78);drawBuilding(c,856,175,145,164,97);
  // Distinct neon signs and a weathered rooftop billboard.
  rect(c,280,114,2,57,'#152d39');rect(c,393,114,3,57,'#152d39');rect(c,253,85,170,66,'#132832');rect(c,257,89,162,58,'#27414b');rect(c,261,93,154,50,'#183139');
  text(c,'STAY',272,99,20,'#dfbd83');text(c,'HUMAN',332,101,17,'#efc883');text(c,'AFTER THE END.',273,126,8,'#83b1b1');
  rect(c,255,85,167,2,'#6e8983');rect(c,261,111,150,1,'#85907933');poly(c,[[384,87],[417,87],[417,103],[395,107]],'#35444b');
  line(c,258,89,416,145,'#a6a99417');
  rect(c,765,97,62,31,'#071b27');rect(c,768,100,56,2,'#4ce3d0');text(c,'PULSE',772,106,12,'#6cf4df');text(c,'07',812,106,11,'#d8d998');
  rect(c,467,226,56,24,'#0e232b');rect(c,470,228,50,2,'#df6f70');text(c,'無人區',474,235,10,'#e99289');
  rect(c,93,205,20,78,'#0b242f');rect(c,96,208,14,71,'#307b7d');text(c,'末',99,214,11,'#99ddd0');text(c,'班',99,232,11,'#99ddd0');text(c,'車',99,250,11,'#99ddd0');
  rect(c,696,238,20,62,'#10232d');rect(c,698,241,16,57,'#873f51');text(c,'夜',700,247,13,'#ffc1ac');text(c,'市',700,269,13,'#ffc1ac');
  // Repaired cable hanging between poles, with a handful of old lights.
  c.strokeStyle='#101e2b';c.lineWidth=2;c.beginPath();c.moveTo(189,229);c.quadraticCurveTo(449,297,672,218);c.stroke();
  for(let i=0;i<10;i++){const t=i/9,x=189+t*483,y=(1-t)*(1-t)*229+2*(1-t)*t*297+t*t*218;rect(c,x,y,3,6,i%4===0?'#ecc68a':'#749c9e');}
  rect(c,186,223,4,116,'#122732');rect(c,670,216,4,123,'#122732');
  // Street-level shutters, fences, litter and plant silhouettes.
  rect(c,322,274,82,61,'#11272e');for(let y=280;y<332;y+=5)rect(c,325,y,76,2,'#345052');text(c,'CLOSED',339,292,10,'#63746c');text(c,'03:17',348,305,8,'#4b6866');
  rect(c,559,265,86,68,'#10252e');rect(c,565,272,34,61,'#223740');rect(c,603,272,35,61,'#1e3540');rect(c,578,282,11,18,'#b7a37444');rect(c,607,287,23,3,'#80978433');
  drawStageLandmarks(c,index);
  drawFence(c,213,307,77);drawFence(c,714,304,66);drawFence(c,810,307,72);
  for(let i=0;i<18;i++){let x=noise(400+i)*1000,y=322+noise(620+i)*15;rect(c,x,y,9+noise(i+82)*8,3,'#15252b');rect(c,x+3,y-4,5,4,'#193333');}
  // Road, pavement seams and damp reflective patches.
  rect(c,0,337,1000,93,'#152b35');rect(c,0,337,1000,3,'#6c9691');rect(c,0,341,1000,5,'#29444c');rect(c,0,347,1000,4,'#0e242f');
  for(let x=0;x<1000;x+=82)rect(c,x,338,2,7,'#253c43');
  for(let i=0;i<45;i++){const x=noise(i+752)*1000,y=352+noise(i+192)*78,w=10+noise(i+335)*63;rect(c,x,y,w,1,i%3===0?'#5c887d25':'#061b244b');}
  for(let x=0;x<1000;x+=123){rect(c,x+13,392,65,3,'#bfa87366');rect(c,x+13,395,65,1,'#69766644');}
  rect(c,0,420,1000,3,'#213f46');rect(c,0,424,1000,6,'#10242e');
  for(let i=0;i<13;i++){const x=noise(i+765)*1000,y=353+noise(i+423)*63;rect(c,x,y,4,2,'#85908766');rect(c,x+7,y+2,5,1,'#071b28');}
  // Window and neon reflections are horizontal pixel strips.
  for(let i=0;i<19;i++){const y=352+i*3,x=763+Math.sin(i*3)*15;rect(c,x,y,24+noise(i+465)*45,1,i%2?'#42c7ba13':'#42c7ba21');}
  for(let i=0;i<12;i++)rect(c,683+noise(i+742)*15,353+i*4,15+noise(i+82)*30,1,'#db688623');
  glow(c,795,115,70,'#65e2ce',.13);glow(c,707,264,41,'#e58b98',.13);glow(c,98,247,41,'#72e4ca',.10);
  // Abandoned little delivery scooter, far behind the play plane.
  pixelEllipse(c,751,327,12,12,'#081e28');pixelEllipse(c,785,327,12,12,'#081e28');rect(c,754,330,6,6,'#516972');rect(c,788,330,6,6,'#516972');poly(c,[[757,330],[766,316],[783,321],[790,331]],'#39524f');rect(c,773,313,15,4,'#13252c');line(c,784,324,790,307,'#54665d',2);line(c,788,307,797,308,'#54665d',2);rect(c,761,313,11,9,'#806b52');
}
function drawStageLandmarks(c,index){
  if(index===1){
    // The second sector is a shuttered night market under striped awnings.
    for(const [x,w,col] of [[309,98,'#965e51'],[455,93,'#827447'],[571,101,'#526e63']]){
      rect(c,x+4,281,w-8,55,'#10282e');rect(c,x+5,302,w-10,3,'#475551');rect(c,x+4,333,w-8,4,'#3a4b49');
      poly(c,[[x+7,264],[x+w-7,264],[x+w,285],[x,285]],'#0a232c');
      poly(c,[[x+9,265],[x+w-9,265],[x+w-2,281],[x+2,281]],col);
      for(let i=0;i<6;i++){const sx=x+6+i*(w-10)/6;poly(c,[[sx+4,265],[sx+11,265],[sx+14,281],[sx+3,281]],'#bfa87966');rect(c,sx+2,281,10,5,i%2?col:'#b5a079');}
      rect(c,x+5,284,3,49,'#596354');rect(c,x+w-8,284,3,49,'#596354');rect(c,x+15,310,w-30,22,'#5a5141');for(let i=0;i<4;i++)rect(c,x+18+i*16,307,11,4,'#9b8460');
      text(c,x===309?'夜 食 堂':x===455?'街角雜貨':'NO SERVICE',x+w/2,290,x===571?8:9,'#c4b180','center');
    }
    line(c,298,250,687,240,'#172c30',2);
    for(let i=0;i<8;i++){const x=312+i*51,y=248-i;rect(c,x,y,1,10,'#999472');pixelEllipse(c,x-5,y+8,12,15,i===3?'#414d42':'#af6f50');rect(c,x-3,y+9,8,2,i===3?'#4f5745':'#e0b777');rect(c,x,y+11,1,9,'#d3a364');rect(c,x-2,y+24,5,2,'#c9995d');}
    rect(c,454,209,84,22,'#16272d');rect(c,456,211,80,1,'#b58d57');text(c,'BLACKOUT',462,215,12,'#d9b574');
  }else if(index>=2){
    // Terminal Zero: a broad railway portal and two damaged warning pylons.
    rect(c,447,194,241,143,'#172d3c');rect(c,458,184,219,13,'#2b3e4c');rect(c,469,177,197,8,'#354553');rect(c,449,198,237,4,'#758188');
    rect(c,467,226,201,111,'#0e2331');rect(c,475,233,184,104,'#203444');
    for(let i=0;i<4;i++){const x=481+i*44;rect(c,x,239,34,96,'#0b202d');rect(c,x+3,243,28,7,'#334b5b');rect(c,x+3,257,28,2,'#607475');rect(c,x+3,283,28,2,'#607475');rect(c,x+3,309,28,2,'#607475');rect(c,x+14,249,3,85,'#345164');}
    rect(c,486,207,169,20,'#102431');text(c,'TERMINAL 00',501,210,16,'#c3bfe0');rect(c,486,225,169,2,'#82769f');rect(c,456,211,8,103,'#3e515f');rect(c,672,211,8,103,'#3e515f');
    rect(c,445,310,245,26,'#122631');for(let i=0;i<11;i++)poly(c,[[447+i*22,312],[457+i*22,312],[469+i*22,323],[459+i*22,323]],'#81755b');
    for(const x of [432,699]){rect(c,x,262,6,74,'#50616a');rect(c,x-5,255,16,12,'#1d2d38');rect(c,x-2,258,10,5,'#cd8689');rect(c,x+1,265,4,3,'#f2b894');}
    rect(c,486,181,168,2,'#8e8d9d');rect(c,475,186,188,2,'#a2a2ad44');
    text(c,'LAST DEPARTURE',509,291,10,'#9ba8a5');
  }
}
function drawBuilding(c,x,y,w,h,seed){
  const col=seed%2?'#193340':'#1b3742';rect(c,x,y,w,h,col);rect(c,x+5,y-5,w-14,5,col);rect(c,x,y,w,3,'#41626a');
  if(seed%3===0){rect(c,x+12,y-18,24,13,'#223e48');rect(c,x+17,y-23,14,5,'#223e48');}
  rect(c,x+w-8,y+3,4,h-3,'#112d38');rect(c,x+5,y+7,2,h-7,'#2d4b55');
  for(let a=14;a<w-12;a+=18){for(let b=14;b<h-22;b+=25){const n=noise(seed*700+a*3+b);rect(c,x+a-1,y+b-1,10,15,'#102832');rect(c,x+a,y+b,8,13,n>.74?'#b39b6c':n>.53?'#547d7a':'#243e49');rect(c,x+a+3,y+b,1,13,col);rect(c,x+a,y+b+7,8,1,col);if(n>.81)rect(c,x+a+1,y+b+2,2,4,'#dcc78c');}}
  if(seed%2){rect(c,x+5,y+h-38,w-18,2,'#38545a');rect(c,x+7,y+h-35,25,33,'#102530');rect(c,x+9,y+h-32,21,1,'#4b6261');}
  const px=x+w-19;rect(c,px,y+18,3,h-18,'#3e5659');rect(c,px-4,y+28,7,3,'#526663');rect(c,px-4,y+h-24,7,3,'#526663');
  // Faded peeling façade patches.
  for(let i=0;i<5;i++){let sx=x+noise(seed+i)*w,sy=y+noise(seed+90+i)*h;rect(c,sx,sy,4+noise(seed+i+8)*8,2,'#80938512');}
}
function drawFence(c,x,y,w){rect(c,x,y,w,2,'#52666a');rect(c,x,y,3,32,'#4b6266');rect(c,x+w-3,y,3,32,'#4b6266');for(let k=5;k<w;k+=9){line(c,x+k,y+3,x+Math.min(k+20,w-3),y+29,'#41575e');line(c,x+k,y+28,x+Math.min(k+20,w-3),y+3,'#41575e');}}
function getBackground(stage){
  const key=clamp(Math.floor(stageIndex(stage)||0),0,2);if(bgCache.has(key))return bgCache.get(key);
  const surface=makeCanvas(1000,430);if(!surface)return null;
  paintSky(surface.ctx,key);bgCache.set(key,surface.canvas);return surface.canvas;
}
function drawBus(c,time,hp,max){
  const damage=1-clamp((hp??max??100)/(max||100),0,1),level=damage>.6?2:damage>.3?1:0;
  let cached=busCache.get(level);
  if(!cached){const surface=makeCanvas(350,367);if(surface){paintBus(surface.ctx,0,[100,60,30][level],100);cached=surface.canvas;busCache.set(level,cached);}}
  if(cached)c.drawImage(cached,0,0);else paintBus(c,time,hp,max);
  if(damage>.6){for(let i=0;i<5;i++){const p=(time*.35+i*.23)%1;pixelEllipse(c,164+Math.sin(i+time)*5,304-p*48,8+p*14,8+p*12,`rgba(31,40,43,${.4-p*.3})`);}}
  hpBar(c,107,238,hp,max,'#69ddc3',119);
}
function paintBus(c,time,hp,max){
  const x=27,y=255, damage=1-clamp((hp??max??100)/(max||100),0,1);
  glow(c,174,332,96,'#6ff3df',.12);poly(c,[[176,321],[321,304],[331,349],[176,335]],'#8eeadb09');
  pixelEllipse(c,x-4,350,177,12,'#071b2588');
  // Wheel wells and chassis first, with tyres that remain visibly round at low resolution.
  rect(c,x+6,y+73,153,20,'#071820');rect(c,x+9,y+81,147,8,'#527176');
  for(const wx of [x+29,x+129]){pixelEllipse(c,wx-12,y+74,26,29,'#06161e');pixelEllipse(c,wx-9,y+78,20,21,'#182e38');pixelEllipse(c,wx-5,y+82,12,13,'#527171');rect(c,wx-2,y+85,6,7,'#192b35');rect(c,wx-4,y+79,11,2,'#799790');}
  // Angular silhouette, armoured bonnet and roof luggage.
  poly(c,[[x+2,y+8],[x+128,y+8],[x+145,y+17],[x+163,y+61],[x+163,y+85],[x+153,y+89],[x+3,y+89],[x-2,y+81],[x-2,y+18]],'#091d27');
  poly(c,[[x+3,y+13],[x+125,y+13],[x+140,y+21],[x+158,y+60],[x+158,y+80],[x+4,y+80]],'#3a9392');
  rect(c,x+3,y+13,126,5,'#84c3ae');rect(c,x+3,y+57,152,19,'#d5ab53');rect(c,x+3,y+73,154,5,'#9c824d');rect(c,x+3,y+78,150,6,'#276d72');rect(c,x+3,y+84,148,3,'#142e37');
  // Four recessed windows and a raked driver’s windshield.
  for(let i=0;i<4;i++){const wx=x+10+i*25;rect(c,wx,y+24,22,30,'#153641');rect(c,wx+2,y+26,18,25,'#2f5860');poly(c,[[wx+2,y+27],[wx+19,y+27],[wx+2,y+44]],'#548181');rect(c,wx+2,y+44,18,7,'#173947');rect(c,wx+9,y+26,2,25,'#24444f');rect(c,wx-1,y+22,24,2,'#99c9b3');}
  poly(c,[[x+112,y+24],[x+131,y+24],[x+144,y+54],[x+112,y+54]],'#102e3b');poly(c,[[x+115,y+27],[x+129,y+27],[x+138,y+45],[x+115,y+42]],'#547c7d');
  // Driver, pale eyes in the cab, tiny hanging charm.
  rect(c,x+119,y+41,6,8,'#1a2c32');rect(c,x+120,y+37,5,5,'#b5a98b');rect(c,x+124,y+39,2,1,'#e7d6aa');line(c,x+128,y+28,x+129,y+34,'#c6b583');rect(c,x+127,y+34,4,4,'#cf7057');
  rect(c,x+105,y+22,3,58,'#1c5059');rect(c,x+101,y+58,3,10,'#efd38a');
  // Steel patch plates, fastening bolts, metal window grates.
  poly(c,[[x+7,y+60],[x+38,y+59],[x+39,y+73],[x+6,y+75]],'#73938b');for(let bx=10;bx<37;bx+=24){rect(c,x+bx,y+62,2,2,'#bcd2b6');rect(c,x+bx,y+70,2,2,'#253f45');}
  for(let i=0;i<3;i++){line(c,x+13+i*25,y+32,x+30+i*25,y+49,'#728f87',2);line(c,x+13+i*25,y+49,x+30+i*25,y+32,'#728f8755');}
  text(c,'LASTLINE',x+43,y+61,8,'#24474b');text(c,'N-07',x+119,y+64,7,'#213e43');
  rect(c,x+146,y+60,12,4,'#a6d4b7');rect(c,x+146,y+64,12,3,'#f5ddb0');rect(c,x+2,y+73,4,6,'#d36c53');
  // Heavy front bumper and improvised cowcatcher.
  rect(c,x+143,y+80,24,6,'#6a8280');rect(c,x+149,y+86,18,5,'#29464d');poly(c,[[x+162,y+77],[x+171,y+89],[x+159,y+91]],'#b8b28d');line(c,x+166,y+83,x+169,y+89,'#415858',2);
  rect(c,x+145,y+35,9,3,'#203d48');rect(c,x+152,y+35,3,12,'#203d48');rect(c,x+153,y+36,4,8,'#81b0a6');
  // Rack, travel bags, tarpaulin and spare fuel.
  rect(c,x+7,y+6,110,3,'#09242d');rect(c,x+13,y+1,3,8,'#4f7172');rect(c,x+111,y+1,3,8,'#4f7172');rect(c,x+22,y-5,28,11,'#826d4f');rect(c,x+25,y-8,22,3,'#a28a5d');rect(c,x+32,y-5,3,11,'#384b45');rect(c,x+54,y-8,37,14,'#345b60');rect(c,x+58,y-11,29,4,'#51797a');rect(c,x+70,y-10,3,16,'#bba870');rect(c,x+95,y-5,12,11,'#967344');rect(c,x+98,y-8,6,3,'#967344');
  for(let i=0;i<9;i++){rect(c,x+14+i*16,y+79,2,2,'#afc4a6');}
  rect(c,x+9,y+87,11,4,'#5f7672');
  if(damage>.3){line(c,x+118,y+29,x+128,y+42,'#d8d5b0');line(c,x+128,y+42,x+122,y+50,'#d8d5b0');rect(c,x+73,y+70,14,3,'#5b463b');}
  if(damage>.6)rect(c,x+133,y+61,12,12,'#342e2e');
  // A tiny warm destination lamp under the roof.
  rect(c,x+9,y+16,55,5,'#1d3c42');text(c,'NEON  /  07',x+12,y+16,5,'#eed08a');
}
function drawBarricade(c,time,hp,max){
  pixelEllipse(c,871,352,83,11,'#071b2588');
  rect(c,911,252,5,85,'#11272e');rect(c,904,245,19,8,'#354447');rect(c,908,236,11,10,'#272d30');rect(c,910,237,7,5,'#da6261');if(Math.sin(time*5)>.1)glow(c,913,241,32,'#ff7178',.18);
  // Ragged quarantine cloth mounted behind a steel road block.
  poly(c,[[880,271],[941,268],[940,309],[929,304],[920,310],[908,304],[896,309],[881,303]],'#604343');rect(c,883,273,56,2,'#997064');text(c,'KEEP',894,278,9,'#dfb095');text(c,'OUT',899,290,10,'#dfb095');
  rect(c,880,268,3,77,'#5c5751');rect(c,940,265,3,80,'#5c5751');
  poly(c,[[879,315],[939,315],[951,351],[869,351]],'#13242a');poly(c,[[883,317],[935,317],[945,345],[875,345]],'#6e776d');
  poly(c,[[883,319],[895,319],[906,344],[894,344]],'#c3aa61');poly(c,[[907,319],[919,319],[930,344],[918,344]],'#c3aa61');poly(c,[[929,319],[934,319],[944,344],[940,344]],'#c3aa61');
  rect(c,874,345,73,5,'#344443');rect(c,883,320,52,2,'#c4c6a0');rect(c,868,351,15,4,'#708275');rect(c,938,351,16,4,'#708275');
  for(let i=0;i<4;i++)rect(c,881+i*17,341,2,2,'#2a3735');
  rect(c,950,333,17,19,'#2b383a');rect(c,949,331,19,3,'#55605a');rect(c,953,338,10,2,'#aa9354');
  if((hp??100)/(max||100)<.5){line(c,900,318,905,329,'#25322c',2);line(c,905,329,897,342,'#25322c',2);rect(c,940,348,11,6,'#7f8170');}
  hpBar(c,911,258,hp,max,'#eea36d',64);
}
function shadow(c,x,y,w=31){pixelEllipse(c,x-w/2,y-2,w,7,'#03172088');}
function boot(c,x,y,w=6){rect(c,x,y,w,3,'#061721');rect(c,x+1,y,Math.max(2,w-2),1,'#59666a');}
function drawHuman(c,u,time,portrait=false){
  const type=u.type||'brawler',id=typeof u.id==='number'?u.id:String(u.id||'').length,
    state=u.state||u.anim||'walk',moving=state==='walk'||state==='walking'||state==='move',
    attacking=state==='attack'||state==='attacking'||(Number(u.attackTimer)>0&&Number(u.attackTimer)<.22),
    phase=time*(type==='brawler'?9:7)+id*1.73, step=moving?Math.round(Math.sin(phase)*3):0,
    bob=moving?Math.abs(Math.round(Math.sin(phase)*1)):Math.round(Math.sin(time*2+id)*.5),
    strike=attacking?Math.max(0,Math.sin((time*12+id)%Math.PI)):0;
  const x=u.x??300,y=u.y??355,scale=portrait?1:2;
  if(!portrait)shadow(c,x,y,type==='shield'?38:31);
  c.save();c.translate(Math.round(x),Math.round(y));c.scale((u.facing===-1?-1:1)*scale,scale);
  if(state==='death'||state==='dead'){c.translate(0,-4);c.rotate(-Math.PI*.45*clamp(u.deathProgress??1,0,1));c.globalAlpha*=.7;}
  c.translate(0,-bob);
  const colors={brawler:['#c77539','#eea35b','#294d54'],ranger:['#246b6d','#4a9e91','#24434e'],shield:['#314f6e','#5883a1','#283d51'],medic:['#afbbac','#e2dfbf','#375056'],bomber:['#a38b42','#d2bb65','#3e4942']};
  const [cloth,lit,pants]=colors[type]||colors.brawler;
  // Far arm, torso outline, separated hips and bent legs.
  rect(c,-6,-24,5,12,P.ink);rect(c,-5,-23,3,9,cloth);
  rect(c,-6,-23,13,16,P.ink);rect(c,-5,-22,11,13,cloth);rect(c,-4,-22,4,11,lit);
  rect(c,-5,-11,11,4,'#1a3037');rect(c,-4,-7,5,6,pants);rect(c,2,-7,4,6,pants);
  const left=step,right=-step;rect(c,-4+left,-7,4,6,pants);rect(c,2+right,-7,4,6,pants);rect(c,-4+left,-3,4,3,'#182d36');rect(c,2+right,-3,4,3,'#182d36');boot(c,-5+left,-1,7);boot(c,1+right,-1,7);
  rect(c,-4,-10,11,2,'#162b32');rect(c,0,-10,3,2,'#c0b68b');
  // Neck, face with ear, nose, cheek shadow and single tiny sharp eye.
  rect(c,-1,-25,5,4,'#a9856a');rect(c,-4,-33,10,10,P.ink);rect(c,-3,-32,8,8,'#c99f77');rect(c,0,-31,5,6,'#e1c195');rect(c,5,-29,2,3,'#d6b489');rect(c,3,-30,2,1,'#203336');rect(c,-4,-28,2,3,'#b98c68');rect(c,1,-25,4,1,'#987255');
  if(type==='brawler'){
    // Orange hardhat, rolled work sleeves, leather tool belt, hooked steel crowbar.
    rect(c,-4,-35,10,4,'#5f4a32');rect(c,-3,-36,8,2,'#eaba65');rect(c,-4,-34,11,3,'#efa851');rect(c,-5,-31,13,2,'#f7c575');rect(c,0,-35,2,4,'#f8d386');
    rect(c,-4,-21,2,11,'#78482f');rect(c,3,-21,2,11,'#78482f');rect(c,-2,-20,4,2,'#d69d60');rect(c,-5,-12,12,3,'#745641');rect(c,-4,-12,3,4,'#425562');rect(c,4,-11,3,4,'#d2a06c');
    rect(c,3,-22,6,7,P.ink);rect(c,4,-22,4,5,lit);rect(c,5,-17,5,4,'#d7ad81');
    c.save();c.translate(8,-15);c.rotate(attacking?-.85+strike*1.8:.2+step*.025);rect(c,-1,-17,4,22,'#102731');rect(c,0,-16,2,20,'#9ca9a0');rect(c,-4,-20,7,4,'#102731');rect(c,-6,-18,4,6,'#102731');rect(c,-3,-19,5,2,'#c6cdb3');rect(c,-5,-17,3,4,'#96aaa1');rect(c,-5,-13,2,2,'#c6cdb3');rect(c,0,-5,2,6,'#885c49');rect(c,0,3,4,2,'#bac4af');c.restore();
  }else if(type==='ranger'){
    // Teal cap and scarf, a small ammunition harness, two-tone marksman rifle.
    rect(c,-5,-35,10,5,'#154447');rect(c,-4,-34,8,3,'#4b8a7d');rect(c,-2,-32,10,2,'#67a491');rect(c,-4,-29,3,7,'#163b42');rect(c,0,-25,6,3,'#9bc2a7');rect(c,-4,-25,4,7,'#75a997');rect(c,-7,-24,4,5,'#68978e');
    rect(c,-3,-20,7,2,'#173f43');rect(c,-2,-20,2,6,'#b8b990');rect(c,2,-20,2,6,'#a3ad83');rect(c,-5,-15,3,5,'#173a40');
    rect(c,3,-22,6,5,P.ink);rect(c,4,-21,4,4,lit);rect(c,6,-18,6,3,'#d5b58a');rect(c,9,-21,3,3,'#d5b58a');
    const recoil=attacking?Math.round(strike*2):0;rect(c,5-recoil,-21,18,5,'#101f28');rect(c,11-recoil,-22,8,2,'#859b90');rect(c,19-recoil,-20,9,2,'#556a6c');rect(c,8-recoil,-17,3,5,'#1b343c');rect(c,5-recoil,-20,7,3,'#856f48');rect(c,12-recoil,-24,7,2,'#182e39');rect(c,13-recoil,-24,3,1,'#76d0c3');if(attacking&&strike>.5)muzzle(c,29-recoil,-19,time);
  }else if(type==='shield'){
    // Blue riot helmet, clear cyan visor and massive beveled shield.
    rect(c,-5,-35,11,7,'#142c3c');rect(c,-4,-35,9,3,'#6c96ad');rect(c,-4,-32,11,4,'#2d5b71');rect(c,0,-31,7,2,'#9bdfdb');rect(c,-5,-29,3,5,'#34546d');rect(c,-2,-24,7,2,'#9eb0aa');
    rect(c,-4,-22,10,9,'#477392');rect(c,-3,-21,8,2,'#83a0aa');rect(c,-3,-15,8,2,'#253e57');rect(c,-6,-23,4,5,'#668797');
    const sx=attacking?9+Math.round(strike*2):8;poly(c,[[sx-2,-28],[sx+12,-28],[sx+15,-23],[sx+15,-5],[sx+8,1],[sx-2,-3]],'#0b2533');poly(c,[[sx,-26],[sx+10,-26],[sx+13,-22],[sx+13,-6],[sx+7,-1],[sx,-4]],'#426c7c');rect(c,sx+1,-24,10,8,'#163e51');rect(c,sx+2,-23,8,5,'#71bebc');rect(c,sx+2,-22,7,1,'#c0ead5');rect(c,sx+1,-14,11,2,'#87a7a8');rect(c,sx+4,-11,5,6,'#243e4d');rect(c,sx+5,-11,3,2,'#d6c99a');rect(c,sx,-23,1,18,'#9dc8c5');
  }else if(type==='medic'){
    // Padded cream coat, red-cross satchel and field cap, compact sidearm.
    rect(c,-5,-35,10,4,'#798e88');rect(c,-4,-35,9,2,'#e0dcc0');rect(c,-5,-32,12,3,'#a7b9a8');rect(c,-1,-34,2,4,'#b15c57');rect(c,-2,-33,4,2,'#c46a60');rect(c,-4,-29,2,5,'#685b45');rect(c,-3,-25,8,3,'#e4debf');
    rect(c,-3,-22,7,10,'#d9d9bc');rect(c,0,-21,1,10,'#85988c');rect(c,-6,-11,13,5,'#b6c2ac');rect(c,-5,-7,5,2,'#d7d7b9');rect(c,2,-7,4,2,'#d7d7b9');rect(c,-9,-22,6,12,'#213941');rect(c,-8,-21,5,10,'#d8cfa8');rect(c,-7,-18,3,2,'#c66c61');rect(c,-6,-19,1,4,'#c66c61');
    rect(c,3,-21,5,5,'#7b948a');rect(c,4,-21,3,4,'#e2debd');rect(c,6,-18,6,3,'#d7b88b');rect(c,10,-21,8,3,'#203842');rect(c,11,-18,3,4,'#40535b');rect(c,11,-21,6,1,'#91aaa0');if(attacking&&strike>.55)muzzle(c,19,-20,time);
    if(u.healing||u.state==='heal'){rect(c,-16,-27,7,2,'#76efb6');rect(c,-14,-29,2,6,'#76efb6');}
  }else if(type==='bomber'){
    // Yellow fireproof hood, gas mask, spare fuel and a hand-lit Molotov bottle.
    rect(c,-5,-36,11,12,'#493f2b');rect(c,-4,-35,9,10,'#c3a65b');rect(c,-2,-33,8,7,'#273a3b');rect(c,-1,-32,3,2,'#b1d2bb');rect(c,4,-32,2,2,'#b1d2bb');rect(c,2,-29,4,4,'#6f8a77');rect(c,3,-28,2,2,'#132c34');rect(c,-4,-25,10,3,'#e1c371');
    rect(c,-5,-22,11,11,'#b19a51');rect(c,-3,-21,2,12,'#414b3b');rect(c,3,-21,2,12,'#414b3b');rect(c,-8,-27,5,18,'#213a3b');rect(c,-7,-26,3,15,'#71846c');rect(c,-7,-23,3,3,'#d6b457');
    rect(c,3,-22,5,6,'#e1c370');
    c.save();c.translate(7,-18);c.rotate(attacking?(-1.3+strike*2.0):.12);rect(c,-2,-2,9,5,'#263b36');rect(c,-1,-1,7,3,'#c4ba87');rect(c,4,-2,3,4,'#e0cea0');
    if(!attacking||strike<.78){
      // Stepped green bottle, liquid line, paper label and a fluttering burning rag.
      rect(c,5,-11,4,4,'#172b2b');rect(c,4,-7,6,9,'#142d2d');rect(c,5,-7,4,8,'#5d815f');rect(c,5,-4,4,4,'#a88d53');rect(c,5,-5,4,2,'#d4c08b');rect(c,5,-11,2,5,'#92b894');rect(c,5,-6,1,5,'#b3c79a');rect(c,7,-12,5,2,'#a75642');rect(c,10,-13,3,2,'#d58d57');
      const flicker=Math.floor(time*16)%2;poly(c,[[10,-12],[9,-15],[11,-19-flicker],[12,-16],[14,-18],[14,-14],[12,-12]],'#f0a74f');rect(c,11,-15,2,3,'#ffe3a2');
    }else{rect(c,7,-2,3,2,'#e0cea0');}
    c.restore();
  }
  if(u.flash>0){c.globalCompositeOperation='screen';rect(c,-4,-31,8,7,`rgba(255,231,201,${Math.min(.8,u.flash*4)})`);rect(c,-5,-22,11,12,`rgba(255,235,204,${Math.min(.7,u.flash*4)})`);}
  c.restore();
  if(!portrait&&u.hp<u.maxHp)hpBar(c,x,y-79,u.hp,u.maxHp,'#65e3c3',31);
  if(!portrait&&u.selected){rect(c,x-15,y+7,30,2,'#c2f6d3');rect(c,x-19,y+4,4,2,'#c2f6d3');rect(c,x+15,y+4,4,2,'#c2f6d3');}
}
function muzzle(c,x,y,time,large=false){const k=Math.floor(time*25)%2;poly(c,[[x,y-1],[x+4,y-5-k],[x+4,y-2],[x+9+(large?4:0),y],[x+4,y+2],[x+3,y+5],[x,y+2]],'#f4b55f');rect(c,x,y-1,4,3,'#fff2b1');}
function drawZombie(c,u,time,portrait=false){
  const type=u.type||'walker',big=type==='brute'||type==='boss',boss=type==='boss',runner=type==='runner',spitter=type==='spitter';
  const scale=portrait?1:(boss?2.55:big?2.3:2),x=u.x??760,y=u.y??355,
    id=typeof u.id==='number'?u.id:String(u.id||'').length,phase=time*(runner?13:big?5:7)+id,
    state=u.state||u.anim||'walk',moving=!['idle','attack','attacking','death','dead'].includes(state),step=moving?Math.round(Math.sin(phase)*(runner?4:2)):0,
    attack=state==='attack'||state==='attacking'||(u.attackTimer>0&&u.attackTimer<.24),bob=moving?Math.abs(Math.round(Math.sin(phase))):0;
  if(!portrait)shadow(c,x,y,boss?56:big?44:30);
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(-scale,scale);
  if(state==='death'||state==='dead'){c.translate(0,-5);c.rotate(-Math.PI*.45*clamp(u.deathProgress??1,0,1));c.globalAlpha*=.7;}
  c.translate(0,-bob);
  const skin=boss?'#87956e':big?'#8f9c7a':spitter?'#9caf66':runner?'#8ca9a0':'#8aa18a';
  const shade=boss?'#52634e':spitter?'#617c50':'#587466';
  const cloth=boss?'#6a4949':big?'#725552':spitter?'#636642':runner?'#70535d':'#425867';
  // Torn trouser silhouettes, asymmetric gait and feet.
  rect(c,-6,-12,12,8,'#11272b');rect(c,-5+step,-9,5,9,'#354447');rect(c,2-step,-9,4,9,'#2c4142');rect(c,-4+step,-3,3,3,skin);boot(c,-6+step,-1,8);boot(c,1-step,-1,7);
  rect(c,-7,-25,15,15,P.ink);rect(c,-6,-24,13,14,cloth);rect(c,-4,-24,5,12,skin);rect(c,0,-23,3,11,shade);rect(c,5,-23,3,13,cloth);rect(c,-6,-12,3,3,cloth);rect(c,3,-11,2,3,cloth);
  rect(c,-4,-22,3,1,'#bac0a0');rect(c,-4,-18,5,1,'#394d44');rect(c,-4,-15,4,1,'#394d44');rect(c,2,-15,3,3,'#783f42');
  // Head is crooked and hollow eyed, exposed teeth rendered individually.
  rect(c,-3,-33,10,10,P.ink);rect(c,-2,-32,9,8,skin);rect(c,-3,-28,3,5,shade);rect(c,1,-32,6,2,'#b2b69a');rect(c,4,-30,3,2,'#20322e');rect(c,5,-30,2,1,boss?'#fff1ae':'#eb987e');rect(c,7,-27,2,2,skin);rect(c,3,-25,5,2,'#35413b');rect(c,4,-25,1,1,'#c8c7a1');rect(c,6,-25,1,1,'#c8c7a1');rect(c,-1,-24,5,3,shade);
  const reach=attack?Math.round(Math.sin(time*16)*2)+3:0;
  // Back arm and foreground arm have distinct elbows and claw fingers.
  rect(c,2,-24,7,5,cloth);rect(c,7,-22,6+reach,4,shade);rect(c,11+reach,-24,5,4,skin);rect(c,15+reach,-25,2,2,skin);
  rect(c,5,-21,5,6,cloth);rect(c,8,-18,8+reach,4,skin);rect(c,14+reach,-19,4,4,'#a5b19a');rect(c,17+reach,-21,2,3,skin);rect(c,18+reach,-18,2,1,skin);
  if(runner){
    rect(c,-4,-34,10,3,'#25353b');rect(c,-5,-33,3,6,'#25353b');rect(c,-4,-35,2,2,'#25353b');rect(c,-7,-24,3,10,'#b27672');rect(c,-7,-21,4,2,'#d3958b');rect(c,1,-23,4,10,'#9d646a');rect(c,-1,-11,4,2,'#262d35');rect(c,-5+step,-5,3,3,'#a88e7a');
  }else if(big){
    // Oversized construction zombie in a torn industrial vest.
    rect(c,-11,-25,7,16,'#253231');rect(c,-10,-25,6,12,cloth);rect(c,-10,-25,4,4,skin);rect(c,-9,-20,5,2,boss?'#aa7753':'#b8a25e');rect(c,5,-24,5,10,boss?'#a17153':'#958954');rect(c,-5,-36,12,5,'#343b31');rect(c,-4,-36,10,3,boss?'#c39c61':'#ac995b');rect(c,-6,-33,15,2,boss?'#e8b977':'#c4b576');
    rect(c,-5,-18,7,3,'#b2af8a');rect(c,-5,-14,7,2,'#526447');rect(c,-4,-19,6,1,'#63704e');rect(c,4,-13,5,3,'#543a3b');
    rect(c,10,-16,8+reach,5,skin);rect(c,16+reach,-16,5,6,shade);rect(c,16+reach,-16,4,2,'#c0bea0');
    if(boss){rect(c,-11,-28,6,4,'#a2845c');rect(c,-12,-27,2,7,'#dcc183');rect(c,-4,-31,3,3,'#a9624f');rect(c,-3,-30,2,1,'#f2b565');rect(c,4,-31,3,2,'#f3bf68');rect(c,-7,-12,16,3,'#353c34');rect(c,-1,-12,4,3,'#d7ad65');rect(c,-10,-23,3,10,'#423d35');rect(c,-10,-20,3,2,'#ceae72');}
  }else if(spitter){
    // Infected courier: bright distended throat and glowing toxic satchel.
    rect(c,-4,-35,9,5,'#3c5b4d');rect(c,-3,-34,8,3,'#6c8656');rect(c,-5,-32,3,10,'#55754f');rect(c,1,-26,8,5,'#b6c46b');rect(c,4,-25,4,3,'#d7d68a');rect(c,7,-26,2,2,'#9edb68');rect(c,-7,-23,4,13,'#859252');rect(c,-10,-25,6,14,'#314d3d');rect(c,-9,-24,5,12,'#759451');rect(c,-8,-21,3,6,'#b0c66d');rect(c,-7,-21,1,5,'#d9eaa0');rect(c,-3,-21,2,11,'#313f35');
    if(attack){rect(c,10,-25,4,2,'#bddd77');rect(c,16,-26,3,2,'#d0ef91');}
  }else{
    rect(c,-3,-34,9,3,'#293d38');rect(c,-4,-32,3,5,'#354740');rect(c,-6,-24,2,9,'#607881');rect(c,3,-22,3,3,'#73898a');rect(c,-6,-10,3,2,'#57707a');
  }
  if(u.flash>0){c.globalCompositeOperation='screen';rect(c,-4,-32,11,10,`rgba(255,211,193,${Math.min(.8,u.flash*5)})`);rect(c,-6,-24,12,13,`rgba(255,211,193,${Math.min(.7,u.flash*5)})`);}
  c.restore();if(!portrait&&u.hp<u.maxHp)hpBar(c,x,y-(boss?103:big?91:77),u.hp,u.maxHp,boss?'#f1ae70':'#df8e88',boss?48:30);
}
function drawEffect(c,e,time){
  const kind=e.kind||e.type||'hit',x=e.x??500,y=e.y??320,
    life=e.life??e.ttl??1,max=e.maxLife??e.duration??({shot:.18,hit:.18,explosion:.45,deploy:.55,heal:.6,death:.5}[kind]||.65),age=e.age??Math.max(0,max-life),a=clamp(life/max,0,1);
  c.save();c.globalAlpha=e.alpha??Math.max(.2,a);
  if(['bullet','shot','tracer'].includes(kind)){
    const endX=e.toX??e.targetX??x+25,endY=(e.toY??e.targetY??y)-16;line(c,e.fromX??x,(e.fromY??y)-16,endX,endY,e.color||'#f5d393',2);rect(c,endX-2,endY-2,4,4,'#fff0bd');
  }else if(kind==='death'){
    c.globalAlpha=a*.75;const dead={x,y,type:e.entityType||(e.team==='ally'?'brawler':'walker'),id:e.id,state:'death',deathProgress:Math.min(1,(1-a)*2.3),hp:0,maxHp:0};
    if(e.team==='ally')drawHuman(c,dead,time);else drawZombie(c,dead,time);
    for(let i=0;i<5;i++)rect(c,x+(noise(i+38)-.5)*age*95,y-8-noise(i+52)*age*65,2,2,e.color||'#8d9e87');
  }else if(['heal','healing'].includes(kind)){
    for(let i=0;i<4;i++){const px=x+(noise(i+4)-.5)*44,py=y-age*35-i*10;rect(c,px,py,8,3,'#87ecc2');rect(c,px+3,py-3,3,9,'#87ecc2');}
    glow(c,x,y,45,'#70efbe',.3);
  }else if(['explosion','bomb','blast','grenade'].includes(kind)){
    const r=e.radius??25;glow(c,x,y,r*3,'#ee9d4d',.3);
    for(let i=0;i<18;i++){const a=i*2.399,d=(r*.4+noise(i+2)*r)*(1+age*3),px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;rect(c,px,py,4+noise(i+22)*6,4+noise(i+71)*6,i%3===0?'#ffe4a5':i%3===1?'#eea058':'#bc6850');}
    if(age<.16){pixelEllipse(c,x-r/2,y-r/2,r,r,'#fce2a1');pixelEllipse(c,x-r/4,y-r/4,r/2,r/2,'#fff2c2');}
  }else if(['acid','spit','poison'].includes(kind)){
    pixelEllipse(c,x-4,y-4,9,9,'#b6d87b');rect(c,x-2,y-3,3,3,'#e1edac');for(let i=0;i<4;i++)rect(c,x+i*4,y+3-i*2,2,2,'#91ac64');
  }else if(['text','damage','float','number','reward'].includes(kind)||e.text!==undefined){
    const str=String(e.text??e.amount??'');text(c,str,x,y-age*22,kind==='reward'?13:12,e.color||'#f8d39b','center');
  }else if(['spawn','deploy'].includes(kind)){
    for(let i=0;i<8;i++){const px=x-20+i*6;rect(c,px,y-3-noise(i+13)*22,2,4,'#99f2d5');}rect(c,x-22,y+2,44,2,'#99f2d5');
  }else{
    for(let i=0;i<7;i++){const a=i*2.399, d=4+age*45+noise(i+13)*8;rect(c,x+Math.cos(a)*d,y+Math.sin(a)*d+age*12,3,3,e.color||(i%2?'#e7c092':'#df967e'));}
  }
  c.restore();
}
/** Draw the complete battlefield. Coordinates are logical 1000 × 430 pixels. */
export function drawScene(ctx, state={}){
  const rawTime=state.time??performance.now()/1000,time=rawTime>1e8?rawTime/1000:rawTime,reduced=state.reducedMotion;
  const t=reduced?0:time,stage=state.stage??0;
  ctx.clearRect(0,0,SCENE_WIDTH,SCENE_HEIGHT);ctx.save();ctx.imageSmoothingEnabled=false;
  const bg=getBackground(stage);if(bg)ctx.drawImage(bg,0,0);else paintSky(ctx,stage);
  // Slowly drifting layered mist keeps the road readable.
  for(let i=0;i<3;i++){const fx=((t*5+i*390)%1380)-230;rect(ctx,fx,286+i*11,220,5,'#aaccc60a');rect(ctx,fx+27,293+i*11,167,3,'#aaccc60c');}
  drawBus(ctx,t,state.busHp??100,state.busMaxHp??100);drawBarricade(ctx,t,state.barricadeHp??100,state.barricadeMaxHp??100);
  entityBuffer.length=0;
  for(const u of state.units||[]){entityBuffer.push(u);entityTeams.set(u,true);}
  for(const u of state.enemies||[]){entityBuffer.push(u);entityTeams.set(u,false);}
  entityBuffer.sort(drawOrder);
  for(const u of entityBuffer){if(u.hp<=0&&!['death','dead'].includes(u.state||u.anim))continue;if(entityTeams.get(u))drawHuman(ctx,u,t);else drawZombie(ctx,u,t);}
  entityBuffer.length=0;
  for(const e of state.effects||[])drawEffect(ctx,e,t);
  // Rain is intentionally sparse, in two depths, and never masks silhouettes.
  if(!reduced){for(let i=0;i<43;i++){const x=(rainSeeds[i][0]-t*(19+i%4)*2)%1130,y=(rainSeeds[i][1]+t*(80+i%3*35))%470-25;line(ctx,x<0?x+1130:x,y,(x<0?x+1130:x)-3,y+9,i%3?'#9bded71b':'#bee8df26');}
    for(let i=0;i<9;i++){const pulse=(t*.7+i*.13)%1;rect(ctx,noise(i+165)*1000,360+noise(i+410)*52,3+pulse*7,1,`rgba(113,165,165,${(1-pulse)*.18})`);}}
  // Foreground weeds at the canvas corners anchor the pixel scene.
  for(let i=0;i<10;i++){const x=i<5?i*6:956+(i-5)*8;line(ctx,x,430,x+3,416-noise(i+9)*10,'#092329',2);line(ctx,x,425,x-5,416,'#10323a',2);}
  let v=vignetteCache.get(ctx);if(!v){v=ctx.createLinearGradient(0,0,0,430);v.addColorStop(0,'#0618272b');v.addColorStop(.3,'#06182700');v.addColorStop(.85,'#06182700');v.addColorStop(1,'#06182755');vignetteCache.set(ctx,v);}ctx.fillStyle=v;ctx.fillRect(0,0,1000,430);
  ctx.restore();
}
/** A square canvas portrait. Does not mutate state or require external assets. */
export function drawPortrait(ctx,type,time=0,size=80){
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,size,size);
  const enemy=['walker','runner','brute','spitter','boss'].includes(type);
  const palettes={brawler:['#624930','#dfab5f'],ranger:['#244f51','#68b6a7'],shield:['#2d405a','#89b4c3'],medic:['#4b5c50','#d4dab1'],bomber:['#585235','#c7be72']};
  const [dark,light]=palettes[type]||['#443d3d','#b09077'];
  rect(ctx,0,0,size,size,'#0b202b');rect(ctx,2,2,size-4,size-4,dark);rect(ctx,4,4,size-8,size-8,'#142d35');
  for(let k=0;k<5;k++)rect(ctx,5,8+k*12,size-10,1,'#9bbcb20b');poly(ctx,[[3,size-3],[size-3,3],[size-3,size-3]],dark+'88');
  ctx.save();ctx.beginPath();ctx.rect(3,3,size-6,size-6);ctx.clip();const s=size/43;ctx.translate(size*.48,size*1.03);ctx.scale(s,s);
  const entity={x:0,y:0,type,id:3,state:'idle',hp:100,maxHp:100};if(enemy)drawZombie(ctx,entity,time,true);else drawHuman(ctx,entity,time,true);ctx.restore();
  rect(ctx,0,0,size,2,light);rect(ctx,0,size-2,size,2,light+'88');rect(ctx,0,0,2,size,light+'66');rect(ctx,size-2,0,2,size,light+'66');
  rect(ctx,4,4,7,2,light);rect(ctx,4,4,2,7,light);rect(ctx,size-11,size-6,7,2,light);rect(ctx,size-6,size-11,2,7,light);ctx.restore();
}
