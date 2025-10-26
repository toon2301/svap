'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Desktop from './notifications/Desktop';
import Mobile from './notifications/Mobile';

export default function NotificationsModule() {
  const { t } = useLanguage();
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
    turnOffAll: t('notifications.turnOffAll', 'Vypnúť všetko'),
    turnOffAllDesc: t('notifications.turnOffAllDesc', 'Dočasne vypnúť všetky upozornenia'),
    likes: t('notifications.likes', 'Páči sa mi to'),
    likesDesc: t('notifications.likesDesc', "Zapnite alebo vypnite upozornenia na 'Páči sa mi to'."),
    likesAndComments: t('notifications.likesAndComments', 'Páči sa mi to a komentáre'),
    likesAndCommentsDesc: t('notifications.likesAndCommentsDesc', 'Reakcie a komentáre na fotkách, kde ste označení'),
    comments: t('notifications.comments', 'Komentáre'),
    commentsDesc: t('notifications.commentsDesc', 'Zapnite alebo vypnite upozornenia na komentáre.'),
    likesForComments: t('notifications.likesForComments', 'Páči sa mi to pre komentáre'),
    likesForCommentsDesc: t('notifications.likesForCommentsDesc', "Zapnite alebo vypnite upozornenia na 'Páči sa mi to' pre komentáre."),
    skillRequest: t('notifications.skillRequest', 'Žiadosť o zručnosť'),
    skillRequestDesc: t('notifications.skillRequestDesc', 'Zapnite alebo vypnite upozornenia na žiadosti o zručnosť.'),
  };

  const labelsCommon = {
    off: t('notifications.off', 'Vypnuté'),
    on: t('notifications.on', 'Zapnuté'),
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
      <Desktop labels={labels as any} labelsCommon={labelsCommon} state={state} setState={setState} />
      <Mobile labels={labels as any} labelsCommon={labelsCommon} state={state} setState={setState} />
    </>
  );
}

