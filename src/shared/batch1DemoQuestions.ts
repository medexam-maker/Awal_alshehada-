/**
 * Batch 1 Demo Questions: Odd One Out (Physics) and Comparison Table (Geography).
 * Standard canonical implementations for Sudanese Secondary Certificate Exam Platform.
 */
import { QuestionType } from './constants';

export const DEMO_ODD_ONE_OUT = {
  subjectSlug: 'physics',
  row: {
    id: 'demo_physics_odd_one_out_01',
    subject_id: 'physics',
    question_type: QuestionType.ODD_ONE_OUT,
    primary_interaction_mode: 'large_cards',
    marks: 4,
    content: {
      prompt: 'استخرج الكلمة الشاذة من بين الأدوات والمكونات البصرية التالية ثم علّل اختيارك:',
      items: [
        { id: 'i1', text: 'التلسكوب' },
        { id: 'i2', text: 'العدسة المحدبة' },
        { id: 'i3', text: 'المرآة المستوية' },
        { id: 'i4', text: 'العدسة المقعرة' },
      ],
      reasoning: {
        prompt: 'علل سبب استبعادك لهذه الكلمة:',
        marksFraction: 0.5,
        trainingChoices: [
          { id: 'r1', text: 'لأنه جهاز بصري مركب من عدة أجزاء بينما البقية عناصر بصرية منفردة' },
          { id: 'r2', text: 'لأنه أداة فلكية لا تستخدم في المعامل الفيزيائية' },
          { id: 'r3', text: 'لأنه يعتمد على المرايا المقعرة فقط في تجميع الضوء' },
        ],
      },
    },
    correct_answer: {
      selectedItemIds: ['i1'],
      reasoning: {
        correctChoiceId: 'r1',
        keywordGroups: [
          ['جهاز', 'اداة'],
          ['مركب', 'مركبة', 'عدة'],
          ['بصرية'],
        ],
        minGroups: 2,
      },
    },
    explanation: 'التلسكوب هو جهاز بصري مركب من عدة عدسات أو مرايا، بينما العدسة المحدبة والمرآة المستوية والعدسة المقعرة هي عناصر أو قطع بصرية منفردة.',
  },
};

export const DEMO_COMPARISON_TABLE = {
  subjectSlug: 'geography',
  row: {
    id: 'demo_geography_comparison_table_01',
    subject_id: 'geography',
    question_type: QuestionType.COMPARISON_TABLE,
    primary_interaction_mode: 'table_dropdown',
    marks: 6,
    content: {
      prompt: 'قارن بين الإقليم الصحراوي وإقليم السافانا الغنية في السودان وفق المعايير الموضحة بالجدول:',
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
                { id: 'c11_opt3', text: 'غزيرة تفوق 800 ملم' },
              ],
            },
            {
              id: 'c12',
              value: null,
              options: [
                { id: 'c12_opt1', text: 'غزيرة تفوق 700 ملم' },
                { id: 'c12_opt2', text: 'جافة ونادرة' },
                { id: 'c12_opt3', text: 'أمطار شتوية إعصارية' },
              ],
            },
          ],
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
                { id: 'c21_opt3', text: 'حشائش استبس قصيرة كثيفة' },
              ],
            },
            {
              id: 'c22',
              value: null,
              options: [
                { id: 'c22_opt1', text: 'حشائش طويلة وأشجار متباعدة' },
                { id: 'c22_opt2', text: 'نباتات عصيرية نادرة' },
                { id: 'c22_opt3', text: 'أشجار البلوط والصنوبر' },
              ],
            },
          ],
        },
        {
          id: 'r3',
          label: 'النشاط الاقتصادي الرئيسي',
          cells: [
            {
              id: 'c31',
              value: null,
              options: [
                { id: 'c31_opt1', text: 'الرعي المتنقل حول الواحات' },
                { id: 'c31_opt2', text: 'الزراعة المطرية الكثيفة' },
                { id: 'c31_opt3', text: 'قطع الأخشاب وصناعة الورق' },
              ],
            },
            {
              id: 'c32',
              value: null,
              options: [
                { id: 'c32_opt1', text: 'الزراعة المطرية والرعي الواسع' },
                { id: 'c32_opt2', text: 'صيد الأسماك في المحيطات' },
                { id: 'c32_opt3', text: 'جمع الصمغ في الصحراء' },
              ],
            },
          ],
        },
      ],
    },
    correct_answer: {
      cells: {
        c11: 'c11_opt1',
        c12: 'c12_opt1',
        c21: 'c21_opt1',
        c22: 'c22_opt1',
        c31: 'c31_opt1',
        c32: 'c32_opt1',
      },
    },
    explanation: 'الإقليم الصحراوي يتميز بقلة الأمطار والنباتات الشوكية والرعي المتنقل، بينما السافانا الغنية تتميز بغزارة الأمطار والحشائش الطويلة والزراعة المطرية والرعي.',
  },
};
