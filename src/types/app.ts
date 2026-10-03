// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Hunde {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    hundename?: string;
    rasse?: string;
    geburtsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    geschlecht?: LookupValue;
    bemerkungen?: string;
    halter_vorname?: string;
    halter_nachname?: string;
    halter_email?: string;
    halter_telefon?: string;
  };
}

export interface Kurse {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kurstitel?: string;
    kursart?: LookupValue;
    beschreibung?: string;
    trainer_vorname?: string;
    trainer_nachname?: string;
    termin?: string; // Format: YYYY-MM-DD oder ISO String
    ort?: string;
    preis?: number;
    max_teilnehmer?: number;
  };
}

export interface Anmeldungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    hund?: string; // applookup -> URL zu 'Hunde' Record
    kurs?: string; // applookup -> URL zu 'Kurse' Record
    anmeldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    bemerkung?: string;
  };
}

export const APP_IDS = {
  HUNDE: '6ac12635a44e7aab02993854',
  KURSE: '6ac1263994bc7391fd55f8aa',
  ANMELDUNGEN: '6ac12639a3f42da4d1e3c28f',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'hunde': {
    geschlecht: [{ key: "ruede", label: "Rüde" }, { key: "huendin", label: "Hündin" }],
  },
  'kurse': {
    kursart: [{ key: "welpenkurs", label: "Welpenkurs" }, { key: "grunderziehung", label: "Grunderziehung" }, { key: "fortgeschrittene", label: "Fortgeschrittene" }, { key: "agility", label: "Agility" }, { key: "einzeltraining", label: "Einzeltraining" }],
  },
  'anmeldungen': {
    status: [{ key: "angemeldet", label: "Angemeldet" }, { key: "bestaetigt", label: "Bestätigt" }, { key: "warteliste", label: "Warteliste" }, { key: "storniert", label: "Storniert" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'hunde': {
    'hundename': 'string/text',
    'rasse': 'string/text',
    'geburtsdatum': 'date/date',
    'geschlecht': 'lookup/radio',
    'bemerkungen': 'string/textarea',
    'halter_vorname': 'string/text',
    'halter_nachname': 'string/text',
    'halter_email': 'string/email',
    'halter_telefon': 'string/tel',
  },
  'kurse': {
    'kurstitel': 'string/text',
    'kursart': 'lookup/select',
    'beschreibung': 'string/textarea',
    'trainer_vorname': 'string/text',
    'trainer_nachname': 'string/text',
    'termin': 'date/datetimeminute',
    'ort': 'string/text',
    'preis': 'number',
    'max_teilnehmer': 'number',
  },
  'anmeldungen': {
    'hund': 'applookup/select',
    'kurs': 'applookup/select',
    'anmeldedatum': 'date/date',
    'status': 'lookup/select',
    'bemerkung': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateHunde = StripLookup<Hunde['fields']>;
export type CreateKurse = StripLookup<Kurse['fields']>;
export type CreateAnmeldungen = StripLookup<Anmeldungen['fields']>;