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
import {
  clearSkillsDescribeReturnModule,
  getSkillsDescribeReturnModule,
} from './skillsDescribeReturnSession';
import type { DashboardSkill } from '../../hooks/useSkillsModals';
import type { OpeningHours } from './skillDescriptionModal/types';

const MAX_SKILLS_PER_TYPE = 3;

type ApiErrorLike = {
  response?: {
    data?: {
      error?: unknown;
      detail?: unknown;
    };
  };
  message?: unknown;
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as ApiErrorLike;
  const rawMessage =
    apiError.response?.data?.error ?? apiError.response?.data?.detail ?? apiError.message;
  return typeof rawMessage === 'string' && rawMessage.trim() !== ''
    ? rawMessage
    : fallback;
}

interface SkillsModuleRouterProps {
  activeModule: string;
  accountType: 'personal' | 'business';
  standardCategories: DashboardSkill[];
  customCategories: DashboardSkill[];
  selectedSkillsCategory: DashboardSkill | null;
  setActiveModule: (module: string) => void;
  setIsSkillsCategoryModalOpen: (value: boolean) => void;
  setSelectedSkillsCategory: React.Dispatch<React.SetStateAction<DashboardSkill | null>>;
  setIsSkillDescriptionModalOpen: (value: boolean) => void;
  setIsAddCustomCategoryModalOpen: (value: boolean) => void;
  setEditingCustomCategoryIndex: (value: number | null) => void;
  setEditingStandardCategoryIndex: (value: number | null) => void;
  removeStandardCategory: (index: number) => Promise<void>;
  removeCustomCategory: (index: number) => Promise<void>;
  setIsInSubcategories?: (value: boolean) => void;
  onSkillsCategoryBackHandlerSet?: (handler: () => void) => void;
  onSkillsOfferClick?: () => void;
  onSkillsSearchClick?: () => void;
  onSkillsModeToggle?: () => void;
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
  onSkillsOfferClick,
  onSkillsSearchClick,
  onSkillsModeToggle,
}: SkillsModuleRouterProps) {
  const { t } = useLanguage();
  const updateSelectedSkill = React.useCallback(
    (patch: Partial<DashboardSkill>) => {
      setSelectedSkillsCategory((prev) => (prev ? { ...prev, ...patch } : prev));
    },
    [setSelectedSkillsCategory],
  );

  switch (activeModule) {
    case 'skills':
      return (
        <SkillsHome
          onOffer={onSkillsOfferClick || (() => {
            setActiveModule('skills-offer');
            try {
              localStorage.setItem('activeModule', 'skills-offer');
            } catch {
              // ignore
            }
            // Zmeniť URL bez reloadu - window.history.pushState mení URL bez prerenderovania stránky
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/dashboard/skills/offer');
            }
          })}
          onSearch={onSkillsSearchClick || (() => {
            setActiveModule('skills-search');
            try {
              localStorage.setItem('activeModule', 'skills-search');
            } catch {
              // ignore
            }
            // Zmeniť URL bez reloadu - window.history.pushState mení URL bez prerenderovania stránky
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/dashboard/skills/search');
            }
          })}
        />
      );
    case 'skills-offer': {
      const filteredStandard = standardCategories.filter((s) => !(s.is_seeking ?? false));
      const filteredCustom = customCategories.filter((s) => !(s.is_seeking ?? false));
      const filteredTotal = filteredStandard.length + filteredCustom.length;

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
            if (filteredTotal >= MAX_SKILLS_PER_TYPE) {
              // eslint-disable-next-line no-alert
              alert(t('skills.maxCardsPerTypeAlert', 'Môžeš mať maximálne 3 karty v tejto sekcii.'));
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
            if (filteredTotal >= MAX_SKILLS_PER_TYPE) {
              // eslint-disable-next-line no-alert
              alert(t('skills.maxCardsPerTypeAlert', 'Môžeš mať maximálne 3 karty v tejto sekcii.'));
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
          onModeSwitch={onSkillsModeToggle}
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
      const filteredTotal = filteredStandard.length + filteredCustom.length;

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
            if (filteredTotal >= MAX_SKILLS_PER_TYPE) {
              // eslint-disable-next-line no-alert
              alert(t('skills.maxCardsPerTypeAlert', 'Môžeš mať maximálne 3 karty v tejto sekcii.'));
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
          secondOptionText={t('skills.addWhatYouSeek', 'Pridaj čo hľadáš')}
          secondOptionHint={t(
            'skills.addWhatYouSeekHint',
            'Nastav si presne to, čo hľadáš, podľa vlastných predstáv.',
          )}
          onSecondOptionClick={() => {
            if (filteredTotal >= MAX_SKILLS_PER_TYPE) {
              // eslint-disable-next-line no-alert
              alert(t('skills.maxCardsPerTypeAlert', 'Môžeš mať maximálne 3 karty v tejto sekcii.'));
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
          onModeSwitch={onSkillsModeToggle}
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
        clearSkillsDescribeReturnModule();
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
            const returnModule = getSkillsDescribeReturnModule(selectedSkillsCategory.id);
            const mode =
              typeof window !== 'undefined'
                ? localStorage.getItem('skillsDescribeMode')
                : null;
            const target = returnModule || (mode === 'search' ? 'skills-search' : 'skills-offer');
            setActiveModule(target);
            try {
              localStorage.setItem('activeModule', target);
              if (returnModule) {
                clearSkillsDescribeReturnModule();
              }
            } catch {
              // ignore
            }
          }}
          initialDescription={selectedSkillsCategory.description}
          onDescriptionChange={(description) => {
            updateSelectedSkill({ description });
          }}
          initialDetailedDescription={selectedSkillsCategory.detailed_description}
          onDetailedDescriptionChange={(detailedDescription) => {
            updateSelectedSkill({ detailed_description: detailedDescription });
          }}
          initialTags={selectedSkillsCategory.tags || []}
          onTagsChange={(tags) => {
            updateSelectedSkill({ tags });
          }}
          initialDistrict={selectedSkillsCategory.district || ''}
          onDistrictChange={(district) => {
            updateSelectedSkill({ district });
          }}
          initialCountryCode={selectedSkillsCategory.country_code || ''}
          onCountryCodeChange={(countryCode) => {
            updateSelectedSkill({ country_code: countryCode });
          }}
          initialDistrictCode={selectedSkillsCategory.district_code || ''}
          onDistrictCodeChange={(districtCode) => {
            updateSelectedSkill({ district_code: districtCode });
          }}
          initialLocation={selectedSkillsCategory.location || ''}
          onLocationChange={(location) => {
            updateSelectedSkill({ location });
          }}
          initialExperience={selectedSkillsCategory.experience}
          onExperienceChange={(experience) => {
            updateSelectedSkill({ experience });
          }}
          initialPriceFrom={selectedSkillsCategory.price_from ?? null}
          initialPriceCurrency={selectedSkillsCategory.price_currency ?? '€'}
          initialPriceNegotiable={selectedSkillsCategory.price_negotiable === true}
          onPriceChange={(priceFrom, priceCurrency, priceNegotiable) => {
            updateSelectedSkill({
              price_from: priceNegotiable ? null : priceFrom,
              price_currency: priceNegotiable ? '' : priceCurrency,
              price_negotiable: priceNegotiable,
            });
          }}
          initialUrgency={selectedSkillsCategory.urgency || 'low'}
          onUrgencyChange={(urgency) => {
            updateSelectedSkill({ urgency, is_seeking: derivedIsSeeking });
          }}
          initialDurationType={selectedSkillsCategory.duration_type || null}
          onDurationTypeChange={(durationType) => {
            updateSelectedSkill({ duration_type: durationType, is_seeking: derivedIsSeeking });
          }}
          initialImages={selectedSkillsCategory.images || []}
          onImagesChange={(images) => {
            updateSelectedSkill({ _newImages: images });
          }}
          onExistingImagesChange={(existingImages) => {
            updateSelectedSkill({
              images: existingImages
                .filter(
                  (
                    img,
                  ): img is {
                    id: number;
                    image_url?: string | null;
                    image?: string | null;
                    order?: number;
                    status?: string | null;
                    rejected_reason?: string | null;
                  } => img.id !== undefined,
                )
                .map((img) => ({
                  id: img.id!,
                  image_url: img.image_url,
                  image: img.image,
                  order: img.order,
                  status: img.status,
                  rejected_reason: img.rejected_reason,
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
                  } catch (error: unknown) {
                    const msg = getApiErrorMessage(error, 'Odstránenie obrázka zlyhalo');
                    throw new Error(msg);
                  }
                }
              : undefined
          }
          initialOpeningHours={selectedSkillsCategory.opening_hours as OpeningHours | undefined}
          onOpeningHoursChange={(openingHours) => {
            updateSelectedSkill({ opening_hours: openingHours });
          }}
          initialIsHidden={selectedSkillsCategory.is_hidden || false}
          onIsHiddenChange={(isHidden) => {
            updateSelectedSkill({ is_hidden: isHidden });
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
              country_code: 'SK',
              district_code: '',
              price_currency: '€',
              price_negotiable: false,
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
              country_code: 'SK',
              district_code: '',
              price_currency: '€',
              price_negotiable: false,
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


