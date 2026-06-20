import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const mode = process.argv[2] === "release" ? "release" : "debug";
const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
const gradleTask = mode === "release" ? "assembleRelease" : "assembleDebug";
const pathSeparator = process.platform === "win32" ? ";" : ":";
const localAppData = process.env.LOCALAPPDATA;
const programFilesX86 = process.env["ProgramFiles(x86)"];

function firstDirectory(path) {
  if (!path || !existsSync(path)) return null;
  return readdirSync(path, { withFileTypes: true }).find((entry) => entry.isDirectory())?.name ?? null;
}

function detectJavaHome() {
  if (process.env.JAVA_HOME && existsSync(join(process.env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java"))) {
    return process.env.JAVA_HOME;
  }

  const portableRoot = localAppData ? join(localAppData, "CodexTools", "jdk-17") : null;
  const portableDir = firstDirectory(portableRoot);
  if (portableRoot && portableDir) return join(portableRoot, portableDir);
  return null;
}

function detectAndroidSdk() {
  const envSdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (envSdk && existsSync(envSdk)) return envSdk;

  const localSdk = localAppData ? join(localAppData, "Android", "Sdk") : null;
  if (localSdk && existsSync(localSdk)) return localSdk;

  const legacySdk = programFilesX86 ? join(programFilesX86, "Android", "android-sdk") : null;
  if (legacySdk && existsSync(legacySdk)) return legacySdk;
  return null;
}

const javaHome = detectJavaHome();
const androidSdk = detectAndroidSdk();
const adbName = process.platform === "win32" ? "adb.exe" : "adb";

if (!javaHome) {
  console.error("JDK is missing. Install JDK 17+ or keep the portable JDK under %LOCALAPPDATA%\\CodexTools\\jdk-17.");
  process.exit(1);
}

if (!androidSdk) {
  console.error("Android SDK is missing. Install Android SDK or keep it under %LOCALAPPDATA%\\Android\\Sdk.");
  process.exit(1);
}

const requiredSdkPaths = [
  join(androidSdk, "platforms", "android-36", "android.jar"),
  join(androidSdk, "build-tools", "36.0.0"),
  join(androidSdk, "platform-tools", adbName),
];

const missingSdkPaths = requiredSdkPaths.filter((path) => !existsSync(path));
if (missingSdkPaths.length > 0) {
  console.error("Android SDK packages are incomplete. Run `npm run android:setup-sdk` and accept the Android SDK licenses.");
  for (const path of missingSdkPaths) console.error(`Missing: ${path}`);
  process.exit(1);
}

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidSdk,
  ANDROID_SDK_ROOT: androidSdk,
  PATH: [
    join(javaHome, "bin"),
    join(androidSdk, "platform-tools"),
    join(androidSdk, "cmdline-tools", "latest", "bin"),
    process.env.PATH ?? "",
  ].join(pathSeparator),
};

function run(command, args, options = {}) {
  console.log(`> ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env,
    ...options,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(resolve("android"))) {
  console.error("android/ is missing. Run `npm run cap:add:android` once after installing Android Studio/JDK.");
  process.exit(1);
}

writeFileSync(
  resolve("android/local.properties"),
  `sdk.dir=${androidSdk.replaceAll("\\", "/")}\n`,
  "utf8",
);

run("npm", ["run", "build:web"]);
run("npx", ["cap", "sync", "android"]);
run(gradleCommand, [gradleTask], { cwd: resolve("android") });
