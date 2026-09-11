import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const createPath = path.join(root, 'apps/Web/src/components/sections/CreateEvent.jsx');
const destPath = path.join(root, 'apps/Web/src/components/eventForm/EventFormWizard.jsx');

const src = fs.readFileSync(createPath, 'utf8');
const start = src.indexOf('  const hasMaterials = Boolean(');
const end = src.lastIndexOf('\n};');
if (start < 0 || end < 0) throw new Error(`bounds ${start} ${end}`);

let body = src.slice(start, end).trim();
body = body.replace(/const pageTitle = 'Create Event';[\s\S]*?const submitButtonLabel = 'Create Event';\n/, '');
body = body.replace(/if \(!isAuthenticated\) \{[\s\S]*?if \(submitMessage\) \{[\s\S]*?\n  \}\n\n  return \(/, 'return (');

const header = `import React, { Suspense, lazy } from 'react';
import { Controller } from 'react-hook-form';
import { Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, LoaderCircle, Plus, Trash2 } from 'lucide-react';
import { FIELD_LIMITS, isValidPhMobile, normalizePhMobile } from '../../utils/formFields';
import { CharCount, FieldError } from '../form/Field';
import { EventFileDropzone } from './EventFileDropzone';
import { OptionalOptIn } from './OptionalOptIn';
import { CORE_STEPS, stripHtml } from '../../utils/eventForm/helpers';

const RichTextEditor = lazy(() => import('../RichTextEditor'));

export function EventFormWizard({
  mode = 'create',
  pageTitle,
  pageSubtitle,
  submitButtonLabel,
  headerExtra = null,
  afterMaterials = null,
  navigate,
  handleSubmit,
  onSubmit,
  onSaveDraft,
  isSavingDraft = false,
  register,
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
}) {
  const isCreate = mode === 'create';
  const formValues = watch();
`;

fs.writeFileSync(destPath, `${header}${body}\n}\n`);
console.log('Wrote EventFormWizard.jsx', fs.readFileSync(destPath, 'utf8').split('\n').length);
