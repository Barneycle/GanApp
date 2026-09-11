import { Plus } from 'lucide-react';

export function OptionalOptIn({ label, description, onAdd }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3.5 text-left transition-colors hover:border-blue-300 hover:bg-white"
    >
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Plus className="h-4 w-4 shrink-0 text-slate-500" />
          {label}
        </span>
        {description ? <span className="mt-0.5 block text-xs text-slate-500">{description}</span> : null}
      </span>
      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">
        Optional
      </span>
    </button>
  );
}
