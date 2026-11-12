import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  FileText,
  Upload,
  Eye,
  AlertCircle,
  FileUp,
} from 'lucide-react';
import {
  ThesisTopic,
  CandidateApplication,
  UploadedDoc,
  UserProfile,
  ApplicationDocuments,
} from '../types';
import {
  validateDossier,
  calculateCandidateScore,
} from '../utils/registrationRules';
import { saveUploadedFileToDb } from '../services/firebase';

interface OneClickRegistrationModalProps {
  thesis: ThesisTopic | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSubmitApplication: (application: CandidateApplication) => void;
  onViewDocPreview: (doc: UploadedDoc, title: string) => void;
}

export const OneClickRegistrationModal: React.FC<OneClickRegistrationModalProps> = ({
  thesis,
  isOpen,
  onClose,
  currentUser,
  onSubmitApplication,
  onViewDocPreview,
}) => {
  const [candidateName, setCandidateName] = useState(
    currentUser.role === 'candidate' ? currentUser.name : 'Amina El Amrani'
  );
  const [candidateEmail, setCandidateEmail] = useState(
    currentUser.role === 'candidate'
      ? currentUser.email
      : 'amina.elamrani@usmba.ac.ma'
  );
  const [candidatePhone, setCandidatePhone] = useState('+212 6 61 23 45 67');
  const [cin, setCin] = useState('CD678912');
  const [cneMassar, setCneMassar] = useState('N134567890');
  const [birthDate, setBirthDate] = useState('2001-04-18');
  const [address, setAddress] = useState('Avenue des FAR, Fès');

  React.useEffect(() => {
    if (currentUser.role === 'candidate') {
      setCandidateName(currentUser.name);
      setCandidateEmail(currentUser.email);
    }
  }, [currentUser]);

  const [currentMasterOrDegree, setCurrentMasterOrDegree] = useState(
    'Master Big Data & Intelligence Artificielle'
  );
  const [universityOfOrigin, setUniversityOfOrigin] = useState('USMBA Fès');
  const [graduationYear, setGraduationYear] = useState<number>(2026);
  const [masterGpa, setMasterGpa] = useState<number>(16.75);
  const [mention, setMention] = useState<
    'Passable' | 'Assez Bien' | 'Bien' | 'Très Bien'
  >('Très Bien');

  const todayStr = new Date().toISOString().split('T')[0];

  // Candidates can put any file or custom document for each of the 5 obligatoires
  const [documents, setDocuments] = useState<ApplicationDocuments>({
    cinCard: {
      name: `CIN_${cin || 'Document'}.pdf`,
      size: '1.2 MB',
      type: 'application/pdf',
      uploadDate: todayStr,
      verified: false,
      status: 'pending',
      previewType: 'pdf',
    },
    masterDiploma: {
      name: 'Diplome_ou_Attestation_Reussite.pdf',
      size: '2.5 MB',
      type: 'application/pdf',
      uploadDate: todayStr,
      verified: false,
      status: 'pending',
      previewType: 'pdf',
    },
    transcripts: {
      name: 'Releves_Notes_S1_S4.pdf',
      size: '3.8 MB',
      type: 'application/pdf',
      uploadDate: todayStr,
      verified: false,
      status: 'pending',
      previewType: 'pdf',
    },
    cv: {
      name: `CV_${candidateName.replace(/\s+/g, '_') || 'Candidat'}.pdf`,
      size: '720 KB',
      type: 'application/pdf',
      uploadDate: todayStr,
      verified: false,
      status: 'pending',
      previewType: 'pdf',
    },
    motivationLetter: {
      name: 'Lettre_Motivation_Doctorat.pdf',
      size: '490 KB',
      type: 'application/pdf',
      uploadDate: todayStr,
      verified: false,
      status: 'pending',
      previewType: 'pdf',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // File upload handler for candidate with real DataURL preview & chunked Firestore persistence
  const handleFileUpload = (
    key: keyof ApplicationDocuments,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      setDocuments((prev) => ({
        ...prev,
        [key]: {
          name: file.name,
          size: sizeStr,
          type: mimeType,
          uploadDate: todayStr,
          verified: false,
          status: 'pending',
          fileId,
          chunkCount,
          fileData: dataUrl,
          url: dataUrl,
          previewType: isImg ? 'image' : 'pdf',
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen || !thesis) return null;

  const validation = validateDossier({
    candidateName,
    candidateEmail,
    cin,
    currentMasterOrDegree,
    masterGpa,
    documents,
  });

  const calculatedScore = calculateCandidateScore(
    masterGpa,
    mention,
    Boolean(documents.researchProposal?.name)
  );

  const handleSubmit = () => {
    if (!validation.isValid || !thesis) return;
    setIsSubmitting(true);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const receiptCode = `USMBA-DOC-2026-${randomSuffix}`;

    const newApplication: CandidateApplication = {
      id: `app-${Date.now()}`,
      thesisId: thesis.id,
      thesisTitle: thesis.title,
      laboratory: thesis.laboratory,
      supervisorName: thesis.supervisorName,
      ced: thesis.ced,
      candidateName,
      candidateEmail,
      candidatePhone,
      cin,
      cneMassar,
      birthDate,
      address,
      currentMasterOrDegree,
      universityOfOrigin,
      graduationYear,
      masterGpa,
      mention,
      documents,
      status: 'submitted',
      calculatedScore,
      submissionDate: todayStr,
      receiptCode,
      history: [
        {
          date: new Date().toLocaleDateString('fr-FR'),
          action: 'Dépôt du dossier numérique complet (5 pièces justificatives)',
          actor: candidateName,
        },
      ],
    };

    setTimeout(() => {
      onSubmitApplication(newApplication);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-xl flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
              Dépôt de candidature doctorale
            </span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              {thesis.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {thesis.laboratory} • Encadrant : {thesis.supervisorName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 overflow-y-auto space-y-4 max-h-[75vh] text-xs">
          {/* Identity & Contact */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              1. Identité & Coordonnées du Candidat
            </span>
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Nom & Prénom *</label>
                <input
                  type="text"
                  required
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Email (Réception des étapes) *</label>
                <input
                  type="email"
                  required
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">CIN / Passeport *</label>
                <input
                  type="text"
                  required
                  value={cin}
                  onChange={(e) => setCin(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Téléphone *</label>
                <input
                  type="text"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Academic Profile */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              2. Parcours Académique d'Accès
            </span>
            <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-slate-500 block mb-0.5">Intitulé du Diplôme d'Accès *</label>
                <input
                  type="text"
                  required
                  value={currentMasterOrDegree}
                  onChange={(e) => setCurrentMasterOrDegree(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-slate-500 block mb-0.5">Établissement / Université d'origine</label>
                <input
                  type="text"
                  value={universityOfOrigin}
                  onChange={(e) => setUniversityOfOrigin(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Moyenne Générale (/20) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="10"
                  max="20"
                  required
                  value={masterGpa}
                  onChange={(e) => setMasterGpa(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 font-bold outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Mention</label>
                <select
                  value={mention}
                  onChange={(e) =>
                    setMention(
                      e.target.value as 'Passable' | 'Assez Bien' | 'Bien' | 'Très Bien'
                    )
                  }
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 outline-none"
                >
                  <option value="Très Bien">Très Bien</option>
                  <option value="Bien">Bien</option>
                  <option value="Assez Bien">Assez Bien</option>
                  <option value="Passable">Passable</option>
                </select>
              </div>
            </div>
          </div>

          {/* Key Documents Required (5 pieces obligatoires) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider block">
                3. Pièces Justificatives (5 documents obligatoires)
              </span>
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                Vérification humaine par le responsable
              </span>
            </div>

            <div className="p-2.5 bg-blue-50/70 rounded-lg border border-blue-200/60 text-blue-900 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Vous pouvez déposer vos fichiers réels ou utiliser les pièces numériques préremplies. Le professeur responsable vérifiera chaque pièce individuellement et pourra vous envoyer un message pour demander une correction si une pièce est erronée ou manquante.
              </span>
            </div>

            <div className="space-y-2">
              {[
                {
                  key: 'cinCard' as const,
                  label: "1. Pièce d'Identité (CIN / Passeport)",
                  doc: documents.cinCard,
                  accept: '.pdf,.png,.jpg,.jpeg',
                },
                {
                  key: 'masterDiploma' as const,
                  label: "2. Diplôme Master ou Ingénieur",
                  doc: documents.masterDiploma,
                  accept: '.pdf,.png,.jpg',
                },
                {
                  key: 'transcripts' as const,
                  label: '3. Relevés de Notes (S1-S4)',
                  doc: documents.transcripts,
                  accept: '.pdf,.png,.jpg,.jpeg',
                },
                {
                  key: 'cv' as const,
                  label: '4. Curriculum Vitae (CV Académique)',
                  doc: documents.cv,
                  accept: '.pdf,.png,.jpg,.jpeg',
                },
                {
                  key: 'motivationLetter' as const,
                  label: '5. Lettre de Motivation & Projet',
                  doc: documents.motivationLetter,
                  accept: '.pdf,.png,.jpg,.jpeg',
                },
              ].map(({ key, label, doc, accept }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-700 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 block truncate">
                        {label}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono truncate block">
                        {doc.name} ({doc.size}) • <span className="text-amber-700">En attente d'examen</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <label
                      title="Remplacer par un fichier local"
                      className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span className="hidden sm:inline">Changer</span>
                      <input
                        type="file"
                        accept={accept}
                        onChange={(e) => handleFileUpload(key, e)}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => onViewDocPreview(doc, label)}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      title="Aperçu du document"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Score calculé : <strong className="text-slate-900">{calculatedScore} pts</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              Annuler
            </button>

            <button
              onClick={handleSubmit}
              disabled={!validation.isValid || isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Enregistrement BDD...' : 'Valider ma Candidature'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
