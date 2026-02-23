import { buildDatasetFromCsv } from './buildDatasetFromCsv';

// Build once at module load. These CSVs are bundled with the app (Vite `?raw`).
export const dataset = buildDatasetFromCsv();

