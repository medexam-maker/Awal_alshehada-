import { QuestionType, GradingStrategy } from './constants';
import type { ValidationResult } from './validation/schemas';

export interface MediaReference {
  url: string;
  type: string;
  altText?: string;
}

export type InteractionMode =
  | 'toggle_cards'
  | 'tap_reveal_3'
  | 'dropdown'
  | 'drag_drop_wordbank'
  | 'free_text_blank'
  | 'large_cards'
  | 'radio_list'
  | 'tap_to_match'
  | 'drag_drop'
  | 'dropdown_per_item'
  | 'free_text_box'
  | 'free_text_box_large'
  | 'select_reason_from_list'
  | 'dropdown_per_cell'
  | 'drag_cards_to_cells'
  | 'tap_words'
  | 'numbered_points_select'
  | 'drag_labels_on_image'
  | 'map_with_subquestions'
  | 'tap_on_hotspot'
  | 'numeric_with_work'
  | 'move_up_down_arrows'
  | 'select_from_preset_options'
  | 'passage_with_questions_and_summary';

// --- 1. True/False ---
export interface TrueFalseContent {
  prompt: string;
  statement: string;
  explanation?: string;
}
export interface TrueFalseAnswer {
  value: boolean;
  correctionText?: string;
}

// --- 2. Fill-in-the-Blank ---
export interface FillBlankNormalization {
  ignoreAl?: boolean;
  ignoreDiacritics?: boolean;
  ignoreCase?: boolean;
  trimWhitespace?: boolean;
}
export interface FillBlankItem {
  id: string;
  choices?: string[];
  correctValue: string;
  referenceAnswer?: string;
}
export interface FillBlankContent {
  textWithBlanks?: string;
  blanks?: FillBlankItem[];
  normalization?: FillBlankNormalization;
  prompt?: string;
  template?: string;
  wordBank?: string[];
  referenceAnswers?: Record<string, string>;
}
export interface FillBlankAnswer {
  answers?: Record<string, string>;
  blanks?: Record<string, string>;
  selfEvaluations?: Record<string, boolean>;
  confirmedBlanks?: Record<string, boolean>;
}

// --- 3. Multiple Choice ---
export interface MultipleChoiceOption {
  id: string;
  text: string;
  media?: MediaReference;
}
export interface MultipleChoiceContent {
  prompt: string;
  options: MultipleChoiceOption[];
  media?: MediaReference[];
}
export interface MultipleChoiceAnswer {
  selectedOptionId: string;
}

// --- 4. Matching ---
export interface MatchingItem {
  id: string;
  text: string;
  pairId?: string;
}
export interface MatchingContent {
  prompt: string;
  listA: MatchingItem[];
  listB: MatchingItem[];
  allowPartialMatch?: boolean;
}
export interface MatchingAnswer {
  pairs: Record<string, string>;
}

// --- 5. Short Essay ---
export interface TopicChoiceOption {
  id: string;
  text: string;
}
export interface ShortEssayContent {
  prompt: string;
  wordLimit?: number;
  guidelines?: string;
  topicChoiceOptions?: TopicChoiceOption[];
}
export interface ShortEssayAnswer {
  text: string;
  selectedTopicId?: string;
}

// --- 6. Long Essay ---
export interface LongEssayContent {
  prompt: string;
  wordLimit?: number;
  guidelines?: string;
  topicChoiceOptions?: TopicChoiceOption[];
}
export interface LongEssayAnswer {
  text: string;
  selectedTopicId?: string;
}

// --- 7. Explain/Justify ---
export interface ExplainContent {
  prompt: string;
  validReasons?: string[];
  allowFreeText?: boolean;
  topicChoiceOptions?: TopicChoiceOption[];
}
export interface ExplainAnswer {
  text?: string;
  selectedReasonIds?: string[];
}

// --- 8. Comparison Table Completion ---
export interface ComparisonTableCell {
  id: string;
  value: string | null;
  correctValue: string;
  options?: string[];
  tolerance?: number;
}
export interface ComparisonTableRow {
  id: string;
  label: string;
  cells: ComparisonTableCell[];
}
export interface ComparisonTableContent {
  prompt: string;
  tableHeaders: string[];
  rows: ComparisonTableRow[];
}
export interface ComparisonTableAnswer {
  cells: Record<string, string>;
}

// --- 9. Extract the Odd One Out ---
export interface OddOneOutItem {
  id: string;
  text: string;
}
export interface ServerOddOneOutItem extends OddOneOutItem {
  isOdd?: boolean;
}
export interface OddOneOutContent {
  prompt: string;
  passage?: string;
  items: (OddOneOutItem | ServerOddOneOutItem)[];
}
export interface OddOneOutAnswer {
  selectedItemIds: string[];
}

// --- 10. Diagram Labeling ---
export interface DiagramLabel {
  id: string;
  pointNumber: number;
  correctValue: string;
  options?: string[];
}
export interface DiagramLabelingContent {
  prompt: string;
  diagram: MediaReference;
  labels: DiagramLabel[];
}
export interface DiagramLabelingAnswer {
  labels: Record<string, string>;
}

// --- 11. Contour Map Reading ---
export type ContourSubQuestion =
  | { id: string; type: typeof QuestionType.MULTIPLE_CHOICE; prompt: string; content: MultipleChoiceContent; correctAnswer: MultipleChoiceAnswer }
  | { id: string; type: typeof QuestionType.FILL_BLANK; prompt: string; content: FillBlankContent; correctAnswer: FillBlankAnswer }
  | { id: string; type: typeof QuestionType.SHORT_ESSAY; prompt: string; content: ShortEssayContent; correctAnswer: ShortEssayAnswer };

export interface ContourMapContent {
  prompt: string;
  mapImage: MediaReference;
  subQuestions: ContourSubQuestion[];
}
export interface ContourMapAnswer {
  subAnswers: Record<string, unknown>;
}
export interface ContourMapAnswerTyped {
  subAnswers: Record<string, MultipleChoiceAnswer | FillBlankAnswer | ShortEssayAnswer | unknown>;
}

// --- 12. Calculation / Word Problem ---
export interface CalculationContent {
  prompt: string;
  media?: MediaReference[];
  expectedFormat?: string;
  unit?: string;
}
export interface CalculationAnswer {
  value: number | string;
  tolerance?: number;
  workText?: string;
  photoUrl?: string;
}

// --- 13. Ordering ---
export interface OrderingItem {
  id: string;
  text: string;
}
export interface ServerOrderingItem extends OrderingItem {
  correctOrder?: number;
}
export interface OrderingContent {
  prompt: string;
  items: (OrderingItem | ServerOrderingItem)[];
}
export interface OrderingAnswer {
  order: Record<string, number>;
}

// --- 14. Arabic Grammar Parsing + Diacritics ---
export interface GrammarOption {
  id: string;
  label: string;
}
export interface GrammarAnswer {
  irab?: string;
  tashkeel?: string;
  function?: string;
}
export interface ArabicGrammarWord {
  id: string;
  text: string;
  options?: GrammarOption[];
  correctAnswer: GrammarAnswer;
}
export interface ArabicGrammarContent {
  prompt: string;
  mode: 'irab' | 'tashkeel';
  passage: string;
  words: ArabicGrammarWord[];
}
export interface ArabicGrammarAnswer {
  words: Record<string, GrammarAnswer>;
}

// --- 15. Reading Comprehension + Summary ---
export type ReadingSubQuestion =
  | { id: string; type: typeof QuestionType.MULTIPLE_CHOICE; prompt: string; content: MultipleChoiceContent; correctAnswer: MultipleChoiceAnswer }
  | { id: string; type: typeof QuestionType.FILL_BLANK; prompt: string; content: FillBlankContent; correctAnswer: FillBlankAnswer }
  | { id: string; type: typeof QuestionType.TRUE_FALSE; prompt: string; content: TrueFalseContent; correctAnswer: TrueFalseAnswer };

export interface ReadingComprehensionContent {
  prompt: string;
  passage: string;
  media?: MediaReference[];
  subQuestions: ReadingSubQuestion[];
  summaryPrompt?: string;
}
export interface ReadingComprehensionAnswer {
  subAnswers: Record<string, MultipleChoiceAnswer | FillBlankAnswer | TrueFalseAnswer | unknown>;
  summary?: string;
}

// --- Discriminated Unions ---

export type QuestionContent =
  | { type: typeof QuestionType.TRUE_FALSE; content: TrueFalseContent }
  | { type: typeof QuestionType.FILL_BLANK; content: FillBlankContent }
  | { type: typeof QuestionType.MULTIPLE_CHOICE; content: MultipleChoiceContent }
  | { type: typeof QuestionType.MATCHING; content: MatchingContent }
  | { type: typeof QuestionType.SHORT_ESSAY; content: ShortEssayContent }
  | { type: typeof QuestionType.LONG_ESSAY; content: LongEssayContent }
  | { type: typeof QuestionType.EXPLAIN; content: ExplainContent }
  | { type: typeof QuestionType.COMPARISON_TABLE; content: ComparisonTableContent }
  | { type: typeof QuestionType.ODD_ONE_OUT; content: OddOneOutContent }
  | { type: typeof QuestionType.DIAGRAM_LABELING; content: DiagramLabelingContent }
  | { type: typeof QuestionType.CONTOUR_MAP; content: ContourMapContent }
  | { type: typeof QuestionType.CALCULATION; content: CalculationContent }
  | { type: typeof QuestionType.ORDERING; content: OrderingContent }
  | { type: typeof QuestionType.ARABIC_GRAMMAR; content: ArabicGrammarContent }
  | { type: typeof QuestionType.READING_COMPREHENSION; content: ReadingComprehensionContent };

export type QuestionAnswer =
  | { type: typeof QuestionType.TRUE_FALSE; answer: TrueFalseAnswer }
  | { type: typeof QuestionType.FILL_BLANK; answer: FillBlankAnswer }
  | { type: typeof QuestionType.MULTIPLE_CHOICE; answer: MultipleChoiceAnswer }
  | { type: typeof QuestionType.MATCHING; answer: MatchingAnswer }
  | { type: typeof QuestionType.SHORT_ESSAY; answer: ShortEssayAnswer }
  | { type: typeof QuestionType.LONG_ESSAY; answer: LongEssayAnswer }
  | { type: typeof QuestionType.EXPLAIN; answer: ExplainAnswer }
  | { type: typeof QuestionType.COMPARISON_TABLE; answer: ComparisonTableAnswer }
  | { type: typeof QuestionType.ODD_ONE_OUT; answer: OddOneOutAnswer }
  | { type: typeof QuestionType.DIAGRAM_LABELING; answer: DiagramLabelingAnswer }
  | { type: typeof QuestionType.CONTOUR_MAP; answer: ContourMapAnswerTyped }
  | { type: typeof QuestionType.CALCULATION; answer: CalculationAnswer }
  | { type: typeof QuestionType.ORDERING; answer: OrderingAnswer }
  | { type: typeof QuestionType.ARABIC_GRAMMAR; answer: ArabicGrammarAnswer }
  | { type: typeof QuestionType.READING_COMPREHENSION; answer: ReadingComprehensionAnswer };

export interface ValidationRule {
  field: string;
  required: boolean;
  type?: string;
}

export interface QuestionTypeRegistryEntry {
  type: QuestionType;
  labelAr: string;
  labelEn: string;
  contentSchema: object;
  answerSchema: object;
  allowedModes: InteractionMode[];
  defaultMode: InteractionMode;
  grading: GradingStrategy;
  trainingSupport: boolean;
  simulationSupport: boolean;
  manualGradingSupport: boolean;
  mediaRequired: boolean;
  validationRules: ValidationRule[];
  customValidator?: (
    content: unknown,
    correctAnswer: unknown,
    examMode?: string
  ) => ValidationResult;
}

export interface ExamSnapshotQuestion {
  id: string;
  questionType: QuestionType;
  content: unknown;
  primaryInteractionMode: string;
  marks: number;
  position: number;
}
