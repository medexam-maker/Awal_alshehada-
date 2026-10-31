import { QuestionType, GradingStrategy, GradingStatus } from '../../shared/constants';
import { QUESTION_TYPE_REGISTRY } from '../../shared/questionTypeRegistry';
import { matchKeywords } from '../../shared/keywordMatcher';
import {
  FillBlankContent, FillBlankAnswer,
  MatchingAnswer, ComparisonTableContent, ComparisonTableAnswer,
  OrderingAnswer, DiagramLabelingAnswer,
  ArabicGrammarContent, ArabicGrammarAnswer,
  OddOneOutAnswer, CalculationAnswer
} from '../../shared/types';

export interface GradingOutcome {
  obtainedMarks: number;
  gradingStatus: GradingStatus;
}

function normalizeText(
    text: string, 
    opts: { ignoreAl?: boolean; ignoreDiacritics?: boolean; ignoreCase?: boolean; trimWhitespace?: boolean }
): string {
    if (!text) return '';
    let norm = text;

    if (opts.trimWhitespace) {
        norm = norm.trim().replace(/\s+/g, ' ');
    }

    if (opts.ignoreCase) {
        norm = norm.toLowerCase();
    }

    if (opts.ignoreDiacritics) {
        // Strip standard Arabic diacritics (tashkeel)
        norm = norm.replace(/[\u064B-\u065F]/g, '');
    }

    if (opts.ignoreAl && norm.startsWith('ال')) {
        norm = norm.substring(2);
    }
    
    return norm;
}

export function autoGrade(
  questionType: QuestionType,
  content: unknown,
  correctAnswer: unknown,
  studentAnswer: unknown,
  maxMarks: number
): GradingOutcome {
  if (questionType === QuestionType.SHORT_ESSAY) {
    const c = (content || {}) as Record<string, any>;
    const ca = (correctAnswer || {}) as Record<string, any>;
    const studentText = typeof studentAnswer === 'string'
      ? studentAnswer
      : typeof (studentAnswer as any)?.text === 'string'
        ? (studentAnswer as any).text
        : '';

    const gradingMode = c.grading_mode || c.gradingMode || ca.grading_mode || ca.gradingMode || 'auto';
    if (gradingMode === 'manual') {
      return { obtainedMarks: 0, gradingStatus: GradingStatus.MANUAL_PENDING };
    }

    const keywords = Array.isArray(c.mandatory_keywords)
      ? c.mandatory_keywords
      : Array.isArray(c.mandatoryKeywords)
        ? c.mandatoryKeywords
        : Array.isArray(ca.mandatory_keywords)
          ? ca.mandatory_keywords
          : Array.isArray(ca.mandatoryKeywords)
            ? ca.mandatoryKeywords
            : [];

    const threshold = Number(c.partial_threshold ?? c.partialThreshold ?? ca.partial_threshold ?? ca.partialThreshold ?? 0.5);

    const evalRes = matchKeywords(studentText, keywords, maxMarks, threshold);

    return {
      obtainedMarks: evalRes.score,
      gradingStatus: GradingStatus.AUTO_GRADED,
    };
  }

  const registryEntry = QUESTION_TYPE_REGISTRY[questionType];
  
  if (registryEntry.grading === GradingStrategy.MANUAL) {
    return { obtainedMarks: 0, gradingStatus: GradingStatus.MANUAL_PENDING };
  }
  if (registryEntry.grading === GradingStrategy.MIXED) {
    return { obtainedMarks: 0, gradingStatus: GradingStatus.MIXED };
  }

  let isCorrect = false;
  let obtainedMarks = 0;

  if (questionType === QuestionType.TRUE_FALSE) {
    // Canonical True/False answer shape is { value: boolean }
    // Backward compatibility: Historical snapshots or alternative student clients may contain bare boolean (true/false)
    const caObj = correctAnswer !== null && typeof correctAnswer === 'object'
      ? (correctAnswer as { value?: unknown })
      : undefined;
    const caVal = typeof caObj?.value === 'boolean'
      ? caObj.value
      : typeof correctAnswer === 'boolean'
        ? correctAnswer
        : undefined;

    const saObj = studentAnswer !== null && typeof studentAnswer === 'object'
      ? (studentAnswer as { value?: unknown })
      : undefined;
    const saVal = typeof saObj?.value === 'boolean'
      ? saObj.value
      : typeof studentAnswer === 'boolean'
        ? studentAnswer
        : undefined;

    isCorrect = typeof caVal === 'boolean' && typeof saVal === 'boolean' && caVal === saVal;
    obtainedMarks = isCorrect ? maxMarks : 0;
  } else if (questionType === QuestionType.MULTIPLE_CHOICE) {
    const ca = correctAnswer as { selectedOptionId?: string } | string | undefined;
    const sa = studentAnswer as { selectedOptionId?: string } | undefined;
    const correctId =
      typeof ca === 'object' && ca !== null
        ? ca.selectedOptionId
        : typeof ca === 'string'
          ? ca
          : undefined;
    const studentId =
      typeof sa === 'object' && sa !== null && typeof sa.selectedOptionId === 'string'
        ? sa.selectedOptionId
        : undefined;

    // Approved Decision 3: Deterministic exact ID matching only.
    // Do not use substring matching, fuzzy matching, or object-to-string coercion.
    isCorrect = Boolean(
      correctId &&
      studentId &&
      typeof correctId === 'string' &&
      typeof studentId === 'string' &&
      correctId.length > 0 &&
      correctId === studentId
    );
    obtainedMarks = isCorrect ? maxMarks : 0;
  } else if (questionType === QuestionType.MATCHING) {
    const c = (content || {}) as Record<string, any>;
    const ca = (correctAnswer || {}) as Record<string, any>;
    const sa = studentAnswer as { connections?: Record<string, string>; pairs?: Record<string, string> } | undefined;
    const connections = sa?.connections || sa?.pairs || {};

    const pairs = Array.isArray(c.pairs) ? c.pairs : [];
    const scoringType = c.scoring_type || 'partial';
    const totalPairs = pairs.length;

    if (totalPairs === 0) {
      obtainedMarks = 0;
    } else {
      const targetLookup = new Map<string, { originalId: string | null; targetText: string; isDistractor: boolean }>();

      if (Array.isArray(c.shuffledTargets)) {
        for (const t of c.shuffledTargets) {
          if (t && typeof t === 'object') {
            targetLookup.set(String(t.id), {
              originalId: t.originalId ? String(t.originalId) : null,
              targetText: String(t.text || ''),
              isDistractor: Boolean(t.isDistractor),
            });
          }
        }
      }

      for (const p of pairs) {
        if (p && p.id) {
          const pId = String(p.id);
          targetLookup.set(`target_${pId}`, { originalId: pId, targetText: String(p.target || ''), isDistractor: false });
          targetLookup.set(pId, { originalId: pId, targetText: String(p.target || ''), isDistractor: false });
        }
      }

      if (Array.isArray(c.distractors)) {
        for (const d of c.distractors) {
          if (d && d.id) {
            const dId = String(d.id);
            targetLookup.set(`target_${dId}`, { originalId: null, targetText: String(d.target || ''), isDistractor: true });
            targetLookup.set(dId, { originalId: null, targetText: String(d.target || ''), isDistractor: true });
          }
        }
      }

      const caPairs = ca?.pairs || {};
      let correctCount = 0;
      const connectedEntries = Object.entries(connections).filter(([_, targetVal]) => Boolean(targetVal));

      for (const [sourceId, targetVal] of connectedEntries) {
        const targetStr = String(targetVal);
        const targetInfo = targetLookup.get(targetStr);
        const pairObj = pairs.find((p: any) => String(p.id) === String(sourceId));

        let isMatch = false;

        if (caPairs[sourceId] && caPairs[sourceId] === targetStr) {
          isMatch = true;
        } else if (targetInfo && !targetInfo.isDistractor && targetInfo.originalId === String(sourceId)) {
          isMatch = true;
        } else if (pairObj && targetInfo && !targetInfo.isDistractor && targetInfo.targetText.trim() === String(pairObj.target || '').trim()) {
          isMatch = true;
        } else if (pairObj && targetStr.trim() === String(pairObj.target || '').trim()) {
          isMatch = true;
        }

        if (isMatch) {
          correctCount++;
        }
      }

      if (scoringType === 'all_or_nothing') {
        const isPerfect = correctCount === totalPairs && connectedEntries.length === totalPairs;
        obtainedMarks = isPerfect ? maxMarks : 0;
      } else {
        obtainedMarks = (correctCount / totalPairs) * maxMarks;
      }
    }
  } else if (questionType === QuestionType.FILL_BLANK) {
    const c = (content || {}) as FillBlankContent;
    const ca = (correctAnswer || {}) as any;
    const sa = studentAnswer as FillBlankAnswer | undefined;
    
    const userNorm = c.normalization || {};
    const normOpts = { 
        ignoreAl: Boolean(userNorm.ignoreAl), 
        ignoreDiacritics: true, 
        ignoreCase: true, 
        trimWhitespace: true 
    };

    // Determine list of blanks from content.blanks, or fallback to ca/sa keys
    let blankList: Array<{ id: string; correctValue?: string }> = [];
    if (c.blanks && Array.isArray(c.blanks) && c.blanks.length > 0) {
      blankList = c.blanks;
    } else {
      const caBlanks = ca.blanks || ca.answers || (typeof ca === 'object' && !ca.answers && !ca.blanks ? ca : {});
      const keys = new Set([
        ...Object.keys(caBlanks || {}),
        ...Object.keys(sa?.answers || {}),
        ...Object.keys(sa?.blanks || {}),
      ]);
      blankList = Array.from(keys).map((k) => ({
        id: k,
        correctValue: caBlanks[k],
      }));
    }

    const totalUnits = blankList.length;
    let correctUnits = 0;

    const studentAnswers = sa?.answers || sa?.blanks || {};
    const selfEvals = sa?.selfEvaluations;

    for (const blank of blankList) {
      const bId = blank.id;
      // In Weekly Simulation mode: self-assessment takes precedence if evaluated
      if (selfEvals && typeof selfEvals[bId] === 'boolean') {
        if (selfEvals[bId] === true) {
          correctUnits++;
        }
      } else {
        // Deterministic mode (Training / Historical exams):
        const saRaw = studentAnswers[bId] || '';
        const caRaw = blank.correctValue || ca?.blanks?.[bId] || ca?.answers?.[bId] || ca?.[bId] || '';
        const saVal = normalizeText(saRaw, normOpts);
        const caVal = normalizeText(caRaw, normOpts);
        if (saVal && saVal === caVal) {
          correctUnits++;
        }
      }
    }

    obtainedMarks = totalUnits > 0 ? (correctUnits / totalUnits) * maxMarks : 0;
  } else if (questionType === QuestionType.COMPARISON_TABLE) {
    const c = content as ComparisonTableContent;
    const sa = studentAnswer as ComparisonTableAnswer | undefined;
    let totalUnits = 0;
    let correctUnits = 0;
    for (const row of c.rows || []) {
        for (const cell of row.cells || []) {
            if (cell.value === null) {
                totalUnits++;
                if (sa?.cells && sa.cells[cell.id]) {
                    const saVal = normalizeText(sa.cells[cell.id], { trimWhitespace: true });
                    const caVal = normalizeText(cell.correctValue || '', { trimWhitespace: true });
                    if (saVal && saVal === caVal) correctUnits++;
                }
            }
        }
    }
    obtainedMarks = totalUnits > 0 ? (correctUnits / totalUnits) * maxMarks : 0;
  } else if (questionType === QuestionType.ORDERING) {
    const c = (content || {}) as Record<string, any>;
    const ca = (correctAnswer || {}) as Record<string, any>;
    const sa = (studentAnswer || {}) as Record<string, any>;

    let expectedOrder: string[] = [];
    if (Array.isArray(ca.orderedIds)) {
      expectedOrder = ca.orderedIds.map(String);
    } else if (Array.isArray(ca.correctOrder)) {
      expectedOrder = ca.correctOrder.map(String);
    } else if (Array.isArray(c.correctOrder)) {
      expectedOrder = c.correctOrder.map(String);
    } else if (ca.order && typeof ca.order === 'object') {
      const entries = Object.entries(ca.order as Record<string, number>);
      entries.sort((a, b) => Number(a[1]) - Number(b[1]));
      expectedOrder = entries.map(([id]) => id);
    } else if (Array.isArray(c.items)) {
      expectedOrder = c.items.map((it: any) => String(it.id));
    }

    let studentOrder: string[] = [];
    if (Array.isArray(sa.orderedIds)) {
      studentOrder = sa.orderedIds.map(String);
    } else if (Array.isArray(sa.order)) {
      studentOrder = sa.order.map(String);
    } else if (Array.isArray(studentAnswer)) {
      studentOrder = (studentAnswer as any[]).map(String);
    } else if (sa.order && typeof sa.order === 'object') {
      const entries = Object.entries(sa.order as Record<string, number>);
      entries.sort((a, b) => Number(a[1]) - Number(b[1]));
      studentOrder = entries.map(([id]) => id);
    }

    const totalUnits = expectedOrder.length;
    let correctUnits = 0;
    if (totalUnits > 0) {
      for (let i = 0; i < totalUnits; i++) {
        if (studentOrder[i] && studentOrder[i] === expectedOrder[i]) {
          correctUnits++;
        }
      }
    }

    obtainedMarks = totalUnits > 0 ? (correctUnits / totalUnits) * maxMarks : 0;
  } else if (questionType === QuestionType.DIAGRAM_LABELING) {
    const ca = correctAnswer as DiagramLabelingAnswer;
    const sa = studentAnswer as DiagramLabelingAnswer | undefined;
    const labels = Object.keys(ca.labels || {});
    const totalUnits = labels.length;
    let correctUnits = 0;
    if (sa?.labels) {
        for (const key of labels) {
            if (sa.labels[key] === ca.labels[key]) correctUnits++;
        }
    }
    obtainedMarks = totalUnits > 0 ? (correctUnits / totalUnits) * maxMarks : 0;
  } else if (questionType === QuestionType.ARABIC_GRAMMAR) {
    const c = content as ArabicGrammarContent;
    const ca = correctAnswer as ArabicGrammarAnswer;
    const sa = studentAnswer as ArabicGrammarAnswer | undefined;
    let totalUnits = 0;
    let correctUnits = 0;
    for (const word of c.words || []) {
        const caWord = ca.words?.[word.id];
        const saWord = sa?.words?.[word.id];
        if (c.mode === 'irab' && caWord?.irab) {
            totalUnits++;
            if (saWord?.irab && saWord.irab === caWord.irab) correctUnits++;
        } else if (c.mode === 'tashkeel' && caWord?.tashkeel) {
            totalUnits++;
            if (saWord?.tashkeel && saWord.tashkeel === caWord.tashkeel) correctUnits++;
        }
    }
    obtainedMarks = totalUnits > 0 ? (correctUnits / totalUnits) * maxMarks : 0;
  } else if (questionType === QuestionType.ODD_ONE_OUT) {
    const ca = correctAnswer as OddOneOutAnswer;
    const sa = studentAnswer as OddOneOutAnswer | undefined;
    const caIds = (ca?.selectedItemIds || []).slice().sort();
    const saIds = (sa?.selectedItemIds || []).slice().sort();
    isCorrect = caIds.length > 0 &&
                caIds.length === saIds.length &&
                caIds.every((id, idx) => id === saIds[idx]);
    obtainedMarks = isCorrect ? maxMarks : 0;
  } else if (questionType === QuestionType.CALCULATION) {
    const c = (content || {}) as Record<string, unknown>;
    const caRaw = correctAnswer as Record<string, unknown> | undefined;
    const saRaw = studentAnswer as Record<string, unknown> | undefined;

    // Check if this is a Multi-Step MCQ Calculation (Pattern 7)
    if (
      c.mode === 'multi_step_mcq' ||
      Array.isArray(c.steps) ||
      (caRaw && 'step_answers' in caRaw) ||
      (saRaw && 'step_answers' in saRaw)
    ) {
      const multiResult = gradeMultiStepCalculation(c, caRaw || {}, saRaw || {}, maxMarks);
      isCorrect = multiResult.isCorrect;
      obtainedMarks = multiResult.obtainedMarks;
    } else {
      // Legacy numeric_with_work calculation
      const ca = correctAnswer as { value?: number | string; tolerance?: number } | undefined;
      const sa = studentAnswer as { value?: number | string; tolerance?: number } | undefined;
      if (ca?.value !== undefined && sa?.value !== undefined) {
        const numCa = typeof ca.value === 'number' ? ca.value : parseFloat(String(ca.value));
        const numSa = typeof sa.value === 'number' ? sa.value : parseFloat(String(sa.value));
        const tolerance = typeof ca.tolerance === 'number' ? ca.tolerance : (ca.tolerance ? parseFloat(String(ca.tolerance)) : 0);
        if (!isNaN(numCa) && !isNaN(numSa)) {
          isCorrect = Math.abs(numSa - numCa) <= tolerance;
        } else {
          const normCa = normalizeText(String(ca.value), { trimWhitespace: true, ignoreCase: true });
          const normSa = normalizeText(String(sa.value), { trimWhitespace: true, ignoreCase: true });
          isCorrect = Boolean(normCa && normCa === normSa);
        }
      }
      obtainedMarks = isCorrect ? maxMarks : 0;
    }
  } else if (questionType === QuestionType.EXPLAIN) {
    const c = (content || {}) as Record<string, unknown>;
    const ca = (correctAnswer || {}) as Record<string, unknown>;
    const sa = studentAnswer as Record<string, unknown> | string[] | undefined;

    const correctSeqRaw = ca?.correctSequence || c?.correctSequence || ca?.sequence || ca?.words || c?.words;
    const correctSeq: string[] = Array.isArray(correctSeqRaw) ? correctSeqRaw.map(s => String(s)) : [];

    let studentSeq: string[] = [];
    if (Array.isArray(sa)) {
      studentSeq = sa.map(s => String(s));
    } else if (sa && typeof sa === 'object') {
      const saRaw = sa.words || sa.sequence;
      if (Array.isArray(saRaw)) {
        studentSeq = saRaw.map(s => String(s));
      } else if (typeof sa.text === 'string' && sa.text) {
        studentSeq = sa.text.trim().split(/\s+/);
      }
    }

    if (correctSeq.length > 0) {
      if (studentSeq.length === correctSeq.length) {
        isCorrect = correctSeq.every((word, idx) =>
          normalizeText(word, { trimWhitespace: true, ignoreDiacritics: true }) ===
          normalizeText(studentSeq[idx] || '', { trimWhitespace: true, ignoreDiacritics: true })
        );
      } else {
        isCorrect = false;
      }
      obtainedMarks = isCorrect ? maxMarks : 0;
    } else {
      return { obtainedMarks: 0, gradingStatus: GradingStatus.MANUAL_PENDING };
    }
  } else {
      // Fallback for unhandled types without explicit stringify, to avoid unintended assumptions.
      obtainedMarks = 0;
  }

  obtainedMarks = Math.max(0, Math.min(obtainedMarks, maxMarks));

  return {
    obtainedMarks,
    gradingStatus: GradingStatus.AUTO_GRADED
  };
}

export interface StepGradingResult {
  stepId: string;
  isCorrect: boolean;
  awardedMarks: number;
  maxMarks: number;
  matchedRuleId?: string;
  isConditionalCredit: boolean;
}

export interface MultiStepGradingOutcome {
  isCorrect: boolean;
  obtainedMarks: number;
  maxMarks: number;
  stepResults: StepGradingResult[];
}

/**
 * Autogrades a full Multi-Step MCQ Calculation question (Pattern 7) deterministically.
 */
export function gradeMultiStepCalculation(
  content: Record<string, unknown>,
  correctAnswer: Record<string, unknown>,
  studentAnswer: Record<string, unknown>,
  totalMaxMarks: number
): MultiStepGradingOutcome {
  const steps = Array.isArray(content.steps) ? (content.steps as any[]) : [];
  const stepAnswersMap = (correctAnswer.step_answers || {}) as Record<string, { canonical_option_id?: string; marks?: number }>;
  const conditionalRules = Array.isArray(correctAnswer.conditional_credit_rules)
    ? (correctAnswer.conditional_credit_rules as any[])
    : [];

  const rawStudentAnswers = (studentAnswer.step_answers || studentAnswer) as Record<string, unknown>;
  const studentChoices: Record<string, string> = {};
  if (rawStudentAnswers && typeof rawStudentAnswers === 'object') {
    for (const [k, v] of Object.entries(rawStudentAnswers)) {
      if (typeof v === 'string') {
        studentChoices[k] = v;
      }
    }
  }

  let totalObtained = 0;
  const stepResults: StepGradingResult[] = [];

  for (const step of steps) {
    const stepId = String(step.id || '');
    const stepMaxMarks = typeof step.marks === 'number' && step.marks > 0
      ? step.marks
      : (steps.length > 0 ? totalMaxMarks / steps.length : 0);

    const studentChoice = studentChoices[stepId];
    const canonicalConfig = stepAnswersMap[stepId];
    const canonicalOptionId = canonicalConfig?.canonical_option_id;

    if (!studentChoice) {
      stepResults.push({
        stepId,
        isCorrect: false,
        awardedMarks: 0,
        maxMarks: stepMaxMarks,
        isConditionalCredit: false
      });
      continue;
    }

    // 1. Canonical Answer Precedence: Full Marks immediately
    if (canonicalOptionId && studentChoice === canonicalOptionId) {
      totalObtained += stepMaxMarks;
      stepResults.push({
        stepId,
        isCorrect: true,
        awardedMarks: stepMaxMarks,
        maxMarks: stepMaxMarks,
        isConditionalCredit: false
      });
      continue;
    }

    // 2. Conditional Credit Rules Evaluation
    // Find matching rules for this step and selected option
    const matchingRules = conditionalRules.filter((rule) => {
      if (rule.target_step_id !== stepId) return false;
      if (rule.awarded_option_id !== studentChoice) return false;

      // Check prerequisite step condition in student answers
      const prereqStepId = rule.prerequisite_step_id;
      const prereqOptionId = rule.prerequisite_option_id;
      return studentChoices[prereqStepId] === prereqOptionId;
    });

    if (matchingRules.length > 0) {
      // Deterministic Resolution Rule: Highest Credit Fraction Wins (No stacking)
      let bestRule = matchingRules[0];
      for (let i = 1; i < matchingRules.length; i++) {
        const currentFraction = Number(matchingRules[i].credit_fraction) || 0;
        const bestFraction = Number(bestRule.credit_fraction) || 0;
        if (currentFraction > bestFraction) {
          bestRule = matchingRules[i];
        }
      }

      const fraction = Math.min(1.0, Math.max(0.0, Number(bestRule.credit_fraction) || 0));
      const stepAwarded = Math.min(stepMaxMarks, Math.round(fraction * stepMaxMarks * 100) / 100);
      totalObtained += stepAwarded;

      stepResults.push({
        stepId,
        isCorrect: fraction === 1.0,
        awardedMarks: stepAwarded,
        maxMarks: stepMaxMarks,
        matchedRuleId: bestRule.rule_id,
        isConditionalCredit: true
      });
    } else {
      // Zero marks if no canonical or conditional match
      stepResults.push({
        stepId,
        isCorrect: false,
        awardedMarks: 0,
        maxMarks: stepMaxMarks,
        isConditionalCredit: false
      });
    }
  }

  const roundedTotal = Math.min(totalMaxMarks, Math.round(totalObtained * 100) / 100);
  const isAllCorrect = stepResults.length > 0 && stepResults.every((s) => s.isCorrect && s.awardedMarks === s.maxMarks);

  return {
    isCorrect: isAllCorrect,
    obtainedMarks: roundedTotal,
    maxMarks: totalMaxMarks,
    stepResults
  };
}

/**
 * Grades a single step commitment in Connected Training mode.
 */
export function gradeSingleStepCommitment(
  stepId: string,
  selectedOptionId: string,
  questionSnapshot: Record<string, any>,
  committedPreviousStepAnswers: Record<string, string>
): { isCorrect: boolean; awardedMarks: number; stepMaxMarks: number; matchedRuleId?: string; canonicalOptionId?: string | null } {
  const content = questionSnapshot.content || {};
  const correctAnswer = questionSnapshot.correct_answer || {};
  const steps = Array.isArray(content.steps) ? content.steps : [];
  const targetStep = steps.find((s: any) => s.id === stepId);

  const stepMaxMarks = targetStep && typeof targetStep.marks === 'number' && targetStep.marks > 0
    ? targetStep.marks
    : 1;

  const stepAnswersMap = correctAnswer.step_answers || {};
  const canonicalConfig = stepAnswersMap[stepId];
  const canonicalOptionId = canonicalConfig?.canonical_option_id;

  // 1. Canonical match
  if (canonicalOptionId && selectedOptionId === canonicalOptionId) {
    return {
      isCorrect: true,
      awardedMarks: stepMaxMarks,
      stepMaxMarks,
      canonicalOptionId
    };
  }

  // 2. Conditional credit match
  const conditionalRules = Array.isArray(correctAnswer.conditional_credit_rules)
    ? correctAnswer.conditional_credit_rules
    : [];

  const matchingRules = conditionalRules.filter((rule: any) => {
    if (rule.target_step_id !== stepId) return false;
    if (rule.awarded_option_id !== selectedOptionId) return false;
    const prereqStepId = rule.prerequisite_step_id;
    const prereqOptionId = rule.prerequisite_option_id;
    return committedPreviousStepAnswers[prereqStepId] === prereqOptionId;
  });

  if (matchingRules.length > 0) {
    let bestRule = matchingRules[0];
    for (let i = 1; i < matchingRules.length; i++) {
      if ((Number(matchingRules[i].credit_fraction) || 0) > (Number(bestRule.credit_fraction) || 0)) {
        bestRule = matchingRules[i];
      }
    }
    const fraction = Math.min(1.0, Math.max(0.0, Number(bestRule.credit_fraction) || 0));
    const awarded = Math.min(stepMaxMarks, Math.round(fraction * stepMaxMarks * 100) / 100);
    return {
      isCorrect: fraction === 1.0,
      awardedMarks: awarded,
      stepMaxMarks,
      canonicalOptionId,
      matchedRuleId: bestRule.rule_id
    };
  }

  return {
    isCorrect: false,
    awardedMarks: 0,
    stepMaxMarks,
    canonicalOptionId
  };
}
