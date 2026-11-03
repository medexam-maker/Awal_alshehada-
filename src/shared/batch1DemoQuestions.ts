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

export const DEMO_READING_ACTIVE_JOURNEY = {
  subjectSlug: 'arabic',
  row: {
    id: 'demo_arabic_reading_journey_01',
    subject_id: 'arabic',
    question_type: QuestionType.READING_COMPREHENSION,
    primary_interaction_mode: 'passage_with_questions_and_summary',
    marks: 10,
    content: {
      prompt: 'اقرأ النص الأدبي التالي بتمعن ثم أجب عن الأسئلة الخمسة المرفقة مستخدماً أدوات القراءة النشطة:',
      passageId: 'arabic_sec_2026_p1',
      passageTitle: 'ثورة التعليم الرقمي وأثرها في بناء مجتمع المعرفة',
      passage: `تعد التكنولوجيا الرقمية في العصر الحديث المحرك الأساسي لتحولات المعرفة الإنسانية، حيث تجاوزت كونها مجرد أدوات مساعدة إلى إعادة تشكيل بنية التفكير والتعلم. إن التوسع في البيئات التعليمية التفاعلية أتاح للطلاب مجالات رحبة للاكتشاف الذاتي والبحث المباشر عن الحقائق دون الاقتصار على التلقين المباشر.\n\nغير أن هذا التحول التقني السريع يفرض تحديات جليلة تتصل بضرورة تمحيص المعلومات والتحقق من مصداقيتها قبل اعتمادها. إن استهلاك المعرفة الرقمية دون تحكيم الفكر النقدي يؤدي إلى السطحية وضياع الهوية الفكرية الصافية، وهو ما يحتم على المؤسسات التعليمية ترسيخ مهارات التحليل والاستنتاج لدى النشء.\n\nوبناءً عليه، يظل المعلم الركيزة الأهم والأسمى في هذه المنظومة؛ إذ يقع على عاتقه توجيه بوصلة المتعلم، وتحويل الكم الهائل من البيانات الصامتة إلى معرفة حية تبني مجتمعات واعية وقادرة على الابتكار والمنافسة الحضارية.`,
      paragraphs: [
        {
          id: 'p1',
          number: 1,
          text: 'تعد التكنولوجيا الرقمية في العصر الحديث المحرك الأساسي لتحولات المعرفة الإنسانية، حيث تجاوزت كونها مجرد أدوات مساعدة إلى إعادة تشكيل بنية التفكير والتعلم. إن التوسع في البيئات التعليمية التفاعلية أتاح للطلاب مجالات رحبة للاكتشاف الذاتي والبحث المباشر عن الحقائق دون الاقتصار على التلقين المباشر.',
        },
        {
          id: 'p2',
          number: 2,
          text: 'غير أن هذا التحول التقني السريع يفرض تحديات جليلة تتصل بضرورة تمحيص المعلومات والتحقق من مصداقيتها قبل اعتمادها. إن استهلاك المعرفة الرقمية دون تحكيم الفكر النقدي يؤدي إلى السطحية وضياع الهوية الفكرية الصافية، وهو ما يحتم على المؤسسات التعليمية ترسيخ مهارات التحليل والاستنتاج لدى النشء.',
        },
        {
          id: 'p3',
          number: 3,
          text: 'وبناءً عليه، يظل المعلم الركيزة الأهم والأسمى في هذه المنظومة؛ إذ يقع على عاتقه توجيه بوصلة المتعلم، وتحويل الكم الهائل من البيانات الصامتة إلى معرفة حية تبني مجتمعات واعية وقادرة على الابتكار والمنافسة الحضارية.',
        },
      ],
      vocabulary: [
        { id: 'v1', word: 'تمحيص', paragraphId: 'p2', definition: 'تدقيق واختبار ونقد المعلومات لتخليصها من الخطأ', root: 'محص', contextualNote: 'وردت في سياق تمحيص المعلومات قبل اعتمادها' },
        { id: 'v2', word: 'جليلة', paragraphId: 'p2', definition: 'عظيمة وكبيرة القدر والتأثير', root: 'جلل', contextualNote: 'تحديات جليلة تعني تحديات عظيمة' },
      ],
      subQuestions: [
        {
          id: 'sq1',
          skill: 'literal',
          prompt: 'ما الذي أتاح للطلاب مجالات رحبة للاكتشاف الذاتي وفق الفقرة الأولى؟',
          type: 'multiple_choice',
          marks: 2,
          options: [
            { id: 'sq1_opt1', text: 'التوسع في البيئات التعليمية التفاعلية' },
            { id: 'sq1_opt2', text: 'الاقتصار على التلقين المباشر والكتب التقليدية' },
            { id: 'sq1_opt3', text: 'إلغاء دور المعلم المباشر في الفصل' },
          ],
          correctOptionId: 'sq1_opt1',
          evidence: {
            required: true,
            prompt: 'اختر الفقرة الأولى كدليل نصي لهذه الإجابة',
            targetParagraphId: 'p1',
          },
          hints: [
            { level: 1, text: 'ركز على الجملة الأخيرة في الفقرة الأولى (الفقرة 1)', focusParagraphId: 'p1' },
          ],
        },
        {
          id: 'sq2',
          skill: 'vocabulary',
          prompt: 'ما المعنى السياقي الدقيق لكلمة "تمحيص" كما وردت في الفقرة الثانية؟',
          type: 'multiple_choice',
          marks: 2,
          options: [
            { id: 'sq2_opt1', text: 'تدقيق واختبار الفكرة والتحقق من صحتها' },
            { id: 'sq2_opt2', text: 'حفظ المعلومات ونقلها بدون تعديل' },
            { id: 'sq2_opt3', text: 'إلغاء البيانات الرقمية والامتناع عن استخدامها' },
          ],
          correctOptionId: 'sq2_opt1',
          hints: [
            { level: 1, text: 'ابحث عن كلمة تمحيص في الفقرة الثانية واطلع على ما بعدها: والتحقق من مصداقيتها', focusParagraphId: 'p2' },
          ],
        },
        {
          id: 'sq3',
          skill: 'inference',
          prompt: 'ما الخطورة الرئيسة الناجمة عن استهلاك المعرفة الرقمية دون تحكيم الفكر النقدي؟',
          type: 'multiple_choice',
          marks: 2,
          options: [
            { id: 'sq3_opt1', text: 'الوقوع في السطحية وضياع الهوية الفكرية الصافية' },
            { id: 'sq3_opt2', text: 'ارتفاع تكاليف الأجهزة الإلكترونية' },
            { id: 'sq3_opt3', text: 'بطء سرعة شبكات الاتصال الحديثة' },
          ],
          correctOptionId: 'sq3_opt1',
          evidence: {
            required: true,
            prompt: 'حدد الفقرة الثانية التي تبين أثر غياب الفكر النقدي',
            targetParagraphId: 'p2',
          },
        },
        {
          id: 'sq4',
          skill: 'analysis',
          prompt: 'كيف يتكامل دور المعلم مع التكنولوجيا الحديثة حسب رؤية الكاتب في الفقرة الثالثة؟',
          type: 'multiple_choice',
          marks: 2,
          options: [
            { id: 'sq4_opt1', text: 'بتحويل البيانات الصامتة إلى معرفة حية وتوجيه بوصلة المتعلم' },
            { id: 'sq4_opt2', text: 'باستبدال الأجهزة الرقمية بالكامل وحظر استخدامها' },
            { id: 'sq4_opt3', text: 'بالاقتصار على جمع البيانات وتخزينها دون تحليل' },
          ],
          correctOptionId: 'sq4_opt1',
          evidence: {
            required: true,
            prompt: 'حدد الفقرة الثالثة كدليل لنشاط المعلم',
            targetParagraphId: 'p3',
          },
        },
        {
          id: 'sq5',
          skill: 'evaluation',
          prompt: 'ما القيمة النقدية الأهم التي يدعو إليها النص للمحافظة على جودة التعليم الرقمي؟',
          type: 'multiple_choice',
          marks: 2,
          options: [
            { id: 'sq5_opt1', text: 'الموازنة بين التطور التقني والتربية النقدية بقيادة المعلم الواعي' },
            { id: 'sq5_opt2', text: 'الاعتماد الكامل على الذكاء الاصطناعي دون رقابة إنسانية' },
            { id: 'sq5_opt3', text: 'العودة التامة للأساليب القديمة قبل ظهور الحاسوب' },
          ],
          correctOptionId: 'sq5_opt1',
        },
      ],
    },
    correct_answer: {
      subAnswers: {
        sq1: { correctOptionId: 'sq1_opt1', evidence: { required: true, targetParagraphId: 'p1' } },
        sq2: { correctOptionId: 'sq2_opt1' },
        sq3: { correctOptionId: 'sq3_opt1', evidence: { required: true, targetParagraphId: 'p2' } },
        sq4: { correctOptionId: 'sq4_opt1', evidence: { required: true, targetParagraphId: 'p3' } },
        sq5: { correctOptionId: 'sq5_opt1' },
      },
    },
    explanation: 'يدعو النص إلى استغلال التكنولوجيا الرقمية بوعي وفكر نقدي، مع التأكيد على الدور المحوري للمعلم في توجيه التفكير البشري وصياغة المعرفة الحية.',
  },
};
