'use client';

import { PlusCircleIcon, DocumentTextIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CreateModule() {
  const { t } = useLanguage();
  const createOptions = [
    {
      id: 'post',
      icon: DocumentTextIcon,
      title: t('create.post', 'Príspevok'),
      description: t('create.postDesc', 'Zdieľajte svoje myšlienky a skúsenosti'),
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100'
    },
    {
      id: 'offer',
      icon: PlusCircleIcon,
      title: t('create.offer', 'Ponuka'),
      description: t('create.offerDesc', 'Ponúknite svoje zručnosti'),
      color: 'bg-green-50 text-green-600 hover:bg-green-100'
    },
    {
      id: 'request',
      icon: PlusCircleIcon,
      title: t('create.request', 'Požiadavka'),
      description: t('create.requestDesc', 'Hľadajte zručnosti, ktoré potrebujete'),
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100'
    },
    {
      id: 'photo',
      icon: PhotoIcon,
      title: t('create.photo', 'Fotka'),
      description: t('create.photoDesc', 'Nahrajte fotku alebo obrázok'),
      color: 'bg-pink-50 text-pink-600 hover:bg-pink-100'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('create.title', 'Vytvoriť')}</h2>
        <p className="text-gray-600">{t('create.subtitle', 'Čo chcete pridať?')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {createOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              className={`${option.color} p-6 rounded-xl border-2 border-transparent hover:border-current transition-all text-left`}
            >
              <Icon className="w-8 h-8 mb-3" />
              <h3 className="font-semibold text-lg mb-1">{option.title}</h3>
              <p className="text-sm opacity-75">{option.description}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <p className="text-gray-400 text-sm">{t('create.soon', 'Funkcia vytvárania obsahu bude dostupná čoskoro')}</p>
      </div>
    </div>
  );
}

