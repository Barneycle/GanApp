import { emptySection } from './surveyConstants';

const apiTypeForQuestion = (questionType) => {
  if (questionType === 'multiple-choice' || questionType === 'checkbox') return 'multiple_choice';
  if (questionType === 'linear-scale' || questionType === 'star-rating') return 'rating';
  if (questionType === 'multiple-choice-grid') return 'multiple_choice_grid';
  if (questionType === 'checkbox-grid') return 'checkbox_grid';
  if (questionType === 'yes-no') return 'yes_no';
  if (questionType === 'dropdown') return 'dropdown';
  if (questionType === 'date') return 'date';
  if (questionType === 'time') return 'time';
  return 'text';
};

export function transformSectionsToApiQuestions(sections) {
  if (!sections || !Array.isArray(sections)) {
    throw new Error('Survey sections data is missing or invalid');
  }

  const transformedQuestions = [];
  let questionIndex = 1;

  sections.forEach((section, sectionIndex) => {
    if (!section.questions || !Array.isArray(section.questions)) return;

    section.questions.forEach((q) => {
      transformedQuestions.push({
        id: `q_${questionIndex}`,
        questionType: q.questionType,
        type: apiTypeForQuestion(q.questionType),
        question: q.questionText,
        questionText: q.questionText,
        required: q.required || false,
        options: (q.questionType === 'multiple-choice' || q.questionType === 'checkbox' || q.questionType === 'dropdown')
          && q.options && q.options.length > 0
          ? q.options.filter((opt) => opt && opt.trim())
          : undefined,
        min_rating: q.scaleMin,
        max_rating: q.scaleMax,
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        lowestLabel: q.lowestLabel || undefined,
        highestLabel: q.highestLabel || undefined,
        rows: (q.questionType === 'multiple-choice-grid' || q.questionType === 'checkbox-grid')
          && q.rows && q.rows.length > 0
          ? q.rows.filter((row) => row && row.trim())
          : undefined,
        columns: (q.questionType === 'multiple-choice-grid' || q.questionType === 'checkbox-grid')
          && q.columns && q.columns.length > 0
          ? q.columns.filter((col) => col && col.trim())
          : undefined,
        sectionTitle: section.sectionTitle || undefined,
        sectionDescription: section.sectionDescription || undefined,
        sectionIndex,
      });
      questionIndex += 1;
    });
  });

  if (transformedQuestions.length === 0) {
    throw new Error('At least one question is required in the survey');
  }

  return transformedQuestions;
}

export function transformApiQuestionsToSections(questions) {
  const sections = [];
  let currentSection = null;
  let currentSectionIndex = -1;

  if (questions && Array.isArray(questions) && questions.length > 0) {
    questions.forEach((question) => {
      const sectionTitle = question.sectionTitle;
      const sectionDescription = question.sectionDescription;
      const sectionIndex = question.sectionIndex !== undefined ? question.sectionIndex : -1;

      if (!currentSection
        || (sectionTitle && currentSection.sectionTitle !== sectionTitle)
        || (sectionIndex !== -1 && currentSectionIndex !== sectionIndex)) {
        currentSection = {
          sectionTitle: sectionTitle || '',
          sectionDescription: sectionDescription || '',
          questions: [],
        };
        sections.push(currentSection);
        currentSectionIndex = sectionIndex !== -1 ? sectionIndex : sections.length - 1;
      }

      currentSection.questions.push({
        questionText: question.questionText || question.question || '',
        questionType: question.questionType || question.type || 'short-answer',
        options: Array.isArray(question.options) ? question.options : (question.options ? [question.options] : []),
        required: question.required || false,
        scaleMin: question.scaleMin || question.min_rating || 1,
        scaleMax: question.scaleMax || question.max_rating || 5,
        lowestLabel: question.lowestLabel || '',
        highestLabel: question.highestLabel || '',
        rows: Array.isArray(question.rows) ? question.rows : (question.rows ? [question.rows] : []),
        columns: Array.isArray(question.columns) ? question.columns : (question.columns ? [question.columns] : []),
      });
    });
  }

  if (sections.length === 0) {
    return [emptySection()];
  }

  sections.forEach((section) => {
    section.questions.forEach((question) => {
      if (!question.options) question.options = [];
      if (!question.rows) question.rows = [];
      if (!question.columns) question.columns = [];
      if (question.options.length === 0 && (question.questionType === 'multiple-choice' || question.questionType === 'checkbox' || question.questionType === 'dropdown')) {
        question.options = [''];
      }
      if (question.rows.length === 0 && (question.questionType === 'multiple-choice-grid' || question.questionType === 'checkbox-grid')) {
        question.rows = [''];
      }
      if (question.columns.length === 0 && (question.questionType === 'multiple-choice-grid' || question.questionType === 'checkbox-grid')) {
        question.columns = [''];
      }
    });
  });

  return sections;
}

export function resetFieldsForQuestionType(setValue, path, newType) {
  setValue(`${path}.questionType`, newType);
  if (newType === 'multiple-choice' || newType === 'checkbox' || newType === 'dropdown') {
    setValue(`${path}.options`, ['']);
  } else if (newType === 'linear-scale' || newType === 'star-rating') {
    setValue(`${path}.scaleMin`, 1);
    setValue(`${path}.scaleMax`, 5);
    setValue(`${path}.lowestLabel`, '');
    setValue(`${path}.highestLabel`, '');
  } else if (newType === 'multiple-choice-grid' || newType === 'checkbox-grid') {
    setValue(`${path}.rows`, ['']);
    setValue(`${path}.columns`, ['']);
  }
}

export function duplicateQuestionInList(questions, questionIndex) {
  const questionToDuplicate = questions[questionIndex];
  if (!questionToDuplicate) return questions;
  const duplicatedQuestion = {
    questionText: questionToDuplicate.questionText || '',
    questionType: questionToDuplicate.questionType || 'short-answer',
    options: questionToDuplicate.options ? [...questionToDuplicate.options] : [''],
    required: questionToDuplicate.required || false,
    scaleMin: questionToDuplicate.scaleMin || 1,
    scaleMax: questionToDuplicate.scaleMax || 5,
    lowestLabel: questionToDuplicate.lowestLabel || '',
    highestLabel: questionToDuplicate.highestLabel || '',
    rows: questionToDuplicate.rows ? [...questionToDuplicate.rows] : [''],
    columns: questionToDuplicate.columns ? [...questionToDuplicate.columns] : [''],
  };
  return [
    ...questions.slice(0, questionIndex + 1),
    duplicatedQuestion,
    ...questions.slice(questionIndex + 1),
  ];
}
