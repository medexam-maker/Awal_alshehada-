import assert from 'assert';
import {
  gradeMultiStepCalculation,
  gradeSingleStepCommitment
} from '../src/server/lib/scoringEngine';
import {
  buildCanonicalAssessmentPayload,
  toCanonicalJsonString,
  computeCanonicalSha256Node
} from '../src/shared/canonicalHash';
import {
  validateMultiStepCalculationContent,
  validateMultiStepCalculationCorrectAnswer,
  validateMultiStepCalculationAnswer
} from '../src/shared/validation/schemas';
import { autoGrade } from '../src/server/lib/scoringEngine';
import { QuestionType } from '../src/shared/constants';

console.log('--- Running Pattern 7 Verification Suite ---');

// 1. Scoring Engine & Conditional Credit Tests
{
  console.log('Test 1: Canonical Answer Precedence & Full Marks');
  const content = {
    mode: 'multi_step_mcq',
    prompt: 'مسألة المقذوفات',
    steps: [
      { id: 's1', order: 1, prompt: 'الخطوة 1', marks: 2, options: [{ id: 'opt_1a', label: '10' }, { id: 'opt_1b', label: '20' }] },
      { id: 's2', order: 2, prompt: 'الخطوة 2', marks: 3, options: [{ id: 'opt_2a', label: '100' }, { id: 'opt_2b', label: '200' }, { id: 'opt_2c', label: '300' }] }
    ]
  };

  const correctAnswer = {
    step_answers: {
      s1: { canonical_option_id: 'opt_1a', marks: 2 },
      s2: { canonical_option_id: 'opt_2a', marks: 3 }
    },
    conditional_credit_rules: [
      {
        rule_id: 'r_s2_from_s1_err',
        target_step_id: 's2',
        awarded_option_id: 'opt_2b',
        prerequisite_step_id: 's1',
        prerequisite_option_id: 'opt_1b',
        credit_fraction: 0.6
      }
    ]
  };

  // Case A: All Canonical
  const resAllCanonical = gradeMultiStepCalculation(content, correctAnswer, { step_answers: { s1: 'opt_1a', s2: 'opt_2a' } }, 5);
  assert.strictEqual(resAllCanonical.obtainedMarks, 5, 'All canonical choices must yield 5 marks');
  assert.strictEqual(resAllCanonical.isCorrect, true);

  // Case B: Step 1 wrong, but Step 2 Canonical -> Step 2 must receive full marks (Precedence)
  const resPrecedence = gradeMultiStepCalculation(content, correctAnswer, { step_answers: { s1: 'opt_1b', s2: 'opt_2a' } }, 5);
  assert.strictEqual(resPrecedence.stepResults[0].awardedMarks, 0, 'Step 1 wrong gives 0');
  assert.strictEqual(resPrecedence.stepResults[1].awardedMarks, 3, 'Step 2 canonical gives full 3 marks');
  assert.strictEqual(resPrecedence.obtainedMarks, 3);

  // Case C: Step 1 wrong, Step 2 chose consequential option matching rule
  const resConditional = gradeMultiStepCalculation(content, correctAnswer, { step_answers: { s1: 'opt_1b', s2: 'opt_2b' } }, 5);
  assert.strictEqual(resConditional.stepResults[0].awardedMarks, 0);
  assert.strictEqual(resConditional.stepResults[1].awardedMarks, 1.8, 'Step 2 consequential gives 0.6 * 3 = 1.8 marks');
  assert.strictEqual(resConditional.stepResults[1].isConditionalCredit, true);
  assert.strictEqual(resConditional.obtainedMarks, 1.8);

  // Case D: Prerequisite not met (Student chose random option s1: opt_x)
  const resNoMatch = gradeMultiStepCalculation(content, correctAnswer, { step_answers: { s1: 'opt_1c_unknown', s2: 'opt_2b' } }, 5);
  assert.strictEqual(resNoMatch.stepResults[1].awardedMarks, 0, 'Unmatched prerequisite yields 0 marks');
  console.log('✓ Passed: Canonical Precedence & Conditional Credit');
}

// 2. Highest Credit Fraction Wins & Strictly No Stacking
{
  console.log('Test 2: Multiple Matching Conditional Credit Rules (Highest Wins, No Stacking)');
  const content = {
    steps: [
      { id: 's1', order: 1, marks: 2 },
      { id: 's2', order: 2, marks: 4 }
    ]
  };

  const correctAnswer = {
    step_answers: {
      s1: { canonical_option_id: 'opt_1a' },
      s2: { canonical_option_id: 'opt_2a' }
    },
    conditional_credit_rules: [
      {
        rule_id: 'rule_lower',
        target_step_id: 's2',
        awarded_option_id: 'opt_2c',
        prerequisite_step_id: 's1',
        prerequisite_option_id: 'opt_1b',
        credit_fraction: 0.4
      },
      {
        rule_id: 'rule_higher',
        target_step_id: 's2',
        awarded_option_id: 'opt_2c',
        prerequisite_step_id: 's1',
        prerequisite_option_id: 'opt_1b',
        credit_fraction: 0.75
      }
    ]
  };

  const resMulti = gradeMultiStepCalculation(content, correctAnswer, { step_answers: { s1: 'opt_1b', s2: 'opt_2c' } }, 6);
  // Highest fraction 0.75 * 4 marks = 3 marks (NOT 0.4 + 0.75 = 1.15!)
  assert.strictEqual(resMulti.stepResults[1].awardedMarks, 3.0, 'Must award 0.75 * 4 = 3.0 marks without stacking');
  assert.strictEqual(resMulti.stepResults[1].matchedRuleId, 'rule_higher');
  console.log('✓ Passed: Highest Credit Fraction Wins (No Stacking)');
}

// 3. Single Step Commitment (Connected Training)
{
  console.log('Test 3: Single Step Commitment Evaluation');
  const snapshot = {
    content: {
      steps: [
        { id: 'step_1', marks: 2, options: [{ id: 'opt_1' }, { id: 'opt_2' }] },
        { id: 'step_2', marks: 3, options: [{ id: 'opt_3' }, { id: 'opt_4' }] }
      ]
    },
    correct_answer: {
      step_answers: {
        step_1: { canonical_option_id: 'opt_1' },
        step_2: { canonical_option_id: 'opt_3' }
      },
      conditional_credit_rules: [
        {
          rule_id: 'rule_2',
          target_step_id: 'step_2',
          awarded_option_id: 'opt_4',
          prerequisite_step_id: 'step_1',
          prerequisite_option_id: 'opt_2',
          credit_fraction: 0.5
        }
      ]
    }
  };

  const r1 = gradeSingleStepCommitment('step_1', 'opt_1', snapshot, {});
  assert.strictEqual(r1.isCorrect, true);
  assert.strictEqual(r1.awardedMarks, 2);

  const r2 = gradeSingleStepCommitment('step_2', 'opt_4', snapshot, { step_1: 'opt_2' });
  assert.strictEqual(r2.awardedMarks, 1.5);
  assert.strictEqual(r2.matchedRuleId, 'rule_2');
  console.log('✓ Passed: Single Step Commitment Evaluation');
}

// 4. Deterministic Canonical Hash & Normalization
{
  console.log('Test 4: Deterministic Canonical Hash');
  const objA = {
    prompt: 'حساب السرعة',
    marks: 5,
    content: {
      steps: [{ id: 's1', prompt: 'خطوة 1' }, { id: 's2', prompt: 'خطوة 2' }],
      scenario: 'قطار'
    },
    correct_answer: {
      step_answers: { s1: 'opt_a', s2: 'opt_b' }
    }
  };

  // objB has inverted key order in every object, but identical arrays
  const objB = {
    correct_answer: {
      step_answers: { s2: 'opt_b', s1: 'opt_a' }
    },
    marks: 5,
    content: {
      scenario: 'قطار',
      steps: [{ id: 's1', prompt: 'خطوة 1' }, { id: 's2', prompt: 'خطوة 2' }]
    },
    prompt: 'حساب السرعة'
  };

  const hashA = computeCanonicalSha256Node(buildCanonicalAssessmentPayload(objA));
  const hashB = computeCanonicalSha256Node(buildCanonicalAssessmentPayload(objB));
  assert.strictEqual(hashA, hashB, 'Different object key order must produce identical canonical SHA-256');

  // Array reordering MUST change the hash (pedagogical order preservation)
  const objInvertedArray = {
    ...objA,
    content: {
      ...objA.content,
      steps: [{ id: 's2', prompt: 'خطوة 2' }, { id: 's1', prompt: 'خطوة 1' }]
    }
  };
  const hashInverted = computeCanonicalSha256Node(buildCanonicalAssessmentPayload(objInvertedArray));
  assert.notStrictEqual(hashA, hashInverted, 'Array order change must produce different hash');

  console.log('✓ Passed: Deterministic Canonical Hash & Array Order Preservation');
}

// 5. Schema Validation & Prerequisite Ordering Enforcements
{
  console.log('Test 5: Schema Validation & Prerequisite Ordering');
  const invalidContent = {
    prompt: 'اختبار',
    steps: [
      {
        id: 's1',
        order: 1,
        prompt: 'خطوة 1',
        marks: 2,
        options: [{ id: 'o1', label: 'خيار 1', is_correct: true }, { id: 'o2', label: 'خيار 2' }] // Non-neutral option!
      }
    ]
  };
  const valRes = validateMultiStepCalculationContent(invalidContent);
  assert.strictEqual(valRes.valid, false, 'Must reject options with is_correct flags');

  const contentSteps = [
    { id: 's1', order: 1, options: [{ id: 'o1' }, { id: 'o2' }] },
    { id: 's2', order: 2, options: [{ id: 'o3' }, { id: 'o4' }] }
  ];

  // Inverted prerequisite rule (prerequisite step s2 targets s1): INVALID
  const invalidRule = {
    step_answers: { s1: { canonical_option_id: 'o1' }, s2: { canonical_option_id: 'o3' } },
    conditional_credit_rules: [
      {
        rule_id: 'invalid_future_prereq',
        target_step_id: 's1',
        awarded_option_id: 'o2',
        prerequisite_step_id: 's2', // s2 is AFTER s1!
        prerequisite_option_id: 'o4',
        credit_fraction: 0.5
      }
    ]
  };

  const ruleVal = validateMultiStepCalculationCorrectAnswer(invalidRule, { steps: contentSteps });
  assert.strictEqual(ruleVal.valid, false, 'Must reject prerequisite step that does not strictly precede target');
  console.log('✓ Passed: Schema Validation & Prerequisite Ordering');
}

// 6. Legacy Calculation Backward Compatibility
{
  console.log('Test 6: Legacy Calculation Compatibility');
  const legacyContent = { prompt: 'احسب حاصل ضرب 5 × 4' };
  const legacyCorrect = { value: 20, tolerance: 0.5 };
  const legacyStudent = { value: 20.2 };

  const gradeRes = autoGrade(QuestionType.CALCULATION, legacyContent, legacyCorrect, legacyStudent, 5);
  assert.strictEqual(gradeRes.obtainedMarks, 5, 'Legacy numeric_with_work within tolerance must award full marks');
  console.log('✓ Passed: Legacy Calculation Compatibility');
}

console.log('--- ALL PATTERN 7 TESTS PASSED SUCCESSFULLY! ---');
