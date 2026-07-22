-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE (Public Profile Info)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  nickname TEXT,
  accent_color TEXT DEFAULT '#5865F2',
  skills JSONB DEFAULT '[]'::jsonb,
  last_session_validated TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  content TEXT,
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment objects
  is_favorite BOOLEAN DEFAULT FALSE,
  tags JSONB DEFAULT '[]'::jsonb,
  badges JSONB DEFAULT '[]'::jsonb,
  deleted BOOLEAN DEFAULT FALSE,
  folder_id TEXT, -- Future proofing for folders
  public_slug TEXT UNIQUE, -- Url friendly slug for public sharing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- USER SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  config JSONB DEFAULT '{}'::jsonb, -- Stores all settings: theme, sound, etc.
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- USER DEVICES TABLE
CREATE TABLE IF NOT EXISTS public.user_devices (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Fiip device',
  platform TEXT DEFAULT 'unknown',
  user_agent TEXT DEFAULT '',
  ip_address TEXT,
  clerk_session_id TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- USER BADGES TABLE
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  badges JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- STORAGE BUCKETS
-- Note: Buckets are usually created via API/Dashboard, but we can try inserting if supported or just document it.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;


-- ROW LEVEL SECURITY (RLS)

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile with valid session" 
ON public.profiles FOR UPDATE 
USING (
  auth.uid() = id 
  AND auth.role() = 'authenticated'
  AND last_session_validated > now() - interval '30 days'
);

-- Notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notes OR public notes" 
ON public.notes FOR SELECT 
USING (auth.uid() = user_id OR public_slug IS NOT NULL);

CREATE POLICY "Users can insert their own notes" 
ON public.notes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
ON public.notes FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
ON public.notes FOR DELETE 
USING (auth.uid() = user_id);

-- Settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" 
ON public.user_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.user_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings FOR UPDATE 
USING (auth.uid() = user_id);

-- Devices
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own devices"
ON public.user_devices FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges" 
ON public.user_badges FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges" 
ON public.user_badges FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own badges" 
ON public.user_badges FOR UPDATE 
USING (auth.uid() = user_id);


-- STORAGE POLICIES
-- NOTE: Storage policies must be applied to storage.objects

CREATE POLICY "Give users access to own folder 1ok12a_0" ON storage.objects FOR SELECT TO public USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Give users access to own folder 1ok12a_1" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Give users access to own folder 1ok12a_2" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Give users access to own folder 1ok12a_3" ON storage.objects FOR DELETE TO public USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- AVATARS POLICIES
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid() = owner);

-- HELPER FUNCTION TO HANDLE NEW USER
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, bio, nickname, accent_color, skills, last_session_validated)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'username', 
    new.raw_user_meta_data->>'avatar_url',
    '',
    new.raw_user_meta_data->>'username',
    '#5865F2',
    '[]'::jsonb,
    now()
  );
  
  INSERT INTO public.user_settings (user_id, config)
  VALUES (new.id, '{}'::jsonb);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER FOR NEW USER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- TRIGGER TO REFRESH SESSION ON PROFILE UPDATE
CREATE OR REPLACE FUNCTION public.refresh_profile_session()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_session_validated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_profile_session_timestamp ON public.profiles;
CREATE TRIGGER refresh_profile_session_timestamp
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.refresh_profile_session();

-- FUNCTION TO GET EMAIL BY PSEUDO/NICKNAME
CREATE OR REPLACE FUNCTION public.get_email_by_pseudo(p_pseudo TEXT)
RETURNS TEXT AS $$
BEGIN
  RAISE EXCEPTION 'Pseudo login email lookup is disabled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.get_email_by_pseudo(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_email_by_pseudo(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.get_email_by_pseudo(TEXT) FROM authenticated;

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.note_collaborators (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('viewer', 'editor')) DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(note_id, user_id)
);

-- 2. Enable RLS
ALTER TABLE public.note_collaborators ENABLE ROW LEVEL SECURITY;

-- 3. Policies for note_collaborators
CREATE POLICY "Collaborators visible to note owner and collaborators"
ON public.note_collaborators FOR SELECT
USING (
  auth.role() = 'authenticated' AND (
    auth.uid() = user_id OR
    auth.uid() = (SELECT user_id FROM public.notes WHERE id = note_id)
  )
);

CREATE POLICY "Note owners can manage collaborators"
ON public.note_collaborators FOR ALL USING (
  auth.uid() = (SELECT user_id FROM public.notes WHERE id = note_id)
);

-- 4. New policies to ADD on the existing public.notes table

CREATE POLICY "Collaborators can view shared notes"
ON public.notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.note_collaborators
    WHERE note_id = public.notes.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Editor collaborators can update shared notes"
ON public.notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.note_collaborators
    WHERE note_id = public.notes.id AND user_id = auth.uid() AND role = 'editor'
  )
);

-- 5. Realtime Subscriptions
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS notes;
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS note_collaborators;
ALTER PUBLICATION supabase_realtime ADD TABLE note_collaborators;
