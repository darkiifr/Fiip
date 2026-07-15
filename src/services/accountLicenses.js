import { supabase } from './supabase';

export function formatAccountFunctionError(error, fallback) {
  if (!error) {
    return fallback;
  }
  const message = String(error.message || error.error_description || error.error || '').trim();
  if (/edge function returned|non-2xx|failed to fetch|functionsfetcherror|supabase/i.test(message)) {
    return fallback;
  }
  return message || fallback;
}

export async function listAccountLicenses() {
  const { data, error } = await supabase.functions.invoke('account-api', {
    body: { action: 'list_licenses' },
  });

  if (error) {
    throw new Error(formatAccountFunctionError(error, 'Impossible de charger les licences.'));
  }

  return {
    licenses: Array.isArray(data?.licenses) ? data.licenses : [],
    activeLicenseId: data?.active_license_id || null,
  };
}

export async function selectAccountLicense(licenseId) {
  const { data, error } = await supabase.functions.invoke('account-api', {
    body: { action: 'select_license', license_id: licenseId },
  });

  if (error) {
    throw new Error(formatAccountFunctionError(error, 'Impossible de sélectionner cette licence.'));
  }

  return data;
}

export async function getAccountSummary() {
  const { data, error } = await supabase.functions.invoke('account-api', {
    body: { action: 'summary' },
  });

  if (error) {
    throw new Error(formatAccountFunctionError(error, 'Impossible de charger le compte.'));
  }

  return data || {};
}
