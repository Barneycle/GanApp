import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Calendar,
  Check,
  ChevronLeft,
  Circle,
  Clock,
  Copy,
  Eye,
  GripVertical,
  LayoutGrid,
  List,
  LoaderCircle,
  Pencil,
  Plus,
  Star,
  Trash2,
  Type,
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

const QUESTION_TYPES = [
  { value: 'short-answer', label: 'Short answer', icon: Type },
  { value: 'paragraph', label: 'Paragraph', icon: Type },
  { value: 'multiple-choice', label: 'Multiple choice', icon: Circle },
  { value: 'checkbox', label: 'Checkboxes', icon: Check },
  { value: 'dropdown', label: 'Dropdown', icon: List },
  { value: 'linear-scale', label: 'Linear scale', icon: GripVertical },
  { value: 'star-rating', label: 'Star rating', icon: Star },
  { value: 'multiple-choice-grid', label: 'Multiple choice grid', icon: LayoutGrid },
  { value: 'checkbox-grid', label: 'Checkbox grid', icon: LayoutGrid },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'time', label: 'Time', icon: Clock },
];

const emptyQuestion = () => ({
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

const emptySection = () => ({
  sectionTitle: '',
  sectionDescription: '',
  questions: [emptyQuestion()],
});

function RailIconButton({ label, onClick, children }) {
  const [showTip, setShowTip] = useState(false);
  const timerRef = useRef(null);

  const clearTipTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleEnter = () => {
    clearTipTimer();
    timerRef.current = setTimeout(() => setShowTip(true), 700);
  };

  const handleLeave = () => {
    clearTipTimer();
    setShowTip(false);
  };

  useEffect(() => () => clearTipTimer(), []);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <motion.button
        type="button"
        onClick={(event) => {
          clearTipTimer();
          setShowTip(false);
          onClick?.(event);
        }}
        whileTap={{ scale: 0.82 }}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-900"
        aria-label={label}
      >
        {children}
      </motion.button>
      {showTip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-30 ml-2.5 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white shadow-sm"
        >
          {label}
        </span>
      )}
    </div>
  );
}

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

// Zod validation schema for survey sections
const sectionSchema = z.object({
  sectionTitle: z.string().refine((val) => {
    if (!val) return false;
    // Extract plain text from HTML for validation
    if (typeof document !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = val;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      // Check if there's actual content (not just whitespace or empty tags)
      const trimmed = plainText.trim();
      // Also check if HTML contains actual content (not just <p></p> or <p><br></p>)
      const hasContent = trimmed.length > 0 && !/^[\s\n\r]*$/.test(trimmed);
      return hasContent;
    }
    // Fallback for server-side validation - strip HTML tags
    const stripped = val.replace(/<[^>]*>/g, '').trim();
    return stripped.length > 0;
  }, 'Section title is required'),
  sectionDescription: z.string().optional(),
  questions: z.array(questionSchema).min(1, 'At least one question is required in each section'),
});

const createSurveySchema = z.object({
  sections: z.array(sectionSchema).min(1, 'At least one section is required'),
});

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
  const [hasCertificateConfig, setHasCertificateConfig] = useState(false);
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

  // Trigger validation when sections change (debounced to avoid excessive calls)
  useEffect(() => {
    if (watchedSections && watchedSections.length > 0) {
      const timeoutId = setTimeout(() => {
        trigger(); // Trigger validation for all fields
      }, 300); // Debounce validation by 300ms
      return () => clearTimeout(timeoutId);
    }
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

    // Check if certificate config exists
    const certConfig = sessionStorage.getItem('pending-certificate-config');
    if (certConfig) {
      try {
        const parsed = JSON.parse(certConfig);
        // Check if config has meaningful content (not just defaults)
        if (parsed && (parsed.title_text || parsed.name_config || parsed.header_config)) {
          setHasCertificateConfig(true);
        }
      } catch (e) {
        // Invalid config, treat as not saved
        setHasCertificateConfig(false);
      }
    }
  }, [navigate]);

  // Listen for certificate config changes (when user saves draft)
  useEffect(() => {
    const checkCertificateConfig = () => {
      const certConfig = sessionStorage.getItem('pending-certificate-config');
      if (certConfig) {
        try {
          const parsed = JSON.parse(certConfig);
          if (parsed && (parsed.title_text || parsed.name_config || parsed.header_config)) {
            setHasCertificateConfig(true);
            return;
          }
        } catch (e) {
          // Invalid config
        }
      }
      setHasCertificateConfig(false);
    };

    // Check immediately
    checkCertificateConfig();

    // Listen for storage changes (when certificate is saved from another tab/window)
    const handleStorageChange = (e) => {
      if (e.key === 'pending-certificate-config') {
        checkCertificateConfig();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll for changes (since storage event doesn't fire in same tab)
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
    setValue(`sections.${sectionIndex}.questions.${questionIndex}.questionType`, newType);

    // Reset type-specific fields when changing question type
    if (newType === 'multiple-choice' || newType === 'checkbox' || newType === 'dropdown') {
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.options`, ['']);
    } else if (newType === 'linear-scale' || newType === 'star-rating') {
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.scaleMin`, 1);
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.scaleMax`, 5);
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.lowestLabel`, '');
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.highestLabel`, '');
    } else if (newType === 'multiple-choice-grid' || newType === 'checkbox-grid') {
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.rows`, ['']);
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.columns`, ['']);
    }
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
      // Create a deep copy of the question
      const duplicatedQuestion = {
        questionText: questionToDuplicate.questionText || '',
        questionType: questionToDuplicate.questionType || 'short-answer',
        options: questionToDuplicate.options ? [...questionToDuplicate.options] : [''],
        required: questionToDuplicate.required || false,
        scaleMin: questionToDuplicate.scaleMin || 1,
        scaleMax: questionToDuplicate.scaleMax || 5,
        lowestLabel: questionToDuplicate.lowestLabel || '',
        highestLabel: questionToDuplicate.highestLabel || '',
        rows: questionToDuplicate.rows ? [...questionToDuplicate.rows] : [''],
        columns: questionToDuplicate.columns ? [...questionToDuplicate.columns] : [''],
      };

      // Insert the duplicated question right after the current one
      const newQuestions = [
        ...currentQuestions.slice(0, questionIndex + 1),
        duplicatedQuestion,
        ...currentQuestions.slice(questionIndex + 1)
      ];

      setValue(`sections.${sectionIndex}.questions`, newQuestions);
      setSelectedCard({ type: 'question', section: sectionIndex, question: questionIndex + 1 });
    }
  };

  const htmlHasText = (html) => {
    if (!html) return false;
    return String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().length > 0;
  };

  const renderQuestionPreview = (question, _qIndex) => {
    const { questionType, options = [], scaleMin = 1, scaleMax = 5, lowestLabel, highestLabel, rows = [], columns = [] } = question;

    switch (questionType) {
      case 'short-answer':
        return (
          <p className="max-w-md border-b border-slate-300 py-2 text-sm text-slate-400">Short-answer text</p>
        );

      case 'paragraph':
        return (
          <p className="border-b border-slate-300 py-6 text-sm text-slate-400">Long-answer text</p>
        );

      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="h-4 w-4 shrink-0 rounded-full border border-slate-400" />
                <span className="text-[15px] text-slate-700">{option || `Option ${index + 1}`}</span>
              </div>
            ))}
            {options.length === 0 && (
              <p className="text-sm text-slate-400">No options yet</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="h-4 w-4 shrink-0 rounded-sm border border-slate-400" />
                <span className="text-[15px] text-slate-700">{option || `Option ${index + 1}`}</span>
              </div>
            ))}
            {options.length === 0 && (
              <p className="text-sm text-slate-400">No options yet</p>
            )}
          </div>
        );

      case 'dropdown':
        return (
          <select disabled className="h-10 w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-500">
            <option>Choose</option>
            {options.map((option, index) => (
              <option key={index}>{option || `Option ${index + 1}`}</option>
            ))}
          </select>
        );

      case 'linear-scale':
        return (
          <div className="overflow-x-auto pt-2">
            <div className="flex items-end justify-between gap-2">
              <span className="w-20 shrink-0 pb-6 text-xs text-slate-500">{lowestLabel || scaleMin}</span>
              <div className="flex min-w-0 flex-1 items-end justify-between gap-1">
                {Array.from({ length: Math.max(1, scaleMax - scaleMin + 1) }, (_, i) => scaleMin + i).map((value) => (
                  <div key={value} className="flex flex-col items-center gap-2">
                    <span className="text-xs text-slate-500">{value}</span>
                    <span className="h-4 w-4 rounded-full border border-slate-400" />
                  </div>
                ))}
              </div>
              <span className="w-20 shrink-0 pb-6 text-right text-xs text-slate-500">{highestLabel || scaleMax}</span>
            </div>
          </div>
        );

      case 'star-rating':
        return (
          <div className="flex items-center gap-1 pt-1">
            {Array.from({ length: scaleMax || 5 }, (_, i) => (
              <Star key={i} className="h-7 w-7 text-slate-300" />
            ))}
          </div>
        );

      case 'multiple-choice-grid':
      case 'checkbox-grid':
        return rows.length > 0 && columns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse">
              <thead>
                <tr>
                  <th className="p-2" />
                  {columns.map((column, colIndex) => (
                    <th key={colIndex} className="p-2 text-center text-xs font-medium text-slate-600">
                      {column || `Column ${colIndex + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-slate-50' : ''}>
                    <td className="p-2 text-sm text-slate-700">{row || `Row ${rowIndex + 1}`}</td>
                    {columns.map((_, colIndex) => (
                      <td key={colIndex} className="p-2 text-center">
                        <span className={`inline-block h-4 w-4 border border-slate-400 ${questionType === 'checkbox-grid' ? 'rounded-sm' : 'rounded-full'}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Add rows and columns to see the grid</p>
        );

      case 'date':
        return (
          <div className="inline-flex items-center gap-2 border-b border-slate-300 py-2 text-sm text-slate-400">
            <Calendar className="h-4 w-4" />
            Month, day, year
          </div>
        );

      case 'time':
        return (
          <div className="inline-flex items-center gap-2 border-b border-slate-300 py-2 text-sm text-slate-400">
            <Clock className="h-4 w-4" />
            Time
          </div>
        );

      default:
        return <p className="text-sm text-slate-400">Select a question type</p>;
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

      // Transform sections and questions to match the Survey interface
      // Flatten sections into a single questions array, preserving section info
      let questionIndex = 1;
      const transformedQuestions = [];

      // Check if data.sections exists, if not, handle gracefully
      if (!data.sections || !Array.isArray(data.sections)) {
        throw new Error('Survey sections data is missing or invalid');
      }

      data.sections.forEach((section, sectionIndex) => {
        // Ensure section has questions array
        if (!section.questions || !Array.isArray(section.questions)) {
          return; // Skip sections without questions
        }

        // Add section header as a special question type (if needed) or just process questions
        section.questions.forEach((q) => {
          // Preserve the original questionType and ALL properties for proper rendering
          const transformedQuestion = {
            id: `q_${questionIndex}`,
            questionType: q.questionType, // Preserve original questionType - this is the key field
            // Also include type for backward compatibility
            type: q.questionType === 'multiple-choice' || q.questionType === 'checkbox' ? 'multiple_choice' :
              q.questionType === 'linear-scale' || q.questionType === 'star-rating' ? 'rating' :
                q.questionType === 'multiple-choice-grid' ? 'multiple_choice_grid' :
                  q.questionType === 'checkbox-grid' ? 'checkbox_grid' :
                    q.questionType === 'yes-no' ? 'yes_no' :
                      q.questionType === 'short-answer' ? 'text' :
                        q.questionType === 'paragraph' ? 'text' :
                          q.questionType === 'dropdown' ? 'dropdown' :
                            q.questionType === 'date' ? 'date' :
                              q.questionType === 'time' ? 'time' : 'text',
            question: q.questionText,
            questionText: q.questionText, // Also preserve questionText for compatibility
            required: q.required || false,
            // Options for multiple-choice, checkbox, dropdown
            options: (q.questionType === 'multiple-choice' || q.questionType === 'checkbox' || q.questionType === 'dropdown') &&
              q.options && q.options.length > 0 ? q.options.filter(opt => opt && opt.trim()) : undefined,
            // Rating/Scale properties
            min_rating: q.scaleMin,
            max_rating: q.scaleMax,
            scaleMin: q.scaleMin, // Preserve scaleMin
            scaleMax: q.scaleMax, // Preserve scaleMax
            lowestLabel: q.lowestLabel || undefined,
            highestLabel: q.highestLabel || undefined,
            // Grid question properties
            rows: (q.questionType === 'multiple-choice-grid' || q.questionType === 'checkbox-grid') &&
              q.rows && q.rows.length > 0 ? q.rows.filter(row => row && row.trim()) : undefined,
            columns: (q.questionType === 'multiple-choice-grid' || q.questionType === 'checkbox-grid') &&
              q.columns && q.columns.length > 0 ? q.columns.filter(col => col && col.trim()) : undefined,
            // Section metadata
            sectionTitle: section.sectionTitle || undefined,
            sectionDescription: section.sectionDescription || undefined,
            sectionIndex: sectionIndex
          };
          transformedQuestions.push(transformedQuestion);
          questionIndex++;
        });
      });

      // Validate that we have at least one question
      if (transformedQuestions.length === 0) {
        throw new Error('At least one question is required in the survey');
      }

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
      sessionStorage.removeItem('pending-event-id'); // Clear draft event ID

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
      navigate('/create-event');
    }
  };

  const addQuestionToSelected = () => {
    const idx = Math.min(Math.max(selectedCard.section ?? 0, 0), Math.max(sectionFields.length - 1, 0));
    addQuestion(idx);
  };

  const isChoiceType = (type) => type === 'multiple-choice' || type === 'checkbox' || type === 'dropdown';
  const isScaleType = (type) => type === 'linear-scale' || type === 'star-rating';
  const isGridType = (type) => type === 'multiple-choice-grid' || type === 'checkbox-grid';

  const optionShape = (type) => (
    type === 'checkbox'
      ? 'h-4 w-4 shrink-0 rounded-sm border border-slate-400'
      : 'h-4 w-4 shrink-0 rounded-full border border-slate-400'
  );

  const underlineField =
    'w-full border-0 border-b border-transparent bg-transparent px-0 py-2 text-[15px] text-slate-800 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none';

  const renderQuestionCard = (sectionIndex, qIndex, question, sectionQuestionCount) => {
    const questionType = question?.questionType || 'short-answer';
    const options = question?.options || [''];
    const rows = question?.rows || [''];
    const columns = question?.columns || [''];
    const selected =
      selectedCard.type === 'question' &&
      selectedCard.section === sectionIndex &&
      selectedCard.question === qIndex;
    const questionError = errors.sections?.[sectionIndex]?.questions?.[qIndex]?.questionText?.message;

    return (
      <div
        key={`${sectionIndex}-${qIndex}`}
        onClick={() => setSelectedCard({ type: 'question', section: sectionIndex, question: qIndex })}
        className={`rounded-xl border bg-white ${
          selected
            ? 'border-slate-200 border-l-4 border-l-blue-900 shadow-md'
            : 'border-slate-200 shadow-sm'
        }`}
      >
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <input
                type="text"
                placeholder="Question"
                {...register(`sections.${sectionIndex}.questions.${qIndex}.questionText`)}
                className="w-full rounded-md border-0 border-b border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-blue-900 focus:bg-white focus:outline-none"
              />
              <FieldError error={questionError} />
            </div>
            <Controller
              name={`sections.${sectionIndex}.questions.${qIndex}.questionType`}
              control={control}
              render={({ field }) => (
                <select
                  value={field.value}
                  onChange={(e) => handleQuestionTypeChange(sectionIndex, qIndex, e.target.value)}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 sm:w-52"
                  aria-label="Question type"
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              )}
            />
          </div>

          <div className="mt-5">
            {isChoiceType(questionType) && (
              <div className="space-y-1">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    {questionType === 'dropdown' ? (
                      <span className="w-4 shrink-0 text-sm text-slate-400">{index + 1}.</span>
                    ) : (
                      <span className={optionShape(questionType)} />
                    )}
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const next = [...options];
                        next[index] = e.target.value;
                        setValue(`sections.${sectionIndex}.questions.${qIndex}.options`, next);
                      }}
                      className={underlineField}
                      placeholder={`Option ${index + 1}`}
                    />
                    {options.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOption(sectionIndex, qIndex, index)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Remove option"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addOption(sectionIndex, qIndex)}
                  className="mt-1 flex items-center gap-3 text-sm text-slate-500 hover:text-blue-900"
                >
                  <span className={optionShape(questionType)} />
                  <span className="border-b border-transparent hover:border-blue-900">Add option</span>
                </button>
              </div>
            )}

            {isScaleType(questionType) && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <label className="flex items-center gap-2">
                    {questionType === 'star-rating' ? 'Stars' : 'From'}
                    <input
                      type="number"
                      min="1"
                      max="10"
                      {...register(`sections.${sectionIndex}.questions.${qIndex}.scaleMin`, { valueAsNumber: true })}
                      className="h-9 w-16 rounded-md border border-slate-200 px-2 text-center"
                    />
                  </label>
                  <span>to</span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    {...register(`sections.${sectionIndex}.questions.${qIndex}.scaleMax`, { valueAsNumber: true })}
                    className="h-9 w-16 rounded-md border border-slate-200 px-2 text-center"
                  />
                </div>
                {questionType === 'linear-scale' && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      value={question.lowestLabel || ''}
                      onChange={(e) => setValue(`sections.${sectionIndex}.questions.${qIndex}.lowestLabel`, e.target.value)}
                      className={underlineField}
                      placeholder="Label (optional)"
                    />
                    <input
                      type="text"
                      value={question.highestLabel || ''}
                      onChange={(e) => setValue(`sections.${sectionIndex}.questions.${qIndex}.highestLabel`, e.target.value)}
                      className={underlineField}
                      placeholder="Label (optional)"
                    />
                  </div>
                )}
                {renderQuestionPreview(question, qIndex)}
              </div>
            )}

            {isGridType(questionType) && (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Rows</p>
                  <div className="space-y-1">
                    {rows.map((row, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={row}
                          onChange={(e) => {
                            const next = [...rows];
                            next[index] = e.target.value;
                            setValue(`sections.${sectionIndex}.questions.${qIndex}.rows`, next);
                          }}
                          className={underlineField}
                          placeholder={`Row ${index + 1}`}
                        />
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(sectionIndex, qIndex, index)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addRow(sectionIndex, qIndex)}
                      className="text-sm text-blue-900 hover:underline"
                    >
                      Add row
                    </button>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Columns</p>
                  <div className="space-y-1">
                    {columns.map((column, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={column}
                          onChange={(e) => {
                            const next = [...columns];
                            next[index] = e.target.value;
                            setValue(`sections.${sectionIndex}.questions.${qIndex}.columns`, next);
                          }}
                          className={underlineField}
                          placeholder={`Column ${index + 1}`}
                        />
                        {columns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColumn(sectionIndex, qIndex, index)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Remove column"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addColumn(sectionIndex, qIndex)}
                      className="text-sm text-blue-900 hover:underline"
                    >
                      Add column
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(questionType === 'short-answer' || questionType === 'paragraph' || questionType === 'date' || questionType === 'time') && (
              <div className="pt-1">{renderQuestionPreview(question, qIndex)}</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-1 border-t border-slate-100 px-4 py-2">
          <button
            type="button"
            onClick={() => duplicateQuestion(sectionIndex, qIndex)}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Duplicate question"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>
          {sectionQuestionCount > 1 && (
            <button
              type="button"
              onClick={() => removeQuestion(sectionIndex, qIndex)}
              className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
              aria-label="Delete question"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <span className="mx-2 h-6 w-px bg-slate-200" />
          <span className="text-sm text-slate-600">Required</span>
          <label className="relative ml-2 inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              {...register(`sections.${sectionIndex}.questions.${qIndex}.required`)}
              className="sr-only"
            />
            <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${question?.required ? 'bg-blue-900' : 'bg-slate-300'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${question?.required ? 'translate-x-6' : 'translate-x-1'}`} />
            </span>
          </label>
        </div>
      </div>
    );
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
            <div className="mt-6 flex items-center justify-center gap-2 text-sm">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-900 text-xs font-semibold text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="hidden font-medium text-slate-900 sm:inline">Event</span>
              <span className="h-px w-8 bg-slate-200 sm:w-12" />
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${hasCertificateConfig ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {hasCertificateConfig ? <Check className="h-3.5 w-3.5" /> : '2'}
              </span>
              <span className={`hidden sm:inline ${hasCertificateConfig ? 'text-slate-900' : 'text-slate-500'}`}>Certificate</span>
              <span className="h-px w-8 bg-slate-200 sm:w-12" />
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-900 text-xs font-semibold text-white">3</span>
              <span className="font-medium text-slate-900">Evaluation</span>
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

        <div className="rounded-2xl bg-slate-100 px-3 py-4 sm:px-6 sm:py-6">
        <div className="mb-6 flex justify-center border-b border-slate-200">
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
          <div className="mx-auto max-w-3xl space-y-3 pb-16">
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
                    {renderQuestionPreview(question, qIndex)}
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
          <form onSubmit={handleSubmit(onSubmit)} className="relative mx-auto max-w-3xl pb-24">
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
                              placeholder={sectionIndex === 0 ? 'Form title' : 'Section title'}
                              compact
                              className="border-slate-200"
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
                                placeholder="Form description"
                                compact
                                className="border-slate-200"
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>

                    {sectionQuestions.map((question, qIndex) =>
                      renderQuestionCard(sectionIndex, qIndex, question, sectionQuestions.length)
                    )}

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

            <div className="pointer-events-none absolute -right-16 top-8 hidden lg:block xl:-right-20">
              <div className="pointer-events-auto sticky top-28 flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <RailIconButton label="Add question" onClick={addQuestionToSelected}>
                  <Plus className="h-5 w-5" />
                </RailIconButton>
                <RailIconButton label="Add section" onClick={addSection}>
                  <LayoutGrid className="h-5 w-5" />
                </RailIconButton>
              </div>
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
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {loading ? 'Creating…' : 'Create Event & Survey'}
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </section>
  );
};

export default CreateSurvey;
