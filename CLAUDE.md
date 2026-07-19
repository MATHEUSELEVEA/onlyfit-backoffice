# CLAUDE.md — onlyfit-backoffice

Front end web do backoffice interno da OnlyFit, voltado para operação, gestão e suporte da plataforma.

## Stack

Vite · React 18 · TypeScript · Supabase · TanStack Query · Lucide · CSS por tokens.

## Rodar

```bash
npm install
npm run dev
npm run build
npm run lint
```

Crie `.env` a partir de `.env.example`. Só use chaves públicas (`anon`) no cliente.

## Regras

1. RLS e RPCs de staff (`platform_is_staff`) são a fonte real de autorização.
2. Nenhum segredo no cliente.
3. O design herda o sistema canônico do `onlyfit-mobile`: Inter, tokens semânticos, superfícies grafite, acento lime e profundidade tonal.
4. O backoffice é operacional: densidade, leitura rápida, estados claros e navegação previsível valem mais do que efeito visual.
5. Backend, migrations e edge functions vivem em `../onlyfit-supabase`.
6. Migrations e Edge Functions são implantadas pelo GitHub Actions do `onlyfit-supabase` após merge na `main`. Não execute deploy de backend a partir deste app.

## Antes de dar por pronto

- `npm run build` passa.
- `npm run lint` limpo.
- Teste visual em desktop e mobile estreito.
