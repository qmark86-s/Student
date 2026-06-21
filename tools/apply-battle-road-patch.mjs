import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const bundlePath = resolve("src/snapshot/app.bundle.js");
const configPath = resolve("data/battle_road_config.json");

const battleRoadConfig = JSON.parse(readFileSync(configPath, "utf8"));
let source = readFileSync(bundlePath, "utf8");
const original = source;

function replaceAnyExact(searches, replacement, label) {
  for (const search of searches) {
    const count = source.split(search).length - 1;
    if (count > 0) {
      source = source.split(search).join(replacement);
      return count;
    }
  }
  if (source.includes(replacement)) return 0;
  throw new Error(`${label}: search text not found`);
}

function replaceFunctionBefore(start, end, replacement, label) {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) {
    if (source.includes(replacement)) return 0;
    throw new Error(`${label}: function start not found`);
  }
  const endIndex = source.indexOf(end, startIndex);
  if (endIndex < 0) throw new Error(`${label}: function end not found`);
  const current = source.slice(startIndex, endIndex);
  if (current === replacement) return 0;
  source = `${source.slice(0, startIndex)}${replacement}${source.slice(endIndex)}`;
  return 1;
}

const configLiteral = JSON.stringify(battleRoadConfig);

replaceAnyExact(
  [
    "return{gradeId:`E1`,avatarGender:Math.random()<.5?`male`:`female`,retakeCount:0,monthIndex:0,",
    "return{gradeId:`E1`,avatarGender:Math.random()<.5?`male`:`female`,retakeCount:0,road:{mode:`school`,phase:`travel`,encounterIndex:0,encounterTotal:4,phaseStartedAt:0,lastCompletedEncounterId:null},monthIndex:0,",
  ],
  "return{gradeId:`E1`,avatarGender:Math.random()<.5?`male`:`female`,retakeCount:0,road:{mode:`school`,phase:`travel`,encounterIndex:0,encounterTotal:4,phaseStartedAt:0,lastCompletedEncounterId:null},monthIndex:0,",
  "initial battle road state",
);

replaceAnyExact(
  [
    "function sr(e){return{...e,avatarGender:e.avatarGender===`female`?`female`:`male`,studyLevels:e.studyLevels??Dn(),studyAllocationWeights:or(e.studyAllocationWeights),studyAllocationAdjusted:!!e.studyAllocationAdjusted,battle:e.battle&&e.battle.gradeId===e.gradeId&&!e.battle.finished?e.battle:void 0}}",
  ],
  "function sr(e){let t=e.road&&typeof e.road==`object`?e.road:{},n=t.mode??(e.battle?.kind===`suneung`?`suneung`:`school`),r=n===`suneung`?battleRoadConfig.suneung.encounters.length:battleRoadConfig.schoolYear.encounters.length,i=Number.isFinite(t.encounterIndex)?Math.floor(t.encounterIndex):Number.isFinite(e.battle?.encounterIndex)?Math.floor(e.battle.encounterIndex):0,a=Math.max(0,Math.min(Math.max(0,r-1),i)),o={mode:n,phase:t.phase??`travel`,encounterIndex:a,encounterTotal:Math.max(1,Math.floor(t.encounterTotal??r??4)),phaseStartedAt:t.phaseStartedAt??0,lastCompletedEncounterId:t.lastCompletedEncounterId??null};return{...e,avatarGender:e.avatarGender===`female`?`female`:`male`,road:o,studyLevels:e.studyLevels??Dn(),studyAllocationWeights:or(e.studyAllocationWeights),studyAllocationAdjusted:!!e.studyAllocationAdjusted,battle:e.battle&&e.battle.gradeId===e.gradeId&&!e.battle.finished?e.battle:void 0}}",
  "battle road migration",
);

replaceFunctionBefore(
  source.includes("const battleRoadConfig=") ? "const battleRoadConfig=" : "function yr(e,t){",
  "function Or(",
  `const battleRoadConfig=${configLiteral};function battleRoadTotal(e){return e===\`suneung\`?battleRoadConfig.suneung.encounters.length:battleRoadConfig.schoolYear.encounters.length}function battleRoadClamp(e,t){let n=Number.isFinite(e)?Math.floor(e):0;return Math.max(0,Math.min(Math.max(0,t-1),n))}function battleRoadCreateState(e,t=null,n=0){let r=battleRoadTotal(e);return{mode:e,phase:\`travel\`,encounterIndex:battleRoadClamp(n,r),encounterTotal:r,phaseStartedAt:_n(),lastCompletedEncounterId:t}}function battleRoadIndex(e,t){let n=battleRoadTotal(t),r=e.current.road;return r?.mode===t?battleRoadClamp(r.encounterIndex,n):0}function battleRoadMeta(e,t,n){return{roadMode:e,encounterIndex:t,encounterTotal:battleRoadTotal(e),encounterId:n.id,encounterLabel:n.label,roadTiming:battleRoadConfig.timing,roadCamera:battleRoadConfig.camera}}function battleRoadHasNext(e){return Number.isFinite(e.encounterIndex)&&e.encounterIndex+1<Math.max(1,e.encounterTotal??1)}function battleRoadAdvance(e,t,n){let r=t.roadMode??(t.kind===\`suneung\`?\`suneung\`:\`school\`),i=t.encounterIndex??0,a=battleRoadCreateState(r,t.encounterId??null,i+1);return e.current.road=a,e.current.battle=void 0,e.current.waveProgressMs=0,e.current.pausedAtGate=!1,t.kind===\`grade\`?(e.current.monthIndex=Math.min(12,t.monthRange?.[1]??(i+1)*3),e.current.examIndex=Math.max(e.current.examIndex,i+1)):(e.current.monthIndex=12,e.current.examIndex=Math.max(e.current.examIndex,i+1)),M(e,\`\${t.encounterLabel??\`조우\`} 클리어 · 다음 조우 \${a.encounterIndex+1}/\${a.encounterTotal}\`,\`good\`),e}function yr(e,t){let n=battleRoadConfig.suneung.encounters,r=battleRoadIndex(e,\`suneung\`),i=n[r]??n[0],a=(i.enemies??[]).map((n,r)=>vr(e,\`suneung-\${i.id}-\${n.id}\`,n.label,\`suneung\`,n.visualMonth??r+1,n.subjects,3.5,t));return{gradeId:e.current.gradeId,kind:\`suneung\`,...battleRoadMeta(\`suneung\`,r,i),elapsedMs:0,maxDurationMs:vn,finished:!1,enemies:a}}function br(e,t){let n=N(e,t);if(n.id===\`H3\`||e.current.road?.mode===\`suneung\`)return yr(e,t);let r=battleRoadConfig.schoolYear.encounters,i=battleRoadIndex(e,\`school\`),a=r[i]??r[0],o=[];for(let r of a.normalMonths??[]){let i=gr(r,n,t);o.push(vr(e,\`\${n.id}-\${a.id}-m\${r}\`,\`\${r}월 문제\`,\`normal\`,r,i,1,t))}let s=gr(a.bossMonth,n,t),c=vr(e,\`\${n.id}-\${a.id}-boss\`,\`\${a.bossMonth}월 보스\`,\`boss\`,a.bossMonth,s,2.8,t);return c.visualKey=a.bossKey,o.push(c),{gradeId:n.id,kind:\`grade\`,...battleRoadMeta(\`school\`,i,a),monthRange:a.monthRange,elapsedMs:0,maxDurationMs:vn,finished:!1,enemies:o}}function xr(e,t){if(e.current.battle&&e.current.battle.gradeId===e.current.gradeId&&!e.current.battle.finished)return e.current.battle;let n=br(e,t);return e.current.road=battleRoadCreateState(n.roadMode??(n.kind===\`suneung\`?\`suneung\`:\`school\`),null,n.encounterIndex??0),n}function Sr(e,t=O){let n=j(e);return n.current=cr(n.current),xr(n,t)}function Cr(e,t,n){let r=N(e,n),i=Qn(Xn(e,n),t.subjectIds,r),a=$n(e,t.subjectIds,r)*n.balance.aptitudeExamRate;return Math.max(.2,i+a)}function wr(e){return e.enemies.find(e=>e.remainingHp>0)}function Tr(e){let t=e.enemies.reduce((e,t)=>e+t.weight,0),n=e.enemies.reduce((e,t)=>{let n=1-t.remainingHp/Math.max(1,t.maxHp);return e+t.weight*Tn(n,0,1)},0),r=e.enemies.filter(e=>e.remainingHp<=0).length;return{totalWeight:t,earnedWeight:n,defeatedCount:r,allCleared:r===e.enemies.length,completionRatio:Tn(n/Math.max(1,t),0,1)}}function Er(e,t,n){let r=N(e,n),i=t.kind===\`suneung\`?n.examById.suneung:n.examById.year_boss,a=Ir(r,i.id,n),o=Tr(t),s=o.allCleared?Tn(1-t.elapsedMs/Math.max(1,t.maxDurationMs),0,1):0,c=Tn(-3.2+o.completionRatio*4.4+s*1.6,n.balance.rankIndexFloor,n.balance.rankIndexCeiling),l=Lr(c/Math.max(.1,a.gradePressure)),u=Tn(Math.round(1+(1-l)*(n.balance.rankPopulation-1)),1,n.balance.rankPopulation),d=Tn(a.expectedScore+c*a.scoreSpread,0,1e3),f=t.enemies.reduce((e,t)=>e+(t.rewardClaimed?t.studyPointReward:0),0);return{gradeId:r.id,retakeCount:e.current.retakeCount,month:12,examId:i.id,examName:t.kind===\`suneung\`?\`수능시험\`:\`\${r.name} 학년 평가\`,score:d,rank:u,rankIndex:c,powerIndex:o.completionRatio,competitionIndex:s,miracleTriggered:!1,luckDelta:0,studyPointReward:f,createdAt:_n()}}function Dr(e,t,n,r){t.finished=!0,t.elapsedMs=Math.min(t.elapsedMs,t.maxDurationMs);let i=Tr(t);if(e.current.lastWaveKills=i.defeatedCount,e.current.totalKills+=e.current.lastWaveKills,battleRoadHasNext(t))return battleRoadAdvance(e,t,n);e.current.battle=t;let a=Er(e,t,n);return e.current.examResults.push(a),e.current.monthIndex=12,e.current.examIndex=Math.max(e.current.examIndex,N(e,n).examIds.length),M(e,\`\${a.examName}: \${Math.round(a.score)}점, \${a.rank}등, 처치 \${e.current.lastWaveKills}/\${t.enemies.length}\`,a.rank<=30?\`good\`:\`info\`),t.kind===\`suneung\`?(e.current.awaitingDecision=!0,e.current.outcome=Qr(e,n,a,r),e.current.pausedAtGate=!1,e):N(e,n).phase===\`repeater\`?(e.current.road=battleRoadCreateState(\`suneung\`,null,0),e.current.battle=yr(e,n),e.current.waveProgressMs=0,e.current.pausedAtGate=!1,M(e,\`\${N(e,n).name} 1년 과정을 마치고 수능 첫 조우에 들어갔다.\`,\`warn\`),e):(zr(e,n),Vr(e,n),e.current.battle=void 0,e.current.monthIndex=0,e.current.examIndex=0,e)}`,
  "battle road runtime",
);

replaceAnyExact(
  [
    "e.current.battle=void 0,e.current.stats=En(r,t)",
    "e.current.battle=void 0,e.current.road=battleRoadCreateState(r.id===`H3`?`suneung`:`school`,null,0),e.current.stats=En(r,t)",
  ],
  "e.current.battle=void 0,e.current.road=battleRoadCreateState(r.id===`H3`?`suneung`:`school`,null,0),e.current.stats=En(r,t)",
  "grade advance road reset",
);

replaceAnyExact(
  [
    "e.current.battle=void 0,e.current.trackLocked=!0",
    "e.current.battle=void 0,e.current.road=battleRoadCreateState(`school`,null,0),e.current.trackLocked=!0",
  ],
  "e.current.battle=void 0,e.current.road=battleRoadCreateState(`school`,null,0),e.current.trackLocked=!0",
  "retake road reset",
);

replaceAnyExact(
  [
    "y={\"--student-scale\":_.toFixed(3)},x=l?.kind===`boss`||l?.kind===`suneung`,S=c.kind===`suneung`?`suneung`:`term`,",
    "y={\"--student-scale\":_.toFixed(3)},xe=c.roadTiming??battleRoadConfig.timing,be=c.elapsedMs<xe.travelMs?`travel`:c.elapsedMs<xe.travelMs+xe.approachMs?`approach`:`combat`,x=l?.kind===`boss`||l?.kind===`suneung`,S=c.kind===`suneung`?`suneung`:`term`,",
  ],
  "y={\"--student-scale\":_.toFixed(3)},xe=c.roadTiming??battleRoadConfig.timing,be=c.elapsedMs<xe.travelMs?`travel`:c.elapsedMs<xe.travelMs+xe.approachMs?`approach`:`combat`,x=l?.kind===`boss`||l?.kind===`suneung`,S=c.kind===`suneung`?`suneung`:`term`,",
  "battle road phase variables",
);

replaceAnyExact(
  [
    "te=e.current.awaitingDecision?`결과 대기`:c.kind===`suneung`?`수능 전투`:l?.kind===`boss`?`중간보스`:`학년 전투`,",
    "te=e.current.awaitingDecision?`결과 대기`:c.kind===`suneung`?`${c.encounterLabel??`수능`} 조우`:l?.kind===`boss`?`분기 보스`:`3개월 조우`,",
  ],
  "te=e.current.awaitingDecision?`결과 대기`:c.kind===`suneung`?`${c.encounterLabel??`수능`} 조우`:l?.kind===`boss`?`분기 보스`:`3개월 조우`,",
  "battle road encounter label",
);

replaceAnyExact(
  [
    "(0,P.jsx)(`strong`,{children:c.kind===`suneung`?`수능 5과목`:`${s.name} · 12개월 전투`})",
    "(0,P.jsx)(`strong`,{children:c.kind===`suneung`?`수능 ${((c.encounterIndex??0)+1)}/${c.encounterTotal??4} · ${c.encounterLabel??`영역`}`:`${s.name} · 3개월 조우 ${((c.encounterIndex??0)+1)}/${c.encounterTotal??4}`})",
  ],
  "(0,P.jsx)(`strong`,{children:c.kind===`suneung`?`수능 ${((c.encounterIndex??0)+1)}/${c.encounterTotal??4} · ${c.encounterLabel??`영역`}`:`${s.name} · 3개월 조우 ${((c.encounterIndex??0)+1)}/${c.encounterTotal??4}`})",
  "battle road hud copy",
);

replaceAnyExact(
  [
    "className:`stage-scene ${u.sceneClass} visual-year-${g}`",
    "className:`stage-scene ${u.sceneClass} visual-year-${g} road-${be}`",
  ],
  "className:`stage-scene ${u.sceneClass} visual-year-${g} road-${be}`",
  "battle road stage class",
);

replaceAnyExact(
  [
    "className:`pixel-arena ${S===`suneung`&&x?`suneung-arena`:``}`",
    "className:`pixel-arena road-${be} ${S===`suneung`&&x?`suneung-arena`:``}`",
  ],
  "className:`pixel-arena road-${be} ${S===`suneung`&&x?`suneung-arena`:``}`",
  "battle road arena class",
);

replaceFunctionBefore(
  "function la({battle:e,compact:t=!1",
  "function ua(",
  "function la({battle:e,compact:t=!1,visual:n}){let r=e.enemies.find(e=>e.remainingHp>0),i=e=>{let t=n?.normalMonsterFrames??[],r=n?.examMonsterFrames??{},i=n?.normalMonsterNames??[],a=n?.examMonsterNames??{};if(e.kind===`normal`){let n=Math.max(0,(e.month??1)-1)%Math.max(1,t.length);return{frame:t[n]??0,name:i[n]??e.label}}if(e.kind===`suneung`){let n=[r.march_mock,r.june_mock,r.september_mock,r.suneung,t[0]].filter(e=>Number.isFinite(e)),i=Math.max(0,(e.month??1)-1)%Math.max(1,n.length),o=n[i]??r.suneung??r.year_boss??t[0]??0;return{frame:o,name:a.suneung??e.label}}let o=e.visualKey&&Number.isFinite(r[e.visualKey])?r[e.visualKey]:r.year_boss??r.final??r.september_mock??r.suneung??Object.values(r).at(-1)??t[0]??0;return{frame:o,name:a[e.visualKey]??a.year_boss??a.final??a.september_mock??a.suneung??e.label}},a=e=>Math.max(0,Math.min(Mi-1,Math.floor(e.frame??0)));return(0,P.jsx)(`div`,{className:t?`battle-enemy-grid compact`:`battle-enemy-grid`,\"aria-label\":`전투 적 체력`,children:e.enemies.map(e=>{let n=Math.max(0,Math.min(1,e.remainingHp/Math.max(1,e.maxHp))),o=e.remainingHp<=0,s=r?.id===e.id,c=i(e),l=a(c);return(0,P.jsxs)(`div`,{className:`battle-enemy-card ${e.kind} ${s?`active`:``} ${o?`defeated`:``}`,children:[(0,P.jsx)(`span`,{className:`battle-enemy-monster main-monster-${String(l).padStart(3,`0`)}`,style:{\"--monster-frame-x\":Ri(l,Mi)},title:c.name,\"aria-hidden\":`true`}),(0,P.jsxs)(`div`,{children:[(0,P.jsx)(`strong`,{children:e.label}),(0,P.jsx)(`span`,{children:e.kind===`normal`?`일반`:e.kind===`boss`?`보스`:`수능`})]}),(0,P.jsx)(`div`,{className:`enemy-hp-bar`,children:(0,P.jsx)(`i`,{style:{width:`${n*100}%`}})}),(0,P.jsx)(`small`,{children:o?`처치`:`${Math.ceil(e.remainingHp)}/${e.maxHp}`})]},e.id)})})}function battleSceneLineup({battle:e,visual:t}){let n=e.enemies.find(e=>e.remainingHp>0),r=e=>{let n=t?.normalMonsterFrames??[],r=t?.examMonsterFrames??{},i=t?.normalMonsterNames??[],a=t?.examMonsterNames??{};if(e.kind===`normal`){let t=Math.max(0,(e.month??1)-1)%Math.max(1,n.length);return{frame:n[t]??0,name:i[t]??e.label}}if(e.kind===`suneung`){let t=[r.march_mock,r.june_mock,r.september_mock,r.suneung,n[0]].filter(e=>Number.isFinite(e)),i=Math.max(0,(e.month??1)-1)%Math.max(1,t.length),o=t[i]??r.suneung??r.year_boss??n[0]??0;return{frame:o,name:a.suneung??e.label}}let o=e.visualKey&&Number.isFinite(r[e.visualKey])?r[e.visualKey]:(e.month??12)<=3?r.march_mock??r.march_eval:(e.month??12)<=6?r.june_mock??r.midterm:(e.month??12)<=9?r.september_mock??r.final:r.year_boss??r.suneung,c=o??r.year_boss??r.final??r.september_mock??r.suneung??Object.values(r).at(-1)??n[0]??0;return{frame:c,name:a[e.visualKey]??a.year_boss??a.final??a.september_mock??a.suneung??e.label}},i=e.roadTiming??battleRoadConfig.timing,a=e.roadCamera??battleRoadConfig.camera,o=i.travelMs??2600,s=i.approachMs??850,c=e.elapsedMs<o?`travel`:e.elapsedMs<o+s?`approach`:`combat`,l=e.kind===`suneung`?(e.enemies.length>1?(battleRoadConfig.presentation?.enemySlots?.suneungPair??[[68,74,.95],[82,80,.9]]):(battleRoadConfig.presentation?.enemySlots?.suneungSingle??[[76,76,1]])):(battleRoadConfig.presentation?.enemySlots?.school??[[60,80,1],[73,76,1.08],[85,80,1]]),u=e=>Math.max(0,Math.min(Mi-1,Math.floor(e.frame??0)));return(0,P.jsx)(`div`,{className:`battle-scene-lineup battle-road-lineup ${e.kind} road-${c} encounter-${(e.encounterIndex??0)+1}`,\"data-road-phase\":c,\"data-encounter-index\":e.encounterIndex??0,\"aria-label\":`전투 적 편대`,style:{\"--road-travel-ms\":`${o}ms`,\"--road-approach-ms\":`${s}ms`,\"--road-parallax-px\":`${a.parallaxDistancePx??180}px`,\"--road-enemy-spawn\":`${a.enemySpawnX??118}%`,\"--road-enemy-meet\":`${a.enemyMeetX??72}%`},children:e.enemies.map((t,i)=>{let a=r(t),o=u(a),s=t.remainingHp<=0,d=n?.id===t.id,f=l[i%l.length],p=Math.max(0,Math.min(1,t.remainingHp/Math.max(1,t.maxHp))),m=t.kind===`boss`||t.kind===`suneung`;return(0,P.jsxs)(`div`,{className:`battle-scene-enemy ${t.kind} slot-${i+1} ${d?`active`:``} ${s?`defeated`:``}`,style:{\"--monster-frame-x\":Ri(o,Mi),\"--scene-enemy-left\":`${f[0]}%`,\"--scene-enemy-top\":`${f[1]}%`,\"--scene-enemy-scale\":String(f[2]),\"--scene-enemy-z\":String(10+Math.round(f[1])),\"--scene-enemy-hp\":`${p*100}%`},title:a.name,children:[m&&(0,P.jsx)(`span`,{className:`battle-scene-hp`,\"aria-hidden\":`true`,children:(0,P.jsx)(`i`,{style:{width:`${p*100}%`}})}),(0,P.jsx)(`span`,{className:`monster-art battle-scene-monster-art main-monster-${String(o).padStart(3,`0`)}`,\"aria-hidden\":`true`})]},t.id)})})}",
  "battle road enemy renderers",
);

if (source !== original) {
  writeFileSync(bundlePath, source, "utf8");
  console.log("BATTLE_ROAD_PATCH_APPLIED");
} else {
  console.log("BATTLE_ROAD_PATCH_ALREADY_CURRENT");
}
