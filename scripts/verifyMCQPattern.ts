import assert from 'assert';
import { QuestionType, BankType, GradingStatus } from '../src/shared/constants';
import { validateQuestionContent, validateQuestionAnswer, validateMcqAnswer } from '../src/shared/validation/schemas';
import { autoGrade } from '../src/server/lib/scoringEngine';
import { createClientSnapshot, createDbSnapshot } from '../src/server/lib/snapshot';
import { generateInitialQuestions } from '../src/client/storage/defaultCurriculumData';
import { SAMPLE_QUESTIONS_POOL } from '../src/client/data/demoCurriculum';

async function runMCQVerification() {
  console.log('=================================================================');
  console.log('   FIRST CERTIFICATE — MCQ PATTERN 01 VERIFICATION SUITE         ');
  console.log('=================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function runTest(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}`);
      console.error('   Error:', err?.message || err);
      throw err;
    }
  }

  const sampleMcqContent = {
    prompt: 'ما المعنى الدقيق لقوله تعالى: ﴿وَلَا تَنَابَزُوا بِالْأَلْقَابِ﴾؟',
    options: [
      { id: 'opt1', text: 'لا يدعُ بعضكم بعضاً بما يكره من الأسماء المعيبة' },
      { id: 'opt2', text: 'لا تجلسوا في مجالس السوء والمحرمات' },
      { id: 'opt3', text: 'لا تسرفوا في مدح إخوانكم بما ليس فيهم' },
    ],
  };

  // 1. Valid MCQ answer objects pass validation
  runTest('1. Valid MCQ answer object { selectedOptionId: "opt1" } passes validation', () => {
    const res = validateQuestionAnswer('multiple_choice', { selectedOptionId: 'opt1' });
    assert.strictEqual(res.valid, true, 'Valid answer must pass validation');
    assert.strictEqual(res.errors.length, 0);

    const mcqRes = validateMcqAnswer({ selectedOptionId: 'opt1' }, sampleMcqContent);
    assert.strictEqual(mcqRes.valid, true, 'Valid answer with known option must pass');
  });

  // 2. Bare-string student answers are rejected at validation boundary
  runTest('2. Bare-string student answers are rejected at validation boundary', () => {
    const res = validateQuestionAnswer('multiple_choice', 'opt1');
    assert.strictEqual(res.valid, false, 'Bare-string answer must fail validation');

    const mcqRes = validateMcqAnswer('opt1', sampleMcqContent);
    assert.strictEqual(mcqRes.valid, false, 'Bare-string answer must fail validateMcqAnswer');
  });

  // 3. Empty, non-string, malformed, extra properties, and nonexistent option IDs are rejected
  runTest('3. Empty, non-string, malformed, extra properties, and nonexistent option IDs are rejected safely', () => {
    // Empty string
    assert.strictEqual(validateQuestionAnswer('multiple_choice', { selectedOptionId: '' }).valid, false);
    // Non-string
    assert.strictEqual(validateQuestionAnswer('multiple_choice', { selectedOptionId: 123 }).valid, false);
    assert.strictEqual(validateQuestionAnswer('multiple_choice', { selectedOptionId: null }).valid, false);
    // Extra properties
    assert.strictEqual(validateQuestionAnswer('multiple_choice', { selectedOptionId: 'opt1', hacked: true }).valid, false);
    // Nonexistent option ID
    const nonExistentRes = validateMcqAnswer({ selectedOptionId: 'opt999' }, sampleMcqContent);
    assert.strictEqual(nonExistentRes.valid, false, 'Nonexistent option ID must be rejected');
    assert(
      JSON.stringify(nonExistentRes.errors).includes('does not exist'),
      'Error message must indicate option does not exist'
    );
  });

  // 4. Correct option IDs receive the expected marks
  runTest('4. Correct option IDs receive the expected marks (deterministic exact matching)', () => {
    const outcome = autoGrade(
      QuestionType.MULTIPLE_CHOICE,
      sampleMcqContent,
      { selectedOptionId: 'opt1' },
      { selectedOptionId: 'opt1' },
      10
    );
    assert.strictEqual(outcome.obtainedMarks, 10, 'Correct answer must receive full marks');
    assert.strictEqual(outcome.gradingStatus, GradingStatus.AUTO_GRADED);
  });

  // 5. Incorrect option IDs receive no marks
  runTest('5. Incorrect option IDs receive zero marks (0)', () => {
    const outcome = autoGrade(
      QuestionType.MULTIPLE_CHOICE,
      sampleMcqContent,
      { selectedOptionId: 'opt1' },
      { selectedOptionId: 'opt2' },
      10
    );
    assert.strictEqual(outcome.obtainedMarks, 0, 'Incorrect option ID must receive 0 marks');
    assert.strictEqual(outcome.gradingStatus, GradingStatus.AUTO_GRADED);
  });

  // 6. Object-to-string coercion and substring matching cannot produce a correct result
  runTest('6. Object-to-string coercion and substring matching cannot produce a correct result', () => {
    // Substring attempt: correctAnswer is 'opt1', student attempts 'opt123' or 'opt'
    const subMatch = autoGrade(
      QuestionType.MULTIPLE_CHOICE,
      sampleMcqContent,
      { selectedOptionId: 'opt1' },
      { selectedOptionId: 'opt123' },
      10
    );
    assert.strictEqual(subMatch.obtainedMarks, 0, 'Substring must not match');

    // Permissive coercion attempt
    const coerceMatch = autoGrade(
      QuestionType.MULTIPLE_CHOICE,
      sampleMcqContent,
      { selectedOptionId: 'opt1' },
      { selectedOptionId: '[object Object]' },
      10
    );
    assert.strictEqual(coerceMatch.obtainedMarks, 0, 'Coerced string must not match');
  });

  // 7. Backward compatibility with historical snapshot bare-string correctAnswer
  runTest('7. Historical snapshot bare-string correctAnswer is evaluated accurately without rewrite', () => {
    // If a historical snapshot in database contains bare string 'opt1' as correctAnswer
    const histOutcome = autoGrade(
      QuestionType.MULTIPLE_CHOICE,
      sampleMcqContent,
      'opt1', // Legacy bare string in stored snapshot
      { selectedOptionId: 'opt1' }, // Canonical student answer
      10
    );
    assert.strictEqual(histOutcome.obtainedMarks, 10, 'Historical snapshot must grade correctly against canonical answer');

    const histWrong = autoGrade(
      QuestionType.MULTIPLE_CHOICE,
      sampleMcqContent,
      'opt1',
      { selectedOptionId: 'opt2' },
      10
    );
    assert.strictEqual(histWrong.obtainedMarks, 0);
  });

  // 8. Bundled default and demo MCQs use canonical answer representation
  runTest('8. Bundled default and demo MCQs use canonical { selectedOptionId: string } representation', () => {
    const initialQuestions = generateInitialQuestions();
    const mcqInit = initialQuestions.filter((q) => q.questionType === QuestionType.MULTIPLE_CHOICE);
    assert(mcqInit.length > 0, 'Must have initial MCQ questions');
    for (const q of mcqInit) {
      assert(typeof q.correctAnswer === 'object' && q.correctAnswer !== null, `Question ${q.id} correctAnswer must be object`);
      assert(typeof q.correctAnswer.selectedOptionId === 'string', `Question ${q.id} selectedOptionId must be string`);
      assert(q.correctAnswer.selectedOptionId.length > 0, `Question ${q.id} selectedOptionId must not be empty`);
    }

    const allDemoQuestions = Object.values(SAMPLE_QUESTIONS_POOL).flat();
    const demoMcq = allDemoQuestions.filter((q) => (q as any).type === QuestionType.MULTIPLE_CHOICE || (q as any).questionType === QuestionType.MULTIPLE_CHOICE);
    assert(demoMcq.length > 0, 'Must have demo MCQ questions');
    for (const q of demoMcq) {
      assert(typeof q.correctAnswer === 'object' && q.correctAnswer !== null, `Demo question ${q.id} must be object`);
      assert(typeof q.correctAnswer.selectedOptionId === 'string', `Demo question ${q.id} selectedOptionId must be string`);
    }
  });

  // 9. Snapshot sanitization hides correctAnswer in Simulator and reveals in Training
  runTest('9. Snapshot sanitization hides correctAnswer in Simulator and reveals in Training', () => {
    const rawRow = {
      id: 'mcq-1',
      subject_id: 'sub-1',
      question_type: QuestionType.MULTIPLE_CHOICE,
      content: sampleMcqContent,
      correct_answer: { selectedOptionId: 'opt1' },
      primary_interaction_mode: 'large_cards',
      marks: 10,
      explanation: 'توضيح منهجي',
    };

    const simSnapshot = createClientSnapshot(rawRow, 'simulator' as any, 1);
    assert.strictEqual(simSnapshot.correctAnswer, undefined, 'Simulator snapshot must NOT expose correctAnswer');
    assert.strictEqual(simSnapshot.explanation, undefined, 'Simulator snapshot must NOT expose explanation');

    const trainSnapshot = createClientSnapshot(rawRow, 'training' as any, 1);
    assert.deepStrictEqual(trainSnapshot.correctAnswer, { selectedOptionId: 'opt1' }, 'Training snapshot exposes correctAnswer');
    assert.strictEqual(trainSnapshot.explanation, 'توضيح منهجي', 'Training snapshot exposes explanation');

    const dbSnapshot = createDbSnapshot(rawRow);
    assert.deepStrictEqual(dbSnapshot.correct_answer, { selectedOptionId: 'opt1' }, 'Db snapshot stores canonical correct_answer');
  });

  // 10. Existing question types outside MCQ are completely unaffected
  runTest('10. Existing question types outside MCQ (True/False, Matching, etc.) are unaffected', () => {
    // True / False
    const tfCorrect = autoGrade(
      QuestionType.TRUE_FALSE,
      { prompt: 'النص', statement: 'العبارة' },
      { value: true },
      { value: true },
      5
    );
    assert.strictEqual(tfCorrect.obtainedMarks, 5, 'True/False correct must award 5 marks');

    const tfIncorrect = autoGrade(
      QuestionType.TRUE_FALSE,
      { prompt: 'النص', statement: 'العبارة' },
      { value: true },
      { value: false },
      5
    );
    assert.strictEqual(tfIncorrect.obtainedMarks, 0, 'True/False incorrect must award 0 marks');
  });

  // 11. MCQ content validation enforces minimum 2 options and array type
  runTest('11. MCQ content validation enforces minimum 2 options and array type', () => {
    // 0 options
    const emptyOptions = { prompt: 'سؤال', options: [] };
    assert.strictEqual(validateQuestionContent('multiple_choice', emptyOptions).valid, false, 'Empty options must fail');

    // 1 option
    const oneOption = { prompt: 'سؤال', options: [{ id: 'opt1', text: 'وحيد' }] };
    assert.strictEqual(validateQuestionContent('multiple_choice', oneOption).valid, false, 'Single option must fail (min 2 required)');

    // Non-array options
    const stringOptions = { prompt: 'سؤال', options: 'opt1, opt2' };
    assert.strictEqual(validateQuestionContent('multiple_choice', stringOptions).valid, false, 'String options must fail');
  });

  // 12. MCQ content validation enforces option structure (id and text required)
  runTest('12. MCQ content validation enforces option structure (id and text required)', () => {
    // Missing text
    const missingText = { prompt: 'سؤال', options: [{ id: 'opt1' }, { id: 'opt2', text: 'ب' }] };
    assert.strictEqual(validateQuestionContent('multiple_choice', missingText).valid, false, 'Missing text must fail');

    // Missing id
    const missingId = { prompt: 'سؤال', options: [{ text: 'أ' }, { id: 'opt2', text: 'ب' }] };
    assert.strictEqual(validateQuestionContent('multiple_choice', missingId).valid, false, 'Missing id must fail');
  });

  // 13. MCQ content validation rejects duplicate option IDs
  runTest('13. MCQ content validation rejects duplicate option IDs', () => {
    const duplicateIds = {
      prompt: 'سؤال',
      options: [
        { id: 'opt1', text: 'الخيار الأول' },
        { id: 'opt1', text: 'الخيار المكرر' },
      ],
    };
    const res = validateQuestionContent('multiple_choice', duplicateIds);
    assert.strictEqual(res.valid, false, 'Duplicate option IDs must be rejected');
    assert(res.errors.some((e: any) => String(e).includes('Duplicate option ID')), 'Error must mention duplicate ID');
  });

  // 14. validateMcqAnswer rejects student or reference answers referencing nonexistent options or malformed content
  runTest('14. validateMcqAnswer rejects answers referencing nonexistent options or malformed content', () => {
    // Nonexistent option
    const nonExistent = validateMcqAnswer({ selectedOptionId: 'opt99' }, sampleMcqContent);
    assert.strictEqual(nonExistent.valid, false, 'Nonexistent option must fail validateMcqAnswer');

    // Malformed content options
    const malformedContent = { prompt: 'سؤال', options: 'not-an-array' };
    const malformedRes = validateMcqAnswer({ selectedOptionId: 'opt1' }, malformedContent);
    assert.strictEqual(malformedRes.valid, false, 'Malformed content options must fail validateMcqAnswer');
  });

  console.log('\n-----------------------------------------------------------------');
  console.log(`Summary: ${passedTests}/${totalTests} tests passed successfully.`);
  console.log('MCQ Pattern 01 verification completed with 100% pass rate.');
  console.log('-----------------------------------------------------------------\n');
}

runMCQVerification().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
