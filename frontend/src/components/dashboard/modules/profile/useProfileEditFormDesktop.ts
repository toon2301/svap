'use client';

import { useEffect, useState, useCallback } from 'react';
import type { User } from '@/types';

interface UseProfileEditFormDesktopParams {
  /** Source of truth - používa sa pre UserAvatar (read-only). */
  user: User;
  /** Working copy pre edit - všetky zmeny idú sem. */
  editableUser: User;
  onEditableUserUpdate: (partial: Partial<User>) => void;
  onEditSave?: (mergedUser?: User) => Promise<void>;
  onEditCancel?: () => void;
  onPhotoUpload?: (file: File) => void;
  onRemoveAvatar?: () => Promise<void>;
}

export function useProfileEditFormDesktop({
  user,
  editableUser,
  onEditableUserUpdate,
  onEditSave,
  onEditCancel,
  onPhotoUpload,
  onRemoveAvatar,
}: UseProfileEditFormDesktopParams) {
  const [firstName, setFirstName] = useState(editableUser.first_name || '');
  const [lastName, setLastName] = useState(editableUser.last_name || '');
  const [bio, setBio] = useState(editableUser.bio || '');
  const [location, setLocation] = useState(editableUser.location || '');
  const [district, setDistrict] = useState(editableUser.district || '');
  const [ico, setIco] = useState(editableUser.ico || '');
  const [icoVisible, setIcoVisible] = useState(editableUser.ico_visible || false);
  const [phone, setPhone] = useState(editableUser.phone || '');
  const [phoneVisible, setPhoneVisible] = useState(editableUser.phone_visible || false);
  const [profession, setProfession] = useState(editableUser.job_title || '');
  const [professionVisible, setProfessionVisible] = useState(
    editableUser.job_title_visible || false,
  );
  const [website, setWebsite] = useState(editableUser.website || '');
  const [additionalWebsites, setAdditionalWebsites] = useState<string[]>(
    editableUser.additional_websites || [],
  );
  const [contactEmail, setContactEmail] = useState(editableUser.contact_email || '');
  const [contactEmailVisible, setContactEmailVisible] = useState(
    editableUser.contact_email_visible ?? false,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Synchronizácia stavu z editableUser (napr. po fotke z parent)
  useEffect(() => {
    setFirstName(editableUser.first_name || '');
    setLastName(editableUser.last_name || '');
    setBio(editableUser.bio || '');
    setLocation(editableUser.location || '');
    setDistrict(editableUser.district || '');
    setIco(editableUser.ico || '');
    setIcoVisible(editableUser.ico_visible || false);
    setPhone(editableUser.phone || '');
    setPhoneVisible(editableUser.phone_visible || false);
    setProfession(editableUser.job_title || '');
    setProfessionVisible(editableUser.job_title_visible || false);
    setWebsite(editableUser.website || '');
    setAdditionalWebsites(editableUser.additional_websites || []);
    setContactEmail(editableUser.contact_email || '');
    if (typeof editableUser.contact_email_visible === 'boolean') {
      setContactEmailVisible(editableUser.contact_email_visible);
    }
  }, [
    editableUser.first_name,
    editableUser.last_name,
    editableUser.bio,
    editableUser.location,
    editableUser.district,
    editableUser.ico,
    editableUser.ico_visible,
    editableUser.phone,
    editableUser.phone_visible,
    editableUser.job_title,
    editableUser.job_title_visible,
    editableUser.website,
    editableUser.additional_websites,
    editableUser.contact_email,
    editableUser.contact_email_visible,
  ]);

  const syncFullName = useCallback(() => {
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();
    const fullNameForCompany = (f && l ? `${f} ${l}` : f || l).trim();
    onEditableUserUpdate({
      first_name: f,
      last_name: l,
      company_name: fullNameForCompany,
    });
  }, [firstName, lastName, onEditableUserUpdate]);

  const handleFullNameBlur = useCallback(() => {
    syncFullName();
  }, [syncFullName]);

  const handleBioSave = useCallback(() => {
    onEditableUserUpdate({ bio: bio.trim() });
  }, [bio, onEditableUserUpdate]);

  const handleLocationSave = useCallback(() => {
    onEditableUserUpdate({
      location: location.trim(),
      district: (district || '').trim(),
    });
  }, [location, district, onEditableUserUpdate]);

  const handleIcoSave = useCallback(() => {
    const icoCleaned = ico.replace(/\s/g, '').trim();
    onEditableUserUpdate({ ico: icoCleaned });
  }, [ico, onEditableUserUpdate]);

  const handleIcoVisibleToggle = useCallback(() => {
    const newValue = !icoVisible;
    setIcoVisible(newValue);
    onEditableUserUpdate({ ico_visible: newValue });
  }, [icoVisible, onEditableUserUpdate]);

  const handlePhoneSave = useCallback(() => {
    onEditableUserUpdate({ phone: phone.trim() });
  }, [phone, onEditableUserUpdate]);

  const handlePhoneVisibleToggle = useCallback(() => {
    const newValue = !phoneVisible;
    setPhoneVisible(newValue);
    onEditableUserUpdate({ phone_visible: newValue });
  }, [phoneVisible, onEditableUserUpdate]);

  const handleProfessionSave = useCallback(() => {
    onEditableUserUpdate({ job_title: profession.trim() });
  }, [profession, onEditableUserUpdate]);

  const handleProfessionVisibleToggle = useCallback(() => {
    const newValue = !professionVisible;
    setProfessionVisible(newValue);
    onEditableUserUpdate({ job_title_visible: newValue });
  }, [professionVisible, onEditableUserUpdate]);

  const handleContactEmailSave = useCallback(() => {
    onEditableUserUpdate({
      contact_email: contactEmail.trim(),
      contact_email_visible: contactEmailVisible,
    });
  }, [contactEmail, contactEmailVisible, onEditableUserUpdate]);

  const handleContactEmailVisibleToggle = useCallback(() => {
    const newValue = !contactEmailVisible;
    setContactEmailVisible(newValue);
    onEditableUserUpdate({ contact_email_visible: newValue });
  }, [contactEmailVisible, onEditableUserUpdate]);

  const handlePhotoUploadClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = (input.files ?? [])[0];
      if (file && onPhotoUpload) {
        onPhotoUpload(file);
      }
    };
    input.click();
  }, [onPhotoUpload]);

  const handleAvatarClick = useCallback(() => {
    setIsActionsOpen(true);
  }, []);

  const handlePhotoUpload = useCallback(
    async (file: File) => {
      if (!onPhotoUpload) return;
      onPhotoUpload(file);
      setIsActionsOpen(false);
    },
    [onPhotoUpload],
  );

  const handleRemoveAvatar = useCallback(async () => {
    if (onRemoveAvatar) {
      await onRemoveAvatar();
      setIsActionsOpen(false);
    }
  }, [onRemoveAvatar]);

  const handleSave = useCallback(async () => {
    if (!onEditSave) return;
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();
    const fullNameForCompany = (f && l ? `${f} ${l}` : f || l).trim();
    const mergedUser: User = {
      ...editableUser,
      first_name: f,
      last_name: l,
      company_name: fullNameForCompany,
      bio: bio.trim(),
      location: location.trim(),
      district: (district || '').trim(),
      ico: ico.replace(/\s/g, '').trim(),
      ico_visible: icoVisible,
      phone: phone.trim(),
      phone_visible: phoneVisible,
      job_title: profession.trim(),
      job_title_visible: professionVisible,
      contact_email: contactEmail.trim(),
      contact_email_visible: contactEmailVisible,
      website: website.trim(),
      additional_websites: additionalWebsites,
    };
    setIsSaving(true);
    try {
      await onEditSave(mergedUser);
    } finally {
      setIsSaving(false);
    }
  }, [
    onEditSave,
    editableUser,
    firstName,
    lastName,
    bio,
    location,
    district,
    ico,
    icoVisible,
    phone,
    phoneVisible,
    profession,
    professionVisible,
    contactEmail,
    contactEmailVisible,
    website,
    additionalWebsites,
  ]);

  return {
    firstName,
    lastName,
    bio,
    location,
    district,
    ico,
    icoVisible,
    phone,
    phoneVisible,
    profession,
    professionVisible,
    website,
    additionalWebsites,
    contactEmail,
    contactEmailVisible,
    isUploading,
    isSaving,
    isActionsOpen,
    uploadError,

    setFirstName,
    setLastName,
    setBio,
    setLocation,
    setDistrict,
    setIco,
    setPhone,
    setProfession,
    setWebsite,
    setAdditionalWebsites,
    setContactEmail,
    setIsActionsOpen,

    handleFullNameBlur,
    handleBioSave,
    handleLocationSave,
    handleIcoSave,
    handleIcoVisibleToggle,
    handlePhoneSave,
    handlePhoneVisibleToggle,
    handleProfessionSave,
    handleProfessionVisibleToggle,
    handleContactEmailSave,
    handleContactEmailVisibleToggle,
    handlePhotoUploadClick,
    handleAvatarClick,
    handlePhotoUpload,
    handleRemoveAvatar,
    handleSave,
    onEditCancel,
  };
}

export type UseProfileEditFormDesktopReturn = ReturnType<typeof useProfileEditFormDesktop>;
