# Setu Android Build & Release Documentation

## Building the APKs

Setu has two product flavors:
- `play`: Standard build for Google Play Store (zero SMS permissions).
- `field`: Sideload edition with SMS gateway and radio features.

### Prerequisites

- **JDK 21** (`@capacitor/android` 7.x compiles with `sourceCompatibility 21`;
  a JDK 17 toolchain will fail with "invalid source release: 21"). Android
  Studio ships one at `<Android Studio install dir>/jbr` if you don't have a
  standalone JDK 21.
- **Android SDK** with `platform-35` and a recent `build-tools` (installed via
  Android Studio's SDK Manager, or `sdkmanager` from the command-line tools).
  Point `ANDROID_HOME`/`ANDROID_SDK_ROOT` at it, or create
  `app/android/local.properties` with `sdk.dir=/path/to/Sdk` (forward slashes
  even on Windows — backslash-escaped paths break the Gradle SDK locator).

### Commands

0. **Sync first.** `capacitor-cordova-android-plugins/` and the web assets
   under `app/src/main/assets/` are regenerated from `npm install` output and
   are gitignored — a fresh clone has neither. From the repo root:
   ```bash
   npm run cap:sync
   ```
   Re-run this after any web-side change, or after `npm install` changes a
   `@capacitor/*` package version.

1. **Debug Builds**:
   ```bash
   cd android
   ./gradlew assembleFieldDebug
   ./gradlew assemblePlayDebug
   ```

2. **Release APK Generation**:
   Generate key store:
   ```bash
   keytool -genkey -v -keystore setu-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias setu
   ```

   Sign and build release APKs:
   ```bash
   ./gradlew assembleFieldRelease
   ```
   The generated APK is output at: `app/build/outputs/apk/field/release/app-field-release.apk`.
