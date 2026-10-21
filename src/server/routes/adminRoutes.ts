import { Router, Response, NextFunction } from 'express';
import { pool } from '../db/index';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { QuestionType, BankType, QuestionStatus } from '../../shared/constants';
import { validateQuestionContent, validateMcqAnswer, validateTrueFalseAnswer, ContentSchemas } from '../../shared/validation/schemas';

const router = Router();

// Middleware: Require Authenticated User
router.use(requireAuth);

// Middleware: Require Admin Role
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin authorization required for central question management',
        details: { currentRole: req.user?.role || 'anonymous' },
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
}

router.use(requireAdmin);

/**
 * GET /api/admin/questions
 * Retrieves questions for a specific subject from PostgreSQL authoritative question_bank.
 */
router.get('/questions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const subjectSlug = req.query.subjectSlug as string;
  if (!subjectSlug) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'subjectSlug query parameter is required', details: {} },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT q.id, s.slug AS "subjectSlug", s.name_ar AS "subjectNameAr",
              q.question_type AS "questionType", q.content, q.correct_answer AS "correctAnswer",
              q.marks AS "allocatedMarks", q.explanation AS "explanationAr",
              q.bank_type AS "bankType", q.status, q.created_at AS "createdAt",
              q.primary_interaction_mode AS "primaryInteractionMode"
       FROM question_bank q
       JOIN subjects s ON q.subject_id = s.id
       WHERE s.slug = $1
       ORDER BY q.created_at DESC`,
      [subjectSlug]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      message: '',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[admin/questions:GET] Database query error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to retrieve questions from database', details: {} },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/admin/questions
 * Creates a centrally managed question in PostgreSQL question_bank.
 */
router.post('/questions', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    subjectSlug,
    questionType,
    prompt,
    content,
    correctAnswer,
    allocatedMarks,
    explanationAr,
    bankType = BankType.COMPREHENSIVE,
    status = QuestionStatus.APPROVED,
    examYear,
  } = req.body;

  if (!subjectSlug || !questionType || !prompt || !content || correctAnswer === undefined) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Missing required question fields: subjectSlug, questionType, prompt, content, correctAnswer',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 1. Prepare Full Content
  const fullContent: Record<string, any> = {
    prompt,
    ...(typeof content === 'object' && content !== null ? content : {}),
  };
  if (questionType === QuestionType.TRUE_FALSE && !fullContent.statement) {
    fullContent.statement = prompt;
  }

  const contentValidation = validateQuestionContent(questionType as keyof typeof ContentSchemas, fullContent);
  if (!contentValidation.valid) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid question content schema',
        details: contentValidation.errors,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 2. Validate Question Answers
  let normalizedCorrectAnswer = correctAnswer;

  if (questionType === QuestionType.MULTIPLE_CHOICE) {
    const mcqValidation = validateMcqAnswer(correctAnswer, fullContent);
    if (!mcqValidation.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid canonical MCQ answer or referenced option does not exist in options list',
          details: mcqValidation.errors,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  } else if (questionType === QuestionType.TRUE_FALSE) {
    if (typeof correctAnswer === 'boolean') {
      normalizedCorrectAnswer = { value: correctAnswer };
    }
    const tfValidation = validateTrueFalseAnswer(normalizedCorrectAnswer);
    if (!tfValidation.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid canonical True/False answer shape; must be { value: boolean }',
          details: tfValidation.errors,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 3. Resolve Subject ID from Slug
    let subjectRes = await client.query('SELECT id, name_ar FROM subjects WHERE slug = $1', [subjectSlug]);
    if (subjectRes.rows.length === 0) {
      // Auto-register subject if it's a valid contract subject
      const defaultName = subjectSlug.replace(/-/g, ' ');
      const newSub = await client.query(
        `INSERT INTO subjects (name_ar, name_en, slug, is_active)
         VALUES ($1, $2, $3, true) RETURNING id, name_ar`,
        [defaultName, subjectSlug, subjectSlug]
      );
      subjectRes = newSub;
    }
    const subjectId = subjectRes.rows[0].id;

    // 4. Insert into question_bank
    const marksValue = Number(allocatedMarks) || 5;
    const insertRes = await client.query(
      `INSERT INTO question_bank
       (subject_id, question_type, content, correct_answer, primary_interaction_mode, marks, bank_type, status, explanation, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, created_at`,
      [
        subjectId,
        questionType,
        JSON.stringify(fullContent),
        JSON.stringify(normalizedCorrectAnswer),
        'large_cards',
        marksValue,
        bankType,
        status,
        explanationAr || null,
        req.user!.id,
      ]
    );

    const questionId = insertRes.rows[0].id;
    const createdAt = insertRes.rows[0].created_at;

    // 5. If examYear is specified, link into training_exam_sets and training_set_questions
    if (examYear && typeof examYear === 'number') {
      let setRes = await client.query(
        `SELECT id FROM training_exam_sets
         WHERE subject_id = $1 AND exam_category = 'year' AND exam_year = $2`,
        [subjectId, examYear]
      );

      let setId: string;
      if (setRes.rows.length === 0) {
        const newSet = await client.query(
          `INSERT INTO training_exam_sets (subject_id, name_ar, exam_category, exam_year, created_by)
           VALUES ($1, $2, 'year', $3, $4)
           RETURNING id`,
          [subjectId, `امتحان الشهادة الثانوية دورة ${examYear}م`, examYear, req.user!.id]
        );
        setId = newSet.rows[0].id;
      } else {
        setId = setRes.rows[0].id;
      }

      // Lock parent exam set row to serialize concurrent position computation and prevent race conditions
      await client.query('SELECT id FROM training_exam_sets WHERE id = $1 FOR UPDATE', [setId]);

      // Find next position with serialization guarantee
      const posRes = await client.query(
        `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos FROM training_set_questions WHERE training_set_id = $1`,
        [setId]
      );
      const nextPos = posRes.rows[0].next_pos;

      await client.query(
        `INSERT INTO training_set_questions (training_set_id, question_id, position, marks_override)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (training_set_id, question_id) DO NOTHING`,
        [setId, questionId, nextPos, marksValue]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        id: questionId,
        subjectSlug,
        questionType,
        prompt,
        content: fullContent,
        correctAnswer: normalizedCorrectAnswer,
        allocatedMarks: marksValue,
        explanationAr,
        status,
        bankType,
        createdAt,
      },
      message: 'تم حفظ السؤال بنجاح في قاعدة البيانات المركزية',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[admin/questions:POST] Error creating question:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to create question in database', details: {} },
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/admin/questions/:id
 * Deletes question or safely archives it if referenced by existing attempts (ON DELETE RESTRICT).
 */
router.delete('/questions/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const questionId = req.params.id;
  if (!questionId) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Question ID parameter is required', details: {} },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if question exists
    const check = await client.query('SELECT id, status FROM question_bank WHERE id = $1', [questionId]);
    if (check.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Question not found in database', details: {} },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Try hard delete first; if foreign key restricts it due to historical attempts, archive safely
    try {
      await client.query('DELETE FROM question_bank WHERE id = $1', [questionId]);
      await client.query('COMMIT');
      res.status(200).json({
        success: true,
        data: { id: questionId, status: 'deleted' },
        message: 'تم حذف السؤال نهائياً من بنك الأسئلة',
        timestamp: new Date().toISOString(),
      });
    } catch (delErr: any) {
      // Postgres error 23503: foreign_key_violation (referenced by exam_attempt_questions)
      if (delErr.code === '23503') {
        await client.query('ROLLBACK');
        await client.query('BEGIN');
        await client.query("UPDATE question_bank SET status = 'archived' WHERE id = $1", [questionId]);
        await client.query('COMMIT');
        res.status(200).json({
          success: true,
          data: { id: questionId, status: 'archived' },
          message: 'تمت أرشفة السؤال بنجاح لحماية المحاولات السابقة وسجل درجات الطلاب',
          timestamp: new Date().toISOString(),
        });
      } else {
        throw delErr;
      }
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[admin/questions:DELETE] Error deleting question:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to delete question', details: {} },
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
});

export default router;
