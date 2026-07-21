export const SELLAUTH_SHOP_URL = (import.meta.env.VITE_SELLAUTH_SHOP_URL || 'https://vinsstudio.mysellauth.com').replace(/\/$/, '');

export const BILLING_TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    monthly: '3,99€',
    yearly: '35,99€',
    monthlyProductId: import.meta.env.VITE_SELLAUTH_BASIC_MONTHLY_PRODUCT_ID || '',
    monthlyVariantId: import.meta.env.VITE_SELLAUTH_BASIC_MONTHLY_VARIANT_ID || '',
    yearlyProductId: import.meta.env.VITE_SELLAUTH_BASIC_YEARLY_PRODUCT_ID || '',
    yearlyVariantId: import.meta.env.VITE_SELLAUTH_BASIC_YEARLY_VARIANT_ID || '',
    productPath: import.meta.env.VITE_SELLAUTH_BASIC_PRODUCT_PATH || 'fiip-basic',
    description: 'Notes synchronisées sur 2 appareils, mobile lecture, OCR 5/mois.',
    badge: 'Pour commencer',
    accent: 'Starter',
    capabilities: {
      deviceLimit: 2,
      sharingEnabled: false,
      extensionEnabled: false,
      aiEnabled: false,
      ocrLimit: 5,
      familySlots: 1,
    },
    features: ['100 notes / 100 Mo', '2 Go de pièces jointes', '250 Mo par fichier', '2 appareils synchronisés', '5 scans OCR par mois', 'Clé de licence automatique'],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthly: '6,99€',
    yearly: '62,99€',
    monthlyProductId: import.meta.env.VITE_SELLAUTH_PRO_MONTHLY_PRODUCT_ID || '',
    monthlyVariantId: import.meta.env.VITE_SELLAUTH_PRO_MONTHLY_VARIANT_ID || '',
    yearlyProductId: import.meta.env.VITE_SELLAUTH_PRO_YEARLY_PRODUCT_ID || '',
    yearlyVariantId: import.meta.env.VITE_SELLAUTH_PRO_YEARLY_VARIANT_ID || '',
    productPath: import.meta.env.VITE_SELLAUTH_PRO_PRODUCT_PATH || 'fiip-pro',
    description: 'Partage public, extension navigateur, mobile complet, OCR illimité.',
    badge: 'Populaire',
    accent: 'Meilleur équilibre',
    capabilities: {
      deviceLimit: null,
      sharingEnabled: true,
      extensionEnabled: true,
      aiEnabled: false,
      ocrLimit: null,
      familySlots: 1,
    },
    features: ['1 000 notes / 1 Go', '25 Go de pièces jointes', '2 Go par fichier', 'Partage public de notes', 'Extension navigateur', 'OCR illimité'],
  },
  {
    id: 'ai',
    name: 'AI',
    monthly: '8,99€',
    yearly: '80,99€',
    monthlyProductId: import.meta.env.VITE_SELLAUTH_AI_MONTHLY_PRODUCT_ID || '',
    monthlyVariantId: import.meta.env.VITE_SELLAUTH_AI_MONTHLY_VARIANT_ID || '',
    yearlyProductId: import.meta.env.VITE_SELLAUTH_AI_YEARLY_PRODUCT_ID || '',
    yearlyVariantId: import.meta.env.VITE_SELLAUTH_AI_YEARLY_VARIANT_ID || '',
    productPath: import.meta.env.VITE_SELLAUTH_AI_PRODUCT_PATH || 'fiip-ai',
    description: 'Pro + assistant IA avec budget mensuel et mode automatique.',
    badge: 'IA incluse',
    accent: 'Productivité',
    capabilities: {
      deviceLimit: null,
      sharingEnabled: true,
      extensionEnabled: true,
      aiEnabled: true,
      ocrLimit: null,
      familySlots: 1,
    },
    features: ['Quotas notes et fichiers du plan Pro', 'Budget IA mensuel', 'Mode automatique intelligent', 'OCR illimité', 'Support prioritaire'],
  },
  {
    id: 'family_pro',
    name: 'Family Pro',
    monthly: '11,99€',
    yearly: '107,99€',
    monthlyProductId: import.meta.env.VITE_SELLAUTH_FAMILY_PRO_MONTHLY_PRODUCT_ID || '',
    monthlyVariantId: import.meta.env.VITE_SELLAUTH_FAMILY_PRO_MONTHLY_VARIANT_ID || '',
    yearlyProductId: import.meta.env.VITE_SELLAUTH_FAMILY_PRO_YEARLY_PRODUCT_ID || '',
    yearlyVariantId: import.meta.env.VITE_SELLAUTH_FAMILY_PRO_YEARLY_VARIANT_ID || '',
    productPath: import.meta.env.VITE_SELLAUTH_FAMILY_PRO_PRODUCT_PATH || 'fiip-family-pro',
    description: 'Jusqu’à 5 comptes, budget IA partagé et gestion famille.',
    badge: 'Famille',
    accent: 'Jusqu’à 5 comptes',
    capabilities: {
      deviceLimit: null,
      sharingEnabled: true,
      extensionEnabled: true,
      aiEnabled: true,
      ocrLimit: null,
      familySlots: 5,
    },
    features: ['Notes illimitées / 5 Go', '100 Go de pièces jointes', '5 Go par fichier', 'Comptes famille', 'Budget IA partagé'],
  },
];

export function getTierPolicy(tierId) {
  const tier = BILLING_TIERS.find((item) => item.id === tierId);
  if (!tier) {
    throw new Error(`Unknown Fiip tier: ${tierId}`);
  }
  return tier.capabilities;
}

export function canUseOcrScan(tierId, scansUsedThisPeriod) {
  const { ocrLimit } = getTierPolicy(tierId);
  if (ocrLimit === null) return true;
  return scansUsedThisPeriod < ocrLimit;
}

export function canUseBrowserExtension(tierId) {
  return getTierPolicy(tierId).extensionEnabled;
}

export function canUseAi(tierId) {
  return getTierPolicy(tierId).aiEnabled;
}

export function getCheckoutUrl(tier, interval, email) {
  const productId = interval === 'yearly' ? tier.yearlyProductId : tier.monthlyProductId;
  const variantId = interval === 'yearly' ? tier.yearlyVariantId : tier.monthlyVariantId;
  if (!SELLAUTH_SHOP_URL) return '';

  if (!productId || !variantId) {
    if (!tier.productPath) return '';
    const url = new URL(`${SELLAUTH_SHOP_URL}/product/${tier.productPath}`);
    url.searchParams.set('variant', interval === 'yearly' ? 'Annuel' : 'Mensuel');
    if (email) url.searchParams.set('email', email);
    return url.toString();
  }

  const url = new URL(`${SELLAUTH_SHOP_URL}/checkout-link`);
  url.searchParams.set('cart[0][productId]', productId);
  url.searchParams.set('cart[0][variantId]', variantId);
  url.searchParams.set('cart[0][quantity]', '1');
  url.searchParams.set('currency', 'EUR');
  if (email) url.searchParams.set('email', email);
  return url.toString();
}
