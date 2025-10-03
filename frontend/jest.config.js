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
    '!src/contexts/AuthContext.tsx',
    '!src/hooks/index.ts',
    '!src/utils/mobileDebug.ts',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
