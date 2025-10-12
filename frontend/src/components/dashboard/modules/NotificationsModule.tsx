'use client';

import { BellIcon, InboxIcon } from '@heroicons/react/24/outline';

export default function NotificationsModule() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upozornenia</h2>
        <p className="text-gray-600">Vaše notifikácie a upozornenia</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <BellIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Žiadne upozornenia</h3>
        <p className="text-gray-500 mb-6">
          Keď sa niečo dôležité stane, dostanete upozornenie tu
        </p>
        <div className="inline-flex items-center text-sm text-purple-600">
          <InboxIcon className="w-5 h-5 mr-2" />
          <span>Funkcia upozornení bude dostupná čoskoro</span>
        </div>
      </div>
    </div>
  );
}

