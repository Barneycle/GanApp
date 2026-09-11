import { Calendar, Clock, Star } from 'lucide-react';

export function QuestionPreview({ question }) {
  const {
    questionType,
    options = [],
    scaleMin = 1,
    scaleMax = 5,
    lowestLabel,
    highestLabel,
    rows = [],
    columns = [],
  } = question || {};

  switch (questionType) {
    case 'short-answer':
      return (
        <p className="max-w-md border-b border-slate-300 py-2 text-sm text-slate-400">Short-answer text</p>
      );
    case 'paragraph':
      return (
        <p className="border-b border-slate-300 py-6 text-sm text-slate-400">Long-answer text</p>
      );
    case 'multiple-choice':
      return (
        <div className="space-y-3">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="h-4 w-4 shrink-0 rounded-full border border-slate-400" />
              <span className="text-[15px] text-slate-700">{option || `Option ${index + 1}`}</span>
            </div>
          ))}
          {options.length === 0 && (
            <p className="text-sm text-slate-400">No options yet</p>
          )}
        </div>
      );
    case 'checkbox':
      return (
        <div className="space-y-3">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="h-4 w-4 shrink-0 rounded-sm border border-slate-400" />
              <span className="text-[15px] text-slate-700">{option || `Option ${index + 1}`}</span>
            </div>
          ))}
          {options.length === 0 && (
            <p className="text-sm text-slate-400">No options yet</p>
          )}
        </div>
      );
    case 'dropdown':
      return (
        <select disabled className="h-10 w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-500">
          <option>Choose</option>
          {options.map((option, index) => (
            <option key={index}>{option || `Option ${index + 1}`}</option>
          ))}
        </select>
      );
    case 'linear-scale':
      return (
        <div className="overflow-x-auto pt-2">
          <div className="flex items-end justify-between gap-2">
            <span className="w-20 shrink-0 pb-6 text-xs text-slate-500">{lowestLabel || scaleMin}</span>
            <div className="flex min-w-0 flex-1 items-end justify-between gap-1">
              {Array.from({ length: Math.max(1, scaleMax - scaleMin + 1) }, (_, i) => scaleMin + i).map((value) => (
                <div key={value} className="flex flex-col items-center gap-2">
                  <span className="text-xs text-slate-500">{value}</span>
                  <span className="h-4 w-4 rounded-full border border-slate-400" />
                </div>
              ))}
            </div>
            <span className="w-20 shrink-0 pb-6 text-right text-xs text-slate-500">{highestLabel || scaleMax}</span>
          </div>
        </div>
      );
    case 'star-rating':
      return (
        <div className="flex items-center gap-1 pt-1">
          {Array.from({ length: scaleMax || 5 }, (_, i) => (
            <Star key={i} className="h-7 w-7 text-slate-300" />
          ))}
        </div>
      );
    case 'multiple-choice-grid':
    case 'checkbox-grid':
      return rows.length > 0 && columns.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse">
            <thead>
              <tr>
                <th className="p-2" />
                {columns.map((column, colIndex) => (
                  <th key={colIndex} className="p-2 text-center text-xs font-medium text-slate-600">
                    {column || `Column ${colIndex + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-slate-50' : ''}>
                  <td className="p-2 text-sm text-slate-700">{row || `Row ${rowIndex + 1}`}</td>
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="p-2 text-center">
                      <span className={`inline-block h-4 w-4 border border-slate-400 ${questionType === 'checkbox-grid' ? 'rounded-sm' : 'rounded-full'}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate-400">Add rows and columns to see the grid</p>
      );
    case 'date':
      return (
        <div className="inline-flex items-center gap-2 border-b border-slate-300 py-2 text-sm text-slate-400">
          <Calendar className="h-4 w-4" />
          Month, day, year
        </div>
      );
    case 'time':
      return (
        <div className="inline-flex items-center gap-2 border-b border-slate-300 py-2 text-sm text-slate-400">
          <Clock className="h-4 w-4" />
          Time
        </div>
      );
    default:
      return <p className="text-sm text-slate-400">Select a question type</p>;
  }
}
