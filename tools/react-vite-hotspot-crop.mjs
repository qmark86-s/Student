import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { chromium } from "@playwright/test";

const reportPath = resolve(process.env.REACT_HOTSPOT_REPORT || "artifacts/react-vite-interactive-parity/report.json");
const label = process.env.REACT_HOTSPOT_LABEL || "student-도감";
const region = process.env.REACT_HOTSPOT_REGION || "activePanel";
const hotspotIndex = Number(process.env.REACT_HOTSPOT_INDEX || 0);
const padding = Number(process.env.REACT_HOTSPOT_PADDING || 16);
const pixelThreshold = Number(process.env.REACT_HOTSPOT_PIXEL_THRESHOLD || 8);
const outDir = resolve(process.env.REACT_HOTSPOT_OUT_DIR || "artifacts/react-vite-hotspot-crops");

if (!existsSync(reportPath)) {
  console.error(`report not found: ${reportPath}`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const result = report.results.find((item) => item.label === label);
if (!result) {
  console.error(`label not found in report: ${label}`);
  process.exit(1);
}

const visualRegion = result.visualRegions?.[region];
const hotspot = visualRegion?.hotspots?.[hotspotIndex];
const snapshotRect = result.snapshot?.rects?.[region];
const reactRect = result.react?.rects?.[region];
if (!hotspot || !snapshotRect || !reactRect) {
  console.error(`missing hotspot or rects. Rerun npm run react:interactive-parity after the latest audit script.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const safeLabel = label.replace(/[^a-zA-Z0-9가-힣_-]/g, "-");
const prefix = `${safeLabel}-${region}-hotspot-${hotspotIndex}`;
const snapshotOutput = resolve(outDir, `${prefix}-snapshot.png`);
const reactOutput = resolve(outDir, `${prefix}-react.png`);
const diffOutput = resolve(outDir, `${prefix}-diff.png`);
const reportOutput = resolve(outDir, `${prefix}-report.json`);

function imageDataUrl(path) {
  const payload = readFileSync(path).toString("base64");
  return `data:image/png;base64,${payload}`;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 64, height: 64 } });

try {
  const cropReport = await page.evaluate(
    async ({ snapshotSrc, reactSrc, hotspot, snapshotRect, reactRect, viewport, padding, pixelThreshold }) => {
      async function loadImage(src) {
        const image = new Image();
        image.decoding = "sync";
        image.src = src;
        await image.decode();
        return image;
      }
      function fullCropRect(baseRect, imageWidth, imageHeight) {
        const scaleX = imageWidth / viewport.width;
        const scaleY = imageHeight / viewport.height;
        const regionX = Math.round(baseRect.x * scaleX);
        const regionY = Math.round(baseRect.y * scaleY);
        const x = Math.max(0, regionX + hotspot.x - padding);
        const y = Math.max(0, regionY + hotspot.y - padding);
        const width = Math.max(1, Math.min(imageWidth - x, hotspot.width + padding * 2));
        const height = Math.max(1, Math.min(imageHeight - y, hotspot.height + padding * 2));
        return { x, y, width, height, scaleX, scaleY };
      }
      function cropCanvas(image, rect) {
        const canvas = document.createElement("canvas");
        canvas.width = rect.width;
        canvas.height = rect.height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
        return { canvas, context };
      }
      function toBase64(canvas) {
        return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
      }

      const snapshotImage = await loadImage(snapshotSrc);
      const reactImage = await loadImage(reactSrc);
      const snapshotCropRect = fullCropRect(snapshotRect, snapshotImage.width, snapshotImage.height);
      const reactCropRect = fullCropRect(reactRect, reactImage.width, reactImage.height);
      const snapshotCrop = cropCanvas(snapshotImage, snapshotCropRect);
      const reactCrop = cropCanvas(reactImage, reactCropRect);

      const width = Math.min(snapshotCrop.canvas.width, reactCrop.canvas.width);
      const height = Math.min(snapshotCrop.canvas.height, reactCrop.canvas.height);
      const snapshotPixels = snapshotCrop.context.getImageData(0, 0, width, height).data;
      const reactPixels = reactCrop.context.getImageData(0, 0, width, height).data;
      const diffCanvas = document.createElement("canvas");
      diffCanvas.width = width;
      diffCanvas.height = height;
      const diffContext = diffCanvas.getContext("2d", { willReadFrequently: true });
      const diffImage = diffContext.createImageData(width, height);
      let changedPixels = 0;
      let thresholdChangedPixels = 0;
      let totalAbsDiff = 0;
      let maxChannelDiff = 0;
      let redDominant = 0;
      let greenDominant = 0;
      let blueDominant = 0;

      for (let index = 0; index < snapshotPixels.length; index += 4) {
        const red = Math.abs(snapshotPixels[index] - reactPixels[index]);
        const green = Math.abs(snapshotPixels[index + 1] - reactPixels[index + 1]);
        const blue = Math.abs(snapshotPixels[index + 2] - reactPixels[index + 2]);
        const alpha = Math.abs(snapshotPixels[index + 3] - reactPixels[index + 3]);
        const pixelMax = Math.max(red, green, blue, alpha);
        if (pixelMax > 0) changedPixels += 1;
        if (pixelMax > pixelThreshold) thresholdChangedPixels += 1;
        totalAbsDiff += red + green + blue + alpha;
        maxChannelDiff = Math.max(maxChannelDiff, pixelMax);
        if (red >= green && red >= blue && red > pixelThreshold) redDominant += 1;
        if (green > red && green >= blue && green > pixelThreshold) greenDominant += 1;
        if (blue > red && blue > green && blue > pixelThreshold) blueDominant += 1;
        const output = pixelMax > pixelThreshold ? 255 : Math.min(180, pixelMax * 8);
        diffImage.data[index] = output;
        diffImage.data[index + 1] = pixelMax > pixelThreshold ? 32 : output;
        diffImage.data[index + 2] = pixelMax > pixelThreshold ? 32 : output;
        diffImage.data[index + 3] = pixelMax > 0 ? 255 : 0;
      }
      diffContext.putImageData(diffImage, 0, 0);
      const totalPixels = width * height;
      return {
        imageSize: { width: snapshotImage.width, height: snapshotImage.height },
        hotspot,
        snapshotCropRect,
        reactCropRect,
        diff: {
          width,
          height,
          totalPixels,
          changedPixels,
          thresholdChangedPixels,
          thresholdDiffPercent: Math.round((thresholdChangedPixels / totalPixels) * 1000000) / 10000,
          meanAbsDiff: Math.round((totalAbsDiff / (totalPixels * 4)) * 10000) / 10000,
          maxChannelDiff,
          dominantChannels: { red: redDominant, green: greenDominant, blue: blueDominant },
        },
        images: {
          snapshot: toBase64(snapshotCrop.canvas),
          react: toBase64(reactCrop.canvas),
          diff: toBase64(diffCanvas),
        },
      };
    },
    {
      snapshotSrc: imageDataUrl(result.screenshots.snapshot),
      reactSrc: imageDataUrl(result.screenshots.react),
      hotspot,
      snapshotRect,
      reactRect,
      viewport: report.viewport,
      padding,
      pixelThreshold,
    },
  );

  writeFileSync(snapshotOutput, Buffer.from(cropReport.images.snapshot, "base64"));
  writeFileSync(reactOutput, Buffer.from(cropReport.images.react, "base64"));
  writeFileSync(diffOutput, Buffer.from(cropReport.images.diff, "base64"));
  const summary = {
    sourceReport: reportPath,
    label,
    region,
    hotspotIndex,
    pixelThreshold,
    padding,
    sourceScreenshots: {
      snapshot: result.screenshots.snapshot,
      react: result.screenshots.react,
    },
    sourceBasenames: {
      snapshot: basename(result.screenshots.snapshot),
      react: basename(result.screenshots.react),
    },
    hotspot: cropReport.hotspot,
    imageSize: cropReport.imageSize,
    snapshotCropRect: cropReport.snapshotCropRect,
    reactCropRect: cropReport.reactCropRect,
    diff: cropReport.diff,
    outputs: {
      snapshot: snapshotOutput,
      react: reactOutput,
      diff: diffOutput,
    },
  };
  writeFileSync(reportOutput, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await page.close();
  await browser.close();
}

