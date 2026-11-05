/**
 * Question for Diagram Labeling (diagram_labeling)
 * Subject: Geography (as requested for pattern trial)
 * Topic: Bread Mold / Rhizopus stolonifer (فطر عفن الخبز)
 * Total Marks: 5 (1 locate + 2 name + 2 function)
 */

export const RHIZOPUS_DIAGRAM_QUESTION = {
  subjectSlug: 'geography',
  row: {
    id: 'demo_diagram_rhizopus_bread_mold',
    subject_id: 'geography',
    question_type: 'diagram_labeling' as const,
    marks: 5,
    primary_interaction_mode: 'diagram_interactive',
    content: {
      prompt: '(د) الرسم التالي يوضح هيفا (خيط) في فطر عفن الخبز. تتبع الأجزاء الموضحة وأجب عن الأسئلة المحددة:',
      diagram: {
        url: '/assets/diagrams/bread_mold_rhizopus.svg',
        alt: 'رسم تخطيطي لتركيب فطر عفن الخبز (الخيط الفطري والأبواغ)',
      },
      subQuestions: [
        {
          id: 'sq1',
          kind: 'locate' as const,
          prompt: 'حدد موضع الحافظة البوغية (Sporangium) على الرسم:',
          marks: 1,
          hints: [
            'ابحث في الجزء العلوي المتضخم من الخيط القائم',
            'تكون الحافظة البوغية كروية الشكل في قمة الحامل البوغي',
          ],
        },
        {
          id: 'sq2',
          kind: 'name' as const,
          prompt: 'ما اسم الجزء المشار إليه بالرقم (1)؟',
          marks: 1,
          target: {
            type: 'ellipse' as const,
            cx: 0.50,
            cy: 0.55,
            rx: 0.05,
            ry: 0.22,
          },
          options: [
            { id: 'rhiz_sq2_opt1', text: 'الخيط القائم / الحامل البوغي (Sporangiophore)' },
            { id: 'rhiz_sq2_opt2', text: 'الخيط الأفقي / الساق الهوائية (Stolon)' },
            { id: 'rhiz_sq2_opt3', text: 'أشباه الجذور / الخيوط الجذرية (Rhizoids)' },
          ],
        },
        {
          id: 'sq3',
          kind: 'name' as const,
          prompt: 'ما اسم التراكيب المتفرعة في قاعدة الفطر المشار إليها بالرقم (2)؟',
          marks: 1,
          target: {
            type: 'ellipse' as const,
            cx: 0.51,
            cy: 0.89,
            rx: 0.10,
            ry: 0.08,
          },
          options: [
            { id: 'rhiz_sq3_opt1', text: 'الخيوط الجذرية / أشباه الجذور (Rhizoids)' },
            { id: 'rhiz_sq3_opt2', text: 'الأكياس البوغية (Spores)' },
            { id: 'rhiz_sq3_opt3', text: 'الحافظة التزاوجية (Zygospore)' },
          ],
        },
        {
          id: 'sq4',
          kind: 'function' as const,
          prompt: 'ما وظيفة الحافظة البوغية في فطر عفن الخبز؟',
          marks: 1,
          options: [
            { id: 'rhiz_sq4_opt1', text: 'إنتاج الأبواغ وحفظها للتكاثر اللاجنسي' },
            { id: 'rhiz_sq4_opt2', text: 'تثبيت الفطر وامتصاص الغذاء والماء من الركيزة' },
            { id: 'rhiz_sq4_opt3', text: 'التمدد الأفقي لربط المستعمرات الفطرية' },
          ],
        },
        {
          id: 'sq5',
          kind: 'function' as const,
          prompt: 'ما وظيفة الخيط القائم في فطر عفن الخبز الذي ينمو لأعلى؟',
          marks: 1,
          options: [
            { id: 'rhiz_sq5_opt1', text: 'رفع الحافظة البوغية لأعلى لتسهيل انتشار الأبواغ بالهواء' },
            { id: 'rhiz_sq5_opt2', text: 'إفراز الإنزيمات الهاضمة على الركيزة الغذائية' },
            { id: 'rhiz_sq5_opt3', text: 'القيام بعملية البناء الضوئي وتصنيع الغذاء' },
          ],
        },
      ],
    },
    correct_answer: {
      subAnswers: {
        sq1: {
          regions: [
            {
              type: 'ellipse' as const,
              cx: 0.50,
              cy: 0.233,
              rx: 0.09,
              ry: 0.12,
            },
          ],
        },
        sq2: {
          optionId: 'rhiz_sq2_opt1',
          acceptedNames: [
            'الخيط القائم',
            'الحامل البوغي',
            'الخيط القائم / الحامل البوغي',
            'خيط قائم',
            'حامل بوغي',
            'الخيط القائم او الحامل البوغي',
          ],
        },
        sq3: {
          optionId: 'rhiz_sq3_opt1',
          acceptedNames: [
            'الخيوط الجذرية',
            'أشباه الجذور',
            'الهيفات الجذرية',
            'خيوط جذرية',
            'اشباه الجذور',
            'الهيفات',
          ],
        },
        sq4: {
          optionId: 'rhiz_sq4_opt1',
        },
        sq5: {
          optionId: 'rhiz_sq5_opt1',
        },
      },
      explanations: {
        sq1: 'الحافظة البوغية (Sporangium) هي الانتفاخ الكروي الواقع في قمة الحامل البوغي والذي تتكون بداخله الأبواغ.',
        sq2: 'الخيط القائم أو الحامل البوغي (Sporangiophore) ينمو رأسياً إلى أعلى حاملاً في قمته الحافظة البوغية.',
        sq3: 'الخيوط الجذرية أو أشباه الجذور (Rhizoids) هي تفرعات شبيهة بالجذور تخترق وسط الغذاء (الخبز) لتثبيت الفطر وامتصاص المواد الغذائية.',
        sq4: 'وظيفة الحافظة البوغية هي إنتاج وحفظ الأبواغ التي تنفجر الحافظة عند نضجها لتنتشر بالهواء مسببة التكاثر اللاجنسي.',
        sq5: 'وظيفة الخيط القائم هي رفع الحافظة البوغية عالياً بعيداً عن الركيزة الرطبة لتلتقطها التيارات الهوائية وتنتشر بسهولة لمسافات بعيدة.',
      },
    },
    explanation:
      'يوضح الرسم تركيب فطر عفن الخبز (Rhizopus): يتكون من خيوط جذرية للتثبيت وامتصاص الغذاء، وخيط قائم يرفع الحافظة البوغية لأعلى لإنتاج الأبواغ ونشرها بالهواء للتكاثر اللاجنسي.',
  },
};
