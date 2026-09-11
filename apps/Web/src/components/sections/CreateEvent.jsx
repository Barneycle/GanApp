import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EventService } from '../../services/eventService';
import { SpeakerService } from '../../services/speakerService';
import { SponsorService } from '../../services/sponsorService';
import { VenueService } from '../../services/venueService';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { confirmDialog, statusDialog, statusError } from '../Toast';
import { ErrorState } from '../ErrorState';
import { promptCertificateUsage } from '../../utils/eventCreationDialogs';
import { isValidPhMobile, normalizePhMobile } from '../../utils/formFields';
import { toErrorCopy } from '../../utils/errorCopy';
import { EventFormWizard } from '../eventForm/EventFormWizard';
import { createEventSchema } from '../../utils/eventForm/eventFormSchema';
import { markPipelineCertificateSkipped } from '../eventForm/EventPipelineTracker';
import { setAtIndex } from '../../utils/eventForm/helpers';
import { useSpeakerSponsorCrud } from '../../hooks/useSpeakerSponsorCrud';

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


  const {
    addSpeaker, updateSpeaker, removeSpeaker, moveSpeaker,
    addSponsor, updateSponsor, removeSponsor, moveSponsor,
  } = useSpeakerSponsorCrud({
    speakers, setSpeakers, sponsors, setSponsors, setUploadedFiles,
    setShowAddSpeaker, setShowAddSponsor,
  });

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
      try {
        sessionStorage.removeItem('pending-certificate-skipped');
      } catch {
        // Ignore session write failures
      }
      navigate('/design-certificate');
    } else {
      try {
        sessionStorage.removeItem('pending-certificate-config');
      } catch (e) {
        console.warn('Failed to clear certificate config:', e);
      }
      markPipelineCertificateSkipped();
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


  const pageTitle = 'Create Event';
  const pageSubtitle = 'Fill in the details, then continue to certificate design or evaluation.';
  const submitButtonLabel = 'Create Event';
  const mode = 'create';
  const headerExtra = null;
  const afterMaterials = null;
  const onClearDraft = handleClearDraft;

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
    <EventFormWizard
      mode={mode}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      submitButtonLabel={submitButtonLabel}
      headerExtra={headerExtra}
      afterMaterials={afterMaterials}
      navigate={navigate}
      handleSubmit={handleSubmit}
      onSubmit={onSubmit}
      onSaveDraft={onSaveDraft}
      isSavingDraft={isSavingDraft}
      control={control}
      errors={errors}
      watch={watch}
      setValue={setValue}
      trigger={trigger}
      setUploadedFiles={setUploadedFiles}
      uploadedFiles={uploadedFiles}
      handleFileUpload={handleFileUpload}
      handleRemoveFile={handleRemoveFile}
      speakers={speakers}
      sponsors={sponsors}
      addSpeaker={addSpeaker}
      updateSpeaker={updateSpeaker}
      removeSpeaker={removeSpeaker}
      moveSpeaker={moveSpeaker}
      addSponsor={addSponsor}
      updateSponsor={updateSponsor}
      removeSponsor={removeSponsor}
      moveSponsor={moveSponsor}
      venues={venues}
      showOtherVenue={showOtherVenue}
      setShowOtherVenue={setShowOtherVenue}
      customVenueName={customVenueName}
      setCustomVenueName={setCustomVenueName}
      coreStep={coreStep}
      setCoreStep={setCoreStep}
      showCheckIn={showCheckIn}
      setShowCheckIn={setShowCheckIn}
      showSponsors={showSponsors}
      setShowSponsors={setShowSponsors}
      showSpeakers={showSpeakers}
      setShowSpeakers={setShowSpeakers}
      showMaterials={showMaterials}
      setShowMaterials={setShowMaterials}
      eventKitsMode={eventKitsMode}
      setEventKitsMode={setEventKitsMode}
      eventProgrammeMode={eventProgrammeMode}
      setEventProgrammeMode={setEventProgrammeMode}
      autoSaveEnabled={autoSaveEnabled}
      toggleAutoSave={toggleAutoSave}
      onClearDraft={onClearDraft}
    />
  );
};
