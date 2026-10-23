import Ajv, { ErrorObject } from 'ajv';

export const ajv = new Ajv({ allErrors: true });

export const ContentSchemas = {
  true_false: {
    type: 'object',
    required: ['prompt', 'statement'],
    properties: {
      prompt: { type: 'string', minLength: 1 },
      statement: { type: 'string', minLength: 1 },
      explanation: { type: 'string' },
    },
  },
  fill_blank: { type: 'object', required: ['textWithBlanks', 'blanks'] },
  multiple_choice: {
    type: 'object',
    required: ['prompt', 'options'],
    properties: {
      prompt: { type: 'string', minLength: 1 },
      options: {
        type: 'array',
        minItems: 2,
        items: {
          type: 'object',
          required: ['id', 'text'],
          properties: {
            id: { type: 'string', minLength: 1 },
            text: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  },
  matching: { type: 'object', required: ['prompt', 'listA', 'listB'] },
  short_essay: { type: 'object', required: ['prompt'] },
  long_essay: { type: 'object', required: ['prompt'] },
  explain: { type: 'object', required: ['prompt'] },
  comparison_table: { type: 'object', required: ['prompt', 'tableHeaders', 'rows'] },
  odd_one_out: { type: 'object', required: ['prompt', 'items'] },
  diagram_labeling: { type: 'object', required: ['prompt', 'diagram', 'labels'] },
  contour_map: { type: 'object', required: ['prompt', 'mapImage', 'subQuestions'] },
  calculation: { type: 'object', required: ['prompt'] },
  ordering: { type: 'object', required: ['prompt', 'items'] },
  arabic_grammar: { type: 'object', required: ['prompt', 'mode', 'passage', 'words'] },
  reading_comprehension: { type: 'object', required: ['prompt', 'passage', 'subQuestions'] },
} as const;

export const AnswerSchemas = {
  true_false: {
    type: 'object',
    required: ['value'],
    additionalProperties: false,
    properties: {
      value: { type: 'boolean' },
      correctionText: { type: 'string' },
    },
  },
  fill_blank: { type: 'object', required: ['answers'] },
  multiple_choice: {
    type: 'object',
    required: ['selectedOptionId'],
    additionalProperties: false,
    properties: {
      selectedOptionId: { type: 'string', minLength: 1 },
    },
  },
  matching: { type: 'object', required: ['pairs'] },
  short_essay: { type: 'object', required: ['text'] },
  long_essay: { type: 'object', required: ['text'] },
  explain: { type: 'object' },
  comparison_table: { type: 'object', required: ['cells'] },
  odd_one_out: { type: 'object', required: ['selectedItemIds'] },
  diagram_labeling: { type: 'object', required: ['labels'] },
  contour_map: { type: 'object', required: ['subAnswers'] },
  calculation: { type: 'object', required: ['value'] },
  ordering: { type: 'object', required: ['order'] },
  arabic_grammar: { type: 'object', required: ['words'] },
  reading_comprehension: { type: 'object', required: ['subAnswers'] },
} as const;

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | string[];
}

export function validateQuestionContent(type: keyof typeof ContentSchemas, content: unknown): ValidationResult {
  const schema = ContentSchemas[type];
  if (!schema) {
    return { valid: false, errors: [`Unknown question type: ${type as string}`] };
  }
  const validate = ajv.compile(schema);
  const valid = validate(content);
  if (!valid) {
    return { valid: false, errors: validate.errors || [] };
  }

  // Deep validation for multiple choice options: unique option IDs
  if (type === 'multiple_choice' && content && typeof content === 'object') {
    const rawContent = content as { options?: Array<{ id?: unknown }> };
    if (Array.isArray(rawContent.options)) {
      const seenIds = new Set<string>();
      for (const opt of rawContent.options) {
        if (opt && typeof opt.id === 'string') {
          if (seenIds.has(opt.id)) {
            return {
              valid: false,
              errors: [`Duplicate option ID '${opt.id}' in multiple choice options`],
            };
          }
          seenIds.add(opt.id);
        }
      }
    }
  }

  return { valid: true, errors: [] };
}

export function validateQuestionAnswer(type: keyof typeof AnswerSchemas, answer: unknown): ValidationResult {
  const schema = AnswerSchemas[type];
  if (!schema) {
    return { valid: false, errors: [`Unknown question type: ${type as string}`] };
  }
  const validate = ajv.compile(schema);
  const valid = validate(answer);
  if (!valid) {
    return { valid: false, errors: validate.errors || [] };
  }
  return { valid: true, errors: [] };
}

/**
 * Validates canonical MCQ answer shape and verifies that the referenced option ID
 * exists in the question's content.options list.
 */
export function validateMcqAnswer(answer: unknown, content?: unknown): ValidationResult {
  const baseValidation = validateQuestionAnswer('multiple_choice', answer);
  if (!baseValidation.valid) {
    return baseValidation;
  }
  if (content !== undefined && content !== null) {
    if (typeof content !== 'object') {
      return { valid: false, errors: ['MCQ question content must be an object'] };
    }
    const rawContent = content as { options?: Array<{ id?: string }> };
    if (!Array.isArray(rawContent.options) || rawContent.options.length < 2) {
      return {
        valid: false,
        errors: ['MCQ question content must contain an options array with at least 2 choices'],
      };
    }
    const selectedId = (answer as { selectedOptionId: string }).selectedOptionId;
    const exists = rawContent.options.some((opt) => opt && opt.id === selectedId);
    if (!exists) {
      return {
        valid: false,
        errors: [`Referenced option ID '${selectedId}' does not exist in question options`],
      };
    }
  }
  return { valid: true, errors: [] };
}

/**
 * Validates canonical True/False answer shape { value: boolean, correctionText?: string }
 */
export function validateTrueFalseAnswer(answer: unknown): ValidationResult {
  if (answer === null || typeof answer !== 'object') {
    return {
      valid: false,
      errors: ['True/False answer must be an object { value: boolean }'],
    };
  }
  const baseValidation = validateQuestionAnswer('true_false', answer);
  if (!baseValidation.valid) {
    return baseValidation;
  }
  const rawAnswer = answer as { value?: unknown };
  if (typeof rawAnswer.value !== 'boolean') {
    return {
      valid: false,
      errors: ['True/False answer value must be a strict boolean (true or false)'],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Validates Fill-in-the-Blank answer for both Simulation (self-assessment) and Training (tap_reveal_3).
 */
export function validateFillBlankAnswer(
  answer: unknown,
  content?: unknown,
  examMode?: string
): ValidationResult {
  if (answer === null || typeof answer !== 'object') {
    return {
      valid: false,
      errors: ['Fill-in-the-Blank answer must be an object'],
    };
  }

  const rawAns = answer as Record<string, any>;
  const blanksMap = rawAns.answers || rawAns.blanks;
  if (!blanksMap || typeof blanksMap !== 'object' || Array.isArray(blanksMap)) {
    return {
      valid: false,
      errors: ['Fill-in-the-Blank answer must contain an answers object mapping blank IDs to text'],
    };
  }

  for (const [key, val] of Object.entries(blanksMap)) {
    if (typeof val !== 'string') {
      return {
        valid: false,
        errors: [`Answer for blank '${key}' must be a string`],
      };
    }
  }

  // Validate selfEvaluations if present (Weekly Simulation Self-Assessment)
  if (rawAns.selfEvaluations !== undefined) {
    if (typeof rawAns.selfEvaluations !== 'object' || rawAns.selfEvaluations === null || Array.isArray(rawAns.selfEvaluations)) {
      return {
        valid: false,
        errors: ['selfEvaluations must be an object mapping blank IDs to booleans'],
      };
    }
    for (const [key, val] of Object.entries(rawAns.selfEvaluations)) {
      if (typeof val !== 'boolean') {
        return {
          valid: false,
          errors: [`Self-evaluation for blank '${key}' must be a strict boolean (true or false)`],
        };
      }
    }
  }

  // If training mode and choices are defined, check tap_reveal_3 constraints
  if (examMode === 'training' && content && typeof content === 'object') {
    const rawContent = content as { blanks?: Array<{ id: string; choices?: string[] }> };
    if (Array.isArray(rawContent.blanks)) {
      for (const blank of rawContent.blanks) {
        if (blank.choices && Array.isArray(blank.choices)) {
          if (blank.choices.length !== 3) {
            return {
              valid: false,
              errors: [`Blank '${blank.id}' in tap_reveal_3 must provide exactly 3 choices`],
            };
          }
          const chosen = blanksMap[blank.id];
          if (chosen && !blank.choices.includes(chosen)) {
            return {
              valid: false,
              errors: [`Selected choice '${chosen}' for blank '${blank.id}' is not among configured choices`],
            };
          }
        }
      }
    }
  }

  return { valid: true, errors: [] };
}
