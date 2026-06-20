import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const bundlePath = resolve("src/snapshot/app.bundle.js");
let source = readFileSync(bundlePath, "utf8");
const original = source;

function replaceExact(search, replacement, label) {
  const count = source.split(search).length - 1;
  if (count < 1) {
    if (source.includes(replacement)) return 0;
    throw new Error(`${label}: search text not found`);
  }
  source = source.split(search).join(replacement);
  return count;
}

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

replaceExact(
  "className:`career-emblem`,style:{backgroundColor:i.auraColor}",
  "className:`career-emblem career-portrait career-${i.id.replace(/[^a-z0-9_-]/gi,``)}`,style:{backgroundColor:i.auraColor}",
  "career book portrait class",
);

replaceExact(
  "className:`career-choice-aura`,style:{backgroundColor:i?.auraColor??`#94a3b8`}",
  "className:`career-choice-aura career-portrait career-${(i?.id??e.careerId).replace(/[^a-z0-9_-]/gi,``)}`,style:{backgroundColor:i?.auraColor??`#94a3b8`}",
  "career choice portrait class",
);

replaceAnyExact(
  ["(0,P.jsx)(la,{battle:c,compact:!0})", "(0,P.jsx)(la,{battle:c,compact:!0,visual:d})"],
  "(0,P.jsx)(battleSceneLineup,{battle:c,visual:d})",
  "main battle scene enemy lineup",
);

replaceAnyExact(
  ["(0,P.jsx)(la,{battle:r}),!e.current.awaitingDecision", "(0,P.jsx)(la,{battle:r,visual:Ki(e)}),!e.current.awaitingDecision"],
  "(0,P.jsx)(la,{battle:r,visual:Ki(e)}),!e.current.awaitingDecision",
  "battle tab enemy lineup visual data",
);

replaceFunctionBefore(
  "function la({battle:e,compact:t=!1",
  "function ua(",
  "function la({battle:e,compact:t=!1,visual:n}){let r=e.enemies.find(e=>e.remainingHp>0),i=e=>{let t=n?.normalMonsterFrames??[],r=n?.examMonsterFrames??{},i=n?.normalMonsterNames??[],a=n?.examMonsterNames??{};if(e.kind===`normal`){let n=Math.max(0,(e.month??1)-1)%Math.max(1,t.length);return{frame:t[n]??0,name:i[n]??e.label}}if(e.kind===`suneung`){let n=[r.march_mock,r.june_mock,r.september_mock,r.suneung,t[0]].filter(e=>Number.isFinite(e)),i=Math.max(0,(e.month??1)-1)%Math.max(1,n.length),o=n[i]??r.suneung??r.year_boss??t[0]??0;return{frame:o,name:a.suneung??e.label}}let o=r.year_boss??r.final??r.september_mock??r.suneung??Object.values(r).at(-1)??t[0]??0;return{frame:o,name:a.year_boss??a.final??a.september_mock??a.suneung??e.label}},a=e=>Math.max(0,Math.min(Mi-1,Math.floor(e.frame??0)));return(0,P.jsx)(`div`,{className:t?`battle-enemy-grid compact`:`battle-enemy-grid`,\"aria-label\":`전투 적 체력`,children:e.enemies.map(e=>{let n=Math.max(0,Math.min(1,e.remainingHp/Math.max(1,e.maxHp))),o=e.remainingHp<=0,s=r?.id===e.id,c=i(e),l=a(c);return(0,P.jsxs)(`div`,{className:`battle-enemy-card ${e.kind} ${s?`active`:``} ${o?`defeated`:``}`,children:[(0,P.jsx)(`span`,{className:`battle-enemy-monster main-monster-${String(l).padStart(3,`0`)}`,style:{\"--monster-frame-x\":Ri(l,Mi)},title:c.name,\"aria-hidden\":`true`}),(0,P.jsxs)(`div`,{children:[(0,P.jsx)(`strong`,{children:e.label}),(0,P.jsx)(`span`,{children:e.kind===`normal`?`일반`:e.kind===`boss`?`보스`:`수능`})]}),(0,P.jsx)(`div`,{className:`enemy-hp-bar`,children:(0,P.jsx)(`i`,{style:{width:`${n*100}%`}})}),(0,P.jsx)(`small`,{children:o?`처치`:`${Math.ceil(e.remainingHp)}/${e.maxHp}`})]},e.id)})})}function battleSceneLineup({battle:e,visual:t}){let n=e.enemies.find(e=>e.remainingHp>0),r=e=>{let n=t?.normalMonsterFrames??[],r=t?.examMonsterFrames??{},i=t?.normalMonsterNames??[],a=t?.examMonsterNames??{};if(e.kind===`normal`){let t=Math.max(0,(e.month??1)-1)%Math.max(1,n.length);return{frame:n[t]??0,name:i[t]??e.label}}if(e.kind===`suneung`){let t=[r.march_mock,r.june_mock,r.september_mock,r.suneung,n[0]].filter(e=>Number.isFinite(e)),i=Math.max(0,(e.month??1)-1)%Math.max(1,t.length),o=t[i]??r.suneung??r.year_boss??n[0]??0;return{frame:o,name:a.suneung??e.label}}let o=e.month??12,s=o<=3?r.march_mock??r.march_eval:o<=6?r.june_mock??r.midterm:o<=9?r.september_mock??r.final:r.year_boss??r.suneung,c=s??r.year_boss??r.final??r.september_mock??r.suneung??Object.values(r).at(-1)??n[0]??0;return{frame:c,name:a.year_boss??a.final??a.september_mock??a.suneung??e.label}},i=e.kind===`suneung`?[[48,66,.78],[60,55,.9],[72,66,.78],[84,56,.88],[90,69,.72]]:[[38,70,.62],[47,61,.62],[56,72,.84],[64,63,.62],[72,73,.62],[80,63,.86],[43,82,.6],[52,78,.6],[62,84,.86],[72,79,.6],[81,84,.6],[88,78,.88]],a=e=>Math.max(0,Math.min(Mi-1,Math.floor(e.frame??0)));return(0,P.jsx)(`div`,{className:`battle-scene-lineup ${e.kind}`,\"aria-label\":`전투 적 편대`,children:e.enemies.map((t,o)=>{let s=r(t),c=a(s),l=t.remainingHp<=0,u=n?.id===t.id,d=i[o%i.length],f=Math.max(0,Math.min(1,t.remainingHp/Math.max(1,t.maxHp))),p=t.kind===`boss`||t.kind===`suneung`;return(0,P.jsxs)(`div`,{className:`battle-scene-enemy ${t.kind} slot-${o+1} ${u?`active`:``} ${l?`defeated`:``}`,style:{\"--monster-frame-x\":Ri(c,Mi),\"--scene-enemy-left\":`${d[0]}%`,\"--scene-enemy-top\":`${d[1]}%`,\"--scene-enemy-scale\":String(d[2]),\"--scene-enemy-z\":String(10+Math.round(d[1])),\"--scene-enemy-hp\":`${f*100}%`},title:s.name,children:[p&&(0,P.jsx)(`span`,{className:`battle-scene-hp`,\"aria-hidden\":`true`,children:(0,P.jsx)(`i`,{style:{width:`${f*100}%`}})}),(0,P.jsx)(`span`,{className:`monster-art battle-scene-monster-art main-monster-${String(c).padStart(3,`0`)}`,\"aria-hidden\":`true`})]},t.id)})})}",
  "battle enemy renderers",
);

if (source !== original) {
  writeFileSync(bundlePath, source, "utf8");
  console.log("VISUAL_ASSET_PATCH_APPLIED");
} else {
  console.log("VISUAL_ASSET_PATCH_ALREADY_CURRENT");
}
