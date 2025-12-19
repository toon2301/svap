'use client';

import React from 'react';
import LocationSection from '../../../skills/skillDescriptionModal/sections/LocationSection';

interface LocationFieldProps {
  location: string;
  district: string;
  setLocation: (v: string) => void;
  setDistrict: (v: string) => void;
  onSave: () => void;
}

export default function LocationField({
  location,
  district,
  setLocation,
  setDistrict,
  onSave,
}: LocationFieldProps) {
  return (
    <div className="mb-4">
      <LocationSection
        value={location}
        onChange={setLocation}
        onBlur={onSave}
        error=""
        isSaving={false}
        district={district}
        onDistrictChange={setDistrict}
        onDistrictBlur={onSave}
        isSeeking={false}
      />
    </div>
  );
}

