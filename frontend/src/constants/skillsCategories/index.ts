import { IT_A_TECHNOLOGIE } from './it';
import { REMESLA_A_VYROBA } from './crafts';
import { DOMACNOST_A_SLUZBY } from './household';
import { KRASA_A_ZDRAVIE } from './beauty';
import { HUDBA_A_VYSTUPENIA } from './music';
import { MARKETING_A_OBCHOD } from './marketing';
import { DOPRAVA_A_LOGISTIKA } from './transport';
import { ZVIERATA_A_PRIRODA } from './nature';
import { DOBROVOLNICTVO_A_KOMUNITA } from './volunteering';
import { ZABAVA_A_HRY } from './entertainment';
import { CESTOVANIE_A_ZAZITKY } from './travel';
import { FOOD_A_GASTRONOMIA } from './food';
import { OSOBNY_ROZVOJ_A_MENTORING } from './personal-development';
import { FINANCNE_A_PRAVNE_PORADENSTVO } from './finance-law';
import { FOTOGRAFIA_A_VIDEOGRAFIA } from './photography';
import { EVENTY_A_ORGANIZACIA_PODUJATI } from './events';
import { JAZYKOVE_SLUZBY_A_PREKLADY } from './languages';
import { ECOMMERCE_A_ONLINE_PREDAJ } from './ecommerce';
import { DOMACA_VYUKA_A_TUTORING } from './tutoring';
import { TECHNICKA_PODPORA_A_SERVIS } from './technical-support';
import { PSYCHOLOGIA_A_PORADENSTVO } from './psychology';
import { REKLAMA_A_PR } from './advertising';
import { KUTILSTVO_A_DIY_PROJEKTY } from './diy';
import { MODELARSTVO_A_HOBBY_TVORBA } from './modeling';
import { ZDRAVOTNA_STAROSTLIVOST_A_FIRST_AID } from './healthcare';
import { EKOLOGIA_A_UDRZATELNY_ZIVOT } from './ecology';
import { SOCIALNE_SIETE_A_DIGITALNY_OBSAH } from './social-media';

export const skillsCategories: Record<string, string[]> = {
  'IT a technológie': IT_A_TECHNOLOGIE,
  'Remeslá a výroba': REMESLA_A_VYROBA,
  'Domácnosť a služby': DOMACNOST_A_SLUZBY,
  'Krása a zdravie': KRASA_A_ZDRAVIE,
  'Hudba a vystúpenia': HUDBA_A_VYSTUPENIA,
  'Marketing a obchod': MARKETING_A_OBCHOD,
  'Doprava a logistika': DOPRAVA_A_LOGISTIKA,
  'Zvieratá a príroda': ZVIERATA_A_PRIRODA,
  'Dobrovoľníctvo a komunita': DOBROVOLNICTVO_A_KOMUNITA,
  'Zábava a hry': ZABAVA_A_HRY,
  'Cestovanie a zážitky': CESTOVANIE_A_ZAZITKY,
  'Food a gastronómia': FOOD_A_GASTRONOMIA,
  'Osobný rozvoj a mentoring': OSOBNY_ROZVOJ_A_MENTORING,
  'Finančné a právne poradenstvo': FINANCNE_A_PRAVNE_PORADENSTVO,
  'Fotografia a videografia': FOTOGRAFIA_A_VIDEOGRAFIA,
  'Eventy a organizácia podujatí': EVENTY_A_ORGANIZACIA_PODUJATI,
  'Jazykové služby a preklady': JAZYKOVE_SLUZBY_A_PREKLADY,
  'E-commerce a online predaj': ECOMMERCE_A_ONLINE_PREDAJ,
  'Domáca výuka a tutoring': DOMACA_VYUKA_A_TUTORING,
  'Technická podpora a servis': TECHNICKA_PODPORA_A_SERVIS,
  'Psychológia a poradenstvo': PSYCHOLOGIA_A_PORADENSTVO,
  'Reklama a PR': REKLAMA_A_PR,
  'Kutilstvo a DIY projekty': KUTILSTVO_A_DIY_PROJEKTY,
  'Modelárstvo a hobby tvorba': MODELARSTVO_A_HOBBY_TVORBA,
  'Zdravotná starostlivosť a first aid': ZDRAVOTNA_STAROSTLIVOST_A_FIRST_AID,
  'Ekológia a udržateľný život': EKOLOGIA_A_UDRZATELNY_ZIVOT,
  'Sociálne siete a digitálny obsah': SOCIALNE_SIETE_A_DIGITALNY_OBSAH,
};

export type SkillsCategoriesMap = typeof skillsCategories;


