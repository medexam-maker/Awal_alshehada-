import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Search,
  Check,
  AlertCircle,
  Archive,
  RotateCcw,
  X,
  Layers,
  FileImage,
  RefreshCw,
  Plus
} from 'lucide-react';
import { apiClient } from '../../api/apiClient';

export interface DiagramAsset {
  id: string;
  name: string;
  originalFileName: string;
  mimeType: string;
  byteLength: number;
  sha256: string;
  width?: number | null;
  height?: number | null;
  status: 'active' | 'archived';
  keywords: string[];
  referenceCount: number;
  questionIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DiagramLibraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: DiagramAsset) => void;
  currentAssetId?: string;
}

export const DiagramLibraryDialog: React.FC<DiagramLibraryDialogProps> = ({
  isOpen,
  onClose,
  onSelect,
  currentAssetId,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const [assets, setAssets] = useState<DiagramAsset[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadKeywords, setUploadKeywords] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Archive confirmation state
  const [confirmArchiveAsset, setConfirmArchiveAsset] = useState<DiagramAsset | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.set('query', debouncedQuery.trim());
      if (includeArchived) params.set('includeArchived', 'true');
      params.set('limit', String(pageSize));
      params.set('offset', String(offset));

      const res = await apiClient.request<DiagramAsset[]>(`/api/admin/media/diagrams?${params.toString()}`);
      if (res.success && res.data) {
        setAssets(res.data);
        if (typeof (res as any).total === 'number') {
          setTotalCount((res as any).total);
        } else {
          setTotalCount(res.data.length);
        }
      } else {
        setErrorMsg(res.error?.message || 'فشل تحميل مكتبة الصور التوضيحية');
      }
    } catch (err: any) {
      console.error('[DiagramLibrary] Fetch error:', err);
      setErrorMsg('حدث خطأ في الاتصال بالخادم أثناء استرجاع الصور');
    } finally {
      setLoading(false);
    }
  }, [isOpen, debouncedQuery, includeArchived, page]);

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, fetchAssets]);

  // Handle file selection for upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 2MB = 2 * 1024 * 1024 bytes
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('حجم الصورة يتجاوز الحد المسموح به (2 ميجابايت). الرجاء تقليص حجم الصورة والمحاولة مجدداً.');
      setUploadFile(null);
      setUploadPreview(null);
      return;
    }

    // Check type: png, jpeg, webp
    const validMimes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setUploadError('صيغة الملف غير مدعومة. الصيغ المعتمدة: PNG، JPEG، WebP فقط.');
      setUploadFile(null);
      setUploadPreview(null);
      return;
    }

    setUploadFile(file);
    if (!uploadName.trim()) {
      // Auto-populate name from filename without extension
      const base = file.name.replace(/\.[^/.]+$/, '');
      setUploadName(base);
    }

    // Preview
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('الرجاء اختيار ملف صورة');
      return;
    }
    if (!uploadName.trim()) {
      setUploadError('اسم الصورة مطلوب');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Read base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          // Strip prefix data:image/...;base64,
          const commaIdx = res.indexOf(',');
          resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(uploadFile);
      const dataBase64 = await base64Promise;

      // Extract image dimensions if preview available
      let imgWidth: number | undefined;
      let imgHeight: number | undefined;
      if (uploadPreview) {
        await new Promise<void>((res) => {
          const img = new Image();
          img.onload = () => {
            imgWidth = img.naturalWidth;
            imgHeight = img.naturalHeight;
            res();
          };
          img.onerror = () => res();
          img.src = uploadPreview;
        });
      }

      // Keywords parsing
      const keywordsArray = uploadKeywords
        .split(/[,،]+/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
        .slice(0, 20);

      const payload = {
        fileName: uploadFile.name,
        mimeType: uploadFile.type,
        dataBase64,
        name: uploadName.trim(),
        keywords: keywordsArray,
        width: imgWidth,
        height: imgHeight,
      };

      const res = await apiClient.request<DiagramAsset>('/api/admin/media/diagrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        const asset = res.data;
        if ((res as any).duplicate) {
          setSuccessMsg('تم العثور على صورة سابقة مطابقة تماماً للمحتوى، وتم اختيارها تلقائياً.');
        } else {
          setSuccessMsg('تم رفع وحفظ الصورة في المكتبة بنجاح.');
        }
        // Select and close
        onSelect(asset);
        onClose();
      } else {
        setUploadError(res.error?.message || 'فشل رفع الصورة');
      }
    } catch (err: any) {
      console.error('[DiagramLibrary] Upload error:', err);
      setUploadError(err.message || 'حدث خطأ غير متوقع أثناء الرفع');
    } finally {
      setUploading(false);
    }
  };

  // Toggle archive status
  const handleToggleArchive = async (asset: DiagramAsset) => {
    const willArchive = asset.status !== 'archived';
    if (willArchive && asset.referenceCount > 0 && !confirmArchiveAsset) {
      setConfirmArchiveAsset(asset);
      return;
    }

    try {
      const res = await apiClient.request<DiagramAsset>(`/api/admin/media/diagrams/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: willArchive }),
      });

      if (res.success) {
        setConfirmArchiveAsset(null);
        fetchAssets();
      } else {
        alert(res.error?.message || 'فشل تحديث حالة الصورة');
      }
    } catch (err) {
      console.error('[DiagramLibrary] Archive error:', err);
      alert('حدث خطأ أثناء تعديل حالة الأرشفة');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 dir-rtl text-right">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">مكتبة الرسوم التوضيحية والصور العلمية</h2>
              <p className="text-xs text-slate-500">اختر رسماً علمياً معتمداً أو ارفع رسماً جديداً عالي الدقة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 flex items-center gap-3 border-b border-slate-100 bg-white">
          <button
            onClick={() => setActiveTab('library')}
            className={`pb-3 px-2 text-xs font-bold transition-all relative ${
              activeTab === 'library'
                ? 'text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            تصفح المكتبة ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-2 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'text-blue-700 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            رفع رسم جديد
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'library' ? (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم، الكلمة الدلالية، أو المعرّف الدقيق..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-medium focus:bg-white focus:border-blue-500 outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 select-none">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  عرض الصور المؤرشفة
                </label>

                <button
                  onClick={() => fetchAssets()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title="تحديث القائمة"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  تحديث
                </button>
              </div>

              {/* Status feedback */}
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Assets Grid */}
              {loading && assets.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                  <p className="text-xs">جاري تحميل الصور...</p>
                </div>
              ) : assets.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                  <FileImage className="w-12 h-12 text-slate-300 mb-2 stroke-1" />
                  <p className="text-sm font-bold text-slate-600">لا توجد رسوم مطابقة لبحثك</p>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    يمكنك تغيير شروط البحث أو رفع رسم توضيحي جديد إلى المكتبة عبر تبويب "رفع رسم جديد".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {assets.map((asset) => {
                    const isSelected = currentAssetId === asset.id;
                    const isArchived = asset.status === 'archived';

                    return (
                      <div
                        key={asset.id}
                        className={`group rounded-xl border transition-all overflow-hidden flex flex-col bg-white ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                            : isArchived
                            ? 'border-slate-200 bg-slate-50/70 opacity-75'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="h-36 bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                          <img
                            src={`/api/media/${asset.id}`}
                            alt={asset.name}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                          />

                          {/* Status and Ref Count Badges */}
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            {isArchived && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-white shadow-sm">
                                مؤرشف
                              </span>
                            )}
                            {asset.referenceCount > 0 && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                                {asset.referenceCount} سؤال
                              </span>
                            )}
                          </div>

                          {/* Quick Archive Action */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleArchive(asset);
                            }}
                            className={`absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors shadow-sm ${
                              isArchived
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-white/90 text-slate-500 hover:text-slate-800 hover:bg-white'
                            }`}
                            title={isArchived ? 'استعادة من الأرشيف' : 'أرشفة الصورة'}
                          >
                            {isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Details */}
                        <div className="p-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-xs font-bold text-slate-800 truncate" title={asset.name}>
                              {asset.name}
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                              <span>{(asset.byteLength / 1024).toFixed(0)} KB</span>
                              {asset.width && asset.height && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    {asset.width} × {asset.height}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Keywords Chips */}
                            {asset.keywords && asset.keywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {asset.keywords.slice(0, 3).map((kw, i) => (
                                  <span key={i} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {kw}
                                  </span>
                                ))}
                                {asset.keywords.length > 3 && (
                                  <span className="text-[10px] text-slate-400">+{asset.keywords.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Select Action */}
                          <div className="pt-3 mt-2 border-t border-slate-100">
                            {isArchived ? (
                              <button
                                disabled
                                className="w-full py-1.5 text-[11px] font-bold text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed text-center"
                                title="لا يمكن اختيار صورة مؤرشفة لسؤال جديد"
                              >
                                صورة مؤرشفة
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelect(asset);
                                  onClose();
                                }}
                                className={`w-full py-1.5 text-[11px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white'
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    تم الاختيار
                                  </>
                                ) : (
                                  'اختيار هذا الرسم'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalCount > pageSize && (
                <div className="pt-4 flex items-center justify-center gap-2 border-t border-slate-100">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    السابق
                  </button>
                  <span className="text-xs text-slate-500">
                    صفحة {page} من {Math.ceil(totalCount / pageSize)}
                  </span>
                  <button
                    disabled={page >= Math.ceil(totalCount / pageSize)}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    التالي
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Upload Tab */
            <form onSubmit={handleUploadSubmit} className="max-w-xl mx-auto space-y-5 py-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* File Drop Area */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">ملف الصورة التوضيحية (PNG / JPEG / WebP):</label>
                <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20 relative">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {uploadPreview ? (
                    <div className="space-y-2">
                      <img
                        src={uploadPreview}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg object-contain shadow-sm border border-slate-200"
                      />
                      <p className="text-xs text-blue-600 font-bold">انقر لتغيير الصورة المحددة</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">اسحب وأفلت الرسم هنا أو انقر للاختيار</p>
                      <p className="text-[11px] text-slate-400">الحد الأقصى للحجم 2 ميجابايت. الصيغ: PNG, JPEG, WebP</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Image Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  عنوان أو اسم الرسم التوضيحي <span className="text-red-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="مثال: الدائرة الكهربائية البسيطة - قانون أوم"
                  maxLength={120}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">اسم معبر يسهل البحث عنه في بنك الأسئلة (حتى 120 حرف)</p>
              </div>

              {/* Keywords */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">الكلمات الدلالية (اختياري):</label>
                <input
                  type="text"
                  value={uploadKeywords}
                  onChange={(e) => setUploadKeywords(e.target.value)}
                  placeholder="مقاومة, بطارية, فيزياء, تيار كهربائي (مفصولة بفاصلة)"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:border-blue-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">تساعد في سرعة استرجاع الرسم عند تأليف أسئلة لاحقة</p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile || !uploadName.trim()}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      جاري الرفع والمعالجة...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      رفع وحفظ الرسم
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Confirmation Modal for Archiving with References */}
        {confirmArchiveAsset && (
          <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-bold text-slate-800">تأكيد أرشفة رسم مستخدم</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                تنبيه: الصورة <strong className="text-slate-800 font-bold">"{confirmArchiveAsset.name}"</strong> مستخدمة
                حالياً في <span className="font-bold text-blue-600">{confirmArchiveAsset.referenceCount}</span> سؤال في بنك الأسئلة.
              </p>
              <p className="text-xs text-slate-500">
                أرشفة الصورة ستخفيها من خيارات الأسئلة الجديدة، ولكن لن تؤثر على الأسئلة الحالية المرتبطة بها. هل تريد المتابعة؟
              </p>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmArchiveAsset(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleArchive(confirmArchiveAsset)}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  نعم، أرشف الصورة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
