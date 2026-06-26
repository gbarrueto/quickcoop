-- Estas funciones son SECURITY DEFINER pero solo deben ejecutarse como
-- triggers; revocar EXECUTE de anon/authenticated evita que se llamen
-- directamente vía /rest/v1/rpc/* (la ejecución de triggers no requiere
-- el privilegio EXECUTE de quien dispara el evento).
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.resolve_friend_link() from anon, authenticated;
revoke execute on function public.resolve_external_account() from anon, authenticated;
