const DAY_MS = 24 * 60 * 60 * 1000;

export function getTrialDaysRemaining(trial, now = Date.now()) {
  if (!trial?.active || !trial?.ends_at) return null;
  const endsAt = new Date(trial.ends_at).getTime();
  if (!Number.isFinite(endsAt)) return null;
  return Math.max(0, Math.ceil((endsAt - now) / DAY_MS));
}

export function getQuotaPrompt(notePercent, attachmentPercent) {
  const highestUsage = Math.max(Number(notePercent) || 0, Number(attachmentPercent) || 0);
  if (highestUsage >= 100) {
    return {
      tone: 'critical',
      title: 'Votre espace cloud est plein',
      detail: 'Fiip conserve les nouveaux contenus localement. Libérez de l’espace ou augmentez votre quota pour reprendre la synchronisation.',
      action: 'Rétablir la synchronisation',
    };
  }
  if (highestUsage >= 80) {
    return {
      tone: 'warning',
      title: 'Votre espace cloud approche de sa limite',
      detail: `Le quota le plus utilisé est rempli à ${Math.round(highestUsage)} %. Anticipez avant que la synchronisation passe en mode local uniquement.`,
      action: 'Comparer les quotas',
    };
  }
  return null;
}

export function getAnnualSavings(tier) {
  if (!tier || tier.id === 'free') return null;
  const monthly = Number.parseFloat(String(tier.monthly).replace(',', '.'));
  const yearly = Number.parseFloat(String(tier.yearly).replace(',', '.'));
  if (!Number.isFinite(monthly) || !Number.isFinite(yearly)) return null;
  const savings = (monthly * 12) - yearly;
  return savings > 0 ? savings.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;
}
