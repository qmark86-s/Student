$ErrorActionPreference = "Stop"

$jdkRoot = Join-Path $env:LOCALAPPDATA "CodexTools\jdk-17"
$portableJdk = $null
if (Test-Path -LiteralPath $jdkRoot) {
  $portableJdk = Get-ChildItem -LiteralPath $jdkRoot -Directory | Select-Object -First 1
}

if ($env:JAVA_HOME -and (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
  $javaHome = $env:JAVA_HOME
} elseif ($portableJdk) {
  $javaHome = $portableJdk.FullName
} else {
  throw "JDK not found. Run `npm run android:install-jdk` first or set JAVA_HOME."
}

$sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"
New-Item -ItemType Directory -Force -Path $sdkRoot | Out-Null

$programFilesX86 = [Environment]::GetFolderPath("ProgramFilesX86")
$legacySdkManager = $null
if ($programFilesX86) {
  $legacySdkManager = Join-Path $programFilesX86 "Android\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat"
}

$sdkManagerCandidates = @(
  (Join-Path $sdkRoot "cmdline-tools\latest\bin\sdkmanager.bat"),
  $legacySdkManager
) | Where-Object { $_ }

$sdkManager = $sdkManagerCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $sdkManager) {
  throw "sdkmanager.bat not found. Install Android Studio command-line tools first."
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:PATH = "$javaHome\bin;$sdkRoot\platform-tools;$sdkRoot\cmdline-tools\latest\bin;$env:PATH"

Write-Output "JAVA_HOME=$javaHome"
Write-Output "ANDROID_HOME=$sdkRoot"
Write-Output ""
Write-Output "Android SDK licenses may prompt for acceptance. Review and answer in the terminal."

& $sdkManager --sdk_root=$sdkRoot --licenses
& $sdkManager --sdk_root=$sdkRoot --install "cmdline-tools;latest" "platform-tools" "platforms;android-36" "build-tools;36.0.0"

$requiredPaths = @(
  (Join-Path $sdkRoot "platforms\android-36\android.jar"),
  (Join-Path $sdkRoot "build-tools\36.0.0"),
  (Join-Path $sdkRoot "platform-tools\adb.exe")
)

$missingPaths = @($requiredPaths | Where-Object { -not (Test-Path -LiteralPath $_) })
if ($missingPaths.Count -gt 0) {
  Write-Error "Android SDK packages are still incomplete. Review and accept the Android SDK licenses, then rerun npm run android:setup-sdk."
  foreach ($path in $missingPaths) {
    Write-Error "Missing: $path"
  }
  exit 1
}

if (Test-Path -LiteralPath "android") {
  "sdk.dir=$($sdkRoot.Replace('\', '/'))" | Set-Content -LiteralPath "android/local.properties" -Encoding UTF8
}

Write-Output "ANDROID_SDK_SETUP_OK"
