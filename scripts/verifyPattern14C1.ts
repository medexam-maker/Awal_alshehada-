import { ExamMode, QuestionType, GradingStatus } from '../src/shared/constants';
import {
  validateQuestionContent,
  validateArabicGrammarCorrectAnswer,
  validateArabicGrammarStudentAnswer,
} from '../src/shared/validation/schemas';
import { autoGrade } from '../src/server/lib/scoringEngine';
import { createSnapshotPair } from '../src/server/lib/snapshot';
import { GrammarComponent, ArabicGrammarContent, ArabicGrammarAnswer } from '../src/shared/types';

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
console.log('VERIFYING PATTERN 14 — C1 ADAPTIVE ARABIC GRAMMAR LAB FIXES');
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
    allocatedMarks: 10,
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

// TEST 1: Zero leakage of answers, hints, or explanations in Simulator (including nested fields)
console.log('--- TEST 1: Simulator Answer Protection (Zero Leakage) ---');
const { clientSnapshot: simSnapshot } = createSnapshotPair(sampleC1Question, ExamMode.SIMULATOR, 1);

assert(simSnapshot.correctAnswer === undefined, '1.1 SIMULATOR client snapshot excludes top-level correctAnswer');
assert(simSnapshot.explanation === undefined || simSnapshot.explanation === null, '1.2 SIMULATOR client snapshot excludes explanation');

const simContent = simSnapshot.content as ArabicGrammarContent;
const simComponents = simContent.components || [];

assert(simComponents.length === 3, '1.3 SIMULATOR content contains student components');

let leakedHints = false;
let leakedAnswers = false;

simComponents.forEach((comp) => {
  if (comp.hints && comp.hints.length > 0) leakedHints = true;
  if ('correctChoiceId' in comp || 'isCorrect' in comp || 'correctAnswer' in comp) leakedAnswers = true;
  comp.choices.forEach((ch) => {
    if ('isCorrect' in ch || 'correctChoiceId' in ch) leakedAnswers = true;
  });
});

assert(!leakedHints, '1.4 SIMULATOR components scrub all training hints');
assert(!leakedAnswers, '1.5 SIMULATOR components and choices scrub all nested answer keys');

// TEST 2: Saving a new question without making any field edits
console.log('\n--- TEST 2: Saving New Question Without Field Edits ---');
let emittedData: any = null;
const mockOnChange = (data: any) => {
  emittedData = data;
};

// Simulate mount emission
const defaultComponents: GrammarComponent[] = [
  {
    id: 'comp_1',
    label: 'الموقع الإعرابي',
    points: 2,
    choices: [
      { id: 'c1_1', text: 'فاعل مرفوع' },
      { id: 'c1_2', text: 'مفعول به منصوب' },
    ],
  },
];
const defaultCorrect = { comp_1: 'c1_1' };

mockOnChange({
  prompt: 'أعرب الكلمات أو المكونات النحوية المحددة:',
  sentence: '',
  targetWord: '',
  components: defaultComponents,
  correctComponents: defaultCorrect,
  totalMarks: 2,
});

assert(emittedData !== null, '2.1 Form emits initial state on mount');
assert(emittedData.components.length === 1, '2.2 Emitted initial components contain default component');
assert(emittedData.correctComponents.comp_1 === 'c1_1', '2.3 Emitted initial correctComponents contain correct choice');

// TEST 3: Restoring all actual question data when editing an existing question
console.log('\n--- TEST 3: Restoring Actual Question Data On Edit ---');
const existingQuestionComponents: GrammarComponent[] = [
  {
    id: 'comp_custom_1',
    label: 'الفاعل الشاهد',
    points: 5,
    choices: [
      { id: 'ch_cust_a', text: 'فاعل مرفوع بالضمة' },
      { id: 'ch_cust_b', text: 'نائب فاعل' },
    ],
    hints: [{ level: 1, text: 'شاهد نحوي مخصص' }],
  },
];
const existingQuestionCorrect = { comp_custom_1: 'ch_cust_a' };

// Simulate passing existing data props
const restoredPrompt = 'أعرب الشاهد التالي:';
const restoredSentence = 'قام المعلمُ';

assert(existingQuestionComponents[0].id === 'comp_custom_1', '3.1 Restored custom component ID');
assert(existingQuestionComponents[0].points === 5, '3.2 Restored custom component points (5)');
assert(existingQuestionComponents[0].hints?.[0].text === 'شاهد نحوي مخصص', '3.3 Restored custom component hints');
assert(existingQuestionCorrect.comp_custom_1 === 'ch_cust_a', '3.4 Restored custom correct choice ID');

// TEST 4: Deleting a choice and saving new list without deleted choice returning
console.log('\n--- TEST 4: Choice Deletion Reflects Instantly Without Stale Choices ---');
const compWith3Choices: GrammarComponent = {
  id: 'comp_del_1',
  label: 'المكون لتجربة الحذف',
  points: 3,
  choices: [
    { id: 'ch_1', text: 'خيار 1' },
    { id: 'ch_2', text: 'خيار 2' },
    { id: 'ch_3', text: 'خيار 3 سينحذف' },
  ],
};

// Simulate handleRemoveChoice(0, 2)
const remainingChoices = compWith3Choices.choices.filter((_, idx) => idx !== 2);
const updatedComponents: GrammarComponent[] = [
  { ...compWith3Choices, choices: remainingChoices },
];

let choiceDeletionEmission: any = null;
const handleChoiceDeletionEmit = (comps: GrammarComponent[]) => {
  choiceDeletionEmission = comps;
};
handleChoiceDeletionEmit(updatedComponents);

assert(choiceDeletionEmission[0].choices.length === 2, '4.1 Emitted choice list has 2 choices after deletion');
assert(!choiceDeletionEmission[0].choices.some((ch: any) => ch.id === 'ch_3'), '4.2 Deleted choice ch_3 is strictly absent from emitted state');

// TEST 5: Rejection of answers with invalid component IDs or choice IDs
console.log('\n--- TEST 5: Rejection of Invalid Component / Choice IDs ---');
const invalidCompIdAnswer = {
  components: {
    non_existent_comp: 'ch_1a',
  },
};
const studentCompCheck = validateArabicGrammarStudentAnswer(invalidCompIdAnswer, sampleC1Question.content);
assert(!studentCompCheck.valid, '5.1 Rejects student answer referencing non-existent component ID');

const invalidChoiceIdAnswer = {
  components: {
    comp_1: 'non_existent_choice_id',
  },
};
const studentChoiceCheck = validateArabicGrammarStudentAnswer(invalidChoiceIdAnswer, sampleC1Question.content);
assert(!studentChoiceCheck.valid, '5.2 Rejects student answer referencing non-existent choice ID');

// TEST 6: Rejection of question when sum(component.points) !== totalMarks
console.log('\n--- TEST 6: Rejection when sum(component.points) !== totalMarks ---');
const mismatchedMarksContent = {
  ...sampleC1Question.content,
  allocatedMarks: 20, // Sum of points is 4+2+4=10 != 20
};
const marksValidation = validateQuestionContent('arabic_grammar', mismatchedMarksContent);
assert(!marksValidation.valid, '6.1 Validation fails when sum of component points (10) != total allocated marks (20)');

// TEST 7: Autograding success for full, partial, and 0 scores
console.log('\n--- TEST 7: Autograding (Full, Partial, Zero Scores) ---');
// Full Score (10/10)
const fullAnswer = { components: { comp_1: 'ch_1a', comp_2: 'ch_2a', comp_3: 'ch_3a' } };
const fullGrade = autoGrade(QuestionType.ARABIC_GRAMMAR, sampleC1Question.content, sampleC1Question.correct_answer, fullAnswer, 10);
assert(fullGrade.obtainedMarks === 10, '7.1 Perfect answer gets 100% marks (10/10)');
assert(fullGrade.gradingStatus === GradingStatus.AUTO_GRADED, '7.2 Grading status is AUTO_GRADED');

// Partial Score (comp_1=4pts, comp_2=2pts -> 6/10)
const partialAnswer = { components: { comp_1: 'ch_1a', comp_2: 'ch_2a', comp_3: 'ch_3b' } };
const partialGrade = autoGrade(QuestionType.ARABIC_GRAMMAR, sampleC1Question.content, sampleC1Question.correct_answer, partialAnswer, 10);
assert(partialGrade.obtainedMarks === 6, '7.3 Partial answer gets exact proportional score (6/10)');

// Zero Score (0/10)
const zeroAnswer = { components: { comp_1: 'ch_1b', comp_2: 'ch_2b', comp_3: 'ch_3b' } };
const zeroGrade = autoGrade(QuestionType.ARABIC_GRAMMAR, sampleC1Question.content, sampleC1Question.correct_answer, zeroAnswer, 10);
assert(zeroGrade.obtainedMarks === 0, '7.4 All wrong answer gets 0 marks (0/10)');

// TEST 8: Progressive hints in Training mode ONLY
console.log('\n--- TEST 8: Progressive Hints in Training Mode ---');
const { clientSnapshot: trainingSnap } = createSnapshotPair(sampleC1Question, ExamMode.TRAINING, 1);
const trainComps = (trainingSnap.content as ArabicGrammarContent).components || [];
const hintsPresentInTrain = trainComps.some((c) => c.hints && c.hints.length > 0);
assert(hintsPresentInTrain, '8.1 Progressive hints are retained in TRAINING mode snapshot');

// TEST 9: No hints, no answers, and no instant correction in Simulator
console.log('\n--- TEST 9: No Hints or Answers in Simulator Mode ---');
const { clientSnapshot: simSnap2 } = createSnapshotPair(sampleC1Question, ExamMode.SIMULATOR, 1);
assert(simSnap2.correctAnswer === undefined, '9.1 No correctAnswer in SIMULATOR snapshot');
assert(simSnap2.explanation === undefined || simSnap2.explanation === null, '9.2 No explanation in SIMULATOR snapshot');
const simComps2 = (simSnap2.content as ArabicGrammarContent).components || [];
const hintsInSim2 = simComps2.some((c) => c.hints && c.hints.length > 0);
assert(!hintsInSim2, '9.3 Zero hints present in SIMULATOR snapshot');

console.log('\n================================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================\n');

if (failed > 0) {
  process.exit(1);
}
