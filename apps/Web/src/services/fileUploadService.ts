import { supabase } from '../lib/supabaseClient';

export interface UploadedFile {
  file: File;
  filename: string;
  size: number;
  type: string;
  id: string;
  url: string | null;
  path: string | null;
  uploaded: boolean;
  bucket: string | null;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class FileUploadService {
  static async uploadFile(
    file: File,
    bucketName: string,
    folder: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile> {
    try {
      // Generate unique file path (exact same as before migration)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;
      
      // Simple upload (exact same as before migration)
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      // Get public URL (exact same as before migration)
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      const uploadedFile: UploadedFile = {
        file: file,
        filename: file.name,
        size: file.size,
        type: file.type,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: publicUrl,
        path: filePath,
        uploaded: true,
        bucket: bucketName
      };
      
      return uploadedFile;
      
    } catch (error) {
      console.error(`Upload error for ${file.name}:`, error);
      
      // Return fallback file object
      const fallbackFile: UploadedFile = {
        file: file,
        filename: file.name,
        size: file.size,
        type: file.type,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: null,
        path: null,
        uploaded: false,
        bucket: null,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
      
      return fallbackFile;
    }
  }
  
  static async uploadMultipleFiles(
    files: File[],
    bucketName: string,
    folder: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadedFile[]> {
    const results: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const result = await this.uploadFile(file, bucketName, folder, onProgress);
        results.push(result);
        
        // Update progress
        if (onProgress) {
          onProgress({
            loaded: i + 1,
            total: files.length,
            percentage: ((i + 1) / files.length) * 100
          });
        }
        
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        
        // Add fallback file
        const fallbackFile: UploadedFile = {
          file: file,
          filename: file.name,
          size: file.size,
          type: file.type,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: null,
          path: null,
          uploaded: false,
          bucket: null,
          error: error instanceof Error ? error.message : 'Upload failed'
        };
        
        results.push(fallbackFile);
      }
    }
    
    return results;
  }
  
  static async deleteFile(bucketName: string, filePath: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
      
      if (error) {
        console.error(`Delete failed:`, error);
        return { error: error.message };
      }
      
      return {};
      
    } catch (error) {
      console.error(`Delete error:`, error);
      return { error: error instanceof Error ? error.message : 'Delete failed' };
    }
  }
  
  static getBucketForUploadType(uploadType: string): string {
    switch (uploadType) {
      case 'banner':
        return 'event-banners';
      case 'materials':
        return 'event-kits';
      case 'logo':
        return 'sponsor-logos';
      case 'photo':
        return 'speaker-photos';
      case 'programme':
        return 'event-programmes';
      case 'certificate':
        return 'certificate-templates';
      default:
        return 'event-banners';
    }
  }
  
  static getFolderForUploadType(uploadType: string): string {
    switch (uploadType) {
      case 'banner':
        return 'banners';
      case 'materials':
        return 'kits';
      case 'logo':
        return 'logos';
      case 'photo':
        return 'photos';
      case 'programme':
        return 'programmes';
      case 'certificate':
        return 'templates';
      default:
        return 'banners';
    }
  }
}
