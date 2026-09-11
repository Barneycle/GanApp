import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EventService } from '../../services/eventService';
import { SpeakerService } from '../../services/speakerService';
import { SponsorService } from '../../services/sponsorService';
import { VenueService } from '../../services/venueService';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useToast, statusError } from '../Toast';
import { ErrorState } from '../ErrorState';
import { PageSkeleton } from '../loading/Skeleton';
import { logActivity } from '../../utils/activityLogger';
import { promptCertificateUsage } from '../../utils/eventCreationDialogs';
import { isValidPhMobile, normalizePhMobile } from '../../utils/formFields';
import { EventFormWizard } from '../eventForm/EventFormWizard';
import { isCertificateConfigured, isPipelineCertificateDone, markPipelineCertificateDone, markPipelineCertificateSkipped, readSessionCertificateConfig } from '../eventForm/EventPipelineTracker';
import { editEventSchema } from '../../utils/eventForm/eventFormSchema';
import { extractBucketName, extractFilePath, setAtIndex } from '../../utils/eventForm/helpers';
import { useSpeakerSponsorCrud } from '../../hooks/useSpeakerSponsorCrud';
import { CertificateService } from '../../services/certificateService';

export const EditEvent = () => {
  const toast = useToast();

  const navigate = useNavigate();
  const { eventId } = useParams();

  const { user, isAuthenticated } = useAuth();

  const isEditMode = true;

  const [initializing, setInitializing] = useState(true);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [currentEvent, setCurrentEvent] = useState(null);
  const [hasExistingCertificate, setHasExistingCertificate] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState(() => ({

    banner: null,

    materials: [],

    sponsorLogos: [],

    speakerPhotos: [],

    eventKits: [],

    eventProgrammes: []

  }));

  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);



  // Guest Speakers state
  const [speakers, setSpeakers] = useState([]);
  const [_showAddSpeaker, setShowAddSpeaker] = useState(false);

  // Sponsors state
  const [sponsors, setSponsors] = useState([]);
  const [_showAddSponsor, setShowAddSponsor] = useState(false);

  const [eventKitsMode, setEventKitsMode] = useState('upload');
  const [eventProgrammeMode, setEventProgrammeMode] = useState('upload');
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

    resolver: zodResolver(editEventSchema),

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

    if (isEditMode) {
      return;
    }

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

  }, [setValue, isEditMode]);



  // Instant auto-save like Google Forms

  useEffect(() => {

    if (isEditMode) {
      return () => { };
    }

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

  }, [watch, autoSaveEnabled, isEditMode]);

  // Load event data for edit mode
  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    if (!eventId) {
      setSubmitError('Missing event identifier.');
      setInitializing(false);
      navigate('/organizer');
      return;
    }

    let isMounted = true;

    const loadEventData = async () => {
      try {
        setInitializing(true);
        setSubmitError('');

        const { event, error } = await EventService.getEventById(eventId);

        if (!isMounted) return;

        if (error || !event) {
          setSubmitError(error || 'Unable to load event details.');
          setInitializing(false);
          return;
        }

        setValue('title', event.title || '');
        setValue('rationale', event.rationale || '');
        setValue('startDate', event.start_date || new Date().toISOString().split('T')[0]);
        setValue('endDate', event.end_date || event.start_date || new Date().toISOString().split('T')[0]);
        setValue('startTime', event.start_time ? event.start_time.slice(0, 5) : '09:00');
        setValue('endTime', event.end_time ? event.end_time.slice(0, 5) : '17:00');
        setValue('venue', event.venue || '');
        setValue('maxParticipants', event.max_participants ? String(event.max_participants) : '');
        setValue('checkInBeforeMinutes', event.check_in_before_minutes ?? 60);
        setValue('checkInDuringMinutes', event.check_in_during_minutes ?? 30);

        setValue('sponsors', event.sponsors ? event.sponsors.map((s) => s.name).join(', ') : '');
        setValue('guestSpeakers', event.guest_speakers ? event.guest_speakers.map((s) => s.name).join(', ') : '');

        const existingBanner = event.banner_url
          ? {
            url: event.banner_url,
            filename: 'Current Banner',
            path: extractFilePath(event.banner_url),
            bucket: extractBucketName(event.banner_url),
            uploaded: true,
            isOriginal: true,
          }
          : null;

        const buildFileList = (csv, labelPrefix) => {
          if (!csv) return [];
          return csv
            .split(',')
            .map((url, _index) => url.trim())
            .filter(Boolean)
            .map((url, index) => ({
              url,
              filename: `${labelPrefix} ${index + 1}`,
              path: extractFilePath(url),
              bucket: extractBucketName(url),
              uploaded: true,
              isOriginal: true,
            }));
        };

        const materialsList = buildFileList(event.materials_url, 'Material');
        const kitsList = buildFileList(event.event_kits_url, 'Event Kit');
        const programmesList = buildFileList(event.event_programmes_url, 'Programme');
        setUploadedFiles((prev) => ({
          ...prev,
          banner: existingBanner,
          materials: materialsList,
          eventKits: kitsList,
          eventProgrammes: programmesList,
        }));


        const speakerResult = await SpeakerService.getEventSpeakers(eventId);
        if (isMounted && speakerResult.speakers) {
          // Extract speaker data from EventSpeaker objects and include event_speaker metadata
          const speakersData = speakerResult.speakers.map((es) => ({
            ...es.speaker,
            speaker_order: es.speaker_order,
            is_keynote: es.is_keynote,
            event_speaker_id: es.id // Keep track of the event_speaker relationship ID
          }));
          setSpeakers(speakersData);
          if (speakersData.length > 0) setShowSpeakers(true);
        }

        const sponsorResult = await SponsorService.getEventSponsors(eventId);
        if (isMounted && sponsorResult.sponsors) {
          // Extract sponsor data from EventSponsor objects and include event_sponsor metadata
          const sponsorsData = sponsorResult.sponsors.map((es) => ({
            ...es.sponsor,
            sponsor_order: es.sponsor_order,
            event_sponsor_id: es.id // Keep track of the event_sponsor relationship ID
          }));
          setSponsors(sponsorsData);
          if (sponsorsData.length > 0) setShowSponsors(true);
        }

        if (kitsList.length > 0 || programmesList.length > 0) setShowMaterials(true);
        if ((event.check_in_before_minutes ?? 60) !== 60 || (event.check_in_during_minutes ?? 30) !== 30) {
          setShowCheckIn(true);
        }

        setCurrentEvent(event);

        const { config } = await CertificateService.getCertificateConfig(eventId);
        if (isMounted && isCertificateConfigured(config)) {
          setHasExistingCertificate(true);
          markPipelineCertificateDone();
          try {
            sessionStorage.setItem('pending-certificate-config', JSON.stringify(config));
          } catch {
            // Ignore session write failures
          }
        } else if (isMounted) {
          setHasExistingCertificate(isPipelineCertificateDone());
        }

      } catch (error) {
        if (isMounted) {
          setSubmitError('Failed to load event details.');
        }
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    };

    loadEventData();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, eventId, setValue, navigate]);

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
  };



  const handleRemoveFile = async (uploadType, fileId, entryIndex = null) => {
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
      const confirmed = await statusError('Access denied. Only administrators and organizers can edit events.', 'generic', {
        confirmText: 'Go home',
      });
      if (confirmed) navigate('/');
      return;
    }





    // Edit mode: Update existing event
    if (isEditMode) {
      if (!currentEvent) {
        toast.info('Event details are still loading.');
        return;
      }

      try {
        setSubmitError('');
        setSubmitMessage('');

        const normalizeTime = (value, fallback) => {
          if (!value) return fallback || null;
          return value.length === 5 ? `${value}:00` : value;
        };

        const parseNumber = (value) => {
          if (value === '' || value === null || value === undefined) return null;
          const parsed = Number(value);
          return Number.isNaN(parsed) ? null : parsed;
        };


        let venueName = data.venue || currentEvent.venue;
        if (showOtherVenue && customVenueName.trim()) {
          try {
            const existingVenue = await VenueService.getVenueByName(customVenueName.trim());
            if (!existingVenue.venue) {
              await VenueService.createVenue({
                name: customVenueName.trim(),
                created_by: user.id
              });
            }
            venueName = customVenueName.trim();
          } catch (venueError) {
            // Continue with event update
          }
        }

        const updatePayload = {
          title: data.title || currentEvent.title,
          rationale: data.rationale || '',
          start_date: data.startDate || currentEvent.start_date,
          end_date: data.endDate || currentEvent.end_date || data.startDate,
          start_time: normalizeTime(data.startTime, currentEvent.start_time),
          end_time: normalizeTime(data.endTime, currentEvent.end_time),
          venue: venueName,
          max_participants: parseNumber(data.maxParticipants),
          check_in_before_minutes: parseNumber(data.checkInBeforeMinutes),
          check_in_during_minutes: parseNumber(data.checkInDuringMinutes),
          banner_url: uploadedFiles.banner?.url || currentEvent.banner_url || null,
          event_kits_url: (data.eventKitsLink && data.eventKitsLink.trim())
            || (uploadedFiles.eventKits?.map((file) => file.url).filter(Boolean).join(',') || null),
          event_programmes_url: (data.eventProgrammeLink && data.eventProgrammeLink.trim())
            || (uploadedFiles.eventProgrammes?.map((file) => file.url).filter(Boolean).join(',') || null),
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await EventService.updateEvent(eventId, updatePayload);

        if (updateError) {
          throw new Error(updateError);
        }

        // Log activity
        if (user?.id) {
          logActivity(
            user.id,
            'update',
            'event',
            {
              resourceId: eventId,
              resourceName: currentEvent.title,
              details: { event_id: eventId, title: currentEvent.title, changes: Object.keys(updatePayload) }
            }
          ).catch(err => console.error('Failed to log event update:', err));
        }

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

        const existingSpeakersResult = await SpeakerService.getEventSpeakers(eventId);
        const existingSponsorsResult = await SponsorService.getEventSponsors(eventId);

        const existingSpeakerIds = new Set((existingSpeakersResult.speakers || []).map(es => es.speaker_id));
        const existingSponsorIds = new Set((existingSponsorsResult.sponsors || []).map(es => es.sponsor_id));

        for (let i = 0; i < speakers.length; i++) {
          const speakerData = speakers[i];

          if (!speakerData.first_name || !speakerData.last_name) {
            continue;
          }

          try {
            let speakerId = speakerData.id;
            const isExistingSpeaker = speakerId && speakerId.length > 15 && existingSpeakerIds.has(speakerId);

            if (isExistingSpeaker) {
              const speakerUpdate = {
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

              const updateResult = await SpeakerService.updateSpeaker(speakerId, speakerUpdate);
              if (updateResult.error) {
                continue;
              }

              await SpeakerService.updateEventSpeaker(eventId, speakerId, {
                order: i,
                isKeynote: speakerData.is_keynote || false
              });
            } else {
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

              const createResult = await SpeakerService.createSpeaker(speakerToCreate);
              if (createResult.error) {
                continue;
              }

              speakerId = createResult.speaker.id;

              await SpeakerService.addSpeakerToEvent(eventId, speakerId, {
                order: i,
                isKeynote: speakerData.is_keynote || false
              });
            }
          } catch (speakerError) {
            // Continue with other speakers
          }
        }

        const currentSpeakerIds = new Set(speakers
          .filter(s => s.id && s.id.length > 15)
          .map(s => s.id));

        for (const existingSpeakerId of existingSpeakerIds) {
          if (!currentSpeakerIds.has(existingSpeakerId)) {
            await SpeakerService.removeSpeakerFromEvent(eventId, existingSpeakerId);
          }
        }

        for (let i = 0; i < sponsors.length; i++) {
          const sponsorData = sponsors[i];

          if (!sponsorData.name) {
            continue;
          }

          try {
            let sponsorId = sponsorData.id;
            const isExistingSponsor = sponsorId && sponsorId.length > 15 && existingSponsorIds.has(sponsorId);

            if (isExistingSponsor) {
              const sponsorUpdate = {
                name: sponsorData.name,
                contact_person: sponsorData.contact_person || '',
                email: sponsorData.email || '',
                phone: isValidPhMobile(sponsorData.phone) ? normalizePhMobile(sponsorData.phone) : '',
                address: sponsorData.address || '',
                logo_url: sponsorData.logo_url && sponsorData.logo_url.trim() ? sponsorData.logo_url.trim() : '',
                contribution: sponsorData.contribution || ''
              };

              const updateResult = await SponsorService.updateSponsor(sponsorId, sponsorUpdate);
              if (updateResult.error) {
                continue;
              }

              await SponsorService.updateEventSponsor(eventId, sponsorId, {
                order: i
              });
            } else {
              const sponsorToCreate = {
                name: sponsorData.name,
                contact_person: sponsorData.contact_person || '',
                email: sponsorData.email || '',
                phone: isValidPhMobile(sponsorData.phone) ? normalizePhMobile(sponsorData.phone) : '',
                address: sponsorData.address || '',
                logo_url: sponsorData.logo_url && sponsorData.logo_url.trim() ? sponsorData.logo_url.trim() : '',
                contribution: sponsorData.contribution || ''
              };

              const createResult = await SponsorService.createSponsor(sponsorToCreate);
              if (createResult.error) {
                continue;
              }

              sponsorId = createResult.sponsor.id;

              await SponsorService.addSponsorToEvent(eventId, sponsorId, {
                order: i
              });
            }
          } catch (sponsorError) {
            // Continue with other sponsors
          }
        }

        const currentSponsorIds = new Set(sponsors
          .filter(s => s.id && s.id.length > 15)
          .map(s => s.id));

        for (const existingSponsorId of existingSponsorIds) {
          if (!currentSponsorIds.has(existingSponsorId)) {
            await SponsorService.removeSponsorFromEvent(eventId, existingSponsorId);
          }
        }


        const isDraft = currentEvent.status === 'draft';

        if (isDraft) {
          const eventData = {
            id: currentEvent.id,
            title: data.title || currentEvent.title || 'Untitled Event',
            rationale: data.rationale || currentEvent.rationale || '',
            start_date: data.startDate || currentEvent.start_date || new Date().toISOString().split('T')[0],
            end_date: data.endDate || currentEvent.end_date || new Date().toISOString().split('T')[0],
            start_time: data.startTime || currentEvent.start_time || '09:00',
            end_time: data.endTime || currentEvent.end_time || '17:00',
            venue: venueName || currentEvent.venue || 'TBD',
            max_participants: parseNumber(data.maxParticipants) ?? currentEvent.max_participants ?? null,
            check_in_before_minutes: parseNumber(data.checkInBeforeMinutes) ?? currentEvent.check_in_before_minutes ?? 60,
            check_in_during_minutes: parseNumber(data.checkInDuringMinutes) ?? currentEvent.check_in_during_minutes ?? 30,
          };

          sessionStorage.setItem('pending-event-data', JSON.stringify(eventData));
          sessionStorage.setItem('pending-event-files', JSON.stringify(uploadedFiles));
          sessionStorage.setItem('pending-event-speakers', JSON.stringify(speakers.map((speaker) => ({
            ...speaker,
            photo_url: speaker.photo_url || '',
          }))));
          sessionStorage.setItem('pending-event-sponsors', JSON.stringify(sponsors.map((sponsor) => ({
            ...sponsor,
            logo_url: sponsor.logo_url || '',
          }))));
          sessionStorage.setItem('pending-event-id', currentEvent.id);

          const { config } = await CertificateService.getCertificateConfig(eventId);
          const hasDesignedCert = Boolean(config?.id || config?.event_id) || isPipelineCertificateDone();

          if (hasDesignedCert) {
            try {
              const toStore = config || readSessionCertificateConfig();
              if (toStore) {
                sessionStorage.setItem('pending-certificate-config', JSON.stringify(toStore));
              }
            } catch {
              // Ignore session write failures
            }
            markPipelineCertificateDone();
            navigate('/create-survey');
            return;
          }

          const wantsCertificate = await promptCertificateUsage();
          if (wantsCertificate) {
            try {
              sessionStorage.removeItem('pending-certificate-skipped');
            } catch {
              // Ignore session write failures
            }
            navigate('/design-certificate');
          } else {
            sessionStorage.removeItem('pending-certificate-config');
            markPipelineCertificateSkipped();
            navigate('/create-survey');
          }
          return;
        }

        setSubmitMessage('Event updated successfully!');
        setTimeout(() => {
          navigate('/organizer');
        }, 1500);
      } catch (error) {
        await statusError(error, 'generic', { confirmText: 'Try again' });
      } finally {
        setInitializing(false);
      }

      return;
    }

    // Create mode: Prepare event data (don't save to database yet)



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


    // Handle event programmes

    if (uploadedFiles.eventProgrammes && uploadedFiles.eventProgrammes.length > 0) {

      eventData.event_programmes_url = uploadedFiles.eventProgrammes.map(f => f.url).join(',');

    }






    // Handle event kits

    if (uploadedFiles.eventKits && uploadedFiles.eventKits.length > 0) {

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

    // Create mode: Navigate to survey creation immediately
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


    setValue('sponsors', '');

    setValue('guestSpeakers', '');

    // Clear speakers
    setSpeakers([]);
    setShowAddSpeaker(false);
    // Clear sponsors
    setSponsors([]);
    setShowAddSponsor(false);
  };

  const pageTitle = 'Edit Event';
  const pageSubtitle = currentEvent?.status === 'draft'
    ? 'Finish the event details, then continue to certificate and evaluation.'
    : 'Update the event details.';
  const submitButtonLabel = currentEvent?.status === 'draft' ? 'Continue' : 'Save Changes';

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

  if (isEditMode && initializing) {
    return <PageSkeleton variant="form" />;
  }

  if (submitError) {
    return (
      <ErrorState
        error={submitError}
        onRetry={() => {
          setSubmitError('');
          navigate('/organizer');
        }}
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

  const mode = 'edit';
  const onSaveDraft = undefined;
  const isSavingDraft = false;
  const onClearDraft = undefined;
  const headerExtra = currentEvent?.status === 'draft' ? (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="font-semibold text-amber-900">This event is still a draft</p>
      <p className="text-sm text-amber-800">Use Continue to finish the event details, then go on to certificate and evaluation.</p>
    </div>
  ) : null;
  const afterMaterials = null;

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
      certificateDone={hasExistingCertificate}
    />
  );
};
