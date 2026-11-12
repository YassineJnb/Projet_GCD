import React, { useState } from 'react';
import {
  GraduationCap,
  ChevronDown,
  UserCheck,
  UserPlus,
  Mail,
  CheckCircle2,
  LogOut,
  Send,
  Database,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile } from '../types';
import { canUserAccessProfSpace } from '../utils/registrationRules';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  onOpenCreateAccount: () => void;
  activeTab: 'catalog' | 'candidate_dashboard' | 'professor_portal';
  onSelectTab: (tab: 'catalog' | 'candidate_dashboard' | 'professor_portal') => void;
  totalThesesCount: number;
  totalApplicantsCount: number;
  googleUser: FirebaseUser | null;
  isSigningInGoogle?: boolean;
  gmailSendAuthorized?: boolean;
  isAuthorizingGmailSend?: boolean;
  onGoogleSignIn: () => void;
  onAuthorizeGmailSend?: () => void;
  onGoogleSignOut: () => void;
  onSendTestGmail: () => void;
  onDirectEmailLogin?: (email: string) => void;
  isDbConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  availableUsers,
  onSwitchUser,
  onOpenCreateAccount,
  activeTab,
  onSelectTab,
  totalThesesCount,
  totalApplicantsCount,
  googleUser,
  isSigningInGoogle = false,
  gmailSendAuthorized = false,
  isAuthorizingGmailSend = false,
  onGoogleSignIn,
  onAuthorizeGmailSend,
  onGoogleSignOut,
  onSendTestGmail,
  onDirectEmailLogin,
  isDbConnected,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [gmailMenuOpen, setGmailMenuOpen] = useState(false);
  const showProfTab = canUserAccessProfSpace(currentUser.role);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 leading-tight flex items-center gap-2">
              <span>USMBA Doctorat</span>
              {isDbConnected && (
                <span
                  title="Base de données Cloud Firestore connectée et synchronisée"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <Database className="w-2.5 h-2.5 text-emerald-600" />
                  BDD Réelle
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              Guichet Centralisé du Doctorat
            </div>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => onSelectTab('catalog')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
              activeTab === 'catalog'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sujets de Thèses ({totalThesesCount})
          </button>

          {currentUser.role !== 'guest' && (
            <button
              onClick={() => onSelectTab('candidate_dashboard')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTab === 'candidate_dashboard'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Espace Candidat
            </button>
          )}

          {showProfTab && (
            <button
              onClick={() => onSelectTab('professor_portal')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                activeTab === 'professor_portal'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Espace Enseignant / CED ({totalApplicantsCount})
            </button>
          )}
        </nav>

        {/* Right Action Bar: Gmail Auth + User Profile Switcher */}
        <div className="flex items-center gap-2">
          {/* Gmail Connection Status / Button */}
          {!googleUser ? (
            <button
              onClick={onGoogleSignIn}
              disabled={isSigningInGoogle}
              title="Connecter votre compte Google / Gmail pour activer votre espace et les notifications"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 transition cursor-pointer shadow-xs text-xs font-medium text-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span className="hidden sm:inline">
                {isSigningInGoogle ? 'Connexion...' : 'Connecter Gmail'}
              </span>
              <span className="sm:hidden">
                {isSigningInGoogle ? '...' : 'Gmail'}
              </span>
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => {
                  setGmailMenuOpen(!gmailMenuOpen);
                  setDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-900 text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Mail className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline truncate max-w-[140px]">
                  {googleUser.email}
                </span>
                <span className="sm:hidden">Gmail OK</span>
                <ChevronDown className="w-3 h-3 text-emerald-700 ml-0.5" />
              </button>

              {gmailMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 text-xs text-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Compte Google / Gmail Actif
                      </span>
                      <span className="font-semibold text-slate-900 truncate block">
                        {googleUser.displayName || currentUser.name}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-mono truncate block">
                        {googleUser.email}
                      </span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>

                  <div
                    className={`p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                      gmailSendAuthorized
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      {gmailSendAuthorized ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Envoi Gmail API Actif</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Envoi Gmail API non autorisé</span>
                        </>
                      )}
                    </div>
                  </div>

                  {!gmailSendAuthorized && onAuthorizeGmailSend && (
                    <button
                      onClick={() => {
                        setGmailMenuOpen(false);
                        onAuthorizeGmailSend();
                      }}
                      disabled={isAuthorizingGmailSend}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center justify-between transition cursor-pointer disabled:opacity-60"
                    >
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {isAuthorizingGmailSend
                          ? 'Autorisation...'
                          : 'Autoriser l’envoi réel Gmail'}
                      </span>
                      <span className="text-[10px]">OAuth</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setGmailMenuOpen(false);
                      onSelectTab('candidate_dashboard');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold flex items-center justify-between transition cursor-pointer"
                  >
                    <span>Ouvrir Mon Espace Candidat</span>
                    <span className="text-[10px]">→</span>
                  </button>

                  <button
                    onClick={() => {
                      setGmailMenuOpen(false);
                      onSendTestGmail();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      Envoyer un courriel test
                    </span>
                    <span className="text-[10px] opacity-70">Gmail</span>
                  </button>

                  <button
                    onClick={() => {
                      setGmailMenuOpen(false);
                      onGoogleSignOut();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-100 text-rose-600 font-medium flex items-center gap-1.5 transition cursor-pointer text-[11px]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Déconnecter ce compte
                  </button>
                </div>
              )}
            </div>
          )}

          {/* User Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setGmailMenuOpen(false);
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
                currentUser.role !== 'guest'
                  ? 'border-slate-300 bg-slate-50/80 hover:bg-slate-100 text-slate-900'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-800'
              }`}
            >
              <div className="relative w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[11px] overflow-hidden shrink-0">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentUser.role === 'guest' ? 'V' : currentUser.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="hidden sm:block text-left">
                <span className="font-semibold block leading-tight text-slate-900 truncate max-w-[140px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-500 truncate block max-w-[140px]">
                  {currentUser.role !== 'guest' && currentUser.email
                    ? currentUser.email
                    : currentUser.title || 'Mode Visiteur'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 text-xs space-y-2">
                {/* Active Account Summary Banner */}
                {currentUser.role !== 'guest' && (
                  <div className="p-2.5 rounded-lg bg-slate-900 text-white space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        Mon Compte Connecté
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-400/30">
                        {currentUser.role === 'candidate'
                          ? 'Candidat'
                          : currentUser.role === 'professor'
                          ? 'Enseignant'
                          : 'Directeur CED'}
                      </span>
                    </div>
                    <div className="font-bold text-xs truncate">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-300 font-mono truncate">{currentUser.email}</div>
                    <div className="pt-1 flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onSelectTab(
                            canUserAccessProfSpace(currentUser.role)
                              ? 'professor_portal'
                              : 'candidate_dashboard'
                          );
                        }}
                        className="flex-1 py-1 px-2 rounded bg-white text-slate-900 font-semibold text-[11px] hover:bg-slate-100 transition cursor-pointer"
                      >
                        Ouvrir Mon Espace
                      </button>
                      {googleUser && (
                        <button
                          onClick={() => {
                            setDropdownOpen(false);
                            onGoogleSignOut();
                          }}
                          className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 text-[11px] transition cursor-pointer"
                        >
                          Déconnexion
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Comptes Enregistrés ({availableUsers.length})
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-0.5">
                    {availableUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          onSwitchUser(user);
                          setDropdownOpen(false);
                          if (user.role === 'candidate') {
                            onSelectTab('candidate_dashboard');
                          } else if (user.role === 'professor' || user.role === 'ced_admin') {
                            onSelectTab('professor_portal');
                          } else {
                            onSelectTab('catalog');
                          }
                        }}
                        className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                          currentUser.id === user.id
                            ? 'bg-slate-100 font-semibold text-slate-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs truncate">{user.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {user.email || user.title || 'Mode Visiteur'}
                          </div>
                        </div>
                        {currentUser.id === user.id && (
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2 space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-semibold px-1">
                    Connexion directe par adresse Email
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = (e.currentTarget.elements.namedItem('directEmail') as HTMLInputElement)?.value;
                      if (input && onDirectEmailLogin) {
                        onDirectEmailLogin(input.trim());
                        setDropdownOpen(false);
                      }
                    }}
                    className="flex gap-1"
                  >
                    <input
                      name="directEmail"
                      type="email"
                      required
                      placeholder="votre.email@gmail.com..."
                      className="flex-1 px-2 py-1 text-[11px] border border-slate-200 rounded-md outline-none bg-slate-50 text-slate-900"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-slate-900 text-white rounded-md text-[11px] font-medium cursor-pointer hover:bg-slate-800 shrink-0"
                    >
                      Ouvrir
                    </button>
                  </form>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenCreateAccount();
                    }}
                    className="w-full text-left p-1.5 rounded-lg flex items-center gap-1.5 text-slate-800 hover:bg-slate-50 transition cursor-pointer font-medium text-xs mt-1"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-slate-900" />
                    <span>+ Créer un nouveau compte</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-t border-slate-100 bg-slate-50 px-4 py-1.5 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => onSelectTab('catalog')}
          className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 cursor-pointer ${
            activeTab === 'catalog'
              ? 'bg-white text-slate-900 shadow-xs font-semibold'
              : 'text-slate-600'
          }`}
        >
          Thèses ({totalThesesCount})
        </button>

        {currentUser.role !== 'guest' && (
          <button
            onClick={() => onSelectTab('candidate_dashboard')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 cursor-pointer ${
              activeTab === 'candidate_dashboard'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600'
            }`}
          >
            Mon Espace Candidat
          </button>
        )}

        {showProfTab && (
          <button
            onClick={() => onSelectTab('professor_portal')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 cursor-pointer ${
              activeTab === 'professor_portal'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600'
            }`}
          >
            Enseignant ({totalApplicantsCount})
          </button>
        )}
      </div>
    </header>
  );
};
