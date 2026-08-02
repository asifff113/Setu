# Setu Android Build & Release Documentation

## Building the APKs

Setu has two product flavors:
- `play`: Standard build for Google Play Store (zero SMS permissions).
- `field`: Sideload edition with SMS gateway and radio features.

### Commands

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
