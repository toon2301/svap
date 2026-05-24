import { linkifyMessageText } from './linkifyMessageText';

describe('linkifyMessageText', () => {
  it('returns plain text when no URL is present', () => {
    expect(linkifyMessageText('Ahoj, ako sa mas?')).toEqual([
      { type: 'text', value: 'Ahoj, ako sa mas?' },
    ]);
  });

  it('linkifies https URLs and strips trailing punctuation', () => {
    expect(linkifyMessageText('Pozri https://svaply.com/profil.')).toEqual([
      { type: 'text', value: 'Pozri ' },
      { type: 'link', value: 'https://svaply.com/profil', href: 'https://svaply.com/profil' },
      { type: 'text', value: '.' },
    ]);
  });

  it('linkifies www URLs with https prefix', () => {
    expect(linkifyMessageText('www.example.com/test')).toEqual([
      { type: 'link', value: 'www.example.com/test', href: 'https://www.example.com/test' },
    ]);
  });

  it('keeps multiple URLs in one message', () => {
    expect(
      linkifyMessageText('Prvy https://a.com a druhy https://b.com/path'),
    ).toEqual([
      { type: 'text', value: 'Prvy ' },
      { type: 'link', value: 'https://a.com', href: 'https://a.com/' },
      { type: 'text', value: ' a druhy ' },
      { type: 'link', value: 'https://b.com/path', href: 'https://b.com/path' },
    ]);
  });

  it('does not linkify unsupported protocols', () => {
    expect(linkifyMessageText('javascript:alert(1)')).toEqual([
      { type: 'text', value: 'javascript:alert(1)' },
    ]);
  });
});
