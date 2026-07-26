# Segurança e escalabilidade

Leitura obrigatória antes de alterar este backoffice.

- Toda sessão staff precisa de MFA Supabase AAL2. Nunca contorne o `MfaGate`.
- RLS/RPC autoriza; UI apenas representa permissão.
- Segredos de Stripe/Asaas digitados aqui são enviados somente por HTTPS à RPC protegida por AAL2, nunca armazenados em estado persistente, log, analytics ou erro.
- Nunca adicionar `service_role`, secret ou token ao bundle/Vite.
- Páginas financeiras usam paginação; nenhuma consulta pode baixar tabela inteira.
- Dados financeiros/saúde não entram em `console`, Sentry breadcrumbs, PostHog ou URL.
- Manter CSP/HSTS/`no-store` do `vercel.json`; ampliar allowlist só para dependência comprovada.
- Antes do PR: `npm audit --omit=dev --audit-level=high`, `npm run lint` e `npm run build`.

O contrato completo está em `../onlyfit-supabase/docs/SECURITY-SCALABILITY-100K.md`.
