'use client';

import React from 'react';
import { User } from '../../../../types';
import { 
  CalendarDaysIcon, 
  UserGroupIcon, 
  StarIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

interface ProfileStatsProps {
  user: User;
}

interface StatItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color?: string;
}

function StatItem({ icon: Icon, label, value, color = 'text-gray-600' }: StatItemProps) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-2">
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {value}
      </div>
      <div className="text-sm text-gray-500">
        {label}
      </div>
    </div>
  );
}

export default function ProfileStats({ user }: ProfileStatsProps) {
  // Mock data - in real app, this would come from API
  const stats = {
    memberSince: user.date_joined ? new Date(user.date_joined).getFullYear() : 'N/A',
    completedSwaps: 12,
    rating: 4.8,
    responseTime: '< 2h'
  };

  return (
    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatItem
          icon={CalendarDaysIcon}
          label="Člen od"
          value={stats.memberSince}
          color="text-blue-600"
        />
        <StatItem
          icon={UserGroupIcon}
          label="Výmeny"
          value={stats.completedSwaps}
          color="text-green-600"
        />
        <StatItem
          icon={StarIcon}
          label="Hodnotenie"
          value={stats.rating}
          color="text-yellow-600"
        />
        <StatItem
          icon={ClockIcon}
          label="Odozva"
          value={stats.responseTime}
          color="text-purple-600"
        />
      </div>
    </div>
  );
}
