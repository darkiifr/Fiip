import { supabase } from './supabase';

export const dexterMemory = {
  async addMessage(sessionId, message) {
    if (!sessionId) {return null;}
    const { data, error } = await supabase
      .from('dexter_messages')
      .insert([
        {
          session_id: sessionId,
          role: message.role,
          content: message.content,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding message to Dexter memory:', error);
      return null;
    }
    return data;
  },

  async getRecentMessages(sessionId, limit = 50) {
    if (!sessionId) {return [];}
    const { data, error } = await supabase
      .from('dexter_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error fetching Dexter messages:', error);
      return [];
    }
    return data;
  },

  async updateContext(sessionId, contextKeys) {
    if (!sessionId) {return null;}
    const { data, error } = await supabase
      .from('dexter_sessions')
      .update({ context: contextKeys })
      .eq('id', sessionId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating Dexter context:', error);
      return null;
    }
    return data;
  },

  async getOrCreateSession(userId, noteId = null) {
      let query = supabase
          .from('dexter_sessions')
          .select('*')
          .eq('user_id', userId);
      
      if (noteId) {
          query = query.eq('current_note_id', noteId);
      } else {
          query = query.is('current_note_id', null);
      }
      
      const { data } = await query.order('created_at', { ascending: false }).limit(1).single();

      if (data) {
          return data;
      }

      // Create new session
      const { data: newSession, error: createError } = await supabase
        .from('dexter_sessions')
        .insert([{ user_id: userId, current_note_id: noteId, context: {} }])
        .select()
        .single();
        
      if (createError) {throw createError;}
      return newSession;
  }
};
