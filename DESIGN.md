---
name: OnlyFit Backoffice
description: Portal operacional interno com a identidade visual OnlyFit adaptada para gestão
colors:
  primary: "#CAF300"
  on-primary: "#1E2600"
  background: "#0D0E10"
  surface: "#121315"
  surface-container: "#1F2023"
  surface-container-high: "#292A2E"
  on-surface: "#E6E7EA"
  on-surface-variant: "#B3B7C0"
  outline: "#3A3D43"
typography:
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.45
  small:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    lineHeight: 1.35
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
  navMeta:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
  pageTitle:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 700
  loginTitle:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 800
  dashboardNumber:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 800
components:
  sidebar:
    background: "{colors.surface}"
    border: "1px solid {colors.outline}"
  metric:
    background: "{colors.surface-container}"
    border: "1px solid {colors.outline}"
---

# Design System

O backoffice preserva a marca OnlyFit, mas troca a linguagem de consumo por uma interface de operação: densidade controlada, números alinhados, navegação lateral persistente e gráficos simples.

Use tokens CSS semânticos. Componentes não devem usar hex diretamente.

## Regras

- Acento lime só para seleção, foco e chamadas primárias.
- Profundidade por camadas tonais, não por sombras grandes.
- Inter como única família tipográfica.
- Cards com raio até 12px.
- Gráficos sempre acompanhados por valores textuais.
- Sidebar deve recolher no desktop e virar drawer em telas pequenas.
- Scrim usa token de sobreposição, não preto hardcoded.
