import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  Eye,
  Check,
  Calendar,
  X,
  FileText,
  AlertTriangle,
  Send,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Mail,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  ThesisTopic,
  CandidateApplication,
  UserProfile,
  UploadedDoc,
  CEDType,
  EstablishmentType,
  FundingType,
  ApplicationDocuments,
} from '../types';

interface ProfessorAdminDashboardProps {
  currentUser: UserProfile;
  theses: ThesisTopic[];
  applications: CandidateApplication[];
  googleUser?: FirebaseUser | null;
  gmailSendAuthorized?: boolean;
  isAuthorizingGmailSend?: boolean;
  onAuthorizeGmailSend?: () => void;
  onAddNewThesis: (thesis: ThesisTopic) => void;
  onUpdateApplicationStatus: (
    appId: string,
    status: CandidateApplication['status'],
    notes?: string,
    interviewDetails?: { date: string; time: string; venue: string }
  ) => void;
  onUpdateDocVerification: (
    appId: string,
    docKey: keyof ApplicationDocuments,
    status: 'valid' | 'rejected',
    feedback?: string
  ) => void;
  onSendCorrectionRequest: (
    appId: string,
    message: string,
    flaggedDocs: Array<{ docKey: string; docLabel: string; reason: string }>
  ) => void;
  onViewDocPreview: (
    doc: UploadedDoc,
    title: string,
    onValidate?: () => void,
    onReject?: (reason: string) => void,
    candidateContext?: {
      candidateName?: string;
      candidateEmail?: string;
      cin?: string;
      degree?: string;
      gpa?: number;
      mention?: string;
      thesisTitle?: string;
      supervisorName?: string;
    }
  ) => void;
  onSendStageEmailDirect: (app: CandidateApplication, stage: any) => Promise<boolean>;
  onValidateAllDocs?: (appId: string) => void;
}

export const ProfessorAdminDashboard: React.FC<ProfessorAdminDashboardProps> = ({
  currentUser,
  theses,
  applications,
  googleUser,
  gmailSendAuthorized = false,
  isAuthorizingGmailSend = false,
  onAuthorizeGmailSend,
  onAddNewThesis,
  onUpdateApplicationStatus,
  onUpdateDocVerification,
  onSendCorrectionRequest,
  onViewDocPreview,
  onSendStageEmailDirect,
  onValidateAllDocs,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'new_thesis'>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const selectedApp = applications.find((a) => a.id === selectedAppId) || null;

  // New thesis form
  const [newTitle, setNewTitle] = useState('');
  const [newAbstract, setNewAbstract] = useState('');
  const [newCed, setNewCed] = useState<CEDType>('CED-ST');
  const [newEstablishment, setNewEstablishment] = useState<EstablishmentType>('FST Fès');
  const [newLab, setNewLab] = useState(currentUser.laboratory || 'LIIAN');
  const [newFunding, setNewFunding] = useState<FundingType>('Bourse CNRST (7000 MAD/m)');
  const [newPositions, setNewPositions] = useState<number>(2);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Correction request state in modal
  const [isCorrectionBoxOpen, setIsCorrectionBoxOpen] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState('');
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [activeFlaggingDoc, setActiveFlaggingDoc] = useState<keyof ApplicationDocuments | null>(null);
  const [flagReasonInput, setFlagReasonInput] = useState('');

  // Interview state in modal
  const [isInterviewFormOpen, setIsInterviewFormOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState('2026-11-26');
  const [interviewTime, setInterviewTime] = useState('10:00');
  const [interviewVenue, setInterviewVenue] = useState('Salle des Thèses, FST Fès');

  // Refusal & admission confirmation states
  const [isRefusalBoxOpen, setIsRefusalBoxOpen] = useState(false);
  const [refusalNote, setRefusalNote] = useState('');
  const [confirmAdmitOpen, setConfirmAdmitOpen] = useState(false);
  const [confirmDirectEmailStage, setConfirmDirectEmailStage] = useState<string | null>(null);
  const [isSendingDirectEmail, setIsSendingDirectEmail] = useState(false);

  const filteredApps = applications.filter((app) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        app.candidateName.toLowerCase().includes(q) ||
        app.thesisTitle.toLowerCase().includes(q) ||
        app.cin.toLowerCase().includes(q) ||
        app.candidateEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getDocCheckStats = (app: CandidateApplication) => {
    const docKeys: (keyof ApplicationDocuments)[] = [
      'cinCard',
      'masterDiploma',
      'transcripts',
      'cv',
      'motivationLetter',
    ];
    let validCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    docKeys.forEach((k) => {
      const d = app.documents[k];
      if (!d) return;
      if (d.status === 'valid') validCount++;
      else if (d.status === 'rejected') rejectedCount++;
      else pendingCount++;
    });

    return { validCount, rejectedCount, pendingCount, total: docKeys.length };
  };

  const handleCreateThesis = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newThesis: ThesisTopic = {
      id: `th-${Date.now()}`,
      title: newTitle,
      abstract: newAbstract,
      keywords: ['Doctorat', 'USMBA', 'Recherche'],
      ced: newCed,
      establishment: newEstablishment,
      laboratory: newLab,
      supervisorName: currentUser.name,
      supervisorEmail: currentUser.email,
      supervisorTitle: currentUser.title,
      positionsCount: newPositions,
      remainingSlots: newPositions,
      fundingType: newFunding,
      status: 'published',
      requiredDegrees: ['Master', 'Ingénieur'],
      minimumHonors: 'Bien',
      datePublished: new Date().toISOString().split('T')[0],
      deadline: '2026-12-30',
      applicantsCount: 0,
    };

    onAddNewThesis(newThesis);
    setPublishSuccess(true);
    setNewTitle('');
    setNewAbstract('');
    setTimeout(() => {
      setPublishSuccess(false);
      setActiveTab('queue');
    }, 1800);
  };

  const handleDocValidate = (appId: string, docKey: keyof ApplicationDocuments) => {
    onUpdateDocVerification(appId, docKey, 'valid');
  };

  const handleDocReject = (
    appId: string,
    docKey: keyof ApplicationDocuments,
    reason: string
  ) => {
    onUpdateDocVerification(appId, docKey, 'rejected', reason);
  };

  const handleValidateAllDocs = (app: CandidateApplication) => {
    if (onValidateAllDocs) {
      onValidateAllDocs(app.id);
      return;
    }
    const keys: (keyof ApplicationDocuments)[] = [
      'cinCard',
      'masterDiploma',
      'transcripts',
      'cv',
      'motivationLetter',
    ];
    keys.forEach((k) => {
      onUpdateDocVerification(app.id, k, 'valid');
    });
  };

  const handleSendCorrection = () => {
    if (!selectedApp) return;
    setCorrectionError(null);

    const docLabels: Record<keyof ApplicationDocuments, string> = {
      cinCard: "1. Pièce d'Identité (CIN / Passeport)",
      masterDiploma: "2. Diplôme Master ou Ingénieur",
      transcripts: "3. Relevés de Notes (S1-S4)",
      cv: "4. Curriculum Vitae (CV)",
      motivationLetter: "5. Lettre de Motivation",
      researchProposal: "6. Projet de Recherche",
    };

    const flagged: Array<{ docKey: string; docLabel: string; reason: string }> = [];
    (
      ['cinCard', 'masterDiploma', 'transcripts', 'cv', 'motivationLetter'] as (keyof ApplicationDocuments)[]
    ).forEach((key) => {
      const doc = selectedApp.documents[key];
      if (doc && doc.status === 'rejected') {
        flagged.push({
          docKey: key,
          docLabel: docLabels[key],
          reason: doc.feedback || 'Pièce non conforme ou illisible.',
        });
      }
    });

    if (flagged.length === 0 && !correctionMessage.trim()) {
      setCorrectionError(
        "Veuillez signaler au moins une pièce comme 'Rejetée' ou rédiger un message expliquant la pièce manquante."
      );
      return;
    }

    const defaultMsg =
      correctionMessage.trim() ||
      `Bonjour ${selectedApp.candidateName}, après examen de votre dossier, des pièces justificatives ont été signalées comme non conformes ou incomplètes. Merci de téléverser les versions rectifiées dans votre Espace Candidat sous 48h.`;

    onSendCorrectionRequest(selectedApp.id, defaultMsg, flagged);
    setIsCorrectionBoxOpen(false);
    setCorrectionMessage('');
    setCorrectionError(null);
    setSelectedAppId(null);
  };

  return (
    <div className="space-y-4">
      {/* Gmail API Dispatcher Status Bar */}
      <div
        className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
          gmailSendAuthorized
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              gmailSendAuthorized ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold flex items-center gap-2">
              <span>Expédition Réelle des Notifications par Gmail API</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  gmailSendAuthorized
                    ? 'bg-emerald-200/70 text-emerald-900'
                    : 'bg-amber-200/70 text-amber-900'
                }`}
              >
                {gmailSendAuthorized ? 'Actif' : 'Autorisation requise'}
              </span>
            </div>
            <p className="text-[11px] opacity-85 mt-0.5">
              {gmailSendAuthorized
                ? `Les notifications (correction de pièces, convocation, admission, refus) seront envoyées réellement depuis ${googleUser?.email || 'votre Gmail'} aux adresses des candidats.`
                : "Autorisez votre compte Gmail expéditeur pour envoyer automatiquement de vrais courriels vers les adresses des candidats (ex. candidat@usmba.ac.ma), ou utilisez le lien Gmail Web en secours."}
            </p>
          </div>
        </div>

        {!gmailSendAuthorized && onAuthorizeGmailSend && (
          <button
            onClick={onAuthorizeGmailSend}
            disabled={isAuthorizingGmailSend}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-60"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              {isAuthorizingGmailSend ? 'Autorisation...' : 'Autoriser envoi Gmail API'}
            </span>
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
            activeTab === 'queue'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          File des Candidats & Pièces ({applications.length})
        </button>

        <button
          onClick={() => setActiveTab('new_thesis')}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition cursor-pointer ${
            activeTab === 'new_thesis'
              ? 'bg-slate-900 text-white font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Proposer un Sujet de Thèse
        </button>
      </div>

      {activeTab === 'queue' && (
        <div className="space-y-3">
          {/* Search bar & summary */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-xs">
            <input
              type="text"
              placeholder="Rechercher par candidat, sujet, email ou CIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-md px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 outline-none text-xs"
            />
            <div className="text-slate-500 flex items-center gap-2 shrink-0">
              <span className="font-semibold text-slate-800">{filteredApps.length}</span> candidature(s) enregistrée(s)
            </div>
          </div>

          {/* Applications Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Candidat</th>
                    <th className="py-2.5 px-3">Sujet de Thèse</th>
                    <th className="py-2.5 px-3 text-center">Contrôle 5 Pièces</th>
                    <th className="py-2.5 px-3 text-center">Moyenne</th>
                    <th className="py-2.5 px-3 text-center">Score</th>
                    <th className="py-2.5 px-3 text-center">Statut</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApps.map((app) => {
                    const stats = getDocCheckStats(app);

                    return (
                      <tr key={app.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{app.candidateName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{app.cin} • {app.candidateEmail}</div>
                        </td>

                        <td className="py-2.5 px-3 max-w-xs truncate text-slate-800">
                          {app.thesisTitle}
                        </td>

                        {/* Document verification badge */}
                        <td className="py-2.5 px-3 text-center">
                          {stats.rejectedCount > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {stats.rejectedCount} à corriger
                            </span>
                          ) : stats.validCount === stats.total ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              5/5 Validées
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                              <Clock className="w-2.5 h-2.5 text-slate-500" />
                              {stats.validCount}/5 Validée(s)
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center text-slate-700 font-medium">
                          {app.masterGpa}/20
                        </td>

                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                          {app.calculatedScore}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              app.status === 'admitted'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : app.status === 'rejected'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : app.status === 'pieces_a_corriger'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                                : app.status === 'interview_scheduled'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : app.status === 'preselected'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {app.status === 'admitted'
                              ? 'Admis'
                              : app.status === 'rejected'
                              ? 'Refusé'
                              : app.status === 'pieces_a_corriger'
                              ? 'Pièces à corriger'
                              : app.status === 'interview_scheduled'
                              ? 'Entretien oral'
                              : app.status === 'preselected'
                              ? 'Présélectionné'
                              : 'Dossier Reçu'}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedAppId(app.id);
                                setIsCorrectionBoxOpen(false);
                                setIsInterviewFormOpen(false);
                                setIsRefusalBoxOpen(false);
                                setConfirmAdmitOpen(false);
                                setCorrectionError(null);
                              }}
                              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Contrôler & Décider</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Thesis Tab */}
      {activeTab === 'new_thesis' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs max-w-xl space-y-4">
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Nouveau Sujet de Recherche Doctorale
          </div>

          {publishSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sujet de thèse enregistré dans la base de données.</span>
            </div>
          )}

          <form onSubmit={handleCreateThesis} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-600 block mb-1">Intitulé du sujet *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Modèles Fondateurs et Vision par Ordinateur..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 block mb-1">Centre d'Études Doctorales (CED)</label>
                <select
                  value={newCed}
                  onChange={(e) => setNewCed(e.target.value as CEDType)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                >
                  <option value="CED-ST">CED Sciences & Techniques (CED-ST)</option>
                  <option value="CED-SS">CED Sciences de la Santé (CED-SS)</option>
                  <option value="CED-SHSJ">CED Sciences Humaines & Juridiques (CED-SHSJ)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Établissement USMBA</label>
                <select
                  value={newEstablishment}
                  onChange={(e) => setNewEstablishment(e.target.value as EstablishmentType)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                >
                  <option value="FST Fès">FST Fès</option>
                  <option value="FS Dhar El Mahraz">FS Dhar El Mahraz</option>
                  <option value="ENSA Fès">ENSA Fès</option>
                  <option value="Faculté de Médecine et Pharmacie">Faculté de Médecine et Pharmacie</option>
                  <option value="FSJES Fès">FSJES Fès</option>
                  <option value="FLSH Dhar El Mahraz">FLSH Dhar El Mahraz</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-600 block mb-1">Laboratoire / Équipe de Recherche *</label>
              <input
                type="text"
                required
                value={newLab}
                onChange={(e) => setNewLab(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-1">Résumé succinct du projet doctoral *</label>
              <textarea
                rows={3}
                required
                value={newAbstract}
                onChange={(e) => setNewAbstract(e.target.value)}
                placeholder="Problématique, méthodologie et objectifs attendus..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-600 block mb-1">Type de Financement</label>
                <select
                  value={newFunding}
                  onChange={(e) => setNewFunding(e.target.value as FundingType)}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                >
                  <option value="Bourse CNRST (7000 MAD/m)">Bourse CNRST (7000 MAD/m)</option>
                  <option value="Bourse d'Excellence USMBA">Bourse d'Excellence USMBA</option>
                  <option value="Contrat de Recherche Labo">Contrat de Recherche Labo</option>
                  <option value="Autofinancé / Salarié">Autofinancé / Salarié</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Nombre de postes ouverts</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={newPositions}
                  onChange={(e) => setNewPositions(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
            >
              Publier et Enregistrer dans la BDD
            </button>
          </form>
        </div>
      )}

      {/* COMPREHENSIVE DOSSIER INSPECTOR & 5 PIECES JUSTIFICATIVES MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 w-full max-w-3xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">
                    {selectedApp.candidateName}
                  </span>
                  <span className="font-mono text-xs text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    CIN: {selectedApp.cin}
                  </span>
                  <span className="text-xs text-slate-400">Réf: {selectedApp.receiptCode}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-xl truncate">
                  Sujet : <strong>{selectedApp.thesisTitle}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedAppId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              {/* Candidate Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block">Diplôme d'accès</span>
                  <strong className="text-slate-800 truncate block">{selectedApp.currentMasterOrDegree}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Moyenne & Mention</span>
                  <strong className="text-slate-800 block">{selectedApp.masterGpa}/20 ({selectedApp.mention})</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Email Candidat (Gmail)</span>
                  <strong className="text-slate-800 truncate block">{selectedApp.candidateEmail}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Score Algorithmique</span>
                  <strong className="text-slate-900 block text-sm font-bold">{selectedApp.calculatedScore} pts</strong>
                </div>
              </div>

              {/* 5 MANDATORY PIECES JUSTIFICATIVES VERIFICATION SECTION */}
              <div className="space-y-2 border border-slate-200 rounded-xl p-3.5 bg-white shadow-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-slate-800" />
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
                      Vérification des 5 Pièces Justificatives Obligatoires
                    </span>
                  </div>

                  <button
                    onClick={() => handleValidateAllDocs(selectedApp)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Tout Valider Conforme</span>
                  </button>
                </div>

                <div className="space-y-2 pt-1">
                  {[
                    { key: 'cinCard' as const, label: "1. Pièce d'Identité (CIN / Passeport)", doc: selectedApp.documents.cinCard },
                    { key: 'masterDiploma' as const, label: "2. Diplôme Master ou Ingénieur", doc: selectedApp.documents.masterDiploma },
                    { key: 'transcripts' as const, label: "3. Relevés de Notes (S1-S4)", doc: selectedApp.documents.transcripts },
                    { key: 'cv' as const, label: "4. Curriculum Vitae (CV)", doc: selectedApp.documents.cv },
                    { key: 'motivationLetter' as const, label: "5. Lettre de Motivation", doc: selectedApp.documents.motivationLetter },
                  ].map(({ key, label, doc }) => {
                    const status = doc?.status || (doc?.verified ? 'valid' : 'pending');

                    return (
                      <div
                        key={key}
                        className={`p-2.5 rounded-lg border transition ${
                          status === 'valid'
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : status === 'rejected'
                            ? 'bg-rose-50/60 border-rose-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            {status === 'valid' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : status === 'rejected' ? (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <span className="font-semibold text-slate-900 block truncate">
                                {label}
                              </span>
                              <div className="text-[11px] text-slate-500 font-mono truncate">
                                {doc?.name || 'Fichier manquant'} ({doc?.size || '0 KB'})
                                {doc?.verifiedBy && (
                                  <span className="text-slate-400 ml-1">
                                    • Examiné par {doc.verifiedBy}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action controls for this piece */}
                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() =>
                                onViewDocPreview(
                                  doc,
                                  label,
                                  () => handleDocValidate(selectedApp.id, key),
                                  (r) => handleDocReject(selectedApp.id, key, r),
                                  {
                                    candidateName: selectedApp.candidateName,
                                    candidateEmail: selectedApp.candidateEmail,
                                    cin: selectedApp.cin,
                                    degree: selectedApp.currentMasterOrDegree,
                                    gpa: selectedApp.masterGpa,
                                    mention: selectedApp.mention,
                                    thesisTitle: selectedApp.thesisTitle,
                                    supervisorName: selectedApp.supervisorName,
                                  }
                                )
                              }
                              className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] cursor-pointer flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Aperçu</span>
                            </button>

                            <button
                              onClick={() => handleDocValidate(selectedApp.id, key)}
                              className={`px-2.5 py-1 rounded font-semibold text-[11px] transition cursor-pointer flex items-center gap-1 ${
                                status === 'valid'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{status === 'valid' ? 'Validé' : 'Valider'}</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveFlaggingDoc(activeFlaggingDoc === key ? null : key);
                                setFlagReasonInput(doc.feedback || '');
                              }}
                              className={`px-2 py-1 rounded font-semibold text-[11px] transition cursor-pointer flex items-center gap-1 ${
                                status === 'rejected'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-300'
                              }`}
                            >
                              <X className="w-3 h-3" />
                              <span>{status === 'rejected' ? 'Rejeté' : 'Rejeter'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline prompt to specify rejection feedback */}
                        {activeFlaggingDoc === key && (
                          <div className="mt-2.5 p-2 bg-white rounded-lg border border-rose-200 flex items-center gap-2 animate-in fade-in">
                            <input
                              type="text"
                              value={flagReasonInput}
                              onChange={(e) => setFlagReasonInput(e.target.value)}
                              placeholder="Motif (ex: scan illisible, diplôme non légalisé, relevé S4 manquant)..."
                              className="flex-1 px-2.5 py-1 text-xs border border-slate-200 rounded outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                handleDocReject(selectedApp.id, key, flagReasonInput || 'Pièce non conforme');
                                setActiveFlaggingDoc(null);
                              }}
                              className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] cursor-pointer"
                            >
                              Confirmer le rejet
                            </button>
                          </div>
                        )}

                        {/* Rejection reason badge */}
                        {doc?.feedback && (
                          <div className="mt-1.5 text-[11px] text-rose-800 bg-rose-100/60 px-2 py-1 rounded border border-rose-200">
                            <strong>Motif signalé :</strong> {doc.feedback}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Button to ask for missing/wrong documents with custom message and Gmail alert */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Un problème sur les pièces ? Envoyez un rappel officiel directement sur la boîte Gmail du candidat.
                  </div>
                  <button
                    onClick={() => setIsCorrectionBoxOpen(!isCorrectionBoxOpen)}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 hover:bg-amber-50 text-amber-900 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-amber-700" />
                    <span>Demander correction de pièces</span>
                  </button>
                </div>

                {/* CORRECTION REQUEST MESSAGE BOX */}
                {isCorrectionBoxOpen && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 mt-2 animate-in fade-in">
                    <span className="font-bold text-amber-900 block">
                      Message envoyé au candidat (Avis de non-conformité par Gmail)
                    </span>
                    {correctionError && (
                      <div className="p-2 rounded bg-rose-100 border border-rose-200 text-rose-800 text-[11px]">
                        {correctionError}
                      </div>
                    )}
                    <textarea
                      rows={3}
                      value={correctionMessage}
                      onChange={(e) => setCorrectionMessage(e.target.value)}
                      placeholder="Ex: Bonjour, votre relevé de notes S4 est manquant et le scan de la CIN est tronqué. Merci de réimporter ces pièces sous 48h..."
                      className="w-full p-2.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-900 outline-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setIsCorrectionBoxOpen(false);
                          setCorrectionError(null);
                        }}
                        className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSendCorrection}
                        className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Envoyer la demande (BDD + Notification Gmail)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* INTERVIEW SCHEDULING FORM */}
              {isInterviewFormOpen && (
                <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                  <span className="font-bold text-purple-900 text-xs block">
                    Convoquer à l'Entretien Oral de Sélection
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-purple-700 block mb-0.5">Date</label>
                      <input
                        type="date"
                        value={interviewDate}
                        onChange={(e) => setInterviewDate(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-purple-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-purple-700 block mb-0.5">Heure</label>
                      <input
                        type="time"
                        value={interviewTime}
                        onChange={(e) => setInterviewTime(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-purple-200 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-purple-700 block mb-0.5">Lieu / Salle / Meet</label>
                      <input
                        type="text"
                        value={interviewVenue}
                        onChange={(e) => setInterviewVenue(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-purple-200 rounded text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsInterviewFormOpen(false)}
                      className="px-2.5 py-1 text-purple-700 hover:bg-purple-100 rounded text-xs"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        onUpdateApplicationStatus(
                          selectedApp.id,
                          'interview_scheduled',
                          'Candidat convoqué à l\'entretien oral.',
                          { date: interviewDate, time: interviewTime, venue: interviewVenue }
                        );
                        setIsInterviewFormOpen(false);
                        setSelectedAppId(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Confirmer Convocation & Envoyer Gmail</span>
                    </button>
                  </div>
                </div>
              )}

              {/* REFUSAL REASON BOX */}
              {isRefusalBoxOpen && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                  <span className="font-bold text-rose-900 text-xs block">
                    Motif de refus de candidature
                  </span>
                  <input
                    type="text"
                    value={refusalNote}
                    onChange={(e) => setRefusalNote(e.target.value)}
                    placeholder="Ex: Profil ne correspondant pas aux prérequis thématiques..."
                    className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded text-xs text-slate-900"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setIsRefusalBoxOpen(false)}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded text-xs"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        onUpdateApplicationStatus(
                          selectedApp.id,
                          'rejected',
                          refusalNote || 'Candidature non retenue par la commission.'
                        );
                        setIsRefusalBoxOpen(false);
                        setSelectedAppId(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs"
                    >
                      Confirmer le Refus & Envoyer Gmail
                    </button>
                  </div>
                </div>
              )}

              {/* ADMISSION CONFIRMATION SAFEGUARD WHEN DOCS ARE NOT ALL VALIDATED */}
              {confirmAdmitOpen && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Vérification préalable des 5 pièces obligatoires</span>
                  </div>
                  <p className="text-[11px] text-amber-900">
                    Toutes les 5 pièces justificatives n'ont pas encore été individuellement validées. Souhaitez-vous valider l'ensemble des pièces conformes et prononcer l'admission définitive ?
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setConfirmAdmitOpen(false)}
                      className="px-2.5 py-1 text-slate-700 hover:bg-amber-100 rounded text-xs cursor-pointer"
                    >
                      Revenir vérifier
                    </button>
                    <button
                      onClick={() => {
                        handleValidateAllDocs(selectedApp);
                        onUpdateApplicationStatus(
                          selectedApp.id,
                          'admitted',
                          'Admission définitive accordée par le responsable de thèse.'
                        );
                        setConfirmAdmitOpen(false);
                        setSelectedAppId(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs cursor-pointer"
                    >
                      Tout valider & Confirmer l'Admission
                    </button>
                  </div>
                </div>
              )}

              {/* Direct Gmail Stage Dispatch & Recorded Email Logs */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 text-xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Notifications Gmail vers {selectedApp.candidateEmail}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Envoyer ou vérifier les courriels de suivi expédiés au candidat.
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      const inferredStage =
                        selectedApp.status === 'admitted'
                          ? 'admission_accepted'
                          : selectedApp.status === 'interview_scheduled'
                          ? 'interview_convocation'
                          : selectedApp.status === 'pieces_a_corriger'
                          ? 'documents_correction_needed'
                          : selectedApp.status === 'rejected'
                          ? 'application_refused'
                          : 'documents_verified';
                      setConfirmDirectEmailStage(
                        confirmDirectEmailStage ? null : inferredStage
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    <span>Envoyer notification Gmail</span>
                  </button>
                </div>

                {confirmDirectEmailStage && (
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 space-y-2 animate-in fade-in">
                    <div className="font-semibold text-blue-950">
                      Confirmer l'envoi d'un courriel à {selectedApp.candidateEmail}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={confirmDirectEmailStage}
                        onChange={(e) => setConfirmDirectEmailStage(e.target.value)}
                        className="px-2 py-1 rounded border border-blue-200 bg-white text-slate-900 text-xs outline-none"
                      >
                        <option value="submission_receipt">Étape 1 : Accusé de dépôt</option>
                        <option value="documents_verified">Étape 2 : 5 Pièces validées conformes</option>
                        <option value="documents_correction_needed">Étape 2 : Pièces à corriger</option>
                        <option value="interview_convocation">Étape 3 : Convocation Entretien</option>
                        <option value="admission_accepted">Étape 4 : Admission Officielle</option>
                        <option value="application_refused">Étape 4 : Candidature non retenue</option>
                      </select>

                      <button
                        disabled={isSendingDirectEmail}
                        onClick={async () => {
                          setIsSendingDirectEmail(true);
                          try {
                            await onSendStageEmailDirect(selectedApp, confirmDirectEmailStage);
                            setConfirmDirectEmailStage(null);
                          } finally {
                            setIsSendingDirectEmail(false);
                          }
                        }}
                        className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs cursor-pointer disabled:opacity-60"
                      >
                        {isSendingDirectEmail ? 'Envoi...' : 'Confirmer et Envoyer'}
                      </button>
                      <button
                        onClick={() => setConfirmDirectEmailStage(null)}
                        className="px-2 py-1 text-slate-600 hover:bg-blue-100 rounded text-xs cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}

                {selectedApp.emailLogs && selectedApp.emailLogs.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    {selectedApp.emailLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          log.success
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : 'bg-amber-50/60 border-amber-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.success
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {log.success ? 'Envoyé Gmail API' : 'Non envoyé via API'}
                            </span>
                            <span className="font-semibold text-slate-800 truncate">
                              {log.subject}
                            </span>
                          </div>
                          {!log.success && log.error && (
                            <div className="text-[10px] text-amber-900 mt-0.5">{log.error}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!log.success && log.gmailComposeUrl && (
                            <a
                              href={log.gmailComposeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-semibold text-[10px] flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Gmail Web</span>
                            </a>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">{log.sentAt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit history */}
              {selectedApp.history && selectedApp.history.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Historique & Traçabilité (Enregistré en BDD)
                  </span>
                  {selectedApp.history.map((h, i) => (
                    <div key={i} className="text-slate-600 flex items-center justify-between py-0.5 border-b border-slate-100 last:border-0 text-[11px]">
                      <span>{h.action} {h.details && `(${h.details})`}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{h.actor} • {h.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Actions */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                Statut actuel : <strong className="text-slate-900">{selectedApp.status}</strong>
              </div>

              <div className="flex items-center gap-2">
                {selectedApp.status !== 'admitted' && (
                  <button
                    onClick={() => {
                      const stats = getDocCheckStats(selectedApp);
                      if (stats.validCount < stats.total) {
                        setConfirmAdmitOpen(true);
                        return;
                      }
                      onUpdateApplicationStatus(
                        selectedApp.id,
                        'admitted',
                        'Admission définitive accordée par le responsable de thèse.'
                      );
                      setSelectedAppId(null);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Admettre en Doctorat</span>
                  </button>
                )}

                {selectedApp.status !== 'interview_scheduled' && selectedApp.status !== 'admitted' && (
                  <button
                    onClick={() => {
                      setIsInterviewFormOpen(true);
                      setIsCorrectionBoxOpen(false);
                      setIsRefusalBoxOpen(false);
                      setConfirmAdmitOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Convoquer Entretien</span>
                  </button>
                )}

                {selectedApp.status !== 'rejected' && (
                  <button
                    onClick={() => {
                      setIsRefusalBoxOpen(true);
                      setIsInterviewFormOpen(false);
                      setIsCorrectionBoxOpen(false);
                      setConfirmAdmitOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-rose-300 hover:bg-rose-50 text-rose-700 font-semibold text-xs cursor-pointer"
                  >
                    Refuser
                  </button>
                )}

                {selectedApp.status === 'rejected' && (
                  <button
                    onClick={() => {
                      onUpdateApplicationStatus(
                        selectedApp.id,
                        'under_review',
                        'Dossier rouvert pour réexamen.'
                      );
                      setSelectedAppId(null);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                  >
                    Réexaminer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
