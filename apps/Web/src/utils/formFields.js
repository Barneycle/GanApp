export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FIELD_LIMITS = {
  email: 254,
  password: 72,
  firstName: 50,
  lastName: 50,
  middleInitial: 2,
  organization: 120,
  ticketSubject: 120,
  ticketMessage: 2000,
  eventTitle: 120,
  eventRationale: 4000,
};

export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'One lowercase letter', test: (value) => /[a-z]/.test(value) },
  { id: 'number', label: 'One number', test: (value) => /[0-9]/.test(value) },
  { id: 'special', label: 'One special character', test: (value) => /[!@#$%^&*()_+\-=[\]{};':"|\\<>?,./`~]/.test(value) },
];

export function isValidEmail(value) {
  const email = String(value || '').trim();
  return EMAIL_REGEX.test(email) && email.length <= FIELD_LIMITS.email;
}

export function getPasswordChecks(password) {
  const value = String(password || '');
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(value),
  }));
}

export function isPasswordValid(password) {
  return getPasswordChecks(password).every((rule) => rule.met) && String(password || '').length <= FIELD_LIMITS.password;
}

export function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

export function normalizePhMobile(value) {
  let digits = digitsOnly(value);
  if (!digits) return '';

  if (digits.startsWith('63') && digits.length >= 12) {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.length === 10 && digits.startsWith('9')) {
    digits = `0${digits}`;
  }

  return digits.slice(0, 11);
}

export function isValidPhMobile(value, { required = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return !required;
  return /^09\d{9}$/.test(normalizePhMobile(raw));
}
