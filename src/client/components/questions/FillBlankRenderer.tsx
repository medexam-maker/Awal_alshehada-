import React, { useState } from 'react';
import { CheckCircle2, XCircle, Check, HelpCircle, Sparkles, Edit3 } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';

export function formatEasternArabicNumber(val: number | string): string {
  const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const cleaned = String(val).replace(/blank/gi, '').replace(/_/g, '').trim();
  const num = parseInt(cleaned, 10);
  if (!isNaN(num)) {
    return String(num).replace(/\d/g, (d) => easternDigits[parseInt(d, 10)]);
  }
  return String(val).replace(/blank/gi, '').replace(/\d/g, (d) => easternDigits[parseInt(d, 10)]);
}

interface BlankItem {
  id: string;
  choices?: string[];
  correctValue?: string;
  referenceAnswer?: string;
}

interface FillBlankProps {
  content: {
    prompt?: string;
    template?: string; // e.g. "عاصمة السودان هي {{1}} وتطل على نهر {{2}}"
    textWithBlanks?: string;
    wordBank?: string[];
    blanks?: BlankItem[];
    referenceAnswers?: Record<string, string>;
  };
  answer?: {
    answers?: Record<string, string>;
    blanks?: Record<string, string>;
    selfEvaluations?: Record<string, boolean>;
    confirmedBlanks?: Record<string, boolean>;
  };
  onChange: (ans: {
    answers: Record<string, string>;
    blanks: Record<string, string>;
    selfEvaluations?: Record<string, boolean>;
    confirmedBlanks?: Record<string, boolean>;
  }) => void;
  isReadonly?: boolean;
  examMode?: 'simulator' | 'training';
  trainingSubMode?: 'yearly' | 'curriculum_review' | 'weekly';
  isWeeklySimulation?: boolean;
  correctAnswer?: any;
}

export const FillBlankRenderer: React.FC<FillBlankProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  examMode = 'training',
  trainingSubMode,
  isWeeklySimulation = false,
  correctAnswer,
}) => {
  // CRITICAL ARCHITECTURAL BOUNDARY:
  // Immediate reveal and student self-assessment are STRICTLY restricted to Weekly Simulation.
  // Full comprehensive simulation, historical year exams, and training sets MUST NEVER expose reference answers.
  const isWeeklySimulationActive =
    examMode === 'simulator' &&
    (isWeeklySimulation === true || trainingSubMode === 'weekly');

  // Read existing answers or fallback
  const answersMap = answer?.answers || answer?.blanks || {};
  const selfEvals = answer?.selfEvaluations || {};
  const confirmedMap = answer?.confirmedBlanks || {};

  // Local state for free text input before clicking "تأكيد"
  const [localInput, setLocalInput] = useState<Record<string, string>>(() => {
    return { ...answersMap };
  });

  // Extract template/text
  const templateText = content.template || content.textWithBlanks || content.prompt || '';

  // Parse template into parts and identify blank tokens
  // Supports {{1}}, {{blank1}}, {1}, {blank1}, or explicit blanks array
  const tokenRegex = /({{\w+}}|{\w+}|____+)/g;
  const parts = templateText ? templateText.split(tokenRegex) : [templateText];

  // Derive blank IDs from tokens or content.blanks
  const blankDescriptors: Array<{ id: string; rawToken: string }> = [];
  let tokenCounter = 1;

  if (content.blanks && content.blanks.length > 0) {
    content.blanks.forEach((b) => {
      blankDescriptors.push({ id: b.id, rawToken: b.id });
    });
  } else {
    parts.forEach((part) => {
      if (part.match(tokenRegex)) {
        const cleanedId = part.replace(/[{}_]/g, '').trim() || String(tokenCounter);
        blankDescriptors.push({ id: cleanedId, rawToken: part });
        tokenCounter++;
      }
    });
    if (blankDescriptors.length === 0) {
      blankDescriptors.push({ id: '1', rawToken: '{{1}}' });
    }
  }

  // Resolve reference correct answer for a blank ID
  const getReferenceAnswer = (blankId: string): string => {
    // 1. Direct from content.referenceAnswers
    if (content.referenceAnswers && content.referenceAnswers[blankId]) {
      return content.referenceAnswers[blankId];
    }
    // 2. From content.blanks
    if (content.blanks) {
      const match = content.blanks.find(
        (b) => b.id === blankId || b.id === `{{${blankId}}}` || b.id === `{${blankId}}` || b.id === `blank${blankId}`
      );
      if (match?.correctValue) return match.correctValue;
      if (match?.referenceAnswer) return match.referenceAnswer;
    }
    // 3. From correctAnswer
    if (correctAnswer) {
      const caBlanks = correctAnswer.blanks || correctAnswer.answers || (typeof correctAnswer === 'object' ? correctAnswer : {});
      if (caBlanks[blankId]) return String(caBlanks[blankId]);
      if (caBlanks[`{{${blankId}}}`]) return String(caBlanks[`{{${blankId}}}`]);
      if (caBlanks[`{${blankId}}`]) return String(caBlanks[`{${blankId}}`]);
      if (caBlanks[`blank${blankId}`]) return String(caBlanks[`blank${blankId}`]);
    }
    return 'غير محدد';
  };

  // Derive exactly 3 choices for Training mode (tap_reveal_3)
  const getThreeChoices = (blankId: string): string[] => {
    if (content.blanks) {
      const match = content.blanks.find((b) => b.id === blankId);
      if (match?.choices && match.choices.length === 3) {
        return match.choices;
      }
    }
    const ref = getReferenceAnswer(blankId);
    const pool = content.wordBank || ['الخرطوم', 'الفاشر', 'كسلا', 'الأبيض', 'سنار', 'بورتسودان'];
    const distractors = pool.filter((w) => w !== ref);
    const d1 = distractors[0] || 'الخيار الأول';
    const d2 = distractors[1] || 'الخيار الثاني';
    return [ref, d1, d2].sort();
  };

  // Handler for text typing in Weekly Simulation
  const handleTextChange = (blankId: string, val: string) => {
    if (isReadonly) return;
    setLocalInput((prev) => ({ ...prev, [blankId]: val }));
    onChange({
      answers: { ...answersMap, [blankId]: val },
      blanks: { ...answersMap, [blankId]: val },
      selfEvaluations: { ...selfEvals },
      confirmedBlanks: { ...confirmedMap },
    });
  };

  // Handler for Confirming a Blank in Weekly Simulation
  const handleConfirmBlank = (blankId: string) => {
    if (isReadonly) return;
    const textVal = localInput[blankId] || answersMap[blankId] || '';
    if (!textVal.trim()) return;

    const nextAnswers = { ...answersMap, [blankId]: textVal.trim() };
    const nextConfirmed = { ...confirmedMap, [blankId]: true };

    onChange({
      answers: nextAnswers,
      blanks: nextAnswers,
      selfEvaluations: { ...selfEvals },
      confirmedBlanks: nextConfirmed,
    });
  };

  // Handler for Self-Evaluation ([نعم / لا])
  const handleSelfEvaluation = (blankId: string, isCorrect: boolean) => {
    if (isReadonly) return;
    const nextEvals = { ...selfEvals, [blankId]: isCorrect };
    onChange({
      answers: { ...answersMap },
      blanks: { ...answersMap },
      selfEvaluations: nextEvals,
      confirmedBlanks: { ...confirmedMap, [blankId]: true },
    });

    if (isCorrect) {
      playFeedbackSound('correct');
    } else {
      playFeedbackSound('incorrect');
    }
  };

  // Handler to Reopen/Edit a confirmed blank
  const handleReopenBlank = (blankId: string) => {
    if (isReadonly) return;
    const nextConfirmed = { ...confirmedMap };
    delete nextConfirmed[blankId];
    const nextEvals = { ...selfEvals };
    delete nextEvals[blankId];

    onChange({
      answers: { ...answersMap },
      blanks: { ...answersMap },
      selfEvaluations: nextEvals,
      confirmedBlanks: nextConfirmed,
    });
  };

  // Handler for tapping a choice in Training mode (tap_reveal_3)
  const handleSelectChoice = (blankId: string, choice: string) => {
    if (isReadonly) return;
    const nextAnswers = { ...answersMap, [blankId]: choice };
    onChange({
      answers: nextAnswers,
      blanks: nextAnswers,
    });

    if (examMode !== 'simulator') {
      const ref = getReferenceAnswer(blankId);
      if (choice === ref) {
        playFeedbackSound('correct');
      } else {
        playFeedbackSound('incorrect');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Passage / Template Card */}
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-lg leading-loose font-medium">
        {parts.map((part, idx) => {
          const isToken = part.match(tokenRegex);
          if (isToken) {
            const blankId = part.replace(/[{}_]/g, '').trim() || String(idx + 1);
            const displayNum = formatEasternArabicNumber(blankId || idx + 1);
            const val = answersMap[blankId] || localInput[blankId] || '';
            const isConfirmed = confirmedMap[blankId];
            const evalState = selfEvals[blankId];

            if (isWeeklySimulationActive) {
              // Weekly Simulation: Embedded preview of current answer with self-assessment status badge
              return (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1 mx-1.5 px-3 py-1 rounded-lg border-2 font-bold text-sm transition-all ${
                    isConfirmed
                      ? evalState === true
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-950'
                        : evalState === false
                          ? 'bg-rose-100 border-rose-500 text-rose-950'
                          : 'bg-amber-100 border-amber-400 text-amber-950'
                      : 'bg-white border-dashed border-emerald-400 text-slate-700'
                  }`}
                >
                  <span className="text-xs text-slate-400 font-normal">({displayNum})</span>
                  <span>{val || '___'}</span>
                  {isConfirmed && evalState === true && <Check className="w-3.5 h-3.5 text-emerald-600 inline" />}
                  {isConfirmed && evalState === false && <XCircle className="w-3.5 h-3.5 text-rose-600 inline" />}
                </span>
              );
            } else if (examMode === 'simulator') {
              // Standard Full Simulator (Blind zero-request, no reveal):
              return (
                <input
                  key={idx}
                  type="text"
                  value={val}
                  onChange={(e) => handleTextChange(blankId, e.target.value)}
                  disabled={isReadonly}
                  placeholder={`(${displayNum})`}
                  className="inline-block mx-2 px-3 py-1 w-36 text-center border-b-2 border-emerald-600 bg-white rounded-md shadow-inner text-emerald-950 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              );
            } else {
              // Training / Historical: tap_reveal_3 display
              return (
                <span
                  key={idx}
                  className="inline-block mx-2 px-3 py-1 min-w-[100px] text-center border-b-2 border-teal-600 bg-white rounded-md shadow-xs text-teal-950 font-bold"
                >
                  {val || `(${displayNum})`}
                </span>
              );
            }
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>

      {/* =================================================================== */}
      {/* 1. سياق المحاكاة الأسبوعية فقط: نص حر + تأكيد لكل فراغ + تقييم ذاتي [نعم/لا] */}
      {/* =================================================================== */}
      {isWeeklySimulationActive ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="text-sm font-black text-slate-800 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>إدخال الإجابة والتقييم الذاتي لكل فراغ على حدة:</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              اكتب إجابتك بحرية ثم اضغط تأكيد لعرض الإجابة النموذجية وتقييم إجابتك
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {blankDescriptors.map((bDesc, bIdx) => {
              const bId = bDesc.id;
              const displayNum = formatEasternArabicNumber(bId || bIdx + 1);
              const currentText = localInput[bId] ?? answersMap[bId] ?? '';
              const isConfirmed = Boolean(confirmedMap[bId]);
              const refAnswer = getReferenceAnswer(bId);
              const evalState = selfEvals[bId];

              return (
                <div
                  key={bDesc.id}
                  className={`p-5 rounded-2xl border-2 transition-all space-y-4 ${
                    isConfirmed
                      ? evalState === true
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : evalState === false
                          ? 'bg-rose-50/60 border-rose-300'
                          : 'bg-amber-50/50 border-amber-300'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  {/* Blank Title & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                        {displayNum}
                      </div>
                      <span className="font-extrabold text-sm text-slate-900">
                        الفراغ ({displayNum})
                      </span>
                    </div>

                    {isConfirmed && evalState !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${
                            evalState === true
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {evalState === true ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تقييمك: صحيحة</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>تقييمك: غير صحيحة</span>
                            </>
                          )}
                        </span>

                        {!isReadonly && (
                          <button
                            type="button"
                            onClick={() => handleReopenBlank(bId)}
                            className="p-1 hover:bg-slate-200/70 text-slate-500 rounded-md transition-colors cursor-pointer"
                            title="تعديل الإجابة وإعادة التقييم"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Free Text Input Row */}
                  {!isConfirmed ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="text"
                        value={currentText}
                        onChange={(e) => handleTextChange(bId, e.target.value)}
                        disabled={isReadonly}
                        placeholder="اكتب إجابتك هنا (نص حر)..."
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-base"
                      />
                      <button
                        type="button"
                        onClick={() => handleConfirmBlank(bId)}
                        disabled={isReadonly || !currentText.trim()}
                        className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>تأكيد الفراغ ({displayNum})</span>
                      </button>
                    </div>
                  ) : (
                    /* Confirmed State: Reveal Reference Answer + Self-Assessment Question [نعم / لا] */
                    <div className="space-y-4 pt-1 animate-in fade-in duration-300">
                      {/* Comparison Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 block">
                            إجابتك المسجلة:
                          </span>
                          <span className="text-base font-extrabold text-slate-900">
                            {currentText}
                          </span>
                        </div>

                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                          <span className="text-[11px] font-bold text-emerald-800 block">
                            الإجابة الصحيحة المرجعية لهذا الفراغ:
                          </span>
                          <span className="text-base font-black text-emerald-950">
                            {refAnswer}
                          </span>
                        </div>
                      </div>

                      {/* Direct Self-Assessment Prompt: "هل كانت إجابتك صحيحة؟" */}
                      <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                          <HelpCircle className="w-4 h-4 text-emerald-400" />
                          <span>سؤال التقييم الذاتي: هل كانت إجابتك صحيحة؟</span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <button
                            type="button"
                            disabled={isReadonly}
                            onClick={() => handleSelfEvaluation(bId, true)}
                            className={`flex-1 w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                              evalState === true
                                ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 shadow-md'
                                : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>نعم (إجابتي صحيحة)</span>
                          </button>

                          <button
                            type="button"
                            disabled={isReadonly}
                            onClick={() => handleSelfEvaluation(bId, false)}
                            className={`flex-1 w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                              evalState === false
                                ? 'bg-rose-600 text-white ring-2 ring-rose-300 shadow-md'
                                : 'bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                            <span>لا (إجابتي غير صحيحة)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* وضعا التدريب والامتحانات التاريخية: 3 خيارات لكل فراغ (tap_reveal_3) */
        /* =================================================================== */
        <div className="space-y-4">
          <div className="flex flex-col gap-2 pb-4">
            <div className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>اختر الكلمة المناسبة لكل فراغ:</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
              تنبيه : في الامتحان الحقيقي لاتوجد خيارات لملء الفراغات ، الخيارات هنا فقط لمساعدتك علي الحفظ
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {blankDescriptors.map((bDesc, bIdx) => {
              const bId = bDesc.id;
              const displayNum = formatEasternArabicNumber(bId || bIdx + 1);
              const currentChoice = answersMap[bId] || '';
              const choices = getThreeChoices(bId);

              return (
                <div key={bDesc.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                      {displayNum}
                    </span>
                    <span className="font-bold text-xs text-slate-800">
                      خيارات الفراغ ({displayNum}):
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {choices.map((choice, cIdx) => {
                      const isSelected = currentChoice === choice;
                      const refAnswer = getReferenceAnswer(bId);
                      const isImmediateReveal = examMode !== 'simulator';

                      const isCorrectChoice = isImmediateReveal && isSelected && currentChoice === refAnswer;
                      const isIncorrectChoice = isImmediateReveal && isSelected && currentChoice !== refAnswer;
                      const isActualCorrectChoice = isImmediateReveal && currentChoice !== '' && choice === refAnswer;

                      return (
                        <button
                          key={cIdx}
                          type="button"
                          disabled={isReadonly}
                          onClick={() => handleSelectChoice(bId, choice)}
                          className={`p-3 rounded-xl border-2 text-center text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                            isCorrectChoice || isActualCorrectChoice
                              ? 'border-emerald-600 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-500/20 shadow-sm'
                              : isIncorrectChoice
                              ? 'border-rose-600 bg-rose-100 text-rose-950 ring-2 ring-rose-500/20 shadow-sm'
                              : isSelected
                              ? 'border-teal-600 bg-teal-50 text-teal-950 ring-2 ring-teal-600/20 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-800'
                          }`}
                        >
                          <span>{choice}</span>
                          {isIncorrectChoice && <span className="text-rose-600 text-sm font-black">✕</span>}
                          {(isCorrectChoice || isActualCorrectChoice) && <span className="text-emerald-600 text-sm font-black">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
