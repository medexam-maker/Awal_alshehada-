import React, { useState, useMemo } from 'react';
import { PlusCircle, Trash2, CheckCircle2, ShieldCheck, Calculator, Eye, AlertCircle } from 'lucide-react';
import { MathView } from '../common/MathView';
import { CalculationStep, ConditionalCreditRule } from '../../../shared/types';
import { buildCanonicalAssessmentPayload, toCanonicalJsonString } from '../../../shared/canonicalHash';

interface Pattern7AuthoringFormProps {
  initialPrompt?: string;
  initialMarks?: number;
  initialSteps?: CalculationStep[];
  initialRules?: ConditionalCreditRule[];
  initialScenario?: string;
  initialGivenValues?: Record<string, string>;
  initialConstants?: Record<string, string>;
  initialSolutionGuide?: string;
  canonicalOptionMap?: Record<string, string>;
  onChange: (data: {
    prompt: string;
    scenario: string;
    given_values: Record<string, string>;
    constants: Record<string, string>;
    steps: CalculationStep[];
    solution_guide: string;
    step_answers: Record<string, { canonical_option_id: string; marks: number }>;
    conditional_credit_rules: ConditionalCreditRule[];
    total_marks: number;
  }) => void;
  onApprove?: (canonicalHash: string) => Promise<void>;
  currentHash?: string;
  isApproved?: boolean;
}

export const Pattern7AuthoringForm: React.FC<Pattern7AuthoringFormProps> = ({
  initialPrompt = '',
  initialMarks = 5,
  initialSteps,
  initialRules,
  initialScenario = '',
  initialGivenValues = {},
  initialConstants = {},
  initialSolutionGuide = '',
  initialCanonicalOptionMap = {},
  onChange,
  onApprove,
  currentHash: propHash,
  isApproved = false,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || 'احسب السرعة والتسارع النهائيين للجسم المتحرك:');
  const [scenario, setScenario] = useState(initialScenario || 'يتحرك قطار بتسارع منتظم انطلاقاً من السكون.');
  const [solutionGuide, setSolutionGuide] = useState(initialSolutionGuide || '');

  // Given values & constants
  const [givenKey, setGivenKey] = useState('');
  const [givenVal, setGivenVal] = useState('');
  const [givenValues, setGivenValues] = useState<Record<string, string>>(initialGivenValues);

  // Steps
  const [steps, setSteps] = useState<CalculationStep[]>(
    initialSteps || [
      {
        id: 'step_1',
        order: 1,
        prompt: 'حساب السرعة الابتدائية $v_0$ بالمتر/ثانية:',
        marks: 2,
        options: [
          { id: 'opt_1a', label: '0 \\text{ m/s}' },
          { id: 'opt_1b', label: '5 \\text{ m/s}' },
          { id: 'opt_1c', label: '10 \\text{ m/s}' },
        ],
      },
      {
        id: 'step_2',
        order: 2,
        prompt: 'حساب المسافة المقطوعة $s$ بعد مرور $5\\text{ s}$:',
        marks: 3,
        options: [
          { id: 'opt_2a', label: '25 \\text{ m}' },
          { id: 'opt_2b', label: '50 \\text{ m}' },
          { id: 'opt_2c', label: '75 \\text{ m}' },
        ],
      },
    ]
  );

  // Canonical Correct Option per step { [stepId]: canonicalOptionId }
  const [canonicalOptions, setCanonicalOptions] = useState<Record<string, string>>(
    initialCanonicalOptionMap || {
      step_1: 'opt_1a',
      step_2: 'opt_2a',
    }
  );

  // Conditional credit rules
  const [rules, setRules] = useState<ConditionalCreditRule[]>(initialRules || []);

  // Total marks computed from steps
  const totalMarks = useMemo(() => {
    return steps.reduce((sum, s) => sum + (Number(s.marks) || 0), 0);
  }, [steps]);

  // Synchronize state upward whenever changes occur
  const notifyChanges = (
    newPrompt: string,
    newScenario: string,
    newGiven: Record<string, string>,
    newSteps: CalculationStep[],
    newCanonical: Record<string, string>,
    newRules: ConditionalCreditRule[],
    newGuide: string
  ) => {
    const stepAnswersMap: Record<string, { canonical_option_id: string; marks: number }> = {};
    newSteps.forEach((s) => {
      stepAnswersMap[s.id] = {
        canonical_option_id: newCanonical[s.id] || (s.options[0]?.id || ''),
        marks: Number(s.marks) || 1,
      };
    });

    onChange({
      prompt: newPrompt,
      scenario: newScenario,
      given_values: newGiven,
      constants: {},
      steps: newSteps,
      solution_guide: newGuide,
      step_answers: stepAnswersMap,
      conditional_credit_rules: newRules,
      total_marks: newSteps.reduce((sum, s) => sum + (Number(s.marks) || 0), 0),
    });
  };

  // Canonical Hash preview
  const liveCanonicalHash = useMemo(() => {
    const payload = buildCanonicalAssessmentPayload({
      prompt,
      marks: totalMarks,
      explanation: solutionGuide,
      content: {
        scenario,
        given_values: givenValues,
        steps,
      },
      correct_answer: {
        step_answers: Object.fromEntries(
          steps.map((s) => [s.id, { canonical_option_id: canonicalOptions[s.id] || '', marks: s.marks }])
        ),
        conditional_credit_rules: rules,
      },
    });
    return toCanonicalJsonString(payload);
  }, [prompt, totalMarks, solutionGuide, scenario, givenValues, steps, canonicalOptions, rules]);

  // Handle adding given value
  const handleAddGiven = () => {
    if (!givenKey.trim() || !givenVal.trim()) return;
    const updated = { ...givenValues, [givenKey.trim()]: givenVal.trim() };
    setGivenValues(updated);
    setGivenKey('');
    setGivenVal('');
    notifyChanges(prompt, scenario, updated, steps, canonicalOptions, rules, solutionGuide);
  };

  const handleRemoveGiven = (k: string) => {
    const updated = { ...givenValues };
    delete updated[k];
    setGivenValues(updated);
    notifyChanges(prompt, scenario, updated, steps, canonicalOptions, rules, solutionGuide);
  };

  // Add Step
  const handleAddStep = () => {
    const newIdx = steps.length + 1;
    const newStepId = `step_${newIdx}`;
    const newStep: CalculationStep = {
      id: newStepId,
      order: newIdx,
      prompt: `الخطوة ${newIdx}: حساب ...`,
      marks: 2,
      options: [
        { id: `opt_${newIdx}a`, label: 'القيمة أ' },
        { id: `opt_${newIdx}b`, label: 'القيمة ب' },
      ],
    };
    const updatedSteps = [...steps, newStep];
    const updatedCanonical = { ...canonicalOptions, [newStepId]: `opt_${newIdx}a` };
    setSteps(updatedSteps);
    setCanonicalOptions(updatedCanonical);
    notifyChanges(prompt, scenario, givenValues, updatedSteps, updatedCanonical, rules, solutionGuide);
  };

  // Remove Step
  const handleRemoveStep = (stepId: string) => {
    if (steps.length <= 1) return;
    const updatedSteps = steps.filter((s) => s.id !== stepId).map((s, idx) => ({ ...s, order: idx + 1 }));
    const updatedCanonical = { ...canonicalOptions };
    delete updatedCanonical[stepId];
    // Remove invalid rules
    const updatedRules = rules.filter((r) => r.target_step_id !== stepId && r.prerequisite_step_id !== stepId);
    setSteps(updatedSteps);
    setCanonicalOptions(updatedCanonical);
    setRules(updatedRules);
    notifyChanges(prompt, scenario, givenValues, updatedSteps, updatedCanonical, updatedRules, solutionGuide);
  };

  // Add Option to Step
  const handleAddOption = (stepId: string) => {
    const updatedSteps = steps.map((s) => {
      if (s.id !== stepId) return s;
      const optIdx = s.options.length + 1;
      const char = String.fromCharCode(97 + optIdx - 1);
      return {
        ...s,
        options: [...s.options, { id: `opt_${s.id}_${char}`, label: `ناتج بديل ${optIdx}` }],
      };
    });
    setSteps(updatedSteps);
    notifyChanges(prompt, scenario, givenValues, updatedSteps, canonicalOptions, rules, solutionGuide);
  };

  // Remove Option from Step
  const handleRemoveOption = (stepId: string, optId: string) => {
    const updatedSteps = steps.map((s) => {
      if (s.id !== stepId) return s;
      if (s.options.length <= 2) return s; // Minimum 2 options required
      return {
        ...s,
        options: s.options.filter((o) => o.id !== optId),
      };
    });
    setSteps(updatedSteps);
    // If canonical was deleted, fall back to first
    const updatedCanonical = { ...canonicalOptions };
    if (updatedCanonical[stepId] === optId) {
      const step = updatedSteps.find((s) => s.id === stepId);
      updatedCanonical[stepId] = step?.options[0]?.id || '';
    }
    setCanonicalOptions(updatedCanonical);
    notifyChanges(prompt, scenario, givenValues, updatedSteps, updatedCanonical, rules, solutionGuide);
  };

  // Add Conditional Credit Rule
  const handleAddRule = () => {
    if (steps.length < 2) return;
    const targetStep = steps[steps.length - 1]; // Default to last step
    const prereqStep = steps[0]; // Default to first step
    const newRule: ConditionalCreditRule = {
      rule_id: `rule_${Date.now().toString(36)}`,
      target_step_id: targetStep.id,
      awarded_option_id: targetStep.options[1]?.id || targetStep.options[0]?.id || '',
      prerequisite_step_id: prereqStep.id,
      prerequisite_option_id: prereqStep.options[1]?.id || prereqStep.options[0]?.id || '',
      credit_fraction: 0.5,
      description: 'منح نصف الدرجة لتطبيق القانون بشكل صحيح بالرغم من التعويض بنتيجة سابقة خاطئة',
    };
    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    notifyChanges(prompt, scenario, givenValues, steps, canonicalOptions, updatedRules, solutionGuide);
  };

  // Remove Rule
  const handleRemoveRule = (ruleId: string) => {
    const updatedRules = rules.filter((r) => r.rule_id !== ruleId);
    setRules(updatedRules);
    notifyChanges(prompt, scenario, givenValues, steps, canonicalOptions, updatedRules, solutionGuide);
  };

  return (
    <div className="space-y-6 bg-slate-50/70 p-5 rounded-3xl border border-slate-200" dir="rtl">
      {/* Header & Approval Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <span>إعداد مسألة حسابية متعددة الخطوات (النمط 7)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            يدعم معادلات LaTeX، خيارات الاختيار من متعدد المحايدة، والدرجات الجزئية المشروطة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isApproved ? (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>معتمد بختم الهاش</span>
            </span>
          ) : (
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>مسودة بانتظار توقيع الاعتماد</span>
            </span>
          )}

          {onApprove && !isApproved && (
            <button
              type="button"
              onClick={() => onApprove(liveCanonicalHash)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>توقيع واعتماد السؤال</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Prompt & Scenario */}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">
            نص المسألة العام أو المطلوب الرئيسي (يدعم صيغ LaTeX الرياضية):
          </label>
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              notifyChanges(e.target.value, scenario, givenValues, steps, canonicalOptions, rules, solutionGuide);
            }}
            rows={2}
            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            placeholder="احسب كلاً من..."
          />
          {prompt && (
            <div className="mt-1 p-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-700">
              <span className="text-[10px] text-slate-400 block mb-0.5">معاينة الرياضيات الحية:</span>
              <MathView text={prompt} />
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">سياق المسألة والتجربة (اختياري):</label>
          <textarea
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value);
              notifyChanges(prompt, e.target.value, givenValues, steps, canonicalOptions, rules, solutionGuide);
            }}
            rows={2}
            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="سقط جسم سقوطاً حراً من برج..."
          />
        </div>
      </div>

      {/* Given Values & Constants */}
      <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200">
        <label className="text-xs font-bold text-slate-800 block">المعطيات والثوابت العددية:</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={givenKey}
            onChange={(e) => setGivenKey(e.target.value)}
            placeholder="الرمز (مثلاً v_0 أو g)"
            className="w-32 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono"
          />
          <input
            type="text"
            value={givenVal}
            onChange={(e) => setGivenVal(e.target.value)}
            placeholder="القيمة والوحدة (مثلاً 9.8 \text{ m/s}^2)"
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-mono"
          />
          <button
            type="button"
            onClick={handleAddGiven}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>إضافة معطى</span>
          </button>
        </div>

        {Object.keys(givenValues).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {Object.entries(givenValues).map(([k, v]) => (
              <span
                key={k}
                className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-mono flex items-center gap-2"
              >
                <MathView text={`${k} = ${v}`} />
                <button
                  type="button"
                  onClick={() => handleRemoveGiven(k)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Steps Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-800">
            خطوات الحل المتسلسلة ({steps.length}) — إجمالي الدرجات: {totalMarks}
          </h4>
          <button
            type="button"
            onClick={handleAddStep}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ إضافة خطوة جديدة</span>
          </button>
        </div>

        <div className="space-y-4">
          {steps.map((step, sIdx) => {
            const canonicalOpt = canonicalOptions[step.id] || step.options[0]?.id || '';

            return (
              <div key={step.id} className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="font-bold text-xs text-indigo-700 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-900 flex items-center justify-center text-[10px]">
                      {sIdx + 1}
                    </span>
                    <span>معرّف الخطوة: {step.id}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-[11px] text-slate-500">الدرجة:</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={step.marks}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 1;
                          const updated = steps.map((s) => (s.id === step.id ? { ...s, marks: val } : s));
                          setSteps(updated);
                          notifyChanges(prompt, scenario, givenValues, updated, canonicalOptions, rules, solutionGuide);
                        }}
                        className="w-16 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 text-xs text-center font-bold"
                      />
                    </div>

                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(step.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="حذف هذه الخطوة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Step Prompt */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-0.5">نص ومطلوب الخطوة:</label>
                  <input
                    type="text"
                    value={step.prompt}
                    onChange={(e) => {
                      const updated = steps.map((s) => (s.id === step.id ? { ...s, prompt: e.target.value } : s));
                      setSteps(updated);
                      notifyChanges(prompt, scenario, givenValues, updated, canonicalOptions, rules, solutionGuide);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                  />
                  {step.prompt && (
                    <div className="mt-1 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <MathView text={step.prompt} />
                    </div>
                  )}
                </div>

                {/* Options List */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600">
                      خيارات الإجابة (اختر النتيجة الصحيحة النموذجية بالدائرة الخضراء):
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAddOption(step.id)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold"
                    >
                      + خيار إضافي
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {step.options.map((opt) => {
                      const isCanonical = canonicalOpt === opt.id;

                      return (
                        <div
                          key={opt.id}
                          className={`p-2 rounded-xl border flex items-center gap-2 ${
                            isCanonical
                              ? 'border-emerald-500 bg-emerald-50/50'
                              : 'border-slate-200 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`canonical_${step.id}`}
                            checked={isCanonical}
                            onChange={() => {
                              const updatedCanonical = { ...canonicalOptions, [step.id]: opt.id };
                              setCanonicalOptions(updatedCanonical);
                              notifyChanges(prompt, scenario, givenValues, steps, updatedCanonical, rules, solutionGuide);
                            }}
                            className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            title="تعيين كإجابة نموذجية صحيحة"
                          />
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) => {
                              const updated = steps.map((s) => {
                                if (s.id !== step.id) return s;
                                return {
                                  ...s,
                                  options: s.options.map((o) => (o.id === opt.id ? { ...o, label: e.target.value } : o)),
                                };
                              });
                              setSteps(updated);
                              notifyChanges(prompt, scenario, givenValues, updated, canonicalOptions, rules, solutionGuide);
                            }}
                            className="flex-1 bg-transparent text-xs font-mono border-b border-dotted border-slate-300 focus:outline-none"
                            placeholder="نص الخيار باللاتيني / LaTeX"
                          />
                          <span className="text-[10px] text-slate-400 font-mono">({opt.id})</span>
                          {step.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(step.id, opt.id)}
                              className="text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conditional Credit Rules Section */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-800">
              قواعد الدرجات الجزئية المشروطة للأخطاء المنسابة (Conditional Credit Rules):
            </h4>
            <p className="text-[11px] text-slate-500">
              تتيح منح نسبة من درجات خطوة لاحقة إذا طبق الطالب القانون بشكل سليم بالرغم من استخدامه ناتجاً خاطئاً من خطوة سابقة.
            </p>
          </div>
          {steps.length >= 2 && (
            <button
              type="button"
              onClick={handleAddRule}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <PlusCircle className="w-3 h-3" />
              <span>+ إضافة شرط درجات</span>
            </button>
          )}
        </div>

        {rules.length === 0 ? (
          <p className="text-xs text-slate-400 italic">لا توجد قواعد مشروطة مضافة (كل خطوة تخضع للنموذج الكامل أو الصفر).</p>
        ) : (
          <div className="space-y-2.5">
            {rules.map((rule, rIdx) => {
              const targetStep = steps.find((s) => s.id === rule.target_step_id) || steps[1] || steps[0];
              const prereqStep = steps.find((s) => s.id === rule.prerequisite_step_id) || steps[0];

              return (
                <div key={rule.rule_id} className="p-3 bg-amber-50/40 rounded-xl border border-amber-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900">قاعدة #{rIdx + 1}:</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(rule.rule_id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 block">الخطوة المستهدفة:</label>
                      <select
                        value={rule.target_step_id}
                        onChange={(e) => {
                          const updated = rules.map((r) =>
                            r.rule_id === rule.rule_id ? { ...r, target_step_id: e.target.value } : r
                          );
                          setRules(updated);
                          notifyChanges(prompt, scenario, givenValues, steps, canonicalOptions, updated, solutionGuide);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1 text-xs"
                      >
                        {steps.slice(1).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.id} ({s.prompt.slice(0, 20)}...)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block">الخيار الممنوح له النسبة:</label>
                      <select
                        value={rule.awarded_option_id}
                        onChange={(e) => {
                          const updated = rules.map((r) =>
                            r.rule_id === rule.rule_id ? { ...r, awarded_option_id: e.target.value } : r
                          );
                          setRules(updated);
                          notifyChanges(prompt, scenario, givenValues, steps, canonicalOptions, updated, solutionGuide);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1 text-xs"
                      >
                        {targetStep?.options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.id}: {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block">الخطوة السابقة المشروطة:</label>
                      <select
                        value={rule.prerequisite_step_id}
                        onChange={(e) => {
                          const updated = rules.map((r) =>
                            r.rule_id === rule.rule_id ? { ...r, prerequisite_step_id: e.target.value } : r
                          );
                          setRules(updated);
                          notifyChanges(prompt, scenario, givenValues, steps, canonicalOptions, updated, solutionGuide);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1 text-xs"
                      >
                        {steps
                          .filter((s) => s.order < (targetStep?.order || 2))
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.id} ({s.prompt.slice(0, 20)}...)
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block">نسبة الاستحقاق (0.0 - 1.0):</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={rule.credit_fraction}
                        onChange={(e) => {
                          const val = Math.min(1, Math.max(0, Number(e.target.value) || 0));
                          const updated = rules.map((r) =>
                            r.rule_id === rule.rule_id ? { ...r, credit_fraction: val } : r
                          );
                          setRules(updated);
                          notifyChanges(prompt, scenario, givenValues, steps, canonicalOptions, updated, solutionGuide);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1 text-xs font-bold text-center"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Solution Guide & Explanation */}
      <div>
        <label className="text-xs font-bold text-slate-800 block mb-1">
          دليل الشرح والحل النموذجي (يظهر للطالب بعد الامتحان):
        </label>
        <textarea
          value={solutionGuide}
          onChange={(e) => {
            setSolutionGuide(e.target.value);
            notifyChanges(prompt, scenario, givenValues, steps, canonicalOptions, rules, e.target.value);
          }}
          rows={2}
          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
          placeholder="خطوات الحل والشرح الكامل..."
        />
      </div>
    </div>
  );
};

export default Pattern7AuthoringForm;
