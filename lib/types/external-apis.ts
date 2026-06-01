// ============================================================================
// INTERNET ARCHIVE
// ============================================================================

export interface ArchiveResult {
  identifier: string;
  title: string;
  description?: string;
  creator?: string;
  date?: string;
  mediatype: 'texts' | 'image' | 'audio' | 'movies' | 'software' | 'web';
  img?: string;
  downloads: number;
  publicdate?: string;
  language?: string;
  licenseurl?: string;
}

export interface ArchiveGrouped {
  texts: ArchiveResult[];
  image: ArchiveResult[];
  audio: ArchiveResult[];
  movies: ArchiveResult[];
  software: ArchiveResult[];
}

// ============================================================================
// SEMANTIC SCHOLAR
// ============================================================================

export interface ScholarAuthor {
  name: string;
  authorId?: string;
}

export interface ScholarResult {
  paperId: string;
  title: string;
  abstract?: string;
  authors: ScholarAuthor[];
  year: number;
  venue?: string;
  citationCount: number;
  openAccessPdf?: {
    url: string;
    status?: string;
  };
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
    DBLP?: string;
    MAG?: string;
    ACL?: string;
  };
  url?: string;
  tldr?: {
    model: string;
    text: string;
  };
}

// ============================================================================
// CORE API
// ============================================================================

export interface CoreAuthor {
  name?: string;
  code?: string;
  affiliations?: string[];
}

// Type pour le language brut retourné par l'API CORE v3
// (peut être une string OU un objet {code, name})
export interface CoreLanguageRaw {
  code: string;
  name: string;
}

export interface CoreResult {
  id: string;
  title: string;
  abstract?: string;
  authors: CoreAuthor[];
  year?: number;
  downloadUrl?: string;
  download_url?: string;
  repositoryName?: string;
  language?: string; // Toujours normalisé en string dans notre app
  doi?: string;
  urls?: string[];
}

// ============================================================================
// arXiv
// ============================================================================

export interface ArxivAuthor {
  name: string;
}

export interface ArxivResult {
  id: string;
  arxivId?: string;
  title: string;
  summary: string;
  authors: ArxivAuthor[];
  published: string;
  updated?: string;
  pdfUrl: string;
  category: string;
  categories?: string[];
  doi?: string;
}

// ============================================================================
// FREE DICTIONARY
// ============================================================================

export interface DictionaryPhonetic {
  text: string;
  audio?: string;
}

export interface DictionaryDefinition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  phonetics: DictionaryPhonetic[];
  meanings: DictionaryMeaning[];
  sourceUrls?: string[];
}