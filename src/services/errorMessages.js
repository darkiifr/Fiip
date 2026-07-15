const TECHNICAL_FALLBACK = 'Action impossible pour le moment. Reessayez dans quelques instants.';

function readMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return String(error.message || error.error_description || error.code || '').trim();
}

export function getFriendlyErrorMessage(error, fallback = TECHNICAL_FALLBACK) {
  const message = readMessage(error);
  const code = String(error?.code || '').trim();
  const value = `${code} ${message}`.trim();

  if (!value) return fallback;

  if (/le\.auth\.(registerPasskey|signInWithPasskey)|registerPasskey is not a function|signInWithPasskey is not a function|passkey/i.test(value)) {
    return 'Les passkeys ne sont pas disponibles dans cette session. Mettez Fiip a jour, utilisez un navigateur compatible, puis relancez la connexion passkey.';
  }

  if (/PublicKeyCredential|not supported|not available|webauthn/i.test(value)) {
    return 'Cet appareil ou ce navigateur ne prend pas en charge les passkeys pour Fiip.';
  }

  if (/email rate limit|smtp|mail|confirmation email|otp|token/i.test(value)) {
    return 'Le code e-mail ne peut pas etre valide pour le moment. Verifiez le code recu, puis demandez un nouvel envoi si besoin.';
  }

  if (/invalid login credentials|invalid credentials|password/i.test(value)) {
    return 'Identifiants incorrects. Verifiez votre e-mail, pseudo ou mot de passe.';
  }

  if (/user not found|account not found|not exist|introuvable|no user/i.test(value)) {
    return 'Aucun compte Fiip ne correspond a ces informations.';
  }

  if (/oauth|google|callback|provider/i.test(value)) {
    return 'Connexion Google impossible. Recommencez depuis Fiip et acceptez le retour vers l’application.';
  }

  if (/camera|webcam|getUserMedia|permission|NotAllowedError|NotFoundError|NotReadableError/i.test(value)) {
    return 'La webcam est indisponible. Autorisez la camera pour Fiip ou importez une image du document.';
  }

  if (/ocr|vision|scan_image_to_text|recognize|tesseract/i.test(value)) {
    return 'OCR indisponible pour cette image. Fiip va tenter le moteur de secours ou vous laisser joindre le fichier sans extraction.';
  }

  if (/openrouter|ai-proxy|OPENROUTER|model|generation/i.test(value)) {
    return 'L’assistant IA est indisponible. Verifiez la configuration OpenRouter cote serveur, puis reessayez.';
  }

  if (/supabase|configuration|env|missing/i.test(value)) {
    return 'Configuration compte Fiip incomplete. Verifiez les variables Supabase et les secrets serveur.';
  }

  return message || fallback;
}

export function normalizeError(error, fallback) {
  return {
    ...(typeof error === 'object' && error ? error : {}),
    message: getFriendlyErrorMessage(error, fallback),
    technicalMessage: readMessage(error),
  };
}
