import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wizardPath = path.join(root, 'apps/Web/src/components/eventForm/EventFormWizard.jsx');
const createPath = path.join(root, 'apps/Web/src/components/sections/CreateEvent.jsx');
const editPath = path.join(root, 'apps/Web/src/components/sections/EditEvent.jsx');

const toLf = (src) => src.replace(/\r\n/g, '\n');

function mustReplace(src, find, replace, label) {
  if (!src.includes(find)) throw new Error(`Could not find ${label}`);
  return src.replace(find, replace);
}

let wizard = toLf(fs.readFileSync(wizardPath, 'utf8'));

wizard = wizard.replace(
  `  pageSubtitle,
  submitButtonLabel,`,
  `  pageSubtitle = 'Fill in the details, then continue to certificate design or evaluation.',
  submitButtonLabel,`,
);

const guardStart = wizard.indexOf("  const pageTitle = 'Create Event';");
const returnIdx = wizard.indexOf('  return (', guardStart);
if (guardStart < 0 || returnIdx < 0) throw new Error('wizard guards not found');
wizard = `${wizard.slice(0, guardStart)}${wizard.slice(returnIdx)}`;

wizard = mustReplace(
  wizard,
  `            <p className="mt-1 text-[15px] text-slate-600">
              Fill in the details, then continue to certificate design or evaluation.
            </p>`,
  `            <p className="mt-1 text-[15px] text-slate-600">
              {pageSubtitle}
            </p>`,
  'pageSubtitle',
);

wizard = mustReplace(
  wizard,
  `            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Auto-save</span>
                <button
                  type="button"
                  onClick={toggleAutoSave}
                  className={\`relative inline-flex h-7 w-12 items-center rounded-full transition-colors \${autoSaveEnabled ? 'bg-blue-900' : 'bg-slate-300'}\`}
                  aria-pressed={autoSaveEnabled}
                >
                  <span
                    className={\`inline-block h-5 w-5 transform rounded-full bg-white transition-transform \${autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'}\`}
                  />
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
            </div>`,
  `            {isCreate ? (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Auto-save</span>
                <button
                  type="button"
                  onClick={toggleAutoSave}
                  className={\`relative inline-flex h-7 w-12 items-center rounded-full transition-colors \${autoSaveEnabled ? 'bg-blue-900' : 'bg-slate-300'}\`}
                  aria-pressed={autoSaveEnabled}
                >
                  <span
                    className={\`inline-block h-5 w-5 transform rounded-full bg-white transition-transform \${autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'}\`}
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
            ) : null}`,
  'auto-save block',
);

wizard = mustReplace(
  wizard,
  `        <div className="sticky top-0 z-20 mb-6 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">`,
  `        {headerExtra}

        <div className="sticky top-0 z-20 mb-6 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">`,
  'headerExtra',
);

wizard = mustReplace(
  wizard,
  `          )}
          </div>



          {/* Event Schedule Section */}`,
  `          )}
          {afterMaterials}
          </div>



          {/* Event Schedule Section */}`,
  'afterMaterials',
);

wizard = mustReplace(
  wizard,
  `            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSavingDraft}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingDraft ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isSavingDraft ? 'Saving draft' : 'Save as draft'}
            </button>`,
  `            {isCreate ? (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSavingDraft}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingDraft ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {isSavingDraft ? 'Saving draft' : 'Save as draft'}
            </button>
            ) : null}`,
  'save draft button',
);

wizard = wizard.replace(
  '  const formValues = watch();\nconst hasMaterials = Boolean(',
  '  const formValues = watch();\n  const hasMaterials = Boolean(',
);

fs.writeFileSync(wizardPath, wizard);
console.log('Patched EventFormWizard.jsx', wizard.split('\n').length);

const wizardProps = `    <EventFormWizard
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
    />`;

let createSrc = toLf(fs.readFileSync(createPath, 'utf8'));
createSrc = createSrc.replace(
  `import React, { useState, useEffect, Suspense, lazy } from 'react';

import { useNavigate } from 'react-router-dom';

import { useForm, Controller } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { EventService } from '../../services/eventService';

import { SpeakerService } from '../../services/speakerService';
import { SponsorService } from '../../services/sponsorService';
import { VenueService } from '../../services/venueService';
import { supabase } from '../../lib/supabaseClient';

import { useAuth } from '../../contexts/AuthContext';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { confirmDialog, statusDialog, statusError } from '../Toast';
import { ErrorState } from '../ErrorState';
import { promptCertificateUsage } from '../../utils/eventCreationDialogs';
import { FIELD_LIMITS, isValidPhMobile, normalizePhMobile } from '../../utils/formFields';
import { CharCount, FieldError } from '../form/Field';
import { toErrorCopy } from '../../utils/errorCopy';
import { EventFileDropzone } from '../eventForm/EventFileDropzone';
import { OptionalOptIn } from '../eventForm/OptionalOptIn';
import { createEventSchema } from '../../utils/eventForm/eventFormSchema';
import { CORE_STEPS, entryImageFiles, setAtIndex, stripHtml } from '../../utils/eventForm/helpers';
import { useSpeakerSponsorCrud } from '../../hooks/useSpeakerSponsorCrud';

// Lazy load RichTextEditor to prevent app-wide crashes
const RichTextEditor = lazy(() => import('../RichTextEditor'));
`,
  `import React, { useState, useEffect } from 'react';
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
import { setAtIndex } from '../../utils/eventForm/helpers';
import { useSpeakerSponsorCrud } from '../../hooks/useSpeakerSponsorCrud';
`,
);

const createMarker = '  const formValues = watch();\n  const hasMaterials = Boolean(';
const createCut = createSrc.indexOf(createMarker);
if (createCut < 0) throw new Error('CreateEvent cut marker not found');
createSrc = `${createSrc.slice(0, createCut)}
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
${wizardProps}
  );
};
`;
fs.writeFileSync(createPath, createSrc);
console.log('Wrote CreateEvent.jsx', createSrc.split('\n').length);

let editSrc = toLf(fs.readFileSync(editPath, 'utf8'));
editSrc = editSrc.replace(
  `import React, { useState, useEffect, Suspense, lazy } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { useForm, Controller } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { EventService } from '../../services/eventService';

import { SpeakerService } from '../../services/speakerService';
import { SponsorService } from '../../services/sponsorService';
import { VenueService } from '../../services/venueService';
import { supabase } from '../../lib/supabaseClient';

import { useAuth } from '../../contexts/AuthContext';
import CertificateDesigner from '../CertificateDesigner';
import { useToast, statusError } from '../Toast';
import { ErrorState } from '../ErrorState';
import { PageSkeleton } from '../loading/Skeleton';
import { logActivity } from '../../utils/activityLogger';
import { promptCertificateUsage } from '../../utils/eventCreationDialogs';
import { isValidPhMobile, normalizePhMobile } from '../../utils/formFields';
import { EventFileDropzone } from '../eventForm/EventFileDropzone';
import { editEventSchema } from '../../utils/eventForm/eventFormSchema';
import { entryImageFiles, extractBucketName, extractFilePath, setAtIndex } from '../../utils/eventForm/helpers';
import { useSpeakerSponsorCrud } from '../../hooks/useSpeakerSponsorCrud';

// Lazy load RichTextEditor to prevent app-wide crashes
const RichTextEditor = lazy(() => import('../RichTextEditor'));
`,
  `import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EventService } from '../../services/eventService';
import { SpeakerService } from '../../services/speakerService';
import { SponsorService } from '../../services/sponsorService';
import { VenueService } from '../../services/venueService';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import CertificateDesigner from '../CertificateDesigner';
import { useToast, statusError } from '../Toast';
import { ErrorState } from '../ErrorState';
import { PageSkeleton } from '../loading/Skeleton';
import { logActivity } from '../../utils/activityLogger';
import { promptCertificateUsage } from '../../utils/eventCreationDialogs';
import { isValidPhMobile, normalizePhMobile } from '../../utils/formFields';
import { EventFormWizard } from '../eventForm/EventFormWizard';
import { editEventSchema } from '../../utils/eventForm/eventFormSchema';
import { extractBucketName, extractFilePath, setAtIndex } from '../../utils/eventForm/helpers';
import { useSpeakerSponsorCrud } from '../../hooks/useSpeakerSponsorCrud';
`,
);

if (!editSrc.includes("const [showMaterials, setShowMaterials]")) {
  editSrc = mustReplace(
    editSrc,
    `  const [_showAddSponsor, setShowAddSponsor] = useState(false);

  // Venues state`,
    `  const [_showAddSponsor, setShowAddSponsor] = useState(false);

  const [eventKitsMode, setEventKitsMode] = useState('upload');
  const [eventProgrammeMode, setEventProgrammeMode] = useState('upload');
  const [coreStep, setCoreStep] = useState(0);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showSponsors, setShowSponsors] = useState(false);
  const [showSpeakers, setShowSpeakers] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);

  // Venues state`,
    'edit wizard state',
  );
}

editSrc = mustReplace(
  editSrc,
  `    watch,

    setValue

  } = useForm({`,
  `    watch,

    setValue,
    trigger,

  } = useForm({`,
  'edit trigger',
);

if (!editSrc.includes("eventKitsLink: '',")) {
  editSrc = mustReplace(
    editSrc,
    `      eventKitsFile: null,

      eventProgrammeFile: null,`,
    `      eventKitsFile: null,
      eventKitsLink: '',

      eventProgrammeFile: null,
      eventProgrammeLink: '',`,
    'edit link defaults',
  );
}

editSrc = mustReplace(
  editSrc,
  `          setSpeakers(speakersData);
        }

        const sponsorResult = await SponsorService.getEventSponsors(eventId);`,
  `          setSpeakers(speakersData);
          if (speakersData.length > 0) setShowSpeakers(true);
        }

        const sponsorResult = await SponsorService.getEventSponsors(eventId);`,
  'show speakers',
);

editSrc = mustReplace(
  editSrc,
  `          setSponsors(sponsorsData);
        }

        setCurrentEvent(event);`,
  `          setSponsors(sponsorsData);
          if (sponsorsData.length > 0) setShowSponsors(true);
        }

        if (kitsList.length > 0 || programmesList.length > 0) setShowMaterials(true);
        if ((event.check_in_before_minutes ?? 60) !== 60 || (event.check_in_during_minutes ?? 30) !== 30) {
          setShowCheckIn(true);
        }

        setCurrentEvent(event);`,
  'show sponsors/materials/check-in',
);

editSrc = mustReplace(
  editSrc,
          `          banner_url: uploadedFiles.banner?.url || currentEvent.banner_url || null,
          event_kits_url: uploadedFiles.eventKits?.length ? uploadedFiles.eventKits.map((file) => file.url).filter(Boolean).join(',') : currentEvent.event_kits_url || null,
          event_programmes_url: uploadedFiles.eventProgrammes?.length ? uploadedFiles.eventProgrammes.map((file) => file.url).filter(Boolean).join(',') : currentEvent.event_programmes_url || null,`,
  `          banner_url: uploadedFiles.banner?.url || currentEvent.banner_url || null,
          event_kits_url: (data.eventKitsLink && data.eventKitsLink.trim())
            || (uploadedFiles.eventKits?.map((file) => file.url).filter(Boolean).join(',') || null),
          event_programmes_url: (data.eventProgrammeLink && data.eventProgrammeLink.trim())
            || (uploadedFiles.eventProgrammes?.map((file) => file.url).filter(Boolean).join(',') || null),`,
  'edit kits urls',
);

const editReturn = editSrc.indexOf('  return (\n\n    <section className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">\n\n      <div className="w-full max-w-7xl mx-auto">');
if (editReturn < 0) throw new Error('EditEvent form return not found');
editSrc = `${editSrc.slice(0, editReturn)}  const mode = 'edit';
  const pageSubtitle = 'Update your event details, then continue to certificate design or evaluation.';
  const onSaveDraft = undefined;
  const isSavingDraft = false;
  const onClearDraft = undefined;
  const headerExtra = currentEvent?.status === 'draft' ? (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-amber-900">This event is saved as a draft</p>
          <p className="text-sm text-amber-800">Complete the event creation process to publish it</p>
        </div>
        <button
          type="button"
          onClick={handleContinueCreating}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 font-medium text-white transition-colors hover:bg-blue-800"
        >
          Continue Creating
        </button>
      </div>
    </div>
  ) : null;
  const afterMaterials = (
    <div className="mt-6 h-[calc(100dvh-3.5rem)] min-h-[28rem] overflow-hidden rounded-xl border border-slate-200 bg-white">
      <CertificateDesigner
        eventId={eventId}
        draftMode={false}
        onSave={() => {}}
      />
    </div>
  );

  return (
${wizardProps}
  );
};
`;
fs.writeFileSync(editPath, editSrc);
console.log('Wrote EditEvent.jsx', editSrc.split('\n').length);
