-- ============================================================
-- Tidyline Ghana — complete, consolidated schema
-- Safe to run on a fresh project OR your current one — every
-- statement either creates something new or safely skips it if
-- it already exists. Replaces schema.sql + schema-admin.sql.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Bookings — column names match main.jsx's Book()/Check() exactly
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_ref text unique not null,
  name text not null,
  phone text not null,
  email text,
  area text not null,
  address text not null,
  service_type text not null,
  service_fee numeric(12,2) not null default 0,
  transport_fee numeric(12,2) not null default 0,
  total_fee numeric(12,2) not null default 0,
  date date not null,
  start_time time not null,
  status text not null default 'Pending',
  payment_status text not null default 'Unpaid',
  created_at timestamptz not null default now()
);

alter table public.bookings add column if not exists staff_id uuid;
alter table public.bookings add column if not exists laundry_addon boolean not null default false;
alter table public.bookings add column if not exists laundry_fee numeric(12,2) not null default 0;
alter table public.bookings add column if not exists started_at timestamptz;
alter table public.bookings add column if not exists completed_at timestamptz;
alter table public.bookings add column if not exists job_photo_url text;

-- ---------------------------------------------------------------------------
-- Job photos storage bucket — staff upload a photo of the area when they
-- start a job. Public read (so admin/client can view via link), only
-- authenticated (staff/admin) can upload.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

drop policy if exists "job_photos_public_read" on storage.objects;
create policy "job_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'job-photos');

drop policy if exists "job_photos_authenticated_insert" on storage.objects;
create policy "job_photos_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'job-photos');

-- If laundry_addon already existed as text (from an earlier version), the
-- line above silently skipped it — force it to a real boolean now.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings'
      and column_name = 'laundry_addon' and data_type <> 'boolean'
  ) then
    alter table public.bookings
      alter column laundry_addon
      type boolean
      using (case when lower(laundry_addon::text) in ('true','t','1','yes') then true else false end);
    alter table public.bookings alter column laundry_addon set default false;
    alter table public.bookings alter column laundry_addon set not null;
  end if;
end $$;

alter table public.bookings enable row level security;

-- Never allow a new or edited booking to use a date before today.
-- Ghana uses UTC+0, so CURRENT_DATE matches the business date.
create or replace function public.prevent_past_booking_date()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.date < current_date then
    raise exception 'Booking date cannot be in the past';
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_prevent_past_date on public.bookings;
create trigger bookings_prevent_past_date
before insert or update of date on public.bookings
for each row execute function public.prevent_past_booking_date();

drop policy if exists "public can create bookings" on public.bookings;
create policy "public can create bookings"
  on public.bookings for insert
  to anon, authenticated
  with check (true);

-- Admins (signed in) get full read/write. The public never gets direct
-- SELECT — booking lookup goes through check_booking() below instead.
drop policy if exists "bookings_admin_all" on public.bookings;
create policy "bookings_admin_all"
  on public.bookings for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- check_booking() — safe public lookup by reference + email. Includes
-- laundry add-on fields so Check() can display them. NOTE: Postgres will
-- not let CREATE OR REPLACE change a function's return columns, so the old
-- version must be dropped first — that's what broke this before.
-- ---------------------------------------------------------------------------
drop function if exists public.check_booking(text, text);

create or replace function public.check_booking(p_ref text, p_email text)
returns table (
  booking_ref text, name text, phone text, email text, area text, address text,
  service_type text, service_fee numeric, laundry_addon boolean, laundry_fee numeric,
  transport_fee numeric, total_fee numeric,
  date date, start_time time, status text, payment_status text
)
language sql
security definer
set search_path = public
as $$
  select b.booking_ref, b.name, b.phone, b.email, b.area, b.address,
         b.service_type, b.service_fee, b.laundry_addon, b.laundry_fee,
         b.transport_fee, b.total_fee,
         b.date, b.start_time, b.status, b.payment_status
  from public.bookings b
  where lower(trim(b.booking_ref)) = lower(trim(p_ref))
    and lower(trim(coalesce(b.email,''))) = lower(trim(coalesce(p_email,'')))
  limit 1;
$$;

grant execute on function public.check_booking(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Settings — matches Admin.jsx's SettingsTab fields exactly
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  id integer primary key default 1,
  company_name text default 'Tidyline Ghana',
  currency text default 'GHS',
  whatsapp_number text default '233240639070',
  price_regular numeric(12,2) default 350,
  price_deep numeric(12,2) default 550,
  price_moveinout numeric(12,2) default 650,
  price_office numeric(12,2) default 500,
  price_post_construction numeric(12,2) default 800
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

alter table public.settings enable row level security;

drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read"
  on public.settings for select
  to anon, authenticated
  using (true);

drop policy if exists "settings_admin_write" on public.settings;
create policy "settings_admin_write"
  on public.settings for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Staff — matches Admin.jsx's StaffTab fields exactly
-- ---------------------------------------------------------------------------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.staff enable row level security;

drop policy if exists "staff_admin_all" on public.staff;
create policy "staff_admin_all"
  on public.staff for all
  to authenticated
  using (true)
  with check (true);

-- Link bookings.staff_id -> staff.id, only if not already linked
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'bookings' and constraint_name = 'bookings_staff_id_fkey'
  ) then
    alter table public.bookings
      add constraint bookings_staff_id_fkey
      foreign key (staff_id) references public.staff(id) on delete set null;
  end if;
end $$;
-- ---------------------------------------------------------------------------
-- Staff authentication + customer ratings
-- ---------------------------------------------------------------------------
alter table public.staff add column if not exists email text;
alter table public.staff add column if not exists auth_user_id uuid unique;
alter table public.staff add column if not exists basic_salary numeric(12,2) not null default 2000;
alter table public.staff add column if not exists monthly_allowance numeric(12,2) not null default 0;
alter table public.staff add column if not exists monthly_bonus numeric(12,2) not null default 0;

alter table public.bookings add column if not exists rating_token text;
alter table public.bookings add column if not exists staff_rating integer;
alter table public.bookings add column if not exists staff_rating_comment text;
alter table public.bookings add column if not exists rated_at timestamptz;

update public.bookings set rating_token = encode(gen_random_bytes(16),'hex') where rating_token is null;
alter table public.bookings alter column rating_token set default encode(gen_random_bytes(16),'hex');
create unique index if not exists bookings_rating_token_uidx on public.bookings(rating_token);

-- A staff session is identified by the auth user linked to staff.auth_user_id.
-- Authenticated users who are not linked to a staff row remain administrators,
-- preserving the existing admin login behaviour.
create or replace function public.current_user_is_staff()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.staff where auth_user_id=auth.uid() and active=true); $$;

grant execute on function public.current_user_is_staff() to authenticated;

-- Replace the broad authenticated policies so staff cannot see other staff or
-- other customers' bookings.
drop policy if exists "bookings_admin_all" on public.bookings;
drop policy if exists "bookings_staff_select" on public.bookings;
drop policy if exists "bookings_staff_update" on public.bookings;
create policy "bookings_admin_all" on public.bookings for all to authenticated
using (not public.current_user_is_staff()) with check (not public.current_user_is_staff());
create policy "bookings_staff_select" on public.bookings for select to authenticated
using (staff_id in (select id from public.staff where auth_user_id=auth.uid() and active=true));
create policy "bookings_staff_update" on public.bookings for update to authenticated
using (staff_id in (select id from public.staff where auth_user_id=auth.uid() and active=true))
with check (staff_id in (select id from public.staff where auth_user_id=auth.uid() and active=true));

drop policy if exists "staff_admin_all" on public.staff;
drop policy if exists "staff_self_select" on public.staff;
create policy "staff_admin_all" on public.staff for all to authenticated
using (not public.current_user_is_staff()) with check (not public.current_user_is_staff());
create policy "staff_self_select" on public.staff for select to authenticated
using (auth_user_id=auth.uid());

-- Public, tokenized lookup for the rating page. No customer contact details
-- are returned.
create or replace function public.get_booking_for_rating(p_ref text, p_token text)
returns table(booking_ref text, name text, service_type text, date date, staff_name text, staff_rating integer, staff_rating_comment text)
language sql security definer set search_path=public
as $$
  select b.booking_ref,b.name,b.service_type,b.date,s.name,b.staff_rating,b.staff_rating_comment
  from public.bookings b left join public.staff s on s.id=b.staff_id
  where b.booking_ref=p_ref and b.rating_token=p_token and b.status='Completed'
  limit 1;
$$;
grant execute on function public.get_booking_for_rating(text,text) to anon,authenticated;

create or replace function public.submit_booking_rating(p_ref text, p_token text, p_rating integer, p_comment text default null)
returns boolean
language plpgsql security definer set search_path=public
as $$
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  update public.bookings set staff_rating=p_rating, staff_rating_comment=nullif(left(coalesce(p_comment,''),1000),''), rated_at=now()
  where booking_ref=p_ref and rating_token=p_token and status='Completed';
  return found;
end;
$$;
grant execute on function public.submit_booking_rating(text,text,integer,text) to anon,authenticated;

-- ---------------------------------------------------------------------------
-- Expenses — general business costs (supplies, fuel, equipment, rent, etc.),
-- optionally linked to a specific booking. Admin-only: staff never see this.
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  category text not null default 'Other',
  description text,
  amount numeric(12,2) not null default 0,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

drop policy if exists "expenses_admin_all" on public.expenses;
create policy "expenses_admin_all"
  on public.expenses for all
  to authenticated
  using (not public.current_user_is_staff())
  with check (not public.current_user_is_staff());
