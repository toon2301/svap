const MESSAGE_IMAGE_MAX_SIZE_MB = 5;
const MESSAGE_IMAGE_MAX_SIZE_BYTES = MESSAGE_IMAGE_MAX_SIZE_MB * 1024 * 1024;
const MESSAGE_IMAGE_ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];

function hasAllowedMessageImageExtension(fileName: string): boolean {
  const normalizedName = fileName.trim().toLowerCase();
  return MESSAGE_IMAGE_ALLOWED_EXTENSIONS.some((extension) => normalizedName.endsWith(extension));
}

export type MessageImageValidationError = 'invalid_type' | 'too_large';

export function validateMessageImageFile(file: File): MessageImageValidationError | null {
  const mimeType = (file.type || '').trim().toLowerCase();
  const hasImageMimeType = mimeType.startsWith('image/');
  const hasAllowedExtension = hasAllowedMessageImageExtension(file.name);

  if (!hasImageMimeType && !hasAllowedExtension) {
    return 'invalid_type';
  }

  if (file.size > MESSAGE_IMAGE_MAX_SIZE_BYTES) {
    return 'too_large';
  }

  return null;
}

export function getMessageImageMaxSizeMb(): number {
  return MESSAGE_IMAGE_MAX_SIZE_MB;
}

