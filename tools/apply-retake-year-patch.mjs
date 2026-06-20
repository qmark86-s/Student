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

function replaceAny(searches, replacement, label) {
  if (source.includes(replacement)) return 0;
  for (const search of searches) {
    const count = source.split(search).length - 1;
    if (count > 0) {
      source = source.split(search).join(replacement);
      return count;
    }
  }
  throw new Error(`${label}: search text not found`);
}

replaceExact(
  "if(n.id===`H3`||n.phase===`repeater`)return yr(e,t);",
  "if(n.id===`H3`)return yr(e,t);",
  "retake battle creation",
);

replaceAny(
  [
    "let r=N(e,n),i=t.kind===`suneung`||r.phase===`repeater`?n.examById.suneung:n.examById.year_boss,a=Ir(r,i.id,n)",
  ],
  "let r=N(e,n),i=t.kind===`suneung`?n.examById.suneung:n.examById.year_boss,a=Ir(r,i.id,n)",
  "retake result exam curve",
);

replaceAny(
  [
    "examName:t.kind===`suneung`||r.phase===`repeater`?`수능시험`:`${r.name} 학년 평가`",
  ],
  "examName:t.kind===`suneung`?`수능시험`:`${r.name} 학년 평가`",
  "retake result exam name",
);

replaceAny(
  [
    "),(t.kind===`suneung`||N(e,n).phase===`repeater`)?(e.current.awaitingDecision=!0,e.current.outcome=Qr(e,n,i,r),e.current.pausedAtGate=!1,e):(zr(e,n),Vr(e,n),e.current.battle=void 0,e.current.monthIndex=0,e.current.examIndex=0,e)}function Or(",
    "),t.kind===`suneung`?(e.current.awaitingDecision=!0,e.current.outcome=Qr(e,n,i,r),e.current.pausedAtGate=!1,e):(zr(e,n),Vr(e,n),e.current.battle=void 0,e.current.monthIndex=0,e.current.examIndex=0,e)}function Or(",
  ],
  "),t.kind===`suneung`?(e.current.awaitingDecision=!0,e.current.outcome=Qr(e,n,i,r),e.current.pausedAtGate=!1,e):N(e,n).phase===`repeater`?(e.current.battle=yr(e,n),e.current.waveProgressMs=0,e.current.pausedAtGate=!1,M(e,`${N(e,n).name} 1년 과정을 마치고 수능 전투에 들어갔다.`,`warn`),e):(zr(e,n),Vr(e,n),e.current.battle=void 0,e.current.monthIndex=0,e.current.examIndex=0,e)}function Or(",
  "retake completion decision",
);

if (source !== original) {
  writeFileSync(bundlePath, source, "utf8");
  console.log("RETAKE_YEAR_PATCH_APPLIED");
} else {
  console.log("RETAKE_YEAR_PATCH_ALREADY_CURRENT");
}
