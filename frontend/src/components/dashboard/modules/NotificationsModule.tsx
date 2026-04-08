'use client';

import { useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';

import Desktop from './notifications/Desktop';
import Mobile from './notifications/Mobile';
import { usePushMessagesPreference } from './notifications/usePushMessagesPreference';

export default function NotificationsModule() {
  const { t } = useLanguage();
  const pushMessages = usePushMessagesPreference();

  const [masterToggleEnabled, setMasterToggleEnabled] = useState(false);
  const [likesEnabled, setLikesEnabled] = useState(false);
  const [likesCommentsEnabled, setLikesCommentsEnabled] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(false);
  const [likesForCommentsEnabled, setLikesForCommentsEnabled] = useState(false);
  const [skillRequestEnabled, setSkillRequestEnabled] = useState(false);

  const [previousStates, setPreviousStates] = useState({
    likes: false,
    likesComments: false,
    comments: false,
    likesForComments: false,
    skillRequest: false,
  });

  const handleMasterToggleChange = (enabled: boolean) => {
    if (enabled) {
      setPreviousStates({
        likes: likesEnabled,
        likesComments: likesCommentsEnabled,
        comments: commentsEnabled,
        likesForComments: likesForCommentsEnabled,
        skillRequest: skillRequestEnabled,
      });
      setLikesEnabled(false);
      setLikesCommentsEnabled(false);
      setCommentsEnabled(false);
      setLikesForCommentsEnabled(false);
      setSkillRequestEnabled(false);
    } else {
      setLikesEnabled(previousStates.likes);
      setLikesCommentsEnabled(previousStates.likesComments);
      setCommentsEnabled(previousStates.comments);
      setLikesForCommentsEnabled(previousStates.likesForComments);
      setSkillRequestEnabled(previousStates.skillRequest);
    }
    setMasterToggleEnabled(enabled);
  };

  const labels = {
    title: t('notifications.title', 'Upozornenia'),
    turnOffAll: t('notifications.turnOffAll', 'Vypnut vsetko'),
    turnOffAllDesc: t(
      'notifications.turnOffAllDesc',
      'Docasne vypnut vsetky upozornenia',
    ),
    loadingPreferences: t(
      'notifications.loadingPreferences',
      'Nacitam nastavenia upozorneni...',
    ),
    messagesPush: t(
      'notifications.messagesPush',
      'Správy',
    ),
    messagesPushDesc: t(
      'notifications.messagesPushDesc',
      'Zapnite alebo vypnite upozornenia na  spravy, ked nie ste v aktivnom chate.',
    ),
    likes: t('notifications.likes', 'Paci sa mi to'),
    likesDesc: t(
      'notifications.likesDesc',
      "Zapnite alebo vypnite upozornenia na 'Paci sa mi to'.",
    ),
    likesAndComments: t(
      'notifications.likesAndComments',
      'Paci sa mi to a komentare',
    ),
    likesAndCommentsDesc: t(
      'notifications.likesAndCommentsDesc',
      'Reakcie a komentare na fotkach, kde ste oznaceni',
    ),
    comments: t('notifications.comments', 'Komentare'),
    commentsDesc: t(
      'notifications.commentsDesc',
      'Zapnite alebo vypnite upozornenia na komentare.',
    ),
    likesForComments: t(
      'notifications.likesForComments',
      'Paci sa mi to pre komentare',
    ),
    likesForCommentsDesc: t(
      'notifications.likesForCommentsDesc',
      "Zapnite alebo vypnite upozornenia na 'Paci sa mi to' pre komentare.",
    ),
    skillRequest: t('notifications.skillRequest', 'Ziadost o zrucnost'),
    skillRequestDesc: t(
      'notifications.skillRequestDesc',
      'Zapnite alebo vypnite upozornenia na ziadosti o zrucnost.',
    ),
  };

  const labelsCommon = {
    off: t('notifications.off', 'Vypnute'),
    on: t('notifications.on', 'Zapnute'),
  };

  const state = {
    master: masterToggleEnabled,
    likes: likesEnabled,
    likesComments: likesCommentsEnabled,
    comments: commentsEnabled,
    likesForComments: likesForCommentsEnabled,
    skillRequest: skillRequestEnabled,
  };

  const setState = {
    setMaster: handleMasterToggleChange,
    setLikes: setLikesEnabled,
    setLikesComments: setLikesCommentsEnabled,
    setComments: setCommentsEnabled,
    setLikesForComments: setLikesForCommentsEnabled,
    setSkillRequest: setSkillRequestEnabled,
  };

  return (
    <>
      <Desktop
        labels={labels}
        labelsCommon={labelsCommon}
        state={state}
        setState={setState}
        pushMessages={pushMessages}
      />
      <Mobile
        labels={labels}
        labelsCommon={labelsCommon}
        state={state}
        setState={setState}
        pushMessages={pushMessages}
      />
    </>
  );
}
