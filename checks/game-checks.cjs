const fs=require('fs'),vm=require('vm'),assert=require('assert');
const path=require('path').join(__dirname,'..','index.html');
const html=fs.readFileSync(path,'utf8');const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
for(const script of scripts)if(script.trim())new vm.Script(script);
const ctx={module:{exports:{}},console};vm.createContext(ctx);vm.runInContext(scripts.find(s=>s.includes('root.CubeGame=api')),ctx);
const {Game,LEVELS,FACES}=ctx.module.exports;
function game(level){const g=new Game(Math.random,{waitForStart:false});g.size=6;g.level=level;g.live=FACES.map(()=>true);g.boards=Array.from({length:6},()=>[]);g.tiles=Array.from({length:6},(_,f)=>Array(36).fill(f));g.active={type:'SINGLE',cells:[[0,0]],rotation:0,roll:0,upright:false,x:2,z:2,height:5};return g;}
function count(g){return g.boards.flat().filter(Boolean).length;}
for(let level=11;level<=15;level++){
 const g=game(level);
 for(let f=0;f<6;f++){
  const [w,d]=g.faceDimensions(f);assert.equal(d,f<2?6:LEVELS[level-1].body);
  for(let x=0;x<w;x++)for(let z=0;z<d;z++)assert(g.floorLevel(f,x,z)>=0);
  // Every possible cube orientation has a fitting spawn and exact coordinate mapping.
  for(let k=0;k<4;k++){g.rotateCube('z',1);g.tick(.6);g.rotateCube('x',1);g.tick(.6);g.spawn();assert(g.targets().every(t=>g.validCell(t.face,t.x,t.z)),`spawn bounds ${level}`);assert(g.canLand(),`landing ${level}`);}
 }
 g.active={type:'SINGLE',cells:[[0,0]],rotation:0,roll:0,upright:false,x:2,z:1,height:5};g.fitActive();const before=count(g);assert(g.land());assert.equal(count(g),before+(level===15?2:1));
}
// Ground support and settling, full physical-height rows, eight layers above terrain.
for(const level of [11,12,13,14,15]){
 const g=game(level),floor=g.floorLevel(0,2,2);assert.equal(g.landingLevel(),floor);
 g.boards[0][g.index(2,2,floor+4)]='I';g.settle(0);assert.equal(g.boards[0][g.index(2,2,floor)],'I');
 g.boards=Array.from({length:6},()=>[]);for(let x=0;x<6;x++)g.boards[0][g.index(x,0,4)]='I';assert.equal(g.findLines(0).lines,1);
 g.boards=Array.from({length:6},()=>[]);for(let y=0;y<8;y++)g.boards[0][g.index(2,2,floor+y)]='I';assert(g.wouldOverflow());
}
// Remapping shortened faces and terrain twists may pack columns but never erase blocks.
for(let level=11;level<=15;level++){
 const g=game(level);for(let f=0;f<6;f++){const [w,d]=g.faceDimensions(f);for(let z=0;z<d;z++)for(let x=0;x<w;x++)if((x+z)%2===0)g.boards[f][g.index(x,z,g.floorLevel(f,x,z))]='L';}
 const before=count(g);const twist=g.describeTwist({face:0,layer:2,row:2,alongX:true});g.applyTwist(twist);assert.equal(count(g),before);for(let f=0;f<6;f++){g.settle(f);g.boards[f].forEach((v,i)=>{if(v){assert(g.validCell(f,i%6,Math.floor(i/6)%6));assert(Math.floor(i/36)>=g.floorLevel(f,i%6,Math.floor(i/6)%6));}});}assert.equal(count(g),before);
}
for(let level=10;level<15;level++){
 const g=game(level);for(let f=0;f<6;f++){const [w,d]=g.faceDimensions(f);for(let z=0;z<d;z++)for(let x=0;x<w;x++)if((x+z)%3===0)g.boards[f][g.index(x,z,g.floorLevel(f,x,z))]='O';}
 const before=count(g);g.score=LEVELS[level].score;g.growIfReady();assert.equal(g.level,level+1);assert.equal(count(g),before);
}
// Power effects respect raised/recessed ground, never alter it.
for(const level of [11,14,15]){const g=game(level);g.inventory.bloom=1;g.usePowerUp('bloom');g.activatePowerUp();for(let f=0;f<6;f++)g.boards[f].forEach((v,i)=>{if(v)assert(Math.floor(i/36)>=g.floorLevel(f,i%6,Math.floor(i/6)%6));});}
const g=game(15);g.playerCount=2;g.land();assert.equal(g.turnMoves,1);assert.equal(g.placed,1);
console.log('PASS: all scripts parse; terrain 11–15, rectangular-face rotations, landing, clears, settling, stack limit, transitions, twists, Bloom, echo and multiplayer accounting');
// Regression: original onboarding, growth thresholds, manual drop, scoring and handoffs.
const intro=new Game(()=>.3);assert.equal(intro.active.type,'SINGLE');intro.spawn();assert.equal(intro.active.type,'DOUBLE');intro.spawn();assert.equal(intro.active.type,'TRIPLE');
const scoreGame=new Game();scoreGame.awardClear(2,1);scoreGame.awardClear(2,2);assert.equal(scoreGame.score,70);assert.equal(scoreGame.inventory.bloom,0); // Repository policy: Bloom starts on the second chain event.
const manual=game(10);manual.active.height=3;manual.tick(1);assert.equal(manual.active.height,3);manual.softDrop=true;manual.tick(1);assert(manual.active.height<3);
const waiting=new Game(Math.random,{waitForStart:true});const h=waiting.active.height;waiting.tick(10);assert.equal(waiting.active.height,h);waiting.beginPlay();waiting.tick(1);assert(waiting.active.height<h);
// A complete row on each echo face scores both, but consumes only one move.
const echo=game(15);echo.active.x=5;echo.active.z=0;echo.playerCount=2;
for(let x=0;x<5;x++){echo.boards[0][echo.index(x,0,2)]='I';echo.boards[4][echo.index(x,5,2)]='I';}
assert(echo.land());assert.equal(echo.resolution.lines,2);assert.equal(echo.turnMoves,1);echo.tick(.4);assert.equal(echo.score,20);
console.log('PASS: onboarding, original score arithmetic, manual drop, first-piece pause and simultaneous echo clears');
// Island chapters: start geometry, zero rewards, real-point progression and restarts.
for(const entry of [1,4,7,10,13]){
 const chapter=new Game(Math.random,{waitForStart:true});chapter.startLevel=entry;chapter.reset();
 assert.equal(chapter.level,entry);assert.equal(chapter.score,0);assert.equal(chapter.playerScores[0],0);assert.equal(chapter.inventory.bomb,0);assert.equal(chapter.inventory.bloom,0);assert.equal(count(chapter),0);assert(chapter.canLand());assert(chapter.awaitingStart);
 assert.equal(chapter.size,LEVELS[entry-1].size);
 assert.equal(chapter.activeFaces().length,entry===1?1:entry===7?3:6);
 const needed=LEVELS[entry].score-LEVELS[entry-1].score;
 chapter.score=needed-1;chapter.growIfReady();assert.equal(chapter.level,entry);
 chapter.score=needed;chapter.growIfReady();assert.equal(chapter.level,entry+1);assert.equal(chapter.score,needed);
 chapter.reset();assert.equal(chapter.level,entry);assert.equal(chapter.score,0);
}
const invalid=new Game();invalid.startLevel=16;invalid.reset();assert.equal(invalid.level,1);
console.log('PASS: five chapter starts, correct geometry, empty boards, zero skipped rewards, chapter-relative thresholds and restart behavior');
const alohaScript=scripts.find(s=>s.includes('const TrillionAloha='));
vm.runInContext(alohaScript+';globalThis.alohaTest=TrillionAloha;',ctx);
const savedIsland=ctx.alohaTest.sanitize({inv:{expand_5:1,expand_6:1,island:2},islands:[],coins:17,expandedSizes:[5,6],earnedMax:100});
assert.equal(savedIsland.inv.expand_5,1);assert.equal(savedIsland.inv.expand_6,1);assert.equal(savedIsland.coins,17);assert.equal(savedIsland.expandedSizes.join(','),'5,6');
const chapterCountBody=alohaScript.match(/function chapterCount\(\)\{([\s\S]*?)\n      \}/)[1];
const countChapters=new Function('inv',chapterCountBody);
assert.equal(countChapters({}),1);assert.equal(countChapters(savedIsland.inv),3);assert.equal(countChapters({expand_8:1}),5);assert.equal(countChapters({expand_9:1}),5);
console.log('PASS: save sanitization retains chapter purchases, coins and pending island sizes; legacy islands retain access');
const musicScript=scripts.find(s=>s.includes('class AmbientMusic'));
const soundCtx={module:{exports:{}}};vm.createContext(soundCtx);vm.runInContext(musicScript,soundCtx);
const {AwardQueue,AmbientMusic}=soundCtx.module.exports;
const notices=new AwardQueue(),pending=[{id:'palm'},{id:'fire'},{id:'parrot'}];
assert.equal(notices.update(pending,0).id,'palm');
for(let i=0;i<1000;i++)notices.update(pending,.1,false);assert.equal(notices.elapsed,0);
for(let i=0;i<60;i++)notices.update(pending,.1);assert.equal(notices.current.id,'palm');
const seen=['palm'];for(let i=0;i<450;i++){const next=notices.update(pending,.1);if(next)seen.push(next.id);}
assert.equal(seen.join(','),'palm,fire,parrot');assert.equal(pending.length,0);
// One strike has five simultaneous singing-bowl partials; mute and zero volume suppress it.
const nodes=[];const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
const bell=new AmbientMusic();bell.input={};bell.context={state:'running',currentTime:2,createGain:()=>({gain:param(),connect(){},disconnect(){}}),createOscillator:()=>{const n={frequency:param(),connect(){},disconnect(){},start(t){this.at=t},stop(t){this.end=t}};nodes.push(n);return n;}};
bell.awardChime();assert.equal(nodes.length,5);assert(nodes.every(n=>n.at===2.012&&n.end>n.at));
bell.enabled=false;bell.awardChime();assert.equal(nodes.length,5);bell.enabled=true;bell.volume=0;bell.awardChime();assert.equal(nodes.length,5);
console.log('PASS: every queued item displays once, repository seven-second reading time, hidden-time pause, single bell strike, and mute/volume behavior');

// Opening builds a plane, then a corner, then a cube, without losing placed blocks.
const opening=new Game(()=>.4);assert.equal(opening.activeFaces().length,1);
opening.boards[0][opening.index(0,0,0)]='SINGLE';
for(const [score,size,faces] of [[30,4,3],[60,5,6]]){
 opening.score=score;opening.spawn();assert.equal(opening.size,size);
 let ticks=0;while(opening.growth&&ticks++<200)opening.tick(.05);
 assert(ticks<200);assert.equal(opening.activeFaces().length,faces);assert.equal(count(opening),1);assert(opening.canLand());
}
const cubeStart=new Game();cubeStart.startLevel=3;cubeStart.reset();assert.equal(cubeStart.score,0);assert.equal(cubeStart.level,3);assert.equal(cubeStart.size,5);assert.equal(cubeStart.activeFaces().length,6);assert.equal(count(cubeStart),0);assert.equal(cubeStart.progressionScore,60);
const sandbox=new Game(Math.random,{progression:false,size:6});assert.equal(sandbox.activeFaces().length,6);
for(const level of [1,11,12,13,14,15]){
 const cue=level===1?new Game():game(level);
 for(const face of cue.activeFaces()){
  const [w,d]=cue.faceDimensions(face);
  for(let z=0;z<d;z++)for(let x=0;x<w;x++){
   const floor=cue.floorLevel(face,x,z);assert.equal(cue.limitLayer(face,x,z),floor+8);
   cue.boards[face][cue.index(x,z,floor+5)]='I';assert.equal(cue.stackHeight(face,x,z),6);
   cue.boards[face][cue.index(x,z,floor+6)]='I';assert.equal(cue.stackHeight(face,x,z),7);
  }
 }
}
console.log('PASS: plane/corner/cube progression, block conservation, free cube entry, sandbox faces and terrain-relative warning heights');
// Rendering smoke checks use the real guide function and camera-fit calculation, with a recording canvas.
const guideSource=html.match(/  function drawPlayGuides\(time,width,height,dpr\)\{[\s\S]*?\n  \}\n  function render/)[0].replace(/\n  function render$/,'');
const cameraSource=html.match(/  function fitPlayCamera\(geometry,width,height,pitch,yaw\)\{[\s\S]*?\n  \}/)[0];
function geometryFor(view){
 const data=[];const add=p=>data.push(...p,0,1,0,1,1,1);
 for(const face of view.activeFaces()){
  const [w,d]=view.faceDimensions(face);
  for(let z=0;z<d;z++)for(let x=0;x<w;x++)for(const [dx,dz] of [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]])add(view.surfacePoint(face,x+dx,z+dz,view.floorLevel(face,x,z)));
 }
 for(const x of [-.33,.33])for(const z of [-.33,.33])for(const y of [4,4.67])add([x,y,z]);
 return data;
}
for(const level of [1,3,11,14,15])for(const [width,height] of [[1200,500],[390,320],[390,410]])for(const yaw of [-1.43,-.48,.47])for(const pitch of [.25,.62,1.35])for(const touch of [false,true]){
 const view=level===1?new Game():game(level);if(level===3){view.size=5;view.boards=FACES.map(()=>[]);view.tiles=FACES.map((_,f)=>Array(25).fill(f));}
 const labels=[],coords=[],dashes=[];let strokes=0;
 const guideCtx=new Proxy({stroke:()=>strokes++,setLineDash:a=>dashes.push(a),fillText:(k,x,y)=>{labels.push(k);coords.push([x,y]);},moveTo:(x,y)=>coords.push([x,y]),lineTo:(x,y)=>coords.push([x,y]),arc:(x,y)=>coords.push([x,y])},{get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
 const c={game:view,geometry:geometryFor(view),guideCanvas:{width,height,style:{}},canvas:{getBoundingClientRect:()=>({left:0,top:115,width,height})},guideCtx,TOUCH_UI:touch,reducedMotion:{matches:true},viewPitch:pitch,viewYaw:yaw,width,height,dpr:1,CELL:view.cell,transform:ctx.module.exports.transform};
 vm.createContext(c);vm.runInContext(cameraSource+'\nconst framing=fitPlayCamera(geometry,width,height,viewPitch,viewYaw);cameraDistance=framing.distance;cameraFocus=framing.focus;'+guideSource+'\ndrawPlayGuides(0,width,height,1);',c);
 assert.equal(labels.sort().join(''),touch?['↑','↓','←','→'].sort().join(''):'ADSW');assert(coords.every(p=>p.every(Number.isFinite)));
 assert(dashes.every(a=>a.length===0),'no dotted warning geometry');
 const baseline=strokes,floor=view.floorLevel(0,0,0);
 view.boards[0][view.index(0,0,floor+4)]='I';vm.runInContext('drawPlayGuides(0,width,height,1)',c);assert.equal(strokes,baseline*2,'five layers show no warning');
 view.boards[0][view.index(0,0,floor+5)]='I';vm.runInContext('drawPlayGuides(0,width,height,1)',c);assert.equal(strokes,baseline*3+4,'six layers add only four cap edges');
 if(level===1&&pitch===.62&&yaw===-.48)assert(c.cameraDistance<8.5,'opening stays close instead of zooming to a height limit');
}
console.log('PASS: camera frames visible geometry; no permanent rim; warnings appear only at six layers; desktop and touch markers render');
// Exercise the repository tutorial controller against the merged plane rules.
const uiScript=scripts.find(s=>s.includes('const GUIDE_EVERY_TIME='));
const tutorialCode=uiScript.slice(uiScript.indexOf('  const guide=(()=>{'),uiScript.indexOf('  function startGame(',uiScript.indexOf('  const guide=(()=>{')));
for(const touch of [false,true]){
 const tutorGame=new Game(()=>.3),elements=new Map();
 const element=()=>({hidden:false,textContent:'',querySelector(){return element();},addEventListener(){}});
 const tc={game:tutorGame,document:{body:{classList:{add(){},remove(){}}},querySelector:s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s);}},window:{addEventListener(){}},localStorage:{getItem(){return null},setItem(){}},canvas:{focus(){}},onTitle:false,TOUCH_UI:touch,GUIDE_EVERY_TIME:true,GUIDE_KEY:'test'};
 vm.createContext(tc);vm.runInContext(tutorialCode+'\nglobalThis.tutor=guide;',tc);tc.tutor.begin();assert(tc.tutor.active);
 tutorGame.active.x=0;tutorGame.active.z=2;tutorGame.active.height=0;assert(tutorGame.land());assert.equal(tc.tutor.i,1);
 tutorGame.rotateCube('y',-1);tutorGame.tick(.6);tc.tutor.update();assert.equal(tc.tutor.i,2);assert.equal(tutorGame.activeFaces().length,1);
 tutorGame.active.rotation=1;tutorGame.active.x=0;tutorGame.active.z=1;tutorGame.active.height=0;assert(tutorGame.land());assert.equal(tc.tutor.i,3);
 for(let t=0;t<100&&tutorGame.resolution;t++)tutorGame.tick(.05);assert.equal(tutorGame.score,10);
 tutorGame.rotateCube('y',-1);tutorGame.tick(.6);tc.tutor.update();assert.equal(tc.tutor.i,4);
 tutorGame.active.rotation=0;tutorGame.active.x=0;tutorGame.active.z=1;tutorGame.active.height=0;assert(tutorGame.land());assert(!tc.tutor.active);assert(!tutorGame.guideHold);
 for(let t=0;t<100&&tutorGame.resolution;t++)tutorGame.tick(.05);assert.equal(tutorGame.score,20);
}
console.log('PASS: desktop and touch tutorial completes on a plane, with two legal spins and two scoring placements');
