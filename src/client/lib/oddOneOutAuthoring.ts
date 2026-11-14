import { validateOddOneOutKey, validateQuestionContent } from '../../shared/validation/schemas';

export interface OddOneOutFormItem {
  id: string;
  text: string;
}

export interface OddOneOutFormState {
  prompt: string;
  items: OddOneOutFormItem[];
  selectedItemIds: string[];
  hasReasoning: boolean;
  reasoningPrompt: string;
  marksFraction: number;
  referenceReason: string;
  distractor1: string;
  distractor2: string;
  preservedKeywordGroups?: string[][];
  preservedMinGroups?: number;
}

export interface BuildOddOneOutResult {
  ok: boolean;
  errors: string[];
  content?: Record<string, any>;
  correctAnswer?: Record<string, any>;
}

export function emptyOddOneOutForm(defaultPrompt = ''): OddOneOutFormState {
  return {
    prompt: defaultPrompt,
    items: [
      { id: 'i1', text: '' },
      { id: 'i2', text: '' },
      { id: 'i3', text: '' },
      { id: 'i4', text: '' },
    ],
    selectedItemIds: [],
    hasReasoning: true,
    reasoningPrompt: 'علل سبب استبعادك لهذه الكلمة:',
    marksFraction: 0.5,
    referenceReason: '',
    distractor1: '',
    distractor2: '',
  };
}

export function loadOddOneOutForm(q: {
  prompt?: string;
  content?: any;
  correctAnswer?: any;
  correct_answer?: any;
}): OddOneOutFormState {
  if (!q || typeof q !== 'object') {
    return emptyOddOneOutForm();
  }

  const c = (q.content && typeof q.content === 'object') ? q.content : {};
  const caRaw = q.correctAnswer ?? q.correct_answer;

  let items: OddOneOutFormItem[] = [];
  if (Array.isArray(c.items) && c.items.length > 0) {
    items = c.items.map((it: any, idx: number) => ({
      id: String(it?.id || `i${idx + 1}`),
      text: String(it?.text ?? it ?? ''),
    }));
  } else if (Array.isArray(c.words) && c.words.length > 0) {
    items = c.words.map((w: any, idx: number) => ({
      id: `i${idx + 1}`,
      text: String(w ?? ''),
    }));
  } else {
    items = emptyOddOneOutForm().items;
  }

  let selectedItemIds: string[] = [];
  if (caRaw && typeof caRaw === 'object' && Array.isArray(caRaw.selectedItemIds)) {
    selectedItemIds = caRaw.selectedItemIds.map(String);
  } else if (typeof caRaw === 'string' && caRaw.trim()) {
    const matched = items.find((it) => it.text.trim() === caRaw.trim());
    if (matched) selectedItemIds = [matched.id];
  }

  const cReasoning = (c.reasoning && typeof c.reasoning === 'object') ? c.reasoning : undefined;
  const caReasoning = (caRaw && typeof caRaw === 'object' && caRaw.reasoning && typeof caRaw.reasoning === 'object')
    ? caRaw.reasoning
    : undefined;

  const hasReasoning = Boolean(cReasoning || caReasoning);
  const marksFraction = typeof cReasoning?.marksFraction === 'number' ? cReasoning.marksFraction : 0.5;
  const reasoningPrompt = typeof cReasoning?.prompt === 'string' && cReasoning.prompt
    ? cReasoning.prompt
    : 'علل سبب استبعادك لهذه الكلمة:';

  const correctChoiceId = typeof caReasoning?.correctChoiceId === 'string' ? caReasoning.correctChoiceId : undefined;
  const rawChoices: Array<{ id: string; text: string }> = Array.isArray(cReasoning?.trainingChoices)
    ? cReasoning.trainingChoices.map((ch: any) => ({ id: String(ch?.id ?? ''), text: String(ch?.text ?? '') }))
    : [];

  let referenceReason = typeof caReasoning?.referenceReason === 'string' ? caReasoning.referenceReason : '';
  if (!referenceReason && correctChoiceId && rawChoices.length > 0) {
    const matchedChoice = rawChoices.find((ch) => ch.id === correctChoiceId);
    if (matchedChoice) referenceReason = matchedChoice.text;
  }

  const distractors = rawChoices.filter((ch) => ch.id !== correctChoiceId);
  const distractor1 = distractors[0]?.text || '';
  const distractor2 = distractors[1]?.text || '';

  return {
    prompt: q.prompt || c.prompt || '',
    items,
    selectedItemIds,
    hasReasoning,
    reasoningPrompt,
    marksFraction,
    referenceReason,
    distractor1,
    distractor2,
    ...(Array.isArray(caReasoning?.keywordGroups) ? { preservedKeywordGroups: caReasoning.keywordGroups } : {}),
    ...(typeof caReasoning?.minGroups === 'number' ? { preservedMinGroups: caReasoning.minGroups } : {}),
  };
}

export function buildOddOneOutQuestion(form: OddOneOutFormState): BuildOddOneOutResult {
  const errors: string[] = [];

  const cleanPrompt = (form.prompt || '').trim() || 'استخرج الكلمة الشاذة ثم علل اختيارك:';
  const cleanItems = (form.items || [])
    .map((it, idx) => ({
      id: (it.id || `i${idx + 1}`).trim(),
      text: (it.text || '').trim(),
    }))
    .filter((it) => it.text.length > 0);

  if (cleanItems.length < 2) {
    errors.push('يجب إدخال عنصرين على الأقل في قائمة الكلمات/العناصر.');
  }

  const validIds = new Set(cleanItems.map((it) => it.id));
  const cleanSelectedIds = (form.selectedItemIds || []).filter((id) => validIds.has(id));
  if (cleanSelectedIds.length === 0) {
    errors.push('يرجى تحديد العنصر الشاذ الصحيح من القائمة.');
  }

  if (!form.hasReasoning) {
    const content = {
      prompt: cleanPrompt,
      items: cleanItems,
    };
    const correctAnswer = {
      selectedItemIds: cleanSelectedIds,
    };
    if (errors.length > 0) return { ok: false, errors };
    const cVal = validateQuestionContent('odd_one_out', content);
    const kVal = validateOddOneOutKey(content, correctAnswer);
    if (!cVal.valid || !kVal.valid) {
      return {
        ok: false,
        errors: [...cVal.errors.map(String), ...kVal.errors.map(String)],
      };
    }
    return { ok: true, errors: [], content, correctAnswer };
  }

  const cleanReasoningPrompt = (form.reasoningPrompt || '').trim() || 'علل سبب استبعادك لهذه الكلمة:';
  const cleanRef = (form.referenceReason || '').trim();
  const cleanD1 = (form.distractor1 || '').trim();
  const cleanD2 = (form.distractor2 || '').trim();

  const hasPreservedKeywords =
    Array.isArray(form.preservedKeywordGroups) &&
    form.preservedKeywordGroups.some((grp) => Array.isArray(grp) && grp.some((kw) => typeof kw === 'string' && kw.trim().length > 0));

  if (!cleanRef && !hasPreservedKeywords) {
    errors.push('يرجى إدخال "السبب الصحيح" لمرحلة التعليل.');
  }

  if ((cleanD1 && !cleanD2) || (!cleanD1 && cleanD2)) {
    errors.push('عند إضافة مشتتات للتدريب، يجب ملء حقلي "مشتت 1" و"مشتت 2" معاً أو تركهما فارغين معاً.');
  }

  const fraction = Number.isFinite(form.marksFraction)
    ? Math.max(0, Math.min(1, form.marksFraction))
    : 0.5;

  const reasoningContent: Record<string, any> = {
    prompt: cleanReasoningPrompt,
    marksFraction: fraction,
  };

  const reasoningKey: Record<string, any> = {};
  if (cleanRef) {
    reasoningKey.referenceReason = cleanRef;
  }

  if (cleanD1 && cleanD2) {
    if (!cleanRef) {
      errors.push('يرجى إدخال "السبب الصحيح" لتوليد خيارات التدريب مع المشتتات.');
    } else {
      const uidSuffix = Math.random().toString(36).slice(2, 6);
      const correctChoiceId = `r1_${uidSuffix}`;
      reasoningContent.trainingChoices = [
        { id: correctChoiceId, text: cleanRef },
        { id: `r2_${uidSuffix}`, text: cleanD1 },
        { id: `r3_${uidSuffix}`, text: cleanD2 },
      ];
      reasoningKey.correctChoiceId = correctChoiceId;
    }
  }

  if (hasPreservedKeywords) {
    reasoningKey.keywordGroups = form.preservedKeywordGroups;
    if (typeof form.preservedMinGroups === 'number') {
      reasoningKey.minGroups = form.preservedMinGroups;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const content = {
    prompt: cleanPrompt,
    items: cleanItems,
    reasoning: reasoningContent,
  };
  const correctAnswer = {
    selectedItemIds: cleanSelectedIds,
    reasoning: reasoningKey,
  };

  const cVal = validateQuestionContent('odd_one_out', content);
  if (!cVal.valid) {
    return { ok: false, errors: cVal.errors.map(String) };
  }
  const kVal = validateOddOneOutKey(content, correctAnswer);
  if (!kVal.valid) {
    return { ok: false, errors: kVal.errors.map(String) };
  }

  return { ok: true, errors: [], content, correctAnswer };
}
