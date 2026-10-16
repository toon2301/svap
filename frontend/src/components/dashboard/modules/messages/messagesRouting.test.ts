import {
  buildMessagesUrl,
  navigateMessagesUrl,
  parseConversationId,
  parseTargetUserId,
} from './messagesRouting';

describe('messagesRouting', () => {
  it('builds the base messages route when there is no valid conversation id', () => {
    expect(buildMessagesUrl()).toBe('/dashboard/messages');
    expect(buildMessagesUrl(null)).toBe('/dashboard/messages');
    expect(buildMessagesUrl(0)).toBe('/dashboard/messages');
  });

  it('builds the stable query-param route for valid conversation ids', () => {
    expect(buildMessagesUrl(12)).toBe('/dashboard/messages?conversationId=12');
  });

  it('builds a draft compose route when only target user id is provided', () => {
    expect(buildMessagesUrl(null, { targetUserId: 24 })).toBe('/dashboard/messages?targetUserId=24');
    expect(buildMessagesUrl(undefined, { targetUserId: 0 })).toBe('/dashboard/messages');
  });

  it('parses only positive integer conversation ids', () => {
    expect(parseConversationId('15')).toBe(15);
    expect(parseConversationId('0')).toBeNull();
    expect(parseConversationId('-7')).toBeNull();
    expect(parseConversationId('abc')).toBeNull();
    expect(parseConversationId(null)).toBeNull();
  });

  it('parses only positive integer target user ids', () => {
    expect(parseTargetUserId('42')).toBe(42);
    expect(parseTargetUserId('0')).toBeNull();
    expect(parseTargetUserId('-2')).toBeNull();
    expect(parseTargetUserId('abc')).toBeNull();
    expect(parseTargetUserId(null)).toBeNull();
  });
});

describe('navigateMessagesUrl a pôvod z profilu', () => {
  const KEY = '__svaplyMessagesProfileOrigin';
  const MARKER = { version: 1 };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Záznam konverzácie, ktorý má značku pôvodu spolu s vnútornými kľúčmi routera. */
  const markedEntry = () =>
    window.history.replaceState(
      { __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: [], [KEY]: MARKER },
      '',
      '/dashboard/messages?targetUserId=42',
    );

  it('keeps the marker when the entry is replaced by the new conversation', () => {
    markedEntry();
    const replaceState = jest.spyOn(window.history, 'replaceState');

    navigateMessagesUrl(9, { mode: 'replace' });

    expect(replaceState).toHaveBeenCalledWith(
      { [KEY]: MARKER },
      '',
      '/dashboard/messages?conversationId=9',
    );
  });

  it('hands over only the marker, not the router keys (Next adds its own)', () => {
    markedEntry();
    const replaceState = jest.spyOn(window.history, 'replaceState');

    navigateMessagesUrl(9, { mode: 'replace' });

    expect(Object.keys(replaceState.mock.calls[0][0] as object)).toEqual([KEY]);
  });

  it('also keeps the marker when the entry is replaced by another draft', () => {
    markedEntry();
    const replaceState = jest.spyOn(window.history, 'replaceState');

    navigateMessagesUrl(null, { targetUserId: 43, mode: 'replace' });

    expect(replaceState).toHaveBeenCalledWith(
      { [KEY]: MARKER },
      '',
      '/dashboard/messages?targetUserId=43',
    );
  });

  it('does not carry the marker to the conversation list', () => {
    markedEntry();
    const replaceState = jest.spyOn(window.history, 'replaceState');

    navigateMessagesUrl(null, { mode: 'replace' });

    expect(replaceState).toHaveBeenCalledWith(null, '', '/dashboard/messages');
  });

  it('does not carry the marker into a new history entry', () => {
    markedEntry();
    const pushState = jest.spyOn(window.history, 'pushState');

    navigateMessagesUrl(9);

    expect(pushState).toHaveBeenCalledWith(null, '', '/dashboard/messages?conversationId=9');
  });

  it('writes no state when the entry has no marker (as before)', () => {
    window.history.replaceState({ __NA: true }, '', '/dashboard/messages?targetUserId=42');
    const replaceState = jest.spyOn(window.history, 'replaceState');

    navigateMessagesUrl(9, { mode: 'replace' });

    expect(replaceState).toHaveBeenCalledWith(null, '', '/dashboard/messages?conversationId=9');
  });

  it('still returns the address', () => {
    expect(navigateMessagesUrl(9, { mode: 'replace' })).toBe('/dashboard/messages?conversationId=9');
  });
});
