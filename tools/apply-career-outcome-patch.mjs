import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const bundlePath = resolve("src/snapshot/app.bundle.js");
let source = readFileSync(bundlePath, "utf8");

function replaceBetween(startMarker, endMarker, replacement, label, fromIndex = 0) {
  const start = source.indexOf(startMarker, fromIndex);
  if (start < 0) throw new Error(`${label}: start marker not found`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`${label}: end marker not found`);
  source = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

function replaceAllExact(search, replacement, label) {
  const count = source.split(search).length - 1;
  if (count < 1) {
    if (source.includes(replacement)) return 0;
    throw new Error(`${label}: search text not found`);
  }
  source = source.split(search).join(replacement);
  return count;
}

const original = source;

const expeditionStart = source.indexOf("function wt(e,t){return`run:${e}:career:${t}`}");
if (expeditionStart < 0) throw new Error("Expedition career block marker not found");

replaceBetween(
  "function Tt(e,t,n",
  "function Dt(",
  "function Tt(e,t,n,r){let i=n.careerById[t],a=i?1+Math.max(0,4-i.tier)*.08:1,o=i?pt.reduce((e,t)=>e+(i.statWeights[t]??1),0)/pt.length:1,s=gt(),c=Math.max(.25,r??i?.powerMultiplier??1);for(let t of pt){let n=Math.log10(Math.max(0,e[t])+10)**2*2.6,l=(i?.statWeights[t]??1)/Math.max(.1,o);s[t]=Math.round(n*(.55+l*.55)*a*c*10)/10}return s}function Et(e,t,n,r=O,i=mt()){let a=wt(e.runNumber,n.careerId);return{id:`expedition-${e.runNumber}-${n.careerId}-${i}`,sourceKey:a,sourceRunNumber:e.runNumber,sourceCareerId:n.careerId,careerName:n.name,sourceUniversity:t.name,level:1,exp:0,promotionTier:`staff`,baseStats:Tt(e.current.stats,n.careerId,r,n.powerMultiplier),locked:!1,createdAt:i}}",
  "expedition power multiplier block",
  expeditionStart,
);

replaceBetween(
  "function Qr(e,t,n,r){let i=e.current.track",
  "function $r(",
  "function Qr(e,t,n,r){let i=e.current.track,a=t.universities.map(e=>{let t=n.score+Ur(e,i),r=Math.max(1,Math.round(n.rank*Wr(e,i)));return{universityId:e.id,name:e.name,gameRank:e.gameRank,adjustedScore:t,adjustedRank:r,minScore:e.minScore,minNationalRank:e.minNationalRank,prestige:e.prestige,trackBias:e.trackBias,line:e.line}}).filter(e=>e.adjustedRank<=e.minNationalRank).sort((e,t)=>e.gameRank-t.gameRank),o=a[0]?.prestige??0,s=a.length>0,c=t.careers.map((t,c)=>{let l=Zr(t,e.current.stats,e.current.aptitude,o,i,r),u=Math.max(0,o-t.minPrestige),d=s&&o>=t.minPrestige,f=t.prestigeIncomeRate??.18,p=t.prestigePowerRate??.004,m=(t.powerMultiplier??1)*(1+u*p);return{careerId:t.id,name:t.name,tier:t.tier,choiceRank:t.choiceRank??c+1,choiceBand:t.choiceBand??`기본`,minPrestige:t.minPrestige,incomePerMinute:t.baseIncomePerMinute+u*f,powerMultiplier:Math.round(m*1e3)/1e3,score:l,selectable:d,lockedReason:d?``:`명성 ${t.minPrestige} 필요`}}).sort((e,t)=>e.choiceRank-t.choiceRank||t.score-e.score),l=c.filter(e=>e.selectable).length;return{suneungScore:n.score,suneungRank:n.rank,suneungReport:Xr(e,t,n),admissions:a,careerCandidates:c,careerSelectableCount:l,forcedArchiveAvailable:e.current.retakeCount>=t.balance.maxRetakes}}",
  "career outcome ranking block",
);

replaceBetween(
  "function yi(e,t,n=O,r){let i=j(e)",
  "function bi(",
  "function yi(e,t,n=O,r){let i=j(e),a=i.current.outcome;if(!i.current.awaitingDecision||!a||a.admissions.length===0||a.careerCandidates.length===0)return i;let o=a.admissions.find(e=>e.universityId===t)??a.admissions[0],s=a.careerCandidates.find(e=>e.careerId===r&&e.selectable!==!1)??a.careerCandidates.find(e=>e.selectable!==!1);if(!s)return i;let c=jn(i,n)+1,l={id:`alumni-${i.runNumber}-${Date.now()}`,name:`${s.name} 동료`,careerId:s.careerId,careerName:s.name,age:c,status:`idle`,incomePerMinute:s.incomePerMinute,powerMultiplier:s.powerMultiplier??1,careerRank:s.choiceRank,stats:bn(i.current.stats),createdRun:i.runNumber,source:`human`,sourceUniversity:o.name};return i.companions.push(l),i.history.unshift({runNumber:i.runNumber,universityName:o.name,careerId:s.careerId,careerName:s.name,careerRank:s.choiceRank,track:i.current.track,suneungScore:a.suneungScore,age:c,createdAt:_n()}),i=Dt(i,o,s,n),M(i,`${o.name} 진학 후 ${s.name} 직업 동료가 등록되었다.`,`good`),vi(i,n)}",
  "career acceptance block",
);

replaceAllExact(
  "o=[...O.careers].sort((e,t)=>e.tier-t.tier||e.minPrestige-t.minPrestige||e.name.localeCompare(t.name,`ko-KR`))",
  "o=[...O.careers].sort((e,t)=>(e.choiceRank??999)-(t.choiceRank??999)||e.tier-t.tier||t.minPrestige-e.minPrestige||e.name.localeCompare(t.name,`ko-KR`))",
  "career book sort",
);

replaceAllExact(
  "(0,P.jsxs)(`small`,{children:[`Tier `,i.tier,` · `,va(i.preferredTrack),` · 명성 `,i.minPrestige]})",
  "(0,P.jsxs)(`small`,{children:[`#`,i.choiceRank??`-`,` · Tier `,i.tier,` · `,va(i.preferredTrack),` · 명성 `,i.minPrestige]})",
  "career book rank label",
);

replaceBetween(
  "function xa({outcome:e,universityId:t,setState:n,onAccepted:r})",
  "function Sa(",
  "function xa({outcome:e,universityId:t,setState:n,onAccepted:r}){return e.careerCandidates.length===0?(0,P.jsx)(ja,{text:`직업 선택지 없음`}):(0,P.jsx)(`div`,{className:`career-choice-list career-choice-ranked`,children:e.careerCandidates.map(e=>{let i=O.careerById[e.careerId],a=!!t&&e.selectable!==!1,o=e.choiceRank??i?.choiceRank,s=e.powerMultiplier??i?.powerMultiplier??1,c=e.minPrestige??i?.minPrestige??0;return(0,P.jsxs)(`button`,{className:a?`career-choice ranked`:`career-choice ranked locked`,type:`button`,disabled:!a,onClick:()=>{a&&(L(n,n=>yi(n,t,O,e.careerId)),r?.())},children:[(0,P.jsx)(`span`,{className:`career-choice-rank`,children:o?`#${o}`:`#-`}),(0,P.jsx)(`span`,{className:`career-choice-aura`,style:{backgroundColor:i?.auraColor??`#94a3b8`}}),(0,P.jsxs)(`span`,{className:`career-choice-main`,children:[(0,P.jsx)(`strong`,{children:e.name}),(0,P.jsxs)(`small`,{children:[e.choiceBand??`직업`, ` · Tier `,e.tier,` · 요구 `,c,` · `,fn(e.incomePerMinute),`원/분`]})]}),(0,P.jsx)(`b`,{className:`career-choice-state`,children:a?`전투 x${s.toFixed(2)}`:e.lockedReason??`잠김`})]},e.careerId)})})}",
  "career choice UI block",
);

replaceAllExact(
  "children:`3택`",
  "children:`${r.careerSelectableCount??r.careerCandidates.filter(e=>e.selectable!==!1).length}개 가능`",
  "career choice count badge",
);

if (source !== original) {
  writeFileSync(bundlePath, source, "utf8");
  console.log("CAREER_OUTCOME_PATCH_APPLIED");
} else {
  console.log("CAREER_OUTCOME_PATCH_ALREADY_CURRENT");
}
