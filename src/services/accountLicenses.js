import { supabase } from './supabase';

function formatFunctionError(error, fallback) {
  if (!error) {
    return fallback;
  }
  return error.message || error.error_description || error.error || fallback;
}

export async function listAccountLicenses() {
  const { data, error } = await supabase.functions.invoke('account-api', {
    body: { action: 'list_licenses' },
  });

  if (error) {
    throw new Error(formatFunctionError(error, 'Impossible de charger les licences.'));
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
    throw new Error(formatFunctionError(error, 'Impossible de sélectionner cette licence.'));
  }

  return data;
}

export async function getAccountSummary() {
  const { data, error } = await supabase.functions.invoke('account-api', {
    body: { action: 'summary' },
  });

  if (error) {
    throw new Error(formatFunctionError(error, 'Impossible de charger le compte.'));
  }

  return data || {};
}
