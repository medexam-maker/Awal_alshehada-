import React, { useState } from 'react';
import { Volume2, VolumeX, Play, Check, X, Trophy } from 'lucide-react';
import { getSoundConfig, saveSoundConfig, SOUND_PACKS, SoundTheme, playFeedbackSound } from '../utils/soundManager';

interface SoundSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SoundSettingsModal: React.FC<SoundSettingsProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState(getSoundConfig());

  if (!isOpen) return null;

  const handleThemeChange = (theme: SoundTheme) => {
    const updated = { ...config, theme, isMuted: theme === 'muted' ? true : config.isMuted };
    setConfig(updated);
    saveSoundConfig(updated);
  };

  const toggleMute = () => {
    const updated = { ...config, isMuted: !config.isMuted };
    setConfig(updated);
    saveSoundConfig(updated);
  };

  const previewSound = (theme: SoundTheme, type: 'correct' | 'incorrect') => {
    const currentConfig = getSoundConfig();
    const tempConfig = { ...currentConfig, theme, isMuted: false };
    saveSoundConfig(tempConfig);
    playFeedbackSound(type);
    saveSoundConfig(currentConfig);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-5 border border-slate-200 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-base">
            <Trophy className="w-5 h-5 text-emerald-600" />
            <span>إعدادات الأصوات والتعليق الرياضي</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Mute Button */}
        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          <span className="text-xs font-bold text-slate-700">حالة الصوت العامة:</span>
          <button
            type="button"
            onClick={toggleMute}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              config.isMuted
                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                : 'bg-emerald-600 text-white shadow-xs'
            }`}
          >
            {config.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{config.isMuted ? 'الصوت مكتوم' : 'الصوت مفعّل'}</span>
          </button>
        </div>

        {/* Sound Packs List */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-600 block">اختر نوع الأصوات والتعليق المفضّل لديك:</label>
          {(Object.keys(SOUND_PACKS) as SoundTheme[]).map((themeKey) => {
            const pack = SOUND_PACKS[themeKey];
            const isSelected = config.theme === themeKey;

            return (
              <div
                key={themeKey}
                className={`p-3.5 rounded-2xl border text-xs transition-all space-y-2 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 text-emerald-950 font-medium'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleThemeChange(themeKey)}
                    className="flex items-center gap-2.5 text-right font-bold text-sm cursor-pointer"
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{pack.name}</span>
                  </button>

                  {themeKey !== 'muted' && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => previewSound(themeKey, 'correct')}
                        className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="سماع صوت الإجابة الصحيحة"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>هدف ⚽</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => previewSound(themeKey, 'incorrect')}
                        className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="سماع صوت الإجابة الخاطئة"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>ضائعة ❌</span>
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 pr-6 leading-relaxed">
                  {pack.description}
                </p>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
        >
          حفظ التفضيلات والمتابعة
        </button>
      </div>
    </div>
  );
};
