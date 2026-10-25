import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';

/**
 * Owner may use the app like admin for day-to-day work, but cannot:
 * change settings, wipe data, restore backups, manage Telegram, or view activity log.
 */
const OWNER_BLOCKED_HANDLERS = new Set([
  'SettingsController.updateSettings',
  'AdminController.resetData',
  'BackupController.dryRun',
  'BackupController.restore',
  'BackupController.getSchedule',
  'BackupController.updateSchedule',
  'TelegramController.sendTest',
  'TelegramController.sendTestVoice',
  'ActivityLogController.findAll',
  'ActivityLogController.listUsers',
  'ActivityLogController.listEventTypes',
]);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (!user?.role) {
      return false;
    }

    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // Owner inherits admin routes except explicitly blocked dangerous ones.
    if (
      user.role === 'owner' &&
      requiredRoles.includes('admin') &&
      !OWNER_BLOCKED_HANDLERS.has(
        `${context.getClass().name}.${context.getHandler().name}`,
      )
    ) {
      return true;
    }

    return false;
  }
}
