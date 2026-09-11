import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronLeft,
  Eye,
  LayoutGrid,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { EventService } from '../../services/eventService';
import { SpeakerService } from '../../services/speakerService';
import { SponsorService } from '../../services/sponsorService';
import { SurveyService } from '../../services/surveyService';
import { CertificateService } from '../../services/certificateService';
import { useAuth } from '../../contexts/AuthContext';
import SimpleRichTextEditor from '../SimpleRichTextEditor';
import { useToast, statusDialog } from '../Toast';
import { FieldError } from '../form/Field';
import { isValidPhMobile, normalizePhMobile } from '../../utils/formFields';
import { emptyQuestion, emptySection, htmlHasText } from '../survey/surveyConstants';
import { createSurveySchema } from '../survey/surveySchemas';
import { duplicateQuestionInList, resetFieldsForQuestionType, transformSectionsToApiQuestions } from '../survey/surveyTransforms';
import { RailIconButton } from '../survey/RailIconButton';
import { QuestionPreview } from '../survey/QuestionPreview';
import { SurveyQuestionCard } from '../survey/SurveyQuestionCard';
import { EventPipelineTracker, isCertificateConfigured, isPipelineCertificateDone, markPipelineCertificateDone, readSessionCertificateConfig, clearPipelineCertificateFlags } from '../eventForm/EventPipelineTracker';

export const CreateSurvey = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedCard, setSelectedCard] = useState({ type: 'question', section: 0, question: 0 });
  const [pendingEventData, setPendingEventData] = useState(null);
  const [_pendingEventFiles, setPendingEventFiles] = useState(null);
  const [pendingSpeakers, setPendingSpeakers] = useState([]);
  const [pendingSponsors, setPendingSponsors] = useState([]);
  const [hasCertificateConfig, setHasCertificateConfig] = useState(() => isPipelineCertificateDone());
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
        sections: data.sections || []
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
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger
  } = useForm({
    resolver: zodResolver(createSurveySchema),
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    criteriaMode: 'firstError',
    defaultValues: {
      sections: [emptySection()]
    }
  });

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control,
    name: "sections"
  });

  const watchedSections = watch("sections");

  const didMountValidate = useRef(false);
  useEffect(() => {
    if (!watchedSections || watchedSections.length === 0) return;
    if (!didMountValidate.current) {
      didMountValidate.current = true;
      return;
    }
    const timeoutId = setTimeout(() => {
      trigger();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [watchedSections, trigger]);


  // Check for pending event data on component mount
  useEffect(() => {
    const eventData = sessionStorage.getItem('pending-event-data');
    const eventFiles = sessionStorage.getItem('pending-event-files');
    const eventSpeakers = sessionStorage.getItem('pending-event-speakers');
    const eventSponsors = sessionStorage.getItem('pending-event-sponsors');

    if (!eventData) {
      // No pending event data, redirect back to event creation
      toast.warning('Please create an event first before creating a survey.');
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
      toast.error('Error loading event data. Please try again.');
      navigate('/create-event');
    }

    const applyCertificateState = (config) => {
      if (!isCertificateConfigured(config)) return false;
      setHasCertificateConfig(true);
      markPipelineCertificateDone();
      try {
        if (!sessionStorage.getItem('pending-certificate-config')) {
          sessionStorage.setItem('pending-certificate-config', JSON.stringify(config));
        }
      } catch {
        // Ignore session write failures
      }
      return true;
    };

    if (isPipelineCertificateDone() || applyCertificateState(readSessionCertificateConfig())) {
      setHasCertificateConfig(true);
    }

    const existingEventId = sessionStorage.getItem('pending-event-id');
    if (existingEventId) {
      CertificateService.getCertificateConfig(existingEventId).then(({ config }) => {
        applyCertificateState(config);
      });
    }
  }, [navigate]);

  useEffect(() => {
    const checkCertificateConfig = () => {
      if (isPipelineCertificateDone() || isCertificateConfigured(readSessionCertificateConfig())) {
        setHasCertificateConfig(true);
        markPipelineCertificateDone();
      }
    };

    checkCertificateConfig();

    const handleStorageChange = (e) => {
      if (e.key === 'pending-certificate-config' || e.key === 'pending-certificate-done') {
        checkCertificateConfig();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(checkCertificateConfig, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Restore saved form data on component mount
  useEffect(() => {
    const savedData = getSavedFormData();
    if (savedData && savedData.sections && savedData.sections.length > 0) {
      // Set the saved sections directly using setValue
      setValue('sections', savedData.sections, { shouldValidate: true });
      trigger(); // Trigger validation after loading saved data
    } else if (savedData && savedData.questions && savedData.questions.length > 0) {
      // Migrate old format (questions only) to new format (sections with questions)
      setValue('sections', [{
        sectionTitle: '',
        sectionDescription: '',
        questions: savedData.questions
      }], { shouldValidate: true });
      trigger(); // Trigger validation after loading saved data
    }
  }, [setValue, trigger]); // Depend on setValue and trigger

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
    setValue('sections', [emptySection()]);
    setSelectedCard({ type: 'question', section: 0, question: 0 });
  };

  const addSection = () => {
    const nextIndex = sectionFields.length;
    appendSection(emptySection());
    setSelectedCard({ type: 'section', section: nextIndex, question: 0 });
  };

  const removeSectionHandler = (sectionIndex) => {
    if (sectionFields.length > 1) {
      removeSection(sectionIndex);
      setSelectedCard((prev) => {
        const nextSection = Math.min(sectionIndex, sectionFields.length - 2);
        if (prev.section === sectionIndex) {
          return { type: 'section', section: Math.max(0, nextSection), question: 0 };
        }
        if (prev.section > sectionIndex) {
          return { ...prev, section: prev.section - 1 };
        }
        return prev;
      });
    }
  };

  const handleQuestionTypeChange = (sectionIndex, questionIndex, newType) => {
    resetFieldsForQuestionType(setValue, `sections.${sectionIndex}.questions.${questionIndex}`, newType);
  };

  const addOption = (sectionIndex, questionIndex) => {
    const currentOptions = watchedSections[sectionIndex]?.questions[questionIndex]?.options || [''];
    setValue(`sections.${sectionIndex}.questions.${questionIndex}.options`, [...currentOptions, '']);
  };

  const removeOption = (sectionIndex, questionIndex, optionIndex) => {
    const currentOptions = watchedSections[sectionIndex]?.questions[questionIndex]?.options || [''];
    if (currentOptions.length > 1) {
      const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.options`, newOptions);
    }
  };

  const addRow = (sectionIndex, questionIndex) => {
    const currentRows = watchedSections[sectionIndex]?.questions[questionIndex]?.rows || [''];
    setValue(`sections.${sectionIndex}.questions.${questionIndex}.rows`, [...currentRows, '']);
  };

  const removeRow = (sectionIndex, questionIndex, rowIndex) => {
    const currentRows = watchedSections[sectionIndex]?.questions[questionIndex]?.rows || [''];
    if (currentRows.length > 1) {
      const newRows = currentRows.filter((_, i) => i !== rowIndex);
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.rows`, newRows);
    }
  };

  const addColumn = (sectionIndex, questionIndex) => {
    const currentColumns = watchedSections[sectionIndex]?.questions[questionIndex]?.columns || [''];
    setValue(`sections.${sectionIndex}.questions.${questionIndex}.columns`, [...currentColumns, '']);
  };

  const removeColumn = (sectionIndex, questionIndex, columnIndex) => {
    const currentColumns = watchedSections[sectionIndex]?.questions[questionIndex]?.columns || [''];
    if (currentColumns.length > 1) {
      const newColumns = currentColumns.filter((_, i) => i !== columnIndex);
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.columns`, newColumns);
    }
  };

  const addQuestion = (sectionIndex) => {
    const currentQuestions = watchedSections[sectionIndex]?.questions || [];
    setValue(`sections.${sectionIndex}.questions`, [
      ...currentQuestions,
      emptyQuestion(),
    ], { shouldValidate: true });
    trigger(`sections.${sectionIndex}.questions`);
    setSelectedCard({ type: 'question', section: sectionIndex, question: currentQuestions.length });
  };

  const removeQuestion = (sectionIndex, questionIndex) => {
    const currentQuestions = watchedSections[sectionIndex]?.questions || [];
    if (currentQuestions.length > 1) {
      const newQuestions = currentQuestions.filter((_, i) => i !== questionIndex);
      setValue(`sections.${sectionIndex}.questions`, newQuestions);
      setSelectedCard((prev) => {
        if (prev.type !== 'question' || prev.section !== sectionIndex) return prev;
        const nextQ = Math.min(questionIndex, newQuestions.length - 1);
        return { type: 'question', section: sectionIndex, question: Math.max(0, nextQ) };
      });
    }
  };

  const duplicateQuestion = (sectionIndex, questionIndex) => {
    const currentQuestions = watchedSections[sectionIndex]?.questions || [];
    const questionToDuplicate = currentQuestions[questionIndex];

    if (questionToDuplicate) {
      setValue(`sections.${sectionIndex}.questions`, duplicateQuestionInList(currentQuestions, questionIndex));
      setSelectedCard({ type: 'question', section: sectionIndex, question: questionIndex + 1 });
    }
  };

  const onSubmit = async (data) => {
    if (!pendingEventData) {
      toast.warning('No event data found. Please create an event first.');
      navigate('/create-event');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create or update the event in the database
      // Check if we're continuing from a draft event
      const existingEventId = sessionStorage.getItem('pending-event-id');
      let eventId;

      if (existingEventId) {
        // Update existing draft event
        const updateData = {
          ...pendingEventData,
          status: 'published', // Publish the event when completing creation
          updated_at: new Date().toISOString()
        };
        delete updateData.id; // Remove id from update data
        delete updateData.created_by; // Don't change creator
        delete updateData.created_at; // Don't change creation date

        const updateResult = await EventService.updateEvent(existingEventId, updateData);
        if (updateResult.error) {
          throw new Error(`Event update failed: ${updateResult.error}`);
        }
        eventId = existingEventId;
      } else {
        // Create new event
        const eventResult = await EventService.createEvent(pendingEventData);
        if (eventResult.error) {
          throw new Error(`Event creation failed: ${eventResult.error}`);
        }
        eventId = eventResult.event.id;
      }

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
              phone: isValidPhMobile(speakerData.phone) ? normalizePhMobile(speakerData.phone) : '',
              photo_url: speakerData.photo_url && speakerData.photo_url.trim() ? speakerData.photo_url.trim() : ''
            };

            const speakerResult = await SpeakerService.createSpeaker(speakerToCreate);

            if (speakerResult.error) {
              continue; // Continue with other speakers even if one fails
            }

            // Link the speaker to the event
            const _linkResult = await SpeakerService.addSpeakerToEvent(
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
              phone: isValidPhMobile(sponsorData.phone) ? normalizePhMobile(sponsorData.phone) : '',
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
            const _linkResult = await SponsorService.addSponsorToEvent(
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


      // Step 2: Create the survey in the database

      const transformedQuestions = transformSectionsToApiQuestions(data.sections);

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

      const _surveyId = surveyResult.survey.id;

      // Step 3: Save certificate configuration if it exists in draft AND user wants certificates
      // Only save if certificate config exists (meaning user opted in for certificates)
      try {
        const draftCertConfig = sessionStorage.getItem('pending-certificate-config');
        if (draftCertConfig) {
          const certConfig = JSON.parse(draftCertConfig);
          // Validate that config has meaningful content before saving
          if (certConfig && (certConfig.title_text || certConfig.name_config || certConfig.header_config)) {
            await CertificateService.saveCertificateConfig(eventId, certConfig, user.id);
          }
        }
        // If no certificate config exists, that means user opted out - don't create any certificate records
      } catch (certError) {
        console.error('Failed to save certificate config:', certError);
        // Don't fail the whole process if certificate config save fails
      }

      // Clear all saved data
      clearSavedFormData();
      sessionStorage.removeItem('pending-event-data');
      sessionStorage.removeItem('pending-event-files');
      sessionStorage.removeItem('pending-event-speakers');
      sessionStorage.removeItem('pending-event-sponsors');
      sessionStorage.removeItem('pending-certificate-config');
      sessionStorage.removeItem('pending-event-id');
      clearPipelineCertificateFlags();

      await statusDialog({
        title: 'Event created',
        message: 'Your event and evaluation are set up. You can manage them from your organizer home.',
      });

      navigate('/organizer');

    } catch (err) {
      toast.error(`Failed to create event/survey: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (hasCertificateConfig) {
      navigate('/design-certificate');
    } else {
      const draftEventId = sessionStorage.getItem('pending-event-id');
      navigate(draftEventId ? `/edit-event/${draftEventId}` : '/create-event');
    }
  };

  const addQuestionToSelected = () => {
    const idx = Math.min(Math.max(selectedCard.section ?? 0, 0), Math.max(sectionFields.length - 1, 0));
    addQuestion(idx);
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="relative mb-8">
          <button
            type="button"
            onClick={goBack}
            className="absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            aria-label={hasCertificateConfig ? 'Back to certificate designer' : 'Back to create event'}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="mx-auto max-w-xl px-12 text-center sm:px-14">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Create Evaluation
            </h1>
            <p className="mt-1 text-[15px] text-slate-600">
              Build the survey respondents will fill out after the event.
            </p>
            <EventPipelineTracker current={3} certificateDone={hasCertificateConfig} />
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Auto-save</span>
                <button
                  type="button"
                  onClick={toggleAutoSave}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${autoSaveEnabled ? 'bg-blue-900' : 'bg-slate-300'}`}
                  aria-pressed={autoSaveEnabled}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
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

        <div className="rounded-2xl border border-slate-200 bg-slate-100">
          <div className="flex justify-center border-b border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium ${
                !showPreview ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Pencil className="h-4 w-4" />
              Questions
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium ${
                showPreview ? 'border-blue-900 text-blue-900' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
          </div>

        {showPreview ? (
          <div className="mx-auto max-w-3xl space-y-3 px-3 py-6 sm:px-6 pb-16">
            {(watchedSections || []).map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-slate-200 border-t-8 border-t-blue-900 bg-white shadow-sm">
                  <div className="px-6 py-5">
                    {sectionIndex === 0 && pendingEventData?.title && (
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                        {pendingEventData.title}
                      </p>
                    )}
                    {sectionFields.length > 1 && (
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                        Section {sectionIndex + 1} of {sectionFields.length}
                      </p>
                    )}
                    {htmlHasText(section.sectionTitle) ? (
                      <div
                        className="text-2xl font-normal text-slate-900 [&_p]:m-0"
                        dangerouslySetInnerHTML={{ __html: section.sectionTitle }}
                      />
                    ) : (
                      <h2 className="text-2xl font-normal text-slate-400">Untitled form</h2>
                    )}
                    {htmlHasText(section.sectionDescription) && (
                      <div
                        className="mt-2 text-[15px] text-slate-600 [&_p]:m-0"
                        dangerouslySetInnerHTML={{ __html: section.sectionDescription }}
                      />
                    )}
                  </div>
                </div>
                {(section.questions || []).map((question, qIndex) => (
                  <div key={qIndex} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="mb-4 text-base text-slate-800">
                      {question.questionText || 'Untitled question'}
                      {question.required && <span className="ml-1 text-red-500">*</span>}
                    </p>
                    <QuestionPreview question={question} />
                  </div>
                ))}
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to questions
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="px-3 py-6 sm:px-6 pb-24">
            <div className="mx-auto flex max-w-3xl items-start gap-3 lg:max-w-none lg:justify-center">
              <div className="min-w-0 w-full max-w-3xl">
                <div className="space-y-3">
              {sectionFields.map((sectionField, sectionIndex) => {
                const sectionQuestions = watchedSections[sectionIndex]?.questions || [];
                const sectionSelected =
                  selectedCard.type === 'section' && selectedCard.section === sectionIndex;

                return (
                  <div key={sectionField.id} className="space-y-3">
                    <div
                      onClick={() => setSelectedCard({ type: 'section', section: sectionIndex, question: 0 })}
                      className={`overflow-hidden rounded-xl border bg-white ${
                        sectionSelected
                          ? 'border-slate-200 border-l-4 border-l-blue-900 border-t-8 border-t-blue-900 shadow-md'
                          : 'border-slate-200 border-t-8 border-t-blue-900 shadow-sm'
                      }`}
                    >
                      <div className="p-5 sm:px-6 sm:pt-5 sm:pb-6">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            {sectionIndex === 0 && pendingEventData?.title && (
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                {pendingEventData.title}
                              </p>
                            )}
                            {sectionFields.length > 1 && (
                              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Section {sectionIndex + 1} of {sectionFields.length}
                              </p>
                            )}
                          </div>
                          {sectionFields.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSectionHandler(sectionIndex);
                              }}
                              className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete section"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <Controller
                          name={`sections.${sectionIndex}.sectionTitle`}
                          control={control}
                          render={({ field }) => (
                            <SimpleRichTextEditor
                              value={field.value || ''}
                              onChange={(html) => {
                                field.onChange(html);
                                setValue(`sections.${sectionIndex}.sectionTitle`, html, { shouldValidate: true });
                              }}
                              placeholder={sectionIndex === 0 ? 'Untitled form' : 'Untitled section'}
                              variant="title"
                            />
                          )}
                        />
                        <FieldError error={errors.sections?.[sectionIndex]?.sectionTitle?.message} />
                        <div className="mt-3">
                          <Controller
                            name={`sections.${sectionIndex}.sectionDescription`}
                            control={control}
                            render={({ field }) => (
                              <SimpleRichTextEditor
                                value={field.value || ''}
                                onChange={(html) => {
                                  field.onChange(html);
                                  setValue(`sections.${sectionIndex}.sectionDescription`, html);
                                }}
                                placeholder={sectionIndex === 0 ? 'Form description' : 'Section description'}
                                variant="description"
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {sectionQuestions.map((question, qIndex) => (
                      <SurveyQuestionCard
                        key={`${sectionIndex}-${qIndex}`}
                        sectionIndex={sectionIndex}
                        qIndex={qIndex}
                        question={question}
                        sectionQuestionCount={sectionQuestions.length}
                        selected={selectedCard.type === 'question' && selectedCard.section === sectionIndex && selectedCard.question === qIndex}
                        errors={errors}
                        register={register}
                        control={control}
                        setValue={setValue}
                        setSelectedCard={setSelectedCard}
                        handleQuestionTypeChange={handleQuestionTypeChange}
                        addOption={addOption}
                        removeOption={removeOption}
                        addRow={addRow}
                        removeRow={removeRow}
                        addColumn={addColumn}
                        removeColumn={removeColumn}
                        duplicateQuestion={duplicateQuestion}
                        removeQuestion={removeQuestion}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={() => addQuestion(sectionIndex)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 hover:border-blue-300 hover:bg-white hover:text-blue-900 lg:hidden"
                    >
                      <Plus className="h-4 w-4" />
                      Add question
                    </button>
                  </div>
                );
              })}
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={addSection}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:hidden"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Add section
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-6 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:ml-auto"
                  >
                    {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    {loading ? 'Creating' : 'Create Event & Survey'}
                  </button>
                </div>
              </div>

              <aside className="sticky top-24 z-10 hidden shrink-0 self-start lg:block">
                <div className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                  <RailIconButton label="Add question" onClick={addQuestionToSelected}>
                    <Plus className="h-5 w-5" />
                  </RailIconButton>
                  <RailIconButton label="Add section" onClick={addSection}>
                    <LayoutGrid className="h-5 w-5" />
                  </RailIconButton>
                </div>
              </aside>
            </div>
          </form>
        )}
        </div>
      </div>
    </section>
  );
};

export default CreateSurvey;
