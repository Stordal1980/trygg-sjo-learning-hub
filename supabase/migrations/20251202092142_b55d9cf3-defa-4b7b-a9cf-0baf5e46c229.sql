-- Funksjon som automatisk gir første bruker admin-rolle
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Legg til admin-rolle for første bruker, deretter user-rolle for alle
  if (select count(*) from public.user_roles) = 0 then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role)
    values (new.id, 'user');
  end if;
  
  return new;
end;
$$;

-- Trigger som kjører når ny bruker opprettes
create trigger on_auth_user_created_role
  after insert on public.profiles
  for each row execute function public.handle_new_user_role();