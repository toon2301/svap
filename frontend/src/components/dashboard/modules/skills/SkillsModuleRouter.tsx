'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import { skillsCategories } from '@/constants/skillsCategories';
import SkillsHome from './SkillsHome';
import SkillsScreen from './SkillsScreen';
import SkillsCategoryScreen from './SkillsCategoryScreen';
import SkillsDescriptionScreen from './SkillsDescriptionScreen';
import AddCustomCategoryScreen from './AddCustomCategoryScreen';
import type { DashboardSkill } from '../../hooks/useSkillsModals';
import type { OpeningHours } from './skillDescriptionModal/types';

interface SkillsModuleRouterProps {
  activeModule: string;
  accountType: 'personal' | 'business';
  standardCategories: DashboardSkill[];
  customCategories: DashboardSkill[];
  selectedSkillsCategory: DashboardSkill | null;
  setActiveModule: (module: string) => void;
  setIsSkillsCategoryModalOpen: (value: boolean) => void;
  setSelectedSkillsCategory: (value: DashboardSkill | null) => void;
  setIsSkillDescriptionModalOpen: (value: boolean) => void;
  setIsAddCustomCategoryModalOpen: (value: boolean) => void;
  setEditingCustomCategoryIndex: (value: number | null) => void;
  setEditingStandardCategoryIndex: (value: number | null) => void;
  removeStandardCategory: (index: number) => Promise<void>;
  removeCustomCategory: (index: number) => Promise<void>;
  setIsInSubcategories?: (value: boolean) => void;
  onSkillsCategoryBackHandlerSet?: (handler: () => void) => void;
}

export default function SkillsModuleRouter({
  activeModule,
  accountType,
  standardCategories,
  customCategories,
  selectedSkillsCategory,
  setActiveModule,
  setIsSkillsCategoryModalOpen,
  setSelectedSkillsCategory,
  setIsSkillDescriptionModalOpen,
  setIsAddCustomCategoryModalOpen,
  setEditingCustomCategoryIndex,
  setEditingStandardCategoryIndex,
  removeStandardCategory,
  removeCustomCategory,
  setIsInSubcategories,
  onSkillsCategoryBackHandlerSet,
}: SkillsModuleRouterProps) {
  const { t } = useLanguage();

  switch (activeModule) {
    case 'skills':
      return (
        <SkillsHome
          onOffer={() => {
            setActiveModule('skills-offer');
            try {
              localStorage.setItem('activeModule', 'skills-offer');
            } catch {
              // ignore
            }
          }}
          onSearch={() => {
            setActiveModule('skills-search');
            try {
              localStorage.setItem('activeModule', 'skills-search');
            } catch {
              // ignore
            }
          }}
        />
      );
    case 'skills-offer': {
      const filteredStandard = standardCategories.filter((s) => !(s.is_seeking ?? false));
      const filteredCustom = customCategories.filter((s) => !(s.is_seeking ?? false));

      return (
        <SkillsScreen
          isSeeking={false}
          title={t(
            'skills.offerSelectAreaTitle',
            'Zvoľ oblasť, v ktorej vynikáš alebo ponúkaš svoje služby.',
          )}
          firstOptionText={t('skills.selectCategoryTitle', 'Vyber kategóriu')}
          onFirstOptionClick={() => {
            try {
              localStorage.setItem('skillsDescribeMode', 'offer');
            } catch {
              // ignore
            }
            if (filteredStandard.length >= 5) {
              // eslint-disable-next-line no-alert
              alert('Môžeš mať maximálne 5 výberov z kategórií.');
              return;
            }
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setActiveModule('skills-select-category');
              try {
                localStorage.setItem('activeModule', 'skills-select-category');
              } catch {
                // ignore
              }
            } else {
              setIsSkillsCategoryModalOpen(true);
            }
          }}
          standardCategories={filteredStandard}
          onRemoveStandardCategory={async (index) => {
            const item = filteredStandard[index];
            const originalIndex = standardCategories.findIndex((s) => s.id === item.id);
            if (originalIndex !== -1) {
              await removeStandardCategory(originalIndex);
            }
          }}
          onEditStandardCategoryDescription={(index) => {
            setEditingStandardCategoryIndex(index);
            setSelectedSkillsCategory(filteredStandard[index]);
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              try {
                localStorage.setItem('skillsDescribeMode', 'offer');
              } catch {
                // ignore
              }
              setActiveModule('skills-describe');
              try {
                localStorage.setItem('activeModule', 'skills-describe');
              } catch {
                // ignore
              }
            } else {
              setIsSkillDescriptionModalOpen(true);
            }
          }}
          onAddCategory={() => {
            if (filteredCustom.length >= 5) {
              // eslint-disable-next-line no-alert
              alert('Môžeš pridať maximálne 5 vlastných kategórií.');
              return;
            }
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              try {
                localStorage.setItem('skillsDescribeMode', 'offer');
              } catch {
                // ignore
              }
              setActiveModule('skills-add-custom-category');
              try {
                localStorage.setItem('activeModule', 'skills-add-custom-category');
              } catch {
                // ignore
              }
            } else {
              setIsAddCustomCategoryModalOpen(true);
            }
          }}
          customCategories={filteredCustom}
          onRemoveCustomCategory={async (index) => {
            const item = filteredCustom[index];
            const originalIndex = customCategories.findIndex((s) => s.id === item.id);
            if (originalIndex !== -1) {
              await removeCustomCategory(originalIndex);
            }
          }}
          onEditCustomCategoryDescription={(index) => {
            setEditingCustomCategoryIndex(index);
            setSelectedSkillsCategory(filteredCustom[index]);
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              try {
                localStorage.setItem('skillsDescribeMode', 'offer');
              } catch {
                // ignore
              }
              setActiveModule('skills-describe');
              try {
                localStorage.setItem('activeModule', 'skills-describe');
              } catch {
                // ignore
              }
            } else {
              setIsSkillDescriptionModalOpen(true);
            }
          }}
        />
      );
    }
    case 'skills-search': {
      const filteredStandard = standardCategories.filter((s) => s.is_seeking === true);
      const filteredCustom = customCategories.filter((s) => s.is_seeking === true);

      return (
        <SkillsScreen
          isSeeking={true}
          title="Vyber, čo hľadáš, aby ostatní hneď vedeli, s čím ti môžu pomôcť."
          firstOptionText={t('skills.setWhatYouSeek', 'Vyber čo hľadáš')}
          firstOptionHint={t(
            'skills.seekCategoryHint',
            'Vyber kategóriu, ktorú hľadáš — a ak ti nič nesedí, jednoducho si nižšie nastav presne to, čo potrebuješ.',
          )}
          onFirstOptionClick={() => {
            try {
              localStorage.setItem('skillsDescribeMode', 'search');
            } catch {
              // ignore
            }
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setActiveModule('skills-select-category');
              try {
                localStorage.setItem('activeModule', 'skills-select-category');
              } catch {
                // ignore
              }
            } else {
              setIsSkillsCategoryModalOpen(true);
            }
          }}
          secondOptionText={t('skills.addWhatYouSeek', 'Pridaj čo hľadáš')}
          secondOptionHint={t(
            'skills.addWhatYouSeekHint',
            'Nastav si presne to, čo hľadáš, podľa vlastných predstáv.',
          )}
          onSecondOptionClick={() => {
            if (filteredCustom.length >= 5) {
              // eslint-disable-next-line no-alert
              alert('Môžeš pridať maximálne 5 vlastných kategórií.');
              return;
            }
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              try {
                localStorage.setItem('skillsDescribeMode', 'search');
              } catch {
                // ignore
              }
              setActiveModule('skills-add-custom-category');
              try {
                localStorage.setItem('activeModule', 'skills-add-custom-category');
              } catch {
                // ignore
              }
            } else {
              setIsAddCustomCategoryModalOpen(true);
            }
          }}
          standardCategories={filteredStandard}
          onRemoveStandardCategory={async (index) => {
            const item = filteredStandard[index];
            const originalIndex = standardCategories.findIndex((s) => s.id === item.id);
            if (originalIndex !== -1) {
              await removeStandardCategory(originalIndex);
            }
          }}
          onEditStandardCategoryDescription={(index) => {
            setEditingStandardCategoryIndex(index);
            setSelectedSkillsCategory(filteredStandard[index]);
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              try {
                localStorage.setItem('skillsDescribeMode', 'search');
              } catch {
                // ignore
              }
              setActiveModule('skills-describe');
              try {
                localStorage.setItem('activeModule', 'skills-describe');
              } catch {
                // ignore
              }
            } else {
              setIsSkillDescriptionModalOpen(true);
            }
          }}
          customCategories={filteredCustom}
          onRemoveCustomCategory={async (index) => {
            const item = filteredCustom[index];
            const originalIndex = customCategories.findIndex((s) => s.id === item.id);
            if (originalIndex !== -1) {
              await removeCustomCategory(originalIndex);
            }
          }}
          onEditCustomCategoryDescription={(index) => {
            setEditingCustomCategoryIndex(index);
            setSelectedSkillsCategory(filteredCustom[index]);
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              try {
                localStorage.setItem('skillsDescribeMode', 'search');
              } catch {
                // ignore
              }
              setActiveModule('skills-describe');
              try {
                localStorage.setItem('activeModule', 'skills-describe');
              } catch {
                // ignore
              }
            } else {
              setIsSkillDescriptionModalOpen(true);
            }
          }}
        />
      );
    }
    case 'skills-describe': {
      if (!selectedSkillsCategory) {
        setActiveModule('skills-offer');
        return null;
      }

      const describeMode =
        typeof window !== 'undefined' ? localStorage.getItem('skillsDescribeMode') : null;
      const derivedIsSeeking =
        selectedSkillsCategory.is_seeking ?? describeMode === 'search';

      return (
        <SkillsDescriptionScreen
          category={selectedSkillsCategory.category}
          subcategory={selectedSkillsCategory.subcategory}
          isSeeking={derivedIsSeeking}
          onBack={() => {
            const mode =
              typeof window !== 'undefined'
                ? localStorage.getItem('skillsDescribeMode')
                : null;
            const target = mode === 'search' ? 'skills-search' : 'skills-offer';
            setActiveModule(target);
            try {
              localStorage.setItem('activeModule', target);
            } catch {
              // ignore
            }
          }}
          initialDescription={selectedSkillsCategory.description}
          onDescriptionChange={(description) => {
            setSelectedSkillsCategory({
              ...selectedSkillsCategory,
              description,
            });
          }}
          initialDetailedDescription={selectedSkillsCategory.detailed_description}
          onDetailedDescriptionChange={(detailedDescription) => {
            setSelectedSkillsCategory({
              ...selectedSkillsCategory,
              detailed_description: detailedDescription,
            });
          }}
          initialTags={selectedSkillsCategory.tags || []}
          onTagsChange={(tags) => {
            setSelectedSkillsCategory({
              ...selectedSkillsCategory,
              tags,
            });
          }}
          initialDistrict={selectedSkillsCategory.district || ''}
          onDistrictChange={(district) => {
            setSelectedSkillsCategory({
              ...selectedSkillsCategory,
              district,
            });
          }}
          initialLocation={selectedSkillsCategory.location || ''}
          onLocationChange={(location) => {
            setSelectedSkillsCategory({
              ...selectedSkillsCategory,
              location,
            });
          }}
          initialExperience={selectedSkillsCategory.experience}
          onExperienceChange={(experience) => {
            setSelectedSkillsCategory({
              ...selectedSkillsCategory,
              experience,
            });
          }}
          initialPriceFrom={selectedSkillsCategory.price_from ?? null}
          initialPriceCurrency={selectedSkillsCategory.price_currency ?? '€'}
          onPriceChange={(priceFrom, priceCurrency) => {
            setSelectedSkillsCategory({
              ...selectedSkillsCategory,
              price_from: priceFrom,
              price_currency: priceCurrency,
            });
          }}
          initialUrgency={selectedSkillsCategory.urgency || 'low'}
          onUrgencyChange={(urgency) => {
            setSelectedSkillsCategory({
              ...selectedSkillsCategory,
              urgency,
              is_seeking: derivedIsSeeking,
            });
          }}
          initialDurationType={selectedSkillsCategory.duration_type || null}
          onDurationTypeChange={(durationType) => {
            setSelectedSkillsCategory({
              ...selectedSkillsCategory,
              duration_type: durationType,
              is_seeking: derivedIsSeeking,
            });
          }}
          initialImages={selectedSkillsCategory.images || []}
          onImagesChange={(images) => {
            (selectedSkillsCategory as any)._newImages = images;
          }}
          onExistingImagesChange={(existingImages) => {
            setSelectedSkillsCategory({
              ...selectedSkillsCategory,
              images: existingImages
                .filter(
                  (
                    img,
                  ): img is {
                    id: number;
                    image_url?: string | null;
                    image?: string | null;
                    order?: number;
                  } => img.id !== undefined,
                )
                .map((img) => ({
                  id: img.id!,
                  image_url: img.image_url,
                  image: img.image,
                  order: img.order,
                })),
            });
          }}
          onRemoveExistingImage={
            selectedSkillsCategory?.id
              ? async (imageId) => {
                  try {
                    const { data } = await api.delete(
                      endpoints.skills.imageDetail(selectedSkillsCategory.id!, imageId),
                    );
                    return data?.images || [];
                  } catch (error: any) {
                    const msg =
                      error?.response?.data?.error ||
                      error?.message ||
                      'Odstránenie obrázka zlyhalo';
                    throw new Error(msg);
                  }
                }
              : undefined
          }
          initialOpeningHours={selectedSkillsCategory.opening_hours as OpeningHours | undefined}
          onOpeningHoursChange={(openingHours) => {
            setSelectedSkillsCategory({
              ...selectedSkillsCategory,
              opening_hours: openingHours,
            });
          }}
          accountType={accountType}
        />
      );
    }
    case 'skills-select-category':
      return (
        <SkillsCategoryScreen
          categories={skillsCategories}
          selected={null}
          onSelect={(category, subcategory) => {
            setSelectedSkillsCategory({
              category,
              subcategory,
              price_from: null,
              price_currency: '€',
              location: '',
              detailed_description: '',
            });
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setActiveModule('skills-describe');
              try {
                localStorage.setItem('activeModule', 'skills-describe');
              } catch {
                // ignore
              }
            } else {
              setActiveModule('skills-offer');
              try {
                localStorage.setItem('activeModule', 'skills-offer');
              } catch {
                // ignore
              }
              setIsSkillDescriptionModalOpen(true);
            }
          }}
          onBack={() => {
            const mode =
              typeof window !== 'undefined'
                ? localStorage.getItem('skillsDescribeMode')
                : null;
            const target = mode === 'search' ? 'skills-search' : 'skills-offer';
            setActiveModule(target);
            try {
              localStorage.setItem('activeModule', target);
            } catch {
              // ignore
            }
          }}
          onSubcategoryStateChange={(isInSubcategoriesValue) => {
            if (setIsInSubcategories) {
              setIsInSubcategories(isInSubcategoriesValue);
            }
          }}
          onBackHandlerSet={onSkillsCategoryBackHandlerSet}
        />
      );
    case 'skills-add-custom-category':
      return (
        <AddCustomCategoryScreen
          onBack={() => {
            const mode =
              typeof window !== 'undefined'
                ? localStorage.getItem('skillsDescribeMode')
                : null;
            const target = mode === 'search' ? 'skills-search' : 'skills-offer';
            setActiveModule(target);
            try {
              localStorage.setItem('activeModule', target);
            } catch {
              // ignore
            }
          }}
          onSave={(categoryName) => {
            setSelectedSkillsCategory({
              category: categoryName,
              subcategory: categoryName,
              price_from: null,
              price_currency: '€',
              location: '',
              detailed_description: '',
            });
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setActiveModule('skills-describe');
              try {
                localStorage.setItem('activeModule', 'skills-describe');
              } catch {
                // ignore
              }
            } else {
              setIsSkillDescriptionModalOpen(true);
            }
          }}
        />
      );
    default:
      return null;
  }
}


