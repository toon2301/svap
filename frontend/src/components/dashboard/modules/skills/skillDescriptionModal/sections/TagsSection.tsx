'use client';

import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// Hook na detekciu mobilnej verzie
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

interface TagsSectionProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  isOpen: boolean;
}

export interface TagsSectionRef {
  addTag: () => void;
  getTagInput: () => string;
  canAddTag: () => boolean;
}

const TagsSection = forwardRef<TagsSectionRef, TagsSectionProps>(
  ({ tags, onTagsChange, isOpen }, ref) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [tagInput, setTagInput] = useState('');
  const [tagError, setTagError] = useState('');
  const [canAdd, setCanAdd] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTagInput('');
      setTagError('');
      setCanAdd(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmed = tagInput.trim();
    const canAddTag = !!trimmed && 
                      !tagError && 
                      trimmed.length <= 15 && 
                      !tags.some((t) => t.toLowerCase() === trimmed.toLowerCase()) &&
                      tags.length < 5;
    setCanAdd(canAddTag);
  }, [tagInput, tagError, tags]);

  const addTag = () => {
    const raw = tagInput.trim();
    if (!raw) return;
    const candidate = raw.replace(/,+$/g, '');
    if (candidate.length > 15) {
      setTagError(t('skills.tagTooLong', 'Tag môže mať maximálne 15 znakov'));
      return;
    }
    const lower = candidate.toLowerCase();
    if (tags.some((t) => t.toLowerCase() === lower)) {
      setTagError(t('skills.tagDuplicateError', 'Tento tag už máš pridaný'));
      return;
    }
    if (tags.length >= 5) {
      alert(t('skills.maxTagsAlert', 'Môžeš pridať maximálne 5 tagov.'));
      return;
    }
    onTagsChange([...tags, candidate]);
    setTagInput('');
    setTagError('');
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  useImperativeHandle(ref, () => ({
    addTag: () => {
      addTag();
    },
    getTagInput: () => tagInput,
    canAddTag: () => canAdd,
  }));

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        <div className="flex items-center gap-2">
          <span>{t('skills.tagsOptional', 'Tagy (voliteľné)')}</span>
          {!isMobile && (
            <div className="relative inline-flex group">
              <button
                type="button"
                className="rounded-full bg-gray-400 dark:bg-gray-500 text-white flex items-center justify-center hover:bg-gray-500 dark:hover:bg-gray-400 transition-colors cursor-help"
                style={{ width: '16px', height: '11px', minHeight: '11px', maxHeight: '11px' }}
                aria-label={t('skills.tagsInfo', 'Informácie o tagoch')}
              >
                <svg className="w-2 h-1.5" fill="currentColor" viewBox="0 0 20 20" style={{ height: '8px' }}>
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-[280px] leading-relaxed">
                  {t('skills.tagsInfoText', 'Hashtagy slúžia na lepšie vyhľadávanie vás a vašich ponúk v aplikácii.')}
                  <div className="absolute left-2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </label>

      {tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-x-2 gap-y-px leading-[12px] skill-modal-tags">
          {tags.map((tag, idx) => (
            <span key={`${tag}-${idx}`} className="text-[11px] text-purple-700 dark:text-purple-300 leading-[12px]">
              #{tag}
              <button
                type="button"
                aria-label={`Odstrániť tag ${tag}`}
                className="ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 align-baseline"
                onClick={() => removeTag(tag)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={tagInput}
          onChange={(e) => {
            if (e.target.value.length <= 15) {
              setTagInput(e.target.value);
              setTagError('');
            } else {
              setTagError(t('skills.tagTooLong', 'Tag môže mať maximálne 15 znakov'));
            }
          }}
          onKeyDown={(e) => {
            // Na desktop podporujeme Enter, na mobile nie
            if (!isMobile && (e.key === 'Enter' || e.key === ',')) {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={
            isMobile 
              ? t('skills.tagInputPlaceholderMobile', 'Napíš tag')
              : t('skills.tagInputPlaceholder', 'Napíš tag a stlač Enter alebo ,')
          }
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent px-3 py-2"
          aria-label={t('skills.tagInputAria', 'Vstup pre tagy')}
          maxLength={15}
        />
      </div>

      {isMobile && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {t('skills.tagsInfoText', 'Hashtagy slúžia na lepšie vyhľadávanie vás a vašich ponúk v aplikácii.')}
        </p>
      )}

      {tagError && (
        <p className="text-sm text-red-500 mt-1">{tagError}</p>
      )}
    </div>
  );
});

TagsSection.displayName = 'TagsSection';

export default TagsSection;

