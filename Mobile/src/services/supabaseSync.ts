import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import DeviceInfo from 'react-native-device-info';

import { decryptNoteFromCloud, encryptNoteForCloud } from './cloudEncryption';
import { uploadFile } from './storageR2';
import { authService, dataService, supabase } from './supabase';

async function getPublicIpAddress(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (!response.ok) return null;
    const payload = await response.json();
    return payload?.ip || null;
  } catch {
    return null;
  }
}

// 1. Mise à jour de la session de plateforme de l'utilisateur (Mobile / Desktop tracker)
export const updateUserClientVersion = async (versionStr: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Track if they recently opened Mobile
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      last_active_platform: 'mobile',
      mobile_version: versionStr,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) console.error('Failed to update client tracking:', error);

  try {
    const uniqueId = await DeviceInfo.getUniqueId();
    await supabase
      .from('user_devices')
      .upsert({
        id: `mobile-${uniqueId}`,
        user_id: user.id,
        name: `Fiip Mobile - ${Platform.OS}`,
        platform: Platform.OS,
        user_agent: `FiipMobile/${versionStr}`,
        ip_address: await getPublicIpAddress(),
        last_seen_at: new Date().toISOString(),
        revoked_at: null,
      }, { onConflict: 'id' });
  } catch (deviceError) {
    console.error('Failed to update device tracking:', deviceError);
  }
};

// 2. Synchronisation Cloud des Notes
export const syncNotesWithCloud = async (localNotes: any[]) => {
  const user = await authService.getUser();
  if (!user) throw new Error("Non authentifié");

  const cloudPayloads = await Promise.all(
    localNotes.filter((note) => !note.zeroKnowledgeLocked)
      .map((note) => encryptNoteForCloud(note, { userId: user.id })),
  );
  if (cloudPayloads.length) {
    const { error: uploadError } = await supabase
      .from('notes')
      .upsert(cloudPayloads, { onConflict: 'id' });
    if (uploadError) throw uploadError;
  }

  // Sync descendant: récupérer de Supabase
  const { data: cloudNotes, error: fetchError } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .is('deleted_at', null);

  if (fetchError) throw fetchError;

  // Stratégie de merging basique via updatedAt / lastModified
  // Le merge sera retourné pour mise à jour locale
  return Promise.all((cloudNotes || []).map(decryptNoteFromCloud));
};

// 2.5 Récupération spécifique des favoris et partagés
export const fetchFavoriteAndSharedNotes = async () => {
  const user = await authService.getUser();
  if (!user) return [];

  // Récupérer les notes favorites ou celles ayant des collaborateurs
  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      collaborators (
        id, email, role
      )
    `)
    .or(`is_favorite.eq.true,user_id.neq.${user.id}`) // Exemples de filtres (soit favori, soit partagé avec moi si le RLS le permet)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Erreur fetch favorites/shared:", error);
    return [];
  }

  // Filtrer localement au besoin pour extraire ce qui est pertinent
  return Promise.all((data || []).map(decryptNoteFromCloud));
};

// 3. Modifier Statut Verrouillé, Favori et Badges
export const updateNoteMeta = async (noteId: string, meta: { is_locked?: boolean, is_favorite?: boolean, badges?: string[] }) => {
  if (meta.badges) {
    const { data: row, error: readError } = await supabase.from('notes').select('*').eq('id', noteId).single();
    if (readError) throw readError;
    const note = await decryptNoteFromCloud(row);
    const user = await authService.getUser();
    if (!user) throw new Error('Non authentifié');
    const payload = await encryptNoteForCloud({ ...note, ...meta }, { userId: user.id });
    const { error } = await supabase.from('notes').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('notes')
    .update({ 
      is_locked: meta.is_locked,
      is_favorite: meta.is_favorite,
      updated_at: new Date().toISOString()
    })
    .eq('id', noteId);

  if (error) throw error;
};

// 4. Inviter Collaborateur (Sharing)
export const inviteCollaborator = async (noteId: string, collaboratorEmail: string) => {
   // Assuming a "collaborators" pivot table
   // Need to find user ID by email via backend RCP or similar if public access allowed
   console.log("Inviting", collaboratorEmail, "to note", noteId);
   // Mock implementation pour le moment.
   return { status: 'success' };
};

// 5. Upload File (Attachment, Memo, Drawing) to R2
export const uploadNoteAttachment = async (noteId: string, fileUri: string, fileName: string, contentType: string) => {
  try {
    const stat = await ReactNativeBlobUtil.fs.stat(fileUri.replace(/^file:\/\//, ''));
    const file = await uploadFile({
      uri: fileUri,
      name: fileName,
      type: contentType,
      size: Number(stat.size),
    }, noteId);
    return 'id' in file ? file.id : `queued:${file.queueId}`;
  } catch (error) {
    console.error('Upload Error:', error);
    throw error;
  }
};


export const publishNote = async (noteId: string) => {
  return dataService.publishNote(noteId);
};

export const unpublishNote = async (noteId: string) => {
  return dataService.unpublishNote(noteId);
};
