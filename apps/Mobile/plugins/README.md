# MediaStoreSaver Plugin

This Expo config plugin automatically creates and registers the `MediaStoreSaver` native Android module.

## Usage

The plugin is already configured in `app.json`. It will:
1. Enable ProGuard in release builds via `gradle.properties`
2. Create `MediaStoreSaverModule.kt` and `MediaStoreSaverPackage.kt` in the Android project
3. Register the package in `MainApplication.kt`
4. Add comprehensive ProGuard rules to prevent the module from being stripped in release builds
5. Verify `build.gradle` ProGuard configuration

## Known Limitation with `--clean`

When using `npx expo prebuild --platform android --clean`, Expo may regenerate `MainApplication.kt` AFTER all plugins run, which can overwrite the plugin's modifications.

### Workaround

**Option 1: Avoid `--clean` (Recommended)**
```bash
npx expo prebuild --platform android
npx expo run:android
```

**Option 2: Use `--clean` and verify**
```bash
npx expo prebuild --platform android --clean
# Check if MainApplication.kt has the registration
# If not, manually add:
# - Import: `import com.ganapp.mobile.MediaStoreSaverPackage`
# - Registration: `packages.add(MediaStoreSaverPackage())`
npx expo run:android
```

**Option 3: Use `--clean` only when necessary**
- Only use `--clean` when you need to completely reset native code
- For normal development, use prebuild without `--clean`

## Verification

After prebuild, verify the plugin worked:
1. Check that `MediaStoreSaverModule.kt` and `MediaStoreSaverPackage.kt` exist in `android/app/src/main/java/com/ganapp/mobile/`
2. Check that `MainApplication.kt` includes:
   - `import com.ganapp.mobile.MediaStoreSaverPackage`
   - `packages.add(MediaStoreSaverPackage())` in `getPackages()`
3. Check that `android/app/proguard-rules.pro` includes ProGuard rules for MediaStoreSaver

## Release Build Support

The plugin includes comprehensive ProGuard/R8 protection to ensure the native module works in release builds:

### What the Plugin Does:

1. **Enables ProGuard**: Sets `android.enableProguardInReleaseBuilds=true` in `gradle.properties`

2. **Comprehensive Keep Rules**: Adds extensive ProGuard rules that:
   - Keep all module classes from being stripped
   - Preserve all constructors (R8 often strips these)
   - Keep all `@ReactMethod` annotated methods
   - Keep `getName()` method for module lookup
   - Prevent obfuscation of module names
   - Keep the entire `com.ganapp.mobile` package
   - Keep all classes extending `ReactContextBaseJavaModule`

3. **Build Verification**: Logs warnings if ProGuard configuration is missing

### Troubleshooting Release Builds:

If the module still doesn't work in release builds:

1. **Check ProGuard rules exist**:
   ```bash
   cat android/app/proguard-rules.pro | grep MediaStoreSaver
   ```

2. **Check ProGuard is enabled**:
   ```bash
   cat android/gradle.properties | grep proguard
   ```

3. **Verify module files exist**:
   ```bash
   ls android/app/src/main/java/com/ganapp/mobile/MediaStoreSaver*.kt
   ```

4. **Check prebuild logs** for plugin messages:
   - `[MediaStoreSaver Plugin] Enabled ProGuard in gradle.properties`
   - `[MediaStoreSaver Plugin] Created MediaStoreSaverModule.kt`
   - `[MediaStoreSaver Plugin] Added ProGuard rules`

5. **Test in development first**: The error alerts in `lib/mediaStoreSaver.ts` will show:
   - If module is not found (ProGuard issue)
   - Exact error from native code if module exists

