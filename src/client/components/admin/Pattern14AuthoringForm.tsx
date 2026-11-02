import React, { useState, useMemo, useEffect } from 'react';
import { PlusCircle, Trash2, Award, HelpCircle, BookOpen, Layers } from 'lucide-react';
import { GrammarComponent, GrammarChoice, GrammarHint } from '../../../shared/types';

interface Pattern14AuthoringFormProps {
  initialPrompt?: string;
  initialSentence?: string;
  initialTargetWord?: string;
  initialComponents?: GrammarComponent[];
  initialCorrectComponents?: Record<string, string>;
  onChange: (data: {
    prompt: string;
    sentence: string;
    targetWord: string;
    components: GrammarComponent[];
    correctComponents: Record<string, string>;
    totalMarks: number;
  }) => void;
}

const DEFAULT_COMPONENTS: GrammarComponent[] = [
  {
    id: 'comp_1',
    label: 'الموقع الإعرابي',
    points: 2,
    choices: [
      { id: 'c1_1', text: 'فاعل مرفوع' },
      { id: 'c1_2', text: 'مفعول به منصوب' },
      { id: 'c1_3', text: 'مبتدأ مرفوع' },
    ],
    hints: [{ level: 1, text: 'لاحظ الكلمة التي تسبق الاسم المحدد في الجملة.' }],
  },
  {
    id: 'comp_2',
    label: 'علامة الإعراب',
    points: 1,
    choices: [
      { id: 'c2_1', text: 'الضمة الظاهرة' },
      { id: 'c2_2', text: 'الواو لأنه جمع مذكر سالم' },
      { id: 'c2_3', text: 'الألف لأنه مثنى' },
    ],
    hints: [{ level: 1, text: 'انتبه لنوع اسم الكلمة (مفرد أم جمع أم مثنى).' }],
  },
];

const DEFAULT_CORRECT: Record<string, string> = {
  comp_1: 'c1_1',
  comp_2: 'c2_1',
};

export const Pattern14AuthoringForm: React.FC<Pattern14AuthoringFormProps> = ({
  initialPrompt = 'أعرب الكلمات أو المكونات النحوية المحددة:',
  initialSentence = '',
  initialTargetWord = '',
  initialComponents,
  initialCorrectComponents,
  onChange,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [sentence, setSentence] = useState(initialSentence);
  const [targetWord, setTargetWord] = useState(initialTargetWord);

  const [components, setComponents] = useState<GrammarComponent[]>(() => {
    if (Array.isArray(initialComponents) && initialComponents.length > 0) {
      return initialComponents;
    }
    return DEFAULT_COMPONENTS;
  });

  const [correctComponents, setCorrectComponents] = useState<Record<string, string>>(() => {
    if (initialCorrectComponents && typeof initialCorrectComponents === 'object' && Object.keys(initialCorrectComponents).length > 0) {
      return initialCorrectComponents;
    }
    if (Array.isArray(initialComponents) && initialComponents.length > 0) {
      const derivedMap: Record<string, string> = {};
      initialComponents.forEach((c) => {
        if (c.choices && c.choices.length > 0) {
          derivedMap[c.id] = c.choices[0].id;
        }
      });
      return derivedMap;
    }
    return DEFAULT_CORRECT;
  });

  const totalMarks = useMemo(() => {
    return components.reduce((sum, c) => sum + (Number(c.points) || 0), 0);
  }, [components]);

  // Propagate changes to parent
  const emitChanges = (
    newComponents: GrammarComponent[],
    newCorrect: Record<string, string>,
    newPrompt: string,
    newSentence: string,
    newTargetWord: string
  ) => {
    const total = newComponents.reduce((sum, c) => sum + (Number(c.points) || 0), 0);
    onChange({
      prompt: newPrompt,
      sentence: newSentence,
      targetWord: newTargetWord,
      components: newComponents,
      correctComponents: newCorrect,
      totalMarks: total,
    });
  };

  // Emit initial state on mount so saving without field edits works immediately
  useEffect(() => {
    emitChanges(components, correctComponents, prompt, sentence, targetWord);
  }, []);

  const handleAddComponent = () => {
    const newCompId = `comp_${Date.now()}`;
    const newChoiceId1 = `ch_${Date.now()}_1`;
    const newChoiceId2 = `ch_${Date.now()}_2`;
    const newComp: GrammarComponent = {
      id: newCompId,
      label: `مكون نحوي جديد ${components.length + 1}`,
      points: 1,
      choices: [
        { id: newChoiceId1, text: 'خيار 1' },
        { id: newChoiceId2, text: 'خيار 2' },
      ],
      hints: [],
    };

    const nextComponents = [...components, newComp];
    const nextCorrect = { ...correctComponents, [newCompId]: newChoiceId1 };

    setComponents(nextComponents);
    setCorrectComponents(nextCorrect);
    emitChanges(nextComponents, nextCorrect, prompt, sentence, targetWord);
  };

  const handleRemoveComponent = (compIdx: number) => {
    const compToRemove = components[compIdx];
    const nextComponents = components.filter((_, idx) => idx !== compIdx);
    const nextCorrect = { ...correctComponents };
    if (compToRemove) {
      delete nextCorrect[compToRemove.id];
    }

    setComponents(nextComponents);
    setCorrectComponents(nextCorrect);
    emitChanges(nextComponents, nextCorrect, prompt, sentence, targetWord);
  };

  const handleUpdateComponent = (compIdx: number, updated: Partial<GrammarComponent>) => {
    const nextComponents = components.map((c, idx) => (idx === compIdx ? { ...c, ...updated } : c));
    setComponents(nextComponents);
    emitChanges(nextComponents, correctComponents, prompt, sentence, targetWord);
  };

  const handleAddChoice = (compIdx: number) => {
    const comp = components[compIdx];
    const newChoiceId = `ch_${Date.now()}`;
    const newChoices = [...comp.choices, { id: newChoiceId, text: `خيار ${comp.choices.length + 1}` }];

    handleUpdateComponent(compIdx, { choices: newChoices });
  };

  const handleRemoveChoice = (compIdx: number, choiceIdx: number) => {
    const comp = components[compIdx];
    if (comp.choices.length <= 2) return; // Keep at least 2 choices per component

    const choiceToRemove = comp.choices[choiceIdx];
    const newChoices = comp.choices.filter((_, idx) => idx !== choiceIdx);

    const nextComponents = components.map((c, idx) => (idx === compIdx ? { ...c, choices: newChoices } : c));

    const nextCorrect = { ...correctComponents };
    if (choiceToRemove && nextCorrect[comp.id] === choiceToRemove.id) {
      nextCorrect[comp.id] = newChoices[0].id;
    }

    setComponents(nextComponents);
    setCorrectComponents(nextCorrect);
    emitChanges(nextComponents, nextCorrect, prompt, sentence, targetWord);
  };

  const handleUpdateChoice = (compIdx: number, choiceIdx: number, text: string) => {
    const comp = components[compIdx];
    const newChoices = comp.choices.map((ch, idx) => (idx === choiceIdx ? { ...ch, text } : ch));

    handleUpdateComponent(compIdx, { choices: newChoices });
  };

  const handleSetCorrectChoice = (compIdx: number, choiceId: string) => {
    const comp = components[compIdx];
    const nextCorrect = { ...correctComponents, [comp.id]: choiceId };
    setCorrectComponents(nextCorrect);
    emitChanges(components, nextCorrect, prompt, sentence, targetWord);
  };

  const handleAddHint = (compIdx: number) => {
    const comp = components[compIdx];
    const hints = comp.hints || [];
    const newHints: GrammarHint[] = [
      ...hints,
      { level: hints.length + 1, text: `تلميح إضافي للمكون ${comp.label}` },
    ];
    handleUpdateComponent(compIdx, { hints: newHints });
  };

  const handleRemoveHint = (compIdx: number, hintIdx: number) => {
    const comp = components[compIdx];
    const hints = comp.hints || [];
    const newHints = hints
      .filter((_, idx) => idx !== hintIdx)
      .map((h, idx) => ({ ...h, level: idx + 1 }));
    handleUpdateComponent(compIdx, { hints: newHints });
  };

  const handleUpdateHintText = (compIdx: number, hintIdx: number, text: string) => {
    const comp = components[compIdx];
    const hints = comp.hints || [];
    const newHints = hints.map((h, idx) => (idx === hintIdx ? { ...h, text } : h));
    handleUpdateComponent(compIdx, { hints: newHints });
  };

  return (
    <div className="space-y-6 text-right dir-rtl bg-slate-50 p-6 rounded-2xl border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 text-emerald-800 font-bold text-base">
          <Layers className="w-5 h-5 text-emerald-600" />
          <span>محرر نمط مختبر النحو التكيفي (Pattern 14 — C1)</span>
        </div>
        <div className="flex items-center gap-2 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-300">
          <Award className="w-4 h-4 text-emerald-600" />
          <span>مجموع الدرجات: {totalMarks} درجات</span>
        </div>
      </div>

      {/* Basic Question Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-bold text-slate-700 block">عنوان/تعليمات السؤال:</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              emitChanges(components, correctComponents, e.target.value, sentence, targetWord);
            }}
            placeholder="أعرب المكونات النحوية للكلمات المحددة:"
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">الجملة أو الشاهد النحوي:</label>
          <input
            type="text"
            value={sentence}
            onChange={(e) => {
              setSentence(e.target.value);
              emitChanges(components, correctComponents, prompt, e.target.value, targetWord);
            }}
            placeholder="مثل: حضرَ المعلمُ مخلصاً"
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">الكلمة المستهدفة (اختياري):</label>
          <input
            type="text"
            value={targetWord}
            onChange={(e) => {
              setTargetWord(e.target.value);
              emitChanges(components, correctComponents, prompt, sentence, e.target.value);
            }}
            placeholder="مثل: المعلمُ"
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Grammar Components List */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>المكونات النحوية المستقلة ({components.length})</span>
          </h3>
          <button
            type="button"
            onClick={handleAddComponent}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>إضافة مكون نحوي جديد</span>
          </button>
        </div>

        {components.map((comp, compIdx) => (
          <div key={comp.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
            {/* Component Title & Points */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 flex-1">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold shrink-0">
                  {compIdx + 1}
                </span>
                <input
                  type="text"
                  value={comp.label}
                  onChange={(e) => handleUpdateComponent(compIdx, { label: e.target.value })}
                  placeholder="عنوان المكون (مثل: الموقع الإعرابي)"
                  className="w-full max-w-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-600">الدرجة:</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={comp.points}
                    onChange={(e) => handleUpdateComponent(compIdx, { points: Number(e.target.value) || 0 })}
                    className="w-16 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-center"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveComponent(compIdx)}
                  disabled={components.length <= 1}
                  className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Choices Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">الخيارات المتاحة والإجابة الصحيحة:</span>
                <button
                  type="button"
                  onClick={() => handleAddChoice(compIdx)}
                  className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>إضافة خيار</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {comp.choices.map((choice, choiceIdx) => {
                  const isCorrect = correctComponents[comp.id] === choice.id;

                  return (
                    <div
                      key={choice.id}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                        isCorrect ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`correct_choice_${comp.id}`}
                        checked={isCorrect}
                        onChange={() => handleSetCorrectChoice(compIdx, choice.id)}
                        className="accent-emerald-600 w-4 h-4 shrink-0 cursor-pointer"
                        title="حدده كإجابة صحيحة"
                      />
                      <input
                        type="text"
                        value={choice.text}
                        onChange={(e) => handleUpdateChoice(compIdx, choiceIdx, e.target.value)}
                        placeholder={`خيار ${choiceIdx + 1}`}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none"
                      />
                      {comp.choices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveChoice(compIdx, choiceIdx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hints Section */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>التلميحات المتدرجة للتدريب ({comp.hints?.length || 0})</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleAddHint(compIdx)}
                  className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>إضافة تلميح</span>
                </button>
              </div>

              {comp.hints && comp.hints.length > 0 && (
                <div className="space-y-2">
                  {comp.hints.map((hint, hintIdx) => (
                    <div key={hintIdx} className="flex items-center gap-2 bg-amber-50/80 p-2 rounded-xl border border-amber-200">
                      <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px] font-bold shrink-0">
                        مستوى {hint.level || hintIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={hint.text}
                        onChange={(e) => handleUpdateHintText(compIdx, hintIdx, e.target.value)}
                        placeholder="نص التلميح..."
                        className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-medium text-amber-950 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveHint(compIdx, hintIdx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
