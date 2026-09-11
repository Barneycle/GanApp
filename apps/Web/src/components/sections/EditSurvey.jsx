import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SurveyService } from '../../services/surveyService';
import { useAuth } from '../../contexts/AuthContext';
import SimpleRichTextEditor from '../SimpleRichTextEditor';
import { PageSkeleton } from '../loading/Skeleton';
import { SmartSpinner } from '../loading/SmartSpinner';
import { logActivity } from '../../utils/activityLogger';
import { useToast } from '../Toast';
import { emptyQuestion, emptySection } from '../survey/surveyConstants';
import { editSurveySchema } from '../survey/surveySchemas';
import { duplicateQuestionInList, resetFieldsForQuestionType, transformApiQuestionsToSections, transformSectionsToApiQuestions } from '../survey/surveyTransforms';

export const EditSurvey = () => {
  const navigate = useNavigate();
  const { surveyId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [survey, setSurvey] = useState(null);

  const { control, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(editSurveySchema),
    mode: 'onTouched',
    reValidateMode: 'onBlur',
    criteriaMode: 'firstError',
    defaultValues: {
      title: '',
      description: '',
      sections: [emptySection()],
    },
  });

  const { fields: sectionFields, append: appendSection, remove: removeSectionField, replace: replaceSections } = useFieldArray({
    control,
    name: 'sections',
  });

  useEffect(() => {
    if (!surveyId) {
      setError('Survey ID is missing');
      setLoading(false);
      return;
    }

    loadSurvey();
  }, [surveyId]);

  const loadSurvey = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await SurveyService.getSurveyById(surveyId);
      
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (!result.survey) {
        setError('Survey not found');
        setLoading(false);
        return;
      }

      const loadedSurvey = result.survey;
      setSurvey(loadedSurvey);

      const sections = transformApiQuestionsToSections(loadedSurvey.questions);

      const formData = {
        title: loadedSurvey.title || '',
        description: loadedSurvey.description || '',
        sections: sections
      };

      // Use reset to properly update the form and useFieldArray
      reset(formData);
      
      // Also manually replace sections in useFieldArray to ensure it updates
      if (sections.length > 0) {
        replaceSections(sections);
      }

    } catch (err) {
      console.error('Error loading survey:', err);
      setError(err.message || 'Failed to load survey');
    } finally {
      setLoading(false);
    }
  };

  const addSection = () => {
    appendSection(emptySection());
  };

  const removeSection = (index) => {
    if (sectionFields.length > 1) {
      removeSectionField(index);
    }
  };

  // Question management functions (similar to CreateSurvey)
  const addQuestion = (sectionIndex) => {
    const currentQuestions = watch(`sections.${sectionIndex}.questions`) || [];
    setValue(`sections.${sectionIndex}.questions`, [
      ...currentQuestions,
      emptyQuestion(),
    ]);
  };

  const removeQuestion = (sectionIndex, questionIndex) => {
    const currentQuestions = watch(`sections.${sectionIndex}.questions`) || [];
    if (currentQuestions.length > 1) {
      const newQuestions = currentQuestions.filter((_, i) => i !== questionIndex);
      setValue(`sections.${sectionIndex}.questions`, newQuestions);
    }
  };

  const changeQuestionType = (sectionIndex, questionIndex, newType) => {
    resetFieldsForQuestionType(setValue, `sections.${sectionIndex}.questions.${questionIndex}`, newType);
  };

  const addOption = (sectionIndex, questionIndex) => {
    const currentOptions = watch(`sections.${sectionIndex}.questions.${questionIndex}.options`) || [''];
    setValue(`sections.${sectionIndex}.questions.${questionIndex}.options`, [...currentOptions, '']);
  };

  const removeOption = (sectionIndex, questionIndex, optionIndex) => {
    const currentOptions = watch(`sections.${sectionIndex}.questions.${questionIndex}.options`) || [''];
    if (currentOptions.length > 1) {
      const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.options`, newOptions);
    }
  };

  const addRow = (sectionIndex, questionIndex) => {
    const currentRows = watch(`sections.${sectionIndex}.questions.${questionIndex}.rows`) || [''];
    setValue(`sections.${sectionIndex}.questions.${questionIndex}.rows`, [...currentRows, '']);
  };

  const removeRow = (sectionIndex, questionIndex, rowIndex) => {
    const currentRows = watch(`sections.${sectionIndex}.questions.${questionIndex}.rows`) || [''];
    if (currentRows.length > 1) {
      const newRows = currentRows.filter((_, i) => i !== rowIndex);
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.rows`, newRows);
    }
  };

  const addColumn = (sectionIndex, questionIndex) => {
    const currentColumns = watch(`sections.${sectionIndex}.questions.${questionIndex}.columns`) || [''];
    setValue(`sections.${sectionIndex}.questions.${questionIndex}.columns`, [...currentColumns, '']);
  };

  const removeColumn = (sectionIndex, questionIndex, columnIndex) => {
    const currentColumns = watch(`sections.${sectionIndex}.questions.${questionIndex}.columns`) || [''];
    if (currentColumns.length > 1) {
      const newColumns = currentColumns.filter((_, i) => i !== columnIndex);
      setValue(`sections.${sectionIndex}.questions.${questionIndex}.columns`, newColumns);
    }
  };

  const duplicateQuestion = (sectionIndex, questionIndex) => {
    const currentQuestions = watch(`sections.${sectionIndex}.questions`) || [];
    const questionToDuplicate = currentQuestions[questionIndex];
    
    if (questionToDuplicate) {
      setValue(`sections.${sectionIndex}.questions`, duplicateQuestionInList(currentQuestions, questionIndex));
    }
  };

  const onSubmit = async (data) => {
    if (!surveyId) {
      setError('Survey ID is missing');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const transformedQuestions = transformSectionsToApiQuestions(data.sections);

      const updateData = {
        title: data.title,
        description: data.description,
        questions: transformedQuestions,
      };
      
      const result = await SurveyService.updateSurvey(surveyId, updateData);
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Log activity
      if (user?.id && survey) {
        logActivity(
          user.id,
          'update',
          'survey',
          {
            resourceId: surveyId,
            resourceName: survey.title || 'Untitled Survey',
            details: { survey_id: surveyId, title: survey.title, event_id: survey.event_id }
          }
        ).catch(err => console.error('Failed to log survey update:', err));
      }
      
      toast.success('Survey updated successfully!');
      navigate('/survey-management');
      
    } catch (err) {
      setError(err.message || 'Failed to update survey');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSkeleton variant="form" />;
  }

  if (error && !survey) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-4 sm:p-6 lg:p-8 max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Error</h3>
            <p className="text-red-800 mb-6">{error}</p>
            <button 
              onClick={() => navigate('/survey-management')} 
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium"
            >
              Back to Survey Management
            </button>
          </div>
        </div>
      </section>
    );
  }

  const watchedSections = watch('sections') || [];

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center mb-4">
            <button
              onClick={() => navigate('/survey-management')}
              className="p-3 rounded-full bg-white shadow-lg hover:shadow-xl transition-all duration-200 mr-4 group"
              aria-label="Back to survey management"
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
              Edit Survey
            </h1>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
          {/* Survey Title and Description */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Survey Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
                  Survey Title
                </label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                      placeholder="Enter survey title"
                    />
                  )}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
                  Description
                </label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400 resize-none"
                      placeholder="Enter survey description"
                    />
                  )}
                />
              </div>
            </div>
          </div>

          {/* Sections */}
          {sectionFields.map((sectionField, sectionIndex) => {
            const sectionQuestions = watchedSections[sectionIndex]?.questions || [];
            let questionNumber = 1;
            // Calculate question number across all previous sections
            for (let i = 0; i < sectionIndex; i++) {
              questionNumber += watchedSections[i]?.questions?.length || 0;
            }
            
            return (
              <div key={sectionField.id} className="space-y-6">
                {/* Section Header */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow-lg border border-purple-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-purple-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                          {sectionIndex + 1}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800">Section {sectionIndex + 1}</h3>
                          <p className="text-sm text-slate-600">Configure your section settings</p>
                        </div>
                      </div>
                      
                      {sectionFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSection(sectionIndex)}
                          className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition-all duration-200"
                          aria-label="Remove section"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4 sm:p-6 space-y-4">
                    {/* Section Title */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        Section Title
                      </label>
                      <Controller
                        name={`sections.${sectionIndex}.sectionTitle`}
                        control={control}
                        render={({ field }) => (
                          <SimpleRichTextEditor
                            value={field.value || ''}
                            onChange={(html) => {
                              field.onChange(html);
                              setValue(`sections.${sectionIndex}.sectionTitle`, html);
                            }}
                            placeholder="Enter section title (e.g., Event Feedback, Speaker Evaluation)"
                            className={errors.sections?.[sectionIndex]?.sectionTitle ? 'border-red-300' : ''}
                          />
                        )}
                      />
                      {errors.sections?.[sectionIndex]?.sectionTitle && (
                        <p className="text-red-500 text-xs mt-1">{errors.sections[sectionIndex].sectionTitle.message}</p>
                      )}
                    </div>
                    
                    {/* Section Description */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        Section Description (Optional)
                      </label>
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
                            placeholder="Enter section description..."
                            className={errors.sections?.[sectionIndex]?.sectionDescription ? 'border-red-300' : ''}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Section Questions */}
                <div className="space-y-6">
                  {sectionQuestions.map((question, qIndex) => {
                    const globalQIndex = questionNumber - 1;
                    questionNumber++;
                    return (
                      <div 
                        key={qIndex}
                        className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-slate-100 overflow-hidden"
                      >
                        {/* Question Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                                {globalQIndex + 1}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-slate-800">Question {globalQIndex + 1}</h3>
                                <p className="text-sm text-slate-600">Configure your question settings</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => duplicateQuestion(sectionIndex, qIndex)}
                                className="p-2 rounded-full hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-all duration-200"
                                aria-label="Duplicate question"
                                title="Duplicate question"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                              
                              {sectionQuestions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeQuestion(sectionIndex, qIndex)}
                                  className="p-2 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition-all duration-200"
                                  aria-label="Remove question"
                                  title="Remove question"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Question Content */}
                        <div className="p-4 sm:p-6 space-y-6">
                          {/* Question Text */}
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                              Question Text
                            </label>
                            <Controller
                              name={`sections.${sectionIndex}.questions.${qIndex}.questionText`}
                              control={control}
                              render={({ field }) => (
                                <SimpleRichTextEditor
                                  value={field.value || ''}
                                  onChange={(html) => {
                                    // Extract plain text from HTML for validation
                                    const tempDiv = document.createElement('div');
                                    tempDiv.innerHTML = html;
                                    const _plainText = tempDiv.textContent || tempDiv.innerText || '';
                                    field.onChange(html);
                                    // Also update the form value for validation
                                    setValue(`sections.${sectionIndex}.questions.${qIndex}.questionText`, html);
                                  }}
                                  placeholder="What would you like to ask?"
                                  className={errors.sections?.[sectionIndex]?.questions?.[qIndex]?.questionText ? 'border-red-300' : ''}
                                />
                              )}
                            />
                            {errors.sections?.[sectionIndex]?.questions?.[qIndex]?.questionText && (
                              <p className="text-red-500 text-xs mt-1">{errors.sections[sectionIndex].questions[qIndex].questionText.message}</p>
                            )}
                          </div>

                          {/* Question Type */}
                          <div className="space-y-3">
                            <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                              Question Type
                            </label>
                            <Controller
                              name={`sections.${sectionIndex}.questions.${qIndex}.questionType`}
                              control={control}
                              render={({ field }) => (
                                <select
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    changeQuestionType(sectionIndex, qIndex, e.target.value);
                                  }}
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
                          {(watch(`sections.${sectionIndex}.questions.${qIndex}.questionType`) === 'multiple-choice' || watch(`sections.${sectionIndex}.questions.${qIndex}.questionType`) === 'checkbox' || watch(`sections.${sectionIndex}.questions.${qIndex}.questionType`) === 'dropdown') && (
                            <div className="space-y-3">
                              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                Options
                              </label>
                              <div className="space-y-2">
                                {watch(`sections.${sectionIndex}.questions.${qIndex}.options`)?.map((option, index) => (
                                  <div key={index} className="flex items-center space-x-3">
                                    <div className="flex-1">
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) => {
                                          const newOptions = [...watch(`sections.${sectionIndex}.questions.${qIndex}.options`)];
                                          newOptions[index] = e.target.value;
                                          setValue(`sections.${sectionIndex}.questions.${qIndex}.options`, newOptions);
                                        }}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                                        placeholder={`Option ${index + 1}`}
                                      />
                                    </div>
                                    {watch(`sections.${sectionIndex}.questions.${qIndex}.options`).length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => removeOption(sectionIndex, qIndex, index)}
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
                                onClick={() => addOption(sectionIndex, qIndex)}
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
                          {(watch(`sections.${sectionIndex}.questions.${qIndex}.questionType`) === 'linear-scale' || watch(`sections.${sectionIndex}.questions.${qIndex}.questionType`) === 'star-rating') && (
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
                                    {...control.register(`sections.${sectionIndex}.questions.${qIndex}.scaleMin`)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200"
                                  />
                                  {errors.sections?.[sectionIndex]?.questions?.[qIndex]?.scaleMin && (
                                    <p className="text-red-500 text-xs mt-1">{errors.sections[sectionIndex].questions[qIndex].scaleMin.message}</p>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-600">Maximum Value</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    {...control.register(`sections.${sectionIndex}.questions.${qIndex}.scaleMax`)}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200"
                                  />
                                  {errors.sections?.[sectionIndex]?.questions?.[qIndex]?.scaleMax && (
                                    <p className="text-red-500 text-xs mt-1">{errors.sections[sectionIndex].questions[qIndex].scaleMax.message}</p>
                                  )}
                                </div>
                              </div>
                              {watch(`sections.${sectionIndex}.questions.${qIndex}.questionType`) === 'linear-scale' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-600">Lowest Label</label>
                                    <input
                                      type="text"
                                      value={watch(`sections.${sectionIndex}.questions.${qIndex}.lowestLabel`) || ''}
                                      onChange={(e) => {
                                        setValue(`sections.${sectionIndex}.questions.${qIndex}.lowestLabel`, e.target.value);
                                      }}
                                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                                      placeholder="e.g., Very dissatisfied"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-600">Highest Label</label>
                                    <input
                                      type="text"
                                      value={watch(`sections.${sectionIndex}.questions.${qIndex}.highestLabel`) || ''}
                                      onChange={(e) => {
                                        setValue(`sections.${sectionIndex}.questions.${qIndex}.highestLabel`, e.target.value);
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
                          {(watch(`sections.${sectionIndex}.questions.${qIndex}.questionType`) === 'multiple-choice-grid' || watch(`sections.${sectionIndex}.questions.${qIndex}.questionType`) === 'checkbox-grid') && (
                            <div className="space-y-4">
                              <label className="block text-sm font-semibold text-slate-700 uppercase tracking-wide">
                                Grid Configuration
                              </label>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                  <label className="block text-sm font-medium text-slate-600">Row Labels</label>
                                  <div className="space-y-2">
                                    {watch(`sections.${sectionIndex}.questions.${qIndex}.rows`)?.map((row, index) => (
                                      <div key={index} className="flex items-center space-x-2">
                                        <input
                                          type="text"
                                          value={row}
                                          onChange={(e) => {
                                            const newRows = [...watch(`sections.${sectionIndex}.questions.${qIndex}.rows`)];
                                            newRows[index] = e.target.value;
                                            setValue(`sections.${sectionIndex}.questions.${qIndex}.rows`, newRows);
                                          }}
                                          className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                                          placeholder={`Row ${index + 1}`}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeRow(sectionIndex, qIndex, index)}
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
                                    onClick={() => addRow(sectionIndex, qIndex)}
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
                                    {watch(`sections.${sectionIndex}.questions.${qIndex}.columns`)?.map((column, index) => (
                                      <div key={index} className="flex items-center space-x-2">
                                        <input
                                          type="text"
                                          value={column}
                                          onChange={(e) => {
                                            const newColumns = [...watch(`sections.${sectionIndex}.questions.${qIndex}.columns`)];
                                            newColumns[index] = e.target.value;
                                            setValue(`sections.${sectionIndex}.questions.${qIndex}.columns`, newColumns);
                                          }}
                                          className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 text-base transition-all duration-200 placeholder-slate-400"
                                          placeholder={`Column ${index + 1}`}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeColumn(sectionIndex, qIndex, index)}
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
                                    onClick={() => addColumn(sectionIndex, qIndex)}
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
                                {...control.register(`sections.${sectionIndex}.questions.${qIndex}.required`)}
                                className="sr-only"
                              />
                              <div className={`w-11 h-6 rounded-full transition-all duration-200 ${
                                watch(`sections.${sectionIndex}.questions.${qIndex}.required`) ? 'bg-blue-600' : 'bg-slate-200'
                              }`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                                  watch(`sections.${sectionIndex}.questions.${qIndex}.required`) ? 'translate-x-6' : 'translate-x-1'
                                }`} style={{ marginTop: '4px' }}></div>
                              </div>
                              <span className="ml-3 text-sm font-medium text-slate-700">Required Question</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <button
                    type="button"
                    onClick={() => addQuestion(sectionIndex)}
                    className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    + Add Question to This Section
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addSection}
            className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-xl hover:from-purple-700 hover:to-purple-900 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            + Add Section
          </button>

          {/* Submit Button */}
          <div className="mt-8 flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/survey-management')}
              className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl hover:from-blue-700 hover:to-blue-900 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center justify-center min-h-[1.5rem]">
                <SmartSpinner
                  active={saving}
                  variant="inline"
                  light
                  label="Saving survey"
                  messages={['Still saving', 'Almost there']}
                >
                  Save Survey
                </SmartSpinner>
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

