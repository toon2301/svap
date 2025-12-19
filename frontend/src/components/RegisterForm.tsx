'use client';

import React, { Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import AccountTypeSelect from './register/AccountTypeSelect';
import CredentialsSection from './register/CredentialsSection';
import PasswordSection from './register/PasswordSection';
import BirthGenderSection from './register/BirthGenderSection';
import CompanySection from './register/CompanySection';
import { useRegisterForm } from './register/useRegisterForm';
// import { logMobileDebugInfo, checkNetworkConnectivity } from '@/utils/mobileDebug';

// Lazy load particle efekt
const ParticlesBackground = lazy(() => import('./ParticlesBackground'));

export default function RegisterForm() {
  const { t } = useLanguage();
  const {
    formData,
    setFormData,
    errors,
    isLoading,
    showPassword,
    setShowPassword,
    showPasswordConfirm,
    setShowPasswordConfirm,
    registrationSuccess,
    emailStatus,
    emailError,
    handleInputChange,
    handleTouchStart,
    handleTouchEnd,
    handleSelectFocus,
    handleSelectBlur,
    handleKeyDown,
    checkEmailAvailability,
    handleSubmit,
    getButtonText,
  } = useRegisterForm({ t });

  return (
    <div className="min-h-screen flex flex-col relative" style={{background: 'var(--background)'}}>
      {/* Particle efekt - lazy loaded s mobilnou optimalizáciou */}
      <Suspense fallback={
        <div className="absolute inset-0 z-0 max-lg:hidden">
          {/* Fallback len pre desktop - na mobile sa particle efekt načítava až potom */}
        </div>
      }>
        <ParticlesBackground />
      </Suspense>
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        
        <motion.div 
          className="w-full max-w-[min(580px,90vw)] lg:max-w-[clamp(380px,35vw,480px)] xl:max-w-[clamp(480px,38vw,580px)] bg-white dark:bg-black rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="px-[clamp(1.25rem,4vw,2rem)] py-[clamp(1.5rem,4vw,1.5rem)]">
            <motion.h1 
              className="text-[clamp(1.5rem,3vw,1.875rem)] font-medium text-center mb-[clamp(1rem,2vw,1.5rem)] text-black dark:text-white tracking-wider"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {registrationSuccess ? t('auth.registrationSuccess') : t('auth.registration')}
            </motion.h1>

            {registrationSuccess ? (
              <motion.div 
                className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold">{t('auth.registrationSuccess')}</p>
                    <p className="text-sm mt-1">{t('auth.registrationSuccessMessage')}</p>
                  </div>
                </div>
              </motion.div>
            ) : errors.general && (
              <motion.div 
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {errors.general}
              </motion.div>
            )}


            {!registrationSuccess && (
              <motion.form 
                onSubmit={handleSubmit}
                className="space-y-4 max-lg:space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
              {/* Typ účtu */}
              <AccountTypeSelect
                t={t}
                  value={formData.user_type}
                onChange={handleInputChange as any}
                onKeyDown={handleKeyDown as any}
                onTouchStart={handleTouchStart as any}
                onTouchEnd={handleTouchEnd as any}
                onFocus={handleSelectFocus}
                onBlur={handleSelectBlur}
              />

              {/* Prihlasovacie údaje */}
              <CredentialsSection
                t={t}
                username={formData.username}
                email={formData.email}
                errors={errors}
                emailStatus={emailStatus}
                emailError={emailError}
                onChange={handleInputChange as any}
                onKeyDown={handleKeyDown as any}
                onEmailBlur={checkEmailAvailability}
              />

              {/* Heslá */}
              <PasswordSection
                t={t}
                password={formData.password}
                passwordConfirm={formData.password_confirm}
                errors={errors}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showPasswordConfirm={showPasswordConfirm}
                setShowPasswordConfirm={setShowPasswordConfirm}
                onChange={handleInputChange as any}
                onKeyDown={handleKeyDown as any}
              />

              {/* Dátum narodenia */}
              <BirthGenderSection
                t={t}
                birthDay={formData.birth_day}
                birthMonth={formData.birth_month}
                birthYear={formData.birth_year}
                gender={formData.gender}
                errors={errors}
                onDateChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                      const [year, month, day] = dateValue.split('-');
                    setFormData(prev => ({ ...prev, birth_year: year, birth_month: month, birth_day: day }));
                    } else {
                    setFormData(prev => ({ ...prev, birth_year: '', birth_month: '', birth_day: '' }));
                  }
                }}
                onKeyDown={handleKeyDown as any}
                onGenderChange={handleInputChange as any}
                bindSelectHandlers={{ onTouchStart: handleTouchStart as any, onTouchEnd: handleTouchEnd as any, onFocus: handleSelectFocus, onBlur: handleSelectBlur }}
              />

              {/* Pre firmy */}
              {formData.user_type === 'company' && (
                <CompanySection
                  t={t}
                  companyName={formData.company_name}
                  website={formData.website}
                  errors={errors}
                  onChange={handleInputChange as any}
                />
              )}

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className={`w-full text-white px-4 py-[clamp(0.5rem,1.5vw,0.625rem)] rounded-2xl font-semibold text-[clamp(0.875rem,2vw,1.25rem)] transition-all mt-5 ${
                  isLoading ? 'cursor-not-allowed bg-purple-400 opacity-80' : 'cursor-pointer bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
                }`}
                style={{
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
                tabIndex={10}
              >
                <div className="flex items-center justify-center gap-3">
                  {isLoading && (
                    <motion.div
                      className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      aria-hidden="true"
                    />
                  )}
                  {getButtonText()}
                </div>
              </motion.button>
            </motion.form>
            )}

            {registrationSuccess ? (
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <p className="text-2xl text-gray-600 dark:text-gray-300 max-lg:text-base mb-4">
                  {t('auth.afterVerification')}
                </p>
                <a 
                  href="/" 
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-purple-700 transition-colors"
                >
                  {t('auth.loginLink')}
                </a>
              </motion.div>
            ) : (
              <div className="text-center mt-4">
                <p className="text-[clamp(0.875rem,1.5vw,1rem)] text-gray-600 dark:text-gray-300">
                  {t('auth.haveAccount')}{' '}
                  <a 
                    href="/" 
                    className="text-purple-800 dark:text-purple-400 font-semibold hover:text-purple-900 dark:hover:text-purple-300 transition-colors"
                  >
                    {t('auth.loginLink')}
                  </a>
                </p>
              </div>
            )}

            {/* OAuth tlačidlá */}
            <motion.div 
              className="space-y-4 mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Footer - Lazy loaded s mobilnou optimalizáciou - skrytý na mobile */}
      <div className="hidden lg:block">
        <Suspense fallback={
          <div className="h-32 bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800">
            {/* Desktop fallback */}
          </div>
        }>
          <motion.footer 
            className="bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800 relative z-10"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
        >
          <div className="main-column py-8 lg:py-4 2xl:py-10">
            <div className="flex flex-wrap justify-center gap-4 text-center text-small text-gray-600 dark:text-gray-300">
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.howItWorks', 'Ako to funguje')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.forIndividuals', 'Pre jednotlivcov')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.forCompanies', 'Pre firmy')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.forSchools', 'Pre školy')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.help', 'Pomocník')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.faq', 'FAQ')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.contact', 'Kontakt')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.reportIssue', 'Nahlásiť problém')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.aboutUs', 'O nás')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.termsOfUse', 'Podmienky používania')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.privacyPolicy', 'Ochrana údajov')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.cookies', 'Cookies')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.gdpr', 'GDPR')}</a>
            </div>
            <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-6 text-center text-small text-gray-500 dark:text-gray-400">
              © 2024 Svaply. Všetky práva vyhradené.
            </div>
          </div>
      </motion.footer>
      </Suspense>
      </div>
    </div>
  );
} 
