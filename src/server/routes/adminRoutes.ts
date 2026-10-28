import { Router, Response, NextFunction } from 'express';
import { pool } from '../db/index';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { QuestionType, BankType, QuestionStatus } from '../../shared/constants';
import { validateQuestionContent, validateQuestionAnswer, validateMcqAnswer, validateTrueFalseAnswer, ContentSchemas, AnswerSchemas } from '../../shared/validation/schemas';
import { QUESTION_TYPE_REGISTRY } from '../../shared/questionTypeRegistry';

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
  if (questionType === QuestionType.TRUE_FALSE && typeof correctAnswer === 'boolean') {
    normalizedCorrectAnswer = { value: correctAnswer };
  }

  const registryEntry = QUESTION_TYPE_REGISTRY[questionType as QuestionType];

  if (registryEntry?.customValidator) {
    const customResult = registryEntry.customValidator(
      fullContent,
      normalizedCorrectAnswer,
      bankType === 'training' ? 'training' : 'simulator'
    );
    if (!customResult.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid ${questionType} answer`,
          details: customResult.errors,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  } else if (questionType === QuestionType.MULTIPLE_CHOICE) {
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
  } else {
    const ansValidation = validateQuestionAnswer(questionType as keyof typeof AnswerSchemas, normalizedCorrectAnswer);
    if (!ansValidation.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid ${questionType} answer`,
          details: ansValidation.errors,
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

// Helper: Validate a single question payload for individual or bulk import
function validateSingleQuestionPayload(q: any, bankType: string = 'comprehensive') {
  const errors: string[] = [];
  if (!q || typeof q !== 'object') {
    return { valid: false, errors: ['Question must be an object'], prompt: '', questionType: '' };
  }
  const questionType = q.questionType || q.question_type;
  if (!questionType) {
    return { valid: false, errors: ['Missing required field: questionType'], prompt: '', questionType: '' };
  }

  const rawContent = typeof q.content === 'object' && q.content !== null ? q.content : {};
  const prompt =
    q.prompt ||
    rawContent.prompt ||
    rawContent.textWithBlanks ||
    rawContent.statement ||
    '';

  const fullContent: Record<string, any> = {
    prompt: prompt || (rawContent.textWithBlanks || ''),
    ...rawContent,
  };
  if (questionType === QuestionType.TRUE_FALSE && !fullContent.statement) {
    fullContent.statement = prompt;
  }
  if (questionType === QuestionType.FILL_BLANK && !fullContent.textWithBlanks) {
    fullContent.textWithBlanks = prompt;
  }

  // 1. Content Schema Validation
  const contentVal = validateQuestionContent(questionType as keyof typeof ContentSchemas, fullContent);
  if (!contentVal.valid) {
    const errMsgs = Array.isArray(contentVal.errors)
      ? contentVal.errors.map((e: any) => (typeof e === 'string' ? e : `${e.instancePath || ''} ${e.message || 'خطأ في بنية السؤال'}`))
      : ['Invalid question content schema'];
    errors.push(...errMsgs);
  }

  // 2. Answer Schema Validation
  const correctAnswer = q.correctAnswer !== undefined ? q.correctAnswer : q.correct_answer;
  if (correctAnswer === undefined) {
    errors.push('Missing required field: correctAnswer');
    return {
      valid: false,
      errors,
      fullContent,
      normalizedCorrectAnswer: null,
      prompt: fullContent.prompt || prompt,
      questionType,
      allocatedMarks: q.allocatedMarks || q.marks || 5,
      explanationAr: q.explanationAr || q.explanation || null,
      status: q.status || QuestionStatus.APPROVED,
      primaryInteractionMode: q.primaryInteractionMode || q.primary_interaction_mode || 'large_cards',
    };
  }

  let normalizedCorrectAnswer = correctAnswer;
  if (questionType === QuestionType.TRUE_FALSE && typeof correctAnswer === 'boolean') {
    normalizedCorrectAnswer = { value: correctAnswer };
  }

  const registryEntry = QUESTION_TYPE_REGISTRY[questionType as QuestionType];
  if (registryEntry?.customValidator) {
    const customResult = registryEntry.customValidator(
      fullContent,
      normalizedCorrectAnswer,
      bankType === 'training' ? 'training' : 'simulator'
    );
    if (!customResult.valid) {
      const errMsgs = Array.isArray(customResult.errors)
        ? customResult.errors.map((e: any) => (typeof e === 'string' ? e : e.message || 'Custom validation failed'))
        : ['Custom validation error'];
      errors.push(...errMsgs);
    }
  } else if (questionType === QuestionType.MULTIPLE_CHOICE) {
    const mcqVal = validateMcqAnswer(correctAnswer, fullContent);
    if (!mcqVal.valid) {
      const errMsgs = Array.isArray(mcqVal.errors)
        ? mcqVal.errors.map((e: any) => (typeof e === 'string' ? e : e.message || 'MCQ validation failed'))
        : ['Invalid canonical MCQ answer'];
      errors.push(...errMsgs);
    }
  } else if (questionType === QuestionType.TRUE_FALSE) {
    const tfVal = validateTrueFalseAnswer(normalizedCorrectAnswer);
    if (!tfVal.valid) {
      const errMsgs = Array.isArray(tfVal.errors)
        ? tfVal.errors.map((e: any) => (typeof e === 'string' ? e : e.message || 'True/False validation failed'))
        : ['Invalid canonical True/False answer shape'];
      errors.push(...errMsgs);
    }
  } else {
    const ansVal = validateQuestionAnswer(questionType as keyof typeof AnswerSchemas, normalizedCorrectAnswer);
    if (!ansVal.valid) {
      const errMsgs = Array.isArray(ansVal.errors)
        ? ansVal.errors.map((e: any) => (typeof e === 'string' ? e : `${e.instancePath || ''} ${e.message || 'خطأ في بنية الإجابة'}`))
        : ['Answer schema validation failed'];
      errors.push(...errMsgs);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    fullContent,
    normalizedCorrectAnswer,
    prompt: fullContent.prompt || prompt,
    questionType,
    allocatedMarks: q.allocatedMarks || q.marks || 5,
    explanationAr: q.explanationAr || q.explanation || null,
    status: q.status || QuestionStatus.APPROVED,
    primaryInteractionMode: q.primaryInteractionMode || q.primary_interaction_mode || 'large_cards',
  };
}

// Helper: Check duplicate prompt using prompt_hash column with fallback
async function checkDuplicatePrompt(clientOrPool: any, subjectId: string, promptText: string) {
  if (!promptText || !promptText.trim()) return null;
  try {
    const res = await clientOrPool.query(
      `SELECT id, content->>'prompt' as prompt, status
       FROM question_bank
       WHERE subject_id = $1
       AND prompt_hash = md5(lower(trim($2)))
       LIMIT 1`,
      [subjectId, promptText]
    );
    return res.rows[0] || null;
  } catch (err: any) {
    // If prompt_hash column doesn't exist in dev/unmigrated DB, fallback to direct md5 expression
    if (err.code === '42703') {
      const fallbackRes = await clientOrPool.query(
        `SELECT id, content->>'prompt' as prompt, status
         FROM question_bank
         WHERE subject_id = $1
         AND md5(lower(trim(COALESCE(content->>'prompt', '')))) = md5(lower(trim($2)))
         LIMIT 1`,
        [subjectId, promptText]
      );
      return fallbackRes.rows[0] || null;
    }
    throw err;
  }
}

/**
 * POST /api/admin/questions/bulk-validate
 * Dry-run validation & duplicate detection without writing to the database.
 */
router.post('/questions/bulk-validate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { subjectSlug, bankType = BankType.COMPREHENSIVE, questions } = req.body;

  if (!subjectSlug || !Array.isArray(questions)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields: subjectSlug and questions array',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (questions.length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Questions array is empty',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    // 1. Resolve Subject ID
    const subRes = await pool.query('SELECT id FROM subjects WHERE slug = $1', [subjectSlug]);
    const subjectId = subRes.rows[0]?.id || null;

    const errors: Array<{ index: number; questionType: string; errors: string[] }> = [];
    const duplicateWarnings: Array<{
      index: number;
      questionPrompt: string;
      existingQuestionId: string;
      existingPrompt: string;
      status: string;
    }> = [];

    // 2. Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      const valResult = validateSingleQuestionPayload(item, bankType);

      if (!valResult.valid) {
        errors.push({
          index: i,
          questionType: valResult.questionType || 'unknown',
          errors: valResult.errors,
        });
      } else if (subjectId && valResult.prompt) {
        // Check for duplicates
        const dup = await checkDuplicatePrompt(pool, subjectId, valResult.prompt);
        if (dup) {
          duplicateWarnings.push({
            index: i,
            questionPrompt: valResult.prompt,
            existingQuestionId: dup.id,
            existingPrompt: dup.prompt || '',
            status: dup.status || 'approved',
          });
        }
      }
    }

    const total = questions.length;
    const invalid = errors.length;
    const valid = total - invalid;

    res.status(200).json({
      success: true,
      data: {
        total,
        valid,
        invalid,
        duplicateWarnings,
        errors,
        summary: {
          toImport: valid,
          duplicates: duplicateWarnings.length,
          invalid,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[admin/questions/bulk-validate:POST] Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to validate questions batch', details: {} },
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/admin/questions/bulk-import
 * All-or-nothing transactional bulk import with per-duplicate skip/import decisions.
 */
router.post('/questions/bulk-import', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const {
    subjectSlug,
    bankType = BankType.COMPREHENSIVE,
    examYear,
    questions,
    duplicateDecisions = {},
  } = req.body;

  if (!subjectSlug || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields: subjectSlug and non-empty questions array',
        details: {},
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 1. All-or-Nothing strict schema pre-validation
  const validatedList: Array<ReturnType<typeof validateSingleQuestionPayload>> = [];
  const validationErrors: Array<{ index: number; questionType: string; errors: string[] }> = [];

  for (let i = 0; i < questions.length; i++) {
    const valResult = validateSingleQuestionPayload(questions[i], bankType);
    if (!valResult.valid) {
      validationErrors.push({
        index: i,
        questionType: valResult.questionType || 'unknown',
        errors: valResult.errors,
      });
    } else {
      validatedList.push(valResult);
    }
  }

  if (validationErrors.length > 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'ALL_OR_NOTHING_VALIDATION_FAILED',
        message: 'فشل التحقق من صحة الأسئلة: تم رفض حزمة الاستيراد بالكامل دون إدراج أي سؤال وفق مبدأ (الكل أو لا شيء).',
        details: validationErrors,
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 2. Open DB Transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Resolve or insert subject
    let subjectRes = await client.query('SELECT id, name_ar FROM subjects WHERE slug = $1', [subjectSlug]);
    if (subjectRes.rows.length === 0) {
      const defaultName = subjectSlug.replace(/-/g, ' ');
      const newSub = await client.query(
        `INSERT INTO subjects (name_ar, name_en, slug, is_active)
         VALUES ($1, $2, $3, true) RETURNING id, name_ar`,
        [defaultName, subjectSlug, subjectSlug]
      );
      subjectRes = newSub;
    }
    const subjectId = subjectRes.rows[0].id;

    // Lock training set if examYear specified
    let trainingSetId: string | null = null;
    let currentPosition = 0;

    if (examYear) {
      const setRes = await client.query(
        `SELECT id FROM training_exam_sets 
         WHERE subject_id = $1 AND exam_year = $2
         FOR UPDATE`,
        [subjectId, examYear]
      );
      if (setRes.rows.length > 0) {
        trainingSetId = setRes.rows[0].id;
        const posRes = await client.query(
          `SELECT COALESCE(MAX(position), 0) AS max_pos FROM training_set_questions WHERE training_set_id = $1`,
          [trainingSetId]
        );
        currentPosition = Number(posRes.rows[0].max_pos) || 0;
      }
    }

    let importedCount = 0;
    let skippedCount = 0;
    const byDecision = { skipped: 0, imported: 0, new: 0 };

    // 3. Process each question
    for (let i = 0; i < validatedList.length; i++) {
      const item = validatedList[i];
      const dup = await checkDuplicatePrompt(client, subjectId, item.prompt);

      if (dup) {
        const decision = duplicateDecisions[i] || duplicateDecisions[String(i)] || 'skip';
        if (decision === 'skip') {
          skippedCount++;
          byDecision.skipped++;
          continue;
        } else {
          byDecision.imported++;
        }
      } else {
        byDecision.new++;
      }

      const insertRes = await client.query(
        `INSERT INTO question_bank
         (subject_id, question_type, content, correct_answer, primary_interaction_mode, marks, bank_type, status, explanation, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          subjectId,
          item.questionType,
          JSON.stringify(item.fullContent),
          JSON.stringify(item.normalizedCorrectAnswer),
          item.primaryInteractionMode,
          item.allocatedMarks,
          bankType,
          item.status,
          item.explanationAr,
          req.user?.id || 'admin',
        ]
      );
      const newQuestionId = insertRes.rows[0].id;

      if (trainingSetId) {
        currentPosition++;
        await client.query(
          `INSERT INTO training_set_questions (training_set_id, question_id, position)
           VALUES ($1, $2, $3)`,
          [trainingSetId, newQuestionId, currentPosition]
        );
      }

      importedCount++;
    }

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: {
        imported: importedCount,
        skipped: skippedCount,
        byDecision,
        transaction: 'committed',
      },
      message: `تم استيراد ${importedCount} سؤال بنجاح (تخطي ${skippedCount} مكرر)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[admin/questions/bulk-import:POST] Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to execute bulk import transaction', details: {} },
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/admin/bulk-import-ordering
 * Central database route for bulk importing ordering questions (JSON or pre-parsed CSV).
 */
router.post('/bulk-import-ordering', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { subjectSlug, questions } = req.body;

  if (!subjectSlug || !Array.isArray(questions) || questions.length === 0) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'subjectSlug and non-empty questions array are required', details: {} },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const validQuestions: any[] = [];
  for (let idx = 0; idx < questions.length; idx++) {
    const q = questions[idx];
    let items = q.items || [];

    if (Array.isArray(items)) {
      items = items.map((it: any, i: number) => {
        if (typeof it === 'string') return { id: `s${i + 1}`, text: it.trim() };
        return { id: it.id || `s${i + 1}`, text: String(it.text || it.title || '').trim() };
      });
    }

    if (!Array.isArray(items) || items.length < 2) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `السؤال رقم ${idx + 1} يجب أن يحتوي على عنصرين على الأقل للترتيب.`,
          details: {},
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const correctOrder = Array.isArray(q.correctOrder) && q.correctOrder.length > 0
      ? q.correctOrder
      : items.map((it: any) => it.id);

    validQuestions.push({
      prompt: q.prompt || q.text || 'رتب الأحداث التالية بالترتيب الصحيح:',
      items,
      correctOrder,
      allocatedMarks: q.allocatedMarks || q.marks || 5,
      explanationAr: q.explanationAr || q.explanation || null,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let subjectRes = await client.query('SELECT id FROM subjects WHERE slug = $1', [subjectSlug]);
    if (subjectRes.rows.length === 0) {
      const defaultName = subjectSlug.replace(/-/g, ' ');
      subjectRes = await client.query(
        `INSERT INTO subjects (name_ar, name_en, slug, is_active) VALUES ($1, $2, $3, true) RETURNING id`,
        [defaultName, subjectSlug, subjectSlug]
      );
    }
    const subjectId = subjectRes.rows[0].id;

    for (const q of validQuestions) {
      const content = {
        prompt: q.prompt,
        items: q.items,
        correctOrder: q.correctOrder,
        scoring_type: 'partial',
      };
      const correctAnswer = { orderedIds: q.correctOrder };

      await client.query(
        `INSERT INTO question_bank
         (subject_id, question_type, content, correct_answer, primary_interaction_mode, marks, bank_type, status, explanation, created_by)
         VALUES ($1, 'ordering', $2, $3, 'large_cards', $4, 'comprehensive', 'approved', $5, $6)`,
        [
          subjectId,
          JSON.stringify(content),
          JSON.stringify(correctAnswer),
          q.allocatedMarks,
          q.explanationAr,
          req.user?.id || 'admin',
        ]
      );
    }

    await client.query('COMMIT');
    res.status(200).json({
      success: true,
      data: { count: validQuestions.length },
      message: `تم استيراد ${validQuestions.length} سؤال ترتيب بنجاح`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[admin/bulk-import-ordering:POST] Error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'DATABASE_ERROR', message: 'Failed to bulk import ordering questions', details: {} },
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
});

export default router;
