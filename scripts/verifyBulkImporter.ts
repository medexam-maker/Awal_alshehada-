import { QUESTION_TYPE_REGISTRY } from '../src/shared/questionTypeRegistry';
import { QuestionType } from '../src/shared/constants';
import { validateQuestionContent, ContentSchemas } from '../src/shared/validation/schemas';

async function runBulkImporterTests() {
  console.log('--- [فحص المرحلة 0 و 1]: customValidator Hook في السجل ---');

  // Test 1: Registry entry for fill_blank has customValidator
  const fillBlankEntry = QUESTION_TYPE_REGISTRY[QuestionType.FILL_BLANK];
  if (!fillBlankEntry.customValidator) {
    throw new Error('FAIL: fill_blank entry does not have customValidator');
  }
  console.log('✅ [PASS] 1. fill_blank entry has customValidator hook');

  // Test 2: Valid fill_blank answer with valid content passes customValidator
  const validFillBlankContent = {
    textWithBlanks: 'عاصمة السودان هي [blank_1]',
    blanks: [{ id: 'blank_1', correctValue: 'الخرطوم', choices: ['الخرطوم', 'أم درمان', 'بحري'] }],
  };
  const validAnswer = {
    answers: { blank_1: 'الخرطوم' },
  };
  const validRes = fillBlankEntry.customValidator(validFillBlankContent, validAnswer, 'simulator');
  if (!validRes.valid) {
    throw new Error(`FAIL: Valid fill_blank rejected: ${JSON.stringify(validRes.errors)}`);
  }
  console.log('✅ [PASS] 2. valid fill_blank passes customValidator');

  // Test 3: Invalid fill_blank answer (missing answers object) rejected by customValidator
  const invalidAnswer = 'الخرطوم';
  const invalidRes = fillBlankEntry.customValidator(validFillBlankContent, invalidAnswer, 'simulator');
  if (invalidRes.valid) {
    throw new Error('FAIL: Invalid fill_blank answer was accepted by customValidator');
  }
  console.log('✅ [PASS] 3. invalid fill_blank rejected by customValidator');

  // Test 4: Multiple choice and True/False do NOT have customValidator
  const mcqEntry = QUESTION_TYPE_REGISTRY[QuestionType.MULTIPLE_CHOICE];
  const tfEntry = QUESTION_TYPE_REGISTRY[QuestionType.TRUE_FALSE];
  if (mcqEntry.customValidator !== undefined || tfEntry.customValidator !== undefined) {
    throw new Error('FAIL: MCQ or True/False should not have customValidator');
  }
  console.log('✅ [PASS] 4. MCQ and True/False do not have customValidator (rely on canonical validators)');

  console.log('\n--- [فحص المرحلة 4]: معالجة حزمة الأسئلة المتعددة ---');
  // Test 5: Verify content schema validation on all 3 sample questions
  const sampleBatch = [
    {
      questionType: 'fill_blank',
      content: validFillBlankContent,
      correctAnswer: validAnswer,
    },
    {
      questionType: 'multiple_choice',
      content: { prompt: 'سؤال اختيار', options: [{ id: 'opt1', text: 'أ' }, { id: 'opt2', text: 'ب' }] },
      correctAnswer: { selectedOptionId: 'opt1' },
    },
    {
      questionType: 'true_false',
      content: { prompt: 'سؤال صح وخطأ', statement: 'العبارة صحيحة' },
      correctAnswer: { value: true },
    },
  ];

  for (let i = 0; i < sampleBatch.length; i++) {
    const q = sampleBatch[i];
    const val = validateQuestionContent(q.questionType as keyof typeof ContentSchemas, q.content);
    if (!val.valid) {
      throw new Error(`FAIL: Sample question ${i} failed content validation`);
    }
  }
  console.log('✅ [PASS] 5. All sample questions in bulk batch pass ContentSchemas');

  console.log('\nAll bulk importer verification tests passed successfully.');
}

runBulkImporterTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
