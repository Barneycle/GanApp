import { Calendar, Check, Circle, Clock, GripVertical, LayoutGrid, List, Star, Type } from 'lucide-react';

export const QUESTION_TYPE_VALUES = [
  'short-answer', 'paragraph', 'multiple-choice', 'checkbox',
  'dropdown', 'linear-scale', 'star-rating', 'multiple-choice-grid',
  'checkbox-grid', 'date', 'time',
];

export const QUESTION_TYPES = [
  { value: 'short-answer', label: 'Short answer', icon: Type },
  { value: 'paragraph', label: 'Paragraph', icon: Type },
  { value: 'multiple-choice', label: 'Multiple choice', icon: Circle },
  { value: 'checkbox', label: 'Checkboxes', icon: Check },
  { value: 'dropdown', label: 'Dropdown', icon: List },
  { value: 'linear-scale', label: 'Linear scale', icon: GripVertical },
  { value: 'star-rating', label: 'Star rating', icon: Star },
  { value: 'multiple-choice-grid', label: 'Multiple choice grid', icon: LayoutGrid },
  { value: 'checkbox-grid', label: 'Checkbox grid', icon: LayoutGrid },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'time', label: 'Time', icon: Clock },
];

export const emptyQuestion = () => ({
  questionText: '',
  questionType: 'short-answer',
  options: [''],
  required: false,
  scaleMin: 1,
  scaleMax: 5,
  lowestLabel: '',
  highestLabel: '',
  rows: [''],
  columns: [''],
});

export const emptySection = () => ({
  sectionTitle: '',
  sectionDescription: '',
  questions: [emptyQuestion()],
});

export const htmlHasText = (html) => {
  if (!html) return false;
  return String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().length > 0;
};

export const isChoiceType = (type) => type === 'multiple-choice' || type === 'checkbox' || type === 'dropdown';
export const isScaleType = (type) => type === 'linear-scale' || type === 'star-rating';
export const isGridType = (type) => type === 'multiple-choice-grid' || type === 'checkbox-grid';

export const optionShape = (type) => (
  type === 'checkbox'
    ? 'h-4 w-4 shrink-0 rounded-sm border border-slate-400'
    : 'h-4 w-4 shrink-0 rounded-full border border-slate-400'
);

export const underlineField =
  'w-full border-0 border-b border-transparent bg-transparent px-0 py-2 text-[15px] text-slate-800 placeholder:text-slate-400 focus:border-blue-900 focus:outline-none';
