create table if not exists public.contact_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 20 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_enquiries enable row level security;

revoke all on public.contact_enquiries from anon, authenticated;
