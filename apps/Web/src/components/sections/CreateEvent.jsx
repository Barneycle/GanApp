import React, { useState, useRef, useEffect, Suspense, lazy, Component } from 'react';

import { useNavigate } from 'react-router-dom';

import { useForm, Controller } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { z } from 'zod';

import { EventService } from '../../services/eventService';

import { SpeakerService } from '../../services/speakerService';
import { SponsorService } from '../../services/sponsorService';
import { VenueService } from '../../services/venueService';
import { supabase } from '../../lib/supabaseClient';

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../Toast';
import 'sweetalert2/dist/sweetalert2.min.css';
import { promptCertificateUsage, showEventCreationSuccess } from '../../utils/eventCreationDialogs';

// Lazy load RichTextEditor to prevent app-wide crashes
const RichTextEditor = lazy(() => import('../RichTextEditor'));

// Error Boundary for RichTextEditor
class RichTextEditorErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RichTextEditor Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <textarea
          value={this.props.value || ''}
          onChange={(e) => {
            if (this.props.onChange) {
              // Textarea always sends event, but RichTextEditor sends HTML string
              // For error fallback, we'll use plain text
              this.props.onChange(e.target.value);
            }
          }}
          placeholder={this.props.placeholder || 'Describe your event and its purpose'}
          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400 min-h-[150px] resize-vertical ${this.props.errorClass || 'border-slate-200'}`}
          rows={6}
        />
      );
    }

    return this.props.children;
  }
}



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

  sponsors: z.string().optional(),

  guestSpeakers: z.string().optional(),

  // Check-in window settings
  checkInBeforeMinutes: z.coerce.number().min(0).max(480).optional(), // Max 8 hours before
  checkInDuringMinutes: z.coerce.number().min(0).max(240).optional(), // Max 4 hours during


  bannerFile: z.any().optional(),

  eventKitsFile: z.any().optional(),
  eventKitsLink: z.string().url('Please enter a valid URL').optional().or(z.literal('')),

  eventProgrammeFile: z.any().optional(),
  eventProgrammeLink: z.string().url('Please enter a valid URL').optional().or(z.literal('')),

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

});

// Philippine phone number formatting utilities
const formatPhilippinePhone = (value) => {
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, '');

  // Limit to 11 digits (Philippine mobile numbers)
  const limited = cleaned.slice(0, 11);

  // Format based on length: 0912 345 6789
  if (limited.length <= 4) {
    return limited;
  } else if (limited.length <= 7) {
    return `${limited.slice(0, 4)} ${limited.slice(4)}`;
  } else {
    return `${limited.slice(0, 4)} ${limited.slice(4, 7)} ${limited.slice(7)}`;
  }
};

const validatePhilippinePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 11 && cleaned.startsWith('09');
};

const FileDropzone = ({ label, name, multiple = false, accept, onFileChange, onUpload, uploadType, maxSizeMB = 1024, error, control, uploadedFiles = [], onRemoveFile }) => {

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

            toast.error(`File ${file.name} is too large. Max size: ${maxSizeMB}MB`);

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

            // Banner upload failed



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

                // Error uploading file



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

            // Materials upload failed



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

                // Error uploading file



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

            // Sponsor logos upload failed



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

                // Error uploading file



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

            // Speaker photos upload failed



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

                // Error uploading file



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

            // Event kits upload failed



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

                // Error uploading file



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

            // Event programmes upload failed



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

        // Upload failed

        toast.error(`Upload failed: ${error.message}`);

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

            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl cursor-pointer p-6 sm:p-8 transition-all duration-300 min-h-[160px] sm:min-h-[180px] md:min-h-[200px] ${dragActive

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

                    // handleFiles failed

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

                            // Error creating file preview

                          }



                          // Fallback to generic icon

                          return (

                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">

                              <div className="w-6 h-6 text-slate-500">

                                {file.type?.startsWith('image/') ? (

                                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />

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
  const toast = useToast();

  const navigate = useNavigate();

  const { user, isAuthenticated } = useAuth();

  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  const [uploadedFiles, setUploadedFiles] = useState(() => ({

    banner: null,

    materials: [],

    sponsorLogos: [],

    speakerPhotos: [],

    eventKits: [],

    eventProgrammes: []

  }));

  // Track whether user wants to upload or use link for event materials
  const [eventKitsMode, setEventKitsMode] = useState('upload'); // 'upload' or 'link'
  const [eventProgrammeMode, setEventProgrammeMode] = useState('upload'); // 'upload' or 'link'



  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);




  // Guest Speakers state
  const [speakers, setSpeakers] = useState([]);
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);

  // Sponsors state
  const [sponsors, setSponsors] = useState([]);
  const [showAddSponsor, setShowAddSponsor] = useState(false);

  // Venues state
  const [venues, setVenues] = useState([]);
  const [showOtherVenue, setShowOtherVenue] = useState(false);
  const [customVenueName, setCustomVenueName] = useState('');



  const canManageEvents = isAuthenticated && user && (user.role === 'admin' || user.role === 'organizer');

  // Fetch venues on component mount
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const result = await VenueService.getAllVenues();
        if (result.venues) {
          setVenues(result.venues);
        } else {
          // Error fetching venues
        }
      } catch (error) {
        // Error fetching venues
      }
    };

    fetchVenues();
  }, []);

  useEffect(() => {

    if (!isAuthenticated) {

      navigate('/login');

      return;

    }



    if (!canManageEvents) {

      navigate('/');

      return;

    }

  }, [isAuthenticated, canManageEvents, navigate]);







  // Show access denied for unauthorized users

  if (!isAuthenticated) {

    return (

      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-6 lg:p-8 text-center max-w-md mx-auto">

          <h2 className="text-2xl font-bold text-slate-800 mb-4">Authentication Required</h2>

          <p className="text-slate-600 mb-6">You must be logged in to access this page.</p>

          <button

            onClick={() => navigate('/login')}

            className="px-6 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-colors"

          >

            Go to Login

          </button>

        </div>

      </section>

    );

  }



  if (!canManageEvents) {

    return (

      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-6 lg:p-8 text-center max-w-md mx-auto">

          <h2 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h2>

          <p className="text-slate-600 mb-6">Only administrators and organizers can create events.</p>

          <button

            onClick={() => navigate('/')}

            className="px-6 py-3 bg-blue-900 text-white rounded-xl hover:bg-blue-800 transition-colors"

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

      // Error parsing saved form data

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

        checkInBeforeMinutes: data.checkInBeforeMinutes || 60,

        checkInDuringMinutes: data.checkInDuringMinutes || 30,


      };

      sessionStorage.setItem('create-event-draft', JSON.stringify(dataToSave));

    } catch (error) {

      // Error saving form data

    }

  };



  // Clear saved form data

  const clearSavedFormData = () => {

    try {

      sessionStorage.removeItem('create-event-draft');

    } catch (error) {

      // Error clearing saved form data

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
    reValidateMode: 'onChange',
    criteriaMode: 'all',

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

      checkInBeforeMinutes: 60,

      checkInDuringMinutes: 30,


      bannerFile: null,

      eventKitsFile: null,
      eventKitsLink: '',

      eventProgrammeFile: null,
      eventProgrammeLink: '',

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

            // Could not restore files, continuing with form data

          }

        }


        // Restore speakers data
        const pendingEventSpeakers = sessionStorage.getItem('pending-event-speakers');
        if (pendingEventSpeakers) {
          try {
            const speakersData = JSON.parse(pendingEventSpeakers);
            setSpeakers(speakersData);
          } catch (error) {
            // Could not restore speakers data
          }
        }

        // Restore sponsors data
        const pendingEventSponsors = sessionStorage.getItem('pending-event-sponsors');
        if (pendingEventSponsors) {
          try {
            const sponsorsData = JSON.parse(pendingEventSponsors);
            setSponsors(sponsorsData);
          } catch (error) {
            // Could not restore sponsors data
          }
        }


        return; // Skip auto-save restoration

      } catch (error) {

        // Pending data parse error, falling back to auto-save

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


      }

    } catch (error) {

      // Error in handleFileUpload

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

      }



      // Remove file from Supabase Storage if it was uploaded
      if (fileToRemove?.path && fileToRemove?.uploaded && fileToRemove?.bucket) {
        try {
          // Use the bucket name stored in the file object
          const bucketName = fileToRemove.bucket;

          const { error } = await supabase.storage
            .from(bucketName)
            .remove([fileToRemove.path]);

        } catch (storageError) {
          // Continue with local removal even if storage removal fails
        }
      }

    } catch (error) {
      // Error removing file
    }

  };


  // Speaker Management Functions
  const addSpeaker = () => {
    const newSpeaker = {
      id: Date.now().toString(), // Temporary ID for frontend
      prefix: '',
      first_name: '',
      last_name: '',
      middle_initial: '',
      affix: '',
      designation: '',
      organization: '',
      bio: '',
      email: '',
      phone: '',
      photo_url: '',
      photo_path: '', // For tracking file path for deletion
      is_keynote: false,
      speaker_order: speakers.length
    };
    setSpeakers([...speakers, newSpeaker]);
    setShowAddSpeaker(false);
  };

  const updateSpeaker = (index, field, value) => {
    const updatedSpeakers = speakers.map((speaker, i) =>
      i === index ? { ...speaker, [field]: value } : speaker
    );
    setSpeakers(updatedSpeakers);
  };

  const removeSpeaker = (index) => {
    const updatedSpeakers = speakers.filter((_, i) => i !== index);
    // Reorder remaining speakers
    const reorderedSpeakers = updatedSpeakers.map((speaker, i) => ({
      ...speaker,
      speaker_order: i
    }));
    setSpeakers(reorderedSpeakers);
  };

  const moveSpeaker = (fromIndex, toIndex) => {
    const updatedSpeakers = [...speakers];
    const [movedSpeaker] = updatedSpeakers.splice(fromIndex, 1);
    updatedSpeakers.splice(toIndex, 0, movedSpeaker);

    // Update speaker_order for all speakers
    const reorderedSpeakers = updatedSpeakers.map((speaker, i) => ({
      ...speaker,
      speaker_order: i
    }));
    setSpeakers(reorderedSpeakers);
  };

  // Sponsor Management Functions
  const addSponsor = () => {
    const newSponsor = {
      id: Date.now().toString(), // Temporary ID for frontend
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      logo_url: '',
      logo_path: '', // For tracking file path for deletion
      contribution: '',
      sponsor_order: sponsors.length
    };
    setSponsors([...sponsors, newSponsor]);
    setShowAddSponsor(false);
  };

  const updateSponsor = (index, field, value) => {
    const updatedSponsors = sponsors.map((sponsor, i) =>
      i === index ? { ...sponsor, [field]: value } : sponsor
    );
    setSponsors(updatedSponsors);
  };

  const removeSponsor = (index) => {
    const updatedSponsors = sponsors.filter((_, i) => i !== index);
    // Reorder remaining sponsors
    const reorderedSponsors = updatedSponsors.map((sponsor, i) => ({
      ...sponsor,
      sponsor_order: i
    }));
    setSponsors(reorderedSponsors);
  };

  const moveSponsor = (fromIndex, toIndex) => {
    const updatedSponsors = [...sponsors];
    const [movedSponsor] = updatedSponsors.splice(fromIndex, 1);
    updatedSponsors.splice(toIndex, 0, movedSponsor);

    // Update sponsor_order for all sponsors
    const reorderedSponsors = updatedSponsors.map((sponsor, i) => ({
      ...sponsor,
      sponsor_order: i
    }));
    setSponsors(reorderedSponsors);
  };


  const onSubmit = async (data) => {

    if (!canManageEvents) {

      toast.error('Access denied. Only administrators and organizers can create events.');

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

      // Check-in window settings
      check_in_before_minutes: data.checkInBeforeMinutes || 60,

      check_in_during_minutes: data.checkInDuringMinutes || 30,


      status: 'published',

      created_by: user.id,

      created_at: new Date().toISOString(),

      updated_at: new Date().toISOString()

    };



    // Handle venue creation if "Other" was selected
    if (showOtherVenue && customVenueName.trim()) {
      try {
        // Check if venue already exists
        const existingVenue = await VenueService.getVenueByName(customVenueName.trim());
        if (!existingVenue.venue) {
          // Create new venue
          const venueResult = await VenueService.createVenue({
            name: customVenueName.trim(),
            created_by: user.id
          });

          if (venueResult.error) {
            // Continue with event creation even if venue creation fails
          }
        }
        // Update eventData to use the custom venue name
        eventData.venue = customVenueName.trim();
      } catch (venueError) {
        // Continue with event creation
      }
    }

    // Note: Speakers and sponsors will be handled separately after event creation
    // using SpeakerService and SponsorService, not as columns in the events table



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



    // Handle sponsor logos - match uploaded images with sponsor data
    if (uploadedFiles.sponsorLogos && uploadedFiles.sponsorLogos.length > 0) {
      sponsors.forEach((sponsor, index) => {
        // Try multiple matching strategies
        let matchingLogo = null;

        // Strategy 1: Match by index (assuming same order)
        if (uploadedFiles.sponsorLogos[index]) {
          matchingLogo = uploadedFiles.sponsorLogos[index];
        }
        // Strategy 2: Match by filename containing index
        if (!matchingLogo) {
          matchingLogo = uploadedFiles.sponsorLogos.find(logo =>
            logo.name && logo.name.includes(`sponsor-logo-${index}`)
          );
        }
        // Strategy 3: Use first available logo if only one sponsor
        if (!matchingLogo && sponsors.length === 1 && uploadedFiles.sponsorLogos.length === 1) {
          matchingLogo = uploadedFiles.sponsorLogos[0];
        }

        if (matchingLogo && matchingLogo.url) {
          sponsor.logo_url = matchingLogo.url;
        }
      });
    }

    // Handle speaker photos - match uploaded images with speaker data
    if (uploadedFiles.speakerPhotos && uploadedFiles.speakerPhotos.length > 0) {
      speakers.forEach((speaker, index) => {
        const speakerName = `${speaker.first_name} ${speaker.last_name}`;

        // Try multiple matching strategies
        let matchingPhoto = null;

        // Strategy 1: Match by index (assuming same order)
        if (uploadedFiles.speakerPhotos[index]) {
          matchingPhoto = uploadedFiles.speakerPhotos[index];
        }
        // Strategy 2: Match by filename containing index
        if (!matchingPhoto) {
          matchingPhoto = uploadedFiles.speakerPhotos.find(photo =>
            photo.name && photo.name.includes(`speaker-photo-${index}`)
          );
        }
        // Strategy 3: Use first available photo if only one speaker
        if (!matchingPhoto && speakers.length === 1 && uploadedFiles.speakerPhotos.length === 1) {
          matchingPhoto = uploadedFiles.speakerPhotos[0];
        }

        if (matchingPhoto && matchingPhoto.url) {
          speaker.photo_url = matchingPhoto.url;
        }
      });
    }


    // Handle event programmes - use link if provided, otherwise use uploaded files
    if (data.eventProgrammeLink && data.eventProgrammeLink.trim()) {
      eventData.event_programmes_url = data.eventProgrammeLink.trim();
    } else if (uploadedFiles.eventProgrammes && uploadedFiles.eventProgrammes.length > 0) {
      eventData.event_programmes_url = uploadedFiles.eventProgrammes.map(f => f.url).join(',');
    }

    // Handle event kits - use link if provided, otherwise use uploaded files
    if (data.eventKitsLink && data.eventKitsLink.trim()) {
      eventData.event_kits_url = data.eventKitsLink.trim();
    } else if (uploadedFiles.eventKits && uploadedFiles.eventKits.length > 0) {
      eventData.event_kits_url = uploadedFiles.eventKits.map(f => f.url).join(',');
    }



    // Store event data in session storage for the next step

    sessionStorage.setItem('pending-event-data', JSON.stringify(eventData));

    sessionStorage.setItem('pending-event-files', JSON.stringify(uploadedFiles));

    // Store speakers and sponsors with their image URLs for later processing
    const speakersWithImages = speakers.map(speaker => ({
      ...speaker,
      photo_url: speaker.photo_url || ''
    }));

    const sponsorsWithImages = sponsors.map(sponsor => ({
      ...sponsor,
      logo_url: sponsor.logo_url || ''
    }));


    sessionStorage.setItem('pending-event-speakers', JSON.stringify(speakersWithImages));
    sessionStorage.setItem('pending-event-sponsors', JSON.stringify(sponsorsWithImages));

    // Ask user if event will use certificates using sweetalert2
    const wantsCertificate = await promptCertificateUsage();

    if (wantsCertificate) {
      // Navigate to certificate design step
      navigate('/design-certificate');
    } else {
      // User opted out - clear any existing certificate config from sessionStorage
      // to ensure no certificate config is saved to database later
      try {
        sessionStorage.removeItem('pending-certificate-config');
      } catch (e) {
        console.warn('Failed to clear certificate config:', e);
      }
      // Navigate to survey/evaluation creation step
      navigate('/create-survey');
    }

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

    setValue('registrationDeadlineDate', '');

    setValue('sponsors', '');

    setValue('guestSpeakers', '');

    // Clear speakers
    setSpeakers([]);
    setShowAddSpeaker(false);
    // Clear sponsors
    setSponsors([]);
    setShowAddSponsor(false);
  };



  const pageTitle = 'Create Event';
  const pageSubtitle = 'Set up your event details and upload necessary materials to get started';
  const submitButtonLabel = 'Create Event';

  if (submitError) {
    return (
      <div className="mt-6 max-w-3xl mx-auto w-full bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
        {submitError}
      </div>
    );
  }

  if (submitMessage) {
    return (
      <div className="mt-6 max-w-3xl mx-auto w-full bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
        {submitMessage}
      </div>
    );
  }

  return (

    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">

      <div className="w-full max-w-7xl mx-auto">

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

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800">

              {pageTitle}

            </h1>

          </div>





          {/* Progress Indicator */}
          <div className="mt-8 mb-8">
            <div className="flex items-center justify-center space-x-4 sm:space-x-8">
              {/* Step 1: Create Event - Current Step */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                  1
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-semibold text-blue-600">Create Event</p>
                  <p className="text-xs text-slate-500 mt-1">Current Step</p>
                </div>
              </div>

              {/* Connector Line */}
              <div className="hidden sm:block w-16 h-0.5 bg-slate-300"></div>

              {/* Step 2: Design Certificate - Next Step */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-semibold text-slate-500">Design Certificate</p>
                  <p className="text-xs text-slate-400 mt-1">Next Step</p>
                </div>
              </div>

              {/* Connector Line */}
              <div className="hidden sm:block w-16 h-0.5 bg-slate-300"></div>

              {/* Step 3: Create Evaluation - Next Step */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-semibold text-slate-500">Create Evaluation</p>
                  <p className="text-xs text-slate-400 mt-1">Next Step</p>
                </div>
              </div>
            </div>
          </div>

          {/* Draft Management Info */}

          <div className="mt-6 flex items-center justify-center space-x-6">

            <div className="flex items-center space-x-3">

              <span className="text-base font-medium text-slate-600">Auto-save</span>

              <button

                onClick={toggleAutoSave}

                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${autoSaveEnabled ? 'bg-green-500' : 'bg-gray-400'

                  }`}

              >

                <div

                  className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white transition-transform ${autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'

                    }`}


                >

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

            <div className="p-4 sm:p-6">

              <FileDropzone

                label="Event Banner"

                name="bannerFile"

                accept=".png,.jpg,.jpeg"

                onFileChange={() => { }}

                onUpload={(results) => handleFileUpload('banner', results)}

                uploadType="banner"

                maxSizeMB={1024}

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

            <div className="p-4 sm:p-6">

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

                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-lg transition-all duration-200 placeholder-slate-400 ${errors.title ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'

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

                    <div className={`${errors.rationale ? 'ring-2 ring-red-500 rounded-xl' : ''}`}>
                      <RichTextEditorErrorBoundary
                        value={field.value || ''}
                        onChange={(html) => field.onChange(html)}
                        placeholder="Describe your event and its purpose"
                        errorClass={errors.rationale ? 'border-red-300' : 'border-slate-200'}
                      >
                        <Suspense fallback={
                          <textarea
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="Describe your event and its purpose"
                            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400 min-h-[150px] resize-vertical ${errors.rationale ? 'border-red-300' : 'border-slate-200'}`}
                            rows={6}
                          />
                        }>
                          <RichTextEditor
                            value={field.value || ''}
                            onChange={(html) => field.onChange(html)}
                            placeholder="Describe your event and its purpose"
                            className={errors.rationale ? 'border-red-300' : ''}
                          />
                        </Suspense>
                      </RichTextEditorErrorBoundary>
                    </div>

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

                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${errors.startDate ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'

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

                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${errors.endDate ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'

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

                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${errors.startTime ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'

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

                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${errors.endTime ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'

                          }`}

                      />

                    )}

                  />

                  {errors.endTime && (


                    <p className="text-sm text-red-600">{errors.endTime.message}</p>

                  )}

                </div>

              </div>

              {/* Check-in Window Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Check-in Window Settings</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Check-in Before Event (minutes)
                    </label>
                    <Controller
                      name="checkInBeforeMinutes"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="0"
                          max="480"
                          placeholder="60"
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${errors.checkInBeforeMinutes ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                            }`}
                        />
                      )}
                    />
                    {errors.checkInBeforeMinutes && (
                      <p className="text-sm text-red-600">{errors.checkInBeforeMinutes.message}</p>
                    )}
                    <p className="text-xs text-slate-500">How many minutes before the event starts can users check in?</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Check-in During Event (minutes)
                    </label>
                    <Controller
                      name="checkInDuringMinutes"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          min="0"
                          max="240"
                          placeholder="30"
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${errors.checkInDuringMinutes ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                            }`}
                        />
                      )}
                    />
                    {errors.checkInDuringMinutes && (
                      <p className="text-sm text-red-600">{errors.checkInDuringMinutes.message}</p>
                    )}
                    <p className="text-xs text-slate-500">How many minutes after the event starts can users still check in?</p>
                  </div>
                </div>

                {/* Check-in Window Preview */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">Check-in Window Preview</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>Event: {watch('startDate')} at {watch('startTime')}</p>
                    <p>Check-in opens: {watch('checkInBeforeMinutes') || 60} minutes before event</p>
                    <p>Check-in closes: {watch('checkInDuringMinutes') || 30} minutes after event starts</p>
                  </div>
                </div>

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
                    <div className="space-y-3">
                      <select
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value);
                          setShowOtherVenue(value === 'other');
                          if (value !== 'other') {
                            setCustomVenueName('');
                          }
                        }}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${errors.venue ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                          }`}
                      >
                        <option value="">Select a venue...</option>
                        {venues.map((venue) => (
                          <option key={venue.id} value={venue.name}>
                            {venue.name}
                          </option>
                        ))}
                        <option value="other">Other (specify below)</option>
                      </select>

                      {showOtherVenue && (
                        <input
                          type="text"
                          placeholder="Enter custom venue name"
                          value={customVenueName}
                          onChange={(e) => {
                            setCustomVenueName(e.target.value);
                            field.onChange(e.target.value); // Update the form field with custom venue
                          }}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                        />
                      )}
                    </div>
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

                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400 ${errors.maxParticipants ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'

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
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Sponsors & Partners</h3>
                    <p className="text-sm text-slate-600">Add detailed sponsor information</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addSponsor}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Sponsor</span>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {sponsors.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-slate-500 text-lg">No sponsors added yet</p>
                  <p className="text-slate-400">Click "Add Sponsor" to get started</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sponsors.map((sponsor, index) => (
                    <div key={sponsor.id} className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-slate-800">
                          Sponsor #{index + 1}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveSponsor(index, index - 1)}
                              className="p-1 text-slate-500 hover:text-blue-600"
                              title="Move up"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                          )}
                          {index < sponsors.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveSponsor(index, index + 1)}
                              className="p-1 text-slate-500 hover:text-blue-600"
                              title="Move down"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeSponsor(index)}
                            className="p-1 text-red-500 hover:text-red-700"
                            title="Remove sponsor"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Logo Upload - Moved to top */}
                      <div className="mb-4">
                        <FileDropzone
                          label="Sponsor Logo"
                          name={`sponsor-logo-${index}`}
                          accept=".png,.jpg,.jpeg"
                          onFileChange={() => { }}
                          onUpload={(results) => handleFileUpload('logo', results)}
                          uploadType="logo"
                          maxSizeMB={1024}
                          control={control}
                          uploadedFiles={uploadedFiles.sponsorLogos || []}
                          onRemoveFile={(fileId) => handleRemoveFile('logo', fileId)}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Organization Name */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name *</label>
                          <input
                            type="text"
                            placeholder="Company Name, Organization"
                            value={sponsor.name}
                            onChange={(e) => updateSponsor(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>

                        {/* Contact Person */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={sponsor.contact_person}
                            onChange={(e) => updateSponsor(index, 'contact_person', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                          <input
                            type="email"
                            placeholder="contact@company.com"
                            value={sponsor.email}
                            onChange={(e) => updateSponsor(index, 'email', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            placeholder="09123456789"
                            value={sponsor.phone}
                            onChange={(e) => {
                              const formatted = formatPhilippinePhone(e.target.value);
                              updateSponsor(index, 'phone', formatted);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          {sponsor.phone && !validatePhilippinePhone(sponsor.phone) && (
                            <p className="text-xs text-red-500 mt-1">
                              Please enter a valid Philippine mobile number (09123456789)
                            </p>
                          )}
                        </div>

                        {/* Address */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                          <textarea
                            placeholder="Company address..."
                            value={sponsor.address}
                            onChange={(e) => updateSponsor(index, 'address', e.target.value)}
                            rows="2"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical"
                          />
                        </div>

                        {/* Contribution */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Contribution/Support</label>
                          <textarea
                            placeholder="Description of what the sponsor is contributing (monetary, equipment, services, etc.)..."
                            value={sponsor.contribution}
                            onChange={(e) => updateSponsor(index, 'contribution', e.target.value)}
                            rows="3"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>



          {/* Guest Speakers Section */}

          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">

            <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">Guest Speakers</h3>
                    <p className="text-sm text-slate-600">Add detailed speaker information</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addSpeaker}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition-colors duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Speaker</span>
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {speakers.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-slate-500 text-lg">No speakers added yet</p>
                  <p className="text-slate-400">Click "Add Speaker" to get started</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {speakers.map((speaker, index) => (
                    <div key={speaker.id} className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-slate-800">
                          Speaker #{index + 1}
                          {speaker.is_keynote && (
                            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              Keynote
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveSpeaker(index, index - 1)}
                              className="p-1 text-slate-500 hover:text-blue-600"
                              title="Move up"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                          )}
                          {index < speakers.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveSpeaker(index, index + 1)}
                              className="p-1 text-slate-500 hover:text-blue-600"
                              title="Move down"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeSpeaker(index)}
                            className="p-1 text-red-500 hover:text-red-700"
                            title="Remove speaker"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Photo Upload - Moved to top */}
                      <div className="mb-4">
                        <FileDropzone
                          label="Speaker Photo"
                          name={`speaker-photo-${index}`}
                          accept=".png,.jpg,.jpeg"
                          onFileChange={() => { }}
                          onUpload={(results) => handleFileUpload('photo', results)}
                          uploadType="photo"
                          maxSizeMB={1024}
                          control={control}
                          uploadedFiles={uploadedFiles.speakerPhotos || []}
                          onRemoveFile={(fileId) => handleRemoveFile('photo', fileId)}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Title/Prefix */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Title/Prefix</label>
                          <select
                            value={speaker.prefix || ''}
                            onChange={(e) => updateSpeaker(index, 'prefix', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select...</option>
                            <option value="Dr.">Dr.</option>
                            <option value="Prof.">Prof.</option>
                            <option value="Mr.">Mr.</option>
                            <option value="Mrs.">Mrs.</option>
                            <option value="Ms.">Ms.</option>
                            <option value="Miss">Miss</option>
                            <option value="Engr.">Engr.</option>
                            <option value="Atty.">Atty.</option>
                            <option value="Rev.">Rev.</option>
                            <option value="Hon.">Hon.</option>
                          </select>
                        </div>

                        {/* First Name */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                          <input
                            type="text"
                            placeholder="John"
                            value={speaker.first_name}
                            onChange={(e) => updateSpeaker(index, 'first_name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>

                        {/* Last Name */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                          <input
                            type="text"
                            placeholder="Doe"
                            value={speaker.last_name}
                            onChange={(e) => updateSpeaker(index, 'last_name', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                        </div>

                        {/* Middle Initial */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Middle Initial</label>
                          <input
                            type="text"
                            placeholder="A"
                            maxLength="2"
                            value={speaker.middle_initial}
                            onChange={(e) => {
                              let value = e.target.value.toUpperCase();
                              // Only add period if user is typing (value has a letter at the end, not a period)
                              // This allows the period to be deleted but will reappear when typing
                              if (value && value.length > 0) {
                                const lastChar = value[value.length - 1];
                                // If last character is a letter (not period, not space), add period
                                if (/[A-Za-z]/.test(lastChar)) {
                                  value = value + '.';
                                }
                              }
                              updateSpeaker(index, 'middle_initial', value);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Affix */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Affix</label>
                          <select
                            value={speaker.affix || ''}
                            onChange={(e) => updateSpeaker(index, 'affix', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select...</option>
                            <option value="Jr.">Jr.</option>
                            <option value="Sr.">Sr.</option>
                            <option value="II">II</option>
                            <option value="III">III</option>
                            <option value="IV">IV</option>
                            <option value="V">V</option>
                          </select>
                        </div>

                        {/* Keynote Speaker Checkbox */}
                        <div className="flex items-center">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={speaker.is_keynote}
                              onChange={(e) => updateSpeaker(index, 'is_keynote', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Keynote Speaker</span>
                          </label>
                        </div>

                        {/* Designation */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Designation/Title</label>
                          <input
                            type="text"
                            placeholder="CEO, Professor, Lead Developer"
                            value={speaker.designation}
                            onChange={(e) => updateSpeaker(index, 'designation', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Organization */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
                          <input
                            type="text"
                            placeholder="Company, University, Institution"
                            value={speaker.organization}
                            onChange={(e) => updateSpeaker(index, 'organization', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                          <input
                            type="email"
                            placeholder="speaker@example.com"
                            value={speaker.email}
                            onChange={(e) => updateSpeaker(index, 'email', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            placeholder="09123456789"
                            value={speaker.phone}
                            onChange={(e) => {
                              const formatted = formatPhilippinePhone(e.target.value);
                              updateSpeaker(index, 'phone', formatted);
                            }}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          {speaker.phone && !validatePhilippinePhone(speaker.phone) && (
                            <p className="text-xs text-red-500 mt-1">
                              Please enter a valid Philippine mobile number (09123456789)
                            </p>
                          )}
                        </div>

                        {/* Bio */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                          <textarea
                            placeholder="Brief biography of the speaker..."
                            value={speaker.bio}
                            onChange={(e) => updateSpeaker(index, 'bio', e.target.value)}
                            rows="3"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

              {/* Event Kits */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Event Kits</label>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEventKitsMode('upload');
                        setValue('eventKitsLink', ''); // Clear link when switching to upload
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${eventKitsMode === 'upload'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEventKitsMode('link');
                        // Clear uploaded files when switching to link
                        setUploadedFiles(prev => ({ ...prev, eventKits: [] }));
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${eventKitsMode === 'link'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                    >
                      Link
                    </button>
                  </div>
                </div>

                {eventKitsMode === 'upload' ? (
                  <FileDropzone
                    label=""
                    name="eventKitsFile"
                    accept=".pdf"
                    onFileChange={() => { }}
                    onUpload={(results) => handleFileUpload('event-kits', results)}
                    uploadType="event-kits"
                    multiple
                    maxSizeMB={1024}
                    control={control}
                    error={errors.eventKitsFile}
                    uploadedFiles={uploadedFiles.eventKits || []}
                    onRemoveFile={(fileId) => handleRemoveFile('event-kits', fileId)}
                  />
                ) : (
                  <div className="space-y-2">
                    <Controller
                      name="eventKitsLink"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="url"
                          placeholder="https://example.com/event-kits.pdf"
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${errors.eventKitsLink ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                            }`}
                        />
                      )}
                    />
                    {errors.eventKitsLink && (
                      <p className="text-sm text-red-600">{errors.eventKitsLink.message}</p>
                    )}
                    <p className="text-xs text-slate-500">Enter a direct link to the PDF file</p>
                  </div>
                )}
              </div>

              {/* Event Programme */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Event Programme</label>
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEventProgrammeMode('upload');
                        setValue('eventProgrammeLink', ''); // Clear link when switching to upload
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${eventProgrammeMode === 'upload'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEventProgrammeMode('link');
                        // Clear uploaded files when switching to link
                        setUploadedFiles(prev => ({ ...prev, eventProgrammes: [] }));
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${eventProgrammeMode === 'link'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                    >
                      Link
                    </button>
                  </div>
                </div>

                {eventProgrammeMode === 'upload' ? (
                  <FileDropzone
                    label=""
                    name="eventProgrammeFile"
                    accept=".pdf"
                    onFileChange={() => { }}
                    onUpload={(results) => handleFileUpload('event-programmes', results)}
                    uploadType="event-programmes"
                    multiple
                    maxSizeMB={1024}
                    control={control}
                    error={errors.eventProgrammeFile}
                    uploadedFiles={uploadedFiles.eventProgrammes || []}
                    onRemoveFile={(fileId) => handleRemoveFile('event-programmes', fileId)}
                  />
                ) : (
                  <div className="space-y-2">
                    <Controller
                      name="eventProgrammeLink"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="url"
                          placeholder="https://example.com/event-programme.pdf"
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 ${errors.eventProgrammeLink ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'
                            }`}
                        />
                      )}
                    />
                    {errors.eventProgrammeLink && (
                      <p className="text-sm text-red-600">{errors.eventProgrammeLink.message}</p>
                    )}
                    <p className="text-xs text-slate-500">Enter a direct link to the PDF file</p>
                  </div>
                )}
              </div>

            </div>

          </div>


          {/* Action Button */}

          <div className="flex justify-center pt-8">
            <button
              type="submit"
              disabled={Object.keys(errors).length > 0}
              className={`w-full px-6 py-3 rounded-xl text-lg font-semibold shadow-md transition-all duration-200 flex items-center justify-center space-x-2 ${Object.keys(errors).length === 0
                ? 'bg-blue-900 text-white hover:bg-blue-800'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
            >
              {submitButtonLabel}
            </button>
          </div>

        </form>

      </div>

    </section >

  );

};