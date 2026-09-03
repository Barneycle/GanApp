export const ProgressBar = ({
  value = null,
  max = 100,
  label = '',
  className = '',
}) => {
  const determinate = typeof value === 'number';
  const percent = determinate ? Math.min(100, Math.max(0, (value / max) * 100)) : null;

  return (
    <div className={`w-full ${className}`}>
      {(label || determinate) && (
        <div className="mb-1.5 flex items-center justify-between text-[12px] text-slate-500">
          {label ? <span>{label}</span> : <span />}
          {determinate && <span className="tabular-nums">{Math.round(percent)}%</span>}
        </div>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        {determinate ? (
          <div
            className="h-full rounded-full bg-blue-600 transition-[width] duration-150 ease-out"
            style={{ width: `${percent}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-blue-600 app-progress-indeterminate" />
        )}
      </div>
    </div>
  );
};
