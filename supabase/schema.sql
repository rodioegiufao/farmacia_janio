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
  criado_em timestamptz not null default now()
);