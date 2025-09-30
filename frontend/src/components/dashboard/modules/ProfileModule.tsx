'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { 
  UserIcon, 
  PencilIcon, 
  CameraIcon,
  MapPinIcon,
  GlobeAltIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

interface ProfileModuleProps {
  user: User;
  onEditProfile?: () => void;
}

export default function ProfileModule({ user, onEditProfile }: ProfileModuleProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditClick = () => {
    if (onEditProfile) {
      onEditProfile();
    } else {
      setIsEditing(!isEditing);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.first_name}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-purple-600" />
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-white border-2 border-purple-200 rounded-full hover:bg-purple-50 transition-colors">
                <CameraIcon className="w-4 h-4 text-purple-600" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </h2>
                {user.is_verified && (
                  <div className="flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Overený
                  </div>
                )}
              </div>
              
              <p className="text-gray-600 mb-4">
                @{user.username} • {user.user_type === 'individual' ? 'Jednotlivec' : user.user_type === 'company' ? 'Firma' : 'Škola'}
              </p>

              {user.bio && (
                <p className="text-gray-700 mb-4">{user.bio}</p>
              )}

              {/* Contact Info */}
              <div className="space-y-2">
                {user.location && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPinIcon className="w-4 h-4 mr-2" />
                    {user.location}
                  </div>
                )}
                {user.website && (
                  <div className="flex items-center text-sm text-gray-600">
                    <GlobeAltIcon className="w-4 h-4 mr-2" />
                    <a href={user.website} target="_blank" rel="noopener noreferrer" className="hover:text-purple-600">
                      {user.website}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Edit Button */}
          <button
            onClick={handleEditClick}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Upraviť profil
          </button>
        </div>
      </div>

      {/* Profile Completeness */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Kompletnosť profilu
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Celková kompletnosť
            </span>
            <span className="text-sm text-purple-600">
              {user.profile_completeness}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${user.profile_completeness}%` }}
            ></div>
          </div>
          {user.profile_completeness < 100 && (
            <p className="text-xs text-gray-500">
              Dokončite svoj profil pre lepšiu viditeľnosť a viac možností
            </p>
          )}
        </div>
      </div>

      {/* Social Links */}
      {(user.linkedin || user.facebook || user.instagram) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sociálne siete
          </h3>
          <div className="flex space-x-4">
            {user.linkedin && (
              <a
                href={user.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                LinkedIn
              </a>
            )}
            {user.facebook && (
              <a
                href={user.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Facebook
              </a>
            )}
            {user.instagram && (
              <a
                href={user.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Instagram
              </a>
            )}
          </div>
        </div>
      )}

      {/* Skills Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Moje zručnosti
          </h3>
          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            Pridať zručnosť
          </button>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-gray-500">Zatiaľ nemáte pridané žiadne zručnosti</p>
        </div>
      </div>
    </motion.div>
  );
}
