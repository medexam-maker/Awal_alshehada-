import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { MathView } from '../common/MathView';
import { ThreeDIcon } from '../common/ThreeDIcon';
import { MultiStepCalculationContent, MultiStepCalculationStudentAnswer } from '../../../shared/types';
import {
  playClick,
  playScratchpad,
  playSuccess,
  playPartial,
  playError,
} from '../../utils/soundEffects';
import { playFeedbackSound } from '../../utils/soundManager';

interface MultiStepCalculationProps {
  content: MultiStepCalculationContent;
  answer?: MultiStepCalculationStudentAnswer | Record<string, any>;
  onChange: (ans: MultiStepCalculationStudentAnswer) => void;
  isReadonly?: boolean;
  examMode?: 'training' | 'simulator';
  attemptId?: string;
  attemptQuestionId?: string;
  correctAnswer?: any;
  explanation?: string;
}

interface StepFeedbackState {
  isEvaluated: boolean;
  isCorrect: boolean;
  isConditional: boolean;
  awardedMarks: number;
  maxMarks: number;
  canonicalOptionId: string;
  selectedOptionId: string;
  ruleDescription?: string;
}

export const MultiStepCalculationRenderer: React.FC<MultiStepCalculationProps> = ({
  content,
  answer,
  onChange,
  isReadonly = false,
  examMode = 'simulator',
  attemptId,
  attemptQuestionId,
  correctAnswer,
  explanation,
}) => {
  // Extract step_answers map { [stepId]: selectedOptionId }
  const rawStepAnswers = useMemo(() => {
    return (answer?.step_answers ||
      (typeof answer === 'object' && answer !== null && !('value' in answer) ? answer : {})) as Record<
      string,
      string
    >;
  }, [answer]);

  const [localChoices, setLocalChoices] = useState<Record<string, string>>(rawStepAnswers || {});

  // Committed steps from server (in connected training)
  const [committedSteps, setCommittedSteps] = useState<
    Record<
      string,
      {
        isCorrect: boolean;
        awardedMarks: number;
        selectedOptionId: string;
        canonicalOptionId?: string;
        matchedRuleId?: string;
      }
    >
  >({});
  const [commitLoading, setCommitLoading] = useState<Record<string, boolean>>({});
  const [commitError, setCommitError] = useState<string | null>(null);

  // Immediate Training Feedback state per step
  const [trainingFeedback, setTrainingFeedback] = useState<Record<string, StepFeedbackState>>({});
  const [revealedStepHints, setRevealedStepHints] = useState<Record<string, boolean>>({});

  // Scratchpad
  const [showScratchpad, setShowScratchpad] = useState<boolean>(false);
  const [scratchpadText, setScratchpadText] = useState<string>('');

  const steps = useMemo(() => (Array.isArray(content.steps) ? content.steps : []), [content.steps]);
  const isTraining = examMode === 'training';

  // Helper to resolve canonical option ID for a step
  const getCanonicalOptionId = (stepId: string): string | undefined => {
    // 1. From server committed record
    if (committedSteps[stepId]?.canonicalOptionId) {
      return committedSteps[stepId].canonicalOptionId;
    }
    // 2. From correctAnswer prop
    if (correctAnswer) {
      const stepAnswers = correctAnswer.step_answers || correctAnswer;
      const stepConf = stepAnswers[stepId];
      if (typeof stepConf === 'string') return stepConf;
      if (stepConf?.canonical_option_id) return stepConf.canonical_option_id;
      if (stepConf?.correctOptionId) return stepConf.correctOptionId;
    }
    // 3. Fallback: Check step options
    const targetStep = steps.find((s) => s.id === stepId);
    if (targetStep?.options) {
      const canonicalOpt = targetStep.options.find(
        (o: any) => o.is_correct || o.is_canonical || o.correct === true
      );
      if (canonicalOpt) return canonicalOpt.id;
    }
    return undefined;
  };

  // Sync incoming answer
  useEffect(() => {
    if (answer && typeof answer === 'object') {
      const incoming = (answer.step_answers || answer) as Record<string, string>;
      if (incoming && typeof incoming === 'object' && !('value' in incoming)) {
        setLocalChoices((prev) => ({ ...prev, ...incoming }));

        // Pre-evaluate training feedback locally for incoming choices
        if (isTraining) {
          const fbMap: Record<string, StepFeedbackState> = {};
          steps.forEach((s) => {
            const chosen = incoming[s.id];
            if (chosen) {
              fbMap[s.id] = evaluateStepLocally(s.id, chosen, incoming);
            }
          });
          if (Object.keys(fbMap).length > 0) {
            setTrainingFeedback((prev) => ({ ...prev, ...fbMap }));
          }
        }
      }
    }
  }, [answer, isTraining, steps]);

  // Local immediate evaluation engine for instant feedback (Training Mode)
  const evaluateStepLocally = (
    stepId: string,
    optionId: string,
    currentChoices: Record<string, string>
  ): StepFeedbackState => {
    const targetStep = steps.find((s) => s.id === stepId);
    const maxMarks = targetStep?.marks || 2;
    const canonicalId = getCanonicalOptionId(stepId) || '';

    // 1. Direct canonical match
    if (canonicalId && optionId === canonicalId) {
      return {
        isEvaluated: true,
        isCorrect: true,
        isConditional: false,
        awardedMarks: maxMarks,
        maxMarks,
        canonicalOptionId: canonicalId,
        selectedOptionId: optionId,
      };
    }

    // 2. Check conditional credit rules
    const rules = Array.isArray(correctAnswer?.conditional_credit_rules)
      ? correctAnswer.conditional_credit_rules
      : [];

    const matchingRule = rules.find((r: any) => {
      if (r.target_step_id !== stepId) return false;
      if (r.awarded_option_id !== optionId) return false;
      const prereqStep = r.prerequisite_step_id;
      const prereqOption = r.prerequisite_option_id;
      return currentChoices[prereqStep] === prereqOption;
    });

    if (matchingRule) {
      const frac = Math.min(1.0, Math.max(0.0, Number(matchingRule.credit_fraction) || 0));
      const awarded = Math.round(frac * maxMarks * 100) / 100;
      return {
        isEvaluated: true,
        isCorrect: frac === 1.0,
        isConditional: frac < 1.0 && frac > 0,
        awardedMarks: awarded,
        maxMarks,
        canonicalOptionId: canonicalId,
        selectedOptionId: optionId,
        ruleDescription: matchingRule.description,
      };
    }

    // 3. Incorrect option
    return {
      isEvaluated: true,
      isCorrect: false,
      isConditional: false,
      awardedMarks: 0,
      maxMarks,
      canonicalOptionId: canonicalId,
      selectedOptionId: optionId,
    };
  };

  const handleSelectOption = (stepId: string, optionId: string) => {
    if (isReadonly) return;

    const updated = { ...localChoices, [stepId]: optionId };
    setLocalChoices(updated);
    onChange({ step_answers: updated });

    if (isTraining) {
      // Immediate 100% local evaluation - Zero server requests
      const localEval = evaluateStepLocally(stepId, optionId, updated);
      setTrainingFeedback((prev) => ({ ...prev, [stepId]: localEval }));

      // Immediate Audio Synthesizer Trigger
      if (localEval.isCorrect) {
        playSuccess();
        playFeedbackSound('correct');
      } else if (localEval.isConditional) {
        playPartial();
      } else {
        playError();
        playFeedbackSound('incorrect');
      }
    } else {
      // Simulator mode: pure tactile click sound, no answers revealed
      playClick();
    }
  };

  const toggleScratchpad = () => {
    playScratchpad();
    setShowScratchpad(!showScratchpad);
  };

  const toggleStepHint = (stepId: string) => {
    playClick();
    setRevealedStepHints((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 3D Problem Scenario Banner */}
      <div className="relative overflow-hidden p-5 md:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 border border-slate-700 rounded-3xl shadow-xl text-white">
        {/* Subtle Decorative Ambient Glow */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 shadow-inner shrink-0">
              <ThreeDIcon type="3d-calculator" size={48} />
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-xl text-xs font-extrabold">
                  مسألة حسابية متعددة الخطوات (النمط ٧)
                </span>
                {isTraining && (
                  <span className="px-3 py-1 bg-amber-400/20 text-amber-200 border border-amber-300/30 rounded-xl text-xs font-bold animate-pulse">
                    التصحيح الفوري مُفعّل
                  </span>
                )}
              </div>
              <h3 className="text-lg md:text-xl font-black text-white leading-relaxed">
                <MathView text={content.prompt} />
              </h3>
            </div>
          </div>

          {content.scenario && (
            <div className="p-3.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl text-slate-200 text-sm leading-relaxed">
              <MathView text={content.scenario} />
            </div>
          )}

          {/* Given Values & Constants with 3D Pills */}
          {((content.given_values && Object.keys(content.given_values).length > 0) ||
            (content.constants && Object.keys(content.constants).length > 0)) && (
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-white/10">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                المعطيات والثوابت:
              </span>
              {content.given_values &&
                Object.entries(content.given_values).map(([k, v]) => (
                  <span
                    key={k}
                    className="px-3 py-1.5 bg-blue-500/20 border border-blue-400/40 text-blue-200 rounded-xl text-xs font-mono font-bold shadow-xs"
                  >
                    <MathView text={`${k} = ${v}`} />
                  </span>
                ))}
              {content.constants &&
                Object.entries(content.constants).map(([k, v]) => (
                  <span
                    key={k}
                    className="px-3 py-1.5 bg-amber-500/20 border border-amber-400/40 text-amber-200 rounded-xl text-xs font-mono font-bold shadow-xs"
                  >
                    <MathView text={`${k} = ${v}`} />
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Action Bar (Scratchpad Toggle & Error Warnings) */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <button
          type="button"
          onClick={toggleScratchpad}
          className="flex items-center gap-2 px-4 py-2 text-xs font-extrabold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-2xl shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <ThreeDIcon type="3d-pencil" size={22} />
          <span>{showScratchpad ? 'إغلاق المسودة الحسابية' : 'فتح المسودة الحسابية (للتجربة والقوانين)'}</span>
        </button>

        {commitError && (
          <span className="text-xs text-rose-600 font-bold flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
            <AlertCircle className="w-4 h-4" />
            {commitError}
          </span>
        )}
      </div>

      {/* Expandable 3D Scratchpad */}
      {showScratchpad && (
        <div className="p-4 bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-3xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-amber-950 flex items-center gap-2">
              <ThreeDIcon type="3d-pencil" size={24} />
              <span>مساحة المسودة والخطوات الحسابية (لا تُحسب في التقييم):</span>
            </label>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">
              خاصة بالطالب
            </span>
          </div>
          <textarea
            value={scratchpadText}
            onChange={(e) => setScratchpadText(e.target.value)}
            rows={3}
            placeholder="اكتب معادلاتك الرياضية أو حساباتك المؤقتة هنا بحرية..."
            className="w-full p-3 bg-white border border-amber-300 rounded-2xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner"
          />
        </div>
      )}

      {/* Ordered Steps List */}
      <div className="space-y-6">
        {steps.map((step, stepIndex) => {
          const stepId = step.id;
          const selectedOptionId = localChoices[stepId];
          const isCommitted = Boolean(committedSteps[stepId]);
          const commitInfo = committedSteps[stepId];
          const isLoading = Boolean(commitLoading[stepId]);

          // Training feedback resolution
          const fb = trainingFeedback[stepId];
          const isAnsweredInTraining = isTraining && Boolean(selectedOptionId && fb?.isEvaluated);
          const canonicalId = fb?.canonicalOptionId || getCanonicalOptionId(stepId);

          return (
            <div
              key={stepId}
              className={`p-5 rounded-3xl border-2 transition-all duration-200 ${
                isAnsweredInTraining
                  ? fb?.isCorrect
                    ? 'bg-emerald-50/40 border-emerald-300 shadow-md ring-1 ring-emerald-400/30'
                    : fb?.isConditional
                    ? 'bg-amber-50/40 border-amber-300 shadow-md ring-1 ring-amber-400/30'
                    : 'bg-rose-50/30 border-rose-300 shadow-md ring-1 ring-rose-400/30'
                  : isCommitted
                  ? 'bg-slate-50/80 border-slate-300 shadow-xs'
                  : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
              }`}
            >
              {/* Step Header */}
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {/* 3D Styled Step Medal */}
                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 text-white font-black text-sm flex items-center justify-center shadow-md border-2 border-emerald-200">
                    {step.order || stepIndex + 1}
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                    <MathView text={step.prompt} />
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-extrabold px-3 py-1 bg-slate-100 text-slate-700 rounded-xl border border-slate-200 shadow-xs">
                    <ThreeDIcon type="3d-trophy" size={16} />
                    <span>
                      {step.marks} {step.marks === 1 ? 'درجة' : 'درجات'}
                    </span>
                  </span>

                  {isCommitted && (
                    <span className="text-xs font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-xl flex items-center gap-1 border border-emerald-200 shadow-xs">
                      <ThreeDIcon type="3d-lock" size={15} />
                      <span>معتمدة</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Step Options (MCQ Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(step.options || []).map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  const isCanonical = canonicalId === opt.id;
                  const disabled = isReadonly || isCommitted || isLoading;

                  // High-fidelity 3D Card Styling based on Instant Feedback
                  let cardBorder = 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm text-slate-800';
                  let badgeIcon: React.ReactNode = null;

                  if (isTraining && fb?.isEvaluated) {
                    if (isSelected) {
                      if (fb.isCorrect) {
                        cardBorder =
                          'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/70 text-emerald-950 font-bold ring-2 ring-emerald-500 shadow-md';
                        badgeIcon = <ThreeDIcon type="3d-check" size={26} />;
                      } else if (fb.isConditional) {
                        cardBorder =
                          'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100/70 text-amber-950 font-bold ring-2 ring-amber-500 shadow-md';
                        badgeIcon = <ThreeDIcon type="3d-sparkles" size={26} />;
                      } else {
                        cardBorder =
                          'border-rose-500 bg-gradient-to-br from-rose-50 to-rose-100/70 text-rose-950 font-bold ring-2 ring-rose-500 shadow-md';
                        badgeIcon = <ThreeDIcon type="3d-cross" size={26} />;
                      }
                    } else if (isCanonical && !fb.isCorrect) {
                      // Prominently highlight the canonical correct option when the student picked wrong!
                      cardBorder =
                        'border-emerald-500 bg-emerald-50/90 text-emerald-950 font-bold ring-2 ring-emerald-400 shadow-sm';
                      badgeIcon = (
                        <div className="flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-xs">
                          <ThreeDIcon type="3d-check" size={18} />
                          <span>الإجابة النموذجية</span>
                        </div>
                      );
                    }
                  } else if (isSelected) {
                    cardBorder =
                      'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600 font-bold shadow-sm';
                    badgeIcon = (
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-xs" />
                    );
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSelectOption(stepId, opt.id)}
                      className={`p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between gap-3 ${cardBorder} ${
                        disabled ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'
                      }`}
                    >
                      <div className="text-sm md:text-base font-semibold leading-relaxed">
                        <MathView text={opt.label} />
                      </div>

                      {badgeIcon && <div className="shrink-0">{badgeIcon}</div>}
                    </button>
                  );
                })}
              </div>

              {/* Immediate Training Feedback Banner (revealed upon selection) */}
              {isAnsweredInTraining && fb && (
                <div
                  className={`mt-4 p-4 rounded-2xl border text-xs space-y-2 animate-in fade-in duration-200 ${
                    fb.isCorrect
                      ? 'bg-emerald-100/80 text-emerald-950 border-emerald-300'
                      : fb.isConditional
                      ? 'bg-amber-100/80 text-amber-950 border-amber-300'
                      : 'bg-rose-100/80 text-rose-950 border-rose-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-black text-sm">
                      {fb.isCorrect ? (
                        <>
                          <ThreeDIcon type="3d-check" size={24} />
                          <span>إجابة صحيحة ومتقنة!</span>
                        </>
                      ) : fb.isConditional ? (
                        <>
                          <ThreeDIcon type="3d-sparkles" size={24} />
                          <span>استحقاق جزئي مشروط (بناءً على الخطوة السابقة)!</span>
                        </>
                      ) : (
                        <>
                          <ThreeDIcon type="3d-cross" size={24} />
                          <span>إجابة غير صحيحة لهذه الخطوة</span>
                        </>
                      )}
                    </div>

                    <span className="font-extrabold text-sm px-2.5 py-1 rounded-xl bg-white/70 shadow-xs">
                      +{fb.awardedMarks} من {fb.maxMarks} {fb.maxMarks === 1 ? 'درجة' : 'درجات'}
                    </span>
                  </div>

                  {/* Feedback Explanation Details */}
                  <div className="pt-1 text-xs leading-relaxed text-slate-800">
                    {fb.isCorrect && (
                      <p>
                        أحسنت! تم تطبيق القاعدة الحسابية واستنتاج القيمة الدقيقة بنجاح.
                      </p>
                    )}
                    {fb.isConditional && (
                      <p>
                        {fb.ruleDescription ||
                          'تم احتساب صحة المنهج الرياضي في هذه الخطوة مع مراعاة الخطأ المتراكم من الخطوة السابقة لتفادي المعاقبة المزدوجة.'}
                      </p>
                    )}
                    {!fb.isCorrect && !fb.isConditional && (
                      <p>
                        الإجابة الصحيحة النموذجية هي الموضحة بالأعلى باللون الأخضر. تفقد خطوات الاشتقاق والتعويض.
                      </p>
                    )}
                  </div>

                  {/* Step Hint / Explanation Toggle */}
                  {(step.hint || step.explanation) && (
                    <div className="pt-2 border-t border-black/10">
                      <button
                        type="button"
                        onClick={() => toggleStepHint(stepId)}
                        className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>
                          {revealedStepHints[stepId] ? 'إخفاء شرح الخطوة' : 'عرض شرح وقاعدة هذه الخطوة'}
                        </span>
                        {revealedStepHints[stepId] ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {revealedStepHints[stepId] && (
                        <div className="mt-2 p-3 bg-white/80 rounded-xl border border-slate-200 text-slate-800 text-xs leading-relaxed">
                          <MathView text={step.explanation || step.hint || ''} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Comprehensive Solution Guide (in Training Mode when steps answered or in Review) */}
      {(content.solution_guide || explanation) && (
        <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-50 border-2 border-emerald-300 rounded-3xl space-y-3 shadow-md mt-6">
          <div className="flex items-center gap-3">
            <ThreeDIcon type="3d-bulb" size={32} />
            <div>
              <h4 className="text-base font-black text-emerald-950">
                الدليل النموذجي والشرح الرياضي الشامل للمسألة:
              </h4>
              <p className="text-xs text-emerald-800 font-medium">
                خطوات الحل التفصيلية وفق المنهج السوداني المعتمد
              </p>
            </div>
          </div>
          <div className="p-4 bg-white/90 backdrop-blur-xs rounded-2xl border border-emerald-200 text-sm text-slate-900 leading-relaxed font-medium shadow-inner">
            <MathView text={content.solution_guide || explanation || ''} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiStepCalculationRenderer;
