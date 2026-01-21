-- supabase.sql --

-- 1. Create table
create table public.clips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  tags text[] default '{}',
  storage_path text not null,
  public_url text,
  created_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.clips enable row level security;

-- 3. Info Policies
-- Allow anyone (even anonymous) to view clips
create policy "Public clips are viewable by everyone"
  on public.clips for select
  using ( true );

-- Allow authenticated users to insert their own clips
create policy "Users can upload clips"
  on public.clips for insert
  with check ( auth.uid() = owner_id );

-- Allow users to delete their own clips
create policy "Users can delete own clips"
  on public.clips for delete
  using ( auth.uid() = owner_id );

-- 4. Storage Setup
-- (You must create the 'clips' bucket in the Storage dashboard manually, or use this if extensions allow)
insert into storage.buckets (id, name, public) values ('clips', 'clips', true);

-- Storage Policies
-- Public read access
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'clips' );

-- Authenticated upload access
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'clips' and auth.role() = 'authenticated' );

-- Owner delete access
create policy "Users can delete own files"
  on storage.objects for delete
  using ( bucket_id = 'clips' and auth.uid()::text = (storage.foldername(name))[1] );
