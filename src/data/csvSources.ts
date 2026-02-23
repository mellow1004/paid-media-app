export interface CsvSource {
  filename: string;
  content: string;
}

import sheet3 from '../../Copy of Budgets  - Sheet3.csv?raw';
import sheet4 from '../../Copy of Budgets  - Sheet4.csv?raw';
import sheet5 from '../../Copy of Budgets  - Sheet5.csv?raw';
import sheet6 from '../../Copy of Budgets  - Sheet6.csv?raw';
import sheet11 from '../../Copy of Budgets  - Sheet11.csv?raw';
import nordcloud from '../../Copy of Budgets  - Nordcloud.csv?raw';
import decernoV2 from '../../Copy of Budgets  - Decerno _ v. 02 december.csv?raw';
import decerno from '../../Copy of Budgets  - Decerno.csv?raw';
import alreadySpend from '../../Copy of Budgets  - already spend.csv?raw';
import excluded from '../../Copy of Budgets  - excluded.csv?raw';
import newCalculations from '../../Copy of Budgets  - New calculations 16 DECEMBER .csv?raw';
import december15 from '../../Copy of Budgets  - December 15th.csv?raw';
import december15FromDoc from '../../Copy of Budgets  - december 15th from doc.csv?raw';
import googleNordcloud from '../../Copy of Budgets  - Google Nordcloud.csv?raw';
import workDocLinkedinNordcloud from '../../Copy of Budgets  - workDoc Linkedin Nordcloud.csv?raw';
import linkedinNordcloudRaw from '../../Copy of Budgets  - Linkedin Nordcloud raw data.csv?raw';

export const csvSources: CsvSource[] = [
  { filename: 'Copy of Budgets  - Sheet3.csv', content: sheet3 },
  { filename: 'Copy of Budgets  - Sheet4.csv', content: sheet4 },
  { filename: 'Copy of Budgets  - Sheet5.csv', content: sheet5 },
  { filename: 'Copy of Budgets  - Sheet6.csv', content: sheet6 },
  { filename: 'Copy of Budgets  - Sheet11.csv', content: sheet11 },
  { filename: 'Copy of Budgets  - Nordcloud.csv', content: nordcloud },
  { filename: 'Copy of Budgets  - Decerno _ v. 02 december.csv', content: decernoV2 },
  { filename: 'Copy of Budgets  - Decerno.csv', content: decerno },
  { filename: 'Copy of Budgets  - already spend.csv', content: alreadySpend },
  { filename: 'Copy of Budgets  - excluded.csv', content: excluded },
  { filename: 'Copy of Budgets  - New calculations 16 DECEMBER .csv', content: newCalculations },
  { filename: 'Copy of Budgets  - December 15th.csv', content: december15 },
  { filename: 'Copy of Budgets  - december 15th from doc.csv', content: december15FromDoc },
  { filename: 'Copy of Budgets  - Google Nordcloud.csv', content: googleNordcloud },
  { filename: 'Copy of Budgets  - workDoc Linkedin Nordcloud.csv', content: workDocLinkedinNordcloud },
  { filename: 'Copy of Budgets  - Linkedin Nordcloud raw data.csv', content: linkedinNordcloudRaw },
];

