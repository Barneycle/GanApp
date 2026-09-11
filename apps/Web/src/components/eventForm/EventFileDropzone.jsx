import React, { useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { FileText, Image as ImageIcon, LoaderCircle, Plus, Trash2, Upload } from 'lucide-react';
import { uploadStorageFile } from '../../utils/uploadWithProgress';
import { notify } from '../Toast';
import { ProgressBar } from '../loading/ProgressBar';
import { FieldError, FieldLabel } from '../form/Field';
import { errorCopy } from '../../utils/errorCopy';
import { compressImage } from '../../utils/compressImage';

export const EventFileDropzone = ({ label, name, multiple = false, accept, onFileChange, onUpload, uploadType, maxSizeMB = 1024, error, control, uploadedFiles = [], onRemoveFile }) => {

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

            const compressed = await compressImage(file);
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
            const filePath = `banners/${fileName}`;
            const publicUrl = await uploadTracked('event-banners', filePath, compressed);



            const fileResult = {

              file: compressed,

              filename: compressed.name,

              size: compressed.size,

              type: compressed.type,

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



            const fileResults = fileArray.map((file) => {

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

          const fileResults = fileArray.map((file) => {

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

                                    className="w-full h-full object-cover" loading="lazy" decoding="async" />

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
