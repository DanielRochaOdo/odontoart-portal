# Page Builder

O catálogo Puck está em `app/page-builder/config.tsx`. Cada componente possui campos controlados, `defaultProps` e uma única implementação usada pelo editor e pelo `PageRenderer`.

Páginas guardam `draftContent` e `publishedContent` como JSON nativo do Puck em `data/admin-content.json`. Autosave atualiza apenas o rascunho; `Publicar` copia o rascunho para o conteúdo publicado. O preview administrativo sempre usa o draft.

Para criar um componente, adicione o tipo em `config.tsx`, registre-o em uma categoria e implemente `fields`, `defaultProps` e `render`. Não salve HTML arbitrário como modelo principal.
