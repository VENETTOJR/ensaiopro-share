# Ensaio Pro

Aplicação Next.js para criação e gerenciamento de ensaios fotográficos com IA.

## Requisitos

- Node.js 20+
- Um projeto Supabase
- Pelo menos um provedor de geração de imagens configurado

## Configuração local

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local` e preencha somente com suas próprias credenciais.
3. Aplique no Supabase, em ordem, os arquivos de `supabase/migrations`.
4. Inicie o projeto com `npm run dev`.
5. Abra `http://localhost:3000`.

## Segurança

Arquivos `.env` são ignorados pelo Git. Nunca envie chaves reais, tokens, senhas,
fotos privadas ou chaves `service_role` para o repositório. A chave
`SUPABASE_SERVICE_ROLE_KEY` deve ser usada apenas no servidor.

Scripts administrativos e dados gerados da instalação original não fazem parte
desta versão compartilhável.
