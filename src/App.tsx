/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ThesisCatalog } from './components/ThesisCatalog';
import { ThesisDetailModal } from './components/ThesisDetailModal';
import { OneClickRegistrationModal } from './components/OneClickRegistrationModal';
import { CandidatePortal } from './components/CandidatePortal';
import { ProfessorAdminDashboard } from './components/ProfessorAdminDashboard';
import {
  DocumentViewerModal,
  DocumentCandidateContext,
} from './components/DocumentViewerModal';
import { AttestationModal } from './components/AttestationModal';
import { CreateAccountModal } from './components/CreateAccountModal';
import {
  USERS,
  INITIAL_THESES,
  INITIAL_APPLICATIONS,
  INITIAL_REINSCIPTIONS,
} from './data/seedData';
import {
  ThesisTopic,
  CandidateApplication,
  ReInscriptionRecord,
  UserProfile,
  UploadedDoc,
  ApplicationDocuments,
  EmailNotificationRecord,
} from './types';
import {
  canUserApply,
  canUserAccessProfSpace,
  canUserModifyCandidateSpace,
  canCandidateApplyMore,
  MAX_THESIS_CHOICES_PER_CANDIDATE,
} from './utils/registrationRules';
import {
  db,
  seedDatabaseIfEmpty,
  saveThesisToDb,
  saveApplicationToDb,
  updateApplicationInDb,
  saveUserToDb,
  saveReInscriptionToDb,
  saveUploadedFileToDb,
  handleFirestoreError,
  OperationType,
} from './services/firebase';
import {
  initGmailAuth,
  signInWithGoogleGmail,
  authorizeGmailSendScope,
  isGmailSendAuthorized,
  disconnectGoogle,
  sendGmailStageNotification,
  SendEmailResult,
  SendStageEmailParams,
} from './services/gmail';
import { collection, onSnapshot } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { CheckCircle2, Mail, AlertTriangle, ExternalLink, Send, X, ShieldCheck } from 'lucide-react';

const ACTIVE_USER_SESSION_KEY = 'usmba_active_email';

export default function App() {
  const [theses, setTheses] = useState<ThesisTopic[]>(INITIAL_THESES);
  const [applications, setApplications] = useState<CandidateApplication[]>(
    INITIAL_APPLICATIONS
  );
  const [reInscriptions, setReInscriptions] = useState<ReInscriptionRecord[]>(
    INITIAL_REINSCIPTIONS
  );
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>(USERS);
  const availableUsersRef = useRef<UserProfile[]>(USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile>(USERS[0]);
  const currentUserRef = useRef<UserProfile>(USERS[0]);
  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [gmailSendAuthorized, setGmailSendAuthorized] = useState(false);
  const [isAuthorizingGmailSend, setIsAuthorizingGmailSend] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);

  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'catalog' | 'candidate_dashboard' | 'professor_portal'
  >('catalog');

  const [selectedThesisForDetail, setSelectedThesisForDetail] =
    useState<ThesisTopic | null>(null);
  const [selectedThesisForOneClick, setSelectedThesisForOneClick] =
    useState<ThesisTopic | null>(null);

  const [activeDocPreview, setActiveDocPreview] = useState<{
    doc: UploadedDoc;
    title: string;
    onValidate?: () => void;
    onReject?: (reason: string) => void;
    canReview?: boolean;
    candidateContext?: DocumentCandidateContext;
  } | null>(null);

  const [activeReceiptModal, setActiveReceiptModal] = useState<{
    app: CandidateApplication;
    type: 'receipt' | 'attestation';
  } | null>(null);

  const [pendingEmailDispatch, setPendingEmailDispatch] = useState<{
    res: SendEmailResult;
    params: SendStageEmailParams;
    appId?: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    availableUsersRef.current = availableUsers;
  }, [availableUsers]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Unified account activation (works for Google login, page refresh restore, and direct email)
  const activateAccountByEmail = async (params: {
    email: string;
    name?: string;
    avatar?: string;
    googleUid?: string;
    switchToDashboard?: boolean;
  }): Promise<UserProfile | null> => {
    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail) return null;

    const existing = availableUsersRef.current.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );

    let activeProfile: UserProfile;
    if (existing) {
      activeProfile = {
        ...existing,
        avatar: existing.avatar || params.avatar || '',
        googleUid: existing.googleUid || params.googleUid,
      };
      if (params.googleUid && !existing.googleUid) {
        saveUserToDb(activeProfile).catch(console.warn);
      }
    } else {
      const rawName = params.name?.trim() || cleanEmail.split('@')[0].replace(/[._]/g, ' ');
      const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      activeProfile = {
        id: params.googleUid
          ? `user-google-${params.googleUid.slice(0, 10)}`
          : `usr-${Date.now()}`,
        name: displayName,
        role: 'candidate',
        email: cleanEmail,
        avatar: params.avatar || '',
        title: params.googleUid
          ? 'Candidat Doctorat (Compte Google vérifié)'
          : 'Candidat Doctorat',
        establishment: 'FST Fès',
        googleUid: params.googleUid,
      };
      await saveUserToDb(activeProfile);
    }

    setAvailableUsers((prev) => {
      const filtered = prev.filter(
        (u) => u.id !== activeProfile.id && u.email.toLowerCase() !== cleanEmail
      );
      const next = [...filtered, activeProfile];
      availableUsersRef.current = next;
      return next;
    });

    setCurrentUser(activeProfile);
    try {
      sessionStorage.setItem(ACTIVE_USER_SESSION_KEY, cleanEmail);
    } catch {
      // ignore storage errors
    }

    if (params.switchToDashboard) {
      if (canUserAccessProfSpace(activeProfile.role)) {
        setActiveTab('professor_portal');
      } else {
        setActiveTab('candidate_dashboard');
      }
    }

    return activeProfile;
  };

  // 1. Initialize Firestore & real-time listeners
  useEffect(() => {
    // Seed initial collections if database is fresh
    seedDatabaseIfEmpty().then(() => {
      setIsDbConnected(true);
    });

    // Listen to Theses in real-time
    const pathTheses = 'theses';
    const unsubTheses = onSnapshot(
      collection(db, pathTheses),
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedTheses: ThesisTopic[] = [];
          snapshot.forEach((d) => loadedTheses.push(d.data() as ThesisTopic));
          setTheses(loadedTheses);
          setIsDbConnected(true);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, pathTheses);
      }
    );

    // Listen to Applications in real-time
    const pathApps = 'applications';
    const unsubApps = onSnapshot(
      collection(db, pathApps),
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedApps: CandidateApplication[] = [];
          snapshot.forEach((d) =>
            loadedApps.push(d.data() as CandidateApplication)
          );
          // Sort by submission date desc
          loadedApps.sort(
            (a, b) =>
              new Date(b.submissionDate).getTime() -
              new Date(a.submissionDate).getTime()
          );
          setApplications(loadedApps);
          setIsDbConnected(true);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, pathApps);
      }
    );

    // Listen to Users in real-time (always keep static roles + saved Firestore accounts)
    const pathUsers = 'users';
    const unsubUsers = onSnapshot(
      collection(db, pathUsers),
      (snapshot) => {
        const mergedMap = new Map<string, UserProfile>();
        USERS.forEach((u) => mergedMap.set(u.id, u));
        snapshot.forEach((d) => {
          const userData = d.data() as UserProfile;
          mergedMap.set(userData.id, userData);
        });
        const merged = Array.from(mergedMap.values());
        availableUsersRef.current = merged;
        setAvailableUsers(merged);

        // Restore saved session email if user is currently on guest mode
        try {
          const savedEmail = sessionStorage.getItem(ACTIVE_USER_SESSION_KEY);
          if (savedEmail) {
            const matched = merged.find(
              (u) => u.email.toLowerCase() === savedEmail.toLowerCase()
            );
            if (matched) {
              setCurrentUser((curr) => (curr.role === 'guest' ? matched : curr));
            }
          }
        } catch {
          // ignore
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, pathUsers);
      }
    );

    // Listen to Re-inscriptions in real-time
    const pathRe = 'reInscriptions';
    const unsubRe = onSnapshot(
      collection(db, pathRe),
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedRe: ReInscriptionRecord[] = [];
          snapshot.forEach((d) =>
            loadedRe.push(d.data() as ReInscriptionRecord)
          );
          setReInscriptions(loadedRe);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, pathRe);
      }
    );

    // 2. Setup Google / Gmail Auth Listener (preserve active role if user already selected a profile)
    const unsubGmail = initGmailAuth(
      async (user) => {
        setGoogleUser(user);
        setGmailSendAuthorized(isGmailSendAuthorized());
        if (user.email && currentUserRef.current.role === 'guest') {
          await activateAccountByEmail({
            email: user.email,
            name: user.displayName || undefined,
            avatar: user.photoURL || undefined,
            googleUid: user.uid,
            switchToDashboard: false,
          });
        }
      },
      () => {
        setGoogleUser(null);
        setGmailSendAuthorized(false);
      }
    );

    return () => {
      unsubTheses();
      unsubApps();
      unsubUsers();
      unsubRe();
      unsubGmail();
    };
  }, []);

  // Filter applications for current candidate
  const candidateApplications = applications.filter((app) => {
    const emailMatch =
      app.candidateEmail.toLowerCase() === currentUser.email.toLowerCase() ||
      (googleUser?.email &&
        app.candidateEmail.toLowerCase() === googleUser.email.toLowerCase());
    const nameMatch =
      app.candidateName.toLowerCase() === currentUser.name.toLowerCase();
    return emailMatch || nameMatch;
  });

  const appliedThesisIds = candidateApplications.map((app) => app.thesisId);
  const isLimitReached = !canCandidateApplyMore(appliedThesisIds.length);

  // Sign in with Google / Gmail and immediately activate their account & workspace
  const handleGoogleSignIn = async () => {
    if (isSigningInGoogle) return;
    setIsSigningInGoogle(true);
    try {
      const res = await signInWithGoogleGmail();
      if (res?.user) {
        setGoogleUser(res.user);
        if (res.user.email) {
          await activateAccountByEmail({
            email: res.user.email,
            name: res.user.displayName || undefined,
            avatar: res.user.photoURL || undefined,
            googleUid: res.user.uid,
            switchToDashboard: true,
          });
        }
        showToast(`Compte connecté : ${res.user.displayName || res.user.email}`);
      }
    } catch (err: any) {
      if (
        err?.code !== 'auth/cancelled-popup-request' &&
        err?.code !== 'auth/popup-closed-by-user'
      ) {
        showToast(`Erreur d'authentification Google : ${err.message || err}`);
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  // Explicitly authorize gmail.send scope for real Gmail API dispatch
  const handleAuthorizeGmailSend = async (): Promise<string | null> => {
    if (isAuthorizingGmailSend) return null;
    setIsAuthorizingGmailSend(true);
    try {
      const authRes = await authorizeGmailSendScope();
      if (authRes.granted && authRes.accessToken) {
        setGmailSendAuthorized(true);
        showToast(
          `Envoi réel Gmail API activé pour ${authRes.email || 'votre compte Google'} !`
        );
        return authRes.accessToken;
      }
      if (!authRes.cancelled && authRes.error) {
        showToast(authRes.error);
      }
      return null;
    } finally {
      setIsAuthorizingGmailSend(false);
    }
  };

  // Build standardized EmailNotificationRecord for Firestore
  const toEmailRecord = (
    stage: string,
    res: SendEmailResult
  ): EmailNotificationRecord => ({
    stage,
    sentAt: res.sentAt,
    recipient: res.recipient,
    senderEmail: res.senderEmail,
    subject: res.subject,
    messageId: res.messageId,
    success: res.success,
    error: res.error,
    plainTextBody: res.plainTextBody,
    gmailComposeUrl: res.gmailComposeUrl,
  });

  // Helper to dispatch email notification and surface actionable fallback if Gmail API is not authorized
  const dispatchEmailNotification = async (
    params: SendStageEmailParams,
    appId?: string,
    overrideToken?: string
  ): Promise<SendEmailResult> => {
    const res = await sendGmailStageNotification(params, overrideToken);
    setGmailSendAuthorized(isGmailSendAuthorized());

    if (!res.success) {
      setPendingEmailDispatch({ res, params, appId });
    } else {
      setPendingEmailDispatch(null);
    }
    return res;
  };

  // Retry a failed email after authorizing Gmail API send
  const handleRetryPendingEmailWithAuth = async () => {
    if (!pendingEmailDispatch) return;
    const token = await handleAuthorizeGmailSend();
    if (!token) return;

    const { params, appId } = pendingEmailDispatch;
    const retryRes = await dispatchEmailNotification(params, appId, token);

    if (appId) {
      const targetApp = applications.find((a) => a.id === appId);
      if (targetApp) {
        const updatedLogs = [
          toEmailRecord(params.stage, retryRes),
          ...(targetApp.emailLogs || []),
        ];
        await updateApplicationInDb(appId, { emailLogs: updatedLogs });
      }
    }

    if (retryRes.success) {
      showToast(`Email envoyé réellement via Gmail API à ${retryRes.recipient} !`);
    } else if (retryRes.error) {
      showToast(retryRes.error);
    }
  };

  // Sign out Google
  const handleGoogleSignOut = async () => {
    await disconnectGoogle();
    setGoogleUser(null);
    setGmailSendAuthorized(false);
    try {
      sessionStorage.removeItem(ACTIVE_USER_SESSION_KEY);
    } catch {
      // ignore
    }
    setCurrentUser(USERS[0]);
    setActiveTab('catalog');
    showToast('Compte déconnecté.');
  };

  // Direct login with email (e.g. candidat@usmba.ac.ma)
  const handleDirectEmailLogin = async (email: string) => {
    const profile = await activateAccountByEmail({
      email,
      switchToDashboard: true,
    });
    if (profile) {
      showToast(`Compte ouvert : ${profile.name} (${profile.email})`);
    }
  };

  // Send a test stage email
  const handleSendTestGmail = async (targetApp?: CandidateApplication) => {
    const targetEmail =
      targetApp?.candidateEmail || googleUser?.email || currentUser.email;
    if (!targetEmail) {
      showToast('Veuillez vous connecter avec votre email ou Google pour tester.');
      return;
    }

    const appToUse = targetApp ||
      applications[0] || {
        receiptCode: 'USMBA-DOC-2026-TEST',
        thesisTitle: 'Thèse de Recherche Doctorale USMBA',
        candidateName: currentUser.name,
        candidateEmail: targetEmail,
      };

    const params: SendStageEmailParams = {
      toEmail: targetEmail,
      candidateName: targetApp?.candidateName || currentUser.name,
      thesisTitle: appToUse.thesisTitle,
      receiptCode: appToUse.receiptCode,
      stage: 'submission_receipt',
      additionalDetails: {
        customMessage:
          'Ceci est un test de validation en direct de la connexion de votre boîte Gmail avec le Guichet Centralisé du Doctorat USMBA.',
      },
    };

    const res = await dispatchEmailNotification(params, targetApp?.id);

    if (targetApp?.id) {
      await updateApplicationInDb(targetApp.id, {
        emailLogs: [toEmailRecord('submission_receipt', res), ...(targetApp.emailLogs || [])],
      });
    }

    if (res.success) {
      showToast(`Courriel envoyé réellement via Gmail API à ${targetEmail} !`);
    } else {
      showToast(
        `Envoi Gmail API requis/bloqué pour ${targetEmail} : utilisez l'assistant d'envoi affiché.`
      );
    }
  };

  // Handle account creation
  const handleCreateAccount = async (newUser: UserProfile) => {
    await saveUserToDb(newUser);
    setAvailableUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    try {
      sessionStorage.setItem(ACTIVE_USER_SESSION_KEY, newUser.email.toLowerCase());
    } catch {
      // ignore
    }

    if (newUser.role === 'candidate') {
      setActiveTab('candidate_dashboard');
      showToast(
        `Compte créé et enregistré en BDD pour ${newUser.name}.`
      );
    } else {
      setActiveTab('professor_portal');
      showToast(`Compte enseignant créé pour ${newUser.name}.`);
    }
  };

  // Submit new application
  const handleApplicationSubmit = async (newApp: CandidateApplication) => {
    if (appliedThesisIds.length >= MAX_THESIS_CHOICES_PER_CANDIDATE) {
      showToast('Limite atteinte : 2 choix de thèse maximum par candidat.');
      return;
    }

    const targetEmail = newApp.candidateEmail || googleUser?.email || currentUser.email;
    const emailRes = await dispatchEmailNotification(
      {
        toEmail: targetEmail,
        candidateName: newApp.candidateName,
        thesisTitle: newApp.thesisTitle,
        receiptCode: newApp.receiptCode,
        stage: 'submission_receipt',
      },
      newApp.id
    );

    const emailRecord = toEmailRecord('submission_receipt', emailRes);

    const appWithLog: CandidateApplication = {
      ...newApp,
      emailLogs: [emailRecord, ...(newApp.emailLogs || [])],
    };

    // 1. Save to Firestore
    await saveApplicationToDb(appWithLog);

    // 2. Update thesis applicants count in Firestore
    const targetThesis = theses.find((t) => t.id === newApp.thesisId);
    if (targetThesis) {
      await saveThesisToDb({
        ...targetThesis,
        applicantsCount: targetThesis.applicantsCount + 1,
      });
    }

    if (emailRes.success) {
      showToast(`Candidature enregistrée et accusé envoyé par Gmail à ${targetEmail}`);
    } else {
      showToast(`Candidature enregistrée en BDD (Réf: ${newApp.receiptCode}).`);
    }
    setActiveReceiptModal({ app: appWithLog, type: 'receipt' });
  };

  // Add new thesis
  const handleAddNewThesis = async (newThesis: ThesisTopic) => {
    await saveThesisToDb(newThesis);
    showToast('Sujet publié et enregistré dans la BDD Firestore.');
  };

  // Update application status & send Gmail stage alert
  const handleUpdateApplicationStatus = async (
    appId: string,
    newStatus: CandidateApplication['status'],
    notes?: string,
    interviewDetails?: { date: string; time: string; venue: string }
  ) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;

    const updatedHistory = [
      ...targetApp.history,
      {
        date: new Date().toLocaleDateString('fr-FR'),
        action: `Statut modifié : ${newStatus}`,
        actor: currentUser.name,
        details: notes,
      },
    ];

    const targetEmail = targetApp.candidateEmail;
    let stageKey: any = null;
    if (newStatus === 'interview_scheduled') stageKey = 'interview_convocation';
    else if (newStatus === 'admitted') stageKey = 'admission_accepted';
    else if (newStatus === 'rejected') stageKey = 'application_refused';

    let nextEmailLogs = targetApp.emailLogs || [];
    let emailSuccess = false;
    if (stageKey) {
      const emailRes = await dispatchEmailNotification(
        {
          toEmail: targetEmail,
          candidateName: targetApp.candidateName,
          thesisTitle: targetApp.thesisTitle,
          receiptCode: targetApp.receiptCode,
          stage: stageKey,
          additionalDetails: {
            customMessage: notes,
            interviewDate: interviewDetails?.date,
            interviewTime: interviewDetails?.time,
            interviewVenue: interviewDetails?.venue,
          },
        },
        appId
      );
      emailSuccess = emailRes.success;
      nextEmailLogs = [
        toEmailRecord(stageKey, emailRes),
        ...nextEmailLogs,
      ];
    }

    const updates: Partial<CandidateApplication> = {
      status: newStatus,
      supervisorNotes: notes || targetApp.supervisorNotes,
      interviewDate: interviewDetails?.date || targetApp.interviewDate,
      interviewTime: interviewDetails?.time || targetApp.interviewTime,
      interviewVenue: interviewDetails?.venue || targetApp.interviewVenue,
      history: updatedHistory,
      emailLogs: nextEmailLogs,
    };

    await updateApplicationInDb(appId, updates);
    if (stageKey) {
      showToast(
        emailSuccess
          ? `Décision enregistrée et email envoyé via Gmail API à ${targetEmail}.`
          : `Décision enregistrée. Finalisez l'envoi à ${targetEmail} via le panneau Gmail.`
      );
    } else {
      showToast(`Statut mis à jour dans la base de données.`);
    }
  };

  // Validate all 5 pieces atomically
  const handleValidateAllDocs = async (appId: string) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;

    const today = new Date().toLocaleDateString('fr-FR');
    const keys: (keyof ApplicationDocuments)[] = [
      'cinCard',
      'masterDiploma',
      'transcripts',
      'cv',
      'motivationLetter',
    ];

    const updatedDocs = { ...targetApp.documents };
    keys.forEach((k) => {
      const existing = updatedDocs[k];
      if (existing) {
        const cleanDoc = { ...existing };
        delete cleanDoc.feedback;
        updatedDocs[k] = {
          ...cleanDoc,
          status: 'valid',
          verified: true,
          verifiedBy: currentUser.name,
          verifiedAt: today,
        };
      }
    });

    await updateApplicationInDb(appId, {
      documents: updatedDocs,
      history: [
        ...targetApp.history,
        {
          date: today,
          action: 'Toutes les 5 pièces justificatives validées conformes',
          actor: currentUser.name,
        },
      ],
    });
    showToast('Les 5 pièces justificatives ont été validées.');
  };

  // Responsable updates verification of 1 of the 5 pieces
  const handleUpdateDocVerification = async (
    appId: string,
    docKey: keyof ApplicationDocuments,
    status: 'valid' | 'rejected',
    feedback?: string
  ) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;

    const targetDoc = targetApp.documents[docKey];
    if (!targetDoc) return;

    const updatedDoc: UploadedDoc = {
      ...targetDoc,
      status,
      verified: status === 'valid',
      verifiedBy: currentUser.name,
      verifiedAt: new Date().toLocaleDateString('fr-FR'),
      ...(status === 'rejected' ? { feedback } : {}),
    };
    if (status === 'valid') {
      delete updatedDoc.feedback;
    }

    const updatedDocs = {
      ...targetApp.documents,
      [docKey]: updatedDoc,
    };

    // Update activeDocPreview immediately if open
    setActiveDocPreview((prev) =>
      prev && prev.doc.name === targetDoc.name ? { ...prev, doc: updatedDoc } : prev
    );

    const actionText =
      status === 'valid'
        ? `Pièce validée conforme (${docKey})`
        : `Pièce rejetée / À corriger (${docKey} : ${feedback || 'non conforme'})`;

    const updatedHistory = [
      ...targetApp.history,
      {
        date: new Date().toLocaleDateString('fr-FR'),
        action: actionText,
        actor: currentUser.name,
      },
    ];

    await updateApplicationInDb(appId, {
      documents: updatedDocs,
      history: updatedHistory,
    });

    showToast(`Pièce ${status === 'valid' ? 'validée conforme' : 'rejetée'} (enregistré en BDD).`);
  };

  // Responsable sends correction request for missing/wrong documents with Gmail message
  const handleSendCorrectionRequest = async (
    appId: string,
    message: string,
    flaggedDocs: Array<{ docKey: string; docLabel: string; reason: string }>
  ) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;

    const newCorrection = {
      id: `corr-${Date.now()}`,
      date: new Date().toLocaleDateString('fr-FR'),
      author: currentUser.name,
      message,
      flaggedDocs,
      resolved: false,
    };

    const updatedRequests = [newCorrection, ...(targetApp.correctionRequests || [])];

    const updatedHistory = [
      ...targetApp.history,
      {
        date: new Date().toLocaleDateString('fr-FR'),
        action: `Demande de correction de pièces justificatives (${flaggedDocs.length} pièce(s))`,
        actor: currentUser.name,
        details: message,
      },
    ];

    const targetEmail = targetApp.candidateEmail;
    const emailRes = await dispatchEmailNotification(
      {
        toEmail: targetEmail,
        candidateName: targetApp.candidateName,
        thesisTitle: targetApp.thesisTitle,
        receiptCode: targetApp.receiptCode,
        stage: 'documents_correction_needed',
        additionalDetails: {
          customMessage: message,
          flaggedDocuments: flaggedDocs,
        },
      },
      appId
    );

    const nextEmailLogs = [
      toEmailRecord('documents_correction_needed', emailRes),
      ...(targetApp.emailLogs || []),
    ];

    await updateApplicationInDb(appId, {
      status: 'pieces_a_corriger',
      correctionRequests: updatedRequests,
      history: updatedHistory,
      emailLogs: nextEmailLogs,
    });

    showToast(
      emailRes.success
        ? `Demande enregistrée et email envoyé via Gmail API à ${targetEmail}.`
        : `Demande enregistrée en BDD. Finalisez l'envoi à ${targetEmail} via le panneau Gmail.`
    );
  };

  // Candidate replaces/uploads corrected document with chunked Firestore persistence
  const handleReplaceDocument = async (
    appId: string,
    docKey: keyof ApplicationDocuments,
    file: File
  ) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${Math.round(file.size / 1024)} KB`;
    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    const isImg = file.type.includes('image') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
    const mimeType = file.type || (isPdf ? 'application/pdf' : isImg ? 'image/png' : 'application/octet-stream');
    const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const chunkCount = await saveUploadedFileToDb(fileId, dataUrl, {
        name: file.name,
        type: mimeType,
        size: sizeStr,
      });

      const updatedDoc: UploadedDoc = {
        name: file.name,
        size: sizeStr,
        type: mimeType,
        uploadDate: new Date().toISOString().split('T')[0],
        verified: false,
        status: 'pending',
        fileId,
        chunkCount,
        previewType: isImg ? 'image' : 'pdf',
      };

      const updatedDocs = {
        ...targetApp.documents,
        [docKey]: updatedDoc,
      };

      const updatedHistory = [
        ...targetApp.history,
        {
          date: new Date().toLocaleDateString('fr-FR'),
          action: `Nouvelle version téléversée pour la pièce (${file.name})`,
          actor: currentUser.name,
        },
      ];

      await updateApplicationInDb(appId, {
        documents: updatedDocs,
        history: updatedHistory,
      });

      showToast(`Pièce justificative enregistrée (${file.name}) et prête à l'aperçu.`);
    };
    reader.readAsDataURL(file);
  };

  // Candidate resubmits corrected dossier for review
  const handleResubmitCorrectedDossier = async (appId: string) => {
    const targetApp = applications.find((a) => a.id === appId);
    if (!targetApp) return;

    const updatedHistory = [
      ...targetApp.history,
      {
        date: new Date().toLocaleDateString('fr-FR'),
        action: 'Dossier corrigé renvoyé pour réexamen par la commission',
        actor: currentUser.name,
      },
    ];

    await updateApplicationInDb(appId, {
      status: 'under_review',
      history: updatedHistory,
    });

    showToast('Dossier renvoyé avec succès. Les pièces sont remises en examen.');
  };

  // Submit re-inscription
  const handleReInscriptionSubmit = async (record: ReInscriptionRecord) => {
    await saveReInscriptionToDb(record);
    showToast(`Rapport de réinscription soumis et enregistré dans la BDD.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <Header
        currentUser={currentUser}
        availableUsers={availableUsers}
        onSwitchUser={(user) => {
          setCurrentUser(user);
          try {
            if (user.role === 'guest') {
              sessionStorage.removeItem(ACTIVE_USER_SESSION_KEY);
            } else {
              sessionStorage.setItem(ACTIVE_USER_SESSION_KEY, user.email.toLowerCase());
            }
          } catch {
            // ignore
          }
          if (user.role === 'guest') {
            setActiveTab('catalog');
            showToast('Mode consultation invité actif.');
          } else if (
            !canUserAccessProfSpace(user.role) &&
            activeTab === 'professor_portal'
          ) {
            setActiveTab('catalog');
            showToast(`Compte actif : ${user.name}`);
          } else {
            showToast(`Compte actif : ${user.name}`);
          }
        }}
        onOpenCreateAccount={() => setIsCreateAccountOpen(true)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (currentUser.role === 'guest' && tab !== 'catalog') {
            setActiveTab('catalog');
            return;
          }
          if (
            tab === 'professor_portal' &&
            !canUserAccessProfSpace(currentUser.role)
          ) {
            setActiveTab('catalog');
            return;
          }
          setActiveTab(tab);
        }}
        totalThesesCount={theses.length}
        totalApplicantsCount={applications.length}
        googleUser={googleUser}
        isSigningInGoogle={isSigningInGoogle}
        gmailSendAuthorized={gmailSendAuthorized}
        isAuthorizingGmailSend={isAuthorizingGmailSend}
        onGoogleSignIn={handleGoogleSignIn}
        onAuthorizeGmailSend={handleAuthorizeGmailSend}
        onGoogleSignOut={handleGoogleSignOut}
        onSendTestGmail={() => handleSendTestGmail()}
        onDirectEmailLogin={handleDirectEmailLogin}
        isDbConnected={isDbConnected}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-white border border-slate-200 text-slate-900 text-xs font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Actionable Gmail Dispatch Fallback Modal / Assistant */}
      {pendingEmailDispatch && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-16 z-50 w-auto sm:max-w-md bg-white border-2 border-amber-300 rounded-2xl shadow-2xl p-4 text-xs text-slate-800 space-y-3 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Envoi réel par Gmail requis pour {pendingEmailDispatch.res.recipient}</span>
            </div>
            <button
              onClick={() => setPendingEmailDispatch(null)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-950 space-y-1">
            <div className="font-semibold truncate">Objet : {pendingEmailDispatch.res.subject}</div>
            <p className="text-amber-800 leading-snug">{pendingEmailDispatch.res.error}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleRetryPendingEmailWithAuth}
              disabled={isAuthorizingGmailSend}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {isAuthorizingGmailSend ? 'Autorisation...' : 'Autoriser Gmail API & Envoyer'}
              </span>
            </button>

            <a
              href={pendingEmailDispatch.res.gmailComposeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Envoyer via Gmail Web</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'catalog' && (
          <ThesisCatalog
            theses={theses}
            currentUser={currentUser}
            onSelectThesis={(thesis) => setSelectedThesisForDetail(thesis)}
            onApplyOneClick={(thesis) => {
              if (!canUserApply(currentUser.role)) return;
              if (isLimitReached) {
                showToast('Limite atteinte : 2 thèses maximum par candidat.');
                return;
              }
              setSelectedThesisForOneClick(thesis);
            }}
            appliedThesisIds={appliedThesisIds}
          />
        )}

        {activeTab === 'candidate_dashboard' && (
          <CandidatePortal
            applications={
              canUserModifyCandidateSpace(currentUser.role)
                ? candidateApplications
                : applications
            }
            reInscriptions={reInscriptions}
            currentUser={currentUser}
            googleUser={googleUser}
            gmailSendAuthorized={gmailSendAuthorized}
            isAuthorizingGmailSend={isAuthorizingGmailSend}
            onAuthorizeGmailSend={handleAuthorizeGmailSend}
            onOpenReceipt={(app) => setActiveReceiptModal({ app, type: 'receipt' })}
            onOpenAttestation={(app) =>
              setActiveReceiptModal({ app, type: 'attestation' })
            }
            onSubmitReInscription={handleReInscriptionSubmit}
            onViewDocPreview={(doc, title, app) =>
              setActiveDocPreview({
                doc,
                title,
                canReview: false,
                candidateContext: app
                  ? {
                      candidateName: app.candidateName,
                      candidateEmail: app.candidateEmail,
                      cin: app.cin,
                      degree: app.currentMasterOrDegree,
                      gpa: app.masterGpa,
                      mention: app.mention,
                      thesisTitle: app.thesisTitle,
                      supervisorName: app.supervisorName,
                    }
                  : {
                      candidateName: currentUser.name,
                      candidateEmail: currentUser.email,
                    },
              })
            }
            onReplaceDocument={handleReplaceDocument}
            onResubmitCorrectedDossier={handleResubmitCorrectedDossier}
            onSendTestGmail={handleSendTestGmail}
            onGoogleSignIn={handleGoogleSignIn}
            onGoToCatalog={() => setActiveTab('catalog')}
          />
        )}

        {activeTab === 'professor_portal' &&
          canUserAccessProfSpace(currentUser.role) && (
            <ProfessorAdminDashboard
              currentUser={currentUser}
              theses={theses}
              applications={applications}
              googleUser={googleUser}
              gmailSendAuthorized={gmailSendAuthorized}
              isAuthorizingGmailSend={isAuthorizingGmailSend}
              onAuthorizeGmailSend={handleAuthorizeGmailSend}
              onAddNewThesis={handleAddNewThesis}
              onUpdateApplicationStatus={handleUpdateApplicationStatus}
              onUpdateDocVerification={handleUpdateDocVerification}
              onSendCorrectionRequest={handleSendCorrectionRequest}
              onValidateAllDocs={handleValidateAllDocs}
              onViewDocPreview={(doc, title, onValidate, onReject, candidateContext) =>
                setActiveDocPreview({
                  doc,
                  title,
                  onValidate,
                  onReject,
                  canReview: true,
                  candidateContext,
                })
              }
              onSendStageEmailDirect={async (app, stage) => {
                const emailRes = await dispatchEmailNotification(
                  {
                    toEmail: app.candidateEmail,
                    candidateName: app.candidateName,
                    thesisTitle: app.thesisTitle,
                    receiptCode: app.receiptCode,
                    stage,
                  },
                  app.id
                );
                await updateApplicationInDb(app.id, {
                  emailLogs: [toEmailRecord(stage, emailRes), ...(app.emailLogs || [])],
                });
                if (emailRes.success) {
                  showToast(`Email envoyé réellement via Gmail API à ${app.candidateEmail} !`);
                }
                return emailRes.success;
              }}
            />
          )}
      </main>

      {/* Modals */}
      <ThesisDetailModal
        thesis={selectedThesisForDetail}
        isOpen={Boolean(selectedThesisForDetail)}
        onClose={() => setSelectedThesisForDetail(null)}
        onApplyOneClick={(thesis) => {
          if (!canUserApply(currentUser.role)) return;
          if (isLimitReached) {
            showToast('Limite atteinte : 2 thèses maximum par candidat.');
            return;
          }
          setSelectedThesisForOneClick(thesis);
        }}
        isApplied={
          selectedThesisForDetail
            ? appliedThesisIds.includes(selectedThesisForDetail.id)
            : false
        }
        canApply={canUserApply(currentUser.role)}
        isLimitReached={isLimitReached}
      />

      {canUserApply(currentUser.role) && (
        <OneClickRegistrationModal
          thesis={selectedThesisForOneClick}
          isOpen={Boolean(selectedThesisForOneClick)}
          onClose={() => setSelectedThesisForOneClick(null)}
          currentUser={currentUser}
          onSubmitApplication={handleApplicationSubmit}
          onViewDocPreview={(doc, title) =>
            setActiveDocPreview({
              doc,
              title,
              canReview: false,
              candidateContext: {
                candidateName: currentUser.name,
                candidateEmail: currentUser.email,
                thesisTitle: selectedThesisForOneClick?.title,
                supervisorName: selectedThesisForOneClick?.supervisorName,
              },
            })
          }
        />
      )}

      <CreateAccountModal
        isOpen={isCreateAccountOpen}
        onClose={() => setIsCreateAccountOpen(false)}
        onCreateAccount={handleCreateAccount}
      />

      <DocumentViewerModal
        doc={activeDocPreview?.doc || null}
        docTitle={activeDocPreview?.title || ''}
        isOpen={Boolean(activeDocPreview)}
        onClose={() => setActiveDocPreview(null)}
        onValidateDoc={activeDocPreview?.onValidate}
        onRejectDoc={activeDocPreview?.onReject}
        canReview={activeDocPreview?.canReview}
        candidateContext={activeDocPreview?.candidateContext}
      />

      <AttestationModal
        app={activeReceiptModal?.app || null}
        type={activeReceiptModal?.type || 'receipt'}
        isOpen={Boolean(activeReceiptModal)}
        onClose={() => setActiveReceiptModal(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white text-slate-500 text-xs py-4 px-4 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Université Sidi Mohamed Ben Abdellah • Centre d'Études Doctorales (CED)
          </div>
          <div className="flex items-center gap-2">
            <span>Base de données Firestore</span>
            <span>•</span>
            <span>Intégration Gmail API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
