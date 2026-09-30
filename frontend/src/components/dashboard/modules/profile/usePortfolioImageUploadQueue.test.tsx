jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { error: jest.fn(), success: jest.fn() }),
}));

jest.mock('./portfolioApi', () => ({
  uploadPortfolioImageInit: jest.fn(),
  uploadPortfolioImageToStorage: jest.fn(),
  uploadPortfolioImageComplete: jest.fn(),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  uploadPortfolioImageComplete,
  uploadPortfolioImageInit,
  uploadPortfolioImageToStorage,
} from './portfolioApi';
import type { PortfolioImage } from './portfolioTypes';
import { usePortfolioImageUploadQueue } from './usePortfolioImageUploadQueue';

const SERVER_IMAGES: PortfolioImage[] = [];
const FILE = new File([new Uint8Array(16)], 'work.jpg', { type: 'image/jpeg' });

function spinFor(ms: number) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    // aktívne čakanie
  }
}

function Harness({ onRefresh }: { onRefresh: () => void }) {
  const queue = usePortfolioImageUploadQueue({
    itemId: 7,
    activeImageCount: 0,
    serverImages: SERVER_IMAGES,
    onRefresh,
  });
  // Pomalý commit odsunie passive efekty za mikrotasky, ktoré po ňom bežia (vyťažené CI).
  if (queue.items.some((item) => item.status === 'failed')) spinFor(10);

  return (
    <div>
      <button onClick={() => queue.uploadFiles([FILE])}>upload</button>
      {queue.items.map((item) => (
        <button key={item.id} onClick={() => queue.retryUpload(item.id)}>
          {item.status}
        </button>
      ))}
    </div>
  );
}

describe('usePortfolioImageUploadQueue', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('retryUpload vidí zlyhanú položku hneď po commite, aj keď passive efekty bežia až po ňom', async () => {
    (uploadPortfolioImageInit as jest.Mock)
      .mockRejectedValueOnce(new Error('init failed'))
      .mockResolvedValueOnce({ url: 'https://storage.example/upload', fields: {}, key: 'k' });
    (uploadPortfolioImageToStorage as jest.Mock).mockResolvedValue(undefined);
    (uploadPortfolioImageComplete as jest.Mock).mockResolvedValue({ id: 55, status: 'pending' });
    const onRefresh = jest.fn();

    render(<Harness onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'upload' }));
    fireEvent.click(await screen.findByRole('button', { name: 'failed' }));

    expect(uploadPortfolioImageInit).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  });
});
