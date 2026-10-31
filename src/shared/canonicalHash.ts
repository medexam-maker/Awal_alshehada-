/**
 * Canonical assessment hash utility for First Certificate Platform (Pattern 7 & Assessments).
 * Ensures deterministic, byte-identical JSON representation and SHA-256 calculation.
 */

/**
 * Recursively normalizes an assessment object:
 * 1. Object keys are deterministically sorted alphabetically.
 * 2. Arrays preserve their exact semantic pedagogical order (NOT sorted alphabetically).
 * 3. Text strings are normalized using Unicode Normalization Form C (NFC).
 * 4. Numeric values are validated against NaN and Infinity.
 * 5. Undefined values are omitted from objects.
 */
export function canonicalizeAssessmentData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return null;
  }

  if (typeof data === 'string') {
    return data.normalize('NFC');
  }

  if (typeof data === 'number') {
    if (!Number.isFinite(data) || Number.isNaN(data)) {
      throw new Error(`Invalid numeric value in assessment data: ${data}`);
    }
    return data;
  }

  if (typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    // PRESERVE array ordering!
    return data.map((item) => canonicalizeAssessmentData(item));
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const sortedKeys = Object.keys(obj).sort();
    const result: Record<string, unknown> = {};

    for (const key of sortedKeys) {
      const val = obj[key];
      if (val !== undefined) {
        result[key.normalize('NFC')] = canonicalizeAssessmentData(val);
      }
    }
    return result;
  }

  return String(data);
}

/**
 * Extracts and canonicalizes all assessment-relevant fields for Pattern 7 questions:
 * - Scenario and prompt
 * - Given values and constants
 * - Ordered steps and options (with stable IDs)
 * - Canonical correct answer
 * - Conditional credit rules
 * - Step marks and total marks
 * - Relevant explanations and feedback
 */
export function buildCanonicalAssessmentPayload(question: {
  prompt?: string;
  marks?: number;
  content: Record<string, unknown>;
  correct_answer?: Record<string, unknown>;
  explanation?: string | null;
}): unknown {
  const content = question.content || {};
  const correctAnswer = question.correct_answer || {};

  return canonicalizeAssessmentData({
    prompt: question.prompt || content.prompt || '',
    marks: Number(question.marks) || 0,
    explanation: question.explanation || content.solution_guide || null,
    scenario: content.scenario || null,
    given_values: content.given_values || null,
    constants: content.constants || null,
    steps: Array.isArray(content.steps)
      ? content.steps.map((step: any) => ({
          id: String(step.id || ''),
          order: Number(step.order) || 0,
          prompt: String(step.prompt || ''),
          marks: Number(step.marks) || 0,
          options: Array.isArray(step.options)
            ? step.options.map((opt: any) => ({
                id: String(opt.id || ''),
                label: String(opt.label || '')
              }))
            : []
        }))
      : [],
    correct_answer: {
      step_answers: correctAnswer.step_answers || {},
      conditional_credit_rules: Array.isArray(correctAnswer.conditional_credit_rules)
        ? correctAnswer.conditional_credit_rules.map((rule: any) => ({
            rule_id: String(rule.rule_id || ''),
            target_step_id: String(rule.target_step_id || ''),
            awarded_option_id: String(rule.awarded_option_id || ''),
            prerequisite_step_id: String(rule.prerequisite_step_id || ''),
            prerequisite_option_id: String(rule.prerequisite_option_id || ''),
            credit_fraction: Number(rule.credit_fraction) || 0
          }))
        : []
    }
  });
}

/**
 * Converts canonical data to a deterministic JSON string.
 */
export function toCanonicalJsonString(data: unknown): string {
  const canonicalData = canonicalizeAssessmentData(data);
  return JSON.stringify(canonicalData);
}

import crypto from 'crypto';

/**
 * Computes SHA-256 synchronously using Node.js crypto (server-side).
 */
export function computeCanonicalSha256Node(data: unknown): string {
  const jsonStr = toCanonicalJsonString(data);
  return crypto.createHash('sha256').update(jsonStr, 'utf8').digest('hex');
}

/**
 * Computes SHA-256 asynchronously using hash-wasm or Web Crypto API (portable for client & server).
 */
export async function computeCanonicalSha256(data: unknown): Promise<string> {
  const jsonStr = toCanonicalJsonString(data);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonStr);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  try {
    const { sha256 } = await import('hash-wasm');
    return await sha256(jsonStr);
  } catch {
    // Fallback to node crypto if in node environment
    return computeCanonicalSha256Node(data);
  }
}
