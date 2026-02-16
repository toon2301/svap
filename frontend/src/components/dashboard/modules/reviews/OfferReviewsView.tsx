'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { User } from '@/types';
import type { SearchUserResult } from '../search/types';
import type { Offer } from '../profile/profileOffersTypes';
import { slugifyLabel } from '../profile/profileOffersTypes';
import { AddReviewModal } from './AddReviewModal';
import { DeleteReviewConfirmModal } from './DeleteReviewConfirmModal';
import { ProfileOpeningHoursMobileModal } from '../profile/ProfileOpeningHoursMobileModal';
import { OfferReviewsDesktop } from './OfferReviewsDesktop';
import { OfferReviewsMobile } from './OfferReviewsMobile';
import type { Review } from './ReviewCard';

type OfferOwnerLike = {
  id?: number;
  display_name?: string | null;
  slug?: string | null;
  company_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type OfferDetailLike = Offer & {
  owner?: OfferOwnerLike | null;
  user_display_name?: string | null;
  user_id?: number | null;
  owner_user_type?: 'individual' | 'company' | null;
};

export type OfferReviewsViewProps = {
  /** ID karty (ponuky) z URL. null = neplatné/nezistené ID (fallback). */
  offerId: number | null;
  accountType?: 'personal' | 'business';
  /** Používateľ z dashboardu (prihlásený používateľ). */
  user?: User | null;
  /** Súhrn prezeraného používateľa (napr. pri zobrazení cudzieho profilu). */
  viewedUserSummary?: SearchUserResult | null;
};

function formatOwnerNameFromOfferOwner(owner?: OfferOwnerLike | null): string {
  if (!owner) return '';
  const company = (owner.company_name || '').trim();
  if (company) return company;
  const person = [owner.first_name, owner.last_name].filter(Boolean).join(' ').trim();
  if (person) return person;
  return owner.display_name || '';
}

type NameLike = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  company_name?: string | null;
};

function formatDashboardName(user?: NameLike | null): string {
  if (!user) return '';
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
}

export default function OfferReviewsView({
  offerId,
  accountType = 'personal',
  user: dashboardUser,
  viewedUserSummary,
}: OfferReviewsViewProps) {
  const { t } = useLanguage();
  const { user: authUser } = useAuth();
  const user = dashboardUser ?? authUser;
  const searchParams = useSearchParams();

  const [offer, setOffer] = useState<OfferDetailLike | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [isAddReviewModalOpen, setIsAddReviewModalOpen] = useState(false);
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  const [reviewToEdit, setReviewToEdit] = useState<Review | null>(null);
  const [reviewIdToDelete, setReviewIdToDelete] = useState<number | null>(null);
  const [isDeletingReview, setIsDeletingReview] = useState(false);

  useEffect(() => {
    if (offerId == null) {
      setOffer(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<OfferDetailLike>(endpoints.skills.detail(offerId))
      .then(({ data }) => {
        if (!cancelled) setOffer(data);
      })
      .catch(() => {
        if (!cancelled) setOffer(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  useEffect(() => {
    if (offerId == null) {
      setReviews([]);
      return;
    }
    let cancelled = false;
    setReviewsLoading(true);
    api
      .get<Review[]>(endpoints.reviews.list(offerId))
      .then(({ data }) => {
        if (!cancelled) setReviews(data);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  const isBusinessOwner = useMemo(() => {
    if (!offer || !user) return false;
    return offer.user_id === user.id || offer.owner?.id === user.id;
  }, [offer, user]);

  const isOwnOffer = isBusinessOwner;

  /** Jedna recenzia na používateľa – ak už má, tlačidlo „Pridať recenziu“ sa nezobrazí a ďalšiu pridať nemôže */
  const hasUserReviewed = useMemo(
    () => user?.id != null && reviews.some((r) => r.reviewer_id === user.id),
    [user?.id, reviews]
  );
  const canAddReview = !isOwnOffer && !hasUserReviewed;

  const displayName = useMemo(() => {
    if (!offer) return '';
    if (isBusinessOwner && offer.owner) {
      return formatOwnerNameFromOfferOwner(offer.owner);
    }
    return offer.user_display_name || formatDashboardName(offer as NameLike);
  }, [offer, isBusinessOwner]);

  const reviewerName = useMemo(() => {
    if (user) {
      if (accountType === 'business' && user.company_name) {
        return user.company_name;
      }
      return formatDashboardName(user) || user.email || '';
    }
    return '';
  }, [user, accountType]);

  const reviewerAvatarUrl = user?.avatar_url || null;

  const imageAlt = useMemo(() => {
    if (!offer) return '';
    const label = offer.category_label || '';
    const subcategory = offer.subcategory_label || '';
    return slugifyLabel(label, subcategory);
  }, [offer]);

  const locationText = useMemo(() => {
    if (!offer) return null;
    const parts: string[] = [];
    if (offer.district) parts.push(offer.district);
    if (offer.city) parts.push(offer.city);
    return parts.length > 0 ? parts.join(', ') : null;
  }, [offer]);

  const experienceText = useMemo(() => {
    if (!offer || !offer.experience_years) return null;
    const years = offer.experience_years;
    if (years === 1) return t('skills.experience.oneYear', '1 rok');
    if (years >= 2 && years <= 4) return t('skills.experience.years', `${years} roky`);
    return t('skills.experience.years', `${years} rokov`);
  }, [offer, t]);

  const priceLabel = useMemo(() => {
    if (!offer || offer.price_per_hour == null) return null;
    return `${offer.price_per_hour} €/${t('skills.perHour', 'hod')}`;
  }, [offer, t]);

  const headingText = useMemo(() => {
    if (!offer) return '';
    // Nadpis = názov ponuky (category/subcategory)
    const label = offer.category_label || '';
    const subcategory = offer.subcategory_label || '';
    return slugifyLabel(label, subcategory) || t('reviews.offerDetails', 'Detaily ponuky');
  }, [offer, t]);

  const todayKey = useMemo(() => {
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayIndex = new Date().getDay();
    const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    return dayNames[adjustedIndex] as keyof NonNullable<Offer['opening_hours']>;
  }, []);

  const todayHours = offer?.opening_hours?.[todayKey];
  const isOpenToday = todayHours?.enabled === true && (todayHours?.from || todayHours?.to);
  const todayHoursText = isOpenToday ? `${todayHours?.from ?? '—'} – ${todayHours?.to ?? '—'}` : null;

  return (
    <>
      {/* Mobilná verzia */}
      <div className="lg:hidden">
        <OfferReviewsMobile
          offer={offer}
          loading={loading}
          reviews={reviews}
          reviewsLoading={reviewsLoading}
          isOwnOffer={isOwnOffer}
          isBusinessOwner={isBusinessOwner}
          canAddReview={canAddReview}
          displayName={displayName}
          imageAlt={imageAlt}
          locationText={locationText}
          experienceText={experienceText}
          priceLabel={priceLabel}
          headingText={headingText}
          todayHoursText={todayHoursText}
          currentUserId={user?.id ?? null}
          onAddReviewClick={() => canAddReview && setIsAddReviewModalOpen(true)}
          onEditReview={(review) => {
            setReviewToEdit(review);
            setIsAddReviewModalOpen(true);
          }}
          onDeleteReviewClick={(reviewId) => setReviewIdToDelete(reviewId)}
          onOpenHoursClick={() => setIsHoursModalOpen(true)}
        />
      </div>

      {/* Desktop verzia */}
      <div className="hidden lg:block">
        <OfferReviewsDesktop
          offer={offer}
          loading={loading}
          reviews={reviews}
          reviewsLoading={reviewsLoading}
          isOwnOffer={isOwnOffer}
          isBusinessOwner={isBusinessOwner}
          canAddReview={canAddReview}
          displayName={displayName}
          imageAlt={imageAlt}
          locationText={locationText}
          experienceText={experienceText}
          priceLabel={priceLabel}
          headingText={headingText}
          todayHoursText={todayHoursText}
          currentUserId={user?.id ?? null}
          onAddReviewClick={() => setIsAddReviewModalOpen(true)}
          onEditReview={(review) => {
            setReviewToEdit(review);
            setIsAddReviewModalOpen(true);
          }}
          onDeleteReviewClick={(reviewId) => setReviewIdToDelete(reviewId)}
          onOpenHoursClick={() => setIsHoursModalOpen(true)}
        />
      </div>

      {/* Modaly - viditeľné na všetkých zariadeniach */}
      <DeleteReviewConfirmModal
        open={reviewIdToDelete !== null}
        onClose={() => setReviewIdToDelete(null)}
        isDeleting={isDeletingReview}
        onConfirm={async () => {
          if (reviewIdToDelete == null || offerId == null) return;
          setIsDeletingReview(true);
          try {
            await api.delete(endpoints.reviews.detail(reviewIdToDelete));
            const { data } = await api.get<Review[]>(endpoints.reviews.list(offerId));
            setReviews(data);
            setReviewIdToDelete(null);
          } catch (error: any) {
            console.error('Chyba pri vymazávaní recenzie:', error);
            alert(error?.response?.data?.error || 'Nepodarilo sa vymazať recenziu.');
          } finally {
            setIsDeletingReview(false);
          }
        }}
      />

      <AddReviewModal
        key={reviewToEdit?.id || 'new-review'}
        open={isAddReviewModalOpen}
        onClose={() => {
          setIsAddReviewModalOpen(false);
          setReviewToEdit(null);
        }}
        reviewerName={reviewerName}
        reviewerAvatarUrl={reviewerAvatarUrl}
        reviewToEdit={reviewToEdit}
        onSubmit={async (rating, text, pros, cons) => {
          if (offerId == null) {
            throw new Error('Chýba ID ponuky');
          }
          
          // Validácia ratingu
          if (rating === 0 || rating < 0 || rating > 5) {
            throw new Error('Prosím, vyber hodnotenie (hviezdičky).');
          }
          
          try {
            if (reviewToEdit) {
              // Edit mode - PUT/PATCH
              await api.patch(endpoints.reviews.detail(reviewToEdit.id), {
                rating: Number(rating),
                text: text.trim(),
                pros: pros.filter((p) => p.trim().length > 0),
                cons: cons.filter((c) => c.trim().length > 0),
              });
            } else {
              // Create mode - POST
              await api.post(endpoints.reviews.list(offerId), {
                rating: Number(rating),
                text: text.trim(),
                pros: pros.filter((p) => p.trim().length > 0),
                cons: cons.filter((c) => c.trim().length > 0),
              });
            }
            
            // Obnoviť zoznam recenzií
            const { data } = await api.get<Review[]>(endpoints.reviews.list(offerId));
            setReviews(data);
            setIsAddReviewModalOpen(false);
            setReviewToEdit(null);
            
            return { success: true };
          } catch (error: any) {
            console.error('Chyba pri ukladaní recenzie:', error);
            const errorMessage =
              error?.response?.data?.error ||
              error?.response?.data?.rating?.[0] ||
              error?.response?.data?.pros?.[0] ||
              error?.response?.data?.cons?.[0] ||
              error?.response?.data?.text?.[0] ||
              error?.message ||
              (reviewToEdit ? 'Nepodarilo sa upraviť recenziu.' : 'Nepodarilo sa pridať recenziu. Skús to znova.');
            throw new Error(errorMessage);
          }
        }}
      />

      {isHoursModalOpen && (
        <ProfileOpeningHoursMobileModal hours={offer?.opening_hours ?? null} onClose={() => setIsHoursModalOpen(false)} />
      )}
    </>
  );
}
