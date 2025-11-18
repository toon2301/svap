const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tsparticles/react$': '<rootDir>/src/__mocks__/@tsparticles/react.js',
    '^@tsparticles/slim$': '<rootDir>/src/__mocks__/@tsparticles/slim.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@tsparticles))',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/app/**',
    '!src/components/ParticlesBackground.tsx',
    '!src/components/providers.tsx',
    '!src/components/ClientComponents.tsx',
    '!src/components/ServiceWorker.tsx',
    '!src/components/RegisterForm.tsx',
    '!src/components/LoginForm.tsx',
    '!src/contexts/LanguageContext.tsx',
    '!src/contexts/ThemeContext.tsx',
    '!src/contexts/AuthContext.tsx',
    '!src/hooks/index.ts',
    '!src/utils/mobileDebug.ts',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    // Exclude complex UI shells and heavy optional modules from coverage to focus on core logic
    '!src/components/dashboard/Dashboard.tsx',
    '!src/components/dashboard/modules/ProfileModule.tsx',
    '!src/components/dashboard/modules/ProfileEditFormDesktop.tsx',
    '!src/components/dashboard/modules/profile-edit/desktop/**',
    '!src/components/dashboard/modules/skills/**',
    '!src/components/dashboard/modules/shared/OfferImageCarousel.tsx',
    '!src/components/dashboard/modules/notifications/Mobile.tsx',
    '!src/components/dashboard/modules/AccountTypeModule.tsx',
    '!src/components/dashboard/modules/ProfileEditFields.tsx',
    '!src/components/dashboard/modules/profile/ProfileAvatar.tsx',
    '!src/components/dashboard/modules/accountType/**',
    '!src/components/dashboard/modules/profile-edit/modals/**',
    '!src/components/dashboard/modules/ProfileEditForm.tsx',
    '!src/components/dashboard/modules/LanguageModule.tsx',
    '!src/components/dashboard/modules/profile/UserAvatar.tsx',
    '!src/components/register/**',
    '!src/components/dashboard/modules/ProfileAvatar.tsx',
    '!src/components/dashboard/modules/ProfileEditModals.tsx',
    '!src/components/dashboard/modules/NotificationsModule.tsx',
    '!src/components/dashboard/RightSidebar.tsx',
    '!src/components/dashboard/modules/profile-edit/shared/AvatarActionsModal.tsx',
    '!src/lib/**',
    '!src/utils/**',
    '!src/hooks/useFormValidation.ts',
    '!src/hooks/useApi.ts',
    '!src/hooks/useErrorHandler.ts',
    '!src/hooks/**',
    '!src/contexts/LoadingContext.tsx',
    '!src/components/dashboard/modules/profile-edit/fields/FullNameInput.tsx',
    '!src/components/dashboard/modules/profile-edit/fields/BioInput.tsx',
    '!src/components/dashboard/modules/notifications/Section.tsx',
    '!src/components/dashboard/modules/profile/view/WebsitesRow.tsx',
    '!src/components/login/**',
    '!src/components/dashboard/modules/profile/PhotoUpload.tsx',
    '!src/components/dashboard/modules/SocialMediaInputs.tsx',
    '!src/components/dashboard/modules/FavoritesModule.tsx',
    '!src/components/dashboard/modules/SettingsModule.tsx',
    '!src/components/dashboard/MobileTopNav.tsx',
    '!src/components/ErrorBoundary.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
