export const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;

const FITNESS_COMPANY_ID = 'f54ebd25-21cc-43e8-888f-ffbbed1d4b7f';

export function inactivityTimeoutFor(user: { role: string; companyId: string | null }): number | null {
  if (user.role === 'fitness' || user.companyId === FITNESS_COMPANY_ID) return null;
  return INACTIVITY_TIMEOUT_MS;
}