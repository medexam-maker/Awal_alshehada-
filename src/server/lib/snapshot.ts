import { ExamMode } from '../../shared/constants';

const FORBIDDEN_KEYS = new Set([
    'correctAnswer',
    'correct_answer',
    'correctValue',
    'correct_value',
    'correctOrder',
    'correct_order',
    'isOdd',
    'is_odd',
    'pairId',
    'pair_id',
    'pairs',
    'matchedPair',
    'matched_pair',
    'targetId',
    'expectedValue',
    'expected_value',
    'acceptedAnswers',
    'accepted_answers',
    'canonicalAnswer',
    'canonical_answer',
    'isCorrect',
    'is_correct',
    'referenceAnswer',
    'reference_answer',
    'referenceAnswers',
    'reference_answers'
]);

function deepScrubCorrectAnswers(obj: unknown): unknown {
    if (Array.isArray(obj)) {
        return obj.map(deepScrubCorrectAnswers);
    } else if (obj !== null && typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (FORBIDDEN_KEYS.has(key)) {
                continue;
            }
            result[key] = deepScrubCorrectAnswers(value);
        }
        return result;
    }
    return obj;
}

export function createDbSnapshot(row: Record<string, unknown>): Record<string, unknown> {
    return {
        id: row.id,
        subject_id: row.subject_id,
        question_type: row.question_type,
        content: row.content,
        correct_answer: row.correct_answer,
        primary_interaction_mode: row.primary_interaction_mode,
        marks: row.marks,
        explanation: row.explanation
    };
}

export function createClientSnapshot(
    row: Record<string, unknown>, 
    examMode: ExamMode, 
    position: number,
    isWeeklySimulation: boolean = false
): Record<string, unknown> {
    const rawContentObj = (row.content && typeof row.content === 'object') ? (row.content as Record<string, unknown>) : {};
    const promptText = 
      (typeof rawContentObj.prompt === 'string' && rawContentObj.prompt) ||
      (typeof rawContentObj.statement === 'string' && rawContentObj.statement) ||
      (typeof rawContentObj.textWithBlanks === 'string' && rawContentObj.textWithBlanks) ||
      null;

    const marksNum = Number(row.marks);
    const snap: Record<string, unknown> = {
        id: row.id,
        type: row.question_type,
        questionType: row.question_type,
        primaryInteractionMode: row.primary_interaction_mode,
        marks: marksNum,
        points: Number.isFinite(marksNum) ? marksNum : null,
        prompt: promptText,
        promptText: promptText,
        position: position
    };

    if (examMode === ExamMode.TRAINING) {
        snap.content = row.content;
        snap.correctAnswer = row.correct_answer;
        snap.explanation = row.explanation ?? null;
        snap.explanationAr = row.explanation ?? null;
    } else {
        snap.content = deepScrubCorrectAnswers(row.content);
        // CRITICAL BOUNDARY: ONLY for FILL_BLANK in confirmed Weekly Simulation mode (Self-Assessment)
        // General simulations and other exam modes MUST NEVER expose reference answers
        if (row.question_type === 'fill_blank' && isWeeklySimulation) {
            const rawContent = (row.content && typeof row.content === 'object') ? (row.content as Record<string, unknown>) : undefined;
            const rawCa = (row.correct_answer && typeof row.correct_answer === 'object') ? (row.correct_answer as Record<string, unknown>) : undefined;
            const refMap: Record<string, string> = {};
            if (rawContent?.blanks && Array.isArray(rawContent.blanks)) {
                for (const b of rawContent.blanks) {
                    if (b && typeof b === 'object') {
                        const item = b as Record<string, unknown>;
                        const blankId = typeof item.id === 'string' ? item.id : undefined;
                        const val = typeof item.correctValue === 'string' ? item.correctValue
                            : typeof item.referenceAnswer === 'string' ? item.referenceAnswer
                            : typeof item.reference_answer === 'string' ? item.reference_answer
                            : undefined;
                        if (blankId && val) {
                            refMap[blankId] = val;
                        }
                    }
                }
            }
            if (rawCa?.answers && typeof rawCa.answers === 'object') {
                for (const [k, v] of Object.entries(rawCa.answers as Record<string, unknown>)) {
                    if (typeof v === 'string') refMap[k] = v;
                }
            }
            if (rawCa?.blanks && typeof rawCa.blanks === 'object') {
                for (const [k, v] of Object.entries(rawCa.blanks as Record<string, unknown>)) {
                    if (typeof v === 'string') refMap[k] = v;
                }
            }
            if (typeof rawCa === 'object' && rawCa !== null && !rawCa.answers && !rawCa.blanks) {
                for (const [k, v] of Object.entries(rawCa)) {
                    if (typeof v === 'string') refMap[k] = v;
                }
            }
            if (snap.content && typeof snap.content === 'object') {
                (snap.content as Record<string, unknown>).referenceAnswers = refMap;
            }
        }
    }

    return snap;
}
