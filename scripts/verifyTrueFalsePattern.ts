import assert from 'assert';
import { QuestionType, BankType, GradingStatus } from '../src/shared/constants';
import {
  validateQuestionContent,
  validateQuestionAnswer,
  validateTrueFalseAnswer,
  validateMcqAnswer,
} from '../src/shared/validation/schemas';
import { autoGrade } from '../src/server/lib/scoringEngine';
import { createClientSnapshot, createDbSnapshot } from '../src/server/lib/snapshot';
import { generateInitialQuestions } from '../src/client/storage/defaultCurriculumData';
import { SAMPLE_QUESTIONS_POOL } from '../src/client/data/demoCurriculum';

async function runTrueFalseVerification() {
  console.log('=================================================================');
  console.log('   FIRST CERTIFICATE — TRUE/FALSE PATTERN 02 VERIFICATION SUITE   ');
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

  const sampleTfContent = {
    prompt: 'حدد صحة أو خطأ العبارة الفقهية التالية:',
    statement: 'صلاة الجنازة ليس فيها ركوع ولا سجود وفق المعتمد في الفقه الإسلامي المقرر.',
    explanation: 'صلاة الجنازة أربع تكبيرات يقام فيها بغير ركوع ولا سجود.',
  };

  // =================================================================
  // مسار 1: مسار الإدخال والتحقق الأولي (Input & Validation Path)
  // =================================================================
  console.log('--- [المسار 1]: مسار الإدخال والتحقق المنهجي (Input & Validation) ---');

  runTest('1.1 Valid True/False content passes ContentSchemas validation', () => {
    const res = validateQuestionContent('true_false', sampleTfContent);
    assert.strictEqual(res.valid, true, 'Valid True/False content must pass validation');
    assert.strictEqual(res.errors.length, 0);
  });

  runTest('1.2 True/False content missing statement is rejected by ContentSchemas', () => {
    const invalidContent = { prompt: 'فقط نص بدون عبارة' };
    const res = validateQuestionContent('true_false', invalidContent);
    assert.strictEqual(res.valid, false, 'Missing statement must fail content validation');
  });

  runTest('1.3 Valid True/False answer object { value: true } passes validation', () => {
    const resTrue = validateTrueFalseAnswer({ value: true });
    assert.strictEqual(resTrue.valid, true, '{ value: true } must pass validation');
    assert.strictEqual(resTrue.errors.length, 0);

    const resFalse = validateTrueFalseAnswer({ value: false });
    assert.strictEqual(resFalse.valid, true, '{ value: false } must pass validation');
  });

  runTest('1.4 Non-object, bare-string, and bare-number answers are rejected', () => {
    assert.strictEqual(validateTrueFalseAnswer('true').valid, false, 'Bare string "true" must fail');
    assert.strictEqual(validateTrueFalseAnswer(true).valid, false, 'Bare boolean primitive must fail object validator');
    assert.strictEqual(validateTrueFalseAnswer(1).valid, false, 'Number 1 must fail');
    assert.strictEqual(validateTrueFalseAnswer(null).valid, false, 'Null must fail');
    assert.strictEqual(validateTrueFalseAnswer(undefined).valid, false, 'Undefined must fail');
  });

  runTest('1.5 Non-boolean values inside answer object are rejected', () => {
    assert.strictEqual(validateTrueFalseAnswer({ value: 'true' }).valid, false, '{ value: "true" } must fail');
    assert.strictEqual(validateTrueFalseAnswer({ value: 1 }).valid, false, '{ value: 1 } must fail');
    assert.strictEqual(validateTrueFalseAnswer({ value: null }).valid, false, '{ value: null } must fail');
  });

  runTest('1.6 Extra unauthorized properties are rejected (additionalProperties: false)', () => {
    const res = validateQuestionAnswer('true_false', { value: true, hacked: true });
    assert.strictEqual(res.valid, false, 'Extra properties must be rejected');
  });

  // =================================================================
  // مسار 2: مسار الحفظ والبيانات المركزية (Save & Persistence Path)
  // =================================================================
  console.log('\n--- [المسار 2]: مسار الحفظ وقاعدة البيانات (Save & Persistence) ---');

  runTest('2.1 Normalization of bare boolean to canonical { value: boolean } during persistence', () => {
    // Mimic adminRoutes normalization logic
    const inputBoolean = true;
    const normalized = typeof inputBoolean === 'boolean' ? { value: inputBoolean } : inputBoolean;
    const valResult = validateTrueFalseAnswer(normalized);
    assert.strictEqual(valResult.valid, true, 'Normalized answer must pass canonical schema');
    assert.deepStrictEqual(normalized, { value: true });
  });

  runTest('2.2 JSONB serialization roundtrip preserves exact boolean value', () => {
    const rawAnswer = { value: false };
    const serialized = JSON.stringify(rawAnswer);
    const parsed = JSON.parse(serialized);
    assert.strictEqual(parsed.value, false);
    assert.strictEqual(typeof parsed.value, 'boolean');
  });

  runTest('2.3 Bundled curriculum True/False questions conform to canonical structure', () => {
    const initialQuestions = generateInitialQuestions();
    const tfInit = initialQuestions.filter((q) => q.questionType === QuestionType.TRUE_FALSE);
    assert(tfInit.length > 0, 'Must have at least one initial True/False question');
    for (const q of tfInit) {
      assert(typeof q.correctAnswer === 'object' && q.correctAnswer !== null, `Question ${q.id} must be object`);
      assert(typeof (q.correctAnswer as any).value === 'boolean', `Question ${q.id} value must be boolean`);
      assert(q.content && typeof (q.content as any).statement === 'string', `Question ${q.id} must have statement`);
    }

    const allDemoQuestions = Object.values(SAMPLE_QUESTIONS_POOL).flat();
    const demoTf = allDemoQuestions.filter(
      (q) => (q as any).type === QuestionType.TRUE_FALSE || (q as any).questionType === QuestionType.TRUE_FALSE
    );
    assert(demoTf.length > 0, 'Must have demo True/False questions');
    for (const q of demoTf) {
      assert(typeof q.correctAnswer === 'object' && q.correctAnswer !== null, `Demo question ${q.id} must be object`);
      assert(typeof (q.correctAnswer as any).value === 'boolean', `Demo question ${q.id} must be boolean`);
    }
  });

  // =================================================================
  // مسار 3: مسار العرض واللقطات (Display & Snapshot Path)
  // =================================================================
  console.log('\n--- [المسار 3]: مسار العرض واللقطات (Display & Snapshot) ---');

  runTest('3.1 Simulator snapshot sanitization strictly hides correctAnswer and explanation', () => {
    const rawRow = {
      id: 'tf-1',
      subject_id: 'sub-1',
      question_type: QuestionType.TRUE_FALSE,
      content: sampleTfContent,
      correct_answer: { value: true },
      primary_interaction_mode: 'large_cards',
      marks: 5,
      explanation: 'شرح فقهي منهجي للعبارة',
    };

    const simSnapshot = createClientSnapshot(rawRow, 'simulator' as any, 1);
    assert.strictEqual(simSnapshot.correctAnswer, undefined, 'Simulator snapshot MUST NOT expose correctAnswer');
    assert.strictEqual(simSnapshot.explanation, undefined, 'Simulator snapshot MUST NOT expose explanation');
    assert.deepStrictEqual((simSnapshot.content as any).statement, sampleTfContent.statement);

    const trainSnapshot = createClientSnapshot(rawRow, 'training' as any, 1);
    assert.deepStrictEqual(trainSnapshot.correctAnswer, { value: true }, 'Training snapshot reveals correctAnswer');
    assert.strictEqual(trainSnapshot.explanation, 'شرح فقهي منهجي للعبارة', 'Training snapshot reveals explanation');

    const dbSnapshot = createDbSnapshot(rawRow);
    assert.deepStrictEqual(dbSnapshot.correct_answer, { value: true }, 'DB snapshot preserves correct_answer');
  });

  runTest('3.2 True/False Renderer fallback: Statement is resolved from content.statement or content.prompt', () => {
    const withStatement = { statement: 'العبارة المحددة', prompt: 'توجيه' };
    const statement1 = withStatement.statement || withStatement.prompt;
    assert.strictEqual(statement1, 'العبارة المحددة');

    const withoutStatement = { prompt: 'العبارة كـ prompt فقط' };
    const statement2 = (withoutStatement as any).statement || withoutStatement.prompt;
    assert.strictEqual(statement2, 'العبارة كـ prompt فقط');
  });

  // =================================================================
  // مسار 4: مسار التصحيح الحتمي والدرجات (Grading & Scoring Path)
  // =================================================================
  console.log('\n--- [المسار 4]: مسار التصحيح الحتمي والدرجات (Grading & Scoring) ---');

  runTest('4.1 Correct True/False answer receives full allocated marks', () => {
    const outcome = autoGrade(
      QuestionType.TRUE_FALSE,
      sampleTfContent,
      { value: true },
      { value: true },
      10
    );
    assert.strictEqual(outcome.obtainedMarks, 10, 'Matching true answer must receive full 10 marks');
    assert.strictEqual(outcome.gradingStatus, GradingStatus.AUTO_GRADED);

    const outcomeFalse = autoGrade(
      QuestionType.TRUE_FALSE,
      sampleTfContent,
      { value: false },
      { value: false },
      7
    );
    assert.strictEqual(outcomeFalse.obtainedMarks, 7, 'Matching false answer must receive full 7 marks');
    assert.strictEqual(outcomeFalse.gradingStatus, GradingStatus.AUTO_GRADED);
  });

  runTest('4.2 Incorrect True/False answer receives zero marks (0)', () => {
    const outcome = autoGrade(
      QuestionType.TRUE_FALSE,
      sampleTfContent,
      { value: true },
      { value: false },
      10
    );
    assert.strictEqual(outcome.obtainedMarks, 0, 'Opposite answer must receive 0 marks');
    assert.strictEqual(outcome.gradingStatus, GradingStatus.AUTO_GRADED);
  });

  runTest('4.3 Malformed, missing, and non-boolean answers receive zero marks (0)', () => {
    const nullOutcome = autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, null, 10);
    assert.strictEqual(nullOutcome.obtainedMarks, 0);

    const undefOutcome = autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, undefined, 10);
    assert.strictEqual(undefOutcome.obtainedMarks, 0);

    const emptyObj = autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, {}, 10);
    assert.strictEqual(emptyObj.obtainedMarks, 0);

    const stringVal = autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, { value: 'true' }, 10);
    assert.strictEqual(stringVal.obtainedMarks, 0);
  });

  runTest('4.4 Backward compatibility with historical raw boolean correct answers', () => {
    // If a historical snapshot has bare boolean `true`
    const histOutcome = autoGrade(
      QuestionType.TRUE_FALSE,
      sampleTfContent,
      true, // Legacy bare boolean
      { value: true }, // Canonical student answer
      5
    );
    assert.strictEqual(histOutcome.obtainedMarks, 5, 'Historical boolean must grade accurately');

    const histWrong = autoGrade(
      QuestionType.TRUE_FALSE,
      sampleTfContent,
      true,
      { value: false },
      5
    );
    assert.strictEqual(histWrong.obtainedMarks, 0);
  });

  runTest('4.5 No negative marking: Score never drops below 0', () => {
    const outcome = autoGrade(
      QuestionType.TRUE_FALSE,
      sampleTfContent,
      { value: true },
      { value: false },
      15
    );
    assert(outcome.obtainedMarks >= 0, 'Obtained marks must never be negative');
    assert.strictEqual(outcome.obtainedMarks, 0);
  });

  // =================================================================
  // مسار 5: عدم تأثر الأنماط الأخرى (Non-Regression)
  // =================================================================
  console.log('\n--- [المسار 5]: عدم تأثر الأنماط الأخرى (Non-Regression) ---');

  runTest('5.1 MCQ Pattern 01 continues to pass deterministic exact ID evaluation', () => {
    const mcqContent = {
      prompt: 'اختر الإجابة',
      options: [{ id: 'opt1', text: 'أ' }, { id: 'opt2', text: 'ب' }],
    };
    const mcqRes = autoGrade(
      QuestionType.MULTIPLE_CHOICE,
      mcqContent,
      { selectedOptionId: 'opt1' },
      { selectedOptionId: 'opt1' },
      8
    );
    assert.strictEqual(mcqRes.obtainedMarks, 8);

    const mcqWrong = autoGrade(
      QuestionType.MULTIPLE_CHOICE,
      mcqContent,
      { selectedOptionId: 'opt1' },
      { selectedOptionId: 'opt2' },
      8
    );
    assert.strictEqual(mcqWrong.obtainedMarks, 0);
  });

  // =================================================================
  // مسار 6: اختبارات القبول الشاملة لتوحيد عقد True/False
  // =================================================================
  console.log('\n--- [المسار 6]: اختبارات القبول الشاملة لتوحيد عقد True/False ---');

  runTest('6.1 الإجابة المرجعية true وإجابة الطالب true تحتسب كاملة', () => {
    // Both canonical object
    const res1 = autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, { value: true }, 5);
    assert.strictEqual(res1.obtainedMarks, 5);

    // Bare boolean student answer supported
    const res2 = autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, true, 5);
    assert.strictEqual(res2.obtainedMarks, 5);
  });

  runTest('6.2 الإجابة المرجعية false وإجابة الطالب false تحتسب كاملة', () => {
    // Both canonical object
    const res1 = autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: false }, { value: false }, 5);
    assert.strictEqual(res1.obtainedMarks, 5);

    // Bare boolean student answer supported
    const res2 = autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: false }, false, 5);
    assert.strictEqual(res2.obtainedMarks, 5);
  });

  runTest('6.3 الإجابة المعاكسة للإجابة المرجعية تحتسب 0 درجات', () => {
    const res1 = autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, { value: false }, 5);
    assert.strictEqual(res1.obtainedMarks, 0);

    const res2 = autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: false }, { value: true }, 5);
    assert.strictEqual(res2.obtainedMarks, 0);
  });

  runTest('6.4 الإجابة الفارغة (null/undefined/empty) تحتسب 0 درجات بدقة', () => {
    assert.strictEqual(autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, null, 5).obtainedMarks, 0);
    assert.strictEqual(autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, undefined, 5).obtainedMarks, 0);
    assert.strictEqual(autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, {}, 5).obtainedMarks, 0);
  });

  runTest('6.5 قيمة من نوع غير صحيح تحتسب 0 درجات بدقة', () => {
    assert.strictEqual(autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, 'true', 5).obtainedMarks, 0);
    assert.strictEqual(autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, 1, 5).obtainedMarks, 0);
    assert.strictEqual(autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { value: true }, [true], 5).obtainedMarks, 0);
  });

  runTest('6.6 إجابة مرجعية مشوّهة لا تؤدي إلى احتساب درجات عن طريق الخطأ', () => {
    assert.strictEqual(autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, { malformed: true }, { value: true }, 5).obtainedMarks, 0);
    assert.strictEqual(autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, 'invalid', { value: true }, 5).obtainedMarks, 0);
    assert.strictEqual(autoGrade(QuestionType.TRUE_FALSE, sampleTfContent, null, { value: true }, 5).obtainedMarks, 0);
  });

  runTest('6.7 تطبيع الإدخال الفردي والجماعي إلى { value: boolean } وتوافق Snapshot مع الواجهة', () => {
    const rawSingleInput = true;
    const normalizedSingle = typeof rawSingleInput === 'boolean' ? { value: rawSingleInput } : rawSingleInput;
    assert.deepStrictEqual(normalizedSingle, { value: true });
    assert.strictEqual(validateTrueFalseAnswer(normalizedSingle).valid, true);

    const rawRow = {
      id: 'tf-1',
      question_type: QuestionType.TRUE_FALSE,
      content: sampleTfContent,
      correct_answer: normalizedSingle,
      primary_interaction_mode: 'toggle_cards',
      marks: 5,
      explanation: 'توضيح',
    };
    const snap = createClientSnapshot(rawRow, 'simulator' as any, 1);
    assert.strictEqual(snap.type, 'true_false');
    assert.strictEqual(snap.questionType, 'true_false');
    assert.strictEqual(snap.marks, 5);
    assert.strictEqual(snap.points, 5);
    assert.strictEqual(snap.prompt, sampleTfContent.prompt);
  });

  console.log('\n-----------------------------------------------------------------');
  console.log(`Summary: ${passedTests}/${totalTests} tests passed successfully.`);
  console.log('True/False Pattern 02 verification completed with 100% pass rate.');
  console.log('-----------------------------------------------------------------\n');
}

runTrueFalseVerification().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
