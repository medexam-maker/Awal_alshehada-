import React, { useState, useMemo } from 'react';
import { TWELVE_CONTRACT_SUBJECTS, ContractSubject } from '../../data/contractSubjects';
import { curriculumStorage } from '../../storage/curriculumStorage';
import { SubjectExamBlueprint, QuestionPattern, AuthoredQuestion } from '../../types/curriculum';
import { QuestionType } from '../../../shared/constants';
import { apiClient } from '../../api/apiClient';
import { MatchingRenderer } from '../../components/questions/MatchingRenderer';
import { QuestionDispatcher } from '../../components/questions';
import { Pattern7AuthoringForm } from '../../components/admin/Pattern7AuthoringForm';
import { Pattern8AuthoringForm, Pattern8FormFields } from '../../components/admin/Pattern8AuthoringForm';
import { Pattern11AuthoringForm, Pattern11FormData } from '../../components/admin/Pattern11AuthoringForm';
import { Pattern14AuthoringForm } from '../../components/admin/Pattern14AuthoringForm';
import { DiagramAuthoringForm, DiagramFormData } from '../../components/admin/DiagramAuthoringForm';
import {
  Settings,
  PlusCircle,
  Save,
  RotateCcw,
  Trash2,
  Layers,
  BookOpen,
  Calendar,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Eye,
  FileText,
  Clock,
  ListPlus,
  ArrowRight,
  Sliders,
  RefreshCw,
  AlertTriangle,
  XCircle,
  FileCode,
  Check,
  Copy,
  Download,
  Edit3,
  Search,
  Filter,
  X,
} from 'lucide-react';

interface AdminDashboardProps {
  onBackToStudentView: () => void;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  [QuestionType.TRUE_FALSE]: '1. صح أو خطأ (True/False)',
  [QuestionType.MULTIPLE_CHOICE]: '2. اختيار من متعدد (Multiple Choice)',
  [QuestionType.FILL_BLANK]: '3. إكمال الفراغ (Fill in the Blank)',
  [QuestionType.MATCHING]: '4. المطابقة والتوصيل (Matching)',
  [QuestionType.SHORT_ESSAY]: '5. مقالي قصير (Short Essay - Pattern 8)',
  [QuestionType.LONG_ESSAY]: '6. مقالي طويل وإنشاء (Long Essay)',
  [QuestionType.EXPLAIN]: '7. علل وفسر (Explain/Reason)',
  [QuestionType.COMPARISON_TABLE]: '8. جدول مقارنة (Comparison Table)',
  [QuestionType.ODD_ONE_OUT]: '9. استخرج الكلمة الشاذة (Odd One Out)',
  [QuestionType.DIAGRAM_LABELING]: '10. تسمية أجزاء الرسم التوضيحي (Diagram Labeling)',
  [QuestionType.CONTOUR_MAP]: '11. خريطة كنتورية وتضاريس (Contour Map)',
  [QuestionType.CALCULATION]: '12. مسألة حسابية وقوانين (Calculation - Pattern 7)',
  [QuestionType.ORDERING]: '13. ترتيب تسلسلي وزمني (Ordering)',
  [QuestionType.ARABIC_GRAMMAR]: '14. إعراب وضبط نحوي (Arabic Grammar)',
  [QuestionType.READING_COMPREHENSION]: '15. قطعة وفهم واستيعاب (Reading Comprehension)',
};

const PATTERN_TEMPLATES: Record<string, string> = {
  [QuestionType.TRUE_FALSE]: JSON.stringify(
    [
      {
        questionType: 'true_false',
        prompt: 'تتحرك الكواكب حول الشمس في مدارات إهليلجية.',
        content: {
          statement: 'تتحرك الكواكب حول الشمس في مدارات إهليلجية.'
        },
        correctAnswer: {
          value: true
        },
        allocatedMarks: 5,
        explanationAr: 'قانون كبلر الأول ينص على أن مدارات الكواكب إهليلجية والشمس في إحدى البؤرتين.'
      }
    ],
    null,
    2
  ),
  [QuestionType.MULTIPLE_CHOICE]: JSON.stringify(
    [
      {
        questionType: 'multiple_choice',
        prompt: 'ما هي عاصمة جمهورية السودان؟',
        content: {
          options: [
            { id: 'opt1', text: 'الخرطوم' },
            { id: 'opt2', text: 'أم درمان' },
            { id: 'opt3', text: 'بورتسودان' },
            { id: 'opt4', text: 'الأبيض' }
          ]
        },
        correctAnswer: {
          selectedOptionId: 'opt1'
        },
        allocatedMarks: 5,
        explanationAr: 'تقع الخرطوم عند ملتقى النيلين الأزرق والأبيض وهي العاصمة الرسمية.'
      }
    ],
    null,
    2
  ),
  [QuestionType.FILL_BLANK]: JSON.stringify(
    [
      {
        questionType: 'fill_blank',
        prompt: 'أكمل الفراغ في الجملة التالية:',
        content: {
          textWithBlanks: 'عاصمة السودان هي [blank_1] وتشتهر بالنيلين',
          blanks: [
            {
              id: 'blank_1',
              correctValue: 'الخرطوم',
              choices: ['الخرطوم', 'أم درمان', 'بحري']
            }
          ]
        },
        correctAnswer: {
          answers: {
            blank_1: 'الخرطوم'
          }
        },
        allocatedMarks: 5,
        explanationAr: 'الإجابة الصحيحة هي الخرطوم.'
      }
    ],
    null,
    2
  ),
  [QuestionType.MATCHING]: JSON.stringify(
    [
      {
        questionType: 'matching',
        prompt: 'صل بين المصطلح العلمي والتعريف المناسب له:',
        content: {
          pairs: [
            { id: 'pair_1', source: 'السرعة', target: 'المعدل الزمني لتغير المسافة' },
            { id: 'pair_2', source: 'التسارع', target: 'المعدل الزمني لتغير السرعة' },
            { id: 'pair_3', source: 'القوة', target: 'مؤثر خارجي يغير الحالة الحركية للجسم' }
          ],
          distractors: [
            { id: 'dist_1', target: 'كمية مادة الجسم' }
          ],
          scoring_type: 'partial'
        },
        correctAnswer: {
          pairs: {
            pair_1: 'target_pair_1',
            pair_2: 'target_pair_2',
            pair_3: 'target_pair_3'
          }
        },
        allocatedMarks: 6,
        explanationAr: 'توصيل كل كمية فيزيائية بمتغيرها المنهجي.'
      }
    ],
    null,
    2
  ),
  [QuestionType.SHORT_ESSAY]: JSON.stringify(
    [
      {
        questionType: 'short_essay',
        prompt: 'علل: تسمية عام الفيل بهذا الاسم.',
        content: {
          question_text: 'علل: تسمية عام الفيل بهذا الاسم.',
          model_answer: 'بسبب محاولة أبرهة الحبشي هدم الكعبة المشرفة باستخدام جيش يتقدمه الفيل',
          mandatory_keywords: ['أبرهة', 'هدم الكعبة', 'الفيل'],
          hint: 'تذكر محاولة أبرهة وجيشه',
          max_words: 30,
          grading_mode: 'auto',
          partial_threshold: 0.5
        },
        correctAnswer: {
          model_answer: 'بسبب محاولة أبرهة الحبشي هدم الكعبة المشرفة باستخدام جيش يتقدمه الفيل',
          mandatory_keywords: ['أبرهة', 'هدم الكعبة', 'الفيل']
        },
        allocatedMarks: 5,
        explanationAr: 'يجب ذكر محاولة أبرهة الكنسية وهدم البيت الحرام بالفيل.'
      }
    ],
    null,
    2
  ),
  [QuestionType.LONG_ESSAY]: JSON.stringify(
    [
      {
        questionType: 'long_essay',
        prompt: 'اكتب مقالاً مفصلاً عن أسباب وآثار الثورة الصناعية في أوروبا.',
        content: {
          instructions: 'اكتب مقالاً متكاملاً يحتوي على مقدمة وعرض وعنصرين أساسيين على الأقل للأسباب والنتائج.'
        },
        correctAnswer: {
          model_answer: 'المناخ السياسي المستقر، اكتشاف الآلة البخارية، وفرة الفحم والحديد، نمو التبادل التجاري وتغير البنية الاجتماعية.'
        },
        allocatedMarks: 15,
        explanationAr: 'يراعى التسلسل التاريخي والسلامة اللغوية والأفكار الأساسية.'
      }
    ],
    null,
    2
  ),
  [QuestionType.EXPLAIN]: JSON.stringify(
    [
      {
        questionType: 'explain',
        prompt: 'علل: يطفو الجليد على سطح الماء.',
        content: {
          targetPhenomenon: 'طفو الجليد فوق الماء السائل',
          reasonOptions: [
            { id: 'r1', text: 'لأن كثافة الجليد أقل من كثافة الماء السائل' },
            { id: 'r2', text: 'لأن الجليد أبرد من الماء' },
            { id: 'r3', text: 'لأن الروابط الهيدروجينية تباعد الجزيئات في البلورة' },
            { id: 'r4', text: 'لأن الجليد أثقل وزناً' }
          ]
        },
        correctAnswer: {
          selectedReasonIds: ['r1', 'r3']
        },
        allocatedMarks: 5,
        explanationAr: 'شذوذ الماء وتمدد الحجم عند التجمد بسبب الروابط الهيدروجينية.'
      },
      {
        questionType: 'explain',
        prompt: 'علل: عدم انطفاء النار في أواني الضغط المغلقة.',
        content: {
          correctSequence: ['لأن', 'الضغط', 'المرتفع', 'يحافظ', 'على', 'درجة', 'الحرارة'],
          distractorWords: ['المنخفض', 'البرودة']
        },
        correctAnswer: {
          sequence: ['لأن', 'الضغط', 'المرتفع', 'يحافظ', 'على', 'درجة', 'الحرارة']
        },
        allocatedMarks: 5,
        explanationAr: 'تأثير الضغط المغلق على غليان السوائل.'
      }
    ],
    null,
    2
  ),
  [QuestionType.COMPARISON_TABLE]: JSON.stringify(
    [
      {
        questionType: 'comparison_table',
        prompt: 'قارن بين الإقليم الصحراوي وإقليم السافانا الغنية وفق المعايير الموضحة بالجدول:',
        content: {
          tableHeaders: ['الصحراوي', 'السافانا الغنية'],
          rows: [
            {
              id: 'r1',
              label: 'كمية الأمطار السنوية',
              cells: [
                {
                  id: 'c11',
                  value: null,
                  options: [
                    { id: 'c11_opt1', text: 'نادرة وأقل من 100 ملم' },
                    { id: 'c11_opt2', text: 'متوسطة بين 300 و500 ملم' },
                    { id: 'c11_opt3', text: 'غزيرة تفوق 800 ملم' }
                  ]
                },
                {
                  id: 'c12',
                  value: null,
                  options: [
                    { id: 'c12_opt1', text: 'غزيرة تفوق 700 ملم' },
                    { id: 'c12_opt2', text: 'جافة ونادرة' },
                    { id: 'c12_opt3', text: 'أمطار شتوية إعصارية' }
                  ]
                }
              ]
            },
            {
              id: 'r2',
              label: 'الغطاء النباتي السائد',
              cells: [
                {
                  id: 'c21',
                  value: null,
                  options: [
                    { id: 'c21_opt1', text: 'شجيرات شوكية ونباتات عصيرية' },
                    { id: 'c21_opt2', text: 'غابات كثيفة دائمة الخضرة' },
                    { id: 'c21_opt3', text: 'حشائش استبس قصيرة كثيفة' }
                  ]
                },
                {
                  id: 'c22',
                  value: null,
                  options: [
                    { id: 'c22_opt1', text: 'حشائش طويلة وأشجار متباعدة' },
                    { id: 'c22_opt2', text: 'نباتات عصيرية نادرة' },
                    { id: 'c22_opt3', text: 'أشجار البلوط والصنوبر' }
                  ]
                }
              ]
            }
          ]
        },
        correctAnswer: {
          cells: {
            c11: 'c11_opt1',
            c12: 'c12_opt1',
            c21: 'c21_opt1',
            c22: 'c22_opt1'
          }
        },
        allocatedMarks: 4,
        explanationAr: 'مقارنة دقيقة للخصائص المناخية والنباتية وفق مقرر الجغرافيا.'
      }
    ],
    null,
    2
  ),
  [QuestionType.ODD_ONE_OUT]: JSON.stringify(
    [
      {
        questionType: 'odd_one_out',
        prompt: 'استخرج الكلمة الشاذة من بين الأدوات والمكونات البصرية التالية ثم علّل اختيارك:',
        content: {
          items: [
            { id: 'i1', text: 'التلسكوب' },
            { id: 'i2', text: 'العدسة المحدبة' },
            { id: 'i3', text: 'المرآة المستوية' },
            { id: 'i4', text: 'العدسة المقعرة' }
          ],
          reasoning: {
            prompt: 'علل سبب استبعادك لهذه الكلمة:',
            marksFraction: 0.5,
            trainingChoices: [
              { id: 'r1', text: 'لأنه جهاز بصري مركب من عدة أجزاء بينما البقية عناصر بصرية منفردة' },
              { id: 'r2', text: 'لأنه أداة فلكية لا تستخدم في المعامل الفيزيائية' },
              { id: 'r3', text: 'لأنه يعتمد على المرايا المقعرة فقط في تجميع الضوء' }
            ]
          }
        },
        correctAnswer: {
          selectedItemIds: ['i1'],
          reasoning: {
            correctChoiceId: 'r1',
            keywordGroups: [
              ['جهاز', 'اداة'],
              ['مركب', 'مركبة', 'عدة'],
              ['بصرية']
            ],
            minGroups: 2
          }
        },
        allocatedMarks: 4,
        explanationAr: 'التلسكوب جهاز بصري مركب، بينما بقية الأدوات قطع بصرية مفردة.'
      }
    ],
    null,
    2
  ),
  [QuestionType.DIAGRAM_LABELING]: JSON.stringify(
    [
      {
        questionType: 'diagram_labeling',
        prompt: 'اكتب المسمى العلمي المقابل للأرقام الموضحة على رسم الخلية:',
        content: {
          imageUrl: '/assets/diagrams/cell_structure.png',
          labels: [
            { id: 'label_1', number: 1, correctText: 'النواة' },
            { id: 'label_2', number: 2, correctText: 'الميتوكندريا' },
            { id: 'label_3', number: 3, correctText: 'الغشاء الخلوي' }
          ]
        },
        correctAnswer: {
          label_1: 'النواة',
          label_2: 'الميتوكندريا',
          label_3: 'الغشاء الخلوي'
        },
        allocatedMarks: 6,
        explanationAr: 'تحديد العضيات الخلوية الأساسية على الرسم التوضيحي.'
      }
    ],
    null,
    2
  ),
  [QuestionType.CONTOUR_MAP]: JSON.stringify(
    [
      {
        questionType: 'contour_map',
        prompt: 'من خلال الخريطة الكنتورية المرفقة، حدد اتجاه انحدار الوادي وقيمة الفاصل الكنتوري:',
        content: {
          mapCode: 'MAP_SUDAN_CONTOUR_01',
          mapUrl: '/assets/maps/contour_01.png',
          subQuestions: [
            {
              id: 'cm_1',
              question: 'ما هي قيمة الفاصل الكنتوري؟',
              unit: 'متر',
              inputType: 'numeric',
              numericTolerance: 1,
              explanation: 'الفاصل الكنتوري هو الفرق في الارتفاع الرأسي بين خطي كنتور متتاليين.'
            },
            {
              id: 'cm_2',
              question: 'ما هو الاتجاه العام لانحدار الوادي؟',
              unit: '',
              inputType: 'direction8',
              explanation: 'ينحدر الوادي من المرتفعات في الشمال الشرقي باتجاه المنخفضات في الجنوب الغربي.'
            }
          ]
        },
        correctAnswer: {
          subAnswers: {
            cm_1: '20',
            cm_2: 'من الشمال الشرقي إلى الجنوب الغربي'
          }
        },
        allocatedMarks: 8,
        explanationAr: 'الفاصل الكنتوري يمثل الفرق بين خطي كنتور متتاليين.'
      }
    ],
    null,
    2
  ),
  [QuestionType.CALCULATION]: JSON.stringify(
    [
      {
        questionType: 'calculation',
        prompt: 'احسب القوة الكهرومغناطيسية المؤثرة على سلك مستقيم طوله 0.5m يحمل تياراً شدته 4A موضوع عمودياً في مجال مغناطيسي شدته 0.2T',
        content: {
          mode: 'multi_step_mcq',
          scenario: 'سلك موصل طوله L = 0.5m يحمل تياراً I = 4A موضوع في مجال مغناطيسي B = 0.2T',
          given_values: [
            { symbol: 'L', value: 0.5, unit: 'm' },
            { symbol: 'I', value: 4.0, unit: 'A' },
            { symbol: 'B', value: 0.2, unit: 'T' }
          ],
          constants: [],
          steps: [
            {
              step_id: 'step_1',
              step_order: 1,
              title: 'الخطوة 1: اختيار القانون المناسب',
              prompt: 'حدد القانون المباشر لحساب القوة F:',
              options: [
                { option_id: 's1_opt1', text: 'F = I · L · B · sin(θ)' },
                { option_id: 's1_opt2', text: 'F = I / (L · B)' },
                { option_id: 's1_opt3', text: 'F = B · L / I' }
              ]
            },
            {
              step_id: 'step_2',
              step_order: 2,
              title: 'الخطوة 2: التعويض والحساب النهائي',
              prompt: 'احسب قيمة القوة F بالنيوتن:',
              options: [
                { option_id: 's2_opt1', text: 'F = 0.4 N' },
                { option_id: 's2_opt2', text: 'F = 4.0 N' },
                { option_id: 's2_opt3', text: 'F = 1.0 N' }
              ]
            }
          ]
        },
        correctAnswer: {
          step_answers: {
            step_1: 's1_opt1',
            step_2: 's2_opt1'
          },
          conditional_credit_rules: [
            {
              rule_id: 'rule_1',
              target_step_id: 'step_2',
              awarded_option_id: 's2_opt2',
              prerequisite_step_id: 'step_1',
              prerequisite_option_id: 's1_opt2',
              credit_fraction: 0.5
            }
          ]
        },
        allocatedMarks: 10,
        explanationAr: 'F = I · L · B · sin(90°) = 4 · 0.5 · 0.2 · 1 = 0.4 N'
      }
    ],
    null,
    2
  ),
  [QuestionType.ORDERING]: JSON.stringify(
    [
      {
        questionType: 'ordering',
        prompt: 'رتب الأحداث التاريخية التالية من الأقدم إلى الأحدث:',
        content: {
          items: [
            { id: 's1', text: 'استقلال السودان عام 1956م' },
            { id: 's2', text: 'ثورة أكتوبر المجيدة 1964م' },
            { id: 's3', text: 'انتفاضة أبريل 1985م' }
          ],
          correctOrder: ['s1', 's2', 's3']
        },
        correctAnswer: {
          order: ['s1', 's2', 's3']
        },
        allocatedMarks: 6,
        explanationAr: 'الترتيب الزمني التاريخي لأحداث السودان الوطنية.'
      }
    ],
    null,
    2
  ),
  [QuestionType.ARABIC_GRAMMAR]: JSON.stringify(
    [
      {
        questionType: 'arabic_grammar',
        prompt: 'أعرب الكلمة الملونة في الجملة: إنّ المعلمينَ مخلصونَ في رسالتهم',
        content: {
          targetWord: 'مخلصونَ',
          fullSentence: 'إنّ المعلمينَ مخلصونَ في رسالتهم'
        },
        correctAnswer: 'خبر إنّ مرفوع وعلامة رفعه الواو لأنه جمع مذكر سالم',
        allocatedMarks: 5,
        explanationAr: 'إنّ تنصب المبتدأ وترفع الخبر.'
      }
    ],
    null,
    2
  ),
  [QuestionType.READING_COMPREHENSION]: JSON.stringify(
    [
      {
        questionType: 'reading_comprehension',
        prompt: 'اقرأ النص الأدبي التالي ثم أجب عن الأسئلة:',
        content: {
          passage: 'كان نهر النيل العظيم شريان الحياة للقدماء والمحدثين...',
          subQuestions: [
            {
              id: 'rc_1',
              prompt: 'استخرج الفكرة الرئيسية للنص الفقري',
              correctAnswer: 'أهمية نهر النيل التاريخية والحضارية'
            }
          ]
        },
        correctAnswer: {
          rc_1: 'أهمية نهر النيل التاريخية والحضارية'
        },
        allocatedMarks: 10,
        explanationAr: 'الفقرة تدور حول منزلة النيل في وجدان السودانيين.'
      }
    ],
    null,
    2
  ),
};

const EXAMPLE_JSON_BULK = `[
  {
    "questionType": "fill_blank",
    "prompt": "أكمل الفراغات في الجملة التاريخية التالية:",
    "content": {
      "textWithBlanks": "عاصمة السودان هي [blank_1] وتقع عند ملتقى [blank_2]",
      "blanks": [
        {
          "id": "blank_1",
          "correctValue": "الخرطوم",
          "choices": ["الخرطوم", "أم درمان", "بحري"]
        },
        {
          "id": "blank_2",
          "correctValue": "النيلين",
          "choices": ["النيلين", "البحر الأحمر", "نهر عطبرة"]
        }
      ]
    },
    "correctAnswer": {
      "answers": {
        "blank_1": "الخرطوم",
        "blank_2": "النيلين"
      }
    },
    "allocatedMarks": 5,
    "explanationAr": "تقع الخرطوم عند ملتقى النيل الأزرق والنيل الأبيض."
  },
  {
    "questionType": "multiple_choice",
    "prompt": "ما هي وحدة قياس القوة في النظام الدولي للوحدات؟",
    "content": {
      "options": [
        { "id": "opt1", "text": "نيوتن" },
        { "id": "opt2", "text": "جول" },
        { "id": "opt3", "text": "واط" },
        { "id": "opt4", "text": "أمبير" }
      ]
    },
    "correctAnswer": {
      "selectedOptionId": "opt1"
    },
    "allocatedMarks": 5
  },
  {
    "questionType": "true_false",
    "prompt": "تتحرك الكواكب حول الشمس في مدارات إهليلجية.",
    "content": {
      "statement": "تتحرك الكواكب حول الشمس في مدارات إهليلجية."
    },
    "correctAnswer": {
      "value": true
    },
    "allocatedMarks": 5
  }
]`;

interface BulkValidationData {
  total: number;
  valid: number;
  invalid: number;
  duplicateWarnings: Array<{
    index: number;
    questionPrompt: string;
    existingQuestionId: string;
    existingPrompt: string;
    status: string;
  }>;
  errors: Array<{
    index: number;
    questionType: string;
    errors: string[];
  }>;
  summary: {
    toImport: number;
    duplicates: number;
    invalid: number;
  };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToStudentView }) => {
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState<string>(TWELVE_CONTRACT_SUBJECTS[0].slug);
  const [activeTab, setActiveTab] = useState<'blueprint' | 'authoring' | 'bank' | 'bulk'>('blueprint');

  // Bulk Import States
  const [bulkImportType, setBulkImportType] = useState<'all_json' | 'ordering'>('all_json');
  const [orderingFormat, setOrderingFormat] = useState<'json' | 'csv'>('json');
  const [bulkJsonText, setBulkJsonText] = useState<string>('');
  const [bulkScope, setBulkScope] = useState<'both' | 'yearly_exam' | 'curriculum_review'>('both');
  const [bulkYear, setBulkYear] = useState<number>(2024);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<BulkValidationData | null>(null);
  const [duplicateDecisions, setDuplicateDecisions] = useState<Record<number, 'import' | 'skip'>>({});
  const [parsedQuestionsCache, setParsedQuestionsCache] = useState<any[] | null>(null);
  const [importSummaryResult, setImportSummaryResult] = useState<{
    imported: number;
    skipped: number;
    byDecision: { skipped: number; imported: number; new: number };
  } | null>(null);

  const selectedSubject = TWELVE_CONTRACT_SUBJECTS.find((s) => s.slug === selectedSubjectSlug) || TWELVE_CONTRACT_SUBJECTS[0];
  const [blueprint, setBlueprint] = useState<SubjectExamBlueprint>(() => curriculumStorage.getSubjectBlueprint(selectedSubjectSlug));
  const [questionsList, setQuestionsList] = useState<AuthoredQuestion[]>(() => curriculumStorage.getQuestionsBySubject(selectedSubjectSlug));

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const [isLoadingBank, setIsLoadingBank] = useState<boolean>(false);
  const [bankError, setBankError] = useState<string | null>(null);

  const fetchServerQuestions = async (slug: string) => {
    setIsLoadingBank(true);
    setBankError(null);
    try {
      const res = await apiClient.request<Array<any>>(`/api/admin/questions?subjectSlug=${slug}`);
      if (res?.success && Array.isArray(res.data)) {
        if (res.data.length > 0) {
          const serverQuestions: AuthoredQuestion[] = res.data.map((row: any) => ({
            id: row.id,
            subjectSlug: row.subjectSlug || slug,
            questionNumber: 1,
            partLabel: 'أ',
            questionType: row.questionType,
            prompt: row.content?.prompt || row.prompt || '',
            content: row.content || {},
            correctAnswer: row.correctAnswer,
            allocatedMarks: Number(row.allocatedMarks) || 5,
            explanationAr: row.explanationAr,
            examScope: (row.examScope as any) || 'both',
            examYear: row.examYear || undefined,
            status: row.status || 'approved',
            createdAt: row.createdAt || new Date().toISOString(),
          }));
          const localQuestions = curriculumStorage.getQuestionsBySubject(slug);
          const combined = [...serverQuestions];
          localQuestions.forEach((lq) => {
            if (!combined.some((cq) => cq.id === lq.id)) {
              combined.push(lq);
            }
          });
          setQuestionsList(combined);
        } else {
          setQuestionsList(curriculumStorage.getQuestionsBySubject(slug));
        }
      } else {
        setQuestionsList(curriculumStorage.getQuestionsBySubject(slug));
      }
    } catch {
      setBankError('تعذر جلب الأسئلة من قاعدة البيانات المركزية؛ يتم العرض من مسودة المتصفح المحلية.');
      setQuestionsList(curriculumStorage.getQuestionsBySubject(slug));
    } finally {
      setIsLoadingBank(false);
    }
  };

  const handleSubjectChange = (slug: string) => {
    setSelectedSubjectSlug(slug);
    setBlueprint(curriculumStorage.getSubjectBlueprint(slug));
    setQuestionsList(curriculumStorage.getQuestionsBySubject(slug));
    if (activeTab === 'bank') {
      fetchServerQuestions(slug);
    }
  };

  const handleValidateBulkJson = async () => {
    setJsonParseError(null);
    setValidationResult(null);
    setImportSummaryResult(null);

    const trimmed = bulkJsonText.trim();
    if (!trimmed) {
      setJsonParseError('يرجى لصق بيانات JSON في الحقل أدناه أولاً.');
      return;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err: any) {
      setJsonParseError(`JSON غير صالح: ${err.message || 'خطأ في تنسيق النص'}`);
      return;
    }

    const questionsArray = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
      setJsonParseError('يجب أن يحتوي ملف JSON على مصفوفة من الأسئلة أو كائن يتضمن الحقل "questions".');
      return;
    }

    setParsedQuestionsCache(questionsArray);
    setIsValidating(true);

    try {
      const res = await apiClient.request<BulkValidationData>('/api/admin/questions/bulk-validate', {
        method: 'POST',
        body: JSON.stringify({
          subjectSlug: selectedSubjectSlug,
          bankType: bulkScope === 'curriculum_review' ? 'comprehensive' : 'training',
          examYear: bulkScope === 'curriculum_review' ? undefined : bulkYear,
          questions: questionsArray,
        }),
      });

      if (res?.data) {
        setValidationResult(res.data);
        const initialDecisions: Record<number, 'import' | 'skip'> = {};
        res.data.duplicateWarnings.forEach((w) => {
          initialDecisions[w.index] = 'skip';
        });
        setDuplicateDecisions(initialDecisions);
      } else {
        throw new Error(res?.error?.message || 'فشل التحقق من الأسئلة');
      }
    } catch (err: any) {
      setJsonParseError(err.message || 'حدث خطأ أثناء فحص البيانات من الخادم.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmBulkImport = async () => {
    if (!parsedQuestionsCache || !validationResult) return;
    setIsImporting(true);
    setImportSummaryResult(null);

    try {
      const res = await apiClient.request<{
        imported: number;
        skipped: number;
        byDecision: { skipped: number; imported: number; new: number };
      }>('/api/admin/questions/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          subjectSlug: selectedSubjectSlug,
          bankType: bulkScope === 'curriculum_review' ? 'comprehensive' : 'training',
          examYear: bulkScope === 'curriculum_review' ? undefined : bulkYear,
          questions: parsedQuestionsCache,
          duplicateDecisions,
        }),
      });

      if (res?.data) {
        setImportSummaryResult(res.data);
        showNotification(`تم استيراد ${res.data.imported} سؤال بنجاح إلى قاعدة البيانات!`, 'success');
        // Refresh question bank
        fetchServerQuestions(selectedSubjectSlug);
      } else {
        throw new Error(res?.error?.message || 'فشل الاستيراد في قاعدة البيانات');
      }
    } catch (err: any) {
      showNotification(`فشل الاستيراد: ${err.message}`, 'info');
    } finally {
      setIsImporting(false);
    }
  };

  const parseOrderingCsv = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const questions: any[] = [];
    const errors: string[] = [];

    lines.forEach((line, lineIdx) => {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim());

      const lowerCell0 = cells[0]?.toLowerCase() || '';
      if (
        lineIdx === 0 &&
        (lowerCell0.includes('prompt') || lowerCell0.includes('text') || lowerCell0.includes('السؤال') || lowerCell0.includes('نص'))
      ) {
        return;
      }

      if (cells.length < 3) {
        errors.push(`السطر ${lineIdx + 1}: يجب أن يحتوي على نص السؤال وعنصرين على الأقل للترتيب.`);
        return;
      }

      const prompt = cells[0].replace(/^"|"$/g, '').trim();
      const rawItems = cells.slice(1).map((c) => c.replace(/^"|"$/g, '').trim()).filter(Boolean);

      let allocatedMarks = 5;
      let explanation = '';

      if (rawItems.length > 2 && !isNaN(Number(rawItems[rawItems.length - 1]))) {
        allocatedMarks = Number(rawItems.pop()) || 5;
      }

      if (rawItems.length < 2) {
        errors.push(`السطر ${lineIdx + 1}: يلزم وجود عنصرين على الأقل للترتيب.`);
        return;
      }

      const items = rawItems.map((text, i) => ({
        id: `s${i + 1}`,
        text,
      }));

      questions.push({
        prompt,
        items,
        correctOrder: items.map((it) => it.id),
        allocatedMarks,
        explanation,
      });
    });

    return { questions, errors };
  };

  const handleImportOrderingQuestions = async () => {
    setJsonParseError(null);
    setValidationResult(null);
    setImportSummaryResult(null);

    const trimmed = bulkJsonText.trim();
    if (!trimmed) {
      setJsonParseError('يرجى لصق بيانات الأسئلة أولاً.');
      return;
    }

    let questionsToImport: any[] = [];

    if (orderingFormat === 'csv') {
      const { questions, errors } = parseOrderingCsv(trimmed);
      if (errors.length > 0) {
        setJsonParseError(`أخطاء في ملف CSV:\n${errors.join('\n')}`);
        return;
      }
      questionsToImport = questions;
    } else {
      try {
        const parsed = JSON.parse(trimmed);
        const list = Array.isArray(parsed) ? parsed : parsed.questions || [];
        questionsToImport = list.map((q: any) => {
          let items = q.items || [];
          if (Array.isArray(items)) {
            items = items.map((it: any, i: number) => {
              if (typeof it === 'string') return { id: `s${i + 1}`, text: it.trim() };
              return { id: it.id || `s${i + 1}`, text: String(it.text || it.title || '').trim() };
            });
          }
          return {
            prompt: q.prompt || q.text || 'رتب الأحداث التالية:',
            items,
            correctOrder: Array.isArray(q.correctOrder) && q.correctOrder.length > 0 ? q.correctOrder : items.map((it: any) => it.id),
            allocatedMarks: q.allocatedMarks || q.marks || 5,
            explanation: q.explanation || q.explanationAr || '',
          };
        });
      } catch (err: any) {
        setJsonParseError(`JSON غير صالح: ${err.message}`);
        return;
      }
    }

    if (questionsToImport.length === 0) {
      setJsonParseError('لم يتم العثور على أي أسئلة صالحة للاستيراد.');
      return;
    }

    for (let i = 0; i < questionsToImport.length; i++) {
      const q = questionsToImport[i];
      const items = Array.isArray(q.items) ? q.items : [];
      if (items.length < 2) {
        setJsonParseError(`السؤال رقم ${i + 1} ("${q.prompt || ''}") يجب أن يحتوي على عنصرين على الأقل للترتيب.`);
        return;
      }
    }

    setIsImporting(true);
    try {
      const res = await apiClient.request<{ count: number }>('/api/admin/bulk-import-ordering', {
        method: 'POST',
        body: JSON.stringify({
          subjectSlug: selectedSubjectSlug,
          questions: questionsToImport,
        }),
      });

      if (res?.success) {
        const importedCount = res.data?.count || questionsToImport.length;
        showNotification(`تم استيراد ${importedCount} سؤال ترتيب بنجاح!`, 'success');
        setBulkJsonText('');
        fetchServerQuestions(selectedSubjectSlug);
      } else {
        throw new Error(res?.error?.message || 'فشل استيراد أسئلة الترتيب');
      }
    } catch (err: any) {
      setJsonParseError(err.message || 'حدث خطأ أثناء استيراد أسئلة الترتيب.');
    } finally {
      setIsImporting(false);
    }
  };

  // ==========================================
  // TAB 1: BLUEPRINT MANAGEMENT LOGIC
  // ==========================================
  const handleUpdatePattern = (index: number, updatedFields: Partial<QuestionPattern>) => {
    const updatedPatterns = [...blueprint.patterns];
    updatedPatterns[index] = { ...updatedPatterns[index], ...updatedFields };
    setBlueprint({
      ...blueprint,
      patterns: updatedPatterns,
    });
  };

  const handleAddPattern = () => {
    const nextQNum = blueprint.patterns.length > 0
      ? Math.max(...blueprint.patterns.map((p) => p.questionNumber)) + 1
      : 1;

    const newPattern: QuestionPattern = {
      id: `${blueprint.subjectSlug}_q${nextQNum}_a_${Date.now()}`,
      subjectSlug: blueprint.subjectSlug,
      questionNumber: nextQNum,
      partLabel: 'أ',
      questionType: QuestionType.MULTIPLE_CHOICE,
      title: `السؤال ${nextQNum} (أ): نمط اختياري`,
      allocatedMarks: 10,
      instructions: 'أجب عن السؤال وفق المطلوب.',
    };

    setBlueprint({
      ...blueprint,
      patterns: [...blueprint.patterns, newPattern],
    });
  };

  const handleAddBranch = (qNumber: number) => {
    const existingParts = blueprint.patterns.filter((p) => p.questionNumber === qNumber);
    const partLabels = ['أ', 'ب', 'ج', 'د', 'هـ'];
    const nextPart = partLabels[existingParts.length] || `فرع ${existingParts.length + 1}`;

    const newBranch: QuestionPattern = {
      id: `${blueprint.subjectSlug}_q${qNumber}_${nextPart}_${Date.now()}`,
      subjectSlug: blueprint.subjectSlug,
      questionNumber: qNumber,
      partLabel: nextPart,
      questionType: QuestionType.FILL_BLANK,
      title: `السؤال ${qNumber} (${nextPart}): فرع إضافي`,
      allocatedMarks: 5,
      instructions: 'أجب عن الفرع التالي بدقة.',
    };

    const updatedPatterns = [...blueprint.patterns, newBranch].sort((a, b) => {
      if (a.questionNumber !== b.questionNumber) return a.questionNumber - b.questionNumber;
      return a.partLabel.localeCompare(b.partLabel);
    });

    setBlueprint({
      ...blueprint,
      patterns: updatedPatterns,
    });
  };

  const handleDeletePattern = (patternId: string) => {
    const updated = blueprint.patterns.filter((p) => p.id !== patternId);
    setBlueprint({
      ...blueprint,
      patterns: updated,
    });
  };

  const handleSaveBlueprint = () => {
    curriculumStorage.saveSubjectBlueprint(blueprint);
    showNotification(`تم حفظ وتعميم هيكل ورقة الامتحان لمادة (${blueprint.name_ar}) بنجاح!`, 'success');
  };

  const handleResetBlueprint = () => {
    const res = curriculumStorage.resetSubjectBlueprint(selectedSubjectSlug);
    setBlueprint(res);
    showNotification('تمت استعادة الهيكل القياسي الافتراضي للمادة بنجاح.', 'info');
  };

  // ==========================================
  // TAB 2: QUESTION AUTHORING LOGIC
  // ==========================================
  // Exam Type Selection States (امتحان تدريبي vs امتحان كامل)
  const [examCategory, setExamCategory] = useState<'training' | 'full'>('training');
  const [trainingKind, setTrainingKind] = useState<'comprehensive' | 'specific_year'>('comprehensive');
  const [selectedExamYear, setSelectedExamYear] = useState<number>(2024);
  const [targetScope, setTargetScope] = useState<'both' | 'curriculum_review' | 'yearly_exam'>('curriculum_review');
  const [authoringYear, setAuthoringYear] = useState<number>(2024);
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');

  const [questionPrompt, setQuestionPrompt] = useState<string>('');
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.MULTIPLE_CHOICE);
  const [questionMarks, setQuestionMarks] = useState<number>(5);
  const [questionNumber, setQuestionNumber] = useState<number>(1);
  const [questionPart, setQuestionPart] = useState<string>('أ');
  const [explanationAr, setExplanationAr] = useState<string>('');

  const handleExamCategoryChange = (cat: 'training' | 'full') => {
    setExamCategory(cat);
    if (cat === 'full') {
      setTargetScope('yearly_exam');
      setAuthoringYear(selectedExamYear);
    } else {
      if (trainingKind === 'comprehensive') {
        setTargetScope('curriculum_review');
        setAuthoringYear(2024);
      } else {
        setTargetScope('yearly_exam');
        setAuthoringYear(selectedExamYear);
      }
    }
  };

  const handleTrainingKindChange = (kind: 'comprehensive' | 'specific_year') => {
    setTrainingKind(kind);
    if (kind === 'comprehensive') {
      setTargetScope('curriculum_review');
    } else {
      setTargetScope('yearly_exam');
      setAuthoringYear(selectedExamYear);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedExamYear(year);
    setAuthoringYear(year);
  };

  const handleCopyTemplate = (qType: string) => {
    const jsonStr = PATTERN_TEMPLATES[qType] || EXAMPLE_JSON_BULK;
    navigator.clipboard.writeText(jsonStr);
    showNotification(`تم نسخ قالب JSON لنمط (${QUESTION_TYPE_LABELS[qType] || qType}) بنجاح إلى الحافظة!`, 'success');
  };

  const handleDownloadTemplate = (qType: string) => {
    const jsonStr = PATTERN_TEMPLATES[qType] || EXAMPLE_JSON_BULK;
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `template_${qType}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`تم تنزيل ملف القالب (template_${qType}.json) بنجاح!`, 'success');
  };

  const handleUseTemplateInBulk = (qType: string) => {
    const jsonStr = PATTERN_TEMPLATES[qType] || EXAMPLE_JSON_BULK;
    setBulkJsonText(jsonStr);
    setActiveTab('bulk');
    showNotification(`تم تحميل قالب نمط (${QUESTION_TYPE_LABELS[qType] || qType}) في واجهة الاستيراد الجماعي.`, 'info');
  };

  // Type-specific states
  const [tfAnswer, setTfAnswer] = useState<boolean>(true);
  const [mcqOptions, setMcqOptions] = useState<string[]>([
    'الخيار الأول (أ)',
    'الخيار الثاني (ب)',
    'الخيار الثالث (ج)',
    'الخيار الرابع (د)',
  ]);
  const [mcqCorrectIndex, setMcqCorrectIndex] = useState<number>(0);
  const [blankAnswer, setBlankAnswer] = useState<string>('');
  const [fillTextWithBlanks, setFillTextWithBlanks] = useState<string>('');
  const [fillBlanks, setFillBlanks] = useState<
    Array<{ id: string; correctValue: string; choices: [string, string, string] }>
  >([{ id: 'blank_1', correctValue: '', choices: ['', '', ''] }]);

  const handleAddBlank = () => {
    const nextIdx = fillBlanks.length + 1;
    setFillBlanks((prev) => [...prev, { id: `blank_${nextIdx}`, correctValue: '', choices: ['', '', ''] }]);
  };

  const handleRemoveBlank = (index: number) => {
    if (fillBlanks.length <= 1) return;
    setFillBlanks((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.map((b, i) => ({ ...b, id: `blank_${i + 1}` }));
    });
  };

  const handleUpdateBlankCorrect = (index: number, val: string) => {
    setFillBlanks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], correctValue: val };
      return updated;
    });
  };

  const handleUpdateBlankChoice = (blankIndex: number, choiceIndex: number, val: string) => {
    setFillBlanks((prev) => {
      const updated = [...prev];
      const newChoices = [...updated[blankIndex].choices] as [string, string, string];
      newChoices[choiceIndex] = val;
      updated[blankIndex] = { ...updated[blankIndex], choices: newChoices };
      return updated;
    });
  };

  const [grammarWord, setGrammarWord] = useState<string>('');
  const [grammarAnswer, setGrammarAnswer] = useState<string>('');
  const [oddWords, setOddWords] = useState<string>('كلمة 1، كلمة 2، كلمة 3، كلمة شاذة');
  const [oddAnswer, setOddAnswer] = useState<string>('كلمة شاذة');
  const [calcExpression, setCalcExpression] = useState<string>('');
  const [calcAnswer, setCalcAnswer] = useState<string>('');
  const [calcMode, setCalcMode] = useState<'multi_step_mcq' | 'numeric_with_work'>('multi_step_mcq');
  const [pattern7Data, setPattern7Data] = useState<any>(null);
  const [pattern8Data, setPattern8Data] = useState<Pattern8FormFields | null>(null);
  const [pattern11Data, setPattern11Data] = useState<Pattern11FormData | null>(null);
  const [pattern14Data, setPattern14Data] = useState<any>(null);
  const [diagramData, setDiagramData] = useState<DiagramFormData | null>(null);
  const [isLegacyDiagram, setIsLegacyDiagram] = useState<boolean>(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Question Bank Filter & Search States
  const [bankScopeFilter, setBankScopeFilter] = useState<'all' | 'training' | 'yearly_exam' | 'curriculum_review'>('all');
  const [bankYearFilter, setBankYearFilter] = useState<number | 'all'>('all');
  const [bankPatternFilter, setBankPatternFilter] = useState<string>('all');
  const [bankSearchQuery, setBankSearchQuery] = useState<string>('');

  // Interactive Question Preview Modal State
  const [previewQuestion, setPreviewQuestion] = useState<AuthoredQuestion | null>(null);
  const [previewAnswer, setPreviewAnswer] = useState<any>(null);
  const [previewExamMode, setPreviewExamMode] = useState<'training' | 'simulator'>('training');

  // Filtered Questions List for Question Bank Tab
  const filteredBankQuestions = useMemo(() => {
    return questionsList.filter((q) => {
      // 1. Exam Scope / Method Filter
      if (bankScopeFilter !== 'all') {
        const qScope = q.examScope || 'both';
        if (qScope !== 'both' && qScope !== bankScopeFilter) {
          return false;
        }
      }

      // 2. Exam Year Filter
      if (bankYearFilter !== 'all') {
        if (q.examYear !== bankYearFilter) {
          return false;
        }
      }

      // 3. Question Pattern Filter
      if (bankPatternFilter !== 'all') {
        if (q.questionType !== bankPatternFilter) {
          return false;
        }
      }

      // 4. Search Query Filter (text, keywords, number, ID)
      if (bankSearchQuery.trim()) {
        const query = bankSearchQuery.trim().toLowerCase();
        const promptText = (q.prompt || '').toLowerCase();
        const idText = (q.id || '').toLowerCase();
        const numText = String(q.questionNumber || '');
        const partText = (q.partLabel || '').toLowerCase();
        const explanationText = (q.explanationAr || '').toLowerCase();
        const contentStr = JSON.stringify(q.content || '').toLowerCase();

        const matches =
          promptText.includes(query) ||
          idText.includes(query) ||
          numText.includes(query) ||
          partText.includes(query) ||
          explanationText.includes(query) ||
          contentStr.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [questionsList, bankScopeFilter, bankYearFilter, bankPatternFilter, bankSearchQuery]);

  const handleEditQuestion = (q: AuthoredQuestion) => {
    setEditingQuestionId(q.id);
    setQuestionType(q.questionType);
    setQuestionPrompt(q.prompt || (q.content as any)?.prompt || '');
    setQuestionMarks(q.allocatedMarks || 5);
    setQuestionNumber(q.questionNumber || 1);
    setQuestionPart(q.partLabel || 'أ');
    setExplanationAr(q.explanationAr || '');

    if (q.questionType === QuestionType.CONTOUR_MAP) {
      const c = (q.content || {}) as Record<string, any>;
      const ca = (q.correctAnswer || {}) as Record<string, any>;
      setPattern11Data({
        prompt: q.prompt || c.prompt || '',
        mapUrl: c.mapUrl || '',
        mapCode: c.mapCode || '',
        subQuestions: Array.isArray(c.subQuestions) ? c.subQuestions : [],
        subAnswers: ca.subAnswers || (typeof ca === 'object' && ca !== null ? ca : {}),
        totalMarks: q.allocatedMarks || 10,
      });
    }

    if (q.questionType === QuestionType.ARABIC_GRAMMAR) {
      const c = (q.content || {}) as Record<string, unknown>;
      const ca = (q.correctAnswer || {}) as Record<string, unknown>;
      const rawComponents = Array.isArray(c.components) ? c.components : [];
      if (rawComponents.length > 0) {
        const correctMap = (ca.components && typeof ca.components === 'object')
          ? (ca.components as Record<string, string>)
          : (typeof ca === 'object' && ca !== null ? (ca as Record<string, string>) : {});

        setPattern14Data({
          prompt: q.prompt || (c.prompt as string) || '',
          sentence: (c.sentence as string) || '',
          targetWord: (c.targetWord as string) || '',
          components: rawComponents,
          correctComponents: correctMap,
          totalMarks: q.allocatedMarks || rawComponents.reduce((sum: number, comp: any) => sum + (Number(comp.points) || 0), 0),
        });
      }
    }

    if (q.questionType === QuestionType.DIAGRAM_LABELING) {
      const c = (q.content || {}) as Record<string, any>;
      const ca = (q.correctAnswer || {}) as Record<string, any>;

      if (Array.isArray(c.labels)) {
        setIsLegacyDiagram(true);
      } else {
        setIsLegacyDiagram(false);
        setDiagramData({
          prompt: q.prompt || c.prompt || '',
          diagram: c.diagram || (c.imageUrl ? { url: c.imageUrl } : { url: '/assets/diagrams/physics_circuit.svg' }),
          subQuestions: Array.isArray(c.subQuestions) ? c.subQuestions : [],
          subAnswers: ca.subAnswers || (typeof ca === 'object' && ca !== null ? ca : {}),
          totalMarks: q.allocatedMarks || 5,
          explanations: ca.explanations || {},
        });
      }
    }

    setActiveTab('authoring');
    showNotification(`تم فتح السؤال (رقم ${q.questionNumber} ${q.partLabel}) للتعديل.`, 'info');
  };

  const handleCancelEditing = () => {
    setEditingQuestionId(null);
    setPattern11Data(null);
    setPattern14Data(null);
    setDiagramData(null);
    setIsLegacyDiagram(false);
    setQuestionPrompt('');
    setExplanationAr('');
    showNotification('تم إلغاء وضع التعديل.', 'info');
  };

  // Matching question states
  const [matchingPairs, setMatchingPairs] = useState<
    Array<{ id: string; source: string; target: string }>
  >([
    { id: 'pair_1', source: '', target: '' },
    { id: 'pair_2', source: '', target: '' },
  ]);
  const [matchingDistractors, setMatchingDistractors] = useState<
    Array<{ id: string; target: string }>
  >([]);
  const [matchingScoringType, setMatchingScoringType] = useState<'all_or_nothing' | 'partial'>('partial');

  const handleAddMatchingPair = () => {
    const nextIdx = matchingPairs.length + 1;
    setMatchingPairs((prev) => [...prev, { id: `pair_${nextIdx}`, source: '', target: '' }]);
  };

  const handleRemoveMatchingPair = (index: number) => {
    if (matchingPairs.length <= 2) return;
    setMatchingPairs((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateMatchingPair = (index: number, field: 'source' | 'target', val: string) => {
    setMatchingPairs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleAddMatchingDistractor = () => {
    const nextIdx = matchingDistractors.length + 1;
    setMatchingDistractors((prev) => [...prev, { id: `dist_${nextIdx}`, target: '' }]);
  };

  const handleRemoveMatchingDistractor = (index: number) => {
    setMatchingDistractors((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateMatchingDistractor = (index: number, val: string) => {
    setMatchingDistractors((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], target: val };
      return updated;
    });
  };

  // Handle selecting a blueprint pattern to auto-fill metadata
  const handleSelectPatternForAuthoring = (pId: string) => {
    setSelectedPatternId(pId);
    const pat = blueprint.patterns.find((p) => p.id === pId);
    if (pat) {
      setQuestionType(pat.questionType);
      setQuestionMarks(pat.allocatedMarks);
      setQuestionNumber(pat.questionNumber);
      setQuestionPart(pat.partLabel);
      if (!questionPrompt) {
        setQuestionPrompt(pat.instructions);
      }
    }
  };

  const handleSaveAuthoredQuestion = () => {
    if (!questionPrompt.trim()) {
      showNotification('يرجى كتابة نص السؤال قبل الحفظ.', 'info');
      return;
    }

    let content: Record<string, any> = {};
    let correctAnswer: any = null;

    if (questionType === QuestionType.TRUE_FALSE) {
      content = {
        prompt: questionPrompt.trim(),
        statement: questionPrompt.trim(),
        explanation: explanationAr.trim() || undefined,
      };
      correctAnswer = { value: Boolean(tfAnswer) };
    } else if (questionType === QuestionType.MULTIPLE_CHOICE) {
      content = {
        options: mcqOptions.map((opt, idx) => ({ id: `opt${idx + 1}`, text: opt })),
      };
      correctAnswer = { selectedOptionId: `opt${mcqCorrectIndex + 1}` };
    } else if (questionType === QuestionType.FILL_BLANK) {
      if (fillBlanks.some((b) => !b.correctValue.trim())) {
        showNotification('يرجى تحديد الإجابة الصحيحة لكل فراغ مضاف في السؤال.', 'info');
        return;
      }
      const answersRecord: Record<string, string> = {};
      const formattedBlanks = fillBlanks.map((b) => {
        answersRecord[b.id] = b.correctValue.trim();
        return {
          id: b.id,
          correctValue: b.correctValue.trim(),
          choices: b.choices.map((c) => c.trim()).filter(Boolean),
        };
      });
      content = {
        prompt: questionPrompt.trim(),
        textWithBlanks: fillTextWithBlanks.trim() || questionPrompt.trim(),
        blanks: formattedBlanks,
      };
      correctAnswer = { answers: answersRecord };
    } else if (questionType === QuestionType.ARABIC_GRAMMAR) {
      if (pattern14Data && pattern14Data.components && pattern14Data.components.length > 0) {
        content = {
          prompt: pattern14Data.prompt || questionPrompt.trim(),
          sentence: pattern14Data.sentence || undefined,
          targetWord: pattern14Data.targetWord || grammarWord || undefined,
          components: pattern14Data.components,
        };
        correctAnswer = {
          components: pattern14Data.correctComponents,
        };
        if (pattern14Data.totalMarks > 0) {
          setQuestionMarks(pattern14Data.totalMarks);
        }
      } else {
        content = { targetWord: grammarWord, fullSentence: questionPrompt };
        correctAnswer = grammarAnswer;
      }
    } else if (questionType === QuestionType.ODD_ONE_OUT) {
      content = { words: oddWords.split('،').map((w) => w.trim()) };
      correctAnswer = oddAnswer.trim();
    } else if (questionType === QuestionType.CALCULATION) {
      if (calcMode === 'multi_step_mcq' && pattern7Data) {
        content = {
          mode: 'multi_step_mcq',
          prompt: pattern7Data.prompt || questionPrompt,
          scenario: pattern7Data.scenario || undefined,
          given_values: pattern7Data.given_values || undefined,
          constants: pattern7Data.constants || undefined,
          steps: pattern7Data.steps,
          solution_guide: pattern7Data.solution_guide || undefined,
        };
        correctAnswer = {
          step_answers: pattern7Data.step_answers,
          conditional_credit_rules: pattern7Data.conditional_credit_rules,
        };
        setQuestionMarks(pattern7Data.total_marks || questionMarks);
      } else {
        content = { expression: calcExpression, prompt: questionPrompt };
        correctAnswer = calcAnswer;
      }
    } else if (questionType === QuestionType.MATCHING) {
      if (matchingPairs.some((p) => !p.source.trim() || !p.target.trim())) {
        showNotification('يرجى كتابة العنصر الأساسي والمطابق لجميع الأزواج المضافة قبل الحفظ.', 'info');
        return;
      }
      content = {
        prompt: questionPrompt.trim(),
        pairs: matchingPairs.map((p) => ({
          id: p.id,
          source: p.source.trim(),
          target: p.target.trim(),
        })),
        distractors: matchingDistractors
          .filter((d) => d.target.trim())
          .map((d) => ({
            id: d.id,
            target: d.target.trim(),
          })),
        scoring_type: matchingScoringType,
        explanation: explanationAr.trim() || undefined,
      };

      const correctPairsMap: Record<string, string> = {};
      matchingPairs.forEach((p) => {
        correctPairsMap[p.id] = `target_${p.id}`;
      });
      correctAnswer = { pairs: correctPairsMap };
    } else if (questionType === QuestionType.SHORT_ESSAY) {
      if (pattern8Data) {
        content = {
          prompt: pattern8Data.question_text || questionPrompt,
          question_text: pattern8Data.question_text || questionPrompt,
          model_answer: pattern8Data.model_answer,
          mandatory_keywords: pattern8Data.mandatory_keywords,
          hint: pattern8Data.hint,
          max_words: pattern8Data.max_words,
          grading_mode: pattern8Data.grading_mode,
          partial_threshold: pattern8Data.partial_threshold,
        };
        correctAnswer = {
          model_answer: pattern8Data.model_answer,
          mandatory_keywords: pattern8Data.mandatory_keywords,
        };
        setQuestionMarks(pattern8Data.max_score || questionMarks);
      } else {
        content = {
          prompt: questionPrompt.trim(),
          question_text: questionPrompt.trim(),
          model_answer: blankAnswer || 'الإجابة النموذجية المعتمدة',
          mandatory_keywords: [],
          hint: '',
          max_words: 30,
          grading_mode: 'auto',
          partial_threshold: 0.5,
        };
        correctAnswer = {
          model_answer: blankAnswer || 'الإجابة النموذجية المعتمدة',
          mandatory_keywords: [],
        };
      }
    } else if (questionType === QuestionType.CONTOUR_MAP) {
      if (pattern11Data) {
        content = {
          prompt: pattern11Data.prompt || questionPrompt,
          mapUrl: pattern11Data.mapUrl,
          mapCode: pattern11Data.mapCode,
          subQuestions: pattern11Data.subQuestions,
        };
        correctAnswer = {
          subAnswers: pattern11Data.subAnswers,
        };
        setQuestionMarks(pattern11Data.totalMarks || questionMarks);
      } else {
        content = {
          prompt: questionPrompt.trim(),
          mapUrl: '/assets/maps/contour_01.png',
          mapCode: 'MAP_SUDAN_CONTOUR_01',
          subQuestions: [
            {
              id: 'cm_1',
              question: 'ما هي قيمة الفاصل الكنتوري؟',
              unit: 'متر',
              inputType: 'numeric',
              numericTolerance: 1,
            },
          ],
        };
        correctAnswer = {
          subAnswers: {
            cm_1: blankAnswer || '20',
          },
        };
      }
    } else if (questionType === QuestionType.DIAGRAM_LABELING) {
      if (isLegacyDiagram) {
        const existingQ = questionsList.find((q) => q.id === editingQuestionId);
        content = existingQ?.content && typeof existingQ.content === 'object' ? existingQ.content : { prompt: questionPrompt, labels: [] };
        correctAnswer = existingQ?.correctAnswer || {};
      } else if (diagramData) {
        content = {
          prompt: diagramData.prompt || questionPrompt,
          diagram: diagramData.diagram,
          subQuestions: diagramData.subQuestions,
        };
        correctAnswer = {
          subAnswers: diagramData.subAnswers,
          ...(diagramData.explanations && Object.keys(diagramData.explanations).length > 0
            ? { explanations: diagramData.explanations }
            : {}),
        };
        setQuestionMarks(diagramData.totalMarks || questionMarks);
      } else {
        content = {
          prompt: questionPrompt.trim(),
          diagram: { url: '/assets/diagrams/physics_circuit.svg', alt: 'الدائرة الكهربائية' },
          subQuestions: [
            {
              id: 'sq1',
              kind: 'locate',
              prompt: 'حدد موقع المقاومة الكهربائية على الرسم التوضيحي:',
              marks: 2,
            },
          ],
        };
        correctAnswer = {
          subAnswers: {
            sq1: {
              regions: [
                { type: 'rect', x: 0.65, y: 0.25, w: 0.2, h: 0.2, tolerance: 0.02 },
              ],
            },
          },
        };
      }
    } else {
      content = { instructions: questionPrompt };
      correctAnswer = blankAnswer || 'الإجابة النموذجية المعتمدة';
    }

    const targetQuestionId = editingQuestionId || `q_auth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const savedQuestion: AuthoredQuestion = {
      id: targetQuestionId,
      subjectSlug: selectedSubjectSlug,
      patternId: selectedPatternId || undefined,
      questionNumber,
      partLabel: questionPart,
      questionType,
      prompt: questionPrompt,
      content,
      correctAnswer,
      allocatedMarks: Number(questionMarks) || 5,
      explanationAr,
      examScope: targetScope,
      examYear: targetScope === 'curriculum_review' ? undefined : authoringYear,
      status: 'approved',
      createdAt: new Date().toISOString(),
    };

    // 1. Maintain local draft/cache buffer
    curriculumStorage.saveQuestion(savedQuestion);
    setQuestionsList(curriculumStorage.getQuestionsBySubject(selectedSubjectSlug));

    // 2. Dispatch to central server PostgreSQL
    if (editingQuestionId) {
      apiClient
        .request<{ id: string }>(`/api/admin/questions/${editingQuestionId}`, {
          method: 'PUT',
          body: JSON.stringify({
            prompt: questionPrompt,
            content,
            correctAnswer,
            allocatedMarks: Number(questionMarks) || 5,
            explanationAr,
          }),
        })
        .then((res) => {
          if (res?.success) {
            setQuestionsList(curriculumStorage.getQuestionsBySubject(selectedSubjectSlug));
            showNotification(`تم حفظ التعديلات وتحديث الخريطة والبيانات بنجاح في قاعدة البيانات المركزية!`, 'success');
          } else {
            showNotification(`تم تحديث بيانات السؤال في مسودة المتصفح المحلية.`, 'info');
          }
        })
        .catch(() => {
          showNotification(`تم تحديث بيانات السؤال في مسودة المتصفح المحلية.`, 'info');
        });
      setEditingQuestionId(null);
    } else {
      apiClient
        .request<{ id: string }>('/api/admin/questions', {
          method: 'POST',
          body: JSON.stringify({
            subjectSlug: selectedSubjectSlug,
            questionType,
            prompt: questionPrompt,
            content,
            correctAnswer,
            allocatedMarks: Number(questionMarks) || 5,
            explanationAr,
            examYear: targetScope === 'curriculum_review' ? undefined : authoringYear,
          }),
        })
        .then((res) => {
          if (res?.success && res.data?.id) {
            // Reconcile local draft ID with the authoritative server-returned UUID
            curriculumStorage.reconcileQuestionId(targetQuestionId, res.data.id);
            setQuestionsList(curriculumStorage.getQuestionsBySubject(selectedSubjectSlug));
            showNotification(`تم حفظ واعتماد السؤال بنجاح في قاعدة البيانات المركزية (PostgreSQL)!`, 'success');
          } else {
            showNotification(`تم حفظ السؤال في مسودة المتصفح المحلية (الخادم غير متصل أو يلزم حساب مسؤول).`, 'info');
          }
        })
        .catch(() => {
          showNotification(`تم حفظ السؤال كمسودة محلية بنجاح في المتصفح.`, 'info');
        });
    }

    // Reset prompt and feedback
    setQuestionPrompt('');
    setExplanationAr('');
    setBlankAnswer('');
    setGrammarAnswer('');
    setPattern11Data(null);
  };

  const handleDeleteQuestion = async (qId: string) => {
    try {
      const res = await apiClient.request<{ id: string; status: string }>(`/api/admin/questions/${qId}`, {
        method: 'DELETE',
      });
      curriculumStorage.deleteQuestion(qId);
      setQuestionsList((prev) => prev.filter((q) => q.id !== qId));
      if (res?.success) {
        showNotification(res.message || 'تم حذف/أرشفة السؤال بنجاح من قاعدة البيانات المركزية.', 'success');
      } else {
        showNotification('تم حذف السؤال من الذاكرة المحلية.', 'info');
      }
    } catch {
      curriculumStorage.deleteQuestion(qId);
      setQuestionsList((prev) => prev.filter((q) => q.id !== qId));
      showNotification('تم حذف السؤال من الذاكرة المحلية للمتصفح.', 'info');
    }
  };

  const handleApproveQuestion = async (qId: string, expectedHash?: string) => {
    try {
      const res = await apiClient.request<{ id: string; status: string; canonical_content_hash: string }>(
        `/api/admin/questions/${qId}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ expectedHash }),
        }
      );
      if (res?.success) {
        showNotification(res.message || 'تم اعتماد السؤال بنجاح وتوقيع هاش المحتوى.', 'success');
        if (selectedSubjectSlug) {
          fetchServerQuestions(selectedSubjectSlug);
        }
      } else {
        showNotification(res?.error?.message || 'تعذر اعتماد السؤال', 'info');
      }
    } catch (err: any) {
      showNotification(err.message || 'فشل الاتصال بالخادم للاعتماد', 'info');
    }
  };

  return (
    <div className="max-w-6xl w-full mx-auto py-4 space-y-6">
      {/* Top Bar with Navigation Back to Student View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">لوحة تحكم وإدخال هيكل الامتحان (Admin)</h1>
            <p className="text-xs text-slate-500 font-medium">
              ضبط هيكل الورقة وتعميمه على المادة، وإدخال الأسئلة للأنماط الـ 15 المعتمدة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToStudentView}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لواجهة الطالب والامتحانات</span>
        </button>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border shadow-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Subject Selector Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700 block">
            المادة المراد إدارتها وضبط هيكلها وإدخال أسئلتها:
          </label>
          <select
            value={selectedSubjectSlug}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full md:w-80 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-extrabold text-slate-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            {TWELVE_CONTRACT_SUBJECTS.map((sub) => (
              <option key={sub.slug} value={sub.slug}>
                {sub.name_ar} ({sub.name_en})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold">
            <span className="text-slate-400 ml-1">إجمالي الأسئلة والفروع:</span>
            <span className="text-emerald-700">{blueprint.patterns.length}</span>
          </div>
          <div className="px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold">
            <span className="text-slate-400 ml-1">الدرجة الكلية للورقة:</span>
            <span className="text-emerald-700">{blueprint.totalMarks} درجة</span>
          </div>
          <div className="px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold">
            <span className="text-slate-400 ml-1">الزمن المعتمد:</span>
            <span className="text-emerald-700">{blueprint.defaultDurationMinutes} دقيقة</span>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('blueprint')}
          className={`pb-3 px-4 text-sm font-black transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'blueprint'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. ضبط هيكل ورقة الامتحان للمادة (Blueprint)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('authoring')}
          className={`pb-3 px-4 text-sm font-black transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'authoring'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>2. محرك إدخال الأسئلة للأنماط الـ 15</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('bank');
            fetchServerQuestions(selectedSubjectSlug);
          }}
          className={`pb-3 px-4 text-sm font-black transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'bank'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>3. بنك الأسئلة المعتمد ({questionsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bulk')}
          className={`pb-3 px-4 text-sm font-black transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'bulk'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>4. استيراد جماعي (JSON)</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: BLUEPRINT / STRUCTURE SETUP                       */}
      {/* ========================================================= */}
      {activeTab === 'blueprint' && (
        <div className="space-y-6">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-black text-emerald-950">
                هيكل ورقة امتحان مادة ({blueprint.name_ar}) الموحد
              </h2>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-3xl">
                يحدد هذا الهيكل ترتيب ظهور الأسئلة في ورقة الامتحان (السؤال الأول، الثاني، الثالث ج...)، ونمط كل سؤال من أنماط الأسئلة الـ 15، والدرجة المخصصة له. يحفظ النظام هذا السلوك ويُعممه على كافة امتحانات المادة.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetBlueprint}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="استعادة الهيكل الافتراضي"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>

              <button
                type="button"
                onClick={handleSaveBlueprint}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وتعميم الهيكل</span>
              </button>
            </div>
          </div>

          {/* Blueprint Question Patterns List */}
          <div className="space-y-4">
            {blueprint.patterns.map((pattern, idx) => (
              <div
                key={pattern.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 transition-all hover:border-slate-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-xs">
                      {pattern.questionNumber}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      السؤال {pattern.questionNumber} {pattern.partLabel ? `(الفرع ${pattern.partLabel})` : ''}
                    </span>
                    <span className="text-xs text-slate-400 font-medium mr-2">
                      موقع الظهور: #{idx + 1} في الورقة
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddBranch(pattern.questionNumber)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      title="إضافة فرع لنفس السؤال (ب أو ج)"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>إضافة فرع (أ/ب/ج)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePattern(pattern.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف هذا النمط/الفرع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pattern Type Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">نمط السؤال (من الـ 15 نمطاً):</label>
                    <select
                      value={pattern.questionType}
                      onChange={(e) =>
                        handleUpdatePattern(idx, { questionType: e.target.value as QuestionType })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title / Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">عنوان السؤال / الموضوع:</label>
                    <input
                      type="text"
                      value={pattern.title}
                      onChange={(e) => handleUpdatePattern(idx, { title: e.target.value })}
                      placeholder="مثلاً: النحو والإعراب والضبط التام"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Allocated Marks */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">الدرجة المخصصة:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={pattern.allocatedMarks}
                        onChange={(e) =>
                          handleUpdatePattern(idx, { allocatedMarks: Number(e.target.value) || 5 })
                        }
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                      />
                      <span className="text-xs text-slate-500 font-bold">درجات</span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">تعليمات وتوجيهات السؤال للطلاب:</label>
                  <input
                    type="text"
                    value={pattern.instructions}
                    onChange={(e) => handleUpdatePattern(idx, { instructions: e.target.value })}
                    placeholder="ضع علامة (✓) أو (✗)، اقرأ النص ثم أجب، إلخ."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add New Question Button */}
          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={handleAddPattern}
              className="px-6 py-3 bg-white hover:bg-slate-50 border-2 border-dashed border-emerald-400 text-emerald-800 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>إضافة سؤال رئيسي جديد في الهيكل</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: QUESTION AUTHORING FOR PATTERNS                   */}
      {/* ========================================================= */}
      {activeTab === 'authoring' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900">
                إدخال الأسئلة لمادة ({blueprint.name_ar})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                اختر النمط وموقع السؤال في الورقة، ثم أدخل نص السؤال والحل النموذجي والشرح المنهجي
              </p>
            </div>

            {/* Editing Active Alert Banner */}
            {editingQuestionId && (
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2.5 font-black text-amber-950">
                  <Edit3 className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <span className="block text-amber-900 font-extrabold text-sm">
                      وضع تعديل السؤال المحفوظ (المعرف: <span className="font-mono text-xs">{editingQuestionId}</span>)
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium">
                      المرحلة المعتمدة: يمكنك الآن مراجعة الفروع، رفع صورة الخريطة، والنقر على الصورة لتحديد المناطق النموذجية تفاعلياً.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold cursor-pointer shrink-0 transition-colors"
                >
                  إلغاء التعديل والعودة
                </button>
              </div>
            )}

            {/* Exam Type Selector (نوع الامتحان: تدريبي vs كامل + شامل vs سنة 2000-2026) */}
            <div className="p-5 bg-gradient-to-r from-slate-50 to-emerald-50/40 rounded-3xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3">
                <div>
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span>تحديد نوع الامتحان وطريقة الحفظ المنفصلة:</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    اختر ما إذا كان هذا السؤال مخصصاً لامتحان تدريبي أو امتحان كامل رسمياً، وحدد النطاق والسنة.
                  </p>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-emerald-200 text-xs font-bold text-emerald-900 shadow-2xs">
                  <span>وضع الحفظ المنفصل:</span>
                  <span className="font-extrabold text-emerald-700">
                    {examCategory === 'training'
                      ? trainingKind === 'comprehensive'
                        ? 'امتحان تدريبي (شامل للمقرر)'
                        : `امتحان تدريبي (سنة ${selectedExamYear}م)`
                      : `امتحان كامل (دورة ${selectedExamYear}م)`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main Exam Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 block">نوع الامتحان الرئيسي:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleExamCategoryChange('training')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                        examCategory === 'training'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>امتحان تدريبي</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExamCategoryChange('full')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                        examCategory === 'full'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>امتحان كامل</span>
                    </button>
                  </div>
                </div>

                {/* Sub-Option for Training Exam */}
                {examCategory === 'training' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 block">تخصيص الامتحان التدريبي:</label>
                    <select
                      value={trainingKind}
                      onChange={(e) => handleTrainingKindChange(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="comprehensive">شامل للمقرر (Curriculum Comprehensive)</option>
                      <option value="specific_year">سنة محدودة (Specific Past Year)</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 block">دورة الامتحان الكامل:</label>
                    <div className="p-2 bg-amber-50 rounded-xl border border-amber-200 text-xs font-extrabold text-amber-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>امتحان كامل رسمي بدورة محددة</span>
                    </div>
                  </div>
                )}

                {/* Year Selection Dropdown (2000 to 2026) */}
                {(examCategory === 'full' || (examCategory === 'training' && trainingKind === 'specific_year')) ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 block">
                      اختر السنة الدورة (من 2000 حتى 2026):
                    </label>
                    <select
                      value={selectedExamYear}
                      onChange={(e) => handleYearChange(Number(e.target.value))}
                      className="w-full bg-white border-2 border-emerald-500 rounded-xl px-3 py-2 text-xs font-black text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {curriculumStorage.getAllSupportedYears().map((yr) => (
                        <option key={yr} value={yr}>
                          دورة عام {yr}م
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 block">ربط بنمط من هيكل الورقة:</label>
                    <select
                      value={selectedPatternId}
                      onChange={(e) => handleSelectPatternForAuthoring(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- إدخال حر / اختر من الهيكل --</option>
                      {blueprint.patterns.map((p) => (
                        <option key={p.id} value={p.id}>
                          السؤال {p.questionNumber} {p.partLabel} - {p.title} ({p.allocatedMarks} درجات)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Pattern Type Selection & Question Position */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-xs font-black text-slate-900 block">
                  اختر نمط السؤال الإدخالي (من الـ 15 نمطاً):
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                  className="w-full bg-white border-2 border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-black text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {Object.entries(QUESTION_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">موقع السؤال والفرع في الورقة:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={questionNumber}
                    onChange={(e) => setQuestionNumber(Number(e.target.value) || 1)}
                    className="w-20 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-center"
                    placeholder="رقم"
                  />
                  <input
                    type="text"
                    value={questionPart}
                    onChange={(e) => setQuestionPart(e.target.value)}
                    className="w-20 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-center"
                    placeholder="أ/ب/ج"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">الدرجة المخصصة للسؤال:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={questionMarks}
                    onChange={(e) => setQuestionMarks(Number(e.target.value) || 5)}
                    className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-center"
                  />
                  <span className="text-xs text-slate-600 font-bold">درجات</span>
                </div>
              </div>
            </div>

            {/* Pattern Template Card (نموذج / قالب النمط التفاعلي مع أزرار نسخ وتنزيل كبيرة وملونة) */}
            <div className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl border border-slate-800 text-white space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white flex items-center gap-2">
                      <span>نموذج / قالب JSON معتمد لنمط:</span>
                      <span className="text-emerald-400 font-mono">
                        {QUESTION_TYPE_LABELS[questionType] || questionType}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      يمكنك نسخ أو تنزيل هذا القالب المعتمد للقياس عليه أو استخدامه في الاستيراد الجماعي
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyTemplate(questionType)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ القالب (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate(questionType)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تنزيل القالب (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUseTemplateInBulk(questionType)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>فتح في الاستيراد الجماعي</span>
                  </button>
                </div>
              </div>

              <pre
                className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto leading-relaxed border border-slate-850 text-left max-h-48"
                dir="ltr"
              >
                {PATTERN_TEMPLATES[questionType] || EXAMPLE_JSON_BULK}
              </pre>
            </div>

            {/* Question Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">نص السؤال والمسألة المطروحة:</label>
              <textarea
                rows={3}
                value={questionPrompt}
                onChange={(e) => setQuestionPrompt(e.target.value)}
                placeholder="اكتب هنا نص السؤال بدقة كما ورد في ورقة الامتحان السابقة..."
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            {/* Pattern-Specific Dynamic Inputs */}
            <div className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-4">
              <h3 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>بيانات النمط والإجابة النموذجية الصحيحة:</span>
              </h3>

              {questionType === QuestionType.TRUE_FALSE && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">الإجابة المعتمدة:</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-emerald-800 bg-white px-4 py-2 rounded-xl border border-emerald-300">
                      <input
                        type="radio"
                        checked={tfAnswer === true}
                        onChange={() => setTfAnswer(true)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>صحيحة (✓)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-rose-800 bg-white px-4 py-2 rounded-xl border border-rose-300">
                      <input
                        type="radio"
                        checked={tfAnswer === false}
                        onChange={() => setTfAnswer(false)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>خاطئة (✗)</span>
                    </label>
                  </div>
                </div>
              )}

              {questionType === QuestionType.MULTIPLE_CHOICE && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">
                    خيارات الإجابة (حدد الخيار الصحيح بزر الاختيار):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mcqOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 bg-white p-2.5 rounded-xl border ${
                          mcqCorrectIndex === idx ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mcq_correct"
                          checked={mcqCorrectIndex === idx}
                          onChange={() => setMcqCorrectIndex(idx)}
                          className="w-4 h-4 text-emerald-600"
                          title="تحديد كإجابة صحيحة"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...mcqOptions];
                            updated[idx] = e.target.value;
                            setMcqOptions(updated);
                          }}
                          className="w-full text-xs font-medium text-slate-800 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {questionType === QuestionType.FILL_BLANK && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      نص الجملة مع الإشارة إلى معرفات الفراغات:
                    </label>
                    <input
                      type="text"
                      value={fillTextWithBlanks}
                      onChange={(e) => setFillTextWithBlanks(e.target.value)}
                      placeholder="مثال: عاصمة السودان هي [blank_1] وتقع على ملتقى [blank_2]"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      اكتب معرف الفراغ بين قوسين مربعين مثل <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-mono">[blank_1]</code>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800">
                        الفراغات المحددة ({fillBlanks.length}):
                      </label>
                      <button
                        type="button"
                        onClick={handleAddBlank}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ إضافة فراغ</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {fillBlanks.map((blank, bIdx) => (
                        <div key={blank.id} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                              المعرف: [{blank.id}]
                            </span>
                            {fillBlanks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveBlank(bIdx)}
                                className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 block">
                              الإجابة النموذجية الصحيحة للفراغ:
                            </label>
                            <input
                              type="text"
                              value={blank.correctValue}
                              onChange={(e) => handleUpdateBlankCorrect(bIdx, e.target.value)}
                              placeholder="مثلاً: الخرطوم"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="space-y-1.5 pt-1 border-t border-slate-100">
                            <label className="text-xs font-bold text-slate-600 block">
                              خيارات وضع التدريب (3 خيارات لنمط tap_reveal_3 - تشمل الإجابة وخيارات مموهة):
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {blank.choices.map((choice, cIdx) => (
                                <input
                                  key={cIdx}
                                  type="text"
                                  value={choice}
                                  onChange={(e) => handleUpdateBlankChoice(bIdx, cIdx, e.target.value)}
                                  placeholder={`خيار ${cIdx + 1}`}
                                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {questionType === QuestionType.ARABIC_GRAMMAR && (
                <Pattern14AuthoringForm
                  initialPrompt={questionPrompt}
                  initialSentence={grammarWord ? `الجملة المحتوية على (${grammarWord})` : ''}
                  initialTargetWord={grammarWord}
                  onChange={(data) => {
                    setPattern14Data(data);
                    if (data.totalMarks > 0) {
                      setQuestionMarks(data.totalMarks);
                    }
                  }}
                />
              )}

              {questionType === QuestionType.ODD_ONE_OUT && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">الكلمات مفصولة بفاصلة (،):</label>
                    <input
                      type="text"
                      value={oddWords}
                      onChange={(e) => setOddWords(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">الكلمة الشاذة المعتمدة:</label>
                    <input
                      type="text"
                      value={oddAnswer}
                      onChange={(e) => setOddAnswer(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {questionType === QuestionType.CALCULATION && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">نمط المسألة:</span>
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="calc_mode"
                        checked={calcMode === 'multi_step_mcq'}
                        onChange={() => setCalcMode('multi_step_mcq')}
                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>مسألة حسابية متعددة الخطوات (النمط 7 - المعتمد)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="calc_mode"
                        checked={calcMode === 'numeric_with_work'}
                        onChange={() => setCalcMode('numeric_with_work')}
                        className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>مسألة رقمية بناتج نهائي (نمط قديم)</span>
                    </label>
                  </div>

                  {calcMode === 'multi_step_mcq' ? (
                    <Pattern7AuthoringForm
                      initialPrompt={questionPrompt}
                      onChange={(data) => {
                        setPattern7Data(data);
                        if (data.prompt) setQuestionPrompt(data.prompt);
                        setQuestionMarks(data.total_marks);
                      }}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">المعادلة أو القانون المستخدم:</label>
                        <input
                          type="text"
                          value={calcExpression}
                          onChange={(e) => setCalcExpression(e.target.value)}
                          placeholder="∫ (3x² + 4x + 1) dx"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">الناتج الرقمي النهائي:</label>
                        <input
                          type="text"
                          value={calcAnswer}
                          onChange={(e) => setCalcAnswer(e.target.value)}
                          placeholder="18"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {questionType === QuestionType.MATCHING && (
                <div className="space-y-5 bg-white p-4 rounded-2xl border border-emerald-200">
                  {/* Pairs Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800">
                        أزواج المطابقة الأساسية ({matchingPairs.length}):
                      </label>
                      <button
                        type="button"
                        onClick={handleAddMatchingPair}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ إضافة زوج مطابقة</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {matchingPairs.map((pair, pIdx) => (
                        <div key={pair.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <div className="sm:col-span-1 text-center font-mono font-bold text-xs text-indigo-700">
                            #{pIdx + 1}
                          </div>
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              value={pair.source}
                              onChange={(e) => handleUpdateMatchingPair(pIdx, 'source', e.target.value)}
                              placeholder="العنصر الأساسي (Source)"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="sm:col-span-5">
                            <input
                              type="text"
                              value={pair.target}
                              onChange={(e) => handleUpdateMatchingPair(pIdx, 'target', e.target.value)}
                              placeholder="العنصر المطابق (Target)"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div className="sm:col-span-1 text-center">
                            {matchingPairs.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMatchingPair(pIdx)}
                                className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="حذف الزوج"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Distractors Section */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700">
                        العناصر المشتتة المبعثرة (Distractors - اختياري):
                      </label>
                      <button
                        type="button"
                        onClick={handleAddMatchingDistractor}
                        className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ إضافة مشتت مبعثر</span>
                      </button>
                    </div>

                    {matchingDistractors.length > 0 && (
                      <div className="space-y-2">
                        {matchingDistractors.map((dist, dIdx) => (
                          <div key={dist.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-400 font-mono px-1">مشتت {dIdx + 1}</span>
                            <input
                              type="text"
                              value={dist.target}
                              onChange={(e) => handleUpdateMatchingDistractor(dIdx, e.target.value)}
                              placeholder="نص الخيار المشتت الخاطئ"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveMatchingDistractor(dIdx)}
                              className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scoring Type Radio */}
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <label className="text-xs font-black text-slate-800 block">
                      آلية احتساب درجات المطابقة (Scoring Type):
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-indigo-900 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-200">
                        <input
                          type="radio"
                          name="matching_scoring_type"
                          value="partial"
                          checked={matchingScoringType === 'partial'}
                          onChange={() => setMatchingScoringType('partial')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>احتساب جزئي (Partial) - درجات متناسبة لكل ربط صحيح</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                        <input
                          type="radio"
                          name="matching_scoring_type"
                          value="all_or_nothing"
                          checked={matchingScoringType === 'all_or_nothing'}
                          onChange={() => setMatchingScoringType('all_or_nothing')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>كل شيء أو لا شيء (All or Nothing) - الربط التام فقط يمنح الدرجة</span>
                      </label>
                    </div>
                  </div>

                  {/* Interactive Live Preview */}
                  {matchingPairs.some((p) => p.source.trim() && p.target.trim()) && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                      <div className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-emerald-600" />
                        <span>معاينة حية وتفاعلية لنمط المطابقة (Tap-to-Connect Preview):</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <MatchingRenderer
                          content={{
                            prompt: questionPrompt,
                            pairs: matchingPairs.filter((p) => p.source.trim() && p.target.trim()),
                            distractors: matchingDistractors.filter((d) => d.target.trim()),
                            scoring_type: matchingScoringType,
                          }}
                          examMode="training"
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {questionType === QuestionType.SHORT_ESSAY && (
                <Pattern8AuthoringForm
                  initialValues={
                    pattern8Data || {
                      question_text: questionPrompt,
                      model_answer: '',
                      mandatory_keywords: [],
                      hint: '',
                      max_words: 30,
                      max_score: questionMarks,
                      grading_mode: 'auto',
                      partial_threshold: 0.5,
                    }
                  }
                  onChange={(data) => {
                    setPattern8Data(data);
                    if (data.question_text) setQuestionPrompt(data.question_text);
                    if (data.max_score) setQuestionMarks(data.max_score);
                  }}
                />
              )}

              {questionType === QuestionType.CONTOUR_MAP && (
                <Pattern11AuthoringForm
                  initialValues={
                    pattern11Data || {
                      prompt: questionPrompt,
                      totalMarks: questionMarks,
                    }
                  }
                  onChange={(data) => {
                    setPattern11Data(data);
                    if (data.prompt) setQuestionPrompt(data.prompt);
                    if (data.totalMarks) setQuestionMarks(data.totalMarks);
                  }}
                />
              )}

              {questionType === QuestionType.DIAGRAM_LABELING && (
                isLegacyDiagram ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 text-xs dir-rtl text-right">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-800">
                        نمط قديم (Legacy Labels): هذا السؤال مبني بالصيغة القديمة لتسمية الأجزاء.
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsLegacyDiagram(false)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors"
                      >
                        الترقية للمحرر البصري الجديد (C2)
                      </button>
                    </div>
                    <p className="text-amber-700">
                      يمكنك مراجعة وتعديل هذا السؤال القديم عبر قالب JSON المتقدم أدناه، أو ترقيته لتأليف الفروع والنطاقات بالمحرر البصري التفاعلي الجديد.
                    </p>
                  </div>
                ) : (
                  <DiagramAuthoringForm
                    initialValues={
                      diagramData || {
                        prompt: questionPrompt,
                        totalMarks: questionMarks,
                      }
                    }
                    onChange={(data) => {
                      setDiagramData(data);
                      if (data.prompt) setQuestionPrompt(data.prompt);
                      if (data.totalMarks) setQuestionMarks(data.totalMarks);
                    }}
                  />
                )
              )}

              {/* Fallback text answer for Essays, Explain, etc. */}
              {questionType !== QuestionType.TRUE_FALSE &&
                questionType !== QuestionType.MULTIPLE_CHOICE &&
                questionType !== QuestionType.FILL_BLANK &&
                questionType !== QuestionType.ARABIC_GRAMMAR &&
                questionType !== QuestionType.ODD_ONE_OUT &&
                questionType !== QuestionType.CALCULATION &&
                questionType !== QuestionType.MATCHING &&
                questionType !== QuestionType.SHORT_ESSAY &&
                questionType !== QuestionType.CONTOUR_MAP &&
                questionType !== QuestionType.DIAGRAM_LABELING && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">الحل النموذجي المعتمد:</label>
                    <input
                      type="text"
                      value={blankAnswer}
                      onChange={(e) => setBlankAnswer(e.target.value)}
                      placeholder="اكتب الإجابة النموذجية المعتمدة في معايير التصحيح المنهجي..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                )}
            </div>

            {/* Educational Explanation */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>الشرح والتوجيه المنهجي (يظهر للطالب في نتائج التدريب لتعزيز الفهم):</span>
              </label>
              <textarea
                rows={2}
                value={explanationAr}
                onChange={(e) => setExplanationAr(e.target.value)}
                placeholder="بيان سبب صحة الإجابة، الاستدلال من المقرر، أو خطوات الحل التربوية..."
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs font-medium text-slate-800 leading-relaxed"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveAuthoredQuestion}
                className={`px-8 py-3 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                  editingQuestionId
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>
                  {editingQuestionId
                    ? `حفظ التعديلات وتحديث الخريطة والبيانات`
                    : `حفظ السؤال في بنك مادة ${blueprint.name_ar}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: QUESTION BANK EXPLORER                             */}
      {/* ========================================================= */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          {/* STEP 1: All Subjects Selection Grid */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>1. اختر المادة الدراسية:</span>
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">المادة الحالية: <strong>{blueprint.name_ar}</strong></span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {TWELVE_CONTRACT_SUBJECTS.map((sub) => {
                const isSelected = sub.slug === selectedSubjectSlug;
                return (
                  <button
                    key={sub.slug}
                    type="button"
                    onClick={() => handleSubjectChange(sub.slug)}
                    className={`p-2.5 rounded-2xl border text-xs font-bold transition-all text-center flex items-center justify-between gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm ring-2 ring-emerald-200'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">{sub.name_ar}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2 & 3: Exam Scope, Years, Pattern & Search Bar */}
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 2. Exam Scope / Method Filter */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">2. طريقة الامتحان / النطاق:</label>
                <select
                  value={bankScopeFilter}
                  onChange={(e) => setBankScopeFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جميع طرق الامتحان (الكل)</option>
                  <option value="training">امتحان تدريبي (تدريب وتحصيل)</option>
                  <option value="yearly_exam">امتحان كامل / محاكاة سيمولاتور</option>
                  <option value="curriculum_review">مراجعة المنهج والمقرر</option>
                </select>
              </div>

              {/* Specific Exam Year Filter */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">سنوات محددة:</label>
                <select
                  value={bankYearFilter === 'all' ? 'all' : String(bankYearFilter)}
                  onChange={(e) => setBankYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جميع السنوات والمواسم</option>
                  <option value="2024">دورة 2024م</option>
                  <option value="2023">دورة 2023م</option>
                  <option value="2022">دورة 2022م</option>
                  <option value="2021">دورة 2021م</option>
                </select>
              </div>

              {/* 3. Question Pattern Filter */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">3. نوع / نمط السؤال:</label>
                <select
                  value={bankPatternFilter}
                  onChange={(e) => setBankPatternFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">جميع الأنماط الـ 16</option>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([typeKey, labelStr]) => (
                    <option key={typeKey} value={typeKey}>
                      {labelStr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh Bank Button */}
              <div className="space-y-1 flex flex-col justify-end">
                <button
                  type="button"
                  disabled={isLoadingBank}
                  onClick={() => fetchServerQuestions(selectedSubjectSlug)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-300"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBank ? 'animate-spin' : ''}`} />
                  <span>مزامنة وتحديث البنك</span>
                </button>
              </div>
            </div>

            {/* 4. Real-time Search Box */}
            <div className="relative pt-1">
              <div className="absolute inset-y-0 right-0 pr-3.5 pt-1 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={bankSearchQuery}
                onChange={(e) => setBankSearchQuery(e.target.value)}
                placeholder="ابحث عن سؤال المادة باسمه، بنص السؤال، بكلمة منه، بالرقم أو بمعرف الحفظ..."
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pr-10 pl-10 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              {bankSearchQuery && (
                <button
                  type="button"
                  onClick={() => setBankSearchQuery('')}
                  className="absolute inset-y-0 left-0 pl-3 pt-1 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Bank Error Notification */}
          {bankError && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{bankError}</span>
            </div>
          )}

          {/* Results Summary Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-slate-800">
              الأسئلة المعروضة المطابقة للترشيح: ({filteredBankQuestions.length} من إجمالي {questionsList.length} سؤال)
            </span>

            {(bankScopeFilter !== 'all' || bankYearFilter !== 'all' || bankPatternFilter !== 'all' || bankSearchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setBankScopeFilter('all');
                  setBankYearFilter('all');
                  setBankPatternFilter('all');
                  setBankSearchQuery('');
                }}
                className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>إعادة ضبط جميع الفلاتر</span>
              </button>
            )}
          </div>

          {/* Questions List */}
          {isLoadingBank ? (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
              <div className="text-xs font-bold text-slate-600">جاري تحميل أسئلة البنك وتطبيق الفلاتر...</div>
            </div>
          ) : filteredBankQuestions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="font-extrabold text-slate-800 text-sm">لم يتم العثور على أسئلة تطابق معايير البحث والترشيح</div>
              <p className="text-xs text-slate-500">
                جرّب تعديل خيارات التصفية أو التبديل إلى تبويب "محرك إدخال الأسئلة للأنماط" لإضافة سؤال جديد.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBankQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-black text-xs">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">
                        السؤال {q.questionNumber} {q.partLabel}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                        {QUESTION_TYPE_LABELS[q.questionType] || q.questionType}
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                        {q.allocatedMarks} درجات
                      </span>
                      {q.examYear && (
                        <span className="text-[10px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-bold">
                          دورة {q.examYear}م
                        </span>
                      )}
                    </div>

                    {/* Action Buttons: Preview / Edit / Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewQuestion(q);
                          setPreviewAnswer(null);
                        }}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="معاينة تفاعلية لهذا السؤال"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>معاينة</span>
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleEditQuestion(q)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="تعديل السؤال وإعادة فتح المحرر"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                        <span>تعديل</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="حذف السؤال بالكامل"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>مسح</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                    {q.prompt || (q.content as any)?.prompt || (q.content as any)?.sentence || 'نص السؤال:'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <span>الإجابة المعتمدة:</span>
                      <span className="truncate max-w-sm">
                        {typeof q.correctAnswer === 'object'
                          ? JSON.stringify(q.correctAnswer)
                          : String(q.correctAnswer)}
                      </span>
                    </div>

                    {q.explanationAr && (
                      <div className="text-slate-400 font-medium line-clamp-1 max-w-md">
                        الشرح: {q.explanationAr}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Interactive Question Preview Modal */}
          {previewQuestion && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden space-y-4 p-6 dir-rtl text-right">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-black text-slate-900">
                      معاينة تفاعلية للسؤال (#{previewQuestion.questionNumber} - {QUESTION_TYPE_LABELS[previewQuestion.questionType]})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle Preview Mode */}
                    <button
                      type="button"
                      onClick={() => setPreviewExamMode(previewExamMode === 'training' ? 'simulator' : 'training')}
                      className="px-3 py-1 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold border border-slate-200"
                    >
                      الوضع: {previewExamMode === 'training' ? 'وضع التدريب (إظهار التلميحات)' : 'وضع المحاكاة (امتحان)'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewQuestion(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Interactive Question Dispatcher */}
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/80">
                  <QuestionDispatcher
                    question={previewQuestion}
                    answer={previewAnswer}
                    onChange={setPreviewAnswer}
                    isReadonly={false}
                    examMode={previewExamMode}
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    يمكنك التجربة التفاعلية للاستجابات واختبار التلميحات فوق هذه الشاشة مباشرةً.
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewQuestion(null)}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
                  >
                    إغلاق المعاينة
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: BULK QUESTION IMPORTER (JSON & CSV)                */}
      {/* ========================================================= */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-emerald-600" />
                  <span>استيراد جماعي للأسئلة لمادة ({blueprint.name_ar})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  اختر نوع الاستيراد والتنسيق المطلوب (JSON للأنماط العامة أو JSON/CSV المخصص لأسئلة الترتيب والتسلسل)
                </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBulkImportType('all_json');
                    setJsonParseError(null);
                    setValidationResult(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    bulkImportType === 'all_json'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  أنماط عامة (JSON)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkImportType('ordering');
                    setJsonParseError(null);
                    setValidationResult(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    bulkImportType === 'ordering'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  أسئلة ترتيب وتسلسل (Ordering)
                </button>
              </div>
            </div>

            {bulkImportType === 'ordering' && (
              <div className="space-y-4 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950">تنسيق استيراد الترتيب والتسلسل:</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-900">
                      <input
                        type="radio"
                        name="ordering_format"
                        value="json"
                        checked={orderingFormat === 'json'}
                        onChange={() => setOrderingFormat('json')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>JSON</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-900 mr-3">
                      <input
                        type="radio"
                        name="ordering_format"
                        value="csv"
                        checked={orderingFormat === 'csv'}
                        onChange={() => setOrderingFormat('csv')}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>CSV</span>
                    </label>
                  </div>
                </div>

                <p className="text-xs text-indigo-800 leading-relaxed">
                  {orderingFormat === 'csv'
                    ? 'صيغة CSV: السطر يبدأ بنص السؤال ثم العناصر بالترتيب الصحيح مفصولة بفاصلة (مثال: "رتب الأحداث:",حدث1,حدث2,حدث3,5). يلزم عنصرين على الأقل.'
                    : 'صيغة JSON: مصفوفة من الكائنات تضمن prompt و items (مصفوفة نصوص أو كائنات بها text). يتم إنشاء المعرفات (s1, s2...) تلقائياً.'}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-700 block">
                      المحتوى ({orderingFormat.toUpperCase()}):
                    </label>
                    {bulkJsonText && (
                      <button
                        type="button"
                        onClick={() => {
                          setBulkJsonText('');
                          setJsonParseError(null);
                        }}
                        className="text-[11px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                      >
                        مسح النص
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={12}
                    value={bulkJsonText}
                    onChange={(e) => {
                      setBulkJsonText(e.target.value);
                      setJsonParseError(null);
                    }}
                    placeholder={
                      orderingFormat === 'csv'
                        ? '"رتب خلفاء بني أمية:",معاوية بن أبي سفيان,يزيد بن معاوية,عبد الملك بن مروان,5\n"رتب الأحداث التاريخية:",استقلال السودان 1956,ثورة أكتوبر 1964,انتفاضة أبريل 1985,5'
                        : '[\n  {\n    "prompt": "رتب الأحداث التاريخية التالية من الأقدم للأحدث:",\n    "items": ["استقلال السودان 1956", "ثورة أكتوبر 1964", "انتفاضة أبريل 1985"],\n    "allocatedMarks": 5\n  }\n]'
                    }
                    dir="ltr"
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleImportOrderingQuestions}
                    disabled={!bulkJsonText.trim() || isImporting}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جارٍ استيراد أسئلة الترتيب...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>استيراد أسئلة الترتيب والتسلسل (Bulk Import Ordering)</span>
                      </>
                    )}
                  </button>
                </div>

                {jsonParseError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 text-xs">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-black">خطأ في استيراد أسئلة الترتيب:</p>
                      <pre className="font-mono text-[11px] text-rose-700 whitespace-pre-wrap">{jsonParseError}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {bulkImportType === 'all_json' && (
              <>

            {/* Exam Type Selector for Bulk Import */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">تحديد نوع الامتحان للاستيراد الجماعي:</span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {bulkScope === 'curriculum_review' ? 'امتحان تدريبي (شامل للمقرر)' : `امتحان دورة سنة ${bulkYear}م`}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 block">نوع ونطاق الامتحان:</label>
                  <select
                    value={bulkScope}
                    onChange={(e) => setBulkScope(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="both">امتحان تدريبي أو كامل (عام)</option>
                    <option value="curriculum_review">امتحان تدريبي (شامل للمقرر)</option>
                    <option value="yearly_exam">امتحان سنة محددة (Past Exam / Full Exam)</option>
                  </select>
                </div>

                {bulkScope !== 'curriculum_review' && (
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 block">
                      اختر سنة الدورة (من 2000 حتى 2026):
                    </label>
                    <select
                      value={bulkYear}
                      onChange={(e) => setBulkYear(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {curriculumStorage.getAllSupportedYears().map((yr) => (
                        <option key={yr} value={yr}>
                          دورة عام {yr}م
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Quick 15-Pattern Template Selector for Bulk Import */}
            <div className="p-4 bg-indigo-950 text-white rounded-2xl border border-indigo-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black">اختر نموذج/قالب لأي نمط من الـ 15 نمطاً لتحميل كوده تلقائياً:</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={questionType}
                    onChange={(e) => {
                      const newType = e.target.value as QuestionType;
                      setQuestionType(newType);
                      setBulkJsonText(PATTERN_TEMPLATES[newType] || EXAMPLE_JSON_BULK);
                    }}
                    className="bg-slate-900 border border-slate-700 text-emerald-400 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {Object.entries(QUESTION_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleCopyTemplate(questionType)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate(questionType)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تنزيل</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Example JSON Details */}
            <details className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs group">
              <summary className="font-black text-slate-800 cursor-pointer flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>عرض مثال عام لهيكل ملف JSON المقبول (اضغط للعرض)</span>
                </span>
                <span className="text-[11px] text-slate-400 group-open:hidden">إظهار</span>
                <span className="text-[11px] text-slate-400 hidden group-open:inline">إخفاء</span>
              </summary>
              <pre
                className="mt-3 p-4 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto leading-relaxed border border-slate-800 text-left"
                dir="ltr"
              >
                {EXAMPLE_JSON_BULK}
              </pre>
            </details>

            {/* Textarea for JSON input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 block">
                  محتوى كود JSON (انسخ والصق الكود هنا):
                </label>
                {bulkJsonText && (
                  <button
                    type="button"
                    onClick={() => {
                      setBulkJsonText('');
                      setValidationResult(null);
                      setJsonParseError(null);
                      setImportSummaryResult(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                  >
                    مسح النص
                  </button>
                )}
              </div>

              <textarea
                rows={15}
                value={bulkJsonText}
                onChange={(e) => {
                  setBulkJsonText(e.target.value);
                  setJsonParseError(null);
                }}
                placeholder="الصق بيانات JSON هنا..."
                dir="ltr"
                className="w-full bg-slate-950 text-slate-100 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed text-left placeholder:text-slate-600"
              />
            </div>

            {/* Validate Button */}
            <div>
              <button
                type="button"
                onClick={handleValidateBulkJson}
                disabled={!bulkJsonText.trim() || isValidating}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ فحص وتحقق البيانات من الخادم...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>معاينة وتحقق من صحة البيانات</span>
                  </>
                )}
              </button>
            </div>

            {/* JSON Parse Error Alert */}
            {jsonParseError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-900 text-xs">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-black">خطأ في التحقق من البيانات:</p>
                  <p className="font-mono text-[11px] text-rose-700">{jsonParseError}</p>
                </div>
              </div>
            )}

            {/* Validation Results Display */}
            {validationResult && (
              <div className="space-y-5 pt-4 border-t border-slate-200">
                <h3 className="text-sm font-black text-slate-900">نتائج الفحص والتحقق الأولي:</h3>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[11px] text-slate-500 font-bold block">إجمالي الأسئلة</span>
                    <span className="text-base font-black text-slate-900">{validationResult.total}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                    <span className="text-[11px] text-emerald-700 font-bold block">أسئلة صالحة</span>
                    <span className="text-base font-black text-emerald-800">{validationResult.valid}</span>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                    <span className="text-[11px] text-rose-700 font-bold block">أسئلة بها أخطاء</span>
                    <span className="text-base font-black text-rose-800">{validationResult.invalid}</span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <span className="text-[11px] text-amber-700 font-bold block">تحذيرات تكرار</span>
                    <span className="text-base font-black text-amber-800">
                      {validationResult.duplicateWarnings.length}
                    </span>
                  </div>
                </div>

                {/* Validation Errors List (All-or-Nothing block) */}
                {validationResult.invalid > 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-rose-900 font-black text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>
                        تم العثور على ({validationResult.invalid}) سؤال به أخطاء في البنية (All-or-Nothing Invariant):
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-700">
                      وفق سياسة النظام، لا يمكن إدراج أي سؤال حتى يتم تصحيح كافة الأخطاء المبينة أدناه وإعادة التحقق:
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {validationResult.errors.map((err, eIdx) => (
                        <div
                          key={eIdx}
                          className="p-2.5 bg-white border border-rose-200 rounded-xl text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-bold text-rose-900">
                            <span>السؤال رقم #{err.index + 1}</span>
                            <span className="font-mono text-[11px] text-slate-500">[{err.questionType}]</span>
                          </div>
                          <ul className="list-disc list-inside text-[11px] text-rose-700 space-y-0.5">
                            {err.errors.map((msg, mIdx) => (
                              <li key={mIdx}>{msg}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duplicate Warnings with Interactive Skip/Import Choice */}
                {validationResult.duplicateWarnings.length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-950 font-black text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>
                        تنبيه: تم العثور على ({validationResult.duplicateWarnings.length}) سؤال مكرر مسبقاً في قاعدة البيانات:
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      حدد قرارك لكل سؤال مكرر: هل ترغب في تخطيه أم إعادة استيراده كنسخة إضافية؟
                    </p>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto">
                      {validationResult.duplicateWarnings.map((dup) => {
                        const currentDecision = duplicateDecisions[dup.index] || 'skip';
                        return (
                          <div
                            key={dup.index}
                            className="p-3 bg-white border border-amber-200 rounded-xl space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900">
                                السؤال #{dup.index + 1}: {dup.questionPrompt}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDuplicateDecisions((prev) => ({ ...prev, [dup.index]: 'skip' }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    currentDecision === 'skip'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  تخطي (Skip)
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDuplicateDecisions((prev) => ({ ...prev, [dup.index]: 'import' }))
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    currentDecision === 'import'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  استيراد (Import)
                                </button>
                              </div>
                            </div>
                            <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg font-mono">
                              موجود مسبقاً بالمعرف: {dup.existingQuestionId} (الحالة: {dup.status})
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Final Confirmation Button */}
                {validationResult.invalid === 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleConfirmBulkImport}
                      disabled={isImporting}
                      className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جارٍ تنفيذ معاملة الاستيراد في قاعدة البيانات...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>
                            تأكيد الاستيراد الفعلي (إدراج {validationResult.valid - (Object.values(duplicateDecisions).filter((d) => d === 'skip').length)} سؤال)
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Import Summary Result Banner */}
                {importSummaryResult && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start gap-3 text-emerald-950 text-xs">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-black text-sm">اكتمل الاستيراد الجماعي بنجاح!</p>
                      <p className="text-emerald-800">
                        تم إدراج <strong>{importSummaryResult.imported}</strong> سؤال في قاعدة البيانات
                        {importSummaryResult.skipped > 0 && (
                          <span> (تم تخطي {importSummaryResult.skipped} سؤال مكرر بناءً على قرارك)</span>
                        )}.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
