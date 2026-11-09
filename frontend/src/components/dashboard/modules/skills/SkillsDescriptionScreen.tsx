'use client';

import React from 'react';
import SkillsDescriptionMobileLayout from './SkillsDescriptionMobileLayout';
import SkillsDescriptionMobileModals from './SkillsDescriptionMobileModals';
import { useSkillsDescriptionScreenState } from './skillDescriptionModal/hooks/useSkillsDescriptionScreenState';
import { useStableScreenProps } from './skillDescriptionModal/hooks/useStableScreenProps';
import type { SkillsDescriptionScreenProps } from './skillDescriptionModal/types';

export default function SkillsDescriptionScreen(props: SkillsDescriptionScreenProps) {
  // Smerovač odovzdáva pri každom prekreslení nové pole tagov a nové funkcie; hook obrazovky dostane stabilné vstupy.
  const state = useSkillsDescriptionScreenState(useStableScreenProps(props));

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


