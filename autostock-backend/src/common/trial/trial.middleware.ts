import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { getTrialStatus } from './trial.util';

@Injectable()
export class TrialMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const path = req.path || req.url || '';
    if (path === '/health' || path === '/' || path.startsWith('/health?')) {
      next();
      return;
    }

    const trial = getTrialStatus();
    if (trial.enabled && trial.expired) {
      throw new ForbiddenException({
        message:
          'انتهت الفترة التجريبية. تواصل معنا لتفعيل النسخة الكاملة.',
        trialExpired: true,
        expiresAt: trial.expiresAt,
      });
    }

    next();
  }
}
