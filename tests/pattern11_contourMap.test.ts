import assert from 'assert';
import { QuestionType } from '../src/shared/constants';
import { autoGrade, gradeContourMapQuestion, normalizeArabicContourText, calculatePolygonIoU } from '../src/server/lib/scoringEngine';

console.log('--- Running Pattern 11 (CONTOUR_MAP) Unit & Regression Tests ---');

// Test 1: Arabic Normalization for directions and terms
{
  console.log('Test 1: Normalization (Alef, Teh Marbuta, Diacritics, Direction Prefix)');
  const raw = 'مِنَ الشَّمَالِ الشَّرْقِيِّ إِلَى الجَنُوبِ الغَرْبِيِّ';
  const normalized = normalizeArabicContourText(raw);
  assert.ok(normalized.includes('شمال شرقي'));
  assert.ok(normalized.includes('جنوب غربي'));
  console.log('✓ Passed: Normalization');
}

// Test 2: Polygon IoU calculation
{
  console.log('Test 2: Polygon IoU Calculation');
  // Two identical squares
  const polyA: [number, number][] = [[10, 10], [50, 10], [50, 50], [10, 50]];
  const polyB: [number, number][] = [[10, 10], [50, 10], [50, 50], [10, 50]];
  const iouIdentical = calculatePolygonIoU(polyA, polyB);
  assert.ok(iouIdentical > 0.95, `Expected ~1.0, got ${iouIdentical}`);

  // Disjoint squares
  const polyDisjoint: [number, number][] = [[60, 60], [90, 60], [90, 90], [60, 90]];
  const iouDisjoint = calculatePolygonIoU(polyA, polyDisjoint);
  assert.strictEqual(iouDisjoint, 0);

  // Partially overlapping square
  const polyOverlap: [number, number][] = [[30, 30], [70, 30], [70, 70], [30, 70]];
  const iouPartial = calculatePolygonIoU(polyA, polyOverlap);
  assert.ok(iouPartial > 0.1 && iouPartial < 0.6, `Expected partial IoU, got ${iouPartial}`);
  console.log('✓ Passed: Polygon IoU Calculation');
}

// Test 3: Legacy Question (MAP_SUDAN_CONTOUR_01) without inputType
{
  console.log('Test 3: Legacy question backward-compatibility autograding');
  const content = {
    mapCode: 'MAP_SUDAN_CONTOUR_01',
    prompt: 'من خلال الخريطة الكنتورية المرفقة، حدد اتجاه انحدار الوادي وقيمة الفاصل الكنتوري:',
    questions: [
      { id: 'cm_1', text: 'ما هي قيمة الفاصل الكنتوري؟', correctValue: '20 متر' },
      { id: 'cm_2', text: 'ما هو الاتجاه العام لانحدار الوادي؟', correctValue: 'من الشمال الشرقي إلى الجنوب الغربي' }
    ]
  };
  const correctAnswer = {
    subAnswers: {
      cm_1: '20 متر',
      cm_2: 'من الشمال الشرقي إلى الجنوب الغربي'
    }
  };
  const studentAnswer = {
    subAnswers: {
      cm_1: '20 متر',
      cm_2: 'جنوب غربي'
    }
  };

  const outcome = autoGrade(QuestionType.CONTOUR_MAP, content, correctAnswer, studentAnswer, 8);
  assert.ok(outcome.obtainedMarks > 0, 'Legacy question should NOT get zero marks anymore!');
  assert.strictEqual(outcome.obtainedMarks, 8, `Expected 8 marks, got ${outcome.obtainedMarks}`);
  console.log('✓ Passed: Legacy question backwards-compatibility');
}

// Test 4: New 4-Branch Question (Sudanese Certificate Model: numeric, direction8, mapOverlay, direction8)
{
  console.log('Test 4: Sudanese National Certificate 4-Branch Model');
  const content = {
    mapCode: 'MAP_SUDAN_CONTOUR_01',
    prompt: 'أجب عن الفروع الأربعة التالية:',
    subQuestions: [
      {
        id: 'cm_1',
        question: 'ما هي قيمة الفاصل الكنتوري؟',
        unit: 'متر',
        inputType: 'numeric',
        numericTolerance: 1
      },
      {
        id: 'cm_2',
        question: 'ما هو الاتجاه العام لجريان الخيران؟',
        inputType: 'direction8'
      },
      {
        id: 'cm_3',
        question: 'ظلل المنطقة التي يزيد ارتفاعها عن 1500م.',
        inputType: 'mapOverlay',
        overlayMatchThreshold: 0.7
      },
      {
        id: 'cm_4',
        question: 'ما هو اتجاه النقطة أ بالنسبة لب؟',
        inputType: 'direction8'
      }
    ]
  };

  const targetPolygon: [number, number][] = [
    [30, 20], [70, 20], [70, 60], [30, 60]
  ];

  const correctAnswer = {
    subAnswers: {
      cm_1: '20',
      cm_2: 'جنوب غربي',
      cm_3: { regions: [{ polygon: targetPolygon }] },
      cm_4: 'شمال شرقي'
    }
  };

  // Student answer:
  // cm_1: 21 (within tolerance 1 -> correct)
  // cm_2: 'نحو الجنوب الغربي' (direction8 match -> correct)
  // cm_3: targetPolygon (identical -> IoU ~1.0 >= 0.7 -> correct)
  // cm_4: 'شمال غربي' (wrong direction -> 0)
  const studentAnswer = {
    subAnswers: {
      cm_1: '21',
      cm_2: 'نحو الجنوب الغربي',
      cm_3: { polygon: targetPolygon },
      cm_4: 'شمال غربي'
    }
  };

  const detailed = gradeContourMapQuestion(content, correctAnswer, studentAnswer, 10);
  assert.strictEqual(detailed.subResults.length, 4);

  // Branch 1: numeric with tolerance
  assert.strictEqual(detailed.subResults[0].isCorrect, true);
  assert.strictEqual(detailed.subResults[0].earnedFraction, 1);

  // Branch 2: direction8
  assert.strictEqual(detailed.subResults[1].isCorrect, true);
  assert.strictEqual(detailed.subResults[1].earnedFraction, 1);

  // Branch 3: mapOverlay
  assert.strictEqual(detailed.subResults[2].isCorrect, true);
  assert.strictEqual(detailed.subResults[2].earnedFraction, 1);

  // Branch 4: direction8 (wrong)
  assert.strictEqual(detailed.subResults[3].isCorrect, false);
  assert.strictEqual(detailed.subResults[3].earnedFraction, 0);

  // 3 out of 4 correct -> 7.5 out of 10 marks
  assert.strictEqual(detailed.obtainedMarks, 7.5);
  assert.strictEqual(detailed.isCorrect, false);

  // AutoGrade wrapper test
  const autoGradeOutcome = autoGrade(QuestionType.CONTOUR_MAP, content, correctAnswer, studentAnswer, 10);
  assert.strictEqual(autoGradeOutcome.obtainedMarks, 7.5);

  console.log('✓ Passed: 4-Branch Model Autograding');
}

// Test 5: Landform Description branch (تل مخروطي) and Free text matching
{
  console.log('Test 5: Landform Description branch (تل مخروطي) with Arabic synonyms');
  const content = {
    mapCode: 'MAP_SUDAN_CONTOUR_01',
    prompt: 'اقرأ بيانات الخريطة الكنتورية ثم أجب:',
    subQuestions: [
      {
        id: 'cm_1',
        question: 'ما هي قيمة الفاصل الكنتوري الرأسي؟',
        inputType: 'numeric',
        unit: 'متر',
        numericTolerance: 1,
        hint: 'الفاصل الرأسي = (الفرق بين خطين رئيسيين متجاورين) ÷ (عدد الفواصل بينهما)'
      },
      {
        id: 'cm_2',
        question: 'ما هو الاتجاه العام لانحدار الوادي؟',
        inputType: 'direction8',
        options: ['جنوب غربي', 'شمال شرقي', 'جنوب شرقي', 'شمال غربي']
      },
      {
        id: 'cm_3',
        question: 'حدد وظلل منطقة التل المخروطي على الخريطة.',
        inputType: 'mapOverlay',
        overlayMatchThreshold: 0.6
      },
      {
        id: 'cm_4',
        question: 'صف الظاهرة التضاريسية التي تمثلها الخطوط الكنتورية المغلقة في القطاع الأوسط.',
        inputType: 'text',
        options: ['تل مخروطي', 'هضبة شديدة الانحدار', 'حافة جرف صخري', 'خانق نهري عميق']
      }
    ]
  };

  const targetPolygon: [number, number][] = [
    [35, 25], [65, 25], [70, 50], [50, 65], [30, 45]
  ];

  const correctAnswer = {
    subAnswers: {
      cm_1: '20',
      cm_2: 'جنوب غربي',
      cm_3: { regions: [{ polygon: targetPolygon }] },
      cm_4: 'تل مخروطي'
    }
  };

  const studentAnswer = {
    subAnswers: {
      cm_1: '20',
      cm_2: 'باتجاه الجنوب الغربي', // Normalized 8-direction match
      cm_3: { polygon: targetPolygon }, // Exact polygon match
      cm_4: 'التل المخروطي' // Text with definite article 'ال'
    }
  };

  const outcome = gradeContourMapQuestion(content, correctAnswer, studentAnswer, 10);
  assert.strictEqual(outcome.isCorrect, true);
  assert.strictEqual(outcome.obtainedMarks, 10);
  assert.strictEqual(outcome.subResults[3].isCorrect, true);
  console.log('✓ Passed: Landform Description & 4-branch full credit');
}

console.log('--- ALL PATTERN 11 CONTOUR MAP TESTS PASSED SUCCESSFULLY ---');
