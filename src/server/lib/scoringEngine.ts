import { QuestionType, GradingStrategy, GradingStatus } from '../../shared/constants';
import { QUESTION_TYPE_REGISTRY } from '../../shared/questionTypeRegistry';
import { matchKeywords, normalizeArabicText, tokenMatchesWord } from '../../shared/keywordMatcher';
import { pointInRegion } from '../../shared/regionGeometry';
import {
  FillBlankContent, FillBlankAnswer,
  MatchingAnswer, ComparisonTableContent, ComparisonTableAnswer,
  OrderingAnswer, DiagramLabelingAnswer,
  ArabicGrammarContent, ArabicGrammarAnswer,
  OddOneOutAnswer, CalculationAnswer,
  ReadingComprehensionContent, ReadingComprehensionAnswer, ReadingSkillLevel
} from '../../shared/types';

export interface GradingOutcome {
  obtainedMarks: number;
  gradingStatus: GradingStatus;
  components?: any;
  skillMastery?: any;
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

  if (questionType === QuestionType.CONTOUR_MAP) {
    const c = (content || {}) as Record<string, any>;
    const ca = (correctAnswer || {}) as Record<string, any>;
    const sa = (studentAnswer || {}) as Record<string, any>;

    const contourResult = gradeContourMapQuestion(c, ca, sa, maxMarks);
    return {
      obtainedMarks: contourResult.obtainedMarks,
      gradingStatus: GradingStatus.AUTO_GRADED,
    };
  }

  if (questionType === QuestionType.READING_COMPREHENSION) {
    const readingResult = gradeReadingComprehension(content, correctAnswer, studentAnswer, maxMarks);
    return {
      obtainedMarks: readingResult.obtainedMarks,
      gradingStatus: GradingStatus.AUTO_GRADED,
      components: readingResult.subResults,
      skillMastery: readingResult.skillMastery,
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
    const c = (content || {}) as ComparisonTableContent;
    const ca = (correctAnswer || {}) as any;
    const sa = (studentAnswer || {}) as ComparisonTableAnswer | undefined;
    let totalUnits = 0;
    let correctUnits = 0;

    for (const row of c.rows || []) {
      for (const cell of row.cells || []) {
        // Only interactive cells (cell.value === null) are graded.
        // Prefilled (non-interactive) cells (cell.value !== null) are excluded from total.
        if (cell.value === null) {
          totalUnits++;
          const saVal = sa?.cells ? sa.cells[cell.id] : undefined;
          if (saVal !== undefined && saVal !== null && saVal !== '') {
            if (Array.isArray(cell.options) && cell.options.length > 0) {
              const firstOpt = cell.options[0];
              const isObjectOptions = typeof firstOpt === 'object' && firstOpt !== null && 'id' in firstOpt;
              if (isObjectOptions) {
                // Must be an option ID belonging specifically to this cell
                const allowedIds = new Set((cell.options as any[]).map((o: any) => String(o.id)));
                if (allowedIds.has(String(saVal))) {
                  const expectedId = String(ca.cells?.[cell.id] ?? (cell as any).correctOptionId ?? cell.correctValue ?? '');
                  if (expectedId && String(saVal) === expectedId) {
                    correctUnits++;
                  }
                }
              } else {
                // Legacy string options
                const normSa = normalizeText(String(saVal), { trimWhitespace: true });
                const normCa = normalizeText(String(cell.correctValue || ca.cells?.[cell.id] || ''), { trimWhitespace: true });
                if (normCa && normSa === normCa) {
                  correctUnits++;
                }
              }
            } else {
              // Legacy cell without options
              const normSa = normalizeText(String(saVal), { trimWhitespace: true });
              const normCa = normalizeText(String(cell.correctValue || ca.cells?.[cell.id] || ''), { trimWhitespace: true });
              if (normCa && normSa === normCa) {
                correctUnits++;
              }
            }
          }
        }
      }
    }

    obtainedMarks = totalUnits > 0 ? (correctUnits / totalUnits) * maxMarks : 0;
    isCorrect = totalUnits > 0 && correctUnits === totalUnits;
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
    const c = (content || {}) as Record<string, any>;
    if (Array.isArray(c.subQuestions) && c.subQuestions.length > 0) {
      const diagResult = gradeDiagramLabeling(content, correctAnswer, studentAnswer, maxMarks);
      obtainedMarks = diagResult.obtainedMarks;
      return {
        obtainedMarks,
        gradingStatus: GradingStatus.AUTO_GRADED,
        components: diagResult.components,
      };
    } else {
      const ca = correctAnswer as DiagramLabelingAnswer;
      const sa = studentAnswer as DiagramLabelingAnswer | undefined;
      const labels = Object.keys(ca?.labels || {});
      const totalUnits = labels.length;
      let correctUnits = 0;
      if (sa?.labels) {
          for (const key of labels) {
              if (sa.labels[key] === ca.labels[key]) correctUnits++;
          }
      }
      obtainedMarks = totalUnits > 0 ? (correctUnits / totalUnits) * maxMarks : 0;
    }
  } else if (questionType === QuestionType.ARABIC_GRAMMAR) {
    const c = content as ArabicGrammarContent;
    const ca = (correctAnswer || {}) as ArabicGrammarAnswer & Record<string, string>;
    const sa = (studentAnswer || {}) as ArabicGrammarAnswer & Record<string, string>;

    if (Array.isArray(c.components) && c.components.length > 0) {
      // C1 Component-based Adaptive Grammar Lab scoring
      const caComponents = ca.components || (ca as Record<string, string>);
      const saComponents = sa.components || (sa as Record<string, string>);

      let totalComponentPoints = 0;
      let earnedComponentPoints = 0;

      for (const comp of c.components) {
        const compPoints = typeof comp.points === 'number' && comp.points >= 0 ? comp.points : 1;
        totalComponentPoints += compPoints;

        const correctChoiceId = caComponents?.[comp.id];
        const studentChoiceId = saComponents?.[comp.id];

        // Choice validation: Student choice must exist in comp.choices to be eligible for points
        const isChoiceValid = Array.isArray(comp.choices) && comp.choices.some((ch) => ch.id === studentChoiceId);

        if (
          isChoiceValid &&
          correctChoiceId !== undefined &&
          studentChoiceId !== undefined &&
          String(correctChoiceId) === String(studentChoiceId)
        ) {
          earnedComponentPoints += compPoints;
        }
      }

      if (totalComponentPoints > 0) {
        obtainedMarks = (earnedComponentPoints / totalComponentPoints) * maxMarks;
      } else {
        obtainedMarks = 0;
      }
    } else {
      // Legacy irab / tashkeel word-based scoring
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
    }
  } else if (questionType === QuestionType.ODD_ONE_OUT) {
    const c = (content || {}) as any;
    const ca = (correctAnswer || {}) as any;
    const sa = (studentAnswer || {}) as any;

    const caIds = (ca?.selectedItemIds || (ca?.selectedItem ? [ca.selectedItem] : [])).map(String).sort();
    const saIds = (sa?.selectedItemIds || (sa?.selectedItem ? [sa.selectedItem] : [])).map(String).sort();

    const stage1Correct = caIds.length > 0 &&
                          caIds.length === saIds.length &&
                          caIds.every((id: string, idx: number) => id === saIds[idx]);

    const hasReasoning = Boolean(c?.reasoning || ca?.reasoning);

    if (!hasReasoning) {
      isCorrect = stage1Correct;
      obtainedMarks = isCorrect ? maxMarks : 0;
    } else {
      if (!stage1Correct) {
        // Wrong odd item => 0 even with perfect text or choice
        isCorrect = false;
        obtainedMarks = 0;
      } else {
        const marksFraction = typeof c.reasoning?.marksFraction === 'number'
          ? c.reasoning.marksFraction
          : 0.5;
        const stage1Marks = maxMarks * (1 - marksFraction);

        let reasonCorrect = false;
        if (sa?.reasonChoiceId) {
          const correctChoiceId = ca.reasoning?.correctChoiceId;
          if (correctChoiceId && sa.reasonChoiceId === correctChoiceId) {
            reasonCorrect = true;
          }
        } else if (typeof sa?.reasonText === 'string' && sa.reasonText.trim().length > 0) {
          const keywordGroups: string[][] = Array.isArray(ca.reasoning?.keywordGroups)
            ? ca.reasoning.keywordGroups
            : [];
          const minGroups = typeof ca.reasoning?.minGroups === 'number'
            ? ca.reasoning.minGroups
            : Math.min(2, keywordGroups.length);

          let matchedGroupsCount = 0;
          const normUserText = normalizeArabicText(sa.reasonText);
          const userTokens = normUserText.split(/\s+/).filter(Boolean);

          for (const group of keywordGroups) {
            if (!Array.isArray(group) || group.length === 0) continue;
            const groupMatched = group.some((kw) => {
              if (typeof kw !== 'string' || !kw.trim()) return false;
              const normKw = normalizeArabicText(kw);
              if (!normKw) return false;
              const kwWords = normKw.split(/\s+/).filter(Boolean);
              if (kwWords.length === 0) return false;
              return kwWords.every((kwWord) =>
                userTokens.some((uToken) => tokenMatchesWord(uToken, kwWord))
              );
            });
            if (groupMatched) {
              matchedGroupsCount++;
            }
          }

          if (matchedGroupsCount >= minGroups) {
            reasonCorrect = true;
          }
        }

        if (reasonCorrect) {
          obtainedMarks = maxMarks;
          isCorrect = true;
        } else {
          obtainedMarks = stage1Marks;
          isCorrect = false;
        }
        obtainedMarks = Math.max(0, Math.min(maxMarks, obtainedMarks));
      }
    }
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

    // select_reason_from_list: ID-to-ID selection, proportional credit, wrong picks cancel right picks
    if (Array.isArray(c.reasonOptions) && c.reasonOptions.length > 0) {
      const correctIds = new Set<string>(
        (Array.isArray(ca.selectedReasonIds) ? ca.selectedReasonIds : []).map((x: unknown) => String(x))
      );
      if (correctIds.size === 0) {
        return { obtainedMarks: 0, gradingStatus: GradingStatus.MANUAL_PENDING };
      }
      const saObj = (studentAnswer && typeof studentAnswer === 'object') ? (studentAnswer as Record<string, unknown>) : {};
      const picked = new Set<string>(
        (Array.isArray(saObj.selectedReasonIds) ? saObj.selectedReasonIds : []).map((x: unknown) => String(x))
      );
      let right = 0;
      let wrong = 0;
      picked.forEach((id) => (correctIds.has(id) ? right++ : wrong++));
      const ratio = Math.max(0, right - wrong) / correctIds.size;
      obtainedMarks = Math.min(1, ratio) * maxMarks;
      obtainedMarks = Math.max(0, Math.min(obtainedMarks, maxMarks));
      return { obtainedMarks, gradingStatus: GradingStatus.AUTO_GRADED };
    }
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

    const flattenWords = (list: string[]): string[] => {
      const result: string[] = [];
      for (const item of list) {
        if (typeof item === 'string') {
          const parts = item.trim().split(/\s+/).filter(Boolean);
          result.push(...parts);
        }
      }
      return result;
    };

    const flatCorrect = flattenWords(correctSeq);
    const flatStudent = flattenWords(studentSeq);

    if (flatCorrect.length > 0) {
      if (flatStudent.length === flatCorrect.length) {
        isCorrect = flatCorrect.every((word, idx) =>
          normalizeText(word, { trimWhitespace: true, ignoreDiacritics: true }) ===
          normalizeText(flatStudent[idx] || '', { trimWhitespace: true, ignoreDiacritics: true })
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

// ==========================================
// PATTERN 11: CONTOUR MAP AUTOGRADING ENGINE
// ==========================================

export interface ContourSubResult {
  subQId: string;
  studentAnswer: any;
  correctAnswer: any;
  isCorrect: boolean;
  earnedFraction: number;
  explanation?: string;
}

export interface ContourMapGradingOutcome {
  isCorrect: boolean;
  obtainedMarks: number;
  maxMarks: number;
  subResults: ContourSubResult[];
}

export function normalizeArabicContourText(text: string): string {
  if (!text) return '';
  let norm = String(text).trim();
  // Strip diacritics
  norm = norm.replace(/[\u064B-\u065F]/g, '');
  // Unify Arabic letters: أ/إ/آ -> ا, ة -> ه, ى -> ي, ؤ -> و, ئ -> ي
  norm = norm
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
  // Strip common directional prefix filler
  norm = norm.replace(/(^|\s+)(من|الي|إلي|نحو|باتجاه|اتجاه)(\s+|$)/g, ' ');
  // Strip leading definite article 'ال' at word boundaries
  norm = norm.replace(/(^|\s+)ال/g, '$1');
  // Compress whitespace
  norm = norm.replace(/\s+/g, ' ').trim().toLowerCase();
  return norm;
}

const EIGHT_DIRECTIONS = [
  'شمال شرقي',
  'شمال غربي',
  'جنوب شرقي',
  'جنوب غربي',
  'شمال',
  'جنوب',
  'شرق',
  'غرب'
];

/**
 * Checks if a 2D point [x, y] is inside a polygon [[x,y], [x,y], ...]
 */
function isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  if (!Array.isArray(vs) || vs.length < 3) return false;
  const x = point[0];
  const y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates Intersection over Union (IoU) of two polygons via bounding grid sampling.
 */
export function calculatePolygonIoU(polyA: [number, number][], polyB: [number, number][]): number {
  if (!Array.isArray(polyA) || polyA.length < 3 || !Array.isArray(polyB) || polyB.length < 3) {
    return 0;
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pt of [...polyA, ...polyB]) {
    if (Array.isArray(pt) && pt.length >= 2) {
      if (pt[0] < minX) minX = pt[0];
      if (pt[0] > maxX) maxX = pt[0];
      if (pt[1] < minY) minY = pt[1];
      if (pt[1] > maxY) maxY = pt[1];
    }
  }

  if (minX >= maxX || minY >= maxY) return 0;

  const steps = 30; // 30x30 = 900 points sampling
  const stepX = (maxX - minX) / steps;
  const stepY = (maxY - minY) / steps;

  let inA = 0;
  let inB = 0;
  let inBoth = 0;

  for (let i = 0; i <= steps; i++) {
    const px = minX + i * stepX;
    for (let j = 0; j <= steps; j++) {
      const py = minY + j * stepY;
      const pt: [number, number] = [px, py];
      const insideA = isPointInPolygon(pt, polyA);
      const insideB = isPointInPolygon(pt, polyB);

      if (insideA) inA++;
      if (insideB) inB++;
      if (insideA && insideB) inBoth++;
    }
  }

  const union = inA + inB - inBoth;
  if (union <= 0) return 0;
  return inBoth / union;
}

/**
 * Extracts polygon point array from varied object shapes
 */
function extractPolygonPoints(raw: any): [number, number][] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    if (raw.length >= 3 && Array.isArray(raw[0])) {
      return raw as [number, number][];
    }
  }
  if (typeof raw === 'object') {
    if (Array.isArray(raw.polygon) && raw.polygon.length >= 3) {
      return raw.polygon as [number, number][];
    }
    if (Array.isArray(raw.points) && raw.points.length >= 3) {
      return raw.points as [number, number][];
    }
    if (Array.isArray(raw.regions) && raw.regions.length > 0) {
      const first = raw.regions[0];
      if (Array.isArray(first?.polygon) && first.polygon.length >= 3) {
        return first.polygon as [number, number][];
      }
    }
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return extractPolygonPoints(parsed);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Autogrades Pattern 11 (CONTOUR_MAP) question deterministically
 */
export function gradeContourMapQuestion(
  content: Record<string, any>,
  correctAnswer: Record<string, any>,
  studentAnswer: Record<string, any>,
  totalMaxMarks: number
): ContourMapGradingOutcome {
  const subQuestions: any[] = Array.isArray(content.subQuestions)
    ? content.subQuestions
    : Array.isArray(content.questions)
      ? content.questions
      : [];
  const correctSubAnswers: Record<string, any> =
    correctAnswer.subAnswers || (typeof correctAnswer === 'object' ? correctAnswer : {});

  const studentSubAnswers: Record<string, any> =
    studentAnswer.subAnswers || (typeof studentAnswer === 'object' ? studentAnswer : {});

  // Fallback for legacy JSON questions without subQuestions array
  if (subQuestions.length === 0) {
    const keys = Array.from(
      new Set([...Object.keys(correctSubAnswers), ...Object.keys(studentSubAnswers)])
    );
    if (keys.length === 0) {
      return {
        isCorrect: false,
        obtainedMarks: 0,
        maxMarks: totalMaxMarks,
        subResults: []
      };
    }

    let correctCount = 0;
    const subResults: ContourSubResult[] = [];

    for (const k of keys) {
      const rawStudent = studentSubAnswers[k];
      const rawCorrect = correctSubAnswers[k];
      const normS = normalizeArabicContourText(rawStudent);
      const normC = normalizeArabicContourText(rawCorrect);

      let isMatch = false;
      if (normS && normC && normS === normC) {
        isMatch = true;
      } else if (normS && normC && (normS.includes(normC) || normC.includes(normS))) {
        isMatch = true;
      }

      if (isMatch) correctCount++;

      subResults.push({
        subQId: k,
        studentAnswer: rawStudent,
        correctAnswer: rawCorrect,
        isCorrect: isMatch,
        earnedFraction: isMatch ? 1 : 0
      });
    }

    const obtained = Math.round(((correctCount / keys.length) * totalMaxMarks) * 100) / 100;
    return {
      isCorrect: correctCount === keys.length,
      obtainedMarks: Math.min(totalMaxMarks, obtained),
      maxMarks: totalMaxMarks,
      subResults
    };
  }

  // Multi-branch standard Contour Map grading
  const totalUnits = subQuestions.length;
  let correctUnits = 0;
  const subResults: ContourSubResult[] = [];

  for (const sq of subQuestions) {
    const qId = sq.id;
    const rawStudent = studentSubAnswers[qId];
    const rawCorrect = correctSubAnswers[qId] !== undefined ? correctSubAnswers[qId] : sq.correctValue;
    const inputType = sq.inputType || (typeof rawCorrect === 'number' || (!isNaN(Number(rawCorrect)) && rawCorrect !== '') ? 'numeric' : 'text');
    const explanation = sq.explanation || undefined;

    let isBranchCorrect = false;
    let earnedFraction = 0;

    if (rawStudent !== undefined && rawStudent !== null && rawStudent !== '') {
      if (inputType === 'numeric') {
        const numStudent = parseFloat(String(rawStudent).replace(/[^0-9.-]/g, ''));
        const numCorrect = parseFloat(String(rawCorrect).replace(/[^0-9.-]/g, ''));
        const tolerance = typeof sq.numericTolerance === 'number' ? sq.numericTolerance : 0;

        if (!isNaN(numStudent) && !isNaN(numCorrect)) {
          if (Math.abs(numStudent - numCorrect) <= tolerance) {
            isBranchCorrect = true;
            earnedFraction = 1;
          }
        }
      } else if (inputType === 'direction8') {
        const normS = normalizeArabicContourText(rawStudent);
        const normC = normalizeArabicContourText(rawCorrect);

        if (normS && normC && normS === normC) {
          isBranchCorrect = true;
          earnedFraction = 1;
        } else {
          // Check if both resolve to the same 8-direction canonical tag (longest first)
          const foundS = EIGHT_DIRECTIONS.find(d => normS.includes(normalizeArabicContourText(d)));
          const foundC = EIGHT_DIRECTIONS.find(d => normC.includes(normalizeArabicContourText(d)));
          if (foundS && foundC && foundS === foundC) {
            isBranchCorrect = true;
            earnedFraction = 1;
          }
        }
      } else if (inputType === 'mapOverlay') {
        const polyStudent = extractPolygonPoints(rawStudent);
        const polyCorrect = extractPolygonPoints(rawCorrect);
        const threshold = typeof sq.overlayMatchThreshold === 'number' ? sq.overlayMatchThreshold : 0.7;

        if (polyStudent && polyCorrect) {
          const iou = calculatePolygonIoU(polyStudent, polyCorrect);
          if (iou >= threshold) {
            isBranchCorrect = true;
            earnedFraction = 1;
          } else if (iou >= threshold * 0.75) {
            // Partial credit if close
            isBranchCorrect = false;
            earnedFraction = Math.round((iou / threshold) * 50) / 100;
          }
        }
      } else {
        // Fallback text matching
        const normS = normalizeArabicContourText(rawStudent);
        const normC = normalizeArabicContourText(rawCorrect);

        if (normS && normC && (normS === normC || normS.includes(normC) || normC.includes(normS))) {
          isBranchCorrect = true;
          earnedFraction = 1;
        }
      }
    }

    correctUnits += earnedFraction;

    subResults.push({
      subQId: qId,
      studentAnswer: rawStudent,
      correctAnswer: rawCorrect,
      isCorrect: isBranchCorrect,
      earnedFraction,
      explanation
    });
  }

  const obtainedMarks = totalUnits > 0
    ? Math.min(totalMaxMarks, Math.round(((correctUnits / totalUnits) * totalMaxMarks) * 100) / 100)
    : 0;

  const isAllCorrect = subResults.length > 0 && subResults.every(s => s.isCorrect);

  return {
    isCorrect: isAllCorrect,
    obtainedMarks,
    maxMarks: totalMaxMarks,
    subResults
  };
}

export interface DiagramComponentScore {
  id: string;
  kind: 'locate' | 'name' | 'function';
  skill: 'recognition' | 'identification' | 'understanding';
  earned: number;
  max: number;
}

export interface DiagramGradingResult {
  obtainedMarks: number;
  components: DiagramComponentScore[];
}

export function gradeDiagramLabeling(
  content: unknown,
  key: unknown,
  answer: unknown,
  maxMarks: number
): DiagramGradingResult {
  const c = (content || {}) as Record<string, any>;
  const k = (key || {}) as Record<string, any>;
  const a = (answer || {}) as Record<string, any>;

  const subQuestions: any[] = Array.isArray(c.subQuestions) ? c.subQuestions : [];
  if (subQuestions.length === 0) {
    return { obtainedMarks: 0, components: [] };
  }

  const subAnswersKey = (k.subAnswers && typeof k.subAnswers === 'object') ? k.subAnswers : {};
  const studentSubAnswers = (a.subAnswers && typeof a.subAnswers === 'object') ? a.subAnswers : {};

  // Compute weights
  let totalWeight = 0;
  for (const s of subQuestions) {
    const w = typeof s.marks === 'number' && s.marks >= 0 ? s.marks : 1;
    totalWeight += w;
  }
  if (totalWeight <= 0) totalWeight = 1;

  const components: DiagramComponentScore[] = [];

  for (const s of subQuestions) {
    const sId = String(s.id);
    const kind: 'locate' | 'name' | 'function' =
      s.kind === 'locate' || s.kind === 'name' || s.kind === 'function' ? s.kind : 'locate';

    // Skill tags: defaults by kind, explicit override respected
    const defaultSkill: 'recognition' | 'identification' | 'understanding' =
      kind === 'locate' ? 'identification' : kind === 'name' ? 'recognition' : 'understanding';
    const skill: 'recognition' | 'identification' | 'understanding' =
      (s.skill === 'recognition' || s.skill === 'identification' || s.skill === 'understanding') ? s.skill : defaultSkill;

    const weight = typeof s.marks === 'number' && s.marks >= 0 ? s.marks : 1;
    const subMax = (weight / totalWeight) * maxMarks;

    const sKey = subAnswersKey[sId];
    const sAns = studentSubAnswers[sId];

    let earned = 0;

    if (sKey && sAns && typeof sAns === 'object') {
      if (kind === 'locate') {
        const pt = sAns.point;
        if (pt && typeof pt === 'object' && typeof pt.x === 'number' && typeof pt.y === 'number') {
          const regions: any[] = Array.isArray(sKey.regions) ? sKey.regions : [];
          const matched = regions.some((reg) => pointInRegion(pt, reg));
          if (matched) {
            earned = subMax;
          }
        }
      } else if (kind === 'name') {
        // optionId beats text when both are sent
        if (typeof sAns.optionId === 'string') {
          if (sKey.optionId && sAns.optionId === sKey.optionId) {
            earned = subMax;
          }
        } else if (typeof sAns.text === 'string' && sAns.text.trim()) {
          const normStudent = normalizeArabicText(sAns.text);
          const acceptedNames: string[] = Array.isArray(sKey.acceptedNames) ? sKey.acceptedNames : [];
          const matched = acceptedNames.some((acc) => normalizeArabicText(acc) === normStudent);
          if (matched) {
            earned = subMax;
          }
        }
      } else if (kind === 'function') {
        if (typeof sAns.optionId === 'string') {
          if (sKey.optionId && sAns.optionId === sKey.optionId) {
            earned = subMax;
          }
        }
      }
    }

    components.push({
      id: sId,
      kind,
      skill,
      earned,
      max: subMax,
    });
  }

  const rawObtained = components.reduce((sum, item) => sum + item.earned, 0);
  const obtainedMarks = Math.max(0, Math.min(maxMarks, rawObtained));

  return {
    obtainedMarks,
    components,
  };
}

// ==========================================
// CONTRACT 3: ACTIVE READING JOURNEY AUTOGRADING
// ==========================================

export interface ReadingSubQuestionScore {
  id: string;
  skill: ReadingSkillLevel;
  earnedCore: number;
  maxCore: number;
  earnedEvidence: number;
  maxEvidence: number;
  earnedTotal: number;
  maxTotal: number;
  isCorrect: boolean;
}

export interface ReadingSkillMastery {
  skill: ReadingSkillLevel;
  earned: number;
  max: number;
  percentage: number;
}

export interface ReadingComprehensionGradingOutcome {
  isCorrect: boolean;
  obtainedMarks: number;
  maxMarks: number;
  subResults: ReadingSubQuestionScore[];
  skillMastery: Record<ReadingSkillLevel, ReadingSkillMastery>;
}

export function gradeReadingComprehension(
  content: unknown,
  correctAnswer: unknown,
  studentAnswer: unknown,
  maxMarks: number
): ReadingComprehensionGradingOutcome {
  const c = (content || {}) as Record<string, any>;
  const ca = (correctAnswer || {}) as Record<string, any>;
  const sa = (studentAnswer || {}) as Record<string, any>;

  const subQuestions: any[] = Array.isArray(c.subQuestions) ? c.subQuestions : [];
  const correctSubMap = (ca.subAnswers && typeof ca.subAnswers === 'object') ? ca.subAnswers : {};
  const studentSubMap = (sa.subAnswers && typeof sa.subAnswers === 'object') ? sa.subAnswers : {};

  const ALL_SKILLS: ReadingSkillLevel[] = ['literal', 'vocabulary', 'inference', 'analysis', 'evaluation'];
  const skillMastery: Record<ReadingSkillLevel, ReadingSkillMastery> = {
    literal: { skill: 'literal', earned: 0, max: 0, percentage: 0 },
    vocabulary: { skill: 'vocabulary', earned: 0, max: 0, percentage: 0 },
    inference: { skill: 'inference', earned: 0, max: 0, percentage: 0 },
    analysis: { skill: 'analysis', earned: 0, max: 0, percentage: 0 },
    evaluation: { skill: 'evaluation', earned: 0, max: 0, percentage: 0 },
  };

  if (subQuestions.length === 0) {
    return {
      isCorrect: false,
      obtainedMarks: 0,
      maxMarks,
      subResults: [],
      skillMastery,
    };
  }

  let totalWeight = 0;
  for (const sq of subQuestions) {
    const w = typeof sq.marks === 'number' && sq.marks > 0 ? sq.marks : 1;
    totalWeight += w;
  }
  if (totalWeight <= 0) totalWeight = 1;

  const subResults: ReadingSubQuestionScore[] = [];
  let totalObtained = 0;

  for (const sq of subQuestions) {
    const sqId = String(sq.id);
    const skill: ReadingSkillLevel = ALL_SKILLS.includes(sq.skill) ? sq.skill : 'literal';
    const weight = typeof sq.marks === 'number' && sq.marks > 0 ? sq.marks : 1;
    const subMax = (weight / totalWeight) * maxMarks;

    const correctSub = correctSubMap[sqId] || {};
    const studentSub = studentSubMap[sqId];

    const evidenceSpec = sq.evidence || correctSub.evidence;
    const evidenceRequired = Boolean(evidenceSpec?.required);

    const maxCore = evidenceRequired ? subMax * 0.7 : subMax;
    const maxEvidence = evidenceRequired ? subMax * 0.3 : 0;

    let earnedCore = 0;
    let earnedEvidence = 0;

    // 1. Evaluate Core Answer
    let studentCoreVal: any = undefined;
    if (studentSub !== undefined && studentSub !== null) {
      if (typeof studentSub === 'object') {
        studentCoreVal = studentSub.coreAnswer ?? studentSub.selectedOptionId ?? studentSub.value ?? studentSub.text;
      } else {
        studentCoreVal = studentSub;
      }
    }

    let correctCoreVal: any = sq.correctOptionId ?? sq.correctValue ?? correctSub.correctCoreAnswer ?? correctSub.correctOptionId ?? correctSub.correctValue;

    if (studentCoreVal !== undefined && studentCoreVal !== null && studentCoreVal !== '') {
      if (typeof correctCoreVal === 'boolean' || typeof studentCoreVal === 'boolean') {
        if (Boolean(studentCoreVal) === Boolean(correctCoreVal)) {
          earnedCore = maxCore;
        }
      } else if (typeof correctCoreVal === 'string' && typeof studentCoreVal === 'string') {
        const normS = normalizeArabicText(studentCoreVal);
        const normC = normalizeArabicText(correctCoreVal);
        const acceptable: string[] = Array.isArray(sq.acceptableAnswers)
          ? sq.acceptableAnswers
          : Array.isArray(correctSub.acceptableAnswers)
          ? correctSub.acceptableAnswers
          : [];

        if (normS && normC && normS === normC) {
          earnedCore = maxCore;
        } else if (acceptable.some((acc) => normalizeArabicText(acc) === normS)) {
          earnedCore = maxCore;
        } else if (sq.correctOptionId && String(studentCoreVal) === String(sq.correctOptionId)) {
          earnedCore = maxCore;
        }
      } else if (String(studentCoreVal) === String(correctCoreVal)) {
        earnedCore = maxCore;
      }
    }

    // 2. Evaluate Evidence
    if (evidenceRequired && evidenceSpec) {
      const studentEv = typeof studentSub === 'object' && studentSub !== null ? studentSub.evidence : undefined;
      if (studentEv && typeof studentEv === 'object') {
        let evMatched = false;
        if (evidenceSpec.targetParagraphId && studentEv.paragraphId) {
          if (String(studentEv.paragraphId) === String(evidenceSpec.targetParagraphId)) {
            evMatched = true;
          }
        }
        if (!evMatched && Array.isArray(evidenceSpec.acceptedSentenceIds) && studentEv.sentenceId) {
          if (evidenceSpec.acceptedSentenceIds.includes(String(studentEv.sentenceId))) {
            evMatched = true;
          }
        }
        if (!evMatched && Array.isArray(evidenceSpec.acceptedQuoteKeywords) && typeof studentEv.selectedQuote === 'string') {
          const rawQuoteWords = studentEv.selectedQuote.trim().split(/\s+/).filter(Boolean);
          const normQuote = normalizeArabicText(studentEv.selectedQuote);
          const quoteTokens = normQuote ? normQuote.split(/\s+/).filter(Boolean) : [];
          if (rawQuoteWords.length > 0 && rawQuoteWords.length <= 60 && quoteTokens.length > 0 && quoteTokens.length <= 60) {
            if (
              evidenceSpec.acceptedQuoteKeywords.some((kw: string) => {
                if (typeof kw !== 'string') return false;
                const kwWords = normalizeArabicText(kw).split(/\s+/).filter(Boolean);
                return (
                  kwWords.length > 0 &&
                  kwWords.every((kwWord) => quoteTokens.some((uToken) => tokenMatchesWord(uToken, kwWord)))
                );
              })
            ) {
              evMatched = true;
            }
          }
        }
        if (evMatched) {
          earnedEvidence = maxEvidence;
        }
      }
    }

    const earnedTotal = earnedCore + earnedEvidence;
    const isSubCorrect = Math.abs(earnedTotal - subMax) < 0.01;

    subResults.push({
      id: sqId,
      skill,
      earnedCore,
      maxCore,
      earnedEvidence,
      maxEvidence,
      earnedTotal,
      maxTotal: subMax,
      isCorrect: isSubCorrect,
    });

    totalObtained += earnedTotal;

    skillMastery[skill].earned += earnedTotal;
    skillMastery[skill].max += subMax;
  }

  for (const sk of ALL_SKILLS) {
    const sm = skillMastery[sk];
    sm.percentage = sm.max > 0 ? Math.round((sm.earned / sm.max) * 100) : 0;
  }

  const obtainedMarks = Math.min(maxMarks, Math.round(totalObtained * 100) / 100);
  const isAllCorrect = subResults.length > 0 && subResults.every((s) => s.isCorrect);

  return {
    isCorrect: isAllCorrect,
    obtainedMarks,
    maxMarks,
    subResults,
    skillMastery,
  };
}
