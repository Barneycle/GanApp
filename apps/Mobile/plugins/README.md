# MediaStoreSaver Plugin

This Expo config plugin automatically creates and registers the `MediaStoreSaver` native Android module.

## Usage

The plugin is already configured in `app.json`. It will:
1. Create `MediaStoreSaverModule.kt` and `MediaStoreSaverPackage.kt` in the Android project
2. Register the package in `MainApplication.kt`

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

