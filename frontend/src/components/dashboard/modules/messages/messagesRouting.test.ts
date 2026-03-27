import { buildMessagesUrl, parseConversationId } from './messagesRouting';

describe('messagesRouting', () => {
  it('builds the base messages route when there is no valid conversation id', () => {
    expect(buildMessagesUrl()).toBe('/dashboard/messages');
    expect(buildMessagesUrl(null)).toBe('/dashboard/messages');
    expect(buildMessagesUrl(0)).toBe('/dashboard/messages');
  });

  it('builds the stable query-param route for valid conversation ids', () => {
    expect(buildMessagesUrl(12)).toBe('/dashboard/messages?conversationId=12');
  });

  it('parses only positive integer conversation ids', () => {
    expect(parseConversationId('15')).toBe(15);
    expect(parseConversationId('0')).toBeNull();
    expect(parseConversationId('-7')).toBeNull();
    expect(parseConversationId('abc')).toBeNull();
    expect(parseConversationId(null)).toBeNull();
  });
});
