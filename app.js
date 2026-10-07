import {Game,UNITS,STAGES,GARAGE_UPGRADES,ACHIEVEMENTS,sanitizeSave,purchaseGarage,garageCost,dailySeed} from './engine.js';
import {drawScene,drawPortrait} from './art.js';
const $=id=>document.getElementById(id), KEY='neon-lastline-v1';
let meta,saveBlocked=false;try{meta=sanitizeSave(localStorage.getItem(KEY));}catch{meta=sanitizeSave({});saveBlocked=true;}
let game=null,preview=new Game({seed:7}),last=performance.now(),uiTime=0,shown='',sound=false,audio=null,modalPaused=false,lastEvent=0,toastUntil=0,lastRender=0,lastUI=0,lastPortrait=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||meta.settings.reducedMotion;
const ctx=$('world').getContext('2d',{alpha:false});
function save(){try{localStorage.setItem(KEY,JSON.stringify(meta));}catch{saveBlocked=true;toast('瀏覽器限制儲存，這次進度只保留到關閉頁面');} $('scrap').textContent=`${meta.scrap} 零件`;}
function beep(kind='deploy'){if(!sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(kind==='deploy'?280:kind==='win'?520:170,audio.currentTime);o.frequency.exponentialRampToValueAtTime(kind==='deploy'?440:kind==='win'?780:100,audio.currentTime+.12);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.2);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.21);}catch{sound=false;}}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');toastUntil=performance.now()+2300;}
const cards=Object.values(UNITS).map(u=>{const b=document.createElement('button');b.className='unit-card';b.setAttribute('aria-label',`派遣${u.name}，${u.cost}能量，快捷鍵${u.key}`);b.innerHTML=`<span class="key">${u.key}</span><canvas width="80" height="80" aria-hidden="true"></canvas><span class="cost">⚡ ${u.cost}</span><h3>${u.name}</h3><p>${u.subtitle}</p><span class="cdtext"></span><i class="cooldown"></i>`;b.title=u.description;b.onclick=()=>deploy(u.id);$('cards').append(b);return{b,u,c:b.querySelector('canvas').getContext('2d')};});
function deploy(type){if(!game)return;const r=game.deploy(type);if(r.ok){beep();}else toast({energy:'能量不足，稍等發電機補給',cooldown:'隊員整備中，請稍候',capacity:'小隊已滿，等待前線空位',status:'請先繼續旅程'}[r.reason]||'目前無法派遣');update();}
function start(mode='normal'){game=new Game({seed:mode==='daily'?dailySeed():Date.now(),meta,mode});shown='';lastEvent=0;last=performance.now();beep();update();}
function actionButton(text,fn,cls='primary'){const b=document.createElement('button');b.className=cls;b.textContent=text;b.onclick=fn;return b;}
function setOverlay(){const s=game?.state,status=s?.status||'intro';if(shown===status)return;shown=status;const o=$('overlay');o.replaceChildren();if(status==='playing')return;
if(status==='intro'){o.innerHTML=`<div class="intro"><p class="eyebrow">SURVIVE THE NIGHT. BRING EVERYONE HOME.</p><h2>最後一班車。<br><span>還有你的位置。</span></h2><p>霓虹熄滅後，街道不再安全。帶上你的五人小隊，守住巴士，突破三個封鎖區，迎接第一道晨光。</p><div id="introActions"></div><small>約 4–7 分鐘一局 · 鍵鼠 / 觸控 · 隨機補給 × 永久改裝</small></div>`;$('introActions').append(actionButton('開始旅程 ↗',()=>start()),actionButton('每日挑戰',()=>start('daily'),'secondary'));return;}
const p=document.createElement('div');p.className='panel';o.append(p);
if(status==='paused'){p.innerHTML='<p class="eyebrow">TAKE A BREATH</p><h2>巴士暫停靠站</h2><p>戰場時間已暫停。準備好了就繼續前進。</p>';p.append(actionButton('繼續旅程',()=>{game.pause(false);update();}),actionButton('結束這趟旅程',confirmAbandon,'secondary'));}
if(status==='upgrade'){p.innerHTML=`<p class="eyebrow">SUPPLY DROP / 波次 ${s.wave+1} 完成</p><h2>選一份補給，繼續前進。</h2><p>三選一改裝會保留到本趟旅程結束。</p><div class="upgrade-grid"></div>`;for(const u of s.upgradeChoices){const b=document.createElement('button');b.className='upgrade';b.innerHTML=`<em>${u.icon} ${u.tag}</em><strong>${u.name}</strong><span>${u.description}</span>`;b.onclick=()=>{game.chooseUpgrade(u.id);beep('win');update();};p.querySelector('.upgrade-grid').append(b);}}
if(status==='stageComplete'){p.innerHTML=`<p class="eyebrow">CHECKPOINT SECURED</p><h2>${STAGES[s.stage].name}，突破。</h2><p>巴士將維修 15% 耐久。下一站：${STAGES[s.stage+1].name}<br>本趟改裝與剩餘小隊繼續同行。</p>`;p.append(actionButton('前往下一站 →',()=>{game.startNextStage();update();}));}
if(status==='won'||status==='lost'){meta=game.claimRewards()||meta;meta.settings.sound=sound;save();beep(status==='won'?'win':'loss');p.innerHTML=`<p class="eyebrow">${status==='won'?'THE ROAD HOME':'END OF THE LINE'}</p><h2>${status==='won'?'天亮了。我們都在。':'這次，走到這裡。'}</h2><p>${status==='won'?'三個封鎖區已突破，終站吞噬者被擊退。':'巴士已失守。帶著回收的零件，讓下一趟走得更遠。'}<br>擊倒 ${s.stats.kills} · 派遣 ${s.stats.deployed} · 回收 ${s.reward} 零件</p>`;p.append(actionButton('再跑一趟 ↗',()=>start(game.mode)),actionButton('前往車庫',openGarage,'secondary'));if(s.achievements.length){const b=document.createElement('div');b.className='badges';for(const id of s.achievements){const span=document.createElement('span');span.textContent='✦ '+ACHIEVEMENTS.find(a=>a.id===id).name;b.append(span);}p.append(b);}}
}
function confirmAbandon(){showModal('<h2>結束這趟旅程？</h2><p>未結算的零件與本趟改裝會失去；已存的車庫進度不受影響。</p>');$('modalBody').append(actionButton('確定結束',()=>{game=null;shown='';$('modal').close();update();}));}
function showModal(html){if(!$('modal').open){modalPaused=game?.state.status==='playing';if(modalPaused)game.pause(true);$('modal').showModal();}$('modalBody').innerHTML=html;update();}
function openGarage(){showModal(`<p class="eyebrow">THE GARAGE / 永久改裝</p><h2>為下一趟做好準備。</h2><p>現有 ${meta.scrap} 零件 · 完成 ${meta.runs} 趟 / 通關 ${meta.wins} 趟<br>改裝於下一局生效。每日挑戰使用公平的基礎配置。</p><div id="garageRows"></div><div class="badges">${meta.achievements.map(id=>`<span>✦ ${ACHIEVEMENTS.find(a=>a.id===id).name}</span>`).join('')}</div>`);for(const u of Object.values(GARAGE_UPGRADES)){const row=document.createElement('div');row.className='garage-row';row.innerHTML=`<div><strong>${u.name} Lv.${meta.garage[u.id]}/${u.maxLevel}</strong><small>${u.description}</small></div>`;const cost=garageCost(meta,u.id),button=actionButton(cost===null?'已滿級':`${cost} 零件 升級`,()=>{const r=purchaseGarage(meta,u.id);if(r.ok){meta=r.save;if(game)game.meta=sanitizeSave(meta);save();openGarage();beep('win');}});button.disabled=cost===null||meta.scrap<cost;row.append(button);$('garageRows').append(row);}}
$('help').onclick=()=>showModal(`<p class="eyebrow">FIELD MANUAL</p><h2>車長，歡迎上車。</h2><ol><li>點擊下方隊員卡，或按 1–5 派遣。能量每秒回復，派遣後有冷卻。</li><li>撬棍手便宜、重衛擋傷、槍手輸出、醫護治療、燃瓶客清除群敵。</li><li>先派重衛與槍手，補上醫護；不要把能量一次花光。</li><li>每波敵人清除後，選一項三選一補給。每站第三波後擊破路障才能前進。</li><li>打完三站、擊倒終站 Boss 並破除路障就通關；巴士耐久歸零則失敗。</li><li>空白鍵 / P 暫停。切換分頁也會自動暫停。</li><li>勝敗結算時自動保存零件、成就與車庫；本趟即時戰況不跨關閉保存。</li></ol><p>每日挑戰使用 UTC 日期種子及相同基礎能力，可不限次重玩。音效預設靜音，按右上角 ♪ 開啟。${saveBlocked?'目前瀏覽器無法寫入儲存。':''}</p>`);
$('garage').onclick=openGarage;$('closeModal').onclick=()=>$('modal').close();$('modal').addEventListener('close',()=>{if(modalPaused&&game?.state.status==='paused'){game.pause(false);}modalPaused=false;update();});
$('pause').onclick=()=>{game?.pause();update();};$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♪ 開':'♪ 關';$('sound').setAttribute('aria-label',sound?'關閉音效':'開啟音效');meta.settings.sound=sound;save();if(sound)beep();};
document.addEventListener('keydown',e=>{if($('modal').open||e.repeat||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const u=Object.values(UNITS).find(u=>u.key===e.key);if(u){e.preventDefault();deploy(u.id);}if([' ','p','P','Escape'].includes(e.key)&&game&&!(e.key===' '&&['BUTTON','A'].includes(e.target.tagName))){e.preventDefault();game.pause();update();}});document.addEventListener('visibilitychange',()=>{if(document.hidden&&game?.state.status==='playing'){game.pause(true);update();}});
function setText(el,value){value=String(value);if(el.textContent!==value)el.textContent=value;}
function setStyle(el,key,value){if(el.style[key]!==value)el.style[key]=value;}
function setDisabled(el,value){if(el.disabled!==value)el.disabled=value;}
function update(){
 const s=game?.state||preview.state,d=STAGES[s.stage];
 setText($('stageNum'),String(s.stage+1).padStart(2,'0'));setText($('stageName'),d.name);
 setText($('wave'),game?`第 ${s.wave+1} / 3 波 · ${d.waves[s.wave].name}`:'等待出發 · 3 站生存旅程');
 setText($('hpText'),`${Math.ceil(s.bus.hp)} / ${s.bus.maxHp}`);setStyle($('hpBar'),'width',`${Math.max(0,Math.round(s.bus.hp/s.bus.maxHp*100))}%`);setStyle($('hpBar'),'background',s.bus.hp/s.bus.maxHp<.3?'var(--red)':'var(--mint)');
 setText($('energy'),Math.floor(s.resource));setText($('energy').nextElementSibling,'/'+s.maxResource);
 setDisabled($('pause'),!game||!['playing','paused'].includes(s.status));setText($('pause'),s.status==='paused'?'繼續':'暫停');
 setText($('sector'),`SECTOR 0${s.stage+1} / ${d.label}`);
 if(game){const ev=s.events.at(-1);if(ev&&ev.id!==lastEvent){setText($('signal'),ev.text);lastEvent=ev.id;}}else setText($('signal'),'通訊正常 · 等待車長指令');
 setText($('synergy'),s.upgrades.length?`本趟改裝 ${s.upgrades.length} 項 · 前線 ${s.allies.length} 人 · ${game?.mode==='daily'?'每日固定挑戰':'守住最後的回家路'}`:'小隊羈絆：盾兵保護前排，醫護維持戰線');
 for(const {b,u}of cards){
 setDisabled(b,!game||!game.canDeploy(u.id));const cd=s.cooldowns[u.id]||0;
 if(b.classList.contains('cooling')!==(cd>0))b.classList.toggle('cooling',cd>0);
 const cost=game?game.unitCost(u.id):u.cost;setText(b.querySelector('.cost'),'⚡ '+cost);
 const label=`派遣${u.name}，${cost}能量，快捷鍵${u.key}`;if(b.getAttribute('aria-label')!==label)b.setAttribute('aria-label',label);
 setStyle(b.querySelector('.cooldown'),'width',`${Math.round(cd/(game?game.unitCooldown(u.id):u.cooldown)*100)}%`);
 setText(b.querySelector('.cdtext'),cd>0?(Math.ceil(cd*2)/2).toFixed(1)+'s':'');
 }
 if(globalThis.location?.search.includes('debug=1')){let diag=$('diagnostics');if(!diag){diag=document.createElement('p');diag.id='diagnostics';diag.style.cssText='font:11px monospace;color:#a9cfc3;padding:10px';document.querySelector('footer').append(diag);}setText(diag,`t=${Math.floor(s.time)}s allies=${s.allies.length} enemies=${s.enemies.length} fx=${s.effects.length} events=${s.events.length} heap=${Math.round((performance.memory?.usedJSHeapSize||0)/1048576)}MB`);}
 setOverlay();
}
function loop(now){const dt=Math.min((now-last)/1000,.25);last=now;game?.tick(dt);uiTime+=dt;const s=game?.state||preview.state;if(now-lastRender>=1000/30){lastRender=now;drawScene(ctx,{...s,time:game?s.time:uiTime,units:s.allies,busHp:s.bus.hp,busMaxHp:s.bus.maxHp,barricadeHp:s.barricade.hp,barricadeMaxHp:s.barricade.maxHp,reducedMotion:reduced});}if(now-lastPortrait>=250){lastPortrait=now;for(const {c,u}of cards)drawPortrait(c,u.id,reduced?0:uiTime,80);}if(now-lastUI>=125){lastUI=now;update();}if(now>toastUntil&&$('toast').classList.contains('visible'))$('toast').classList.remove('visible');requestAnimationFrame(loop);}
save();update();requestAnimationFrame(loop);
