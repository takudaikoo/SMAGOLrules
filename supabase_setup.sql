-- 1. Create the 'agreements' table
create table public.agreements (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  signature_url text null,
  user_agent text null,
  constraint agreements_pkey primary key (id)
);

-- Enable RLS (Row Level Security) on the table (Optional but recommended)
alter table public.agreements enable row level security;

-- Allow anyone (anon) to insert into agreements
create policy "Allow public insert"
on public.agreements
for insert
to anon
with check (true);

-- 2. Create the 'signatures' storage bucket
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', true);

-- 3. Set up Storage Policies for 'signatures' bucket

-- Allow public access to view files (SELECT)
create policy "Give public access to signatures"
on storage.objects
for select
to public
using (bucket_id = 'signatures');

-- Allow public access to upload files (INSERT)
create policy "Allow public upload to signatures"
on storage.objects
for insert
to public
with check (bucket_id = 'signatures');
