import type { Config, CustomField, Slot, SlotComponent } from '@puckeditor/core';
import { cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import MediaCarousel from './components/MediaCarousel';
import AdvancedCode from './components/AdvancedCode';
import ResetLayoutField from './components/ResetLayoutField';
import ResponsiveLayoutField from './components/ResponsiveLayoutField';
import { responsiveStyleVariables, type ResponsiveProps, type ResponsiveLayoutValues } from './responsive';
import { defaultMediaCarouselItem, type MediaCarouselProps } from './carousel/types';

type Align = 'left' | 'center' | 'right';
type Theme = 'primary' | 'secondary' | 'accent' | 'white' | 'neutral' | 'dark';
type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
type CellPadding = 'none' | Size;
type AdvancedSettings = { enabled?: boolean; title?: string; html?: string; css?: string; js?: string; height?: number };
type AdvancedEditable = { advanced?: AdvancedSettings };
type Resizable = ResponsiveLayoutValues & ResponsiveProps;
type ParentLayout = { layoutDirection?: 'column' | 'row'; layoutWrap?: 'nowrap' | 'wrap'; layoutJustify?: 'start' | 'center' | 'end' | 'space-between'; layoutAlignItems?: 'start' | 'center' | 'end' | 'stretch'; layoutGap?: number };

type Components = {
  Section: { background: Theme; padding: Size; minHeight: 'auto' | 'sm' | 'md' | 'lg'; width: 'full' | 'large' | 'medium' | 'small'; aspectRatio: 'auto' | '1/1' | '4/3' | '16/9'; radius: 'none' | 'sm' | 'md' | 'lg'; border: boolean; align: Align; content: Slot } & ParentLayout & Resizable & AdvancedEditable;
  Container: { width: 'small' | 'medium' | 'large' | 'full'; align: Align; content: Slot } & ParentLayout & Resizable & AdvancedEditable;
  Columns: { columns: '2' | '3' | '4'; gap: Size; content: Slot } & Resizable & AdvancedEditable;
  Table: { rows: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'; columns: '1' | '2' | '3' | '4' | '5' | '6'; gap: Size; cellPadding: CellPadding; cellBackground: Theme; cellRadius: 'none' | 'sm' | 'md' | 'lg'; cellBorder: boolean; align: Align; content: Slot } & Resizable & AdvancedEditable;
  Div: { background: Theme; padding: Size; radius: 'none' | 'sm' | 'md' | 'lg'; content: Slot } & ParentLayout & Resizable & AdvancedEditable;
  Heading: { text: string; tag: 'h1' | 'h2' | 'h3' | 'h4'; size: Size; align: Align; color: Theme } & Resizable & AdvancedEditable;
  Eyebrow: { text: string; align: Align; color: Theme } & Resizable & AdvancedEditable;
  Text: { text: string; size: 'sm' | 'base' | 'lg'; align: Align; color: Theme } & Resizable & AdvancedEditable;
  Image: { src: string; alt: string; width: 'auto' | 'full' | 'large' | 'medium'; radius: 'none' | 'sm' | 'md' | 'lg'; link: string } & Resizable & AdvancedEditable;
  Button: { text: string; url: string; target: '_self' | '_blank'; variant: 'primary' | 'secondary' | 'outline' | 'ghost'; size: 'sm' | 'md' | 'lg'; align: Align } & Resizable & AdvancedEditable;
  Link: { text: string; url: string; target: '_self' | '_blank'; color: Theme; underline: boolean } & Resizable & AdvancedEditable;
  Spacer: { size: Size } & Resizable & AdvancedEditable;
  Hero: { image: string; layout: 'center' | 'left' | 'imageRight' | 'imageLeft' | 'background'; content: Slot } & Resizable & AdvancedEditable;
  CTA: { theme: Theme; content: Slot } & Resizable & AdvancedEditable;
  SiteHero: { image: string; content: Slot } & Resizable & AdvancedEditable;
  NetworkBanner: { metric: string; content: Slot } & Resizable & AdvancedEditable;
  AudiencePanels: { businessContent: Slot; familyContent: Slot } & Resizable & AdvancedEditable;
  AppPromo: { content: Slot } & Resizable & AdvancedEditable;
  EditableHero: { image: string; content: Slot } & Resizable & AdvancedEditable;
  MediaCarousel: MediaCarouselProps & Resizable & AdvancedEditable;
  AdvancedCode: { html: string; css: string; js: string; title: string; height: number } & Resizable;
};

const themes: Record<Theme, string> = { primary: '#087f79', secondary: '#173142', accent: '#f47f6d', white: '#ffffff', neutral: '#f3f8f6', dark: '#10242d' };
const sizes: Record<Size, string> = { sm: '0.875rem', md: '1rem', lg: '1.25rem', xl: '1.5rem', '2xl': '2rem', '3xl': '3rem', '4xl': '4rem', '5xl': '5rem' };
const spaces: Record<Size, string> = { sm: '1rem', md: '2rem', lg: '3rem', xl: '4rem', '2xl': '5rem', '3xl': '6rem', '4xl': '8rem', '5xl': '10rem' };
const cellSpaces: Record<CellPadding, string> = { none: '0', ...spaces };
const resizeStyle = (editorWidth?: number, editorHeight?: number, editorPosition?: 'flow' | 'absolute', editorX?: number, editorY?: number) => ({ position: 'relative' as const, ...(editorWidth ? { width: `${editorWidth}px`, maxWidth: '100%' } : {}), ...(editorHeight ? { minHeight: `${editorHeight}px` } : {}), ...(editorPosition === 'absolute' ? { position: 'absolute' as const, left: Math.max(0, editorX || 0), top: Math.max(0, editorY || 0), margin: 0, zIndex: 2 } : {}) });

const field = (type: 'text' | 'textarea' | 'select', label: string, options?: string[]) => type === 'select'
  ? { type, label, options: (options || []).map(value => ({ label: value, value })) }
  : { type, label, contentEditable: true };

const slot = (allow: string[]) => ({ type: 'slot' as const, allow });
const SlotContent = ({ Content, label }: { Content: SlotComponent; label: string }) => <div className="page-builder-slot" data-empty-label={label}>{Content()}</div>;
const structural = ['Section', 'Container', 'Columns', 'Table', 'Div'];
const widgets = ['Spacer', 'Eyebrow', 'Heading', 'Text', 'Image', 'Link', 'Button', 'MediaCarousel', 'AdvancedCode'];
const neutralSlot = [...structural, ...widgets];

const resetLayoutField: CustomField<boolean> = { type: 'custom', label: 'Dimensões e posição', render: () => <ResetLayoutField /> };

const mediaSourceField: CustomField<string> = {
  type: 'custom',
  label: 'URL ou upload',
  render: ({ value, onChange }) => <div className="puck-media-field"><input value={value || ''} placeholder="https://..." onChange={event => onChange(event.target.value)} /><input type="file" accept="image/*" onChange={async event => { const file = event.target.files?.[0]; if (!file) return; const form = new FormData(); form.append('file', file); const response = await fetch('/api/admin/storage/upload', { method: 'POST', body: form }); const result = await response.json() as { url?: string }; if (response.ok && result.url) onChange(result.url); }} /></div>,
};

const node = (type: string, id: string, props: Record<string, unknown>) => ({ type, props: { id, ...props } });
const heroContent = () => [
  node('Eyebrow', 'hero-eyebrow', { text: 'Cuidado que acompanha você', align: 'left', color: 'primary' }),
  node('Heading', 'hero-title', { text: 'Somos especialistas em Planos Odontológicos.', tag: 'h1', size: '5xl', align: 'left', color: 'secondary' }),
  node('Text', 'hero-description', { text: 'Planos odontológicos para cuidar do seu sorriso com leveza.', size: 'lg', align: 'left', color: 'secondary' }),
  node('Button', 'hero-button', { text: 'Faça seu Plano', url: '/ecommerce-fc/', target: '_self', variant: 'primary', size: 'md', align: 'left' }),
];
const ctaContent = () => [
  node('Heading', 'cta-title', { text: 'Pronto para começar?', tag: 'h2', size: '2xl', align: 'center', color: 'white' }),
  node('Text', 'cta-text', { text: 'Conte com a Odontoart para cuidar do seu sorriso.', size: 'base', align: 'center', color: 'white' }),
  node('Button', 'cta-button', { text: 'Fale conosco', url: '/contato/', target: '_self', variant: 'accent', size: 'md', align: 'center' }),
];

const defaultAdvanced: AdvancedSettings = { enabled: false, title: 'Código avançado', html: '', css: '', js: '', height: 320 };
const responsiveField: CustomField<ResponsiveProps['responsive']> = {
  type: 'custom',
  label: 'Responsividade',
  render: ({ value, onChange }) => <ResponsiveLayoutField value={value} onChange={onChange} />,
};

const advancedFields = {
  resetLayout: resetLayoutField,
  responsive: responsiveField,
  advanced: {
    type: 'object' as const,
    label: 'Modo avançado',
    objectFields: {
      enabled: { type: 'radio' as const, label: 'Usar código', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] },
      title: { type: 'text' as const, label: 'Título acessível' },
      html: { type: 'textarea' as const, label: 'HTML' },
      css: { type: 'textarea' as const, label: 'CSS' },
      js: { type: 'textarea' as const, label: 'JavaScript' },
      height: { type: 'number' as const, label: 'Altura (px)', min: 120, max: 1600 },
    },
  },
};

// Elementor trata tamanho e posicionamento como propriedades do próprio
// elemento. Mantemos o mesmo contrato para todos os widgets do Puck: o
// elemento começa no fluxo normal e só vira livre quando o administrador
// informa posição/tamanho ou o arrasta no canvas.
const layoutFields = {
  editorPosition: { type: 'radio' as const, label: 'Posição', options: [{ label: 'Fluxo normal', value: 'flow' }, { label: 'Livre no pai', value: 'absolute' }] },
  editorWidth: { type: 'number' as const, label: 'Largura (px)', min: 40, max: 2400 },
  editorHeight: { type: 'number' as const, label: 'Altura (px)', min: 24, max: 2400 },
  editorX: { type: 'number' as const, label: 'Deslocamento horizontal (px)', min: 0, max: 2400 },
  editorY: { type: 'number' as const, label: 'Deslocamento vertical (px)', min: 0, max: 2400 },
};

const parentLayoutFields = {
  layoutDirection: { type: 'radio' as const, label: 'Direção dos elementos', options: [{ label: 'Vertical', value: 'column' }, { label: 'Horizontal', value: 'row' }] },
  layoutWrap: { type: 'radio' as const, label: 'Quebra de linha', options: [{ label: 'Não quebrar', value: 'nowrap' }, { label: 'Quebrar', value: 'wrap' }] },
  layoutJustify: { type: 'select' as const, label: 'Distribuição', options: [{ label: 'Início', value: 'start' }, { label: 'Centro', value: 'center' }, { label: 'Fim', value: 'end' }, { label: 'Espaço entre', value: 'space-between' }] },
  layoutAlignItems: { type: 'select' as const, label: 'Alinhamento dos itens', options: [{ label: 'Início', value: 'start' }, { label: 'Centro', value: 'center' }, { label: 'Fim', value: 'end' }, { label: 'Esticar', value: 'stretch' }] },
  layoutGap: { type: 'number' as const, label: 'Gap entre elementos (px)', min: 0, max: 240 },
};

const parentLayoutDefaults: ParentLayout = { layoutDirection: 'column', layoutWrap: 'nowrap', layoutJustify: 'start', layoutAlignItems: 'stretch', layoutGap: 0 };
const parentLayoutStyle = (props: Partial<ParentLayout>): CSSProperties => ({
  display: 'flex',
  flexDirection: props.layoutDirection || parentLayoutDefaults.layoutDirection,
  flexWrap: props.layoutWrap || parentLayoutDefaults.layoutWrap,
  justifyContent: props.layoutJustify === 'end' ? 'flex-end' : props.layoutJustify === 'space-between' ? 'space-between' : props.layoutJustify || 'flex-start',
  alignItems: props.layoutAlignItems === 'start' ? 'flex-start' : props.layoutAlignItems === 'end' ? 'flex-end' : props.layoutAlignItems || 'stretch',
  gap: Number(props.layoutGap) || 0,
});

function withAdvancedComponents(components: Record<string, unknown>) {
  const parentComponents = new Set(['Section', 'Container', 'Div']);
  const defaultWidgetSizing: Record<string, CSSProperties> = {
    Heading: { display: 'block', width: 'fit-content', maxWidth: '100%' },
    Eyebrow: { display: 'block', width: 'fit-content', maxWidth: '100%' },
    Text: { display: 'block', width: 'min(100%, 560px)', maxWidth: '100%' },
    Button: { width: 'fit-content', maxWidth: '100%' },
  };

  return Object.fromEntries(Object.entries(components).map(([name, value]) => {
    if (!value || typeof value !== 'object') return [name, value];
    const component = value as { fields?: Record<string, unknown>; defaultProps?: Record<string, unknown>; render?: (props: never) => ReactNode };
    if (!component.render) return [name, value];
    if (name === 'AdvancedCode') return [name, { ...component, fields: { ...component.fields, ...layoutFields } }];
    const isParent = parentComponents.has(name);
    return [name, {
      ...component,
      fields: { ...component.fields, ...layoutFields, ...(isParent ? parentLayoutFields : {}), ...advancedFields },
      defaultProps: { ...component.defaultProps, ...(isParent ? parentLayoutDefaults : {}), advanced: defaultAdvanced },
      render: (props: never) => {
        const advanced = (props as unknown as { advanced?: AdvancedSettings }).advanced;
        const typedProps = props as unknown as Resizable & Record<string, unknown>;
        const rendered = advanced?.enabled
          ? <AdvancedCode html={advanced.html || ''} css={advanced.css || ''} js={advanced.js || ''} title={advanced.title || name} height={advanced.height || 320} editorWidth={typedProps.editorWidth} editorHeight={typedProps.editorHeight} editorPosition={typedProps.editorPosition} editorX={typedProps.editorX} editorY={typedProps.editorY} />
          : component.render?.(props);
        const layout = defaultWidgetSizing[name];
        const resizable = typedProps;
        const parentStyle = isParent ? parentLayoutStyle(props as unknown as Partial<ParentLayout>) : {};
        const isImage = name === 'Image';
        if (!isValidElement(rendered)) return rendered;
        const element = rendered as ReactElement<{ className?: string; style?: CSSProperties }>;
        const baseStyle = { ...parentStyle, ...(resizable.editorWidth ? {} : layout), ...element.props.style } as CSSProperties;
        const className = [element.props.className, layout ? 'page-builder-free-widget' : undefined, isParent ? 'page-builder-layout-parent' : undefined, isImage ? 'page-builder-image-widget' : undefined, 'page-builder-responsive'].filter(Boolean).join(' ');
        const responsiveStyle = responsiveStyleVariables(resizable, resizable.responsive, baseStyle);
        return cloneElement(element, { className, style: { ...baseStyle, ...responsiveStyle } });
      },
    }];
  })) as Config<Components>['components'];
}

export const puckConfig: Config<Components> = {
  categories: {
    layout: { title: 'Layout', components: ['Section', 'Container', 'Columns', 'Table', 'Div', 'Spacer'], defaultExpanded: true },
    content: { title: 'Conteúdo', components: ['Eyebrow', 'Heading', 'Text', 'Image', 'Link', 'Button'] },
    media: { title: 'Mídia', components: ['MediaCarousel'] },
    advanced: { title: 'Avançado', components: ['AdvancedCode'] },
    other: { visible: false },
  },
  components: withAdvancedComponents(({
    Section: { label: 'Seção', fields: { background: field('select', 'Fundo', Object.keys(themes)), padding: field('select', 'Espaçamento', Object.keys(spaces)), minHeight: field('select', 'Altura mínima', ['auto', 'sm', 'md', 'lg']), width: field('select', 'Largura', ['full', 'large', 'medium', 'small']), aspectRatio: field('select', 'Proporção', ['auto', '1/1', '4/3', '16/9']), radius: field('select', 'Raio', ['none', 'sm', 'md', 'lg']), border: { type: 'radio', label: 'Borda', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] }, align: field('select', 'Alinhamento', ['left', 'center', 'right']), content: slot(neutralSlot) }, defaultProps: { background: 'white', padding: 'lg', minHeight: 'auto', width: 'full', aspectRatio: 'auto', radius: 'none', border: false, align: 'left', content: [] }, render: ({ background, padding, minHeight, width, aspectRatio, radius, border, align, editorWidth, editorHeight, editorPosition, editorX, editorY, content: Content }) => <section className="page-builder-layout-parent" data-editor-sized={editorHeight ? 'true' : undefined} style={{ boxSizing: 'border-box', background: themes[background], padding: `${spaces[padding]} 6%`, minHeight: minHeight === 'auto' ? undefined : spaces[minHeight === 'sm' ? 'md' : minHeight === 'md' ? 'xl' : '3xl'], width: { full: '100%', large: '75%', medium: '50%', small: '30%' }[width], ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY), aspectRatio: aspectRatio === 'auto' ? undefined : aspectRatio, borderRadius: { none: 0, sm: 6, md: 14, lg: 28 }[radius], border: border ? '1px solid #d7e5e0' : undefined, textAlign: align, margin: width === 'full' ? undefined : '0 auto' }}><SlotContent Content={Content} label="Arraste um elemento para dentro da seção" /></section> },
    Container: { label: 'Container', fields: { width: field('select', 'Largura', ['small', 'medium', 'large', 'full']), align: field('select', 'Alinhamento', ['left', 'center', 'right']), content: slot(neutralSlot) }, defaultProps: { width: 'large', align: 'center', content: [] }, render: ({ width, align, editorWidth, editorHeight, editorPosition, editorX, editorY, content: Content }) => <div className="page-builder-layout-parent" data-editor-sized={editorHeight ? 'true' : undefined} style={{ maxWidth: { small: 640, medium: 960, large: 1200, full: 1600 }[width], width: '100%', ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY), margin: align === 'left' ? '0' : align === 'right' ? '0 0 0 auto' : '0 auto' }}><SlotContent Content={Content} label="Arraste um elemento para dentro do container" /></div> },
    Columns: { label: 'Colunas', fields: { columns: field('select', 'Quantidade', ['2', '3', '4']), gap: field('select', 'Espaçamento', Object.keys(spaces)), content: slot(neutralSlot) }, defaultProps: { columns: '3', gap: 'md', content: [] }, render: ({ columns, gap, editorWidth, editorHeight, editorPosition, editorX, editorY, content: Content }) => <div className="page-builder-columns page-builder-layout-parent" data-editor-sized={editorHeight ? 'true' : undefined} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: spaces[gap], ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY) }}><SlotContent Content={Content} label="Arraste elementos para as colunas" /></div> },
    Table: { label: 'Tabela / Grade', fields: { rows: field('select', 'Linhas', ['1', '2', '3', '4', '5', '6', '7', '8']), columns: field('select', 'Colunas', ['1', '2', '3', '4', '5', '6']), gap: field('select', 'Espaçamento', Object.keys(spaces)), cellPadding: field('select', 'Espaçamento interno', ['none', 'sm', 'md', 'lg']), cellBackground: field('select', 'Fundo das células', Object.keys(themes)), cellRadius: field('select', 'Raio das células', ['none', 'sm', 'md', 'lg']), cellBorder: { type: 'radio', label: 'Borda nas células', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] }, align: field('select', 'Alinhamento', ['left', 'center', 'right']), content: slot(neutralSlot) }, defaultProps: { rows: '2', columns: '4', gap: 'sm', cellPadding: 'none', cellBackground: 'white', cellRadius: 'none', cellBorder: false, align: 'left', content: [] }, render: ({ rows, columns, gap, cellPadding, cellBackground, cellRadius, cellBorder, align, editorWidth, editorHeight, editorPosition, editorX, editorY, content: Content }) => { const style = { display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, auto))`, gridAutoRows: 'minmax(0, auto)', gap: spaces[gap], textAlign: align, '--table-cell-padding': cellSpaces[cellPadding], '--table-cell-background': themes[cellBackground], '--table-cell-radius': { none: '0px', sm: '6px', md: '14px', lg: '28px' }[cellRadius], '--table-cell-border': cellBorder ? '1px solid #d7e5e0' : 'none', ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY) } as CSSProperties; return <div className="page-builder-table page-builder-layout-parent" data-editor-sized={editorHeight ? 'true' : undefined} style={style}><SlotContent Content={Content} label="Adicione elementos às células da grade" /></div>; } },
    Div: { label: 'Div', fields: { background: field('select', 'Fundo', Object.keys(themes)), padding: field('select', 'Espaçamento', Object.keys(spaces)), radius: field('select', 'Raio', ['none', 'sm', 'md', 'lg']), content: slot(neutralSlot) }, defaultProps: { background: 'white', padding: 'sm', radius: 'none', content: [] }, render: ({ background, padding, radius, editorWidth, editorHeight, editorPosition, editorX, editorY, content: Content }) => <div className="page-builder-layout-parent" data-editor-sized={editorHeight ? 'true' : undefined} style={{ background: themes[background], padding: spaces[padding], borderRadius: { none: 0, sm: 6, md: 14, lg: 28 }[radius], ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY) }}><SlotContent Content={Content} label="Arraste um elemento para dentro da div" /></div> },
    Heading: { label: 'Título', fields: { text: field('text', 'Texto'), tag: field('select', 'Tag', ['h1', 'h2', 'h3', 'h4']), size: field('select', 'Tamanho', Object.keys(sizes)), align: field('select', 'Alinhamento', ['left', 'center', 'right']), color: field('select', 'Cor', Object.keys(themes)) }, defaultProps: { text: 'Novo título', tag: 'h2', size: '3xl', align: 'left', color: 'secondary' }, render: ({ text, tag: Tag, size, align, color, editorWidth, editorHeight, editorPosition, editorX, editorY }) => <Tag style={{ fontSize: sizes[size], textAlign: align, color: themes[color], margin: '0 0 1rem', ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY) }}>{text}</Tag> },
    Eyebrow: { label: 'Eyebrow', fields: { text: field('text', 'Texto'), align: field('select', 'Alinhamento', ['left', 'center', 'right']), color: field('select', 'Cor', Object.keys(themes)) }, defaultProps: { text: 'Novo destaque', align: 'left', color: 'primary' }, render: ({ text, align, color, editorWidth, editorHeight, editorPosition, editorX, editorY }) => <p className="eyebrow" style={{ textAlign: align, color: themes[color], ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY) }}>{text}</p> },
    Text: { label: 'Texto', fields: { text: field('textarea', 'Conteúdo'), size: field('select', 'Tamanho', ['sm', 'base', 'lg']), align: field('select', 'Alinhamento', ['left', 'center', 'right']), color: field('select', 'Cor', Object.keys(themes)) }, defaultProps: { text: 'Adicione um texto para sua página.', size: 'base', align: 'left', color: 'secondary' }, render: ({ text, size, align, color, editorWidth, editorHeight, editorPosition, editorX, editorY }) => <p style={{ fontSize: size === 'sm' ? 14 : size === 'lg' ? 20 : 16, textAlign: align, color: themes[color], whiteSpace: 'pre-line', lineHeight: 1.7, ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY) }}>{text}</p> },
    Image: { label: 'Imagem', fields: { src: mediaSourceField, alt: field('text', 'Texto alternativo'), width: field('select', 'Largura', ['auto', 'full', 'large', 'medium']), radius: field('select', 'Arredondamento', ['none', 'sm', 'md', 'lg']), link: field('text', 'Link opcional') }, defaultProps: { src: '', alt: '', width: 'auto', radius: 'md', link: '' }, render: ({ src, alt, width, radius, link, editorWidth, editorHeight, editorPosition, editorX, editorY }) => { const hasExplicitWidth = Boolean(editorWidth) || width !== 'auto'; const shrinkWrap = !hasExplicitWidth && editorPosition !== 'absolute'; const frameStyle = { display: 'block' as const, width: editorWidth ? `${editorWidth}px` : width === 'full' ? '100%' : width === 'large' ? '75%' : width === 'medium' ? '50%' : 'fit-content', maxWidth: '100%', minHeight: editorHeight ? `${editorHeight}px` : undefined, ...resizeStyle(undefined, undefined, editorPosition, editorX, editorY) }; const image = src ? <img src={src} alt={alt} style={{ display: 'block', width: hasExplicitWidth ? '100%' : 'auto', height: editorHeight ? `${editorHeight}px` : undefined, maxWidth: '100%', borderRadius: { none: 0, sm: 6, md: 14, lg: 28 }[radius], margin: hasExplicitWidth ? '0 auto' : undefined, objectFit: 'cover' }} /> : <div className="odontoart-widget-placeholder" style={{ minWidth: 180 }}>Selecione uma imagem</div>; return <div data-editor-shrink-wrap={shrinkWrap ? 'true' : undefined} style={frameStyle}>{link && src ? <a href={link}>{image}</a> : image}</div>; } },
    Button: { label: 'Botão', fields: { text: field('text', 'Texto'), url: field('text', 'URL do link'), target: field('select', 'Destino', ['_self', '_blank']), variant: field('select', 'Variante', ['primary', 'secondary', 'outline', 'ghost']), size: field('select', 'Tamanho', ['sm', 'md', 'lg']), align: field('select', 'Alinhamento', ['left', 'center', 'right']) }, defaultProps: { text: 'Saiba mais', url: '/', target: '_self', variant: 'primary', size: 'md', align: 'left' }, render: ({ text, url, target, variant, size, align, editorWidth, editorHeight, editorPosition, editorX, editorY }) => <div style={{ textAlign: align, ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY) }}><a href={url} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} style={{ display: 'inline-block', padding: size === 'sm' ? '8px 16px' : size === 'lg' ? '15px 28px' : '12px 22px', borderRadius: 999, background: variant === 'outline' || variant === 'ghost' ? 'transparent' : themes[variant === 'secondary' ? 'secondary' : 'accent'], color: variant === 'outline' || variant === 'ghost' ? themes.secondary : '#fff', border: variant === 'outline' ? `1px solid ${themes.secondary}` : '0', textDecoration: 'none', fontWeight: 700 }}>{text}</a></div> },
    Link: { label: 'Link', fields: { text: field('text', 'Texto'), url: field('text', 'URL do link'), target: field('select', 'Destino', ['_self', '_blank']), color: field('select', 'Cor', Object.keys(themes)), underline: { type: 'radio', label: 'Sublinhado', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] } }, defaultProps: { text: 'Abrir link', url: '/', target: '_self', color: 'primary', underline: false }, render: ({ text, url, target, color, underline, editorWidth, editorHeight, editorPosition, editorX, editorY }) => <a href={url || '#'} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} style={{ color: themes[color], textDecoration: underline ? 'underline' : 'none', fontWeight: 700, display: editorWidth || editorHeight || editorPosition === 'absolute' ? 'inline-block' : undefined, ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY) }}>{text}</a> },
    Spacer: { label: 'Espaçador', fields: { size: field('select', 'Altura', Object.keys(spaces)) }, defaultProps: { size: 'md' }, render: ({ size, editorWidth, editorHeight, editorPosition, editorX, editorY }) => <div aria-hidden="true" style={{ height: editorHeight ? `${editorHeight}px` : spaces[size], ...resizeStyle(editorWidth, undefined, editorPosition, editorX, editorY) }} /> },
    Hero: { label: 'Hero editável', fields: { image: mediaSourceField, layout: field('select', 'Layout', ['center', 'left', 'imageRight', 'imageLeft', 'background']), content: slot(['Eyebrow', 'Heading', 'Text', 'Image', 'Link', 'Button']) }, defaultProps: { image: '', layout: 'imageRight', content: heroContent() }, render: ({ image, layout, editorWidth, editorHeight, editorPosition, editorX, editorY, content: Content }) => <section className="hero" style={{ gridTemplateColumns: layout === 'center' ? '1fr' : '1fr 1fr', background: layout === 'background' && image ? `linear-gradient(90deg, #173142dd, #17314255), url(${image}) center/cover` : undefined, ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY) }}><div className="hero-copy"><Content /></div>{layout !== 'center' && layout !== 'background' && <div className="hero-image">{image ? <img src={image} alt="" /> : <div className="odontoart-widget-placeholder">Selecione uma imagem</div>}</div>}</section> },
    CTA: { label: 'CTA editável', fields: { theme: field('select', 'Tema', Object.keys(themes)), content: slot(['Eyebrow', 'Heading', 'Text', 'Link', 'Button']) }, defaultProps: { theme: 'primary', content: ctaContent() }, render: ({ theme, editorWidth, editorHeight, editorPosition, editorX, editorY, content: Content }) => <section style={{ padding: '3rem 6%', borderRadius: 18, background: themes[theme], color: theme === 'white' ? themes.secondary : '#fff', textAlign: 'center', ...resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY) }}><Content /></section> },
    SiteHero: { label: 'Hero da página inicial', fields: { image: mediaSourceField, content: slot(['Eyebrow', 'Heading', 'Text', 'Link', 'Button']) }, defaultProps: { image: '', content: heroContent() }, render: ({ image, editorWidth, editorHeight, editorPosition, editorX, editorY, content: Content }) => <section className="hero" style={resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY)}><div className="hero-copy"><Content /></div><div className="hero-image">{image ? <img src={image} alt="Pessoa sorrindo usando o celular" /> : <div className="odontoart-widget-placeholder">Selecione uma imagem</div>}</div></section> },
    NetworkBanner: { label: 'Rede credenciada editável', fields: { metric: field('text', 'Métrica'), content: slot(['Eyebrow', 'Heading', 'Text', 'Link', 'Button']) }, defaultProps: { metric: '+ 4.000', content: [node('Eyebrow', 'network-eyebrow', { text: 'Onde você estiver', align: 'left', color: 'white' }), node('Heading', 'network-title', { text: 'Encontre especialistas em nossa rede credenciada por todo o Brasil', tag: 'h2', size: '3xl', align: 'left', color: 'white' }), node('Link', 'network-link', { text: 'Ver rede completa →', url: '/rede-credenciada/', target: '_self', color: 'accent', underline: false })] }, render: ({ metric, editorWidth, editorHeight, editorPosition, editorX, editorY, content: Content }) => <section className="network" style={resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY)}><div><Content /></div><div className="map-card"><span>{metric}</span><small>profissionais<br />credenciados</small></div></section> },
    AudiencePanels: { label: 'Painéis de planos editáveis', fields: { businessContent: slot(['Eyebrow', 'Heading', 'Text', 'Link', 'Button']), familyContent: slot(['Eyebrow', 'Heading', 'Text', 'Link', 'Button']) }, defaultProps: { businessContent: [node('Eyebrow', 'business-eyebrow', { text: 'Para empresas', align: 'left', color: 'primary' }), node('Heading', 'business-title', { text: 'Planos para sua Empresa!', tag: 'h2', size: '2xl', align: 'left', color: 'secondary' }), node('Button', 'business-button', { text: 'Conheça os planos →', url: '/planos-empresa/', target: '_self', variant: 'outline', size: 'md', align: 'left' })], familyContent: [node('Eyebrow', 'family-eyebrow', { text: 'Para você', align: 'left', color: 'accent' }), node('Heading', 'family-title', { text: 'Planos para você e sua família!', tag: 'h2', size: '2xl', align: 'left', color: 'secondary' }), node('Button', 'family-button', { text: 'Faça seu Plano →', url: '/ecommerce-fc/', target: '_self', variant: 'primary', size: 'md', align: 'left' })] }, render: ({ editorWidth, editorHeight, editorPosition, editorX, editorY, businessContent: Business, familyContent: Family }) => <section className="audience" style={resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY)}><div><Business /></div><div className="family"><Family /></div></section> },
    AppPromo: { label: 'Promoção do aplicativo editável', fields: { content: slot(['Eyebrow', 'Heading', 'Text', 'Link', 'Button']) }, defaultProps: { content: [node('Eyebrow', 'app-eyebrow', { text: 'Tecnologia para simplificar', align: 'left', color: 'primary' }), node('Heading', 'app-title', { text: 'Baixe nosso aplicativo Odontoart', tag: 'h2', size: '2xl', align: 'left', color: 'secondary' }), node('Text', 'app-text', { text: 'Marque consultas com rapidez e facilidade. Com o App da Odontoart você tem tudo na mão.', size: 'base', align: 'left', color: 'secondary' }), node('Link', 'app-link', { text: 'Saiba como baixar →', url: '/passo-a-passo-app/', target: '_self', color: 'accent', underline: false })] }, render: ({ editorWidth, editorHeight, editorPosition, editorX, editorY, content: Content }) => <section className="app-promo" style={resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY)}><div><Content /></div><div className="phone">odonto<i>art</i><span>Seu sorriso na palma da mão</span></div></section> },
    EditableHero: { label: 'Hero editável', fields: { image: mediaSourceField, content: slot(['Eyebrow', 'Heading', 'Text', 'Link', 'Button', 'Image']) }, defaultProps: { image: '', content: heroContent() }, render: ({ image, editorWidth, editorHeight, editorPosition, editorX, editorY, content: Content }) => <section className="hero" style={resizeStyle(editorWidth, editorHeight, editorPosition, editorX, editorY)}><div className="hero-copy"><Content /></div><div className="hero-image">{image ? <img src={image} alt="Pessoa sorrindo usando o celular" /> : <div className="odontoart-widget-placeholder">Selecione uma imagem</div>}</div></section> },
    MediaCarousel: { label: 'Carrossel de Mídia', fields: { items: { type: 'array', label: 'Slides', arrayFields: { id: field('text', 'ID do slide'), type: field('select', 'Tipo', ['image', 'video']), src: mediaSourceField, alt: field('text', 'Texto alternativo'), caption: field('text', 'Legenda'), href: field('text', 'URL do link'), openInNewTab: { type: 'radio', label: 'Abrir em nova aba', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] }, poster: mediaSourceField, title: field('text', 'Título do vídeo'), muted: { type: 'radio', label: 'Vídeo sem som', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] }, controls: { type: 'radio', label: 'Controles do vídeo', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] }, loop: { type: 'radio', label: 'Loop do vídeo', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] }, playsInline: { type: 'radio', label: 'Reproduzir inline', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] } }, defaultItemProps: defaultMediaCarouselItem }, loop: { type: 'radio', label: 'Loop', options: [{ label: 'Ligado', value: true }, { label: 'Desligado', value: false }] }, autoplay: { type: 'radio', label: 'Autoplay', options: [{ label: 'Ligado', value: true }, { label: 'Desligado', value: false }] }, autoplayDelay: field('select', 'Intervalo', ['3000', '4000', '5000', '7000', '10000']), pauseOnHover: { type: 'radio', label: 'Pausar ao passar mouse', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] }, showArrows: { type: 'radio', label: 'Setas', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] }, showDots: { type: 'radio', label: 'Indicadores', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] }, draggable: { type: 'radio', label: 'Arrastar com mouse', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] }, touch: { type: 'radio', label: 'Touch', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }] }, slidesDesktop: field('select', 'Slides desktop', ['1', '2', '3', '4']), slidesTablet: field('select', 'Slides tablet', ['1', '2', '3']), slidesMobile: field('select', 'Slides mobile', ['1', '2']), gap: { type: 'number', label: 'Espaçamento (px)', min: 0, max: 80 }, align: field('select', 'Alinhamento', ['start', 'center', 'end']), aspectRatio: field('select', 'Proporção', ['auto', '16/9', '4/3', '1/1', '3/2']), objectFit: field('select', 'Object fit', ['cover', 'contain']) }, defaultProps: { items: [defaultMediaCarouselItem(), { ...defaultMediaCarouselItem(), id: 'media-2', caption: 'Segundo slide' }, { ...defaultMediaCarouselItem(), id: 'media-3', caption: 'Terceiro slide' }], loop: true, autoplay: false, autoplayDelay: 5000, pauseOnHover: true, showArrows: true, showDots: true, draggable: true, touch: true, slidesDesktop: 3, slidesTablet: 2, slidesMobile: 1, gap: 16, align: 'start', aspectRatio: '16/9', objectFit: 'cover' }, render: props => <MediaCarousel {...props} /> },
    AdvancedCode: { label: 'Código avançado', fields: { title: field('text', 'Título acessível'), html: field('textarea', 'HTML'), css: field('textarea', 'CSS'), js: field('textarea', 'JavaScript'), height: { type: 'number', label: 'Altura (px)', min: 120, max: 1600 } }, defaultProps: { title: 'Código avançado', html: '<div class="advanced-example">Edite este bloco com HTML, CSS e JavaScript.</div>', css: '.advanced-example { padding: 24px; border: 1px dashed #087f79; color: #173142; font-family: sans-serif; }', js: '', height: 320 }, render: props => <AdvancedCode {...props} /> },
  } satisfies Config<Components>['components'])),
};
