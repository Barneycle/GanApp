import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventService } from '../../services/eventService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';

// Sample events data for placeholders
const sampleEvents = [
  {
    id: "550e8400-e29b-41d4-a716-446655440021",
    title: "Tech Conference 2025",
    rationale: "Join industry leaders and tech enthusiasts for a day of insightful talks, networking, and innovation showcases.",
    start_date: "2024-06-15",
    end_date: "2024-06-15",
    start_time: "09:00:00",
    end_time: "17:00:00",
    venue: "Grand Convention Center, Cityville",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "TechCorp" },
      { name: "InnovateX" },
      { name: "Future Solutions" }
    ],
    guest_speakers: [
      { name: "Dr. Jane Smith" },
      { name: "Mr. John Doe" },
      { name: "Prof. Emily Johnson" }
    ]
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440022",
    title: "Music Festival",
    rationale: "Experience the best of live music with top artists from around the world in an unforgettable weekend celebration.",
    start_date: "2024-07-20",
    end_date: "2024-07-22",
    start_time: "14:00:00",
    end_time: "23:00:00",
    venue: "Central Park Amphitheater",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "MusicPro" },
      { name: "Sound Systems Inc" }
    ],
    guest_speakers: [
      { name: "DJ Master" },
      { name: "Rock Star" }
    ]
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440023",
    title: "Startup Pitch Night",
    rationale: "Witness innovative startups present their groundbreaking ideas to investors and industry experts.",
    start_date: "2024-08-10",
    end_date: "2024-08-10",
    start_time: "18:00:00",
    end_time: "22:00:00",
    venue: "Innovation Hub",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "Venture Capital" },
      { name: "Startup Incubator" }
    ],
    guest_speakers: [
      { name: "Angel Investor" },
      { name: "Tech Entrepreneur" }
    ]
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440024",
    title: "AI Summit",
    rationale: "Explore the future of artificial intelligence with leading researchers and industry pioneers.",
    start_date: "2024-09-05",
    end_date: "2024-09-07",
    start_time: "08:00:00",
    end_time: "18:00:00",
    venue: "Tech Conference Center",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "AI Research Lab" },
      { name: "Machine Learning Corp" }
    ],
    guest_speakers: [
      { name: "AI Researcher" },
      { name: "Data Scientist" }
    ]
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440025",
    title: "Art & Design Expo",
    rationale: "Celebrate creativity and innovation in art and design with exhibitions from talented artists worldwide.",
    start_date: "2024-10-15",
    end_date: "2024-10-20",
    start_time: "10:00:00",
    end_time: "20:00:00",
    venue: "Modern Art Gallery",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "Art Foundation" },
      { name: "Creative Studios" }
    ],
    guest_speakers: [
      { name: "Famous Artist" },
      { name: "Design Expert" }
    ]
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440026",
    title: "Business Networking",
    rationale: "Connect with industry professionals and expand your business network in a collaborative environment.",
    start_date: "2024-11-12",
    end_date: "2024-11-12",
    start_time: "17:00:00",
    end_time: "21:00:00",
    venue: "Business Center",
    status: "published",
    banner_url: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop&crop=center",
    sponsors: [
      { name: "Business Network" },
      { name: "Professional Group" }
    ],
    guest_speakers: [
      { name: "Business Leader" },
      { name: "Network Expert" }
    ]
  }
];

// Complete FileDropzone component copied from CreateEvent.jsx
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
          // Handle materials upload
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
          // Handle sponsor logos upload
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
                setUploadProgress(10 + (index / fileArray.length) * 30);
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
                
                setUploadProgress(40 + ((index + 1) / fileArray.length) * 30);
                
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
                
                setUploadProgress(40 + ((index + 1) / fileArray.length) * 30);
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
            console.error('Logo upload failed:', error);
            
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
        } else if (uploadType === 'speaker') {
          // Handle speaker photos upload
          try {
            setUploadProgress(10);
            
            // Validate image files
            for (const file of fileArray) {
              if (!file.type.startsWith('image/')) {
                throw new Error('Speaker photos must be image files');
              }
            }
            
            const bucketName = 'speaker-photos';
            const results = [];
            
            for (let index = 0; index < fileArray.length; index++) {
              const file = fileArray[index];
              try {
                setUploadProgress(10 + (index / fileArray.length) * 30);
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
                
                setUploadProgress(40 + ((index + 1) / fileArray.length) * 30);
                
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
                
                setUploadProgress(40 + ((index + 1) / fileArray.length) * 30);
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
            console.error('Speaker photo upload failed:', error);
            
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
        }
        
      } catch (error) {
        console.error('File handling failed:', error);
        setUploading(false);
        setUploadProgress(0);
      }
    } else if (onFileChange) {
      // Simple file handling without upload
      const fileResults = fileArray.map(file => ({
        file: file,
        filename: file.name,
        size: file.size,
        type: file.type,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: URL.createObjectURL(file),
        uploaded: false
      }));
      
      onFileChange(fileResults);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          id={`file-input-${name || label}`}
        />
        
        <label htmlFor={`file-input-${name || label}`} className="cursor-pointer">
          <div className="text-slate-600">
            {uploading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Uploading... {uploadProgress}%</span>
              </div>
            ) : (
              <>
                <svg className="mx-auto h-8 w-8 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-500">PNG, JPG, PDF up to {maxSizeMB}MB</p>
              </>
            )}
          </div>
        </label>
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">
            Uploaded Files ({uploadedFiles.length}):
          </p>
          {uploadedFiles.map((file, idx) => (
            <div key={file.id || idx} className="flex items-center justify-between bg-slate-50 rounded p-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">{file.filename}</span>
                {file.url && (
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs">
                    View
                  </a>
                )}
                {file.uploaded && (
                  <span className="text-green-600 text-xs">✓ Uploaded</span>
                )}
                {file.error && (
                  <span className="text-red-600 text-xs">✗ {file.error}</span>
                )}
              </div>
              {onRemoveFile && (
                <button
                  onClick={() => onRemoveFile(idx)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      
      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
};

export const Events = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [userRegistrations, setUserRegistrations] = useState(new Set());
  const [registeringEvents, setRegisteringEvents] = useState(new Set());
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [eventToRegister, setEventToRegister] = useState(null);
  const [showUnregisterModal, setShowUnregisterModal] = useState(false);
  const [eventToUnregister, setEventToUnregister] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState({
    banner: null,
    materials: [],
    sponsorLogos: [],
    speakerPhotos: [],
    eventKits: [],
    eventProgrammes: [],
    certificateTemplates: []
  });

  useEffect(() => {
    loadEvents();
    if (user) {
      loadUserRegistrations();
    }
  }, [user?.id, user?.role]); // Only depend on user ID and role, not the entire user object

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (user?.role === 'organizer' || user?.role === 'admin') {
        // Load user's own events
        const result = await EventService.getEventsByCreator(user.id);
        if (result.error) {
          setError(result.error);
        } else {
          setEvents(result.events || []);
        }
      } else if (user) {
        // Load published events for authenticated participants
        const result = await EventService.getPublishedEvents();
        if (result.error) {
          setError(result.error);
        } else {
          console.log('📊 Loaded events with participant counts:', result.events?.map(e => ({ 
            id: e.id, 
            title: e.title, 
            current_participants: e.current_participants,
            max_participants: e.max_participants
          })));
          setEvents(result.events || []);
        }
      } else {
        // Load published events for unauthenticated users
        const result = await EventService.getPublishedEvents();
        if (result.error) {
          setError(result.error);
        } else {
          setEvents(result.events || []);
        }
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishEvent = async (eventId) => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      
      await EventService.updateEventStatus(eventId, 'published');
      
      // Reload events to show updated status
      await loadEvents();
      
      // Show success message
      setSuccessMessage('Event published successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error publishing event:', err);
      setError('Failed to publish event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetFeatured = async (eventId) => {
    try {
      setLoading(true);
      setError('');
      
      const result = await EventService.setFeaturedEvent(eventId);
      if (result.error) {
        setError(result.error);
      } else {
        await loadEvents();
        setSuccessModalMessage('Event set as featured successfully!');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error setting featured event:', error);
      setError('Failed to set featured event');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfeatureEvent = async (eventId) => {
    try {
      setLoading(true);
      setError('');
      
      const result = await EventService.unfeatureEvent(eventId);
      if (result.error) {
        setError(result.error);
      } else {
        await loadEvents();
        setSuccessModalMessage('Event unfeatured successfully!');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Error unfeaturing event:', error);
      setError('Failed to unfeature event');
    } finally {
      setLoading(false);
    }
  };

  const loadUserRegistrations = async () => {
    if (!user) return;
    
    try {
      const result = await EventService.getUserRegistrations(user.id);
      if (result.registrations) {
        const registeredEventIds = new Set(result.registrations.map(reg => reg.event_id));
        setUserRegistrations(registeredEventIds);
      }
    } catch (err) {
      console.error('Error loading user registrations:', err);
    }
  };

  const handleRegisterForEvent = async (eventId) => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Find the event to register for
    const event = events.find(e => e.id === eventId) || sampleEvents.find(e => e.id === eventId);
    if (event) {
      setEventToRegister(event);
      setShowConfirmationModal(true);
    }
  };

  const confirmRegistration = async () => {
    if (!eventToRegister) return;

    const eventId = eventToRegister.id;
    
    // Check if this is a sample event
    const isSampleEvent = sampleEvents.some(event => event.id === eventId);
    if (isSampleEvent) {
      // For sample events, simulate registration without database call
      setSuccessModalMessage('Successfully registered for the sample event! (This is a demo registration)');
      setShowSuccessModal(true);
      setUserRegistrations(prev => new Set(prev).add(eventId));
      
      setShowConfirmationModal(false);
      setEventToRegister(null);
      return;
    }

    try {
      setRegisteringEvents(prev => new Set(prev).add(eventId));
      setError('');
      // Don't clear success message here - let it show after registration

      const result = await EventService.registerForEvent(eventId, user.id);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessModalMessage('Successfully registered for the event!');
        setShowSuccessModal(true);
        // Add to user registrations
        setUserRegistrations(prev => new Set(prev).add(eventId));
        // Reload events to update participant count
        await loadEvents();
      }
    } catch (err) {
      console.error('Error registering for event:', err);
      setError('Failed to register for event. Please try again.');
    } finally {
      setRegisteringEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      setShowConfirmationModal(false);
      setEventToRegister(null);
    }
  };

  const handleUnregister = async (eventId) => {
    if (!user) return;

    // Find the event to unregister from
    const event = events.find(e => e.id === eventId) || sampleEvents.find(e => e.id === eventId);
    if (event) {
      setEventToUnregister(event);
      setShowUnregisterModal(true);
    }
  };

  const confirmUnregistration = async () => {
    if (!eventToUnregister) return;

    const eventId = eventToUnregister.id;
    
    // Check if this is a sample event
    const isSampleEvent = sampleEvents.some(event => event.id === eventId);
    if (isSampleEvent) {
      // For sample events, simulate cancellation without database call
      setSuccessModalMessage('Successfully unregistered from the sample event! (This is a demo unregistration)');
      setShowSuccessModal(true);
      setUserRegistrations(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      
      setShowUnregisterModal(false);
      setEventToUnregister(null);
      return;
    }

    try {
      setRegisteringEvents(prev => new Set(prev).add(eventId));
      setError('');
      // Don't clear success message here - let it show after unregistration

      const result = await EventService.unregisterFromEvent(eventId, user.id);
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccessModalMessage('Successfully unregistered from the event!');
        setShowSuccessModal(true);
        // Remove from user registrations
        setUserRegistrations(prev => {
          const newSet = new Set(prev);
          newSet.delete(eventId);
          return newSet;
        });
        // Reload events to update participant count
        console.log('🔄 Reloading events after unregistration...');
        await loadEvents();
        console.log('✅ Events reloaded');
      }
    } catch (err) {
      console.error('Error unregistering from event:', err);
      setError('Failed to unregister from event. Please try again.');
    } finally {
      setRegisteringEvents(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      setShowUnregisterModal(false);
      setEventToUnregister(null);
    }
  };

  const handleEditEvent = (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      
      // Initialize form data with current event data
      setEditFormData({
        title: event.title || '',
        rationale: event.rationale || event.description || '',
        startDate: event.start_date || '',
        endDate: event.end_date || '',
        startTime: event.start_time || '',
        endTime: event.end_time || '',
        venue: event.venue || '',
        maxParticipants: event.max_participants || '',
        registrationDeadline: event.registration_deadline ? event.registration_deadline.split('T')[0] : '',
        sponsors: event.sponsors ? event.sponsors.map(s => s.name).join(', ') : '',
        guestSpeakers: event.guest_speakers ? event.guest_speakers.map(s => s.name).join(', ') : ''
      });
      
      // Helper function to extract file path from Supabase URL
      const extractFilePath = (url) => {
        if (!url) return null;
        try {
          const urlObj = new URL(url);
          // Extract path from URL like: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file.jpg
          const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/[^\/]+\/(.+)/);
          return pathMatch ? pathMatch[1] : null;
        } catch (error) {
          console.error('Error extracting file path from URL:', error);
          return null;
        }
      };

      // Helper function to extract bucket name from Supabase URL
      const extractBucketName = (url) => {
        if (!url) return null;
        try {
          const urlObj = new URL(url);
          const bucketMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^\/]+)\//);
          return bucketMatch ? bucketMatch[1] : null;
        } catch (error) {
          console.error('Error extracting bucket name from URL:', error);
          return null;
        }
      };

      // Initialize uploaded files with existing URLs and paths
      setUploadedFiles({
        banner: event.banner_url ? { 
          url: event.banner_url, 
          filename: 'Current Banner',
          path: extractFilePath(event.banner_url),
          bucket: extractBucketName(event.banner_url),
          uploaded: true,
          isOriginal: true // Mark as original file
        } : null,
        materials: event.materials_url ? event.materials_url.split(',').map(url => ({ 
          url, 
          filename: 'Material',
          path: extractFilePath(url),
          bucket: extractBucketName(url),
          uploaded: true,
          isOriginal: true
        })) : [],
        sponsorLogos: event.sponsor_logos_url ? event.sponsor_logos_url.split(',').map(url => ({ 
          url, 
          filename: 'Sponsor Logo',
          path: extractFilePath(url),
          bucket: extractBucketName(url),
          uploaded: true,
          isOriginal: true
        })) : [],
        speakerPhotos: event.speaker_photos_url ? event.speaker_photos_url.split(',').map(url => ({ 
          url, 
          filename: 'Speaker Photo',
          path: extractFilePath(url),
          bucket: extractBucketName(url),
          uploaded: true,
          isOriginal: true
        })) : [],
        eventKits: event.event_kits_url ? event.event_kits_url.split(',').map(url => ({ 
          url, 
          filename: 'Event Kit',
          path: extractFilePath(url),
          bucket: extractBucketName(url),
          uploaded: true,
          isOriginal: true
        })) : [],
        eventProgrammes: event.event_programmes_url ? event.event_programmes_url.split(',').map(url => ({ 
          url, 
          filename: 'Programme',
          path: extractFilePath(url),
          bucket: extractBucketName(url),
          uploaded: true,
          isOriginal: true
        })) : [],
        certificateTemplates: event.certificate_templates_url ? event.certificate_templates_url.split(',').map(url => ({ 
          url, 
          filename: 'Certificate',
          path: extractFilePath(url),
          bucket: extractBucketName(url),
          uploaded: true,
          isOriginal: true
        })) : []
      });
      
      setShowEditModal(true);
    }
  };

  const handleManageEvent = (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEvent(event);
      setShowManageModal(true);
    }
  };

  // Cleanup function for unsaved uploads (only new uploads, not original files)
  const cleanupUnsavedUploads = () => {
    console.log('🧹 Cleaning up unsaved uploads...');
    
    // Clean up banner (only if it's a new upload, not original)
    if (uploadedFiles.banner && uploadedFiles.banner.path && uploadedFiles.banner.uploaded && !uploadedFiles.banner.isOriginal) {
      deleteFileFromStorage(uploadedFiles.banner);
    }
    
    // Clean up materials (only new uploads)
    if (uploadedFiles.materials) {
      uploadedFiles.materials.forEach(file => {
        if (file.path && file.uploaded && !file.isOriginal) {
          deleteFileFromStorage(file);
        }
      });
    }
    
    // Clean up sponsor logos (only new uploads)
    if (uploadedFiles.sponsorLogos) {
      uploadedFiles.sponsorLogos.forEach(file => {
        if (file.path && file.uploaded && !file.isOriginal) {
          deleteFileFromStorage(file);
        }
      });
    }
    
    // Clean up speaker photos (only new uploads)
    if (uploadedFiles.speakerPhotos) {
      uploadedFiles.speakerPhotos.forEach(file => {
        if (file.path && file.uploaded && !file.isOriginal) {
          deleteFileFromStorage(file);
        }
      });
    }
  };

  // File deletion helper
  const deleteFileFromStorage = async (file) => {
    if (!file || !file.path || !file.bucket) {
      console.log('No file to delete or missing path/bucket info');
      return;
    }

    try {
      console.log(`🗑️ Deleting file from storage: ${file.path} in bucket ${file.bucket}`);
      const { error } = await supabase.storage
        .from(file.bucket)
        .remove([file.path]);
      
      if (error) {
        console.error('Error deleting file:', error);
      } else {
        console.log('✅ File deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  // File upload handlers with replacement logic
  const handleFileUpload = (uploadType, results) => {
    console.log(`📁 File upload for ${uploadType}:`, results);
    
    switch (uploadType) {
      case 'banner':
        // Delete old banner before setting new one
        if (uploadedFiles.banner && uploadedFiles.banner.path && uploadedFiles.banner.bucket) {
          console.log('🗑️ Deleting old banner:', uploadedFiles.banner.path);
          deleteFileFromStorage(uploadedFiles.banner);
        }
        setUploadedFiles(prev => ({ ...prev, banner: results[0] }));
        break;
      case 'materials':
        setUploadedFiles(prev => ({ ...prev, materials: [...(prev.materials || []), ...results] }));
        break;
      case 'logo':
        setUploadedFiles(prev => ({ ...prev, sponsorLogos: [...(prev.sponsorLogos || []), ...results] }));
        break;
      case 'speaker':
        setUploadedFiles(prev => ({ ...prev, speakerPhotos: [...(prev.speakerPhotos || []), ...results] }));
        break;
      default:
        console.warn('Unknown upload type:', uploadType);
    }
  };

  const handleRemoveFile = (uploadType, index) => {
    console.log(`🗑️ Removing file from ${uploadType} at index ${index}`);
    
    switch (uploadType) {
      case 'banner':
        // Delete from storage before removing from state
        if (uploadedFiles.banner && uploadedFiles.banner.path && uploadedFiles.banner.bucket) {
          console.log('🗑️ Deleting banner from storage:', uploadedFiles.banner.path);
          deleteFileFromStorage(uploadedFiles.banner);
        }
        setUploadedFiles(prev => ({ ...prev, banner: null }));
        break;
      case 'materials':
        // Delete from storage before removing from state
        const materialToDelete = uploadedFiles.materials[index];
        if (materialToDelete && materialToDelete.path && materialToDelete.bucket) {
          console.log('🗑️ Deleting material from storage:', materialToDelete.path);
          deleteFileFromStorage(materialToDelete);
        }
        setUploadedFiles(prev => ({ 
          ...prev, 
          materials: prev.materials.filter((_, i) => i !== index) 
        }));
        break;
      case 'logo':
        // Delete from storage before removing from state
        const logoToDelete = uploadedFiles.sponsorLogos[index];
        if (logoToDelete && logoToDelete.path && logoToDelete.bucket) {
          console.log('🗑️ Deleting logo from storage:', logoToDelete.path);
          deleteFileFromStorage(logoToDelete);
        }
        setUploadedFiles(prev => ({ 
          ...prev, 
          sponsorLogos: prev.sponsorLogos.filter((_, i) => i !== index) 
        }));
        break;
      case 'speaker':
        // Delete from storage before removing from state
        const speakerToDelete = uploadedFiles.speakerPhotos[index];
        if (speakerToDelete && speakerToDelete.path && speakerToDelete.bucket) {
          console.log('🗑️ Deleting speaker photo from storage:', speakerToDelete.path);
          deleteFileFromStorage(speakerToDelete);
        }
        setUploadedFiles(prev => ({ 
          ...prev, 
          speakerPhotos: prev.speakerPhotos.filter((_, i) => i !== index) 
        }));
        break;
      default:
        console.warn('Unknown upload type for removal:', uploadType);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // Handle both "HH:MM:SS" and "HH:MM" formats
    const time = timeString.includes(':') ? timeString.split(':').slice(0, 2).join(':') : timeString;
    const [hours, minutes] = time.split(':');
    
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading events...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center max-w-md">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Error Loading Events</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={loadEvents}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
        </div>

        {/* Call to Action for Unauthenticated Users */}
        {!user && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 mb-8 text-center">
            <h3 className="text-xl font-semibold text-slate-800 mb-3">Want to Join Events?</h3>
            <p className="text-slate-600 mb-4">Create an account to register for events and get updates</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/registration')}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
              >
                Sign Up
              </button>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md mx-auto mb-8">
              <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No Events Found</h3>
              <p className="text-slate-600 mb-4">
                {user?.role === 'organizer' || user?.role === 'admin' 
                  ? 'You haven\'t created any events yet. Start by creating your first event!' 
                  : 'There are no published events available at the moment.'
                }
              </p>
              {(user?.role === 'organizer' || user?.role === 'admin') && (
                <button
                  onClick={() => navigate('/create-event')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Your First Event
                </button>
              )}
            </div>
            
            {/* Sample Events for Preview */}
            {!user || user?.role === 'participant' ? (
              <div className="text-left">
                <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">Sample Events Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sampleEvents.map((event) => (
                    <div key={event.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
                      {/* Event Banner */}
                      {event.banner_url && (
                        <div className="h-48 overflow-hidden">
                          <img
                            src={event.banner_url}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      
                      {/* Event Content */}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <h3 className="text-xl font-bold text-slate-800 flex-1">{event.title}</h3>
                          <span className="ml-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {event.status}
                          </span>
                        </div>
                        
                        {event.rationale && (
                          <p className="text-slate-600 mb-4 line-clamp-3">{event.rationale}</p>
                        )}
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-slate-600">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDate(event.start_date)} - {formatDate(event.end_date)}</span>
                          </div>
                          <div className="flex items-center text-sm text-slate-600">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                          </div>
                          {event.venue && (
                            <div className="flex items-center text-sm text-slate-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{event.venue}</span>
                            </div>
                          )}
                          <div className="flex items-center text-sm text-slate-600">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>
                              {event.current_participants || 0} registered
                              {event.max_participants && ` / ${event.max_participants} max`}
                            </span>
                          </div>
                        </div>
                        
                        {/* Sponsors and Speakers */}
                        {event.sponsors && event.sponsors.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-slate-700 mb-1">Sponsors:</p>
                            <div className="flex flex-wrap gap-1">
                              {event.sponsors.map((sponsor, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {sponsor.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {event.guest_speakers && event.guest_speakers.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium text-slate-700 mb-1">Speakers:</p>
                            <div className="flex flex-wrap gap-1">
                              {event.guest_speakers.map((speaker, index) => (
                                <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  {speaker.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 mt-4">
                          {/* Publish button for organizers/admins viewing their own events */}
                          {(user?.role === 'organizer' || user?.role === 'admin') && event.status === 'draft' && (
                            <button 
                              onClick={() => handlePublishEvent(event.id)}
                              disabled={registeringEvents.has(event.id)}
                              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {registeringEvents.has(event.id) ? 'Publishing...' : 'Publish Event'}
                            </button>
                          )}
                          
                          {/* Feature Event button for organizers/admins */}
                          {(user?.role === 'organizer' || user?.role === 'admin') && (
                            <button 
                              onClick={() => event.is_featured ? handleUnfeatureEvent(event.id) : handleSetFeatured(event.id)}
                              disabled={loading}
                              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                            >
                              {event.is_featured ? '⭐ Unfeature Event' : '⭐ Feature Event'}
                            </button>
                          )}
                          
                          {/* Debug: Always show feature button for testing */}
                          <button 
                            onClick={() => alert('Feature button clicked! Event: ' + event.title)}
                            className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-bold border-2 border-red-800"
                          >
                            🔥 TEST FEATURE BUTTON - CLICK ME!
                          </button>
                          
                          {/* Existing registration buttons */}
                          {!user ? (
                            <div className="w-full text-center">
                              <button 
                                onClick={() => navigate('/login')}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                              >
                                Login to Register
                              </button>
                            </div>
                          ) : userRegistrations.has(event.id) ? (
                            <button 
                              onClick={() => handleUnregister(event.id)}
                              disabled={registeringEvents.has(event.id)}
                              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {registeringEvents.has(event.id) ? 'Unregistering...' : 'Unregister'}
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleRegisterForEvent(event.id)}
                              disabled={registeringEvents.has(event.id)}
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {registeringEvents.has(event.id) ? 'Registering...' : 'Register'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden">
                {/* Event Banner */}
                {event.banner_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={event.banner_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center" style={{display: 'none'}}>
                      <span className="text-white text-lg font-semibold">Event Banner</span>
                    </div>
                  </div>
                )}
                
                {/* Event Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800 flex-1">{event.title}</h3>
                    <span className={`ml-2 px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === 'published' ? 'bg-green-100 text-green-800' :
                      event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      event.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                  
                  {event.rationale && (
                    <p className="text-slate-600 mb-4 line-clamp-3">{event.rationale}</p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDate(event.start_date)} - {formatDate(event.end_date)}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                    </div>
                    {event.venue && (
                      <div className="flex items-center text-sm text-slate-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{event.venue}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-slate-600">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>
                        {event.current_participants || 0} registered
                        {event.max_participants && ` / ${event.max_participants} max`}
                      </span>
                    </div>
                  </div>
                  
                  {/* Sponsors and Speakers */}
                  {event.sponsors && event.sponsors.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-700 mb-1">Sponsors:</p>
                      <div className="flex flex-wrap gap-1">
                        {event.sponsors.map((sponsor, index) => (
                          <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {sponsor.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {event.guest_speakers && event.guest_speakers.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-slate-700 mb-1">Speakers:</p>
                      <div className="flex flex-wrap gap-1">
                        {event.guest_speakers.map((speaker, index) => (
                          <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {speaker.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-3 mt-6">
                    {user?.role === 'organizer' || user?.role === 'admin' ? (
                      <>
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => handleEditEvent(event.id)}
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => event.status === 'draft' ? handlePublishEvent(event.id) : handleManageEvent(event.id)}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loading ? 'Publishing...' : event.status === 'draft' ? 'Publish' : 'Manage'}
                          </button>
                        </div>
                        <button 
                          onClick={() => event.is_featured ? handleUnfeatureEvent(event.id) : handleSetFeatured(event.id)}
                          disabled={loading}
                          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {event.is_featured ? 'Remove Featured' : 'Set as Featured'}
                        </button>
                      </>
                    ) : !user ? (
                      <div className="w-full text-center">
                        <button 
                          onClick={() => navigate('/login')}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Login to Register
                        </button>
                      </div>
                    ) : userRegistrations.has(event.id) ? (
                      <button 
                        onClick={() => handleUnregister(event.id)}
                        disabled={registeringEvents.has(event.id)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {registeringEvents.has(event.id) ? 'Unregistering...' : 'Unregister'}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleRegisterForEvent(event.id)}
                        disabled={registeringEvents.has(event.id)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {registeringEvents.has(event.id) ? 'Registering...' : 'Register'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registration Confirmation Modal */}
      {showConfirmationModal && eventToRegister && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Confirm Event Registration
              </h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to register for <strong>"{eventToRegister.title}"</strong>?
                {sampleEvents.some(event => event.id === eventToRegister.id) && (
                  <span className="block mt-2 text-sm text-blue-600">
                    (This is a sample event - demo registration only)
                  </span>
                )}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setEventToRegister(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRegistration}
                  disabled={registeringEvents.has(eventToRegister.id)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registeringEvents.has(eventToRegister.id) ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unregistration Confirmation Modal */}
      {showUnregisterModal && eventToUnregister && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Confirm Unregistration
              </h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to unregister from <strong>"{eventToUnregister.title}"</strong>?
                {sampleEvents.some(event => event.id === eventToUnregister.id) && (
                  <span className="block mt-2 text-sm text-blue-600">
                    (This is a sample event - demo unregistration only)
                  </span>
                )}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowUnregisterModal(false);
                    setEventToUnregister(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Keep Registration
                </button>
                <button
                  onClick={confirmUnregistration}
                  disabled={registeringEvents.has(eventToUnregister.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registeringEvents.has(eventToUnregister.id) ? 'Unregistering...' : 'Unregister'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                Success!
              </h3>
              <p className="text-slate-600 mb-6 text-lg">
                {successModalMessage}
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessModalMessage('');
                }}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                Edit Event
              </h3>
              <p className="text-slate-600">
                Edit details for "{selectedEvent.title}"
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Basic Info */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-800 border-b pb-2">Basic Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Event Title</label>
                  <input
                    type="text"
                    value={editFormData.title || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    value={editFormData.rationale || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, rationale: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={editFormData.startDate || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={editFormData.endDate || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={editFormData.startTime || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={editFormData.endTime || ''}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Venue</label>
                  <input
                    type="text"
                    value={editFormData.venue || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, venue: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Max Participants</label>
                  <input
                    type="number"
                    value={editFormData.maxParticipants || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, maxParticipants: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Registration Deadline</label>
                  <input
                    type="date"
                    value={editFormData.registrationDeadline || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, registrationDeadline: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {/* Right Column - Files and Media */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-slate-800 border-b pb-2">Files & Media</h4>
                
                {/* Banner Image */}
                <FileDropzone
                  label="Event Banner"
                  name="banner"
                  accept="image/*"
                  uploadType="banner"
                  onUpload={(results) => handleFileUpload('banner', results)}
                  uploadedFiles={uploadedFiles.banner ? [uploadedFiles.banner] : []}
                  onRemoveFile={() => handleRemoveFile('banner', 0)}
                />
                
                {/* Event Materials */}
                <FileDropzone
                  label="Event Materials"
                  name="materials"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  multiple={true}
                  uploadType="materials"
                  onUpload={(results) => handleFileUpload('materials', results)}
                  uploadedFiles={uploadedFiles.materials || []}
                  onRemoveFile={(index) => handleRemoveFile('materials', index)}
                />
                
                {/* Sponsor Logos */}
                <FileDropzone
                  label="Sponsor Logos"
                  name="sponsorLogos"
                  accept="image/*"
                  multiple={true}
                  uploadType="logo"
                  onUpload={(results) => handleFileUpload('logo', results)}
                  uploadedFiles={uploadedFiles.sponsorLogos || []}
                  onRemoveFile={(index) => handleRemoveFile('logo', index)}
                />
                
                {/* Speaker Photos */}
                <FileDropzone
                  label="Speaker Photos"
                  name="speakerPhotos"
                  accept="image/*"
                  multiple={true}
                  uploadType="speaker"
                  onUpload={(results) => handleFileUpload('speaker', results)}
                  uploadedFiles={uploadedFiles.speakerPhotos || []}
                  onRemoveFile={(index) => handleRemoveFile('speaker', index)}
                />
                
                {/* Additional Info */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Sponsors (comma-separated)</label>
                  <input
                    type="text"
                    value={editFormData.sponsors || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, sponsors: e.target.value }))}
                    placeholder="Company A, Company B, Company C"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Guest Speakers (comma-separated)</label>
                  <input
                    type="text"
                    value={editFormData.guestSpeakers || ''}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, guestSpeakers: e.target.value }))}
                    placeholder="John Doe, Jane Smith, Bob Johnson"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  // Clean up any unsaved uploads before closing
                  cleanupUnsavedUploads();
                  setShowEditModal(false);
                  setSelectedEvent(null);
                  setEditFormData({});
                  setUploadedFiles({
                    banner: null,
                    materials: [],
                    sponsorLogos: [],
                    speakerPhotos: [],
                    eventKits: [],
                    eventProgrammes: [],
                    certificateTemplates: []
                  });
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    // Prepare update data
                    const updateData = {
                      title: editFormData.title,
                      rationale: editFormData.rationale,
                      start_date: editFormData.start_date,
                      end_date: editFormData.end_date,
                      start_time: editFormData.start_time,
                      end_time: editFormData.end_time,
                      venue: editFormData.venue,
                      max_participants: parseInt(editFormData.max_participants) || null,
                      registration_deadline: editFormData.registration_deadline,
                      sponsors: editFormData.sponsors ? editFormData.sponsors.split(',').map(s => ({ name: s.trim() })) : [],
                      guest_speakers: editFormData.guest_speakers ? editFormData.guest_speakers.split(',').map(s => ({ name: s.trim() })) : []
                    };

                    // Add file URLs if files were uploaded
                    if (uploadedFiles.banner && uploadedFiles.banner.url) {
                      updateData.banner_url = uploadedFiles.banner.url;
                    }
                    if (uploadedFiles.materials && uploadedFiles.materials.length > 0) {
                      updateData.materials_url = uploadedFiles.materials.map(f => f.url).join(',');
                    }
                    if (uploadedFiles.sponsorLogos && uploadedFiles.sponsorLogos.length > 0) {
                      updateData.sponsor_logos_url = uploadedFiles.sponsorLogos.map(f => f.url).join(',');
                    }
                    if (uploadedFiles.speakerPhotos && uploadedFiles.speakerPhotos.length > 0) {
                      updateData.speaker_photos_url = uploadedFiles.speakerPhotos.map(f => f.url).join(',');
                    }

                    // Update the event in the database
                    const { error } = await supabase
                      .from('events')
                      .update(updateData)
                      .eq('id', selectedEvent.id);

                    if (error) {
                      console.error('Error updating event:', error);
                      setError('Failed to update event. Please try again.');
                      return;
                    }

                    // Refresh events list
                    await loadEvents();
                    
                    setSuccessModalMessage('Event updated successfully!');
                    setShowSuccessModal(true);
                    setShowEditModal(false);
                    setSelectedEvent(null);
                    setEditFormData({});
                    setUploadedFiles({
                      banner: null,
                      materials: [],
                      sponsorLogos: [],
                      speakerPhotos: [],
                      eventKits: [],
                      eventProgrammes: [],
                      certificateTemplates: []
                    });
                  } catch (error) {
                    console.error('Error updating event:', error);
                    setError('Failed to update event. Please try again.');
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Event Modal */}
      {showManageModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">
                Manage Event
              </h3>
              <p className="text-slate-600">
                Manage "{selectedEvent.title}"
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Event Stats */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Event Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedEvent.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Participants:</span>
                    <span>{selectedEvent.current_participants || 0}/{selectedEvent.max_participants || '∞'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{formatDate(selectedEvent.created_at)}</span>
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Quick Actions</h4>
                <div className="space-y-2">
                  <button className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors">
                    View Registrations
                  </button>
                  <button className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                    Generate QR Code
                  </button>
                  <button className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors">
                    View Analytics
                  </button>
                </div>
              </div>
              
              {/* Event Details */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-2">Event Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Date:</span>
                    <div>{formatDate(selectedEvent.start_date)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Time:</span>
                    <div>{selectedEvent.start_time} - {selectedEvent.end_time}</div>
                  </div>
                  <div>
                    <span className="font-medium">Venue:</span>
                    <div>{selectedEvent.venue}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowManageModal(false);
                  setSelectedEvent(null);
                }}
                className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
