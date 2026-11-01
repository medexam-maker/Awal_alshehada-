import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  PlusCircle,
  Trash2,
  Eye,
  Layers,
  RotateCcw,
  Sparkles,
  Upload,
  CheckCircle2,
  Copy,
  Edit3
} from 'lucide-react';
import { ContourMapRenderer, ContourSubQuestion } from '../questions/ContourMapRenderer';
import { EIGHT_DIRECTIONS, extractPolygonPoints } from '../../../shared/contourUtils';

export interface Pattern11FormData {
  prompt: string;
  mapUrl?: string;
  mapCode?: string;
  subQuestions: ContourSubQuestion[];
  subAnswers: Record<string, any>;
  totalMarks: number;
}

export interface Pattern11AuthoringFormProps {
  initialValues?: Partial<Pattern11FormData>;
  onChange: (data: Pattern11FormData) => void;
  onSave?: () => void;
}

export const Pattern11AuthoringForm: React.FC<Pattern11AuthoringFormProps> = ({
  initialValues,
  onChange,
  onSave,
}) => {
  const [prompt, setPrompt] = useState<string>(
    initialValues?.prompt ||
      'من خلال الخريطة الكنتورية الطوبوغرافية المرفقة، اقرأ البيانات والخطوط الكنتورية ثم أجب عن الفروع التالية:'
  );
  const [mapUrl, setMapUrl] = useState<string>(initialValues?.mapUrl || '/assets/maps/contour_01.png');
  const [mapCode, setMapCode] = useState<string>(initialValues?.mapCode || 'MAP_SUDAN_CONTOUR_01');
  const [totalMarks, setTotalMarks] = useState<number>(initialValues?.totalMarks || 10);

  // SubQuestions list
  const [subQuestions, setSubQuestions] = useState<ContourSubQuestion[]>(
    initialValues?.subQuestions && initialValues.subQuestions.length > 0
      ? initialValues.subQuestions
      : [
          {
            id: 'cm_1',
            question: 'ما هي قيمة الفاصل الكنتوري الرأسي بين خطوط الارتفاع؟',
            unit: 'متر',
            inputType: 'numeric',
            numericTolerance: 1,
            explanation: 'الفاصل الكنتوري هو الفرق في الارتفاع الرأسي بين خطي كنتور متتاليين = 20 متر.',
          },
          {
            id: 'cm_2',
            question: 'ما هو الاتجاه العام لانحدار الوادي وجريان الخور؟',
            unit: '',
            inputType: 'direction8',
            explanation: 'ينحدر مجرى الوادي من المرتفعات الشمالية الشرقية نحو المنخفضات في الجنوب الغربي.',
          },
          {
            id: 'cm_3',
            question: 'ظلل المنطقة التي يزيد ارتفاعها عن 1500 متر على الخريطة.',
            unit: '',
            inputType: 'mapOverlay',
            overlayMatchThreshold: 0.7,
            explanation: 'المنطقة المحصورة داخل خط الكنتور المغلق المكتوب عليه 1500م في قمة التل.',
          },
        ]
  );

  // Correct subAnswers map
  const [subAnswers, setSubAnswers] = useState<Record<string, any>>(
    initialValues?.subAnswers || {
      cm_1: '20',
      cm_2: 'جنوب غربي',
      cm_3: {
        regions: [
          {
            polygon: [
              [40, 30],
              [60, 30],
              [65, 55],
              [45, 60],
              [35, 45],
            ],
          },
        ],
      },
    }
  );

  // Active view tab: 'authoring' or 'preview'
  const [activeTab, setActiveTab] = useState<'authoring' | 'preview'>('authoring');
  const [previewExamMode, setPreviewExamMode] = useState<'training' | 'simulator' | 'review'>('training');

  // Currently selected overlay branch for polygon mapping
  const overlayBranches = subQuestions.filter((sq) => sq.inputType === 'mapOverlay');
  const [selectedOverlaySubQId, setSelectedOverlaySubQId] = useState<string>(
    overlayBranches[0]?.id || ''
  );

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [copyJsonToast, setCopyJsonToast] = useState<boolean>(false);

  // Notify parent of state changes
  const notifyChange = (
    newPrompt: string,
    newMapUrl: string,
    newMapCode: string,
    newSubQuestions: ContourSubQuestion[],
    newSubAnswers: Record<string, any>,
    newMarks: number
  ) => {
    onChange({
      prompt: newPrompt,
      mapUrl: newMapUrl,
      mapCode: newMapCode,
      subQuestions: newSubQuestions,
      subAnswers: newSubAnswers,
      totalMarks: newMarks,
    });
  };

  useEffect(() => {
    notifyChange(prompt, mapUrl, mapCode, subQuestions, subAnswers, totalMarks);
  }, []);

  const handleAddSubQuestion = () => {
    const nextIdx = subQuestions.length + 1;
    const nextId = `cm_${nextIdx}`;
    const newSub: ContourSubQuestion = {
      id: nextId,
      question: `فرع جديد #${nextIdx}: `,
      unit: '',
      inputType: 'text',
      explanation: '',
    };
    const updated = [...subQuestions, newSub];
    setSubQuestions(updated);
    notifyChange(prompt, mapUrl, mapCode, updated, subAnswers, totalMarks);
  };

  const handleRemoveSubQuestion = (id: string) => {
    if (subQuestions.length <= 1) return;
    const updated = subQuestions.filter((sq) => sq.id !== id);
    const updatedAnswers = { ...subAnswers };
    delete updatedAnswers[id];
    setSubQuestions(updated);
    setSubAnswers(updatedAnswers);
    notifyChange(prompt, mapUrl, mapCode, updated, updatedAnswers, totalMarks);
  };

  const handleUpdateSubField = (id: string, field: keyof ContourSubQuestion, val: any) => {
    const updated = subQuestions.map((sq) => (sq.id === id ? { ...sq, [field]: val } : sq));
    setSubQuestions(updated);
    notifyChange(prompt, mapUrl, mapCode, updated, subAnswers, totalMarks);
  };

  const handleUpdateSubAnswer = (id: string, val: any) => {
    const updatedAnswers = {
      ...subAnswers,
      [id]: val,
    };
    setSubAnswers(updatedAnswers);
    notifyChange(prompt, mapUrl, mapCode, subQuestions, updatedAnswers, totalMarks);
  };

  // Click on map to add polygon vertex for model answer in mapOverlay
  const handleMapPolygonClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedOverlaySubQId) return;
    const rect = imageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;

    const currentPoly: [number, number][] =
      extractPolygonPoints(subAnswers[selectedOverlaySubQId]) || [];

    const updatedPoly = [...currentPoly, [x, y] as [number, number]];
    handleUpdateSubAnswer(selectedOverlaySubQId, {
      regions: [{ polygon: updatedPoly }],
      polygon: updatedPoly,
    });
  };

  const handleClearPolygon = (id: string) => {
    handleUpdateSubAnswer(id, { regions: [{ polygon: [] }], polygon: [] });
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setMapUrl(result);
        notifyChange(prompt, result, mapCode, subQuestions, subAnswers, totalMarks);
      }
    };
    reader.readAsDataURL(file);
  };

  // Preset 4-branch Sudanese National Certificate Model
  const loadSudanStandardPreset = () => {
    const presetQuestions: ContourSubQuestion[] = [
      {
        id: 'cm_1',
        question: 'ما هي قيمة الفاصل الكنتوري الرأسي بين خطوط الارتفاع المتساوية؟',
        unit: 'متر',
        inputType: 'numeric',
        numericTolerance: 1,
        hint: 'قانون حساب الفاصل الرأسي = (الفرق بين قيمتي خطين رئيسيين متجاورين) ÷ (عدد الفواصل بينهما)',
        explanation: 'الفاصل الكنتوري = (1200 - 1000) ÷ 10 = 20 متراً.',
      },
      {
        id: 'cm_2',
        question: 'ما هو الاتجاه العام لانحدار الوادي وجريان الخور الرئيسي في الخريطة؟',
        unit: '',
        inputType: 'direction8',
        options: ['جنوب غربي', 'شمال شرقي', 'جنوب شرقي', 'شمال غربي'],
        explanation: 'ينحدر مجرى الوادي من المرتفعات الشمالية الشرقية نحو المنخفضات في الجنوب الغربي.',
      },
      {
        id: 'cm_3',
        question: 'حدد وظلل منطقة التل المخروطي على الخريطة.',
        unit: '',
        inputType: 'mapOverlay',
        overlayMatchThreshold: 0.6,
        explanation: 'المنطقة المحصورة داخل خط الكنتور المغلق الذي يعلو 1500م في قمة التل بالقطاع الأوسط.',
      },
      {
        id: 'cm_4',
        question: 'صف الظاهرة التضاريسية التي تمثلها الخطوط الكنتورية المغلقة في القطاع الأوسط.',
        unit: '',
        inputType: 'text',
        options: ['تل مخروطي', 'هضبة شديدة الانحدار', 'حافة جرف صخري', 'خانق نهري عميق'],
        explanation: 'خطوط كنتورية دائرية متقاربة ذات منسوب متزايد للداخل تمثل تلاً مخروطياً.',
      },
    ];

    const presetAnswers: Record<string, any> = {
      cm_1: '20',
      cm_2: 'جنوب غربي',
      cm_3: {
        regions: [
          {
            polygon: [
              [35, 25],
              [65, 25],
              [70, 50],
              [50, 65],
              [30, 45],
            ],
          },
        ],
      },
      cm_4: 'تل مخروطي',
    };

    setSubQuestions(presetQuestions);
    setSubAnswers(presetAnswers);
    setTotalMarks(10);
    notifyChange(prompt, mapUrl, mapCode, presetQuestions, presetAnswers, 10);
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(
      {
        questionType: 'contour_map',
        prompt,
        content: {
          mapCode,
          mapUrl,
          subQuestions,
        },
        correctAnswer: {
          subAnswers,
        },
        allocatedMarks: totalMarks,
      },
      null,
      2
    );
    navigator.clipboard.writeText(jsonStr);
    setCopyJsonToast(true);
    setTimeout(() => setCopyJsonToast(false), 3000);
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-3xl border border-amber-200/80 shadow-xs">
      {/* Header and Preset Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">
              محرر إدخال وضبط الخرائط الكنتورية والطوبوغرافية (النمط 11)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              إدخال الفروع الحسابية، الاتجاهات الثمانية، ورسم مناطق التظليل المكاني (Polygon Overlay)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadSudanStandardPreset}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="تحميل نموذج الشهادة السودانية المعتمد (4 فروع)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>نموذج الشهادة السودانية (4 فروع)</span>
          </button>

          <button
            type="button"
            onClick={handleCopyJson}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copyJsonToast ? 'تم النسخ!' : 'نسخ كود JSON'}</span>
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('authoring')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'authoring'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 inline ml-1" />
              <span>التحرير والربط</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 inline ml-1" />
              <span>معاينة حية للطالب</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Step Sequence Guide: مراحل إدخال وتعديل الخرائط الكنتورية المعتمدة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/70 text-xs">
        <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-black text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md inline-block">
            المرحلة 1: إنشاء الأساس
          </span>
          <p className="font-bold text-slate-800 text-[11px] leading-tight">
            إدخال نص السؤال، الفروع، تلميح حساب الفاصل، وخيارات التدريب دون اشتراط صورة كبداية.
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-indigo-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-black text-indigo-800 bg-indigo-100/80 px-2 py-0.5 rounded-md inline-block">
            المرحلة 2: إدراج ورفع الخريطة
          </span>
          <p className="font-bold text-slate-800 text-[11px] leading-tight">
            رفع صورة الخريطة أو إدخال رابطها لتفعيل نظام التحديد والربط البصري فور ظهورها.
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md inline-block">
            المرحلة 3: الربط والتحديد التفاعلي
          </span>
          <p className="font-bold text-slate-800 text-[11px] leading-tight">
            النقر المباشر على الخريطة لتحديد منطقة التل وحفظ إحداثياتها تلقائياً كإجابة صحيحة.
          </p>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-purple-200/80 shadow-2xs space-y-1">
          <span className="text-[10px] font-black text-purple-800 bg-purple-100/80 px-2 py-0.5 rounded-md inline-block">
            المرحلة 4: المعاينة المزدوجة للطالب
          </span>
          <p className="font-bold text-slate-800 text-[11px] leading-tight">
            معاينة وضع التدريب (MCQ + تلميح الفاصل) ووضع الامتحان الكامل (فراغات نصية ذاتية التصحيح).
          </p>
        </div>
      </div>

      {activeTab === 'authoring' ? (
        <div className="space-y-6">
          {/* Section 1: Map Metadata & Image Upload */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <span className="text-xs font-black text-slate-800 block">
              1. إعدادات الخريطة والرابط والصورة:
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  رابط صورة الخريطة (URL أو رفع ملف):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={mapUrl}
                    onChange={(e) => {
                      setMapUrl(e.target.value);
                      notifyChange(prompt, e.target.value, mapCode, subQuestions, subAnswers, totalMarks);
                    }}
                    placeholder="/assets/maps/contour_01.png"
                    className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <label className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5 text-amber-700" />
                    <span>رفع صورة</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">رمز الخريطة المنهجي:</label>
                <input
                  type="text"
                  value={mapCode}
                  onChange={(e) => {
                    setMapCode(e.target.value);
                    notifyChange(prompt, mapUrl, e.target.value, subQuestions, subAnswers, totalMarks);
                  }}
                  placeholder="MAP_SUDAN_CONTOUR_01"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">نص السؤال والمسألة المطروحة:</label>
              <textarea
                rows={2}
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  notifyChange(e.target.value, mapUrl, mapCode, subQuestions, subAnswers, totalMarks);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
              />
            </div>
          </div>

          {/* Section 2: Interactive Polygon Mapping Layer (if mapOverlay exists) */}
          {overlayBranches.length > 0 && mapUrl && (
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-700" />
                  <span className="text-xs font-black text-indigo-950">
                    أداة رسم المنطقة المعتمدة للحل النموذجي (Interactive Polygon Drawer):
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600">اختر الفرع المكاني:</span>
                  <select
                    value={selectedOverlaySubQId}
                    onChange={(e) => setSelectedOverlaySubQId(e.target.value)}
                    className="bg-white border border-indigo-300 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-900 focus:outline-none"
                  >
                    {overlayBranches.map((ob, idx) => (
                      <option key={ob.id} value={ob.id}>
                        فرع #{idx + 1} ({ob.question.substring(0, 30)}...)
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleClearPolygon(selectedOverlaySubQId)}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>مسح المضلع</span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-indigo-900 leading-relaxed">
                انقر فوق صورة الخريطة بالترتيب لتحديد رؤوس المنطقة النموذجية (Polygon Vertices). سيتم حفظ
                إحداثياتها تلقائياً كإجابة معتمدة للفرع المحدد.
              </p>

              {/* Map Canvas for Placing Polygon Vertices */}
              <div
                ref={imageContainerRef}
                onClick={handleMapPolygonClick}
                className="relative max-w-xl mx-auto rounded-xl overflow-hidden border-2 border-indigo-300 shadow-sm cursor-crosshair select-none bg-slate-900"
              >
                <img src={mapUrl} alt="الخريطة الكنتورية" className="w-full h-auto object-contain block pointer-events-none" />

                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {selectedOverlaySubQId &&
                    (() => {
                      const poly = extractPolygonPoints(subAnswers[selectedOverlaySubQId]);
                      if (!poly || poly.length === 0) return null;
                      const ptsString = poly.map(([px, py]) => `${px},${py}`).join(' ');
                      return (
                        <g>
                          <polygon
                            points={ptsString}
                            fill={poly.length >= 3 ? 'rgba(16, 185, 129, 0.4)' : 'none'}
                            stroke="#10b981"
                            strokeWidth="1"
                          />
                          {poly.map(([px, py], pIdx) => (
                            <circle key={pIdx} cx={px} cy={py} r="1.5" fill="#ffffff" stroke="#059669" strokeWidth="0.8" />
                          ))}
                        </g>
                      );
                    })()}
                </svg>
              </div>

              <div className="text-[11px] font-mono text-center text-slate-500">
                إحداثيات المضلع للفرع [{selectedOverlaySubQId}]:{' '}
                {JSON.stringify(extractPolygonPoints(subAnswers[selectedOverlaySubQId]) || [])}
              </div>
            </div>
          )}

          {/* Section 3: SubQuestions List Editor */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-black text-slate-900">
                2. الفروع والأسئلة المرتبطة بالخريطة ({subQuestions.length}):
              </span>
              <button
                type="button"
                onClick={handleAddSubQuestion}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ إضافة فرع سؤال</span>
              </button>
            </div>

            <div className="space-y-4">
              {subQuestions.map((sq, idx) => (
                <div key={sq.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-900 text-white text-xs font-black flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-600">معرف الفرع: [{sq.id}]</span>
                    </div>

                    {subQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubQuestion(sq.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف الفرع</span>
                      </button>
                    )}
                  </div>

                  {/* Question Text */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">نص السؤال الفرعي:</label>
                    <input
                      type="text"
                      value={sq.question}
                      onChange={(e) => handleUpdateSubField(sq.id, 'question', e.target.value)}
                      placeholder="ما هي قيمة الفاصل الكنتوري؟"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Input Type, Unit, Tolerance */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">نوع الإدخال والتصحيح:</label>
                      <select
                        value={sq.inputType || 'text'}
                        onChange={(e) => handleUpdateSubField(sq.id, 'inputType', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="numeric">قيمة رقمية (numeric)</option>
                        <option value="direction8">اتجاه من 8 جهات (direction8)</option>
                        <option value="mapOverlay">تظليل مكاني مضلع (mapOverlay)</option>
                        <option value="text">نص عام (text)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">وحدة القياس المنهجية (إن وجدت):</label>
                      <input
                        type="text"
                        value={sq.unit || ''}
                        onChange={(e) => handleUpdateSubField(sq.id, 'unit', e.target.value)}
                        placeholder="متر، كم، درجة..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        {sq.inputType === 'numeric'
                          ? 'هامش التسامح الرقمي (Tolerance):'
                          : sq.inputType === 'mapOverlay'
                            ? 'نسبة تطابق التظليل (IoU):'
                            : 'معيار المطابقة:'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={
                          sq.inputType === 'numeric'
                            ? sq.numericTolerance ?? 0
                            : sq.inputType === 'mapOverlay'
                              ? sq.overlayMatchThreshold ?? 0.7
                              : 0
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (sq.inputType === 'numeric') {
                            handleUpdateSubField(sq.id, 'numericTolerance', val);
                          } else if (sq.inputType === 'mapOverlay') {
                            handleUpdateSubField(sq.id, 'overlayMatchThreshold', val);
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-black text-center text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Correct Answer Field */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-200">
                    <label className="text-[11px] font-black text-emerald-900 block">
                      الإجابة النموذجية المعتمدة للفرع:
                    </label>

                    {sq.inputType === 'direction8' ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={subAnswers[sq.id] || ''}
                          onChange={(e) => handleUpdateSubAnswer(sq.id, e.target.value)}
                          placeholder="مثلاً: جنوب غربي"
                          className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-950 focus:outline-none"
                        />
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold">خيارات سريعة:</span>
                          {EIGHT_DIRECTIONS.map((dir) => (
                            <button
                              key={dir}
                              type="button"
                              onClick={() => handleUpdateSubAnswer(sq.id, dir)}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                                subAnswers[sq.id] === dir
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {dir}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : sq.inputType === 'mapOverlay' ? (
                      <div className="p-2.5 bg-white border border-emerald-300 rounded-xl text-xs flex items-center justify-between">
                        <span className="font-bold text-slate-700">
                          {extractPolygonPoints(subAnswers[sq.id])?.length
                            ? `تم تحديد المضلع بنجاح (${extractPolygonPoints(subAnswers[sq.id])?.length} نقاط)`
                            : 'انقر على أداة رسم المنطقة أعلاه لتحديد نقاط المضلع'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedOverlaySubQId(sq.id)}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                        >
                          تحديد على الخريطة
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={subAnswers[sq.id] || ''}
                        onChange={(e) => handleUpdateSubAnswer(sq.id, e.target.value)}
                        placeholder="الإجابة الصحيحة المعتمدة..."
                        className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-950 focus:outline-none"
                      />
                    )}
                  </div>

                  {/* Methodological Explanation */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 block">
                      الشرح والتوجيه المنهجي (يظهر للطالب عند المراجعة أو التدريب):
                    </label>
                    <input
                      type="text"
                      value={sq.explanation || ''}
                      onChange={(e) => handleUpdateSubField(sq.id, 'explanation', e.target.value)}
                      placeholder="بيان سبب صحة الناتج، القانون المستخدم أو خطوط الكنتور المستند عليها..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
                    />
                  </div>

                  {/* Hint Field (for Interval Formula or Guidance) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-amber-800 block">
                      {sq.inputType === 'numeric'
                        ? 'تلميح طريقة حساب الفاصل الرأسي (يظهر عند ضغط الطالب على زر التلميح 💡):'
                        : 'تلميح تعليمي اختياري للفرع:'}
                    </label>
                    <input
                      type="text"
                      value={sq.hint || ''}
                      onChange={(e) => handleUpdateSubField(sq.id, 'hint', e.target.value)}
                      placeholder={
                        sq.inputType === 'numeric'
                          ? 'قانون حساب الفاصل الرأسي = (الفرق بين قيمتي خطين رئيسيين متجاورين) ÷ (عدد الفواصل بينهما)'
                          : 'تلميح تعليمي لمساعدة الطالب في الحل...'
                      }
                      className="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Training Options Field (MCQ choices in training mode) */}
                  {(sq.inputType === 'direction8' || sq.inputType === 'text') && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        خيارات التدريب (اختيار من متعدد - مفصولة بفاصلة):
                      </label>
                      <input
                        type="text"
                        value={(sq.options || []).join('، ')}
                        onChange={(e) => {
                          const opts = e.target.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
                          handleUpdateSubField(sq.id, 'options', opts);
                        }}
                        placeholder={
                          sq.inputType === 'direction8'
                            ? 'جنوب غربي، شمال شرقي، جنوب شرقي، شمال غربي'
                            : 'تل مخروطي، هضبة شديدة الانحدار، حافة جرف صخري، خانق نهري عميق'
                        }
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 block">
                        في وضع التدريب تظهر هذه الخيارات كأزرار اختيار من متعدد، بينما في وضع الامتحان الكامل تظهر كفراغ نصي يُصحح تلقائياً.
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Preview Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <span className="text-xs font-black text-slate-800">وضع المعاينة الحية للطالب:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewExamMode('training')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  previewExamMode === 'training'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                وضع التدريب (مع تصحيح فوري)
              </button>
              <button
                type="button"
                onClick={() => setPreviewExamMode('simulator')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  previewExamMode === 'simulator'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                وضع المحاكاة (امتحان كامل)
              </button>
              <button
                type="button"
                onClick={() => setPreviewExamMode('review')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  previewExamMode === 'review'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                وضع المراجعة بعد التسليم
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50/50 rounded-3xl border border-slate-200">
            <ContourMapRenderer
              content={{
                prompt,
                mapUrl,
                mapCode,
                subQuestions,
              }}
              answer={{ subAnswers }}
              correctAnswer={{ subAnswers }}
              examMode={previewExamMode}
              studentAnswers={previewExamMode === 'review' ? subAnswers : undefined}
              onChange={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};
