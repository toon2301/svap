/**
 * Rozpoznanie „toto vedie na detail príspevku".
 *
 * Podľa tejto funkcie sa rozhoduje, či notifikáciu otvorí okno nad appkou,
 * alebo pôjde bežná navigácia. Backend posiela pre VŠETKY feedové typy
 * (lajk, komentár, odpoveď, lajk komentára, označenie, zdieľanie) rovnaký
 * tvar `/dashboard/feed/<id>` s voliteľným `?comment=<id>` – testy držia obe
 * strany v súlade.
 */

import {
  buildFeedPostPath,
  parseFeedPostTargetUrl,
} from '../feedPostRouting';

describe('parseFeedPostTargetUrl', () => {
  // Presne tie tvary, ktoré generuje notification_serializers.py.
  it.each([
    ['feed_post_liked', '/dashboard/feed/7', 7, null],
    ['feed_post_commented', '/dashboard/feed/7?comment=42', 7, 42],
    ['feed_post_comment_replied', '/dashboard/feed/7?comment=99', 7, 99],
    ['feed_post_comment_liked', '/dashboard/feed/12?comment=5', 12, 5],
    ['feed_post_tagged', '/dashboard/feed/12', 12, null],
    ['feed_post_shared', '/dashboard/feed/300', 300, null],
  ])('opens the window for %s', (_type, url, postId, commentId) => {
    expect(parseFeedPostTargetUrl(url as string)).toEqual({
      postId,
      highlightCommentId: commentId,
    });
  });

  it('accepts a trailing slash', () => {
    expect(parseFeedPostTargetUrl('/dashboard/feed/7/')).toEqual({
      postId: 7,
      highlightCommentId: null,
    });
  });

  it.each([
    ['zoznam príspevkov', '/dashboard/feed'],
    ['správy', '/dashboard/messages/3'],
    ['profil', '/dashboard/users/10'],
    ['portfólio', '/dashboard/users/10/portfolio/4'],
    ['nečíselné id', '/dashboard/feed/abc'],
    ['niečo za id', '/dashboard/feed/7/comments'],
    ['externá adresa', 'https://example.test/dashboard/feed/7'],
  ])('leaves %s to normal navigation', (_label, url) => {
    expect(parseFeedPostTargetUrl(url as string)).toBeNull();
  });

  it('ignores a broken comment id instead of failing', () => {
    // Zvýraznenie komentára je pohodlie – príspevok sa má otvoriť aj tak.
    expect(parseFeedPostTargetUrl('/dashboard/feed/7?comment=abc')).toEqual({
      postId: 7,
      highlightCommentId: null,
    });
  });
});

describe('buildFeedPostPath', () => {
  it('round-trips through the parser', () => {
    expect(parseFeedPostTargetUrl(buildFeedPostPath(7))).toEqual({
      postId: 7,
      highlightCommentId: null,
    });
    expect(parseFeedPostTargetUrl(buildFeedPostPath(7, 42))).toEqual({
      postId: 7,
      highlightCommentId: 42,
    });
  });
});
