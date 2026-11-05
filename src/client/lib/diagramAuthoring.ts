/**
 * VISUAL MASTERY LAB — DIAGRAM AUTHORING HELPERS (CR-2026-11-10)
 * Pure functions: buildDiagramQuestion(formState) and formStateFromQuestion(question)
 */

import { validateRegion, Region } from '../../shared/regionGeometry';
import { validateQuestionContent, validateDiagramLabelingKey } from '../../shared/validation/schemas';

export interface AuthoringIssue {
  code: string;
  message: string;
  subUid?: string;
}

export interface FormSubQuestion {
  uid: string;
  kind: 'locate' | 'name' | 'function';
  prompt: string;
  weight?: number;
  skill?: 'recognition' | 'identification' | 'understanding';
  hints?: string[];
  options?: string[];
  correctIndex?: number | null;
  acceptedNames?: string[];
  explanation?: string;
  target?: Region | null;
}

export interface DiagramFormState {
  prompt: string;
  marks?: number;
  diagram: {
    assetId?: string;
    url?: string;
    alt?: string;
  };
  subQuestions: FormSubQuestion[];
  regions: Record<string, Region[]>;
}

export interface BuildDiagramQuestionResult {
  ok: boolean;
  issues: AuthoringIssue[];
  content?: any;
  key?: any;
}

/**
 * Builds a diagram labeling question's content and correct_answer key from form state.
 * Generates canonical IDs (sq1, sq2, sq1_a, sq1_b, etc.) so teachers never deal with internal IDs.
 */
export function buildDiagramQuestion(formState: any): BuildDiagramQuestionResult {
  const issues: AuthoringIssue[] = [];

  if (!formState || typeof formState !== 'object') {
    return {
      ok: false,
      issues: [{ code: 'NO_SUBQUESTIONS', message: 'يرجى إضافة سؤال فرعي واحد على الأقل' }],
    };
  }

  // 1. Diagram reference validation
  const diagram = formState.diagram || {};
  const assetId = typeof diagram.assetId === 'string' ? diagram.assetId.trim() : '';
  const url = typeof diagram.url === 'string' ? diagram.url.trim() : '';
  const alt = typeof diagram.alt === 'string' ? diagram.alt.trim() : '';

  if (!assetId && !url) {
    issues.push({ code: 'NO_IMAGE', message: 'يرجى إضافة صورة أو اختيار ملف للرسم التوضيحي' });
  }

  // 2. Main prompt validation
  const mainPrompt = typeof formState.prompt === 'string' ? formState.prompt.trim() : '';
  if (!mainPrompt) {
    issues.push({ code: 'NO_PROMPT', message: 'يرجى كتابة نص السؤال الرئيسي' });
  }

  // 3. Sub-questions list validation
  const rawSubs = Array.isArray(formState.subQuestions) ? formState.subQuestions : [];
  if (rawSubs.length === 0) {
    issues.push({ code: 'NO_SUBQUESTIONS', message: 'يرجى إضافة سؤال فرعي واحد على الأقل' });
  }

  rawSubs.forEach((sub: any, idx: number) => {
    const subUid = sub.uid || `sq_${idx + 1}`;

    const subPrompt = typeof sub.prompt === 'string' ? sub.prompt.trim() : '';
    if (!subPrompt) {
      issues.push({ code: 'SUB_PROMPT_EMPTY', message: 'لا يمكن ترك نص السؤال الفرعي فارغاً', subUid });
    }

    const weight = sub.weight;
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) {
      issues.push({ code: 'BAD_WEIGHT', message: 'درجة السؤال غير صالحة', subUid });
    }

    const rawHints = Array.isArray(sub.hints) ? sub.hints : [];
    const cleanHints = rawHints.map((h: any) => (typeof h === 'string' ? h.trim() : '')).filter(Boolean);
    if (cleanHints.length > 3) {
      issues.push({ code: 'TOO_MANY_HINTS', message: 'الحد الأقصى للتلميحات هو 3 تلميحات', subUid });
    }

    if (sub.target) {
      const targetVal = validateRegion(sub.target);
      if (!targetVal.valid) {
        issues.push({ code: 'BAD_REGION', message: 'المنطقة المحددة غير صالحة', subUid });
      }
    }

    if (sub.kind === 'locate') {
      const subRegions = Array.isArray(formState.regions?.[subUid]) ? formState.regions[subUid] : [];
      if (subRegions.length === 0) {
        issues.push({ code: 'NO_REGION', message: 'يرجى تحديد المنطقة المطلوبة على الرسم لهذا السؤال', subUid });
      } else {
        for (const reg of subRegions) {
          const rVal = validateRegion(reg);
          if (!rVal.valid) {
            issues.push({ code: 'BAD_REGION', message: 'المنطقة المحددة غير صالحة', subUid });
            break;
          }
        }
      }
    } else if (sub.kind === 'name' || sub.kind === 'function') {
      const rawOpts = Array.isArray(sub.options) ? sub.options : [];
      if (rawOpts.length < 3 || rawOpts.length > 4) {
        issues.push({ code: 'OPTION_COUNT', message: 'يجب أن يحتوي السؤال على 3 أو 4 خيارات', subUid });
      }

      const cleanOpts = rawOpts.map((o: any) => (typeof o === 'string' ? o.trim() : ''));
      if (cleanOpts.some((o: string) => !o)) {
        issues.push({ code: 'OPTION_EMPTY', message: 'لا يمكن ترك الخيار فارغاً', subUid });
      }

      const lowerOpts = cleanOpts.map((o: string) => o.toLowerCase());
      if (new Set(lowerOpts).size < lowerOpts.length) {
        issues.push({ code: 'OPTION_DUPLICATE', message: 'يوجد خيار مكرر في خيارات السؤال', subUid });
      }

      const cIdx = sub.correctIndex;
      if (typeof cIdx !== 'number' || !Number.isInteger(cIdx) || cIdx < 0 || cIdx >= rawOpts.length) {
        issues.push({ code: 'NO_CORRECT', message: 'يرجى تحديد الخيار الصحيح', subUid });
      }

      if (sub.kind === 'name') {
        const rawNames = Array.isArray(sub.acceptedNames) ? sub.acceptedNames : [];
        const cleanNames = rawNames.map((n: any) => (typeof n === 'string' ? n.trim() : '')).filter(Boolean);
        const uniqueNames = Array.from(new Set(cleanNames));
        if (uniqueNames.length === 0) {
          issues.push({ code: 'NO_ACCEPTED_NAME', message: 'يرجى كتابة مسمى مقبول واحد على الأقل', subUid });
        }
      }
    }
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  // 4. Construct content & key
  const diagramObj: any = assetId ? { assetId } : { url };
  if (alt) {
    diagramObj.alt = alt;
  }

  const builtSubQuestions = rawSubs.map((sub: any, idx: number) => {
    const sqId = `sq${idx + 1}`;
    const subPrompt = sub.prompt.trim();
    const marks = typeof sub.weight === 'number' && sub.weight > 0 ? sub.weight : 1;
    const cleanHints = Array.isArray(sub.hints)
      ? sub.hints.map((h: any) => (typeof h === 'string' ? h.trim() : '')).filter(Boolean)
      : [];

    const sqObj: any = {
      id: sqId,
      kind: sub.kind,
      prompt: subPrompt,
      marks,
    };

    if (cleanHints.length > 0) {
      sqObj.hints = cleanHints;
    }

    if (sub.skill) {
      sqObj.skill = sub.skill;
    }

    if (sub.target && validateRegion(sub.target).valid) {
      sqObj.target = sub.target;
    }

    if (sub.kind === 'name' || sub.kind === 'function') {
      const cleanOpts = sub.options.map((o: any) => (typeof o === 'string' ? o.trim() : ''));
      sqObj.options = cleanOpts.map((optText: string, optIdx: number) => ({
        id: `${sqId}_${String.fromCharCode(97 + optIdx)}`,
        text: optText,
      }));
    }

    return sqObj;
  });

  const content = {
    prompt: mainPrompt,
    diagram: diagramObj,
    subQuestions: builtSubQuestions,
  };

  const subAnswers: Record<string, any> = {};
  const explanations: Record<string, string> = {};

  rawSubs.forEach((sub: any, idx: number) => {
    const sqId = `sq${idx + 1}`;
    const subUid = sub.uid || sqId;

    if (sub.kind === 'locate') {
      const subRegions = Array.isArray(formState.regions?.[subUid]) ? formState.regions[subUid] : [];
      subAnswers[sqId] = {
        regions: JSON.parse(JSON.stringify(subRegions)),
      };
    } else if (sub.kind === 'name' || sub.kind === 'function') {
      const optChar = String.fromCharCode(97 + sub.correctIndex);
      const optionId = `${sqId}_${optChar}`;

      if (sub.kind === 'name') {
        const rawNames = Array.isArray(sub.acceptedNames) ? sub.acceptedNames : [];
        const cleanNames = rawNames.map((n: any) => (typeof n === 'string' ? n.trim() : '')).filter(Boolean);
        const uniqueNames = Array.from(new Set(cleanNames));
        subAnswers[sqId] = {
          optionId,
          acceptedNames: uniqueNames,
        };
      } else {
        subAnswers[sqId] = { optionId };
      }
    }

    if (typeof sub.explanation === 'string' && sub.explanation.trim()) {
      explanations[sqId] = sub.explanation.trim();
    }
  });

  const key: any = { subAnswers };
  if (Object.keys(explanations).length > 0) {
    key.explanations = explanations;
  }

  // Final validation against server schemas
  const cVal = validateQuestionContent('diagram_labeling', content);
  const kVal = validateDiagramLabelingKey(content, key);

  if (!cVal.valid || !kVal.valid) {
    return {
      ok: false,
      issues: [
        {
          code: 'SCHEMA',
          message: 'السؤال المبنّي غير مطابق لمواصفات النظام: ' + [...(cVal.errors || []), ...(kVal.errors || [])].join(', '),
        },
      ],
    };
  }

  return {
    ok: true,
    issues: [],
    content,
    key,
  };
}

/**
 * Restores form state from a stored diagram labeling question structure.
 * Robust to legacy or malformed questions.
 */
export function formStateFromQuestion(question: any): DiagramFormState {
  const row = question?.row || question || {};
  const content = row.content || {};
  const key = row.correct_answer || row.key || {};

  const mainPrompt = typeof content.prompt === 'string' ? content.prompt : '';
  const rawSubQuestions = Array.isArray(content.subQuestions) ? content.subQuestions : [];

  const totalMarks =
    typeof question?.marks === 'number'
      ? question.marks
      : typeof row.marks === 'number'
      ? row.marks
      : rawSubQuestions.reduce((sum: number, sq: any) => sum + (sq.marks || 1), 0);

  const diagram = content.diagram ? JSON.parse(JSON.stringify(content.diagram)) : {};

  const subQuestions: FormSubQuestion[] = [];
  const regions: Record<string, Region[]> = {};

  rawSubQuestions.forEach((sub: any, idx: number) => {
    const uid = sub.id || `sq${idx + 1}`;
    const kind = sub.kind || 'locate';
    const subPrompt = sub.prompt || '';
    const weight = typeof sub.marks === 'number' ? sub.marks : 1;
    const skill = sub.skill;
    const hints = Array.isArray(sub.hints) ? [...sub.hints] : [];
    const target = sub.target ? JSON.parse(JSON.stringify(sub.target)) : null;
    const explanation = key.explanations?.[sub.id] || '';

    const formSub: FormSubQuestion = {
      uid,
      kind,
      prompt: subPrompt,
      weight,
      explanation,
      hints,
      target,
    };

    if (skill) {
      formSub.skill = skill;
    }

    const subAns = key.subAnswers?.[sub.id] || {};

    if (kind === 'locate') {
      const regs = Array.isArray(subAns.regions) ? JSON.parse(JSON.stringify(subAns.regions)) : [];
      regions[uid] = regs;
    } else if (kind === 'name' || kind === 'function') {
      const rawOpts = Array.isArray(sub.options) ? sub.options : [];
      const optionTexts = rawOpts.map((o: any) => (typeof o === 'string' ? o : o.text || ''));
      formSub.options = optionTexts;

      const targetOptId = subAns.optionId;
      let correctIndex: number | null = null;
      if (targetOptId && Array.isArray(rawOpts)) {
        const foundIdx = rawOpts.findIndex((o: any) => typeof o === 'object' && o.id === targetOptId);
        if (foundIdx !== -1) {
          correctIndex = foundIdx;
        }
      }
      formSub.correctIndex = correctIndex;

      if (kind === 'name') {
        formSub.acceptedNames = Array.isArray(subAns.acceptedNames) ? [...subAns.acceptedNames] : [];
      }
    }

    subQuestions.push(formSub);
  });

  return {
    prompt: mainPrompt,
    marks: totalMarks,
    diagram,
    subQuestions,
    regions,
  };
}
