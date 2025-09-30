'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User } from '@/types';
import { 
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  EyeIcon,
  GlobeAltIcon,
  KeyIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface SettingsModuleProps {
  user: User;
}

export default function SettingsModule({ user }: SettingsModuleProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'notifications' | 'security' | 'account'>('general');
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    profileVisibility: 'public' as 'public' | 'private',
    showEmail: false,
    showPhone: false,
    twoFactorAuth: false,
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'general', label: 'Všeobecné', icon: Cog6ToothIcon },
    { id: 'privacy', label: 'Súkromie', icon: EyeIcon },
    { id: 'notifications', label: 'Upozornenia', icon: BellIcon },
    { id: 'security', label: 'Bezpečnosť', icon: ShieldCheckIcon },
    { id: 'account', label: 'Účet', icon: KeyIcon },
  ];

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
          Nastavenia
        </h2>
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Všeobecné nastavenia</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jazyk
                </label>
                <select className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                  <option>Slovenčina</option>
                  <option>English</option>
                  <option>Čeština</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Časová zóna
                </label>
                <select className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                  <option>Europe/Bratislava (GMT+1)</option>
                  <option>Europe/Prague (GMT+1)</option>
                  <option>UTC (GMT+0)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téma
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input type="radio" name="theme" value="light" defaultChecked className="mr-2" />
                    Svetlá
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="theme" value="dark" className="mr-2" />
                    Tmavá
                  </label>
                  <label className="flex items-center">
                    <input type="radio" name="theme" value="auto" className="mr-2" />
                    Automatická
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Nastavenia súkromia</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Viditeľnosť profilu
                  </label>
                  <p className="text-xs text-gray-500">
                    Kto môže vidieť váš profil
                  </p>
                </div>
                <select 
                  value={settings.profileVisibility}
                  onChange={(e) => handleSettingChange('profileVisibility', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="public">Verejný</option>
                  <option value="private">Súkromný</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Zobraziť email
                  </label>
                  <p className="text-xs text-gray-500">
                    Zobraziť email v profile
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showEmail}
                  onChange={(e) => handleSettingChange('showEmail', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Zobraziť telefón
                  </label>
                  <p className="text-xs text-gray-500">
                    Zobraziť telefónne číslo v profile
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showPhone}
                  onChange={(e) => handleSettingChange('showPhone', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Upozornenia</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Email upozornenia
                  </label>
                  <p className="text-xs text-gray-500">
                    Dostávať upozornenia na email
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Push upozornenia
                  </label>
                  <p className="text-xs text-gray-500">
                    Dostávať push upozornenia v prehliadači
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Bezpečnosť</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Dvojfaktorová autentifikácia
                  </label>
                  <p className="text-xs text-gray-500">
                    Pridať dodatočnú bezpečnosť k účtu
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.twoFactorAuth}
                  onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                  Zmeniť heslo
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Správa účtu</h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-2">
                  Nebezpečná zóna
                </h4>
                <p className="text-sm text-red-600 mb-4">
                  Tieto akcie sú nevratné. Buďte opatrní.
                </p>
                <button className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Vymazať účet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
