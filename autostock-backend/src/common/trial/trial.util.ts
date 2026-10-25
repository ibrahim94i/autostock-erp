export interface TrialStatus {
  enabled: boolean;
  expired: boolean;
  expiresAt: string | null;
  remainingMs: number | null;
}

export function getTrialStatus(now = new Date()): TrialStatus {
  const enabled =
    process.env.TRIAL_MODE === 'true' || process.env.TRIAL_MODE === '1';

  if (!enabled) {
    return {
      enabled: false,
      expired: false,
      expiresAt: null,
      remainingMs: null,
    };
  }

  const raw = process.env.TRIAL_EXPIRES_AT?.trim() || null;
  if (!raw) {
    // Trial mode on but no expiry → treat as active (ops must set the date).
    return {
      enabled: true,
      expired: false,
      expiresAt: null,
      remainingMs: null,
    };
  }

  const expiresAt = new Date(raw);
  if (Number.isNaN(expiresAt.getTime())) {
    return {
      enabled: true,
      expired: true,
      expiresAt: raw,
      remainingMs: 0,
    };
  }

  const remainingMs = expiresAt.getTime() - now.getTime();
  return {
    enabled: true,
    expired: remainingMs <= 0,
    expiresAt: expiresAt.toISOString(),
    remainingMs: Math.max(0, remainingMs),
  };
}
