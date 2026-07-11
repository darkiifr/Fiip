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

function baseHtml(title: string, body: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.5;color:#18181b">
      <h1 style="font-size:22px;margin:0 0 16px">${title}</h1>
      ${body}
      <p style="margin-top:24px;color:#71717a;font-size:13px">Fiip - Portail compte et licences</p>
    </div>
  `;
}

export function renderEmailTemplate(template: string, data: LicenseEmailData = {}) {
  const portal = data.portalUrl || 'https://portail.fiip.fr/';
  const tier = data.tier || 'Fiip';
  const duration = data.duration || 'abonnement';
  const licenseKey = data.licenseKey || 'en cours de génération';
  const deviceLimit = data.deviceLimit ? `${data.deviceLimit} appareil(s)` : 'appareils illimités';

  if (template === 'license_created') {
    return {
      subject: `Votre licence Fiip ${tier}`,
      html: baseHtml('Votre licence Fiip est prête', `
        <p>Votre abonnement ${tier} est actif pour ${duration}.</p>
        <p><strong>Clé de licence :</strong> <code>${licenseKey}</code></p>
        <p><strong>Durée / renouvellement :</strong> ${formatDate(data.renewsAt || data.expiresAt)}</p>
        <p><strong>Appareils :</strong> ${deviceLimit}</p>
        <p><a href="${portal}">Gérer mon compte Fiip</a></p>
      `),
      text: `Votre licence Fiip ${tier}: ${licenseKey}. Durée: ${duration}. Renouvellement/expiration: ${formatDate(data.renewsAt || data.expiresAt)}. Portail: ${portal}`,
    };
  }

  if (template === 'subscription_cancelled') {
    return {
      subject: 'Votre abonnement Fiip a été désactivé',
      html: baseHtml('Abonnement désactivé', `<p>Votre licence ${tier} a été désactivée. Vous pouvez réactiver l’accès depuis le portail.</p><p><a href="${portal}">Ouvrir le portail compte</a></p>`),
      text: `Votre licence ${tier} a été désactivée. Portail: ${portal}`,
    };
  }

  if (template === 'payment_failed') {
    return {
      subject: 'Paiement Fiip à vérifier',
      html: baseHtml('Paiement à vérifier', `<p>Le dernier paiement n’a pas abouti. Vérifiez votre moyen de paiement pour conserver votre accès.</p><p><a href="${portal}">Mettre à jour la facturation</a></p>`),
      text: `Le dernier paiement Fiip n’a pas abouti. Portail: ${portal}`,
    };
  }

  if (template === 'family_invite') {
    const inviteUrl = data.inviteUrl || `${portal}/family`;
    const inviter = data.inviterEmail ? ` par ${data.inviterEmail}` : '';
    return {
      subject: 'Invitation Family Pro Fiip',
      html: baseHtml('Invitation Family Pro', `
        <p>Vous avez été invité${inviter} à rejoindre un abonnement Fiip Family Pro.</p>
        <p><a href="${inviteUrl}">Accepter l’invitation</a></p>
        <p>Connectez-vous avec cette adresse e-mail pour activer l’accès.</p>
      `),
      text: `Vous avez été invité${inviter} à rejoindre Fiip Family Pro. Accepter: ${inviteUrl}`,
    };
  }

  if (template === 'ai_budget_exhausted') {
    return {
      subject: 'Budget IA Fiip utilisé',
      html: baseHtml('Budget IA utilisé', `<p>Votre budget IA mensuel ${tier} est utilisé. Il sera réinitialisé au prochain renouvellement.</p>`),
      text: `Votre budget IA Fiip est utilisé. Reset au prochain renouvellement.`,
    };
  }

  return {
    subject: `Information Fiip ${tier}`,
    html: baseHtml('Information Fiip', `<p>Une mise à jour est disponible sur votre compte Fiip.</p><p><a href="${portal}">Ouvrir le portail compte</a></p>`),
    text: `Information Fiip. Portail: ${portal}`,
  };
}
