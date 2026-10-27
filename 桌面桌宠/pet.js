'use strict';
const api = window.paybeatDesktop;
const $ = id => document.getElementById(id);
const companion=$('companion'), hero=$('hero'), sprite=$('sprite'), target=$('nextReward'), landscape=$('landscape');
const motionPose=$('motionPose'), motionSprite=$('motionSprite');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const skins={C:'月白猫帽',A:'薄荷旅人',B:'樱桃快跑'};
const COIN_START=214, COIN_Y=81;
// Source rectangles keep every pose on one ground baseline without editing the artwork.
const motionArt={
  C:{scale:.132,mouth:[40,35],walk:[0,1,2,3,4,5],open:6,puff:7,rects:[[64,17,313,435],[507,17,312,435],[947,19,311,433],[1386,18,315,434],[65,464,316,417],[507,464,312,417],[947,464,320,417],[1386,463,320,418]]},
  A:{scale:.137,mouth:[41,32],walk:[0,1,2,3,4,5],open:6,puff:7,rects:[[68,4,323,435],[526,6,304,433],[942,1,304,438],[1375,4,331,435],[69,443,310,436],[515,444,314,435],[952,444,313,435],[1392,444,314,435]]},
  B:{scale:.140,mouth:[44,30],walk:[0,1,2,3,4,5],open:6,puff:7,rects:[[106,11,345,425],[532,12,340,424],[938,9,346,427],[1364,10,343,426],[106,447,340,429],[534,445,340,430],[933,453,339,426],[1371,455,344,424]]}
};
let latest=null, anchor=null, distance=0, lastReceived=0, lastReward=0, tileStart=null, rewards=0;
let currentSkin=null, lastFrame=null, bite=null, gesture=null, lastEncounter=null, lastEncounterAt=-Infinity, frozen=false;
let targetX=COIN_START, targetScale=1, targetOpacity=1;
let targetY=COIN_Y, revealAt=-Infinity, lastPaint=0;
const actor={x:0,y:0,sx:1,sy:1};
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const mouth=()=>{const point=motionArt[currentSkin||'C'].mouth;return {x:56+32+(point[0]-32)*actor.sx+actor.x,y:51+64+(point[1]-64)*actor.sy+actor.y};};
function coinProgress(now,active){return Math.min(.995,(anchor?.coinProgress||0)+(active&&anchor?Math.min(now-anchor.at,300)/1000*(anchor.coinSpeed||0):0));}
const captions=['继续向前，每一步都算数','小路还长，收获在前方','今天也在稳稳向前'];

function motionOff(){return latest?.quiet||reducedMotion.matches||latest?.stale;}
function clearEffects(){
  bite=null;gesture=null;
  companion.classList.remove('collecting','celebrating','reward-small','reward-big','reward-flag','hello','encounter','hopping');
  $('butterfly').classList.remove('flying');
}
function interact(kind,now=performance.now()){
  if(motionOff())return;
  gesture={kind,start:now,end:now+(kind==='hop'?650:1300)};
  companion.dataset.interaction=kind;
  companion.classList.toggle('hello',kind==='hello');
  companion.classList.toggle('encounter',kind==='flower'||kind==='sign');
  companion.classList.toggle('hopping',kind==='hop');
  $('butterfly').classList.toggle('flying',kind==='flower'||kind==='hello');
}
function setSkin(value,now){
  const skin=skins[value]?value:'C';
  if(currentSkin===skin)return;
  const changed=currentSkin!==null;currentSkin=skin;lastFrame=null;
  document.body.dataset.skin=skin;
  sprite.src='assets/skin-'+skin.toLowerCase()+'.png';
  motionSprite.src='assets/motion-'+skin.toLowerCase()+'.png';
  hero.setAttribute('aria-label','和'+skins[skin]+'打招呼；右键打开操作菜单');
  if(changed)clearEffects();
  if(changed)interact('skin',now);
}
function updateStatus(now){
  if(!latest)return;
  if(gesture&&gesture.end>now){
    $('status').textContent=gesture.kind==='skin'?skins[currentSkin]+'，一起出发！':gesture.kind==='hello'?'收到！陪你再走一段':gesture.kind==='flower'?'路边的小花也在为你加油':gesture.kind==='hop'?'轻轻跨过，再往前一点':'沿着小路，继续向前';
    return;
  }
  $('status').textContent=latest.stale?'计时连接恢复中…':!latest.ready?'设置工资，开始这段旅程':latest.mode==='done'?'今天走过的路，都算数':latest.resting||latest.mode==='resting'?'歇一会儿，小路等你回来':latest.mode==='paused'?'休息中，收获都在':latest.mode==='overtime'?'夜路继续，收获也在继续':latest.billable?captions[Math.floor(distance/600)%captions.length]:'等到上班，一起出发';
}
function render(state){
  const now=performance.now(), initial=!latest, previous=latest;
  latest=state;lastReceived=now;
  document.body.classList.toggle('quiet',state.quiet===true);
  document.body.classList.toggle('reduced-motion',reducedMotion.matches);
  document.body.dataset.mode=state.stale?'idle':state.mode;
  const active=state.ready&&state.billable&&!state.stale;
  companion.classList.toggle('working',active&&!motionOff());
  if(motionOff()||(!active&&previous?.billable))clearEffects();
  setSkin(state.skin,now);
  const progress=state.journey;
  if(!progress){anchor=null;clearEffects();updateStatus(now);return;}
  const discontinuity=!anchor||anchor.epoch!==progress.epoch||Math.abs(progress.distance-anchor.distance)>70;
  const newSample=anchor?.sampleId!==progress.sampleId;
  if(discontinuity){
    if(!motionOff()||!anchor)distance=progress.distance;
    clearEffects();tileStart=null;lastEncounter=null;
  }
  if(newSample||!anchor||anchor.active!==active){
    anchor={...progress,active,at:now};
  }
  const reward=progress.reward;
  if(reward&&reward.id!==lastReward){
    lastReward=reward.id;
    if(!initial&&!discontinuity&&!state.stale){
      rewards++;companion.dataset.coins=String(rewards);companion.dataset.lastReward=reward.kind;
      if(active&&!motionOff()){
        // Finish the approaching coin at the mouth, then replace it with the next coin.
        // Reward eligibility always comes from the ledger, never this animation.
        bite={kind:reward.kind,start:now,from:Math.max(mouth().x,targetX),fromY:targetY,duration:reward.kind==='flag'?1000:reward.kind==='big'?680:540};
        companion.classList.remove('reward-small','reward-big','reward-flag');
        companion.classList.add('collecting','reward-'+reward.kind);
        companion.classList.toggle('celebrating',reward.kind!=='small');
        $('combo').textContent=reward.kind==='flag'?'新里程碑！':reward.kind==='big'?'大金币入袋！':'又一枚！';
      }
    }
  }
  if(previous?.quiet&&!state.quiet)distance=progress.distance;
  updateStatus(now);
}
function seedFor(index){
  let n=(index+104729)|0;n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return (n^(n>>>16))>>>0;
}
function drawRoute(now,active){
  const start=Math.floor(distance/48)-1;
  if(start!==tileStart){
    tileStart=start;landscape.replaceChildren();
    for(let index=start;index<start+8;index++){
      const seed=seedFor(index),tile=document.createElement('span');
      tile.className='route-tile terrain-'+seed%4;tile.dataset.world=String(index);
      tile.style.left=((index-start)*48)+'px';
      const prop=document.createElement('i');
      const kind=index%11===0?'sign':index%5===0?'stone':seed%3===0?'flower':'grass';
      prop.className=kind;prop.dataset.kind=kind;tile.append(prop);landscape.append(tile);
    }
  }
  landscape.style.transform='translateX('+(-(distance-start*48))+'px)';
  companion.dataset.distance=distance.toFixed(2);
  if(active&&!bite&&!gesture&&now-lastEncounterAt>4500){
    for(const tile of landscape.children){
      const world=Number(tile.dataset.world),x=world*48+24-distance;
      if(x>=82&&x<=104&&lastEncounter!==world){
        const kind=tile.firstElementChild.dataset.kind;
        if(kind==='grass')continue;
        lastEncounter=world;lastEncounterAt=now;
        interact(kind==='stone'?'hop':kind,now);break;
      }
    }
  }
}
function setFrame(frame,moving=false){
  const key=currentSkin+':'+(moving?'motion':'original')+':'+frame;
  if(lastFrame===key)return;
  lastFrame=key;hero.dataset.frame=String(frame);hero.dataset.atlas=moving?'motion':'original';
  sprite.hidden=moving;motionPose.hidden=!moving;
  if(moving){
    const art=motionArt[currentSkin],index=frame<6?art.walk[frame]:frame===6?art.open:art.puff;
    const [x,y,w,h]=art.rects[index],scale=art.scale;
    Object.assign(motionPose.style,{left:((64-w*scale)/2)+'px',top:(63-h*scale)+'px',width:(w*scale)+'px',height:(h*scale)+'px'});
    Object.assign(motionSprite.style,{width:(1774*scale)+'px',height:(887*scale)+'px',left:(-x*scale)+'px',top:(-y*scale)+'px'});
  }else{
    sprite.style.left=(-(frame%3)*64)+'px';
    sprite.style.top=(-Math.floor(frame/3)*64)+'px';
  }
}
function drawActor(now,active,dt){
  const phase=(distance/16)%1,cycle=phase*Math.PI*2;
  const progress=coinProgress(now,active);
  const anticipating=active&&anchor?.targetKind!=='flag'&&progress>.78&&(1-progress)/Math.max(.001,anchor?.coinSpeed||0)<.32;
  let frame=0,moving=false,dx=0,dy=0,sx=1,sy=1,action='idle';
  if(bite){
    const t=(now-bite.start)/bite.duration*540;
    if(bite.kind==='flag'){frame=3;dy=-Math.sin(clamp((now-bite.start)/600)*Math.PI)*5;action='celebrate';}
    else{
      moving=true;
      if(t<280){frame=6;action=t<100?'open':'swallow';dx=1.8*Math.sin(clamp(t/360)*Math.PI);sx=1.025;sy=.985;}
      else if(t<430){frame=7;action='puff';const puff=Math.sin((t-280)/150*Math.PI);sx=1+.045*puff;sy=1-.025*puff;dy=-.6*puff;}
      else{frame=Math.floor(phase*6);action='settle';dy=-Math.sin((t-430)/110*Math.PI)*.8;}
    }
  }else if(anticipating){moving=true;frame=6;action='anticipate';}
  else if(gesture){
    frame=gesture.kind==='hop'?Math.floor(phase*6):5;moving=gesture.kind==='hop';action=gesture.kind;
    if(gesture.kind==='hop')dy=-Math.sin(Math.min(1,(now-gesture.start)/650)*Math.PI)*8;
  }else if(latest?.resting||['paused','resting'].includes(latest?.mode)){frame=4;action='rest';}
  else if(active){
    moving=true;frame=Math.floor(phase*6);action='walk';
    dy=-.65*(1-Math.cos(cycle*2));dx=.3*Math.sin(cycle);
  }
  else if(latest?.mode==='done')frame=3;
  if(motionOff()){frame=latest?.resting?4:0;moving=false;dx=dy=0;sx=sy=1;action='still';}
  const ease=motionOff()?1:1-Math.exp(-dt/45);
  for(const [key,value] of Object.entries({x:dx,y:dy,sx,sy}))actor[key]+=(value-actor[key])*ease;
  setFrame(frame,moving);hero.dataset.action=action;
  hero.style.transform=`translate(${actor.x.toFixed(2)}px,${actor.y.toFixed(2)}px) scale(${actor.sx.toFixed(3)},${actor.sy.toFixed(3)})`;
  document.querySelector('.shadow').style.transform='scaleX('+(1+actor.y*.025).toFixed(3)+')';
}
function drawCoin(now,active){
  if(frozen&&!bite)return;
  const progress=coinProgress(now,active),point=mouth();
  let kind=anchor?.targetKind||'small';
  targetScale=1;targetOpacity=smooth((now-revealAt)/150);targetY=COIN_Y;
  if(bite){
    kind=bite.kind;
    const t=(now-bite.start)/bite.duration*540;
    if(kind==='flag'){
      targetX=point.x;targetOpacity=0;
    }else if(t<100){
      const approach=smooth(t/100);
      targetX=bite.from+(point.x-bite.from)*approach;
      targetY=bite.fromY+(point.y-bite.fromY)*approach;
      targetScale=1-.4*approach;
    }else{
      const swallow=smooth((t-100)/180);
      targetX=point.x;targetY=point.y;
      targetScale=.6-.56*swallow;targetOpacity=1-smooth((swallow-.65)/.35);
    }
  }else{
    // Keep the approaching coin beside the face so the open mouth stays visible.
    // Only the verified income boundary starts the move into the mouth.
    targetX=COIN_START-progress*(COIN_START-(point.x+30));
    targetY=COIN_Y+(point.y-COIN_Y)*smooth((progress-.80)/.20);
  }
  target.dataset.kind=kind;
  target.style.transform=`translate(${(targetX-14).toFixed(2)}px,${(targetY-14).toFixed(2)}px) scale(${targetScale.toFixed(3)})`;
  target.style.opacity=String(targetOpacity);
  companion.dataset.coinX=targetX.toFixed(2);
  companion.dataset.coinProgress=progress.toFixed(3);
}
function animate(now){
  const dt=Math.min(40,lastPaint?now-lastPaint:16);lastPaint=now;
  const active=Boolean(anchor?.active&&latest&&!latest.stale&&now-lastReceived<3000&&!motionOff());
  frozen=Boolean(anchor&&(!active||motionOff()));
  if(bite&&now-bite.start>=bite.duration){
    bite=null;revealAt=now;companion.classList.remove('collecting','celebrating','reward-small','reward-big','reward-flag');
  }
  if(gesture&&now>=gesture.end){
    gesture=null;companion.classList.remove('hello','encounter','hopping');$('butterfly').classList.remove('flying');updateStatus(now);
  }
  if(active)distance=Math.max(distance,anchor.distance+Math.min(now-anchor.at,300)/1000*anchor.speed);
  drawRoute(now,active);drawActor(now,active,dt);drawCoin(now,active);
  requestAnimationFrame(animate);
}
api.onState(render);requestAnimationFrame(animate);
document.addEventListener('keydown',event=>{
  if(event.key==='ContextMenu'||(event.shiftKey&&event.key==='F10')){event.preventDefault();api.action('menu');}
});
hero.addEventListener('keydown',event=>{
  if((event.key==='Enter'||event.key===' ')&&!event.repeat){event.preventDefault();interact('hello');updateStatus(performance.now());}
});
let drag=null;
document.querySelectorAll('.drag').forEach(region=>{
  region.addEventListener('pointerdown',event=>{
    if(event.button!==0||!event.isPrimary)return;
    event.preventDefault();
    drag={id:event.pointerId,x:event.screenX,y:event.screenY,moved:false,onHero:hero.contains(event.target)};
    try{region.setPointerCapture(event.pointerId);}catch{}
    api.drag('start',event.screenX,event.screenY);
  });
  region.addEventListener('pointermove',event=>{
    if(drag?.id!==event.pointerId)return;
    if(Math.hypot(event.screenX-drag.x,event.screenY-drag.y)>4)drag.moved=true;
    if(drag.moved)api.drag('move',event.screenX,event.screenY);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])region.addEventListener(type,event=>{
    if(drag?.id!==event.pointerId)return;
    const greet=type==='pointerup'&&!drag.moved&&drag.onHero;
    drag=null;api.drag('end',0,0);
    if(greet){interact('hello');updateStatus(performance.now());}
  });
});
window.addEventListener('blur',()=>{drag=null;api.drag('end',0,0);});
reducedMotion.addEventListener('change',()=>{clearEffects();if(latest)render(latest);});
setInterval(()=>{
  if(lastReceived&&performance.now()-lastReceived>3500){
    clearEffects();if(anchor)anchor.active=false;
    companion.classList.remove('working');$('status').textContent='计时连接恢复中…';
  }
},1000);

