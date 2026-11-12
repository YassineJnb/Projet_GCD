import React from 'react';
import {
  X,
  Printer,
  QrCode,
  GraduationCap,
} from 'lucide-react';
import { CandidateApplication } from '../types';

interface AttestationModalProps {
  app: CandidateApplication | null;
  isOpen: boolean;
  onClose: () => void;
  type: 'receipt' | 'attestation';
}

export const AttestationModal: React.FC<AttestationModalProps> = ({
  app,
  isOpen,
  onClose,
  type,
}) => {
  if (!isOpen || !app) return null;

  const isAttestation = type === 'attestation';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-xl flex flex-col overflow-hidden border border-slate-200">
        {/* Top Control Bar */}
        <div className="no-print p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-semibold text-xs text-slate-700">
            {isAttestation
              ? 'Attestation d\'Admission Doctorale'
              : 'Fiche Officielle de Dépôt de Candidature'}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Official Printable Academic Certificate */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-4 text-xs text-slate-800 bg-white font-sans">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-3">
            <div className="text-left space-y-0.5">
              <div className="font-bold text-xs text-slate-900">
                UNIVERSITÉ SIDI MOHAMED BEN ABDELLAH - FÈS
              </div>
              <div className="text-[11px] text-slate-600">
                CENTRE D'ÉTUDES DOCTORALES ({app.ced})
              </div>
              <div className="text-[10px] text-slate-500">
                {app.laboratory}
              </div>
            </div>

            <div className="text-right space-y-0.5">
              <div className="font-arabic font-bold text-sm text-slate-900">
                جامعة سيدي محمد بن عبد الله - فاس
              </div>
              <div className="font-arabic text-[11px] text-slate-600">
                مركز الدراسات في الدكتوراه
              </div>
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center py-2 bg-slate-50 rounded-lg border border-slate-200">
            <h2 className="text-sm sm:text-base font-bold text-slate-950">
              {isAttestation
                ? 'ATTESTATION D\'ADMISSION EN CYCLE DOCTORAL'
                : 'RÉCÉPISSÉ DE CANDIDATURE AU DOCTORAT'}
            </h2>
            <div className="text-xs font-mono font-semibold text-slate-700 mt-0.5">
              Réf : {app.receiptCode}
            </div>
          </div>

          {/* Student Info Box */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Candidat(e)
              </span>
              <div className="font-bold text-slate-900 mt-0.5">{app.candidateName}</div>
              <div className="text-slate-600 mt-1">
                <div>CIN : <strong>{app.cin}</strong></div>
                <div>Email : {app.candidateEmail}</div>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Diplôme & Note
              </span>
              <div className="font-semibold text-slate-900 mt-0.5">{app.currentMasterOrDegree}</div>
              <div className="text-slate-600 mt-1">
                <div>Moyenne : <strong>{app.masterGpa}/20</strong> ({app.mention})</div>
                <div>Score calculé : <strong>{app.calculatedScore} pts</strong></div>
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="p-3 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
              Sujet de Recherche
            </span>
            <div className="font-semibold text-slate-900 text-xs">
              {app.thesisTitle}
            </div>
            <div className="text-slate-600 text-[11px] mt-1">
              Encadrant : {app.supervisorName} • {app.laboratory}
            </div>
          </div>

          {/* QR Code and Date */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <QrCode className="w-8 h-8 text-slate-800" />
              <div className="text-[11px] text-slate-600">
                Document certifié conforme par le guichet GCD Next.
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              Délivré le {app.submissionDate}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="no-print p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
