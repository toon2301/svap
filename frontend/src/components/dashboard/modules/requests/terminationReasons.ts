import type { SkillRequestTerminationReason } from './types';

export const TERMINATION_REASON_OPTIONS: Array<{
  value: SkillRequestTerminationReason;
  labelKey: string;
  defaultLabel: string;
}> = [
  {
    value: 'no_response',
    labelKey: 'requests.terminationReasonNoResponse',
    defaultLabel: 'Druhá strana nereaguje',
  },
  {
    value: 'no_time',
    labelKey: 'requests.terminationReasonNoTime',
    defaultLabel: 'Nemám čas pokračovať',
  },
  {
    value: 'changed_circumstances',
    labelKey: 'requests.terminationReasonChangedCircumstances',
    defaultLabel: 'Zmena okolností',
  },
  {
    value: 'could_not_agree',
    labelKey: 'requests.terminationReasonCouldNotAgree',
    defaultLabel: 'Nepodarilo sa dohodnúť',
  },
  {
    value: 'communication_issue',
    labelKey: 'requests.terminationReasonCommunicationIssue',
    defaultLabel: 'Nie som spokojný s komunikáciou',
  },
  {
    value: 'meeting_not_happened',
    labelKey: 'requests.terminationReasonMeetingNotHappened',
    defaultLabel: 'Stretnutie / realizácia neprebehla',
  },
  {
    value: 'trust_concerns',
    labelKey: 'requests.terminationReasonTrustConcerns',
    defaultLabel: 'Mám obavy z dôveryhodnosti',
  },
  {
    value: 'other',
    labelKey: 'requests.terminationReasonOther',
    defaultLabel: 'Iné',
  },
];

export function getTerminationReasonLabel(
  reason: unknown,
  t: (key: string, defaultValue?: string) => string,
): string {
  if (reason === 'interaction_unavailable') {
    return t(
      'requests.terminationReasonInteractionUnavailable',
      'Interakcia už nie je dostupná',
    );
  }
  const option = TERMINATION_REASON_OPTIONS.find((item) => item.value === reason);
  if (!option) return '';
  return t(option.labelKey, option.defaultLabel);
}
