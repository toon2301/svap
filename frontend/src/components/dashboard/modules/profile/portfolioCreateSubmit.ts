import toast from 'react-hot-toast';
import { uploadPortfolioImageFile } from './portfolioApi';

export async function uploadPortfolioFiles(itemId: number, files: File[]): Promise<void> {
  for (const file of files) {
    // Sequential uploads keep storage and API pressure predictable.
    // eslint-disable-next-line no-await-in-loop
    await uploadPortfolioImageFile(itemId, file);
  }
}

function uniqueMessages(messages: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  messages.forEach((message) => {
    const trimmed = String(message || '').trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    unique.push(trimmed);
  });
  return unique;
}

export function showPortfolioCreateErrors(messages: Array<string | undefined>): void {
  uniqueMessages(messages).forEach((message) => toast.error(message));
}
