'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { User } from '@/types';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '../requests/requestsApi';

interface UseProfileEditFormDesktopParams {
  user: User;
  onUserUpdate?: (user: User) => void;
}

export function useProfileEditFormDesktop({
  user,
  onUserUpdate,
}: UseProfileEditFormDesktopParams) {
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [district, setDistrict] = useState(user.district || '');
  const [ico, setIco] = useState(user.ico || '');
  const [icoVisible, setIcoVisible] = useState(user.ico_visible || false);
  const [phone, setPhone] = useState(user.phone || '');
  const [phoneVisible, setPhoneVisible] = useState(user.phone_visible || false);
  const [profession, setProfession] = useState(user.job_title || '');
  const [professionVisible, setProfessionVisible] = useState(
    user.job_title_visible || false,
  );
  const [website, setWebsite] = useState(user.website || '');
  const [additionalWebsites, setAdditionalWebsites] = useState<string[]>(
    user.additional_websites || [],
  );
  const [contactEmail, setContactEmail] = useState(user.contact_email || '');
  const [contactEmailVisible, setContactEmailVisible] = useState(
    user.contact_email_visible ?? false,
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Synchronizácia stavu pri zmene používateľa
  useEffect(() => {
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setBio(user.bio || '');
    setLocation(user.location || '');
    setDistrict(user.district || '');
    setIco(user.ico || '');
    setIcoVisible(user.ico_visible || false);
    setPhone(user.phone || '');
    setPhoneVisible(user.phone_visible || false);
    setProfession(user.job_title || '');
    setProfessionVisible(user.job_title_visible || false);
    setWebsite(user.website || '');
    setAdditionalWebsites(user.additional_websites || []);
    setContactEmail(user.contact_email || '');
    if (typeof user.contact_email_visible === 'boolean') {
      setContactEmailVisible(user.contact_email_visible);
    }
  }, [
    user.first_name,
    user.last_name,
    user.bio,
    user.location,
    user.district,
    user.ico,
    user.ico_visible,
    user.phone,
    user.phone_visible,
    user.job_title,
    user.job_title_visible,
    user.website,
    user.additional_websites,
    user.contact_email,
    user.contact_email_visible,
  ]);

  const handleFullNameSave = async () => {
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();
    if (f === (user.first_name || '').trim() && l === (user.last_name || '').trim()) {
      return;
    }
    try {
      // Spojiť first_name a last_name pre company_name synchronizáciu
      const fullNameForCompany = (f && l ? `${f} ${l}` : f || l).trim();
      
      const response = await api.patch('/auth/profile/', {
        first_name: f,
        last_name: l,
        company_name: fullNameForCompany, // Synchronizovať do company_name
      });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error saving full name:', error);
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
  };

  const handleBioSave = async () => {
    if (bio.trim() === user.bio) return;
    try {
      const response = await api.patch('/auth/profile/', {
        bio: bio.trim(),
      });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      const data = error?.response?.data;
      const details = data?.details;
      const bioMsg = typeof details?.bio?.[0] === 'string' ? details.bio[0] : null;
      const message = bioMsg ?? getApiErrorMessage(error, 'Bio sa nepodarilo uložiť.');
      toast.error(message);
      setBio(user.bio || '');
    }
  };

  const handleLocationSave = async () => {
    const locTrimmed = location.trim();
    const districtTrimmed = (district || '').trim();
    if (locTrimmed === (user.location || '') && districtTrimmed === (user.district || '')) {
      return;
    }
    try {
      const response = await api.patch('/auth/profile/', {
        location: locTrimmed,
        district: districtTrimmed,
      });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      const data = error?.response?.data;
      const details = data?.details;
      const msg = [details?.location?.[0], details?.district?.[0]].find((m): m is string => typeof m === 'string');
      const message = msg ?? getApiErrorMessage(error, 'Lokalitu sa nepodarilo uložiť.');
      toast.error(message);
      setLocation(user.location || '');
      setDistrict(user.district || '');
    }
  };

  const handleIcoSave = async () => {
    const icoCleaned = ico.replace(/\s/g, '').trim();
    if (icoCleaned && (icoCleaned.length < 8 || icoCleaned.length > 14)) {
      toast.error('IČO musí mať 8 až 14 číslic.');
      return;
    }
    if (icoCleaned === (user.ico || '').replace(/\s/g, '')) return;
    try {
      const response = await api.patch('/auth/profile/', {
        ico: icoCleaned,
      });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      const data = error?.response?.data;
      const details = data?.details;
      const raw = details?.ico;
      const msg = Array.isArray(raw) ? raw[0] : typeof raw === 'string' ? raw : null;
      const message = (typeof msg === 'string' ? msg : null) ?? getApiErrorMessage(error, 'IČO sa nepodarilo uložiť.');
      toast.error(message);
      setIco(user.ico || '');
    }
  };

  const handleIcoVisibleToggle = async () => {
    const newValue = !icoVisible;
    setIcoVisible(newValue);
    try {
      const response = await api.patch('/auth/profile/', {
        ico_visible: newValue,
      });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      const data = error?.response?.data;
      const details = data?.details;
      const raw = details?.ico_visible ?? details?.ico;
      const msg = Array.isArray(raw) ? raw[0] : typeof raw === 'string' ? raw : null;
      const message = (typeof msg === 'string' ? msg : null) ?? getApiErrorMessage(error, 'IČO sa nepodarilo uložiť.');
      toast.error(message);
      setIcoVisible(user.ico_visible || false);
    }
  };

  const handlePhoneSave = async () => {
    if (phone.trim() === user.phone) return;
    try {
      const response = await api.patch('/auth/profile/', {
        phone: phone.trim(),
      });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      const data = error?.response?.data;
      const details = data?.details;
      const phoneMsg = typeof details?.phone?.[0] === 'string' ? details.phone[0] : null;
      const message = phoneMsg ?? getApiErrorMessage(error, 'Telefón sa nepodarilo uložiť.');
      toast.error(message);
      setPhone(user.phone || '');
    }
  };

  const handlePhoneVisibleToggle = async () => {
    const newValue = !phoneVisible;
    setPhoneVisible(newValue);
    try {
      const response = await api.patch('/auth/profile/', {
        phone_visible: newValue,
      });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error saving phone visibility:', error);
      setPhoneVisible(user.phone_visible || false);
    }
  };

  const handleProfessionSave = async () => {
    // eslint-disable-next-line no-console
    console.log('handleProfessionSave called with:', profession);
    if (profession.trim() === user.job_title) return;
    try {
      // eslint-disable-next-line no-console
      console.log('Saving profession:', profession.trim());
      const response = await api.patch('/auth/profile/', {
        job_title: profession.trim(),
      });
      // eslint-disable-next-line no-console
      console.log('Profession saved successfully:', response.data);
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error saving profession:', error);
      setProfession(user.job_title || '');
    }
  };

  const handleProfessionVisibleToggle = async () => {
    const newValue = !professionVisible;
    setProfessionVisible(newValue);
    try {
      const response = await api.patch('/auth/profile/', {
        job_title_visible: newValue,
      });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error saving profession visibility:', error);
      setProfessionVisible(user.job_title_visible || false);
    }
  };

  const handleContactEmailVisibleToggle = async () => {
    const newValue = !contactEmailVisible;
    setContactEmailVisible(newValue);
    try {
      const response = await api.patch('/auth/profile/', {
        contact_email_visible: newValue,
      });
      const updated = response?.data?.user;
      if (updated && typeof updated.contact_email_visible === 'boolean') {
        setContactEmailVisible(updated.contact_email_visible);
      }
      if (onUserUpdate && updated) {
        onUserUpdate(updated);
      }
    } catch (error: any) {
      const data = error?.response?.data;
      const details = data?.details;
      const msg = details?.contact_email_visible?.[0] ?? details?.contact_email?.[0];
      const message = typeof msg === 'string' ? msg : getApiErrorMessage(error, 'Kontaktný email sa nepodarilo uložiť.');
      toast.error(message);
      setContactEmailVisible(user.contact_email_visible ?? false);
    }
  };

  const handleContactEmailSave = async () => {
    if (contactEmail.trim() === user.contact_email) return;
    try {
      const response = await api.patch('/auth/profile/', {
        contact_email: contactEmail.trim(),
        contact_email_visible: contactEmailVisible,
      });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
    } catch (error: any) {
      const data = error?.response?.data;
      const details = data?.details;
      const msg = typeof details?.contact_email?.[0] === 'string' ? details.contact_email[0] : null;
      const message = msg ?? getApiErrorMessage(error, 'Kontaktný email sa nepodarilo uložiť.');
      toast.error(message);
      setContactEmail(user.contact_email || '');
    }
  };


  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await api.patch('/auth/profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
      setIsActionsOpen(false);
    } catch (e: any) {
      const details = e?.response?.data?.details || e?.response?.data?.validation_errors;
      const avatarErrors: string[] | undefined = details?.avatar;
      const message =
        avatarErrors?.[0] ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        'Nepodarilo sa nahrať fotku. Skúste znova.';
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoUploadClick = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) await handlePhotoUpload(file);
    };
    input.click();
  };

  const handleAvatarClick = () => {
    setIsActionsOpen(true);
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    setUploadError('');
    try {
      const response = await api.patch('/auth/profile/', { avatar: null });
      if (onUserUpdate && response.data.user) {
        onUserUpdate(response.data.user);
      }
      setIsActionsOpen(false);
    } catch (e: any) {
      setUploadError(
        e.response?.data?.error || 'Nepodarilo sa odstrániť fotku. Skúste znova.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  return {
    // hodnoty
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
    isActionsOpen,
    uploadError,

    // settre
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

    // handlery
    handleFullNameSave,
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
    handlePhotoUpload,
    handlePhotoUploadClick,
    handleAvatarClick,
    handleRemoveAvatar,
  };
}

export type UseProfileEditFormDesktopReturn = ReturnType<typeof useProfileEditFormDesktop>;


