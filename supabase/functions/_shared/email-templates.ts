interface LicenseEmailData {
  tier?: string;
  licenseKey?: string;
  duration?: string;
  expiresAt?: string | null;
  renewsAt?: string | null;
  deviceLimit?: number | null;
  portalUrl?: string;
  budgetEur?: number;
  inviteUrl?: string;
  inviterEmail?: string;
}

function formatDate(value?: string | null) {
  if (!value) return 'non définie';
  return new Date(value).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character] || character));
}

function safeUrl(value: unknown, fallback = 'https://accounts.fiip.fr/') {
  try {
    const url = new URL(String(value || fallback));
    return url.protocol === 'https:' ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function action(label: string, href: string) {
  return `<a href="${escapeHtml(safeUrl(href))}" style="display:inline-block;background:#111113;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 18px;border-radius:7px">${escapeHtml(label)}</a>`;
}

function baseHtml(title: string, preheader: string, body: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
  <body style="margin:0;background:#f4f4f5;color:#18181b;font-family:Inter,Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 12px"><tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
        <tr><td style="padding:22px 28px;border-bottom:1px solid #eeeeef"><strong style="font-size:20px;letter-spacing:0;color:#111113">Fiip</strong></td></tr>
        <tr><td style="padding:30px 28px;line-height:1.65;font-size:15px"><h1 style="font-size:24px;line-height:1.25;letter-spacing:0;margin:0 0 16px;color:#111113">${escapeHtml(title)}</h1>${body}</td></tr>
        <tr><td style="padding:18px 28px;background:#fafafa;border-top:1px solid #eeeeef;color:#71717a;font-size:12px;line-height:1.5">Fiip protège le contenu privé avec un chiffrement zero-knowledge. Ce message concerne uniquement votre compte et votre abonnement.<br>© ${new Date().getUTCFullYear()} Fiip</td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}

export function renderEmailTemplate(template: string, data: LicenseEmailData = {}) {
  const portal = safeUrl(data.portalUrl);
  const tier = escapeHtml(data.tier || 'Fiip');
  const duration = escapeHtml(data.duration || 'abonnement');
  const licenseKey = escapeHtml(data.licenseKey || 'en cours de génération');
  const deviceLimit = data.deviceLimit ? `${data.deviceLimit} appareil(s)` : 'appareils illimités';

  if (template === 'license_created') {
    return {
      subject: `Votre licence Fiip ${tier}`,
      html: baseHtml('Votre licence Fiip est prête', `Votre abonnement ${tier} est actif.`, `
        <p>Votre abonnement ${tier} est actif pour ${duration}.</p>
        <p style="background:#f4f4f5;border-radius:7px;padding:14px"><strong>Clé de licence</strong><br><code style="font-size:14px">${licenseKey}</code></p>
        <p><strong>Durée / renouvellement :</strong> ${formatDate(data.renewsAt || data.expiresAt)}</p>
        <p><strong>Appareils :</strong> ${deviceLimit}</p>
        <p style="margin:24px 0 0">${action('Gérer mon compte', portal)}</p>
      `),
      text: `Votre licence Fiip ${tier}: ${licenseKey}. Durée: ${duration}. Renouvellement/expiration: ${formatDate(data.renewsAt || data.expiresAt)}. Portail: ${portal}`,
    };
  }

  if (template === 'subscription_cancelled') {
    return {
      subject: 'Votre abonnement Fiip a été désactivé',
      html: baseHtml('Abonnement désactivé', 'Votre accès cloud Fiip a changé.', `<p>Votre licence ${tier} a été désactivée. Vos notes locales restent disponibles.</p><p>${action('Voir mes options', portal)}</p>`),
      text: `Votre licence ${tier} a été désactivée. Portail: ${portal}`,
    };
  }

  if (template === 'payment_failed') {
    return {
      subject: 'Paiement Fiip à vérifier',
      html: baseHtml('Paiement à vérifier', 'Une action est nécessaire pour conserver votre offre.', `<p>Le dernier paiement n’a pas abouti. Vérifiez votre moyen de paiement pour conserver votre accès cloud.</p><p>${action('Mettre à jour la facturation', portal)}</p>`),
      text: `Le dernier paiement Fiip n’a pas abouti. Portail: ${portal}`,
    };
  }

  if (template === 'family_invite') {
    const inviteUrl = safeUrl(data.inviteUrl, `${portal}family`);
    const inviter = data.inviterEmail ? ` par ${escapeHtml(data.inviterEmail)}` : '';
    return {
      subject: 'Invitation Family Pro Fiip',
      html: baseHtml('Invitation Family Pro', 'Un proche vous invite dans son espace Fiip.', `
        <p>Vous avez été invité${inviter} à rejoindre un abonnement Fiip Family Pro.</p>
        <p>${action('Accepter l’invitation', inviteUrl)}</p>
        <p>Connectez-vous avec cette adresse e-mail pour activer l’accès.</p>
      `),
      text: `Vous avez été invité${inviter} à rejoindre Fiip Family Pro. Accepter: ${inviteUrl}`,
    };
  }

  if (template === 'ai_budget_exhausted') {
    return {
      subject: 'Budget IA Fiip utilisé',
      html: baseHtml('Budget IA utilisé', 'Votre plafond mensuel protège votre abonnement des dépassements.', `<p>Votre budget IA mensuel ${tier} est utilisé. L’IA est suspendue jusqu’au prochain renouvellement, sans surcoût.</p><p>${action('Consulter mon utilisation', portal)}</p>`),
      text: `Votre budget IA Fiip est utilisé. Reset au prochain renouvellement.`,
    };
  }

  if (template === 'trial_started') {
    return {
      subject: 'Votre essai Pro Fiip commence maintenant',
      html: baseHtml('14 jours pour essayer Fiip Pro', 'Votre essai Pro est actif avec des quotas maîtrisés.', `
        <p>Votre essai se termine le <strong>${formatDate(data.expiresAt)}</strong>. Aucun moyen de paiement n’est requis et aucun prélèvement automatique ne sera effectué.</p>
        <div style="margin:20px 0;padding:16px;border:1px solid #e4e4e7;border-radius:7px;background:#fafafa">
          <strong>Inclus pendant l’essai</strong><br>50 notes cloud · 25 Mo de notes · 250 Mo de pièces jointes · partage public · extension navigateur · 20 scans OCR
        </div>
        <p>${action('Ouvrir mon compte', portal)}</p>
      `),
      text: `Votre essai Fiip Pro est actif jusqu’au ${formatDate(data.expiresAt)}. Quotas: 50 notes, 25 Mo de notes, 250 Mo de pièces jointes et 20 scans OCR. Compte: ${portal}`,
    };
  }

  return {
    subject: `Information Fiip ${tier}`,
    html: baseHtml('Information Fiip', 'Une mise à jour est disponible sur votre compte.', `<p>Une mise à jour est disponible sur votre compte Fiip.</p><p>${action('Ouvrir mon compte', portal)}</p>`),
    text: `Information Fiip. Portail: ${portal}`,
  };
}
