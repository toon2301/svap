'use client';

import React from 'react';
import { User } from '../../../../types';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

interface ProfileSkillsProps {
  user: User;
}

interface SkillItemProps {
  skill: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

function SkillItem({ skill, level }: SkillItemProps) {
  const levelColors = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800'
  };

  const levelLabels = {
    beginner: 'Začiatočník',
    intermediate: 'Pokročilý',
    advanced: 'Expert'
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="font-medium text-gray-900">{skill}</span>
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${levelColors[level]}`}>
        {levelLabels[level]}
      </span>
    </div>
  );
}

export default function ProfileSkills({ user }: ProfileSkillsProps) {
  // Mock data - in real app, this would come from API
  const skills = [
    { skill: 'JavaScript', level: 'advanced' as const },
    { skill: 'React', level: 'intermediate' as const },
    { skill: 'Python', level: 'beginner' as const },
    { skill: 'Design', level: 'intermediate' as const }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <WrenchScrewdriverIcon className="w-5 h-5 text-gray-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Zručnosti</h3>
      </div>
      
      <div className="space-y-2">
        {skills.length > 0 ? (
          skills.map((skill, index) => (
            <SkillItem
              key={index}
              skill={skill.skill}
              level={skill.level}
            />
          ))
        ) : (
          <p className="text-gray-500 italic text-center py-4">
            Žiadne zručnosti nie sú pridané.
          </p>
        )}
      </div>
    </div>
  );
}
