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
import toast from 'react-hot-toast';
import {
  uploadPortfolioImageComplete,
  uploadPortfolioImageInit,
  uploadPortfolioImageToStorage,
} from './portfolioApi';
import { PORTFOLIO_IMAGE_MAX_BYTES } from './portfolioFormUtils';
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

/**
 * Súbory, ktoré sa zamietnu ešte pred nahrávaním (zlý typ, príliš veľké), dostanú riadok s chybou v rade a aj toast
 * (nález 293). Predtým sa toast ukázal len za súbory, ktoré sa nahrávali, takže pri zlom type nevznikol nijaký.
 */
describe('usePortfolioImageUploadQueue: súbory zamietnuté pred nahrávaním', () => {
  const noopRefresh = jest.fn();

  /** Rada, do ktorej tlačidlo „upload“ pošle zadané súbory; každý riadok rady ukáže názov, stav a chybu. */
  function FilesHarness({ files }: { files: File[] }) {
    const queue = usePortfolioImageUploadQueue({
      itemId: 7,
      activeImageCount: 0,
      serverImages: SERVER_IMAGES,
      onRefresh: noopRefresh,
    });
    return (
      <div>
        <button onClick={() => queue.uploadFiles(files)}>upload</button>
        {queue.items.map((item) => (
          <p key={item.id} data-testid="queue-row">{`${item.file.name} | ${item.status} | ${item.error ?? ''}`}</p>
        ))}
      </div>
    );
  }

  const imageFile = (name: string, type = 'image/jpeg') => new File([new Uint8Array(16)], name, { type });
  /** Súbor väčší než povolený limit (veľkosť sa len nastaví, nič sa nealokuje). */
  const oversizedFile = (name: string) => {
    const file = imageFile(name);
    Object.defineProperty(file, 'size', { value: PORTFOLIO_IMAGE_MAX_BYTES + 1 });
    return file;
  };
  const mockSuccessfulUpload = () => {
    (uploadPortfolioImageInit as jest.Mock).mockResolvedValue({ url: 'https://storage.example/upload', fields: {}, key: 'k' });
    (uploadPortfolioImageToStorage as jest.Mock).mockResolvedValue(undefined);
    (uploadPortfolioImageComplete as jest.Mock).mockResolvedValue({ id: 55, status: 'pending' });
  };
  const errorToasts = () => (toast.error as jest.Mock).mock.calls.map(([text]) => text);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('súbor so zlým typom dostane riadok s chybou aj toast a na server sa neposiela', () => {
    render(<FilesHarness files={[imageFile('vektor.svg', 'image/svg+xml')]} />);

    fireEvent.click(screen.getByRole('button', { name: 'upload' }));

    expect(errorToasts()).toEqual(['portfolio.invalidPhotoType']);
    expect(screen.getByTestId('queue-row')).toHaveTextContent('vektor.svg | failed | portfolio.invalidPhotoType');
    expect(uploadPortfolioImageInit).not.toHaveBeenCalled();
  });

  it('príliš veľký súbor dostane toast o veľkosti', () => {
    render(<FilesHarness files={[oversizedFile('velka.jpg')]} />);

    fireEvent.click(screen.getByRole('button', { name: 'upload' }));

    expect(errorToasts()).toEqual(['portfolio.photoTooLarge']);
    expect(uploadPortfolioImageInit).not.toHaveBeenCalled();
  });

  it('viac zlých súborov rovnakého druhu v jednej dávke dá jeden toast', () => {
    const files = ['a.svg', 'b.svg', 'c.svg'].map((name) => imageFile(name, 'image/svg+xml'));
    render(<FilesHarness files={files} />);

    fireEvent.click(screen.getByRole('button', { name: 'upload' }));

    expect(errorToasts()).toEqual(['portfolio.invalidPhotoType']);
    expect(screen.getAllByTestId('queue-row')).toHaveLength(3);
  });

  it('zlý typ aj príliš veľký súbor v jednej dávke dajú dva rôzne toasty', () => {
    render(<FilesHarness files={[imageFile('vektor.svg', 'image/svg+xml'), oversizedFile('velka.jpg')]} />);

    fireEvent.click(screen.getByRole('button', { name: 'upload' }));

    expect(errorToasts()).toEqual(['portfolio.invalidPhotoType', 'portfolio.photoTooLarge']);
  });

  it('platný súbor vedľa zlého sa nahrá a toast hlási len ten zlý', async () => {
    mockSuccessfulUpload();
    render(<FilesHarness files={[imageFile('dobra.jpg'), imageFile('vektor.svg', 'image/svg+xml')]} />);

    fireEvent.click(screen.getByRole('button', { name: 'upload' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(uploadPortfolioImageInit).toHaveBeenCalledTimes(1);
    expect(uploadPortfolioImageInit).toHaveBeenCalledWith(7, expect.objectContaining({ filename: 'dobra.jpg' }));
    expect(errorToasts()).toEqual(['portfolio.invalidPhotoType']);
  });

  it('platné súbory nedajú žiadny toast o zamietnutí', async () => {
    mockSuccessfulUpload();
    render(<FilesHarness files={[imageFile('dobra.jpg')]} />);

    fireEvent.click(screen.getByRole('button', { name: 'upload' }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
  });
});
