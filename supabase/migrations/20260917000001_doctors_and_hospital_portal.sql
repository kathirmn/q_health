-- Migration: Add Doctors Table and Multi-Doctor Cabin Support for Hospital Portal
-- Enables multi-doctor queue tracking, cabin management, and schema alignment

-- 1. Create doctors table
create table if not exists public.doctors (
    id text primary key,
    clinic_id uuid references public.clinics(id) on delete cascade,
    name text not null,
    specialty text not null,
    cabin_number text not null default 'Cabin 1',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Add doctor-related columns to appointments if they do not exist
alter table public.appointments add column if not exists doctor_id text;
alter table public.appointments add column if not exists doctor_name text;

-- 3. Seed doctors for the existing clinics
insert into public.doctors (id, clinic_id, name, specialty, cabin_number)
values
    ('doc-omr-1', '167bd249-cd63-4f32-b5bc-bd485bc96fb9', 'Dr. Kavitha', 'General Medicine', 'Cabin 1'),
    ('doc-omr-2', '167bd249-cd63-4f32-b5bc-bd485bc96fb9', 'Dr. Arul Kumar', 'Cardiology', 'Cabin 2'),
    ('doc-kovai-1', 'ccf1cbac-d6ae-47d3-8b57-43d7335079fb', 'Dr. Priya Sundaram', 'Pediatrics', 'Cabin 1'),
    ('doc-kovai-2', 'ccf1cbac-d6ae-47d3-8b57-43d7335079fb', 'Dr. Balaji', 'Orthopedics', 'Cabin 2'),
    ('doc-karapakkam-1', '881fb2bb-6a67-475f-b511-7afb151bb4a1', 'Dr. Rajesh V', 'Dermatology', 'Cabin 1'),
    ('doc-karapakkam-2', '881fb2bb-6a67-475f-b511-7afb151bb4a1', 'Dr. Meenakshi S', 'General Medicine', 'Cabin 2')
on conflict (id) do update set
    name = excluded.name,
    specialty = excluded.specialty,
    cabin_number = excluded.cabin_number;

-- 4. Enable Row Level Security (RLS) on doctors
alter table public.doctors enable row level security;

create policy "Allow public read on doctors"
    on public.doctors for select
    to anon, authenticated
    using (true);

create policy "Allow public insert on doctors"
    on public.doctors for insert
    to anon, authenticated
    with check (true);

create policy "Allow public update on doctors"
    on public.doctors for update
    to anon, authenticated
    using (true);

-- 5. Realtime publication
alter table public.doctors replica identity full;

do $$
begin
    if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'doctors'
    ) then
        alter publication supabase_realtime add table public.doctors;
    end if;
end $$;
