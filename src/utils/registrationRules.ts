import {
  ThesisTopic,
  CandidateApplication,
  ReInscriptionRecord,
  ApplicationStatus,
} from '../types';

export interface DossierValidationResult {
  isValid: boolean;
  missingFields: string[];
  missingDocs: string[];
  completionPercentage: number;
}

/**
 * Validates whether an incoming application has provided all mandatory
 * personal info, academic credentials, and key digitized documents.
 */
export function validateDossier(
  app: Partial<CandidateApplication>
): DossierValidationResult {
  const missingFields: string[] = [];
  const missingDocs: string[] = [];

  if (!app.candidateName?.trim()) missingFields.push('Nom complet');
  if (!app.candidateEmail?.trim() || !app.candidateEmail.includes('@'))
    missingFields.push('Email valide');
  if (!app.cin?.trim()) missingFields.push('Numéro CIN / Passeport');
  if (!app.currentMasterOrDegree?.trim()) missingFields.push('Diplôme d\'accès');
  if (!app.masterGpa || app.masterGpa < 10 || app.masterGpa > 20)
    missingFields.push('Moyenne du Master (10-20)');

  const docs = app.documents;
  if (!docs?.cinCard?.name) missingDocs.push('Carte Nationale d\'Identité (CIN)');
  if (!docs?.masterDiploma?.name)
    missingDocs.push('Diplôme de Master ou Ingénieur (Attestation)');
  if (!docs?.transcripts?.name) missingDocs.push('Relevés de notes S1-S4');
  if (!docs?.cv?.name) missingDocs.push('Curriculum Vitae (CV)');
  if (!docs?.motivationLetter?.name) missingDocs.push('Lettre de motivation');

  const totalRequired = 5 + 5; // 5 fields + 5 docs
  const filled =
    5 -
    missingFields.length +
    (5 - missingDocs.length);
  const completionPercentage = Math.round((filled / totalRequired) * 100);

  return {
    isValid: missingFields.length === 0 && missingDocs.length === 0,
    missingFields,
    missingDocs,
    completionPercentage,
  };
}

/**
 * Calculates a composite academic score out of 100 for candidate ranking.
 * Base = (GPA / 20) * 80 (Max 80 pts)
 * Mention bonus = Très Bien (+12 pts), Bien (+8 pts), Assez Bien (+4 pts)
 * Research proposal uploaded = +8 pts
 */
export function calculateCandidateScore(
  gpa: number,
  mention: 'Passable' | 'Assez Bien' | 'Bien' | 'Très Bien',
  hasResearchProposal: boolean = false
): number {
  const clampedGpa = Math.max(0, Math.min(20, gpa));
  const baseScore = (clampedGpa / 20) * 80;

  let mentionBonus = 0;
  switch (mention) {
    case 'Très Bien':
      mentionBonus = 12;
      break;
    case 'Bien':
      mentionBonus = 8;
      break;
    case 'Assez Bien':
      mentionBonus = 4;
      break;
    default:
      mentionBonus = 0;
  }

  const proposalBonus = hasResearchProposal ? 8 : 0;
  const total = baseScore + mentionBonus + proposalBonus;
  return Math.min(100, Math.round(total * 10) / 10);
}

/**
 * Validates permitted status transitions in the candidate evaluation pipeline.
 */
export function canTransitionStatus(
  current: ApplicationStatus,
  target: ApplicationStatus
): boolean {
  if (current === target) return true;

  const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    submitted: ['under_review', 'pieces_a_corriger', 'rejected'],
    under_review: ['preselected', 'pieces_a_corriger', 'admitted', 'interview_scheduled', 'rejected', 'waiting_list'],
    pieces_a_corriger: ['under_review', 'rejected'],
    preselected: ['interview_scheduled', 'admitted', 'rejected', 'waiting_list'],
    interview_scheduled: ['admitted', 'waiting_list', 'rejected'],
    waiting_list: ['admitted', 'rejected'],
    admitted: [], // terminal success
    rejected: ['under_review'], // can appeal/reopen
  };

  return validTransitions[current]?.includes(target) ?? false;
}

/**
 * Validates a doctoral re-inscription request.
 * If candidate is in Year >= 4 (dérogation), a justification and progress >= 40% is mandatory.
 */
export function validateReInscription(
  data: Partial<ReInscriptionRecord>
): { isValid: boolean; error?: string } {
  if (!data.studentName?.trim()) {
    return { isValid: false, error: 'Nom du doctorant requis.' };
  }
  if (!data.currentYear || data.currentYear < 2 || data.currentYear > 6) {
    return { isValid: false, error: 'Année de doctorat invalide (2 à 6).' };
  }

  const isDerogationYear = data.currentYear >= 4;
  if (isDerogationYear) {
    if (!data.derogationReason?.trim() || data.derogationReason.trim().length < 15) {
      return {
        isValid: false,
        error: 'Une justification détaillée de dérogation est obligatoire (minimum 15 caractères).',
      };
    }
    if ((data.progressPercentage ?? 0) < 40) {
      return {
        isValid: false,
        error: 'Pour une dérogation en 4e+ année, l\'avancement du manuscrit doit être d\'au moins 40%.',
      };
    }
  }

  return { isValid: true };
}

/**
 * Search & filter thesis catalogue
 */
export interface ThesisFilterOptions {
  searchQuery?: string;
  ced?: string;
  establishment?: string;
  funding?: string;
  status?: string;
}

export function filterTheses(
  theses: ThesisTopic[],
  filters: ThesisFilterOptions
): ThesisTopic[] {
  return theses.filter((thesis) => {
    if (filters.status && filters.status !== 'all') {
      if (thesis.status !== filters.status) return false;
    }

    if (filters.ced && filters.ced !== 'all') {
      if (thesis.ced !== filters.ced) return false;
    }

    if (filters.establishment && filters.establishment !== 'all') {
      if (thesis.establishment !== filters.establishment) return false;
    }

    if (filters.funding && filters.funding !== 'all') {
      if (!thesis.fundingType.toLowerCase().includes(filters.funding.toLowerCase())) {
        return false;
      }
    }

    if (filters.searchQuery?.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchTitle = thesis.title.toLowerCase().includes(q);
      const matchAbstract = thesis.abstract.toLowerCase().includes(q);
      const matchSupervisor = thesis.supervisorName.toLowerCase().includes(q);
      const matchLab = thesis.laboratory.toLowerCase().includes(q);
      const matchKeywords = thesis.keywords.some((k) => k.toLowerCase().includes(q));

      if (!matchTitle && !matchAbstract && !matchSupervisor && !matchLab && !matchKeywords) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Role-Based Access Control (RBAC) rules
 */
export function canUserApply(role?: string): boolean {
  return role === 'candidate';
}

export function canUserAccessProfSpace(role?: string): boolean {
  return role === 'professor' || role === 'ced_admin';
}

export function canUserModifyCandidateSpace(role?: string): boolean {
  return role === 'candidate';
}

export function isGuestUser(role?: string): boolean {
  return role === 'guest';
}

/**
 * Limit candidates to a maximum of two thesis topics
 */
export const MAX_THESIS_CHOICES_PER_CANDIDATE = 2;

export function canCandidateApplyMore(appliedCount: number): boolean {
  return appliedCount < MAX_THESIS_CHOICES_PER_CANDIDATE;
}

/**
 * Validate simplified account creation (only name and email required)
 */
export function validateAccountCreation(
  name: string,
  email: string
): { isValid: boolean; error?: string } {
  if (!name || name.trim().length < 2) {
    return { isValid: false, error: 'Veuillez saisir un nom complet (au moins 2 caractères).' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Veuillez saisir une adresse email valide.' };
  }
  return { isValid: true };
}

