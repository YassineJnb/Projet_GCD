import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider, gmailSendProvider } from './firebase';

// Flag to track sign-in in progress
let isSigningIn = false;

// In-memory token cache (never in localStorage per security guidelines)
let cachedAccessToken: string | null = null;
let hasGmailSendAccess = false;
let currentGoogleUser: User | null = null;

// Auth listener: preserves Google user across refreshes even when in-memory OAuth token is empty
export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentGoogleUser = user;
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken || '');
    } else {
      cachedAccessToken = null;
      hasGmailSendAccess = false;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const getCachedAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const isGmailSendAuthorized = (): boolean => {
  return Boolean(cachedAccessToken && hasGmailSendAccess);
};

export const getConnectedGoogleUser = (): User | null => {
  return currentGoogleUser;
};

// Sign in with Google using standard identity scopes (never blocked by unverified Gmail scope screen)
export const signInWithGoogleGmail = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  if (isSigningIn) {
    console.log('Connexion Google déjà en cours...');
    return null;
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || '';

    if (accessToken) {
      cachedAccessToken = accessToken;
    }
    currentGoogleUser = result.user;
    return { user: result.user, accessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-closed-by-user'
    ) {
      console.log("Connexion Google annulée par l'utilisateur ou fermée.");
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error(
        'La fenêtre pop-up Google a été bloquée par votre navigateur. Veuillez autoriser les fenêtres pop-up.'
      );
    }
    if (error?.code === 'auth/unauthorized-domain') {
      throw new Error(
        "Domaine non autorisé pour la pop-up Google. Utilisez l'accès direct par adresse email dans le menu Compte."
      );
    }
    console.error('Erreur de connexion Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export interface AuthorizeGmailSendResult {
  granted: boolean;
  cancelled?: boolean;
  accessToken?: string;
  email?: string | null;
  error?: string;
}

// Explicit step-up authorization for live Gmail API dispatch (requests gmail.send scope)
export const authorizeGmailSendScope = async (): Promise<AuthorizeGmailSendResult> => {
  if (isSigningIn) {
    return { granted: false, cancelled: true };
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, gmailSendProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    currentGoogleUser = result.user;

    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      hasGmailSendAccess = true;
      return {
        granted: true,
        accessToken: credential.accessToken,
        email: result.user.email,
      };
    }

    hasGmailSendAccess = false;
    return {
      granted: false,
      email: result.user.email,
      error:
        "Jeton d'envoi Gmail non retourné par Google. Utilisez un compte Testeur GCP autorisé ou le bouton « Envoyer via Gmail Web ».",
    };
  } catch (error: any) {
    if (
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-closed-by-user'
    ) {
      return { granted: false, cancelled: true };
    }
    if (error?.code === 'auth/popup-blocked') {
      return {
        granted: false,
        error:
          'Pop-up bloquée par le navigateur. Autorisez les pop-ups ou utilisez le bouton « Envoyer via Gmail Web ».',
      };
    }
    return {
      granted: false,
      error:
        error?.message ||
        "Autorisation Gmail API bloquée par Google (application en mode Test). Ajoutez le compte expéditeur aux utilisateurs testeurs GCP ou utilisez « Envoyer via Gmail Web ».",
    };
  } finally {
    isSigningIn = false;
  }
};

export const disconnectGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  hasGmailSendAccess = false;
  currentGoogleUser = null;
};

// UTF-8 to Base64 helper
function utf8ToBase64(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary);
}

// UTF-8 to Base64URL helper (RFC 4648)
function base64UrlEncode(str: string): string {
  return utf8ToBase64(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export interface SendStageEmailParams {
  toEmail: string;
  candidateName: string;
  thesisTitle: string;
  receiptCode: string;
  stage:
    | 'submission_receipt'
    | 'documents_verified'
    | 'documents_correction_needed'
    | 'interview_convocation'
    | 'admission_accepted'
    | 'application_refused';
  additionalDetails?: {
    customMessage?: string;
    flaggedDocuments?: Array<{ docLabel: string; reason: string }>;
    interviewDate?: string;
    interviewTime?: string;
    interviewVenue?: string;
    interviewType?: string;
  };
}

export interface SendEmailResult {
  success: boolean;
  needsGmailAuth?: boolean;
  messageId?: string;
  senderEmail?: string;
  error?: string;
  recipient: string;
  subject: string;
  sentAt: string;
  plainTextBody: string;
  gmailComposeUrl: string;
  mailtoUrl: string;
}

export function buildGmailComposeUrl(to: string, subject: string, body: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    to
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildMailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

export function buildStageEmailPreview(params: SendStageEmailParams): {
  subject: string;
  stageTitle: string;
  statusBadgeColor: string;
  bodyHtmlContent: string;
  plainTextBody: string;
  gmailComposeUrl: string;
  mailtoUrl: string;
} {
  let subject = '';
  let stageTitle = '';
  let statusBadgeColor = '#0f172a';
  let bodyHtmlContent = '';
  let plainTextLines: string[] = [
    `Bonjour ${params.candidateName},`,
    '',
  ];

  switch (params.stage) {
    case 'submission_receipt':
      subject = `[USMBA Doctorat] Accusé de dépôt : Candidature ${params.receiptCode}`;
      stageTitle = 'Accusé de réception - Dossier enregistré';
      statusBadgeColor = '#2563eb';
      bodyHtmlContent = `
        <p>Nous vous confirmons l'enregistrement officiel de votre dossier de candidature au concours de doctorat à l'<strong>Université Sidi Mohamed Ben Abdellah de Fès (USMBA)</strong>.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #475569;">Code Récépissé : <strong style="color: #0f172a;">${params.receiptCode}</strong></p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Sujet postulé : <strong style="color: #0f172a;">${params.thesisTitle}</strong></p>
        </div>
        <p>Vos 5 pièces justificatives obligatoires ont bien été téléversées. Elles sont actuellement en cours d'examen de conformité par le responsable de la thèse et la commission du CED.</p>
        ${
          params.additionalDetails?.customMessage
            ? `<p style="background: #f1f5f9; padding: 10px 14px; border-radius: 6px; color: #1e293b;">${params.additionalDetails.customMessage}</p>`
            : ''
        }
      `;
      plainTextLines.push(
        "Nous vous confirmons l'enregistrement officiel de votre dossier de candidature au concours de doctorat à l'Université Sidi Mohamed Ben Abdellah de Fès (USMBA).",
        `Code Récépissé : ${params.receiptCode}`,
        `Sujet postulé : ${params.thesisTitle}`,
        "Vos 5 pièces justificatives obligatoires sont en cours d'examen de conformité par le responsable de la thèse."
      );
      if (params.additionalDetails?.customMessage) {
        plainTextLines.push('', params.additionalDetails.customMessage);
      }
      break;

    case 'documents_verified':
      subject = `[USMBA Doctorat] Pièces justificatives validées - ${params.receiptCode}`;
      stageTitle = 'Conformité des pièces justificatives validée';
      statusBadgeColor = '#059669';
      bodyHtmlContent = `
        <p>Le responsable de thèse a examiné l'ensemble de vos <strong>5 pièces justificatives obligatoires</strong> (CIN, Diplôme d'accès, Relevés de notes S1-S4, CV et Lettre de motivation).</p>
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 12px 16px; margin: 16px 0; border-radius: 6px; color: #065f46;">
          <strong style="display: block; font-size: 14px;">Statut : Dossier conforme et complet</strong>
          <span style="font-size: 12px;">Toutes les pièces requises sont validées. Votre dossier passe à l'étape suivante d'évaluation académique et de calcul du score de présélection.</span>
        </div>
        ${
          params.additionalDetails?.customMessage
            ? `<p style="font-style: italic; color: #334155; background: #f1f5f9; padding: 8px 12px; border-radius: 4px;">« ${params.additionalDetails.customMessage} »</p>`
            : ''
        }
      `;
      plainTextLines.push(
        'Le responsable de thèse a examiné et validé conformes l’ensemble de vos 5 pièces justificatives obligatoires.',
        `Code Récépissé : ${params.receiptCode} | Sujet : ${params.thesisTitle}`,
        'Statut : Dossier conforme et complet. Votre candidature passe en phase de présélection académique.'
      );
      if (params.additionalDetails?.customMessage) {
        plainTextLines.push(`Observation : ${params.additionalDetails.customMessage}`);
      }
      break;

    case 'documents_correction_needed':
      subject = `[USMBA Doctorat] Action requise : Pièces à corriger - ${params.receiptCode}`;
      stageTitle = 'Demande de correction de pièces justificatives';
      statusBadgeColor = '#d97706';
      bodyHtmlContent = `
        <p>Après examen de votre dossier de candidature, le responsable de la thèse vous informe que <strong>certaines pièces justificatives nécessitent une correction ou un complément</strong> :</p>
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 14px; margin: 16px 0; border-radius: 6px;">
          <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 13px;">Pièces signalées :</h4>
          <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 13px;">
            ${
              params.additionalDetails?.flaggedDocuments &&
              params.additionalDetails.flaggedDocuments.length > 0
                ? params.additionalDetails.flaggedDocuments
                    .map(
                      (f) =>
                        `<li style="margin-bottom: 4px;"><strong>${f.docLabel}</strong> : ${f.reason}</li>`
                    )
                    .join('')
                : `<li>Vérification nécessaire sur vos relevés de notes ou attestations.</li>`
            }
          </ul>
        </div>
        ${
          params.additionalDetails?.customMessage
            ? `<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin: 12px 0;">
                <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block;">Message de l'enseignant responsable :</span>
                <p style="margin: 4px 0 0 0; color: #1e293b; font-size: 13px;">${params.additionalDetails.customMessage}</p>
              </div>`
            : ''
        }
        <p style="color: #b45309; font-weight: bold; font-size: 13px;">
          Merci de vous connecter sans délai à votre Espace Candidat pour téléverser les documents conformes demandés.
        </p>
      `;
      plainTextLines.push(
        `Action requise pour votre dossier ${params.receiptCode} (${params.thesisTitle}) :`,
        'Certaines pièces justificatives nécessitent une correction :'
      );
      if (params.additionalDetails?.flaggedDocuments?.length) {
        params.additionalDetails.flaggedDocuments.forEach((f) => {
          plainTextLines.push(`- ${f.docLabel} : ${f.reason}`);
        });
      }
      if (params.additionalDetails?.customMessage) {
        plainTextLines.push('', `Message du responsable : ${params.additionalDetails.customMessage}`);
      }
      plainTextLines.push('', 'Merci de téléverser les pièces corrigées depuis votre Espace Candidat.');
      break;

    case 'interview_convocation': {
      subject = `[USMBA Doctorat] Convocation à l'entretien oral - ${params.receiptCode}`;
      stageTitle = "Convocation à l'entretien oral de sélection";
      statusBadgeColor = '#7c3aed';
      const date = params.additionalDetails?.interviewDate || '24 Novembre 2026';
      const time = params.additionalDetails?.interviewTime || '10:30';
      const venue = params.additionalDetails?.interviewVenue || 'Salle des Thèses, Bloc A, FST Fès';
      bodyHtmlContent = `
        <p>Nous avons le plaisir de vous informer que votre candidature a été <strong>présélectionnée</strong> par la commission de sélection doctorale.</p>
        <p>Vous êtes formellement convoqué(e) à passer l'entretien oral individuel devant le jury selon les modalités ci-dessous :</p>
        <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; padding: 14px 18px; margin: 16px 0; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #5b21b6;"><strong>Date :</strong> ${date}</p>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #5b21b6;"><strong>Heure :</strong> ${time}</p>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: #5b21b6;"><strong>Lieu :</strong> ${venue}</p>
        </div>
        <p style="font-size: 12px; color: #475569;">
          Veuillez vous présenter muni(e) de vos pièces justificatives originales (CIN, diplômes et relevés de notes) ainsi que d'une copie de votre projet de recherche.
        </p>
      `;
      plainTextLines.push(
        `Félicitations ! Votre candidature (${params.receiptCode}) pour le sujet « ${params.thesisTitle} » est présélectionnée.`,
        'Vous êtes convoqué(e) à l’entretien oral de sélection :',
        `- Date : ${date}`,
        `- Heure : ${time}`,
        `- Lieu : ${venue}`,
        'Veuillez vous munir des originaux de vos pièces justificatives.'
      );
      break;
    }

    case 'admission_accepted':
      subject = `[USMBA Doctorat] Félicitations : Admission en doctorat accordée (${params.receiptCode})`;
      stageTitle = 'Admission Officielle en Doctorat Proclamée';
      statusBadgeColor = '#059669';
      bodyHtmlContent = `
        <p>Le Président de l'Université Sidi Mohamed Ben Abdellah de Fès et le Directeur du Centre d'Études Doctorales ont l'honneur de vous informer de votre <strong>admission définitive sur la liste principale</strong> pour préparer votre thèse de doctorat.</p>
        <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 16px; margin: 16px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 6px 0; color: #047857; font-size: 16px;">Félicitations ! Votre admission est validée</h3>
          <p style="margin: 0; color: #065f46; font-size: 13px;">Thèse : <strong>${params.thesisTitle}</strong></p>
          <p style="margin: 4px 0 0 0; color: #065f46; font-size: 13px;">Code d'authentification : <strong>${params.receiptCode}</strong></p>
        </div>
        <p>Votre attestation officielle d'admission est disponible au téléchargement dans votre Espace Candidat avec QR Code de vérification.</p>
      `;
      plainTextLines.push(
        'Félicitations ! Votre admission définitive en doctorat à l’USMBA est validée sur la liste principale.',
        `Thèse : ${params.thesisTitle}`,
        `Code d’authentification : ${params.receiptCode}`,
        'Téléchargez votre attestation officielle depuis votre Espace Candidat.'
      );
      break;

    case 'application_refused':
      subject = `[USMBA Doctorat] Décision de la commission de sélection - ${params.receiptCode}`;
      stageTitle = 'Notification relative à votre candidature de doctorat';
      statusBadgeColor = '#e11d48';
      bodyHtmlContent = `
        <p>La commission de sélection et le responsable de recherche ont procédé à l'évaluation comparative des dossiers déposés pour le sujet :</p>
        <p style="font-weight: bold; color: #0f172a; margin: 8px 0;">« ${params.thesisTitle} »</p>
        <p>Nous avons le regret de vous informer qu'en raison du nombre limité de places disponibles et des critères de sélection, votre candidature n'a pas été retenue pour cette session.</p>
        ${
          params.additionalDetails?.customMessage
            ? `<div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 10px 14px; border-radius: 6px; margin: 12px 0; color: #9f1239;">
                <strong>Observation :</strong> ${params.additionalDetails.customMessage}
              </div>`
            : ''
        }
        <p style="color: #64748b; font-size: 12px;">Nous vous remercions pour l'intérêt porté aux laboratoires de recherche de l'USMBA et vous souhaitons plein succès dans la poursuite de votre parcours universitaire.</p>
      `;
      plainTextLines.push(
        `Décision relative à votre candidature (${params.receiptCode}) pour le sujet : « ${params.thesisTitle} ».`,
        "En raison du nombre limité de places disponibles, votre candidature n'a pas été retenue pour cette session."
      );
      if (params.additionalDetails?.customMessage) {
        plainTextLines.push(`Observation : ${params.additionalDetails.customMessage}`);
      }
      break;
  }

  plainTextLines.push(
    '',
    'Cordialement,',
    "Centre d'Études Doctorales (CED) - Université Sidi Mohamed Ben Abdellah de Fès"
  );

  const plainTextBody = plainTextLines.join('\n');
  const gmailComposeUrl = buildGmailComposeUrl(params.toEmail, subject, plainTextBody);
  const mailtoUrl = buildMailtoUrl(params.toEmail, subject, plainTextBody);

  return {
    subject,
    stageTitle,
    statusBadgeColor,
    bodyHtmlContent,
    plainTextBody,
    gmailComposeUrl,
    mailtoUrl,
  };
}

export async function sendGmailStageNotification(
  params: SendStageEmailParams,
  overrideToken?: string
): Promise<SendEmailResult> {
  const token = overrideToken || (hasGmailSendAccess ? cachedAccessToken : null);
  const now = new Date().toLocaleString('fr-FR');
  const preview = buildStageEmailPreview(params);
  const { subject, stageTitle, statusBadgeColor, bodyHtmlContent, plainTextBody, gmailComposeUrl, mailtoUrl } = preview;

  if (!token) {
    return {
      success: false,
      needsGmailAuth: true,
      error:
        "Autorisation d'envoi Gmail API non activée. Cliquez sur « Autoriser l'envoi Gmail API » ou utilisez « Envoyer via Gmail Web ».",
      recipient: params.toEmail,
      subject,
      sentAt: now,
      plainTextBody,
      gmailComposeUrl,
      mailtoUrl,
    };
  }

  // Construct full HTML email template
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background-color: #0f172a; padding: 20px 24px; color: #ffffff;">
      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px;">
        UNIVERSITÉ SIDI MOHAMED BEN ABDELLAH DE FÈS
      </div>
      <div style="font-size: 18px; font-weight: 700; color: #ffffff;">
        Portail Unifié du Doctorat • GCD
      </div>
    </div>
    <div style="padding: 16px 24px 0 24px;">
      <span style="display: inline-block; background-color: ${statusBadgeColor}; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; border-radius: 9999px;">
        ${stageTitle}
      </span>
    </div>
    <div style="padding: 16px 24px 24px 24px; font-size: 14px; line-height: 1.6; color: #334155;">
      <p style="margin-top: 0;">Bonjour <strong>${params.candidateName}</strong>,</p>
      ${bodyHtmlContent}
    </div>
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #64748b; text-align: center;">
      <p style="margin: 0;">Centre d'Études Doctorales (CED) • Université Sidi Mohamed Ben Abdellah, Fès, Maroc</p>
      <p style="margin: 4px 0 0 0; color: #94a3b8;">Ce message officiel vous est transmis depuis le Guichet Centralisé du Doctorat USMBA.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const emailLines = [
      `To: ${params.toEmail}`,
      `Subject: =?utf-8?B?${utf8ToBase64(subject)}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      fullHtml,
    ].join('\r\n');

    const rawMessage = base64UrlEncode(emailLines);

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: rawMessage }),
      }
    );

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const rawErr = errBody.error?.message || `Erreur Gmail API (${response.status})`;
      const isAuthIssue = response.status === 401 || response.status === 403;
      if (isAuthIssue) {
        hasGmailSendAccess = false;
      }
      const friendlyErr = isAuthIssue
        ? `Permission Gmail d'envoi manquante ou expirée (${rawErr}). Veuillez cliquer sur « Autoriser l'envoi Gmail API » ou utiliser « Envoyer via Gmail Web ».`
        : rawErr;

      console.warn('Gmail API error:', rawErr);
      return {
        success: false,
        needsGmailAuth: isAuthIssue,
        error: friendlyErr,
        recipient: params.toEmail,
        subject,
        sentAt: now,
        plainTextBody,
        gmailComposeUrl,
        mailtoUrl,
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.id,
      senderEmail: currentGoogleUser?.email || undefined,
      recipient: params.toEmail,
      subject,
      sentAt: now,
      plainTextBody,
      gmailComposeUrl,
      mailtoUrl,
    };
  } catch (err: any) {
    console.error('Failed to send stage notification via Gmail:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
      recipient: params.toEmail,
      subject,
      sentAt: now,
      plainTextBody,
      gmailComposeUrl,
      mailtoUrl,
    };
  }
}
