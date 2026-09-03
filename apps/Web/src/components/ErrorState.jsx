import { CircleAlert } from 'lucide-react';
import { isErrorCopy, toErrorCopy } from '../utils/errorCopy';

export function ErrorCopyLines({ copy, className = '' }) {
  if (!copy) return null;
  return (
    <div className={className}>
      <p className="font-semibold text-slate-900">{copy.what}</p>
      {copy.why ? <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{copy.why}</p> : null}
      {copy.action ? <p className="mt-2 text-sm font-medium text-slate-800">{copy.action}</p> : null}
    </div>
  );
}

export function ErrorBanner({ error, context = 'generic', onRetry, retryLabel = 'Try again', className = '' }) {
  if (!error) return null;
  const copy = isErrorCopy(error) ? error : toErrorCopy(error, context);

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-red-900">{copy.what}</p>
        {copy.why ? <p className="mt-1 text-red-800">{copy.why}</p> : null}
        {copy.action ? <p className="mt-1 font-medium text-red-900">{copy.action}</p> : null}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 text-sm font-medium text-blue-800 hover:text-blue-900"
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ErrorState({
  error,
  context = 'generic',
  onRetry,
  retryLabel = 'Try again',
  variant = 'page',
}) {
  if (!error) return null;
  const copy = isErrorCopy(error) ? error : toErrorCopy(error, context);

  const card = (
    <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center sm:p-8">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
        <CircleAlert className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{copy.what}</h2>
      {copy.why ? <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{copy.why}</p> : null}
      {copy.action ? <p className="mt-3 text-sm font-medium text-slate-800">{copy.action}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-blue-900 font-medium text-white transition-colors hover:bg-blue-800"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );

  if (variant === 'card') {
    return card;
  }

  if (variant === 'embedded') {
    return <div className="mx-auto flex min-h-[60vh] max-w-lg items-center justify-center px-5">{card}</div>;
  }

  return (
    <section className="flex min-h-screen items-center justify-center p-4">
      {card}
    </section>
  );
}
