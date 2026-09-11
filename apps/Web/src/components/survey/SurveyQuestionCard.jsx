import { Controller } from 'react-hook-form';
import { Copy, Trash2 } from 'lucide-react';
import { FieldError } from '../form/Field';
import { QuestionPreview } from './QuestionPreview';
import {
  QUESTION_TYPES,
  isChoiceType,
  isGridType,
  isScaleType,
  optionShape,
  underlineField,
} from './surveyConstants';

export function SurveyQuestionCard({
  sectionIndex,
  qIndex,
  question,
  sectionQuestionCount,
  selected,
  errors,
  register,
  control,
  setValue,
  setSelectedCard,
  handleQuestionTypeChange,
  addOption,
  removeOption,
  addRow,
  removeRow,
  addColumn,
  removeColumn,
  duplicateQuestion,
  removeQuestion,
}) {
  const questionType = question?.questionType || 'short-answer';
  const options = question?.options || [''];
  const rows = question?.rows || [''];
  const columns = question?.columns || [''];
  const questionError = errors.sections?.[sectionIndex]?.questions?.[qIndex]?.questionText?.message;

  return (
    <div
      onClick={() => setSelectedCard({ type: 'question', section: sectionIndex, question: qIndex })}
      className={`rounded-xl border bg-white ${
        selected
          ? 'border-slate-200 border-l-4 border-l-blue-900 shadow-md'
          : 'border-slate-200 shadow-sm'
      }`}
    >
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <input
              type="text"
              placeholder="Question"
              {...register(`sections.${sectionIndex}.questions.${qIndex}.questionText`)}
              className="w-full rounded-md border-0 border-b border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-blue-900 focus:bg-white focus:outline-none"
            />
            <FieldError error={questionError} />
          </div>
          <Controller
            name={`sections.${sectionIndex}.questions.${qIndex}.questionType`}
            control={control}
            render={({ field }) => (
              <select
                value={field.value}
                onChange={(e) => handleQuestionTypeChange(sectionIndex, qIndex, e.target.value)}
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 sm:w-52"
                aria-label="Question type"
              >
                {QUESTION_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            )}
          />
        </div>

        <div className="mt-5">
          {isChoiceType(questionType) && (
            <div className="space-y-1">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  {questionType === 'dropdown' ? (
                    <span className="w-4 shrink-0 text-sm text-slate-400">{index + 1}.</span>
                  ) : (
                    <span className={optionShape(questionType)} />
                  )}
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const next = [...options];
                      next[index] = e.target.value;
                      setValue(`sections.${sectionIndex}.questions.${qIndex}.options`, next);
                    }}
                    className={underlineField}
                    placeholder={`Option ${index + 1}`}
                  />
                  {options.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOption(sectionIndex, qIndex, index)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Remove option"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(sectionIndex, qIndex)}
                className="mt-1 flex items-center gap-3 text-sm text-slate-500 hover:text-blue-900"
              >
                <span className={optionShape(questionType)} />
                <span className="border-b border-transparent hover:border-blue-900">Add option</span>
              </button>
            </div>
          )}

          {isScaleType(questionType) && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <label className="flex items-center gap-2">
                  {questionType === 'star-rating' ? 'Stars' : 'From'}
                  <input
                    type="number"
                    min="1"
                    max="10"
                    {...register(`sections.${sectionIndex}.questions.${qIndex}.scaleMin`, { valueAsNumber: true })}
                    className="h-9 w-16 rounded-md border border-slate-200 px-2 text-center"
                  />
                </label>
                <span>to</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  {...register(`sections.${sectionIndex}.questions.${qIndex}.scaleMax`, { valueAsNumber: true })}
                  className="h-9 w-16 rounded-md border border-slate-200 px-2 text-center"
                />
              </div>
              {questionType === 'linear-scale' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={question.lowestLabel || ''}
                    onChange={(e) => setValue(`sections.${sectionIndex}.questions.${qIndex}.lowestLabel`, e.target.value)}
                    className={underlineField}
                    placeholder="Label (optional)"
                  />
                  <input
                    type="text"
                    value={question.highestLabel || ''}
                    onChange={(e) => setValue(`sections.${sectionIndex}.questions.${qIndex}.highestLabel`, e.target.value)}
                    className={underlineField}
                    placeholder="Label (optional)"
                  />
                </div>
              )}
              <QuestionPreview question={question} />
            </div>
          )}

          {isGridType(questionType) && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Rows</p>
                <div className="space-y-1">
                  {rows.map((row, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={row}
                        onChange={(e) => {
                          const next = [...rows];
                          next[index] = e.target.value;
                          setValue(`sections.${sectionIndex}.questions.${qIndex}.rows`, next);
                        }}
                        className={underlineField}
                        placeholder={`Row ${index + 1}`}
                      />
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(sectionIndex, qIndex, index)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Remove row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addRow(sectionIndex, qIndex)}
                    className="text-sm text-blue-900 hover:underline"
                  >
                    Add row
                  </button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Columns</p>
                <div className="space-y-1">
                  {columns.map((column, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={column}
                        onChange={(e) => {
                          const next = [...columns];
                          next[index] = e.target.value;
                          setValue(`sections.${sectionIndex}.questions.${qIndex}.columns`, next);
                        }}
                        className={underlineField}
                        placeholder={`Column ${index + 1}`}
                      />
                      {columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(sectionIndex, qIndex, index)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Remove column"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addColumn(sectionIndex, qIndex)}
                    className="text-sm text-blue-900 hover:underline"
                  >
                    Add column
                  </button>
                </div>
              </div>
            </div>
          )}

          {(questionType === 'short-answer' || questionType === 'paragraph' || questionType === 'date' || questionType === 'time') && (
            <div className="pt-1"><QuestionPreview question={question} /></div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-slate-100 px-4 py-2">
        <button
          type="button"
          onClick={() => duplicateQuestion(sectionIndex, qIndex)}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Duplicate question"
          title="Duplicate"
        >
          <Copy className="h-4 w-4" />
        </button>
        {sectionQuestionCount > 1 && (
          <button
            type="button"
            onClick={() => removeQuestion(sectionIndex, qIndex)}
            className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
            aria-label="Delete question"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <span className="mx-2 h-6 w-px bg-slate-200" />
        <span className="text-sm text-slate-600">Required</span>
        <label className="relative ml-2 inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            {...register(`sections.${sectionIndex}.questions.${qIndex}.required`)}
            className="sr-only"
          />
          <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${question?.required ? 'bg-blue-900' : 'bg-slate-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${question?.required ? 'translate-x-6' : 'translate-x-1'}`} />
          </span>
        </label>
      </div>
    </div>
  );
}
