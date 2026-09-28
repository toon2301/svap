import { randomUUID } from 'crypto';
import type { Page, Response } from '@playwright/test';

// Spoločné pomôcky pre E2E testy Nástenky: príprava a upratanie príspevkov
// cez API a záznamy (URL, zvýraznenie), ktoré nesmú závisieť od času.

/** Adresa Nástenky: DASHBOARD_HOME_PATH ('/dashboard'), priamo aj '/dashboard/home'. */
export const FEED_HOME_PATHS = new Set(['/dashboard', '/dashboard/', '/dashboard/home']);

/**
 * Značka jedného behu testu – ide do textu vytvorených príspevkov, aby ich
 * `cleanupFeedPosts` našiel a zmazal len tie svoje.
 *
 * Názov projektu je tu pre čitateľnosť pri ladení; unikátnosť zaručuje UUID.
 * Kedysi to bol čas (`Date.now()`) – dva behy toho istého projektu v tej istej
 * milisekunde (súbežné sady, opakovanie) mali rovnakú značku.
 */
export function uniqueRunMarker(projectName: string): string {
  return `${projectName} ${randomUUID()}`;
}

const FEED_POSTS_API = '/api/auth/feed/posts/';

type WindowWithRecords = Window & {
  __e2eHighlightSeen?: string[];
  __e2eUrlLog?: string[];
};

/**
 * Volanie API v kontexte stránky – s cookies session a CSRF hlavičkou, rovnako
 * ako to robí appka. Stránka musí byť načítaná na doméne appky.
 */
async function callApi(page: Page, method: string, url: string, body?: unknown) {
  return page.evaluate(
    async ({ method, url, body }) => {
      const csrf = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)?.[1] ?? '';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': decodeURIComponent(csrf) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      let data: unknown = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }
      return { status: res.status, data };
    },
    { method, url, body },
  );
}

/** Príprava: vlastný obyčajný príspevok. Vracia jeho ID. */
export async function createFreePost(page: Page, caption: string): Promise<number> {
  const { status, data } = await callApi(page, 'POST', FEED_POSTS_API, {
    post_type: 'free_post',
    caption,
    tagged_user_ids: [],
    will_attach_photo: false,
  });
  const id = (data as { id?: unknown } | null)?.id;
  if (status !== 201 || typeof id !== 'number') {
    throw new Error(`Príprava zlyhala: vytvorenie príspevku vrátilo HTTP ${status}.`);
  }
  return id;
}

/** Upratanie: zmaže príspevok (smie len autor). Vracia HTTP status, 204 = OK. */
export async function deleteFeedPost(page: Page, postId: number): Promise<number> {
  const { status } = await callApi(page, 'DELETE', `${FEED_POSTS_API}${postId}/`);
  return status;
}

/**
 * Prečíta príspevok z odpovede na vytvorenie a jeho ID HNEĎ zaradí na
 * upratanie – skôr, než test čokoľvek tvrdí o obsahu odpovede (status, typ).
 * Inak by zlyhané tvrdenie nechalo príspevok v produkcii. Novší ide na
 * začiatok, aby sa repost mazal pred svojím zdrojom.
 */
export async function takeCreatedPost(
  response: Response,
  cleanupIds: number[],
): Promise<{ id?: unknown; post_type?: unknown }> {
  const created = (await response.json().catch(() => null)) as { id?: unknown; post_type?: unknown } | null;
  if (typeof created?.id === 'number') cleanupIds.unshift(created.id);
  return created ?? {};
}

/**
 * Upratanie po teste: zmaže zaregistrované príspevky a ako poistku aj vlastné
 * príspevky, ktorých text nesie `[e2e]` a značku testu, no ID sa zaregistrovať
 * nestihlo. Chyby nevyhadzuje (nesmú prekryť pôvodné zlyhanie testu) –
 * vracia výsledok každého mazania; status 0 = upratanie sa nedokončilo.
 */
export async function cleanupFeedPosts(
  page: Page,
  cleanupIds: number[],
  marker: string,
): Promise<{ id: number | null; status: number }[]> {
  const results: { id: number | null; status: number }[] = [];
  // Stránka appky sa ani nenačítala → nič sa nemohlo vytvoriť.
  if (!/^https?:/.test(page.url())) return results;
  try {
    for (const id of cleanupIds) results.push({ id, status: await deleteFeedPost(page, id) });
    const { data } = await callApi(page, 'GET', FEED_POSTS_API);
    const posts = (Array.isArray(data) ? data : (data as { results?: unknown[] } | null)?.results ?? []) as {
      id?: unknown;
      caption?: unknown;
    }[];
    for (const post of posts) {
      const caption = String(post?.caption ?? '');
      if (typeof post?.id !== 'number' || cleanupIds.includes(post.id)) continue;
      if (!caption.includes('[e2e]') || !caption.includes(marker)) continue;
      results.push({ id: post.id, status: await deleteFeedPost(page, post.id) });
    }
  } catch {
    results.push({ id: null, status: 0 });
  }
  return results;
}

/**
 * Zvýraznenie pristátej karty kedysi robil wrapper s triedami
 * 'rounded-2xl ring-2 ring-purple-400 ring-offset-2 ring-offset-white …'
 * (odstránené v 440386cb) a držalo sa len 2,5 s. Jednorazová kontrola by ho
 * mohla minúť, preto MutationObserver zaznamená KAŽDÝ výskyt takej triedy
 * na pristátej karte (wrapper vo FeedList + jej <article>) – bez čakania na čas.
 */
export async function recordLandedPostHighlight(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as WindowWithRecords).__e2eHighlightSeen = seen;
    const inspect = () => {
      const landed = document.querySelector('[data-testid="feed-landed-post"]');
      if (!landed) return;
      for (const element of [landed, landed.querySelector('[data-testid="feed-post-card"]')]) {
        const hits = element ? [...element.classList].filter((c) => /^ring-|purple/.test(c)) : [];
        if (hits.length) seen.push(hits.join(' '));
      }
    };
    new MutationObserver(inspect).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'data-testid'],
    });
  });
}

/** Zaznamenané triedy zvýraznenia; `undefined` = stránka sa medzitým znovu načítala. */
export async function readLandedPostHighlight(page: Page): Promise<string[] | undefined> {
  return page.evaluate(() => (window as WindowWithRecords).__e2eHighlightSeen);
}

/**
 * Zaznamená KAŽDÚ adresu, ktorou stránka prejde – aj tú, ktorá trvá len
 * okamih (pushState na detail a hneď replaceState späť). Dashboard mení adresu
 * cez history API, takže stačí obaliť pushState/replaceState a počúvať
 * popstate/hashchange. Doplnkom je `framenavigated` v teste.
 */
export async function recordUrlLog(page: Page): Promise<void> {
  await page.evaluate(() => {
    const log = [location.href];
    (window as WindowWithRecords).__e2eUrlLog = log;
    const record = () => {
      if (log[log.length - 1] !== location.href) log.push(location.href);
    };
    for (const method of ['pushState', 'replaceState'] as const) {
      const original = history[method];
      history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
        const result = original.apply(this, args);
        record();
        return result;
      };
    }
    addEventListener('popstate', record);
    addEventListener('hashchange', record);
  });
}

/** Zaznamenané adresy; `undefined` = stránka sa medzitým znovu načítala. */
export async function readUrlLog(page: Page): Promise<string[] | undefined> {
  return page.evaluate(() => (window as WindowWithRecords).__e2eUrlLog);
}
