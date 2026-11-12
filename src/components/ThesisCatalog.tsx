import React, { useState, useMemo } from 'react';
import { Search, CheckCircle } from 'lucide-react';
import { ThesisTopic, UserProfile } from '../types';
import {
  filterTheses,
  canUserApply,
  canCandidateApplyMore,
  MAX_THESIS_CHOICES_PER_CANDIDATE,
} from '../utils/registrationRules';

interface ThesisCatalogProps {
  theses: ThesisTopic[];
  currentUser: UserProfile;
  onSelectThesis: (thesis: ThesisTopic) => void;
  onApplyOneClick: (thesis: ThesisTopic) => void;
  appliedThesisIds: string[];
}

export const ThesisCatalog: React.FC<ThesisCatalogProps> = ({
  theses,
  currentUser,
  onSelectThesis,
  onApplyOneClick,
  appliedThesisIds,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCed, setSelectedCed] = useState<string>('all');
  const [selectedEstablishment, setSelectedEstablishment] = useState<string>('all');
  const [selectedFunding, setSelectedFunding] = useState<string>('all');

  const isCandidate = canUserApply(currentUser.role);
  const isLimitReached = !canCandidateApplyMore(appliedThesisIds.length);

  const filteredTheses = useMemo(() => {
    return filterTheses(theses, {
      searchQuery,
      ced: selectedCed,
      establishment: selectedEstablishment,
      funding: selectedFunding,
    });
  }, [theses, searchQuery, selectedCed, selectedEstablishment, selectedFunding]);

  return (
    <div className="space-y-4">
      {/* Clean, Simple Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par sujet, laboratoire, professeur ou mot-clé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 text-xs sm:text-sm outline-none focus:border-slate-400 transition"
          />
        </div>

        <select
          value={selectedCed}
          onChange={(e) => setSelectedCed(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs outline-none"
        >
          <option value="all">Tous les CED</option>
          <option value="CED-ST">Sciences & Techniques</option>
          <option value="CED-SS">Sciences de la Santé</option>
          <option value="CED-SHSJ">Humaines & Sociales</option>
        </select>

        <select
          value={selectedEstablishment}
          onChange={(e) => setSelectedEstablishment(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs outline-none"
        >
          <option value="all">Tous les Établissements</option>
          <option value="FST Fès">FST Fès</option>
          <option value="FS Dhar El Mahraz">FS Dhar El Mahraz</option>
          <option value="ENSA Fès">ENSA Fès</option>
          <option value="Faculté de Médecine">Faculté de Médecine</option>
          <option value="FSJES Fès">FSJES Fès</option>
          <option value="FLSH Dhar El Mahraz">FLSH Dhar El Mahraz</option>
        </select>

        <select
          value={selectedFunding}
          onChange={(e) => setSelectedFunding(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs outline-none"
        >
          <option value="all">Tous les Financements</option>
          <option value="CNRST">Bourse CNRST</option>
          <option value="USMBA">Bourse USMBA</option>
          <option value="Labo">Contrat Labo</option>
          <option value="Autofinancé">Autofinancé</option>
        </select>
      </div>

      {/* Guest Mode Informational Banner */}
      {currentUser.role === 'guest' && (
        <div className="bg-slate-100 border border-slate-200 text-slate-700 text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900">Mode Visiteur :</span>
            <span>Vous consultez les sujets de doctorat en accès libre (candidatures désactivées).</span>
          </div>
          <span className="text-[11px] font-mono bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded">
            Consultation seule
          </span>
        </div>
      )}

      {/* Counter & Choice Quota */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
        <div>{filteredTheses.length} sujet(s) disponible(s)</div>

        {isCandidate && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Choix de thèses :</span>
            <span
              className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                isLimitReached
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {appliedThesisIds.length} / {MAX_THESIS_CHOICES_PER_CANDIDATE}{' '}
              {isLimitReached ? '(Quota maximum atteint)' : 'choisis'}
            </span>
          </div>
        )}
      </div>

      {/* Simplified White List */}
      <div className="space-y-3">
        {filteredTheses.map((thesis) => {
          const isApplied = appliedThesisIds.includes(thesis.id);

          return (
            <div
              key={thesis.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">{thesis.ced}</span>
                  <span>•</span>
                  <span>{thesis.establishment}</span>
                  <span>•</span>
                  <span>{thesis.laboratory}</span>
                </div>

                <h3
                  onClick={() => onSelectThesis(thesis)}
                  className="text-sm sm:text-base font-semibold text-slate-900 hover:text-slate-700 cursor-pointer transition leading-snug"
                >
                  {thesis.title}
                </h3>

                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
                  <span>
                    Encadrant : <strong>{thesis.supervisorName}</strong>
                  </span>
                  <span>
                    Financement : <span className="text-slate-800">{thesis.fundingType}</span>
                  </span>
                  <span>
                    Places : <strong>{thesis.remainingSlots}/{thesis.positionsCount}</strong>
                  </span>
                </div>
              </div>

              {/* Minimal Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onSelectThesis(thesis)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
                >
                  Détails
                </button>

                {isCandidate && (
                  isApplied ? (
                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-slate-800" />
                      Candidaté
                    </span>
                  ) : isLimitReached ? (
                    <button
                      disabled
                      title="Limite maximale de 2 candidatures atteinte pour votre compte."
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-medium cursor-not-allowed"
                    >
                      Limite atteinte (2/2)
                    </button>
                  ) : (
                    <button
                      onClick={() => onApplyOneClick(thesis)}
                      disabled={thesis.remainingSlots === 0}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        thesis.remainingSlots > 0
                          ? 'bg-slate-900 hover:bg-slate-800 text-white'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Postuler
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
