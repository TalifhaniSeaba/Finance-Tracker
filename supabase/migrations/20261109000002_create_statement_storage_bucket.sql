insert into storage.buckets (id, name, public)
values ('statements', 'statements', false)
on conflict (id) do nothing;
