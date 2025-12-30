# Cortex Release Build Script
# This script automates the creation of a signed release APK.

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Cortex Release Build..." -ForegroundColor Cyan

# 1. Generate Keystore if it doesn't exist
$KeystoreFile = "$PWD\release.keystore"
if (-not (Test-Path $KeystoreFile)) {
    Write-Host "🔑 Generating new release keystore..." -ForegroundColor Yellow
    & keytool -genkey -v -keystore $KeystoreFile -alias release -keyalg RSA -keysize 2048 -validity 10000 -storepass cortex123 -keypass cortex123 -dname "CN=Cortex User, OUT=Engineering, O=Cortex, L=City, ST=State, C=US"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to verify keytool. Ensure Java JDK is in your PATH."
    }
} else {
    Write-Host "✅ Using existing keystore." -ForegroundColor Green
}

# 2. Clean Build
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
cd android
./gradlew.bat clean

# 3. Assemble Release with Injected Signing Config
Write-Host "🏗️  Building Signed Release APK..." -ForegroundColor Cyan
./gradlew.bat assembleRelease `
    -Pandroid.injected.signing.store.file="$KeystoreFile" `
    -Pandroid.injected.signing.store.password="cortex123" `
    -Pandroid.injected.signing.key.alias="release" `
    -Pandroid.injected.signing.key.password="cortex123"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build Failed! Check the output above."
}

# 4. Move and Rename Artifact
cd ..
$SourceApk = "android\app\build\outputs\apk\release\app-release.apk"
$DestApk = "Cortex-Release.apk"

if (Test-Path $SourceApk) {
    Copy-Item $SourceApk $DestApk -Force
    Write-Host "✅ Build Success!" -ForegroundColor Green
    Write-Host "📦 APK Location: $PWD\$DestApk" -ForegroundColor White
    Write-Host "You can verify the build installs by running: npx expo run:android --variant release" -ForegroundColor Gray
} else {
    Write-Error "APK not found at expected location: $SourceApk"
}
