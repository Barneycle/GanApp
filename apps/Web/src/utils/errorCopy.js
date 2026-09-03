const CONTEXTS = {
  generic: {
    what: "That didn't work.",
    why: 'Something went wrong on our side.',
    action: 'Try again. If it continues, contact support.',
  },
  loadEvents: {
    what: "Events didn't load.",
    why: "We couldn't reach the event list.",
    action: 'Check your connection, then try again.',
  },
  loadMyEvents: {
    what: "Your events didn't load.",
    why: "We couldn't fetch your registrations.",
    action: 'Check your connection, then try again.',
  },
  loadSurvey: {
    what: "This survey didn't load.",
    why: "We couldn't fetch the survey for this event.",
    action: 'Go back to My events and open it again, or try again here.',
  },
  loadSurveys: {
    what: "Surveys didn't load.",
    why: "We couldn't fetch the survey list.",
    action: 'Try again. If it continues, refresh the page.',
  },
  loadStatistics: {
    what: "Statistics didn't load.",
    why: "We couldn't fetch the report for this event.",
    action: 'Go back and open the event again, or try again.',
  },
  loadCertificates: {
    what: "Certificates didn't load.",
    why: "We couldn't fetch your certificate list.",
    action: 'Try again. If this continues, contact support.',
  },
  loadCertificate: {
    what: "This certificate didn't load.",
    why: "We couldn't fetch the certificate for this event.",
    action: 'Check your connection, then try again.',
  },
  generateCertificate: {
    what: "Certificate wasn't generated.",
    why: "We couldn't start or finish generating it.",
    action: 'Try again. If it keeps failing, wait a moment and retry.',
  },
  downloadCertificate: {
    what: "Download didn't start.",
    why: 'The certificate file was not available or the request failed.',
    action: 'Try again. If it still fails, ask the organizer.',
  },
  loadTickets: {
    what: "Support tickets didn't load.",
    why: "We couldn't reach the support inbox.",
    action: 'Try again in a moment.',
  },
  loadMessages: {
    what: "Messages didn't load.",
    why: "We couldn't fetch this conversation.",
    action: 'Try again.',
  },
  loadQr: {
    what: "Your QR code didn't generate.",
    why: "We couldn't create the code for this event.",
    action: 'Try again. If it keeps failing, reopen the event.',
  },
  loadParticipants: {
    what: "Participants didn't load.",
    why: "We couldn't fetch the registered list for this event.",
    action: 'Try again, or add names manually.',
  },
  register: {
    what: "You weren't registered.",
    why: "The registration didn't complete.",
    action: 'Try again. If the event is full or closed, pick another event.',
  },
  publish: {
    what: "The event wasn't published.",
    why: 'The publish step did not complete.',
    action: 'Try again. If it keeps failing, save as a draft first.',
  },
  saveDraft: {
    what: "The draft wasn't saved.",
    why: "We couldn't write the event to the server.",
    action: 'Check required fields, then try again.',
  },
  login: {
    what: "Sign-in didn't work.",
    why: 'Something went wrong while checking your account.',
    action: 'Try again. If it continues, reset your password.',
  },
  signup: {
    what: "Account wasn't created.",
    why: "Sign-up didn't complete.",
    action: 'Check your details and try again.',
  },
  passwordReset: {
    what: "Password wasn't updated.",
    why: "The reset didn't complete.",
    action: 'Request a new reset link, then try again.',
  },
  sendReset: {
    what: "Reset email wasn't sent.",
    why: "We couldn't send the password reset link.",
    action: 'Check the email address, then try again.',
  },
  profile: {
    what: "Profile wasn't saved.",
    why: "We couldn't update your details.",
    action: 'Check the form, then try again.',
  },
  passwordChange: {
    what: "Password wasn't changed.",
    why: "We couldn't update your password.",
    action: 'Check your current password, then try again.',
  },
  sendMessage: {
    what: "Message wasn't sent.",
    why: "We couldn't deliver it.",
    action: 'Try again.',
  },
  download: {
    what: "Download didn't start.",
    why: 'The file was not available or the request failed.',
    action: 'Try again. If it still fails, ask the organizer.',
  },
  checkIn: {
    what: "Check-in didn't save.",
    why: "We couldn't record attendance.",
    action: 'Try again. Confirm the participant is registered.',
  },
  submitSurvey: {
    what: "Survey wasn't submitted.",
    why: "We couldn't save your answers.",
    action: 'Check required questions, then try again.',
  },
  verifyCertificate: {
    what: "This certificate wasn't found.",
    why: 'The number may be wrong, or the certificate is no longer valid.',
    action: 'Check the number and try again. If you received this certificate, ask the organizer.',
  },
};

const VERB_COPY = {
  load: (object) => ({
    what: `${cap(object)} didn't load.`,
    why: `We couldn't fetch ${object} right now.`,
    action: 'Check your connection, then try again.',
  }),
  fetch: (object) => ({
    what: `${cap(object)} didn't load.`,
    why: `We couldn't fetch ${object} right now.`,
    action: 'Check your connection, then try again.',
  }),
  save: (object) => ({
    what: `${cap(object)} wasn't saved.`,
    why: 'The save did not complete.',
    action: 'Try again. If it keeps failing, check your connection.',
  }),
  send: (object) => ({
    what: `${cap(object)} wasn't sent.`,
    why: "We couldn't deliver it.",
    action: 'Try again.',
  }),
  update: (object) => ({
    what: `${cap(object)} wasn't updated.`,
    why: 'The update did not complete.',
    action: 'Try again.',
  }),
  delete: (object) => ({
    what: `${cap(object)} wasn't deleted.`,
    why: 'The delete did not complete.',
    action: 'Try again.',
  }),
  create: (object) => ({
    what: `${cap(object)} wasn't created.`,
    why: 'The create step did not complete.',
    action: 'Check required fields, then try again.',
  }),
  publish: () => CONTEXTS.publish,
  download: () => CONTEXTS.download,
  upload: (object) => ({
    what: `${cap(object)} didn't upload.`,
    why: 'The file did not reach the server.',
    action: 'Check the file size and your connection, then try again.',
  }),
  register: () => CONTEXTS.register,
  submit: (object) => ({
    what: `${cap(object)} wasn't submitted.`,
    why: 'The submit step did not complete.',
    action: 'Check required fields, then try again.',
  }),
  process: (object) => ({
    what: `${cap(object)} couldn't be processed.`,
    why: 'The file or request was not accepted.',
    action: 'Check the file and try again.',
  }),
  parse: (object) => ({
    what: `${cap(object)} couldn't be read.`,
    why: 'The file format was not recognized.',
    action: 'Use a CSV or Excel file with a name column, then try again.',
  }),
  copy: () => ({
    what: "That wasn't copied.",
    why: 'The clipboard request failed.',
    action: 'Select the text and copy it manually.',
  }),
};

export function errorCopy({ what, why, action }) {
  return {
    what: String(what || CONTEXTS.generic.what),
    why: why == null ? CONTEXTS.generic.why : String(why),
    action: action == null ? CONTEXTS.generic.action : String(action),
  };
}

export const LOGIN_ERRORS = {
  wrongPassword: errorCopy({
    what: "The password doesn't match.",
    why: 'The password entered is incorrect for this account.',
    action: 'Try again, or use Forgot password to reset it.',
  }),
  emailNotFound: errorCopy({
    what: "This email isn't registered.",
    why: 'No account exists with this address.',
    action: 'Check the spelling, or create an account.',
  }),
  emailInvalid: errorCopy({
    what: "That email address isn't valid.",
    why: "It doesn't look like a complete email.",
    action: 'Use a full address like name@example.com, then try again.',
  }),
};

export function isErrorCopy(value) {
  return Boolean(value && typeof value === 'object' && typeof value.what === 'string');
}

export function formatErrorCopy(copy) {
  if (!copy) return '';
  if (typeof copy === 'string') return copy;
  return [copy.what, copy.why, copy.action].filter(Boolean).join(' ');
}

export function inlineError(raw, context = 'generic') {
  const copy = isErrorCopy(raw) ? raw : toErrorCopy(raw, context);
  return [copy.what, copy.action].filter(Boolean).join(' ');
}

export function classifyError(raw) {
  if (isErrorCopy(raw)) {
    const what = String(raw.what || '').toLowerCase();
    if (what === LOGIN_ERRORS.wrongPassword.what.toLowerCase()) return 'wrongPassword';
    if (what === LOGIN_ERRORS.emailNotFound.what.toLowerCase()) return 'emailNotFound';
    if (what === LOGIN_ERRORS.emailInvalid.what.toLowerCase()) return 'emailInvalid';
    if (what.includes('already in use')) return 'duplicateEmail';
    if (what.includes('blocked')) return 'banned';
    if (what.includes('inactive')) return 'inactive';
    if (what.includes('session expired')) return 'session';
    if (what.includes("don't have access") || what.includes('do not have access')) return 'permission';
    if (what.includes('too many')) return 'rateLimit';
    if (what.includes("can't sign in") || what.includes('cannot sign in')) return 'unconfirmed';
    if (what.includes('already registered')) return 'conflict';
    return classify(extractText(raw.why));
  }
  return classify(extractText(raw));
}

export function fieldForError(raw) {
  const kind = classifyError(raw);
  if (kind === 'wrongPassword') return 'password';
  if (kind === 'emailNotFound' || kind === 'emailInvalid' || kind === 'duplicateEmail') return 'email';
  return null;
}

export function isBlockingError(raw) {
  return ['banned', 'inactive', 'session', 'permission', 'rateLimit', 'unconfirmed'].includes(classifyError(raw));
}

export function modalButtonCopy(raw, context = 'generic') {
  const kind = classifyError(raw);
  if (kind === 'session') return { confirmText: 'Sign in', secondaryText: 'Close' };
  if (kind === 'banned' || kind === 'inactive') return { confirmText: 'Contact support', secondaryText: 'Close' };
  if (kind === 'permission') return { confirmText: 'Go home', secondaryText: 'Close' };
  if (kind === 'rateLimit' || kind === 'unconfirmed') return { confirmText: 'OK', secondaryText: '' };
  if (kind === 'conflict' && context === 'register') return { confirmText: 'Open My events', secondaryText: 'Close' };
  return { confirmText: 'Try again', secondaryText: 'Close' };
}

export function toErrorCopy(raw, context = 'generic') {
  if (isErrorCopy(raw)) return raw;

  const text = extractText(raw);
  const base = CONTEXTS[context] || CONTEXTS.generic;
  const kind = classify(text);

  if (kind === 'emailNotFound') return LOGIN_ERRORS.emailNotFound;
  if (kind === 'emailInvalid') return LOGIN_ERRORS.emailInvalid;
  if (kind === 'wrongPassword') return LOGIN_ERRORS.wrongPassword;
  if (kind === 'unconfirmed') {
    return errorCopy({
      what: "You can't sign in yet.",
      why: 'This email has not been confirmed.',
      action: 'Open the confirmation link in your inbox, then try again.',
    });
  }
  if (kind === 'banned') {
    return errorCopy({
      what: 'This account is blocked.',
      why: isTechnical(text) ? 'An administrator has restricted this account.' : text,
      action: 'Contact support if you think this is a mistake.',
    });
  }
  if (kind === 'inactive') {
    return errorCopy({
      what: 'This account is inactive.',
      why: isTechnical(text) ? 'The account is turned off.' : text,
      action: 'Contact support to reactivate it.',
    });
  }
  if (kind === 'duplicateEmail') {
    return errorCopy({
      what: 'That email is already in use.',
      why: 'An account already exists with this address.',
      action: 'Log in, or use a different email.',
    });
  }
  if (kind === 'network') {
    return errorCopy({
      what: base.what,
      why: 'Your connection dropped or the server did not respond.',
      action: 'Check your internet, then try again.',
    });
  }
  if (kind === 'timeout') {
    return errorCopy({
      what: base.what,
      why: 'The request timed out before it finished.',
      action: 'Try again. If it keeps happening, wait a moment and retry.',
    });
  }
  if (kind === 'session') {
    return errorCopy({
      what: 'Your session expired.',
      why: 'You were signed out, so this action was blocked.',
      action: 'Sign in again, then retry.',
    });
  }
  if (kind === 'permission') {
    return errorCopy({
      what: "You don't have access to do that.",
      why: 'This account is not allowed to perform that action.',
      action: 'Sign in with the right account, or ask an organizer for access.',
    });
  }
  if (kind === 'rateLimit') {
    return errorCopy({
      what: 'Too many attempts.',
      why: 'This was blocked to protect the account.',
      action: 'Wait a few minutes, then try again.',
    });
  }
  if (kind === 'conflict') {
    if (context === 'register' || /already registered/.test(String(text || '').toLowerCase())) {
      return errorCopy({
        what: "You're already registered.",
        why: 'This account is already on the event list.',
        action: 'Open My events to view it.',
      });
    }
    return errorCopy({
      what: 'That is already done.',
      why: 'This record already exists.',
      action: 'Refresh the page and continue from there.',
    });
  }
  if (kind === 'notFound') {
    return errorCopy({
      what: context === 'verifyCertificate' ? CONTEXTS.verifyCertificate.what : "We couldn't find that.",
      why: context === 'verifyCertificate' ? CONTEXTS.verifyCertificate.why : 'It may have been removed, or the link is wrong.',
      action: context === 'verifyCertificate' ? CONTEXTS.verifyCertificate.action : 'Go back and try a different item, or refresh the list.',
    });
  }
  if (kind === 'validation') {
    return errorCopy({
      what: 'Some details are missing or invalid.',
      why: isTechnical(text) ? 'Required fields were empty or in the wrong format.' : text,
      action: 'Fix the highlighted fields, then try again.',
    });
  }

  const parsed = fromFailedTo(text);
  if (parsed && context === 'generic') return parsed;
  if (parsed && kind === 'unknown' && (text.toLowerCase().startsWith('failed to') || text.toLowerCase().startsWith('upload failed'))) {
    return parsed;
  }

  if (/unexpected error/i.test(text)) {
    return errorCopy(base);
  }

  if (text && !isTechnical(text) && text.length <= 180) {
    return errorCopy({
      what: base.what,
      why: stripPleaseTryAgain(text),
      action: base.action,
    });
  }

  return errorCopy(base);
}

function extractText(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (raw instanceof Error) return String(raw.message || '').trim();
  if (typeof raw.message === 'string') return raw.message.trim();
  if (typeof raw.error === 'string') return raw.error.trim();
  return String(raw).trim();
}

function classify(text) {
  const lower = String(text || '').toLowerCase();
  if (!lower) return 'unknown';

  if (/\bban(ned)?\b/.test(lower)) return 'banned';
  if (/\binactive\b/.test(lower)) return 'inactive';
  if ((lower.includes('email') && lower.includes('confirm')) || lower.includes('not confirmed')) return 'unconfirmed';

  if (
    lower.includes('no account') ||
    lower.includes("isn't registered") ||
    lower.includes('is not registered') ||
    lower.includes('email does not exist') ||
    lower.includes('this email does not exist') ||
    (lower.includes('email') && (lower.includes('not found') || lower.includes('user not found')))
  ) {
    return 'emailNotFound';
  }
  if (
    lower.includes("isn't valid") ||
    lower.includes('is not valid') ||
    lower.includes("doesn't look like") ||
    lower.includes('email is wrong') ||
    lower.includes('the email is wrong')
  ) {
    return 'emailInvalid';
  }
  if (
    (lower.includes('the password') || lower.includes('password is')) &&
    (lower.includes("doesn't match") ||
      lower.includes('does not match') ||
      lower.includes('incorrect') ||
      lower.includes('invalid') ||
      lower.includes('wrong'))
  ) {
    return 'wrongPassword';
  }
  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'wrongPassword';
  }
  if (
    lower.includes('already been registered') ||
    lower.includes('user already exists') ||
    lower.includes('user already registered') ||
    lower.includes('email already exists') ||
    (lower.includes('email') && lower.includes('already registered'))
  ) {
    return 'duplicateEmail';
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('err_network') ||
    lower.includes('err_internet') ||
    lower.includes('offline') ||
    (lower.includes('connection') && (lower.includes('refused') || lower.includes('lost') || lower.includes('reset')))
  ) {
    return 'network';
  }
  if (lower.includes('timeout') || lower.includes('timed out')) return 'timeout';
  if (
    (lower.includes('session') && (lower.includes('expired') || lower.includes('invalid'))) ||
    lower.includes('not authenticated') ||
    lower.includes('jwt expired')
  ) {
    return 'session';
  }
  if (
    lower.includes('not authorized') ||
    lower.includes('unauthorized') ||
    lower.includes('permission denied') ||
    lower.includes('access denied') ||
    lower.includes('row-level security') ||
    lower.includes('42501') ||
    /\b401\b/.test(lower) ||
    /\b403\b/.test(lower)
  ) {
    return 'permission';
  }
  if (lower.includes('too many') || lower.includes('rate limit') || lower.includes('429')) return 'rateLimit';
  if ((lower.includes('already exists') || lower.includes('already registered')) && !/duplicate key|violates/i.test(lower)) {
    return 'conflict';
  }
  if (lower.includes('not found') || lower.includes('404') || lower.includes('no rows')) return 'notFound';
  if (
    lower.includes('please fill') ||
    lower.includes('please enter') ||
    lower.includes('please select') ||
    lower.includes('please provide') ||
    lower.includes('required') ||
    lower.includes('do not match') ||
    lower.includes("doesn't match")
  ) {
    return 'validation';
  }
  return 'unknown';
}

function fromFailedTo(text) {
  const cleaned = stripPleaseTryAgain(String(text || ''));
  if (!cleaned) return null;

  const upload = cleaned.match(/^upload failed(?::\s*(.+))?$/i);
  if (upload) {
    const detail = upload[1] && !isTechnical(upload[1]) ? upload[1].trim() : '';
    return errorCopy({
      what: "The file didn't upload.",
      why: detail || 'The file did not reach the server.',
      action: 'Check the file size and your connection, then try again.',
    });
  }

  const match = cleaned.match(/^(?:failed to|couldn't|could not|unable to)\s+(.+)$/i);
  if (!match) return null;

  const { actionPhrase, detail } = splitDetail(match[1]);
  const [verb, ...objectParts] = actionPhrase.split(/\s+/);
  const object = tidyObject(objectParts.join(' ') || actionPhrase);
  const template = VERB_COPY[verb?.toLowerCase()];
  if (!template) {
    return errorCopy({
      what: `${cap(actionPhrase)} didn't finish.`,
      why: detail && !isTechnical(detail) ? detail : 'The request did not complete.',
      action: 'Try again. If it continues, contact support.',
    });
  }

  const copy = errorCopy(template(object));
  if (detail && !isTechnical(detail) && detail.length <= 140) {
    return errorCopy({ ...copy, why: detail });
  }
  return copy;
}

function splitDetail(value) {
  const cleaned = String(value || '').replace(/[.:!?]+$/g, '').trim();
  const index = cleaned.indexOf(':');
  if (index === -1) return { actionPhrase: cleaned, detail: '' };
  return {
    actionPhrase: cleaned.slice(0, index).trim(),
    detail: cleaned.slice(index + 1).replace(/[.:!?]+$/g, '').trim(),
  };
}

function tidyObject(value) {
  return String(value || 'that')
    .replace(/\bfrom database\b/gi, '')
    .replace(/[.:!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'that';
}

function stripPleaseTryAgain(value) {
  return String(value || '')
    .replace(/\s*please try again\.?$/i, '')
    .replace(/\s*try again\.?$/i, '')
    .trim();
}

function isTechnical(text) {
  return /violates|permission denied for|column |relation |null value|duplicate key|jwt|rls policy|stack trace|undefined is not|cannot read|syntax error|postgres|supabase/i.test(
    String(text || '')
  );
}

function cap(value) {
  const text = String(value || 'that').trim();
  if (!text) return 'That';
  return text.charAt(0).toUpperCase() + text.slice(1);
}
