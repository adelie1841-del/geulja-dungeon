// 글자 던전 — 운영자 전용 기능 (db/admins/<uid> = true 인 계정만)
// 게임 내부에 연결: index.html 끝부분의 window.__GD 를 통해 실행돼요
(function(){
  if(typeof window.__GD!=='function')return;
  window.__GD('('+main.toString()+')()');
  function main(){
    let ADM=new Set(),me=null,hooked=false,smiteCd=0,supCd=0,seenAdm=new Set(),sparkT=0,lastT=performance.now();
    const isAdm=()=>!!me&&ADM.has(me);
    const GOLD='#ffd75e';
    function hookFb(){
        if(hooked||typeof firebase==='undefined'||!firebase.apps||!firebase.apps.length)return;hooked=true;
        firebase.auth().onAuthStateChanged(u=>{const was=isAdm();me=u?u.uid:null;if(!was&&isAdm())hello()});
        firebase.database().ref('db/admins').on('value',s=>{const v=s.val()||{},was=isAdm();ADM=new Set(Object.keys(v).filter(k=>v[k]===true));if(!was&&isAdm())hello();try{if(acctOpen)renderAcct()}catch(e){}},()=>{});
    }
    function hello(){try{say('👑 운영자 모드 — L 천벌 · K 운영자 보급',3)}catch(e){}}
    function ranked(){return MODE==='pvp'&&String(roomCode).charAt(0)==='r'}
    function canUse(){
        if(!isAdm()||state!=='play')return false;
        if(ranked()){say('랭크전에서는 운영자 능력이 꺼져요',1.6);return false}
        if(MODE==='pvp'&&!pv.alive)return false;return true;
    }
    function boltFx(x,y,big){
        for(let z=3.2;z>0;z-=.18)burst(x+(Math.random()-.5)*.25,y+(Math.random()-.5)*.25,z,1,'번',52,100,82,1,.25,.32,.13,0,false);
        burst(x,y,.1,big?18:10,'개',48,100,70,1,4,.5,.09,4,false);
        burst(x,y,.05,6,'탄',30,30,20,0,2,.9,.08,6,true);
        dyn.push({x,y,r:8,i:1.8,life:.4,max:.4});
        const d=Math.hypot(x-P.x,y-P.y);shake=Math.max(shake,Math.max(0,.7-d*.05));flashW=Math.max(flashW,d<10?.1:.04);
        sfxVol=Math.max(.25,1-d/30);sfx('boom');sfx('flashbang');sfxVol=1;
    }
    function smite(){
        if(!canUse())return;
        if(smiteCd>0){say(`천벌 재사용까지 ${Math.ceil(smiteCd)}초`,.9);return}
        const t=crossTarget();let x,y;
        if(t){x=t.x;y=t.y}else{cast(P.x,P.y,P.a);const d=Math.max(.8,Math.min(hDist,16)-.25);x=P.x+Math.cos(P.a)*d;y=P.y+Math.sin(P.a)*d}
        smiteCd=MODE==='pvp'?8:4;boltFx(x,y,true);
        if(MODE==='pvp')netEmit({t:'adm',x:+x.toFixed(2),y:+y.toFixed(2)});
        let n=0;
        for(const e of targets()){
              const dx=e.x-x,dy=e.y-y;if(dx*dx+dy*dy>1.8*1.8)continue;
              if(e.remote){if(!e.al||(team>=0&&e.tm===team))continue;lastZone='head';damage(e,30,0,0,true);n++}
              else if(e.T&&!e.dead&&e.hp>0){const m=e.T.boss?Math.max(60,(e.max||e.T.hp||300)*.25):9999;damage(e,m,dx||.01,dy||.01,true);n++}
        }
        slashText=.9;slashMsg=n?`천벌! ${n}명 적중`:'천벌!';
    }
    function supply(){
        if(!canUse())return;
        if(supCd>0){say(`운영자 보급 재사용까지 ${Math.ceil(supCd)}초`,.9);return}
        supCd=MODE==='pvp'?30:15;
        hp=Math.max(hp,100);armor=Math.max(armor,100);
        shells+=16;arRes+=90;snpRes+=10;arrows+=12;spears=Math.max(spears,3);nadeN+=2;flashN+=2;paintRes=(paintRes||0)+80;
        const ids=Object.keys(ITEMS).map(Number);while(bag.length<3)bag.push(ids[(Math.random()*ids.length)|0]);
        burst(P.x,P.y,.4,16,'빛',48,100,72,1,2.4,.7,.07,-1,false);sfx('pick');sfx('exit');
        say('👑 운영자 보급 도착! 체력·방어·탄약·아이템',2);
    }
    // 다른 사람 화면: 운영자 확인(방 기록의 로그인 계정으로 검증)
  const _netRecv=netRecv;
    netRecv=function(dt){
        _netRecv(dt);if(!R)return;const by={};for(const pe of R.peers())by[pe.peer]=pe.by;
        for(const r of remotes.values()){r.adm=ADM.has(by[r.peer]);if(r.adm){r.n0=r.n;r.n='★'+r.n;r.T.name=r.n;
                                                                                 if(!seenAdm.has(r.peer)&&r.tx!==undefined){seenAdm.add(r.peer);say(`👑 운영자 ${r.n0} 님 등장!`,3);sfx('exit');if(r.al)burst(r.x,r.y,.6,24,'빛',48,100,72,1,3,.9,.08,-1,false)}}}
    };
    const _handleNet=handleNet;
    handleNet=function(r,e){if(e&&e.t==='adm'){if(r.adm)boltFx(clamp(+e.x||0,0,MW),clamp(+e.y||0,0,MH),true);return}return _handleNet(r,e)};
    const goldLegs={};
    const _plLeg=plLeg;
    plLeg=function(r){
        if(!r.adm)return _plLeg(r);const th=r.tm===1?2:215;
        return goldLegs[th]||(goldLegs[th]={h:['왕',46,100,62,.7],H:['왕',50,100,78,.9],B:['신',th,70,56,.45],a:['손',46,90,62,.5],l:['발',42,70,40,.3]});
    };
    const _drawRemote=drawRemote;
    drawRemote=function(r,dirX,dirY,hor){
        _drawRemote(r,dirX,dirY,hor);
        if(r.adm&&r.al){const z=(r.z||0)+(r.cr?.6:.86)+.16+Math.sin(time*3)*.03;drawPt(r.x,r.y,z,.24,'관',48,100,66,1,dirX,dirY,hor)}
    };
    const _drawPvpHud=drawPvpHud;
    drawPvpHud=function(pad,small){const nm=netName;if(isAdm())netName='★'+nm;try{_drawPvpHud(pad,small)}finally{netName=nm}};
    const _drawHUD=drawHUD;
    drawHUD=function(){
        _drawHUD();if(!isAdm()||state!=='play')return;
        ctx.save();ctx.textAlign='center';ctx.textBaseline='top';const cx=W/2,y0=MODE==='pvp'?62:14;
        ctx.font=`bold 13px ${FONT}`;ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(cx-96,y0-3,192,21);
        ctx.fillStyle=GOLD;
        ctx.fillText(ranked()?'👑 운영자 (랭크전: 능력 꺼짐)':`👑 운영자 · 천벌 ${smiteCd>0?Math.ceil(smiteCd)+'초':'준비'} · 보급 ${supCd>0?Math.ceil(supCd)+'초':'준비'}`,cx,y0);
        ctx.restore();
    };
    const _acctHTML=acctHTML;
    acctHTML=function(){
        let h=_acctHTML();
        try{for(const p of leaderDocs)if(ADM.has(p.uid)){const s=`<span class="grow">${esc(p.nick)}</span>`;h=h.split(s).join(`<span class="grow" style="color:${GOLD}">👑 ${esc(p.nick)} <small>운영자</small></span>`)}
                if(acct&&isAdm())h=h.replace(`<span class="nm">${esc(acct.nick)}</span>`,`<span class="nm" style="color:${GOLD}">👑 ${esc(acct.nick)}</span><span class="tier" style="color:${GOLD}">운영자</span>`)}catch(e){}
        return h;
    };
    addEventListener('keydown',e=>{if(e.repeat||(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')))return;if(e.code==='KeyL')smite();if(e.code==='KeyK')supply()});
    // 모바일 버튼
  const box=document.createElement('div');box.style.cssText='position:absolute;top:96px;left:50%;transform:translateX(-50%);display:none;gap:8px;z-index:6';
    for(const [t,f] of [['⚡ 천벌',smite],['👑 보급',supply]]){const b=document.createElement('button');b.type='button';b.textContent=t;
                                                           b.style.cssText='font:bold 14px system-ui,sans-serif;padding:8px 12px;border-radius:10px;border:1px solid #ffd75e;background:rgba(30,24,6,.75);color:#ffd75e;touch-action:none';
                                                           b.addEventListener('pointerdown',ev=>{ev.preventDefault();ev.stopPropagation();f()});box.appendChild(b)}
    (document.getElementById('stage')||document.body).appendChild(box);
    function tick(now){
        const dt=Math.min(.1,(now-lastT)/1000);lastT=now;hookFb();
        smiteCd=Math.max(0,smiteCd-dt);supCd=Math.max(0,supCd-dt);
        box.style.display=TOUCH&&isAdm()&&state==='play'?'flex':'none';
        if(MODE==='pvp'){
              const names=new Set();for(const r of remotes.values())if(r.adm&&r.n0)names.add(r.n0);if(isAdm())names.add(netName);
              for(const f of killFeed){if(f._a)continue;f._a=1;if(names.has(f.a))f.a='★'+f.a;if(names.has(f.v))f.v='★'+f.v}
              sparkT-=dt;if(sparkT<=0){sparkT=.12;for(const r of remotes.values())if(r.adm&&r.al&&r.inRound)burst(r.x+(Math.random()-.5)*.5,r.y+(Math.random()-.5)*.5,(r.z||0)+.3+Math.random()*.6,1,'빛',48,100,72,1,.4,.6,.05,-1,false)}
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    window.GD_ADMIN={isAdmin:isAdm,admins:()=>[...ADM]};
  }
})();
