import React, { useState, useEffect } from 'react';
import { Calculator, CheckCircle2, AlertCircle, Lock, Edit3 } from 'lucide-react';
import { MathView } from '../common/MathView';
import { MultiStepCalculationContent, MultiStepCalculationStudentAnswer } from '../../../shared/types';

interface MultiStepCalculationProps {
  content: MultiStepCalculationContent;
  answer?: MultiStepCalculationStudentAnswer | Record<string, any>;
  onChange: (ans: MultiStepCalculationStudentAnswer) => void;
  isReadonly?: boolean;
  examMode?: 'training' | 'simulator';
  attemptId?: string;
  attemptQuestionId?: string;
  correctAnswer?: any; // Only available in offline training package or post-exam review
  explanation?: string;
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
  explanation
}) => {
  // Extract step_answers map { [stepId]: selectedOptionId }
  const rawStepAnswers = (answer?.step_answers || (typeof answer === 'object' && answer !== null && !('value' in answer) ? answer : {})) as Record<string, string>;
  const [localChoices, setLocalChoices] = useState<Record<string, string>>(rawStepAnswers || {});
  
  // Committed steps from server (in connected training)
  const [committedSteps, setCommittedSteps] = useState<Record<string, { isCorrect: boolean; awardedMarks: number; selectedOptionId: string }>>({});
  const [commitLoading, setCommitLoading] = useState<Record<string, boolean>>({});
  const [commitError, setCommitError] = useState<string | null>(null);

  // Scratchpad
  const [showScratchpad, setShowScratchpad] = useState<boolean>(false);
  const [scratchpadText, setScratchpadText] = useState<string>('');

  const steps = Array.isArray(content.steps) ? content.steps : [];
  const isSimulation = examMode === 'simulator';

  // Sync incoming answer
  useEffect(() => {
    if (answer && typeof answer === 'object') {
      const incoming = (answer.step_answers || answer) as Record<string, string>;
      if (incoming && typeof incoming === 'object' && !('value' in incoming)) {
        setLocalChoices((prev) => ({ ...prev, ...incoming }));
      }
    }
  }, [answer]);

  // Load already committed steps if in connected training mode
  useEffect(() => {
    if (!isSimulation && attemptId && attemptQuestionId) {
      fetch(`/api/exam/attempts/${attemptId}/questions/${attemptQuestionId}/steps`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            const map: Record<string, { isCorrect: boolean; awardedMarks: number; selectedOptionId: string }> = {};
            const choicesMap: Record<string, string> = {};
            data.data.forEach((item: any) => {
              map[item.stepId] = {
                isCorrect: item.isCorrect,
                awardedMarks: item.awardedMarks,
                selectedOptionId: item.selectedOptionId
              };
              choicesMap[item.stepId] = item.selectedOptionId;
            });
            setCommittedSteps(map);
            setLocalChoices((prev) => ({ ...prev, ...choicesMap }));
          }
        })
        .catch((err) => console.warn('[MultiStep] Failed to fetch committed steps:', err));
    }
  }, [isSimulation, attemptId, attemptQuestionId]);

  const handleSelectOption = async (stepId: string, optionId: string) => {
    if (isReadonly || committedSteps[stepId]) return;

    const updated = { ...localChoices, [stepId]: optionId };
    setLocalChoices(updated);
    onChange({ step_answers: updated });

    // In Connected Training mode, attempt atomic commitment to server
    if (!isSimulation && attemptId && attemptQuestionId) {
      setCommitLoading((prev) => ({ ...prev, [stepId]: true }));
      setCommitError(null);

      try {
        const response = await fetch(
          `/api/exam/attempts/${attemptId}/questions/${attemptQuestionId}/steps/${stepId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({ selectedOptionId: optionId })
          }
        );

        const resData = await response.json();

        if (response.ok && (resData.status === 'committed' || resData.status === 'already_committed')) {
          setCommittedSteps((prev) => ({
            ...prev,
            [stepId]: {
              isCorrect: resData.data.isCorrect,
              awardedMarks: resData.data.awardedMarks,
              selectedOptionId: resData.data.selectedOptionId
            }
          }));
        } else if (response.status === 409) {
          setCommitError('تم قفل الخطوة بإجابة سابقة ولا يمكن تعديلها.');
        } else {
          setCommitError(resData.error?.message || 'تعذر اعتماد الخطوة في الخادم');
        }
      } catch {
        // Network drop during training: keep choice saved locally
        console.warn('[MultiStep] Network error committing step; preserved locally.');
      } finally {
        setCommitLoading((prev) => ({ ...prev, [stepId]: false }));
      }
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Problem Scenario / Main Prompt */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        <div className="text-slate-900 text-base font-semibold leading-relaxed">
          <MathView text={content.prompt} />
        </div>

        {content.scenario && (
          <div className="text-sm text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
            <MathView text={content.scenario} />
          </div>
        )}

        {/* Given Values & Constants */}
        {((content.given_values && Object.keys(content.given_values).length > 0) ||
          (content.constants && Object.keys(content.constants).length > 0)) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
            {content.given_values &&
              Object.entries(content.given_values).map(([k, v]) => (
                <span
                  key={k}
                  className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-mono"
                >
                  <MathView text={`${k} = ${v}`} />
                </span>
              ))}
            {content.constants &&
              Object.entries(content.constants).map(([k, v]) => (
                <span
                  key={k}
                  className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-mono"
                >
                  <MathView text={`${k} = ${v}`} />
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Draft / Scratchpad Button */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => setShowScratchpad(!showScratchpad)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>{showScratchpad ? 'إخفاء المسودة' : 'المسودة الحسابية'}</span>
        </button>

        {commitError && (
          <span className="text-xs text-red-600 font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {commitError}
          </span>
        )}
      </div>

      {/* Expandable Scratchpad */}
      {showScratchpad && (
        <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-2">
          <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-amber-700" />
            <span>مسودة للعمليات الحسابية وتجربة القوانين (لا تُحسب في التقييم):</span>
          </label>
          <textarea
            value={scratchpadText}
            onChange={(e) => setScratchpadText(e.target.value)}
            rows={3}
            placeholder="اكتب خطواتك الحسابية أو ملاحظاتك هنا..."
            className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      )}

      {/* Steps List */}
      <div className="space-y-6">
        {steps.map((step, stepIndex) => {
          const stepId = step.id;
          const selectedOptionId = localChoices[stepId];
          const isCommitted = Boolean(committedSteps[stepId]);
          const commitInfo = committedSteps[stepId];
          const isLoading = Boolean(commitLoading[stepId]);

          return (
            <div
              key={stepId}
              className={`p-4 rounded-2xl border transition-all ${
                isCommitted
                  ? 'bg-slate-50/70 border-slate-300 shadow-xs'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {/* Step Header */}
              <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                    {step.order || stepIndex + 1}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    <MathView text={step.prompt} />
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                    {step.marks} {step.marks === 1 ? 'درجة' : 'درجات'}
                  </span>
                  {isCommitted && (
                    <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>معتمدة</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Step Options (MCQ) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(step.options || []).map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  const disabled = isReadonly || isCommitted || isLoading;

                  let cardStyle = 'border-slate-200 hover:border-emerald-300 bg-white text-slate-800';
                  if (isSelected) {
                    if (isCommitted) {
                      cardStyle = commitInfo?.isCorrect
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500'
                        : 'border-amber-500 bg-amber-50/70 text-amber-950 ring-1 ring-amber-500';
                    } else {
                      cardStyle = 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600';
                    }
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleSelectOption(stepId, opt.id)}
                      className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between gap-2 ${cardStyle} ${
                        disabled ? 'cursor-default' : 'cursor-pointer'
                      }`}
                    >
                      <div className="text-sm font-medium">
                        <MathView text={opt.label} />
                      </div>

                      {isSelected && (
                        <div className="flex-shrink-0">
                          {isCommitted ? (
                            commitInfo?.isCorrect ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                            )
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Connected Training Feedback (after commit) */}
              {isCommitted && commitInfo && (
                <div
                  className={`mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between ${
                    commitInfo.isCorrect
                      ? 'bg-emerald-100/60 text-emerald-900 border border-emerald-200'
                      : 'bg-amber-100/60 text-amber-900 border border-amber-200'
                  }`}
                >
                  <span className="font-semibold">
                    {commitInfo.isCorrect
                      ? 'إجابة صحيحة! تم تسجيل الدرجة الكاملة للخطوة.'
                      : commitInfo.awardedMarks > 0
                      ? `تم منحك درجة جزئية مشروطة (${commitInfo.awardedMarks} من ${step.marks}) نظير الخطوات السابقة.`
                      : 'إجابة غير دقيقة لهذه الخطوة.'}
                  </span>
                  <span className="font-bold">
                    +{commitInfo.awardedMarks} {commitInfo.awardedMarks === 1 ? 'درجة' : 'درجات'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Post-Exam Solution Guide / Review */}
      {isReadonly && (explanation || content.solution_guide) && (
        <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2 mt-6">
          <h4 className="text-sm font-bold text-emerald-950">دليل الحل والشرح النموذجي للمسألة:</h4>
          <div className="text-xs text-emerald-900 leading-relaxed">
            <MathView text={explanation || content.solution_guide || ''} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiStepCalculationRenderer;
