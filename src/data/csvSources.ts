export interface CsvSource {
  filename: string;
  content: string;
  /**
   * Optional per-file platform override chosen by the user at upload time.
   * When set, every parsed row from this CSV will be stamped with this platform.
   */
  platformOverride?: 'LinkedIn' | 'Google Ads' | 'Meta Ads';
}

import mutualForecasting from '../../Forecasting - Mutual.csv?raw';

export const csvSources: CsvSource[] = [
  // Baseline reference sheet. Real data is expected to be imported at runtime via CSV upload.
  { filename: 'Forecasting - Mutual.csv', content: mutualForecasting },
];

