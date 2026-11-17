export const COMMENTS_ORIGIN = 'https://stunning-inspiration-svap.up.railway.app';
export const POSTS_PATH = '/api/auth/feed/posts/';
export type CommentReply = { status: number; data: unknown };
export type CommentTransport = (method: 'GET' | 'POST' | 'DELETE', path: string,
  body?: Record<string, unknown>, expected?: { text: string; id: number }) => Promise<CommentReply>;
export type CommentCleanup = 'verified' | 'failed' | 'not-needed';

type Safety = { begin: () => void | Promise<void>; beforeDelete: () => void | Promise<void>; afterDelete: () => void | Promise<void>;
  report: (state: CommentCleanup) => void };

/** Hodnoty a ID zostávajú súkromným stavom; chyby nesmú obsahovať telo odpovede. */
export class FeedCommentsSession {
  readonly postCaption: string;
  readonly commentText: string;
  postId: number | null = null;
  commentId: number | null = null;
  private attempted = false;

  constructor(private readonly api: CommentTransport, marker: string, private readonly safety: Safety) {
    this.postCaption = `[e2e] podklad komentárov ${marker}`;
    this.commentText = `[e2e] vlastný komentár ${marker}`;
  }

  private ownPost(data: unknown): number | null {
    try {
      const post = data as { id?: unknown; caption?: unknown; can_manage?: unknown } | null;
      return post && Number.isSafeInteger(post.id) && Number(post.id) > 0
        && post.caption === this.postCaption && post.can_manage === true ? Number(post.id) : null;
    } catch { return null; }
  }

  private async call(method: 'GET' | 'POST' | 'DELETE', path: string, body?: Record<string, unknown>,
    expected?: { text: string; id: number }): Promise<CommentReply> {
    try { return await this.api(method, path, body, expected); }
    catch { throw new Error(`Volanie ${method} komentárovej skúšky sa nedokončilo.`); }
  }

  private report(state: CommentCleanup): void {
    try { this.safety.report(state); } catch { /* Diagnostika nesmie prekryť výsledok upratania. */ }
  }

  /** Príprava beží až v tele testu, aby finally fixture dostalo vlastný rozpočet upratania. */
  async prepare(): Promise<void> {
    if (this.attempted) throw new Error('Podklad komentárovej skúšky sa smie vytvoriť iba raz.');
    this.attempted = true;
    const reply = await this.call('POST', POSTS_PATH, { post_type: 'free_post', caption: this.postCaption,
      tagged_user_ids: [], will_attach_photo: false });
    // Vlastníctvo aj značka musia sedieť pred registráciou na zmazanie; cudzie ID sa nepoužije.
    this.postId = this.ownPost(reply.data);
    if (reply.status !== 201 || this.postId === null) throw new Error('Príprava vlastného textového príspevku nebola potvrdená.');
  }

  commentsPath(): string {
    if (this.postId === null) throw new Error('Chýba potvrdený vlastný podklad komentárovej skúšky.');
    return `${POSTS_PATH}${this.postId}/comments/`;
  }

  /** Registruje len čerstvý vlastný komentár, nikdy obsah iného používateľa. */
  takeComment(data: unknown): void {
    try {
      const item = data as { id?: unknown; text?: unknown; can_edit?: unknown; can_delete?: unknown } | null;
      if (item && Number.isSafeInteger(item.id) && Number(item.id) > 0 && item.text === this.commentText
        && item.can_edit === true && item.can_delete === true) { this.commentId = Number(item.id); return; }
    } catch { /* Do chyby nepatrí pôvodná odpoveď ani getter. */ }
    throw new Error('Odpoveď nepotvrdila nový vlastný komentár.');
  }

  /** Backend je zdroj pravdy, nie iba optimistický riadok v DOM. */
  async verifyComment(present: boolean): Promise<void> {
    if (this.commentId === null) throw new Error('Chýba potvrdenie vytvoreného komentára.');
    const reply = await this.call('GET', this.commentsPath(), undefined, { text: this.commentText, id: this.commentId });
    try {
      const data = reply.data as { contractValid?: unknown; matchedCount?: unknown; matchedExpectedId?: unknown } | null;
      if (reply.status === 200 && data?.contractValid === true && data.matchedCount === (present ? 1 : 0)
        && data.matchedExpectedId === present) return;
    } catch { /* Ani chybný transport nesmie vypísať odpoveď. */ }
    throw new Error('GET nepotvrdil očakávaný stav vlastného komentára.');
  }

  /** Zmaže len overený vlastný podklad; jeho CASCADE odstráni aj komentár po chybe UI. */
  async cleanup(): Promise<void> {
    if (!this.attempted) { this.report('not-needed'); return; }
    let failures = 0;
    try {
      await this.safety.begin();
      await this.safety.beforeDelete();
      if (this.postId === null) throw new Error('Vytvorenie podkladu je neisté.');
      const path = `${POSTS_PATH}${this.postId}/`;
      const proof = await this.call('GET', path);
      if (proof.status !== 200 || this.ownPost(proof.data) !== this.postId) throw new Error('Vlastníctvo podkladu sa nedá overiť.');
      try { if ((await this.call('DELETE', path)).status !== 204) failures += 1; } catch { failures += 1; }
      // Aj pri chybe DELETE sa vykoná kontrola; úspešný GET však nesmie vymazať pôvodnú chybu.
      try { if ((await this.call('GET', path)).status !== 404) failures += 1; } catch { failures += 1; }
      try { await this.safety.afterDelete(); } catch { failures += 1; }
    } catch { failures += 1; }
    this.report(failures ? 'failed' : 'verified');
    if (failures) throw new Error('ZÁVAŽNÉ: upratanie komentárovej skúšky nebolo potvrdené. Ďalší živý test nespúšťaj.');
  }
}
