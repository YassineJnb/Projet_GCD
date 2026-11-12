import React, { useState } from 'react';
import { X, UserPlus, CheckCircle, Mail, User } from 'lucide-react';
import { UserProfile, RoleType } from '../types';
import { validateAccountCreation } from '../utils/registrationRules';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAccount: (newUser: UserProfile) => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  onCreateAccount,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleType>('candidate');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateAccountCreation(name, email);
    if (!validation.isValid) {
      setError(validation.error || 'Informations invalides.');
      return;
    }

    const newUser: UserProfile = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      avatar: '',
      title:
        role === 'candidate'
          ? 'Doctorant / Candidat'
          : 'Professeur d\'Enseignement Supérieur',
      establishment: 'FST Fès',
      laboratory: role === 'professor' ? 'LIIAN' : undefined,
    };

    onCreateAccount(newUser);
    setName('');
    setEmail('');
    setRole('candidate');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-xl flex flex-col overflow-hidden text-slate-800">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Créer un compte
              </h2>
              <p className="text-[11px] text-slate-500">
                Seuls votre nom et email sont requis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Account Role Selector */}
          <div>
            <label className="text-slate-600 block mb-1.5 font-medium">
              Type de compte
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('candidate')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  role === 'candidate'
                    ? 'border-slate-900 bg-slate-50 text-slate-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="text-xs font-bold">Candidat (Doctorat)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Max 2 thèses au choix
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('professor')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  role === 'professor'
                    ? 'border-slate-900 bg-slate-50 text-slate-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="text-xs font-bold">Enseignant / CED</div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Gestion des candidatures
                </div>
              </button>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label className="text-slate-600 block mb-1 font-medium">
              Nom complet *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Yassine Mansouri"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400 transition"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="text-slate-600 block mb-1 font-medium">
              Adresse email *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex. yassine.mansouri@usmba.ac.ma"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-slate-400 transition"
              />
            </div>
          </div>

          {/* Informative Rule Note */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 text-[11px] flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-slate-700 shrink-0 mt-0.5" />
            <span>
              {role === 'candidate'
                ? 'Conformément aux directives du CED, chaque compte candidat a droit à un maximum de deux (2) sujets de thèse.'
                : 'Le compte enseignant vous permet de publier des sujets et d\'évaluer les candidats.'}
            </span>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 transition cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition cursor-pointer"
            >
              Créer le compte
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
