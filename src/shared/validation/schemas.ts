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
  matching: { type: 'object', required: ['pairs'] },
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

  // Deep validation for Pattern 7 multi-step calculation content
  if (type === 'calculation' && content && typeof content === 'object') {
    const raw = content as Record<string, unknown>;
    if (raw.mode === 'multi_step_mcq' || Array.isArray(raw.steps)) {
      return validateMultiStepCalculationContent(content);
    }
  }

  return { valid: true, errors: [] };
}

export function validateQuestionAnswer(type: keyof typeof AnswerSchemas, answer: unknown): ValidationResult {
  // Support both legacy numeric_with_work and multi_step_mcq answers for calculation
  if (type === 'calculation' && answer && typeof answer === 'object' && 'step_answers' in (answer as Record<string, unknown>)) {
    return validateMultiStepCalculationAnswer(answer);
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
