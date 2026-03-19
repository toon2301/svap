'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';
import LocationSection from '../../skills/skillDescriptionModal/sections/LocationSection';
import { getApiErrorMessage } from '../../requests/requestsApi';

interface LocationModalProps {
  isOpen: boolean;
  location: string;
  district: string;
  originalLocation: string;
  originalDistrict: string;
  setLocation: (v: string) => void;
  setDistrict: (v: string) => void;
  setOriginalLocation?: (v: string) => void;
  setOriginalDistrict?: (v: string) => void;
  onClose: () => void;
  onUserUpdate?: (u: User) => void;
  onEditableUserUpdate?: (partial: Partial<User>) => void;
}

export default function LocationModal({ 
  isOpen, 
  location, 
  district,
  originalLocation, 
  originalDistrict,
  setLocation, 
  setDistrict,
  setOriginalLocation, 
  setOriginalDistrict,
  onClose, 
  onUserUpdate,
  onEditableUserUpdate
}: LocationModalProps) {
  const { t } = useLanguage();
  const [locationError, setLocationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const locTrimmed = location.trim();
    const districtTrimmed = (district || '').trim();
    
    // Ak sa nič nezmenilo, len zatvor modal
    if (locTrimmed === originalLocation && districtTrimmed === originalDistrict) {
      onClose();
      return;
    }

    if (onEditableUserUpdate) {
      onEditableUserUpdate({ location: locTrimmed, district: districtTrimmed });
      setOriginalLocation?.(locTrimmed);
      setOriginalDistrict?.(districtTrimmed);
      onClose();
      return;
    }

    setIsSaving(true);
    setLocationError('');

    try {
      const response = await api.patch('/auth/profile/', {
        location: locTrimmed,
        district: districtTrimmed,
      });
      
      if (onUserUpdate && response.data?.user) {
        onUserUpdate(response.data.user);
      }
      
      setOriginalLocation && setOriginalLocation(locTrimmed);
      setOriginalDistrict && setOriginalDistrict(districtTrimmed);
      onClose();
    } catch (e: any) {
      const data = e?.response?.data;
      const details = data?.details;
      const errorMessage = details?.location?.[0] || details?.district?.[0] ||
        getApiErrorMessage(e, t('profile.locationSaveFailed', 'Lokalitu sa nepodarilo uložiť.'));
      toast.error(typeof errorMessage === 'string' ? errorMessage : t('profile.locationSaveFailed', 'Lokalitu sa nepodarilo uložiť.'));
      setLocationError(''); // Bez červeného textu pod poliami – stačí toast hore
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    setLocation(originalLocation);
    setDistrict(originalDistrict);
    setLocationError('');
    onClose();
  };

  const handleLocationBlur = () => {
    // V mobile modale nechceme auto-save pri blur, len pri kliknutí na Uložiť
  };

  return (
    <MobileFullScreenModal isOpen={isOpen} title={t('profile.location', 'Lokalita')} onBack={handleBack} onSave={handleSave}>
      <LocationSection
        value={location}
        onChange={(val) => {
          setLocation(val);
          setLocationError('');
        }}
        onBlur={handleLocationBlur}
        error={locationError}
        isSaving={isSaving}
        district={district}
        onDistrictChange={(val) => {
          setDistrict(val);
          setLocationError('');
        }}
        onDistrictBlur={() => {
          // V mobile modale nechceme auto-save pri blur
        }}
        isSeeking={false}
      />
    </MobileFullScreenModal>
  );
}


