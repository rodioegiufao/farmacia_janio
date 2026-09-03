# Arquitetura do Visualizador 3D e Atividades

## Visualizador 3D

`3D/app.js` é o bootstrap leve. Ele consulta a sessão existente em `/api/auth` por
meio de `viewer/core/auth-session.js`; somente uma sessão válida importa
`viewer-authenticated.js`. Sem sessão, páginas de projeto que possuem visualização
pública importam `viewer-public.js`. A seleção em `3D/index.html` é protegida e
redireciona visitantes ao login. Não existe senha ou token do viewer no navegador.

`viewer-core.js` mantém a renderização pública e o carregamento XKT. As definições
de projetos e transformações de múltiplos modelos ficam em `project-config.js`.
As permissões por perfil ficam centralizadas em `core/viewer-permissions.js`; APIs
sensíveis continuam validando a sessão no servidor.

Medições, anotações, Excel e clash ficam em `viewer/features/` e são importados
sob demanda pelo coordenador autenticado. A implementação de anotações tem uma
única fonte em `features/annotations.js`. Para adicionar uma ferramenta, crie um
módulo com uma função de criação/ativação e cleanup, mantenha uma única Promise de
`import()` no coordenador e só a resolva no primeiro uso. Não importe outra cópia
do xeokit nem instancie plugins a cada abertura do painel.

## Atividades

`atividades/script.js` continua sendo o bootstrap e coordenador da tela vanilla.
Os módulos de domínio existentes cobrem classificações/fases, continuação,
agrupamento, Planner/Gantt, dashboard e preparação de relatórios. As chamadas HTTP
comuns e o tratamento de respostas agora ficam em `atividades-api.js`; cálculos de
intervalo e duração ficam em `atividade-tempo.js`.

O formulário, o rateio e a sincronização do Planner permanecem coordenados pelo
bootstrap para preservar a ordem transacional atual. `resetarFormularioAtividade`
é a fonte de verdade do reset após salvar/cancelar: limpa o formulário, rateios e
classificações, reavalia fase/item e restaura os controles. Relatórios semanais e
mensais reutilizam os módulos `*-relatorio.js` já existentes.

Uma nova funcionalidade deve preferencialmente entrar em um módulo UMD testável
sem DOM; o bootstrap recebe apenas a integração com estado e interface. Chamadas
novas devem usar `ATIVIDADES_API`, e regras de duração devem usar
`ATIVIDADE_TEMPO`, evitando novos `fetch` ou cálculos duplicados.