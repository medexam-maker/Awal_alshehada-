import { QuestionType } from '../../shared/constants';

export interface SubjectMeta {
  id: string;
  name_ar: string;
  name_en: string;
  slug: string;
  category: 'common' | 'scientific' | 'literary';
  iconName: string;
  description_ar: string;
  durationMinutes: number;
  totalPoints: number;
}

export const DEMO_SUBJECTS: SubjectMeta[] = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name_ar: 'التربية الإسلامية',
    name_en: 'Islamic Studies',
    slug: 'islamic-studies',
    category: 'common',
    iconName: 'BookOpen',
    description_ar: 'القرآن الكريم وعلومه، العقيدة، الفقه الإسلامي، السيرة النبوية والتهذيب وفق منهج الشهادة الثانوية.',
    durationMinutes: 150,
    totalPoints: 100,
  },
  {
    id: '10000000-0000-0000-0000-000000000010',
    name_ar: 'العلوم العسكرية',
    name_en: 'Military Science',
    slug: 'military-science',
    category: 'literary',
    iconName: 'Shield',
    description_ar: 'مبادئ الدفاع، العلوم والمهارات العسكرية الأساسية، والتنظيم والتكتيكات.',
    durationMinutes: 150,
    totalPoints: 100,
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name_ar: 'اللغة العربية',
    name_en: 'Arabic Language',
    slug: 'arabic-language',
    category: 'common',
    iconName: 'Feather',
    description_ar: 'النحو والصرف، البلاغة والأدب، النصوص المقررة، الإملاء والإنشاء وقواعد الإعراب.',
    durationMinutes: 180,
    totalPoints: 100,
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    name_ar: 'اللغة الإنجليزية',
    name_en: 'English Language',
    slug: 'english-language',
    category: 'common',
    iconName: 'Globe',
    description_ar: 'Sudan English Secondary Curriculum: Reading comprehension, grammar & vocabulary, and writing.',
    durationMinutes: 150,
    totalPoints: 100,
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name_ar: 'الرياضيات الأساسية والمتخصصة',
    name_en: 'Mathematics',
    slug: 'mathematics',
    category: 'scientific',
    iconName: 'Divide',
    description_ar: 'التفاضل والتكامل، الهندسة التحليلية والمستوية، الجبر والمصفوفات، والإحصاء والاحتمالات.',
    durationMinutes: 180,
    totalPoints: 100,
  },
  {
    id: '10000000-0000-0000-0000-000000000005',
    name_ar: 'الفيزياء',
    name_en: 'Physics',
    slug: 'physics',
    category: 'scientific',
    iconName: 'Zap',
    description_ar: 'الميكانيكا والحركة، الكهرباء الساكنة والتيارية، المغناطيسية، والفيزياء الذوية والنووية.',
    durationMinutes: 180,
    totalPoints: 100,
  },
  {
    id: '10000000-0000-0000-0000-000000000006',
    name_ar: 'الكيمياء',
    name_en: 'Chemistry',
    slug: 'chemistry',
    category: 'scientific',
    iconName: 'FlaskConical',
    description_ar: 'الكيمياء العامة والعضوية، التوازن الكيميائي، الديناميكا الحرارية، والكيمياء التحليلية.',
    durationMinutes: 180,
    totalPoints: 100,
  },
  {
    id: '10000000-0000-0000-0000-000000000007',
    name_ar: 'الأحياء',
    name_en: 'Biology',
    slug: 'biology',
    category: 'scientific',
    iconName: 'Dna',
    description_ar: 'علم الخلية، التكاثر في الكائنات الحية، التوارث والوراثة، والبيئة وتوازنها الحيوي.',
    durationMinutes: 180,
    totalPoints: 100,
  },
  {
    id: '10000000-0000-0000-0000-000000000008',
    name_ar: 'التاريخ',
    name_en: 'History',
    slug: 'history',
    category: 'literary',
    iconName: 'Landmark',
    description_ar: 'تاريخ السودان الحديث والمعاصر، الثورة المهدية، والحركات الوطنية الإفريقية والعربية.',
    durationMinutes: 150,
    totalPoints: 100,
  },
  {
    id: '10000000-0000-0000-0000-000000000009',
    name_ar: 'الجغرافيا والدراسات البيئية',
    name_en: 'Geography',
    slug: 'geography',
    category: 'literary',
    iconName: 'Compass',
    description_ar: 'جغرافية السودان الطبيعية والاقتصادية، قراءة وتفسير الخرائط الكنتورية، والمشكلات البيئية.',
    durationMinutes: 150,
    totalPoints: 100,
  },
];

export interface ExamQuestion {
  id: string;
  type: string;
  points: number;
  prompt: string;
  content: any;
  correctAnswer?: any;
  explanationAr?: string;
}

export const SAMPLE_QUESTIONS_POOL: Record<string, ExamQuestion[]> = {
  // 1. Islamic Studies
  '10000000-0000-0000-0000-000000000001': [
    {
      id: 'q-is-01',
      type: QuestionType.TRUE_FALSE,
      points: 4,
      prompt: 'ضع علامة (صح) أو (خطأ) أمام العبارة التالية:',
      content: {
        statement: 'نزل القرآن الكريم منجماً (مفرّقاً) على مدار ثلاث وعشرين سنة لحكمة تثبيت فؤاد النبي ﷺ ومواكبة الأحداث.',
        explanation: 'القرآن نزل مفرّقاً لحكم جليلة منها تثبيت قلب النبي ﷺ والتدرج في التشريع وتيسير حفظه وفهمه.',
      },
      correctAnswer: { value: true },
      explanationAr: 'الإجابة صحيحة، نزل مفرقاً على النبي ﷺ طيلة ثلاث وعشرين سنة.',
    },
    {
      id: 'q-is-02',
      type: QuestionType.MULTIPLE_CHOICE,
      points: 5,
      prompt: 'اختر الإجابة الصحيحة من بين الخيارات التالية:',
      content: {
        prompt: 'الصحابي الجليل الذي كُلّف بجمع القرآن الكريم في مصحف واحد في عهد الخليفة أبي بكر الصديق رضي الله عنه هو:',
        options: [
          { id: 'opt-1', text: 'زيد بن ثابت رضي الله عنه' },
          { id: 'opt-2', text: 'عثمان بن عفان رضي الله عنه' },
          { id: 'opt-3', text: 'عبد الله بن مسعود رضي الله عنه' },
          { id: 'opt-4', text: 'علي بن أبي طالب رضي الله عنه' },
        ],
      },
      correctAnswer: { selectedOptionId: 'opt-1' },
      explanationAr: 'كلّف أبو بكر الصديق بمشورة عمر بن الخطاب الصحابي زيد بن ثابت لجمعه لكونه شاباً عاقلاً وكاتباً للوحي.',
    },
    {
      id: 'q-is-03',
      type: QuestionType.FILL_BLANK,
      points: 6,
      prompt: 'أكمل الفراغات الآتية بما يناسبها من كلمات:',
      content: {
        prompt: 'أكمل الحديث النبوي الشريف:',
        template: 'قال رسول الله ﷺ: «بُنِيَ الإِسْلامُ عَلَى {{1}}: شَهَادَةِ أَنْ لا إِلَهَ إِلا اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَإِقَامِ الصَّلاةِ، وَإِيتَاءِ {{2}}، وَحَجِّ الْبَيْتِ، وَصَوْمِ {{3}}».',
        wordBank: ['خمس', 'الزكاة', 'رمضان', 'الإحسان', 'الصيام', 'سبع'],
      },
      correctAnswer: {
        blanks: {
          '{{1}}': 'خمس',
          '{{2}}': 'الزكاة',
          '{{3}}': 'رمضان',
        },
      },
      explanationAr: 'حديث ابن عمر رضي الله عنهما في الصحيحين يبين أركان الإسلام الخمسة.',
    },
    {
      id: 'q-is-04',
      type: QuestionType.MATCHING,
      points: 8,
      prompt: 'زاوج بين المصطلح الشرعي في القائمة (أ) والمعنى المطابق له في القائمة (ب):',
      content: {
        prompt: 'زاوج بين المفاهيم الفقهية ومعانيها:',
        columnA: [
          { id: 'a1', text: 'الإجماع' },
          { id: 'a2', text: 'القياس' },
          { id: 'a3', text: 'المصلحة المرسلة' },
        ],
        columnB: [
          { id: 'b1', text: 'اتفاق مجتهدي أمة محمد ﷺ بعد وفاته في عصر على أمر شرعي' },
          { id: 'b2', text: 'إلحاق فرع بأصل في حكم لعلة جامعة بينهما' },
          { id: 'b3', text: 'جلب منفعة أو دفع مضرة لم ينص الشارع على اعتبارها أو إلغائها' },
        ],
      },
      correctAnswer: {
        pairs: [
          { leftId: 'a1', rightId: 'b1' },
          { leftId: 'a2', rightId: 'b2' },
          { leftId: 'a3', rightId: 'b3' },
        ],
      },
      explanationAr: 'هذه هي أصول التشريع الإسلامي المعتمدة عند جمهور علماء الأصول.',
    },
    {
      id: 'q-is-05',
      type: QuestionType.EXPLAIN,
      points: 7,
      prompt: 'علل ما يلي وفق المنهج المقرر:',
      content: {
        prompt: 'علل: نهى النبي ﷺ عن صيام يومي العيدين (الفطر والأضحى).',
        guidance: 'اذكر الحكمة التشريعية من النهي عن صيام يومي العيد.',
      },
      correctAnswer: { text: 'لأنهما يوما فرح وتوسعة وضيافة من الله تعالى للمسلمين، وفطر عيد الفطر شكر لإتمام الصيام، وأيام الأضحى أيام أكل وشرب وذكر لله.' },
      explanationAr: 'العيدان يوم ضيافة من الله لعباده، والصوم فيهما إعراض عن ضيافة الكريم سبحانه.',
    },
    {
      id: 'q-is-06',
      type: QuestionType.SHORT_ESSAY,
      points: 6,
      prompt: 'أجب بإيجاز عن السؤال التالي:',
      content: {
        prompt: 'اذكر ثلاثة من شروط وجوب الزكاة في الأموال النامية.',
      },
      correctAnswer: { text: '1. بلوغ النصاب، 2. تمام الحول (مرور عام هجري كامل)، 3. الملك التام والقدرة على التصرف.' },
      explanationAr: 'شروط الزكاة تضمن عدم إلحاق المشقة بالمزكي وأداء الحق لأصحابه.',
    },
  ],

  // 2. Arabic Language
  '10000000-0000-0000-0000-000000000002': [
    {
      id: 'q-ar-01',
      type: QuestionType.ARABIC_GRAMMAR,
      points: 10,
      prompt: 'اضبط الكلمات التي تحتها خط بالشكل التام وبيّن الموقع الإعرابي:',
      content: {
        passage: 'إنَّ العلمَ نورٌ يُضيءُ دروبَ السالكينَ، وما زالَ العلماءُ ورثةَ الأنبياءِ.',
        words: [
          {
            id: 'w1',
            word: 'نورٌ',
            options: ['خبر إنَّ مرفوع وعلامة رفعه الضمة الظاهرة', 'اسم إنَّ منصوب', 'مبتدأ مؤخر مرفوع'],
          },
          {
            id: 'w2',
            word: 'دروبَ',
            options: ['مفعول به منصوب وعلامة نصبه الفتحة الظاهرة', 'فاعل مرفوع بالضمة', 'مضاف إليه مجرور'],
          },
          {
            id: 'w3',
            word: 'العلماءُ',
            options: ['اسم ما زال مرفوع وعلامة رفعه الضمة الظاهرة', 'خبر ما زال منصوب', 'فاعل مرفوع بالضمة'],
          },
        ],
      },
      correctAnswer: {
        selections: {
          w1: 'خبر إنَّ مرفوع وعلامة رفعه الضمة الظاهرة',
          w2: 'مفعول به منصوب وعلامة نصبه الفتحة الظاهرة',
          w3: 'اسم ما زال مرفوع وعلامة رفعه الضمة الظاهرة',
        },
      },
      explanationAr: 'العلم اسم إن منصوب، ونور خبرها المرفوع. دروب مفعول به للفعل يضيء. العلماء اسم ما زال الناسخة مرفوع.',
    },
    {
      id: 'q-ar-02',
      type: QuestionType.READING_COMPREHENSION,
      points: 12,
      prompt: 'اقرأ النص الأدبي التالي ثم أجب عن الأسئلة الملحقة به:',
      content: {
        passage: '«إن النيل شريان الحياة في أرض السودان، انحدر من هضاب الحبشة وبحيرات الاستواء حاملاً الخصب والنماء، وعلى ضفافه قامت حضارة كوش ومروي العريقة التي صاغت فجر التاريخ وصهرت الحديد وبنت الأهرامات الشامخة في البجراوية».',
        subQuestions: [
          {
            id: 'sq1',
            question: 'ما هي أهم الحضارات القديمة التي قامت على ضفاف النيل في السودان كما ورد في النص؟',
            options: ['حضارة كوش ومروي', 'حضارة بابل', 'حضارة الفينيقيين'],
          },
          {
            id: 'sq2',
            question: 'استخرج من النص صورة بيانية (استعارة أو تشبيه) تدل على أهمية النيل.',
            options: ['النيل شريان الحياة (تشبيه بليغ)', 'حاملاً الخصب', 'صهرت الحديد'],
          },
        ],
      },
      correctAnswer: {
        answers: {
          sq1: 'حضارة كوش ومروي',
          sq2: 'النيل شريان الحياة (تشبيه بليغ)',
        },
      },
      explanationAr: 'الحضارة هي كوش ومروي، والتشبيه البليغ شريان الحياة يصور النيل بجسد حي.',
    },
    {
      id: 'q-ar-03',
      type: QuestionType.ODD_ONE_OUT,
      points: 5,
      prompt: 'استخرج الكلمة الشاذة نحوياً من بين الكلمات التالية مع بيان السبب:',
      content: {
        prompt: 'عيّن الاسم الممنوع من الصرف الذي شذّ عن المجموعة:',
        items: ['مساجد', 'مصابيح', 'علماء', 'طالبٌ'],
      },
      correctAnswer: { oddItem: 'طالبٌ' },
      explanationAr: 'طالب اسم منصرف ينون، بينما بقية الكلمات صيغ منتهى الجموع وممنوعة من الصرف.',
    },
    {
      id: 'q-ar-04',
      type: QuestionType.ORDERING,
      points: 6,
      prompt: 'رتّب الكلمات الآتية لتكوّن بيتاً شعرياً صحيح الوزن والمعنى وفق المقرر:',
      content: {
        prompt: 'رتب شطري البيت الشعري للمتنبي:',
        items: ['وتعظم في عين الصغير صغارها', 'على قدر أهل العزم تأتي العزائم', 'وتصغر في عين العظيم العظائم', 'وتأتي على قدر الكرام المكارم'],
      },
      correctAnswer: {
        orderedItems: ['على قدر أهل العزم تأتي العزائم', 'وتأتي على قدر الكرام المكارم', 'وتعظم في عين الصغير صغارها', 'وتصغر في عين العظيم العظائم'],
      },
      explanationAr: 'الترتيب البلاغي الصحيح لقصيدة سيف الدولة الحمداني الشهيرة.',
    },
  ],

  // 4. Mathematics
  '10000000-0000-0000-0000-000000000004': [
    {
      id: 'q-math-01',
      type: QuestionType.CALCULATION,
      points: 8,
      prompt: 'أوجد قيمة النهاية التالية مع توضيح خطوات الحل:',
      content: {
        prompt: 'احسب قيمة: نهــــا (س² - 9) / (س - 3) عندما س تؤول إلى 3.',
        unit: '',
        guidelines: 'حلل البسط إلى فرق بين مربعين ثم اختصر العامل الصفري (س - 3).',
      },
      correctAnswer: { value: '6' },
      explanationAr: 'بالتحليل: (س - 3)(س + 3) / (س - 3) = س + 3. بالتعويض المباشر س = 3، ينتج 3 + 3 = 6.',
    },
    {
      id: 'q-math-02',
      type: QuestionType.CALCULATION,
      points: 8,
      prompt: 'مسألة تفاضل وتكامل:',
      content: {
        prompt: 'إذا كانت د(س) = 4 س³ + 5 س² - 7 س + 9، فما هي قيمة المشتقة الأولى دَ(1)؟',
        unit: '',
      },
      correctAnswer: { value: '15' },
      explanationAr: 'المشتقة دَ(س) = 12 س² + 10 س - 7. بالتعويض بس = 1: 12(1) + 10(1) - 7 = 12 + 10 - 7 = 15.',
    },
    {
      id: 'q-math-03',
      type: QuestionType.COMPARISON_TABLE,
      points: 8,
      prompt: 'أكمل جدول المقارنة بين القطع المكافئ والقطع الناقص:',
      content: {
        prompt: 'أكمل عناصر المقارنة التالية في الهندسة التحليلية:',
        tableHeaders: ['المعيار', 'القطع المكافئ', 'القطع الناقص'],
        rows: [
          {
            criteria: 'معامل الاختلاف المركزي (ي)',
            optionsCol1: ['ي = 1', 'ي < 1', 'ي > 1'],
            optionsCol2: ['ي < 1', 'ي = 1', 'ي = 0'],
          },
          {
            criteria: 'عدد البؤر',
            optionsCol1: ['بؤرة واحدة', 'بؤرتان', 'لا توجد بؤر'],
            optionsCol2: ['بؤرتان', 'بؤرة واحدة', 'أربع بؤر'],
          },
        ],
      },
      correctAnswer: {
        tableAnswers: {
          'row-0-col-1': 'ي = 1',
          'row-0-col-2': 'ي < 1',
          'row-1-col-1': 'بؤرة واحدة',
          'row-1-col-2': 'بؤرتان',
        },
      },
      explanationAr: 'القطع المكافئ يتميز بمعامل اختلاف مركزي ي = 1 وبؤرة واحدة، بينما القطع الناقص ي < 1 وله بؤرتان.',
    },
  ],

  // 5. Physics
  '10000000-0000-0000-0000-000000000005': [
    {
      id: 'q-phy-01',
      type: QuestionType.DIAGRAM_LABELING,
      points: 10,
      prompt: 'تعرّف على أجزاء الدائرة الكهربائية الموضحة في الرسم البياني:',
      content: {
        prompt: 'سمِّ العناصر المرقمة على مخطط الدائرة الكهربائية لقانون أوم:',
        diagramUrl: '/assets/physics_circuit.svg',
        labels: [
          { targetId: 't1', title: 'عنصر قياس شدة التيار (أميتر)' },
          { targetId: 't2', title: 'عنصر قياس فرق الجهد (فولتميتر)' },
          { targetId: 't3', title: 'مقاومة متغيرة (ريوستات)' },
        ],
      },
      correctAnswer: {
        assignedLabels: {
          t1: 'أميتر (A)',
          t2: 'فولتميتر (V)',
          t3: 'ريوستات (Rheostat)',
        },
      },
      explanationAr: 'يوصل الأميتر على التوالي لقياس التيار، بينما يوصل الفولتميتر على التوازي عبر المقاومة.',
    },
    {
      id: 'q-phy-02',
      type: QuestionType.CALCULATION,
      points: 8,
      prompt: 'مسألة فيزيائية في الديناميكا:',
      content: {
        prompt: 'جسم كتلته 5 كجم يتحرك بعجلة منتظمة مقدارها 4 م/ث². احسب مقدار القوة المحصلة المؤثرة عليه بوحدة النيوتن (N).',
        unit: 'N',
      },
      correctAnswer: { value: '20' },
      explanationAr: 'طبقاً لقانون نيوتن الثاني للحركة: القوة ق = الكتلة ك × العجلة جـ = 5 × 4 = 20 نيوتن.',
    },
    {
      id: 'q-phy-03',
      type: QuestionType.EXPLAIN,
      points: 6,
      prompt: 'علل فيزيائياً ما يلي:',
      content: {
        prompt: 'علل: تصنع أسلاك التوصيل الكهربائي ذات المقاومة المنخفضة من النحاس السميك بدلاً من الرفيع.',
      },
      correctAnswer: { text: 'لأن مقاومة السلك تتناسب عكسياً مع مساحة مقطعه العرضي، فكلما زاد سمك السلك قلت مقاومته وقل الفقد الحراري للطاقة.' },
      explanationAr: 'م = المقاومية النوعية × الطول / المساحة (العلاقة عكسية مع المساحة).',
    },
  ],

  // 9. Geography
  '10000000-0000-0000-0000-000000000009': [
    {
      id: 'q-geo-01',
      type: QuestionType.CONTOUR_MAP,
      points: 10,
      prompt: 'ادرس الخريطة الكنتورية المرفقة ثم أجب عن الأسئلة:',
      content: {
        prompt: 'خريطة كنتورية لمنطقة جبلية في شرق السودان (تلال البحر الأحمر):',
        mapUrl: '/assets/contour_map.svg',
        subQuestions: [
          { id: 'sq1', question: 'ما هو الفاصل الرأسي (Contour Interval) بين خطوط الكنتور إذا كانت المناسيب المتتالية 100م، 150م، 200م؟', unit: 'متر' },
          { id: 'sq2', question: 'ماذا يدل تقارب خطوط الكنتور بشدة في الجانب الشرقي للخريطة؟', unit: '' },
        ],
      },
      correctAnswer: {
        subAnswers: {
          sq1: '50',
          sq2: 'انحدار شديد (جرف منحدر)',
        },
      },
      explanationAr: 'الفاصل الرأسي هو الفرق بين منسوبين متتاليين (150 - 100 = 50م)، وتقارب الخطوط يمثل انحداراً شديداً.',
    },
    {
      id: 'q-geo-02',
      type: QuestionType.MULTIPLE_CHOICE,
      points: 5,
      prompt: 'اختر الإجابة الصحيحة:',
      content: {
        prompt: 'أكبر مشروع زراعي مروي بالري الانسيابي في السودان وإفريقيا هو:',
        options: [
          { id: 'opt-1', text: 'مشروع الجزيرة والمناقل' },
          { id: 'opt-2', text: 'مشروع الرهد الزراعي' },
          { id: 'opt-3', text: 'مشروع حلفا الجديدة' },
          { id: 'opt-4', text: 'مشروع دلتا القاش' },
        ],
      },
      correctAnswer: { selectedOptionId: 'opt-1' },
      explanationAr: 'مشروع الجزيرة تأسس عام 1925م ويعتبر من أضخم المشروعات الزراعية المروية انسيابياً من خزان سنار.',
    },
  ],
};

/**
 * Fallback questions for any subject that doesn't have an explicit pool above.
 */
export function getQuestionsForSubject(subjectId: string): ExamQuestion[] {
  if (SAMPLE_QUESTIONS_POOL[subjectId] && SAMPLE_QUESTIONS_POOL[subjectId].length > 0) {
    return SAMPLE_QUESTIONS_POOL[subjectId];
  }
  // Generic comprehensive mock questions covering multiple types
  return [
    {
      id: 'gen-01',
      type: QuestionType.TRUE_FALSE,
      points: 4,
      prompt: 'ضع علامة (صح) أو (خطأ) أمام العبارة:',
      content: {
        statement: 'الشهادة الثانوية السودانية تعد المؤهل الأكاديمي الأساسي للقبول بمؤسسات التعليم العالي والجامعات في السودان.',
      },
      correctAnswer: { value: true },
      explanationAr: 'الشهادة السودانية هي الشهادة الثانوية الوطنية المعتمدة للالتحاق بالجامعات ومؤسسات التعليم العالي.',
    },
    {
      id: 'gen-02',
      type: QuestionType.MULTIPLE_CHOICE,
      points: 5,
      prompt: 'اختر الإجابة الصحيحة:',
      content: {
        prompt: 'ما هي عاصمة السودان المثلثة التي تلتقي عندها مياه النيلين الأبيض والأزرق؟',
        options: [
          { id: 'opt-1', text: 'الخرطوم (الخرطوم، بحري، أم درمان)' },
          { id: 'opt-2', text: 'بورتسودان' },
          { id: 'opt-3', text: 'الأبيض' },
          { id: 'opt-4', text: 'ود مدني' },
        ],
      },
      correctAnswer: { selectedOptionId: 'opt-1' },
      explanationAr: 'الخرطوم العاصمة المثلثة تتكون من مدن الخرطوم والخرطوم بحري وأم درمان عند مقرن النيلين.',
    },
    {
      id: 'gen-03',
      type: QuestionType.FILL_BLANK,
      points: 6,
      prompt: 'أكمل الفراغات:',
      content: {
        prompt: 'أكمل العبارة الجغرافية:',
        template: 'ينبع النيل الأزرق من بحيرة {{1}} في إثيوبيا، بينما ينبع النيل الأبيض من بحيرة {{2}} في هضبة البحيرات.',
        wordBank: ['تانا', 'فيكتوريا', 'تشاد', 'ناصر'],
      },
      correctAnswer: {
        blanks: {
          '{{1}}': 'تانا',
          '{{2}}': 'فيكتوريا',
        },
      },
      explanationAr: 'النيل الأزرق ينبع من بحيرة تانا والنيل الأبيض من بحيرة فيكتوريا.',
    },
    {
      id: 'gen-04',
      type: QuestionType.SHORT_ESSAY,
      points: 6,
      prompt: 'أجب بإيجاز:',
      content: {
        prompt: 'اذكر اثنين من الموارد الطبيعية الحيوية التي يزخر بها السودان.',
      },
      correctAnswer: { text: 'الأراضي الزراعية الخصبة، والمياه العذبة، والثروة الحيوانية والمعادن كالذهب والكروم.' },
      explanationAr: 'السودان يمتلك مساحات زراعية شاسعة وثروة حيوانية هائلة وموارد مائية وفيرة.',
    },
  ];
}
