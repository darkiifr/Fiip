-- Grant proper usage to anon role for public links to work
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.notes TO anon;
GRANT SELECT ON public.profiles TO anon;
