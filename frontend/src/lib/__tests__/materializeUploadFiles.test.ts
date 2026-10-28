import axios, { type AxiosRequestConfig } from 'axios';

import api from '../api';
import {
  MAX_MATERIALIZED_FILE_BYTES,
  formDataHasFile,
  installFormDataFileMaterializer,
  materializeFormDataFiles,
} from '../materializeUploadFiles';

const MODIFIED_AT = 1_700_000_000_000;

function makeFile(name: string, bytes: number[], type = 'image/jpeg'): File {
  return new File([new Uint8Array(bytes)], name, { type, lastModified: MODIFIED_AT });
}

/** Prečíta bajty z Blobu (jsdom nemá `Blob.arrayBuffer`). */
function readBytes(blob: Blob): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/** Adaptér, ktorý nič neposiela a len si zapamätá, čo by išlo na server. */
function captureAdapter(sink: { config?: AxiosRequestConfig }) {
  return async (config: AxiosRequestConfig) => {
    sink.config = config;
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
}

describe('materializeFormDataFiles', () => {
  it('replaces files with in-memory copies and keeps name, type, date, bytes and field order', async () => {
    const original = makeFile('IMG_0001.jpg', [1, 2, 3, 4, 5]);
    const form = new FormData();
    form.append('target_user_id', '5');
    form.append('image', original, 'IMG_0001.jpg');
    form.append('text', '');

    const result = await materializeFormDataFiles(form);

    expect(result === form).toBe(false);
    expect(Array.from(result.keys())).toEqual(['target_user_id', 'image', 'text']);
    expect(result.get('target_user_id')).toBe('5');
    expect(result.get('text')).toBe('');
    const copy = result.get('image') as File;
    expect(copy).toBeInstanceOf(File);
    expect(copy === original).toBe(false);
    expect(copy.name).toBe('IMG_0001.jpg');
    expect(copy.type).toBe('image/jpeg');
    expect(copy.size).toBe(5);
    expect(copy.lastModified).toBe(MODIFIED_AT);
    expect(await readBytes(copy)).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not touch the original FormData', async () => {
    const original = makeFile('a.png', [9, 9], 'image/png');
    const form = new FormData();
    form.append('avatar', original);

    await materializeFormDataFiles(form);

    expect(form.get('avatar') === original).toBe(true);
  });

  it('copies several files independently', async () => {
    const form = new FormData();
    form.append('a', makeFile('a.jpg', [1]));
    form.append('b', makeFile('b.jpg', [2, 2]));

    const result = await materializeFormDataFiles(form);

    expect(await readBytes(result.get('a') as File)).toEqual([1]);
    expect(await readBytes(result.get('b') as File)).toEqual([2, 2]);
    expect((result.get('b') as File).name).toBe('b.jpg');
  });

  it('returns the very same FormData when it carries no file', async () => {
    const form = new FormData();
    form.append('text', 'ahoj');

    expect(formDataHasFile(form)).toBe(false);
    expect((await materializeFormDataFiles(form)) === form).toBe(true);
  });

  it('leaves empty and oversized files alone', async () => {
    const empty = makeFile('empty.jpg', []);
    const huge = makeFile('huge.jpg', [1, 2, 3]);
    Object.defineProperty(huge, 'size', { value: MAX_MATERIALIZED_FILE_BYTES + 1 });
    const form = new FormData();
    form.append('empty', empty);
    form.append('huge', huge);

    expect(formDataHasFile(form)).toBe(false);
    expect((await materializeFormDataFiles(form)) === form).toBe(true);
  });

  it('keeps the original file when reading it fails, and still copies the others', async () => {
    const bad = makeFile('bad.jpg', [7, 7, 7]);
    const good = makeFile('good.jpg', [1, 2]);
    const form = new FormData();
    form.append('bad', bad);
    form.append('good', good);
    const realRead = FileReader.prototype.readAsArrayBuffer;
    const spy = jest
      .spyOn(FileReader.prototype, 'readAsArrayBuffer')
      .mockImplementation(function (this: FileReader, blob: Blob) {
        if ((blob as File).name === 'bad.jpg') {
          setTimeout(() => this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>));
          return;
        }
        realRead.call(this, blob);
      });

    try {
      const result = await materializeFormDataFiles(form);

      expect(result.get('bad') === bad).toBe(true);
      const copy = result.get('good') as File;
      expect(copy === good).toBe(false);
      expect(await readBytes(copy)).toEqual([1, 2]);
    } finally {
      spy.mockRestore();
    }
  });

  it('prefers Blob.arrayBuffer when the browser has it', async () => {
    const arrayBuffer = jest.fn(async function (this: Blob) {
      return new Uint8Array([4, 5, 6]).buffer;
    });
    Object.defineProperty(Blob.prototype, 'arrayBuffer', { value: arrayBuffer, configurable: true });
    const readerSpy = jest.spyOn(FileReader.prototype, 'readAsArrayBuffer');
    const form = new FormData();
    form.append('image', makeFile('x.jpg', [0]));

    try {
      const result = await materializeFormDataFiles(form);

      expect(arrayBuffer).toHaveBeenCalledTimes(1);
      expect(readerSpy).not.toHaveBeenCalled();
      expect((result.get('image') as File).size).toBe(3);
    } finally {
      readerSpy.mockRestore();
      delete (Blob.prototype as { arrayBuffer?: unknown }).arrayBuffer;
    }
  });
});

describe('installFormDataFileMaterializer', () => {
  it('sends in-memory copies of files, but leaves JSON and file-less FormData untouched', async () => {
    const sink: { config?: AxiosRequestConfig } = {};
    const instance = axios.create({ adapter: captureAdapter(sink) as never });
    installFormDataFileMaterializer(instance);

    const original = makeFile('IMG_0002.jpg', [3, 2, 1]);
    const withFile = new FormData();
    withFile.append('image', original);
    await instance.post('/send/', withFile);
    const sent = sink.config?.data as FormData;
    expect(sent === withFile).toBe(false);
    expect(sent.get('image') === original).toBe(false);
    expect(await readBytes(sent.get('image') as File)).toEqual([3, 2, 1]);

    const textOnly = new FormData();
    textOnly.append('text', 'x');
    await instance.post('/send/', textOnly);
    expect(sink.config?.data === textOnly).toBe(true);

    await instance.post('/send/', { text: 'json' });
    expect(JSON.parse(String(sink.config?.data))).toEqual({ text: 'json' });
  });
});

describe('lib/api', () => {
  it('copies uploaded files to memory before they are sent', async () => {
    const sink: { config?: AxiosRequestConfig } = {};
    (api as unknown as { defaults: { adapter: unknown } }).defaults.adapter = captureAdapter(sink);
    const original = makeFile('avatar.jpg', [8, 8, 8]);
    const form = new FormData();
    form.append('avatar', original);

    await api.patch('/auth/profile/', form);

    const sent = sink.config?.data as FormData;
    expect(sent.get('avatar') === original).toBe(false);
    expect(await readBytes(sent.get('avatar') as File)).toEqual([8, 8, 8]);
  });
});
