import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AlbumService } from '../../services/albumService';
import { downloadImageWithAttribution } from '../../services/imageAttribution';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { Search, Filter, X, ChevronLeft, ChevronRight, Download, CheckCircle2, Images, Calendar, MapPin, RefreshCw, Upload, Camera } from 'lucide-react';
import { useToast } from '../Toast';

// Type definitions (using JSDoc for JSX file)
/** @typedef {'all' | 'upcoming' | 'past'} DateFilter */
/** @typedef {'date-asc' | 'date-desc' | 'title-asc' | 'title-desc' | 'photos-asc' | 'photos-desc'} SortOption */

// Helper function to check if user profile is complete
const isProfileComplete = (user) => {
  if (!user) return false;
  const hasFirstName = user.first_name?.trim() !== '';
  const hasLastName = user.last_name?.trim() !== '';
  const hasAffiliatedOrg = user.affiliated_organization?.trim() !== '';
  return hasFirstName && hasLastName && hasAffiliatedOrg;
};

export const Albums = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isFullScreenVisible, setIsFullScreenVisible] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [downloadingPhotoId, setDownloadingPhotoId] = useState(null);
  const [downloadedPhotoIds, setDownloadedPhotoIds] = useState(new Set());
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadAllProgress, setDownloadAllProgress] = useState({ current: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [venueFilter, setVenueFilter] = useState('all');
  const [sortOption, setSortOption] = useState('date-asc');
  const [showFilters, setShowFilters] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [uploadingEventId, setUploadingEventId] = useState(null);
  const fileInputRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'warning',
  });

  // Load downloaded photo IDs from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('downloaded_photo_ids');
      if (stored) {
        const ids = JSON.parse(stored);
        setDownloadedPhotoIds(new Set(ids));
      }
    } catch (error) {
      console.log('Error loading downloaded photos:', error);
    }
  }, []);

  // Save downloaded photo ID to sessionStorage
  const markPhotoAsDownloaded = (photoId) => {
    try {
      const newSet = new Set(downloadedPhotoIds);
      newSet.add(photoId);
      setDownloadedPhotoIds(newSet);
      sessionStorage.setItem('downloaded_photo_ids', JSON.stringify(Array.from(newSet)));
    } catch (error) {
      console.log('Error saving downloaded photo ID:', error);
    }
  };

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await AlbumService.getEventsWithPhotos();
      
      if (result.error) {
        setError(result.error);
        setEvents([]);
      } else {
        setEvents(result.events || []);
      }
    } catch (err) {
      console.error('Error loading events:', err);
      setError('Failed to load event albums');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Redirect to setup-profile if profile is incomplete
    if (!isProfileComplete(user)) {
      navigate('/setup-profile');
      return;
    }

    // Only load once on mount, prevent reloading when switching tabs/windows
    if (!hasLoadedRef.current && user?.id) {
      hasLoadedRef.current = true;
      loadEvents();
    } else if (!hasLoadedRef.current && !user?.id) {
      // If user.id is not available yet, wait a bit and try again
      const timeoutId = setTimeout(() => {
        if (user?.id && !hasLoadedRef.current) {
          hasLoadedRef.current = true;
          loadEvents();
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [user, isAuthenticated, authLoading, navigate, loadEvents]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get unique venues from events
  const uniqueVenues = useMemo(() => {
    const venues = events
      .map(event => event.venue)
      .filter(venue => !!venue && venue !== 'Location TBD' && venue.trim() !== '');
    return Array.from(new Set(venues)).sort();
  }, [events]);

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = [...events];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        (event.venue && event.venue.toLowerCase().includes(query))
      );
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'upcoming') {
      filtered = filtered.filter(event => new Date(event.start_date) >= now);
    } else if (dateFilter === 'past') {
      filtered = filtered.filter(event => new Date(event.end_date) < now);
    }

    // Venue filter
    if (venueFilter !== 'all') {
      filtered = filtered.filter(event => event.venue === venueFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-asc':
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
        case 'date-desc':
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'photos-asc':
          return (a.photo_count || 0) - (b.photo_count || 0);
        case 'photos-desc':
          return (b.photo_count || 0) - (a.photo_count || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [events, searchQuery, dateFilter, venueFilter, sortOption]);

  const openFullScreen = (photo, event) => {
    const index = event.photos.findIndex(p => p.id === photo.id);
    const photoIndex = index >= 0 ? index : 0;
    setCurrentPhotoIndex(photoIndex);
    setSelectedEvent(event);
    setSelectedPhoto(photo);
    setIsFullScreenVisible(true);
  };

  const downloadPhoto = async (photo) => {
    if (downloadingPhotoId === photo.id) return;
    
    // Check if already downloaded and show warning
    const isAlreadyDownloaded = downloadedPhotoIds.has(photo.id);
    if (isAlreadyDownloaded) {
      setConfirmationDialog({
        isOpen: true,
        title: 'Photo Already Downloaded',
        message: 'This photo has already been downloaded. Do you want to download it again?',
        onConfirm: async () => {
          await performDownload(photo);
        },
        type: 'warning',
      });
      return;
    }
    
    await performDownload(photo);
  };

  const performDownload = async (photo) => {
    setDownloadingPhotoId(photo.id);
    try {
      // Download image with attribution watermark
      await downloadImageWithAttribution(
        photo.photo_url,
        photo.id,
        photo.file_name || `GanApp_${photo.id}_${Date.now()}.jpg`,
        photo.uploaded_by
      );
      
      markPhotoAsDownloaded(photo.id);
    } catch (error) {
      console.error('Error downloading photo:', error);
      setError('Failed to download photo.');
    } finally {
      setDownloadingPhotoId(null);
    }
  };

  const downloadAllPhotos = async (event) => {
    if (isDownloadingAll || !event.photos || event.photos.length === 0) return;

    // Check if there are already downloaded photos and show warning
    const alreadyDownloaded = event.photos.filter(photo => downloadedPhotoIds.has(photo.id));
    if (alreadyDownloaded.length > 0) {
      setConfirmationDialog({
        isOpen: true,
        title: 'Some Photos Already Downloaded',
        message: `${alreadyDownloaded.length} photo(s) have already been downloaded. Do you want to download all photos again (including already downloaded ones)?`,
        onConfirm: async () => {
          await performDownloadAll(event);
        },
        type: 'warning',
      });
      return;
    }

    await performDownloadAll(event);
  };

  const handleUploadClick = async (event) => {
    // Check if user can upload (participant or organizer)
    if (user?.role !== 'participant' && user?.role !== 'organizer') {
      toast.showToast('Only participants and organizers can upload photos.', 'error');
      return;
    }

    if (!user?.id) {
      toast.showToast('You must be logged in to upload photos.', 'error');
      return;
    }

    // Check photo limit
    const limitCheck = await AlbumService.getUserPhotoCount(event.id, user.id);
    if (limitCheck.error) {
      toast.showToast('Could not check photo limit. Please try again.', 'error');
      return;
    }

    const PHOTO_LIMIT = 10;
    if (limitCheck.count >= PHOTO_LIMIT) {
      toast.showToast(`You have reached the limit of ${PHOTO_LIMIT} photos per event.`, 'error');
      return;
    }

    // Set the event for upload and trigger file input
    setUploadingEventId(event.id);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !uploadingEventId || !user?.id) {
      setUploadingEventId(null);
      return;
    }

    // Check photo limit
    const limitCheck = await AlbumService.getUserPhotoCount(uploadingEventId, user.id);
    if (limitCheck.error) {
      toast.showToast('Could not check photo limit. Please try again.', 'error');
      setUploadingEventId(null);
      return;
    }

    const PHOTO_LIMIT = 10;
    const remainingSlots = PHOTO_LIMIT - limitCheck.count;
    
    if (remainingSlots <= 0) {
      toast.showToast(`You have reached the limit of ${PHOTO_LIMIT} photos per event.`, 'error');
      setUploadingEventId(null);
      return;
    }

    // Limit files to remaining slots
    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.showToast(`You can only upload ${remainingSlots} more photo(s). Only ${remainingSlots} photo(s) will be uploaded.`, 'warning');
    }

    await uploadPhotos(filesToUpload, uploadingEventId);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUploadingEventId(null);
  };

  const uploadPhotos = async (files, eventId) => {
    if (!user?.id) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: files.length, percentage: 0 });

    const progressState = { photoProgress: new Array(files.length).fill(0) };

    const updateProgress = () => {
      const photoProgress = progressState.photoProgress;
      const totalProgress = photoProgress.reduce((sum, p) => sum + p, 0);
      const averageProgress = totalProgress / files.length;
      const percentage = Math.round(averageProgress);
      const completedPhotos = photoProgress.filter(p => p >= 100).length;

      setUploadProgress({
        current: completedPhotos,
        total: files.length,
        percentage: Math.min(percentage, 100),
      });
    };

    let successCount = 0;
    let failCount = 0;

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          await AlbumService.uploadPhoto(
            file,
            eventId,
            user.id,
            (progress) => {
              progressState.photoProgress[i] = Math.max(
                progressState.photoProgress[i],
                Math.min(progress, 100)
              );
              updateProgress();
            }
          );
          successCount++;
        } catch (error) {
          console.error(`Error uploading photo ${i + 1}:`, error);
          failCount++;
        }
      }

      // Refresh events to show new photos
      await loadEvents();

      if (successCount > 0) {
        toast.showToast(
          `Successfully uploaded ${successCount} photo(s)${failCount > 0 ? ` (${failCount} failed)` : ''}!`,
          'success'
        );
      } else {
        toast.showToast('Failed to upload photos. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.showToast('Failed to upload photos. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0, percentage: 0 });
    }
  };

  const performDownloadAll = async (event) => {
    setIsDownloadingAll(true);
    setDownloadAllProgress({ current: 0, total: event.photos.length });

    let successCount = 0;
    let failCount = 0;

    try {
      // Download all photos (including already downloaded ones)
      const photosToDownload = event.photos;

      // Download each photo sequentially
      for (let i = 0; i < photosToDownload.length; i++) {
        const photo = photosToDownload[i];
        setDownloadAllProgress({ current: i + 1, total: photosToDownload.length });
        setDownloadingPhotoId(photo.id);

        try {
          // Download image with attribution watermark
          await downloadImageWithAttribution(
            photo.photo_url,
            photo.id,
            photo.file_name || `GanApp_${photo.id}_${Date.now()}.jpg`,
            photo.uploaded_by
          );
          
          markPhotoAsDownloaded(photo.id);
          successCount++;
          
          // Small delay between downloads
          if (i < photosToDownload.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`Error downloading photo ${photo.id}:`, error);
          failCount++;
        } finally {
          setDownloadingPhotoId(null);
        }
      }

    } catch (error) {
      console.error('Error in downloadAllPhotos:', error);
    } finally {
      setIsDownloadingAll(false);
      setDownloadAllProgress({ current: 0, total: 0 });
      setDownloadingPhotoId(null);
    }
  };

  const navigatePhoto = (direction) => {
    if (!selectedEvent) return;
    
    if (direction === 'prev') {
      setCurrentPhotoIndex(prev => (prev > 0 ? prev - 1 : selectedEvent.photos.length - 1));
    } else {
      setCurrentPhotoIndex(prev => (prev < selectedEvent.photos.length - 1 ? prev + 1 : 0));
    }
  };

  // Keyboard navigation for full screen viewer
  useEffect(() => {
    if (!isFullScreenVisible) return;

    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') navigatePhoto('prev');
      if (e.key === 'ArrowRight') navigatePhoto('next');
      if (e.key === 'Escape') setIsFullScreenVisible(false);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullScreenVisible, selectedEvent]);

  // Check if user can upload photos
  const canUploadPhotos = user && (user.role === 'participant' || user.role === 'organizer');

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading...</p>
        </div>
      </section>
    );
  }

  // Show loading state while fetching events or if not authenticated yet
  if (loading || !isAuthenticated || !user) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
          <p className="text-slate-600 text-lg">Loading albums...</p>
        </div>
      </section>
    );
  }

  if (error && events.length === 0) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Error Loading Albums</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={loadEvents}
            className="bg-blue-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hidden file input for photo uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      
      {/* Upload Progress Indicator */}
      {isUploading && uploadProgress.total > 0 && (
        <div className="fixed top-20 right-4 bg-white rounded-xl shadow-xl p-4 z-50 min-w-[300px] border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <Upload className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-slate-800">Uploading Photos</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress.percentage}%` }}
            />
          </div>
          <p className="text-sm text-slate-600 text-center">
            {uploadProgress.current} of {uploadProgress.total} photos uploaded ({uploadProgress.percentage}%)
          </p>
        </div>
      )}
      
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-2">Event Albums</h1>
              <p className="text-lg text-slate-600">Browse photos from events</p>
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-3 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter and Sort Controls */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow ${
                (dateFilter !== 'all' || venueFilter !== 'all') ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              <Filter className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-slate-700">Filters</span>
              {(dateFilter !== 'all' || venueFilter !== 'all') && (
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              )}
            </button>
            
            <button
              onClick={() => {
                const sortOptions = ['date-asc', 'date-desc', 'title-asc', 'title-desc', 'photos-asc', 'photos-desc'];
                const currentIndex = sortOptions.indexOf(sortOption);
                const nextIndex = (currentIndex + 1) % sortOptions.length;
                setSortOption(sortOptions[nextIndex]);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
            >
              <span className="font-medium text-slate-700">
                {sortOption === 'date-asc' ? 'Date ↑' :
                 sortOption === 'date-desc' ? 'Date ↓' :
                 sortOption === 'title-asc' ? 'Title A-Z' :
                 sortOption === 'title-desc' ? 'Title Z-A' :
                 sortOption === 'photos-asc' ? 'Photos ↑' :
                 'Photos ↓'}
              </span>
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white rounded-xl p-4 mb-4 shadow-md">
              <h3 className="text-lg font-bold text-slate-800 mb-3">Date Filter</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {['all', 'upcoming', 'past'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDateFilter(filter)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      dateFilter === filter
                        ? 'bg-blue-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {filter === 'all' ? 'All' : filter === 'upcoming' ? 'Upcoming' : 'Past'}
                  </button>
                ))}
              </div>

              {uniqueVenues.length > 0 && (
                <>
                  <h3 className="text-lg font-bold text-slate-800 mb-3">Venue</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setVenueFilter('all')}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        venueFilter === 'all'
                          ? 'bg-blue-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      All Venues
                    </button>
                    {uniqueVenues.map((venue) => (
                      <button
                        key={venue}
                        onClick={() => setVenueFilter(venue)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          venueFilter === venue
                            ? 'bg-blue-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {venue}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Events Grid */}
        {filteredAndSortedEvents.length === 0 ? (
          events.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <Images className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">No Albums Yet</h2>
              <p className="text-slate-600">Photos uploaded by participants will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <Search className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-800 mb-2">No Results Found</h2>
              <p className="text-slate-600">Try adjusting your search or filters</p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow"
              >
                {/* Event Header */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-slate-800 flex-1 mr-3 line-clamp-2">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {canUploadPhotos && (
                        <button
                          onClick={() => handleUploadClick(event)}
                          disabled={isUploading && uploadingEventId === event.id}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          title="Upload Photos"
                        >
                          <Upload className="w-4 h-4" />
                          Upload
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setIsModalVisible(true);
                        }}
                        className="px-3 py-1.5 bg-blue-900 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors whitespace-nowrap"
                      >
                        View All
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(event.start_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Images className="w-4 h-4" />
                      <span>{event.photo_count} {event.photo_count === 1 ? 'photo' : 'photos'}</span>
                    </div>
                  </div>
                </div>

                {/* Photo Grid Preview */}
                {event.photos && event.photos.length > 0 && (
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-2">
                      {event.photos.slice(0, 4).map((photo, index) => (
                        <button
                          key={photo.id}
                          onClick={() => openFullScreen(photo, event)}
                          className="relative aspect-square rounded-xl overflow-hidden group"
                        >
                          <img
                            src={photo.photo_url}
                            alt={`${event.title} photo ${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          {index === 3 && event.photos.length > 4 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                +{event.photos.length - 4}
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Gallery Modal */}
      {isModalVisible && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex-1 mr-4">
                <h2 className="text-2xl font-bold text-slate-800 line-clamp-1">
                  {selectedEvent.title}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-slate-600">
                  <div className="flex items-center gap-1">
                    <Images className="w-4 h-4" />
                    <span>{selectedEvent.photo_count} {selectedEvent.photo_count === 1 ? 'photo' : 'photos'}</span>
                  </div>
                  {isDownloadingAll && downloadAllProgress.total > 0 && (
                    <span className="text-sm text-blue-600">
                      ({downloadAllProgress.current}/{downloadAllProgress.total})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canUploadPhotos && (
                  <button
                    onClick={() => handleUploadClick(selectedEvent)}
                    disabled={isUploading && uploadingEventId === selectedEvent.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    title="Upload Photos"
                  >
                    {isUploading && uploadingEventId === selectedEvent.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload</span>
                      </>
                    )}
                  </button>
                )}
                {selectedEvent.photos && selectedEvent.photos.length > 0 && (
                  <button
                    onClick={() => downloadAllPhotos(selectedEvent)}
                    disabled={isDownloadingAll}
                    className="px-4 py-2 bg-blue-900 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDownloadingAll ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download All</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={() => setIsModalVisible(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Photo Grid */}
            {selectedEvent.photos && selectedEvent.photos.length > 0 ? (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {selectedEvent.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl overflow-hidden group"
                    >
                      <button
                        onClick={() => openFullScreen(photo, selectedEvent)}
                        className="w-full h-full"
                      >
                        <img
                          src={photo.photo_url}
                          alt={`${selectedEvent.title} photo`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </button>
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {downloadedPhotoIds.has(photo.id) && (
                          <div className="w-2 h-2 bg-green-400 rounded-full" title="Previously downloaded"></div>
                        )}
                        <button
                          onClick={() => downloadPhoto(photo)}
                          disabled={downloadingPhotoId === photo.id}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors disabled:opacity-50"
                          title={downloadedPhotoIds.has(photo.id) ? 'Download again' : 'Download'}
                        >
                          {downloadingPhotoId === photo.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Download className="w-4 h-4 text-white" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <Images className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No photos available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Screen Image Viewer */}
      {isFullScreenVisible && selectedEvent && selectedEvent.photos[currentPhotoIndex] && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={() => setIsFullScreenVisible(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1 text-center px-4">
              <p className="text-white font-semibold text-sm line-clamp-1">
                {selectedEvent.title}
              </p>
              <p className="text-white/70 text-xs mt-1">
                {currentPhotoIndex + 1} of {selectedEvent.photos.length}
              </p>
            </div>
            <button
              onClick={() => {
                const currentPhoto = selectedEvent.photos[currentPhotoIndex];
                downloadPhoto(currentPhoto);
              }}
              disabled={downloadingPhotoId === selectedEvent.photos[currentPhotoIndex].id}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors disabled:opacity-50"
              title={downloadedPhotoIds.has(selectedEvent.photos[currentPhotoIndex].id) ? 'Download again' : 'Download'}
            >
              {downloadingPhotoId === selectedEvent.photos[currentPhotoIndex].id ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Download className="w-5 h-5 text-white" />
              )}
            </button>
          </div>

          {/* Image */}
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={selectedEvent.photos[currentPhotoIndex].photo_url}
              alt={`${selectedEvent.title} photo ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Navigation Buttons */}
          {selectedEvent.photos.length > 1 && (
            <>
              <button
                onClick={() => navigatePhoto('prev')}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={() => navigatePhoto('next')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Thumbnail Strip (optional, can be added later) */}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        onClose={() => setConfirmationDialog({ ...confirmationDialog, isOpen: false })}
        onConfirm={confirmationDialog.onConfirm || (() => {})}
        title={confirmationDialog.title}
        message={confirmationDialog.message}
        confirmText="Confirm"
        cancelText="Cancel"
        type={confirmationDialog.type}
      />
    </section>
  );
};

