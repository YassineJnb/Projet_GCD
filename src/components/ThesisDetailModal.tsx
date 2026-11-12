import React from 'react';
import { X, CheckCircle } from 'lucide-react';
import { ThesisTopic } from '../types';

interface ThesisDetailModalProps {
  thesis: ThesisTopic | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyOneClick: (thesis: ThesisTopic) => void;
  isApplied: boolean;
  canApply?: boolean;
  isLimitReached?: boolean;
}

export const ThesisDetailModal: React.FC<ThesisDetailModalProps> = ({
  thesis,
  isOpen,
  onClose,
  onApplyOneClick,
  isApplied,
  canApply = true,
  isLimitReached = false,
}) => {
  if (!isOpen || !thesis) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl shadow-xl flex flex-col overflow-hidden text-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              {thesis.ced} • {thesis.establishment}
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5 leading-snug">
              {thesis.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Strict Minimum Body */}
        <div className="p-4 space-y-3.5 text-xs text-slate-600 overflow-y-auto max-h-[70vh]">
          <div>
            <div className="text-[11px] font-semibold text-slate-900 uppercase tracking-wider mb-1">
              Descriptif du sujet
            </div>
            <p className="leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700">
              {thesis.abstract}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Encadrant</span>
              <strong className="text-slate-900 block mt-0.5">{thesis.supervisorName}</strong>
              <span className="text-[11px] text-slate-500">{thesis.supervisorEmail}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Laboratoire</span>
              <strong className="text-slate-900 block mt-0.5 truncate">{thesis.laboratory}</strong>
              <span className="text-[11px] text-slate-500">{thesis.fundingType}</span>
            </div>
          </div>

          <div className="text-xs text-slate-600">
            Diplômes admis : <strong className="text-slate-900">{thesis.requiredDegrees.join(', ')}</strong>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          {!canApply ? (
            <span className="text-[11px] text-slate-400">
              Mode consultation (candidatures non disponibles)
            </span>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              Fermer
            </button>

            {canApply && (
            isApplied ? (
              <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5 px-3 py-1.5 bg-slate-200/60 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5" /> Déjà candidaté
              </span>
            ) : isLimitReached ? (
              <button
                disabled
                className="px-3.5 py-1.5 rounded-lg bg-slate-200 text-slate-400 text-xs font-medium cursor-not-allowed"
                title="Vous avez atteint la limite maximale de 2 choix de thèse."
              >
                Limite de 2 choix atteinte
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  onApplyOneClick(thesis);
                }}
                disabled={thesis.remainingSlots === 0}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
              >
                Postuler
              </button>
            )
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
