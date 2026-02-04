import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    h1: 'h1',
    h2: 'h2',
    p: 'p',
    form: 'form',
    button: 'button',
    input: 'input',
    label: 'label',
    footer: 'footer',
  },
  AnimatePresence: ({ children }) => children,
}))

// Global LanguageContext mock using real Slovak messages
jest.mock('@/contexts/LanguageContext', () => {
  const React = require('react')
  const sk = require('./messages/sk.json')
  const getByPath = (obj, key) => key.split('.').reduce((o, s) => (o && o[s] != null ? o[s] : undefined), obj)
  const ctx = {
    locale: 'sk',
    setLocale: jest.fn(),
    setCountry: jest.fn(),
    t: (key, fallback) => {
      const v = getByPath(sk, key)
      if (typeof v === 'string') return v
      return typeof fallback === 'string' ? fallback : key
    },
  }
  return {
    __esModule: true,
    LanguageProvider: ({ children }) => React.createElement(React.Fragment, null, children),
    useLanguage: () => ctx,
  }
})

// Global ThemeContext mock with real Provider and state so tests can toggle theme
jest.mock('@/contexts/ThemeContext', () => {
  const React = require('react')
  const ThemeCtx = React.createContext(null)
  const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = React.useState('light')
    const setTheme = (next) => {
      setThemeState(next)
      if (typeof document !== 'undefined') {
        if (next === 'dark') document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
      }
    }
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
    return React.createElement(ThemeCtx.Provider, { value: { theme, toggleTheme, setTheme } }, children)
  }
  const useTheme = () => {
    const ctx = React.useContext(ThemeCtx)
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
    return ctx
  }
  return { __esModule: true, ThemeProvider, useTheme }
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}
