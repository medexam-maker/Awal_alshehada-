import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HelpCircle, RefreshCw, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';

export interface ExplainRendererProps {
  content: {
    prompt?: string;
    targetPhenomenon?: string;
    text?: string;
    correctSequence?: string[];
    distractorWords?: string[];
    words?: string[];
    allowFreeText?: boolean;
  };
  answer?: any;
  onChange: (ans: any) => void;
  isReadonly?: boolean;
  correctAnswer?: any;
  examMode?: 'simulator' | 'training';
}

interface WordBlock {
  id: string;
  word: string;
}

export const ExplainRenderer: React.FC<ExplainRendererProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
  examMode = 'training',
}) => {
  // 1. Resolve Target Phenomenon / Question Text
  const questionText =
    content?.targetPhenomenon ||
    content?.prompt ||
    content?.text ||
    'علل واذكر الأسباب العلمية والمنطقية بالتفصيل:';

  // 2. Resolve Correct Sequence & Distractor Words
  const correctSeq: string[] = useMemo(() => {
    if (Array.isArray(content?.correctSequence) && content.correctSequence.length > 0) {
      return content.correctSequence;
    }
    if (Array.isArray(correctAnswer?.correctSequence) && correctAnswer.correctSequence.length > 0) {
      return correctAnswer.correctSequence;
    }
    if (Array.isArray(correctAnswer?.words) && correctAnswer.words.length > 0) {
      return correctAnswer.words;
    }
    if (Array.isArray(correctAnswer?.sequence) && correctAnswer.sequence.length > 0) {
      return correctAnswer.sequence;
    }
    if (Array.isArray(content?.words) && content.words.length > 0) {
      return content.words;
    }
    return [];
  }, [content, correctAnswer]);

  const distractorWords: string[] = useMemo(() => {
    if (Array.isArray(content?.distractorWords)) {
      return content.distractorWords;
    }
    if (Array.isArray(correctAnswer?.distractorWords)) {
      return correctAnswer.distractorWords;
    }
    return [];
  }, [content, correctAnswer]);

  const hasWordBlocks = correctSeq.length > 0 || distractorWords.length > 0;

  // 3. Prepare Word Blocks for the Word Bank (Scrambled)
  const [shuffledBlocks, setShuffledBlocks] = useState<WordBlock[]>([]);
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
  const lastSoundRef = useRef<string | null>(null);

  // Initialize or reset blocks when question content/sequence changes
  useEffect(() => {
    if (!hasWordBlocks) return;

    const allWords = [...correctSeq, ...distractorWords];
    const createdBlocks: WordBlock[] = allWords.map((word, idx) => ({
      id: `block-${idx}-${word}`,
      word,
    }));

    // Deterministic shuffle using a pseudo-random seed or Math.random
    const shuffled = [...createdBlocks].sort(() => Math.random() - 0.5);
    setShuffledBlocks(shuffled);

    // Sync selected block IDs if answer already contains words
    let initialAnswerWords: string[] = [];
    if (Array.isArray(answer)) {
      initialAnswerWords = answer;
    } else if (answer && typeof answer === 'object') {
      if (Array.isArray(answer.words)) initialAnswerWords = answer.words;
      else if (Array.isArray(answer.sequence)) initialAnswerWords = answer.sequence;
    }

    if (initialAnswerWords.length > 0) {
      const matchedIds: string[] = [];
      const availableBlocks = [...shuffled];

      for (const targetWord of initialAnswerWords) {
        const foundIndex = availableBlocks.findIndex((b) => b.word === targetWord && !matchedIds.includes(b.id));
        if (foundIndex !== -1) {
          matchedIds.push(availableBlocks[foundIndex].id);
        }
      }
      setSelectedBlockIds(matchedIds);
    } else {
      setSelectedBlockIds([]);
    }
    lastSoundRef.current = null;
  }, [content, correctAnswer, hasWordBlocks]);

  // Derive active answer words based on selectedBlockIds
  const currentAnswerWords: string[] = useMemo(() => {
    const idToBlockMap = new Map(shuffledBlocks.map((b) => [b.id, b.word]));
    return selectedBlockIds.map((id) => idToBlockMap.get(id) || '').filter(Boolean);
  }, [selectedBlockIds, shuffledBlocks]);

  // Handle selecting a block from Word Bank
  const handleSelectBlock = (block: WordBlock) => {
    if (isReadonly || selectedBlockIds.includes(block.id)) return;
    const nextBlockIds = [...selectedBlockIds, block.id];
    setSelectedBlockIds(nextBlockIds);

    const idToBlockMap = new Map(shuffledBlocks.map((b) => [b.id, b.word]));
    const nextWords = nextBlockIds.map((id) => idToBlockMap.get(id) || '').filter(Boolean);

    onChange({
      words: nextWords,
      sequence: nextWords,
      text: nextWords.join(' '),
    });
  };

  // Handle removing a block from the Answer Zone
  const handleRemoveBlockAt = (indexToRemove: number) => {
    if (isReadonly) return;
    const nextBlockIds = selectedBlockIds.filter((_, idx) => idx !== indexToRemove);
    setSelectedBlockIds(nextBlockIds);

    const idToBlockMap = new Map(shuffledBlocks.map((b) => [b.id, b.word]));
    const nextWords = nextBlockIds.map((id) => idToBlockMap.get(id) || '').filter(Boolean);

    onChange({
      words: nextWords,
      sequence: nextWords,
      text: nextWords.join(' '),
    });
  };

  // Clear / Reset All Selected Blocks
  const handleReset = () => {
    if (isReadonly) return;
    setSelectedBlockIds([]);
    onChange({
      words: [],
      sequence: [],
      text: '',
    });
    lastSoundRef.current = null;
  };

  // Evaluation Status in Training Mode
  const isTraining = examMode !== 'simulator';
  const hasAttempted = currentAnswerWords.length > 0;
  const isCompleteLength = correctSeq.length > 0 && currentAnswerWords.length === correctSeq.length;

  const isExactMatch = useMemo(() => {
    if (!hasAttempted || correctSeq.length === 0) return false;
    if (currentAnswerWords.length !== correctSeq.length) return false;
    return currentAnswerWords.every((w, idx) => w.trim() === correctSeq[idx]?.trim());
  }, [currentAnswerWords, correctSeq, hasAttempted]);

  // Audio Feedback in Training Mode when user reaches full sequence or changes answer
  useEffect(() => {
    if (!isTraining || !hasAttempted || correctSeq.length === 0) return;

    if (isCompleteLength) {
      if (isExactMatch && lastSoundRef.current !== 'correct') {
        playFeedbackSound('correct');
        lastSoundRef.current = 'correct';
      } else if (!isExactMatch && lastSoundRef.current !== 'incorrect') {
        playFeedbackSound('incorrect');
        lastSoundRef.current = 'incorrect';
      }
    }
  }, [isTraining, hasAttempted, isCompleteLength, isExactMatch, correctSeq.length]);

  // Fallback: Text Area for legacy or free-text explain questions without blocks
  if (!hasWordBlocks) {
    const rawText = typeof answer === 'string' ? answer : answer?.text || '';
    return (
      <div className="space-y-5" dir="rtl">
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-950 flex items-start gap-3 shadow-sm">
          <HelpCircle className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
              الظاهرة أو القضية المطلوب تعليلها:
            </div>
            <div className="text-base font-bold text-slate-800 leading-relaxed">{questionText}</div>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={rawText}
            onChange={(e) => !isReadonly && onChange({ text: e.target.value })}
            disabled={isReadonly}
            rows={5}
            placeholder="علل واذكر الأسباب العلمية والمنطقية بالتفصيل..."
            className="w-full p-4 border border-slate-300 rounded-2xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed text-base resize-none shadow-sm"
          />
          <div className="text-left text-xs text-slate-400 mt-1">{rawText.length} حرف</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2 sm:p-4 max-w-2xl mx-auto select-none" dir="rtl">
      {/* 1. Question Header Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-3">
        <Sparkles className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />
        <div className="flex-1">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-block">
            سؤال تعليل (علل) 🧠
          </span>
          <h3 className="text-base font-bold text-slate-800 mt-2.5 leading-relaxed">{questionText}</h3>
        </div>
      </div>

      {/* 2. Answer Zone (Drop / Constructed Answer) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-600">منطقة بناء التفسير العلمي:</span>
          {selectedBlockIds.length > 0 && !isReadonly && (
            <button
              onClick={handleReset}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              إعادة تعيين 🔄
            </button>
          )}
        </div>

        <div
          className={`min-h-[130px] rounded-2xl p-4 border-2 border-dashed transition-all duration-300 flex flex-wrap gap-2.5 items-start ${
            currentAnswerWords.length === 0
              ? 'bg-slate-50 border-slate-300 justify-center items-center'
              : isTraining && isCompleteLength && isExactMatch
              ? 'bg-emerald-50/80 border-emerald-400'
              : isTraining && isCompleteLength && !isExactMatch
              ? 'bg-rose-50/80 border-rose-400'
              : 'bg-indigo-50/40 border-indigo-300'
          }`}
        >
          {currentAnswerWords.length === 0 ? (
            <div className="text-center p-4">
              <span className="text-slate-400 text-sm font-medium block">
                انقر على المكعبات في الأسفل لبناء التفسير العلمي... 🧩
              </span>
            </div>
          ) : (
            currentAnswerWords.map((word, idx) => {
              // Highlight styling in training mode
              let blockStyle =
                'bg-white text-slate-800 border-slate-300 shadow-sm hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300';
              if (isTraining && isCompleteLength) {
                if (isExactMatch) {
                  blockStyle = 'bg-emerald-100 text-emerald-950 border-emerald-600 shadow-sm';
                } else {
                  blockStyle = 'bg-rose-100 text-rose-950 border-rose-600 shadow-sm';
                }
              }

              return (
                <button
                  key={`ans-block-${idx}`}
                  onClick={() => handleRemoveBlockAt(idx)}
                  disabled={isReadonly}
                  className={`h-11 px-4 rounded-xl font-bold text-sm sm:text-base border transition-all duration-150 active:translate-y-0.5 ${blockStyle}`}
                  style={{ borderBottomWidth: '4px' }}
                  title="انقر لإزالة المكعب"
                >
                  {word}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Training Mode Feedback Badge */}
      {isTraining && hasAttempted && (
        <div className="transition-all duration-300">
          {isCompleteLength ? (
            isExactMatch ? (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 flex items-center gap-2.5 text-sm font-bold animate-fadeIn">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>إجابة تعليل صحيحة ومكتملة! أحسنت! 👏</span>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 flex items-center gap-2.5 text-sm font-bold animate-fadeIn">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>التتابع غير صحيح، انقر على المكعبات لتعديل الترتيب! ❌</span>
              </div>
            )
          ) : (
            <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-indigo-900 text-xs font-semibold flex items-center justify-between">
              <span>اختر باقي المكعبات لإكمال التعبير التعليلي...</span>
              <span className="font-bold text-indigo-700">
                {currentAnswerWords.length} / {correctSeq.length || '?'} كلمة
              </span>
            </div>
          )}
        </div>
      )}

      {/* 4. Word Bank (سلة الكلمات) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        <p className="text-xs font-bold text-slate-500 text-center">
          سلة الكلمات (انقر للنقل إلى الإجابة):
        </p>

        <div className="flex flex-wrap gap-2.5 justify-center">
          {shuffledBlocks.map((block) => {
            const isUsed = selectedBlockIds.includes(block.id);

            return (
              <button
                key={block.id}
                onClick={() => handleSelectBlock(block)}
                disabled={isUsed || isReadonly}
                className={`h-11 px-4 rounded-xl font-bold text-sm sm:text-base transition-all duration-150 ${
                  isUsed
                    ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed opacity-40'
                    : 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 active:translate-y-0.5'
                }`}
                style={!isUsed && !isReadonly ? { borderBottom: '4px solid #3730A3' } : {}}
              >
                {block.word}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
