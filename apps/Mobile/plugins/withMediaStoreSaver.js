const { withMainApplication, withDangerousMod } = require('@expo/config-plugins');
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
 * Modify MainApplication.kt to register MediaStoreSaverPackage
 * This runs as a separate step to ensure it happens after MainApplication.kt is generated
 */
const modifyMainApplication = (config) => {
  return withMainApplication(config, (config) => {
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
        // Find the getPackages function and add registration before return
        // Match: "return packages" inside getPackages function
        const getPackagesMatch = mainApplication.match(/override fun getPackages\(\):.*?\{([\s\S]*?)return packages([\s\S]*?)\}/);
        
        if (getPackagesMatch) {
          // Simple approach: find "return packages" and add before it
          mainApplication = mainApplication.replace(
            /(\s+)(return packages)/g,
            (match, whitespace, returnStmt) => {
              // Only replace if it's inside getPackages function (has packages = PackageList before it)
              const beforeMatch = mainApplication.substring(0, mainApplication.indexOf(match));
              if (beforeMatch.includes('val packages = PackageList')) {
                return `            packages.add(MediaStoreSaverPackage())\n${whitespace}${returnStmt}`;
              }
              return match;
            }
          );
          
          // Double check it was added
          if (mainApplication.includes('packages.add(MediaStoreSaverPackage())')) {
            modified = true;
            console.log('[MediaStoreSaver Plugin] Added package registration (before return)');
          } else {
            // Fallback: add after PackageList line
            mainApplication = mainApplication.replace(
              /(val packages = PackageList\(this\)\.packages)/g,
              `$1\n            packages.add(MediaStoreSaverPackage())`
            );
            modified = true;
            console.log('[MediaStoreSaver Plugin] Added package registration (after PackageList)');
          }
        } else {
          // Fallback: add after PackageList
          mainApplication = mainApplication.replace(
            /(val packages = PackageList\(this\)\.packages)/g,
            `$1\n            packages.add(MediaStoreSaverPackage())`
          );
          modified = true;
          console.log('[MediaStoreSaver Plugin] Added package registration (fallback after PackageList)');
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
 * - Ensuring directory structure exists before creating files
 *
 * Order matters: files must be created before MainApplication.kt is modified
 */
const withMediaStoreSaver = (config) => {
  // CRITICAL: Log that plugin is running - this helps verify it executes with --clean
  console.log('[MediaStoreSaver Plugin] ========================================');
  console.log('[MediaStoreSaver Plugin] Plugin is executing...');
  console.log('[MediaStoreSaver Plugin] ========================================');
  
  // Step 1: Create native module files
  config = copyNativeModuleFiles(config);

  // Step 2: Modify MainApplication.kt to register the package
  config = modifyMainApplication(config);
  
  console.log('[MediaStoreSaver Plugin] ========================================');
  console.log('[MediaStoreSaver Plugin] Plugin execution completed');
  console.log('[MediaStoreSaver Plugin] ========================================');

  return config;
};

// Ensure the plugin is exported correctly
module.exports = withMediaStoreSaver;

// Also export as default for compatibility
module.exports.default = withMediaStoreSaver;

