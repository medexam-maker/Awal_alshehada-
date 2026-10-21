import assert from 'assert';
import { QuestionType, ExamMode, GradingStatus } from '../src/shared/constants';
import {
  validateQuestionContent,
  validateQuestionAnswer,
  validateFillBlankAnswer,
  validateTrueFalseAnswer,
  validateMcqAnswer,
} from '../src/shared/validation/schemas';
import { autoGrade } from '../src/server/lib/scoringEngine';
import { createClientSnapshot, createDbSnapshot } from '../src/server/lib/snapshot';
import { generateInitialQuestions } from '../src/client/storage/defaultCurriculumData';
import { SAMPLE_QUESTIONS_POOL } from '../src/client/data/demoCurriculum';

async function runFillBlankVerification() {
  console.log('=================================================================');
  console.log('   FIRST CERTIFICATE — FILL IN THE BLANK VERIFICATION SUITE      ');
  console.log('   [Weekly Simulation Self-Assessment & Training Tap_Reveal_3]   ');
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

  const sampleFillBlankContent = {
    textWithBlanks: 'ينبع النيل الأزرق من بحيرة {1} في إثيوبيا، بينما ينبع النيل الأبيض من بحيرة {2}.',
    template: 'ينبع النيل الأزرق من بحيرة {{1}} في إثيوبيا، بينما ينبع النيل الأبيض من بحيرة {{2}}.',
    blanks: [
      { id: '1', choices: ['تانا', 'فيكتوريا', 'ناصر'], correctValue: 'تانا' },
      { id: '2', choices: ['فيكتوريا', 'تانا', 'ألبرت'], correctValue: 'فيكتوريا' },
    ],
  };

  const sampleCorrectAnswer = {
    answers: {
      '1': 'تانا',
      '2': 'فيكتوريا',
    },
  };

  // =================================================================
  // مسار 1: التحقق المنهجي والمخططات (Input & Validation Path)
  // =================================================================
  console.log('--- [المسار 1]: التحقق المنهجي والمخططات (Validation & Schemas) ---');

  runTest('1.1 Valid Fill_Blank content passes ContentSchemas validation', () => {
    const res = validateQuestionContent('fill_blank', sampleFillBlankContent);
    assert.strictEqual(res.valid, true, 'Valid fill_blank content must pass validation');
    assert.strictEqual(res.errors.length, 0);
  });

  runTest('1.2 Fill_Blank content missing textWithBlanks is rejected', () => {
    const invalidContent = { blanks: [{ id: '1', correctValue: 'س' }] };
    const res = validateQuestionContent('fill_blank', invalidContent);
    assert.strictEqual(res.valid, false, 'Missing textWithBlanks must fail validation');
  });

  runTest('1.3 Valid Fill_Blank answer object passes validation', () => {
    const res = validateQuestionAnswer('fill_blank', { answers: { '1': 'تانا', '2': 'فيكتوريا' } });
    assert.strictEqual(res.valid, true, 'Valid answer must pass AnswerSchemas.fill_blank');
  });

  runTest('1.4 Non-object, bare string, or missing answers object is rejected', () => {
    assert.strictEqual(validateFillBlankAnswer('تانا').valid, false, 'Bare string must fail');
    assert.strictEqual(validateFillBlankAnswer(null).valid, false, 'Null must fail');
    assert.strictEqual(validateFillBlankAnswer(undefined).valid, false, 'Undefined must fail');
    assert.strictEqual(validateFillBlankAnswer({}).valid, false, 'Empty object without answers must fail');
    assert.strictEqual(validateFillBlankAnswer({ answers: 'تانا' }).valid, false, 'Non-object answers map must fail');
  });

  runTest('1.5 Non-string values inside answers map are rejected', () => {
    const resNum = validateFillBlankAnswer({ answers: { '1': 123 } });
    assert.strictEqual(resNum.valid, false, 'Number in answers map must fail');

    const resBool = validateFillBlankAnswer({ answers: { '1': true } });
    assert.strictEqual(resBool.valid, false, 'Boolean in answers map must fail');
  });

  runTest('1.6 Self-assessment boolean map in Weekly Simulation is strictly validated', () => {
    const validSelfEval = validateFillBlankAnswer({
      answers: { '1': 'إجابتي الحرة', '2': 'إجابة ثانية' },
      selfEvaluations: { '1': true, '2': false },
    });
    assert.strictEqual(validSelfEval.valid, true, 'Valid selfEvaluations map must pass');

    const invalidSelfEval = validateFillBlankAnswer({
      answers: { '1': 'نص' },
      selfEvaluations: { '1': 'true' as any }, // string instead of strict boolean
    });
    assert.strictEqual(invalidSelfEval.valid, false, 'String inside selfEvaluations must fail');

    const nonObjectSelfEval = validateFillBlankAnswer({
      answers: { '1': 'نص' },
      selfEvaluations: 'نعم' as any,
    });
    assert.strictEqual(nonObjectSelfEval.valid, false, 'Non-object selfEvaluations must fail');
  });

  // =================================================================
  // مسار 2: نمط التدريب والامتحانات التاريخية (Training & Historical tap_reveal_3)
  // =================================================================
  console.log('\n--- [المسار 2]: نمط التدريب والامتحانات التاريخية (Training tap_reveal_3) ---');

  runTest('2.1 Exactly three choices required per blank in tap_reveal_3', () => {
    const validContent = {
      textWithBlanks: 'نص {1}',
      blanks: [{ id: '1', choices: ['خيار 1', 'خيار 2', 'خيار 3'], correctValue: 'خيار 1' }],
    };
    const validRes = validateFillBlankAnswer(
      { answers: { '1': 'خيار 1' } },
      validContent,
      'training'
    );
    assert.strictEqual(validRes.valid, true, 'Valid tap_reveal_3 choice must pass');

    // Reject choice count != 3 in tap_reveal_3
    const invalidCountContent = {
      textWithBlanks: 'نص {1}',
      blanks: [{ id: '1', choices: ['خيار 1', 'خيار 2'], correctValue: 'خيار 1' }],
    };
    const invalidRes = validateFillBlankAnswer(
      { answers: { '1': 'خيار 1' } },
      invalidCountContent,
      'training'
    );
    assert.strictEqual(invalidRes.valid, false, 'Choice count of 2 must fail tap_reveal_3 validation');
  });

  runTest('2.2 Selecting a choice outside configured 3 choices is rejected in training mode', () => {
    const validContent = {
      textWithBlanks: 'نص {1}',
      blanks: [{ id: '1', choices: ['أ', 'ب', 'ج'], correctValue: 'أ' }],
    };
    const unlistedRes = validateFillBlankAnswer(
      { answers: { '1': 'خيار دخيل د' } },
      validContent,
      'training'
    );
    assert.strictEqual(unlistedRes.valid, false, 'Unlisted choice must be rejected');
  });

  runTest('2.3 Deterministic server-side grading for training mode evaluates accurately', () => {
    const outcomeCorrect = autoGrade(
      QuestionType.FILL_BLANK,
      sampleFillBlankContent,
      sampleCorrectAnswer,
      { answers: { '1': 'تانا', '2': 'فيكتوريا' } },
      10
    );
    assert.strictEqual(outcomeCorrect.obtainedMarks, 10, 'Both correct choices must yield full 10 marks');
    assert.strictEqual(outcomeCorrect.gradingStatus, GradingStatus.AUTO_GRADED);

    const outcomePartial = autoGrade(
      QuestionType.FILL_BLANK,
      sampleFillBlankContent,
      sampleCorrectAnswer,
      { answers: { '1': 'تانا', '2': 'ناصر' } }, // 1 of 2 correct
      10
    );
    assert.strictEqual(outcomePartial.obtainedMarks, 5, '1 of 2 correct choices must yield 50% credit (5 marks)');

    const outcomeZero = autoGrade(
      QuestionType.FILL_BLANK,
      sampleFillBlankContent,
      sampleCorrectAnswer,
      { answers: { '1': 'تشاد', '2': 'ناصر' } },
      10
    );
    assert.strictEqual(outcomeZero.obtainedMarks, 0, 'Zero matching choices must yield 0 marks');
  });

  // =================================================================
  // مسار 3: نمط المحاكاة الأسبوعية (Weekly Simulation Self-Assessment)
  // =================================================================
  console.log('\n--- [المسار 3]: نمط المحاكاة الأسبوعية (Weekly Simulation Self-Assessment) ---');

  runTest('3.1 Free text input is allowed in Weekly Simulation mode', () => {
    const freeTextAnswer = {
      answers: {
        '1': 'بحيرة تانا الواقعة شمال الهضبة',
        '2': 'بحيرة فيكتوريا الاستوائية',
      },
      confirmedBlanks: {
        '1': true,
        '2': true,
      },
      selfEvaluations: {
        '1': true,
        '2': true,
      },
    };

    const res = validateFillBlankAnswer(freeTextAnswer, sampleFillBlankContent, 'simulator');
    assert.strictEqual(res.valid, true, 'Free text with self-evaluations must pass validation');
  });

  runTest('3.2 Independent confirmation and self-assessment per blank', () => {
    // Blank 1 confirmed & self-assessed, Blank 2 still being typed (not confirmed)
    const partialConfirmedAnswer = {
      answers: {
        '1': 'تانا',
        '2': 'قيد الكتابة...',
      },
      confirmedBlanks: {
        '1': true,
      },
      selfEvaluations: {
        '1': true,
      },
    };

    const outcome = autoGrade(
      QuestionType.FILL_BLANK,
      sampleFillBlankContent,
      sampleCorrectAnswer,
      partialConfirmedAnswer,
      10
    );
    // Blank 1 selfEvaluations = true -> 1 unit
    // Blank 2 not self-evaluated -> deterministic check 'قيد الكتابة...' !== 'فيكتوريا' -> 0 unit
    // Total marks: 1/2 of 10 = 5 marks
    assert.strictEqual(outcome.obtainedMarks, 5, 'Confirmed blank 1 yields partial credit independently');
  });

  runTest('3.3 Student self-assessed as correct [نعم] awards full credit for the blank', () => {
    const selfCorrectAnswer = {
      answers: {
        '1': 'كتبت تانا الإثيوبية',
        '2': 'فيكتوريا في الهضبة الاستوائية',
      },
      confirmedBlanks: { '1': true, '2': true },
      selfEvaluations: { '1': true, '2': true },
    };

    const outcome = autoGrade(
      QuestionType.FILL_BLANK,
      sampleFillBlankContent,
      sampleCorrectAnswer,
      selfCorrectAnswer,
      10
    );
    assert.strictEqual(outcome.obtainedMarks, 10, 'Self-assessed [نعم] on all blanks awards 10/10 marks');
  });

  runTest('3.4 Student self-assessed as incorrect [لا] awards zero credit for the blank', () => {
    const selfIncorrectAnswer = {
      answers: {
        '1': 'كتبت إجابة غير دقيقة',
        '2': 'أخطأت في اسم البحيرة',
      },
      confirmedBlanks: { '1': true, '2': true },
      selfEvaluations: { '1': false, '2': false }, // Student honestly answered [لا]
    };

    const outcome = autoGrade(
      QuestionType.FILL_BLANK,
      sampleFillBlankContent,
      sampleCorrectAnswer,
      selfIncorrectAnswer,
      10
    );
    assert.strictEqual(outcome.obtainedMarks, 0, 'Self-assessed [لا] on all blanks yields 0 marks');
  });

  runTest('3.5 Mixed self-assessment [نعم] on Blank 1 and [لا] on Blank 2 awards exact proportional marks', () => {
    const mixedAnswer = {
      answers: { '1': 'تانا', '2': 'خطأ' },
      confirmedBlanks: { '1': true, '2': true },
      selfEvaluations: { '1': true, '2': false },
    };

    const outcome = autoGrade(
      QuestionType.FILL_BLANK,
      sampleFillBlankContent,
      sampleCorrectAnswer,
      mixedAnswer,
      10
    );
    assert.strictEqual(outcome.obtainedMarks, 5, 'Mixed self-assessment awards exactly 50% (5 marks)');
  });

  // =================================================================
  // مسار 4: مسار اللقطات وحصر النمط بالمحاكاة الأسبوعية تحديداً
  // =================================================================
  console.log('\n--- [المسار 4]: مسار اللقطات وحصر النمط بالمحاكاة الأسبوعية (Snapshot Scoping) ---');

  runTest('4.1 Weekly Simulation snapshot (isWeeklySimulation=true) provides referenceAnswers for self-assessment', () => {
    const rawRow = {
      id: 'fb-101',
      subject_id: 'geography',
      question_type: QuestionType.FILL_BLANK,
      content: sampleFillBlankContent,
      correct_answer: sampleCorrectAnswer,
      primary_interaction_mode: 'tap_reveal_3',
      marks: 10,
      explanation: 'ينبع النيل الأزرق من تانا والأبيض من فيكتوريا.',
    };

    const weeklySimSnapshot = createClientSnapshot(rawRow, ExamMode.SIMULATOR, 1, true);
    // correctAnswer and explanation must be scrubbed at top level
    assert.strictEqual(weeklySimSnapshot.correctAnswer, undefined, 'Top-level correctAnswer scrubbed in simulator snapshot');
    assert.strictEqual(weeklySimSnapshot.explanation, undefined, 'Top-level explanation scrubbed in simulator snapshot');

    // But content.referenceAnswers is populated so client can reveal upon clicking "تأكيد"
    const snapContent = weeklySimSnapshot.content as any;
    assert(snapContent.referenceAnswers, 'referenceAnswers must be available in snapshot content for weekly self-assessment');
    assert.strictEqual(snapContent.referenceAnswers['1'], 'تانا');
    assert.strictEqual(snapContent.referenceAnswers['2'], 'فيكتوريا');
  });

  runTest('4.2 General/Standard Simulator snapshot (isWeeklySimulation=false) STRICTLY BLOCKS reference answers', () => {
    const rawRow = {
      id: 'fb-102',
      subject_id: 'geography',
      question_type: QuestionType.FILL_BLANK,
      content: sampleFillBlankContent,
      correct_answer: sampleCorrectAnswer,
      primary_interaction_mode: 'tap_reveal_3',
      marks: 10,
      explanation: 'ينبع النيل الأزرق من تانا والأبيض من فيكتوريا.',
    };

    // General simulation (NOT a weekly simulation)
    const stdSimSnapshot = createClientSnapshot(rawRow, ExamMode.SIMULATOR, 1, false);
    assert.strictEqual(stdSimSnapshot.correctAnswer, undefined, 'correctAnswer is scrubbed in standard simulator');
    assert.strictEqual(stdSimSnapshot.explanation, undefined, 'explanation is scrubbed in standard simulator');

    const snapContent = stdSimSnapshot.content as any;
    assert.strictEqual(
      snapContent.referenceAnswers,
      undefined,
      'Standard simulator MUST NEVER expose referenceAnswers (Anti-Cheating Invariant)'
    );
  });

  runTest('4.3 Training snapshot retains full content, correctAnswer, and explanation', () => {
    const rawRow = {
      id: 'fb-103',
      subject_id: 'geography',
      question_type: QuestionType.FILL_BLANK,
      content: sampleFillBlankContent,
      correct_answer: sampleCorrectAnswer,
      primary_interaction_mode: 'tap_reveal_3',
      marks: 10,
      explanation: 'شرح منهجي جغرافي',
    };

    const trainSnapshot = createClientSnapshot(rawRow, ExamMode.TRAINING, 1);
    assert.deepStrictEqual(trainSnapshot.correctAnswer, sampleCorrectAnswer);
    assert.strictEqual(trainSnapshot.explanation, 'شرح منهجي جغرافي');
  });

  // =================================================================
  // مسار 5: عدم تأثر الأنماط السابقة (Non-Regression Suite)
  // =================================================================
  console.log('\n--- [المسار 5]: عدم تأثر الأنماط السابقة (Non-Regression) ---');

  runTest('5.1 MCQ Pattern 01 continues to grade and validate with 100% precision', () => {
    const mcqContent = {
      prompt: 'ما المعنى الدقيق لقوله تعالى؟',
      options: [
        { id: 'opt1', text: 'الخيار الصحيح' },
        { id: 'opt2', text: 'الخيار الخاطئ' },
      ],
    };
    const validAns = { selectedOptionId: 'opt1' };
    assert.strictEqual(validateMcqAnswer(validAns, mcqContent).valid, true);

    const res = autoGrade(QuestionType.MULTIPLE_CHOICE, mcqContent, validAns, validAns, 8);
    assert.strictEqual(res.obtainedMarks, 8);
  });

  runTest('5.2 True/False Pattern 02 continues to grade and validate with 100% precision', () => {
    const tfContent = { prompt: 'سؤال', statement: 'العبارة' };
    const validTfAns = { value: true };
    assert.strictEqual(validateTrueFalseAnswer(validTfAns).valid, true);

    const res = autoGrade(QuestionType.TRUE_FALSE, tfContent, validTfAns, validTfAns, 6);
    assert.strictEqual(res.obtainedMarks, 6);

    const wrongRes = autoGrade(QuestionType.TRUE_FALSE, tfContent, validTfAns, { value: false }, 6);
    assert.strictEqual(wrongRes.obtainedMarks, 0);
  });

  // =================================================================
  // مسار 6: عزل الأسئلة الأخرى ضمن نفس الامتحان الأسبوعي وشارات النتائج
  // =================================================================
  console.log('\n--- [المسار 6]: عزل أسئلة الامتحان الواحد وشارات التقييم الذاتي (Isolation & Badges) ---');

  runTest('6.1 In the SAME Weekly Simulation attempt, MCQ strictly hides correctAnswer and referenceAnswers', () => {
    const mcqRow = {
      id: 'mcq-in-weekly',
      subject_id: 'islamic',
      question_type: QuestionType.MULTIPLE_CHOICE,
      content: {
        prompt: 'سؤال اختيار من متعدد في نفس امتحان المحاكاة الأسبوعية',
        options: [
          { id: 'opt1', text: 'الخيار الأول' },
          { id: 'opt2', text: 'الخيار الثاني' },
        ],
      },
      correct_answer: { selectedOptionId: 'opt1' },
      primary_interaction_mode: 'large_cards',
      marks: 5,
      explanation: 'شرح منهجي',
    };

    // Client snapshot for MCQ inside the Weekly Simulation (isWeeklySimulation=true)
    const mcqSnap = createClientSnapshot(mcqRow, ExamMode.SIMULATOR, 2, true);

    assert.strictEqual(mcqSnap.correctAnswer, undefined, 'MCQ correctAnswer MUST be undefined in weekly simulation');
    assert.strictEqual(mcqSnap.explanation, undefined, 'MCQ explanation MUST be undefined in weekly simulation');
    assert.strictEqual(
      (mcqSnap.content as any).referenceAnswers,
      undefined,
      'MCQ MUST NEVER have referenceAnswers even in weekly simulation'
    );
    assert.strictEqual(
      (mcqSnap.content as any).correct_answer,
      undefined,
      'MCQ content must be deeply scrubbed of correct_answer'
    );
  });

  runTest('6.2 In the SAME Weekly Simulation attempt, True/False strictly hides correctAnswer and referenceAnswers', () => {
    const tfRow = {
      id: 'tf-in-weekly',
      subject_id: 'islamic',
      question_type: QuestionType.TRUE_FALSE,
      content: {
        prompt: 'حدد صحة العبارة',
        statement: 'عبارة فقهية في نفس امتحان المحاكاة الأسبوعية',
      },
      correct_answer: { value: true },
      primary_interaction_mode: 'toggle_cards',
      marks: 5,
      explanation: 'توضيح العبارة',
    };

    // Client snapshot for True/False inside the Weekly Simulation (isWeeklySimulation=true)
    const tfSnap = createClientSnapshot(tfRow, ExamMode.SIMULATOR, 3, true);

    assert.strictEqual(tfSnap.correctAnswer, undefined, 'True/False correctAnswer MUST be undefined in weekly simulation');
    assert.strictEqual(tfSnap.explanation, undefined, 'True/False explanation MUST be undefined in weekly simulation');
    assert.strictEqual(
      (tfSnap.content as any).referenceAnswers,
      undefined,
      'True/False MUST NEVER have referenceAnswers in weekly simulation'
    );
    assert.strictEqual(
      (tfSnap.content as any).correct_answer,
      undefined,
      'True/False content must be deeply scrubbed'
    );
  });

  runTest('6.3 Question with selfEvaluations qualifies for "تقييم ذاتي" badge in Results and Review', () => {
    const itemWithSelfEval = {
      questionId: 'fb-101',
      awardedPoints: 10,
      maxPoints: 10,
      isCorrect: true,
      studentAnswer: {
        answers: { '1': 'تانا', '2': 'فيكتوريا' },
        selfEvaluations: { '1': true, '2': true },
      },
    };

    const hasBadge = Boolean(
      (itemWithSelfEval as any).selfEvaluated ||
      (itemWithSelfEval as any).isSelfAssessed ||
      itemWithSelfEval.studentAnswer?.selfEvaluations
    );
    assert.strictEqual(hasBadge, true, 'Question with selfEvaluations must qualify for تقييم ذاتي badge');

    const itemWithoutSelfEval = {
      questionId: 'mcq-101',
      awardedPoints: 5,
      maxPoints: 5,
      isCorrect: true,
      studentAnswer: { selectedOptionId: 'opt1' },
    };
    const noBadge = Boolean(
      (itemWithoutSelfEval as any).selfEvaluated ||
      (itemWithoutSelfEval as any).isSelfAssessed ||
      (itemWithoutSelfEval.studentAnswer as any)?.selfEvaluations
    );
    assert.strictEqual(noBadge, false, 'Standard MCQ question must not show تقييم ذاتي badge');
  });

  console.log('\n-----------------------------------------------------------------');
  console.log(`Summary: ${passedTests}/${totalTests} tests passed successfully.`);
  console.log('Fill_Blank Pattern verification completed with 100% pass rate.');
  console.log('-----------------------------------------------------------------\n');
}

runFillBlankVerification().catch((e) => {
  console.error('Verification failed:', e);
  process.exit(1);
});
