import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

// 2. Synchronisation Cloud des Notes
export const syncNotesWithCloud = async (localNotes: any[]) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Sync descendant: récupérer de Supabase
  const { data: cloudNotes, error: fetchError } = await supabase
    .from('notes')
    .select('*, collaborators (*)')
    .eq('user_id', user.id);

  if (fetchError) throw fetchError;

  // Stratégie de merging basique via updatedAt / lastModified
  // Le merge sera retourné pour mise à jour locale
  return cloudNotes;
};

// 2.5 Récupération spécifique des favoris et partagés
export const fetchFavoriteAndSharedNotes = async () => {
  const { data: { user } } = await supabase.auth.getUser();
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
  return data || [];
};

// 3. Modifier Statut Verrouillé, Favori et Badges
export const updateNoteMeta = async (noteId: string, meta: { is_locked?: boolean, is_favorite?: boolean, badges?: string[] }) => {
  const { error } = await supabase
    .from('notes')
    .update({ 
      ...meta,
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

// 5. Upload File (Attachment, Memo, Drawing) to Supabase Storage
export const uploadNoteAttachment = async (noteId: string, fileUri: string, fileName: string, contentType: string) => {
  // Try mapping uri to blob / FormData for native upload
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: /* Platform.OS === 'ios' ? fileUri.replace('file://', '') : */ fileUri,
      name: fileName,
      type: contentType,
    } as any);

    const { data, error } = await supabase.storage
      .from('note_attachments')
      .upload(`public/${noteId}/${fileName}`, formData, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) throw error;
    // Logique à chainer pour rajouter cet attachement dans la DB table "note_attachments_links" ou metadata array()
    return data.path;
  } catch (error) {
    console.error('Upload Error:', error);
    throw error;
  }
};


export const publishNote = async (noteId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const slug = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

  const { data, error } = await supabase
    .from('notes')
    .update({ public_slug: slug, shared: true, is_public: true, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('user_id', user.id)
    .select()
    .single();

  return { data, error };
};

export const unpublishNote = async (noteId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('notes')
    .update({ public_slug: null, shared: false, is_public: false, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('user_id', user.id)
    .select()
    .single();

  return { data, error };
};
