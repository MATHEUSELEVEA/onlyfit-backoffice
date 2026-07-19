# AGENTS.md

## REGRA RÍGIDA E PRIORITÁRIA: ENTREGA SEMPRE NO GIT REMOTO

Esta é a primeira instrução operacional para qualquer agente. Quando o usuário pedir `push`, PR, merge ou deploy, é proibido encerrar com mudanças ou commits apenas locais. O agente deve partir da `main` atualizada, criar branch, fazer commit, enviar a branch ao remoto, abrir Pull Request para `main`, fazer merge do PR e confirmar que a `main` remota contém a entrega. Nunca faça commit ou push direto na `main`.

Leia primeiro `../CLAUDE.md` e depois `CLAUDE.md` deste repositório.

Este app é o portal web interno da equipe de gestão OnlyFit. Ele consome o mesmo Supabase de produção via chave `anon` e respeita RLS/RPCs de staff. Nunca coloque `service_role` ou segredo no cliente.

Se o pedido incluir PR, merge ou deploy, siga o fluxo obrigatório do workspace: branch a partir da `main`, commit, push, PR para `main` e merge do PR. Nunca commite direto na `main`.

Migrations e Edge Functions pertencem ao `onlyfit-supabase` e são implantadas pelo GitHub Actions daquele repositório. Não execute deploy de backend a partir deste app.
