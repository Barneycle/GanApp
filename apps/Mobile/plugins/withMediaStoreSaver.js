const { withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Copy native module files to Android project
 * This runs AFTER prebuild cleans the directory, so it recreates the files
 */
const copyNativeModuleFiles = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const platformProjectRoot = config.modRequest.platformProjectRoot;
      const targetDir = path.join(
        platformProjectRoot,
        'app/src/main/java/com/ganapp/mobile'
      );

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
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
 * Modify MainApplication.kt to register MediaStoreSaverPackage
 * This runs as a separate step to ensure it happens after MainApplication.kt is generated
 */
const modifyMainApplication = (config) => {
  return withMainApplication(config, (config) => {
    const mainApplicationPath = path.join(
      config.modRequest.platformProjectRoot,
      'app/src/main/java/com/ganapp/mobile/MainApplication.kt'
    );

    // Wait a bit and retry if file doesn't exist (handles timing issues with --clean)
    let retries = 5;
    while (!fs.existsSync(mainApplicationPath) && retries > 0) {
      console.log('[MediaStoreSaver Plugin] MainApplication.kt not found, retrying...');
      // Use a small delay (synchronous check)
      const start = Date.now();
      while (Date.now() - start < 100) { /* wait 100ms */ }
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

      // Add package registration if not present - use more robust pattern matching
      if (!mainApplication.includes('packages.add(MediaStoreSaverPackage())')) {
        // Pattern 1: After the comment line (most common)
        if (mainApplication.match(/\/\/ packages\.add\(MyReactNativePackage\(\)\)/)) {
          mainApplication = mainApplication.replace(
            /(\/\/ packages\.add\(MyReactNativePackage\(\)\)\s*\n\s*)(return packages)/g,
            `$1packages.add(MediaStoreSaverPackage())\n            $2`
          );
          modified = true;
          console.log('[MediaStoreSaver Plugin] Added package registration (after comment)');
        }
        // Pattern 2: Before return statement (if pattern 1 didn't match)
        else if (mainApplication.includes('return packages')) {
          mainApplication = mainApplication.replace(
            /(\s+)(return packages\s*$)/gm,
            `            packages.add(MediaStoreSaverPackage())\n$1$2`
          );
          modified = true;
          console.log('[MediaStoreSaver Plugin] Added package registration (before return)');
        }
        // Pattern 3: After PackageList (if patterns 1 & 2 didn't match)
        else {
          mainApplication = mainApplication.replace(
            /(val packages = PackageList\(this\)\.packages\s*\n)/g,
            `$1            packages.add(MediaStoreSaverPackage())\n`
          );
          modified = true;
          console.log('[MediaStoreSaver Plugin] Added package registration (after PackageList)');
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
      console.warn('[MediaStoreSaver Plugin] MainApplication.kt not found at:', mainApplicationPath);
      console.warn('[MediaStoreSaver Plugin] This might happen with --clean. The file should be created on next prebuild.');
    }

    return config;
  });
};

/**
 * Expo config plugin to add MediaStoreSaver native module
 * 
 * This plugin:
 * 1. Creates MediaStoreSaverModule.kt and MediaStoreSaverPackage.kt files
 * 2. Registers MediaStoreSaverPackage in MainApplication.kt
 * 
 * The plugin is designed to work with `expo prebuild --clean` by:
 * - Creating files AFTER prebuild cleans the directory (using withDangerousMod)
 * - Using retry logic to handle timing issues with MainApplication.kt generation
 * - Using multiple pattern matching strategies to ensure registration is added
 * 
 * Order matters: files must be created before MainApplication.kt is modified
 */
const withMediaStoreSaver = (config) => {
  if (!config.modRequest || !config.modRequest.platformProjectRoot) {
    console.warn('[MediaStoreSaver Plugin] Platform project root not found, skipping plugin');
    return config;
  }

  // Step 1: Create native module files
  config = copyNativeModuleFiles(config);
  
  // Step 2: Modify MainApplication.kt to register the package
  config = modifyMainApplication(config);
  
  return config;
};

module.exports = withMediaStoreSaver;

