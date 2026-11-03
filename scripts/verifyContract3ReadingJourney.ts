import { QuestionType, ExamMode } from '../src/shared/constants';
import { gradeReadingComprehension } from '../src/server/lib/scoringEngine';
import { createSnapshotPair } from '../src/server/lib/snapshot';
import { DEMO_READING_ACTIVE_JOURNEY } from '../src/shared/batch1DemoQuestions';

async function runVerification() {
  console.log('====================================================');
  console.log('VERIFYING CONTRACT 3: ACTIVE READING JOURNEY');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, description: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] ${description}`);
    } else {
      console.error(`[FAIL] ${description}`);
    }
  }

  const demoRow = DEMO_READING_ACTIVE_JOURNEY.row;

  // TEST 1: Full correct grading (Core + Evidence)
  console.log('--- Test Suite 1: Full Correct Autograding (100% Score) ---');
  const fullCorrectStudentAnswer = {
    subAnswers: {
      sq1: { coreAnswer: 'sq1_opt1', evidence: { paragraphId: 'p1' } },
      sq2: { coreAnswer: 'sq2_opt1' },
      sq3: { coreAnswer: 'sq3_opt1', evidence: { paragraphId: 'p2' } },
      sq4: { coreAnswer: 'sq4_opt1', evidence: { paragraphId: 'p3' } },
      sq5: { coreAnswer: 'sq5_opt1' },
    },
  };

  const gradeResultFull = gradeReadingComprehension(
    demoRow.content,
    demoRow.correct_answer,
    fullCorrectStudentAnswer,
    10
  );

  assert(gradeResultFull.isCorrect === true, 'Full correct attempt returns isCorrect = true');
  assert(gradeResultFull.obtainedMarks === 10, 'Full correct attempt returns 10 / 10 marks');
  assert(gradeResultFull.subResults.length === 5, 'Evaluates all 5 sub-questions');

  // TEST 2: 5 Skill Levels Mastery Calculation
  console.log('\n--- Test Suite 2: 5-Level Reading Skill Mastery Breakdown ---');
  const mastery = gradeResultFull.skillMastery;
  assert(mastery.literal.percentage === 100, 'Skill "literal" (الفهم الحرفي) = 100%');
  assert(mastery.vocabulary.percentage === 100, 'Skill "vocabulary" (فهم المفردات) = 100%');
  assert(mastery.inference.percentage === 100, 'Skill "inference" (الاستنتاج) = 100%');
  assert(mastery.analysis.percentage === 100, 'Skill "analysis" (التحليل) = 100%');
  assert(mastery.evaluation.percentage === 100, 'Skill "evaluation" (التقييم النقدية) = 100%');

  // TEST 3: Partial Credit (Correct Core Answer + Wrong or Missing Evidence)
  console.log('\n--- Test Suite 3: Partial Credit (Core vs Evidence) ---');
  const partialStudentAnswer = {
    subAnswers: {
      // sq1 has core correct (70% = 1.4 marks) but missing evidence (0% evidence)
      sq1: { coreAnswer: 'sq1_opt1', evidence: { paragraphId: 'p3' } }, // wrong paragraph for sq1
      sq2: { coreAnswer: 'sq2_opt1' }, // 2 marks
      sq3: { coreAnswer: 'sq3_opt1', evidence: { paragraphId: 'p2' } }, // 2 marks
      sq4: { coreAnswer: 'sq4_opt1', evidence: { paragraphId: 'p3' } }, // 2 marks
      sq5: { coreAnswer: 'sq5_opt1' }, // 2 marks
    },
  };

  const gradeResultPartial = gradeReadingComprehension(
    demoRow.content,
    demoRow.correct_answer,
    partialStudentAnswer,
    10
  );

  assert(gradeResultPartial.isCorrect === false, 'Partial credit attempt returns isCorrect = false');
  assert(gradeResultPartial.obtainedMarks === 9.4, `Partial credit returns 9.4 / 10 marks (obtained: ${gradeResultPartial.obtainedMarks})`);
  const sq1Result = gradeResultPartial.subResults.find((s) => s.id === 'sq1');
  assert(sq1Result?.earnedCore === 1.4, 'Core answer awarded 1.4 / 1.4 (70%)');
  assert(sq1Result?.earnedEvidence === 0, 'Wrong evidence awarded 0 / 0.6 (30%)');

  // TEST 4: Snapshot Generation & Answer Scrubbing for SIMULATOR
  console.log('\n--- Test Suite 4: Simulator Snapshot Scrubbing ---');
  const { clientSnapshot: simSnap } = createSnapshotPair(demoRow, ExamMode.SIMULATOR, 1);

  assert(simSnap.correctAnswer === undefined, 'Simulator snapshot strictly omits correctAnswer');
  assert(simSnap.explanation === undefined, 'Simulator snapshot strictly omits explanation');

  const simContent = simSnap.content as any;
  assert(simContent.passage !== undefined, 'Simulator snapshot contains reading passage text');
  assert(Array.isArray(simContent.subQuestions), 'Simulator snapshot contains subQuestions array');

  let hasLeakedAnswer = false;
  let hasLeakedHint = false;

  for (const sq of simContent.subQuestions) {
    if (sq.correctOptionId || sq.correctValue || sq.acceptableAnswers) {
      hasLeakedAnswer = true;
    }
    if (sq.hints || sq.explanation) {
      hasLeakedHint = true;
    }
    if (sq.evidence) {
      if (sq.evidence.targetParagraphId || sq.evidence.acceptedSentenceIds) {
        hasLeakedAnswer = true;
      }
    }
  }

  assert(!hasLeakedAnswer, 'ZERO answer keys or evidence targets leaked in Simulator subQuestions');
  assert(!hasLeakedHint, 'ZERO hints or explanations leaked in Simulator subQuestions');

  // TEST 5: Training Mode Snapshot
  console.log('\n--- Test Suite 5: Training Mode Snapshot ---');
  const { clientSnapshot: trainSnap } = createSnapshotPair(demoRow, ExamMode.TRAINING, 1);
  assert(trainSnap.correctAnswer !== undefined, 'Training snapshot includes correctAnswer');
  assert((trainSnap.content as any).vocabulary !== undefined, 'Training snapshot includes vocabulary gloss');

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('Fatal error during Contract 3 verification:', err);
  process.exit(1);
});
