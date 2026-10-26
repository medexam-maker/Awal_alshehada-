import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TWELVE_CONTRACT_SUBJECTS } from '../client/data/contractSubjects';
import { generateInitialQuestions } from '../client/storage/defaultCurriculumData';

dotenv.config();

const app = express();
const port = process.env.EXPRESS_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory / dynamic questions store initialized with authentic questions
let storedQuestions: any[] = generateInitialQuestions();

// 1. Get All Subjects
app.get('/api/subjects', (req, res) => {
  res.json({ success: true, subjects: TWELVE_CONTRACT_SUBJECTS });
});

// 2. Get Questions for a subject
app.get('/api/questions', (req, res) => {
  const subjectSlug = req.query.subjectSlug as string;
  const filtered = subjectSlug
    ? storedQuestions.filter((q) => q.subjectSlug === subjectSlug)
    : storedQuestions;
  res.json({ success: true, questions: filtered });
});

// 3. Admin: Bulk Import Ordering Questions
app.post('/api/admin/bulk-import-ordering', (req, res) => {
  const { subjectSlug, questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ success: false, error: 'قائمة الأسئلة فارغة' });
  }

  const validQuestions: any[] = [];

  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    let items = q.items || [];

    if (Array.isArray(items)) {
      items = items.map((it: any, i: number) => {
        if (typeof it === 'string') return { id: `s${i + 1}`, text: it };
        return { id: it.id || `s${i + 1}`, text: it.text };
      });
    }

    if (items.length < 2) {
      return res.status(400).json({
        success: false,
        error: `السؤال رقم ${idx + 1} يجب أن يحتوي على عنصرين على الأقل للترتيب.`,
      });
    }

    const correctOrder = Array.isArray(q.correctOrder) && q.correctOrder.length > 0
      ? q.correctOrder
      : items.map((it: any) => it.id);

    const newQuestion = {
      id: `q-ord-${Date.now()}-${idx}`,
      subjectSlug: subjectSlug || 'history',
      questionType: 'ordering',
      prompt: q.text || q.prompt || 'رتب الأحداث التالية:',
      allocatedMarks: q.allocatedMarks || 10,
      content: {
        text: q.text || q.prompt,
        items,
        correctOrder,
        scoring_type: q.scoring_type || 'partial',
      },
      correctAnswer: { orderedIds: correctOrder },
      explanationAr: q.explanation || null,
    };

    validQuestions.push(newQuestion);
  }

  storedQuestions.push(...validQuestions);

  res.json({
    success: true,
    message: `تم استيراد ${validQuestions.length} سؤال بنجاح`,
    count: validQuestions.length,
  });
});

app.listen(port, () => {
  console.log(`[Awal-AlShehada Server] Running on http://localhost:${port}`);
});
