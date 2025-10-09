'use client';

import React from 'react';
import { User } from '../../../../types';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface ProfileActivityProps {
  user: User;
}

interface ActivityItemProps {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  time: string;
}

function ActivityItem({ type, title, description, time }: ActivityItemProps) {
  const iconClasses = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
  };

  const Icon = {
    success: CheckCircleIcon,
    warning: ExclamationTriangleIcon,
    info: ClockIcon
  }[type];

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconClasses[type]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  );
}

export default function ProfileActivity({ user }: ProfileActivityProps) {
  // Mock data - in real app, this would come from API
  const activities = [
    {
      type: 'success' as const,
      title: 'Dokončená výmena',
      description: 'Vymenené React kurzy za Python základy',
      time: 'Pred 2 hodinami'
    },
    {
      type: 'info' as const,
      title: 'Nová ponuka',
      description: 'Ponúkol JavaScript mentoring',
      time: 'Pred 1 dňom'
    },
    {
      type: 'warning' as const,
      title: 'Čakajúca odpoveď',
      description: 'Odpoveď na ponuku Design review',
      time: 'Pred 3 dňami'
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Posledná aktivita</h3>
      
      <div className="space-y-1">
        {activities.map((activity, index) => (
          <ActivityItem
            key={index}
            type={activity.type}
            title={activity.title}
            description={activity.description}
            time={activity.time}
          />
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
          Zobraziť všetku aktivitu
        </button>
      </div>
    </div>
  );
}
