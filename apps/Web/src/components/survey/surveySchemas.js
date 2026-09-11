import { z } from 'zod';
import { QUESTION_TYPE_VALUES } from './surveyConstants';

const htmlHasContent = (val) => {
  if (!val) return false;
  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = val;
    return (tempDiv.textContent || tempDiv.innerText || '').trim().length > 0;
  }
  return val.replace(/<[^>]*>/g, '').trim().length > 0;
};

const createQuestionSchema = z.object({
  questionText: z.string().min(1, 'Question text is required'),
  questionType: z.enum(QUESTION_TYPE_VALUES),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  scaleMin: z.number().min(1).max(10).optional(),
  scaleMax: z.number().min(1).max(10).optional(),
  lowestLabel: z.string().optional(),
  highestLabel: z.string().optional(),
  rows: z.array(z.string()).optional(),
  columns: z.array(z.string()).optional(),
});

const editQuestionSchema = z.object({
  questionText: z.string().refine(htmlHasContent, 'Question text is required'),
  questionType: z.enum(QUESTION_TYPE_VALUES),
  options: z.array(z.string()).optional(),
  required: z.boolean().default(false),
  scaleMin: z.number().min(1).max(10).optional(),
  scaleMax: z.number().min(1).max(10).optional(),
  lowestLabel: z.string().optional(),
  highestLabel: z.string().optional(),
  rows: z.array(z.string()).optional(),
  columns: z.array(z.string()).optional(),
});

export const createSurveySchema = z.object({
  sections: z.array(z.object({
    sectionTitle: z.string().refine(htmlHasContent, 'Title is required'),
    sectionDescription: z.string().optional(),
    questions: z.array(createQuestionSchema).min(1, 'At least one question is required in each section'),
  })).min(1, 'At least one section is required'),
});

export const editSurveySchema = z.object({
  title: z.string().min(1, 'Survey title is required'),
  description: z.string().optional(),
  sections: z.array(z.object({
    sectionTitle: z.string().optional(),
    sectionDescription: z.string().optional(),
    questions: z.array(editQuestionSchema).min(1, 'At least one question is required in each section'),
  })).min(1, 'At least one section is required'),
});
