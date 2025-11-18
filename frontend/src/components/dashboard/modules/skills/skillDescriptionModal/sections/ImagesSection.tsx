'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SkillImage } from '../types';

interface ImagesSectionProps {
  images: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
  imagePreviews: string[];
  setImagePreviews: React.Dispatch<React.SetStateAction<string[]>>;
  existingImages: SkillImage[];
  setExistingImages: React.Dispatch<React.SetStateAction<SkillImage[]>>;
  onRemoveExistingImage?: (imageId: number) => Promise<SkillImage[] | void>;
  isOpen: boolean;
}

const MAX_IMAGES = 6;

export default function ImagesSection({
  images,
  setImages,
  imagePreviews,
  setImagePreviews,
  existingImages,
  setExistingImages,
  onRemoveExistingImage,
  isOpen,
}: ImagesSectionProps) {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState('');
  const [removingImageId, setRemovingImageId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setImageError('');
      setRemovingImageId(null);
    }
  }, [isOpen]);

  const validExistingImages = useMemo(() => {
    const result: SkillImage[] = [];
    const seen = new Set<string>();
    for (const img of existingImages) {
      const src = img?.image_url || img?.image || '';
      if (!src) continue;
      const key = img?.id ? `id-${img.id}` : `src-${src}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(img);
    }
    return result;
  }, [existingImages]);

  const totalImagesCount = validExistingImages.length + imagePreviews.length;

  const handleRemoveExistingImage = async (imageId: number) => {
    if (!onRemoveExistingImage) return;
    setRemovingImageId(imageId);
    try {
      const updated = await onRemoveExistingImage(imageId);
      if (Array.isArray(updated)) {
        setExistingImages(updated);
      } else {
        setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || t('skills.imageDeleteFailed', 'Odstránenie obrázka zlyhalo.');
      alert(msg);
    } finally {
      setRemovingImageId(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const allowed = MAX_IMAGES - (validExistingImages.length + images.length);
    if (allowed <= 0) {
      setImageError(t('skills.maxPhotosReached', 'Dosiahol si maximálny počet 6 fotiek.'));
      event.currentTarget.value = '';
      return;
    }
    const selected = files.slice(0, allowed);
    const newPreviews: string[] = [];
    for (const f of selected) {
      if (!f.type.startsWith('image/')) {
        setImageError(t('skills.fileMustBeImage', 'Súbor musí byť obrázok.'));
        continue;
      }
      newPreviews.push(URL.createObjectURL(f));
    }
    setImages((prev) => [...prev, ...selected]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setImageError('');
    event.currentTarget.value = '';
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('skills.photosOptionalMax', 'Fotky (voliteľné, max. 6)')}
      </label>
      {imageError && <p className="text-sm text-red-500 mb-2">{imageError}</p>}
      <div className="flex flex-wrap gap-3">
        {validExistingImages.length > 0 && (
          <div className="basis-full text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('skills.uploadedPhotos', 'Nahrané fotky')}
          </div>
        )}
        {validExistingImages.map((img) => {
          const src = img.image_url || img.image || '';
          const isRemoving = removingImageId === img.id;
          return (
            <div key={`${img.id ?? src}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
              <img src={src} alt={t('skills.existingPhotoAlt', 'Existujúca fotka')} className={`w-full h-full object-cover transition-opacity ${isRemoving ? 'opacity-50' : 'opacity-100'}`} />
              {onRemoveExistingImage && img.id ? (
                <button
                  type="button"
                  aria-label={t('skills.removeExistingPhoto', 'Odstrániť existujúcu fotku')}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80 transition"
                  onClick={() => handleRemoveExistingImage(img.id!)}
                  disabled={isRemoving}
                >
                  {isRemoving ? (
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8" />
                    </svg>
                  ) : (
                    '×'
                  )}
                </button>
              ) : null}
            </div>
          );
        })}

        {imagePreviews.length > 0 && (
          <div className="basis-full text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('skills.newPhotos', 'Nové fotky')}
          </div>
        )}
        {imagePreviews.map((src, idx) => (
          <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
            <img src={src} alt={`${t('skills.preview', 'Náhľad')} ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              aria-label={t('skills.removePhoto', 'Odstrániť obrázok')}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              onClick={() => {
                setImages((prev) => prev.filter((_, i) => i !== idx));
                setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
              }}
            >
              ×
            </button>
          </div>
        ))}

        {totalImagesCount < MAX_IMAGES && (
          <label className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9.75 6.75L11.25 4.5h1.5l1.5 2.25H18a2.25 2.25 0 012.25 2.25v7.5A2.25 2.25 0 0118 18.75H6a2.25 2.25 0 01-2.25-2.25v-7.5A2.25 2.25 0 016 6.75h3.75z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 10.5a3 3 0 100 6 3 3 0 000-6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M18.75 6.75v3" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M20.25 8.25h-3" />
            </svg>
          </label>
        )}

        {totalImagesCount >= MAX_IMAGES && (
          <p className="basis-full text-xs text-gray-500 dark:text-gray-400">{t('skills.maxPhotosReached', 'Dosiahol si maximálny počet 6 fotiek.')}</p>
        )}
      </div>
    </div>
  );
}

