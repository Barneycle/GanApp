import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EventService } from '../../services/eventService';
import { SpeakerService } from '../../services/speakerService';
import { SponsorService } from '../../services/sponsorService';
import { SurveyService } from '../../services/surveyService';
import { CertificateService } from '../../services/certificateService';
import { useAuth } from '../../contexts/AuthContext';

// Zod validation schema for survey questions
const questionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  questionType: z.enum([
    'short-answer', 'paragraph', 'multiple-choice', 'checkbox', 
    'dropdown', 'linear-scale', 'star-rating', 'multiple-choice-grid', 
    'checkbox-grid', 'date', 'time'
  ]),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  scaleMin: z.number().min(1).max(10).optional(),
  scaleMax: z.number().min(1).max(10).optional(),
  lowestLabel: z.string().optional(),
  highestLabel: z.string().optional(),
  rows: z.array(z.string()).optional(),
  columns: z.array(z.string()).optional(),
});

const createSurveySchema = z.object({
  questions: z.array(questionSchema).min(1, 'At least one question is required'),
});

export const CreateSurvey = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingEventData, setPendingEventData] = useState(null);
  const [pendingEventFiles, setPendingEventFiles] = useState(null);
  const [pendingSpeakers, setPendingSpeakers] = useState([]);
  const [pendingSponsors, setPendingSponsors] = useState([]);

  // Get saved form data from session storage
  const getSavedFormData = () => {
    try {
      const saved = sessionStorage.getItem('create-survey-draft');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      return null;
    }
  };

  // Save form data to session storage
  const saveFormData = (data) => {
    if (!autoSaveEnabled) return; // Don't save if auto-save is disabled
    
    try {
      // Only save non-file fields to session storage
      const dataToSave = {
        questions: data.questions || []
      };
      sessionStorage.setItem('create-survey-draft', JSON.stringify(dataToSave));
    } catch (error) {
      // Error saving form data
    }
  };

  // Clear saved form data
  const clearSavedFormData = () => {
    try {
      sessionStorage.removeItem('create-survey-draft');
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
    resolver: zodResolver(createSurveySchema),
    mode: 'onChange',
    defaultValues: {
      questions: [
        {
          questionText: '',
          questionType: 'short-answer',
          options: [''],
          required: false,
          scaleMin: 1,
          scaleMax: 5,
          lowestLabel: '',
          highestLabel: '',
          rows: [''],
          columns: [''],
        },
      ],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions"
  });

  const watchedQuestions = watch("questions");

  // Check for pending event data on component mount
  useEffect(() => {
    const eventData = sessionStorage.getItem('pending-event-data');
    const eventFiles = sessionStorage.getItem('pending-event-files');
    const eventSpeakers = sessionStorage.getItem('pending-event-speakers');
    const eventSponsors = sessionStorage.getItem('pending-event-sponsors');
    
    if (!eventData) {
      // No pending event data, redirect back to event creation
      alert('Please create an event first before creating a survey.');
      navigate('/create-event');
      return;
    }

    try {
      setPendingEventData(JSON.parse(eventData));
      if (eventFiles) {
        setPendingEventFiles(JSON.parse(eventFiles));
      }
      if (eventSpeakers) {
        const speakers = JSON.parse(eventSpeakers);
        setPendingSpeakers(speakers);
      }
      if (eventSponsors) {
        const sponsors = JSON.parse(eventSponsors);
        setPendingSponsors(sponsors);
      }
    } catch (error) {
      alert('Error loading event data. Please try again.');
      navigate('/create-event');
    }
  }, [navigate]);

  // Restore saved form data on component mount
  useEffect(() => {
    const savedData = getSavedFormData();
    if (savedData && savedData.questions && savedData.questions.length > 0) {
      // Set the saved questions directly using setValue
      setValue('questions', savedData.questions);
    }
  }, [setValue]); // Only depend on setValue

  // Watch form changes and save to session storage
  useEffect(() => {
    const subscription = watch((data) => {
      saveFormData(data);
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

  // Add a function to manually clear saved data (useful for testing)
  const handleClearDraft = () => {
    clearSavedFormData();
    // Reset form to default values using setValue
    setValue('questions', [{
      questionText: '',
      questionType: 'short-answer',
      options: [''],
      required: false,
      scaleMin: 1,
      scaleMax: 5,
      lowestLabel: '',
      highestLabel: '',
      rows: [''],
      columns: [''],
    }]);
  };

  const handleQuestionTypeChange = (questionIndex, newType) => {
    setValue(`questions.${questionIndex}.questionType`, newType);
    
    // Reset type-specific fields when changing question type
    if (newType === 'multiple-choice' || newType === 'checkbox' || newType === 'dropdown') {
      setValue(`questions.${questionIndex}.options`, ['']);
    } else if (newType === 'linear-scale' || newType === 'star-rating') {
      setValue(`questions.${questionIndex}.scaleMin`, 1);
      setValue(`questions.${questionIndex}.scaleMax`, 5);
      setValue(`questions.${questionIndex}.lowestLabel`, '');
      setValue(`questions.${questionIndex}.highestLabel`, '');
    } else if (newType === 'multiple-choice-grid' || newType === 'checkbox-grid') {
      setValue(`questions.${questionIndex}.rows`, ['']);
      setValue(`questions.${questionIndex}.columns`, ['']);
    }
  };

  const addOption = (questionIndex) => {
    const currentOptions = watchedQuestions[questionIndex]?.options || [''];
    setValue(`questions.${questionIndex}.options`, [...currentOptions, '']);
  };

  const removeOption = (questionIndex, optionIndex) => {
    const currentOptions = watchedQuestions[questionIndex]?.options || [''];
    if (currentOptions.length > 1) {
      const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
      setValue(`questions.${questionIndex}.options`, newOptions);
    }
  };

  const addRow = (questionIndex) => {
    const currentRows = watchedQuestions[questionIndex]?.rows || [''];
    setValue(`questions.${questionIndex}.rows`, [...currentRows, '']);
  };

  const removeRow = (questionIndex, rowIndex) => {
    const currentRows = watchedQuestions[questionIndex]?.rows || [''];
    if (currentRows.length > 1) {
      const newRows = currentRows.filter((_, i) => i !== rowIndex);
      setValue(`questions.${questionIndex}.rows`, newRows);
    }
  };

  const addColumn = (questionIndex) => {
    const currentColumns = watchedQuestions[questionIndex]?.columns || [''];
    setValue(`questions.${questionIndex}.columns`, [...currentColumns, '']);
  };

  const removeColumn = (questionIndex, columnIndex) => {
    const currentColumns = watchedQuestions[questionIndex]?.columns || [''];
    if (currentColumns.length > 1) {
      const newColumns = currentColumns.filter((_, i) => i !== columnIndex);
      setValue(`questions.${questionIndex}.columns`, newColumns);
    }
  };

  const addQuestion = () => {
    append({
      questionText: '',
      questionType: 'short-answer',
      options: [''],
      required: false,
      scaleMin: 1,
      scaleMax: 5,
      lowestLabel: '',
      highestLabel: '',
      rows: [''],
      columns: [''],
    });
  };

  const removeQuestion = (questionIndex) => {
    if (fields.length > 1) {
      remove(questionIndex);
    }
  };

  const getQuestionTypeIcon = (type) => {
    const icons = {
      'short-answer': '✏️',
      'paragraph': '📝',
      'multiple-choice': '🔘',
      'checkbox': '☑️',
      'dropdown': '📋',
      'linear-scale': '📊',
      'star-rating': '⭐',
      'multiple-choice-grid': '📊',
      'checkbox-grid': '☑️',
      'date': '📅',
      'time': '⏰'
    };
    return icons[type] || '❓';
  };

  const renderQuestionPreview = (question, qIndex) => {
    const { questionType, options = [], scaleMin = 1, scaleMax = 5, lowestLabel, highestLabel, rows = [], columns = [] } = question;

    switch (questionType) {
      case 'short-answer':
        return (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400"
              disabled
            />
          </div>
        );

      case 'paragraph':
        return (
          <div className="space-y-2">
            <textarea
              placeholder="Type your detailed answer here..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-800 placeholder-slate-400 resize-none"
              disabled
            />
          </div>
        );

      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {options.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={`preview-${qIndex}`}
                  className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  disabled
                />
                <span className="text-slate-700">{option || `Option ${index + 1}`}</span>
              </label>
            ))}
            {options.length === 0 && (
              <p className="text-slate-500 text-sm italic">No options added yet</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-3">
            {options.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  disabled
                />
                <span className="text-slate-700">{option || `Option ${index + 1}`}</span>
              </label>
            ))}
            {options.length === 0 && (
              <p className="text-slate-500 text-sm italic">No options added yet</p>
            )}
          </div>
        );

      case 'dropdown':
        return (
          <div className="space-y-2">
            <select className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-800">
              <option value="" disabled selected>Select an option...</option>
              {options.map((option, index) => (
                <option key={index} value={index}>
                  {option || `Option ${index + 1}`}
                </option>
              ))}
            </select>
            {options.length === 0 && (
              <p className="text-slate-500 text-sm italic">No options added yet</p>
            )}
          </div>
        );

      case 'linear-scale':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>{lowestLabel || `${scaleMin}`}</span>
              <span>{highestLabel || `${scaleMax}`}</span>
            </div>
            <div className="flex items-center justify-between space-x-2">
              {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i).map((value) => (
                <label key={value} className="flex flex-col items-center space-y-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`preview-scale-${qIndex}`}
                    value={value}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    disabled
                  />
                  <span className="text-sm text-slate-700">{value}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'star-rating':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-1">
              {Array.from({ length: scaleMax }, (_, i) => i + 1).map((star) => (
                <button
                  key={star}
                  type="button"
                  className="text-2xl text-slate-300 hover:text-yellow-400 transition-colors"
                  disabled
                >
                  ⭐
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-600">
              {scaleMin} to {scaleMax} stars
            </p>
          </div>
        );

      case 'multiple-choice-grid':
      case 'checkbox-grid':
        return (
          <div className="space-y-4">
            {rows.length > 0 && columns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-slate-300 bg-slate-100 px-4 py-2 text-left text-sm font-medium text-slate-700">
                        Question
                      </th>
                      {columns.map((column, colIndex) => (
                        <th key={colIndex} className="border border-slate-300 bg-slate-100 px-4 py-2 text-center text-sm font-medium text-slate-700">
                          {column || `Column ${colIndex + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className="border border-slate-300 px-4 py-2 text-sm text-slate-700">
                          {row || `Row ${rowIndex + 1}`}
                        </td>
                        {columns.map((_, colIndex) => (
                          <td key={colIndex} className="border border-slate-300 px-4 py-2 text-center">
                            <input
                              type={questionType === 'multiple-choice-grid' ? 'radio' : 'checkbox'}
                              name={`preview-grid-${qIndex}-${rowIndex}`}
                              className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                              disabled
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-slate-500 text-sm italic">Add rows and columns to see the grid</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <input
              type="date"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-800"
              disabled
            />
          </div>
        );

      case 'time':
        return (
          <div className="space-y-2">
            <input
              type="time"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-800"
              disabled
            />
          </div>
        );

      default:
        return (
          <div className="text-slate-500 text-sm italic">
            Select a question type to see preview
          </div>
        );
    }
  };

  const onSubmit = async (data) => {
    if (!pendingEventData) {
      alert('No event data found. Please create an event first.');
      navigate('/create-event');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create the event in the database
      
      // Create the event (EventService handles its own timeouts)
      const eventResult = await EventService.createEvent(pendingEventData);
      if (eventResult.error) {
        throw new Error(`Event creation failed: ${eventResult.error}`);
      }
      const eventId = eventResult.event.id;

      // Step 1.5: Create and link speakers to the event
      if (pendingSpeakers && pendingSpeakers.length > 0) {
        
        for (const speakerData of pendingSpeakers) {
          try {
            // Only create speaker if they have required fields
            if (!speakerData.first_name || !speakerData.last_name) {
              continue;
            }

            // Create the speaker in the database
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
              phone: speakerData.phone ? speakerData.phone.replace(/\D/g, '') : '', // Remove all non-digits
              photo_url: speakerData.photo_url && speakerData.photo_url.trim() ? speakerData.photo_url.trim() : ''
            };

            const speakerResult = await SpeakerService.createSpeaker(speakerToCreate);
            
            if (speakerResult.error) {
              continue; // Continue with other speakers even if one fails
            }

            // Link the speaker to the event
            const linkResult = await SpeakerService.addSpeakerToEvent(
              eventId, 
              speakerResult.speaker.id, 
              {
                order: speakerData.speaker_order || 0,
                isKeynote: speakerData.is_keynote || false
              }
            );

            // Speaker linked (or failed silently)

          } catch (speakerError) {
            // Continue with other speakers
          }
        }
        
      }

      // Step 1.6: Create and link sponsors to the event
      if (pendingSponsors && pendingSponsors.length > 0) {
        
        for (const sponsorData of pendingSponsors) {
          try {
            // Only create sponsor if they have required fields
            if (!sponsorData.name) {
              continue;
            }

            // Create the sponsor in the database
            const sponsorToCreate = {
              name: sponsorData.name,
              contact_person: sponsorData.contact_person || '',
              email: sponsorData.email || '',
              phone: sponsorData.phone ? sponsorData.phone.replace(/\D/g, '') : '', // Remove all non-digits
              address: sponsorData.address || '',
              logo_url: sponsorData.logo_url && sponsorData.logo_url.trim() ? sponsorData.logo_url.trim() : '',
              role: sponsorData.role || '',
              contribution: sponsorData.contribution || ''
            };

            const sponsorResult = await SponsorService.createSponsor(sponsorToCreate);
            
            if (sponsorResult.error) {
              continue; // Continue with other sponsors even if one fails
            }

            // Link the sponsor to the event
            const linkResult = await SponsorService.addSponsorToEvent(
              eventId, 
              sponsorResult.sponsor.id, 
              {
                order: sponsorData.sponsor_order || 0
              }
            );

            // Sponsor linked (or failed silently)

          } catch (sponsorError) {
            // Continue with other sponsors
          }
        }
        
      }

      // Step 1.7: Create certificate template record if template URL exists
      if (pendingEventData.certificate_templates_url && pendingEventData.certificate_templates_url.trim()) {
        try {
          const templateUrl = pendingEventData.certificate_templates_url.split(',')[0].trim();
          
          // Get name placement from sessionStorage if available
          let namePlacement = null;
          try {
            const storedPlacement = sessionStorage.getItem('certificate-name-placement');
            if (storedPlacement) {
              namePlacement = JSON.parse(storedPlacement);
            }
          } catch (e) {
            console.warn('Failed to parse certificate name placement from sessionStorage:', e);
          }
          
          const templateResult = await CertificateService.createOrUpdateTemplate(
            eventId,
            templateUrl,
            user.id,
            `Certificate Template for ${pendingEventData.title}`,
            `Certificate template for event: ${pendingEventData.title}`,
            namePlacement
          );
          
          if (templateResult.error) {
            console.warn('Failed to create certificate template record:', templateResult.error);
            // Continue without failing - template URL is still stored in event
          }
        } catch (templateError) {
          console.warn('Error creating certificate template record:', templateError);
          // Continue without failing - template URL is still stored in event
        }
      }

      // Step 2: Create the survey in the database
      
      // Transform questions to match the Survey interface
      const transformedQuestions = data.questions.map((q, index) => ({
        id: `q_${index + 1}`,
        type: q.questionType === 'multiple-choice' || q.questionType === 'checkbox' ? 'multiple_choice' : 
               q.questionType === 'linear-scale' || q.questionType === 'star-rating' ? 'rating' : 
               q.questionType === 'yes-no' ? 'yes_no' : 'text',
        question: q.questionText,
        required: q.required,
        options: q.options && q.options.length > 0 ? q.options.filter(opt => opt.trim()) : undefined,
        min_rating: q.scaleMin,
        max_rating: q.scaleMax
      }));
      
      const surveyData = {
        event_id: eventId,
        title: `Survey for ${pendingEventData.title}`,
        description: `Survey for event: ${pendingEventData.title}`,
        questions: transformedQuestions,
        created_by: user.id,
        is_active: true,
        is_open: true,
        opens_at: null,
        closes_at: null
      };
      
      const surveyResult = await SurveyService.createSurvey(surveyData);
      
      if (surveyResult.error) {
        throw new Error(`Survey creation failed: ${surveyResult.error}`);
      }

      if (!surveyResult.survey) {
        throw new Error('Survey creation failed: No survey data returned');
      }

      const surveyId = surveyResult.survey.id;

      // Clear all saved data
      clearSavedFormData();
      sessionStorage.removeItem('pending-event-data');
      sessionStorage.removeItem('pending-event-files');
      sessionStorage.removeItem('pending-event-speakers');
      sessionStorage.removeItem('pending-event-sponsors');
      
      // Show success message
      alert(`Event and Survey created successfully!\nEvent ID: ${eventId}\nSurvey ID: ${surveyId}\nQuestions: ${data.questions.length}`);
      
      // Navigate to organizer dashboard
      navigate('/organizer');
      
    } catch (err) {
      alert(`Failed to create event/survey: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center mb-4">
            <button
              onClick={() => {
                // Navigate back to event creation WITHOUT clearing data
                navigate('/create-event');
              }}
              className="p-3 rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-200 mr-4 group"
              aria-label="Back to create event"
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
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent">
              Create Survey
            </h1>
          </div>
          <p className="text-slate-600 text-lg sm:text-xl max-w-2xl mx-auto">
            Design engaging questions to gather valuable feedback from your event participants
          </p>
          
          {/* Event Preview */}
          {pendingEventData && (
            <div className="mt-6 bg-white rounded-xl shadow-lg border border-slate-200 p-4 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Event Details</h3>
              <div className="text-sm text-slate-600 space-y-1">
                <p><strong>Title:</strong> {pendingEventData.title}</p>
                <p><strong>Date:</strong> {pendingEventData.start_date} - {pendingEventData.end_date}</p>
                <p><strong>Time:</strong> {pendingEventData.start_time} - {pendingEventData.end_time}</p>
                {pendingEventData.rationale && (
                  <p><strong>Description:</strong> {pendingEventData.rationale}</p>
                )}
              </div>
            </div>
          )}
          
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
            
            {/* Preview Toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200 font-medium text-base shadow-sm hover:shadow-md"
              title="Toggle preview"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
            </button>
            
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
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div className="mb-8 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h3 className="text-lg font-semibold text-slate-800">Survey Preview</h3>
                <span className="text-sm text-slate-600">How your questions will appear to participants</span>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {watchedQuestions.map((question, qIndex) => (
                <div key={qIndex} className="border border-slate-200 rounded-xl p-6 bg-slate-50">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      {qIndex + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-slate-800 mb-1">
                        {question.questionText || 'Question text will appear here'}
                      </h4>
                      {question.required && (
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Render different question types */}
                  {renderQuestionPreview(question, qIndex)}
                </div>
              ))}
              
              {watchedQuestions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium">No questions yet</p>
                  <p className="text-sm">Add questions below to see them in preview</p>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
          {fields.map((field, qIndex) => (
            <div 
              key={field.id} 
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden"
            >
              {/* Question Header */}
              <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                      {qIndex + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Question {qIndex + 1}</h3>
                      <p className="text-sm text-slate-600">Configure your question settings</p>
                    </div>
                  </div>
                  
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition-all duration-200"
                      aria-label="Remove question"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Question Content */}
              <div className="p-6 space-y-6">
                {/* Question Text */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Question Text
                  </label>
                  <input
                    type="text"
                    placeholder="What would you like to ask?"
                    {...control.register(`questions.${qIndex}.questionText`)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                  />
                  {errors.questions?.[qIndex]?.questionText && (
                    <p className="text-red-500 text-xs mt-1">{errors.questions[qIndex].questionText.message}</p>
                  )}
                </div>

                {/* Question Type */}
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    Question Type
                  </label>
                  <Controller
                    name={`questions.${qIndex}.questionType`}
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        onChange={(e) => handleQuestionTypeChange(qIndex, e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 bg-white"
                      >
                        <option value="short-answer">📝 Short Answer</option>
                        <option value="paragraph">📄 Paragraph</option>
                        <option value="multiple-choice">🔘 Multiple Choice</option>
                        <option value="checkbox">☑️ Checkbox</option>
                        <option value="dropdown">📋 Dropdown</option>
                        <option value="linear-scale">📊 Linear Scale</option>
                        <option value="star-rating">⭐ Star Rating</option>
                        <option value="multiple-choice-grid">📊 Multiple Choice Grid</option>
                        <option value="checkbox-grid">☑️ Checkbox Grid</option>
                        <option value="date">📅 Date</option>
                        <option value="time">🕐 Time</option>
                      </select>
                    )}
                  />
                </div>

                {/* Options for multiple choice, checkbox, and dropdown */}
                {(watch(`questions.${qIndex}.questionType`) === 'multiple-choice' || watch(`questions.${qIndex}.questionType`) === 'checkbox' || watch(`questions.${qIndex}.questionType`) === 'dropdown') && (
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Options
                    </label>
                    <div className="space-y-2">
                      {watch(`questions.${qIndex}.options`).map((option, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...watch(`questions.${qIndex}.options`)];
                                newOptions[index] = e.target.value;
                                setValue(`questions.${qIndex}.options`, newOptions);
                              }}
                              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                              placeholder={`Option ${index + 1}`}
                            />
                          </div>
                          {watch(`questions.${qIndex}.options`).length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeOption(qIndex, index)}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-all duration-200"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => addOption(qIndex)}
                      className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Option</span>
                    </button>
                  </div>
                )}

                {/* Scale settings for linear scale and star rating */}
                {(watch(`questions.${qIndex}.questionType`) === 'linear-scale' || watch(`questions.${qIndex}.questionType`) === 'star-rating') && (
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Scale Configuration
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-600">Minimum Value</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          {...control.register(`questions.${qIndex}.scaleMin`)}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200"
                        />
                        {errors.questions?.[qIndex]?.scaleMin && (
                          <p className="text-red-500 text-xs mt-1">{errors.questions[qIndex].scaleMin.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-600">Maximum Value</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          {...control.register(`questions.${qIndex}.scaleMax`)}
                          className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200"
                        />
                        {errors.questions?.[qIndex]?.scaleMax && (
                          <p className="text-red-500 text-xs mt-1">{errors.questions[qIndex].scaleMax.message}</p>
                        )}
                      </div>
                    </div>
                    {watch(`questions.${qIndex}.questionType`) === 'linear-scale' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-600">Lowest Label</label>
                          <input
                            type="text"
                            value={watch(`questions.${qIndex}.lowestLabel`) || ''}
                            onChange={(e) => {
                              const newLowestLabel = e.target.value;
                              setValue(`questions.${qIndex}.lowestLabel`, newLowestLabel);
                            }}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                            placeholder="e.g., Very dissatisfied"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-600">Highest Label</label>
                          <input
                            type="text"
                            value={watch(`questions.${qIndex}.highestLabel`) || ''}
                            onChange={(e) => {
                              const newHighestLabel = e.target.value;
                              setValue(`questions.${qIndex}.highestLabel`, newHighestLabel);
                            }}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                            placeholder="e.g., Very satisfied"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Grid settings for multiple choice grid and checkbox grid */}
                {(watch(`questions.${qIndex}.questionType`) === 'multiple-choice-grid' || watch(`questions.${qIndex}.questionType`) === 'checkbox-grid') && (
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Grid Configuration
                    </label>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-600">Row Labels</label>
                        <div className="space-y-2">
                          {watch(`questions.${qIndex}.rows`)?.map((row, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={row}
                                onChange={(e) => {
                                  const newRows = [...watch(`questions.${qIndex}.rows`)];
                                  newRows[index] = e.target.value;
                                  setValue(`questions.${qIndex}.rows`, newRows);
                                }}
                                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                                placeholder={`Row ${index + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => removeRow(qIndex, index)}
                                className="p-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-all duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addRow(qIndex)}
                          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Add Row</span>
                        </button>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-600">Column Labels</label>
                        <div className="space-y-2">
                          {watch(`questions.${qIndex}.columns`)?.map((column, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="text"
                                value={column}
                                onChange={(e) => {
                                  const newColumns = [...watch(`questions.${qIndex}.columns`)];
                                  newColumns[index] = e.target.value;
                                  setValue(`questions.${qIndex}.columns`, newColumns);
                                }}
                                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                                placeholder={`Column ${index + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => removeColumn(qIndex, index)}
                                className="p-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-all duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addColumn(qIndex)}
                          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Add Column</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Required Toggle */}
                <div className="flex items-center space-x-3 pt-4 border-t border-slate-100">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...control.register(`questions.${qIndex}.required`)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-all duration-200 ${
                      watch(`questions.${qIndex}.required`) ? 'bg-blue-600' : 'bg-slate-200'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                        watch(`questions.${qIndex}.required`) ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                  </label>
                  <span className="text-sm font-medium text-slate-700">Required Question</span>
                </div>
              </div>
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4 pt-8">
            <button
              type="button"
              onClick={addQuestion}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 px-8 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add New Question</span>
              </span>
            </button>
            
            <button
              type="submit"
              disabled={loading || !isValid}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-800 text-white py-4 px-8 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span className="flex items-center justify-center space-x-2">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Creating Event & Survey...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Create Event & Survey</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default CreateSurvey;
