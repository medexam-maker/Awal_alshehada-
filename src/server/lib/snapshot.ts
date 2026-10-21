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
    'is_correct'
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
    const snap: Record<string, unknown> = {
        id: row.id,
        questionType: row.question_type,
        primaryInteractionMode: row.primary_interaction_mode,
        marks: row.marks,
        position: position
    };

    if (examMode === ExamMode.TRAINING) {
        snap.content = row.content;
        snap.correctAnswer = row.correct_answer;
        snap.explanation = row.explanation;
    } else {
        snap.content = deepScrubCorrectAnswers(row.content);
        // CRITICAL BOUNDARY: ONLY for FILL_BLANK in confirmed Weekly Simulation mode (Self-Assessment)
        // General simulations and other exam modes MUST NEVER expose reference answers
        if (row.question_type === 'fill_blank' && isWeeklySimulation) {
            const rawContent = row.content as any;
            const rawCa = row.correct_answer as any;
            const refMap: Record<string, string> = {};
            if (rawContent?.blanks && Array.isArray(rawContent.blanks)) {
                for (const b of rawContent.blanks) {
                    if (b.id && (b.correctValue || b.referenceAnswer)) {
                        refMap[b.id] = b.correctValue || b.referenceAnswer;
                    }
                }
            }
            if (rawCa?.answers && typeof rawCa.answers === 'object') {
                Object.assign(refMap, rawCa.answers);
            }
            if (rawCa?.blanks && typeof rawCa.blanks === 'object') {
                Object.assign(refMap, rawCa.blanks);
            }
            if (typeof rawCa === 'object' && rawCa !== null && !rawCa.answers && !rawCa.blanks) {
                for (const [k, v] of Object.entries(rawCa)) {
                    if (typeof v === 'string') refMap[k] = v;
                }
            }
            if (snap.content && typeof snap.content === 'object') {
                (snap.content as any).referenceAnswers = refMap;
            }
        }
    }

    return snap;
}
