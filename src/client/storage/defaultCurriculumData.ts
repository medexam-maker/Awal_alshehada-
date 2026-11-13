import { QuestionType } from '../../shared/constants';
import { SubjectExamBlueprint, AuthoredQuestion } from '../types/curriculum';
import { TWELVE_CONTRACT_SUBJECTS } from '../data/contractSubjects';
import { JEBEL_MARRA_CONTOUR_MAP_SVG_URL } from '../../shared/contourUtils';
import { DEMO_ODD_ONE_OUT, DEMO_COMPARISON_TABLE } from '../../shared/batch1DemoQuestions';
import { DEMO_DIAGRAM_LABELING } from '../../shared/diagramDemoQuestion';
import { RHIZOPUS_DIAGRAM_QUESTION } from '../../shared/diagramRhizopusQuestion';

/**
 * Creates default authentic Sudanese Secondary Certificate blueprints for each of the 12 subjects.
 */
export function generateDefaultBlueprints(): Record<string, SubjectExamBlueprint> {
  const blueprints: Record<string, SubjectExamBlueprint> = {};

  TWELVE_CONTRACT_SUBJECTS.forEach((subject) => {
    let patterns = [];

    if (subject.slug === 'arabic-language') {
      patterns = [
        {
          id: `${subject.slug}_q1_a`,
          subjectSlug: subject.slug,
          questionNumber: 1,
          partLabel: 'أ',
          questionType: QuestionType.READING_COMPREHENSION,
          title: 'السؤال الأول (أ): قطعة الفهم والاستيعاب',
          allocatedMarks: 15,
          instructions: 'اقرأ النص الأدبي التالي بعناية ثم أجب عن الأسئلة التي تليه.',
        },
        {
          id: `${subject.slug}_q1_b`,
          subjectSlug: subject.slug,
          questionNumber: 1,
          partLabel: 'ب',
          questionType: QuestionType.ODD_ONE_OUT,
          title: 'السؤال الأول (ب): استخراج الكلمة غير المناسبة في المعنى والسياق',
          allocatedMarks: 5,
          instructions: 'حدد الكلمة الشاذة دلالياً بين الكلمات المعطاة في كل مجموعة.',
        },
        {
          id: `${subject.slug}_q2_a`,
          subjectSlug: subject.slug,
          questionNumber: 2,
          partLabel: 'أ',
          questionType: QuestionType.ARABIC_GRAMMAR,
          title: 'السؤال الثاني (أ): النحو والإعراب والضبط التام',
          allocatedMarks: 15,
          instructions: 'أعرب ما تحته خط إعراباً تاماً مع بيان علامات الإعراب المقررة.',
        },
        {
          id: `${subject.slug}_q2_b`,
          subjectSlug: subject.slug,
          questionNumber: 2,
          partLabel: 'ب',
          questionType: QuestionType.FILL_BLANK,
          title: 'السؤال الثاني (ب): إكمال الفراغات بالقواعد الصرفية المناسبة',
          allocatedMarks: 10,
          instructions: 'أكمل الجمل التالية بالصيغة الصرفية المطلوبة بين القوسين.',
        },
        {
          id: `${subject.slug}_q3_a`,
          subjectSlug: subject.slug,
          questionNumber: 3,
          partLabel: 'أ',
          questionType: QuestionType.MULTIPLE_CHOICE,
          title: 'السؤال الثالث (أ): علوم البلاغة والأدب والنقد',
          allocatedMarks: 15,
          instructions: 'اختر الإجابة الصحيحة التي تمثل الصورة البلاغية أو الغرض الأدبي.',
        },
        {
          id: `${subject.slug}_q3_b`,
          subjectSlug: subject.slug,
          questionNumber: 3,
          partLabel: 'ب',
          questionType: QuestionType.MATCHING,
          title: 'السؤال الثالث (ب): مطابقة الأبيات الشعرية بأصحابها وعصورها',
          allocatedMarks: 10,
          instructions: 'صل بين كل شاعر في القائمة (أ) والنص أو العصر المناسب في القائمة (ب).',
        },
        {
          id: `${subject.slug}_q4_a`,
          subjectSlug: subject.slug,
          questionNumber: 4,
          partLabel: 'أ',
          questionType: QuestionType.TRUE_FALSE,
          title: 'السؤال الرابع (أ): تاريخ الأدب والنصوص المقررة',
          allocatedMarks: 10,
          instructions: 'ضع علامة (✓) أمام العبارة الصحيحة وعلامة (✗) أمام العبارة الخاطئة.',
        },
        {
          id: `${subject.slug}_q4_b`,
          subjectSlug: subject.slug,
          questionNumber: 4,
          partLabel: 'ب',
          questionType: QuestionType.LONG_ESSAY,
          title: 'السؤال الرابع (ب): التعبير والإنشاء الأدبي',
          allocatedMarks: 20,
          instructions: 'اكتب مقالاً فكرياً متكاملاً في أحد الموضوعين مع مراعاة علامات الترقيم وسلامة اللغة.',
        },
      ];
    } else if (subject.slug === 'islamic-studies') {
      patterns = [
        {
          id: `${subject.slug}_q1_a`,
          subjectSlug: subject.slug,
          questionNumber: 1,
          partLabel: 'أ',
          questionType: QuestionType.FILL_BLANK,
          title: 'السؤال الأول (أ): حفظ القرآن الكريم والآيات المقررة',
          allocatedMarks: 15,
          instructions: 'أكمل الآيات القرآنية الكريمة التالية ضبطاً وكلمات.',
        },
        {
          id: `${subject.slug}_q1_b`,
          subjectSlug: subject.slug,
          questionNumber: 1,
          partLabel: 'ب',
          questionType: QuestionType.MULTIPLE_CHOICE,
          title: 'السؤال الأول (ب): معاني المفردات وأسباب النزول',
          allocatedMarks: 10,
          instructions: 'اختر التفسير المعتمد للمفردة القرآنية من بين البدائل المتاحة.',
        },
        {
          id: `${subject.slug}_q2_a`,
          subjectSlug: subject.slug,
          questionNumber: 2,
          partLabel: 'أ',
          questionType: QuestionType.TRUE_FALSE,
          title: 'السؤال الثاني (أ): العقيدة الإسلامية وأصول الإيمان',
          allocatedMarks: 15,
          instructions: 'ضع علامة (✓) أو (✗) أمام القضايا العقدية التالية.',
        },
        {
          id: `${subject.slug}_q2_b`,
          subjectSlug: subject.slug,
          questionNumber: 2,
          partLabel: 'ب',
          questionType: QuestionType.EXPLAIN,
          title: 'السؤال الثاني (ب): التعليل الفقهي والعقدي',
          allocatedMarks: 10,
          instructions: 'علل ما يلي مع الاستدلال بنص شرعي إن وجد.',
        },
        {
          id: `${subject.slug}_q3_a`,
          subjectSlug: subject.slug,
          questionNumber: 3,
          partLabel: 'أ',
          questionType: QuestionType.COMPARISON_TABLE,
          title: 'السؤال الثالث (أ): الفقه الإسلامي والمعاملات',
          allocatedMarks: 15,
          instructions: 'قارن بين الأحكام الفقهية في الجدول التالي من حيث الحكم والشروط.',
        },
        {
          id: `${subject.slug}_q3_b`,
          subjectSlug: subject.slug,
          questionNumber: 3,
          partLabel: 'ب',
          questionType: QuestionType.MATCHING,
          title: 'السؤال الثالث (ب): مصطلحات ومفاهيم الفقه الإسلامي',
          allocatedMarks: 10,
          instructions: 'طابق بين المصطلح الفقهي وتعريفه الشرعي الدقيق.',
        },
        {
          id: `${subject.slug}_q4_a`,
          subjectSlug: subject.slug,
          questionNumber: 4,
          partLabel: 'أ',
          questionType: QuestionType.ORDERING,
          title: 'السؤال الرابع (أ): السيرة النبوية والغزوات',
          allocatedMarks: 10,
          instructions: 'رتب الأحداث التاريخية في السيرة النبوية ترتيباً زمنياً تصاعدياً.',
        },
        {
          id: `${subject.slug}_q4_b`,
          subjectSlug: subject.slug,
          questionNumber: 4,
          partLabel: 'ب',
          questionType: QuestionType.SHORT_ESSAY,
          title: 'السؤال الرابع (ب): الأخلاق والتهذيب الإسلامي',
          allocatedMarks: 15,
          instructions: 'بيّن في سطور موجزة الأثر التربوي والاجتماعي للقيمة المذكورة.',
        },
      ];
    } else if (subject.slug === 'specialized-mathematics' || subject.slug === 'basic-mathematics') {
      patterns = [
        {
          id: `${subject.slug}_q1_a`,
          subjectSlug: subject.slug,
          questionNumber: 1,
          partLabel: 'أ',
          questionType: QuestionType.TRUE_FALSE,
          title: 'السؤال الأول (أ): صح وخطأ في المفاهيم الرياضية والنظريات',
          allocatedMarks: 10,
          instructions: 'حدد صحة أو خطأ العبارات الرياضية والنظريات التالية.',
        },
        {
          id: `${subject.slug}_q1_b`,
          subjectSlug: subject.slug,
          questionNumber: 1,
          partLabel: 'ب',
          questionType: QuestionType.MULTIPLE_CHOICE,
          title: 'السؤال الأول (ب): اختيار من متعدد في النهايات والتفاضل',
          allocatedMarks: 15,
          instructions: 'اختر الناتج الرياضي الدقيق للمسألة المعطاة.',
        },
        {
          id: `${subject.slug}_q2_a`,
          subjectSlug: subject.slug,
          questionNumber: 2,
          partLabel: 'أ',
          questionType: QuestionType.CALCULATION,
          title: 'السؤال الثاني (أ): مسائل التكامل وحساب المساحات والحجوم',
          allocatedMarks: 20,
          instructions: 'احسب قيمة التكامل التالي مبيناً خطوات الحل والتعويض بالقوانين.',
        },
        {
          id: `${subject.slug}_q2_b`,
          subjectSlug: subject.slug,
          questionNumber: 2,
          partLabel: 'ب',
          questionType: QuestionType.FILL_BLANK,
          title: 'السؤال الثاني (ب): قيم الثوابت والمعاملات الرياضية',
          allocatedMarks: 10,
          instructions: 'أوجد القيمة العددية للثابت الذي يحقق المعادلة المعطاة.',
        },
        {
          id: `${subject.slug}_q3_a`,
          subjectSlug: subject.slug,
          questionNumber: 3,
          partLabel: 'أ',
          questionType: QuestionType.CALCULATION,
          title: 'السؤال الثالث (أ): المصفوفات والمحددات والجبر الخطي',
          allocatedMarks: 20,
          instructions: 'أوجد محدد المصفوفة والمعكوس الضربي بحسب القواعد المعتمدة.',
        },
        {
          id: `${subject.slug}_q3_b`,
          subjectSlug: subject.slug,
          questionNumber: 3,
          partLabel: 'ب',
          questionType: QuestionType.DIAGRAM_LABELING,
          title: 'السؤال الثالث (ب): المنحنيات والهندسة التحليلية والمستوية',
          allocatedMarks: 10,
          instructions: 'حدد البيانات المفقودة والنقاط الحرجة على المنحنى البياني.',
        },
        {
          id: `${subject.slug}_q4_a`,
          subjectSlug: subject.slug,
          questionNumber: 4,
          partLabel: 'أ',
          questionType: QuestionType.CALCULATION,
          title: 'السؤال الرابع (أ): الإحصاء وحساب الاحتمالات',
          allocatedMarks: 15,
          instructions: 'احسب الانحراف المعياري ومعامل الارتباط بدقة.',
        },
      ];
    } else if (subject.slug === 'geography') {
      patterns = [
        {
          id: `${subject.slug}_q1_a`,
          subjectSlug: subject.slug,
          questionNumber: 1,
          partLabel: 'أ',
          questionType: QuestionType.CONTOUR_MAP,
          title: 'السؤال الأول (أ): قراءة وتحليل الخريطة الكنتورية والتضاريس',
          allocatedMarks: 20,
          instructions: 'ادرس الخريطة الكنتورية المرفقة ثم أجب عن الأسئلة المتعلقة بالفترة الكنتورية والمظاهر التضاريسية.',
        },
        {
          id: `${subject.slug}_q1_b`,
          subjectSlug: subject.slug,
          questionNumber: 1,
          partLabel: 'ب',
          questionType: QuestionType.MULTIPLE_CHOICE,
          title: 'السؤال الأول (ب): جغرافية السودان الإقليمية والطبيعية',
          allocatedMarks: 15,
          instructions: 'اختر الإجابة الصحيحة المتعلقة بالأقاليم المناخية والنباتية في السودان.',
        },
        {
          id: `${subject.slug}_q2_a`,
          subjectSlug: subject.slug,
          questionNumber: 2,
          partLabel: 'أ',
          questionType: QuestionType.TRUE_FALSE,
          title: 'السؤال الثاني (أ): الجغرافيا البشرية والاقتصادية للسودان',
          allocatedMarks: 15,
          instructions: 'ضع علامة (✓) أو (✗) أمام العبارات المتعلقة بالسكان والإنتاج الزراعي والصناعي.',
        },
        {
          id: `${subject.slug}_q2_b`,
          subjectSlug: subject.slug,
          questionNumber: 2,
          partLabel: 'ب',
          questionType: QuestionType.COMPARISON_TABLE,
          title: 'السؤال الثاني (ب): جدول مقارنة المشاريع المروية والمناخ',
          allocatedMarks: 15,
          instructions: 'أكمل جدول المقارنة بين المشاريع القومية (الجزيرة، الرهد، حلفا الجديدة).',
        },
        {
          id: `${subject.slug}_q3_a`,
          subjectSlug: subject.slug,
          questionNumber: 3,
          partLabel: 'أ',
          questionType: QuestionType.EXPLAIN,
          title: 'السؤال الثالث (أ): التعليل الجغرافي والبيئي',
          allocatedMarks: 15,
          instructions: 'علل جغرافياً الظواهر المناخية والتوزيع السكاني والتصحر.',
        },
        {
          id: `${subject.slug}_q3_b`,
          subjectSlug: subject.slug,
          questionNumber: 3,
          partLabel: 'ب',
          questionType: QuestionType.MATCHING,
          title: 'السؤال الثالث (ب): مطابقة الموارد الطبيعية والمواقع في السودان',
          allocatedMarks: 10,
          instructions: 'صل بين الخام أو المحصول في القائمة (أ) وموقع تركز إنتاجه في القائمة (ب).',
        },
        {
          id: `${subject.slug}_q4_a`,
          subjectSlug: subject.slug,
          questionNumber: 4,
          partLabel: 'أ',
          questionType: QuestionType.SHORT_ESSAY,
          title: 'السؤال الرابع (أ): التخطيط الإقليمي والتنمية المستدامة',
          allocatedMarks: 10,
          instructions: 'اقترح حلولاً جغرافية وتخطيطية لمعالجة المشكلات البيئية المطروحة.',
        },
        {
          id: `${subject.slug}_q4_diagram`,
          subjectSlug: subject.slug,
          questionNumber: 4,
          partLabel: 'د',
          questionType: QuestionType.DIAGRAM_LABELING,
          title: 'السؤال الرابع (د): الرسم وتسمية البيانات وتحديد الوظيفة (فطر عفن الخبز)',
          allocatedMarks: 5,
          instructions: 'ادرس الرسم التخطيطي المرفق وسمّ الأجزاء المرقمة وحدد وظائفها.',
        },
      ];
    } else {
      // Standard template for all other subjects (Physics, Chemistry, Biology, History, Computer Science, English, Military Science)
      patterns = [
        {
          id: `${subject.slug}_q1_a`,
          subjectSlug: subject.slug,
          questionNumber: 1,
          partLabel: 'أ',
          questionType: QuestionType.TRUE_FALSE,
          title: 'السؤال الأول (أ): صح أم خطأ في المفاهيم والمصطلحات الأساسية',
          allocatedMarks: 15,
          instructions: 'ضع علامة (✓) أمام العبارة الصحيحة وعلامة (✗) أمام العبارة الخاطئة.',
        },
        {
          id: `${subject.slug}_q1_b`,
          subjectSlug: subject.slug,
          questionNumber: 1,
          partLabel: 'ب',
          questionType: QuestionType.MULTIPLE_CHOICE,
          title: 'السؤال الأول (ب): اختيار من متعدد',
          allocatedMarks: 15,
          instructions: 'اختر الإجابة الصحيحة الوحيدة من بين الخيارات المعطاة.',
        },
        {
          id: `${subject.slug}_q2_a`,
          subjectSlug: subject.slug,
          questionNumber: 2,
          partLabel: 'أ',
          questionType: QuestionType.FILL_BLANK,
          title: 'السؤال الثاني (أ): إكمال الفراغات العلمية',
          allocatedMarks: 15,
          instructions: 'املأ الفراغات بالكلمات أو الرموز العلمية الصحيحة.',
        },
        {
          id: `${subject.slug}_q2_b`,
          subjectSlug: subject.slug,
          questionNumber: 2,
          partLabel: 'ب',
          questionType: QuestionType.MATCHING,
          title: 'السؤال الثاني (ب): المطابقة والتوصيل',
          allocatedMarks: 15,
          instructions: 'صل بين عناصر القائمة (أ) وما يناسبها من القائمة (ب).',
        },
        {
          id: `${subject.slug}_q3_a`,
          subjectSlug: subject.slug,
          questionNumber: 3,
          partLabel: 'أ',
          questionType: QuestionType.DIAGRAM_LABELING,
          title: 'السؤال الثالث (أ): تسمية أجزاء الرسم التوضيحي والمخططات',
          allocatedMarks: 15,
          instructions: 'اكتب البيانات المشار إليها بالأرقام على الرسم العلمي المرفق.',
        },
        {
          id: `${subject.slug}_q3_b`,
          subjectSlug: subject.slug,
          questionNumber: 3,
          partLabel: 'ب',
          questionType: QuestionType.EXPLAIN,
          title: 'السؤال الثالث (ب): التعليل والتفسير العلمي',
          allocatedMarks: 10,
          instructions: 'علل ما يلي تعليلاً علمياً دقيقاً وموجزاً.',
        },
        {
          id: `${subject.slug}_q4_a`,
          subjectSlug: subject.slug,
          questionNumber: 4,
          partLabel: 'أ',
          questionType: QuestionType.CALCULATION,
          title: 'السؤال الرابع (أ): المسائل التطبيقية والقوانين',
          allocatedMarks: 15,
          instructions: 'احسب المطلوب بالقوانين والوحدات الفيزيائية المعتمدة.',
        },
      ];
    }

    const totalMarks = patterns.reduce((sum, p) => sum + p.allocatedMarks, 0);

    blueprints[subject.slug] = {
      subjectSlug: subject.slug,
      name_ar: subject.name_ar,
      name_en: subject.name_en,
      totalQuestions: patterns.length,
      totalMarks,
      defaultDurationMinutes: subject.defaultDurationMinutes,
      patterns,
      isCustomized: false,
      updatedAt: new Date().toISOString(),
    };
  });

  return blueprints;
}

/**
 * Creates initial starter questions for subjects, including past exams (2024, 2023, 2022...) and curriculum review.
 */
export function generateInitialQuestions(): AuthoredQuestion[] {
  const questions: AuthoredQuestion[] = [];

  // Islamic Studies Starter Questions
  questions.push(
    {
      id: 'is_2024_01',
      subjectSlug: 'islamic-studies',
      patternId: 'islamic-studies_q1_a',
      questionNumber: 1,
      partLabel: 'أ',
      questionType: QuestionType.FILL_BLANK,
      prompt: 'أكمل قوله تعالى من سورة الحجرات: ﴿يَا أَيُّهَا الَّذِينَ آمَنُوا إِن جَاءَكُمْ فَاسِقٌ بِنَبَإٍ فَتَبَيَّنُوا أَن تُصِيبُوا قَوْمًا بِجَهَالَةٍ فَتُصْبِحُوا عَلَىٰ مَا فَعَلْتُمْ _____﴾',
      content: {
        textWithBlanks: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِن جَاءَكُمْ فَاسِقٌ بِنَبَإٍ فَتَبَيَّنُوا أَن تُصِيبُوا قَوْمًا بِجَهَالَةٍ فَتُصْبِحُوا عَلَىٰ مَا فَعَلْتُمْ {blank1}',
      },
      correctAnswer: { blank1: 'نَادِمِينَ' },
      allocatedMarks: 5,
      explanationAr: 'الآية السادسة من سورة الحجرات، تدعو المسلمين إلى التثبت في نقل الأخبار تجنباً للندم والظلم.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T09:00:00Z',
    },
    {
      id: 'is_2024_02',
      subjectSlug: 'islamic-studies',
      patternId: 'islamic-studies_q1_b',
      questionNumber: 1,
      partLabel: 'ب',
      questionType: QuestionType.MULTIPLE_CHOICE,
      prompt: 'ما المعنى الدقيق لقوله تعالى: ﴿وَلَا تَنَابَزُوا بِالْأَلْقَابِ﴾ في سورة الحجرات؟',
      content: {
        options: [
          { id: 'opt1', text: 'لا يدعُ بعضكم بعضاً بما يكره من الأسماء المعيبة' },
          { id: 'opt2', text: 'لا تجلسوا في مجالس السوء والمحرمات' },
          { id: 'opt3', text: 'لا تسرفوا في مدح إخوانكم بما ليس فيهم' },
          { id: 'opt4', text: 'لا تفرقوا بين الأنساب والقبائل' },
        ],
      },
      correctAnswer: { selectedOptionId: 'opt1' },
      allocatedMarks: 5,
      explanationAr: 'التنابز بالألقاب هو مناداة الشخص بلقب يكرهه ويعيبه، وهو منهي عنه صراحة في منهج الأخلاق القرآني.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T09:05:00Z',
    },
    {
      id: 'is_2024_03',
      subjectSlug: 'islamic-studies',
      patternId: 'islamic-studies_q2_a',
      questionNumber: 2,
      partLabel: 'أ',
      questionType: QuestionType.TRUE_FALSE,
      prompt: 'يُعرّف الشرك الأصغر بأنه ما نهى عنه الشرع وسمّاه شركاً ولم يصل إلى حد الكفر المخرج من الملة كالرياء والحلف بغير الله.',
      content: {
        prompt: 'يُعرّف الشرك الأصغر بأنه ما نهى عنه الشرع وسمّاه شركاً ولم يصل إلى حد الكفر المخرج من الملة كالرياء والحلف بغير الله.',
        statement: 'يُعرّف الشرك الأصغر بأنه ما نهى عنه الشرع وسمّاه شركاً ولم يصل إلى حد الكفر المخرج من الملة كالرياء والحلف بغير الله.',
        explanation: 'صحيح، الشرك الأصغر ينقص كمال التوحيد الواجب ويحبط العمل الذي قارنه ولكنه لا يخلد صاحبه في النار كالأكبر.',
      },
      correctAnswer: { value: true },
      allocatedMarks: 5,
      explanationAr: 'صحيح، الشرك الأصغر ينقص كمال التوحيد الواجب ويحبط العمل الذي قارنه ولكنه لا يخلد صاحبه في النار كالأكبر.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T09:10:00Z',
    },
    {
      id: 'is_2023_01',
      subjectSlug: 'islamic-studies',
      patternId: 'islamic-studies_q3_a',
      questionNumber: 3,
      partLabel: 'أ',
      questionType: QuestionType.COMPARISON_TABLE,
      prompt: 'قارن بين صلاة الجنازة وصلاة الكسوف من حيث الحكم وعدد التكبيرات وفق الفقه الإسلامي المقرر.',
      content: {
        columns: ['وجه المقارنة', 'صلاة الجنازة', 'صلاة الكسوف'],
        rows: [
          { aspect: 'الحكم الشرعي', correctAnswers: ['فرض كفاية', 'سنة مؤكدة'] },
          { aspect: 'الركوع', correctAnswers: ['لا ركوع فيها', 'ركوعان في كل ركعة'] },
        ],
      },
      correctAnswer: {
        'row0_col1': 'فرض كفاية',
        'row0_col2': 'سنة مؤكدة',
        'row1_col1': 'لا ركوع فيها',
        'row1_col2': 'ركوعان في كل ركعة',
      },
      allocatedMarks: 10,
      explanationAr: 'صلاة الجنازة فرض كفاية ولا ركوع ولا سجود فيها بل أربع تكبيرات، وصلاة الكسوف سنة مؤكدة بركوعين في كل ركعة.',
      examScope: 'both',
      examYear: 2023,
      status: 'approved',
      createdAt: '2023-05-12T09:00:00Z',
    },
    {
      id: 'is_2022_01',
      subjectSlug: 'islamic-studies',
      patternId: 'islamic-studies_q4_a',
      questionNumber: 4,
      partLabel: 'أ',
      questionType: QuestionType.ORDERING,
      prompt: 'رتب الغزوات النبوية التالية ترتيباً زمنياً تصاعدياً وفق تاريخ وقوعها:',
      content: {
        items: [
          { id: 'item1', text: 'غزوة بدر الكبرى (2 هـ)' },
          { id: 'item2', text: 'غزوة أحد (3 هـ)' },
          { id: 'item3', text: 'غزوة الخندق / الأحزاب (5 هـ)' },
          { id: 'item4', text: 'فتح مكة (8 هـ)' },
          { id: 'item5', text: 'غزوة تبوك (9 هـ)' },
        ],
      },
      correctAnswer: ['item1', 'item2', 'item3', 'item4', 'item5'],
      allocatedMarks: 10,
      explanationAr: 'التسلسل الزمني للغزوات النبوية الكبرى المقررة في المنهج يبدأ ببدر 2هـ، أحد 3هـ، الخندق 5هـ، فتح مكة 8هـ، وتبوك 9هـ.',
      examScope: 'both',
      examYear: 2022,
      status: 'approved',
      createdAt: '2022-05-15T09:00:00Z',
    }
  );

  // Arabic Language Starter Questions
  questions.push(
    {
      id: 'ar_2024_01',
      subjectSlug: 'arabic-language',
      patternId: 'arabic-language_q2_a',
      questionNumber: 2,
      partLabel: 'أ',
      questionType: QuestionType.ARABIC_GRAMMAR,
      prompt: 'حلل المكونات النحوية للكلمتين المحددين في الجملة الشاهدة:',
      content: {
        prompt: 'أعرب المكونات النحوية للكلمات المستهدفة:',
        sentence: 'إنَّ المعلمينَ مخلصونَ في أداء رسالتهم السامية',
        targetWord: 'المعلمينَ - مخلصونَ',
        components: [
          {
            id: 'comp_1',
            label: 'الموقع الإعرابي لـ (المعلمينَ)',
            points: 3,
            choices: [
              { id: 'ch_1a', text: 'اسم (إنَّ) منصوب' },
              { id: 'ch_1b', text: 'خبر (إنَّ) مرفوع' },
              { id: 'ch_1c', text: 'فاعل مرفوع' },
            ],
            hints: [
              { level: 1, text: 'لاحظ الحرف النواسخ (إنَّ) الذي ينصب المبتدأ ويرفع الخبر.' },
            ],
          },
          {
            id: 'comp_2',
            label: 'علامة إعراب (المعلمينَ)',
            points: 2,
            choices: [
              { id: 'ch_2a', text: 'الياء لأنه جمع مذكر سالم' },
              { id: 'ch_2b', text: 'الفتحة الظاهرة' },
              { id: 'ch_2c', text: 'الكسرة' },
            ],
            hints: [
              { level: 1, text: 'الكلمة تدل على الجمع المذكر السالم وتنتهي بـ (ين).' },
            ],
          },
          {
            id: 'comp_3',
            label: 'الموقع الإعرابي وعلامته لـ (مخلصونَ)',
            points: 5,
            choices: [
              { id: 'ch_3a', text: 'خبر (إنَّ) مرفوع وعلامة رفعه الواو' },
              { id: 'ch_3b', text: 'نعت مرفوع وعلامة رفعه الضمة' },
              { id: 'ch_3c', text: 'حال منصوبة وعلامة نصبها الفتحة' },
            ],
            hints: [
              { level: 1, text: 'هذه الكلمة تتم معنى الجملة مع حرف النسخ إنَّ.' },
            ],
          },
        ],
      },
      correctAnswer: {
        components: {
          comp_1: 'ch_1a',
          comp_2: 'ch_2a',
          comp_3: 'ch_3a',
        },
      },
      allocatedMarks: 10,
      explanationAr: 'اسم إنّ (المعلمين) منصوب بالياء، و(مخلصون) خبر إنّ مرفوع وعلامة رفعه الواو لأنه جمع مذكر سالم.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T10:00:00Z',
    },
    {
      id: 'ar_2024_02',
      subjectSlug: 'arabic-language',
      patternId: 'arabic-language_q1_b',
      questionNumber: 1,
      partLabel: 'ب',
      questionType: QuestionType.ODD_ONE_OUT,
      prompt: 'حدد الكلمة الشاذة دلالياً ونحوياً من بين الكلمات التالية:',
      content: {
        words: ['مُجْتَهِدٌ', 'مُعَلِّمٌ', 'مُهَنْدِسٌ', 'كِتَابٌ'],
      },
      correctAnswer: 'كِتَابٌ',
      allocatedMarks: 5,
      explanationAr: 'الكلمات الثلاث الأولى مشتقات تدل على الفاعل العاقل (اسم فاعل)، أما كلمة (كتاب) فهي اسم جامد يدل على ذات غير عاقلة.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T10:05:00Z',
    },
    {
      id: 'ar_2023_01',
      subjectSlug: 'arabic-language',
      patternId: 'arabic-language_q3_a',
      questionNumber: 3,
      partLabel: 'أ',
      questionType: QuestionType.MULTIPLE_CHOICE,
      prompt: 'ما نوع الصورة البيانية في قول الشاعر: (وسلا مصرَ هَلْ سلا القَلبُ عَنْها):',
      content: {
        options: [
          { id: 'opt1', text: 'جناس تام بين (سَلا) و(سَلا)' },
          { id: 'opt2', text: 'طباق سلب' },
          { id: 'opt3', text: 'استعارة تصريحية مكنية' },
          { id: 'opt4', text: 'مقابلة أدبية' },
        ],
      },
      correctAnswer: { selectedOptionId: 'opt1' },
      allocatedMarks: 5,
      explanationAr: 'الجناس التام اتفاق اللفظين في الحروف وترتيبها وشكلها واختلاف المعنى: سلا الأولى بمعنى اسألا، والثانية بمعنى نسي وغفل.',
      examScope: 'both',
      examYear: 2023,
      status: 'approved',
      createdAt: '2023-05-12T10:00:00Z',
    },
    {
      id: 'ar_2022_01',
      subjectSlug: 'arabic-language',
      patternId: 'arabic-language_q3_b',
      questionNumber: 3,
      partLabel: 'ب',
      questionType: QuestionType.MATCHING,
      prompt: 'صل بين كل مدرسة شعرية وأبرز روادها في الأدب العربي المعاصر المقرّر:',
      content: {
        pairs: [
          { left: 'مدرسة الإحياء والبعث', right: 'محمود سامي البارودي وأحمد شوقي' },
          { left: 'مدرسة الديوان', right: 'عباس محمود العقاد والمازني' },
          { left: 'مدرسة المهجر', right: 'جبران خليل جبران وإيليا أبو ماضي' },
          { left: 'شعر التفعيلة / الواقعية', right: 'بدر شاكر السياب ونازك الملائكة' },
        ],
      },
      correctAnswer: {
        'مدرسة الإحياء والبعث': 'محمود سامي البارودي وأحمد شوقي',
        'مدرسة الديوان': 'عباس محمود العقاد والمازني',
        'مدرسة المهجر': 'جبران خليل جبران وإيليا أبو ماضي',
        'شعر التفعيلة / الواقعية': 'بدر شاكر السياب ونازك الملائكة',
      },
      allocatedMarks: 10,
      explanationAr: 'توزيع رواد المدارس الأدبية الشعرية وفق تاريخ الأدب والنصوص في منهج الشهادة الثانوية.',
      examScope: 'both',
      examYear: 2022,
      status: 'approved',
      createdAt: '2022-05-15T10:00:00Z',
    }
  );

  // Geography Starter Questions
  questions.push(
    {
      id: 'geo_2024_01',
      subjectSlug: 'geography',
      patternId: 'geography_q1_a',
      questionNumber: 1,
      partLabel: 'أ',
      questionType: QuestionType.CONTOUR_MAP,
      prompt: 'بالاعتماد على الخريطة الكنتورية المرفقة، احسب الفاصل الكنتوري والارتفاع الدقيق للقمة (أ) وحدد الظاهرة التضاريسية المشار إليها:',
      content: {
        mapCode: 'MAP_CONTOUR_PEAK_650',
        mapUrl: '/assets/maps/contour_peak_650.svg',
        contourInterval: 50,
        indexContour: 500,
        mapFeatures: ['قمة جبلية مخروطية', 'وادي نهري عميق', 'سفح شديد الانحدار'],
        subQuestions: [
          {
            id: 'cm_1',
            question: 'ما قيمة الفاصل الكنتوري الرأسي بين خطوط الارتفاع المتتالية على الخريطة؟',
            unit: 'متر',
            inputType: 'numeric',
            numericTolerance: 1,
            hint: 'اطرح منسوب خط الكنتور 500م من منسوب الخط الذي يليه مباشرة نحو الأعلى (550م).',
            explanation: 'الفاصل الكنتوري = 550م - 500م = 50 متراً.',
          },
          {
            id: 'cm_2',
            question: 'ما هو الارتفاع الدقيق للقمة (أ) المشار إليها بالمثلث على الخريطة؟',
            unit: 'متر',
            inputType: 'numeric',
            numericTolerance: 1,
            hint: 'تتبع تصاعد المناسيب من الخط الرئيسي 500م نحو الداخل بإضافة 50 متراً لكل خط كنتور.',
            explanation: 'تتدرج المناسيب 500م ← 550م ← 600م ← القمة (أ) بارتفاع 650 متراً.',
          },
          {
            id: 'cm_3',
            question: 'ما الظاهرة التضاريسية التي تمثلها خطوط الكنتور المغلقة المتقاربة حول القمة (أ)؟',
            unit: '',
            inputType: 'text',
            options: ['قمة جبلية مخروطية', 'منخفض مغلق', 'سهل فيضي منبسط', 'دلتا نهرية'],
            explanation: 'تقارب خطوط الكنتور المغلقة مع تزايد المنسوب نحو المركز يدل على قمة جبلية مخروطية شديدة الانحدار.',
          },
        ],
      },
      correctAnswer: {
        subAnswers: {
          cm_1: '50',
          cm_2: '650',
          cm_3: 'قمة جبلية مخروطية',
        },
      },
      allocatedMarks: 10,
      explanationAr: 'حساب الفاصل الكنتوري (50 متراً) وتزايد المناسيب نحو المركز (500 ← 550 ← 600 ← 650م) يدل على قمة مخروطية ذات انحدار شديد.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T11:00:00Z',
    },
    {
      id: 'geo_2023_01',
      subjectSlug: 'geography',
      patternId: 'geography_q1_b',
      questionNumber: 1,
      partLabel: 'ب',
      questionType: QuestionType.MULTIPLE_CHOICE,
      prompt: 'أيٌّ من المشروعات المروية التالية في السودان يُروى بالري الانسيابي عبر سد سنار؟',
      content: {
        options: [
          { id: 'opt1', text: 'مشروع الجزيرة والمناقل' },
          { id: 'opt2', text: 'مشروع حلفا الجديدة' },
          { id: 'opt3', text: 'مشروع طوكر الزراعي' },
          { id: 'opt4', text: 'مشروع السوكي الزراعي' },
        ],
      },
      correctAnswer: { selectedOptionId: 'opt1' },
      allocatedMarks: 5,
      explanationAr: 'مشروع الجزيرة يروى انسيابياً من خزان سنار المشيد عام 1925م على النيل الأزرق ويعد أكبر مشروع مروي في إفريقيا.',
      examScope: 'both',
      examYear: 2023,
      status: 'approved',
      createdAt: '2023-05-12T11:00:00Z',
    }
  );

  // Mathematics Starter Questions (including Pattern 7 Multi-Step Calculations)
  questions.push(
    {
      id: 'math_p7_calculus_01',
      subjectSlug: 'specialized-mathematics',
      patternId: 'specialized-mathematics_q2_a',
      questionNumber: 3,
      partLabel: 'أ',
      questionType: QuestionType.CALCULATION,
      prompt: 'يتحرك جسم في خط مستقيم بحيث تُعطى إزاحته $s(t)$ بالأمتار بعد مرور $t$ ثانية بالعلاقة: $$s(t) = 2t^3 - 9t^2 + 12t + 5$$ أجب عن الخطوات المتسلسلة التالية لإيجاد دالة السرعة، ولحظات السكون، والتسارع:',
      content: {
        mode: 'multi_step_mcq',
        prompt: 'يتحرك جسم في خط مستقيم بحيث تُعطى إزاحته $s(t)$ بالأمتار بعد مرور $t$ ثانية بالعلاقة: $$s(t) = 2t^3 - 9t^2 + 12t + 5$$ أجب عن الخطوات المتسلسلة التالية لإيجاد دالة السرعة، ولحظات السكون، والتسارع:',
        scenario: 'تطبيق فيزيائي ورياضي على التفاضل: دراسة حركة نقطة مادية، اشتقاق السرعة والتسارع وتحديد لحظات السكون اللحظي.',
        given_values: {
          's(t)': '2t^3 - 9t^2 + 12t + 5',
          't': '\\ge 0'
        },
        steps: [
          {
            id: 'step_1',
            order: 1,
            prompt: 'الخطوة الأولى: أوجد دالة السرعة اللحظية $v(t) = \\frac{ds}{dt}$ (باشتقاق دالة الإزاحة بالنسبة للزمن):',
            marks: 2,
            options: [
              { id: 'opt_1a', label: 'v(t) = 6t^2 - 18t + 12' },
              { id: 'opt_1b', label: 'v(t) = 6t^2 - 9t + 12' },
              { id: 'opt_1c', label: 'v(t) = 2t^2 - 9t + 12' },
              { id: 'opt_1d', label: 'v(t) = 6t^3 - 18t^2 + 12t' }
            ]
          },
          {
            id: 'step_2',
            order: 2,
            prompt: 'الخطوة الثانية: أوجد لحظات السكون اللحظي للجسم (أي عندما تنعدم السرعة $v(t) = 0$):',
            marks: 2,
            options: [
              { id: 'opt_2a', label: 't = 1\\text{ s} \\text{ و } t = 2\\text{ s}' },
              { id: 'opt_2b', label: 't = 0\\text{ s} \\text{ و } t = 2\\text{ s}' },
              { id: 'opt_2c', label: 't = 3\\text{ s} \\text{ و } t = 4\\text{ s}' },
              { id: 'opt_2d', label: 't = 1\\text{ s} \\text{ فقط}' }
            ]
          },
          {
            id: 'step_3',
            order: 3,
            prompt: 'الخطوة الثالثة: أوجد تسارع الجسم $a(t) = \\frac{dv}{dt}$ عند اللحظة $t = 3\\text{ s}$:',
            marks: 2,
            options: [
              { id: 'opt_3a', label: '18\\text{ m/s}^2' },
              { id: 'opt_3b', label: '27\\text{ m/s}^2' },
              { id: 'opt_3c', label: '12\\text{ m/s}^2' },
              { id: 'opt_3d', label: '36\\text{ m/s}^2' }
            ]
          }
        ],
        solution_guide: '1. دالة السرعة المشتقة: $v(t) = s\'(t) = 6t^2 - 18t + 12$.\n2. لحظات السكون اللحظي: $6t^2 - 18t + 12 = 0 \\iff 6(t-1)(t-2) = 0 \\iff t = 1\\text{ s}, t = 2\\text{ s}$.\n3. دالة التسارع: $a(t) = v\'(t) = 12t - 18$. عند $t = 3\\text{ s}$: $a(3) = 12(3) - 18 = 18\\text{ m/s}^2$.'
      },
      correctAnswer: {
        step_answers: {
          step_1: { canonical_option_id: 'opt_1a', marks: 2 },
          step_2: { canonical_option_id: 'opt_2a', marks: 2 },
          step_3: { canonical_option_id: 'opt_3a', marks: 2 }
        },
        conditional_credit_rules: [
          {
            rule_id: 'rule_s3_from_s1_err',
            target_step_id: 'step_3',
            awarded_option_id: 'opt_3b',
            prerequisite_step_id: 'step_1',
            prerequisite_option_id: 'opt_1b',
            credit_fraction: 0.5,
            description: 'منح 50% من درجة الخطوة الثالثة نظير تطبيق اشتقاق التسارع والتعويض صحيحاً بناءً على مشتقة السرعة الخاطئة في الخطوة الأولى'
          }
        ]
      },
      allocatedMarks: 6,
      explanationAr: 'تطبيق فيزيائي ورياضي على التفاضل في حساب السرعة والتسارع وفق المنهج السوداني.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T12:00:00Z'
    },
    {
      id: 'math_basic_p7_calculus_01',
      subjectSlug: 'basic-mathematics',
      patternId: 'basic-mathematics_q2_a',
      questionNumber: 3,
      partLabel: 'أ',
      questionType: QuestionType.CALCULATION,
      prompt: 'يتحرك جسم في خط مستقيم بحيث تُعطى إزاحته $s(t)$ بالأمتار بعد مرور $t$ ثانية بالعلاقة: $$s(t) = 2t^3 - 9t^2 + 12t + 5$$ أجب عن الخطوات المتسلسلة التالية لإيجاد دالة السرعة، ولحظات السكون، والتسارع:',
      content: {
        mode: 'multi_step_mcq',
        prompt: 'يتحرك جسم في خط مستقيم بحيث تُعطى إزاحته $s(t)$ بالأمتار بعد مرور $t$ ثانية بالعلاقة: $$s(t) = 2t^3 - 9t^2 + 12t + 5$$ أجب عن الخطوات المتسلسلة التالية لإيجاد دالة السرعة، ولحظات السكون، والتسارع:',
        scenario: 'تطبيق فيزيائي ورياضي على التفاضل: دراسة حركة نقطة مادية، اشتقاق السرعة والتسارع وتحديد لحظات السكون اللحظي.',
        given_values: {
          's(t)': '2t^3 - 9t^2 + 12t + 5',
          't': '\\ge 0'
        },
        steps: [
          {
            id: 'step_1',
            order: 1,
            prompt: 'الخطوة الأولى: أوجد دالة السرعة اللحظية $v(t) = \\frac{ds}{dt}$ (باشتقاق دالة الإزاحة بالنسبة للزمن):',
            marks: 2,
            options: [
              { id: 'opt_1a', label: 'v(t) = 6t^2 - 18t + 12' },
              { id: 'opt_1b', label: 'v(t) = 6t^2 - 9t + 12' },
              { id: 'opt_1c', label: 'v(t) = 2t^2 - 9t + 12' },
              { id: 'opt_1d', label: 'v(t) = 6t^3 - 18t^2 + 12t' }
            ]
          },
          {
            id: 'step_2',
            order: 2,
            prompt: 'الخطوة الثانية: أوجد لحظات السكون اللحظي للجسم (أي عندما تنعدم السرعة $v(t) = 0$):',
            marks: 2,
            options: [
              { id: 'opt_2a', label: 't = 1\\text{ s} \\text{ و } t = 2\\text{ s}' },
              { id: 'opt_2b', label: 't = 0\\text{ s} \\text{ و } t = 2\\text{ s}' },
              { id: 'opt_2c', label: 't = 3\\text{ s} \\text{ و } t = 4\\text{ s}' },
              { id: 'opt_2d', label: 't = 1\\text{ s} \\text{ فقط}' }
            ]
          },
          {
            id: 'step_3',
            order: 3,
            prompt: 'الخطوة الثالثة: أوجد تسارع الجسم $a(t) = \\frac{dv}{dt}$ عند اللحظة $t = 3\\text{ s}$:',
            marks: 2,
            options: [
              { id: 'opt_3a', label: '18\\text{ m/s}^2' },
              { id: 'opt_3b', label: '27\\text{ m/s}^2' },
              { id: 'opt_3c', label: '12\\text{ m/s}^2' },
              { id: 'opt_3d', label: '36\\text{ m/s}^2' }
            ]
          }
        ],
        solution_guide: '1. دالة السرعة المشتقة: $v(t) = s\'(t) = 6t^2 - 18t + 12$.\n2. لحظات السكون اللحظي: $6t^2 - 18t + 12 = 0 \\iff 6(t-1)(t-2) = 0 \\iff t = 1\\text{ s}, t = 2\\text{ s}$.\n3. دالة التسارع: $a(t) = v\'(t) = 12t - 18$. عند $t = 3\\text{ s}$: $a(3) = 12(3) - 18 = 18\\text{ m/s}^2$.'
      },
      correctAnswer: {
        step_answers: {
          step_1: { canonical_option_id: 'opt_1a', marks: 2 },
          step_2: { canonical_option_id: 'opt_2a', marks: 2 },
          step_3: { canonical_option_id: 'opt_3a', marks: 2 }
        },
        conditional_credit_rules: [
          {
            rule_id: 'rule_s3_from_s1_err',
            target_step_id: 'step_3',
            awarded_option_id: 'opt_3b',
            prerequisite_step_id: 'step_1',
            prerequisite_option_id: 'opt_1b',
            credit_fraction: 0.5,
            description: 'منح 50% من درجة الخطوة الثالثة نظير تطبيق اشتقاق التسارع والتعويض صحيحاً بناءً على مشتقة السرعة الخاطئة في الخطوة الأولى'
          }
        ]
      },
      allocatedMarks: 6,
      explanationAr: 'تطبيق فيزيائي ورياضي على التفاضل في حساب السرعة والتسارع وفق المنهج السوداني.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T12:00:00Z'
    },
    {
      id: 'math_2024_01',
      subjectSlug: 'specialized-mathematics',
      patternId: 'specialized-mathematics_q2_a',
      questionNumber: 2,
      partLabel: 'أ',
      questionType: QuestionType.CALCULATION,
      prompt: 'احسب قيمة التكامل المحدد التالي: ∫ من 0 إلى 2 للدالة (3س² + 4س + 1) بالنسبة لـ س:',
      content: {
        expression: '∫ (3x² + 4x + 1) dx [from 0 to 2]',
        unit: 'وحدة حسابية',
      },
      correctAnswer: '18',
      allocatedMarks: 10,
      explanationAr: 'التكامل = [س³ + 2س² + س] من 0 إلى 2 = (8 + 8 + 2) - 0 = 18.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T12:00:00Z',
    },
    {
      id: 'math_2024_02',
      subjectSlug: 'specialized-mathematics',
      patternId: 'specialized-mathematics_q1_b',
      questionNumber: 1,
      partLabel: 'ب',
      questionType: QuestionType.MULTIPLE_CHOICE,
      prompt: 'إذا كانت ص = جا(3س)، فإن المشتقة الأولى (د ص / د س) تساوي:',
      content: {
        options: [
          { id: 'opt1', text: '3 جتا(3س)' },
          { id: 'opt2', text: '-3 جتا(3س)' },
          { id: 'opt3', text: 'جتا(3س)' },
          { id: 'opt4', text: '3 جا(3س)' },
        ],
      },
      correctAnswer: { selectedOptionId: 'opt1' },
      allocatedMarks: 5,
      explanationAr: 'مشتقة جا(أس) هي أ جتا(أس)، وحيث أ = 3 فإن المشتقة تساوي 3 جتا(3س).',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T12:05:00Z',
    }
  );

  // Physics Starter Questions
  questions.push(
    {
      id: 'phys_2024_01',
      subjectSlug: 'physics',
      patternId: 'physics_q3_a',
      questionNumber: 3,
      partLabel: 'أ',
      questionType: QuestionType.DIAGRAM_LABELING,
      prompt: 'حدد الأجزاء المشار إليها بالأسهم في رسم المولد الكهربائي (الدينامو) ذو التيار المتردد:',
      content: {
        diagramUrl: '/assets/diagrams/generator.png',
        labels: [
          { id: 'p1', labelPrompt: 'الجزء (1)' },
          { id: 'p2', labelPrompt: 'الجزء (2)' },
          { id: 'p3', labelPrompt: 'الجزء (3)' },
        ],
      },
      correctAnswer: {
        p1: 'قطبا المغناطيس القوي',
        p2: 'ملف الدوران من سلك نحاسي',
        p3: 'حلقتان معدنيتان منزلقان وفرش الكربون',
      },
      allocatedMarks: 10,
      explanationAr: 'المولد البسيط يتكون من مغناطيس دائم قوي، ملف نحاسي قابل للدوران، وحلقتي انزلاق متصلتين بفرشتين لنقل التيار.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T13:00:00Z',
    },
    {
      id: 'phys_2024_02',
      subjectSlug: 'physics',
      patternId: 'physics_q4_a',
      questionNumber: 4,
      partLabel: 'أ',
      questionType: QuestionType.CALCULATION,
      prompt: 'احسب المقاومة المكافئة لثلاث مقاومات قيمها (3 أوم، 6 أوم، 2 أوم) موصلة على التوازي في دائرة كهربائية مغلقة:',
      content: {
        expression: '1/R_eq = 1/3 + 1/6 + 1/2',
        unit: 'أوم',
      },
      correctAnswer: '1',
      allocatedMarks: 10,
      explanationAr: '1/المقاومة المكافئة = (1/3 + 1/6 + 1/2) = (2/6 + 1/6 + 3/6) = 6/6 = 1 أوم^-1. إذن المقاومة المكافئة = 1 أوم.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T13:05:00Z',
    }
  );

  // Military Science Starter Questions
  questions.push(
    {
      id: 'ms_2024_01',
      subjectSlug: 'military-science',
      patternId: 'military-science_q1_a',
      questionNumber: 1,
      partLabel: 'أ',
      questionType: QuestionType.TRUE_FALSE,
      prompt: 'تعتبر الضوابط العسكرية والانضباط الأساس المتين لبناء القوات المسلحة وحفظ الأمن القومي.',
      content: {
        statement: 'تعتبر الضوابط العسكرية والانضباط الأساس المتين لبناء القوات المسلحة وحفظ الأمن القومي.',
      },
      correctAnswer: { value: true },
      allocatedMarks: 5,
      explanationAr: 'الانضباط العسكري هو الركيزة الأساسية للجاهزية وتنفيذ الأوامر بدقة.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T14:00:00Z',
    },
    {
      id: 'ms_2024_02',
      subjectSlug: 'military-science',
      patternId: 'military-science_q1_b',
      questionNumber: 1,
      partLabel: 'ب',
      questionType: QuestionType.MULTIPLE_CHOICE,
      prompt: 'ما هي الرتبة العسكرية التي تلي رتبة (نقيب) مباشرة في نظام الرتب العسكرية؟',
      content: {
        options: [
          { id: 'opt1', text: 'رائد' },
          { id: 'opt2', text: 'ملازم أول' },
          { id: 'opt3', text: 'مقدم' },
          { id: 'opt4', text: 'عقيد' },
        ],
      },
      correctAnswer: { selectedOptionId: 'opt1' },
      allocatedMarks: 5,
      explanationAr: 'التسلسل القيادي للضباط: ملازم، ملازم أول، نقيب، رائد، مقدم، عقيد، عميد، لواء، فريق.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T14:05:00Z',
    },
    {
      id: 'ms_2024_03',
      subjectSlug: 'military-science',
      patternId: 'military-science_q2_b',
      questionNumber: 2,
      partLabel: 'ب',
      questionType: QuestionType.EXPLAIN,
      prompt: 'علل: أسباب أهمية التدريب العسكري المستمر للضباط والأفراد في القوات المسلحة.',
      content: {
        targetPhenomenon: 'علل: أهمية التدريب العسكري المستمر والتمارين القتالية الدورية في القوات المسلحة.',
        correctSequence: ['رفع', 'الكفاءة', 'القتالية', 'والجاهزية', 'لحماية', 'الوطن'],
        distractorWords: ['الإدارية', 'العشوائية', 'التأخير'],
      },
      correctAnswer: {
        correctSequence: ['رفع', 'الكفاءة', 'القتالية', 'والجاهزية', 'لحماية', 'الوطن'],
        text: 'رفع الكفاءة القتالية والجاهزية لحماية الوطن',
      },
      allocatedMarks: 10,
      explanationAr: 'التدريب المستمر يضمن الحفاظ على الكفاءة القتالية العالية والجاهزية الدائمة لمواجهة التحديات الأجنبية وتوفير الأمن والأمان.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T14:10:00Z',
    },
    {
      id: 'ms_test_explain_01',
      subjectSlug: 'military-science',
      patternId: 'military-science_q3_b',
      questionNumber: 3,
      partLabel: 'ب',
      questionType: QuestionType.EXPLAIN,
      prompt: 'علل: يعتبر موقع السودان ذا أهمية استراتيجية عسكرية؟',
      content: {
        prompt: 'علل: يعتبر موقع السودان ذا أهمية استراتيجية عسكرية؟',
        targetPhenomenon: 'علل: يعتبر موقع السودان ذا أهمية استراتيجية عسكرية؟',
        correctSequence: ['لأنه', 'يربط', 'بين', 'شمال', 'أفريقيا', 'وجنوبها', 'ويطل', 'على', 'البحر', 'الأحمر', 'ويجاور', '7', 'دول', 'مما', 'يجعله', 'نقطة', 'ارتكاز', 'جيوسياسي.'],
        distractorWords: ['غرب', 'شرق', 'النيل', 'أوروبا'],
        scoring_type: 'all_or_nothing',
        explanation: 'موقع السودان الجغرافي يمنحه عمق استراتيجي...',
      },
      correctAnswer: 'لأنه يربط بين شمال أفريقيا وجنوبها ويطل على البحر الأحمر ويجاور 7 دول مما يجعله نقطة ارتكاز جيوسياسي.',
      allocatedMarks: 5,
      explanationAr: 'موقع السودان الجغرافي يمنحه عمق استراتيجي...',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'ms_test_matching_01',
      subjectSlug: 'military-science',
      patternId: 'military-science_q2_b',
      questionNumber: 2,
      partLabel: 'ب',
      questionType: QuestionType.MATCHING,
      prompt: 'طابق القائد مع المعركة المناسبة:',
      content: {
        prompt: 'طابق القائد مع المعركة المناسبة:',
        pairs: [
          { id: 'p1', source: 'معركة القادسية', target: 'سعد بن أبي وقاص' },
          { id: 'p2', source: 'معركة اليرموك', target: 'خالد بن الوليد' },
          { id: 'p3', source: 'معركة حطين', target: 'صلاح الدين الأيوبي' },
        ],
        distractors: [
          { id: 'd1', target: 'طارق بن زياد' },
        ],
        scoring_type: 'partial',
        explanation: 'القادسية بقيادة سعد، اليرموك بقيادة خالد، حطين بقيادة صلاح الدين.',
      },
      correctAnswer: {
        pairs: {
          p1: 'p1',
          p2: 'p2',
          p3: 'p3',
        },
      },
      allocatedMarks: 6,
      explanationAr: 'القادسية بقيادة سعد، اليرموك بقيادة خالد، حطين بقيادة صلاح الدين.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'ms_p8_short_essay_01',
      subjectSlug: 'military-science',
      patternId: 'military-science_q4_b',
      questionNumber: 4,
      partLabel: 'ب',
      questionType: QuestionType.SHORT_ESSAY,
      prompt: 'اذكر باختصار الفائدتان الأساسيتان من إنشاء خطوط الدفاع الخلفية (الاحتياطية) في التكتيكات العسكرية؟',
      content: {
        question_text: 'اذكر باختصار الفائدتان الأساسيتان من إنشاء خطوط الدفاع الخلفية (الاحتياطية) في التكتيكات العسكرية؟',
        model_answer: '1. تأمين خطوط الإمداد والتموين وحمايتها من الاختراق. 2. توفير قوة احتياطية للتدخل السريع لصد الهجمات المعاكسة أو سد الثغرات عند حدوث انهيار في الخطوط الأمامية.',
        mandatory_keywords: ['تأمين الإمداد', 'قوة احتياطية', 'التدخل السريع', 'صد الهجمات'],
        hint: 'فكر في دور القوات غير المشاركة مباشرة في الاشتباك الأمامي، وكيف تؤمن الخلفية والتموين.',
        max_words: 30,
        grading_mode: 'auto',
        partial_threshold: 0.5,
      },
      correctAnswer: {
        model_answer: '1. تأمين خطوط الإمداد والتموين وحمايتها من الاختراق. 2. توفير قوة احتياطية للتدخل السريع لصد الهجمات المعاكسة أو سد الثغرات عند حدوث انهيار في الخطوط الأمامية.',
        mandatory_keywords: ['تأمين الإمداد', 'قوة احتياطية', 'التدخل السريع', 'صد الهجمات'],
      },
      allocatedMarks: 5,
      explanationAr: 'خطوط الدفاع الخلفية تضمن تأمين خطوط الإمداد والتموين وتتيح قوة احتياطية للتدخل السريع عند الطوارئ.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2026-01-01T00:00:00.000Z',
    }
  );

  // Geography Starter Questions (Pattern 11: CONTOUR_MAP)
  questions.push(
    {
      id: 'geo_contour_sudan_2024_01',
      subjectSlug: 'geography',
      patternId: 'geography_q1_a',
      questionNumber: 1,
      partLabel: 'أ',
      questionType: QuestionType.CONTOUR_MAP,
      prompt: 'من خلال الخريطة الكنتورية الطوبوغرافية المرفقة لإقليم جبل مرة والأنهر الموسمية الممتدة بشرق دارفور، اقرأ البيانات والارتفاعات بعناية ثم أجب عن الفروع المنهجية الأربعة التالية:',
      content: {
        mapCode: 'MAP_SUDAN_CONTOUR_GEO_2024',
        mapUrl: '/assets/maps/contour_01.svg',
        prompt: 'من خلال الخريطة الكنتورية الطوبوغرافية المرفقة لإقليم جبل مرة والأنهر الموسمية الممتدة بشرق دارفور، اقرأ البيانات والارتفاعات بعناية ثم أجب عن الفروع المنهجية الأربعة التالية:',
        subQuestions: [
          {
            id: 'cm_1',
            question: 'ما هي قيمة الفاصل الكنتوري الرأسي بين خطوط الارتفاع المتساوية على الخريطة؟',
            unit: 'متر',
            inputType: 'numeric',
            numericTolerance: 1,
            hint: 'الفاصل الرأسي = (الفرق بين قيمتي خطين رئيسيين متجاورين) ÷ (عدد الفواصل بينهما)',
            explanation: 'طريقة الحل المنهجية: طرح المنسوبين الرئيسيّين (1200م - 1000م = 200م) ثم القسمة على عدد الفواصل (10) = 20 متراً.'
          },
          {
            id: 'cm_2',
            question: 'ما هو الاتجاه العام لانحدار وادي الملوك وجريان الخور الرئيسي في الخريطة؟',
            unit: '',
            inputType: 'direction8',
            options: ['جنوب غربي', 'شمال شرقي', 'جنوب شرقي', 'شمال غربي'],
            explanation: 'تتجه مجاري المياه الموسمية انحداراً من قمم المرتفعات الشمالية الشرقية نحو المنخفضات السهلية في الجنوب الغربي.'
          },
          {
            id: 'cm_3',
            question: 'حدد وظلل منطقة التل المخروطي البركاني بالقطاع الأوسط لخريطة جبل مرة.',
            unit: '',
            inputType: 'mapOverlay',
            overlayMatchThreshold: 0.6,
            explanation: 'تُمثل المنطقة المحددة بالخطوط المغلقة متقاربة الارتفاع بالقطاع الأوسط القمة البركانية للتل المخروطي البالغ منسوبها 1500م.'
          },
          {
            id: 'cm_4',
            question: 'صف الظاهرة التضاريسية التي تمثلها الخطوط الكنتورية المغلقة ذات المنسوب المتزايد للداخل.',
            unit: '',
            inputType: 'text',
            options: ['تل مخروطي بركاني', 'هضبة شديدة الانحدار', 'حافة جرف صخري', 'خانق نهري عميق'],
            explanation: 'الخطوط الكنتورية الدائرية أو البيضاوية المغلقة التي ترتفع مناسيبها نحو الداخل تُعبر عن ظاهرة التل المخروطي البركاني.'
          }
        ]
      },
      correctAnswer: {
        subAnswers: {
          cm_1: '20',
          cm_2: 'جنوب غربي',
          cm_3: {
            regions: [
              {
                polygon: [
                  [35, 25],
                  [65, 25],
                  [70, 50],
                  [50, 65],
                  [30, 45]
                ]
              }
            ]
          },
          cm_4: 'تل مخروطي بركاني'
        }
      },
      allocatedMarks: 10,
      explanationAr: 'خريطة كنتورية طوبوغرافية معتمدة لإقليم جبل مرة بدارفور تقيس مهارات حساب الفاصل، تحليل الاتجاه الجغرافي، التحديد المكاني، ووصف الظواهر التضاريسية.',
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2024-05-10T15:00:00Z'
    },
    {
      id: DEMO_ODD_ONE_OUT.row.id,
      subjectSlug: DEMO_ODD_ONE_OUT.subjectSlug,
      patternId: 'physics_q1_b',
      questionNumber: 1,
      partLabel: 'ب',
      questionType: DEMO_ODD_ONE_OUT.row.question_type,
      prompt: DEMO_ODD_ONE_OUT.row.content.prompt,
      content: DEMO_ODD_ONE_OUT.row.content,
      correctAnswer: DEMO_ODD_ONE_OUT.row.correct_answer,
      allocatedMarks: DEMO_ODD_ONE_OUT.row.marks,
      explanationAr: DEMO_ODD_ONE_OUT.row.explanation,
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: DEMO_COMPARISON_TABLE.row.id,
      subjectSlug: DEMO_COMPARISON_TABLE.subjectSlug,
      patternId: 'geography_q2_b',
      questionNumber: 2,
      partLabel: 'ب',
      questionType: DEMO_COMPARISON_TABLE.row.question_type,
      prompt: DEMO_COMPARISON_TABLE.row.content.prompt,
      content: DEMO_COMPARISON_TABLE.row.content,
      correctAnswer: DEMO_COMPARISON_TABLE.row.correct_answer,
      allocatedMarks: DEMO_COMPARISON_TABLE.row.marks,
      explanationAr: DEMO_COMPARISON_TABLE.row.explanation,
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: DEMO_DIAGRAM_LABELING.row.id,
      subjectSlug: DEMO_DIAGRAM_LABELING.subjectSlug,
      patternId: 'physics_q3_a',
      questionNumber: 3,
      partLabel: 'أ',
      questionType: DEMO_DIAGRAM_LABELING.row.question_type,
      prompt: DEMO_DIAGRAM_LABELING.row.content.prompt,
      content: DEMO_DIAGRAM_LABELING.row.content,
      correctAnswer: DEMO_DIAGRAM_LABELING.row.correct_answer,
      allocatedMarks: DEMO_DIAGRAM_LABELING.row.marks,
      explanationAr: DEMO_DIAGRAM_LABELING.row.explanation,
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: RHIZOPUS_DIAGRAM_QUESTION.row.id,
      subjectSlug: 'geography',
      patternId: 'geography_q4_diagram',
      questionNumber: 4,
      partLabel: 'د',
      questionType: RHIZOPUS_DIAGRAM_QUESTION.row.question_type,
      prompt: RHIZOPUS_DIAGRAM_QUESTION.row.content.prompt,
      content: RHIZOPUS_DIAGRAM_QUESTION.row.content,
      correctAnswer: RHIZOPUS_DIAGRAM_QUESTION.row.correct_answer,
      allocatedMarks: RHIZOPUS_DIAGRAM_QUESTION.row.marks,
      explanationAr: RHIZOPUS_DIAGRAM_QUESTION.row.explanation,
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'demo_diagram_rhizopus_bread_mold_bio',
      subjectSlug: 'biology',
      patternId: 'biology_q1_d',
      questionNumber: 1,
      partLabel: 'د',
      questionType: RHIZOPUS_DIAGRAM_QUESTION.row.question_type,
      prompt: RHIZOPUS_DIAGRAM_QUESTION.row.content.prompt,
      content: RHIZOPUS_DIAGRAM_QUESTION.row.content,
      correctAnswer: RHIZOPUS_DIAGRAM_QUESTION.row.correct_answer,
      allocatedMarks: RHIZOPUS_DIAGRAM_QUESTION.row.marks,
      explanationAr: RHIZOPUS_DIAGRAM_QUESTION.row.explanation,
      examScope: 'both',
      examYear: 2024,
      status: 'approved',
      createdAt: '2026-01-01T00:00:00.000Z',
    }
  );

  return questions;
}

