import { buildMessagesUrl, parseConversationId, parseTargetUserId } from './messagesRouting';

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
