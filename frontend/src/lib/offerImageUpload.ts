import api, { endpoints } from './api';

type UploadInitResponse = {
  url: string;
  fields: Record<string, string>;
  key: string;
  expires_in: number;
};

const STORAGE_FALLBACK_FLAG = '__offer_image_force_multipart__';
let forceMultipartInDev = false;
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    forceMultipartInDev = window.sessionStorage.getItem(STORAGE_FALLBACK_FLAG) === '1';
  } catch {
    // ignore
  }
}

function isStorageNotConfiguredError(err: any): boolean {
  const status = err?.response?.status;
  const message =
    err?.response?.data?.error ||
    err?.response?.data?.detail ||
    err?.message ||
    '';
  return (
    status === 500 &&
    typeof message === 'string' &&
    message.toLowerCase().includes('storage') &&
    message.toLowerCase().includes('nakonfigurovan')
  );
}

function dispatchOfferImageEvent(name: string, detail?: Record<string, unknown>) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(name, detail ? { detail } : undefined));
    }
  } catch {
    // ignore
  }
}

async function uploadOfferImageMultipart(skillId: number, file: File) {
  dispatchOfferImageEvent('offer-image-upload-start');

  const fd = new FormData();
  // Legacy endpoint expects field name "image"
  fd.append('image', file, file.name);

  const { data } = await api.post(endpoints.skills.images(skillId), fd);

  dispatchOfferImageEvent('offer-image-upload-done', {
    skillId,
    filename: file.name,
    transport: 'multipart',
  });

  return data;
}

export async function uploadOfferImage(skillId: number, file: File) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production' && forceMultipartInDev) {
    return await uploadOfferImageMultipart(skillId, file);
  }

  let init: UploadInitResponse;
  try {
    const resp = await api.post<UploadInitResponse>(
      endpoints.skills.imageUploadInit(skillId),
      {
        filename: file.name,
        content_type: file.type || '',
        size_bytes: file.size,
      }
    );
    init = resp.data as any;
  } catch (e: any) {
    // Local/dev fallback: if S3 storage isn't configured, use legacy multipart upload.
    // In production (Railway) where S3 is configured, we never take this path.
    if (isStorageNotConfiguredError(e)) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        forceMultipartInDev = true;
        try {
          window.sessionStorage.setItem(STORAGE_FALLBACK_FLAG, '1');
        } catch {
          // ignore
        }
      }
      return await uploadOfferImageMultipart(skillId, file);
    }
    throw e;
  }

  if (!init?.url || !init?.fields || !init?.key) {
    throw new Error('Upload init failed: invalid response');
  }

  const fd = new FormData();
  for (const [k, v] of Object.entries(init.fields)) fd.append(k, v);
  fd.append('file', file);

  dispatchOfferImageEvent('offer-image-upload-start');

  const s3Resp = await fetch(init.url, { method: 'POST', body: fd });
  if (!s3Resp.ok) {
    throw new Error(`S3 upload failed (${s3Resp.status})`);
  }

  const { data: complete } = await api.post(
    endpoints.skills.imageUploadComplete(skillId),
    { key: init.key, filename: file.name }
  );

  dispatchOfferImageEvent('offer-image-upload-done', {
    skillId,
    filename: file.name,
    transport: 's3',
  });

  return complete;
}

