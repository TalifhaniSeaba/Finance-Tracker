alter table public.transactions
  add column if not exists currency text not null default 'ZAR'
  check (char_length(currency) = 3);
