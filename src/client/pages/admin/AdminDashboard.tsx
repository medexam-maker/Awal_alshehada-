import React, { useState } from 'react';
import { TWELVE_CONTRACT_SUBJECTS, ContractSubject } from '../../data/contractSubjects';
import { curriculumStorage } from '../../storage/curriculumStorage';
import { SubjectExamBlueprint, QuestionPattern, AuthoredQuestion } from '../../types/curriculum';
import { QuestionType } from '../../../shared/constants';
import { apiClient } from '../../api/apiClient';
import {
  Settings,
  PlusCircle,
  Save,
  RotateCcw,
  Trash2,
  Layers,
  BookOpen,
  Calendar,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  Eye,
  FileText,
  Clock,
  ListPlus,
  ArrowRight,
  Sliders,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardProps {
  onBackToStudentView: () => void;
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  [QuestionType.TRUE_FALSE]: 'صح أو خطأ (True/False)',
  [QuestionType.MULTIPLE_CHOICE]: 'اختيار من متعدد (Multiple Choice)',
  [QuestionType.FILL_BLANK]: 'إكمال الفراغ (Fill in the Blank)',
  [QuestionType.MATCHING]: 'المطابقة والتوصيل (Matching)',
  [QuestionType.SHORT_ESSAY]: 'مقالي قصير (Short Essay)',
  [QuestionType.LONG_ESSAY]: 'مقالي طويل وإنشاء (Long Essay)',
  [QuestionType.EXPLAIN]: 'علل وفسر (Explain/Reason)',
  [QuestionType.COMPARISON_TABLE]: 'جدول مقارنة (Comparison Table)',
  [QuestionType.ODD_ONE_OUT]: 'استخرج الكلمة الشاذة (Odd One Out)',
  [QuestionType.DIAGRAM_LABELING]: 'تسمية أجزاء الرسم التوضيحي (Diagram Labeling)',
  [QuestionType.CONTOUR_MAP]: 'خريطة كنتورية وتضاريس (Contour Map)',
  [QuestionType.CALCULATION]: 'مسألة حسابية وقوانين (Calculation)',
  [QuestionType.ORDERING]: 'ترتيب تسلسلي وزمني (Ordering)',
  [QuestionType.ARABIC_GRAMMAR]: 'إعراب وضبط نحوي (Arabic Grammar)',
  [QuestionType.READING_COMPREHENSION]: 'قطعة وفهم واستيعاب (Reading Comprehension)',
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToStudentView }) => {
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState<string>(TWELVE_CONTRACT_SUBJECTS[0].slug);
  const [activeTab, setActiveTab] = useState<'blueprint' | 'authoring' | 'bank'>('blueprint');

  const selectedSubject = TWELVE_CONTRACT_SUBJECTS.find((s) => s.slug === selectedSubjectSlug) || TWELVE_CONTRACT_SUBJECTS[0];
  const [blueprint, setBlueprint] = useState<SubjectExamBlueprint>(() => curriculumStorage.getSubjectBlueprint(selectedSubjectSlug));
  const [questionsList, setQuestionsList] = useState<AuthoredQuestion[]>(() => curriculumStorage.getQuestionsBySubject(selectedSubjectSlug));

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const [isLoadingBank, setIsLoadingBank] = useState<boolean>(false);
  const [bankError, setBankError] = useState<string | null>(null);

  const fetchServerQuestions = async (slug: string) => {
    setIsLoadingBank(true);
    setBankError(null);
    try {
      const res = await apiClient.request<Array<any>>(`/api/admin/questions?subjectSlug=${slug}`);
      if (res?.success && Array.isArray(res.data)) {
        if (res.data.length > 0) {
          const serverQuestions: AuthoredQuestion[] = res.data.map((row: any) => ({
            id: row.id,
            subjectSlug: row.subjectSlug || slug,
            questionNumber: 1,
            partLabel: 'أ',
            questionType: row.questionType,
            prompt: row.content?.prompt || row.prompt || '',
            content: row.content || {},
            correctAnswer: row.correctAnswer,
            allocatedMarks: Number(row.allocatedMarks) || 5,
            explanationAr: row.explanationAr,
            examScope: (row.examScope as any) || 'both',
            examYear: row.examYear || undefined,
            status: row.status || 'approved',
            createdAt: row.createdAt || new Date().toISOString(),
          }));
          const localQuestions = curriculumStorage.getQuestionsBySubject(slug);
          const combined = [...serverQuestions];
          localQuestions.forEach((lq) => {
            if (!combined.some((cq) => cq.id === lq.id)) {
              combined.push(lq);
            }
          });
          setQuestionsList(combined);
        } else {
          setQuestionsList(curriculumStorage.getQuestionsBySubject(slug));
        }
      } else {
        setQuestionsList(curriculumStorage.getQuestionsBySubject(slug));
      }
    } catch {
      setBankError('تعذر جلب الأسئلة من قاعدة البيانات المركزية؛ يتم العرض من مسودة المتصفح المحلية.');
      setQuestionsList(curriculumStorage.getQuestionsBySubject(slug));
    } finally {
      setIsLoadingBank(false);
    }
  };

  const handleSubjectChange = (slug: string) => {
    setSelectedSubjectSlug(slug);
    setBlueprint(curriculumStorage.getSubjectBlueprint(slug));
    setQuestionsList(curriculumStorage.getQuestionsBySubject(slug));
    if (activeTab === 'bank') {
      fetchServerQuestions(slug);
    }
  };

  // ==========================================
  // TAB 1: BLUEPRINT MANAGEMENT LOGIC
  // ==========================================
  const handleUpdatePattern = (index: number, updatedFields: Partial<QuestionPattern>) => {
    const updatedPatterns = [...blueprint.patterns];
    updatedPatterns[index] = { ...updatedPatterns[index], ...updatedFields };
    setBlueprint({
      ...blueprint,
      patterns: updatedPatterns,
    });
  };

  const handleAddPattern = () => {
    const nextQNum = blueprint.patterns.length > 0
      ? Math.max(...blueprint.patterns.map((p) => p.questionNumber)) + 1
      : 1;

    const newPattern: QuestionPattern = {
      id: `${blueprint.subjectSlug}_q${nextQNum}_a_${Date.now()}`,
      subjectSlug: blueprint.subjectSlug,
      questionNumber: nextQNum,
      partLabel: 'أ',
      questionType: QuestionType.MULTIPLE_CHOICE,
      title: `السؤال ${nextQNum} (أ): نمط اختياري`,
      allocatedMarks: 10,
      instructions: 'أجب عن السؤال وفق المطلوب.',
    };

    setBlueprint({
      ...blueprint,
      patterns: [...blueprint.patterns, newPattern],
    });
  };

  const handleAddBranch = (qNumber: number) => {
    const existingParts = blueprint.patterns.filter((p) => p.questionNumber === qNumber);
    const partLabels = ['أ', 'ب', 'ج', 'د', 'هـ'];
    const nextPart = partLabels[existingParts.length] || `فرع ${existingParts.length + 1}`;

    const newBranch: QuestionPattern = {
      id: `${blueprint.subjectSlug}_q${qNumber}_${nextPart}_${Date.now()}`,
      subjectSlug: blueprint.subjectSlug,
      questionNumber: qNumber,
      partLabel: nextPart,
      questionType: QuestionType.FILL_BLANK,
      title: `السؤال ${qNumber} (${nextPart}): فرع إضافي`,
      allocatedMarks: 5,
      instructions: 'أجب عن الفرع التالي بدقة.',
    };

    const updatedPatterns = [...blueprint.patterns, newBranch].sort((a, b) => {
      if (a.questionNumber !== b.questionNumber) return a.questionNumber - b.questionNumber;
      return a.partLabel.localeCompare(b.partLabel);
    });

    setBlueprint({
      ...blueprint,
      patterns: updatedPatterns,
    });
  };

  const handleDeletePattern = (patternId: string) => {
    const updated = blueprint.patterns.filter((p) => p.id !== patternId);
    setBlueprint({
      ...blueprint,
      patterns: updated,
    });
  };

  const handleSaveBlueprint = () => {
    curriculumStorage.saveSubjectBlueprint(blueprint);
    showNotification(`تم حفظ وتعميم هيكل ورقة الامتحان لمادة (${blueprint.name_ar}) بنجاح!`, 'success');
  };

  const handleResetBlueprint = () => {
    const res = curriculumStorage.resetSubjectBlueprint(selectedSubjectSlug);
    setBlueprint(res);
    showNotification('تمت استعادة الهيكل القياسي الافتراضي للمادة بنجاح.', 'info');
  };

  // ==========================================
  // TAB 2: QUESTION AUTHORING LOGIC
  // ==========================================
  const [targetScope, setTargetScope] = useState<'both' | 'curriculum_review' | 'yearly_exam'>('both');
  const [authoringYear, setAuthoringYear] = useState<number>(2024);
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');

  const [questionPrompt, setQuestionPrompt] = useState<string>('');
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.MULTIPLE_CHOICE);
  const [questionMarks, setQuestionMarks] = useState<number>(5);
  const [questionNumber, setQuestionNumber] = useState<number>(1);
  const [questionPart, setQuestionPart] = useState<string>('أ');
  const [explanationAr, setExplanationAr] = useState<string>('');

  // Type-specific states
  const [tfAnswer, setTfAnswer] = useState<boolean>(true);
  const [mcqOptions, setMcqOptions] = useState<string[]>([
    'الخيار الأول (أ)',
    'الخيار الثاني (ب)',
    'الخيار الثالث (ج)',
    'الخيار الرابع (د)',
  ]);
  const [mcqCorrectIndex, setMcqCorrectIndex] = useState<number>(0);
  const [blankAnswer, setBlankAnswer] = useState<string>('');
  const [grammarWord, setGrammarWord] = useState<string>('');
  const [grammarAnswer, setGrammarAnswer] = useState<string>('');
  const [oddWords, setOddWords] = useState<string>('كلمة 1، كلمة 2، كلمة 3، كلمة شاذة');
  const [oddAnswer, setOddAnswer] = useState<string>('كلمة شاذة');
  const [calcExpression, setCalcExpression] = useState<string>('');
  const [calcAnswer, setCalcAnswer] = useState<string>('');

  // Handle selecting a blueprint pattern to auto-fill metadata
  const handleSelectPatternForAuthoring = (pId: string) => {
    setSelectedPatternId(pId);
    const pat = blueprint.patterns.find((p) => p.id === pId);
    if (pat) {
      setQuestionType(pat.questionType);
      setQuestionMarks(pat.allocatedMarks);
      setQuestionNumber(pat.questionNumber);
      setQuestionPart(pat.partLabel);
      if (!questionPrompt) {
        setQuestionPrompt(pat.instructions);
      }
    }
  };

  const handleSaveAuthoredQuestion = () => {
    if (!questionPrompt.trim()) {
      showNotification('يرجى كتابة نص السؤال قبل الحفظ.', 'info');
      return;
    }

    let content: Record<string, any> = {};
    let correctAnswer: any = null;

    if (questionType === QuestionType.TRUE_FALSE) {
      content = {
        prompt: questionPrompt.trim(),
        statement: questionPrompt.trim(),
        explanation: explanationAr.trim() || undefined,
      };
      correctAnswer = { value: Boolean(tfAnswer) };
    } else if (questionType === QuestionType.MULTIPLE_CHOICE) {
      content = {
        options: mcqOptions.map((opt, idx) => ({ id: `opt${idx + 1}`, text: opt })),
      };
      correctAnswer = { selectedOptionId: `opt${mcqCorrectIndex + 1}` };
    } else if (questionType === QuestionType.FILL_BLANK) {
      content = { textWithBlanks: questionPrompt };
      correctAnswer = { blank1: blankAnswer };
    } else if (questionType === QuestionType.ARABIC_GRAMMAR) {
      content = { targetWord: grammarWord, fullSentence: questionPrompt };
      correctAnswer = grammarAnswer;
    } else if (questionType === QuestionType.ODD_ONE_OUT) {
      content = { words: oddWords.split('،').map((w) => w.trim()) };
      correctAnswer = oddAnswer.trim();
    } else if (questionType === QuestionType.CALCULATION) {
      content = { expression: calcExpression };
      correctAnswer = calcAnswer;
    } else {
      content = { instructions: questionPrompt };
      correctAnswer = blankAnswer || 'الإجابة النموذجية المعتمدة';
    }

    const newQuestion: AuthoredQuestion = {
      id: `q_auth_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      subjectSlug: selectedSubjectSlug,
      patternId: selectedPatternId || undefined,
      questionNumber,
      partLabel: questionPart,
      questionType,
      prompt: questionPrompt,
      content,
      correctAnswer,
      allocatedMarks: Number(questionMarks) || 5,
      explanationAr,
      examScope: targetScope,
      examYear: targetScope === 'curriculum_review' ? undefined : authoringYear,
      status: 'approved',
      createdAt: new Date().toISOString(),
    };

    const draftId = newQuestion.id;

    // 1. Maintain local draft/cache buffer
    curriculumStorage.saveQuestion(newQuestion);
    setQuestionsList(curriculumStorage.getQuestionsBySubject(selectedSubjectSlug));

    // 2. Dispatch to central server PostgreSQL question management endpoint
    apiClient
      .request<{ id: string }>('/api/admin/questions', {
        method: 'POST',
        body: JSON.stringify({
          subjectSlug: selectedSubjectSlug,
          questionType,
          prompt: questionPrompt,
          content,
          correctAnswer,
          allocatedMarks: Number(questionMarks) || 5,
          explanationAr,
          examYear: targetScope === 'curriculum_review' ? undefined : authoringYear,
        }),
      })
      .then((res) => {
        if (res?.success && res.data?.id) {
          // Reconcile local draft ID with the authoritative server-returned UUID
          curriculumStorage.reconcileQuestionId(draftId, res.data.id);
          setQuestionsList(curriculumStorage.getQuestionsBySubject(selectedSubjectSlug));
          showNotification(`تم حفظ واعتماد السؤال بنجاح في قاعدة البيانات المركزية (PostgreSQL)!`, 'success');
        } else {
          showNotification(`تم حفظ السؤال في مسودة المتصفح المحلية (الخادم غير متصل أو يلزم حساب مسؤول).`, 'info');
        }
      })
      .catch(() => {
        showNotification(`تم حفظ السؤال كمسودة محلية بنجاح في المتصفح.`, 'info');
      });

    // Reset prompt and feedback
    setQuestionPrompt('');
    setExplanationAr('');
    setBlankAnswer('');
    setGrammarAnswer('');
  };

  const handleDeleteQuestion = async (qId: string) => {
    try {
      const res = await apiClient.request<{ id: string; status: string }>(`/api/admin/questions/${qId}`, {
        method: 'DELETE',
      });
      curriculumStorage.deleteQuestion(qId);
      setQuestionsList((prev) => prev.filter((q) => q.id !== qId));
      if (res?.success) {
        showNotification(res.message || 'تم حذف/أرشفة السؤال بنجاح من قاعدة البيانات المركزية.', 'success');
      } else {
        showNotification('تم حذف السؤال من الذاكرة المحلية.', 'info');
      }
    } catch {
      curriculumStorage.deleteQuestion(qId);
      setQuestionsList((prev) => prev.filter((q) => q.id !== qId));
      showNotification('تم حذف السؤال من الذاكرة المحلية للمتصفح.', 'info');
    }
  };

  return (
    <div className="max-w-6xl w-full mx-auto py-4 space-y-6">
      {/* Top Bar with Navigation Back to Student View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900">لوحة تحكم وإدخال هيكل الامتحان (Admin)</h1>
            <p className="text-xs text-slate-500 font-medium">
              ضبط هيكل الورقة وتعميمه على المادة، وإدخال الأسئلة للأنماط الـ 15 المعتمدة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToStudentView}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لواجهة الطالب والامتحانات</span>
        </button>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border shadow-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Subject Selector Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700 block">
            المادة المراد إدارتها وضبط هيكلها وإدخال أسئلتها:
          </label>
          <select
            value={selectedSubjectSlug}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full md:w-80 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-extrabold text-slate-900 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            {TWELVE_CONTRACT_SUBJECTS.map((sub) => (
              <option key={sub.slug} value={sub.slug}>
                {sub.name_ar} ({sub.name_en})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold">
            <span className="text-slate-400 ml-1">إجمالي الأسئلة والفروع:</span>
            <span className="text-emerald-700">{blueprint.patterns.length}</span>
          </div>
          <div className="px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold">
            <span className="text-slate-400 ml-1">الدرجة الكلية للورقة:</span>
            <span className="text-emerald-700">{blueprint.totalMarks} درجة</span>
          </div>
          <div className="px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-bold">
            <span className="text-slate-400 ml-1">الزمن المعتمد:</span>
            <span className="text-emerald-700">{blueprint.defaultDurationMinutes} دقيقة</span>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('blueprint')}
          className={`pb-3 px-4 text-sm font-black transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'blueprint'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. ضبط هيكل ورقة الامتحان للمادة (Blueprint)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('authoring')}
          className={`pb-3 px-4 text-sm font-black transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'authoring'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>2. محرك إدخال الأسئلة للأنماط الـ 15</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('bank');
            fetchServerQuestions(selectedSubjectSlug);
          }}
          className={`pb-3 px-4 text-sm font-black transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'bank'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>3. بنك الأسئلة المعتمد ({questionsList.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: BLUEPRINT / STRUCTURE SETUP                       */}
      {/* ========================================================= */}
      {activeTab === 'blueprint' && (
        <div className="space-y-6">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-black text-emerald-950">
                هيكل ورقة امتحان مادة ({blueprint.name_ar}) الموحد
              </h2>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-3xl">
                يحدد هذا الهيكل ترتيب ظهور الأسئلة في ورقة الامتحان (السؤال الأول، الثاني، الثالث ج...)، ونمط كل سؤال من أنماط الأسئلة الـ 15، والدرجة المخصصة له. يحفظ النظام هذا السلوك ويُعممه على كافة امتحانات المادة.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleResetBlueprint}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="استعادة الهيكل الافتراضي"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة الافتراضي</span>
              </button>

              <button
                type="button"
                onClick={handleSaveBlueprint}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>حفظ وتعميم الهيكل</span>
              </button>
            </div>
          </div>

          {/* Blueprint Question Patterns List */}
          <div className="space-y-4">
            {blueprint.patterns.map((pattern, idx) => (
              <div
                key={pattern.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4 transition-all hover:border-slate-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black text-xs">
                      {pattern.questionNumber}
                    </span>
                    <span className="text-sm font-black text-slate-900">
                      السؤال {pattern.questionNumber} {pattern.partLabel ? `(الفرع ${pattern.partLabel})` : ''}
                    </span>
                    <span className="text-xs text-slate-400 font-medium mr-2">
                      موقع الظهور: #{idx + 1} في الورقة
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddBranch(pattern.questionNumber)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      title="إضافة فرع لنفس السؤال (ب أو ج)"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>إضافة فرع (أ/ب/ج)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePattern(pattern.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف هذا النمط/الفرع"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pattern Type Selection */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">نمط السؤال (من الـ 15 نمطاً):</label>
                    <select
                      value={pattern.questionType}
                      onChange={(e) =>
                        handleUpdatePattern(idx, { questionType: e.target.value as QuestionType })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title / Description */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">عنوان السؤال / الموضوع:</label>
                    <input
                      type="text"
                      value={pattern.title}
                      onChange={(e) => handleUpdatePattern(idx, { title: e.target.value })}
                      placeholder="مثلاً: النحو والإعراب والضبط التام"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Allocated Marks */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 block">الدرجة المخصصة:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={pattern.allocatedMarks}
                        onChange={(e) =>
                          handleUpdatePattern(idx, { allocatedMarks: Number(e.target.value) || 5 })
                        }
                        className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                      />
                      <span className="text-xs text-slate-500 font-bold">درجات</span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">تعليمات وتوجيهات السؤال للطلاب:</label>
                  <input
                    type="text"
                    value={pattern.instructions}
                    onChange={(e) => handleUpdatePattern(idx, { instructions: e.target.value })}
                    placeholder="ضع علامة (✓) أو (✗)، اقرأ النص ثم أجب، إلخ."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add New Question Button */}
          <div className="flex items-center justify-center pt-2">
            <button
              type="button"
              onClick={handleAddPattern}
              className="px-6 py-3 bg-white hover:bg-slate-50 border-2 border-dashed border-emerald-400 text-emerald-800 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>إضافة سؤال رئيسي جديد في الهيكل</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: QUESTION AUTHORING FOR PATTERNS                   */}
      {/* ========================================================= */}
      {activeTab === 'authoring' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-900">
                إدخال الأسئلة لمادة ({blueprint.name_ar})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                اختر النمط وموقع السؤال في الورقة، ثم أدخل نص السؤال والحل النموذجي والشرح المنهجي
              </p>
            </div>

            {/* Scope & Year Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">نطاق الاستخدام:</label>
                <select
                  value={targetScope}
                  onChange={(e) => setTargetScope(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="both">عام (امتحانات السنوات ومراجعة المقرر معاً)</option>
                  <option value="yearly_exam">امتحان سنة محددة خصيصاً (Past Exam)</option>
                  <option value="curriculum_review">بنك مراجعة شاملة للمقرر فقط</option>
                </select>
              </div>

              {targetScope !== 'curriculum_review' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 block">
                    سنة دورة الامتحان (2000 - 2026):
                  </label>
                  <select
                    value={authoringYear}
                    onChange={(e) => setAuthoringYear(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {curriculumStorage.getAllSupportedYears().map((yr) => (
                      <option key={yr} value={yr}>
                        دورة عام {yr}م
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Blueprint Pattern Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">
                  ربط بنمط من هيكل ورقة الامتحان:
                </label>
                <select
                  value={selectedPatternId}
                  onChange={(e) => handleSelectPatternForAuthoring(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- إدخال حر / اختر من الهيكل --</option>
                  {blueprint.patterns.map((p) => (
                    <option key={p.id} value={p.id}>
                      السؤال {p.questionNumber} {p.partLabel} - {p.title} ({p.allocatedMarks} درجات)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pattern Type & Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">نوع النمط (من الـ 15 نمطاً):</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {Object.entries(QUESTION_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">موقع السؤال والفرع:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={questionNumber}
                    onChange={(e) => setQuestionNumber(Number(e.target.value) || 1)}
                    className="w-20 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-center"
                    placeholder="رقم"
                  />
                  <input
                    type="text"
                    value={questionPart}
                    onChange={(e) => setQuestionPart(e.target.value)}
                    className="w-20 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-center"
                    placeholder="أ/ب/ج"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 block">الدرجة المخصصة:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={questionMarks}
                    onChange={(e) => setQuestionMarks(Number(e.target.value) || 5)}
                    className="w-24 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-center"
                  />
                  <span className="text-xs text-slate-500 font-bold">درجات</span>
                </div>
              </div>
            </div>

            {/* Question Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">نص السؤال والمسألة المطروحة:</label>
              <textarea
                rows={3}
                value={questionPrompt}
                onChange={(e) => setQuestionPrompt(e.target.value)}
                placeholder="اكتب هنا نص السؤال بدقة كما ورد في ورقة الامتحان السابقة..."
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            {/* Pattern-Specific Dynamic Inputs */}
            <div className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-4">
              <h3 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>بيانات النمط والإجابة النموذجية الصحيحة:</span>
              </h3>

              {questionType === QuestionType.TRUE_FALSE && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">الإجابة المعتمدة:</label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-emerald-800 bg-white px-4 py-2 rounded-xl border border-emerald-300">
                      <input
                        type="radio"
                        checked={tfAnswer === true}
                        onChange={() => setTfAnswer(true)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>صحيحة (✓)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-rose-800 bg-white px-4 py-2 rounded-xl border border-rose-300">
                      <input
                        type="radio"
                        checked={tfAnswer === false}
                        onChange={() => setTfAnswer(false)}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <span>خاطئة (✗)</span>
                    </label>
                  </div>
                </div>
              )}

              {questionType === QuestionType.MULTIPLE_CHOICE && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">
                    خيارات الإجابة (حدد الخيار الصحيح بزر الاختيار):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mcqOptions.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 bg-white p-2.5 rounded-xl border ${
                          mcqCorrectIndex === idx ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="mcq_correct"
                          checked={mcqCorrectIndex === idx}
                          onChange={() => setMcqCorrectIndex(idx)}
                          className="w-4 h-4 text-emerald-600"
                          title="تحديد كإجابة صحيحة"
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...mcqOptions];
                            updated[idx] = e.target.value;
                            setMcqOptions(updated);
                          }}
                          className="w-full text-xs font-medium text-slate-800 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {questionType === QuestionType.ARABIC_GRAMMAR && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">الكلمة المطلوب إعرابها:</label>
                    <input
                      type="text"
                      value={grammarWord}
                      onChange={(e) => setGrammarWord(e.target.value)}
                      placeholder="مثلاً: مخلصونَ"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">الإعراب التام المعتمد:</label>
                    <input
                      type="text"
                      value={grammarAnswer}
                      onChange={(e) => setGrammarAnswer(e.target.value)}
                      placeholder="خبر إنّ مرفوع بالواو لأنه جمع مذكر سالم"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {questionType === QuestionType.ODD_ONE_OUT && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">الكلمات مفصولة بفاصلة (،):</label>
                    <input
                      type="text"
                      value={oddWords}
                      onChange={(e) => setOddWords(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">الكلمة الشاذة المعتمدة:</label>
                    <input
                      type="text"
                      value={oddAnswer}
                      onChange={(e) => setOddAnswer(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {questionType === QuestionType.CALCULATION && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">المعادلة أو القانون المستخدم:</label>
                    <input
                      type="text"
                      value={calcExpression}
                      onChange={(e) => setCalcExpression(e.target.value)}
                      placeholder="∫ (3x² + 4x + 1) dx"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">الناتج الرقمي النهائي:</label>
                    <input
                      type="text"
                      value={calcAnswer}
                      onChange={(e) => setCalcAnswer(e.target.value)}
                      placeholder="18"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Fallback text answer for Fill Blank, Essays, Explain, etc. */}
              {questionType !== QuestionType.TRUE_FALSE &&
                questionType !== QuestionType.MULTIPLE_CHOICE &&
                questionType !== QuestionType.ARABIC_GRAMMAR &&
                questionType !== QuestionType.ODD_ONE_OUT &&
                questionType !== QuestionType.CALCULATION && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">الحل النموذجي المعتمد:</label>
                    <input
                      type="text"
                      value={blankAnswer}
                      onChange={(e) => setBlankAnswer(e.target.value)}
                      placeholder="اكتب الإجابة النموذجية المعتمدة في معايير التصحيح المنهجي..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                )}
            </div>

            {/* Educational Explanation */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>الشرح والتوجيه المنهجي (يظهر للطالب في نتائج التدريب لتعزيز الفهم):</span>
              </label>
              <textarea
                rows={2}
                value={explanationAr}
                onChange={(e) => setExplanationAr(e.target.value)}
                placeholder="بيان سبب صحة الإجابة، الاستدلال من المقرر، أو خطوات الحل التربوية..."
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3 text-xs font-medium text-slate-800 leading-relaxed"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveAuthoredQuestion}
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ السؤال في بنك مادة {blueprint.name_ar}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: QUESTION BANK EXPLORER                            */}
      {/* ========================================================= */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-black text-slate-900">
              الأسئلة المتوفرة في بنك مادة ({blueprint.name_ar}) - {questionsList.length} سؤال
            </h2>

            <button
              type="button"
              disabled={isLoadingBank}
              onClick={() => fetchServerQuestions(selectedSubjectSlug)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBank ? 'animate-spin' : ''}`} />
              <span>تحديث البنك من الخادم</span>
            </button>
          </div>

          {bankError && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{bankError}</span>
            </div>
          )}

          {isLoadingBank ? (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
              <div className="text-xs font-bold text-slate-600">جاري مزامنة أسئلة البنك من قاعدة البيانات المركزية...</div>
            </div>
          ) : questionsList.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="font-extrabold text-slate-800 text-sm">لا تتوفر أسئلة مدخلة بعد لهذه المادة</div>
              <p className="text-xs text-slate-500">
                يمكنك التبديل إلى تبويب "محرك إدخال الأسئلة للأنماط" لإضافة أسئلة جديدة وحفظها فورياً.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('authoring')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                بدء إدخال الأسئلة الآن
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {questionsList.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-black text-xs">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">
                        السؤال {q.questionNumber} {q.partLabel}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                        {QUESTION_TYPE_LABELS[q.questionType] || q.questionType}
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                        {q.allocatedMarks} درجات
                      </span>
                      {q.examYear && (
                        <span className="text-[10px] bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md font-bold">
                          دورة {q.examYear}م
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="حذف هذا السؤال"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                    {q.prompt}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <span>الإجابة المعتمدة:</span>
                      <span>
                        {typeof q.correctAnswer === 'object'
                          ? JSON.stringify(q.correctAnswer)
                          : String(q.correctAnswer)}
                      </span>
                    </div>

                    {q.explanationAr && (
                      <div className="text-slate-400 font-medium line-clamp-1 max-w-md">
                        الشرح: {q.explanationAr}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
