create extension if not exists "pgcrypto";

create table if not exists public.usuarios_setor (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  usuario text not null unique,
  senha_hash text not null,
  perfil text not null default 'colaborador' check (perfil in ('admin', 'colaborador')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.usuarios_setor enable row level security;

create table if not exists public.atividades_colaboradores (
  id text primary key,
  colaborador text not null,
  obra text,
  prioridade text not null,
  projeto text not null,
  trabalhos text not null,
  etapa text not null,
  data_inicio date,
  hora_inicio time,
  data_termino date,
  hora_termino time,
  data_prevista date,
  status text not null default 'Em progresso',
  observacoes text,
  criado_em timestamptz not null default now(),
  usuario_id uuid references public.usuarios_setor(id),
  criado_por_nome text
);

alter table public.atividades_colaboradores
  add column if not exists usuario_id uuid references public.usuarios_setor(id),
  add column if not exists criado_por_nome text;

create index if not exists idx_atividades_usuario_id
on public.atividades_colaboradores (usuario_id);

create table if not exists public.planner_checklists (
  id uuid primary key default gen_random_uuid(),
  obra text not null,
  projeto text not null,
  tipo text not null,
  codigo_projeto text,
  titulo text,
  responsavel text,
  prioridade text check (prioridade in ('P0', 'P1', 'P2', 'P3')),
  data_prevista date,
  observacoes text,
  tarefas jsonb not null default '[]'::jsonb,
  criado_por uuid references public.usuarios_setor(id),
  criado_por_nome text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.planner_checklists
  add column if not exists titulo text,
  add column if not exists tarefas jsonb not null default '[]'::jsonb,
  add column if not exists criado_por uuid references public.usuarios_setor(id),
  add column if not exists criado_por_nome text,
  add column if not exists atualizado_em timestamptz not null default now();

create index if not exists idx_planner_checklists_criado_em
on public.planner_checklists (criado_em desc);
