import Ajv, { ErrorObject } from 'ajv';
import { ArabicGrammarContent, ArabicGrammarAnswer, ArabicGrammarCorrectAnswer } from '../types';
import { validateRegion } from '../regionGeometry';

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
  matching: { type: 'object', required: ['pairs'] },
  short_essay: { type: 'object', required: ['prompt'] },
  long_essay: { type: 'object', required: ['prompt'] },
  explain: { type: 'object', required: ['prompt'] },
  comparison_table: {
    type: 'object',
    required: ['prompt', 'tableHeaders', 'rows'],
    properties: {
      prompt: { type: 'string', minLength: 1 },
      tableHeaders: { type: 'array', items: { type: 'string' } },
      rows: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'cells'],
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            cells: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id'],
                properties: {
                  id: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  },
  odd_one_out: {
    type: 'object',
    required: ['prompt', 'items'],
    properties: {
      prompt: { type: 'string', minLength: 1 },
      passage: { type: 'string' },
      items: {
        type: 'array',
        minItems: 2,
        items: {
          type: 'object',
          required: ['id', 'text'],
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
          },
        },
      },
      reasoning: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: { type: 'string', minLength: 1 },
          marksFraction: { type: 'number', minimum: 0, maximum: 1 },
          trainingChoices: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'object',
              required: ['id', 'text'],
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
  diagram_labeling: { type: 'object', required: ['prompt', 'diagram'] },
  contour_map: { type: 'object', required: ['prompt', 'mapImage', 'subQuestions'] },
  calculation: { type: 'object', required: ['prompt'] },
  ordering: { type: 'object', required: ['prompt', 'items'] },
  arabic_grammar: {
    type: 'object',
    required: ['prompt'],
    properties: {
      prompt: { type: 'string', minLength: 1 },
      sentence: { type: 'string' },
      targetWord: { type: 'string' },
      passage: { type: 'string' },
      components: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'label', 'points', 'choices'],
          properties: {
            id: { type: 'string', minLength: 1 },
            label: { type: 'string', minLength: 1 },
            points: { type: 'number', minimum: 0 },
            choices: {
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
            hints: {
              type: 'array',
              items: {
                type: 'object',
                required: ['level', 'text'],
                properties: {
                  level: { type: 'number' },
                  text: { type: 'string', minLength: 1 },
                },
              },
            },
          },
        },
      },
    },
  },
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
  odd_one_out: {
    type: 'object',
    required: ['selectedItemIds'],
    properties: {
      selectedItemIds: {
        type: 'array',
        items: { type: 'string' },
      },
      reasonChoiceId: { type: 'string' },
      reasonText: { type: 'string' },
    },
  },
  diagram_labeling: { type: 'object' },
  contour_map: { type: 'object', required: ['subAnswers'] },
  calculation: { type: 'object', required: ['value'] },
  ordering: { type: 'object', required: ['order'] },
  arabic_grammar: { type: 'object' },
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

  // Deep validation for Pattern 7 multi-step calculation content
  if (type === 'calculation' && content && typeof content === 'object') {
    const raw = content as Record<string, unknown>;
    if (raw.mode === 'multi_step_mcq' || Array.isArray(raw.steps)) {
      return validateMultiStepCalculationContent(content);
    }
  }

  // Deep validation for odd_one_out
  if (type === 'odd_one_out' && content && typeof content === 'object') {
    const rawContent = content as any;
    if (rawContent.reasoning?.trainingChoices && Array.isArray(rawContent.reasoning.trainingChoices)) {
      const seenIds = new Set<string>();
      for (const ch of rawContent.reasoning.trainingChoices) {
        if (ch && typeof ch.id === 'string') {
          if (seenIds.has(ch.id)) {
            return {
              valid: false,
              errors: [`Duplicate choice ID '${ch.id}' in reasoning trainingChoices`],
            };
          }
          seenIds.add(ch.id);
        }
      }
    }
  }

  // Deep validation for comparison_table:
  // Each cell with options must have exactly 3 options with unique IDs
  if (type === 'comparison_table' && content && typeof content === 'object') {
    const rawContent = content as any;
    if (Array.isArray(rawContent.rows)) {
      for (const r of rawContent.rows) {
        if (r && Array.isArray(r.cells)) {
          for (const c of r.cells) {
            if (c && Array.isArray(c.options)) {
              if (c.options.length !== 3) {
                return {
                  valid: false,
                  errors: [`Cell '${c.id || 'unknown'}' options must contain exactly 3 choices`],
                };
              }
              const seenIds = new Set<string>();
              for (const opt of c.options) {
                const optId = (opt && typeof opt === 'object' && 'id' in opt) ? opt.id : opt;
                if (seenIds.has(String(optId))) {
                  return {
                    valid: false,
                    errors: [`Duplicate option ID '${optId}' in cell '${c.id}'`],
                  };
                }
                seenIds.add(String(optId));
              }
            }
          }
        }
      }
    }
  }

  // Deep validation for arabic_grammar components
  if (type === 'arabic_grammar' && content && typeof content === 'object') {
    const rawContent = content as ArabicGrammarContent & { allocatedMarks?: number; totalMarks?: number; marks?: number };

    if (!Array.isArray(rawContent.components) || rawContent.components.length === 0) {
      return { valid: false, errors: ['arabic_grammar question must contain at least 1 component'] };
    }

    const seenComponentIds = new Set<string>();
    let sumPoints = 0;

    for (const comp of rawContent.components) {
      if (!comp || typeof comp !== 'object') {
        return { valid: false, errors: ['Grammar component must be an object'] };
      }
      if (!comp.id || typeof comp.id !== 'string') {
        return { valid: false, errors: ['Grammar component is missing a valid id'] };
      }
      if (seenComponentIds.has(comp.id)) {
        return { valid: false, errors: [`Duplicate component ID '${comp.id}' in arabic_grammar components`] };
      }
      seenComponentIds.add(comp.id);

      if (typeof comp.points !== 'number' || comp.points < 0) {
        return { valid: false, errors: [`Component '${comp.id}' points must be a non-negative number`] };
      }
      sumPoints += comp.points;

      if (!Array.isArray(comp.choices) || comp.choices.length < 2) {
        return { valid: false, errors: [`Component '${comp.id}' must contain at least 2 choices`] };
      }

      const seenChoiceIds = new Set<string>();
      for (const choice of comp.choices) {
        if (!choice || typeof choice !== 'object' || !choice.id || typeof choice.id !== 'string') {
          return { valid: false, errors: [`Choice in component '${comp.id}' is missing a valid id`] };
        }
        if (seenChoiceIds.has(choice.id)) {
          return { valid: false, errors: [`Duplicate choice ID '${choice.id}' in component '${comp.id}'`] };
        }
        seenChoiceIds.add(choice.id);
      }

      if (Array.isArray(comp.hints)) {
        for (const hint of comp.hints) {
          if (!hint || typeof hint !== 'object') {
            return { valid: false, errors: [`Hint in component '${comp.id}' must be an object`] };
          }
          if (typeof hint.level !== 'number') {
            return { valid: false, errors: [`Hint level in component '${comp.id}' must be a number`] };
          }
          if (!hint.text || typeof hint.text !== 'string' || !hint.text.trim()) {
            return { valid: false, errors: [`Hint text in component '${comp.id}' must be non-empty`] };
          }
        }
      }
    }

    const expectedTotal = rawContent.allocatedMarks ?? rawContent.totalMarks ?? rawContent.marks;
    if (typeof expectedTotal === 'number' && expectedTotal > 0 && sumPoints !== expectedTotal) {
      return {
        valid: false,
        errors: [`Sum of component points (${sumPoints}) does not match total allocated marks (${expectedTotal})`],
      };
    }
  }

  // Deep validation for diagram_labeling
  if (type === 'diagram_labeling' && content && typeof content === 'object') {
    const rawContent = content as Record<string, unknown>;

    // Legacy format: has labels array
    if (Array.isArray(rawContent.labels)) {
      if (rawContent.labels.length === 0) {
        return { valid: false, errors: ['Legacy diagram_labeling must contain at least one label'] };
      }
      return { valid: true, errors: [] };
    }

    // Modern C2 Visual Mastery Lab format
    if (!rawContent.diagram || typeof rawContent.diagram !== 'object') {
      return { valid: false, errors: ['Diagram reference is required'] };
    }

    const diag = rawContent.diagram as Record<string, unknown>;
    const hasAssetId = typeof diag.assetId === 'string' && diag.assetId.trim().length > 0;
    const hasUrl = typeof diag.url === 'string' && diag.url.trim().length > 0;

    // Exactly one of assetId | url
    if ((hasAssetId && hasUrl) || (!hasAssetId && !hasUrl)) {
      return { valid: false, errors: ['Diagram must specify exactly one of assetId or url'] };
    }

    if (hasUrl) {
      const urlStr = diag.url as string;
      if (!urlStr.startsWith('/assets/')) {
        return { valid: false, errors: ['External diagram URLs are rejected. Bundled diagrams must be under /assets/'] };
      }
    }

    if (!Array.isArray(rawContent.subQuestions) || rawContent.subQuestions.length === 0) {
      return { valid: false, errors: ['subQuestions must be a non-empty list'] };
    }

    const seenSubIds = new Set<string>();
    const seenOptionIds = new Set<string>();

    for (const sub of rawContent.subQuestions) {
      if (!sub || typeof sub !== 'object') {
        return { valid: false, errors: ['Sub-question must be an object'] };
      }
      const s = sub as Record<string, unknown>;
      if (!s.id || typeof s.id !== 'string') {
        return { valid: false, errors: ['Sub-question must have a valid id'] };
      }
      if (seenSubIds.has(s.id)) {
        return { valid: false, errors: [`Duplicate sub-question id '${s.id}'`] };
      }
      seenSubIds.add(s.id);

      if (!s.kind || !['locate', 'name', 'function'].includes(s.kind as string)) {
        return { valid: false, errors: [`Sub-question '${s.id}' has invalid kind '${String(s.kind)}'. Allowed: locate, name, function`] };
      }

      if (s.skill !== undefined && s.skill !== null) {
        if (typeof s.skill !== 'string' || !['recognition', 'identification', 'understanding'].includes(s.skill)) {
          return { valid: false, errors: [`Sub-question '${s.id}' has invalid skill '${String(s.skill)}'. Allowed: recognition, identification, understanding`] };
        }
      }

      if (s.hints !== undefined) {
        if (!Array.isArray(s.hints) || s.hints.length > 4) {
          return { valid: false, errors: [`Sub-question '${s.id}' hints must not exceed 4 items`] };
        }
      }

      if (s.target !== undefined && s.target !== null) {
        const vTarget = validateRegion(s.target);
        if (!vTarget.valid) {
          return { valid: false, errors: [`Sub-question '${s.id}' target is not a valid Region: ${vTarget.error}`] };
        }
      }

      if (s.kind === 'name') {
        if (!Array.isArray(s.options) || s.options.length !== 3) {
          return { valid: false, errors: [`Sub-question '${s.id}' of kind 'name' must contain exactly 3 options`] };
        }
      } else if (s.kind === 'function') {
        if (!Array.isArray(s.options) || s.options.length < 3 || s.options.length > 4) {
          return { valid: false, errors: [`Sub-question '${s.id}' of kind 'function' must contain 3 to 4 options`] };
        }
      }

      if (Array.isArray(s.options)) {
        for (const opt of s.options) {
          if (!opt || typeof opt !== 'object' || !opt.id || typeof opt.id !== 'string') {
            return { valid: false, errors: [`Sub-question '${s.id}' option must have a valid string id`] };
          }
          if (seenOptionIds.has(opt.id)) {
            return { valid: false, errors: [`Duplicate option id '${opt.id}' in question`] };
          }
          seenOptionIds.add(opt.id);
        }
      }
    }
  }

  return { valid: true, errors: [] };
}

export function validateQuestionAnswer(type: keyof typeof AnswerSchemas, answer: unknown): ValidationResult {
  // Support both legacy numeric_with_work and multi_step_mcq answers for calculation
  if (type === 'calculation' && answer && typeof answer === 'object' && 'step_answers' in (answer as Record<string, unknown>)) {
    return validateMultiStepCalculationAnswer(answer);
  }

  if (type === 'diagram_labeling' && answer && typeof answer === 'object') {
    const rawAnswer = answer as Record<string, unknown>;
    if (rawAnswer.subAnswers !== undefined) {
      if (typeof rawAnswer.subAnswers !== 'object' || rawAnswer.subAnswers === null) {
        return { valid: false, errors: ['subAnswers must be an object'] };
      }
      const subs = rawAnswer.subAnswers as Record<string, unknown>;
      for (const [subId, subVal] of Object.entries(subs)) {
        if (subVal !== undefined && subVal !== null) {
          if (typeof subVal !== 'object') {
            return { valid: false, errors: [`Sub-answer '${subId}' must be an object`] };
          }
          const sv = subVal as Record<string, unknown>;
          if (sv.point !== undefined) {
            if (!sv.point || typeof sv.point !== 'object') {
              return { valid: false, errors: [`Sub-answer '${subId}' point must be an object {x, y}`] };
            }
            const pt = sv.point as Record<string, unknown>;
            if (
              typeof pt.x !== 'number' || !Number.isFinite(pt.x) || pt.x < 0 || pt.x > 1 ||
              typeof pt.y !== 'number' || !Number.isFinite(pt.y) || pt.y < 0 || pt.y > 1
            ) {
              return { valid: false, errors: [`Sub-answer '${subId}' point coordinates must be normalized numbers in [0, 1]`] };
            }
          }
          if (sv.optionId !== undefined && typeof sv.optionId !== 'string') {
            return { valid: false, errors: [`Sub-answer '${subId}' optionId must be a string`] };
          }
          if (sv.text !== undefined && typeof sv.text !== 'string') {
            return { valid: false, errors: [`Sub-answer '${subId}' text must be a string`] };
          }
        }
      }
      return { valid: true, errors: [] };
    }
    if (rawAnswer.labels !== undefined) {
      return { valid: true, errors: [] };
    }
    return { valid: false, errors: ['diagram_labeling answer must contain subAnswers or labels'] };
  }

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

export function validateDiagramLabelingKey(content: unknown, key: unknown): ValidationResult {
  if (!content || typeof content !== 'object') {
    return { valid: false, errors: ['Content must be a non-null object'] };
  }
  const rawContent = content as Record<string, unknown>;
  const subQuestions = Array.isArray(rawContent.subQuestions) ? rawContent.subQuestions : [];
  if (subQuestions.length === 0) {
    return { valid: false, errors: ['Content must contain subQuestions'] };
  }

  if (!key || typeof key !== 'object') {
    return { valid: false, errors: ['Key must be a non-null object'] };
  }
  const rawKey = key as Record<string, unknown>;
  if (!rawKey.subAnswers || typeof rawKey.subAnswers !== 'object') {
    return { valid: false, errors: ['Key must contain subAnswers object'] };
  }

  const subAnswers = rawKey.subAnswers as Record<string, unknown>;
  const subMap = new Map<string, any>();
  for (const s of subQuestions) {
    if (s && s.id) subMap.set(String(s.id), s);
  }

  // Ensure no extra unrecognized sub-question IDs in key
  for (const subId of Object.keys(subAnswers)) {
    if (!subMap.has(subId)) {
      return { valid: false, errors: [`Unknown subAnswer key '${subId}' not present in question content`] };
    }
  }

  // Ensure every subQuestion in content has a valid key entry
  for (const [subId, sub] of subMap.entries()) {
    const kAns = subAnswers[subId] as Record<string, unknown> | undefined;
    if (!kAns || typeof kAns !== 'object') {
      return { valid: false, errors: [`Missing answer key for sub-question '${subId}'`] };
    }

    if (sub.kind === 'locate') {
      if (!Array.isArray(kAns.regions) || kAns.regions.length === 0) {
        return { valid: false, errors: [`Sub-question '${subId}' (locate) must have at least one region`] };
      }
      for (const reg of kAns.regions) {
        const v = validateRegion(reg);
        if (!v.valid) {
          return { valid: false, errors: [`Invalid region in sub-question '${subId}': ${v.error}`] };
        }
      }
    } else if (sub.kind === 'name') {
      const allowedOptionIds = Array.isArray(sub.options) ? sub.options.map((o: any) => o.id) : [];
      if (typeof kAns.optionId !== 'string' || !allowedOptionIds.includes(kAns.optionId)) {
        return { valid: false, errors: [`Sub-question '${subId}' (name) optionId '${String(kAns.optionId)}' does not match any valid option`] };
      }
      if (!Array.isArray(kAns.acceptedNames) || kAns.acceptedNames.length === 0) {
        return { valid: false, errors: [`Sub-question '${subId}' (name) must have at least one acceptedName`] };
      }
      for (const name of kAns.acceptedNames) {
        if (typeof name !== 'string' || !name.trim()) {
          return { valid: false, errors: [`Sub-question '${subId}' acceptedNames must be non-empty strings`] };
        }
      }
    } else if (sub.kind === 'function') {
      const allowedOptionIds = Array.isArray(sub.options) ? sub.options.map((o: any) => o.id) : [];
      if (typeof kAns.optionId !== 'string' || !allowedOptionIds.includes(kAns.optionId)) {
        return { valid: false, errors: [`Sub-question '${subId}' (function) optionId '${String(kAns.optionId)}' does not match any valid option`] };
      }
    }
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

/**
 * Validates Pattern 7 Multi-Step MCQ Calculation question content.
 */
export function validateMultiStepCalculationContent(content: unknown): ValidationResult {
  if (!content || typeof content !== 'object') {
    return { valid: false, errors: ['Calculation content must be an object'] };
  }

  const raw = content as Record<string, any>;
  const errors: string[] = [];

  if (!raw.prompt || typeof raw.prompt !== 'string' || !raw.prompt.trim()) {
    errors.push('Prompt is required and must be a non-empty string');
  }

  if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
    errors.push('Multi-step calculation question must contain at least one step in steps array');
  } else {
    const seenStepIds = new Set<string>();

    for (let i = 0; i < raw.steps.length; i++) {
      const step = raw.steps[i];
      if (!step || typeof step !== 'object') {
        errors.push(`Step at index ${i} must be an object`);
        continue;
      }

      const stepId = String(step.id || '').trim();
      if (!stepId) {
        errors.push(`Step at index ${i} is missing a valid id`);
      } else if (seenStepIds.has(stepId)) {
        errors.push(`Duplicate step ID '${stepId}' at index ${i}`);
      } else {
        seenStepIds.add(stepId);
      }

      if (!step.prompt || typeof step.prompt !== 'string' || !step.prompt.trim()) {
        errors.push(`Step '${stepId || i}' is missing prompt text`);
      }

      if (typeof step.marks !== 'number' || step.marks <= 0) {
        errors.push(`Step '${stepId || i}' marks must be a positive number`);
      }

      if (!Array.isArray(step.options) || step.options.length < 2) {
        errors.push(`Step '${stepId || i}' must contain at least 2 options`);
      } else {
        const seenOptionIds = new Set<string>();
        for (let j = 0; j < step.options.length; j++) {
          const opt = step.options[j];
          if (!opt || typeof opt !== 'object') {
            errors.push(`Step '${stepId}' option at index ${j} must be an object`);
            continue;
          }
          const optId = String(opt.id || '').trim();
          if (!optId) {
            errors.push(`Step '${stepId}' option at index ${j} is missing an id`);
          } else if (seenOptionIds.has(optId)) {
            errors.push(`Step '${stepId}' has duplicate option ID '${optId}'`);
          } else {
            seenOptionIds.add(optId);
          }

          if (!opt.label || typeof opt.label !== 'string' || !opt.label.trim()) {
            errors.push(`Step '${stepId}' option '${optId || j}' is missing a label`);
          }

          // Options must be neutral: no is_correct or fraction flags inside option objects
          if ('is_correct' in opt || 'isCorrect' in opt || 'fraction' in opt || 'credit' in opt) {
            errors.push(`Step '${stepId}' option '${optId}' must be neutral without correctness or credit flags`);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates Pattern 7 Multi-Step MCQ Correct Answer and Conditional Credit Rules.
 */
export function validateMultiStepCalculationCorrectAnswer(
  correctAnswer: unknown,
  content?: unknown
): ValidationResult {
  if (!correctAnswer || typeof correctAnswer !== 'object') {
    return { valid: false, errors: ['Correct answer must be an object'] };
  }

  const rawAns = correctAnswer as Record<string, any>;
  const errors: string[] = [];

  const stepAnswers = rawAns.step_answers;
  if (!stepAnswers || typeof stepAnswers !== 'object' || Array.isArray(stepAnswers)) {
    errors.push('Correct answer must contain a step_answers map');
  }

  // Cross validate against content steps if available
  const contentSteps = content && typeof content === 'object' && Array.isArray((content as any).steps)
    ? (content as any).steps
    : [];

  const stepIndexMap = new Map<string, number>();
  const stepOptionsMap = new Map<string, Set<string>>();

  contentSteps.forEach((s: any, idx: number) => {
    if (s && s.id) {
      stepIndexMap.set(String(s.id), idx);
      const optSet = new Set<string>();
      if (Array.isArray(s.options)) {
        s.options.forEach((o: any) => {
          if (o && o.id) optSet.add(String(o.id));
        });
      }
      stepOptionsMap.set(String(s.id), optSet);
    }
  });

  if (stepAnswers) {
    for (const [stepId, val] of Object.entries(stepAnswers)) {
      if (!val || typeof val !== 'object') {
        errors.push(`step_answers for step '${stepId}' must be an object`);
        continue;
      }
      const canonicalOpt = (val as any).canonical_option_id;
      if (!canonicalOpt || typeof canonicalOpt !== 'string') {
        errors.push(`Step '${stepId}' is missing canonical_option_id`);
      } else if (stepOptionsMap.has(stepId)) {
        const allowedOpts = stepOptionsMap.get(stepId)!;
        if (!allowedOpts.has(canonicalOpt)) {
          errors.push(`canonical_option_id '${canonicalOpt}' for step '${stepId}' does not exist in step options`);
        }
      }
    }
  }

  // Validate conditional_credit_rules
  if (rawAns.conditional_credit_rules !== undefined) {
    if (!Array.isArray(rawAns.conditional_credit_rules)) {
      errors.push('conditional_credit_rules must be an array');
    } else {
      const seenRuleSignatures = new Set<string>();
      const seenRuleIds = new Set<string>();

      for (let i = 0; i < rawAns.conditional_credit_rules.length; i++) {
        const rule = rawAns.conditional_credit_rules[i];
        if (!rule || typeof rule !== 'object') {
          errors.push(`Conditional credit rule at index ${i} must be an object`);
          continue;
        }

        const ruleId = String(rule.rule_id || `rule_${i}`);
        if (seenRuleIds.has(ruleId)) {
          errors.push(`Duplicate rule_id '${ruleId}' in conditional credit rules`);
        } else {
          seenRuleIds.add(ruleId);
        }

        const targetStepId = String(rule.target_step_id || '');
        const awardedOptionId = String(rule.awarded_option_id || '');
        const prereqStepId = String(rule.prerequisite_step_id || '');
        const prereqOptionId = String(rule.prerequisite_option_id || '');
        const creditFraction = Number(rule.credit_fraction);

        if (!targetStepId) errors.push(`Rule '${ruleId}' is missing target_step_id`);
        if (!awardedOptionId) errors.push(`Rule '${ruleId}' is missing awarded_option_id`);
        if (!prereqStepId) errors.push(`Rule '${ruleId}' is missing prerequisite_step_id`);
        if (!prereqOptionId) errors.push(`Rule '${ruleId}' is missing prerequisite_option_id`);

        if (isNaN(creditFraction) || creditFraction < 0 || creditFraction > 1) {
          errors.push(`Rule '${ruleId}' credit_fraction must be between 0 and 1 inclusive`);
        }

        // Structural step and ordering checks
        if (contentSteps.length > 0) {
          if (!stepIndexMap.has(targetStepId)) {
            errors.push(`Rule '${ruleId}' target_step_id '${targetStepId}' does not exist in question steps`);
          }
          if (!stepIndexMap.has(prereqStepId)) {
            errors.push(`Rule '${ruleId}' prerequisite_step_id '${prereqStepId}' does not exist in question steps`);
          }
          if (stepIndexMap.has(targetStepId) && stepIndexMap.has(prereqStepId)) {
            const targetIdx = stepIndexMap.get(targetStepId)!;
            const prereqIdx = stepIndexMap.get(prereqStepId)!;
            if (prereqIdx >= targetIdx) {
              errors.push(
                `Rule '${ruleId}' prerequisite step '${prereqStepId}' (position ${prereqIdx + 1}) must strictly precede target step '${targetStepId}' (position ${targetIdx + 1})`
              );
            }
          }

          if (stepOptionsMap.has(targetStepId)) {
            const opts = stepOptionsMap.get(targetStepId)!;
            if (!opts.has(awardedOptionId)) {
              errors.push(`Rule '${ruleId}' awarded_option_id '${awardedOptionId}' not found in target step '${targetStepId}' options`);
            }
          }

          if (stepOptionsMap.has(prereqStepId)) {
            const opts = stepOptionsMap.get(prereqStepId)!;
            if (!opts.has(prereqOptionId)) {
              errors.push(`Rule '${ruleId}' prerequisite_option_id '${prereqOptionId}' not found in prerequisite step '${prereqStepId}' options`);
            }
          }
        }

        // Check for duplicate signatures
        const signature = `${targetStepId}:${awardedOptionId}:${prereqStepId}:${prereqOptionId}`;
        if (seenRuleSignatures.has(signature)) {
          errors.push(`Duplicate conditional credit rule signature '${signature}' at index ${i}`);
        } else {
          seenRuleSignatures.add(signature);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates Pattern 7 Multi-Step MCQ Student Answer.
 */
export function validateMultiStepCalculationAnswer(
  answer: unknown,
  content?: unknown
): ValidationResult {
  if (!answer || typeof answer !== 'object') {
    return { valid: false, errors: ['Student answer must be an object'] };
  }

  const raw = answer as Record<string, any>;
  const stepAnswers = raw.step_answers;

  if (!stepAnswers || typeof stepAnswers !== 'object' || Array.isArray(stepAnswers)) {
    return { valid: false, errors: ['Multi-step calculation answer must contain a step_answers map'] };
  }

  const errors: string[] = [];

  for (const [stepId, optId] of Object.entries(stepAnswers)) {
    if (typeof optId !== 'string' || !optId.trim()) {
      errors.push(`Selected option for step '${stepId}' must be a non-empty string`);
    }
  }

  // Cross check with content if provided
  if (content && typeof content === 'object' && Array.isArray((content as any).steps)) {
    const steps = (content as any).steps;
    const stepOptionsMap = new Map<string, Set<string>>();
    steps.forEach((s: any) => {
      if (s && s.id) {
        const optSet = new Set<string>();
        if (Array.isArray(s.options)) {
          s.options.forEach((o: any) => {
            if (o && o.id) optSet.add(String(o.id));
          });
        }
        stepOptionsMap.set(String(s.id), optSet);
      }
    });

    for (const [stepId, optId] of Object.entries(stepAnswers)) {
      if (typeof optId === 'string' && stepOptionsMap.has(stepId)) {
        const allowed = stepOptionsMap.get(stepId)!;
        if (!allowed.has(optId)) {
          errors.push(`Option '${optId}' is not a valid choice for step '${stepId}'`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates C1 Arabic Grammar correct answer against question content.
 */
export function validateArabicGrammarCorrectAnswer(
  correctAnswer: unknown,
  content: unknown
): ValidationResult {
  if (!correctAnswer || typeof correctAnswer !== 'object') {
    return { valid: false, errors: ['Correct answer must be an object'] };
  }
  const ca = correctAnswer as ArabicGrammarCorrectAnswer;
  const caComponents = ca.components;
  if (!caComponents || typeof caComponents !== 'object') {
    return { valid: false, errors: ['Correct answer must contain a components object'] };
  }

  if (content && typeof content === 'object') {
    const c = content as ArabicGrammarContent;
    if (Array.isArray(c.components)) {
      for (const comp of c.components) {
        const correctChoiceId = caComponents[comp.id];
        if (!correctChoiceId || typeof correctChoiceId !== 'string') {
          return { valid: false, errors: [`Missing correct choice ID for component '${comp.id}'`] };
        }
        const exists = comp.choices.some((ch) => ch.id === correctChoiceId);
        if (!exists) {
          return {
            valid: false,
            errors: [`Correct answer choice '${correctChoiceId}' for component '${comp.id}' does not exist in choices`],
          };
        }
      }
    }
  }

  return { valid: true, errors: [] };
}

/**
 * Validates C1 Arabic Grammar student answer against question content.
 */
export function validateArabicGrammarStudentAnswer(
  studentAnswer: unknown,
  content: unknown
): ValidationResult {
  if (!studentAnswer || typeof studentAnswer !== 'object') {
    return { valid: false, errors: ['Student answer must be an object'] };
  }
  const sa = studentAnswer as ArabicGrammarAnswer;
  const saComponents = sa.components;
  if (!saComponents || typeof saComponents !== 'object') {
    return { valid: false, errors: ['Student answer must contain a components map'] };
  }

  if (content && typeof content === 'object') {
    const c = content as ArabicGrammarContent;
    if (Array.isArray(c.components)) {
      const compMap = new Map(c.components.map((comp) => [comp.id, comp]));
      for (const [compId, choiceId] of Object.entries(saComponents)) {
        if (!compMap.has(compId)) {
          return { valid: false, errors: [`Invalid component ID '${compId}' in student answer`] };
        }
        const comp = compMap.get(compId)!;
        const exists = comp.choices.some((ch) => ch.id === choiceId);
        if (!exists) {
          return { valid: false, errors: [`Invalid choice ID '${choiceId}' for component '${compId}' in student answer`] };
        }
      }
    }
  }

  return { valid: true, errors: [] };
}
