import React, { useState } from 'react';
import {
  FileCheck2,
  Calendar,
  RotateCcw,
  Printer,
  Sparkles,
  AlertTriangle,
  Upload,
  Eye,
  CheckCircle2,
  Clock,
  Mail,
  Send,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  BookOpen,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import {
  CandidateApplication,
  ReInscriptionRecord,
  UserProfile,
  UploadedDoc,
  ApplicationDocuments,
} from '../types';
import {
  validateReInscription,
  canUserModifyCandidateSpace,
} from '../utils/registrationRules';
import { User as FirebaseUser } from 'firebase/auth';

interface CandidatePortalProps {
  applications: CandidateApplication[];
  reInscriptions: ReInscriptionRecord[];
  currentUser: UserProfile;
  googleUser: FirebaseUser | null;
  gmailSendAuthorized?: boolean;
  isAuthorizingGmailSend?: boolean;
  onAuthorizeGmailSend?: () => void;
  onOpenReceipt: (app: CandidateApplication) => void;
  onOpenAttestation: (app: CandidateApplication) => void;
  onSubmitReInscription: (record: ReInscriptionRecord) => void;
  onViewDocPreview: (
    doc: UploadedDoc,
    title: string,
    app?: CandidateApplication
  ) => void;
  onReplaceDocument: (
    appId: string,
    docKey: keyof ApplicationDocuments,
    file: File
  ) => void;
  onResubmitCorrectedDossier: (appId: string) => void;
  onSendTestGmail: (app?: CandidateApplication) => void;
  onGoogleSignIn: () => void;
  onGoToCatalog?: () => void;
}

export const CandidatePortal: React.FC<CandidatePortalProps> = ({
  applications,
  reInscriptions,
  currentUser,
  googleUser,
  gmailSendAuthorized = false,
  isAuthorizingGmailSend = false,
  onAuthorizeGmailSend,
  onOpenReceipt,
  onOpenAttestation,
  onSubmitReInscription,
  onViewDocPreview,
  onReplaceDocument,
  onResubmitCorrectedDossier,
  onSendTestGmail,
  onGoogleSignIn,
  onGoToCatalog,
}) => {
  const canModify = canUserModifyCandidateSpace(currentUser.role);
  const myExistingRecord = reInscriptions.find(
    (r) =>
      r.studentName.toLowerCase() === currentUser.name.toLowerCase() ||
      (currentUser.email &&
        r.studentName.toLowerCase().includes(
          currentUser.name.toLowerCase().split(' ')[0]
        ))
  );

  const isReInscribingStudent =
    Boolean(myExistingRecord) ||
    Boolean(currentUser.title?.toLowerCase().includes('réinscription')) ||
    Boolean(currentUser.title?.toLowerCase().includes('2e année'));

  const [activeSubTab, setActiveSubTab] = useState<'applications' | 'stages_inbox' | 'reinscription'>(
    isReInscribingStudent ? 'reinscription' : 'applications'
  );

  // Re-inscription state
  const [reinscriptionYear, setReinscriptionYear] = useState<number>(
    myExistingRecord ? myExistingRecord.currentYear : 2
  );
  const [thesisTitle, setThesisTitle] = useState(
    myExistingRecord
      ? myExistingRecord.thesisTitle
      : 'Apprentissage par Renforcement et Contrôle Prédictif pour les Micro-réseaux Hybrides'
  );
  const [supervisorName, setSupervisorName] = useState(
    myExistingRecord ? myExistingRecord.supervisorName : 'Pr. Mohammed Alami'
  );
  const [labName, setLabName] = useState(
    myExistingRecord ? myExistingRecord.laboratory : 'LIIAN (FST Fès)'
  );
  const [progressPercentage, setProgressPercentage] = useState<number>(
    myExistingRecord ? myExistingRecord.progressPercentage : 45
  );
  const [activityReport, setActivityReport] = useState(
    myExistingRecord
      ? myExistingRecord.activityReportSummary
      : "Validation des simulations sous Matlab/Simulink. Soumission d'un article de conférence."
  );
  const [derogationReason, setDerogationReason] = useState(
    myExistingRecord?.derogationReason || ''
  );
  const [reSuccess, setReSuccess] = useState(false);

  React.useEffect(() => {
    if (myExistingRecord) {
      setReinscriptionYear(myExistingRecord.currentYear);
      setThesisTitle(myExistingRecord.thesisTitle);
      setSupervisorName(myExistingRecord.supervisorName);
      setLabName(myExistingRecord.laboratory);
      setProgressPercentage(myExistingRecord.progressPercentage);
      setActivityReport(myExistingRecord.activityReportSummary);
      setDerogationReason(myExistingRecord.derogationReason || '');
    }
  }, [currentUser.id, myExistingRecord?.id]);

  const getStatusLabel = (status: CandidateApplication['status']) => {
    switch (status) {
      case 'submitted':
        return { label: 'Dossier Reçu', cls: 'bg-slate-100 text-slate-700' };
      case 'under_review':
        return { label: 'En Examen par la Commission', cls: 'bg-blue-50 text-blue-700 border border-blue-200' };
      case 'pieces_a_corriger':
        return { label: 'Pièces à Corriger (Action requise)', cls: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold' };
      case 'preselected':
        return { label: 'Présélectionné', cls: 'bg-purple-50 text-purple-700 border border-purple-200' };
      case 'interview_scheduled':
        return { label: 'Entretien Convoqué', cls: 'bg-purple-100 text-purple-900 border border-purple-300 font-bold' };
      case 'admitted':
        return { label: 'Admis Définitivement (Principal)', cls: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold' };
      case 'waiting_list':
        return { label: "Liste d'Attente", cls: 'bg-amber-50 text-amber-800' };
      case 'rejected':
        return { label: 'Non Retenu', cls: 'bg-rose-50 text-rose-700 border border-rose-200' };
    }
  };

  const handleReInscriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateReInscription({
      studentName: currentUser.name,
      currentYear: reinscriptionYear,
      progressPercentage,
      derogationReason,
    });

    if (!validation.isValid) return;

    const newRecord: ReInscriptionRecord = {
      id: `re-${Date.now()}`,
      studentName: currentUser.name,
      studentCin: 'CD678912',
      studentCode: `DOC-2024-${Math.floor(1000 + Math.random() * 9000)}`,
      thesisTitle,
      supervisorName,
      laboratory: labName,
      currentYear: reinscriptionYear,
      progressPercentage,
      activityReportSummary: activityReport,
      publications: [],
      communications: [],
      isDerogation: reinscriptionYear >= 4,
      derogationReason: reinscriptionYear >= 4 ? derogationReason : undefined,
      status: 'submitted',
      submissionDate: new Date().toISOString().split('T')[0],
    };

    onSubmitReInscription(newRecord);
    setReSuccess(true);
    setTimeout(() => setReSuccess(false), 4000);
  };

  return (
    <div className="space-y-4">
      {/* Read-Only Notice for Teachers / Admins */}
      {!canModify && (
        <div className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Mode Consultation :</span>
            <span>Espace candidat affiché en lecture seule pour les directeurs de thèse et responsables.</span>
          </div>
          <span className="text-[11px] font-mono bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
            Lecture seule
          </span>
        </div>
      )}

      {/* Connected Account Identity Card */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white/15 border border-white/20 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white truncate">{currentUser.name}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-semibold">
                <UserCheck className="w-3 h-3" />
                {googleUser ? 'Compte Google Connecté' : 'Compte Actif'}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono truncate mt-0.5">
              {currentUser.email} • {currentUser.establishment || 'USMBA Fès'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onGoToCatalog && (
            <button
              onClick={onGoToCatalog}
              className="px-3 py-1.5 rounded-lg bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Explorer les Thèses</span>
            </button>
          )}
        </div>
      </div>

      {/* Gmail notification banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              <span>Notification d'Avancement par Courriel Gmail</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                  gmailSendAuthorized
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {gmailSendAuthorized ? 'Envoi Gmail API Actif' : 'Envoi API non autorisé'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {gmailSendAuthorized ? (
                <span>
                  Envoi réel activé via <strong>{googleUser?.email}</strong>. Les messages vers <strong>{currentUser.email}</strong> seront expédiés en direct.
                </span>
              ) : googleUser ? (
                <span>
                  Connecté en tant que <strong>{googleUser.email}</strong>. Autorisez la permission d'envoi Gmail API pour expédier des courriels réels.
                </span>
              ) : (
                <span>
                  Destinataire des notifications : <strong>{currentUser.email}</strong>. Autorisez Gmail API ou utilisez Gmail Web pour envoyer les alertes d'étapes.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
          {!gmailSendAuthorized && onAuthorizeGmailSend && (
            <button
              onClick={onAuthorizeGmailSend}
              disabled={isAuthorizingGmailSend}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-60"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {isAuthorizingGmailSend ? 'Autorisation...' : 'Autoriser envoi Gmail API'}
              </span>
            </button>
          )}
          <button
            onClick={() => onSendTestGmail(applications[0])}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Send className="w-3 h-3" />
            <span>Tester notification Gmail</span>
          </button>
          {!googleUser && (
            <button
              onClick={onGoogleSignIn}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <span>Connecter Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('applications')}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
            activeSubTab === 'applications'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {canModify ? `Mes Candidatures (${applications.length})` : `Candidatures (${applications.length})`}
        </button>

        <button
          onClick={() => setActiveSubTab('stages_inbox')}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'stages_inbox'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Boîte des Étapes Gmail</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reinscription')}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
            activeSubTab === 'reinscription'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {canModify
            ? 'Réinscription Annuelle (2e - 6e Année)'
            : `Dossiers de Réinscription (${reInscriptions.length})`}
        </button>
      </div>

      {activeSubTab === 'applications' ? (
        <div className="space-y-4">
          {canModify && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">Quota de candidatures :</span>
                <span className="text-slate-600">
                  {applications.length} / 2 sujet(s) choisi(s)
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  applications.length >= 2
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {applications.length >= 2
                  ? 'Limite de 2 thèses atteinte'
                  : `Il vous reste ${2 - applications.length} choix`}
              </span>
            </div>
          )}

          {applications.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500 text-xs space-y-3">
              <p className="font-semibold text-slate-800 text-sm">
                Aucune candidature déposée pour le compte {currentUser.email || currentUser.name}
              </p>
              {myExistingRecord ? (
                <div className="space-y-2">
                  <p className="text-slate-600">
                    Vous êtes actuellement inscrit en doctorat ({myExistingRecord.currentYear}ème Année). Votre dossier de réinscription annuelle est disponible dans l'onglet dédié.
                  </p>
                  <button
                    onClick={() => setActiveSubTab('reinscription')}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium text-xs cursor-pointer hover:bg-slate-800 transition"
                  >
                    Voir mon dossier de réinscription ({myExistingRecord.currentYear}e Année)
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p>
                    Parcourez les sujets de thèses ouverts à l'USMBA et déposez votre dossier avec vos 5 pièces justificatives.
                  </p>
                  {onGoToCatalog && (
                    <button
                      onClick={onGoToCatalog}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Parcourir les Sujets de Thèses et Postuler</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            applications.map((app) => {
              const statusPill = getStatusLabel(app.status);
              const hasCorrectionNeeded =
                app.status === 'pieces_a_corriger' ||
                Object.values(app.documents).some((d) => d?.status === 'rejected');

              return (
                <div
                  key={app.id}
                  className={`bg-white border rounded-xl p-4 shadow-xs space-y-3.5 transition ${
                    hasCorrectionNeeded ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${statusPill.cls}`}>
                          {statusPill.label}
                        </span>
                        <span className="text-slate-400 font-mono">Réf : {app.receiptCode}</span>
                        <span className="text-slate-400">• Déposé le {app.submissionDate}</span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
                        {app.thesisTitle}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {app.laboratory} • Encadrant : <strong>{app.supervisorName}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onOpenReceipt(app)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Fiche de Dépôt</span>
                      </button>

                      {app.status === 'admitted' && (
                        <button
                          onClick={() => onOpenAttestation(app)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Attestation d'Admission Officielle</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PROMINENT ALERT WHEN PROFESSOR REQUESTED CORRECTION */}
                  {hasCorrectionNeeded && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>Action requise : Correction demandée par le responsable de thèse</span>
                      </div>

                      {app.correctionRequests && app.correctionRequests.length > 0 && (
                        <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200 text-amber-900 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-amber-700">
                            <span>Message de : <strong>{app.correctionRequests[0].author}</strong></span>
                            <span>{app.correctionRequests[0].date}</span>
                          </div>
                          <p className="text-xs italic leading-relaxed">
                            « {app.correctionRequests[0].message} »
                          </p>
                        </div>
                      )}

                      <p className="text-[11px] text-amber-800">
                        Veuillez téléverser la version corrigée des pièces signalées en rouge ci-dessous. Dès que c'est fait, cliquez sur "Renvoyer pour réexamen".
                      </p>
                    </div>
                  )}

                  {/* Interview Alert Box if scheduled */}
                  {app.status === 'interview_scheduled' && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs text-purple-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-700 shrink-0" />
                        <span>
                          Convocation : Entretien prévu le <strong>{app.interviewDate || '26 Nov 2026'}</strong> à <strong>{app.interviewTime || '10:00'}</strong> ({app.interviewVenue || 'Salle des Thèses, FST Fès'}).
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 5 MANDATORY PIECES JUSTIFICATIVES STATUS LIST */}
                  <div className="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                        État de vérification des 5 pièces justificatives obligatoires
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Examiné par le responsable
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {[
                        { key: 'cinCard' as const, label: "1. Pièce d'Identité (CIN)", doc: app.documents.cinCard, accept: '.pdf,.png,.jpg,.jpeg' },
                        { key: 'masterDiploma' as const, label: "2. Diplôme Master ou Ingénieur", doc: app.documents.masterDiploma, accept: '.pdf,.png,.jpg,.jpeg' },
                        { key: 'transcripts' as const, label: "3. Relevés de Notes (S1-S4)", doc: app.documents.transcripts, accept: '.pdf,.png,.jpg,.jpeg' },
                        { key: 'cv' as const, label: "4. Curriculum Vitae (CV)", doc: app.documents.cv, accept: '.pdf,.png,.jpg,.jpeg' },
                        { key: 'motivationLetter' as const, label: "5. Lettre de Motivation", doc: app.documents.motivationLetter, accept: '.pdf,.png,.jpg,.jpeg' },
                      ].map(({ key, label, doc, accept }) => {
                        const isRejected = doc?.status === 'rejected';
                        const isValid = doc?.status === 'valid';

                        return (
                          <div
                            key={key}
                            className={`p-2 rounded-lg border text-xs flex flex-col justify-between gap-1.5 transition ${
                              isRejected
                                ? 'bg-rose-50 border-rose-300 text-rose-900'
                                : isValid
                                ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <span className="font-semibold block truncate">{label}</span>
                                <span className="text-[10px] text-slate-500 font-mono truncate block">
                                  {doc?.name || 'Non fourni'}
                                </span>
                              </div>

                              {isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 shrink-0 bg-emerald-100/60 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Validé
                                </span>
                              ) : isRejected ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 shrink-0 bg-rose-100 px-1.5 py-0.5 rounded">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  À corriger
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  En attente
                                </span>
                              )}
                            </div>

                            {/* Reason if rejected */}
                            {doc?.feedback && (
                              <div className="text-[11px] text-rose-800 bg-white/80 p-1.5 rounded border border-rose-200">
                                <strong>Remarque du professeur :</strong> {doc.feedback}
                              </div>
                            )}

                            {/* Actions: Preview & Replace file */}
                            <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                              <button
                                onClick={() => doc && onViewDocPreview(doc, label, app)}
                                className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Aperçu</span>
                              </button>

                              {canModify && (
                                <label className="text-[11px] font-semibold text-slate-800 hover:text-slate-950 bg-white hover:bg-slate-50 px-2 py-0.5 rounded border border-slate-200 cursor-pointer flex items-center gap-1 shadow-2xs">
                                  <Upload className="w-3 h-3" />
                                  <span>{isRejected ? 'Remplacer cette pièce' : 'Changer'}</span>
                                  <input
                                    type="file"
                                    accept={accept}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        onReplaceDocument(app.id, key, file);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Resubmit button if correction was requested */}
                    {hasCorrectionNeeded && canModify && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => onResubmitCorrectedDossier(app.id)}
                          className="px-4 py-2 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Renvoyer le dossier corrigé pour réexamen</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : activeSubTab === 'stages_inbox' ? (
        /* Stages Inbox View */
        <div className="space-y-4 max-w-3xl">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span>Boîte de Réception des Étapes (Notifications Officielles)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Courriels officiels adressés à {googleUser?.email || currentUser.email} à chaque franchissement d'étape.
                </p>
              </div>

              <button
                onClick={() => onSendTestGmail(applications[0])}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <Send className="w-3 h-3" />
                <span>Renvoyer une alerte test</span>
              </button>
            </div>
          </div>

          {applications.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              Aucune notification d'étape pour l'instant. Postulez à un sujet de thèse pour déclencher les étapes.
            </div>
          ) : (
            applications.map((app) => (
              <div
                key={app.id}
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4"
              >
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-[11px] text-slate-400">Réf : {app.receiptCode}</span>
                    <h4 className="font-bold text-slate-900 text-sm mt-0.5">{app.thesisTitle}</h4>
                    <span className="text-[11px] text-slate-500">Laboratoire : {app.laboratory}</span>
                  </div>

                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 self-start sm:self-auto">
                    {app.status === 'admitted'
                      ? 'Étape 4 : Admission Proclamée'
                      : app.status === 'interview_scheduled'
                      ? 'Étape 3 : Convocation Entretien'
                      : app.status === 'pieces_a_corriger'
                      ? 'Étape 2 : Pièces à Corriger'
                      : app.status === 'under_review'
                      ? 'Étape 2 : Examen des 5 Pièces'
                      : 'Étape 1 : Dépôt Enregistré'}
                  </span>
                </div>

                {/* List of Stage Email Messages */}
                <div className="space-y-3">
                  {/* Stage 1: Depôt */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        [Étape 1] Accusé de Dépôt de Candidature
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">{app.submissionDate}</span>
                    </div>
                    <div className="text-slate-600 leading-relaxed text-[11px]">
                      Votre dossier numérique pour le sujet <strong>« {app.thesisTitle} »</strong> a bien été enregistré avec le code de référence <strong>{app.receiptCode}</strong>. Les 5 pièces justificatives obligatoires ont été transmises au secrétariat du CED.
                    </div>
                  </div>

                  {/* Stage 2: Verification of 5 pieces */}
                  <div className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                    app.status === 'pieces_a_corriger'
                      ? 'bg-amber-50/80 border-amber-300'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        {app.status === 'pieces_a_corriger' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        [Étape 2] Contrôle & Conformité des 5 Pièces Justificatives
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">{app.submissionDate}</span>
                    </div>

                    {app.status === 'pieces_a_corriger' ? (
                      <div className="text-amber-900 text-[11px] space-y-1">
                        <p className="font-semibold">Des pièces nécessitent une rectification :</p>
                        {app.correctionRequests && app.correctionRequests[0] && (
                          <p className="italic bg-white/70 p-2 rounded border border-amber-200">
                            « {app.correctionRequests[0].message} »
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-600 text-[11px]">
                        L'enseignant responsable a procédé à la vérification d'authenticité et de complétude de vos pièces justificatives.
                      </div>
                    )}
                  </div>

                  {/* Stage 3: Interview if convoqué */}
                  {app.status === 'interview_scheduled' && (
                    <div className="p-3.5 rounded-lg border border-purple-200 bg-purple-50 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-900 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-700" />
                          [Étape 3] Convocation Officielle à l'Entretien Oral
                        </span>
                        <span className="text-purple-600 font-mono text-[10px]">{app.interviewDate || '26/11/2026'}</span>
                      </div>
                      <div className="text-purple-900 text-[11px] leading-relaxed">
                        Félicitations, votre dossier a été présélectionné. Vous êtes convoqué(e) le <strong>{app.interviewDate}</strong> à <strong>{app.interviewTime}</strong> au lieu suivant : <strong>{app.interviewVenue}</strong>.
                      </div>
                    </div>
                  )}

                  {/* Stage 4: Admitted if admitted */}
                  {app.status === 'admitted' && (
                    <div className="p-3.5 rounded-lg border border-emerald-300 bg-emerald-50 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          [Étape 4] Décision Finale : Admission Définitive en Doctorat
                        </span>
                        <span className="text-emerald-700 font-mono text-[10px]">Session 2026/2027</span>
                      </div>
                      <div className="text-emerald-900 text-[11px] leading-relaxed">
                        La commission de sélection et le Directeur du CED ont proclamé votre admission sur la liste principale pour préparer votre doctorat au sein de l'équipe du <strong>{app.supervisorName}</strong>.
                      </div>
                    </div>
                  )}

                  {/* Real recorded email notification dispatch log */}
                  {app.emailLogs && app.emailLogs.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Historique des Notifications Gmail ({app.emailLogs.length})
                      </span>
                      {app.emailLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-lg border text-[11px] space-y-1.5 ${
                            log.success
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : 'bg-amber-50/60 border-amber-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    log.success
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {log.success ? 'Envoyé via Gmail API' : 'Non envoyé via API'}
                                </span>
                                <span className="font-semibold text-slate-800 truncate">
                                  {log.subject}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                Destinataire : <strong>{log.recipient}</strong>
                                {log.senderEmail ? ` • Expéditeur : ${log.senderEmail}` : ''}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {log.sentAt}
                            </span>
                          </div>

                          {!log.success && log.error && (
                            <div className="text-[10px] text-amber-900 bg-white/80 px-2 py-1 rounded border border-amber-200">
                              {log.error}
                            </div>
                          )}

                          {!log.success && (
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              {onAuthorizeGmailSend && (
                                <button
                                  onClick={onAuthorizeGmailSend}
                                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[10px] cursor-pointer flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>Autoriser Gmail API</span>
                                </button>
                              )}
                              {log.gmailComposeUrl && (
                                <a
                                  href={log.gmailComposeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-[10px] flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Envoyer via Gmail Web</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : canModify ? (
        /* Re-inscription View */
        <div className="space-y-4 max-w-2xl">
          {myExistingRecord && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      Dossier de Réinscription Actuel
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                      {myExistingRecord.currentYear}ème Année
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    N° Apogée / Code : {myExistingRecord.studentCode} • CIN : {myExistingRecord.studentCin}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      myExistingRecord.status === 'supervisor_approved' || myExistingRecord.status === 'ced_approved'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {myExistingRecord.status === 'supervisor_approved'
                      ? 'Avis Favorable Encadrant'
                      : myExistingRecord.status === 'lab_approved'
                      ? 'Validé par Laboratoire'
                      : myExistingRecord.status === 'ced_approved'
                      ? 'Validé Définitivement (CED)'
                      : 'Dossier Soumis (En cours)'}
                  </span>
                </div>
              </div>

              <div className="text-xs space-y-1.5 text-slate-700">
                <div>
                  <span className="text-slate-400">Sujet de thèse : </span>
                  <span className="font-semibold text-slate-900">{myExistingRecord.thesisTitle}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-slate-500">
                  <span>Encadrant : <strong className="text-slate-800">{myExistingRecord.supervisorName}</strong></span>
                  <span>Structure : <strong className="text-slate-800">{myExistingRecord.laboratory}</strong></span>
                  <span>Déposé le : <strong>{myExistingRecord.submissionDate}</strong></span>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Avancement des travaux de thèse</span>
                  <span className="font-bold text-slate-900">{myExistingRecord.progressPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-900 h-full rounded-full transition-all"
                    style={{ width: `${myExistingRecord.progressPercentage}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Rapport d'activité déposé : </span>
                {myExistingRecord.activityReportSummary}
              </div>
            </div>
          )}

          {/* Form to submit or update */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {myExistingRecord
                ? "Mettre à jour le rapport d'activité / Réinscription"
                : 'Formulaire de Réinscription Annuelle'}
            </div>

            {reSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                Rapport de réinscription soumis pour validation et enregistré dans la BDD.
              </div>
            )}

            <form onSubmit={handleReInscriptionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Année demandée</label>
                <select
                  value={reinscriptionYear}
                  onChange={(e) => setReinscriptionYear(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                >
                  <option value={2}>2ème Année</option>
                  <option value={3}>3ème Année</option>
                  <option value={4}>4ème Année (Dérogation)</option>
                  <option value={5}>5ème Année (Dérogation)</option>
                  <option value={6}>6ème Année (Dérogation)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-slate-600 mb-1">
                  <span>Avancement du manuscrit</span>
                  <strong>{progressPercentage}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressPercentage}
                  onChange={(e) => setProgressPercentage(Number(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Rapport d'activité synthétique</label>
                <textarea
                  rows={2}
                  value={activityReport}
                  onChange={(e) => setActivityReport(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                />
              </div>

              {reinscriptionYear >= 4 && (
                <div>
                  <label className="text-slate-600 block mb-1">Motif de dérogation</label>
                  <textarea
                    rows={2}
                    required
                    value={derogationReason}
                    onChange={(e) => setDerogationReason(e.target.value)}
                    placeholder="Justification requise pour 4e année et plus..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
              >
                {myExistingRecord ? 'Mettre à jour la Réinscription' : 'Soumettre la Réinscription'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Teacher Read-only */
        <div className="space-y-3">
          <div className="text-xs text-slate-500">
            {reInscriptions.length} dossier(s) de réinscription annuelle enregistré(s)
          </div>
          <div className="space-y-3">
            {reInscriptions.map((record) => (
              <div
                key={record.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-900">{record.studentName}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({record.studentCin})</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {record.currentYear}e Année {record.isDerogation ? '(Dérogation)' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-slate-700 mt-1 font-medium">
                      {record.thesisTitle}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Encadrant : {record.supervisorName} • {record.laboratory}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-slate-900">
                      Avancement : {record.progressPercentage}%
                    </span>
                    <div className="w-28 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div
                        className="bg-slate-900 h-full rounded-full"
                        style={{ width: `${record.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-semibold text-slate-700">Rapport : </span>
                  {record.activityReportSummary}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
