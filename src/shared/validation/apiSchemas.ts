import { ajv, ValidationResult } from './schemas';

const startExamSchema = {
  type: 'object',
  required: ['subjectId', 'bankType', 'examMode'],
  properties: {
    subjectId: { type: 'string', minLength: 1 },
    bankType: { type: 'string', enum: ['comprehensive', 'training'] },
    examMode: { type: 'string', enum: ['training', 'simulator'] },
    trainingSetId: { type: 'string' }
  },
  additionalProperties: false
};

const finishExamSchema = {
  type: 'object',
  required: ['attemptId', 'answers', 'timeTakenSeconds'],
  properties: {
    attemptId: { type: 'string', minLength: 1 },
    answers: { type: 'object' },
    timeTakenSeconds: { type: 'number' }
  },
  additionalProperties: false
};

const validateStartExam = ajv.compile(startExamSchema);
const validateFinishExam = ajv.compile(finishExamSchema);

export function validateStartExamPayload(payload: unknown): ValidationResult {
  const valid = validateStartExam(payload);
  if (!valid) {
    return { valid: false, errors: validateStartExam.errors || [] };
  }
  return { valid: true, errors: [] };
}

export function validateFinishExamPayload(payload: unknown): ValidationResult {
  const valid = validateFinishExam(payload);
  if (!valid) {
    return { valid: false, errors: validateFinishExam.errors || [] };
  }
  return { valid: true, errors: [] };
}

const registerSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', minLength: 3 },
    password: { type: 'string', minLength: 8 },
    fullName: { type: 'string' },
    phone: { type: 'string' },
  },
  additionalProperties: false,
};

const loginSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', minLength: 3 },
    password: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
};

const refreshSchema = {
  type: 'object',
  required: ['refreshToken'],
  properties: {
    refreshToken: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
};

const changePasswordSchema = {
  type: 'object',
  required: ['currentPassword', 'newPassword'],
  properties: {
    currentPassword: { type: 'string', minLength: 1 },
    newPassword: { type: 'string', minLength: 8 },
    operationId: { type: 'string', minLength: 1 },
    recoverySecret: { type: 'string', minLength: 16 },
  },
  additionalProperties: false,
};

const recoverPasswordChangeSchema = {
  type: 'object',
  required: ['userId', 'operationId', 'recoverySecret'],
  properties: {
    userId: { type: 'string', minLength: 1 },
    operationId: { type: 'string', minLength: 1 },
    recoverySecret: { type: 'string', minLength: 16 },
  },
  additionalProperties: false,
};

const validateRegister = ajv.compile(registerSchema);
const validateLogin = ajv.compile(loginSchema);
const validateRefresh = ajv.compile(refreshSchema);
const validateChangePassword = ajv.compile(changePasswordSchema);
const validateRecoverPasswordChange = ajv.compile(recoverPasswordChangeSchema);

export function validateRegisterPayload(payload: unknown): ValidationResult {
  const valid = validateRegister(payload);
  if (!valid) {
    return { valid: false, errors: validateRegister.errors || [] };
  }
  return { valid: true, errors: [] };
}

export function validateLoginPayload(payload: unknown): ValidationResult {
  const valid = validateLogin(payload);
  if (!valid) {
    return { valid: false, errors: validateLogin.errors || [] };
  }
  return { valid: true, errors: [] };
}

export function validateRefreshPayload(payload: unknown): ValidationResult {
  const valid = validateRefresh(payload);
  if (!valid) {
    return { valid: false, errors: validateRefresh.errors || [] };
  }
  return { valid: true, errors: [] };
}

export function validateChangePasswordPayload(payload: unknown): ValidationResult {
  const valid = validateChangePassword(payload);
  if (!valid) {
    return { valid: false, errors: validateChangePassword.errors || [] };
  }
  return { valid: true, errors: [] };
}

export function validateRecoverPasswordChangePayload(payload: unknown): ValidationResult {
  const valid = validateRecoverPasswordChange(payload);
  if (!valid) {
    return { valid: false, errors: validateRecoverPasswordChange.errors || [] };
  }
  return { valid: true, errors: [] };
}
