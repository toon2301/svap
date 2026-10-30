import { normalizePath } from './page-activity-format';

// Neznámy segment alebo názov parametra sa nevypisuje ani skrátený. Nový endpoint
// sa dá zaradiť do zoznamu až po overení, že ide o statický názov bez údajov.
const PATH_SEGMENTS = new Set([
  'api', 'auth', 'dashboard', 'search', 'global', 'recommendations', 'me', 'token', 'refresh',
  'users', 'user', 'profile', 'profiles', 'offers', 'skills', 'skill-requests', 'offer-watches',
  'matches', 'watches', 'settings', 'language', 'account', 'notifications', 'unread-count',
  'messaging', 'conversations', 'unread-summary', 'feed', 'posts', 'comments', 'reviews',
  'favorites', 'requests', 'statistics', 'portfolio', 'items', 'home', 'messages', 'hints',
  'reset-password', 'password-reset', 'password-reset-verify', 'check-email', ':n', ':id',
]);
const QUERY_NAMES = new Set([
  'q', 'tab', 'type', 'country', 'country_code', 'district', 'district_code', 'location',
  'offer_type', 'onlyMyLocation', 'only_my_location', 'price_min', 'price_max', 'page',
  'page_size', 'sort', 'limit', 'cursor', 'users_page', 'offers_page', 'include_offers',
  'include_users', 'watch', 'highlight', 'comment', 'from', 'returnTo', '_rsc',
]);
const METHODS = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'HEAD', 'OPTIONS']);

/** Ponechá len známe statické segmenty; ľubovoľný nový slug či identifikátor je :other. */
export function diagnosticPath(pathname: string): string {
  return normalizePath(pathname).split('/').map((segment) => (
    !segment || PATH_SEGMENTS.has(segment) ? segment : ':other'
  )).join('/');
}

/** Názvy známych parametrov a dĺžka q; neznámy názov nemôže prepašovať údaje. */
export function diagnosticQuery(search: string): string {
  const params = new URLSearchParams(search);
  return [...new Set([...params.keys()].map((name) => (
    name === 'q' ? `q(${(params.get('q') ?? '').length})` : QUERY_NAMES.has(name) ? name : ':param'
  )))].sort().join(',');
}

/** Metóda z pevného zoznamu, nikdy ľubovoľný text odoslaný stránkou. */
export function diagnosticMethod(method: string): string {
  return METHODS.has(method) ? method : 'OTHER';
}

/** Statický názov testu bez hodnôt query a externých adries; nečíta text stránky. */
export function diagnosticTitle(title: string): string {
  return title.replace(/https?:\/\/[^\s"'<>]+/gi, '[url]')
    .replace(/([?&][A-Za-z_][\w.-]*=)[^&#\s"'<>]*/g, '$1[value]')
    .replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 1000);
}
