import type { SkillRequest } from './types';

function toPositiveInteger(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function hasHelpProposal(item: SkillRequest | null | undefined): boolean {
  if (!item) return false;
  const hasProposalDetails = Boolean(
    String(item.proposal_description || '').trim() ||
      item.proposal_price_from != null ||
      item.proposal_experience_value != null ||
      item.proposal_experience,
  );

  return Boolean(
    item.proposed_offer ||
      item.proposed_offer_summary ||
      hasProposalDetails ||
      item.offer_summary?.is_seeking ||
      item.offer_is_seeking,
  );
}

export function getLinkedProposedOfferId(item: SkillRequest | null | undefined): number | null {
  if (!item || item.proposed_offer_summary?.is_hidden === true) return null;
  return toPositiveInteger(item.proposed_offer_summary?.id ?? item.proposed_offer);
}

export function getRequesterProfileIdentifier(item: SkillRequest | null | undefined): string | null {
  if (!item) return null;
  const slug = String(item.requester_summary?.slug || '').trim();
  if (slug) return slug;

  const requesterId = toPositiveInteger(item.requester_summary?.id ?? item.requester);
  return requesterId !== null ? String(requesterId) : null;
}
