-- Enable RLS on user_badges table (Critique correction)
ALTER TABLE IF EXISTS public.user_badges ENABLE ROW LEVEL SECURITY;

-- Add policies if they don't exist
DO $$
BEGIN
    -- 1. Public Read Access (Everyone can see badges)
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_badges' 
        AND policyname = 'Public user badges are viewable by everyone'
    ) THEN
        CREATE POLICY "Public user badges are viewable by everyone" ON public.user_badges FOR SELECT USING (true);
    END IF;
    
    -- 2. Owner Insert Access
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_badges' 
        AND policyname = 'Users can insert their own badges'
    ) THEN
        CREATE POLICY "Users can insert their own badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- 3. Owner Update Access
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_badges' 
        AND policyname = 'Users can update their own badges'
    ) THEN
        CREATE POLICY "Users can update their own badges" ON public.user_badges FOR UPDATE USING (auth.uid() = user_id);
    END IF;

    -- 4. Owner Delete Access
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_badges' 
        AND policyname = 'Users can delete their own badges'
    ) THEN
        CREATE POLICY "Users can delete their own badges" ON public.user_badges FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
