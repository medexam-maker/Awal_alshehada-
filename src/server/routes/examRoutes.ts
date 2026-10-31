import { Router, Response } from 'express';
import { startExam, finishExam, getExamResult } from '../lib/attemptManager';
import { getActiveAttempt } from '../lib/recovery';
import { validateStartExamPayload, validateFinishExamPayload } from '../../shared/validation/apiSchemas';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { pool } from '../db';
import { gradeSingleStepCommitment } from '../lib/scoringEngine';

const router = Router();

type AuthRequest = AuthenticatedRequest;

router.use(requireAuth);

router.post('/start', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        
        const validation = validateStartExamPayload(req.body);
        if (!validation.valid) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: validation.errors },
                timestamp: new Date().toISOString()
            });
            return;
        }

        const { subjectId, bankType, examMode, trainingSetId } = req.body;
        const result = await startExam(userId, subjectId, bankType, examMode, trainingSetId);

        res.status(201).json({
            success: true,
            data: result,
            message: '',
            timestamp: new Date().toISOString()
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Access denied.') {
                res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied', details: {} }, timestamp: new Date().toISOString() });
            } else if (error.message.includes('already has an active attempt')) {
                res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Active attempt already exists', details: {} }, timestamp: new Date().toISOString() });
            } else if (
                error.message.includes('قيد الإنشاء والمراجعة') ||
                error.message.includes('INSUFFICIENT_QUESTIONS') ||
                error.message.includes('No eligible questions found')
            ) {
                res.status(404).json({
                    success: false,
                    error: {
                        code: 'QUESTION_BANK_EMPTY',
                        message: 'بنك الأسئلة لهذا الجزء قيد الإنشاء والمراجعة وسيتوفر قريباً.',
                        details: {}
                    },
                    timestamp: new Date().toISOString()
                });
            } else {
                console.error('[exam/start] Internal error:', error);
                res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} }, timestamp: new Date().toISOString() });
            }
        } else {
            console.error('[exam/start] Internal error:', error);
            res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} }, timestamp: new Date().toISOString() });
        }
    }
});

router.get('/active', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const subjectId = req.query.subjectId as string;
        
        if (!subjectId) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'subjectId query parameter is required', details: {} },
                timestamp: new Date().toISOString()
            });
            return;
        }

        const result = await getActiveAttempt(userId, subjectId);
        
        if (!result) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'No active attempt found', details: {} },
                timestamp: new Date().toISOString()
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: result,
            message: '',
            timestamp: new Date().toISOString()
        });
    } catch (error: unknown) {
        console.error('[exam/active] Internal error:', error);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} }, timestamp: new Date().toISOString() });
    }
});

router.post('/finish', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        
        const validation = validateFinishExamPayload(req.body);
        
        if (!validation.valid) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: validation.errors },
                timestamp: new Date().toISOString()
            });
            return;
        }

        const { attemptId, answers, timeTakenSeconds } = req.body;
        const result = await finishExam(userId, attemptId, answers, timeTakenSeconds);

        res.status(200).json({
            success: true,
            data: result,
            message: '',
            timestamp: new Date().toISOString()
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Access denied.') {
                res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied', details: {} }, timestamp: new Date().toISOString() });
            } else if (error.message === 'EXAM_EXPIRED') {
                res.status(400).json({ success: false, error: { code: 'EXAM_EXPIRED', message: 'Exam attempt has expired', details: {} }, timestamp: new Date().toISOString() });
            } else if (error.message === 'Attempt is not active.') {
                res.status(409).json({ success: false, error: { code: 'ATTEMPT_ALREADY_FINALIZED', message: 'Attempt is not active', details: {} }, timestamp: new Date().toISOString() });
            } else if (error.message === 'Attempt not found.') {
                res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Attempt not found', details: {} }, timestamp: new Date().toISOString() });
            } else {
                console.error('[exam/finish] Internal error:', error);
                res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} }, timestamp: new Date().toISOString() });
            }
        } else {
            console.error('[exam/finish] Internal error:', error);
            res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} }, timestamp: new Date().toISOString() });
        }
    }
});

router.get('/:attemptId/result', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const attemptId = Array.isArray(req.params.attemptId) ? req.params.attemptId[0] : req.params.attemptId;

        const result = await getExamResult(userId, attemptId);
        
        res.status(200).json({
            success: true,
            data: result,
            message: '',
            timestamp: new Date().toISOString()
        });
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.message === 'Access denied.') {
                res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied', details: {} }, timestamp: new Date().toISOString() });
            } else if (error.message === 'Attempt not found.') {
                res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Result not found or unauthorized', details: {} }, timestamp: new Date().toISOString() });
            } else {
                console.error('[exam/result] Internal error:', error);
                res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} }, timestamp: new Date().toISOString() });
            }
        } else {
            console.error('[exam/result] Internal error:', error);
            res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: {} }, timestamp: new Date().toISOString() });
        }
    }
});

// --- Pattern 7: Multi-Step Calculation Step Commitment (Connected Training) ---
router.post('/attempts/:attemptId/questions/:attemptQuestionId/steps/:stepId', async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { attemptId, attemptQuestionId, stepId } = req.params;
    const { selectedOptionId } = req.body;

    if (!selectedOptionId || typeof selectedOptionId !== 'string') {
        res.status(400).json({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'selectedOptionId is required and must be a string' },
            timestamp: new Date().toISOString()
        });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Lock and validate attempt ownership and active status
        const attemptRes = await client.query(
            'SELECT id, user_id, status FROM exam_attempts WHERE id = $1 FOR UPDATE',
            [attemptId]
        );

        if (attemptRes.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Exam attempt not found' },
                timestamp: new Date().toISOString()
            });
            return;
        }

        const attempt = attemptRes.rows[0];
        if (attempt.user_id !== userId) {
            await client.query('ROLLBACK');
            res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Access denied' },
                timestamp: new Date().toISOString()
            });
            return;
        }

        if (attempt.status !== 'active') {
            await client.query('ROLLBACK');
            res.status(409).json({
                success: false,
                error: { code: 'ATTEMPT_NOT_ACTIVE', message: 'Exam attempt is no longer active' },
                timestamp: new Date().toISOString()
            });
            return;
        }

        // 2. Load question snapshot
        const qRes = await client.query(
            'SELECT question_snapshot, marks FROM exam_attempt_questions WHERE id = $1 AND attempt_id = $2',
            [attemptQuestionId, attemptId]
        );

        if (qRes.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({
                success: false,
                error: { code: 'QUESTION_NOT_FOUND', message: 'Question not found in this attempt' },
                timestamp: new Date().toISOString()
            });
            return;
        }

        const rawSnapshot = qRes.rows[0].question_snapshot;
        const snapshot = typeof rawSnapshot === 'string' ? JSON.parse(rawSnapshot) : rawSnapshot;
        const steps = Array.isArray(snapshot?.content?.steps) ? snapshot.content.steps : [];
        const targetStep = steps.find((s: any) => s.id === stepId);

        if (!targetStep) {
            await client.query('ROLLBACK');
            res.status(400).json({
                success: false,
                error: { code: 'INVALID_STEP', message: `Step '${stepId}' not found in question` },
                timestamp: new Date().toISOString()
            });
            return;
        }

        const allowedOptions = Array.isArray(targetStep.options) ? targetStep.options.map((o: any) => o.id) : [];
        if (!allowedOptions.includes(selectedOptionId)) {
            await client.query('ROLLBACK');
            res.status(400).json({
                success: false,
                error: { code: 'INVALID_OPTION', message: `Option '${selectedOptionId}' is not valid for step '${stepId}'` },
                timestamp: new Date().toISOString()
            });
            return;
        }

        // 3. Fetch already committed step answers for this question to evaluate prerequisite conditional credits
        const existingStepsRes = await client.query(
            'SELECT step_id, selected_option_id FROM exam_step_answers WHERE attempt_question_id = $1',
            [attemptQuestionId]
        );
        const committedAnswers: Record<string, string> = {};
        for (const row of existingStepsRes.rows) {
            committedAnswers[row.step_id] = row.selected_option_id;
        }

        // 4. Calculate independent server-side grading
        const grading = gradeSingleStepCommitment(stepId, selectedOptionId, snapshot, committedAnswers);

        // 5. Atomic insert with ON CONFLICT DO NOTHING (First-Commit Immutability)
        const insertRes = await client.query(
            `INSERT INTO exam_step_answers (attempt_id, attempt_question_id, step_id, selected_option_id, is_correct, awarded_marks)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (attempt_question_id, step_id) DO NOTHING
             RETURNING *`,
            [attemptId, attemptQuestionId, stepId, selectedOptionId, grading.isCorrect, grading.awardedMarks]
        );

        if (insertRes.rows.length > 0) {
            await client.query('COMMIT');
            res.status(201).json({
                success: true,
                status: 'committed',
                data: {
                    stepId,
                    selectedOptionId,
                    isCorrect: grading.isCorrect,
                    awardedMarks: grading.awardedMarks,
                    stepMaxMarks: grading.stepMaxMarks,
                    canonicalOptionId: grading.canonicalOptionId,
                    matchedRuleId: grading.matchedRuleId
                },
                timestamp: new Date().toISOString()
            });
            return;
        }

        // 6. Conflict handling: Consistent read of the winning record
        const checkRes = await client.query(
            'SELECT selected_option_id, is_correct, awarded_marks FROM exam_step_answers WHERE attempt_question_id = $1 AND step_id = $2',
            [attemptQuestionId, stepId]
        );
        const existingRow = checkRes.rows[0];

        if (existingRow && existingRow.selected_option_id === selectedOptionId) {
            await client.query('COMMIT');
            res.status(200).json({
                success: true,
                status: 'already_committed',
                data: {
                    stepId,
                    selectedOptionId: existingRow.selected_option_id,
                    isCorrect: existingRow.is_correct,
                    awardedMarks: Number(existingRow.awarded_marks),
                    canonicalOptionId: grading.canonicalOptionId
                },
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Conflicting answer submitted for an already committed step
        await client.query('ROLLBACK');
        res.status(409).json({
            success: false,
            status: 'conflict',
            error: {
                code: 'STEP_ALREADY_COMMITTED',
                message: 'لا يمكن تعديل الخطوة؛ تم حفظ إجابة سابقة نهائياً ولا يجوز تغييرها.'
            },
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[exam/commit-step] error:', err);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
            timestamp: new Date().toISOString()
        });
    } finally {
        client.release();
    }
});

// --- Pattern 7: Retrieve committed steps for question ---
router.get('/attempts/:attemptId/questions/:attemptQuestionId/steps', async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { attemptId, attemptQuestionId } = req.params;

    try {
        const checkAttempt = await pool.query('SELECT user_id FROM exam_attempts WHERE id = $1', [attemptId]);
        if (checkAttempt.rows.length === 0 || checkAttempt.rows[0].user_id !== userId) {
            res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' }, timestamp: new Date().toISOString() });
            return;
        }

        const stepsRes = await pool.query(
            `SELECT step_id, selected_option_id, is_correct, awarded_marks, created_at
             FROM exam_step_answers
             WHERE attempt_id = $1 AND attempt_question_id = $2
             ORDER BY created_at ASC`,
            [attemptId, attemptQuestionId]
        );

        res.status(200).json({
            success: true,
            data: stepsRes.rows.map((r: any) => ({
                stepId: r.step_id,
                selectedOptionId: r.selected_option_id,
                isCorrect: r.is_correct,
                awardedMarks: Number(r.awarded_marks),
                createdAt: r.created_at
            })),
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('[exam/get-steps] error:', err);
        res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' }, timestamp: new Date().toISOString() });
    }
});

export default router;
