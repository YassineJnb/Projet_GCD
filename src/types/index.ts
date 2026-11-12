export type CEDType = 'CED-ST' | 'CED-SHSJ' | 'CED-SS';

export type EstablishmentType =
  | 'FST Fès'
  | 'FS Dhar El Mahraz'
  | 'ENSA Fès'
  | 'Faculté de Médecine et Pharmacie'
  | 'FSJES Fès'
  | 'FLSH Dhar El Mahraz';

export type FundingType =
  | 'Bourse CNRST (7000 MAD/m)'
  | 'Contrat de Recherche Labo'
  | 'Bourse d\'Excellence USMBA'
  | 'Autofinancé / Salarié';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'pieces_a_corriger'
  | 'preselected'
  | 'interview_scheduled'
  | 'admitted'
  | 'waiting_list'
  | 'rejected';

export type DocVerificationStatus = 'pending' | 'valid' | 'rejected';

export interface UploadedDoc {
  name: string;
  size: string;
  type: string;
  uploadDate: string;
  verified: boolean;
  status: DocVerificationStatus;
  feedback?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  url?: string;
  fileData?: string; // base64 or content summary (kept out of Firestore application doc when fileId is set)
  fileId?: string; // reference to uploadedFiles document chunks
  chunkCount?: number;
  previewType?: 'pdf' | 'image' | 'text';
}

export interface CorrectionRequest {
  id: string;
  date: string;
  author: string;
  message: string;
  flaggedDocs: Array<{
    docKey: string;
    docLabel: string;
    reason: string;
  }>;
  resolved: boolean;
  resolvedDate?: string;
}

export interface ThesisTopic {
  id: string;
  title: string;
  abstract: string;
  keywords: string[];
  ced: CEDType;
  establishment: EstablishmentType;
  laboratory: string;
  supervisorName: string;
  supervisorEmail: string;
  supervisorTitle: string;
  coSupervisor?: string;
  positionsCount: number;
  remainingSlots: number;
  fundingType: FundingType;
  status: 'published' | 'pending_ced_validation' | 'closed';
  requiredDegrees: string[];
  minimumHonors: 'Passable' | 'Assez Bien' | 'Bien' | 'Très Bien';
  datePublished: string;
  deadline: string;
  applicantsCount: number;
}

export interface ApplicationDocuments {
  cinCard: UploadedDoc;
  masterDiploma: UploadedDoc;
  transcripts: UploadedDoc;
  cv: UploadedDoc;
  motivationLetter: UploadedDoc;
  researchProposal?: UploadedDoc;
}

export interface EmailNotificationRecord {
  stage: string;
  sentAt: string;
  recipient: string;
  senderEmail?: string;
  subject: string;
  messageId?: string;
  success: boolean;
  error?: string;
  plainTextBody?: string;
  gmailComposeUrl?: string;
}

export interface CandidateApplication {
  id: string;
  thesisId: string;
  thesisTitle: string;
  laboratory: string;
  supervisorName: string;
  ced: CEDType;
  
  // Personal Info
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  cin: string;
  cneMassar: string;
  birthDate: string;
  address: string;

  // Academic Background
  currentMasterOrDegree: string;
  universityOfOrigin: string;
  graduationYear: number;
  masterGpa: number; // e.g. 15.8 / 20
  mention: 'Passable' | 'Assez Bien' | 'Bien' | 'Très Bien';

  // Key Uploaded Documents (5 mandatory pieces justificatives)
  documents: ApplicationDocuments;

  // Status & Review Pipeline
  status: ApplicationStatus;
  calculatedScore: number;
  supervisorNotes?: string;
  interviewDate?: string;
  interviewTime?: string;
  interviewVenue?: string;
  interviewType?: 'Présentiel (Salle des Thèses)' | 'Visioconférence (Meet)';
  submissionDate: string;
  receiptCode: string;
  history: Array<{
    date: string;
    action: string;
    actor: string;
    details?: string;
  }>;
  correctionRequests?: CorrectionRequest[];
  emailLogs?: EmailNotificationRecord[];
}

export interface ReInscriptionRecord {
  id: string;
  studentName: string;
  studentCin: string;
  studentCode: string;
  thesisTitle: string;
  supervisorName: string;
  laboratory: string;
  currentYear: number;
  progressPercentage: number;
  activityReportSummary: string;
  publications: string[];
  communications: string[];
  isDerogation: boolean;
  derogationReason?: string;
  status: 'submitted' | 'supervisor_approved' | 'lab_approved' | 'ced_approved' | 'rejected';
  submissionDate: string;
}

export type RoleType = 'candidate' | 'professor' | 'ced_admin' | 'guest';

export interface UserProfile {
  id: string;
  name: string;
  role: RoleType;
  email: string;
  avatar: string;
  title: string;
  establishment?: EstablishmentType;
  laboratory?: string;
  googleUid?: string;
}
