const { withDangerousMod, withGradleProperties, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Copy native module files to Android project
 * This runs AFTER prebuild cleans the directory, so it recreates the files
 * CRITICAL: This MUST run even with --clean, so we ensure the directory structure exists
 */
const copyNativeModuleFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      // CRITICAL: Ensure platformProjectRoot exists - create it if needed
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      
      // If platformProjectRoot doesn't exist, create the entire android directory structure
      if (!fs.existsSync(platformProjectRoot)) {
        console.log('[MediaStoreSaver Plugin] Android directory does not exist, creating structure...');
        fs.mkdirSync(platformProjectRoot, { recursive: true });
      }
      
      const targetDir = path.join(
        platformProjectRoot,
        'app/src/main/java/com/ganapp/mobile'
      );

      // Ensure target directory exists (create entire path if needed)
      if (!fs.existsSync(targetDir)) {
        console.log('[MediaStoreSaver Plugin] Creating directory structure:', targetDir);
        fs.mkdirSync(targetDir, { recursive: true });
      }

      console.log('[MediaStoreSaver Plugin] Creating native module files in:', targetDir);

      // Write MediaStoreSaverModule.kt directly
      const moduleContent = `package com.ganapp.mobile

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.provider.MediaStore
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream
import java.io.OutputStream

class MediaStoreSaverModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MediaStoreSaver"

    @ReactMethod
    fun saveFile(localUri: String, fileName: String, fileType: String, promise: Promise) {
        try {
            val context: Context = reactApplicationContext
            val resolver = context.contentResolver
            
            val mimeType = when (fileType.lowercase()) {
                "jpg", "jpeg" -> "image/jpeg"
                "png" -> "image/png"
                "pdf" -> "application/pdf"
                else -> "image/jpeg"
            }
            
            val relativePath = "Pictures/GanApp"
            
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                }
            }
            
            val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                ?: throw Exception("Failed to create MediaStore entry")
            
            // Read from local file and write to MediaStore
            val sourceFile = File(localUri.replace("file://", ""))
            if (!sourceFile.exists()) {
                throw Exception("Source file does not exist: \$localUri")
            }
            
            val input = FileInputStream(sourceFile)
            val output: OutputStream? = resolver.openOutputStream(uri)
            
            input.use { inputStream ->
                output.use { outStream ->
                    if (outStream != null) {
                        inputStream.copyTo(outStream)
                    }
                }
            }
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear()
                values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(uri, values, null, null)
            }
            
            promise.resolve(uri.toString())
        } catch (e: Exception) {
            Log.e("MediaStoreSaver", e.toString())
            promise.reject("SAVE_FAILED", e.message ?: "Failed to save file", e)
        }
    }
}`;
      
      const modulePath = path.join(targetDir, 'MediaStoreSaverModule.kt');
      fs.writeFileSync(modulePath, moduleContent);
      console.log('[MediaStoreSaver Plugin] Created MediaStoreSaverModule.kt');

      // Write MediaStoreSaverPackage.kt directly
      const packageContent = `package com.ganapp.mobile

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class MediaStoreSaverPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(MediaStoreSaverModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}`;
      
      const packagePath = path.join(targetDir, 'MediaStoreSaverPackage.kt');
      fs.writeFileSync(packagePath, packageContent);
      console.log('[MediaStoreSaver Plugin] Created MediaStoreSaverPackage.kt');

      return config;
    },
  ]);
};

/**
 * Add ProGuard rules to prevent the module from being stripped in release builds
 */
const withProguardRules = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      const proguardPath = path.join(platformProjectRoot, 'app/proguard-rules.pro');

      const proguardRules = `
# Keep MediaStoreSaver native module - prevents R8/ProGuard from stripping in release builds
-keep class com.ganapp.mobile.MediaStoreSaverModule { *; }
-keep class com.ganapp.mobile.MediaStoreSaverPackage { *; }

# Keep all constructors (R8 often strips these)
-keepclassmembers class com.ganapp.mobile.MediaStoreSaverModule {
    public <init>(...);
}
-keepclassmembers class com.ganapp.mobile.MediaStoreSaverPackage {
    public <init>(...);
}

# Keep React Native bridge methods
-keepclassmembers class com.ganapp.mobile.MediaStoreSaverModule {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# Keep getName() method for module name lookup
-keepclassmembers class com.ganapp.mobile.MediaStoreSaverModule {
    public java.lang.String getName();
}

# Keep module name for NativeModules lookup (no obfuscation)
-keepnames class com.ganapp.mobile.MediaStoreSaverModule
-keepnames class com.ganapp.mobile.MediaStoreSaverPackage

# Prevent any obfuscation of the entire package
-keep class com.ganapp.mobile.** { *; }

# Keep React Context base classes that our module extends
-keep class * extends com.facebook.react.bridge.ReactContextBaseJavaModule { *; }
`;

      if (fs.existsSync(proguardPath)) {
        let existingRules = fs.readFileSync(proguardPath, 'utf8');
        if (!existingRules.includes('MediaStoreSaver')) {
          fs.appendFileSync(proguardPath, proguardRules);
          console.log('[MediaStoreSaver Plugin] Added ProGuard rules to existing file');
        } else {
          console.log('[MediaStoreSaver Plugin] ProGuard rules already exist');
        }
      } else {
        fs.writeFileSync(proguardPath, proguardRules);
        console.log('[MediaStoreSaver Plugin] Created proguard-rules.pro with module rules');
      }

      return config;
    },
  ]);
};

/**
 * Enable ProGuard in release builds via gradle.properties
 */
const withProguardEnabled = (config) => {
  return withGradleProperties(config, (config) => {
    // Ensure ProGuard is enabled in release builds
    const existingProp = config.modResults.find(
      item => item.key === 'android.enableProguardInReleaseBuilds'
    );

    if (!existingProp) {
      config.modResults.push({
        type: 'property',
        key: 'android.enableProguardInReleaseBuilds',
        value: 'true',
      });
      console.log('[MediaStoreSaver Plugin] Enabled ProGuard in gradle.properties');
    } else {
      console.log('[MediaStoreSaver Plugin] ProGuard already configured in gradle.properties');
    }

    return config;
  });
};

/**
 * Verify build.gradle references proguard-rules.pro
 */
const ensureProguardReference = (config) => {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Verify proguard-rules.pro is referenced
    if (buildGradle.includes('proguard-rules.pro')) {
      console.log('[MediaStoreSaver Plugin] Verified proguard-rules.pro is referenced in build.gradle');
    } else {
      console.warn('[MediaStoreSaver Plugin] Warning: proguard-rules.pro may not be referenced in build.gradle');
    }

    // Verify ProGuard optimization is configured
    if (!buildGradle.includes("getDefaultProguardFile('proguard-android-optimize.txt')") &&
        !buildGradle.includes('getDefaultProguardFile("proguard-android-optimize.txt")') &&
        !buildGradle.includes("getDefaultProguardFile('proguard-android.txt')") &&
        !buildGradle.includes('getDefaultProguardFile("proguard-android.txt")')) {
      console.warn('[MediaStoreSaver Plugin] Warning: Default ProGuard file not found in build.gradle');
    } else {
      console.log('[MediaStoreSaver Plugin] Verified default ProGuard file is configured');
    }

    return config;
  });
};

/**
 * Modify MainApplication.kt to register MediaStoreSaverPackage
 * Uses withDangerousMod to ensure modifications happen AFTER MainApplication.kt is fully generated
 */
const modifyMainApplication = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      const mainApplicationPath = path.join(
        platformProjectRoot,
        'app/src/main/java/com/ganapp/mobile/MainApplication.kt'
      );

      // CRITICAL: Ensure the directory exists before checking for MainApplication.kt
      const mainApplicationDir = path.dirname(mainApplicationPath);
      if (!fs.existsSync(mainApplicationDir)) {
        console.log('[MediaStoreSaver Plugin] MainApplication directory does not exist, creating:', mainApplicationDir);
        fs.mkdirSync(mainApplicationDir, { recursive: true });
      }

      // Wait a bit and retry if file doesn't exist (handles timing issues with --clean)
      // Increase retries and wait time for --clean scenarios
      let retries = 10;
      while (!fs.existsSync(mainApplicationPath) && retries > 0) {
        console.log(`[MediaStoreSaver Plugin] MainApplication.kt not found, retrying... (${retries} attempts remaining)`);
        // Use a longer delay for --clean scenarios
        const start = Date.now();
        while (Date.now() - start < 200) { /* wait 200ms */ }
        retries--;
      }

      if (fs.existsSync(mainApplicationPath)) {
        let mainApplication = fs.readFileSync(mainApplicationPath, 'utf8');
        let modified = false;

        console.log('[MediaStoreSaver Plugin] Modifying MainApplication.kt');

        // Add import if not present - use more robust pattern matching
        if (!mainApplication.includes('import com.ganapp.mobile.MediaStoreSaverPackage')) {
          // Try to add after ReactNativeHostWrapper import
          if (mainApplication.includes('import expo.modules.ReactNativeHostWrapper')) {
            mainApplication = mainApplication.replace(
              /(import expo\.modules\.ReactNativeHostWrapper)/g,
              `$1\nimport com.ganapp.mobile.MediaStoreSaverPackage`
            );
            modified = true;
            console.log('[MediaStoreSaver Plugin] Added import statement');
          } else {
            // Add before class declaration as fallback
            mainApplication = mainApplication.replace(
              /(class MainApplication)/g,
              `import com.ganapp.mobile.MediaStoreSaverPackage\n$1`
            );
            modified = true;
            console.log('[MediaStoreSaver Plugin] Added import statement (before class)');
          }
        }

        // Add package registration if not present - use simple and reliable pattern matching
        if (!mainApplication.includes('packages.add(MediaStoreSaverPackage())')) {
          // Strategy: Find "return packages" and add our package before it
          // Look for the pattern with the comment line before return
          const commentPattern = /(\s*\/\/ packages\.add\(MyReactNativePackage\(\)\))\s*\n\s*(return packages)/;

          if (commentPattern.test(mainApplication)) {
            // Insert between comment and return statement
            mainApplication = mainApplication.replace(
              commentPattern,
              '$1\n            packages.add(MediaStoreSaverPackage())\n            $2'
            );
            modified = true;
            console.log('[MediaStoreSaver Plugin] Added package registration (after comment line)');
          } else {
            // Fallback: Look for "return packages" preceded by whitespace
            const returnPattern = /(\s*)(return packages)/;
            const match = mainApplication.match(returnPattern);

            if (match && mainApplication.substring(0, mainApplication.indexOf(match[0])).includes('val packages = PackageList')) {
              mainApplication = mainApplication.replace(
                returnPattern,
                '            packages.add(MediaStoreSaverPackage())\n$1$2'
              );
              modified = true;
              console.log('[MediaStoreSaver Plugin] Added package registration (before return)');
            } else {
              // Last resort: add after PackageList declaration
              mainApplication = mainApplication.replace(
                /(val packages = PackageList\(this\)\.packages)/,
                '$1\n            packages.add(MediaStoreSaverPackage())'
              );
              modified = true;
              console.log('[MediaStoreSaver Plugin] Added package registration (after PackageList)');
            }
          }
        } else {
          console.log('[MediaStoreSaver Plugin] Package already registered');
        }

        // Verify the modification worked
        if (!mainApplication.includes('packages.add(MediaStoreSaverPackage())')) {
          console.error('[MediaStoreSaver Plugin] ERROR: Failed to add package registration!');
          const getPackagesMatch = mainApplication.match(/override fun getPackages\(\):.*?return packages/gs);
          if (getPackagesMatch) {
            console.error('[MediaStoreSaver Plugin] getPackages content:', getPackagesMatch[0]);
          }
        } else if (modified) {
          fs.writeFileSync(mainApplicationPath, mainApplication);
          console.log('[MediaStoreSaver Plugin] MainApplication.kt updated successfully');
        }
      } else {
        console.error('[MediaStoreSaver Plugin] ERROR: MainApplication.kt not found at:', mainApplicationPath);
        console.error('[MediaStoreSaver Plugin] This should not happen. The file should be created by Expo prebuild.');
        console.error('[MediaStoreSaver Plugin] Platform project root:', platformProjectRoot);
        console.error('[MediaStoreSaver Plugin] Directory exists:', fs.existsSync(path.dirname(mainApplicationPath)));

        // List files in the directory to help debug
        try {
          const dirContents = fs.readdirSync(path.dirname(mainApplicationPath));
          console.error('[MediaStoreSaver Plugin] Directory contents:', dirContents);
        } catch (e) {
          console.error('[MediaStoreSaver Plugin] Could not read directory:', e.message);
        }

        // Don't throw error, but log it clearly so user knows something is wrong
        console.error('[MediaStoreSaver Plugin] The plugin will continue, but MainApplication.kt modification was skipped.');
      }

      return config;
    },
  ]);
};

/**
 * Expo config plugin to add MediaStoreSaver native module
 *
 * This plugin:
 * 1. Enables ProGuard in release builds (gradle.properties)
 * 2. Creates MediaStoreSaverModule.kt and MediaStoreSaverPackage.kt files
 * 3. Registers MediaStoreSaverPackage in MainApplication.kt
 * 4. Adds comprehensive ProGuard rules to prevent stripping in release builds
 * 5. Verifies build.gradle ProGuard configuration
 *
 * The plugin is designed to work with `expo prebuild --clean` by:
 * - Creating files AFTER prebuild cleans the directory (using withDangerousMod)
 * - Using retry logic to handle timing issues with MainApplication.kt generation
 * - Using multiple pattern matching strategies to ensure registration is added
 * - Ensuring directory structure exists before creating files
 * - Adding comprehensive ProGuard rules to protect the module from R8/ProGuard obfuscation
 * - Explicitly enabling ProGuard via gradle.properties
 *
 * Order matters: ProGuard must be enabled before files are created,
 * and rules must be added after files exist
 */
const withMediaStoreSaver = (config) => {
  // Step 1: Ensure ProGuard is enabled in gradle.properties
  config = withProguardEnabled(config);

  // Step 2: Create native module files
  config = copyNativeModuleFiles(config);

  // Step 3: Modify MainApplication.kt to register the package
  config = modifyMainApplication(config);

  // Step 4: Add comprehensive ProGuard rules for release builds
  config = withProguardRules(config);

  // Step 5: Verify build.gradle ProGuard configuration
  config = ensureProguardReference(config);

  return config;
};

module.exports = withMediaStoreSaver;

