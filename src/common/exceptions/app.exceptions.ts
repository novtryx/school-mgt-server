import {
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

export class ResourceNotFoundException extends NotFoundException {
  constructor(resource: string, identifier?: string | number) {
    super(
      `${resource}${identifier ? ` with identifier '${identifier}'` : ''} was not found`,
    );
  }
}

export class DuplicateResourceException extends ConflictException {
  constructor(resource: string, field: string) {
    super(`${resource} with this ${field} already exists`);
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Invalid email or password');
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor() {
    super('Access token has expired');
  }
}

export class InsufficientPermissionsException extends ForbiddenException {
  constructor(action?: string) {
    super(
      action
        ? `You do not have permission to ${action}`
        : 'You do not have permission to perform this action',
    );
  }
}

export class SchoolLimitExceededException extends HttpException {
  constructor(planName: string, limit: number) {
    super(
      `Your ${planName} plan supports a maximum of ${limit} students. Please upgrade your subscription.`,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}

export class ScoreValidationException extends BadRequestException {
  constructor(field: string, value: number, max: number) {
    super(
      `Score '${value}' for '${field}' exceeds the maximum allowed value of ${max}`,
    );
  }
}

export class InvalidPaymentAmountException extends BadRequestException {
  constructor() {
    super('Payment amount must be between 1% and 100% of the outstanding balance');
  }
}