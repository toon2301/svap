import api, { endpoints } from './api';

type UploadInitResponse = {
  url: string;
  fields: Record<string, string>;
  key: string;
  expires_in: number;
};

export async function uploadOfferImage(skillId: number, file: File) {
  const { data: init } = await api.post<UploadInitResponse>(
    endpoints.skills.imageUploadInit(skillId),
    {
      filename: file.name,
      content_type: file.type || '',
      size_bytes: file.size,
    }
  );

  if (!init?.url || !init?.fields || !init?.key) {
    throw new Error('Upload init failed: invalid response');
  }

  const fd = new FormData();
  for (const [k, v] of Object.entries(init.fields)) fd.append(k, v);
  fd.append('file', file);

  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('offer-image-upload-start'));
    }
  } catch {
    // ignore
  }

  const s3Resp = await fetch(init.url, { method: 'POST', body: fd });
  if (!s3Resp.ok) {
    throw new Error(`S3 upload failed (${s3Resp.status})`);
  }

  const { data: complete } = await api.post(
    endpoints.skills.imageUploadComplete(skillId),
    { key: init.key, filename: file.name }
  );
  return complete;
}

