# Lírio

Agenda pessoal feita sob medida para a Débora: rotina, faculdade (Engenharia de Produção), trabalho, hábitos, finanças e bem-estar. App instalável (PWA), funciona offline e sincroniza entre aparelhos.

## O que tem
- **Hoje:** aulas do dia, rotina, tarefas, humor, água, hábitos e o que vem aí, com progresso do dia.
- **Rotina:** atividades que se repetem (de todo dia a qualquer intervalo), com ajuste por feriado/fim de semana e aviso prévio.
- **Tarefas, Calendário (com feriados nacionais), Hábitos (sequências), Notas, Listas, Datas importantes.**
- **Faculdade:** agenda de provas e entregas, horário de aulas, matérias com média e controle de faltas, cronômetro de foco por matéria e metas.
- **Finanças:** lançamentos, contas a pagar recorrentes, metas e gastos mês a mês.
- **Bem-estar:** humor, energia, sono, água, gratidão e diário.
- **Resumo:** indicadores do mês e o **Diário de Bordo** (grade P/O por frequência, exportável em Word), aproveitado da agenda original.
- **Áreas da vida:** Faculdade, Trabalho, Pessoal, Casa, Saúde e Finanças, com filtros.
- **Ajustes:** temas e cor própria, fontes, modo claro/escuro, tamanho do texto, cantos, módulos ligáveis, backup e importação da agenda antiga.

## Tecnologia
- Front em HTML + CSS + JS puros (módulos ES), sem build.
- Supabase (Postgres + Auth) com RLS em todas as tabelas.
- Acesso exclusivo: o cadastro só funciona para e-mails da lista privada `private.donos` (gatilho em `auth.users`).
- Offline-first: cache local + fila de gravações, enviada quando a internet volta.

## Rodar local
`python3 -m http.server 8080` e abrir `http://localhost:8080` (a chave publicável em `js/config.js` é pública por design; a proteção vem do RLS).

## Deploy
Site estático. Importar o repositório na Vercel (Framework: Other, sem build). `vercel.json` define CSP e cabeçalhos de segurança.

## Liberar o acesso de alguém
No SQL do Supabase: `insert into private.donos (email, nome) values ('email@dela.com', 'Nome');` e depois criar o usuário em Authentication > Users (ou usar o convite).
