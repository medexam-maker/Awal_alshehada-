import { ExamMode } from '../src/shared/constants';
import { validateQuestionContent, validateQuestionAnswer } from '../src/shared/validation/schemas';
import { autoGrade } from '../src/server/lib/scoringEngine';
import { createSnapshotPair } from '../src/server/lib/snapshot';
import { QuestionType, GradingStatus } from '../src/shared/constants';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('VERIFYING C1 — ADAPTIVE ARABIC GRAMMAR LAB (PATTERN 14)');
console.log('================================================================\n');

// Sample C1 Question Data
const sampleC1Question = {
  id: 'q_grammar_c1_001',
  subject_id: 'sub_arabic_01',
  question_type: QuestionType.ARABIC_GRAMMAR,
  primary_interaction_mode: 'select_from_preset_options',
  marks: 10,
  content: {
    prompt: 'أعرب الكلمتين المحددين في الجملة التالية:',
    passage: 'إنّ المعلمينَ مخلصونَ في رسالتهم',
    sentence: 'إنّ المعلمينَ مخلصونَ في رسالتهم',
    targetWord: 'المعلمينَ - مخلصونَ',
    components: [
      {
        id: 'comp_1',
        label: 'الموقع الإعرابي لـ (المعلمينَ)',
        points: 4,
        choices: [
          { id: 'ch_1a', text: 'اسم إنّ منصوب' },
          { id: 'ch_1b', text: 'خبر إنّ مرفوع' },
          { id: 'ch_1c', text: 'فاعل مرفوع' },
        ],
        hints: [
          { level: 1, text: 'لاحظ أن الحرف المنسوخ (إنّ) يدخل على الجملة الاسمية.' },
        ],
      },
      {
        id: 'comp_2',
        label: 'علامة الإعراب لـ (المعلمينَ)',
        points: 2,
        choices: [
          { id: 'ch_2a', text: 'الياء لأنه جمع مذكر سالم' },
          { id: 'ch_2b', text: 'الفتحة الظاهرة' },
          { id: 'ch_2c', text: 'الكسرة' },
        ],
        hints: [
          { level: 1, text: 'الكلمة تدل على جمع مذكر سالم.' },
        ],
      },
      {
        id: 'comp_3',
        label: 'الموقع الإعرابي لـ (مخلصونَ)',
        points: 4,
        choices: [
          { id: 'ch_3a', text: 'خبر إنّ مرفوع' },
          { id: 'ch_3b', text: 'نعت مرفوع' },
          { id: 'ch_3c', text: 'حال منصوب' },
        ],
      },
    ],
  },
  correct_answer: {
    components: {
      comp_1: 'ch_1a',
      comp_2: 'ch_2a',
      comp_3: 'ch_3a',
    },
  },
  explanation: 'إنّ تنصب المبتدأ وتسمى اسم إنّ، وترفع الخبر ويسمى خبر إنّ.',
};

// 1. Schema Validation Tests
console.log('--- 1. Schema Validation Tests ---');

const validRes = validateQuestionContent('arabic_grammar', sampleC1Question.content);
assert(validRes.valid, 'Valid C1 question content passes schema validation');

const invalidDupComp = {
  ...sampleC1Question.content,
  components: [
    { id: 'comp_1', label: 'Comp 1', points: 1, choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }] },
    { id: 'comp_1', label: 'Comp 1 Duplicate', points: 1, choices: [{ id: 'x', text: 'X' }, { id: 'y', text: 'Y' }] },
  ],
};
const dupCompRes = validateQuestionContent('arabic_grammar', invalidDupComp);
assert(!dupCompRes.valid, 'Validation rejects duplicate component IDs');

const invalidDupChoice = {
  ...sampleC1Question.content,
  components: [
    {
      id: 'comp_1',
      label: 'Comp 1',
      points: 1,
      choices: [
        { id: 'ch_1', text: 'Choice 1' },
        { id: 'ch_1', text: 'Duplicate Choice 1' },
      ],
    },
  ],
};
const dupChoiceRes = validateQuestionContent('arabic_grammar', invalidDupChoice);
assert(!dupChoiceRes.valid, 'Validation rejects duplicate choice IDs within component');

// Backward compatibility check
const legacyQuestion = {
  prompt: 'أعرب الكلمة الملونة',
  sentence: 'حضر المعلم',
  targetWord: 'المعلم',
  words: [{ id: 'w1', text: 'المعلم' }],
  mode: 'irab',
};
const legacyRes = validateQuestionContent('arabic_grammar', legacyQuestion);
assert(legacyRes.valid, 'Legacy word-based question content passes schema validation');

// 2. Snapshot Integrity & Secrecy Tests
console.log('\n--- 2. Snapshot Integrity & Secrecy Tests ---');

const { dbSnapshot, clientSnapshot: simSnapshot } = createSnapshotPair(
  sampleC1Question,
  ExamMode.SIMULATOR,
  1
);

assert(simSnapshot.correctAnswer === undefined, 'SIMULATOR client snapshot excludes correctAnswer');
assert(simSnapshot.explanation === undefined || simSnapshot.explanation === null, 'SIMULATOR client snapshot excludes explanation');

const simComponents = (simSnapshot.content as any)?.components;
assert(Array.isArray(simComponents) && simComponents.length === 3, 'SIMULATOR snapshot includes components array');

const hasHintsInSim = simComponents?.some((c: any) => c.hints && c.hints.length > 0);
assert(!hasHintsInSim, 'SIMULATOR snapshot scrubs training hints to prevent leak');

const { clientSnapshot: trainSnapshot } = createSnapshotPair(
  sampleC1Question,
  ExamMode.TRAINING,
  1
);

assert(trainSnapshot.correctAnswer !== undefined, 'TRAINING client snapshot includes correctAnswer');
const trainComponents = (trainSnapshot.content as any)?.components;
const hasHintsInTrain = trainComponents?.some((c: any) => c.hints && c.hints.length > 0);
assert(hasHintsInTrain, 'TRAINING snapshot retains progressive hints for learning');

// 3. Autograding Tests
console.log('\n--- 3. Autograding Tests ---');

// Perfect Answer
const perfectStudentAnswer = {
  components: {
    comp_1: 'ch_1a',
    comp_2: 'ch_2a',
    comp_3: 'ch_3a',
  },
};
const perfectResult = autoGrade(
  QuestionType.ARABIC_GRAMMAR,
  sampleC1Question.content,
  sampleC1Question.correct_answer,
  perfectStudentAnswer,
  10
);
assert(perfectResult.obtainedMarks === 10, 'Perfect student answer gets 100% marks (10/10)');
assert(perfectResult.gradingStatus === GradingStatus.AUTO_GRADED, 'Grading status is AUTO_GRADED');

// Partial Answer (comp_1=4pts, comp_2=2pts correct -> 6/10 pts)
const partialStudentAnswer = {
  components: {
    comp_1: 'ch_1a', // correct (4 pts)
    comp_2: 'ch_2a', // correct (2 pts)
    comp_3: 'ch_3b', // wrong (0 pts)
  },
};
const partialResult = autoGrade(
  QuestionType.ARABIC_GRAMMAR,
  sampleC1Question.content,
  sampleC1Question.correct_answer,
  partialStudentAnswer,
  10
);
assert(partialResult.obtainedMarks === 6, 'Partial student answer gets proportional marks (6/10)');

// All Wrong Answer
const wrongStudentAnswer = {
  components: {
    comp_1: 'ch_1b',
    comp_2: 'ch_2b',
    comp_3: 'ch_3b',
  },
};
const wrongResult = autoGrade(
  QuestionType.ARABIC_GRAMMAR,
  sampleC1Question.content,
  sampleC1Question.correct_answer,
  wrongStudentAnswer,
  10
);
assert(wrongResult.obtainedMarks === 0, 'All wrong student answer gets 0 marks');

// Legacy irab Autograding Compatibility
const legacyContent = {
  prompt: 'أعرب الكلمة',
  sentence: 'حضر المعلم',
  words: [{ id: 'w1', text: 'المعلم' }],
  mode: 'irab',
};
const legacyCorrect = { words: { w1: { irab: 'فاعل مرفوع' } } };
const legacyStudent = { words: { w1: { irab: 'فاعل مرفوع' } } };
const legacyGrade = autoGrade(
  QuestionType.ARABIC_GRAMMAR,
  legacyContent,
  legacyCorrect,
  legacyStudent,
  5
);
assert(legacyGrade.obtainedMarks === 5, 'Legacy irab autograding works seamlessly');

console.log('\n================================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
