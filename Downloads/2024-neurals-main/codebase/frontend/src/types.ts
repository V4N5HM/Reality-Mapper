// TYPES
export type NameRecord = {
  use: string; // Type of name usage, e.g., "official", "nickname"
  given: string[]; // Array of given names (e.g., first and middle names)
  family: string; // Family name (e.g., last name)
};

export type PatientData = {
  name: NameRecord[]; // Array of name records (can include multiple names)
  gender: string;     // Patient's gender
  birthDate: string;  // Patient's date of birth
  maritalStatus?: MaritalStatus; // Optional marital status field with coding
  race: string;       // Race of the patient
  ethnicity: string;  // Ethnicity of the patient
  primaryLanguage: string; // Primary language of the patient
  extension?: Extension[]; // Optional array of extensions for race and ethnicity
  communication?: Communication[]; // Optional communication array for language
  address?: {
    line?: string[];  // Address lines (street, PO box, etc.)
    city?: string;    // City of the patient
    state?: string;   // State of the patient
    postalCode?: string; // Postal code of the patient
  }[];
  telecom?: {
    value?: string;   // Patient's phone number or telecom info
  }[];
};


export type MaritalStatus = {
  coding?: Coding[]; // An array of Coding objects, which includes display text
};



export type Extension = {
  url: string;        // URL that indicates the type of extension
  extension: {
    valueString?: string;  // Value of the extension, like race or ethnicity
  }[];
};

export type Communication = {
  language?: {
    text?: string; // Language text (e.g., "English")
  };
};


type Coding = {
    system: string;
    code: string;
    display?: string
  };
  
type Category = {
    coding: Coding[];
  };
  
type Code = {
    coding: Coding[];
    text: string;
  };
  
type Encounter = {
    reference: string;
  };
  
type Meta = {
    lastUpdated: string;
    tag: Coding[];
    versionId: string;
  };
  
type Subject = {
    reference: string;
  };
  
type ValueQuantity = {
    value: number;
    unit: string;
    system: string;
  };
  
export type Observation = {
    resourceType: string;
    id: string;
    status: string;
    category: Category[];
    code: Code;
    subject: Subject;
    encounter: Encounter;
    effectiveDateTime: string;
    issued: string;
    valueQuantity: ValueQuantity;
    meta: Meta;
  };

export type Condition = {
  resourceType: string;
  id: string;
  meta: Meta;
  clinicalStatus: Coding[];
  verificationStatus: Coding[];
  code: Code;
  subject: Subject;
  encounter: Encounter;
  onsetDateTime: string;
  recordedDate: string;
};

export type PatientHistory = {
  code: string
  system: string
  display: string
  date?: string
}


export type GenHealthResponse = {
  history: PatientHistory[]
  predictions: PatientHistory[][]
}



// Define FHIR resource types
export interface FHIRCondition {
  id: string;
  code: { text: string };
  meta: { lastUpdated: string };
}

export interface FHIRObservation {
  id: string;
  code: { text: string };
  effectiveDateTime?: string;
  meta: { lastUpdated: string };
  valueQuantity: {value: number, unit: string}
}

export interface FHIRMedicationRequest {
  id: string;
  medicationCodeableConcept?: { text: string };
}

export interface FHIREncounter {
  id: string;
  type?: { text: string }[];
  period?: { start: string };
  meta: { lastUpdated: string };
}

export interface FHIRImmunization {
  id: string;
  vaccineCode?: { text: string };
  occurrenceDateTime: string;
  meta: { lastUpdated: string };
}

export interface FHIRDevice {
  id: string;
  type?: { text: string };
}

// Define Patient interface
export interface FHIRPatient {
  id: string;
}

// Define FhirClient interface
export interface FhirClient {
  patient?: FHIRPatient;
  request: <T>(url: string, options: { pageLimit: number; flat: boolean }) => Promise<T>;
}

export interface GenHealthPredictionsProps {
  genHealthDataLoaded: boolean;
  genHealthResponse: GenHealthResponse | null;
  perplexityPatientFuture: string;
  geminiPatientFuture: string
}

export interface ParsedSection {
  title: string;
  content: string[];
}