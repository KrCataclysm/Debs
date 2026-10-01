# Lírio 🌸

App de rotina, hábitos, finanças, estudos e bem-estar (PWA). Funciona offline e sincroniza entre aparelhos.

- **Front:** HTML + CSS + JS puros (módulos ES), sem build. Instalável no celular (manifest + service worker).
- **Banco/login:** Supabase (Postgres + Auth), com RLS em todas as tabelas: cada usuária só enxerga os próprios dados.
- **Offline:** cache local + fila de gravações; envia quando a internet volta.
- **Personalização:** tema/cor própria, fontes, modo claro/escuro, tamanho do texto, cantos e módulos ligáveis (salvo na conta).

## Rodar local
`python3 -m http.server 8080` e abrir `http://localhost:8080` (a chave publicável em `js/config.js` é pública por design).

## Deploy
Site estático: a Vercel publica a raiz do repositório (`vercel.json` define cabeçalhos de segurança e CSP).

## Banco
Esquema aplicado por migrações no Supabase (`perfis`, `rotinas`, `rotina_registros`, `tarefas`, `notas`, `habitos`, `habito_checks`, `transacoes`, `contas`, `metas`, `materias`, `estudos`, `datas_importantes`, `bemestar`, `compras`, `refeicoes`).
