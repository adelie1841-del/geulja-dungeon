// 글자 던전 — 운영자 전용 기능 v2 (db/admins/<uid> = true 인 계정만)
// index.html 끝부분의 window.__GD 로 게임 내부에 연결돼요
(function(){
if(typeof window.__GD!=='function')return;
window.__GD('('+main.toString()+')()');
function main(){
let ADM=new Set(),me=null,hooked=false,cfgLoaded=false,seenAdm=new Set(),sparkT=0,lastT=performance.now(),menuOpen=false,prevW=-1,sdOn=false;
const CD={smite:0,sup:0,blink:0,judge:0};
const isAdm=()=>!!me&&ADM.has(me);
const GOLD='#ffd75e',AURA=[['금빛',46],['보라',280],['진홍',355],['하늘',195],['무지개',-1]];
const PERK=[['inv',2,'무적'],['inf',8,'무한 탄약'],['spd',4,'신속 (1.5배)'],['rage',5,'광폭 (피해 2배)'],['jump',3,'도약 (2단 점프)'],['regen',6,'재생']];
let cfg={sd:true,inv:true,inf:true,spd:false,rage:true,jump:true,regen:true,aura:0,msg:'',w:true};
try{Object.assign(cfg,JSON.parse(localStorage.getItem('gd-admin')||'{}'))}catch(e){}
sdOn=!!cfg.sd;
function patch(fn,a,b){const s=fn.toString();if(!s.includes(a)){console.warn('[운영자] 패치 실패',a.slice(0,30));return fn}return eval('('+s.replace(a,b)+')')}
const auraHue=ac=>{const a=AURA[ac|0]||AURA[0];return a[1]<0?((time*90)|0)%360:a[1]};
function hookFb(){
  if(hooked||typeof firebase==='undefined'||!firebase.apps||!firebase.apps.length)return;hooked=true;
  firebase.auth().onAuthStateChanged(u=>{const was=isAdm();me=u?u.uid:null;cfgLoaded=false;if(!was&&isAdm())hello()});
  firebase.database().ref('db/admins').on('value',s=>{const v=s.val()||{},was=isAdm();ADM=new Set(Object.keys(v).filter(k=>v[k]===true));if(!was&&isAdm())hello();try{if(acctOpen)renderAcct()}catch(e){}},()=>{});
}
function loadCfg(){if(cfgLoaded||!isAdm())return;cfgLoaded=true;
  firebase.database().ref('db/data/users/'+me+'/admin').once('value').then(s=>{const v=s.val();if(v&&typeof v==='object'){Object.assign(cfg,v);sdOn=!!cfg.sd;try{localStorage.setItem('gd-admin',JSON.stringify(cfg))}catch(e){}if(menuOpen)renderMenu()}}).catch(()=>{})}
function hello(){loadCfg();topBtn.hidden=false;try{say('👑 운영자 모드 — ` 운영자 메뉴 · F 산데비스탄 · O 신의 심판',3.2)}catch(e){}}
const ranked=()=>false; // 운영자 능력은 랭크전에서도 켜짐
const live=()=>isAdm()&&state==='play'&&!ranked()&&!(MODE==='pvp'&&!pv.alive);
function canUse(){if(!isAdm()||state!=='play')return false;if(ranked()){say('랭크전에서는 운영자 능력이 꺼져요',1.6);return false}return !(MODE==='pvp'&&!pv.alive)}
function cool(k,s){if(CD[k]>0){say(`재사용까지 ${Math.ceil(CD[k])}초`,.7);return false}CD[k]=s;return true}
// ---------- 연출 ----------
function boltFx(x,y){
  for(let z=3.4;z>0;z-=.16)burst(x+(Math.random()-.5)*.3,y+(Math.random()-.5)*.3,z,1,'번',52,100,84,1,.25,.34,.14,0,false);
  burst(x,y,.1,20,'개',48,100,70,1,4.5,.55,.09,4,false);burst(x,y,.05,6,'탄',30,30,20,0,2,.9,.08,6,true);
  dyn.push({x,y,r:9,i:2,life:.42,max:.42});
  const d=Math.hypot(x-P.x,y-P.y);shake=Math.max(shake,Math.max(0,.8-d*.05));flashW=Math.max(flashW,d<10?.1:.04);
  sfxVol=Math.max(.25,1-d/30);sfx('boom');sfx('flashbang');sfxVol=1;
}
function beamFx(x0,y0,x1,y1,hue){
  const L=Math.hypot(x1-x0,y1-y0),n=Math.max(2,Math.ceil(L*2.2));
  for(let i=1;i<=n;i++){const f=i/n;burst(x0+(x1-x0)*f,y0+(y1-y0)*f,.5+(Math.random()-.5)*.06,1,i%3?'광':'천',hue,100,80,1,.15,.22+Math.random()*.12,.1,0,false)}
  burst(x1,y1,.5,12,'벌',hue,100,72,1,3.5,.4,.08,2,false);dyn.push({x:x1,y:y1,r:5,i:1.6,life:.2,max:.2});
}
function hitAt(e,dmgSolo){
  if(e.remote){if(!e.al||(team>=0&&e.tm===team))return false;lastZone='head';damage(e,dmgSolo===KILL?999:30,0,0,true);return true}
  if(e.T&&!e.dead&&e.hp>0){const dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy)||1;damage(e,dmgSolo(e),dx/d,dy/d,true);return true}
  return false;
}
const bossCut=e=>e.T.boss?Math.max(40,(e.max||e.T.hp||300)*.3):9999;
// ---------- 능력 ----------
function smite(){ // 천벌: 조준점 + 주변 연쇄
  if(!canUse()||!cool('smite',MODE==='pvp'?4:2))return;
  const t=crossTarget();let x,y;
  if(t){x=t.x;y=t.y}else{cast(P.x,P.y,P.a);const d=Math.max(.8,Math.min(hDist,18)-.25);x=P.x+Math.cos(P.a)*d;y=P.y+Math.sin(P.a)*d}
  const hits=[[x,y]];let n=0;
  for(const e of targets()){const dx=e.x-x,dy=e.y-y;if(dx*dx+dy*dy<2.4*2.4&&hitAt(e,bossCut))n++}
  for(const e of targets()){if(hits.length>=6)break;const dx=e.x-x,dy=e.y-y,dd=dx*dx+dy*dy;if(dd>=2.4*2.4&&dd<7*7&&hitAt(e,bossCut)){hits.push([e.x,e.y]);n++}}
  for(const h of hits){boltFx(h[0],h[1]);if(MODE==='pvp')netEmit({t:'adm',k:'z',x:+h[0].toFixed(2),y:+h[1].toFixed(2)})}
  slashText=.9;slashMsg=n?`천벌! ${n}명 적중`:'천벌!';
}
function judge(){ // 심판의 날: 주변 모든 적에게 번개
  if(!canUse()||!cool('judge',MODE==='pvp'?25:12))return;let n=0;
  for(const e of targets()){if(Math.hypot(e.x-P.x,e.y-P.y)>15)continue;if(hitAt(e,bossCut)){n++;boltFx(e.x,e.y);if(MODE==='pvp')netEmit({t:'adm',k:'z',x:+e.x.toFixed(2),y:+e.y.toFixed(2)})}}
  shake=1.2;flashW=.18;say(`⚡ 심판의 날 — ${n}명 심판`,2.2);
}
function blink(){ // 순간이동
  if(!canUse()||!cool('blink',.5))return;
  cast(P.x,P.y,P.a);let d=Math.min(hDist-.35,14),x=P.x,y=P.y;
  for(;d>.5;d-=.1){const tx=P.x+Math.cos(P.a)*d,ty=P.y+Math.sin(P.a)*d;if(!blocked(tx,ty,.25,null,P.z||0)){x=tx;y=ty;break}}
  if(x===P.x&&y===P.y)return;
  burst(P.x,P.y,.5,14,'잔',auraHue(cfg.aura),95,65,.9,1.6,.5,.09,0,false);beamFx(P.x,P.y,x,y,auraHue(cfg.aura));
  if(MODE==='pvp')netEmit({t:'adm',k:'b',x0:+P.x.toFixed(2),y0:+P.y.toFixed(2),x1:+x.toFixed(2),y1:+y.toFixed(2)});
  P.x=x;P.y=y;sfx('dash');burst(x,y,.5,14,'빛',auraHue(cfg.aura),100,72,1,2,.5,.08,-1,false);
}
function supply(){
  if(!canUse()||!cool('sup',MODE==='pvp'?15:6))return;
  hp=Math.max(hp,100);armor=Math.max(armor,100);
  shells+=16;arRes+=90;snpRes+=10;arrows+=12;spears=Math.max(spears,3);nadeN+=3;flashN+=3;paintRes=(paintRes||0)+80;cyl=6;pMag=12;arMag=30;snpMag=5;if(typeof gmRefillAll==='function')gmRefillAll();
  const ids=Object.keys(ITEMS).map(Number);while(bag.length<3)bag.push(ids[(Math.random()*ids.length)|0]);
  burst(P.x,P.y,.4,18,'빛',auraHue(cfg.aura),100,72,1,2.4,.7,.07,-1,false);sfx('pick');sfx('exit');say('👑 운영자 보급 도착!',1.6);
}
function toggleSd(){
  if(!isAdm()||state!=='play')return;if(ranked()){say('랭크전에서는 운영자 능력이 꺼져요',1.6);return}
  sdOn=!sdOn;if(sdOn){fx[1]=ITEMS[1].d;netEmit({t:'sd'});sfx('sande');ghostT=0;flashW=Math.max(flashW,.08);say('산데비스탄 상시 가동',1.2)}
  else{fx[1]=.01;say('산데비스탄 해제',1)}
}
// ---------- 전용 무기: 신의 심판 ----------
const AW=WEAP.length;
WEAP.push({name:'신의 심판',admin:1,cd:.14,dmg:12,pellets:1,spread:0,auto:1,shake:.22,snd:'sniper',flash:'천',ads:1,zoom:1.45,
  fs:.55,step:.55,rowH:.62,hipX:.67,hipY:.3,hipR:-.2,pivot:[6,14.5],
  leg:{s:['광',50,100,86,1],B:['천',48,95,64,.7],b:['천',45,85,48,.5],d:['천',42,70,32],g:['벌',280,70,42,.4],G:['벌',285,80,62,.7],L:['손',24,52,54],r:['신',45,70,40],R:['신',48,90,60,.5],k:['금',50,95,62,.8],e:['핵',190,100,62,1],m:['심',45,60,30],M:['심',48,80,50,.4],t:['판',45,40,30],q:['판',45,60,28],Q:['판',48,75,44],h:['손',24,52,58],H:['손',22,45,44]},
  art:WEAP[5].art.slice()});
// 즉사: 보스·되살아나는 적까지 남은 체력만큼 한 방에 (기록이 터무니없이 커지지 않게 남은 체력만큼만)
const KILL=x=>{if(x&&x.T){x.revived=1;x.rvE=0;x.split=0;return Math.max(1,(x.hp||1)+1)*3/Math.max(.01,(x.dr||1))}return 9999};
function adminFire(){
  const w=WEAP[AW];if(state!=='play'||atkCd>0||switchT>0)return;
  if(ranked()){say('랭크전에서는 신의 심판을 쓸 수 없어요',1.4);switchTo(primary>=0?primary:secondary);return}
  atkCd=w.cd;atkT=0;shake=Math.max(shake,w.shake);sfx('sniper');if(Math.random()<.5)sfx('flashbang');netEmit({t:'shot',w:AW});
  recoil=1;flash=.08;GS.vy-=14;GS.vr-=2.5;GS.vx+=(Math.random()-.5)*3;kick+=.02*(aiming?.5:1);crossK=1;
  cast(P.x,P.y,P.a);const L=Math.min(hDist,40),cx=Math.cos(P.a),cy=Math.sin(P.a);let n=0;
  for(const e of targets()){const dx=e.x-P.x,dy=e.y-P.y,t=dx*cx+dy*cy;if(t<=0||t>L+.3)continue;const r=(e.T&&e.T.r)||.3;if(Math.abs(dx*cy-dy*cx)>r+.18)continue;
    if(hitAt(e,KILL))n++}
  const x1=P.x+cx*L,y1=P.y+cy*L,hue=auraHue(cfg.aura);
  for(const e of targets()){const dx=e.x-x1,dy=e.y-y1;if(dx*dx+dy*dy<1.3*1.3)hitAt(e,KILL)}
  beamFx(P.x+cx*.5,P.y+cy*.5,x1,y1,hue);dyn.push({x:P.x+cx*.5,y:P.y+cy*.5,r:5,i:1.4,life:.08,max:.08});
  if(MODE==='pvp')netEmit({t:'adm',k:'b',x0:+(P.x+cx*.5).toFixed(2),y0:+(P.y+cy*.5).toFixed(2),x1:+x1.toFixed(2),y1:+y1.toFixed(2)});
  if(n){hitMark=.2;slashText=.5;slashMsg=n>1?`관통 ${n}명!`:'심판!'}
  for(const e of enemies){if(!e.dead&&Math.hypot(e.x-P.x,e.y-P.y)<16)e.alert=true}
}
function equipAW(){
  if(!isAdm()||state!=='play')return;if(ranked()){say('랭크전에서는 신의 심판을 쓸 수 없어요',1.4);return}
  if(cur===AW){cur=prevW>=0&&prevW!==AW?prevW:(primary>=0?primary:secondary);switchT=.32;return}
  prevW=cur;cur=AW;switchT=.4;atkT=9;reload=null;snpRel=null;arRel=null;gRel=null;atkHeld=false;drawing=false;GS.y=6;sfx('exit');say('신의 심판 — 닿으면 즉사 · 관통 · 무한',1.4);
}
const _fire=fire;fire=function(){if(cur===AW)return adminFire();return _fire()};
const _drawWeapon=drawWeapon;
drawWeapon=function(){
  if(cur!==AW||state==='title')return _drawWeapon();
  const w=WEAP[AW],gc=clamp(Math.floor(H/15.5),18,48);revGC=gc;const lay=artLayout(w,gc);
  const p=gunPlace(w,gc,lay,0,0,0,true),lit=1.1+flash*4;
  withPose(p,()=>drawArt(w,gc,lit,lay,null,k=>k==='e'?[0,Math.sin(time*6)*.08]:null));
  if(flash>0)muzzleAt(w,lay,p,gc);
};
drawHUD=patch(drawHUD,"const albl=w.spear?","const albl=w.admin?'신의 심판 · 즉사 ∞':w.spear?");
// ---------- 대전: 다른 사람 화면 ----------
netSend=patch(netSend,"kb:pv.kb,","kb:pv.kb,ac:isAdm()?(cfg.aura|0):0,am:isAdm()?String(cfg.msg||'').slice(0,24):'',");
const _netRecv=netRecv;
netRecv=function(dt){
  _netRecv(dt);if(!R)return;const by={},pres={};for(const pe of R.peers()){by[pe.peer]=pe.by;pres[pe.peer]=pe.presence||{}}
  for(const r of remotes.values()){r.adm=ADM.has(by[r.peer]);if(!r.adm)continue;const pr=pres[r.peer];
    r.ac=clamp(pr.ac|0,0,AURA.length-1);r.am=String(pr.am||'').replace(/[<>]/g,'').slice(0,24);
    r.n0=r.n;r.n='★'+r.n;r.T.name=r.n;
    if(!seenAdm.has(r.peer)&&r.tx!==undefined){seenAdm.add(r.peer);say(r.am?`👑 ${r.n0}: ${r.am}`:`👑 운영자 ${r.n0} 님 등장!`,3.2);sfx('exit');if(r.al)burst(r.x,r.y,.6,26,'빛',auraHue(r.ac),100,72,1,3,.9,.08,-1,false)}}
};
const _handleNet=handleNet;
handleNet=function(r,e){
  if(e&&e.t==='adm'){if(!r.adm)return;const c=v=>clamp(+v||0,0,Math.max(MW,MH));
    if(e.k==='b')beamFx(c(e.x0),c(e.y0),c(e.x1),c(e.y1),auraHue(r.ac));else boltFx(c(e.x),c(e.y));return}
  return _handleNet(r,e);
};
const _plLeg=plLeg;
plLeg=function(r){
  if(!r.adm)return _plLeg(r);const th=r.tm===1?2:215,h=auraHue(r.ac);
  return {h:['왕',h,100,62,.7],H:['왕',h,100,80,.9],B:['신',th,70,56,.45],a:['손',h,90,62,.5],l:['발',h,70,40,.3]};
};
const _drawRemote=drawRemote;
drawRemote=function(r,dirX,dirY,hor){
  _drawRemote(r,dirX,dirY,hor);
  if(r.adm&&r.al){const z=(r.z||0)+(r.cr?.6:.86)+.16+Math.sin(time*3)*.03;drawPt(r.x,r.y,z,.24,'관',auraHue(r.ac),100,66,1,dirX,dirY,hor)}
};
const _drawPvpHud=drawPvpHud;
drawPvpHud=function(pad,small){const nm=netName;if(isAdm())netName='★'+nm;try{_drawPvpHud(pad,small)}finally{netName=nm}};
const _drawHUD=drawHUD;
drawHUD=function(){
  _drawHUD();if(!isAdm()||state!=='play')return;
  ctx.save();ctx.textAlign='center';ctx.textBaseline='top';const cx=W/2,y0=MODE==='pvp'?62:14;
  const cd=k=>CD[k]>0?Math.ceil(CD[k])+'초':'준비';
  const t=ranked()?'👑 운영자 (랭크전: 능력 꺼짐)':`👑 운영자 · 산데 ${sdOn?'ON':'OFF'} · 천벌 ${cd('smite')} · 심판의 날 ${cd('judge')} · 보급 ${cd('sup')}`;
  ctx.font=`bold 13px ${FONT}`;const tw=ctx.measureText(t).width+16;ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(cx-tw/2,y0-3,tw,21);
  ctx.fillStyle=GOLD;ctx.fillText(t,cx,y0);ctx.restore();
};
const _acctHTML=acctHTML;
acctHTML=function(){
  let h=_acctHTML();
  try{for(const p of leaderDocs)if(ADM.has(p.uid)){const s=`<span class="grow">${esc(p.nick)}</span>`;h=h.split(s).join(`<span class="grow" style="color:${GOLD}">👑 ${esc(p.nick)} <small>운영자</small></span>`)}
    if(acct&&isAdm())h=h.replace(`<span class="nm">${esc(acct.nick)}</span>`,`<span class="nm" style="color:${GOLD}">👑 ${esc(acct.nick)}</span><span class="tier" style="color:${GOLD}">운영자</span>`)}catch(e){}
  return h;
};
// ---------- 운영자 메뉴 ----------
const css=document.createElement('style');css.textContent=`
#admMenu{position:absolute;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;background:rgba(6,5,2,.72);padding:16px}
#admMenu[hidden]{display:none}
#admMenu .box{width:min(560px,100%);max-height:100%;overflow:auto;background:#17140a;border:1px solid #ffd75e;border-radius:12px;padding:18px;color:#f4ecd2;font:14px system-ui,sans-serif;box-shadow:0 0 40px rgba(255,215,94,.25)}
#admMenu h2{margin:0 0 4px;color:#ffd75e;font:22px "Black Han Sans",system-ui,sans-serif}
#admMenu h3{margin:14px 0 6px;color:#ffd75e;font-size:14px}
#admMenu .note{margin:0;color:#c8bd96;font-size:12px}
#admMenu .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
#admMenu label.ck{display:flex;gap:8px;align-items:center;background:#221d0d;border:1px solid #4a3f1c;border-radius:8px;padding:8px 10px;cursor:pointer}
#admMenu .aur{display:flex;flex-wrap:wrap;gap:6px}
#admMenu .aur button,#admMenu .row button{font:inherit;padding:7px 12px;border-radius:8px;border:1px solid #4a3f1c;background:#221d0d;color:#f4ecd2;cursor:pointer}
#admMenu .aur button[aria-pressed=true]{border-color:#ffd75e;color:#ffd75e}
#admMenu input[type=text]{width:100%;box-sizing:border-box;font:inherit;padding:8px 10px;border-radius:8px;border:1px solid #4a3f1c;background:#0e0c05;color:#f4ecd2}
#admMenu .row{display:flex;gap:8px;align-items:center;margin-top:16px;flex-wrap:wrap}
#admMenu .row .save{background:#ffd75e;color:#1a1505;border-color:#ffd75e;font-weight:700}
#admMenu kbd{display:inline-block;min-width:1.4em;text-align:center;padding:1px 5px;border:1px solid #6b5a22;border-radius:4px;color:#ffd75e;font:12px ui-monospace,monospace}
#admMenu ul{margin:0;padding-left:18px;color:#e6dcb8;line-height:1.7}`;
document.head.appendChild(css);
const stageEl=document.getElementById('stage')||document.body;
const menu=document.createElement('div');menu.id='admMenu';menu.hidden=true;stageEl.appendChild(menu);
function renderMenu(){
  menu.innerHTML=`<div class="box" role="dialog" aria-label="운영자 메뉴"><h2>👑 운영자 메뉴</h2><p class="note">혼자 하기와 친선 대전에서 적용돼요. 랭크전에서는 모두 꺼져요.</p>
  <h3>산데비스탄</h3><label class="ck"><input type="checkbox" data-k="sd" ${cfg.sd?'checked':''}> 시작할 때 켜 두기 (게임 중엔 <kbd>F</kbd>로 켜고 끄기 · 쿨타임 없음) — 지금 ${sdOn?'켜짐':'꺼짐'}</label>
  <h3>상시 효과</h3><div class="grid">${PERK.map(p=>`<label class="ck"><input type="checkbox" data-k="${p[0]}" ${cfg[p[0]]?'checked':''}> ${p[2]}</label>`).join('')}</div>
  <h3>오라 색</h3><div class="aur">${AURA.map((a,i)=>`<button type="button" data-aura="${i}" aria-pressed="${(cfg.aura|0)===i}" style="${a[1]>=0?`color:hsl(${a[1]},90%,65%)`:''}">${a[0]}</button>`).join('')}</div>
  <h3>등장 문구 <span class="note">(대전 입장 때 다른 사람 화면에 떠요)</span></h3><input type="text" id="admMsg" maxlength="24" placeholder="예: 운영자 강림" value="${esc(cfg.msg||'')}">
  <h3>조작</h3><ul><li><kbd>O</kbd> 전용 무기 <b>신의 심판</b> — 일직선의 적을 모두 꿰뚫는 광선, 한 발에 처치, 탄 무한</li><li><kbd>F</kbd> 산데비스탄 켜기/끄기</li><li><kbd>L</kbd> 천벌 — 조준점 낙뢰 + 주변 5명 연쇄</li><li><kbd>U</kbd> 심판의 날 — 반경 15칸 모든 적에게 낙뢰</li><li><kbd>J</kbd> 순간이동 — 바라보는 곳으로</li><li><kbd>K</kbd> 운영자 보급 — 체력·방어·탄약·아이템 가득</li><li><kbd>\`</kbd> 이 메뉴</li></ul>
  <div class="row"><button type="button" class="save" data-act="save">저장</button><button type="button" data-act="close">닫기</button><span class="note" id="admSt" role="status"></span></div></div>`;
}
function openMenu(){if(!isAdm())return;menuOpen=true;renderMenu();menu.hidden=false;try{document.exitPointerLock&&document.exitPointerLock()}catch(e){}if(state==='play'&&MODE!=='pvp')pause()}
function closeMenu(){menuOpen=false;menu.hidden=true}
menu.addEventListener('click',e=>{const b=e.target.closest('button');if(e.target===menu){closeMenu();return}if(!b)return;
  if(b.dataset.aura){cfg.aura=+b.dataset.aura;menu.querySelectorAll('[data-aura]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}
  if(b.dataset.act==='close')closeMenu();
  if(b.dataset.act==='save'){const st=menu.querySelector('#admSt');cfg.msg=(menu.querySelector('#admMsg').value||'').replace(/[<>]/g,'').slice(0,24);
    try{localStorage.setItem('gd-admin',JSON.stringify(cfg))}catch(e){}sdOn=!!cfg.sd||sdOn&&cfg.sd;
    st.textContent='저장하는 중…';firebase.database().ref('db/data/users/'+me+'/admin').set(cfg).then(()=>{st.textContent='저장했어요. 다른 기기에서도 똑같이 적용돼요.'}).catch(()=>{st.textContent='이 기기에만 저장했어요 (서버 저장 실패).'})}});
menu.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.k;if(k){cfg[k]=e.target.checked;if(k==='sd')sdOn=cfg.sd}});
const topBtn=document.createElement('button');topBtn.type='button';topBtn.textContent='👑 운영자';topBtn.hidden=true;topBtn.style.color=GOLD;topBtn.addEventListener('click',openMenu);
const tools=document.getElementById('tools');if(tools)tools.insertBefore(topBtn,tools.firstChild);
// ---------- 키 ----------
addEventListener('keydown',e=>{
  if(!isAdm()||e.repeat||(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')))return;
  if(e.code==='Backquote'){e.preventDefault();e.stopImmediatePropagation();menuOpen?closeMenu():openMenu();return}
  if(menuOpen){if(e.code==='Escape'){closeMenu();e.stopImmediatePropagation()}return}
  if(state!=='play')return;
  const m={KeyF:toggleSd,KeyL:smite,KeyK:supply,KeyJ:blink,KeyU:judge,KeyO:equipAW}[e.code];
  if(m){e.preventDefault();e.stopImmediatePropagation();m()}
},true);
// ---------- 모바일 버튼 ----------
const box=document.createElement('div');box.style.cssText='position:absolute;top:92px;left:50%;transform:translateX(-50%);display:none;gap:6px;z-index:6;flex-wrap:wrap;justify-content:center;max-width:94%';
for(const [t,f] of [['⚜ 심판',equipAW],['⏱ 산데',toggleSd],['⚡ 천벌',smite],['☄ 심판의 날',judge],['✦ 이동',blink],['👑 보급',supply],['☰ 메뉴',openMenu]]){const b=document.createElement('button');b.type='button';b.textContent=t;
  b.style.cssText='font:bold 13px system-ui,sans-serif;padding:7px 10px;border-radius:10px;border:1px solid #ffd75e;background:rgba(30,24,6,.78);color:#ffd75e;touch-action:none';
  b.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();f()});box.appendChild(b)}
stageEl.appendChild(box);
// ---------- 매 프레임 ----------
function tick(now){
  const dt=Math.min(.1,(now-lastT)/1000);lastT=now;hookFb();if(isAdm()){topBtn.hidden=false;loadCfg()}
  for(const k in CD)CD[k]=Math.max(0,CD[k]-dt);
  box.style.display=TOUCH&&isAdm()&&state==='play'&&!menuOpen?'flex':'none';
  if(live()){
    if(sdOn&&!(fx[1]>1)){if(!(fx[1]>0)){netEmit({t:'sd'});ghostT=0}fx[1]=ITEMS[1].d}
    for(const p of PERK)if(cfg[p[0]])fx[p[1]]=ITEMS[p[1]].d;
  }else if(cur===AW&&ranked()){cur=primary>=0?primary:secondary;switchT=.32}
  if(MODE==='pvp'){
    const names=new Set();for(const r of remotes.values())if(r.adm&&r.n0)names.add(r.n0);if(isAdm())names.add(netName);
    for(const f of killFeed){if(f._a)continue;f._a=1;if(names.has(f.a))f.a='★'+f.a;if(names.has(f.v))f.v='★'+f.v}
    sparkT-=dt;if(sparkT<=0){sparkT=.1;for(const r of remotes.values())if(r.adm&&r.al&&r.inRound)burst(r.x+(Math.random()-.5)*.5,r.y+(Math.random()-.5)*.5,(r.z||0)+.3+Math.random()*.6,1,'빛',auraHue(r.ac),100,72,1,.4,.6,.05,-1,false)}
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.GD_ADMIN={isAdmin:isAdm,admins:()=>[...ADM]};
}
})();
