-- Run this in Supabase SQL editor.
-- Uses auth.users for authentication identities.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  student_id text not null unique,
  role text not null default 'student' check (role in ('student', 'admin')),
  referral_code text not null unique,
  referral_progress integer not null default 0,
  referral_cycles integer not null default 0,
  bonus_days integer not null default 0,
  trial_ends_at timestamptz not null,
  subscription_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  faculty text default '',
  department text default '',
  course_code text not null,
  course_name text default '',
  year integer not null,
  exam_type text not null,
  storage_path text not null,
  uploader_id uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid references public.profiles(id) on delete set null,
  title text not null,
  faculty text default '',
  department text default '',
  course_code text not null,
  course_name text default '',
  year integer not null,
  exam_type text not null,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10, 2) not null,
  method text not null,
  status text not null,
  checkout_request_id text,
  merchant_request_id text,
  mpesa_receipt_number text,
  phone_number text,
  raw_callback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id text,
  days integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists papers_course_code_year_idx on public.papers(course_code, year desc);
create index if not exists uploads_uploader_created_idx on public.uploads(uploader_id, created_at desc);
create index if not exists subscriptions_user_created_idx on public.subscriptions(user_id, created_at desc);
create index if not exists transactions_user_created_idx on public.transactions(user_id, created_at desc);
create index if not exists transactions_checkout_idx on public.transactions(checkout_request_id);
create index if not exists transactions_merchant_idx on public.transactions(merchant_request_id);

-- Backend uses service role key, so RLS can stay enabled.
alter table public.profiles enable row level security;
alter table public.papers enable row level security;
alter table public.uploads enable row level security;
alter table public.subscriptions enable row level security;
alter table public.transactions enable row level security;
alter table public.rewards enable row level security;
alter table public.referrals enable row level security;
