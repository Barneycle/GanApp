import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EventService } from '../../services/eventService';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

// Zod validation schema
const createEventSchema = z.object({
  title: z.string().optional(),
  rationale: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  venue: z.string().optional(),
  maxParticipants: z.string().optional(),
  registrationDeadline: z.string().optional(),
  sponsors: z.string().optional(),
  guestSpeakers: z.string().optional(),
  bannerFile: z.any().optional(),
  eventKitsFile: z.any().optional(),
  eventProgrammeFile: z.any().optional(),
  certificatesFile: z.any().optional(),
  sponsorImages: z.any().optional(),
  speakerImages: z.any().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: "End date must be after or equal to start date",
  path: ["endDate"]
}).refine((data) => {
  if (data.registrationDeadline && data.startDate) {
    return new Date(data.registrationDeadline) <= new Date(data.startDate);
  }
  return true;
}, {
  message: "Registration deadline must be before or on the event start date",
  path: ["registrationDeadline"]
});

const FileDropzone = ({ label, name, multiple = false, accept, onFileChange, onUpload, uploadType, maxSizeMB = 5, error, control, uploadedFiles = [], onRemoveFile }) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFiles = async (files) => {
    const fileArray = Array.from(files);
    
    if (onUpload && uploadType) {
      setUploading(true);
      setUploadProgress(0);
      
      try {
        // File validation
        for (const file of fileArray) {
          if (file.size > maxSizeMB * 1024 * 1024) {
            alert(`File ${file.name} is too large. Max size: ${maxSizeMB}MB`);
            setUploading(false);
            return;
          }
        }

        // Handle banner upload
        if (uploadType === 'banner') {
          try {
            setUploadProgress(10);
            
            const file = fileArray[0];
            if (!file.type.startsWith('image/')) {
              throw new Error('Banner must be an image file');
            }
            
            setUploadProgress(25);
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `banners/${fileName}`;
            
            const { data, error } = await supabase.storage
              .from('event-banners')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });
            
            if (error) {
              throw new Error(`Upload failed: ${error.message}`);
            }
            
            const { data: { publicUrl } } = supabase.storage
              .from('event-banners')
              .getPublicUrl(filePath);
            
            setUploadProgress(100);
            
            const fileResult = {
              file: file,
              filename: file.name,
              size: file.size,
              type: file.type,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: publicUrl,
              path: filePath,
              uploaded: true,
              bucket: 'event-banners'
            };
            
            onUpload([fileResult]);
            setUploading(false);
            setUploadProgress(0);
            
          } catch (error) {
            console.error('Banner upload failed:', error.message);
            
            // Fallback to local storage
            const file = fileArray[0];
            const fileResult = {
              file: file,
              filename: file.name,
              size: file.size,
              type: file.type,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: null,
              path: null,
              uploaded: false,
              bucket: null
            };
            
            onUpload([fileResult]);
            setUploading(false);
            setUploadProgress(0);
          }
        } else if (uploadType === 'materials') {
          // Handle materials upload - direct Supabase approach (like before migration)
          try {
            setUploadProgress(25);
            
            const bucketName = 'event-kits';
            const results = [];
            
            for (let index = 0; index < fileArray.length; index++) {
              const file = fileArray[index];
              try {
                setUploadProgress(25 + (index / fileArray.length) * 25);
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `kits/${fileName}`;
                
                const { data, error } = await supabase.storage
                  .from(bucketName)
                  .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                  });
                
                if (error) {
                  throw error;
                }
                
                const { data: { publicUrl } } = supabase.storage
                  .from(bucketName)
                  .getPublicUrl(filePath);
                
                setUploadProgress(50 + ((index + 1) / fileArray.length) * 25);
                
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: publicUrl,
                  path: filePath,
                  uploaded: true,
                  bucket: bucketName
                });
                
                if (index < fileArray.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
              } catch (fileError) {
                console.error(`Error uploading ${file.name}:`, fileError);
                
                setUploadProgress(50 + ((index + 1) / fileArray.length) * 25);
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: null,
                  path: null,
                  uploaded: false,
                  bucket: null,
                  error: fileError.message
                });
              }
            }
            
            setUploadProgress(100);
            onUpload(results);
            setUploading(false);
            setUploadProgress(0);
            
          } catch (error) {
            console.error('Materials upload failed:', error);
            
            const fileResults = fileArray.map((file, index) => {
              setUploadProgress(((index + 1) / fileArray.length) * 100);
              return {
                file: file,
                filename: file.name,
                size: file.size,
                type: file.type,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                uploaded: false
              };
            });
            onUpload(fileResults);
            setUploading(false);
            setUploadProgress(0);
          }
        } else if (uploadType === 'logo') {
          // Handle sponsor logos upload - direct Supabase approach (like before migration)
          try {
            setUploadProgress(10);
            
            // Validate image files
            for (const file of fileArray) {
              if (!file.type.startsWith('image/')) {
                throw new Error('Sponsor logos must be image files');
              }
            }
            
            const bucketName = 'sponsor-logos';
            const results = [];
            
            for (let index = 0; index < fileArray.length; index++) {
              const file = fileArray[index];
              try {
                setUploadProgress(10 + (index / fileArray.length) * 80);
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `logos/${fileName}`;
                
                const { data, error } = await supabase.storage
                  .from(bucketName)
                  .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                  });
                
                if (error) {
                  throw error;
                }
                
                const { data: { publicUrl } } = supabase.storage
                  .from(bucketName)
                  .getPublicUrl(filePath);
                
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: publicUrl,
                  path: filePath,
                  uploaded: true,
                  bucket: bucketName
                });
                
                if (index < fileArray.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
              } catch (fileError) {
                console.error(`Error uploading ${file.name}:`, fileError);
                
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: null,
                  path: null,
                  uploaded: false,
                  bucket: null,
                  error: fileError.message
                });
              }
            }
            
            setUploadProgress(100);
            onUpload(results);
            setUploading(false);
            setUploadProgress(0);
            
          } catch (error) {
            console.error('Sponsor logos upload failed:', error);
            
            const fileResults = fileArray.map((file, index) => ({
              file: file,
              filename: file.name,
              size: file.size,
              type: file.type,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: null,
              path: null,
              uploaded: false,
              bucket: null
            }));
            
            onUpload(fileResults);
            setUploading(false);
            setUploadProgress(0);
          }
        } else if (uploadType === 'photo') {
          // Handle speaker photos upload - direct Supabase approach (like before migration)
          try {
            setUploadProgress(25);
            
            const bucketName = 'speaker-photos';
            const results = [];
            
            for (let index = 0; index < fileArray.length; index++) {
              const file = fileArray[index];
              try {
                setUploadProgress(25 + (index / fileArray.length) * 50);
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `photos/${fileName}`;
                
                const { data, error } = await supabase.storage
                  .from(bucketName)
                  .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                  });
                
                if (error) {
                  throw error;
                }
                
                const { data: { publicUrl } } = supabase.storage
                  .from(bucketName)
                  .getPublicUrl(filePath);
                
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: publicUrl,
                  path: filePath,
                  uploaded: true,
                  bucket: bucketName
                });
                
                if (index < fileArray.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
              } catch (fileError) {
                console.error(`Error uploading ${file.name}:`, fileError);
                
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: null,
                  path: null,
                  uploaded: false,
                  bucket: null,
                  error: fileError.message
                });
              }
            }
            
            setUploadProgress(100);
            onUpload(results);
            setUploading(false);
            setUploadProgress(0);
            
          } catch (error) {
            console.error('Speaker photos upload failed:', error);
            
            const fileResults = fileArray.map((file, index) => ({
              file: file,
              filename: file.name,
              size: file.size,
              type: file.type,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: null,
              path: null,
              uploaded: false,
              bucket: null
            }));
            
            onUpload(fileResults);
            setUploading(false);
            setUploadProgress(0);
          }
        } else if (uploadType === 'event-kits') {
          // Handle event kits upload - direct Supabase approach (like before migration)
          try {
            setUploadProgress(25);
            
            const bucketName = 'event-kits';
            const results = [];
            
            for (let index = 0; index < fileArray.length; index++) {
              const file = fileArray[index];
              try {
                setUploadProgress(25 + (index / fileArray.length) * 50);
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `kits/${fileName}`;
                
                const { data, error } = await supabase.storage
                  .from(bucketName)
                  .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                  });
                
                if (error) {
                  throw error;
                }
                
                const { data: { publicUrl } } = supabase.storage
                  .from(bucketName)
                  .getPublicUrl(filePath);
                
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: publicUrl,
                  path: filePath,
                  uploaded: true,
                  bucket: bucketName
                });
                
                if (index < fileArray.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
              } catch (fileError) {
                console.error(`Error uploading ${file.name}:`, fileError);
                
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: null,
                  path: null,
                  uploaded: false,
                  bucket: null,
                  error: fileError.message
                });
              }
            }
            
            setUploadProgress(100);
            onUpload(results);
            setUploading(false);
            setUploadProgress(0);
            
          } catch (error) {
            console.error('Event kits upload failed:', error);
            
            const fileResults = fileArray.map((file, index) => ({
              file: file,
              filename: file.name,
              size: file.size,
              type: file.type,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: null,
              path: null,
              uploaded: false,
              bucket: null
            }));
            
            onUpload(fileResults);
            setUploading(false);
            setUploadProgress(0);
          }
        } else if (uploadType === 'event-programmes') {
          // Handle event programmes upload - direct Supabase approach (like before migration)
          try {
            setUploadProgress(25);
            
            const bucketName = 'event-programmes';
            const results = [];
            
            for (let index = 0; index < fileArray.length; index++) {
              const file = fileArray[index];
              try {
                setUploadProgress(25 + (index / fileArray.length) * 50);
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `programmes/${fileName}`;
                
                const { data, error } = await supabase.storage
                  .from(bucketName)
                  .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                  });
                
                if (error) {
                  throw error;
                }
                
                const { data: { publicUrl } } = supabase.storage
                  .from(bucketName)
                  .getPublicUrl(filePath);
                
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: publicUrl,
                  path: filePath,
                  uploaded: true,
                  bucket: bucketName
                });
                
                if (index < fileArray.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
              } catch (fileError) {
                console.error(`Error uploading ${file.name}:`, fileError);
                
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: null,
                  path: null,
                  uploaded: false,
                  bucket: null,
                  error: fileError.message
                });
              }
            }
            
            setUploadProgress(100);
            onUpload(results);
            setUploading(false);
            setUploadProgress(0);
            
          } catch (error) {
            console.error('Event programmes upload failed:', error);
            
            const fileResults = fileArray.map((file, index) => ({
              file: file,
              filename: file.name,
              size: file.size,
              type: file.type,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              url: null,
              path: null,
              uploaded: false,
              bucket: null
            }));
            
            onUpload(fileResults);
            setUploading(false);
            setUploadProgress(0);
          }
        } else if (uploadType === 'certificate-template') {

          try {
            setUploadProgress(25);
            
            const bucketName = 'certificate-templates';
            
            const results = [];
            for (let index = 0; index < fileArray.length; index++) {
              const file = fileArray[index];
              try {

                setUploadProgress(25 + (index / fileArray.length) * 25);
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                const filePath = `templates/${fileName}`;
                
                const uploadPromise = supabase.storage
                  .from(bucketName)
                  .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                  });
                
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Upload timed out after 30 seconds')), 30000)
                );
                
                const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);
                
                if (error) {
                  console.error(`❌ Upload failed for ${file.name}:`, error);
                  throw error;
                }
                
                const { data: { publicUrl } } = supabase.storage
                  .from(bucketName)
                  .getPublicUrl(filePath);
                

                setUploadProgress(50 + ((index + 1) / fileArray.length) * 25);
                
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: publicUrl,
                  path: filePath,
                  uploaded: true,
                  bucket: bucketName
                });
                

                if (index < fileArray.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
                
              } catch (fileError) {
                console.error(`❌ Error uploading ${file.name}:`, fileError);

                setUploadProgress(50 + ((index + 1) / fileArray.length) * 25);
                results.push({
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  url: null,
                  path: null,
                  uploaded: false,
                  bucket: null,
                  error: fileError.message
                });
              }
            }
              setUploadProgress(100);
              
              onUpload(results);
              
            } catch (error) {
              console.error('❌ Certificate template upload failed:', error);

              const fileResults = fileArray.map((file, index) => {
                setUploadProgress(((index + 1) / fileArray.length) * 100);
                return {
                  file: file,
                  filename: file.name,
                  size: file.size,
                  type: file.type,
                  id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  uploaded: false
                };
              });
              onUpload(fileResults);
            }
        } else {
          const fileResults = fileArray.map((file, index) => {
            setUploadProgress(((index + 1) / fileArray.length) * 100);
            return {
              file: file,
              filename: file.name,
              size: file.size,
              type: file.type,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              uploaded: false
            };
          });
          
          onUpload(fileResults);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        alert(`Upload failed: ${error.message}`);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    } else {
      onFileChange({ target: { name, files } });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  return (
          <div className="mb-6 sm:mb-8">
        <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
          {label}
        </label>
        
        {/* Upload Progress Bar */}
        {uploading && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
              <span>Uploading files...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <Controller
          name={name}
          control={control}
          render={({ field: { onChange, value } }) => (
                      <div
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer p-6 sm:p-8 transition-all duration-300 min-h-[160px] sm:min-h-[180px] md:min-h-[200px] ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105' 
                  : error
                ? 'border-red-300 bg-red-50'
                : uploadedFiles.length > 0
                ? multiple 
                  ? 'border-green-400 bg-green-50 hover:border-green-500 hover:bg-green-100' // Multiple files - can add more
                  : 'border-green-400 bg-green-50' // Single file - can replace
                : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md'
              }`}
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.click();
                }
              }}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
            <input
              type="file"
              name={name}
              multiple={multiple}
              accept={accept}
              ref={fileInputRef}
              className="hidden"
              onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onChange(e.target.files);
                  try {
                    await handleFiles(e.target.files);
                  } catch (error) {
                    console.error('❌ handleFiles failed:', error);
                  }
                }
              }}
            />
            
            {uploading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-3"></div>
                <p className="text-blue-600 font-medium text-base sm:text-lg">Uploading... {Math.round(uploadProgress)}%</p>
              </div>
            ) : uploadedFiles.length > 0 ? (
              <>
                <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 text-green-500">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                </div>
                <p className="text-green-600 font-medium text-sm sm:text-base text-center px-4 mb-2">
                  {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
                </p>
                <p className="text-slate-500 text-xs sm:text-sm text-center">
                  {multiple ? 'Click to add more files or drag & drop' : 'Click to replace or drag & drop'}
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 text-blue-500">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                </div>
                <p className="text-blue-600 font-medium text-sm sm:text-base text-center px-4 mb-2">
                  {multiple ? 'Drag & drop files here or click to select' : 'Drag & drop file here or click to select'}
                </p>
                <p className="text-slate-500 text-xs sm:text-sm text-center">
                  Max size: {maxSizeMB}MB
                </p>
              </>
            )}
            
            {/* Display uploaded files with remove buttons */}
            {uploadedFiles.length > 0 && !uploading && (
              <div className="mt-4 w-full">
                {/* Warning for restored files without File objects */}
                {uploadedFiles.some(file => !file.file || !(file.file instanceof File)) && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-700">
                      ⚠️ Some files were restored from previous session. You may need to re-upload them for full functionality.
                    </p>
                  </div>
                )}
                
                <div className="text-sm font-medium text-slate-700 mb-2">
                  Uploaded Files ({uploadedFiles.length}):
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {uploadedFiles.map((file, idx) => (
                    <div key={file.id || idx} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {/* File Preview */}
                        {(() => {
                          try {
                            if (file.type?.startsWith('image/') && file.file && file.file instanceof File) {
                              return (
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                                  <img 
                                    src={URL.createObjectURL(file.file)} 
                                    alt={file.filename}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              );
                            }
                          } catch (error) {
                            console.warn('Error creating file preview:', error);
                          }
                          
                          // Fallback to generic icon
                          return (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <div className="w-6 h-6 text-slate-500">
                                {file.type?.startsWith('image/') ? (
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
                                  </svg>
                                ) : (
                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        
                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{file.filename}</p>
                          <p className="text-xs text-slate-500">
                            {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Size unknown'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      {onRemoveFile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent event bubbling to parent
                            onRemoveFile(file.id || idx);
                          }}
                          className="ml-2 p-2 rounded-full hover:bg-red-100 text-red-500 hover:text-red-700 transition-colors"
                          title="Remove file"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Add more files hint */}
                {multiple && (
                  <div className="mt-3 text-center">
                    <p className="text-xs text-slate-500">
                      💡 You can add more files by clicking the upload area or dragging & dropping
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      )}
    </div>
  );
};

export const CreateEvent = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState({
    banner: null,
    materials: null,
    sponsorLogos: [],
    speakerPhotos: []
  });



  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);


  const canCreateEvents = isAuthenticated && user && (user.role === 'admin' || user.role === 'organizer');
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (!canCreateEvents) {
      navigate('/');
      return;
    }
  }, [isAuthenticated, canCreateEvents, navigate]);



  // Show access denied for unauthorized users
  if (!isAuthenticated) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Authentication Required</h2>
          <p className="text-slate-600 mb-6">You must be logged in to access this page.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </section>
    );
  }

  if (!canCreateEvents) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h2>
          <p className="text-slate-600 mb-6">Only administrators and organizers can create events.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </section>
    );
  }

  // Get saved form data from session storage
  const getSavedFormData = () => {
    try {
      const saved = sessionStorage.getItem('create-event-draft');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error parsing saved form data:', error);
      return null;
    }
  };

  // Save form data to session storage
  const saveFormData = (data) => {
    if (!autoSaveEnabled) return; // Don't save if auto-save is disabled
    
    try {
      // Only save non-file fields to session storage
      const dataToSave = {
        title: data.title || '',
        rationale: data.rationale || '',
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        endDate: data.endDate || new Date().toISOString().split('T')[0],
        startTime: data.startTime || '09:00',
        endTime: data.endTime || '17:00',
        venue: data.venue || '',
        sponsors: data.sponsors || '',
        guestSpeakers: data.guestSpeakers || '',
      };
      sessionStorage.setItem('create-event-draft', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  };

  // Clear saved form data
  const clearSavedFormData = () => {
    try {
      sessionStorage.removeItem('create-event-draft');
    } catch (error) {
      console.error('Error clearing saved form data:', error);
    }
  };

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue
  } = useForm({
    resolver: zodResolver(createEventSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      rationale: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '17:00',
      venue: '',
      sponsors: '',
      guestSpeakers: '',
      registrationDeadline: '',
      bannerFile: null,
      eventKitsFile: null,
      eventProgrammeFile: null,
      certificatesFile: null,
      sponsorImages: null,
      speakerImages: null,
    }
  });

  // Monitor uploadedFiles state changes for debugging


  // Instant data restoration - like Google Forms
  useEffect(() => {
    // Check for pending event data (from survey creation) - instant restore
    const pendingEventData = sessionStorage.getItem('pending-event-data');
    if (pendingEventData) {
      try {
        const eventData = JSON.parse(pendingEventData);
        
        // Instant restore to form state
        setValue('title', eventData.title || '');
        setValue('rationale', eventData.rationale || '');
        setValue('startDate', eventData.start_date || new Date().toISOString().split('T')[0]);
        setValue('endDate', eventData.end_date || new Date().toISOString().split('T')[0]);
        setValue('startTime', eventData.start_time || '09:00');
        setValue('endTime', eventData.end_time || '17:00');
        setValue('venue', eventData.venue || '');
        setValue('maxParticipants', eventData.max_participants ? eventData.max_participants.toString() : '');
        setValue('registrationDeadline', eventData.registration_deadline ? eventData.registration_deadline.slice(0, 16) : '');
        
        // Handle sponsors and speakers
        if (eventData.sponsors && Array.isArray(eventData.sponsors)) {
          setValue('sponsors', eventData.sponsors.map(s => s.name).join(', '));
        }
        if (eventData.guest_speakers && Array.isArray(eventData.guest_speakers)) {
          setValue('guestSpeakers', eventData.guest_speakers.map(s => s.name).join(', '));
        }
        
        // Instant restore uploaded files (but note that File objects are lost in sessionStorage)
        const pendingEventFiles = sessionStorage.getItem('pending-event-files');
        if (pendingEventFiles) {
          try {
            const filesData = JSON.parse(pendingEventFiles);
            // Files restored from sessionStorage won't have actual File objects
            // They'll only have metadata (filename, size, type) for display purposes
            setUploadedFiles(filesData);
          } catch (error) {
            console.warn('Could not restore files, continuing with form data');
          }
        }
        
        return; // Skip auto-save restoration
      } catch (error) {
        console.warn('Pending data parse error, falling back to auto-save');
      }
    }
    
    // Fallback to auto-saved data (also instant)
    const savedData = getSavedFormData();
    if (savedData) {
      Object.entries(savedData).forEach(([key, value]) => {
        if (value) setValue(key, value);
      });
    }
  }, [setValue]);

  // Instant auto-save like Google Forms
  useEffect(() => {
    const subscription = watch((data) => {
      if (autoSaveEnabled) {
        // Debounced save for better performance
        const timeoutId = setTimeout(() => {
          saveFormData(data);
        }, 300); // Save after 300ms of no changes
        
        return () => clearTimeout(timeoutId);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [watch, autoSaveEnabled]);

  // Toggle auto-save functionality
  const toggleAutoSave = () => {
    setAutoSaveEnabled(!autoSaveEnabled);
    if (!autoSaveEnabled) {
      // If enabling auto-save, save current form data
      const currentData = watch();
      saveFormData(currentData);
    }
  };

  const handleFileUpload = (uploadType, results) => {
    try {
      if (uploadType === 'banner') {
        // Banner is single file, so replace
        setUploadedFiles(prev => {
          const newState = { ...prev, banner: results[0] };
          return newState;
        });
      } else if (uploadType === 'materials') {
        // For materials, accumulate files by category
        setUploadedFiles(prev => ({ 
          ...prev, 
          materials: prev.materials ? [...prev.materials, ...results] : results 
        }));
      } else if (uploadType === 'logo') {
        // For sponsor logos, accumulate multiple files
        setUploadedFiles(prev => ({ 
          ...prev, 
          sponsorLogos: prev.sponsorLogos ? [...prev.sponsorLogos, ...results] : results 
        }));
      } else if (uploadType === 'photo') {
        // For speaker photos, accumulate multiple files
        setUploadedFiles(prev => ({ 
          ...prev, 
          speakerPhotos: prev.speakerPhotos ? [...prev.speakerPhotos, ...results] : results 
        }));
      } else if (uploadType === 'event-kits') {
        // For event kits, accumulate multiple files
        setUploadedFiles(prev => ({ 
          ...prev, 
          eventKits: prev.eventKits ? [...prev.eventKits, ...results] : results 
        }));
      } else if (uploadType === 'event-programmes') {
        // For event programmes, accumulate multiple files
        setUploadedFiles(prev => ({ 
          ...prev, 
          eventProgrammes: prev.eventProgrammes ? [...prev.eventProgrammes, ...results] : results 
        }));
      } else if (uploadType === 'certificate-template') {
        // For certificate templates, accumulate multiple files
        setUploadedFiles(prev => ({ 
          ...prev, 
          certificateTemplates: prev.certificateTemplates ? [...prev.certificateTemplates, ...results] : results 
        }));
      }
    } catch (error) {
      console.error('❌ Error in handleFileUpload:', error);
    }
  };

  const handleRemoveFile = async (uploadType, fileId, category = null) => {
    try {
      // Find the file to get its storage path
      let fileToRemove = null;
      let fileArray = null;
      
      if (uploadType === 'banner') {
        fileToRemove = uploadedFiles.banner;
        if (fileToRemove) {
          setUploadedFiles(prev => ({ ...prev, banner: null }));
        }
      } else if (uploadType === 'materials') {
        fileArray = uploadedFiles.materials;
        fileToRemove = fileArray?.find(f => f.id === fileId);
        if (fileToRemove) {
          setUploadedFiles(prev => ({ 
            ...prev, 
            materials: prev.materials?.filter(f => f.id !== fileId) || []
          }));
        }
      } else if (uploadType === 'logo') {
        fileArray = uploadedFiles.sponsorLogos;
        fileToRemove = fileArray?.find(f => f.id === fileId);
        if (fileToRemove) {
          setUploadedFiles(prev => ({ 
            ...prev, 
            sponsorLogos: prev.sponsorLogos?.filter(f => f.id !== fileId) || []
          }));
        }
      } else if (uploadType === 'photo') {
        fileArray = uploadedFiles.speakerPhotos;
        fileToRemove = fileArray?.find(f => f.id === fileId);
        if (fileToRemove) {
          setUploadedFiles(prev => ({ 
            ...prev, 
            speakerPhotos: prev.speakerPhotos?.filter(f => f.id !== fileId) || []
          }));
        }
      } else if (uploadType === 'event-kits') {
        fileArray = uploadedFiles.eventKits;
        fileToRemove = fileArray?.find(f => f.id === fileId);
        if (fileToRemove) {
          setUploadedFiles(prev => ({ 
            ...prev, 
            eventKits: prev.eventKits?.filter(f => f.id !== fileId) || []
          }));
        }
      } else if (uploadType === 'event-programmes') {
        fileArray = uploadedFiles.eventProgrammes;
        fileToRemove = fileArray?.find(f => f.id === fileId);
        if (fileToRemove) {
          setUploadedFiles(prev => ({ 
            ...prev, 
            eventProgrammes: prev.eventProgrammes?.filter(f => f.id !== fileId) || []
          }));
        }
      } else if (uploadType === 'certificate-template') {
        fileArray = uploadedFiles.certificateTemplates;
        fileToRemove = fileArray?.find(f => f.id === fileId);
        if (fileToRemove) {
          setUploadedFiles(prev => ({ 
            ...prev, 
            certificateTemplates: prev.certificateTemplates?.filter(f => f.id !== fileId) || []
          }));
        }
      }
      
      // Remove file from Supabase Storage if it was uploaded
      if (fileToRemove?.path && fileToRemove?.uploaded && fileToRemove?.bucket) {
        try {
          // Use the bucket name stored in the file object
          const bucketName = fileToRemove.bucket;
          
          await supabase.storage
            .from(bucketName)
            .remove([fileToRemove.path]);
        } catch (storageError) {
          console.warn('⚠️ Could not remove file from storage:', storageError);
          // Continue with local removal even if storage removal fails
        }
      }
    } catch (error) {
      console.error('Error removing file:', error);
    }
  };

  const onSubmit = (data) => {
    if (!canCreateEvents) {
      alert('Access denied. Only administrators and organizers can create events.');
      return;
    }

    // Prepare event data (don't save to database yet)
    const eventData = {
      title: data.title || 'Untitled Event',
      rationale: data.rationale || '',
      start_date: data.startDate || new Date().toISOString().split('T')[0],
      end_date: data.endDate || new Date().toISOString().split('T')[0],
      start_time: data.startTime || '09:00',
      end_time: data.endTime || '17:00',
      venue: data.venue || 'TBD',
      max_participants: data.maxParticipants ? parseInt(data.maxParticipants) : null,
      registration_deadline: data.registrationDeadline ? new Date(data.registrationDeadline).toISOString() : null,
      status: 'published',
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Handle sponsors and speakers
    if (data.sponsors) {
      eventData.sponsors = data.sponsors.split(',').map(s => s.trim()).filter(s => s).map(name => ({ name }));
    }
    
    if (data.guestSpeakers) {
      eventData.guest_speakers = data.guestSpeakers.split(',').map(s => s.trim()).filter(s => s).map(name => ({ name }));
    }

    // Handle file uploads if any
    if (uploadedFiles.banner) {
      if (uploadedFiles.banner.url) {
        eventData.banner_url = uploadedFiles.banner.url;
      } else {
        eventData.banner_url = `placeholder-${uploadedFiles.banner.filename}`;
      }
    }
    
    // Handle materials files
    if (uploadedFiles.materials && uploadedFiles.materials.length > 0) {
      eventData.materials_url = uploadedFiles.materials.map(f => f.url).join(',');
    }
    
    // Handle sponsor logos
    if (uploadedFiles.sponsorLogos && uploadedFiles.sponsorLogos.length > 0) {
      eventData.sponsor_logos_url = uploadedFiles.sponsorLogos.map(f => f.url).join(',');
    }
    
    // Handle speaker photos
    if (uploadedFiles.speakerPhotos && uploadedFiles.speakerPhotos.length > 0) {
      eventData.speaker_photos_url = uploadedFiles.speakerPhotos.map(f => f.url).join(',');
    }
    
    // Handle event programmes
    if (uploadedFiles.eventProgrammes && uploadedFiles.eventProgrammes.length > 0) {
      eventData.event_programmes_url = uploadedFiles.eventProgrammes.map(f => f.url).join(',');
    }
    
    // Handle certificate templates
    if (uploadedFiles.certificateTemplates && uploadedFiles.certificateTemplates.length > 0) {
      eventData.certificate_templates_url = uploadedFiles.certificateTemplates.map(f => f.url).join(',');
    }
    
    // Handle event kits
    if (uploadedFiles.eventKits && uploadedFiles.eventKits.length > 0) {
      eventData.event_kits_url = uploadedFiles.eventKits.map(f => f.url).join(',');
    }

    // Store event data in session storage for the next step
    sessionStorage.setItem('pending-event-data', JSON.stringify(eventData));
    sessionStorage.setItem('pending-event-files', JSON.stringify(uploadedFiles));
    
    // Navigate to survey creation immediately
    navigate('/create-survey');
  };

  // Add a function to manually clear saved data (useful for testing)
  const handleClearDraft = () => {
    clearSavedFormData();
    // Reset form to default values
    setValue('title', '');
    setValue('rationale', '');
    setValue('startDate', new Date().toISOString().split('T')[0]);
    setValue('endDate', new Date().toISOString().split('T')[0]);
    setValue('startTime', '09:00');
    setValue('endTime', '17:00');
    setValue('venue', '');
    setValue('maxParticipants', '');
    setValue('registrationDeadline', '');
    setValue('sponsors', '');
    setValue('guestSpeakers', '');
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center mb-4">
            <button
              onClick={() => navigate('/organizer')}
              className="p-3 rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-200 mr-4 group"
              aria-label="Back to organizer"
            >
              <svg 
                className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent">
              Create Event
            </h1>
          </div>
          <p className="text-slate-600 text-xl sm:text-2xl max-w-3xl mx-auto">
            Set up your event details and upload necessary materials to get started
          </p>
          
          
          {/* Draft Management Info */}
          <div className="mt-6 flex items-center justify-center space-x-6">
            {/* Auto-save Toggle */}
            <div className="flex items-center space-x-3">
              <span className="text-base font-medium text-slate-600">Auto-save</span>
              <button
                onClick={toggleAutoSave}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  autoSaveEnabled ? 'bg-green-500' : 'bg-gray-400'
                }`}
              >
                <div className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white transition-transform ${
                  autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}>
                  {autoSaveEnabled && (
                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              </button>
              <span className={`text-base font-medium ${autoSaveEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {autoSaveEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            
                         {/* Clear Draft Button */}
             <button
               onClick={handleClearDraft}
               className="inline-flex items-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg border border-red-200 hover:border-red-300 transition-all duration-200 font-medium text-base shadow-sm hover:shadow-md"
               title="Clear saved draft"
             >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear Draft</span>
            </button>

            {/* Policy Tester Button */}

          </div>
        </div>



        

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
          {/* Event Banner Section */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Event Banner</h3>
                  <p className="text-sm text-slate-600">Upload a banner image for your event</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <FileDropzone
                label="Event Banner"
                name="bannerFile"
                accept="image/*"
                onFileChange={() => {}}
                onUpload={(results) => handleFileUpload('banner', results)}
                uploadType="banner"
                maxSizeMB={35}
                control={control}
                error={errors.bannerFile}
                uploadedFiles={uploadedFiles.banner ? [uploadedFiles.banner] : []}
                onRemoveFile={() => handleRemoveFile('banner')}
              />
            </div>
          </div>

          {/* Event Title Section */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                                 <div>
                   <h3 className="text-xl font-semibold text-slate-800">Event Title</h3>
                   <p className="text-base text-slate-600">Set the main title for your event</p>
                 </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                                 <label className="block text-base font-semibold text-slate-700 uppercase tracking-wide">
                   Event Title
                 </label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                                             className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-lg transition-all duration-200 placeholder-slate-400 ${
                         errors.title ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                       }`}
                      placeholder="Enter your event title"
                    />
                  )}
                />
                                 {errors.title && (
                   <p className="text-base text-red-600">{errors.title.message}</p>
                 )}
              </div>
            </div>
          </div>

          {/* Basic Information Section */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Basic Information</h3>
                  <p className="text-sm text-slate-600">Essential details about your event</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Rationale */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Event Rationale
                </label>
                <Controller
                  name="rationale"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      rows="4"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400 ${
                        errors.rationale ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                      }`}
                      placeholder="Describe your event and its purpose"
                    />
                  )}
                />
                {errors.rationale && (
                  <p className="text-sm text-red-600">{errors.rationale.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Event Schedule Section */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Event Schedule</h3>
                  <p className="text-sm text-slate-600">Set the date and time for your event</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Date inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Start Date
                  </label>
                  <Controller
                    name="startDate"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${
                          errors.startDate ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                        }`}
                      />
                    )}
                  />
                  {errors.startDate && (
                    <p className="text-sm text-red-600">{errors.startDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    End Date
                  </label>
                  <Controller
                    name="endDate"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${
                          errors.endDate ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                        }`}
                      />
                    )}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-red-600">{errors.endDate.message}</p>
                  )}
                </div>
              </div>
              
                             {/* Time inputs */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                 <div className="space-y-2">
                   <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                     Start Time
                   </label>
                   <Controller
                     name="startTime"
                     control={control}
                     render={({ field }) => (
                       <input
                         {...field}
                         type="time"
                         className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${
                           errors.startTime ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                         }`}
                       />
                     )}
                   />
                   {errors.startTime && (
                     <p className="text-sm text-red-600">{errors.startTime.message}</p>
                   )}
                 </div>
                 <div className="space-y-2">
                   <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                     End Time
                   </label>
                   <Controller
                     name="endTime"
                     control={control}
                     render={({ field }) => (
                       <input
                         {...field}
                         type="time"
                         className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${
                           errors.endTime ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                         }`}
                       />
                     )}
                   />
                   {errors.endTime && (
                     <p className="text-sm text-red-600">{errors.endTime.message}</p>
                   )}
                 </div>
               </div>

               {/* Registration Deadline */}
               <div className="space-y-2">
                 <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                   Registration Deadline
                 </label>
                 <Controller
                   name="registrationDeadline"
                   control={control}
                   render={({ field }) => (
                     <input
                       {...field}
                       type="datetime-local"
                       className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${
                         errors.registrationDeadline ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                       }`}
                     />
                   )}
                 />
                 {errors.registrationDeadline && (
                   <p className="text-sm text-red-600">{errors.registrationDeadline.message}</p>
                 )}
               </div>
            </div>
          </div>

          {/* Venue Section */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Event Venue</h3>
                  <p className="text-sm text-slate-600">Specify where the event will take place</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
                             <div className="space-y-2">
                 <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                   Venue
                 </label>
                 <Controller
                   name="venue"
                   control={control}
                   render={({ field }) => (
                     <input
                       {...field}
                       type="text"
                       placeholder="Enter event venue (e.g., Conference Hall A, University Auditorium)"
                       className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400 ${
                         errors.venue ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                       }`}
                     />
                   )}
                 />
                 {errors.venue && (
                   <p className="text-sm text-red-600">{errors.venue.message}</p>
                 )}
               </div>

               <div className="space-y-2">
                 <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                   Max Participants
                 </label>
                 <Controller
                   name="maxParticipants"
                   control={control}
                   render={({ field }) => (
                     <input
                       {...field}
                       type="number"
                       min="1"
                       placeholder="Enter maximum number of participants"
                       className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400 ${
                         errors.maxParticipants ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                       }`}
                     />
                   )}
                 />
                 {errors.maxParticipants && (
                   <p className="text-sm text-red-600">{errors.maxParticipants.message}</p>
                 )}
               </div>
            </div>
          </div>

          {/* Sponsors Section */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Sponsors & Partners</h3>
                  <p className="text-sm text-slate-600">Add sponsor information and logos</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Sponsor Names
                </label>
                <Controller
                  name="sponsors"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Sponsor1, Sponsor2, Sponsor3"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                    />
                  )}
                />
              </div>

              <FileDropzone
                label="Sponsor Logos"
                name="sponsorImages"
                multiple
                accept="image/*"
                onFileChange={() => {}}
                onUpload={(results) => handleFileUpload('logo', results)}
                uploadType="logo"
                maxSizeMB={25}
                control={control}
                error={errors.sponsorImages}
                uploadedFiles={uploadedFiles.sponsorLogos || []}
                onRemoveFile={(fileId) => handleRemoveFile('logo', fileId)}
              />
            </div>
          </div>

          {/* Guest Speakers Section */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Guest Speakers</h3>
                  <p className="text-sm text-slate-600">Add speaker information and photos</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Speaker Names
                </label>
                <Controller
                  name="guestSpeakers"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      placeholder="Speaker1, Speaker2, Speaker3"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                    />
                  )}
                />
              </div>

              <FileDropzone
                label="Speaker Photos"
                name="speakerImages"
                multiple
                accept="image/*"
                onFileChange={() => {}}
                onUpload={(results) => handleFileUpload('photo', results)}
                uploadType="photo"
                maxSizeMB={25}
                control={control}
                error={errors.speakerPhotos}
                uploadedFiles={uploadedFiles.speakerPhotos || []}
                onRemoveFile={(fileId) => handleRemoveFile('photo', fileId)}
              />
            </div>
          </div>

          {/* Event Materials Section */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Event Materials</h3>
                  <p className="text-sm text-slate-600">Upload event kits, programmes, and certificates</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <FileDropzone
                label="Event Kits"
                name="eventKitsFile"
                accept="*/*"
                onFileChange={() => {}}
                onUpload={(results) => handleFileUpload('event-kits', results)}
                uploadType="event-kits"
                multiple
                maxSizeMB={25}
                control={control}
                error={errors.eventKitsFile}
                uploadedFiles={uploadedFiles.eventKits || []}
                onRemoveFile={(fileId) => handleRemoveFile('event-kits', fileId)}
              />

              <FileDropzone
                label="Event Programme"
                name="eventProgrammeFile"
                accept=".pdf,.doc,.docx"
                onFileChange={() => {}}
                onUpload={(results) => handleFileUpload('event-programmes', results)}
                uploadType="event-programmes"
                multiple
                maxSizeMB={25}
                control={control}
                error={errors.eventProgrammeFile}
                uploadedFiles={uploadedFiles.eventProgrammes || []}
                onRemoveFile={(fileId) => handleRemoveFile('event-programmes', fileId)}
              />

              <FileDropzone
                label="Certificate Template"
                name="certificatesFile"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onFileChange={() => {}}
                onUpload={(results) => handleFileUpload('certificate-template', results)}
                uploadType="certificate-template"
                multiple
                maxSizeMB={25}
                control={control}
                error={errors.certificatesFile}
                uploadedFiles={uploadedFiles.certificateTemplates || []}
                onRemoveFile={(fileId) => handleRemoveFile('certificate-template', fileId)}
              />
            </div>
          </div>
          
          {/* Action Button */}
          <div className="flex justify-center pt-8">
            <button
              type="submit"
              disabled={!isValid}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 px-12 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-semibold text-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Continue to Survey</span>
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};