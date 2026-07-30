export const BUG_REPORT_CATEGORIES = [
  'not_working',
  'visual',
  'performance',
  'other',
] as const;

export type BugReportCategory = (typeof BUG_REPORT_CATEGORIES)[number];
export type BugReportDeviceType = 'unknown' | 'mobile' | 'desktop' | 'tablet';
export type BugReportLocale = 'sk' | 'en' | 'de' | 'cs' | 'hu' | 'pl';

export type BugReportFormValues = {
  category: BugReportCategory | '';
  title: string;
  description: string;
  reproductionSteps: string;
};

export type BugReportPayload = {
  category: BugReportCategory;
  title: string;
  description: string;
  reproduction_steps: string;
  source_screen: string;
  device_type: BugReportDeviceType;
  locale: BugReportLocale;
  app_version: string;
  browser: string;
};

export type BugReportResponse = {
  reference: string;
  status: 'new';
  created_at: string;
};

export type BugReportFieldErrors = Partial<Record<keyof BugReportFormValues, string>>;
