import { buildSnapshot } from "./snapshot-build.mjs";

const report = await buildSnapshot();
console.log(`BUILD_WEB_OK outputs=${report.outputs.join(",")} bytes=${report.bytes} sha256=${report.sha256}`);
