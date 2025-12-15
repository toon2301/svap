'use client';

import React from 'react';
import SkillsDescriptionMobileLayout from './SkillsDescriptionMobileLayout';
import SkillsDescriptionMobileModals from './SkillsDescriptionMobileModals';
import { useSkillsDescriptionScreenState } from './skillDescriptionModal/hooks/useSkillsDescriptionScreenState';
import type { SkillsDescriptionScreenProps } from './skillDescriptionModal/types';

export default function SkillsDescriptionScreen(props: SkillsDescriptionScreenProps) {
  const state = useSkillsDescriptionScreenState(props);

  return (
    <div className="text-[var(--foreground)]">
      <SkillsDescriptionMobileLayout
        category={props.category}
        subcategory={props.subcategory}
        state={state}
      />
      <SkillsDescriptionMobileModals state={state} />
      {/* Desktop layout - hidden */}
      <div className="hidden lg:block" />
    </div>
  );
}


