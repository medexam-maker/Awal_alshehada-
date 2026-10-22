import { QuestionType, GradingStrategy } from './constants';
import { QuestionTypeRegistryEntry } from './types';
import { ContentSchemas, AnswerSchemas, validateFillBlankAnswer } from './validation/schemas';

export const QUESTION_TYPE_REGISTRY: Record<QuestionType, QuestionTypeRegistryEntry> = {
  [QuestionType.TRUE_FALSE]: {
    type: QuestionType.TRUE_FALSE,
    labelAr: 'صحيح / خطأ',
    labelEn: 'True / False',
    contentSchema: ContentSchemas.true_false,
    answerSchema: AnswerSchemas.true_false,
    allowedModes: ['toggle_cards'],
    defaultMode: 'toggle_cards',
    grading: GradingStrategy.AUTO,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: false,
    mediaRequired: false,
    validationRules: [
      { field: 'prompt', required: true, type: 'string' },
      { field: 'statement', required: true, type: 'string' }
    ]
  },
  [QuestionType.FILL_BLANK]: {
    type: QuestionType.FILL_BLANK,
    labelAr: 'ملء الفراغ',
    labelEn: 'Fill in the Blank',
    contentSchema: ContentSchemas.fill_blank,
    answerSchema: AnswerSchemas.fill_blank,
    allowedModes: ['tap_reveal_3', 'dropdown', 'drag_drop_wordbank', 'free_text_blank'],
    defaultMode: 'tap_reveal_3',
    grading: GradingStrategy.AUTO,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: false,
    mediaRequired: false,
    validationRules: [
      { field: 'textWithBlanks', required: true, type: 'string' },
      { field: 'blanks', required: true, type: 'array' }
    ],
    customValidator: (content, correctAnswer, examMode) =>
      validateFillBlankAnswer(correctAnswer, content, examMode),
  },
  [QuestionType.MULTIPLE_CHOICE]: {
    type: QuestionType.MULTIPLE_CHOICE,
    labelAr: 'اختيار من متعدد',
    labelEn: 'Multiple Choice',
    contentSchema: ContentSchemas.multiple_choice,
    answerSchema: AnswerSchemas.multiple_choice,
    allowedModes: ['large_cards', 'radio_list'],
    defaultMode: 'large_cards',
    grading: GradingStrategy.AUTO,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: false,
    mediaRequired: false,
    validationRules: [
      { field: 'prompt', required: true, type: 'string' },
      { field: 'options', required: true, type: 'array' }
    ]
  },
  [QuestionType.MATCHING]: {
    type: QuestionType.MATCHING,
    labelAr: 'مطابقة',
    labelEn: 'Matching',
    contentSchema: ContentSchemas.matching,
    answerSchema: AnswerSchemas.matching,
    allowedModes: ['tap_to_match', 'drag_drop', 'dropdown_per_item'],
    defaultMode: 'tap_to_match',
    grading: GradingStrategy.AUTO,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: false,
    mediaRequired: false,
    validationRules: [
      { field: 'listA', required: true, type: 'array' },
      { field: 'listB', required: true, type: 'array' }
    ]
  },
  [QuestionType.SHORT_ESSAY]: {
    type: QuestionType.SHORT_ESSAY,
    labelAr: 'إجابة مقالية قصيرة',
    labelEn: 'Short Essay',
    contentSchema: ContentSchemas.short_essay,
    answerSchema: AnswerSchemas.short_essay,
    allowedModes: ['free_text_box'],
    defaultMode: 'free_text_box',
    grading: GradingStrategy.MANUAL,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: true,
    mediaRequired: false,
    validationRules: [
      { field: 'prompt', required: true, type: 'string' }
    ]
  },
  [QuestionType.LONG_ESSAY]: {
    type: QuestionType.LONG_ESSAY,
    labelAr: 'إجابة مقالية طويلة',
    labelEn: 'Long Essay',
    contentSchema: ContentSchemas.long_essay,
    answerSchema: AnswerSchemas.long_essay,
    allowedModes: ['free_text_box_large'],
    defaultMode: 'free_text_box_large',
    grading: GradingStrategy.MANUAL,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: true,
    mediaRequired: false,
    validationRules: [
      { field: 'prompt', required: true, type: 'string' }
    ]
  },
  [QuestionType.EXPLAIN]: {
    type: QuestionType.EXPLAIN,
    labelAr: 'تعليل',
    labelEn: 'Explain / Justify',
    contentSchema: ContentSchemas.explain,
    answerSchema: AnswerSchemas.explain,
    allowedModes: ['free_text_box', 'select_reason_from_list'],
    defaultMode: 'free_text_box',
    grading: GradingStrategy.MIXED,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: true,
    mediaRequired: false,
    validationRules: [
      { field: 'prompt', required: true, type: 'string' }
    ]
  },
  [QuestionType.COMPARISON_TABLE]: {
    type: QuestionType.COMPARISON_TABLE,
    labelAr: 'إكمال جدول مقارنة',
    labelEn: 'Comparison Table Completion',
    contentSchema: ContentSchemas.comparison_table,
    answerSchema: AnswerSchemas.comparison_table,
    allowedModes: ['dropdown_per_cell', 'drag_cards_to_cells'],
    defaultMode: 'dropdown_per_cell',
    grading: GradingStrategy.AUTO,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: false,
    mediaRequired: false,
    validationRules: [
      { field: 'tableHeaders', required: true, type: 'array' },
      { field: 'rows', required: true, type: 'array' }
    ]
  },
  [QuestionType.ODD_ONE_OUT]: {
    type: QuestionType.ODD_ONE_OUT,
    labelAr: 'استخراج الشاذ',
    labelEn: 'Extract the Odd One Out',
    contentSchema: ContentSchemas.odd_one_out,
    answerSchema: AnswerSchemas.odd_one_out,
    allowedModes: ['tap_words'],
    defaultMode: 'tap_words',
    grading: GradingStrategy.AUTO,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: false,
    mediaRequired: false,
    validationRules: [
      { field: 'items', required: true, type: 'array' }
    ]
  },
  [QuestionType.DIAGRAM_LABELING]: {
    type: QuestionType.DIAGRAM_LABELING,
    labelAr: 'تسمية رسم بياني',
    labelEn: 'Diagram Labeling',
    contentSchema: ContentSchemas.diagram_labeling,
    answerSchema: AnswerSchemas.diagram_labeling,
    allowedModes: ['numbered_points_select', 'drag_labels_on_image'],
    defaultMode: 'numbered_points_select',
    grading: GradingStrategy.AUTO,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: false,
    mediaRequired: true,
    validationRules: [
      { field: 'diagram', required: true, type: 'object' },
      { field: 'labels', required: true, type: 'array' }
    ]
  },
  [QuestionType.CONTOUR_MAP]: {
    type: QuestionType.CONTOUR_MAP,
    labelAr: 'قراءة خريطة كنتورية',
    labelEn: 'Contour Map Reading',
    contentSchema: ContentSchemas.contour_map,
    answerSchema: AnswerSchemas.contour_map,
    allowedModes: ['map_with_subquestions', 'tap_on_hotspot'],
    defaultMode: 'map_with_subquestions',
    grading: GradingStrategy.MIXED,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: true,
    mediaRequired: true,
    validationRules: [
      { field: 'mapImage', required: true, type: 'object' },
      { field: 'subQuestions', required: true, type: 'array' }
    ]
  },
  [QuestionType.CALCULATION]: {
    type: QuestionType.CALCULATION,
    labelAr: 'مسألة حسابية',
    labelEn: 'Calculation / Word Problem',
    contentSchema: ContentSchemas.calculation,
    answerSchema: AnswerSchemas.calculation,
    allowedModes: ['numeric_with_work'],
    defaultMode: 'numeric_with_work',
    grading: GradingStrategy.AUTO,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: false,
    mediaRequired: false,
    validationRules: [
      { field: 'prompt', required: true, type: 'string' }
    ]
  },
  [QuestionType.ORDERING]: {
    type: QuestionType.ORDERING,
    labelAr: 'ترتيب',
    labelEn: 'Ordering',
    contentSchema: ContentSchemas.ordering,
    answerSchema: AnswerSchemas.ordering,
    allowedModes: ['move_up_down_arrows', 'drag_drop'],
    defaultMode: 'move_up_down_arrows',
    grading: GradingStrategy.AUTO,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: false,
    mediaRequired: false,
    validationRules: [
      { field: 'items', required: true, type: 'array' }
    ]
  },
  [QuestionType.ARABIC_GRAMMAR]: {
    type: QuestionType.ARABIC_GRAMMAR,
    labelAr: 'إعراب وتشكيل',
    labelEn: 'Arabic Grammar + Diacritics',
    contentSchema: ContentSchemas.arabic_grammar,
    answerSchema: AnswerSchemas.arabic_grammar,
    allowedModes: ['select_from_preset_options'],
    defaultMode: 'select_from_preset_options',
    grading: GradingStrategy.AUTO,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: false,
    mediaRequired: false,
    validationRules: [
      { field: 'mode', required: true, type: 'string' },
      { field: 'passage', required: true, type: 'string' },
      { field: 'words', required: true, type: 'array' }
    ]
  },
  [QuestionType.READING_COMPREHENSION]: {
    type: QuestionType.READING_COMPREHENSION,
    labelAr: 'استيعاب قرائي وتلخيص',
    labelEn: 'Reading Comprehension + Summary',
    contentSchema: ContentSchemas.reading_comprehension,
    answerSchema: AnswerSchemas.reading_comprehension,
    allowedModes: ['passage_with_questions_and_summary'],
    defaultMode: 'passage_with_questions_and_summary',
    grading: GradingStrategy.MIXED,
    trainingSupport: true,
    simulationSupport: true,
    manualGradingSupport: true,
    mediaRequired: false,
    validationRules: [
      { field: 'passage', required: true, type: 'string' },
      { field: 'subQuestions', required: true, type: 'array' }
    ]
  }
};
