import React from 'react';
import { QuestionType } from '../../../shared/constants';

import { TrueFalseRenderer } from './TrueFalseRenderer';
import { MultipleChoiceRenderer } from './MultipleChoiceRenderer';
import { FillBlankRenderer } from './FillBlankRenderer';
import { MatchingRenderer } from './MatchingRenderer';
import { ShortEssayRenderer } from './ShortEssayRenderer';
import { LongEssayRenderer } from './LongEssayRenderer';
import { ExplainRenderer } from './ExplainRenderer';
import { ComparisonTableRenderer } from './ComparisonTableRenderer';
import { OddOneOutRenderer } from './OddOneOutRenderer';
import { DiagramLabelingRenderer } from './DiagramLabelingRenderer';
import { ContourMapRenderer } from './ContourMapRenderer';
import { CalculationRenderer } from './CalculationRenderer';
import { OrderingRenderer } from './OrderingRenderer';
import { GrammarRenderer } from './GrammarRenderer';
import { ReadingComprehensionRenderer } from './ReadingComprehensionRenderer';

export {
  TrueFalseRenderer,
  MultipleChoiceRenderer,
  FillBlankRenderer,
  MatchingRenderer,
  ShortEssayRenderer,
  LongEssayRenderer,
  ExplainRenderer,
  ComparisonTableRenderer,
  OddOneOutRenderer,
  DiagramLabelingRenderer,
  ContourMapRenderer,
  CalculationRenderer,
  OrderingRenderer,
  GrammarRenderer,
  ReadingComprehensionRenderer,
};

export interface QuestionDispatcherProps {
  question: {
    id: string;
    type?: string;
    questionType?: string;
    points?: number;
    marks?: number;
    prompt?: string;
    content: any;
    correctAnswer?: any;
    explanation?: string;
    explanationAr?: string;
  };
  answer: any;
  onChange: (ans: any) => void;
  isReadonly?: boolean;
  examMode?: 'simulator' | 'training';
  trainingSubMode?: 'yearly' | 'curriculum_review' | 'weekly';
  isWeeklySimulation?: boolean;
}

export const QuestionDispatcher: React.FC<QuestionDispatcherProps> = ({
  question,
  answer,
  onChange,
  isReadonly = false,
  examMode = 'training',
  trainingSubMode,
  isWeeklySimulation = false,
}) => {
  const content = question.content || {};
  const qType = question.questionType || question.type || '';

  switch (qType) {
    case QuestionType.TRUE_FALSE:
      return (
        <TrueFalseRenderer
          content={content}
          answer={answer}
          onChange={onChange}
          isReadonly={isReadonly}
          correctAnswer={question.correctAnswer}
          examMode={examMode}
        />
      );

    case QuestionType.MULTIPLE_CHOICE:
      return (
        <MultipleChoiceRenderer
          content={content}
          answer={answer}
          onChange={onChange}
          isReadonly={isReadonly}
          correctAnswer={question.correctAnswer}
          examMode={examMode}
        />
      );

    case QuestionType.FILL_BLANK:
      return (
        <FillBlankRenderer
          content={content}
          answer={answer}
          onChange={onChange}
          isReadonly={isReadonly}
          examMode={examMode}
          trainingSubMode={trainingSubMode}
          isWeeklySimulation={isWeeklySimulation}
          correctAnswer={question.correctAnswer}
        />
      );

    case QuestionType.MATCHING:
      return (
        <MatchingRenderer
          content={content}
          answer={answer}
          onChange={onChange}
          isReadonly={isReadonly}
          correctAnswer={question.correctAnswer}
          examMode={examMode}
        />
      );

    case QuestionType.SHORT_ESSAY:
      return <ShortEssayRenderer content={content} answer={answer} onChange={onChange} isReadonly={isReadonly} />;

    case QuestionType.LONG_ESSAY:
      return <LongEssayRenderer content={content} answer={answer} onChange={onChange} isReadonly={isReadonly} />;

    case QuestionType.EXPLAIN:
      return (
        <ExplainRenderer
          questionId={question.id}
          content={content}
          answer={answer}
          onChange={onChange}
          isReadonly={isReadonly}
          correctAnswer={question.correctAnswer}
          examMode={examMode}
        />
      );

    case QuestionType.COMPARISON_TABLE:
      return <ComparisonTableRenderer content={content} answer={answer} onChange={onChange} isReadonly={isReadonly} />;

    case QuestionType.ODD_ONE_OUT:
      return (
        <OddOneOutRenderer
          content={content}
          answer={answer}
          onChange={onChange}
          isReadonly={isReadonly}
          correctAnswer={question.correctAnswer}
          examMode={examMode}
        />
      );

    case QuestionType.DIAGRAM_LABELING:
      return <DiagramLabelingRenderer content={content} answer={answer} onChange={onChange} isReadonly={isReadonly} />;

    case QuestionType.CONTOUR_MAP:
      return <ContourMapRenderer content={content} answer={answer} onChange={onChange} isReadonly={isReadonly} />;

    case QuestionType.CALCULATION:
      return <CalculationRenderer content={content} answer={answer} onChange={onChange} isReadonly={isReadonly} />;

    case QuestionType.ORDERING:
      return (
        <OrderingRenderer
          content={content}
          answer={answer}
          onChange={onChange}
          isReadonly={isReadonly}
          correctAnswer={question.correctAnswer}
          examMode={examMode}
        />
      );

    case QuestionType.ARABIC_GRAMMAR:
      return <GrammarRenderer content={content} answer={answer} onChange={onChange} isReadonly={isReadonly} />;

    case QuestionType.READING_COMPREHENSION:
      return <ReadingComprehensionRenderer content={content} answer={answer} onChange={onChange} isReadonly={isReadonly} />;

    default:
      return (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm">
          نوع السؤال غير معروف ({qType}). يرجى كتابة الإجابة في الحقل أدناه:
          <textarea
            value={typeof answer === 'string' ? answer : JSON.stringify(answer || '')}
            onChange={(e) => onChange(e.target.value)}
            disabled={isReadonly}
            rows={4}
            className="w-full mt-2 p-3 bg-white border border-amber-300 rounded-lg text-slate-800"
          />
        </div>
      );
  }
};
