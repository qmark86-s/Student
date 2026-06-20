$ErrorActionPreference = "Stop"

$api = "https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&heap_size=normal&image_type=jdk&jvm_impl=hotspot&os=windows&vendor=eclipse"
$toolsRoot = Join-Path $env:LOCALAPPDATA "CodexTools"
$downloads = Join-Path $toolsRoot "downloads"
$jdkRoot = Join-Path $toolsRoot "jdk-17"

New-Item -ItemType Directory -Force -Path $downloads | Out-Null

$asset = Invoke-RestMethod -Uri $api -TimeoutSec 60
$package = @($asset)[0].binary.package
$zipPath = Join-Path $downloads $package.name

if (-not (Test-Path -LiteralPath $zipPath)) {
  Invoke-WebRequest -Uri $package.link -OutFile $zipPath -TimeoutSec 300
}

$actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant()
if ($actual -ne $package.checksum) {
  throw "JDK checksum mismatch. Expected $($package.checksum), got $actual"
}

if (Test-Path -LiteralPath $jdkRoot) {
  Remove-Item -LiteralPath $jdkRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $jdkRoot | Out-Null
Expand-Archive -LiteralPath $zipPath -DestinationPath $jdkRoot -Force

$jdkHomeDir = Get-ChildItem -LiteralPath $jdkRoot -Directory | Select-Object -First 1
if (-not $jdkHomeDir) {
  throw "Extracted JDK directory not found"
}

& (Join-Path $jdkHomeDir.FullName "bin\java.exe") -version
& (Join-Path $jdkHomeDir.FullName "bin\javac.exe") -version
Write-Output "PORTABLE_JDK_HOME=$($jdkHomeDir.FullName)"
