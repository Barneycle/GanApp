import { Check, Circle, CircleAlert } from 'lucide-react';
import { getPasswordChecks } from '../../utils/formFields';

export function controlClass(hasError, extra = '') {
  return [
    'w-full rounded-xl border px-4 py-3 transition-all duration-200 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
    hasError
      ? 'border-red-400 focus:border-red-400 focus:ring-red-500'
      : 'border-slate-300 focus:border-transparent focus:ring-blue-500',
    extra,
  ].join(' ');
}

export function FieldLabel({ htmlFor, required = false, optional = false, children }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-slate-700">
      {children}
      {required ? <span className="ml-0.5 text-red-500" aria-hidden="true">*</span> : null}
      {optional ? <span className="ml-1 font-normal text-slate-500">(optional)</span> : null}
    </label>
  );
}

export function FieldError({ id, error }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1 flex items-start gap-1.5 text-sm text-red-600" role="alert">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </p>
  );
}

export function CharCount({ value = '', max }) {
  if (!max) return null;
  const length = String(value).length;
  return (
    <p className={`mt-1 text-right text-xs tabular-nums ${length > max ? 'text-red-600' : 'text-slate-500'}`}>
      {length}/{max}
    </p>
  );
}

export function PasswordChecklist({ password = '', confirm }) {
  const checks = getPasswordChecks(password);
  const showConfirm = confirm != null;
  const matches = showConfirm && password.length > 0 && password === confirm;

  return (
    <ul className="mt-2 space-y-1" aria-live="polite">
      {checks.map((rule) => (
        <li
          key={rule.id}
          className={`flex items-center gap-2 text-xs ${rule.met ? 'text-green-700' : 'text-slate-500'}`}
        >
          {rule.met ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0" />}
          {rule.label}
        </li>
      ))}
      {showConfirm ? (
        <li className={`flex items-center gap-2 text-xs ${matches ? 'text-green-700' : 'text-slate-500'}`}>
          {matches ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0" />}
          Passwords match
        </li>
      ) : null}
    </ul>
  );
}
