# Odontoart — nova estrutura

Migração inicial do site Odontoart para Next.js App Router.

## Rotas mapeadas

As páginas institucionais do sitemap foram preservadas com os mesmos slugs: `/planos-empresa/`, `/rede-credenciada/`, `/sobre-nos/`, `/trabalhe-conosco/`, `/contato/`, `/passo-a-passo-app/`, `/ans/`, `/informe-de-imposto-de-renda/`, `/perguntas-frequentes/`, `/blog/`, `/lista-de-servicos/`, `/2a-via-do-boleto/`, `/seja-nosso-dentista/` e `/ecommerce-fc/`. Os feeds `/feed/` e `/comments/feed/` também foram mantidos.

## Conteúdo editável

O conteúdo está centralizado em `app/data.ts`, separado da apresentação. Esse formato facilita a próxima etapa de integração com um CMS headless (ou WordPress como API), incluindo troca de imagens, carrosséis, textos e documentos sem reescrever componentes.

## Desenvolvimento

```bash
npm install
npm run dev
```

Antes da publicação, ainda é necessário ligar os formulários, a busca da rede credenciada, os links de contratação/área do cliente e um CMS com autenticação para edição persistente.

## Painel administrativo

O painel privado fica em `/admin` e não aparece no menu público. Configure as variáveis de [.env.example](.env.example) antes de iniciar. O acesso usa Basic Auth no servidor e cobre também `/api/admin/*`. A persistência atual é o arquivo `data/admin-content.json`, adequado para esta instalação local; em produção, substitua por banco/Storage persistente.

O teste de webhook exige HTTPS e domínio presente em `ADMIN_WEBHOOK_ALLOWLIST`, reduzindo o risco de transformar o painel em um proxy para destinos arbitrários.
## Arquitetura do editor visual

O editor de páginas usa Puck como árvore oficial de edição. O JSON nativo do Puck é salvo em `draftContent` e `publishedContent`; o editor está disponível em `/admin/pages` e o preview usa somente o rascunho.

Craft.js não participa do fluxo de páginas. Embla Carousel é usado somente como runtime visual em componentes existentes.

O contrato, o catálogo e a validação estão em `app/page-builder`. Consulte `docs/page-builder.md` para a extensão do catálogo.
