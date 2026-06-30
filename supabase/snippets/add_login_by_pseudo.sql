CREATE OR REPLACE FUNCTION get_email_by_pseudo(p_pseudo text)
RETURNS text
SECURITY DEFINER
AS $BODY$
DECLARE
    found_email text;
BEGIN
    SELECT u.email INTO found_email
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE lower(p.nickname) = lower(p_pseudo) OR lower(p.username) = lower(p_pseudo)
    LIMIT 1;
    
    RETURN found_email;
END;
$BODY$ LANGUAGE plpgsql;
