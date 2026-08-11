/**
 * Philippine province → region lookup. Not a full controlled locations
 * table (that's a tracked Post-MVP item — see docs/development-roadmap.md
 * "no controlled Philippine locations table") — this exists specifically
 * to auto-fill the `region` field when it's missing from an admin bulk
 * CSV upload (a very common gap in scraped listing data, since most
 * sources give a province/city but not the formal region name).
 * Lookup is case-insensitive; keys are lowercased province names.
 */
export const PH_PROVINCE_TO_REGION: Record<string, string> = {
  // NCR
  'metro manila': 'NCR (National Capital Region)',
  ncr: 'NCR (National Capital Region)',
  // CAR
  abra: 'CAR (Cordillera Administrative Region)',
  apayao: 'CAR (Cordillera Administrative Region)',
  benguet: 'CAR (Cordillera Administrative Region)',
  ifugao: 'CAR (Cordillera Administrative Region)',
  kalinga: 'CAR (Cordillera Administrative Region)',
  'mountain province': 'CAR (Cordillera Administrative Region)',
  // Region I
  'ilocos norte': 'Region I (Ilocos Region)',
  'ilocos sur': 'Region I (Ilocos Region)',
  'la union': 'Region I (Ilocos Region)',
  pangasinan: 'Region I (Ilocos Region)',
  // Region II
  batanes: 'Region II (Cagayan Valley)',
  cagayan: 'Region II (Cagayan Valley)',
  isabela: 'Region II (Cagayan Valley)',
  'nueva vizcaya': 'Region II (Cagayan Valley)',
  quirino: 'Region II (Cagayan Valley)',
  // Region III
  aurora: 'Region III (Central Luzon)',
  bataan: 'Region III (Central Luzon)',
  bulacan: 'Region III (Central Luzon)',
  'nueva ecija': 'Region III (Central Luzon)',
  pampanga: 'Region III (Central Luzon)',
  tarlac: 'Region III (Central Luzon)',
  zambales: 'Region III (Central Luzon)',
  // Region IV-A
  batangas: 'Region IV-A (CALABARZON)',
  cavite: 'Region IV-A (CALABARZON)',
  laguna: 'Region IV-A (CALABARZON)',
  quezon: 'Region IV-A (CALABARZON)',
  rizal: 'Region IV-A (CALABARZON)',
  // MIMAROPA
  marinduque: 'MIMAROPA',
  'occidental mindoro': 'MIMAROPA',
  'oriental mindoro': 'MIMAROPA',
  palawan: 'MIMAROPA',
  romblon: 'MIMAROPA',
  // Region V
  albay: 'Region V (Bicol Region)',
  'camarines norte': 'Region V (Bicol Region)',
  'camarines sur': 'Region V (Bicol Region)',
  catanduanes: 'Region V (Bicol Region)',
  masbate: 'Region V (Bicol Region)',
  sorsogon: 'Region V (Bicol Region)',
  // Region VI
  aklan: 'Region VI (Western Visayas)',
  antique: 'Region VI (Western Visayas)',
  capiz: 'Region VI (Western Visayas)',
  guimaras: 'Region VI (Western Visayas)',
  iloilo: 'Region VI (Western Visayas)',
  'negros occidental': 'Region VI (Western Visayas)',
  // Region VII
  bohol: 'Region VII (Central Visayas)',
  cebu: 'Region VII (Central Visayas)',
  'negros oriental': 'Region VII (Central Visayas)',
  siquijor: 'Region VII (Central Visayas)',
  // Region VIII
  biliran: 'Region VIII (Eastern Visayas)',
  'eastern samar': 'Region VIII (Eastern Visayas)',
  leyte: 'Region VIII (Eastern Visayas)',
  'northern samar': 'Region VIII (Eastern Visayas)',
  samar: 'Region VIII (Eastern Visayas)',
  'southern leyte': 'Region VIII (Eastern Visayas)',
  // Region IX
  'zamboanga del norte': 'Region IX (Zamboanga Peninsula)',
  'zamboanga del sur': 'Region IX (Zamboanga Peninsula)',
  'zamboanga sibugay': 'Region IX (Zamboanga Peninsula)',
  // Region X
  bukidnon: 'Region X (Northern Mindanao)',
  camiguin: 'Region X (Northern Mindanao)',
  'lanao del norte': 'Region X (Northern Mindanao)',
  'misamis occidental': 'Region X (Northern Mindanao)',
  'misamis oriental': 'Region X (Northern Mindanao)',
  // Region XI
  'davao de oro': 'Region XI (Davao Region)',
  'davao del norte': 'Region XI (Davao Region)',
  'davao del sur': 'Region XI (Davao Region)',
  'davao occidental': 'Region XI (Davao Region)',
  'davao oriental': 'Region XI (Davao Region)',
  // Region XII
  cotabato: 'Region XII (SOCCSKSARGEN)',
  sarangani: 'Region XII (SOCCSKSARGEN)',
  'south cotabato': 'Region XII (SOCCSKSARGEN)',
  'sultan kudarat': 'Region XII (SOCCSKSARGEN)',
  // Region XIII
  'agusan del norte': 'Region XIII (Caraga)',
  'agusan del sur': 'Region XIII (Caraga)',
  'dinagat islands': 'Region XIII (Caraga)',
  'surigao del norte': 'Region XIII (Caraga)',
  'surigao del sur': 'Region XIII (Caraga)',
  // BARMM
  basilan: 'BARMM',
  'lanao del sur': 'BARMM',
  'maguindanao del norte': 'BARMM',
  'maguindanao del sur': 'BARMM',
  sulu: 'BARMM',
  'tawi-tawi': 'BARMM',
};

/** Looks up the region for a province name (case-insensitive, tolerant
 * of surrounding whitespace). Returns null if the province isn't
 * recognized. */
export function lookupPhRegion(province: string): string | null {
  return PH_PROVINCE_TO_REGION[province.trim().toLowerCase()] ?? null;
}
