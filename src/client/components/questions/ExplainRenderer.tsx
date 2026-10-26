import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';

export interface ExplainRendererProps {
  questionId?: string;
  content: {
    id?: string;
    prompt?: string;
    targetPhenomenon?: string;
    text?: string;
    correctOrder?: string[];
    shuffledBank?: Array<{ id: string; text: string; isDistractor?: boolean }>;
    correctSequence?: string[];
    distractorWords?: string[];
    words?: string[];
    allowFreeText?: boolean;
    correctAnswer?: any;
  };
  answer?: any;
  onChange: (ans: any) => void;
  isReadonly?: boolean;
  correctAnswer?: any;
  examMode?: 'simulator' | 'training';
}

export interface Chunk {
  id: string;
  text: string;
  isDistractor?: boolean;
}

/**
 * Ensures all chunks have strictly unique IDs to avoid duplicate key issues in React.
 */
function deduplicateChunkIds(chunks: Chunk[]): Chunk[] {
  const seen = new Set<string>();
  return chunks.map((c, i) => {
    let id = c.id || `chunk_${i}`;
    if (seen.has(id)) {
      id = `${id}_dup_${i}`;
    }
    seen.add(id);
    return { ...c, id };
  });
}

/**
 * Deterministic pseudo-random shuffle seeded by a string to prevent re-shuffling on re-renders.
 */
function deterministicShuffle<T>(arr: T[], seedStr: string): T[] {
  const result = [...arr];
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  for (let i = result.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const rnd = seed / 233280;
    const j = Math.floor(rnd * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Normalizes input answer sequence into 2-3 word phrase chunks (max 7-8 total bank items, max 2 distractors).
 */
function processExplainContent(
  content: any,
  correctAnswer: any,
  seedStr: string
): { correctOrder: string[]; initialBank: Chunk[] } {
  // 1. If snapshot already provided pre-computed shuffledBank and correctOrder, use them directly!
  if (
    Array.isArray(content?.shuffledBank) &&
    content.shuffledBank.length > 0 &&
    Array.isArray(content?.correctOrder) &&
    content.correctOrder.length > 0
  ) {
    const rawBank = content.shuffledBank as Chunk[];
    const rawOrder = content.correctOrder as string[];
    return {
      correctOrder: rawOrder,
      initialBank: deduplicateChunkIds(rawBank),
    };
  }

  // 2. Fallback: derive 2-3 word chunks on the fly
  let rawSeq: string[] = [];
  if (Array.isArray(content?.correctSequence) && content.correctSequence.length > 0) {
    rawSeq = content.correctSequence;
  } else if (Array.isArray(correctAnswer?.correctSequence) && correctAnswer.correctSequence.length > 0) {
    rawSeq = correctAnswer.correctSequence;
  } else if (Array.isArray(correctAnswer?.words) && correctAnswer.words.length > 0) {
    rawSeq = correctAnswer.words;
  } else if (typeof correctAnswer === 'string' && correctAnswer.trim().length > 0) {
    rawSeq = correctAnswer.trim().split(/\s+/);
  } else if (typeof content?.correctAnswer === 'string' && content.correctAnswer.trim().length > 0) {
    rawSeq = content.correctAnswer.trim().split(/\s+/);
  }

  // Flatten sequence into individual words
  const allWords: string[] = [];
  for (const item of rawSeq) {
    const parts = String(item).trim().split(/\s+/).filter(Boolean);
    allWords.push(...parts);
  }

  if (allWords.length === 0) {
    return { correctOrder: [], initialBank: [] };
  }

  // Group into 3-word phrase chunks (2-3 words each)
  const correctChunkTexts: string[] = [];
  for (let i = 0; i < allWords.length; i += 3) {
    const chunk = allWords.slice(i, i + 3).join(' ');
    if (chunk) correctChunkTexts.push(chunk);
  }

  const correctChunks: Chunk[] = correctChunkTexts.map((text, idx) => ({
    id: `chunk_c_${idx}`,
    text,
    isDistractor: false,
  }));

  // Distractors: max 2 phrase chunks
  let rawDistractors: string[] = [];
  if (Array.isArray(content?.distractorWords)) rawDistractors = content.distractorWords;
  else if (Array.isArray(content?.distractors)) rawDistractors = content.distractors;
  else if (Array.isArray(correctAnswer?.distractorWords)) rawDistractors = correctAnswer.distractorWords;

  const distractorWordsFlat: string[] = [];
  for (const item of rawDistractors) {
    const parts = String(item).trim().split(/\s+/).filter(Boolean);
    distractorWordsFlat.push(...parts);
  }

  const distractorChunkTexts: string[] = [];
  for (let i = 0; i < distractorWordsFlat.length && distractorChunkTexts.length < 2; i += 2) {
    const chunk = distractorWordsFlat.slice(i, i + 2).join(' ');
    if (chunk) distractorChunkTexts.push(chunk);
  }

  const distractorChunks: Chunk[] = distractorChunkTexts.map((text, idx) => ({
    id: `chunk_d_${idx}`,
    text,
    isDistractor: true,
  }));

  const allChunks = deduplicateChunkIds([...correctChunks, ...distractorChunks]);
  const initialBank = deterministicShuffle(allChunks, seedStr || correctChunkTexts.join(' '));
  const correctOrder = correctChunks.map((c) => c.id);

  return { correctOrder, initialBank };
}

export const ExplainRenderer: React.FC<ExplainRendererProps> = ({
  questionId,
  content,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
}) => {
  const questionKey = questionId || content?.id || content?.prompt || content?.targetPhenomenon || 'explain_q';
  const prevQuestionKeyRef = useRef<string | null>(null);

  // Process Chunks deterministically
  const { correctOrder, initialBank } = useMemo(() => {
    return processExplainContent(content, correctAnswer, questionKey);
  }, [content?.prompt, content?.targetPhenomenon, content?.id, questionKey, Boolean(content?.shuffledBank)]);

  const hasChunks = correctOrder.length > 0;

  // Active State
  const [bank, setBank] = useState<Chunk[]>([]);
  const [constructedAnswer, setConstructedAnswer] = useState<Chunk[]>([]);
  const [successChunkId, setSuccessChunkId] = useState<string | null>(null);
  const [errorChunkId, setErrorChunkId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize ONLY when question changes or when mounting (NOT on every parent re-render)
  useEffect(() => {
    if (!hasChunks) return;

    if (prevQuestionKeyRef.current !== questionKey) {
      prevQuestionKeyRef.current = questionKey;

      // Reconstruct state if answer was previously recorded (e.g. navigation or resuming)
      const savedChunkIds: string[] = Array.isArray(answer?.chunkIds)
        ? answer.chunkIds
        : [];
      const savedSequence: string[] = Array.isArray(answer?.sequence)
        ? answer.sequence
        : [];

      if (savedChunkIds.length > 0) {
        const reconstructed: Chunk[] = [];
        for (const cid of savedChunkIds) {
          const item = initialBank.find((c) => c.id === cid);
          if (item) reconstructed.push(item);
        }
        const usedIds = new Set(reconstructed.map((c) => c.id));
        setConstructedAnswer(reconstructed);
        setBank(initialBank.filter((c) => !usedIds.has(c.id)));
      } else if (savedSequence.length > 0) {
        const reconstructed: Chunk[] = [];
        const usedIds = new Set<string>();
        for (const text of savedSequence) {
          const item = initialBank.find((c) => c.text === text && !usedIds.has(c.id));
          if (item) {
            reconstructed.push(item);
            usedIds.add(item.id);
          }
        }
        const usedIdsSet = new Set(reconstructed.map((c) => c.id));
        setConstructedAnswer(reconstructed);
        setBank(initialBank.filter((c) => !usedIdsSet.has(c.id)));
      } else {
        setConstructedAnswer([]);
        setBank([...initialBank]);
      }

      setSuccessChunkId(null);
      setErrorChunkId(null);
      setErrorMessage(null);
    }
  }, [questionKey, hasChunks, initialBank, answer]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Handle Chunk Click in Bank (Immediate Step-by-Step Validation)
  const handleChunkClick = (chunk: Chunk) => {
    if (isReadonly || successChunkId || errorChunkId) return;

    const expectedNextId = correctOrder[constructedAnswer.length];
    const clickedId = chunk.id;

    if (clickedId === expectedNextId) {
      // ✅ CORRECT CHUNK:
      // 1. Immediately highlight green: bg-emerald-500 text-white border-emerald-600 scale-105 + ✓ icon
      setSuccessChunkId(clickedId);
      setErrorMessage(null);

      // 2. Play correct feedback sound
      playFeedbackSound('correct');

      // 3. Clear any active success timer
      if (successTimerRef.current) clearTimeout(successTimerRef.current);

      // 4. After 200ms transition delay, move chunk up to constructed answer
      successTimerRef.current = setTimeout(() => {
        const nextAnswer = [...constructedAnswer, chunk];
        const nextBank = bank.filter((c) => c.id !== clickedId);

        setConstructedAnswer(nextAnswer);
        setBank(nextBank);
        setSuccessChunkId(null);

        // Notify parent onChange safely outside of any React state updater callback
        onChange({
          sequence: nextAnswer.map((c) => c.text),
          chunkIds: nextAnswer.map((c) => c.id),
          text: nextAnswer.map((c) => c.text).join(' '),
        });
      }, 200);
    } else {
      // ❌ INCORRECT CHUNK:
      // 1. Immediately highlight red: bg-red-500 text-white border-red-600 animate-shake + ! icon
      setErrorChunkId(clickedId);

      // 2. Play incorrect feedback sound
      playFeedbackSound('incorrect');

      // 3. Device Vibration
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([100, 50, 100, 50, 200]);
        } catch {
          // Ignore if vibration disallowed
        }
      }

      // 4. Show red error banner below bank
      setErrorMessage('❌ الترتيب غير صحيح، حاول مرة أخرى!');

      // 5. CRITICAL: The wrong item MUST NOT move to top! It stays in bank!

      // 6. After 800ms, revert button to normal state & clear error banner
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setErrorChunkId(null);
        setErrorMessage(null);
      }, 800);
    }
  };

  // Remove a chunk from constructed answer (put back into bank)
  const handleRemoveFromAnswer = (indexToRemove: number) => {
    if (isReadonly || successChunkId || errorChunkId) return;

    const chunkToRemove = constructedAnswer[indexToRemove];
    if (!chunkToRemove) return;

    const nextAnswer = constructedAnswer.slice(0, indexToRemove);
    const removedChunks = constructedAnswer.slice(indexToRemove);
    const removedIds = new Set(removedChunks.map((c) => c.id));

    const nextBank = deduplicateChunkIds([
      ...bank.filter((c) => !removedIds.has(c.id)),
      ...removedChunks,
    ]);

    setConstructedAnswer(nextAnswer);
    setBank(nextBank);
    setErrorMessage(null);

    // Notify parent onChange safely outside of any React state updater callback
    onChange({
      sequence: nextAnswer.map((c) => c.text),
      chunkIds: nextAnswer.map((c) => c.id),
      text: nextAnswer.map((c) => c.text).join(' '),
    });
  };

  // Reset entire answer
  const handleReset = () => {
    if (isReadonly) return;

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);

    setConstructedAnswer([]);
    setBank([...initialBank]);
    setSuccessChunkId(null);
    setErrorChunkId(null);
    setErrorMessage(null);

    // Notify parent onChange safely outside of any React state updater callback
    onChange({
      sequence: [],
      chunkIds: [],
      text: '',
    });
  };

  const isCompleted = hasChunks && constructedAnswer.length === correctOrder.length;

  // Fallback: Free-text textarea if no chunks exist
  if (!hasChunks) {
    const rawText = typeof answer === 'string' ? answer : answer?.text || '';
    return (
      <div className="space-y-4 select-none" dir="rtl">
        <div className="relative">
          <textarea
            value={rawText}
            onChange={(e) => !isReadonly && onChange({ text: e.target.value })}
            disabled={isReadonly}
            rows={5}
            placeholder="علل واذكر الأسباب العلمية والمنطقية بالتفصيل..."
            className="w-full p-4 border border-slate-300 rounded-2xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed text-base resize-none shadow-xs"
          />
          <div className="text-left text-xs text-slate-400 mt-1">{rawText.length} حرف</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none" dir="rtl">
      {/* 1. Top Constructed Answer Zone */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-600">منطقة بناء التفسير العلمي:</span>
          {constructedAnswer.length > 0 && !isReadonly && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>إعادة تعيين 🔄</span>
            </button>
          )}
        </div>

        <div
          className={`min-h-[120px] rounded-2xl p-4 border-2 border-dashed transition-all duration-300 flex flex-wrap gap-2.5 items-start ${
            constructedAnswer.length === 0
              ? 'bg-slate-50 border-slate-300 justify-center items-center'
              : isCompleted
              ? 'bg-emerald-50/80 border-emerald-400'
              : 'bg-indigo-50/40 border-indigo-300'
          }`}
        >
          {constructedAnswer.length === 0 ? (
            <div className="text-center p-4">
              <span className="text-slate-400 text-sm font-medium block">
                انقر على العبارات في الأسفل لبناء التفسير العلمي الصحيح... 🧩
              </span>
            </div>
          ) : (
            constructedAnswer.map((chunk, idx) => (
              <button
                key={`ans-chunk-${chunk.id}-${idx}`}
                type="button"
                onClick={() => handleRemoveFromAnswer(idx)}
                disabled={isReadonly}
                className="h-11 px-4 rounded-xl font-bold text-sm sm:text-base border bg-white text-slate-800 border-slate-300 shadow-xs hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 transition-all duration-200 cursor-pointer flex items-center gap-2 animate-in fade-in zoom-in-95"
                style={{ borderBottomWidth: '4px' }}
                title="انقر لإزالة هذه العبارة"
              >
                <span>{chunk.text}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. Completion Banner */}
      {isCompleted && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 flex items-center gap-2.5 text-sm font-bold shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>إجابة تعليل صحيحة ومكتملة! أحسنت! 👏</span>
        </div>
      )}

      {/* 3. Word Bank (سلة الكلمات / العبارات) */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-600">
            سلة العبارات (اختر العبارة التالية بالترتيب الصحيح):
          </p>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
            {bank.length} عبارات متبقية
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5 justify-center min-h-[80px] items-center">
          {bank.length === 0 && !isCompleted && (
            <span className="text-xs text-slate-400 font-medium">تم استخدام كل العبارات!</span>
          )}

          {bank.map((chunk, idx) => {
            const isSuccess = successChunkId === chunk.id;
            const isError = errorChunkId === chunk.id;

            let buttonClass =
              'bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 shadow-xs cursor-pointer';

            if (isSuccess) {
              buttonClass = 'bg-emerald-500 text-white border-emerald-600 scale-105 shadow-md';
            } else if (isError) {
              buttonClass = 'bg-red-500 text-white border-red-600 animate-shake shadow-md';
            }

            return (
              <button
                key={`bank-chunk-${chunk.id}-${idx}`}
                type="button"
                onClick={() => handleChunkClick(chunk)}
                disabled={isReadonly || !!successChunkId || !!errorChunkId}
                className={`h-11 px-4 rounded-xl font-bold text-sm sm:text-base border transition-all duration-150 flex items-center gap-2 active:translate-y-0.5 ${buttonClass}`}
                style={{
                  borderBottomWidth: '4px',
                  borderBottomColor: isSuccess ? '#059669' : isError ? '#dc2626' : '#cbd5e1',
                }}
              >
                <span>{chunk.text}</span>

                {isSuccess && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                {isError && <AlertCircle className="w-4 h-4 text-white shrink-0 animate-pulse" />}
              </button>
            );
          })}
        </div>

        {/* 4. Immediate Rejection Error Banner */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
