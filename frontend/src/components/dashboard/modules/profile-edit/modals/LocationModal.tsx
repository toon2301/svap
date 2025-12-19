'use client';

import React, { useState } from 'react';
import { User } from '@/types';
import { api } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import MobileFullScreenModal from '../shared/MobileFullScreenModal';
import LocationSection from '../../skills/skillDescriptionModal/sections/LocationSection';

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
  onUserUpdate 
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
      console.error('Chyba pri ukladaní lokality:', e);
      const errorMessage = e?.response?.data?.details?.location?.[0] || 
                          e?.response?.data?.details?.district?.[0] ||
                          e?.response?.data?.error || 
                          'Chyba pri ukladaní lokality';
      setLocationError(errorMessage);
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


