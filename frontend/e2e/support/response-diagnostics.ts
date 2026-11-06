import { captureWithin } from './evidence-deadline';
import { parseAppDuration, safeCookieNames, type ResponseDetails } from './response-diagnostics-format';

type SelectedHeaderSource = { headerValue(name: string): Promise<string | null> };
type CookieNameSource = { cookies(): Promise<ReadonlyArray<{ name: string }>> };
const READ_BUDGET_MS = 1000;

/**
 * Pasívne odčíta jedinú hlavičku odpovede a pri odmietnutej obnove aj názvy
 * cookies a prítomnosť CSRF. Operácie sa začnú súbežne pri pozorovaní odpovede,
 * nie až pri páde testu. Telá, ostatné hlavičky a hodnoty cookies sa nečítajú.
 */
export async function readResponseDetails(
  response: SelectedHeaderSource,
  request: SelectedHeaderSource,
  context: CookieNameSource,
  deniedRefresh: boolean,
): Promise<ResponseDetails> {
  const duration = captureWithin(async () => parseAppDuration(await response.headerValue('x-app-duration-ms')), READ_BUDGET_MS);
  // Projekcia prečíta iba name; kompletné cookie objekty sa neukladajú do dôkazov.
  const names = deniedRefresh ? captureWithin(async () =>
    safeCookieNames((await context.cookies()).map(cookie => cookie.name)), READ_BUDGET_MS) : null;
  const csrf = deniedRefresh ? captureWithin(async () => {
    const value = await request.headerValue('x-csrftoken');
    return value === null ? false : typeof value === 'string' ? true : null;
  }, READ_BUDGET_MS) : null;
  const [appDurationMs, cookieNames, csrfHeaderPresent] = await Promise.all([duration, names, csrf]);
  return {
    appDurationMs: appDurationMs ?? 'nezistiteľné',
    ...(deniedRefresh ? { refreshAuth: { cookieNames, csrfHeaderPresent } } : {}),
  };
}
