'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { HeartIcon, UserIcon, StarIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

interface FavoriteUser {
  id: number;
  name: string;
  avatar?: string;
  skills: string[];
  location: string;
  rating: number;
  isOnline: boolean;
}

export default function FavoritesModule() {
  const [favoriteUsers, setFavoriteUsers] = useState<FavoriteUser[]>([
    // Mock data - v budúcnosti sa načítajú z API
    {
      id: 1,
      name: 'Jana Nováková',
      skills: ['React', 'TypeScript', 'UI/UX'],
      location: 'Bratislava',
      rating: 4.8,
      isOnline: true,
    },
    {
      id: 2,
      name: 'Peter Kováč',
      skills: ['Python', 'Django', 'Machine Learning'],
      location: 'Košice',
      rating: 4.6,
      isOnline: false,
    },
  ]);

  const [activeTab, setActiveTab] = useState<'users' | 'skills'>('users');

  const removeFromFavorites = (userId: number) => {
    setFavoriteUsers(favoriteUsers.filter(user => user.id !== userId));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Oblúbené
        </h2>
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'users'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserIcon className="w-4 h-4 inline mr-2" />
            Používatelia
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'skills'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <StarIcon className="w-4 h-4 inline mr-2" />
            Zručnosti
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'users' ? (
        <div className="space-y-4">
          {favoriteUsers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <HeartIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Žiadni obľúbení používatelia
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Pridajte používateľov do obľúbených kliknutím na srdiečko
              </p>
            </div>
          ) : (
            favoriteUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      {user.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {user.name}
                        </h3>
                        <div className="flex items-center space-x-1">
                          <StarSolidIcon className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm text-gray-600">{user.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{user.location}</p>
                      <div className="flex flex-wrap gap-2">
                        {user.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                      <HeartSolidIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => removeFromFavorites(user.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <StarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Žiadne obľúbené zručnosti
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Pridajte zručnosti do obľúbených pre rýchlejšie vyhľadávanie
          </p>
        </div>
      )}
    </motion.div>
  );
}
