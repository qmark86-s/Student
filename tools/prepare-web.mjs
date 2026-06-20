import { buildSnapshot } from "./snapshot-build.mjs";

const report = await buildSnapshot({ distOnly: true });
console.log(`BUILD_WEB_OK dist/index.html bytes=${report.bytes} sha256=${report.sha256}`);
