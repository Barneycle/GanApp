import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';

import { useNavigate } from 'react-router-dom';

import { useForm, Controller } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { z } from 'zod';

import { EventService } from '../../services/eventService';

import { SpeakerService } from '../../services/speakerService';
import { SponsorService } from '../../services/sponsorService';
import { VenueService } from '../../services/venueService';
import { supabase } from '../../lib/supabaseClient';
import { uploadStorageFile } from '../../utils/uploadWithProgress';

import { useAuth } from '../../contexts/AuthContext';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, FileText, Image as ImageIcon, LoaderCircle, Plus, Trash2, Upload } from 'lucide-react';
import { confirmDialog, notify, statusDialog, statusError } from '../Toast';
import { ErrorState } from '../ErrorState';
import { ProgressBar } from '../loading/ProgressBar';
import { promptCertificateUsage } from '../../utils/eventCreationDialogs';
import { FIELD_LIMITS, isValidPhMobile, normalizePhMobile } from '../../utils/formFields';
import { CharCount, FieldError, FieldLabel } from '../form/Field';
import { errorCopy, toErrorCopy } from '../../utils/errorCopy';

// Lazy load RichTextEditor to prevent app-wide crashes
const RichTextEditor = lazy(() => import('../RichTextEditor'));

// Zod validation schema

const createEventSchema = z.object({

  title: z.string().min(1, 'Event title is required').max(FIELD_LIMITS.eventTitle, `Title must be ${FIELD_LIMITS.eventTitle} characters or less`),

  rationale: z.string().optional(),

  startDate: z.string().min(1, 'Start date is required'),

  endDate: z.string().min(1, 'End date is required'),

  startTime: z.string().min(1, 'Start time is required'),

  endTime: z.string().min(1, 'End time is required'),

  venue: z.string().min(1, 'Venue is required'),

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

const setAtIndex = (list, index, value) => {
  const next = Array.isArray(list) ? [...list] : [];
  while (next.length <= index) next.push(null);
  next[index] = value;
  return next;
};

const removeAtIndex = (list, index) => {
  const next = Array.isArray(list) ? [...list] : [];
  next.splice(index, 1);
  return next;
};

const moveAtIndex = (list, fromIndex, toIndex) => {
  const next = Array.isArray(list) ? [...list] : [];
  const size = Math.max(next.length, fromIndex + 1, toIndex + 1);
  while (next.length < size) next.push(null);
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
};

const entryImageFiles = (uploaded, url, path, id, filename, bucket) => {
  if (uploaded) return [uploaded];
  if (url) {
    return [{
      id,
      filename,
      url,
      path: path || null,
      type: 'image/jpeg',
      uploaded: true,
      bucket,
    }];
  }
  return [];
};

const CORE_STEPS = [
  { id: 'basics', label: 'Basics' },
  { id: 'schedule', label: 'Schedule & Venue' },
  { id: 'description', label: 'Description' },
  { id: 'review', label: 'Review' },
];

const stripHtml = (html) =>
  String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function OptionalOptIn({ label, description, onAdd }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3.5 text-left transition-colors hover:border-blue-300 hover:bg-white"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Plus className="h-4 w-4 shrink-0 text-slate-500" />
          {label}
        </span>
        {description ? <span className="mt-0.5 block text-xs text-slate-500">{description}</span> : null}
      </span>
      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
        Optional
      </span>
    </button>
  );
}

const FileDropzone = ({ label, name, multiple = false, accept, onFileChange, onUpload, uploadType, maxSizeMB = 1024, error, control, uploadedFiles = [], onRemoveFile }) => {

  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadTracked = async (bucket, path, file, fileIndex = 0, fileCount = 1) => {
    const { publicUrl } = await uploadStorageFile({
      bucket,
      path,
      file,
      onProgress: (percent) => {
        setUploadProgress(((fileIndex + percent / 100) / fileCount) * 100);
      },
    });
    return publicUrl;
  };



  const handleFiles = async (files) => {

    const fileArray = multiple ? Array.from(files) : Array.from(files).slice(0, 1);



    if (onUpload && uploadType) {

      setUploading(true);

      setUploadProgress(0);



      try {

        // File validation

        for (const file of fileArray) {

          if (file.size > maxSizeMB * 1024 * 1024) {

            notify('error', errorCopy({
              what: "That file is too large.",
              why: `${file.name} is over ${maxSizeMB}MB.`,
              action: `Choose a file under ${maxSizeMB}MB.`,
            }));

            setUploading(false);

            return;

          }

        }



        // Handle banner upload

        if (uploadType === 'banner') {

          try {

            const file = fileArray[0];

            if (!file.type.startsWith('image/')) {
              throw new Error('Banner must be an image file');
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `banners/${fileName}`;
            const publicUrl = await uploadTracked('event-banners', filePath, file);



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

            const bucketName = 'event-kits';

            const results = [];



            for (let index = 0; index < fileArray.length; index++) {

              const file = fileArray[index];

              try {

                const fileExt = file.name.split('.').pop();

                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                const filePath = `kits/${fileName}`;



                const publicUrl = await uploadTracked(bucketName, filePath, file, index, fileArray.length);



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

            // Materials upload failed



            const fileResults = fileArray.map((file, index) => {

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

                const fileExt = file.name.split('.').pop();

                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                const filePath = `logos/${fileName}`;



                const publicUrl = await uploadTracked(bucketName, filePath, file, index, fileArray.length);



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



            const fileResults = fileArray.map((file, _index) => ({

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

            const bucketName = 'speaker-photos';

            const results = [];



            for (let index = 0; index < fileArray.length; index++) {

              const file = fileArray[index];

              try {

                const fileExt = file.name.split('.').pop();

                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                const filePath = `photos/${fileName}`;



                const publicUrl = await uploadTracked(bucketName, filePath, file, index, fileArray.length);



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



            const fileResults = fileArray.map((file, _index) => ({

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

            const bucketName = 'event-kits';

            const results = [];



            for (let index = 0; index < fileArray.length; index++) {

              const file = fileArray[index];

              try {

                const fileExt = file.name.split('.').pop();

                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                const filePath = `kits/${fileName}`;



                const publicUrl = await uploadTracked(bucketName, filePath, file, index, fileArray.length);



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



            const fileResults = fileArray.map((file, _index) => ({

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

            const bucketName = 'event-programmes';

            const results = [];



            for (let index = 0; index < fileArray.length; index++) {

              const file = fileArray[index];

              try {

                const fileExt = file.name.split('.').pop();

                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

                const filePath = `programmes/${fileName}`;



                const publicUrl = await uploadTracked(bucketName, filePath, file, index, fileArray.length);



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



            const fileResults = fileArray.map((file, _index) => ({

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

        notify('error', toErrorCopy(error, 'generic'));

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

      {label ? <FieldLabel>{label}</FieldLabel> : null}



      {uploading && (
        <ProgressBar className="mb-3" value={uploadProgress} max={100} label="Uploading" />
      )}



      <Controller

        name={name}

        control={control}

        render={({ field: { onChange, _value } }) => (

          <div

            className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 transition-colors sm:min-h-[160px] ${dragActive
              ? 'border-blue-500 bg-blue-50'
              : error
                ? 'border-red-300 bg-red-50'
                : uploadedFiles.length > 0
                  ? 'border-blue-200 bg-slate-50 hover:border-blue-400'
                  : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
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
                    e.target.value = '';

                  } catch (error) {

                    // handleFiles failed

                  }

                }

              }}

            />



            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <LoaderCircle className="h-6 w-6 animate-spin text-blue-900" />
                <p className="text-sm">Uploading…</p>
              </div>
            ) : uploadedFiles.length > 0 ? (
              <>
                <Plus className="mb-2 h-8 w-8 text-blue-900" />
                <p className="mb-1 text-center text-sm font-medium text-slate-800">
                  {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
                </p>
                <p className="text-center text-sm text-slate-500">
                  {multiple ? 'Click or drop to add more' : 'Click or drop to replace'}
                </p>
              </>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-slate-400" />
                <p className="mb-1 text-center text-sm font-medium text-slate-700">
                  {multiple ? 'Drop files here, or click to select' : 'Drop a file here, or click to select'}
                </p>
                <p className="text-center text-sm text-slate-500">Max {maxSizeMB}MB</p>
              </>
            )}



            {/* Display uploaded files with remove buttons */}

            {uploadedFiles.length > 0 && !uploading && (

              <div className="mt-4 w-full">

                {/* Warning for restored files without File objects */}

                {uploadedFiles.some(file => !file.file || !(file.file instanceof File)) && (

                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-amber-800">
                      Some files were restored from a previous session. Re-upload them if you need the originals.
                    </p>
                  </div>

                )}



                <div className="text-sm font-medium text-slate-700 mb-2">

                  Uploaded Files ({uploadedFiles.length}):

                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto">

                  {uploadedFiles.map((file, idx) => (

                    <div key={file.id || idx} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">

                      <div className="flex items-center space-x-3 flex-1 min-w-0">

                        {/* File Preview */}

                        {(() => {

                          try {

                            const previewSrc = file.file instanceof File
                              ? URL.createObjectURL(file.file)
                              : file.url;
                            if (previewSrc && (file.type?.startsWith('image/') || file.url)) {

                              return (

                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">

                                  <img

                                    src={previewSrc}

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
                                  <ImageIcon className="h-5 w-5" />
                                ) : (
                                  <FileText className="h-5 w-5" />
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

                          className="ml-2 rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-700"
                          title="Remove file"
                        >
                          <Trash2 className="h-4 w-4" />

                        </button>

                      )}

                    </div>

                  ))}

                </div>



                {/* Add more files hint */}

                {multiple && (

                  <div className="mt-3 text-center">

                    <p className="text-xs text-slate-500">You can add more files by clicking or dropping them here.</p>

                  </div>

                )}

              </div>

            )}

          </div>

        )}

      />

      {error ? <FieldError error={error.message} /> : null}

    </div>

  );

};



export const CreateEvent = () => {
  const navigate = useNavigate();

  const { user, isAuthenticated } = useAuth();

  const [submitMessage, _setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

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
  const [_showAddSpeaker, setShowAddSpeaker] = useState(false);

  // Sponsors state
  const [sponsors, setSponsors] = useState([]);
  const [_showAddSponsor, setShowAddSponsor] = useState(false);

  const [coreStep, setCoreStep] = useState(0);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showSponsors, setShowSponsors] = useState(false);
  const [showSpeakers, setShowSpeakers] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);

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

    formState: { errors },

    watch,

    setValue,
    trigger,

  } = useForm({

    resolver: zodResolver(createEventSchema),

    mode: 'onTouched',
    reValidateMode: 'onBlur',
    criteriaMode: 'firstError',

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



  const handleFileUpload = (uploadType, results, entryIndex = 0) => {

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

        const file = results[0] || null;
        const previous = uploadedFiles.sponsorLogos?.[entryIndex];
        if (previous?.path && previous?.uploaded && previous?.bucket && previous.path !== file?.path) {
          supabase.storage.from(previous.bucket).remove([previous.path]);
        }

        setUploadedFiles(prev => ({
          ...prev,
          sponsorLogos: setAtIndex(prev.sponsorLogos, entryIndex, file),
        }));
        setSponsors(prev => prev.map((sponsor, i) => (
          i === entryIndex
            ? { ...sponsor, logo_url: file?.url || '', logo_path: file?.path || '' }
            : sponsor
        )));

      } else if (uploadType === 'photo') {

        const file = results[0] || null;
        const previous = uploadedFiles.speakerPhotos?.[entryIndex];
        if (previous?.path && previous?.uploaded && previous?.bucket && previous.path !== file?.path) {
          supabase.storage.from(previous.bucket).remove([previous.path]);
        }

        setUploadedFiles(prev => ({
          ...prev,
          speakerPhotos: setAtIndex(prev.speakerPhotos, entryIndex, file),
        }));
        setSpeakers(prev => prev.map((speaker, i) => (
          i === entryIndex
            ? { ...speaker, photo_url: file?.url || '', photo_path: file?.path || '' }
            : speaker
        )));

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



  const handleRemoveFile = async (uploadType, fileId, entryIndex = null) => {

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

        fileToRemove = uploadedFiles.sponsorLogos?.[entryIndex]
          || uploadedFiles.sponsorLogos?.find(f => f?.id === fileId)
          || (sponsors[entryIndex]?.logo_url
            ? { path: sponsors[entryIndex].logo_path, uploaded: true, bucket: 'sponsor-logos' }
            : null);

        setUploadedFiles(prev => ({
          ...prev,
          sponsorLogos: setAtIndex(prev.sponsorLogos, entryIndex, null),
        }));
        if (entryIndex != null) {
          setSponsors(prev => prev.map((sponsor, i) => (
            i === entryIndex ? { ...sponsor, logo_url: '', logo_path: '' } : sponsor
          )));
        }

      } else if (uploadType === 'photo') {

        fileToRemove = uploadedFiles.speakerPhotos?.[entryIndex]
          || uploadedFiles.speakerPhotos?.find(f => f?.id === fileId)
          || (speakers[entryIndex]?.photo_url
            ? { path: speakers[entryIndex].photo_path, uploaded: true, bucket: 'speaker-photos' }
            : null);

        setUploadedFiles(prev => ({
          ...prev,
          speakerPhotos: setAtIndex(prev.speakerPhotos, entryIndex, null),
        }));
        if (entryIndex != null) {
          setSpeakers(prev => prev.map((speaker, i) => (
            i === entryIndex ? { ...speaker, photo_url: '', photo_path: '' } : speaker
          )));
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

          const { error: _error } = await supabase.storage
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
    const removedPhoto = uploadedFiles.speakerPhotos?.[index];
    if (removedPhoto?.path && removedPhoto?.uploaded && removedPhoto?.bucket) {
      supabase.storage.from(removedPhoto.bucket).remove([removedPhoto.path]);
    }
    setUploadedFiles(prev => ({
      ...prev,
      speakerPhotos: removeAtIndex(prev.speakerPhotos, index),
    }));
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

    setUploadedFiles(prev => ({
      ...prev,
      speakerPhotos: moveAtIndex(prev.speakerPhotos, fromIndex, toIndex),
    }));

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
    const removedLogo = uploadedFiles.sponsorLogos?.[index];
    if (removedLogo?.path && removedLogo?.uploaded && removedLogo?.bucket) {
      supabase.storage.from(removedLogo.bucket).remove([removedLogo.path]);
    }
    setUploadedFiles(prev => ({
      ...prev,
      sponsorLogos: removeAtIndex(prev.sponsorLogos, index),
    }));
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

    setUploadedFiles(prev => ({
      ...prev,
      sponsorLogos: moveAtIndex(prev.sponsorLogos, fromIndex, toIndex),
    }));

    // Update sponsor_order for all sponsors
    const reorderedSponsors = updatedSponsors.map((sponsor, i) => ({
      ...sponsor,
      sponsor_order: i
    }));
    setSponsors(reorderedSponsors);
  };


    const onSubmit = async (data) => {
    if (coreStep !== 3) {
      setCoreStep(Math.min(coreStep + 1, 3));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!canManageEvents) {
      await statusError('Access denied. Only administrators and organizers can create events.', 'generic', {
        confirmText: 'Go home',
      }).then((confirmed) => {
        if (confirmed) navigate('/');
      });
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
        const _speakerName = `${speaker.first_name} ${speaker.last_name}`;

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

    // Ask whether this event will use certificates
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

  // Save as Draft handler - saves event with relaxed validation
  const onSaveDraft = async () => {
    // Get form values directly without validation
    const formValues = watch();
    if (!canManageEvents) {
      const confirmed = await statusError('Access denied. Only administrators and organizers can create events.', 'generic', {
        confirmText: 'Go home',
      });
      if (confirmed) navigate('/');
      return;
    }

    setIsSavingDraft(true);
    setSubmitError('');

    try {
      // Prepare event data with relaxed validation (allow empty required fields)
      const eventData = {
        title: formValues.title || 'Untitled Event',
        rationale: formValues.rationale || '',
        start_date: formValues.startDate || new Date().toISOString().split('T')[0],
        end_date: formValues.endDate || new Date().toISOString().split('T')[0],
        start_time: formValues.startTime || '09:00',
        end_time: formValues.endTime || '17:00',
        venue: formValues.venue || 'TBD',
        max_participants: formValues.maxParticipants ? parseInt(formValues.maxParticipants) : null,
        // Check-in window settings
        check_in_before_minutes: formValues.checkInBeforeMinutes || 60,
        check_in_during_minutes: formValues.checkInDuringMinutes || 30,
        status: 'draft', // Save as draft
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Handle venue creation if "Other" was selected
      if (showOtherVenue && customVenueName.trim()) {
        try {
          const existingVenue = await VenueService.getVenueByName(customVenueName.trim());
          if (!existingVenue.venue) {
            const venueResult = await VenueService.createVenue({
              name: customVenueName.trim(),
              created_by: user.id
            });
            if (venueResult.error) {
              // Continue with event creation even if venue creation fails
            }
          }
          eventData.venue = customVenueName.trim();
        } catch (venueError) {
          // Continue with event creation
        }
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
        sponsors.forEach((sponsor, index) => {
          let matchingLogo = null;
          if (uploadedFiles.sponsorLogos[index]) {
            matchingLogo = uploadedFiles.sponsorLogos[index];
          }
          if (!matchingLogo) {
            matchingLogo = uploadedFiles.sponsorLogos.find(logo =>
              logo.name && logo.name.includes(`sponsor-logo-${index}`)
            );
          }
          if (!matchingLogo && sponsors.length === 1 && uploadedFiles.sponsorLogos.length === 1) {
            matchingLogo = uploadedFiles.sponsorLogos[0];
          }
          if (matchingLogo && matchingLogo.url) {
            sponsor.logo_url = matchingLogo.url;
          }
        });
      }

      // Handle speaker photos
      if (uploadedFiles.speakerPhotos && uploadedFiles.speakerPhotos.length > 0) {
        speakers.forEach((speaker, index) => {
          let matchingPhoto = null;
          if (uploadedFiles.speakerPhotos[index]) {
            matchingPhoto = uploadedFiles.speakerPhotos[index];
          }
          if (!matchingPhoto) {
            matchingPhoto = uploadedFiles.speakerPhotos.find(photo =>
              photo.name && photo.name.includes(`speaker-photo-${index}`)
            );
          }
          if (!matchingPhoto && speakers.length === 1 && uploadedFiles.speakerPhotos.length === 1) {
            matchingPhoto = uploadedFiles.speakerPhotos[0];
          }
          if (matchingPhoto && matchingPhoto.url) {
            speaker.photo_url = matchingPhoto.url;
          }
        });
      }

      // Handle event programmes
      if (formValues.eventProgrammeLink && formValues.eventProgrammeLink.trim()) {
        eventData.event_programmes_url = formValues.eventProgrammeLink.trim();
      } else if (uploadedFiles.eventProgrammes && uploadedFiles.eventProgrammes.length > 0) {
        eventData.event_programmes_url = uploadedFiles.eventProgrammes.map(f => f.url).join(',');
      }

      // Handle event kits
      if (formValues.eventKitsLink && formValues.eventKitsLink.trim()) {
        eventData.event_kits_url = formValues.eventKitsLink.trim();
      } else if (uploadedFiles.eventKits && uploadedFiles.eventKits.length > 0) {
        eventData.event_kits_url = uploadedFiles.eventKits.map(f => f.url).join(',');
      }

      // Create the event in the database
      const eventResult = await EventService.createEvent(eventData);

      if (eventResult.error) {
        await statusError(eventResult.error, 'saveDraft');
        setIsSavingDraft(false);
        return;
      }

      const eventId = eventResult.event?.id;
      if (!eventId) {
        await statusError('Event ID not returned', 'saveDraft');
        setIsSavingDraft(false);
        return;
      }

      // Save speakers if any
      if (speakers && speakers.length > 0) {
        for (const speakerData of speakers) {
          try {
            if (!speakerData.first_name || !speakerData.last_name) {
              continue;
            }

            const speakerToCreate = {
              prefix: speakerData.prefix || '',
              first_name: speakerData.first_name,
              last_name: speakerData.last_name,
              middle_initial: speakerData.middle_initial || '',
              affix: speakerData.affix || '',
              designation: speakerData.designation || '',
              organization: speakerData.organization || '',
              bio: speakerData.bio || '',
              email: speakerData.email || '',
              phone: isValidPhMobile(speakerData.phone) ? normalizePhMobile(speakerData.phone) : '',
              photo_url: speakerData.photo_url && speakerData.photo_url.trim() ? speakerData.photo_url.trim() : ''
            };

            const speakerResult = await SpeakerService.createSpeaker(speakerToCreate);
            if (speakerResult.error) {
              continue;
            }

            await SpeakerService.addSpeakerToEvent(eventId, speakerResult.speaker.id, {
              order: speakerData.speaker_order || 0,
              isKeynote: speakerData.is_keynote || false
            });
          } catch (speakerError) {
            // Continue with other speakers
          }
        }
      }

      // Save sponsors if any
      if (sponsors && sponsors.length > 0) {
        for (const sponsorData of sponsors) {
          try {
            if (!sponsorData.name) {
              continue;
            }

            const sponsorToCreate = {
              name: sponsorData.name,
              contact_person: sponsorData.contact_person || '',
              email: sponsorData.email || '',
              phone: isValidPhMobile(sponsorData.phone) ? normalizePhMobile(sponsorData.phone) : '',
              address: sponsorData.address || '',
              logo_url: sponsorData.logo_url && sponsorData.logo_url.trim() ? sponsorData.logo_url.trim() : '',
              contribution: sponsorData.contribution || ''
            };

            const sponsorResult = await SponsorService.createSponsor(sponsorToCreate);
            if (sponsorResult.error) {
              continue;
            }

            await SponsorService.addSponsorToEvent(eventId, sponsorResult.sponsor.id, {
              order: sponsorData.sponsor_order || 0
            });
          } catch (sponsorError) {
            // Continue with other sponsors
          }
        }
      }

      // Clear session storage draft
      clearSavedFormData();

      await statusDialog({
        title: 'Draft saved',
        message: 'You can keep editing this event from your drafts.',
      });
      navigate(`/edit-event/${eventId}`);

    } catch (error) {
      await statusError(error, 'saveDraft');
      setIsSavingDraft(false);
    }
  };



  // Add a function to manually clear saved data (useful for testing)

  const handleClearDraft = async () => {
    const confirmed = await confirmDialog({
      title: 'Clear this draft?',
      message: 'Saved fields on this page will be reset. This cannot be undone.',
      confirmText: 'Clear draft',
      cancelText: 'Keep it',
      type: 'warning',
    });
    if (!confirmed) return;

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
    setCoreStep(0);
    setShowCheckIn(false);
    setShowSponsors(false);
    setShowSpeakers(false);
    setShowMaterials(false);
  };

  const formValues = watch();
  const hasMaterials = Boolean(
    (uploadedFiles.eventKits && uploadedFiles.eventKits.length > 0)
    || (uploadedFiles.eventProgrammes && uploadedFiles.eventProgrammes.length > 0)
    || (formValues.eventKitsLink && String(formValues.eventKitsLink).trim())
    || (formValues.eventProgrammeLink && String(formValues.eventProgrammeLink).trim())
  );
  const checkInCustomized = Number(formValues.checkInBeforeMinutes) !== 60
    || Number(formValues.checkInDuringMinutes) !== 30;
  const checkInOpen = showCheckIn || checkInCustomized;
  const sponsorsOpen = showSponsors || sponsors.length > 0;
  const speakersOpen = showSpeakers || speakers.length > 0;
  const materialsOpen = showMaterials || hasMaterials;

  const formSections = [
    { id: 'banner', label: 'Banner', step: 0, required: true, complete: Boolean(uploadedFiles.banner) },
    { id: 'title', label: 'Title', step: 0, required: true, complete: Boolean(String(formValues.title || '').trim()) },
    { id: 'schedule', label: 'Schedule', step: 1, required: true, complete: Boolean(formValues.startDate && formValues.endDate && formValues.startTime && formValues.endTime) },
    { id: 'venue', label: 'Venue', step: 1, required: true, complete: Boolean(String(formValues.venue || '').trim()) },
    { id: 'check-in', label: 'Check-in', step: 1, required: false, complete: checkInOpen },
    { id: 'description', label: 'Description', step: 2, required: true, complete: Boolean(stripHtml(formValues.rationale)) },
    { id: 'sponsors', label: 'Sponsors', step: 2, required: false, complete: sponsors.length > 0 },
    { id: 'speakers', label: 'Speakers', step: 2, required: false, complete: speakers.length > 0 },
    { id: 'materials', label: 'Materials', step: 2, required: false, complete: hasMaterials },
  ];
  const completedSectionCount = formSections.filter((section) => section.complete).length;
  const requiredCompleteCount = formSections.filter((section) => section.required && section.complete).length;
  const requiredSectionCount = formSections.filter((section) => section.required).length;

  const jumpToSection = (section) => {
    setCoreStep(section.step);
    if (section.id === 'check-in') setShowCheckIn(true);
    if (section.id === 'sponsors') setShowSponsors(true);
    if (section.id === 'speakers') setShowSpeakers(true);
    if (section.id === 'materials') setShowMaterials(true);
    window.setTimeout(() => {
      document.getElementById(`section-${section.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const goToCoreStep = async (nextStep) => {
    if (nextStep > coreStep) {
      const titleOk = await trigger('title');
      if (!titleOk) {
        setCoreStep(0);
        window.setTimeout(() => {
          document.getElementById('section-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
        return;
      }
      if (nextStep > 1) {
        const scheduleOk = await trigger(['startDate', 'endDate', 'startTime', 'endTime', 'venue']);
        if (!scheduleOk) {
          setCoreStep(1);
          window.setTimeout(() => {
            document.getElementById('section-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
          return;
        }
      }
    }
    setCoreStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };



  const pageTitle = 'Create Event';
  const _pageSubtitle = 'Set up your event details and upload necessary materials to get started';
  const submitButtonLabel = 'Create Event';

  if (!isAuthenticated) {
    return (
      <ErrorState
        error={toErrorCopy('Your session expired. Please sign in.', 'login')}
        context="login"
        onRetry={() => navigate('/login')}
        retryLabel="Sign in"
      />
    );
  }

  if (!canManageEvents) {
    return (
      <ErrorState
        error={toErrorCopy("You don't have access to do that.", 'generic')}
        context="generic"
        onRetry={() => navigate('/')}
        retryLabel="Go home"
      />
    );
  }

  if (submitError) {
    return (
      <ErrorState
        error={submitError}
        context="saveDraft"
        onRetry={() => navigate('/organizer')}
        retryLabel="Back to organizer"
      />
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
      <div className="mx-auto w-full max-w-5xl">
        <div className="relative mb-8">
          <button
            type="button"
            onClick={() => navigate('/organizer')}
            className="absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label="Back to organizer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="mx-auto max-w-xl px-12 text-center sm:px-14">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {pageTitle}
            </h1>
            <p className="mt-1 text-[15px] text-slate-600">
              Fill in the details, then continue to certificate design or evaluation.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-900 text-xs font-semibold text-white">1</span>
              <span className="font-medium text-slate-900">Event</span>
              <span className="h-px w-8 bg-slate-200 sm:w-12" />
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-500">2</span>
              <span className="hidden text-slate-500 sm:inline">Certificate</span>
              <span className="h-px w-8 bg-slate-200 sm:w-12" />
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-500">3</span>
              <span className="hidden text-slate-500 sm:inline">Evaluation</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Auto-save</span>
                <button
                  type="button"
                  onClick={toggleAutoSave}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${autoSaveEnabled ? 'bg-blue-900' : 'bg-slate-300'}`}
                  aria-pressed={autoSaveEnabled}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
                <span className="text-sm text-slate-500">{autoSaveEnabled ? 'On' : 'Off'}</span>
              </div>
              <button
                type="button"
                onClick={handleClearDraft}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                title="Clear saved draft"
              >
                <Trash2 className="h-4 w-4" />
                Clear draft
              </button>
            </div>
          </div>
        </div>











        <div className="sticky top-0 z-20 mb-6 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">
              {completedSectionCount} of {formSections.length} sections complete
            </p>
            <p className="text-xs text-slate-500">
              {requiredCompleteCount} of {requiredSectionCount} required
            </p>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {formSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => jumpToSection(section)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  section.complete
                    ? 'bg-blue-50 text-blue-900'
                    : section.required
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-slate-50 text-slate-500'
                } ${coreStep === section.step ? 'ring-1 ring-blue-200' : ''}`}
              >
                {section.complete
                  ? <Check className="h-3 w-3" />
                  : <Circle className="h-3 w-3" />}
                {section.label}
                {section.required ? null : (
                  <span className="text-[10px] font-normal text-slate-400">opt</span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1 overflow-x-auto sm:justify-center">
            {CORE_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {index > 0 ? <ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 text-slate-300" /> : null}
                <button
                  type="button"
                  onClick={() => goToCoreStep(index)}
                  className={`rounded-md px-2 py-1 text-xs font-medium sm:px-2.5 sm:text-sm ${
                    coreStep === index
                      ? 'bg-blue-900 text-white'
                      : coreStep > index
                        ? 'text-blue-900 hover:bg-blue-50'
                        : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {index + 1}. {step.label}
                </button>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={(event) => {
            if (coreStep !== 3) {
              event.preventDefault();
              goToCoreStep(coreStep + 1);
              return;
            }
            handleSubmit(onSubmit)(event);
          }}
          className="space-y-6 sm:space-y-8"
        >

          {/* Event Banner Section */}
          <div hidden={coreStep !== 0} className="space-y-6 sm:space-y-8">

          <div id="section-banner" className="scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-5 py-4">

              <div className="flex items-center space-x-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-900">

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />

                  </svg>

                </div>

                <div>

                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">Event Banner</h3>

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

          <div id="section-title" className="scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-5 py-4">

              <div className="flex items-center space-x-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-900">

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />

                  </svg>

                </div>

                <div>

                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">Event Title</h3>

                  <p className="text-base text-slate-600">Set the main title for your event</p>

                </div>

              </div>

            </div>

            <div className="p-4 sm:p-6">

              <div className="space-y-2">

                <label className="mb-2 block text-sm font-medium text-slate-700">

                  Event Title <span className="text-red-500">*</span>

                </label>

                <Controller

                  name="title"

                  control={control}

                  render={({ field }) => (

                    <input

                      {...field}

                      type="text"

                      className={`w-full rounded-xl border px-4 py-3 text-slate-800 text-lg transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 placeholder-slate-400 ${errors.title ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'

                        }`}

                      placeholder="Enter your event title"
                      maxLength={FIELD_LIMITS.eventTitle}

                    />

                  )}

                />


                <FieldError error={errors.title?.message} />
                <CharCount value={watch('title') || ''} max={FIELD_LIMITS.eventTitle} />

              </div>

            </div>

          </div>
          </div>



          {/* Basic Information Section */}
          <div hidden={coreStep !== 2} className="space-y-6 sm:space-y-8">

          <div id="section-description" className="scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-5 py-4">

              <div className="flex items-center space-x-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-900">

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

                  </svg>

                </div>

                <div>

                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">Description</h3>

                  <p className="text-sm text-slate-600">What the event is about. Sponsors, speakers, and materials are optional.</p>

                </div>

              </div>

            </div>

            <div className="p-6 space-y-6">

              {/* Rationale */}

              <div className="space-y-2">

                <label className="mb-2 block text-sm font-medium text-slate-700">

                  Event Rationale

                </label>

                <Controller

                  name="rationale"

                  control={control}

                  render={({ field }) => (

                    <div className={`${errors.rationale ? 'ring-2 ring-red-500 rounded-xl' : ''}`}>
                        <Suspense fallback={
                          <textarea
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="Describe your event and its purpose"
                            className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 placeholder-slate-400 min-h-[150px] resize-vertical ${errors.rationale ? 'border-red-300' : 'border-slate-200'}`}
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
                    </div>

                  )}

                />

                <FieldError error={errors.rationale?.message} />

              </div>

            </div>

          </div>

          {/* Sponsors Section */}
          {!sponsorsOpen ? (
            <div id="section-sponsors" className="scroll-mt-28">
              <OptionalOptIn
                label="Add sponsors"
                description="Partners and logos for this event."
                onAdd={() => {
                  setShowSponsors(true);
                  addSponsor();
                }}
              />
            </div>
          ) : (
          <div id="section-sponsors" className="scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">

            <div className="border-b border-slate-200 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-700">Sponsors & Partners</h3>
                    <p className="text-xs text-slate-500">Optional. Add one if this event has partners.</p>
                  </div>
                </div>
                <span className="mr-3 hidden rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200 sm:inline">Optional</span>
                <button
                  type="button"
                  onClick={addSponsor}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-medium text-white hover:bg-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Add sponsor
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {sponsors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                  <p className="text-[15px] text-slate-600">No sponsors yet</p>
                  <p className="mt-1 text-sm text-slate-500">Add one if this event has partners.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sponsors.map((sponsor, index) => (
                    <div key={sponsor.id} className="rounded-xl border border-slate-200 p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-slate-800">
                          Sponsor #{index + 1}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveSponsor(index, index - 1)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-800"
                              title="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                          )}
                          {index < sponsors.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveSponsor(index, index + 1)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-800"
                              title="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeSponsor(index)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                            title="Remove sponsor"
                          >
                            <Trash2 className="h-4 w-4" />
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
                          onUpload={(results) => handleFileUpload('logo', results, index)}
                          uploadType="logo"
                          maxSizeMB={1024}
                          control={control}
                          uploadedFiles={entryImageFiles(
                            uploadedFiles.sponsorLogos?.[index],
                            sponsor.logo_url,
                            sponsor.logo_path,
                            `sponsor-logo-${sponsor.id || index}`,
                            'Logo',
                            'sponsor-logos'
                          )}
                          onRemoveFile={() => handleRemoveFile('logo', null, index)}
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            placeholder="0912 345 6789 or +63..."
                            value={sponsor.phone}
                            onChange={(e) => updateSponsor(index, 'phone', e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {sponsor.phone && !isValidPhMobile(sponsor.phone) && (
                            <p className="text-xs text-red-500 mt-1">
                              Use a Philippine mobile number. Dashes, spaces, and +63 are fine.
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
          )}



          {/* Guest Speakers Section */}
          {!speakersOpen ? (
            <div id="section-speakers" className="scroll-mt-28">
              <OptionalOptIn
                label="Add guest speakers"
                description="Names, photos, and roles for this event."
                onAdd={() => {
                  setShowSpeakers(true);
                  addSpeaker();
                }}
              />
            </div>
          ) : (
          <div id="section-speakers" className="scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">

            <div className="border-b border-slate-200 px-5 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-700">Guest Speakers</h3>
                    <p className="text-xs text-slate-500">Optional. Add one if this event has speakers.</p>
                  </div>
                </div>
                <span className="mr-3 hidden rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200 sm:inline">Optional</span>
                <button
                  type="button"
                  onClick={addSpeaker}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-medium text-white hover:bg-blue-800"
                >
                  <Plus className="h-4 w-4" />
                  Add speaker
                </button>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {speakers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center">
                  <p className="text-[15px] text-slate-600">No speakers yet</p>
                  <p className="mt-1 text-sm text-slate-500">Add one if this event has guest speakers.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {speakers.map((speaker, index) => (
                    <div key={speaker.id} className="rounded-xl border border-slate-200 p-4 sm:p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-slate-800">
                          Speaker #{index + 1}
                          {speaker.is_keynote && (
                            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-900">
                              Keynote
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center space-x-2">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveSpeaker(index, index - 1)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-800"
                              title="Move up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                          )}
                          {index < speakers.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveSpeaker(index, index + 1)}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-800"
                              title="Move down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeSpeaker(index)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                            title="Remove speaker"
                          >
                            <Trash2 className="h-4 w-4" />
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
                          onUpload={(results) => handleFileUpload('photo', results, index)}
                          uploadType="photo"
                          maxSizeMB={1024}
                          control={control}
                          uploadedFiles={entryImageFiles(
                            uploadedFiles.speakerPhotos?.[index],
                            speaker.photo_url,
                            speaker.photo_path,
                            `speaker-photo-${speaker.id || index}`,
                            'Photo',
                            'speaker-photos'
                          )}
                          onRemoveFile={() => handleRemoveFile('photo', null, index)}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Title/Prefix */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Title/Prefix</label>
                          <select
                            value={speaker.prefix || ''}
                            onChange={(e) => updateSpeaker(index, 'prefix', e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Affix */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Affix</label>
                          <select
                            value={speaker.affix || ''}
                            onChange={(e) => updateSpeaker(index, 'affix', e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            placeholder="0912 345 6789 or +63..."
                            value={speaker.phone}
                            onChange={(e) => updateSpeaker(index, 'phone', e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {speaker.phone && !isValidPhMobile(speaker.phone) && (
                            <p className="text-xs text-red-500 mt-1">
                              Use a Philippine mobile number. Dashes, spaces, and +63 are fine.
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
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
          )}



          {/* Event Materials Section */}
          {!materialsOpen ? (
            <div id="section-materials" className="scroll-mt-28">
              <OptionalOptIn
                label="Add event materials"
                description="Kits and programme files or links."
                onAdd={() => setShowMaterials(true)}
              />
            </div>
          ) : (
          <div id="section-materials" className="scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">

            <div className="border-b border-slate-200 px-5 py-3">

              <div className="flex items-center justify-between gap-3">

                <div className="flex items-center space-x-3">

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">

                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />

                    </svg>

                  </div>

                  <div>

                    <h3 className="text-sm font-medium text-slate-700">Event Materials</h3>

                    <p className="text-xs text-slate-500">Optional. Kits, programmes, and related files.</p>

                  </div>

                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">Optional</span>

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
                          className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 ${errors.eventKitsLink ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'
                            }`}
                        />
                      )}
                    />
                    <FieldError error={errors.eventKitsLink?.message} />
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
                          className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 ${errors.eventProgrammeLink ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'
                            }`}
                        />
                      )}
                    />
                    <FieldError error={errors.eventProgrammeLink?.message} />
                    <p className="text-xs text-slate-500">Enter a direct link to the PDF file</p>
                  </div>
                )}
              </div>

            </div>

          </div>
          )}
          </div>



          {/* Event Schedule Section */}
          <div hidden={coreStep !== 1} className="space-y-6 sm:space-y-8">

          <div id="section-schedule" className="scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-5 py-4">

              <div className="flex items-center space-x-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-900">

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />

                  </svg>

                </div>

                <div>

                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">Event Schedule</h3>

                  <p className="text-sm text-slate-600">Set the date and time for your event</p>

                </div>

              </div>

            </div>

            <div className="p-6 space-y-6">

              {/* Date inputs */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                <div className="space-y-2">

                  <label className="mb-2 block text-sm font-medium text-slate-700">

                    Start Date <span className="text-red-500">*</span>

                  </label>

                  <Controller

                    name="startDate"

                    control={control}

                    render={({ field }) => (

                      <input

                        {...field}

                        type="date"

                        className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 ${errors.startDate ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'

                          }`}

                      />

                    )}

                  />

                  <FieldError error={errors.startDate?.message} />

                </div>

                <div className="space-y-2">

                  <label className="mb-2 block text-sm font-medium text-slate-700">

                    End Date <span className="text-red-500">*</span>

                  </label>

                  <Controller

                    name="endDate"

                    control={control}

                    render={({ field }) => (

                      <input

                        {...field}

                        type="date"

                        className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 ${errors.endDate ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'

                          }`}

                      />

                    )}

                  />

                  <FieldError error={errors.endDate?.message} />

                </div>

              </div>



              {/* Time inputs */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                <div className="space-y-2">

                  <label className="mb-2 block text-sm font-medium text-slate-700">

                    Start Time <span className="text-red-500">*</span>

                  </label>

                  <Controller

                    name="startTime"

                    control={control}

                    render={({ field }) => (

                      <input

                        {...field}

                        type="time"

                        className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 ${errors.startTime ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'

                          }`}

                      />

                    )}

                  />

                  <FieldError error={errors.startTime?.message} />

                </div>

                <div className="space-y-2">

                  <label className="mb-2 block text-sm font-medium text-slate-700">

                    End Time <span className="text-red-500">*</span>

                  </label>

                  <Controller

                    name="endTime"

                    control={control}

                    render={({ field }) => (

                      <input

                        {...field}

                        type="time"

                        className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 ${errors.endTime ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'

                          }`}

                      />

                    )}

                  />

                  <FieldError error={errors.endTime?.message} />

                </div>

              </div>

              {/* Check-in Window Settings */}
              <div id="section-check-in" className="scroll-mt-28 space-y-4">
                {!checkInOpen ? (
                  <OptionalOptIn
                    label="Customize check-in window"
                    description="Defaults to 60 minutes before and 30 minutes after the event starts."
                    onAdd={() => setShowCheckIn(true)}
                  />
                ) : (
                  <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-slate-700">Check-in window</h3>
                    <p className="text-xs text-slate-500">Optional. When attendees can check in.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Optional</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
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
                          className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 ${errors.checkInBeforeMinutes ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'
                            }`}
                        />
                      )}
                    />
                    <FieldError error={errors.checkInBeforeMinutes?.message} />
                    <p className="text-xs text-slate-500">How many minutes before the event starts can users check in?</p>
                  </div>

                  <div className="space-y-2">
                    <label className="mb-2 block text-sm font-medium text-slate-700">
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
                          className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 ${errors.checkInDuringMinutes ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'
                            }`}
                        />
                      )}
                    />
                    <FieldError error={errors.checkInDuringMinutes?.message} />
                    <p className="text-xs text-slate-500">How many minutes after the event starts can users still check in?</p>
                  </div>
                </div>

                {/* Check-in Window Preview */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mb-2 text-sm font-medium text-slate-900">Check-in window</h4>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>Event: {watch('startDate')} at {watch('startTime')}</p>
                    <p>Check-in opens: {watch('checkInBeforeMinutes') || 60} minutes before event</p>
                    <p>Check-in closes: {watch('checkInDuringMinutes') || 30} minutes after event starts</p>
                  </div>
                </div>
                  </>
                )}

              </div>

            </div>

          </div>

          {/* Venue Section */}

          <div id="section-venue" className="scroll-mt-28 overflow-hidden rounded-xl border border-slate-200 bg-white">

            <div className="border-b border-slate-200 px-5 py-4">

              <div className="flex items-center space-x-3">

                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-900">

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />

                  </svg>

                </div>

                <div>

                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">Event Venue</h3>

                  <p className="text-sm text-slate-600">Specify where the event will take place</p>

                </div>

              </div>

            </div>

            <div className="p-6 space-y-6">

              <div className="space-y-2">

                <label className="mb-2 block text-sm font-medium text-slate-700">

                  Venue <span className="text-red-500">*</span>

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
                        className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 ${errors.venue ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'
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
                          className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 placeholder-slate-400 ${errors.venue ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'
                            }`}
                        />
                      )}
                    </div>
                  )}
                />

                <FieldError error={errors.venue?.message} />

              </div>




              <div className="space-y-2">

                <label className="mb-2 block text-sm font-medium text-slate-700">

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

                      className={`w-full rounded-xl border px-4 py-3 text-slate-800 transition-all duration-200 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 placeholder-slate-400 ${errors.maxParticipants ? 'border-red-400 focus:ring-red-500' : 'border-slate-200'

                        }`}

                    />

                  )}

                />

                <FieldError error={errors.maxParticipants?.message} />

              </div>

            </div>

          </div>
          </div>



          {/* Review */}
          <div hidden={coreStep !== 3} className="space-y-6 sm:space-y-8">

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">Review</h3>
              <p className="text-sm text-slate-600">Confirm the details below. Use Edit to change a section. Creating the event is next.</p>
            </div>
            <dl className="divide-y divide-slate-100">
              {[
                { sectionId: 'title', label: 'Title', value: String(formValues.title || '').trim() || 'Not set', step: 0 },
                { sectionId: 'banner', label: 'Banner', value: uploadedFiles.banner?.filename || 'None', step: 0 },
                { sectionId: 'schedule', label: 'Schedule', value: `${formValues.startDate || '—'} ${formValues.startTime || ''} → ${formValues.endDate || '—'} ${formValues.endTime || ''}`.trim(), step: 1 },
                { sectionId: 'venue', label: 'Venue', value: String(formValues.venue || '').trim() || 'Not set', step: 1 },
                { sectionId: 'check-in', label: 'Check-in', value: `${formValues.checkInBeforeMinutes ?? 60} min before start, ${formValues.checkInDuringMinutes ?? 30} min after start`, step: 1 },
                { sectionId: 'description', label: 'Description', value: stripHtml(formValues.rationale) || 'Not added', step: 2 },
                { sectionId: 'sponsors', label: 'Sponsors', value: sponsors.map((s) => String(s.name || '').trim()).filter(Boolean).join(', ') || (sponsors.length ? `${sponsors.length} added` : 'None'), step: 2 },
                { sectionId: 'speakers', label: 'Speakers', value: speakers.map((s) => [s.first_name, s.last_name].filter(Boolean).join(' ').trim()).filter(Boolean).join(', ') || (speakers.length ? `${speakers.length} added` : 'None'), step: 2 },
                { sectionId: 'materials', label: 'Materials', value: [
                  uploadedFiles.eventKits?.length ? `${uploadedFiles.eventKits.length} kit file${uploadedFiles.eventKits.length === 1 ? '' : 's'}` : '',
                  String(formValues.eventKitsLink || '').trim() ? 'Kits link' : '',
                  uploadedFiles.eventProgrammes?.length ? `${uploadedFiles.eventProgrammes.length} programme file${uploadedFiles.eventProgrammes.length === 1 ? '' : 's'}` : '',
                  String(formValues.eventProgrammeLink || '').trim() ? 'Programme link' : '',
                ].filter(Boolean).join(' · ') || 'None', step: 2 },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{row.label}</dt>
                    <dd className="mt-0.5 truncate text-sm text-slate-800">{row.value}</dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => jumpToSection({ id: row.sectionId, step: row.step })}
                    className="shrink-0 text-sm font-medium text-blue-900 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </dl>
          </div>

          </div>
          {/* Action Buttons */}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            {coreStep > 0 ? (
              <button
                type="button"
                onClick={() => goToCoreStep(coreStep - 1)}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSavingDraft}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingDraft ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isSavingDraft ? 'Saving draft' : 'Save as draft'}
            </button>
            {coreStep < 3 ? (
              <button
                type="button"
                onClick={() => goToCoreStep(coreStep + 1)}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-blue-900 font-medium text-white transition-colors hover:bg-blue-800"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-blue-900 font-medium text-white transition-colors hover:bg-blue-800"
              >
                {submitButtonLabel}
              </button>
            )}
          </div>

        </form>

      </div>

    </section>

  );

};