import { preloadProfileAvatar } from './preloadAvatar';

describe('preloadProfileAvatar', () => {
  const OriginalImage = global.Image;
  const createdImages: Array<{
    decoding: string;
    referrerPolicy: string;
    src: string;
    onload: null | (() => void);
    onerror: null | (() => void);
  }> = [];

  beforeEach(() => {
    createdImages.length = 0;
    global.Image = jest.fn(() => {
      const image = {
        decoding: '',
        referrerPolicy: '',
        src: '',
        onload: null,
        onerror: null,
      };
      createdImages.push(image);
      return image;
    }) as unknown as typeof Image;
  });

  afterAll(() => {
    global.Image = OriginalImage;
  });

  it('starts an asynchronous preload for an absolute avatar URL', () => {
    preloadProfileAvatar('https://media.example.com/avatars/user/avatar.webp');

    expect(createdImages).toHaveLength(1);
    expect(createdImages[0]).toMatchObject({
      decoding: 'async',
      referrerPolicy: 'no-referrer',
      src: 'https://media.example.com/avatars/user/avatar.webp',
    });
  });

  it('supports a same-origin media URL', () => {
    preloadProfileAvatar('/media/avatars/user/avatar.webp');

    expect(createdImages).toHaveLength(1);
    expect(createdImages[0].src).toBe(
      `${window.location.origin}/media/avatars/user/avatar.webp`,
    );
  });

  it.each([undefined, null, '', '   ', 'javascript:alert(1)'])(
    'does nothing for an unusable URL (%s)',
    (url) => {
      preloadProfileAvatar(url);
      expect(createdImages).toHaveLength(0);
    },
  );
});
