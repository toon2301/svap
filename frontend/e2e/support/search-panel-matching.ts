import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { DIAGNOSTICS_LABEL, SEARCH_PATH, diagnosticValue, isPanelSearch } from './search-country-scroll';

export type OfferType = 'all' | 'offer' | 'seeking';
export type VisibleGroups = { skills: boolean; users: boolean };
export type PanelEvidence = {
  skills: number; users: number; allOffers: boolean; allSeeking: boolean;
  includesFixture: boolean; includesViewer: boolean;
};
type RecordData = Record<string, unknown>;
type DescriptionFixture = { query: string; id: number; type: 'offer' | 'seeking' };
const EMPTY_COPY = 'Pre zadané vyhľadávanie sa nenašli žiadne výsledky.';

/** Fetch only same-origin read-only resources; transport failures must not expose fixture URLs or payloads. */
async function readObject(page: Page, path: string): Promise<RecordData> {
  try {
    const response = await page.request.get(path);
    if (response.status() !== 200) throw new Error('read failed');
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid object');
    return data as RecordData;
  } catch {
    throw new Error('The existing Railway fixture could not be read successfully.');
  }
}

/** Require a real list of objects without allowing assertion reports to print private result objects. */
function records(value: unknown): RecordData[] {
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('The genuine search response contains an invalid collection.');
  }
  return value as RecordData[];
}

/** Keep accent-insensitive fixture comparisons consistent while excluding markup from human-readable words. */
function normalized(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Require a literal description token without smart-keyword or public-owner locality alternatives. */
export async function descriptionOnlyFixture(page: Page): Promise<DescriptionFixture> {
  const data = await readObject(page, '/api/auth/search/?q=te&page_size=50&country=SK');
  const cards = records(data.results);
  const tested = new Set<string>();
  let probes = 0;
  for (const card of cards) {
    if (card.country_code !== 'SK' || typeof card.id !== 'number' || typeof card.is_seeking !== 'boolean') continue;
    const excluded = normalized([card.category, card.subcategory, card.tags, card.location,
      card.district, card.district_label, card.user_display_name].flat().join(' '));
    for (const field of ['description', 'detailed_description'] as const) {
      const description = String(card[field] ?? '').replace(/<[^>]*>/g, ' ');
      const otherDescription = normalized(card[field === 'description' ? 'detailed_description' : 'description']);
      // Preserve terminal punctuation: a plain word may expand through SMART_KEYWORD_INDEX.
      // Commas are deliberately excluded because the dashboard splits them into separate terms.
      const words = [...new Set([...description.matchAll(/(?:^|[^\p{L}])(\p{L}{5,40}[.!?:;)])/gu)]
        .map((match) => match[1]))]
        .sort((left, right) => right.length - left.length);
      for (const query of words) {
        const token = normalized(query);
        if (excluded.includes(token) || otherDescription.includes(token) || tested.has(token)) continue;
        if (probes++ >= 12) throw new Error('No reusable description-only fixture was confirmed within the bounded read-only discovery.');
        tested.add(token);
        // Profile GETs can record visits. This read-only users search rules out every visible public
        // owner's name/location/district alternative without opening any profile or exporting identities.
        const userParams = new URLSearchParams({ q: query, include_offers: 'false', users_page_size: '50' });
        const userProof = await readObject(page, `/api/auth/search/global/?${userParams}`);
        if (userProof.users_count !== 0 || userProof.users_is_capped !== false || records(userProof.users).length !== 0) continue;
        const params = new URLSearchParams({ q: query, page_size: '50', country: 'SK' });
        const proof = await readObject(page, `/api/auth/search/?${params}`);
        if (!records(proof.results).some((item) => item.id === card.id)) continue;
        return { query, id: card.id, type: card.is_seeking ? 'seeking' : 'offer' };
      }
    }
  }
  throw new Error('Missing existing Slovak description-only fixture; reuse suitable content instead of skipping or creating cards.');
}

/** Use the existing authenticated username for a genuine user-only result without exporting its identity. */
export async function viewerQuery(page: Page): Promise<{ query: string; id: number }> {
  const viewer = await readObject(page, '/api/auth/me/');
  const query = typeof viewer.username === 'string' ? viewer.username.trim() : '';
  if (query.length < 2 || query.length > 100 || typeof viewer.id !== 'number') {
    throw new Error('The authenticated reusable account must provide a valid existing username fixture.');
  }
  return { query, id: viewer.id };
}

/** Apply real controls with an empty query so live filter updates cannot race an unrelated pending search. */
export async function configurePanel(
  page: Page, input: Locator, type: OfferType, groups: VisibleGroups,
): Promise<void> {
  await input.fill('');
  await page.getByRole('button', { name: 'Filter', exact: true }).filter({ visible: true }).click();
  for (const [label, checked] of [
    ['Zobraziť ponuky zručností', groups.skills], ['Zobraziť používateľov', groups.users],
  ] as const) {
    const checkbox = page.getByRole('checkbox', { name: label, exact: true });
    if (await checkbox.isChecked() !== checked) await checkbox.locator('xpath=ancestor::label[1]').click();
    await expect(checkbox).toBeChecked({ checked });
  }
  const name = type === 'all' ? 'Všetko' : type === 'offer' ? 'Ponúkam' : 'Hľadám';
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Použiť filtre', exact: true }).click();
}

/** Reduce a genuine completed HTTP response immediately to counts and booleans, never report result identities. */
async function evidence(response: Response, fixtureId?: number, viewerId?: number): Promise<PanelEvidence> {
  const status = response.status();
  const fromServiceWorker = response.fromServiceWorker();
  const completed = await response.finished().then((failure) => failure === null, () => false);
  if (status !== 200 || fromServiceWorker || !completed) {
    throw new Error(`The panel requires a successful completed genuine server response: HTTP ${status}, fromServiceWorker=${fromServiceWorker}, completed=${completed}.`);
  }
  let data: RecordData;
  try { data = await response.json() as RecordData; }
  catch { throw new Error('The genuine panel response could not be decoded.'); }
  const skills = records(data?.skills);
  const users = records(data?.users);
  return {
    skills: skills.length, users: users.length,
    allOffers: skills.every((card) => card.is_seeking === false),
    allSeeking: skills.every((card) => card.is_seeking === true),
    includesFixture: fixtureId !== undefined && skills.some((card) => card.id === fixtureId),
    includesViewer: viewerId !== undefined && users.some((person) => person.id === viewerId),
  };
}

/** Submit through the real public input and wait for matching server completion, not an old cached preview. */
export async function searchPanelEvidence(
  page: Page, input: Locator, query: string, type: OfferType, fixtureId?: number, viewerId?: number,
): Promise<PanelEvidence> {
  const pending = page.waitForResponse((response) => isPanelSearch(response.request(), query)
    && new URL(response.url()).searchParams.get('offer_type') === (type === 'all' ? '' : type))
    .then((response) => response, () => null);
  try { await input.fill(query); await input.press('Enter'); }
  catch { throw new Error('The real search input could not submit the reusable fixture query.'); }
  const response = await pending;
  if (!response) throw new Error('No matching genuine panel search response arrived.');
  expect(new URL(response.url()).pathname === SEARCH_PATH).toBe(true);
  expect(new URL(response.url()).searchParams.get('country')).toBe('SK');
  const result = await evidence(response, fixtureId, viewerId);
  const diagnostics = page.getByRole('region', { name: DIAGNOSTICS_LABEL, exact: true });
  await expect(diagnosticValue(diagnostics, 'Zdroj výsledku')).toHaveText('Sieť');
  await expect(diagnosticValue(diagnostics, 'HTTP stav')).toHaveText('200');
  await expect(diagnosticValue(diagnostics, 'Počet vrátených kariet')).toHaveText(String(result.skills));
  await expect(diagnosticValue(diagnostics, 'Počet vrátených používateľov')).toHaveText(String(result.users));
  await expect(input.locator('xpath=ancestor::aside[1]').locator('[aria-busy]')).toHaveAttribute('aria-busy', 'false');
  return result;
}

/** Compare what the selected groups actually render against only the corresponding real server collections. */
export async function expectPanelParity(input: Locator, result: PanelEvidence, groups: VisibleGroups): Promise<void> {
  const panel = input.locator('xpath=ancestor::aside[1]');
  const active = panel.locator('[aria-busy]');
  const cards = groups.skills ? result.skills : 0;
  const users = groups.users ? result.users : 0;
  await expect(active.locator('span').filter({ hasText: /^(?:PONÚKAM|HĽADÁM)$/ })).toHaveCount(cards);
  await expect(active.locator('button:has(> span.relative.flex-shrink-0)')).toHaveCount(users);
  await expect(active.getByRole('button', { name: 'Zobraziť všetko', exact: true })).toHaveCount(cards + users > 0 ? 1 : 0);
  await expect(active.getByText(EMPTY_COPY, { exact: true })).toHaveCount(cards + users > 0 ? 0 : 1);
  await expect(active.getByRole('status')).toHaveCount(0);
}
