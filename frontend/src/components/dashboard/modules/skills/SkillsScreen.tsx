'use client';

import React from 'react';

interface SkillsScreenProps {
  title: string;
}

export default function SkillsScreen({ title }: SkillsScreenProps) {
  return (
    <div className="text-[var(--foreground)]">
      <div className="hidden lg:flex items-start justify-center">
        <div className="flex flex-col items-start w-full max-w-3xl mx-auto">
          <div className="w-full ml-8 lg:ml-12">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">{title}</h2>
          </div>
          <div className="mt-6 w-full"><div className="border-t border-gray-200 dark:border-gray-700" /></div>
          <div className="w-full ml-8 lg:ml-12 py-10 text-gray-500 dark:text-gray-400" />
        </div>
      </div>
    </div>
  );
}


