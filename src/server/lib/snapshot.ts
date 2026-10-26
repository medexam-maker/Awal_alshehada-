import { ExamMode } from '../../shared/constants';

const FORBIDDEN_KEYS = new Set([
    'correctAnswer',
    'correct_answer',
    'correctValue',
    'correct_value',
    'correctOrder',
    'correct_order',
    'correctSequence',
    'correct_sequence',
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

    // Special Deterministic Snapshot handling for MATCHING
    if (row.question_type === 'matching') {
        const rawPairs = Array.isArray(rawContentObj.pairs) ? rawContentObj.pairs : [];
        const rawDistractors = Array.isArray(rawContentObj.distractors) ? rawContentObj.distractors : [];

        if (rawPairs.length > 0) {
            const sources = rawPairs.map((p: any) => ({
                id: String(p.id),
                text: String(p.source || ''),
            }));

            const rawAllTargets = [
                ...rawPairs.map((p: any) => ({
                    originalId: String(p.id),
                    text: String(p.target || ''),
                    isDistractor: false,
                })),
                ...rawDistractors.map((d: any) => ({
                    originalId: null,
                    text: String(d.target || ''),
                    isDistractor: true,
                })),
            ];

            // Single Fisher-Yates shuffle
            const shuffledArray = [...rawAllTargets];
            for (let i = shuffledArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
            }

            const correctPairsMap: Record<string, string> = {};
            const shuffledTargets = shuffledArray.map((item, idx) => {
                const targetCardId = `target_card_${idx}`;
                if (item.originalId) {
                    correctPairsMap[item.originalId] = targetCardId;
                }
                return {
                    id: targetCardId,
                    text: item.text,
                    originalId: item.originalId,
                    isDistractor: item.isDistractor,
                };
            });

            const matchingContentObj = {
                prompt: promptText,
                sources,
                sourceOrder: sources.map((s) => s.id),
                shuffledTargets,
                scoring_type: rawContentObj.scoring_type || 'partial',
                explanation: row.explanation ?? null,
            };

            snap.content = matchingContentObj;
            snap.correctAnswer = { pairs: correctPairsMap };
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;

            return snap;
        }
    }

    // Special Deterministic Snapshot handling for EXPLAIN & WORD_BLOCK_EXPLAIN
    if (row.question_type === 'explain' || row.question_type === 'word_block_explain') {
        const rawSeq = Array.isArray(rawContentObj.correctSequence)
            ? rawContentObj.correctSequence
            : Array.isArray(rawContentObj.words)
            ? rawContentObj.words
            : typeof row.correct_answer === 'string'
            ? row.correct_answer.trim().split(/\s+/)
            : [];

        // Normalize rawSeq to individual words
        const allWords: string[] = [];
        for (const item of rawSeq) {
            const parts = String(item).trim().split(/\s+/).filter(Boolean);
            allWords.push(...parts);
        }

        // Group words into 3-word phrase chunks (2-3 words per chunk)
        const correctChunkTexts: string[] = [];
        for (let i = 0; i < allWords.length; i += 3) {
            const chunk = allWords.slice(i, i + 3).join(' ');
            if (chunk) correctChunkTexts.push(chunk);
        }

        const correctChunks = correctChunkTexts.map((text, idx) => ({
            id: `chunk_c_${idx}`,
            text,
            isDistractor: false,
        }));

        // Distractor chunks (max 2 distractor phrases)
        const rawDistractors = Array.isArray(rawContentObj.distractorWords)
            ? rawContentObj.distractorWords
            : Array.isArray(rawContentObj.distractors)
            ? rawContentObj.distractors
            : [];

        const distractorsAllWords: string[] = [];
        for (const item of rawDistractors) {
            const parts = String(item).trim().split(/\s+/).filter(Boolean);
            distractorsAllWords.push(...parts);
        }

        const distractorChunkTexts: string[] = [];
        for (let i = 0; i < distractorsAllWords.length && distractorChunkTexts.length < 2; i += 2) {
            const chunk = distractorsAllWords.slice(i, i + 2).join(' ');
            if (chunk) distractorChunkTexts.push(chunk);
        }

        const distractorChunks = distractorChunkTexts.map((text, idx) => ({
            id: `chunk_d_${idx}`,
            text,
            isDistractor: true,
        }));

        const allChunks = [...correctChunks, ...distractorChunks];

        // Fisher-Yates shuffle for bank
        const shuffledBank = [...allChunks];
        for (let i = shuffledBank.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledBank[i], shuffledBank[j]] = [shuffledBank[j], shuffledBank[i]];
        }

        const correctOrder = correctChunks.map((c) => c.id);

        const explainContentObj = {
            prompt: promptText,
            targetPhenomenon: rawContentObj.targetPhenomenon || promptText,
            correctOrder,
            shuffledBank,
            correctChunks,
            scoring_type: rawContentObj.scoring_type || 'all_or_nothing',
            explanation: row.explanation ?? null,
        };

        if (examMode === ExamMode.TRAINING) {
            snap.content = explainContentObj;
            snap.correctAnswer = { sequence: correctChunkTexts, text: correctChunkTexts.join(' ') };
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
        } else {
            snap.content = deepScrubCorrectAnswers(explainContentObj);
            (snap.content as any).correctOrder = correctOrder;
            (snap.content as any).shuffledBank = shuffledBank;
        }

        return snap;
    }

    snap.content = row.content;
    snap.correctAnswer = row.correct_answer;
    snap.explanation = row.explanation ?? null;
    snap.explanationAr = row.explanation ?? null;

    if (examMode !== ExamMode.TRAINING) {
        // CRITICAL BOUNDARY: ONLY for FILL_BLANK in confirmed Weekly Simulation mode (Self-Assessment)
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
