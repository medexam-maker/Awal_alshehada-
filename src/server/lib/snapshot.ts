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
    'correctChunks',
    'correct_chunks',
    'isDistractor',
    'is_distractor',
    'originalId',
    'original_id',
    'selectedOptionId',
    'selected_option_id',
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
    'reference_answers',
    'choices',
    'model',
    'model_answer',
    'modelAnswer',
    'mandatory_keywords',
    'mandatoryKeywords',
    'partial_threshold',
    'partialThreshold',
    'grading_mode',
    'gradingMode',
    'hint',
    'explanation',
    'explanationAr',
    'explanation_ar'
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
    const rawContentObj = (row.content && typeof row.content === 'object') ? (row.content as Record<string, unknown>) : {};
    if (row.question_type === 'matching' && !rawContentObj.shuffledTargets) {
        const { dbSnapshot } = createSnapshotPair(row, ExamMode.SIMULATOR, 1);
        return dbSnapshot;
    }
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

    // 1. MATCHING
    if (row.question_type === 'matching') {
        const rawPairs = Array.isArray(rawContentObj.pairs) ? rawContentObj.pairs : [];
        const rawDistractors = Array.isArray(rawContentObj.distractors) ? rawContentObj.distractors : [];

        let shuffledTargets: Array<Record<string, unknown>> = [];
        let correctPairsMap: Record<string, string> = {};

        if (Array.isArray(rawContentObj.shuffledTargets) && rawContentObj.shuffledTargets.length > 0) {
            shuffledTargets = rawContentObj.shuffledTargets as Array<Record<string, unknown>>;
            for (const t of shuffledTargets) {
                if (t.originalId) {
                    correctPairsMap[String(t.originalId)] = String(t.id);
                }
            }
        } else if (rawPairs.length > 0) {
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

            const shuffledArray = [...rawAllTargets];
            for (let i = shuffledArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
            }

            shuffledTargets = shuffledArray.map((item, idx) => {
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
        }

        const sources = rawPairs.length > 0
            ? rawPairs.map((p: any) => ({
                id: String(p.id),
                text: String(p.source || ''),
              }))
            : Array.isArray(rawContentObj.sources)
            ? rawContentObj.sources
            : [];

        if (examMode === ExamMode.TRAINING) {
            snap.content = {
                prompt: promptText,
                sources,
                sourceOrder: (sources as any[]).map((s) => s.id),
                shuffledTargets,
                scoring_type: rawContentObj.scoring_type || 'partial',
                explanation: row.explanation ?? null,
            };
            const rawCa = (row.correct_answer && typeof row.correct_answer === 'object') ? (row.correct_answer as Record<string, unknown>) : {};
            const caPairs = (rawCa.pairs && typeof rawCa.pairs === 'object') ? (rawCa.pairs as Record<string, string>) : {};
            snap.correctAnswer = { pairs: { ...caPairs, ...correctPairsMap } };
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
        } else {
            // SIMULATOR: strictly sanitize targets, no originalId, no isDistractor, no explanation, no correctAnswer
            snap.content = {
                prompt: promptText,
                sources,
                sourceOrder: (sources as any[]).map((s) => s.id),
                shuffledTargets: shuffledTargets.map((t) => ({
                    id: String(t.id),
                    text: String(t.text ?? ''),
                })),
                scoring_type: rawContentObj.scoring_type || 'partial',
            };
        }
        return snap;
    }

    // 2. EXPLAIN — select_reason_from_list mode
    if (
        row.question_type === 'explain' &&
        Array.isArray(rawContentObj.reasonOptions) &&
        (rawContentObj.reasonOptions as unknown[]).length > 0
    ) {
        const rawCa = (row.correct_answer && typeof row.correct_answer === 'object') ? (row.correct_answer as Record<string, unknown>) : {};
        const options = (rawContentObj.reasonOptions as Array<Record<string, unknown>>).map((o) => ({
            id: String(o.id),
            text: String(o.text ?? ''),
        }));
        snap.content = {
            prompt: promptText,
            targetPhenomenon: rawContentObj.targetPhenomenon || promptText,
            reasonOptions: options,
        };
        if (examMode === ExamMode.TRAINING) {
            snap.correctAnswer = { selectedReasonIds: Array.isArray(rawCa.selectedReasonIds) ? rawCa.selectedReasonIds : [] };
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
        }
        return snap;
    }

    // 3. EXPLAIN & WORD_BLOCK_EXPLAIN
    if (row.question_type === 'explain' || row.question_type === 'word_block_explain') {
        const rawSeq = Array.isArray(rawContentObj.correctSequence)
            ? rawContentObj.correctSequence
            : Array.isArray(rawContentObj.words)
            ? rawContentObj.words
            : typeof row.correct_answer === 'string'
            ? row.correct_answer.trim().split(/\s+/)
            : [];

        const allWords: string[] = [];
        for (const item of rawSeq) {
            const parts = String(item).trim().split(/\s+/).filter(Boolean);
            allWords.push(...parts);
        }

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

        const shuffledBank = [...allChunks];
        for (let i = shuffledBank.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledBank[i], shuffledBank[j]] = [shuffledBank[j], shuffledBank[i]];
        }

        const correctOrder = correctChunks.map((c) => c.id);

        if (examMode === ExamMode.TRAINING) {
            snap.content = {
                prompt: promptText,
                targetPhenomenon: rawContentObj.targetPhenomenon || promptText,
                correctOrder,
                shuffledBank,
                correctChunks,
                scoring_type: rawContentObj.scoring_type || 'all_or_nothing',
                explanation: row.explanation ?? null,
            };
            snap.correctAnswer = { sequence: correctChunkTexts, text: correctChunkTexts.join(' ') };
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
        } else {
            // SIMULATOR: no correctOrder, no correctChunks, no isDistractor in bank, no explanation, no correctAnswer
            snap.content = {
                prompt: promptText,
                targetPhenomenon: rawContentObj.targetPhenomenon || promptText,
                shuffledBank: shuffledBank.map((c) => ({
                    id: c.id,
                    text: c.text,
                })),
                scoring_type: rawContentObj.scoring_type || 'all_or_nothing',
            };
        }
        return snap;
    }

    // 4. ORDERING
    if (row.question_type === 'ordering') {
        const rawItems = Array.isArray(rawContentObj.items)
            ? rawContentObj.items
            : Array.isArray(rawContentObj.events)
            ? rawContentObj.events
            : [];

        const formattedItems = rawItems.map((item: any, idx: number) => ({
            id: String(item.id || `s${idx + 1}`),
            text: String(item.text || item.title || item.label || ''),
        }));

        let correctOrder: string[] = [];
        const rawCa = row.correct_answer as any;
        if (Array.isArray(rawContentObj.correctOrder)) {
            correctOrder = rawContentObj.correctOrder.map(String);
        } else if (rawCa && Array.isArray(rawCa.orderedIds)) {
            correctOrder = rawCa.orderedIds.map(String);
        } else if (rawCa && Array.isArray(rawCa.order)) {
            correctOrder = rawCa.order.map(String);
        } else {
            correctOrder = formattedItems.map((it) => it.id);
        }

        const shuffledBank = [...formattedItems];
        for (let i = shuffledBank.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledBank[i], shuffledBank[j]] = [shuffledBank[j], shuffledBank[i]];
        }

        if (examMode === ExamMode.TRAINING) {
            snap.content = {
                prompt: promptText,
                items: formattedItems,
                shuffledBank,
                correctOrder,
                scoring_type: rawContentObj.scoring_type || 'partial',
                explanation: row.explanation ?? null,
            };
            snap.correctAnswer = { orderedIds: correctOrder };
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
        } else {
            // SIMULATOR: no correctOrder, no explanation, no correctAnswer
            snap.content = {
                prompt: promptText,
                items: formattedItems,
                shuffledBank,
                scoring_type: rawContentObj.scoring_type || 'partial',
            };
        }
        return snap;
    }

    // 5. SHORT_ESSAY (Pattern 8)
    if (row.question_type === 'short_essay' || row.question_type === 'pattern_8') {
        if (examMode === ExamMode.SIMULATOR) {
            snap.content = {
                prompt: promptText,
                wordLimit: rawContentObj.wordLimit || rawContentObj.max_words || rawContentObj.maxWords || 30,
                maxWords: rawContentObj.maxWords || rawContentObj.max_words || 30,
            };
            return snap;
        } else {
            const rawCa = (row.correct_answer && typeof row.correct_answer === 'object') ? (row.correct_answer as Record<string, unknown>) : {};
            const modelAns = rawContentObj.model_answer || rawContentObj.modelAnswer || rawCa.model_answer || rawCa.modelAnswer || null;
            const keywords = rawContentObj.mandatory_keywords || rawContentObj.mandatoryKeywords || rawCa.mandatory_keywords || rawCa.mandatoryKeywords || [];

            snap.content = {
                ...rawContentObj,
                prompt: promptText,
                hint: rawContentObj.hint ?? row.explanation ?? null,
                model_answer: modelAns,
                modelAnswer: modelAns,
                mandatory_keywords: keywords,
                mandatoryKeywords: keywords,
                partial_threshold: rawContentObj.partial_threshold ?? rawContentObj.partialThreshold ?? 0.5,
                grading_mode: rawContentObj.grading_mode ?? rawContentObj.gradingMode ?? 'auto',
                max_words: rawContentObj.max_words || rawContentObj.maxWords || 30,
            };
            snap.correctAnswer = {
                model_answer: modelAns,
                mandatory_keywords: keywords,
                partial_threshold: (snap.content as any).partial_threshold,
                grading_mode: (snap.content as any).grading_mode,
            };
            snap.explanation = row.explanation ?? (modelAns as string) ?? null;
            snap.explanationAr = row.explanation ?? (modelAns as string) ?? null;
            return snap;
        }
    }

    // 6. FILL_BLANK
    if (row.question_type === 'fill_blank') {
        if (examMode === ExamMode.TRAINING) {
            snap.content = row.content;
            snap.correctAnswer = row.correct_answer;
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
            return snap;
        } else {
            // SIMULATOR: strip choices, correctValue
            const rawBlanks = Array.isArray(rawContentObj.blanks) ? rawContentObj.blanks : [];
            const cleanBlanks = rawBlanks.map((b: any) => ({
                id: String(b?.id ?? ''),
            }));
            const cleanContent: Record<string, unknown> = {
                prompt: promptText,
                textWithBlanks: rawContentObj.textWithBlanks || '',
                blanks: cleanBlanks,
            };

            if (isWeeklySimulation) {
                const rawCa = (row.correct_answer && typeof row.correct_answer === 'object') ? (row.correct_answer as Record<string, unknown>) : undefined;
                const refMap: Record<string, string> = {};
                for (const b of rawBlanks) {
                    if (b && typeof b === 'object') {
                        const blankId = typeof b.id === 'string' ? b.id : undefined;
                        const val = typeof b.correctValue === 'string' ? b.correctValue
                            : typeof b.referenceAnswer === 'string' ? b.referenceAnswer
                            : typeof b.reference_answer === 'string' ? b.reference_answer
                            : undefined;
                        if (blankId && val) {
                            refMap[blankId] = val;
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
                cleanContent.referenceAnswers = refMap;
            }
            snap.content = cleanContent;
            return snap;
        }
    }

    // 7. TRUE_FALSE
    if (row.question_type === 'true_false') {
        if (examMode === ExamMode.TRAINING) {
            snap.content = row.content;
            snap.correctAnswer = row.correct_answer;
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
        } else {
            snap.content = {
                prompt: promptText,
                statement: rawContentObj.statement || promptText,
            };
        }
        return snap;
    }

    // 8. MULTIPLE_CHOICE
    if (row.question_type === 'multiple_choice') {
        if (examMode === ExamMode.TRAINING) {
            snap.content = row.content;
            snap.correctAnswer = row.correct_answer;
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
        } else {
            const rawOptions = Array.isArray(rawContentObj.options) ? rawContentObj.options : [];
            snap.content = {
                prompt: promptText,
                options: rawOptions.map((o: any) => ({
                    id: String(o.id),
                    text: String(o.text ?? ''),
                })),
            };
        }
        return snap;
    }

    // 9. LONG_ESSAY
    if (row.question_type === 'long_essay') {
        if (examMode === ExamMode.TRAINING) {
            snap.content = row.content;
            snap.correctAnswer = row.correct_answer;
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
        } else {
            snap.content = {
                prompt: promptText,
                instructions: rawContentObj.instructions,
            };
        }
        return snap;
    }

    // 10. ODD_ONE_OUT
    if (row.question_type === 'odd_one_out') {
        const rawItems = Array.isArray(rawContentObj.items) ? rawContentObj.items : [];
        const cleanItems = rawItems.map((it: any) => ({
            id: String(it?.id ?? ''),
            text: String(it?.text ?? ''),
        }));

        if (examMode === ExamMode.TRAINING) {
            const cleanReasoning = rawContentObj.reasoning ? {
                prompt: (rawContentObj.reasoning as any).prompt,
                marksFraction: (rawContentObj.reasoning as any).marksFraction,
                trainingChoices: Array.isArray((rawContentObj.reasoning as any).trainingChoices)
                    ? (rawContentObj.reasoning as any).trainingChoices.map((c: any) => ({ id: String(c.id), text: String(c.text) }))
                    : undefined,
            } : undefined;

            snap.content = {
                prompt: promptText,
                ...(rawContentObj.passage ? { passage: rawContentObj.passage } : {}),
                items: cleanItems,
                ...(cleanReasoning ? { reasoning: cleanReasoning } : {}),
            };
            const rawCa = (row.correct_answer && typeof row.correct_answer === 'object') ? (row.correct_answer as Record<string, unknown>) : {};
            snap.correctAnswer = {
                selectedItemIds: Array.isArray(rawCa.selectedItemIds) ? rawCa.selectedItemIds : [],
                ...(rawCa.reasoning && typeof rawCa.reasoning === 'object' && (rawCa.reasoning as any).correctChoiceId ? {
                    reasoning: { correctChoiceId: (rawCa.reasoning as any).correctChoiceId }
                } : {}),
            };
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
        } else {
            // SIMULATOR: prompt and marksFraction always present, strip trainingChoices, keywordGroups, correctChoiceId, correctAnswer, explanation
            const cleanReasoning = rawContentObj.reasoning ? {
                prompt: (rawContentObj.reasoning as any).prompt,
                marksFraction: (rawContentObj.reasoning as any).marksFraction,
            } : undefined;

            snap.content = {
                prompt: promptText,
                ...(rawContentObj.passage ? { passage: rawContentObj.passage } : {}),
                items: cleanItems,
                ...(cleanReasoning ? { reasoning: cleanReasoning } : {}),
            };
        }
        return snap;
    }

    // 11. COMPARISON_TABLE
    if (row.question_type === 'comparison_table') {
        if (examMode === ExamMode.TRAINING) {
            snap.content = row.content;
            snap.correctAnswer = row.correct_answer;
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
        } else {
            // SIMULATOR: strip correctValue, correctOptionId, explanation, correctAnswer; normalize options to {id, text}
            const rawRows = Array.isArray(rawContentObj.rows) ? rawContentObj.rows : [];
            const cleanRows = rawRows.map((r: any) => ({
                id: String(r?.id ?? ''),
                label: String(r?.label ?? ''),
                cells: Array.isArray(r?.cells) ? r.cells.map((c: any) => {
                    const cleanCell: Record<string, any> = {
                        id: String(c?.id ?? ''),
                        value: c?.value !== undefined ? c.value : null,
                    };
                    if (Array.isArray(c?.options)) {
                        cleanCell.options = c.options.map((o: any) => ({
                            id: String(typeof o === 'object' && o !== null ? o.id : o),
                            text: String(typeof o === 'object' && o !== null ? (o.text ?? o.id) : o),
                        }));
                    }
                    return cleanCell;
                }) : [],
            }));
            snap.content = {
                prompt: promptText,
                tableHeaders: Array.isArray(rawContentObj.tableHeaders) ? rawContentObj.tableHeaders : [],
                rows: cleanRows,
            };
        }
        return snap;
    }

    // 12. ARABIC_GRAMMAR
    if (row.question_type === 'arabic_grammar') {
        const rawComponents = Array.isArray(rawContentObj.components)
            ? (rawContentObj.components as Array<Record<string, unknown>>)
            : [];

        const components = rawComponents.map((c) => {
            const rawChoices = Array.isArray(c.choices) ? (c.choices as Array<Record<string, unknown>>) : [];
            const cleanChoices = rawChoices.map((ch) => ({
                id: String(ch.id || ''),
                text: String(ch.text || ''),
            }));

            const rawHints = Array.isArray(c.hints) ? (c.hints as Array<Record<string, unknown>>) : undefined;
            const cleanHints = rawHints
                ? rawHints.map((h) => ({
                      level: Number(h.level || 1),
                      text: String(h.text || ''),
                  }))
                : undefined;

            return {
                id: String(c.id || ''),
                label: String(c.label || ''),
                points: Number(c.points || 0),
                choices: cleanChoices,
                ...(cleanHints ? { hints: cleanHints } : {}),
            };
        });

        if (examMode === ExamMode.TRAINING) {
            snap.content = {
                prompt: promptText,
                ...(rawContentObj.passage ? { passage: String(rawContentObj.passage) } : {}),
                ...(rawContentObj.sentence ? { sentence: String(rawContentObj.sentence) } : {}),
                ...(rawContentObj.targetWord ? { targetWord: String(rawContentObj.targetWord) } : {}),
                ...(rawContentObj.mode ? { mode: String(rawContentObj.mode) } : {}),
                ...(components.length > 0 ? { components } : {}),
            };
            snap.correctAnswer = row.correct_answer;
            snap.explanation = row.explanation ?? null;
            snap.explanationAr = row.explanation ?? null;
        } else {
            // SIMULATOR: Strictly scrub hints, correctAnswer, explanation, and any answer keys
            const simComponents = components.map(({ hints, ...rest }) => ({
                id: rest.id,
                label: rest.label,
                points: rest.points,
                choices: rest.choices.map((ch) => ({
                    id: ch.id,
                    text: ch.text,
                })),
            }));

            snap.content = {
                prompt: promptText,
                ...(rawContentObj.passage ? { passage: String(rawContentObj.passage) } : {}),
                ...(rawContentObj.sentence ? { sentence: String(rawContentObj.sentence) } : {}),
                ...(rawContentObj.targetWord ? { targetWord: String(rawContentObj.targetWord) } : {}),
                ...(rawContentObj.mode ? { mode: String(rawContentObj.mode) } : {}),
                ...(simComponents.length > 0 ? { components: simComponents } : {}),
            };
        }
        return snap;
    }

    // Fallback for all other types (e.g. calculation, contour map)
    if (examMode === ExamMode.TRAINING) {
        snap.content = row.content;
        snap.correctAnswer = row.correct_answer;
        snap.explanation = row.explanation ?? null;
        snap.explanationAr = row.explanation ?? null;
    } else {
        snap.content = deepScrubCorrectAnswers(row.content);
        delete (snap.content as any)?.explanation;
        delete (snap.content as any)?.explanationAr;
        delete (snap.content as any)?.correctOrder;
        delete (snap.content as any)?.correctChunks;
    }

    return snap;
}

export function createSnapshotPair(
    row: Record<string, unknown>,
    examMode: ExamMode,
    position: number,
    isWeeklySimulation: boolean = false
): { dbSnapshot: Record<string, unknown>; clientSnapshot: Record<string, unknown> } {
    let dbSnapshot: Record<string, unknown>;
    const rawContentObj = (row.content && typeof row.content === 'object') ? (row.content as Record<string, unknown>) : {};

    if (row.question_type === 'matching') {
        const rawPairs = Array.isArray(rawContentObj.pairs) ? rawContentObj.pairs : [];
        const rawDistractors = Array.isArray(rawContentObj.distractors) ? rawContentObj.distractors : [];

        let shuffledTargets: Array<Record<string, unknown>> = [];
        let correctPairsMap: Record<string, string> = {};

        if (Array.isArray(rawContentObj.shuffledTargets) && rawContentObj.shuffledTargets.length > 0) {
            shuffledTargets = rawContentObj.shuffledTargets as Array<Record<string, unknown>>;
            for (const t of shuffledTargets) {
                if (t.originalId) {
                    correctPairsMap[String(t.originalId)] = String(t.id);
                }
            }
        } else if (rawPairs.length > 0) {
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

            const shuffledArray = [...rawAllTargets];
            for (let i = shuffledArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
            }

            shuffledTargets = shuffledArray.map((item, idx) => {
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
        }

        const sources = rawPairs.length > 0
            ? rawPairs.map((p: any) => ({
                id: String(p.id),
                text: String(p.source || ''),
              }))
            : Array.isArray(rawContentObj.sources)
            ? rawContentObj.sources
            : [];

        const promptText = (typeof rawContentObj.prompt === 'string' && rawContentObj.prompt) || null;

        const dbMatchingContent = {
            ...rawContentObj,
            prompt: promptText,
            sources,
            sourceOrder: (sources as any[]).map((s) => s.id),
            shuffledTargets,
            scoring_type: rawContentObj.scoring_type || 'partial',
            explanation: row.explanation ?? null,
        };

        const rawCa = (row.correct_answer && typeof row.correct_answer === 'object') ? (row.correct_answer as Record<string, unknown>) : {};
        const caPairs = (rawCa.pairs && typeof rawCa.pairs === 'object') ? (rawCa.pairs as Record<string, string>) : {};
        const mergedPairsMap = { ...caPairs, ...correctPairsMap };

        dbSnapshot = {
            id: row.id,
            subject_id: row.subject_id,
            question_type: row.question_type,
            content: dbMatchingContent,
            correct_answer: { pairs: mergedPairsMap },
            primary_interaction_mode: row.primary_interaction_mode,
            marks: row.marks,
            explanation: row.explanation,
        };
    } else if (row.question_type === 'comparison_table') {
        const rawRows = Array.isArray(rawContentObj.rows) ? rawContentObj.rows : [];
        const rowsWithShuffledOptions = rawRows.map((r: any) => ({
            ...r,
            cells: Array.isArray(r?.cells) ? r.cells.map((c: any) => {
                if (Array.isArray(c?.options) && c.options.length > 0) {
                    const shuffled = [...c.options];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    return { ...c, options: shuffled };
                }
                return c;
            }) : [],
        }));

        dbSnapshot = {
            id: row.id,
            subject_id: row.subject_id,
            question_type: row.question_type,
            content: {
                ...rawContentObj,
                rows: rowsWithShuffledOptions,
            },
            correct_answer: row.correct_answer,
            primary_interaction_mode: row.primary_interaction_mode,
            marks: row.marks,
            explanation: row.explanation,
        };
    } else if (row.question_type === 'odd_one_out') {
        const rawReasoning = rawContentObj.reasoning as Record<string, unknown> | undefined;
        let finalReasoning = rawReasoning;
        if (rawReasoning && Array.isArray(rawReasoning.trainingChoices) && rawReasoning.trainingChoices.length > 0) {
            const shuffledChoices = [...rawReasoning.trainingChoices];
            for (let i = shuffledChoices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledChoices[i], shuffledChoices[j]] = [shuffledChoices[j], shuffledChoices[i]];
            }
            finalReasoning = {
                ...rawReasoning,
                trainingChoices: shuffledChoices,
            };
        }

        dbSnapshot = {
            id: row.id,
            subject_id: row.subject_id,
            question_type: row.question_type,
            content: {
                ...rawContentObj,
                ...(finalReasoning ? { reasoning: finalReasoning } : {}),
            },
            correct_answer: row.correct_answer,
            primary_interaction_mode: row.primary_interaction_mode,
            marks: row.marks,
            explanation: row.explanation,
        };
    } else {
        dbSnapshot = createDbSnapshot(row);
    }

    const clientSnapshot = createClientSnapshot(dbSnapshot, examMode, position, isWeeklySimulation);
    return { dbSnapshot, clientSnapshot };
}
