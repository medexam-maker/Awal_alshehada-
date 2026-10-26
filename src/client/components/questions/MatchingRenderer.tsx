import React, { useState, useMemo } from 'react';
import { Check, X, Link2, Sparkles, RefreshCw } from 'lucide-react';
import { playFeedbackSound } from '../../utils/soundManager';
import { playWaterDrop } from '../../utils/soundEffects';

export interface MatchingTargetCard {
  id: string;
  text: string;
  originalId?: string | null;
  isDistractor?: boolean;
}

export interface MatchingSourceItem {
  id: string;
  text: string;
}

export interface MatchingRendererProps {
  content?: {
    prompt?: string;
    sources?: MatchingSourceItem[];
    sourceOrder?: string[];
    shuffledTargets?: MatchingTargetCard[];
    pairs?: Array<{ id: string; source: string; target: string }>;
    distractors?: Array<{ id: string; target: string }>;
    scoring_type?: 'all_or_nothing' | 'partial';
    explanation?: string;
  };
  question?: any;
  answer?: {
    connections?: Record<string, string>;
    pairs?: Record<string, string>;
  };
  onChange: (ans: { connections: Record<string, string> }) => void;
  isReadonly?: boolean;
  correctAnswer?: any;
  examMode?: 'simulator' | 'training';
  onSubmit?: () => void;
}

export const MatchingRenderer: React.FC<MatchingRendererProps> = ({
  content,
  question,
  answer,
  onChange,
  isReadonly = false,
  correctAnswer,
  examMode = 'training',
}) => {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  // Active connections map: sourceId -> targetCardId
  const connections: Record<string, string> = useMemo(() => {
    return answer?.connections || answer?.pairs || {};
  }, [answer]);

  // 1. Resolve Sources
  const rawContent = content || question?.content || {};
  const sources: MatchingSourceItem[] = useMemo(() => {
    if (Array.isArray(rawContent.sources) && rawContent.sources.length > 0) {
      return rawContent.sources;
    }
    if (Array.isArray(rawContent.pairs) && rawContent.pairs.length > 0) {
      return rawContent.pairs.map((p: any) => ({
        id: String(p.id),
        text: String(p.source || ''),
      }));
    }
    return [];
  }, [rawContent]);

  // 2. Resolve Shuffled Targets (Stable across re-renders)
  const targets: MatchingTargetCard[] = useMemo(() => {
    if (Array.isArray(rawContent.shuffledTargets) && rawContent.shuffledTargets.length > 0) {
      return rawContent.shuffledTargets;
    }
    if (Array.isArray(rawContent.pairs) && rawContent.pairs.length > 0) {
      const rawPairs = rawContent.pairs || [];
      const rawDistractors = rawContent.distractors || [];

      const combined: MatchingTargetCard[] = [
        ...rawPairs.map((p: any) => ({
          id: `target_${p.id}`,
          text: String(p.target || ''),
          originalId: String(p.id),
          isDistractor: false,
        })),
        ...rawDistractors.map((d: any) => ({
          id: `target_${d.id}`,
          text: String(d.target || ''),
          originalId: null,
          isDistractor: true,
        })),
      ];

      // Stable Fisher-Yates Shuffle
      const shuffled = [...combined];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
    return [];
  }, [rawContent]);

  // Map of targetCardId -> sourceId for inverse lookup
  const inverseConnections = useMemo(() => {
    const inv: Record<string, string> = {};
    for (const [sId, tId] of Object.entries(connections)) {
      if (tId) inv[tId] = sId;
    }
    return inv;
  }, [connections]);

  // Ordered list of connected source IDs for numbering badges (1, 2, 3...)
  const connectedSourceIds = useMemo(() => {
    return sources.filter((s) => Boolean(connections[s.id])).map((s) => s.id);
  }, [sources, connections]);

  const isTraining = examMode !== 'simulator';

  // Helper to determine if a connection is correct
  const checkIsPairCorrect = (sourceId: string, targetCardId: string): boolean => {
    const targetObj = targets.find((t) => t.id === targetCardId);
    const caPairs = correctAnswer?.pairs || {};

    if (caPairs[sourceId] && caPairs[sourceId] === targetCardId) return true;
    if (targetObj && !targetObj.isDistractor && targetObj.originalId === sourceId) return true;
    if (targetObj && targetObj.id === `target_${sourceId}`) return true;

    // Direct text matching fallback
    const sourceObj = sources.find((s) => s.id === sourceId);
    if (sourceObj && targetObj) {
      const rawPair = (rawContent.pairs || []).find((p: any) => String(p.id) === sourceId);
      if (rawPair && rawPair.target && rawPair.target.trim() === targetObj.text.trim()) {
        return true;
      }
    }
    return false;
  };

  // Handle clicking a Source card
  const handleSelectSource = (sourceId: string) => {
    if (isReadonly) return;

    if (selectedSourceId === sourceId) {
      setSelectedSourceId(null);
    } else {
      setSelectedSourceId(sourceId);
      playWaterDrop();
    }
  };

  // Handle clicking a Target card
  const handleSelectTarget = (targetCardId: string) => {
    if (isReadonly) return;

    if (selectedSourceId) {
      // Connect selectedSourceId -> targetCardId
      const newConnections = { ...connections };

      // Remove any existing connection with this target card
      for (const [sKey, tVal] of Object.entries(newConnections)) {
        if (tVal === targetCardId) {
          delete newConnections[sKey];
        }
      }

      newConnections[selectedSourceId] = targetCardId;
      onChange({ connections: newConnections });

      // Play audio feedback
      const isCorrect = checkIsPairCorrect(selectedSourceId, targetCardId);
      if (isCorrect) {
        playFeedbackSound('correct');
      } else {
        playFeedbackSound('incorrect');
      }

      setSelectedSourceId(null);
    } else {
      // If target card is already connected, clicking it can unlink it
      const connectedSource = inverseConnections[targetCardId];
      if (connectedSource) {
        handleUnlink(connectedSource);
      }
    }
  };

  // Unlink a pair by source ID
  const handleUnlink = (sourceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isReadonly) return;

    const newConnections = { ...connections };
    delete newConnections[sourceId];
    onChange({ connections: newConnections });
    playWaterDrop();

    if (selectedSourceId === sourceId) {
      setSelectedSourceId(null);
    }
  };

  // Reset all connections
  const handleReset = () => {
    if (isReadonly) return;
    onChange({ connections: {} });
    setSelectedSourceId(null);
    playWaterDrop();
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto select-none" dir="rtl">
      {/* Header Info & Reset Button */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">
            طابق بين كل عنصر أساسي والعنصر المطابق له بالتتابع:
          </span>
        </div>

        {Object.keys(connections).length > 0 && !isReadonly && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة التوصيل 🔄</span>
          </button>
        )}
      </div>

      {/* Grid Columns: Source vs Target */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        {/* Column 1: Source Cards */}
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-950 font-black text-xs sm:text-sm p-2.5 rounded-xl text-center shadow-2xs flex items-center justify-center gap-1.5">
            <Link2 className="w-4 h-4 text-indigo-600" />
            <span>العنصر الأساسي (Source)</span>
          </div>

          <div className="space-y-2.5">
            {sources.map((source) => {
              const connectedTargetId = connections[source.id];
              const isSelected = selectedSourceId === source.id;
              const isConnected = Boolean(connectedTargetId);
              const matchBadgeNum = isConnected ? connectedSourceIds.indexOf(source.id) + 1 : null;

              const isCorrectTraining = isConnected && checkIsPairCorrect(source.id, connectedTargetId!);
              const isIncorrectTraining = isConnected && !isCorrectTraining;

              let cardStyle = 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-slate-50 shadow-2xs';

              if (isSelected) {
                cardStyle = 'bg-indigo-600 text-white border-indigo-700 shadow-xl scale-[1.02] ring-2 ring-indigo-300';
              } else if (isConnected) {
                if (isCorrectTraining) {
                  cardStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-sm';
                } else if (isIncorrectTraining) {
                  cardStyle = 'bg-rose-500 text-white border-rose-600 shadow-sm';
                }
              }

              return (
                <div
                  key={source.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`طابق ${source.text}`}
                  aria-pressed={isSelected || isConnected}
                  onClick={() => handleSelectSource(source.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectSource(source.id);
                    }
                  }}
                  onDoubleClick={(e) => isConnected && handleUnlink(source.id, e)}
                  className={`min-h-[56px] sm:min-h-[64px] p-3 sm:p-4 rounded-2xl border-2 font-bold text-sm sm:text-base flex items-center justify-between cursor-pointer transition-all duration-150 relative ${cardStyle}`}
                >
                  <div className="flex items-center gap-2.5 flex-1 leading-snug">
                    {matchBadgeNum !== null && (
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          isTraining
                            ? isCorrectTraining
                              ? 'bg-white text-emerald-800'
                              : 'bg-white text-rose-800'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {matchBadgeNum}
                      </span>
                    )}
                    <span>{source.text}</span>
                  </div>

                  {isConnected && !isReadonly && (
                    <button
                      type="button"
                      onClick={(e) => handleUnlink(source.id, e)}
                      className={`p-1 rounded-full transition-colors shrink-0 ${
                        isTraining && (isCorrectTraining || isIncorrectTraining)
                          ? 'hover:bg-black/20 text-white'
                          : 'hover:bg-indigo-200 text-indigo-800'
                      }`}
                      title="فك الربط (X)"
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Target Cards */}
        <div className="space-y-3">
          <div className="bg-slate-100 border border-slate-200 text-slate-800 font-black text-xs sm:text-sm p-2.5 rounded-xl text-center shadow-2xs flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-slate-600" />
            <span>العنصر المطابق (Target)</span>
          </div>

          <div className="space-y-2.5">
            {targets.map((target) => {
              const connectedSourceId = inverseConnections[target.id];
              const isConnected = Boolean(connectedSourceId);
              const matchBadgeNum = isConnected ? connectedSourceIds.indexOf(connectedSourceId) + 1 : null;

              const isCorrectTraining = isConnected && checkIsPairCorrect(connectedSourceId, target.id);
              const isIncorrectTraining = isConnected && !isCorrectTraining;

              const isSelectableForTarget = Boolean(selectedSourceId && !isConnected);

              let cardStyle = 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-2xs';

              if (isSelectableForTarget) {
                cardStyle = 'bg-indigo-50/80 border-indigo-400 text-indigo-950 hover:bg-indigo-100/80 hover:border-indigo-500 scale-[1.01] shadow-md ring-2 ring-indigo-200';
              } else if (isConnected) {
                if (isCorrectTraining) {
                  cardStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-sm';
                } else if (isIncorrectTraining) {
                  cardStyle = 'bg-rose-500 text-white border-rose-600 shadow-sm';
                }
              }

              return (
                <div
                  key={target.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`طابق ${target.text}`}
                  aria-pressed={isConnected}
                  onClick={() => handleSelectTarget(target.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectTarget(target.id);
                    }
                  }}
                  onDoubleClick={(e) => isConnected && connectedSourceId && handleUnlink(connectedSourceId, e)}
                  className={`min-h-[56px] sm:min-h-[64px] p-3 sm:p-4 rounded-2xl border-2 font-bold text-sm sm:text-base flex items-center justify-between cursor-pointer transition-all duration-150 ${cardStyle}`}
                >
                  <div className="flex items-center gap-2.5 flex-1 leading-snug">
                    {matchBadgeNum !== null && (
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          isTraining
                            ? isCorrectTraining
                              ? 'bg-white text-emerald-800'
                              : 'bg-white text-rose-800'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {matchBadgeNum}
                      </span>
                    )}
                    <span>{target.text}</span>
                  </div>

                  {isTraining && isConnected && (
                    <div className="shrink-0 mr-1">
                      {isCorrectTraining ? (
                        <Check className="w-5 h-5 text-white stroke-[3]" />
                      ) : (
                        <X className="w-5 h-5 text-white stroke-[3]" />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
