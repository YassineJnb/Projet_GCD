import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDossier,
  calculateCandidateScore,
  canTransitionStatus,
  validateReInscription,
  filterTheses,
  canUserApply,
  canUserAccessProfSpace,
  canUserModifyCandidateSpace,
  isGuestUser,
  MAX_THESIS_CHOICES_PER_CANDIDATE,
  canCandidateApplyMore,
  validateAccountCreation,
} from './registrationRules';
import { ThesisTopic } from '../types';

test('validateDossier detects missing documents and fields', () => {
  const emptyApp = {};
  const resEmpty = validateDossier(emptyApp);
  assert.equal(resEmpty.isValid, false);
  assert.equal(resEmpty.completionPercentage, 0);
  assert.equal(resEmpty.missingFields.length, 5);
  assert.equal(resEmpty.missingDocs.length, 5);

  const fullApp = {
    candidateName: 'Amina El Amrani',
    candidateEmail: 'amina.elamrani@usmba.ac.ma',
    cin: 'CD678912',
    currentMasterOrDegree: 'Master Big Data & IA',
    masterGpa: 16.5,
    documents: {
      cinCard: {
        name: 'cin_scan.pdf',
        size: '1.2MB',
        type: 'application/pdf',
        uploadDate: '2026-11-10',
        verified: true,
        status: 'valid' as const,
      },
      masterDiploma: {
        name: 'attestation_master.pdf',
        size: '2.4MB',
        type: 'application/pdf',
        uploadDate: '2026-11-10',
        verified: true,
        status: 'valid' as const,
      },
      transcripts: {
        name: 'releves_s1_s4.pdf',
        size: '3.1MB',
        type: 'application/pdf',
        uploadDate: '2026-11-10',
        verified: true,
        status: 'valid' as const,
      },
      cv: {
        name: 'cv_amina.pdf',
        size: '800KB',
        type: 'application/pdf',
        uploadDate: '2026-11-10',
        verified: true,
        status: 'valid' as const,
      },
      motivationLetter: {
        name: 'lettre_motivation.pdf',
        size: '650KB',
        type: 'application/pdf',
        uploadDate: '2026-11-10',
        verified: true,
        status: 'valid' as const,
      },
    },
  };

  const resFull = validateDossier(fullApp);
  assert.equal(resFull.isValid, true);
  assert.equal(resFull.completionPercentage, 100);
  assert.equal(resFull.missingFields.length, 0);
  assert.equal(resFull.missingDocs.length, 0);
});

test('calculateCandidateScore applies GPA scale and honors bonus correctly', () => {
  // GPA 15/20 -> (15/20)*80 = 60 pts
  // Mention Bien = +8 pts
  // No proposal = +0 pts -> Total = 68
  const score1 = calculateCandidateScore(15, 'Bien', false);
  assert.equal(score1, 68);

  // GPA 18/20 -> (18/20)*80 = 72 pts
  // Mention Très Bien = +12 pts
  // Proposal = +8 pts -> Total = 92
  const score2 = calculateCandidateScore(18, 'Très Bien', true);
  assert.equal(score2, 92);

  // GPA clamped at 20 max
  const scoreMax = calculateCandidateScore(22, 'Très Bien', true);
  assert.equal(scoreMax, 100);
});

test('canTransitionStatus enforces logical candidate review workflow', () => {
  // Valid transitions
  assert.equal(canTransitionStatus('submitted', 'under_review'), true);
  assert.equal(canTransitionStatus('under_review', 'preselected'), true);
  assert.equal(canTransitionStatus('preselected', 'interview_scheduled'), true);
  assert.equal(canTransitionStatus('interview_scheduled', 'admitted'), true);
  assert.equal(canTransitionStatus('interview_scheduled', 'waiting_list'), true);

  // Invalid shortcut transitions
  assert.equal(canTransitionStatus('submitted', 'admitted'), false);
  assert.equal(canTransitionStatus('submitted', 'interview_scheduled'), false);
  assert.equal(canTransitionStatus('admitted', 'rejected'), false);
});

test('validateReInscription enforces derogation rules for 4th year and beyond', () => {
  // Normal 2nd year re-registration doesn't require derogation reason
  const year2 = {
    studentName: 'Youssef Berrada',
    currentYear: 2,
    progressPercentage: 40,
  };
  const resYear2 = validateReInscription(year2);
  assert.equal(resYear2.isValid, true);

  // 4th year requires derogation reason and >= 40% progress
  const year4NoReason = {
    studentName: 'Karim Tazi',
    currentYear: 4,
    progressPercentage: 50,
  };
  const resYear4NoReason = validateReInscription(year4NoReason);
  assert.equal(resYear4NoReason.isValid, false);

  const year4LowProgress = {
    studentName: 'Karim Tazi',
    currentYear: 4,
    derogationReason: 'Retard de livraison des composants de laboratoire',
    progressPercentage: 20,
  };
  const resYear4LowProgress = validateReInscription(year4LowProgress);
  assert.equal(resYear4LowProgress.isValid, false);

  const year4Valid = {
    studentName: 'Karim Tazi',
    currentYear: 4,
    derogationReason: 'Finalisation des publications Q1 et rédaction du chapitre 4 du manuscrit',
    progressPercentage: 60,
  };
  const resYear4Valid = validateReInscription(year4Valid);
  assert.equal(resYear4Valid.isValid, true);
});

test('filterTheses filters by search query and category correctly', () => {
  const sampleTheses: ThesisTopic[] = [
    {
      id: 'th-1',
      title: 'Intelligence Artificielle générative pour le diagnostic médical',
      abstract: 'Modèles de diffusion multimodaux pour l\'imagerie par résonance magnétique.',
      keywords: ['IA', 'Deep Learning', 'Santé'],
      ced: 'CED-ST',
      establishment: 'FST Fès',
      laboratory: 'LIIAN',
      supervisorName: 'Pr. Mohammed Alami',
      supervisorEmail: 'm.alami@usmba.ac.ma',
      supervisorTitle: 'Professeur d\'Enseignement Supérieur',
      positionsCount: 2,
      remainingSlots: 2,
      fundingType: 'Bourse CNRST (7000 MAD/m)',
      status: 'published',
      requiredDegrees: ['Master IA', 'Diplôme d\'Ingénieur Informatique'],
      minimumHonors: 'Bien',
      datePublished: '2026-10-15',
      deadline: '2026-12-01',
      applicantsCount: 5,
    },
    {
      id: 'th-2',
      title: 'Transition Énergétique et Réseaux Électriques Intelligents (Smart Grids)',
      abstract: 'Optimisation stochastique pour l\'intégration des énergies renouvelables.',
      keywords: ['Smart Grids', 'Solaire', 'Énergie'],
      ced: 'CED-ST',
      establishment: 'ENSA Fès',
      laboratory: 'LERMA',
      supervisorName: 'Pr. Salma Bennani',
      supervisorEmail: 's.bennani@usmba.ac.ma',
      supervisorTitle: 'Professeur Habilité',
      positionsCount: 1,
      remainingSlots: 1,
      fundingType: 'Contrat de Recherche Labo',
      status: 'published',
      requiredDegrees: ['Master Énergie', 'Ingénieur Électrique'],
      minimumHonors: 'Bien',
      datePublished: '2026-10-20',
      deadline: '2026-12-05',
      applicantsCount: 3,
    },
  ];

  // Search keyword match
  const filteredKeyword = filterTheses(sampleTheses, { searchQuery: 'Smart Grids' });
  assert.equal(filteredKeyword.length, 1);
  assert.equal(filteredKeyword[0].id, 'th-2');

  // Filter establishment
  const filteredEst = filterTheses(sampleTheses, { establishment: 'FST Fès' });
  assert.equal(filteredEst.length, 1);
  assert.equal(filteredEst[0].id, 'th-1');

  // Filter funding
  const filteredFunding = filterTheses(sampleTheses, { funding: 'CNRST' });
  assert.equal(filteredFunding.length, 1);
  assert.equal(filteredFunding[0].id, 'th-1');
});

test('RBAC rules restrict student and teacher permissions strictly', () => {
  // Candidate role: can apply, cannot access prof space, can modify candidate space
  assert.equal(canUserApply('candidate'), true);
  assert.equal(canUserAccessProfSpace('candidate'), false);
  assert.equal(canUserModifyCandidateSpace('candidate'), true);

  // Professor role: cannot apply, can access prof space, cannot modify candidate space
  assert.equal(canUserApply('professor'), false);
  assert.equal(canUserAccessProfSpace('professor'), true);
  assert.equal(canUserModifyCandidateSpace('professor'), false);

  // CED admin role: cannot apply, can access prof space, cannot modify candidate space
  assert.equal(canUserApply('ced_admin'), false);
  assert.equal(canUserAccessProfSpace('ced_admin'), true);
  assert.equal(canUserModifyCandidateSpace('ced_admin'), false);

  // Guest role: cannot apply, cannot access prof space, cannot modify candidate space, is guest
  assert.equal(canUserApply('guest'), false);
  assert.equal(canUserAccessProfSpace('guest'), false);
  assert.equal(canUserModifyCandidateSpace('guest'), false);
  assert.equal(isGuestUser('guest'), true);
  assert.equal(isGuestUser('candidate'), false);

  // Undefined or unknown role
  assert.equal(canUserApply(undefined), false);
  assert.equal(canUserAccessProfSpace(undefined), false);
  assert.equal(canUserModifyCandidateSpace(undefined), false);
});

test('candidate is limited to a maximum of two thesis choices', () => {
  assert.equal(MAX_THESIS_CHOICES_PER_CANDIDATE, 2);

  // 0 applied -> can apply
  assert.equal(canCandidateApplyMore(0), true);

  // 1 applied -> can apply
  assert.equal(canCandidateApplyMore(1), true);

  // 2 applied -> CANNOT apply more (limit reached)
  assert.equal(canCandidateApplyMore(2), false);

  // >2 applied -> cannot apply
  assert.equal(canCandidateApplyMore(3), false);
});

test('validateAccountCreation accepts only name and valid email', () => {
  // Missing or short name
  assert.equal(validateAccountCreation('', 'test@usmba.ac.ma').isValid, false);
  assert.equal(validateAccountCreation('A', 'test@usmba.ac.ma').isValid, false);

  // Invalid email
  assert.equal(validateAccountCreation('Hamza Idrissi', 'not-an-email').isValid, false);
  assert.equal(validateAccountCreation('Hamza Idrissi', 'test@domain').isValid, false);

  // Valid name and email
  const validResult = validateAccountCreation('Hamza Idrissi', 'h.idrissi@usmba.ac.ma');
  assert.equal(validResult.isValid, true);
  assert.equal(validResult.error, undefined);
});

test('rejected candidate cannot be directly admitted without formal review', () => {
  // A rejected candidate cannot transition to admitted directly
  assert.equal(canTransitionStatus('rejected', 'admitted'), false);
  // Reopening for re-examination is allowed
  assert.equal(canTransitionStatus('rejected', 'under_review'), true);
});

test('2nd year doctoral re-application is valid without derogation requirements', () => {
  const result = validateReInscription({
    studentName: 'Youssef Berrada',
    currentYear: 2,
    progressPercentage: 45,
    activityReportSummary: 'Validation des simulations sous Matlab/Simulink',
  });
  assert.equal(result.isValid, true);
  assert.equal(result.error, undefined);
});

