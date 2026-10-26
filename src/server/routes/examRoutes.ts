import { Router, Response } from 'express';
import { startExam, finishExam, getExamResult } from '../lib/attemptManager';
import { getActiveAttempt } from '../lib/recovery';
import { validateStartExamPayload, validateFinishExamPayload } from '../../shared/validation/apiSchemas';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

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
        const attemptId = req.params.attemptId;

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

export default router;
