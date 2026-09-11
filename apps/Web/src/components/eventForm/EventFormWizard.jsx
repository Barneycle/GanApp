import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Controller } from 'react-hook-form';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { FIELD_LIMITS, isValidPhMobile, normalizePhMobile } from '../../utils/formFields';
import { CharCount, FieldError } from '../form/Field';
import { EventFileDropzone } from './EventFileDropzone';
import { OptionalOptIn } from './OptionalOptIn';
import { CORE_STEPS, stripHtml } from '../../utils/eventForm/helpers';
import { EventPipelineTracker, isPipelineCertificateDone } from './EventPipelineTracker';

const RichTextEditor = lazy(() => import('../RichTextEditor'));

export function EventFormWizard({
  mode = 'create',
  pageTitle,
  pageSubtitle = 'Fill in the details, then continue to certificate design or evaluation.',
  submitButtonLabel,
  headerExtra = null,
  afterMaterials = null,
  navigate,
  handleSubmit,
  onSubmit,
  onSaveDraft,
  isSavingDraft = false,
  control,
  errors,
  watch,
  setValue,
  trigger,
  setUploadedFiles,
  uploadedFiles,
  handleFileUpload,
  handleRemoveFile,
  speakers,
  sponsors,
  addSpeaker,
  updateSpeaker,
  removeSpeaker,
  moveSpeaker,
  addSponsor,
  updateSponsor,
  removeSponsor,
  moveSponsor,
  venues,
  showOtherVenue,
  setShowOtherVenue,
  customVenueName,
  setCustomVenueName,
  coreStep,
  setCoreStep,
  showCheckIn,
  setShowCheckIn,
  showSponsors,
  setShowSponsors,
  showSpeakers,
  setShowSpeakers,
  showMaterials,
  setShowMaterials,
  eventKitsMode,
  setEventKitsMode,
  eventProgrammeMode,
  setEventProgrammeMode,
  autoSaveEnabled,
  toggleAutoSave,
  onClearDraft,
  certificateDone = false,
}) {
  const isCreate = mode === 'create';
  const [certificateComplete, setCertificateComplete] = useState(
    () => Boolean(certificateDone) || isPipelineCertificateDone()
  );

  useEffect(() => {
    setCertificateComplete(Boolean(certificateDone) || isPipelineCertificateDone());
  }, [certificateDone]);
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

  const [isContinuing, setIsContinuing] = useState(false);

  const submitReview = async () => {
    if (isContinuing) return;
    setIsContinuing(true);
    await new Promise((resolve) => {
      window.setTimeout(resolve, 160);
    });
    try {
      await handleSubmit(onSubmit)();
    } finally {
      setIsContinuing(false);
    }
  };

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
              {pageSubtitle}
            </p>
            <EventPipelineTracker current={1} certificateDone={certificateComplete} />
            {isCreate ? (
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
                onClick={onClearDraft}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                title="Clear saved draft"
              >
                <Trash2 className="h-4 w-4" />
                Clear draft
              </button>
            </div>
            ) : null}
          </div>
        </div>











        {headerExtra}

        <div className="relative sticky top-0 z-20 mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">
          {isContinuing ? (
            <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-blue-100">
              <div className="h-full w-1/3 animate-[continue-bar_0.9s_ease-in-out_infinite] bg-blue-900" />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">
              {completedSectionCount} of {formSections.length} sections complete
            </p>
            <p className="text-xs text-slate-500">
              {requiredCompleteCount} of {requiredSectionCount} required
            </p>
          </div>
          <nav aria-label="Event sections" className="mt-3 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <ol className="flex min-w-max items-center py-0.5">
              {formSections.map((section, index) => {
                const isCurrentStep = coreStep === section.step;
                return (
                  <li key={section.id} className="flex items-center">
                    {index > 0 ? (
                      <span
                        className={`mx-1 h-0.5 w-3 shrink-0 sm:mx-1.5 sm:w-4 ${
                          formSections[index - 1].complete ? 'bg-blue-900' : 'bg-slate-200'
                        }`}
                        aria-hidden
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => jumpToSection(section)}
                      aria-current={isCurrentStep ? 'step' : undefined}
                      className={`relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                        isCurrentStep
                          ? 'border-blue-900 bg-blue-900 text-white shadow-sm'
                          : section.complete
                            ? 'border-blue-200 bg-blue-50 text-blue-900 hover:border-blue-300'
                            : section.required
                              ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              : 'border-dashed border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${
                          section.complete
                            ? isCurrentStep
                              ? 'bg-white text-blue-900'
                              : 'bg-blue-900 text-white'
                            : isCurrentStep
                              ? 'border border-white bg-transparent'
                              : 'border border-current bg-transparent'
                        }`}
                      >
                        {section.complete ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                      </span>
                      {section.label}
                      {section.required ? null : (
                        <span className={`text-[10px] font-normal ${isCurrentStep ? 'text-blue-100' : 'text-slate-400'}`}>
                          opt
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="mt-3 flex items-center justify-start overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:justify-center">
            {CORE_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                {index > 0 ? (
                  <span
                    className={`mx-1 h-0.5 w-4 shrink-0 sm:w-6 ${coreStep >= index ? 'bg-blue-900' : 'bg-slate-200'}`}
                    aria-hidden
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => goToCoreStep(index)}
                  aria-current={coreStep === index ? 'step' : undefined}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:text-sm ${
                    coreStep === index
                      ? 'bg-blue-900 text-white shadow-sm'
                      : coreStep > index
                        ? 'bg-blue-50 text-blue-900 hover:bg-blue-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
            event.preventDefault();
            if (isContinuing) return;
            if (coreStep !== 3) {
              goToCoreStep(coreStep + 1);
              return;
            }
            submitReview();
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

              <EventFileDropzone

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
                        <EventFileDropzone
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
                        <EventFileDropzone
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
                  <EventFileDropzone
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
                  <EventFileDropzone
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
                disabled={isContinuing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            ) : null}
            {isCreate ? (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSavingDraft || isContinuing}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingDraft ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isSavingDraft ? 'Saving draft' : 'Save as draft'}
            </button>
            ) : null}
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
                type="button"
                onClick={submitReview}
                disabled={isContinuing}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-blue-900 font-medium text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-90"
              >
                {isContinuing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {isContinuing
                  ? (submitButtonLabel === 'Save Changes' ? 'Saving changes' : 'Continuing')
                  : submitButtonLabel}
                {isContinuing || submitButtonLabel === 'Save Changes' ? null : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
          </div>

        </form>

        {afterMaterials}

      </div>

    </section>

  );
}
