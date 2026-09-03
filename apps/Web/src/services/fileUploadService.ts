import { supabase } from '../lib/supabaseClient';
import { uploadStorageFile } from '../utils/uploadWithProgress';

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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { publicUrl } = await uploadStorageFile({
        bucket: bucketName,
        path: filePath,
        file,
        onProgress: (percent) => {
          onProgress?.({
            loaded: file.size * (percent / 100),
            total: file.size,
            percentage: percent,
          });
        },
      });
      
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
      // Upload error
      
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
        const result = await this.uploadFile(file, bucketName, folder, (progress) => {
          const overall = ((i + progress.percentage / 100) / files.length) * 100;
          onProgress?.({
            loaded: i + progress.percentage / 100,
            total: files.length,
            percentage: overall,
          });
        });
        results.push(result);
        
      } catch (error) {
        // Failed to upload
        
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
        return { error: error.message };
      }
      
      return {};
      
    } catch (error) {
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
