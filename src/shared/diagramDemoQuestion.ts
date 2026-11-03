/**
 * Demo Question for C2 — Visual Mastery Lab (diagram_labeling)
 * Physics: Convex Lens (عدسة محدبة)
 * Total Marks: 4 (sq1: 1, sq2: 1, sq3: 2)
 */

export const DEMO_DIAGRAM_LABELING = {
  subjectSlug: 'physics',
  row: {
    id: 'demo_diagram_convex_lens',
    subject_id: 'physics',
    question_type: 'diagram_labeling' as const,
    marks: 4,
    primary_interaction_mode: 'diagram_interactive',
    content: {
      prompt: 'دراسة مسار الأشعة الضوئية في العدسة المحدبة',
      diagram: {
        url: '/assets/diagrams/convex_lens.svg',
        alt: 'مسار الأشعة الضوئية خلال عدسة محدبة والبؤرة الرئيسية',
      },
      subQuestions: [
        {
          id: 'sq1',
          kind: 'locate' as const,
          prompt: 'حدد موضع البؤرة الرئيسية F على يمين العدسة',
          marks: 1,
          hints: [
            'ابحث على المحور الرئيسي',
            'البؤرة في الجهة التي تتجمع فيها الأشعة بعد العدسة',
          ],
        },
        {
          id: 'sq2',
          kind: 'name' as const,
          prompt: 'ما اسم الجزء المظلل؟',
          marks: 1,
          target: {
            type: 'ellipse' as const,
            cx: 0.5,
            cy: 0.5,
            rx: 0.05,
            ry: 0.35,
          },
          options: [
            { id: 'sq2_opt1', text: 'العدسة المحدبة' },
            { id: 'sq2_opt2', text: 'المرآة المقعرة' },
            { id: 'sq2_opt3', text: 'المنشور الزجاجي' },
          ],
        },
        {
          id: 'sq3',
          kind: 'function' as const,
          prompt: 'ماذا يحدث للأشعة الموازية للمحور الرئيسي بعد مرورها في العدسة المحدبة؟',
          marks: 2,
          options: [
            { id: 'sq3_opt1', text: 'تتجمع في البؤرة' },
            { id: 'sq3_opt2', text: 'تتفرق بعيداً عن المحور' },
            { id: 'sq3_opt3', text: 'تنعكس عائدة في الاتجاه نفسه' },
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
              cx: 0.75,
              cy: 0.5,
              rx: 0.04,
              ry: 0.06,
            },
          ],
        },
        sq2: {
          optionId: 'sq2_opt1',
          acceptedNames: ['العدسة المحدبة', 'عدسة محدبة', 'العدسة اللامة', 'عدسة لامة'],
        },
        sq3: {
          optionId: 'sq3_opt1',
        },
      },
      explanations: {
        sq1: 'البؤرة الرئيسية F هي النقطة التي تتجمع فيها الأشعة الموازية للمحور الرئيسي بعد انكسارها في العدسة المحدبة.',
        sq2: 'العدسة المحدبة (اللامة) هي وسط كاسر شفاف محاط بسطحين كرويين وتكون سميكة في الوسط.',
        sq3: 'تنكسر الأشعة الموازية للمحور الرئيسي مارة بالبؤرة الرئيسية للعدسة المحدبة.',
      },
    },
    explanation: 'تعتبر العدسة المحدبة مجمعة للأشعة الضوئية الموازية للمحور الرئيسي في نقطة تسمى البؤرة الرئيسية.',
  },
};
