/**
 * Typed errors for core services.
 * All core errors extend Error with a discriminant `name` property.
 */

export class QuestNotFoundError extends Error {
  constructor(public readonly questId: string) {
    super(`QuestNotFoundError: quest not found: ${questId}`);
    this.name = 'QuestNotFoundError';
  }
}

export class QuestAlreadyCompletedError extends Error {
  constructor(public readonly questId: string) {
    super(`QuestAlreadyCompletedError: quest already completed: ${questId}`);
    this.name = 'QuestAlreadyCompletedError';
  }
}

export class CategoryNotFoundError extends Error {
  constructor(public readonly categoryId: string) {
    super(`CategoryNotFoundError: category not found: ${categoryId}`);
    this.name = 'CategoryNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
