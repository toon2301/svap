# Podklady k mapovaniu K46 (agent)

Podklady agenta k `K46_agent.md` a `K46_porovnanie.md`, 21. 11. 2026, `main` `8c49c5b7`: sonda (odtlačok HTML a poradie efektov), ukážky testov overené v kópii a zoznam mutácií s výsledkami. Všetko beží **len v kópii `frontend` mimo repozitára** (`npm ci`); nič z toho nie je v repozitári. Kód sondy a mutácií je tu ako východisko pre dávky K48 a K49 (testy píše kolega a popisy píše po slovensky, R62); kolega má vlastnú sondu (27 stavov) a vlastný zoznam mutácií (karta 121, mobilný detail 55): oba zoznamy sa dopĺňajú, nenahrádzajú.

## 1. Sonda: odtlačok HTML a poradie registrácie efektov

Jeden súbor testov (37 stavov `FeedPostCard`): pre každý stav vykreslí kartu, vykoná akciu (klik) a zapíše do JSON (`PROBE_OUT`) `document.body.innerHTML` (identifikátory `useId` sa normalizujú) a zoznam volaní `useEffect` a `useLayoutEffect` pri prvom pripojení (druh, počet závislostí, text callbacku bez bielych znakov). Pred a po každom kroku delenia sa výstup porovná skriptom v časti 1.2. Dva behy na tom istom kóde dali bajt po bajte rovnaký výstup. V repozitári by sa to robilo ako dočasný odtlačok (R45: `toMatchSnapshot()` namiesto zápisu do súboru) a pre poradie efektov stačí `druh:počet závislostí:prvých 40 znakov callbacku` (prvých 30 až 60 znakov dalo na prototype rovnaké poradie aj po premenovaní `post.id` → `postId`, a zároveň zachytí zmenu aj poradia).

Stavy: karta vo feede (`card-text`, `card-photo1`, `card-photo3`, `card-offer`, `card-portfolio`, `card-repost-text`, `card-repost-photo`, `card-own-reshare`, `card-own-offer-share`, `card-offer-unavailable`, `card-tags`, `card-manage-edited-liked`, `card-image-rejected`, `card-overlay-photo`, `card-comments-open`), okno (`detail-photo-fill`, `detail-offer-fill`, `detail-repost-tags-fill`, `detail-text`, `detail-text-fill`), mobil (`mobile-card-photo`, `mobile-card-text`), otvorené vrstvy (`menu-manager`, `menu-other`, `likers-open`, `delete-confirm`, `tag-remove-confirm`, `report-open`, `share-open`, `edit-open`, `mobile-detail-open`, `mobile-photo-viewer`, `shared-photo-open`, `comments-click-overlay`) a mobilný detail (`mobile-detail-offer`, `mobile-detail-manager-menu`, `mobile-detail-repost-photo-likers`). Nezahŕňa `liveImages`, `commentsCount` (override), `highlightCommentId` a pending fotky s pollingom.

### 1.1 Zdroj sondy (`zzProbe.test.tsx`, len v kópii)

```tsx
/**
 * SONDA (len v kópii mimo repozitára): odtlačok HTML stavov `FeedPostCard` a poradie registrácie efektov.
 * Výstup sa zapíše do súboru z premennej prostredia PROBE_OUT (JSON), aby sa dal porovnať pred a po delení.
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import fs from 'fs';
import crypto from 'crypto';
import FeedPostCard from '../FeedPostCard';
import { FeedPostOverlayProvider } from '../../../contexts/FeedPostOverlayContext';
import type { FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn().mockResolvedValue({ results: [], next: null, previous: null, count: 0 }),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  deleteFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  updateFeedPost: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn().mockResolvedValue({ results: [], count: 0, hidden: false }),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback: string) => fallback, locale: 'sk' }),
}));

let mobile = false;
jest.mock('@/hooks', () => ({
  useIsMobile: () => mobile,
  useIsMobileState: () => ({ isMobile: mobile, isResolved: true }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({ resolvedSrc: src, isProtected: false, isLoading: false, isError: false }),
}));
jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>emoji</button>
  ),
}));
jest.mock('../../messages/GroupUserPicker', () => ({ GroupUserPicker: () => <div /> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => <article {...props}>{children}</article>,
  },
}));

const author = { id: 10, display_name: 'Jana Nováková', slug: 'jana', user_type: 'individual', avatar_url: null };
const other = { id: 20, display_name: 'Peter Kováč', slug: 'peter', user_type: 'individual', avatar_url: null };

const img = (id: number, status: 'approved' | 'pending' | 'rejected' = 'approved') => ({
  id,
  status,
  thumbnail_url: `http://api.test/${id}-t.webp`,
  large_url: `http://api.test/${id}-l.webp`,
  width: 800,
  height: 600,
});

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Text príspevku, ktorý je dosť dlhý na to, aby sa dal čítať.',
    author,
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 3,
    comments_count: 2,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

const sharedOffer = {
  type: 'offer' as const,
  title: 'Doučovanie matematiky',
  category: 'vzdelavanie',
  caption: '',
  id: 5,
  owner: other,
  owner_display_name: 'Peter Kováč',
  thumbnail_url: 'http://api.test/offer-t.webp',
  is_seeking: false,
  price_negotiable: false,
  price_from: '15',
  price_currency: 'EUR',
};
const sharedPortfolio = { ...sharedOffer, type: 'portfolio_item' as const, title: 'Moje portfólio', thumbnail_url: null, id: 6 };
const sharedPost = (photo: boolean, ownerIsAuthor = false) => ({
  ...sharedOffer,
  type: 'feed_post' as const,
  title: '',
  category: '',
  caption: 'Pôvodný text zdieľaného príspevku.',
  id: 77,
  owner: ownerIsAuthor ? author : other,
  owner_display_name: ownerIsAuthor ? 'Jana Nováková' : 'Peter Kováč',
  thumbnail_url: photo ? 'http://api.test/orig-t.webp' : null,
  is_seeking: null,
  price_negotiable: null,
  price_from: null,
});

type Cfg = {
  name: string;
  post?: Partial<FeedPost>;
  props?: Record<string, unknown>;
  mobile?: boolean;
  overlay?: boolean;
  act?: (user: ReturnType<typeof userEvent.setup>) => Promise<void>;
};

const click = (testId: string) => async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(await screen.findByTestId(testId));
};
const clicks = (...ids: string[]) => async (user: ReturnType<typeof userEvent.setup>) => {
  for (const id of ids) await user.click(await screen.findByTestId(id));
};

const CONFIGS: Cfg[] = [
  { name: 'card-text' },
  { name: 'card-photo1', post: { images: [img(11)] } },
  { name: 'card-photo3', post: { images: [img(11), img(12), img(13)] } },
  { name: 'card-offer', post: { post_type: 'shared_offer', caption: 'Odporúčam', shared_content: sharedOffer } },
  { name: 'card-portfolio', post: { post_type: 'shared_portfolio_item', caption: '', shared_content: sharedPortfolio } },
  { name: 'card-repost-text', post: { post_type: 'shared_feed_post', caption: 'Tu je môj komentár', shared_content: sharedPost(false) } },
  { name: 'card-repost-photo', post: { post_type: 'shared_feed_post', caption: 'Pozrite', shared_content: sharedPost(true) } },
  { name: 'card-own-reshare', post: { post_type: 'shared_feed_post', caption: 'Znovu', shared_content: sharedPost(false, true) } },
  { name: 'card-own-offer-share', post: { post_type: 'shared_offer', caption: '', shared_content: { ...sharedOffer, owner: author } } },
  { name: 'card-offer-unavailable', post: { post_type: 'shared_offer', caption: '', shared_content: { ...sharedOffer, id: null }, shared_content_unavailable: true } },
  {
    name: 'card-tags',
    post: {
      images: [img(11)],
      tagged_users: [
        { ...other, can_remove_tag: false },
        { ...author, id: 30, display_name: 'Ja Sám', can_remove_tag: true },
      ],
    },
  },
  { name: 'card-manage-edited-liked', post: { can_manage: true, is_edited: true, is_liked_by_me: true, likes_count: 0 } },
  { name: 'card-image-rejected', post: { images: [img(11), img(12, 'rejected')] } },
  { name: 'card-overlay-photo', post: { images: [img(11)] }, overlay: true },
  { name: 'card-comments-open', props: { initialCommentsOpen: true } },
  { name: 'detail-photo-fill', post: { images: [img(11)] }, props: { variant: 'detail', fillHeight: true }, overlay: true },
  {
    name: 'detail-offer-fill',
    post: { post_type: 'shared_offer', caption: 'Moja ponuka', shared_content: sharedOffer },
    props: { variant: 'detail', fillHeight: true },
    overlay: true,
  },
  {
    name: 'detail-repost-tags-fill',
    post: {
      post_type: 'shared_feed_post',
      caption: 'Komentár',
      shared_content: sharedPost(true),
      tagged_users: [{ ...other, can_remove_tag: true }],
    },
    props: { variant: 'detail', fillHeight: true },
    overlay: true,
  },
  { name: 'detail-text', props: { variant: 'detail' }, overlay: true, post: { caption: 'x'.repeat(900) } },
  { name: 'detail-text-fill', props: { variant: 'detail', fillHeight: true }, overlay: true },
  { name: 'mobile-card-photo', post: { images: [img(11)] }, mobile: true },
  { name: 'mobile-card-text', mobile: true },
  { name: 'menu-manager', post: { can_manage: true }, act: click('feed-post-menu-trigger') },
  { name: 'menu-other', act: click('feed-post-menu-trigger') },
  { name: 'likers-open', act: click('feed-like-count') },
  { name: 'delete-confirm', post: { can_manage: true }, act: clicks('feed-post-menu-trigger', 'feed-post-delete') },
  {
    name: 'tag-remove-confirm',
    post: { tagged_users: [{ ...other, can_remove_tag: true }] },
    act: click('feed-post-tag-remove'),
  },
  { name: 'report-open', act: async (user) => {
      await user.click(await screen.findByTestId('feed-post-menu-trigger'));
      await user.click(await screen.findByRole('menuitem', { name: /Nahlásiť príspevok/ }));
    } },
  { name: 'share-open', act: click('feed-share-button') },
  { name: 'edit-open', post: { can_manage: true }, act: clicks('feed-post-menu-trigger', 'feed-post-edit') },
  { name: 'mobile-detail-open', post: { images: [img(11)] }, mobile: true, act: click('feed-comments-button') },
  { name: 'mobile-photo-viewer', post: { images: [img(11)] }, mobile: true, act: click('feed-image-open-11') },
  {
    name: 'shared-photo-open',
    post: { post_type: 'shared_feed_post', caption: 'Pozrite', shared_content: sharedPost(true) },
    act: async (user) => {
      const photo = document.querySelector('[data-testid="shared-content-photo"], [data-testid="shared-content-post-photo"]');
      if (photo) await user.click(photo as Element);
    },
  },
  { name: 'comments-click-overlay', post: { images: [img(11)] }, overlay: true, act: click('feed-comments-button') },
  {
    name: 'mobile-detail-offer',
    post: { post_type: 'shared_offer', caption: 'Odporúčam túto ponuku', shared_content: sharedOffer, is_liked_by_me: true },
    mobile: true,
    act: click('feed-comments-button'),
  },
  {
    name: 'mobile-detail-manager-menu',
    post: { can_manage: true, caption: 'Môj text', images: [img(11), img(12)] },
    mobile: true,
    act: async (user) => {
      await user.click(await screen.findByTestId('feed-comments-button'));
      await user.click(await screen.findByTestId('feed-mobile-detail-menu-trigger'));
    },
  },
  {
    name: 'mobile-detail-repost-photo-likers',
    post: { post_type: 'shared_feed_post', caption: 'Pozrite', shared_content: sharedPost(true) },
    mobile: true,
    act: async (user) => {
      await user.click(await screen.findByTestId('feed-comments-button'));
      await user.click(await screen.findByTestId('feed-mobile-detail-like-count'));
    },
  },
];

const out: Record<string, { html: string; effects: string[]; error?: string }> = {};

function normalize(html: string): string {
  return html
    .replace(/«[a-z0-9]+»/g, '«id»')
    .replace(/:r[0-9a-z]+:/g, ':id:')
    .replace(/_r_[0-9a-z]+_/g, '_id_');
}

describe('sonda FeedPostCard', () => {
  beforeEach(() => {
    mobile = false;
  });

  afterAll(() => {
    const path = process.env.PROBE_OUT;
    if (path) fs.writeFileSync(path, JSON.stringify(out, null, 1));
  });

  it.each(CONFIGS.map((c) => [c.name, c] as const))('%s', async (_name, cfg) => {
    mobile = cfg.mobile === true;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactModule = require('react');
    const effects: string[] = [];
    const record = (kind: string) => (fn: unknown, deps?: unknown[]) => {
      const src = String(fn).replace(/\s+/g, ' ');
      const h = crypto.createHash('sha1').update(src).digest('hex').slice(0, 10);
      void h;
      effects.push(`${kind}:${deps ? deps.length : 'none'}:${src}`);
    };
    const origEffect = ReactModule.useEffect;
    const origLayout = ReactModule.useLayoutEffect;
    ReactModule.useEffect = function (fn: never, deps?: never) {
      record('E')(fn, deps);
      return origEffect(fn, deps);
    };
    ReactModule.useLayoutEffect = function (fn: never, deps?: never) {
      record('L')(fn, deps);
      return origLayout(fn, deps);
    };
    try {
      const post = makePost(cfg.post);
      const props = (cfg.props ?? {}) as Record<string, unknown>;
      const tree = cfg.overlay ? (
        <FeedPostOverlayProvider onTargetChange={jest.fn()}>
          <FeedPostCard post={post} {...props} />
        </FeedPostOverlayProvider>
      ) : (
        <FeedPostCard post={post} {...props} />
      );
      const view = render(tree);
      // Efekty z prvého pripojenia (potom sa spätné volanie vráti na pôvodné).
      const mountEffects = effects.slice();
      ReactModule.useEffect = origEffect;
      ReactModule.useLayoutEffect = origLayout;
      await act(async () => {
        await Promise.resolve();
      });
      if (cfg.act) {
        const user = userEvent.setup();
        await cfg.act(user);
        await act(async () => {
          await new Promise((r) => setTimeout(r, 30));
        });
      }
      out[cfg.name] = { html: normalize(document.body.innerHTML), effects: mountEffects };
      view.unmount();
    } catch (error) {
      out[cfg.name] = { html: '', effects: [], error: String((error as Error).message).slice(0, 300) };
    } finally {
      ReactModule.useEffect = origEffect;
      ReactModule.useLayoutEffect = origLayout;
    }
    expect(true).toBe(true);
    void waitFor;
  });
});
```

### 1.2 Porovnanie (`compare.py`)

Parametre `post.id=postId` povedia, že premenovanie pri presune do hooku sa nepočíta ako rozdiel.

```python
# -*- coding: utf-8 -*-
import json, sys
import os
if not os.path.exists(sys.argv[2]):
    print('SONDA NEBEŽALA (chýba výstup) – porovnanie nie je platné'); sys.exit(1)
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2]))
ren = [r.split('=') for r in sys.argv[3:]]
def nz(lst):
    out = []
    for e in lst:
        for x, y in ren:
            e = e.replace(x, y)
        out.append(e)
    return out
for d in (a, b):
    for v in d.values():
        v['effects'] = nz(v['effects'])
bad = 0
for k in a:
    if k not in b:
        print('CHÝBA stav', k); bad += 1; continue
    if a[k].get('error') or b[k].get('error'):
        print('CHYBA v stave', k, a[k].get('error'), b[k].get('error')); bad += 1; continue
    if a[k]['html'] != b[k]['html']:
        x, y = a[k]['html'], b[k]['html']
        i = next((i for i in range(min(len(x), len(y))) if x[i] != y[i]), min(len(x), len(y)))
        print('HTML sa líši:', k, 'pozícia', i, 'pred:', repr(x[max(0, i-50):i+70]), '| po:', repr(y[max(0, i-50):i+70])); bad += 1
    if a[k]['effects'] != b[k]['effects']:
        ea, eb = a[k]['effects'], b[k]['effects']
        j = next((j for j in range(min(len(ea), len(eb))) if ea[j] != eb[j]), min(len(ea), len(eb)))
        print('EFEKTY sa líšia:', k, 'počet', len(ea), '->', len(eb), 'prvý rozdiel #', j, ea[j:j+1], '->', eb[j:j+1]); bad += 1
print('stavov', len(a), 'rozdielnych', bad)
sys.exit(1 if bad else 0)
```

## 2. Ukážky testov overené v kópii

### 2.1 Fokus a prepínanie menu (prechádza na dnešnom kóde aj na prototype delenia)

Zachytí mutácie H1 (fokus sa po zatvorení z klávesnice nevráti na spúšťač), H4 (spúšťač len otvára) a H22 (`aria-expanded` vždy `false`). Hlavička a pomocné funkcie (`makePost`, mocky) sú rovnaké ako vo `FeedPostEdit.test.tsx`.

```tsx
describe('sonda: fokus a menu', () => {
  it('po zatvorení menu sa fokus vráti na spúšťač', async () => {
    render(<FeedPostCard post={makePost()} />);
    const trigger = screen.getByTestId('feed-post-menu-trigger');
    await userEvent.click(trigger);
    expect(screen.getByTestId('feed-post-menu')).toBeInTheDocument();
    // Fokus sa presunie do menu (klávesnicová navigácia), až potom ho zatvoríme.
    screen.getAllByRole('menuitem')[0].focus();
    expect(trigger).not.toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByTestId('feed-post-menu')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('druhý klik na spúšťač menu zavrie', async () => {
    render(<FeedPostCard post={makePost()} />);
    const trigger = screen.getByTestId('feed-post-menu-trigger');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
```

### 2.2 Chyba 355 (zlyhá na dnešnom kóde)

```tsx
// Chyba 355 (okno zdieľania po úprave ukáže starý text): hlavička a pomocné funkcie sú rovnaké ako pri `FeedPostEdit.test.tsx`.
describe('okno zdieľania po úprave', () => {
  it('ukáže v náhľade zdieľania text po úprave', async () => {
    mockedUpdate.mockResolvedValue(makePost({ caption: 'Novy text', is_edited: true }));
    render(<FeedPostCard post={makePost({ caption: 'Povodny text' })} />);

    const menu = await openMenu();
    await userEvent.click(within(menu).getByTestId('feed-post-edit'));
    const input = await screen.findByTestId('feed-post-edit-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Novy text');
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));
    await waitFor(() => expect(screen.queryByTestId('feed-post-edit-modal')).not.toBeInTheDocument());
    expect(await screen.findByText('Novy text')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('feed-share-button'));
    const dialog = await screen.findByRole('dialog');
    // Na dnešnom kóde zlyhá: v náhľade ostáva „Povodny text“, lebo karta podáva dialógu `post` (prop z feedu), nie `currentPost`.
    expect(within(dialog).queryByText('Novy text')).not.toBeNull();
  });
});
```

### 2.3 Chyba 356 (zlyhá na dnešnom kóde)

Obnova feedu so starým snapshotom počas prebiehajúceho lajku nechá v `currentPost` starý stav lajku; mobilný detail sa otvorí s nesprávnym lajkom. Hlavička a mocky sú rovnaké ako pri sonde.

```tsx
const author = { id: 10, display_name: 'Jana Nováková', slug: 'jana', user_type: 'individual', avatar_url: null };
function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7, post_type: 'free_post', caption: 'Text', author, images: [], shared_content: null,
    shared_content_unavailable: false, tagged_users: [], likes_count: 3, comments_count: 2,
    is_liked_by_me: false, can_manage: false, created_at: '2026-01-01T10:00:00Z', ...overrides,
  } as FeedPost;
}

describe('sonda: obnova feedu počas prebiehajúceho lajku', () => {
  it('mobilný detail po obnove feedu počas lajku ukáže lajk', async () => {
    mobile = true;
    const { likeFeedPost } = jest.requireMock('@/lib/feedApi');
    let resolveLike: (v: unknown) => void = () => {};
    (likeFeedPost as jest.Mock).mockReturnValue(new Promise((r) => { resolveLike = r; }));
    const user = userEvent.setup();
    const { rerender } = render(<FeedPostCard post={makePost()} />);
    await user.click(screen.getByTestId('feed-like-button'));
    // Obnova feedu so starým snapshotom (nový objekt, lajk ešte nie je na serveri).
    rerender(<FeedPostCard post={makePost()} />);
    await act(async () => { resolveLike({ is_liked_by_me: true, likes_count: 4 }); await Promise.resolve(); });
    // Karta ukazuje lajk (počet 4).
    expect(screen.getByTestId('feed-like-count')).toHaveTextContent('4');
    await user.click(screen.getByTestId('feed-comments-button'));
    const detailLike = await screen.findByTestId('feed-mobile-detail-like');
    const pressed = detailLike.getAttribute('aria-pressed');
    const count = screen.getByTestId('feed-mobile-detail-like-count').textContent;
    // eslint-disable-next-line no-console
    console.log('SONDA_LIKE aria-pressed=' + pressed + ' počet v detaile=' + count);
    expect(pressed).toBe('true');
    expect(count).toBe('4');
  });
});
```

## 3. Mutácie `FeedPostCard.tsx` (166) a ich výsledky

Stĺpec „22 sád“ = 22 súborov testov, ktoré kartu menujú (264 testov); „po delení“ = ten istý zásah v nových súboroch prototypu (karta a 12 nových súborov), zachytený rovnakými 22 sádami; „80 súborov“ = vzorka prežívajúcich zásahov proti celému `feed/__tests__` a ďalším 3 súborom. Zoznam zásahov (presný text) je v časti 5.

| ID | Zásah | 22 sád | Po delení | 80 súborov |
| --- | --- | --- | --- | --- |
| A1 | ActionButton: počet je klikateľný aj pri počte 0 | prežila | – | zachytená (FeedPostDetailModule) |
| A2 | ActionButton: počet sa pri nevnorenom tlačidle nezobrazí | zachytená | FeedPostActionButton | – |
| A4 | ActionButton: klik na počet volá onClick namiesto onCountClick | zachytená | FeedPostActionButton | – |
| A5 | ActionButton: farba aktívneho stavu (vnorené tlačidlo) vždy neaktívna | zachytená | FeedPostActionButton | – |
| A6 | ActionButton: farba aktívneho stavu (jedno tlačidlo) vždy neaktívna | prežila | – | prežila |
| H1 | closeMenu: fokus sa nevráti na spúšťač | prežila | – | prežila |
| H2 | closeMenu: neskryje menu | zachytená | FeedPostCard | – |
| H3 | menu: kotva sa nezapíše | zachytená | FeedPostHeader | – |
| H4 | menu: spúšťač len otvára | prežila | – | prežila |
| H5 | menu: nahlásenie sa dá aj po nahlásení | prežila | – | – |
| H6 | menu: nahlásenie nezavrie menu | prežila | – | – |
| H7 | menu: úprava nezavrie menu | zachytená | FeedPostHeader | – |
| H8 | menu: zmazanie nezavrie menu | prežila | – | – |
| H9 | menu: zmazanie otvorí nahlásenie | zachytená | FeedPostHeader | – |
| H10 | menu: úprava aj pre cudzí príspevok | zachytená | FeedPostHeader | – |
| H10b | menu: zmazanie aj pre cudzí príspevok | zachytená | FeedPostHeader | – |
| H11 | hlavička: značka „upravené“ nikdy | zachytená | FeedPostHeader | – |
| H12 | hlavička: isEdited aj pri undefined | zachytená | FeedPostCard | – |
| H13 | hlavička: avatar nikdy vypnutý | prežila | – | – |
| H14 | hlavička: meno nikdy vypnuté | prežila | – | – |
| H15 | hlavička: klik na avatar nič nerobí | prežila | – | – |
| H16 | hlavička: klik na meno nič nerobí | prežila | – | – |
| H17 | hlavička: avatar nezavrie okno pri odchode | prežila | – | – |
| H17b | hlavička: meno nezavrie okno pri odchode | prežila | – | – |
| H18 | closeOverlayOnLeave: zatvára mimo okna | zachytená | FeedPostCard | – |
| H19 | closeOverlayOnLeave: bez keepHistory | zachytená | FeedPostCard | – |
| H20 | hlavička: bez odsadenia pre X v jednostĺpcovom okne | prežila | – | – |
| H22 | menu: aria-expanded vždy false | prežila | – | – |
| S1 | hlavička zdieľania: „Znovu zdieľané“ nikdy | zachytená | FeedPostCard | – |
| S2 | isOwnReshare: aj pri zdieľaní ponuky | zachytená | FeedPostCard | – |
| S3 | isSelfShare: opačné porovnanie | zachytená | FeedPostCard | – |
| S4 | hlavička zdieľania: portfólio a ponuka sa zamenia | prežila | – | – |
| S5 | hlavička zdieľania: meno sa nedosadí | zachytená | FeedPostCard | – |
| S6 | isShared: len pri ponuke | zachytená | FeedPostCard | – |
| C1 | text voľného príspevku aj pri zdieľaní | zachytená | FeedPostCard | – |
| C2 | zdieľaný text: bez ohraničeného rozbalenia v okne | prežila | – | – |
| C2b | voľný text: bez ohraničeného rozbalenia v okne | prežila | – | – |
| C3 | zdieľaný text: expansionBound vždy 'compact' | prežila | – | – |
| C3b | voľný text: expansionBound vždy 'compact' | prežila | – | – |
| C4 | zdieľaný text: počet riadkov vždy ako na karte | prežila | – | – |
| C4b | voľný text: počet riadkov vždy ako na karte | prežila | – | – |
| C5 | zdieľaný text: ťuk neotvorí mobilný detail | zachytená | FeedPostCard | – |
| C5b | voľný text: ťuk neotvorí mobilný detail | zachytená | FeedPostCard | – |
| C6 | zdieľaný text sa nekreslí | zachytená | FeedPostCard | – |
| C7 | voľný text bez collapseBlankLines | zachytená | FeedPostCard | – |
| M1 | okno: fotka bez pružného obalu | prežila | – | – |
| M2 | okno: pružný obal bez flex-1 | prežila | – | – |
| M3 | okno: pružný obal bez podlahy 8rem | prežila | – | – |
| M4 | okno: obal bez data-testid | prežila | – | – |
| M5 | okno: karusel bez fillHeight | prežila | – | – |
| M6 | fotka: desktop neotvorí okno | zachytená | FeedPostMedia | – |
| M7 | fotka: mobil otvorí vždy prvú | prežila | – | – |
| M8 | fotka: photoOpensPostDetail vždy false | zachytená | FeedPostMedia | – |
| M9 | opensPhotoViewer aj v okne | zachytená | FeedPostCard | – |
| M10 | opensOverlay aj na mobile | zachytená | FeedPostCard | – |
| M11 | opensMobileDetail aj v okne | prežila | – | – |
| M12 | jedna fotka sa nekreslí | zachytená | FeedPostMedia | – |
| M13 | živé fotky zvonka sa ignorujú | zachytená | FeedPostCard | – |
| M14 | vlastný polling fotiek beží vždy | zachytená | FeedPostCard | – |
| M15 | prehliadač fotky dostane zastaranú verziu | zachytená | FeedPostCard | – |
| B1 | označenia sa nekreslia pri voľnom príspevku | zachytená | FeedPostSharedBlock | – |
| B2 | okno: zdieľaný blok nie je pružný | prežila | – | – |
| B3 | náhľad: vlastník sa nikdy neskrýva | zachytená | FeedPostSharedBlock | – |
| B4 | náhľad: ťuk na zdieľaný príspevok nič nerobí | zachytená | FeedPostSharedBlock | – |
| B5 | náhľad: fotka v reposte sa neotvorí | zachytená | FeedPostSharedBlock | – |
| B6 | označenia: „x“ pri každom | zachytená | FeedPostSharedBlock | – |
| B7 | označenia: „x“ nič nerobí | zachytená | FeedPostSharedBlock | – |
| B8 | preklik na zdroj nezavrie okno | zachytená | FeedPostCard | – |
| B9 | handleOpenSharedPostPreview vždy undefined | zachytená | FeedPostCard | – |
| F1 | lajk: klik nič nerobí | zachytená | FeedPostActionsRow | – |
| F2 | lajk: klik na počet nič nerobí | zachytená | FeedPostActionsRow | – |
| F3 | lajk: active vždy false | zachytená | FeedPostActionsRow | – |
| F4 | komentáre: desktop neotvorí okno | zachytená | FeedPostActionsRow | – |
| F5 | komentáre: mobil neotvorí detail | zachytená | FeedPostActionsRow | – |
| F6 | komentáre: nerozbaľuje, len otvára | prežila | – | prežila |
| F7 | zdieľanie: klik nič nerobí | zachytená | FeedPostActionsRow | – |
| F8 | počet komentárov: ignoruje override | zachytená | FeedPostActionsRow | – |
| F9 | shownCommentsCount: bez override | zachytená | FeedPostCard | – |
| F10 | komentáre: active vždy false | prežila | – | – |
| K1 | komentáre sa kreslia aj v okne | prežila | – | prežila |
| K2 | komentáre: zmena počtu sa nepremietne | prežila | – | – |
| K3 | komentáre: onTotalChange chýba | prežila | – | – |
| K4 | komentáre: zvýraznenie chýba | prežila | – | – |
| K5 | komentáre: initialCommentsOpen sa ignoruje | zachytená | FeedPostCard | – |
| L1 | fotoprehliadač repostu: chýba kontrola id | prežila | – | – |
| L2 | fotoprehliadač repostu: nezavrie sa | zachytená | FeedPostMobileLayers | – |
| L3 | mobilný detail: úprava sa nevráti do karty | zachytená | FeedPostMobileLayers | – |
| L4 | prehliadač fotky: úprava sa nevráti do karty | zachytená | FeedPostMobileLayers | – |
| L5 | prehliadač fotky: zastaraný príspevok | zachytená | FeedPostMobileLayers | – |
| L6 | mobilný detail: nezavrie sa | zachytená | FeedPostMobileLayers | – |
| L7 | prehliadač fotky: nezavrie sa | zachytená | FeedPostMobileLayers | – |
| L8 | prehliadač fotky: vždy prvá fotka | prežila | – | – |
| L9 | zoznam lajkujúcich: nezavrie sa | prežila | – | zachytená (FeedPostDetailOverlay) |
| L10 | potvrdenie zmazania: nezavrie sa | prežila | – | – |
| L11 | potvrdenie zmazania: nič nezmaže | zachytená | FeedPostDialogs | – |
| L12 | potvrdenie zmazania: isDeleting vždy false | prežila | – | – |
| L13 | potvrdenie odstránenia označenia: nič nerobí | zachytená | FeedPostDialogs | – |
| L14 | potvrdenie odstránenia označenia: isDeleting vždy false | prežila | – | – |
| L15 | potvrdenie odstránenia označenia: nezavrie sa | prežila | – | – |
| L16 | úprava: nová verzia sa neuloží v karte | zachytená | FeedPostDialogs | – |
| L17 | úprava: onPostUpdated sa nevolá | prežila | – | prežila |
| L18 | nahlásenie: reported sa nenastaví | prežila | – | – |
| L19 | nahlásenie: nezavrie sa | prežila | – | – |
| L20 | zdieľanie: modal dostane currentPost | prežila | – | – |
| L21 | zdieľanie: onShared sa nepodá modalu | prežila | – | – |
| L22 | zdieľanie: nezavrie sa | prežila | – | – |
| L23 | mobilný detail: onDeleted sa nepodá | prežila | – | – |
| L24 | prehliadač fotky: onDeleted sa nepodá | prežila | – | – |
| L25 | mobilný detail: onShared sa nepodá | prežila | – | – |
| L25b | prehliadač fotky: onShared sa nepodá | prežila | – | – |
| L26 | úprava: modal dostane zastaraný príspevok | zachytená | FeedPostDialogs | – |
| L27 | mobilný detail: dostane zastaraný príspevok | zachytená | FeedPostMobileLayers | – |
| D1 | zmazanie: chýba ochrana proti dvojitému volaniu | prežila | – | prežila |
| D2 | zmazanie: nevolá server | zachytená | useFeedPostDelete | – |
| D3 | zmazanie: nezavrie potvrdenie | prežila | – | – |
| D4 | zmazanie: bez toastu úspechu | zachytená | useFeedPostDelete | – |
| D5 | zmazanie: onDeleted sa nevolá | zachytená | useFeedPostDelete | – |
| D6 | zmazanie: emitFeedPostDeleted sa nevolá | zachytená | useFeedPostDelete | – |
| D7 | zmazanie: deleting ostane true | prežila | – | – |
| D8 | odstránenie označenia: chýba ochrana pred dvojitým volaním | prežila | – | prežila |
| D9 | odstránenie označenia: nevolá server | zachytená | useFeedPostTags | – |
| D10 | odstránenie označenia: chip nezmizne | zachytená | useFeedPostTags | – |
| D11 | odstránenie označenia: nezavrie potvrdenie | prežila | – | – |
| D12 | odstránenie označenia: bez toastu úspechu | zachytená | useFeedPostTags | – |
| D13 | odstránenie označenia: onSelfTagRemoved sa nevolá | zachytená | useFeedPostTags | – |
| D14 | odstránenie označenia: removingTag ostane true | prežila | – | – |
| E1a | sync lajku: chýba ochrana pri prebiehajúcom lajku | prežila | – | prežila |
| E1b | sync lajku: počet sa neprevezme | prežila | – | – |
| E1c | sync lajku: stav lajku sa neprevezme | prežila | – | – |
| E1d | sync lajku: prázdne závislosti | prežila | – | – |
| E2 | sync počtu komentárov: chýba | prežila | – | prežila |
| E2b | sync počtu komentárov: prázdne závislosti | prežila | – | – |
| E3 | sync označení: chýba | prežila | – | prežila |
| E3b | sync označení: prázdne závislosti | prežila | – | – |
| E4 | sync príspevku: chýba | zachytená | FeedPostCard | – |
| E4b | sync príspevku: prázdne závislosti | zachytená | FeedPostCard | – |
| E5 | premietnutie lajku do currentPost: chýba | zachytená | FeedPostCard | – |
| E5b | premietnutie lajku: porovnáva len lajk | prežila | – | – |
| E5c | premietnutie lajku: bez počtu | zachytená | FeedPostCard | – |
| E5d | premietnutie lajku: závislosť len na lajku | prežila | – | – |
| E6a | zdieľanie pristálo: mobilný detail ostane | zachytená | useFeedPostMobileLayers | – |
| E6b | zdieľanie pristálo: prehliadač fotky ostane | zachytená | useFeedPostMobileLayers | – |
| E6c | zdieľanie pristálo: fotoprehliadač repostu ostane | prežila | – | – |
| E7a | zmazanie iným: mobilný detail ostane | zachytená | useFeedPostMobileLayers | – |
| E7b | zmazanie iným: prehliadač fotky ostane | zachytená | useFeedPostMobileLayers | – |
| E7c | zmazanie iným: fotoprehliadač repostu ostane | prežila | – | – |
| E7d | zmazanie iným: chýba porovnanie id | prežila | – | prežila |
| E7e | zmazanie iným: prázdne závislosti | prežila | – | – |
| R1 | refreshCounts: chýba prvá brzda | prežila | – | prežila |
| R2 | refreshCounts: chýba druhá brzda | zachytená | useFeedPostCountsPolling | – |
| R3 | refreshCounts: druhá brzda bez seq | zachytená | useFeedPostCountsPolling | – |
| R3b | refreshCounts: druhá brzda bez pending | prežila | – | – |
| R4 | refreshCounts: počet lajkov sa nezapíše | prežila | – | prežila |
| R5 | refreshCounts: stav lajku sa nezapíše | prežila | – | – |
| R6 | refreshCounts: počet komentárov sa nezverejní | prežila | – | – |
| R7 | refreshCounts: emitFeedPostCounts chýba | prežila | – | – |
| R8 | polling: beží aj mimo obrazovky | zachytená | useFeedPostCountsPolling | – |
| R9 | polling: chýba | zachytená | useFeedPostCountsPolling | – |
| W1 | obal: chýba data-post-type | prežila | – | – |
| W2 | obal: fillHeight bez flex stĺpca | prežila | – | – |
| W3 | obal: karta bez rámu | prežila | – | – |
| W4 | fixedBlock: nikdy shrink-0 | prežila | – | – |
| W5 | obal: karta bez podkladu | zachytená | FeedPostCard | – |
| W6 | isDetail: nikdy | zachytená | FeedPostCard | – |
| W8 | caption: z pôvodnej, nie z lokálnej verzie | zachytená | FeedPostCard | – |
| W10 | zdroj zdieľania: z pôvodnej, nie z lokálnej verzie | prežila | – | – |

Zhrnutie: 166 zásahov, 82 zachytených a 84 prežilo; všetkých 82 zachytených sa zachytilo aj po delení (v nových súboroch). Z 16 prežívajúcich zásahov zopakovaných proti 80 súborom 2 zachytili ďalšie testy (A1: `FeedPostDetailModule`, L9: `FeedPostDetailOverlay`).

## 4. Mutácie `FeedPostMobileDetail.tsx` (13, agent)

Proti 80 súborom testov (`feed/__tests__`, `ProfileFeedSection`, `DashboardContent.feedOverlay`, `DashboardContentView`). Všetkých 8 zásahov do zmazania (MD1 až MD8) prežilo, rovnako menu (MD9, MD10) a zdieľanie (MD11); tlačidlo „X“ (MD12) a úpravu z menu (MD13) testy zachytia. Potvrdzuje to tvrdenie kolegu, že zmazanie z mobilného detailu nemá žiadny test.

| ID | Zásah | Výsledok |
| --- | --- | --- |
| MD1 | zmazanie: chýba ochrana proti dvojitému volaniu | prežila |
| MD2 | zmazanie: nezavrie potvrdenie | prežila |
| MD3 | zmazanie: bez toastu úspechu | prežila |
| MD4 | zmazanie: onDeleted sa nevolá | prežila |
| MD5 | zmazanie: emitFeedPostDeleted sa nevolá | prežila |
| MD6 | zmazanie: obrazovka sa nezavrie | prežila |
| MD7 | zmazanie: chyba bez toastu | prežila |
| MD8 | zmazanie: deleting ostane true | prežila |
| MD9 | menu: spúšťač len otvára | prežila |
| MD10 | menu: nahlásenie nezavrie menu | prežila |
| MD11 | zdieľanie: tlačidlo nič nerobí | prežila |
| MD12 | zatvorenie: tlačidlo X nič nerobí | zachytená |
| MD13 | úprava: položka menu otvorí zmazanie | zachytená |

## 5. Zoznam zásahov karty (`mut_list.py`)

Každý riadok `m(ID, popis, pôvodný text, nový text, poradie výskytu)`: v `FeedPostCard.tsx` sa nahradí práve jeden výskyt pôvodného textu novým a spustia sa testy; po každom zásahu sa súbor vráti. Pri prototype delenia sa text hľadal bez ohľadu na odsadenie a s náhradou `post.id` → `postId`.

```python
# -*- coding: utf-8 -*-
"""Zoznam mutácií pre `FeedPostCard.tsx`: (id, popis, pôvodný text, nový text, poradie výskytu alebo None)."""

M = []


def m(mid, popis, old, new, nth=None):
    M.append((mid, popis, old, new, nth))


# ---- ActionButton
m('A1', 'ActionButton: počet je klikateľný aj pri počte 0', '  const countIsInteractive = Boolean(onCountClick) && (count ?? 0) > 0;', '  const countIsInteractive = Boolean(onCountClick);')
m('A2', 'ActionButton: počet sa pri nevnorenom tlačidle nezobrazí', '      {count === undefined ? null : <span className="tabular-nums">{count}</span>}', '      {null}')
m('A4', 'ActionButton: klik na počet volá onClick namiesto onCountClick', 'onClick={onCountClick}', 'onClick={onClick}')
m('A5', 'ActionButton: farba aktívneho stavu (vnorené tlačidlo) vždy neaktívna', "dark:hover:bg-white/10 ${\n            active\n", "dark:hover:bg-white/10 ${\n            false\n")
m('A6', 'ActionButton: farba aktívneho stavu (jedno tlačidlo) vždy neaktívna', "dark:hover:bg-white/10 ${\n        active\n", "dark:hover:bg-white/10 ${\n        false\n")

# ---- hlavička a menu
m('H1', 'closeMenu: fokus sa nevráti na spúšťač', '    menuTriggerRef.current?.focus();\n', '')
m('H2', 'closeMenu: neskryje menu', '    setMenuOpen(false);\n    // Fokus späť', '    setMenuOpen(true);\n    // Fokus späť')
m('H3', 'menu: kotva sa nezapíše', 'setMenuAnchor(event.currentTarget.getBoundingClientRect());', 'setMenuAnchor(null);')
m('H4', 'menu: spúšťač len otvára', 'setMenuOpen((open) => !open);', 'setMenuOpen(true);')
m('H5', 'menu: nahlásenie sa dá aj po nahlásení', 'disabled={reported}', 'disabled={false}')
m('H6', 'menu: nahlásenie nezavrie menu', 'setMenuOpen(false);\n                  setReportOpen(true);', 'setReportOpen(true);')
m('H7', 'menu: úprava nezavrie menu', 'setMenuOpen(false);\n                    setEditOpen(true);', 'setEditOpen(true);')
m('H8', 'menu: zmazanie nezavrie menu', 'setMenuOpen(false);\n                    setDeleteOpen(true);', 'setDeleteOpen(true);')
m('H9', 'menu: zmazanie otvorí nahlásenie', 'setDeleteOpen(true);', 'setReportOpen(true);')
m('H10', 'menu: úprava aj pre cudzí príspevok', '{post.can_manage ? (', '{true ? (', 1)
m('H10b', 'menu: zmazanie aj pre cudzí príspevok', '{post.can_manage ? (', '{true ? (', 2)
m('H11', 'hlavička: značka „upravené“ nikdy', '{isEdited ? (', '{false ? (')
m('H12', 'hlavička: isEdited aj pri undefined', 'const isEdited = currentPost.is_edited === true;', 'const isEdited = currentPost.is_edited !== false;')
m('H13', 'hlavička: avatar nikdy vypnutý', 'disabled={!canOpenUserProfile(post.author)}', 'disabled={false}', 1)
m('H14', 'hlavička: meno nikdy vypnuté', 'disabled={!canOpenUserProfile(post.author)}', 'disabled={false}', 2)
m('H15', 'hlavička: klik na avatar nič nerobí', 'onClick={() => openUserProfile(post.author, { beforeNavigate: closeOverlayOnLeave })}', 'onClick={() => {}}', 1)
m('H16', 'hlavička: klik na meno nič nerobí', 'onClick={() => openUserProfile(post.author, { beforeNavigate: closeOverlayOnLeave })}', 'onClick={() => {}}', 2)
m('H17', 'hlavička: avatar nezavrie okno pri odchode', '{ beforeNavigate: closeOverlayOnLeave }', '{ beforeNavigate: undefined }', 1)
m('H17b', 'hlavička: meno nezavrie okno pri odchode', '{ beforeNavigate: closeOverlayOnLeave }', '{ beforeNavigate: undefined }', 2)
m('H18', 'closeOverlayOnLeave: zatvára mimo okna', 'if (isDetail) postOverlay?.close({ keepHistory: true });', 'if (!isDetail) postOverlay?.close({ keepHistory: true });')
m('H19', 'closeOverlayOnLeave: bez keepHistory', 'postOverlay?.close({ keepHistory: true })', 'postOverlay?.close({ keepHistory: false })')
m('H20', 'hlavička: bez odsadenia pre X v jednostĺpcovom okne', "isDetail && !fillHeight ? 'pr-12' : ''", "''")
m('H22', 'menu: aria-expanded vždy false', 'aria-expanded={menuOpen}', 'aria-expanded={false}')

# ---- hlavička zdieľania
m('S1', 'hlavička zdieľania: „Znovu zdieľané“ nikdy', "{isOwnReshare\n              ? t(", "{false\n              ? t(")
m('S2', 'isOwnReshare: aj pri zdieľaní ponuky', "const isOwnReshare = isSelfShare && post.post_type === 'shared_feed_post';", 'const isOwnReshare = isSelfShare;')
m('S3', 'isSelfShare: opačné porovnanie', 'post.shared_content.owner.id === post.author?.id;', 'post.shared_content.owner.id !== post.author?.id;')
m('S4', 'hlavička zdieľania: portfólio a ponuka sa zamenia', "post.shared_content?.type === 'portfolio_item'\n      ? t(", "post.shared_content?.type === 'offer'\n      ? t(")
m('S5', 'hlavička zdieľania: meno sa nedosadí', "sharedHeadline.replace('{name}', authorName)", 'sharedHeadline')
m('S6', 'isShared: len pri ponuke', "const isShared = post.post_type !== 'free_post';", "const isShared = post.post_type === 'shared_offer';")

# ---- text
m('C1', 'text voľného príspevku aj pri zdieľaní', '{!isShared && caption ? (', '{caption ? (')
m('C2', 'zdieľaný text: bez ohraničeného rozbalenia v okne', 'boundedExpansion={isDetail}', 'boundedExpansion={false}', 1)
m('C2b', 'voľný text: bez ohraničeného rozbalenia v okne', 'boundedExpansion={isDetail}', 'boundedExpansion={false}', 2)
m('C3', "zdieľaný text: expansionBound vždy 'compact'", "expansionBound={fillHeight ? 'roomy' : 'compact'}", "expansionBound={'compact'}", 1)
m('C3b', "voľný text: expansionBound vždy 'compact'", "expansionBound={fillHeight ? 'roomy' : 'compact'}", "expansionBound={'compact'}", 2)
m('C4', 'zdieľaný text: počet riadkov vždy ako na karte', 'maxLines={isDetail ? DETAIL_CAPTION_LINES : CARD_CAPTION_LINES}', 'maxLines={CARD_CAPTION_LINES}', 1)
m('C4b', 'voľný text: počet riadkov vždy ako na karte', 'maxLines={isDetail ? DETAIL_CAPTION_LINES : CARD_CAPTION_LINES}', 'maxLines={CARD_CAPTION_LINES}', 2)
m('C5', 'zdieľaný text: ťuk neotvorí mobilný detail', 'opensMobileDetail ? () => setMobileDetailOpen(true) : undefined', 'undefined', 1)
m('C5b', 'voľný text: ťuk neotvorí mobilný detail', 'opensMobileDetail ? () => setMobileDetailOpen(true) : undefined', 'undefined', 2)
m('C6', 'zdieľaný text sa nekreslí', "    isShared && caption ? (\n      <FeedPostCaption", "    false ? (\n      <FeedPostCaption")
m('C7', 'voľný text bez collapseBlankLines', '            collapseBlankLines\n            onTextClick', '            onTextClick')

# ---- fotky
m('M1', 'okno: fotka bez pružného obalu', "        fillHeight ? (\n          // Jediná PRUŽNÁ", "        false ? (\n          // Jediná PRUŽNÁ")
m('M2', 'okno: pružný obal bez flex-1', 'className="flex min-h-[8rem] flex-1 flex-col"', 'className="flex min-h-[8rem] flex-col"')
m('M3', 'okno: pružný obal bez podlahy 8rem', 'className="flex min-h-[8rem] flex-1 flex-col"', 'className="flex min-h-0 flex-1 flex-col"')
m('M4', 'okno: obal bez data-testid', '\n            data-testid="feed-post-media-fill"', '')
m('M5', 'okno: karusel bez fillHeight', "alt={t('feed.imageAlt', 'Fotka príspevku')}\n              fillHeight\n", "alt={t('feed.imageAlt', 'Fotka príspevku')}\n")
m('M6', 'fotka: desktop neotvorí okno', "? () => postOverlay?.open({ postId: post.id })\n                : opensPhotoViewer", "? undefined\n                : opensPhotoViewer")
m('M7', 'fotka: mobil otvorí vždy prvú', '? (index) => setPhotoViewerIndex(index)', '? () => setPhotoViewerIndex(0)')
m('M8', 'fotka: photoOpensPostDetail vždy false', 'photoOpensPostDetail={opensOverlay}', 'photoOpensPostDetail={false}')
m('M9', 'opensPhotoViewer aj v okne', 'const opensPhotoViewer = isMobile && !isDetail;', 'const opensPhotoViewer = isMobile;')
m('M10', 'opensOverlay aj na mobile', 'const opensOverlay = Boolean(postOverlay) && !isMobile && !isDetail;', 'const opensOverlay = Boolean(postOverlay) && !isDetail;')
m('M11', 'opensMobileDetail aj v okne', 'const opensMobileDetail = isMobile && !isDetail;', 'const opensMobileDetail = isMobile;')
m('M12', 'jedna fotka sa nekreslí', '{images.length > 0 ? (', '{images.length > 1 ? (')
m('M13', 'živé fotky zvonka sa ignorujú', 'const images = liveImages ?? ownImages;', 'const images = ownImages;')
m('M14', 'vlastný polling fotiek beží vždy', 'enabled: liveImages === undefined,', 'enabled: true,')
m('M15', 'prehliadač fotky dostane zastaranú verziu', 'const viewerPost = useViewerPost(currentPost, images);', 'const viewerPost = currentPost;')

# ---- zdieľaný blok a označenia
m('B1', 'označenia sa nekreslia pri voľnom príspevku', '{isShared || taggedUsers.length ? (', '{isShared ? (')
m('B2', 'okno: zdieľaný blok nie je pružný', "fillHeight\n              ? 'subtle-scrollbar min-h-0 flex-1 overflow-y-auto'\n              : fixedBlock", 'fixedBlock')
m('B3', 'náhľad: vlastník sa nikdy neskrýva', 'hideOwner={isSelfShare}', 'hideOwner={false}')
m('B4', 'náhľad: ťuk na zdieľaný príspevok nič nerobí', 'onOpenPostPreview={handleOpenSharedPostPreview}', 'onOpenPostPreview={undefined}')
m('B5', 'náhľad: fotka v reposte sa neotvorí', "sharedPhotoPostId != null\n                  ? () => setSharedPhotoOpen(true)\n                  : undefined", 'undefined')
m('B6', 'označenia: „x“ pri každom', 'const isOwnTag = tagged.can_remove_tag === true;', 'const isOwnTag = true;')
m('B7', 'označenia: „x“ nič nerobí', 'onClick={() => setTagRemoveOpen(true)}', 'onClick={() => {}}')
m('B8', 'preklik na zdroj nezavrie okno', 'beforeNavigate: closeOverlayOnLeave,', 'beforeNavigate: undefined,')
m('B9', 'handleOpenSharedPostPreview vždy undefined', "const handleOpenSharedPostPreview = opensMobileDetail\n    ? () => setMobileDetailOpen(true)\n    : undefined;", 'const handleOpenSharedPostPreview = undefined;')

# ---- akcie
m('F1', 'lajk: klik nič nerobí', 'onClick={() => void toggleLike()}', 'onClick={() => {}}')
m('F2', 'lajk: klik na počet nič nerobí', 'onCountClick={() => setLikersOpen(true)}', 'onCountClick={() => {}}')
m('F3', 'lajk: active vždy false', 'active={isLiked}', 'active={false}')
m('F4', 'komentáre: desktop neotvorí okno', "            if (opensOverlay) {\n              postOverlay?.open({ postId: post.id });\n              return;\n            }\n", '')
m('F5', 'komentáre: mobil neotvorí detail', "            if (opensMobileDetail) {\n              setMobileDetailOpen(true);\n              return;\n            }\n", '')
m('F6', 'komentáre: nerozbaľuje, len otvára', 'setCommentsOpen((open) => !open);', 'setCommentsOpen(true);')
m('F7', 'zdieľanie: klik nič nerobí', 'onClick={() => setShareOpen(true)}', 'onClick={() => {}}')
m('F8', 'počet komentárov: ignoruje override', 'count={shownCommentsCount}', 'count={commentsCount}')
m('F9', 'shownCommentsCount: bez override', 'const shownCommentsCount = commentsCountOverride ?? commentsCount;', 'const shownCommentsCount = commentsCount;')
m('F10', 'komentáre: active vždy false', 'active={commentsOpen}', 'active={false}')

# ---- vložené komentáre
m('K1', 'komentáre sa kreslia aj v okne', '{commentsOpen && !isDetail ? (', '{commentsOpen ? (')
m('K2', 'komentáre: zmena počtu sa nepremietne', "          onCountChange={(delta) =>\n            changeCommentsCount(delta)\n          }", '          onCountChange={() => {}}')
m('K3', 'komentáre: onTotalChange chýba', 'onTotalChange={publishCommentsCount}', 'onTotalChange={undefined}')
m('K4', 'komentáre: zvýraznenie chýba', 'highlightCommentId={highlightCommentId}', 'highlightCommentId={undefined}')
m('K5', 'komentáre: initialCommentsOpen sa ignoruje', 'useState(initialCommentsOpen)', 'useState(false)')

# ---- vrstvy a dialógy
m('L1', 'fotoprehliadač repostu: chýba kontrola id', '{sharedPhotoOpen && sharedPhotoPostId != null ? (', '{sharedPhotoOpen ? (')
m('L2', 'fotoprehliadač repostu: nezavrie sa', 'onClose={() => setSharedPhotoOpen(false)}', 'onClose={() => {}}')
m('L3', 'mobilný detail: úprava sa nevráti do karty', 'onPostUpdated={setCurrentPost}', 'onPostUpdated={undefined}', 1)
m('L4', 'prehliadač fotky: úprava sa nevráti do karty', 'onPostUpdated={setCurrentPost}', 'onPostUpdated={undefined}', 2)
m('L5', 'prehliadač fotky: zastaraný príspevok', 'post={viewerPost}', 'post={currentPost}')
m('L6', 'mobilný detail: nezavrie sa', 'onClose={() => setMobileDetailOpen(false)}', 'onClose={() => {}}')
m('L7', 'prehliadač fotky: nezavrie sa', 'onClose={() => setPhotoViewerIndex(null)}', 'onClose={() => {}}')
m('L8', 'prehliadač fotky: vždy prvá fotka', 'initialIndex={photoViewerIndex}', 'initialIndex={0}')
m('L9', 'zoznam lajkujúcich: nezavrie sa', 'onClose={() => setLikersOpen(false)}', 'onClose={() => {}}')
m('L10', 'potvrdenie zmazania: nezavrie sa', 'onClose={() => setDeleteOpen(false)}', 'onClose={() => {}}')
m('L11', 'potvrdenie zmazania: nič nezmaže', 'onConfirm={handleDeletePost}', 'onConfirm={() => {}}')
m('L12', 'potvrdenie zmazania: isDeleting vždy false', 'isDeleting={deleting}', 'isDeleting={false}')
m('L13', 'potvrdenie odstránenia označenia: nič nerobí', 'onConfirm={handleRemoveOwnTag}', 'onConfirm={() => {}}')
m('L14', 'potvrdenie odstránenia označenia: isDeleting vždy false', 'isDeleting={removingTag}', 'isDeleting={false}')
m('L15', 'potvrdenie odstránenia označenia: nezavrie sa', 'onClose={() => setTagRemoveOpen(false)}', 'onClose={() => {}}')
m('L16', 'úprava: nová verzia sa neuloží v karte', "            setCurrentPost(updated);\n            onPostUpdated?.(updated);", '            onPostUpdated?.(updated);')
m('L17', 'úprava: onPostUpdated sa nevolá', "            setCurrentPost(updated);\n            onPostUpdated?.(updated);", '            setCurrentPost(updated);')
m('L18', 'nahlásenie: reported sa nenastaví', 'onReported={() => setReported(true)}', 'onReported={() => {}}')
m('L19', 'nahlásenie: nezavrie sa', 'onClose={() => setReportOpen(false)}', 'onClose={() => {}}')
m('L20', 'zdieľanie: modal dostane currentPost', "        post={post}\n        onShared={onShared}", "        post={currentPost}\n        onShared={onShared}")
m('L21', 'zdieľanie: onShared sa nepodá modalu', "        onShared={onShared}\n      />\n    </motion.article>", "        onShared={undefined}\n      />\n    </motion.article>")
m('L22', 'zdieľanie: nezavrie sa', 'onClose={() => setShareOpen(false)}', 'onClose={() => {}}')
m('L23', 'mobilný detail: onDeleted sa nepodá', 'onDeleted={onDeleted}', 'onDeleted={undefined}', 1)
m('L24', 'prehliadač fotky: onDeleted sa nepodá', 'onDeleted={onDeleted}', 'onDeleted={undefined}', 2)
m('L25', 'mobilný detail: onShared sa nepodá', 'onShared={onShared}', 'onShared={undefined}', 1)
m('L25b', 'prehliadač fotky: onShared sa nepodá', 'onShared={onShared}', 'onShared={undefined}', 2)
m('L26', 'úprava: modal dostane zastaraný príspevok', "post={currentPost}\n          onClose={() => setEditOpen(false)}", "post={post}\n          onClose={() => setEditOpen(false)}")
m('L27', 'mobilný detail: dostane zastaraný príspevok', "post={currentPost}\n          onClose={() => setMobileDetailOpen(false)}", "post={post}\n          onClose={() => setMobileDetailOpen(false)}")

# ---- obsluhy zmazania a odstránenia označenia
m('D1', 'zmazanie: chýba ochrana proti dvojitému volaniu', '    if (deleting) return;\n', '')
m('D2', 'zmazanie: nevolá server', 'await deleteFeedPost(post.id);', 'await Promise.resolve();')
m('D3', 'zmazanie: nezavrie potvrdenie', "      setDeleteOpen(false);\n      toast.success(t('feed.postDeleted'", "      toast.success(t('feed.postDeleted'")
m('D4', 'zmazanie: bez toastu úspechu', "toast.success(t('feed.postDeleted', 'Príspevok bol zmazaný.'));", '')
m('D5', 'zmazanie: onDeleted sa nevolá', 'onDeleted?.(post.id);', '', 1)
m('D6', 'zmazanie: emitFeedPostDeleted sa nevolá', 'emitFeedPostDeleted(post.id);', '')
m('D7', 'zmazanie: deleting ostane true', "    } finally {\n      setDeleting(false);\n    }", '    } finally {\n    }')
m('D8', 'odstránenie označenia: chýba ochrana pred dvojitým volaním', '    if (removingTag) return;\n', '')
m('D9', 'odstránenie označenia: nevolá server', 'await removeOwnFeedPostTag(post.id);', 'await Promise.resolve();')
m('D10', 'odstránenie označenia: chip nezmizne', 'setTaggedUsers((current) => current.filter((tag) => !tag.can_remove_tag));', '')
m('D11', 'odstránenie označenia: nezavrie potvrdenie', "      setTagRemoveOpen(false);\n      toast.success(t('feed.tagRemoved'", "      toast.success(t('feed.tagRemoved'")
m('D12', 'odstránenie označenia: bez toastu úspechu', "toast.success(t('feed.tagRemoved', 'Označenie bolo odstránené.'));", '')
m('D13', 'odstránenie označenia: onSelfTagRemoved sa nevolá', 'onSelfTagRemoved?.(post.id);', '')
m('D14', 'odstránenie označenia: removingTag ostane true', "    } finally {\n      setRemovingTag(false);\n    }", '    } finally {\n    }')

# ---- efekty a synchronizácia stavu
m('E1a', 'sync lajku: chýba ochrana pri prebiehajúcom lajku', "    if (likePendingRef.current) return;\n    setIsLiked(post.is_liked_by_me);", '    setIsLiked(post.is_liked_by_me);')
m('E1b', 'sync lajku: počet sa neprevezme', "    setLikesCount(post.likes_count);\n  }, [likePendingRef", '  }, [likePendingRef')
m('E1c', 'sync lajku: stav lajku sa neprevezme', "    setIsLiked(post.is_liked_by_me);\n    setLikesCount(post.likes_count);", '    setLikesCount(post.likes_count);')
m('E1d', 'sync lajku: prázdne závislosti', '[likePendingRef, setIsLiked, setLikesCount, post.is_liked_by_me, post.likes_count]', '[]')
m('E2', 'sync počtu komentárov: chýba', "    setCommentsCountLocally(post.comments_count);\n  }, [setCommentsCountLocally, post.comments_count]);", '  }, [setCommentsCountLocally, post.comments_count]);')
m('E2b', 'sync počtu komentárov: prázdne závislosti', '[setCommentsCountLocally, post.comments_count]', '[]')
m('E3', 'sync označení: chýba', "    setTaggedUsers(post.tagged_users ?? []);\n  }, [post.tagged_users]);", '  }, [post.tagged_users]);')
m('E3b', 'sync označení: prázdne závislosti', '[post.tagged_users]', '[]')
m('E4', 'sync príspevku: chýba', "    setCurrentPost(post);\n  }, [post]);", '  }, [post]);')
m('E4b', 'sync príspevku: prázdne závislosti', "    setCurrentPost(post);\n  }, [post]);", "    setCurrentPost(post);\n  }, []);")
m('E5', 'premietnutie lajku do currentPost: chýba', "    setCurrentPost((previous) =>\n      previous.is_liked_by_me === isLiked && previous.likes_count === likesCount\n        ? previous\n        : { ...previous, is_liked_by_me: isLiked, likes_count: likesCount },\n    );", '')
m('E5b', 'premietnutie lajku: porovnáva len lajk', 'previous.is_liked_by_me === isLiked && previous.likes_count === likesCount', 'previous.is_liked_by_me === isLiked')
m('E5c', 'premietnutie lajku: bez počtu', '{ ...previous, is_liked_by_me: isLiked, likes_count: likesCount }', '{ ...previous, is_liked_by_me: isLiked }')
m('E5d', 'premietnutie lajku: závislosť len na lajku', '[isLiked, likesCount]', '[isLiked]')
m('E6a', 'zdieľanie pristálo: mobilný detail ostane', 'setMobileDetailOpen(false);', '', 1)
m('E6b', 'zdieľanie pristálo: prehliadač fotky ostane', 'setPhotoViewerIndex(null);', '', 1)
m('E6c', 'zdieľanie pristálo: fotoprehliadač repostu ostane', 'setSharedPhotoOpen(false);', '', 1)
m('E7a', 'zmazanie iným: mobilný detail ostane', 'setMobileDetailOpen(false);', '', 2)
m('E7b', 'zmazanie iným: prehliadač fotky ostane', 'setPhotoViewerIndex(null);', '', 2)
m('E7c', 'zmazanie iným: fotoprehliadač repostu ostane', 'setSharedPhotoOpen(false);', '', 2)
m('E7d', 'zmazanie iným: chýba porovnanie id', 'if (deletedId !== post.id) return;', '')
m('E7e', 'zmazanie iným: prázdne závislosti', "    [post.id],\n  );", "    [],\n  );")
m('R1', 'refreshCounts: chýba prvá brzda', "    if (likePendingRef.current) return;\n    const seq = likeSeqRef.current;", '    const seq = likeSeqRef.current;')
m('R2', 'refreshCounts: chýba druhá brzda', "    if (seq !== likeSeqRef.current || likePendingRef.current) return;\n", '')
m('R3', 'refreshCounts: druhá brzda bez seq', 'if (seq !== likeSeqRef.current || likePendingRef.current) return;', 'if (likePendingRef.current) return;')
m('R3b', 'refreshCounts: druhá brzda bez pending', 'if (seq !== likeSeqRef.current || likePendingRef.current) return;', 'if (seq !== likeSeqRef.current) return;')
m('R4', 'refreshCounts: počet lajkov sa nezapíše', "    setLikesCount(fresh.likes_count);\n    setIsLiked(fresh.is_liked_by_me);", '    setIsLiked(fresh.is_liked_by_me);')
m('R5', 'refreshCounts: stav lajku sa nezapíše', "    setLikesCount(fresh.likes_count);\n    setIsLiked(fresh.is_liked_by_me);", '    setLikesCount(fresh.likes_count);')
m('R6', 'refreshCounts: počet komentárov sa nezverejní', 'publishCommentsCount(fresh.comments_count);', '')
m('R7', 'refreshCounts: emitFeedPostCounts chýba', "    emitFeedPostCounts({\n      postId: post.id,\n      likesCount: fresh.likes_count,\n      isLikedByMe: fresh.is_liked_by_me,\n    });", '')
m('R8', 'polling: beží aj mimo obrazovky', 'useFeedCommentsPolling({ enabled: inViewport, onPoll: refreshCounts });', 'useFeedCommentsPolling({ enabled: true, onPoll: refreshCounts });')
m('R9', 'polling: chýba', '  useFeedCommentsPolling({ enabled: inViewport, onPoll: refreshCounts });\n', '')

# ---- obal
m('W1', 'obal: chýba data-post-type', '      data-post-type={post.post_type}\n', '')
m('W2', 'obal: fillHeight bez flex stĺpca', "fillHeight ? 'flex min-h-0 flex-1 flex-col' : '',", "'',")
m('W3', 'obal: karta bez rámu', ": 'overflow-hidden rounded-none border shadow-sm sm:rounded-2xl',", ": 'overflow-hidden',")
m('W4', 'fixedBlock: nikdy shrink-0', "const fixedBlock = fillHeight ? 'shrink-0' : '';", "const fixedBlock = '';")
m('W5', 'obal: karta bez podkladu', "isDetail ? '' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-[#202223]',", "'',")
m('W6', 'isDetail: nikdy', "const isDetail = variant === 'detail';", 'const isDetail = false;')
m('W8', 'caption: z pôvodnej, nie z lokálnej verzie', 'const caption = currentPost.caption;', 'const caption = post.caption;')
m('W10', 'zdroj zdieľania: z pôvodnej, nie z lokálnej verzie', 'buildSharedSourceHandler(currentPost, {', 'buildSharedSourceHandler(post, {')
```
