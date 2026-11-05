import React, { useState, useEffect, useReducer, useCallback, useMemo } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Target,
  X
} from 'lucide-react';
import { DiagramLibraryDialog, DiagramAsset } from './DiagramLibraryDialog';
import { RegionEditorCanvas } from './RegionEditorCanvas';
import {
  editorReducer,
  initialEditorState
} from '../../lib/regionEditorState';
import { Region } from '../../../shared/regionGeometry';
import { DiagramLabelingRenderer } from '../questions/DiagramLabelingRenderer';
import {
  buildDiagramQuestion,
  formStateFromQuestion,
  DiagramFormState,
  FormSubQuestion,
  AuthoringIssue
} from '../../lib/diagramAuthoring';

export interface DiagramAuthoringFormProps {
  initialValues?: any;
  onChange: (result: {
    ok: boolean;
    issues: AuthoringIssue[];
    content?: any;
    key?: any;
    formState: DiagramFormState;
    totalMarks: number;
  }) => void;
  onSave?: () => void;
}

const DEFAULT_FORM_STATE: DiagramFormState = {
  prompt: 'ادرس الرسم التوضيحي للدائرة الكهربائية المرفقة ثم أجب عن الفروع التالية:',
  marks: 8,
  diagram: { url: '/assets/diagrams/physics_circuit.svg', alt: 'الدائرة الكهربائية' },
  subQuestions: [
    {
      uid: 'sq1',
      kind: 'locate',
      prompt: 'حدد موقع المقاومة الكهربائية على الرسم التوضيحي:',
      weight: 2,
      skill: 'spatial_reasoning' as any,
      hints: ['ابحث عن الرمز المتعرج الموصول على التوالي في الدائرة الكهربائية.'],
      explanation: 'المقاومة هي العنصر المحدد في المسار الأيمن للدائرة.',
    },
    {
      uid: 'sq2',
      kind: 'name',
      prompt: 'ما اسم الجزء المشار إليه في الدائرة؟',
      weight: 2,
      skill: 'terminology_recall' as any,
      options: ['مقاومة أومية', 'مكثف هوائي', 'ملف حثي'],
      correctIndex: 0,
      acceptedNames: ['مقاومة أومية', 'المقاومة', 'مقاومة'],
      hints: ['الجزء يعمل على إعاقة مرور التيار الكهربائي وتحويل الطاقة إلى حرارة.'],
      explanation: 'المقاومة الأومية هي المكون الأساسي للتحكم بالجهد والتيار.',
    },
    {
      uid: 'sq3',
      kind: 'function',
      prompt: 'ما الوظيفة الأساسية لهذا المكون في الدائرة؟',
      weight: 4,
      skill: 'functional_analysis' as any,
      options: [
        'التحكم في شدة التيار الكهربائي المار بالدائرة',
        'توليد القوة الدافعة الكهربائية',
        'تخزين الشحنات الكهربائية وتفريغها',
      ],
      correctIndex: 0,
      hints: ['تذكر قانون أوم: V = I * R وعلاقة المقاومة بتنظيم التيار.'],
      explanation: 'المقاومة تحد من تدفق الشحنات لحماية المكونات الحساسة وضبط شدة التيار.',
    },
  ],
  regions: {
    sq1: [
      {
        type: 'rect',
        x: 0.65,
        y: 0.25,
        w: 0.2,
        h: 0.2,
        tolerance: 0.02,
      },
    ],
  },
};

export const DiagramAuthoringForm: React.FC<DiagramAuthoringFormProps> = ({
  initialValues,
  onChange,
  onSave,
}) => {
  // Initialize form state from props using pure formStateFromQuestion
  const initialForm = useMemo(() => {
    if (initialValues) {
      const restored = formStateFromQuestion(initialValues);
      if (restored.subQuestions.length > 0) {
        return restored;
      }
    }
    return DEFAULT_FORM_STATE;
  }, [initialValues]);

  // Form State
  const [prompt, setPrompt] = useState<string>(initialForm.prompt);
  const [diagram, setDiagram] = useState<{ assetId?: string; url?: string; alt?: string }>(initialForm.diagram);
  const [subQuestions, setSubQuestions] = useState<FormSubQuestion[]>(initialForm.subQuestions);
  const [assetMeta, setAssetMeta] = useState<DiagramAsset | null>(null);

  // Region Editor State Machine
  const [editorState, editorDispatch] = useReducer(
    editorReducer,
    initialForm.regions,
    initialEditorState
  );

  // Active Sub-Question in Form & Editor
  const [activeSubId, setActiveSubId] = useState<string>(subQuestions[0]?.uid || 'sq1');

  // UI Modals
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'training' | 'simulator'>('training');
  const [previewAnswer, setPreviewAnswer] = useState<any>({});
  const [testClickMode, setTestClickMode] = useState(false);

  // Replace Image Confirmation
  const [confirmReplaceAsset, setConfirmReplaceAsset] = useState<DiagramAsset | null>(null);

  // New tag input for acceptedNames
  const [newTagInput, setNewTagInput] = useState<Record<string, string>>({});

  // Sync active subId with editor
  useEffect(() => {
    editorDispatch({ type: 'SET_ACTIVE', subId: activeSubId });
  }, [activeSubId]);

  // Image URL for rendering
  const activeImageUrl = diagram.assetId ? `/api/media/${diagram.assetId}` : diagram.url || '';

  // Calculate total marks from sub-questions
  const totalMarks = subQuestions.reduce((sum, sq) => sum + (Number(sq.weight) || 1), 0);

  // Build current Form State
  const currentFormState: DiagramFormState = useMemo(() => {
    const cleanRegions: Record<string, Region[]> = {};
    for (const sq of subQuestions) {
      if (editorState.regions[sq.uid]) {
        cleanRegions[sq.uid] = editorState.regions[sq.uid];
      }
    }
    return {
      prompt,
      marks: totalMarks,
      diagram,
      subQuestions,
      regions: cleanRegions,
    };
  }, [prompt, totalMarks, diagram, subQuestions, editorState.regions]);

  // Run pure build & validation engine
  const buildResult = useMemo(() => buildDiagramQuestion(currentFormState), [currentFormState]);

  // Emit build result and form state to parent
  useEffect(() => {
    onChange({
      ok: buildResult.ok,
      issues: buildResult.issues,
      content: buildResult.content,
      key: buildResult.key,
      formState: currentFormState,
      totalMarks,
    });
  }, [buildResult, currentFormState, totalMarks, onChange]);

  // Sub-question management
  const handleAddSubQuestion = () => {
    const nextIdx = subQuestions.length + 1;
    const newUid = `sq_${Date.now().toString(36)}_${nextIdx}`;
    const newKind: 'locate' | 'name' | 'function' =
      nextIdx % 3 === 1 ? 'locate' : nextIdx % 3 === 2 ? 'name' : 'function';

    const newSub: FormSubQuestion = {
      uid: newUid,
      kind: newKind,
      prompt:
        newKind === 'locate'
          ? `حدد موقع الجزء رقم ${nextIdx} على الرسم:`
          : newKind === 'name'
          ? `ما اسم المكون رقم ${nextIdx}؟`
          : `ما وظيفة المكون رقم ${nextIdx}؟`,
      weight: newKind === 'function' ? 4 : 2,
      skill:
        newKind === 'locate'
          ? ('spatial_reasoning' as any)
          : newKind === 'name'
          ? ('terminology_recall' as any)
          : ('functional_analysis' as any),
      hints: ['راجع الرسم التوضيحي والمعلومات المنهجية.'],
      explanation: '',
    };

    if (newKind === 'name') {
      newSub.options = ['الخيار الصحيح', 'الخيار الثاني', 'الخيار الثالث'];
      newSub.correctIndex = 0;
      newSub.acceptedNames = ['الخيار الصحيح'];
    } else if (newKind === 'function') {
      newSub.options = ['الوظيفة النموذجية المعتمدة', 'وظيفة بديلة غير صحيحة', 'وظيفة أخرى'];
      newSub.correctIndex = 0;
    }

    setSubQuestions((prev) => [...prev, newSub]);
    setActiveSubId(newUid);
  };

  const handleDeleteSubQuestion = (uid: string) => {
    if (subQuestions.length <= 1) {
      alert('يجب أن يحتوي السؤال على فرع واحد على الأقل.');
      return;
    }
    const remaining = subQuestions.filter((s) => s.uid !== uid);
    setSubQuestions(remaining);
    if (activeSubId === uid) {
      setActiveSubId(remaining[0]?.uid || 'sq1');
    }
  };

  const handleReorderSubQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subQuestions.length) return;

    const copy = [...subQuestions];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setSubQuestions(copy);
  };

  const handleUpdateSubQuestion = (index: number, updates: Partial<FormSubQuestion>) => {
    setSubQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  // Image Selection Handler (checks confirmation if regions exist)
  const handleSelectAsset = (asset: DiagramAsset) => {
    const hasExistingRegions = Object.values(editorState.regions).some((list) => ((list as any[]) || []).length > 0);
    const hasExistingTargets = subQuestions.some((s) => !!s.target);

    if (hasExistingRegions || hasExistingTargets) {
      setConfirmReplaceAsset(asset);
    } else {
      applySelectedAsset(asset);
    }
  };

  const applySelectedAsset = (asset: DiagramAsset) => {
    setDiagram({
      assetId: asset.id,
      alt: asset.name,
    });
    setAssetMeta(asset);
    // Reset regions and targets
    editorDispatch({ type: 'RESET_ALL' });
    setSubQuestions((prev) => prev.map((s) => ({ ...s, target: undefined })));
    setConfirmReplaceAsset(null);
  };

  // Active sub-question object
  const activeSub = subQuestions.find((s) => s.uid === activeSubId) || subQuestions[0];
  const activeSubIndex = subQuestions.findIndex((s) => s.uid === activeSubId);

  // Filter sub-question specific issues
  const activeSubIssues = activeSub ? buildResult.issues.filter((i) => i.subUid === activeSub.uid) : [];

  return (
    <div className="space-y-6 dir-rtl text-right font-sans">
      {/* SECTION 1: Image Selection Area */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <ImageIcon className="w-4 h-4 text-blue-600" />
            <span>1. الرسم التوضيحي المعتمد (المرجع البصري)</span>
          </div>

          <button
            type="button"
            onClick={() => setIsLibraryOpen(true)}
            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>فتح مكتبة الرسوم التوضيحية / رفع رسم</span>
          </button>
        </div>

        {/* Selected Image Info */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
          <div className="w-24 h-24 rounded-lg bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center border border-slate-300">
            {activeImageUrl ? (
              <img
                src={activeImageUrl}
                alt="Diagram Preview"
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-bold text-slate-800">
              {diagram.alt || assetMeta?.name || 'الرسم التوضيحي الحالي'}
            </h4>
            <p className="text-[11px] font-mono text-slate-500">
              {diagram.assetId ? `معرّف الرسم (Asset ID): ${diagram.assetId}` : `المسار: ${diagram.url}`}
            </p>
            {assetMeta && (
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>{(assetMeta.byteLength / 1024).toFixed(0)} KB</span>
                {assetMeta.width && assetMeta.height && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {assetMeta.width} × {assetMeta.height} بكسل
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Overall Question Prompt */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            نص التوجيه الرئيسي للسؤال (Prompt) <span className="text-red-500">*</span>:
          </label>
          <textarea
            rows={2}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="مثال: من خلال الرسم التوضيحي للدائرة الكهربائية المرفقة، أجب عما يلي..."
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* SECTION 2 & 3: Sub-Questions Editor & Visual Region Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Sub-Questions Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <Target className="w-4 h-4 text-blue-600" />
                <span>2. الفروع والأسئلة المرتبطة بالرسم ({subQuestions.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddSubQuestion}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة فرع</span>
              </button>
            </div>

            {/* Sub-Question Navigation Stepper / Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {subQuestions.map((sq, idx) => {
                const isActive = sq.uid === activeSubId;
                const regCount = (editorState.regions[sq.uid] || []).length;
                const hasIssue = buildResult.issues.some((i) => i.subUid === sq.uid);

                return (
                  <button
                    key={sq.uid}
                    type="button"
                    onClick={() => setActiveSubId(sq.uid)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : hasIssue
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>س{idx + 1}</span>
                    <span className="text-[10px] opacity-80">
                      {sq.kind === 'locate' ? '(تحديد)' : sq.kind === 'name' ? '(تسمية)' : '(وظيفة)'}
                    </span>
                    {sq.kind === 'locate' && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          regCount > 0 ? 'bg-emerald-400' : 'bg-red-400'
                        }`}
                        title={regCount > 0 ? 'النطاق مرسوم' : 'بحاجة لرسم نطاق'}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Sub-Question Form Fields */}
            {activeSub && (
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-4">
                {/* Header with Type & Order Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      فرع رقم ({activeSubIndex + 1})
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={activeSubIndex === 0}
                        onClick={() => handleReorderSubQuestion(activeSubIndex, 'up')}
                        className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                      <button
                        type="button"
                        disabled={activeSubIndex === subQuestions.length - 1}
                        onClick={() => handleReorderSubQuestion(activeSubIndex, 'down')}
                        className="p-1 hover:bg-slate-200 rounded disabled:opacity-30"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSubQuestion(activeSub.uid)}
                    className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded text-xs flex items-center gap-1"
                    title="حذف هذا الفرع"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                </div>

                {/* Sub-Question Issues Box */}
                {activeSubIssues.length > 0 && (
                  <div className="space-y-1.5 p-2.5 bg-red-50 border border-red-200 rounded-xl">
                    {activeSubIssues.map((issue, idx) => (
                      <div key={idx} className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{issue.message}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sub-Question Kind Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    نوع المطلوب (Sub-question Kind):
                  </label>
                  <select
                    value={activeSub.kind}
                    onChange={(e) => {
                      const newKind = e.target.value as 'locate' | 'name' | 'function';
                      const defaultSkill =
                        newKind === 'locate'
                          ? 'spatial_reasoning'
                          : newKind === 'name'
                          ? 'terminology_recall'
                          : 'functional_analysis';

                      let defaultOpts = activeSub.options || [];
                      if (newKind === 'name' && defaultOpts.length < 3) {
                        defaultOpts = ['الخيار الصحيح', 'خيار آخر', 'خيار ثالث'];
                      } else if (newKind === 'function' && defaultOpts.length < 3) {
                        defaultOpts = ['الوظيفة النموذجية المعتمدة', 'وظيفة بديلة', 'وظيفة ثالثة'];
                      }

                      handleUpdateSubQuestion(activeSubIndex, {
                        kind: newKind,
                        skill: defaultSkill as any,
                        options: defaultOpts,
                        correctIndex: activeSub.correctIndex ?? 0,
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="locate">تحديد موقع الجزء على الرسم (Locate - نقر/تحديد)</option>
                    <option value="name">تسمية الجزء العلمي (Name - اختيار/كتابة)</option>
                    <option value="function">وظيفة أو أهمية الجزء (Function - متعدد الخيارات)</option>
                  </select>
                </div>

                {/* Prompt & Marks */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      نص السؤال الفرعي:
                    </label>
                    <input
                      type="text"
                      value={activeSub.prompt}
                      onChange={(e) => handleUpdateSubQuestion(activeSubIndex, { prompt: e.target.value })}
                      placeholder="مثال: حدد موقع المقاومة الكهربائية على الرسم..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      الدرجة:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={activeSub.weight || 2}
                      onChange={(e) =>
                        handleUpdateSubQuestion(activeSubIndex, { weight: Number(e.target.value) || 1 })
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-center"
                    />
                  </div>
                </div>

                {/* Specialized Fields: Options & Accepted Names for 'name' */}
                {activeSub.kind === 'name' && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">
                        الخيارات الثلاثة (اختر الإجابة الصحيحة بالزر):
                      </span>
                      <span className="text-[10px] text-blue-600 font-bold">3 خيارات إلزامية</span>
                    </div>

                    <div className="space-y-2">
                      {(activeSub.options || []).slice(0, 3).map((optText, oIdx) => {
                        const isCorrect = (activeSub.correctIndex ?? 0) === oIdx;

                        return (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct_${activeSub.uid}`}
                              checked={isCorrect}
                              onChange={() => {
                                handleUpdateSubQuestion(activeSubIndex, { correctIndex: oIdx });
                              }}
                              className="accent-blue-600 cursor-pointer"
                              title="تحديد كإجابة صحيحة"
                            />
                            <input
                              type="text"
                              value={optText}
                              onChange={(e) => {
                                const newOpts = [...(activeSub.options || [])];
                                newOpts[oIdx] = e.target.value;
                                handleUpdateSubQuestion(activeSubIndex, { options: newOpts });
                              }}
                              placeholder={`الخيار ${oIdx + 1}`}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Accepted Names Tags Editor */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        الأسماء والمترادفات المقبولة لتصحيح وضع المحاكاة (كتابة الطالب):
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {(activeSub.acceptedNames || []).map((nameTag: string, tagIdx: number) => (
                          <span
                            key={tagIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-medium"
                          >
                            <span>{nameTag}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextTags = (activeSub.acceptedNames || []).filter(
                                  (_, i) => i !== tagIdx
                                );
                                handleUpdateSubQuestion(activeSubIndex, { acceptedNames: nextTags });
                              }}
                              className="hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Add Tag Input */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          value={newTagInput[activeSub.uid] || ''}
                          onChange={(e) =>
                            setNewTagInput((prev) => ({ ...prev, [activeSub.uid]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = (newTagInput[activeSub.uid] || '').trim();
                              if (val) {
                                handleUpdateSubQuestion(activeSubIndex, {
                                  acceptedNames: [...(activeSub.acceptedNames || []), val],
                                });
                                setNewTagInput((prev) => ({ ...prev, [activeSub.uid]: '' }));
                              }
                            }
                          }}
                          placeholder="أضف تسمية بديلة أو مترادفة واضغط Enter..."
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = (newTagInput[activeSub.uid] || '').trim();
                            if (val) {
                              handleUpdateSubQuestion(activeSubIndex, {
                                acceptedNames: [...(activeSub.acceptedNames || []), val],
                              });
                              setNewTagInput((prev) => ({ ...prev, [activeSub.uid]: '' }));
                            }
                          }}
                          className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Specialized Fields: Options for 'function' */}
                {activeSub.kind === 'function' && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800">
                        خيارات الوظيفة أو الأهمية (3 إلى 4 خيارات):
                      </span>
                      {(activeSub.options?.length || 0) < 4 && (
                        <button
                          type="button"
                          onClick={() => {
                            const current = activeSub.options || [];
                            handleUpdateSubQuestion(activeSubIndex, {
                              options: [...current, `خيار ${current.length + 1}`],
                            });
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>إضافة خيار رابع</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {(activeSub.options || []).map((optText, oIdx) => {
                        const isCorrect = (activeSub.correctIndex ?? 0) === oIdx;

                        return (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct_func_${activeSub.uid}`}
                              checked={isCorrect}
                              onChange={() => {
                                handleUpdateSubQuestion(activeSubIndex, { correctIndex: oIdx });
                              }}
                              className="accent-blue-600 cursor-pointer"
                              title="تحديد كإجابة صحيحة"
                            />
                            <input
                              type="text"
                              value={optText}
                              onChange={(e) => {
                                const newOpts = [...(activeSub.options || [])];
                                newOpts[oIdx] = e.target.value;
                                handleUpdateSubQuestion(activeSubIndex, { options: newOpts });
                              }}
                              placeholder={`الوظيفة ${oIdx + 1}`}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                            />
                            {(activeSub.options?.length || 0) > 3 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = activeSub.options!.filter((_, i) => i !== oIdx);
                                  handleUpdateSubQuestion(activeSubIndex, { options: filtered });
                                }}
                                className="text-slate-400 hover:text-red-600 p-1"
                                title="حذف الخيار"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Training Hints (up to 3) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">
                      التلميحات التدريبية (تظهر في وضع التدريب فقط - حتى 3):
                    </label>
                    {(!activeSub.hints || activeSub.hints.length < 3) && (
                      <button
                        type="button"
                        onClick={() => {
                          const hints = activeSub.hints || [];
                          handleUpdateSubQuestion(activeSubIndex, {
                            hints: [...hints, 'تلميح إرشادي لمساعدة الطالب...'],
                          });
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        + تلميح جديد
                      </button>
                    )}
                  </div>

                  {(activeSub.hints || []).map((hint, hIdx) => (
                    <div key={hIdx} className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-mono">#{hIdx + 1}</span>
                      <input
                        type="text"
                        value={hint}
                        onChange={(e) => {
                          const hints = [...(activeSub.hints || [])];
                          hints[hIdx] = e.target.value;
                          handleUpdateSubQuestion(activeSubIndex, { hints });
                        }}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const hints = activeSub.hints!.filter((_, i) => i !== hIdx);
                          handleUpdateSubQuestion(activeSubIndex, { hints });
                        }}
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    الشرح والتفسير النموذجي للفرع:
                  </label>
                  <input
                    type="text"
                    value={activeSub.explanation || ''}
                    onChange={(e) => handleUpdateSubQuestion(activeSubIndex, { explanation: e.target.value })}
                    placeholder="شرح علمي يظهر للطالب عند مراجعة النتيجة..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Visual Region Canvas Area */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>3. لوحة رسم النطاقات على الصورة التوضيحية</span>
              </div>
              <span className="text-[11px] text-slate-500">
                النطاق النشط حالياً: <strong className="text-blue-700 font-bold">س{activeSubIndex + 1} ({activeSub?.prompt.slice(0, 20)}...)</strong>
              </span>
            </div>

            {/* Region Canvas */}
            <RegionEditorCanvas
              imageUrl={activeImageUrl}
              subQuestions={subQuestions.map((sq, i) => ({ id: sq.uid, kind: sq.kind, prompt: sq.prompt })) as any}
              state={editorState}
              dispatch={editorDispatch}
              testClickMode={testClickMode}
              onToggleTestClickMode={() => setTestClickMode((prev) => !prev)}
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: Validation Summary & Preview / Save Actions */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">4. فحص الجودة والمعاينة الحية</h3>
            <p className="text-xs text-slate-500">
              إجمالي درجات السؤال: <span className="font-bold text-blue-700">{totalMarks} درجة</span> موزعة على{' '}
              {subQuestions.length} فروع علمية.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPreviewAnswer({});
                setIsPreviewOpen(true);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-slate-600" />
              <span>معاينة السؤال كطالب</span>
            </button>
          </div>
        </div>

        {/* Validation Errors & Issues Banner */}
        {!buildResult.ok ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>يرجى استيفاء الملاحظات التالية قبل الحفظ النهائي ({buildResult.issues.length} ملاحظة):</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-700">
              {buildResult.issues.map((issue, i) => (
                <li key={i}>{issue.message}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>جميع بيانات السؤال ونطاقاته مكتملة وصالحة للاعتماد في بنك الأسئلة.</span>
          </div>
        )}
      </div>

      {/* Library Dialog Modal */}
      <DiagramLibraryDialog
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={handleSelectAsset}
        currentAssetId={diagram.assetId}
      />

      {/* Confirmation Modal when replacing image with existing regions */}
      {confirmReplaceAsset && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-slate-800">تأكيد استبدال الرسم التوضيحي</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              تحذير: استبدال الصورة الحالية سيؤدي تلقائياً إلى{' '}
              <strong className="text-red-600 font-bold">مسح جميع النطاقات المرسومة</strong> لجميع الفروع،
              نظراً لااختلاف أبعاد وإحداثيات الرسم الجديد.
            </p>
            <p className="text-xs text-slate-500">هل أنت متأكد من استبدال الصورة والبدء برسم النطاقات من جديد؟</p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmReplaceAsset(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => applySelectedAsset(confirmReplaceAsset)}
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                نعم، استبدل وامسح النطاقات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student View Live Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl text-right">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">معاينة الطالب الحية للرسم التوضيحي</h3>
                  <p className="text-xs text-slate-500">
                    اختبر تجربة الطالب في وضعي التدريب والمحاكاة لضمان دقة النطاقات
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('training')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                      previewMode === 'training'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    وضع التدريب (Training)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('simulator')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                      previewMode === 'simulator'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    وضع المحاكاة (Simulator)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {buildResult.content ? (
                <DiagramLabelingRenderer
                  content={buildResult.content}
                  answer={previewAnswer}
                  onChange={(ans) => setPreviewAnswer(ans)}
                  isSimulator={previewMode === 'simulator'}
                  correctAnswer={buildResult.key}
                />
              ) : (
                <div className="p-8 text-center text-amber-700 text-xs font-bold bg-amber-50 rounded-xl">
                  لا يمكن عرض المعاينة الحية حتى يتم تصحيح الأخطاء وإكمال حقول السؤال المطلوبة.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
