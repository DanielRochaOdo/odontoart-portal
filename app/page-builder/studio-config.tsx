import type { Config, CustomField } from '@puckeditor/core';
import type { CSSProperties, ReactNode } from 'react';
import { puckConfig } from './config';
import ResetLayoutField from './components/ResetLayoutField';
import ResponsiveLayoutField from './components/ResponsiveLayoutField';
import {
  responsiveStyleVariables,
  type ResponsiveLayoutValues,
  type ResponsiveProps,
} from './responsive';

type StudioLayout = ResponsiveLayoutValues & ResponsiveProps;
type Align = 'left' | 'center' | 'right';
type Theme = 'primary' | 'secondary' | 'accent' | 'white' | 'neutral' | 'dark';
type Radius = 'none' | 'sm' | 'md' | 'lg' | 'pill';

type DividerProps = StudioLayout & { color: Theme; thickness: number; style: 'solid' | 'dashed' | 'dotted'; width: number; align: Align };
type IconProps = StudioLayout & { icon: string; size: number; color: Theme; background: Theme; shape: 'none' | 'circle' | 'square' };
type BadgeProps = StudioLayout & { text: string; color: Theme; background: Theme; radius: Radius; size: 'sm' | 'md' | 'lg' };
type ListProps = StudioLayout & { items: string; ordered: boolean; color: Theme; size: 'sm' | 'md' | 'lg' };
type CardProps = StudioLayout & { image: string; title: string; text: string; url: string; buttonText: string; theme: Theme; radius: Radius; shadow: boolean };
type QuoteProps = StudioLayout & { quote: string; author: string; role: string; align: Align; accent: Theme };
type StatProps = StudioLayout & { value: string; label: string; prefix: string; suffix: string; accent: Theme; align: Align };
type AccordionProps = StudioLayout & { title: string; content: string; open: boolean };
type VideoProps = StudioLayout & { src: string; title: string; height: number; rounded: boolean };
type EmbedProps = StudioLayout & { url: string; title: string; height: number };
type SocialLinksProps = StudioLayout & { instagram: string; facebook: string; linkedin: string; whatsapp: string; align: Align };

const themes: Record<Theme, string> = {
  primary: '#087f79',
  secondary: '#173142',
  accent: '#f47f6d',
  white: '#ffffff',
  neutral: '#f3f8f6',
  dark: '#10242d',
};

const radii: Record<Radius, string | number> = {
  none: 0,
  sm: 6,
  md: 14,
  lg: 28,
  pill: 999,
};

const selectField = (label: string, values: string[]) => ({
  type: 'select' as const,
  label,
  options: values.map(value => ({ label: value, value })),
});

const textField = (label: string, textarea = false) => ({
  type: textarea ? 'textarea' as const : 'text' as const,
  label,
  contentEditable: true,
});

const boolField = (label: string) => ({
  type: 'radio' as const,
  label,
  options: [
    { label: 'Sim', value: true },
    { label: 'Não', value: false },
  ],
});

const responsiveField: CustomField<ResponsiveProps['responsive']> = {
  type: 'custom',
  label: 'Responsividade',
  render: ({ value, onChange }) => <ResponsiveLayoutField value={value} onChange={onChange} />,
};

const resetLayoutField: CustomField<boolean> = {
  type: 'custom',
  label: 'Dimensões e posição',
  render: () => <ResetLayoutField />,
};

const layoutFields = {
  editorPosition: {
    type: 'radio' as const,
    label: 'Posição',
    options: [
      { label: 'Fluxo normal', value: 'flow' },
      { label: 'Livre no pai', value: 'absolute' },
    ],
  },
  editorWidth: { type: 'number' as const, label: 'Largura (px)', min: 40, max: 2400 },
  editorHeight: { type: 'number' as const, label: 'Altura (px)', min: 24, max: 2400 },
  editorX: { type: 'number' as const, label: 'Posição X (px)', min: 0, max: 2400 },
  editorY: { type: 'number' as const, label: 'Posição Y (px)', min: 0, max: 4000 },
  resetLayout: resetLayoutField,
  responsive: responsiveField,
};

function studioStyle(props: StudioLayout, base: CSSProperties = {}): CSSProperties {
  const position = props.editorPosition === 'absolute' ? 'absolute' : 'relative';
  const layout: CSSProperties = {
    boxSizing: 'border-box',
    position,
    ...(props.editorPosition === 'absolute' ? {
      left: Math.max(0, props.editorX || 0),
      top: Math.max(0, props.editorY || 0),
      margin: 0,
      zIndex: 2,
    } : {}),
    ...(props.editorWidth ? { width: `${props.editorWidth}px`, maxWidth: '100%' } : {}),
    ...(props.editorHeight ? { minHeight: `${props.editorHeight}px` } : {}),
    ...base,
  };

  return { ...layout, ...responsiveStyleVariables(props, props.responsive, layout) };
}

function StudioFrame({ props, className, style, children, shrinkWrap = false }: {
  props: StudioLayout;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
  shrinkWrap?: boolean;
}) {
  return (
    <div
      className={`page-builder-responsive page-builder-free-widget studio-widget ${className}`}
      data-editor-shrink-wrap={shrinkWrap ? 'true' : undefined}
      style={studioStyle(props, style)}
    >
      {children}
    </div>
  );
}

function mediaField(label: string) {
  return {
    type: 'custom' as const,
    label,
    render: ({ value, onChange }: { value?: string; onChange: (value: string) => void }) => (
      <div className="puck-media-field">
        <input value={value || ''} placeholder="https://..." onChange={event => onChange(event.target.value)} />
        <input
          type="file"
          accept="image/*,video/*"
          onChange={async event => {
            const file = event.target.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append('file', file);
            const response = await fetch('/api/admin/storage/upload', { method: 'POST', body: form });
            const result = await response.json() as { url?: string };
            if (response.ok && result.url) onChange(result.url);
          }}
        />
      </div>
    ),
  };
}

function videoEmbedUrl(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host.endsWith('youtube.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      const id = url.searchParams.get('v') || (parts[0] === 'shorts' || parts[0] === 'embed' ? parts[1] : undefined);
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).find(part => /^\d+$/.test(part));
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

const studioComponents = {
  Divider: {
    label: 'Divisor',
    fields: {
      color: selectField('Cor', Object.keys(themes)),
      thickness: { type: 'number' as const, label: 'Espessura (px)', min: 1, max: 20 },
      style: selectField('Estilo', ['solid', 'dashed', 'dotted']),
      width: { type: 'number' as const, label: 'Largura (%)', min: 5, max: 100 },
      align: selectField('Alinhamento', ['left', 'center', 'right']),
      ...layoutFields,
    },
    defaultProps: { color: 'primary', thickness: 1, style: 'solid', width: 100, align: 'center' } as DividerProps,
    render: (props: DividerProps) => {
      const margin = props.align === 'center' ? '0 auto' : props.align === 'right' ? '0 0 0 auto' : '0';
      return <StudioFrame props={props} className="studio-widget-divider" style={{ width: props.editorWidth ? undefined : `${props.width}%` }}><div style={{ width: '100%', borderTop: `${props.thickness}px ${props.style} ${themes[props.color]}`, margin }} /></StudioFrame>;
    },
  },
  Icon: {
    label: 'Ícone / Símbolo',
    fields: {
      icon: textField('Ícone ou emoji'),
      size: { type: 'number' as const, label: 'Tamanho (px)', min: 12, max: 220 },
      color: selectField('Cor', Object.keys(themes)),
      background: selectField('Fundo', Object.keys(themes)),
      shape: selectField('Formato', ['none', 'circle', 'square']),
      ...layoutFields,
    },
    defaultProps: { icon: '✦', size: 42, color: 'primary', background: 'neutral', shape: 'none' } as IconProps,
    render: (props: IconProps) => <StudioFrame props={props} className="studio-widget-icon" shrinkWrap style={{ width: props.editorWidth ? undefined : 'fit-content' }}><span className="studio-widget-icon" aria-hidden="true" style={{ width: props.shape === 'none' ? 'auto' : props.size * 1.55, height: props.shape === 'none' ? 'auto' : props.size * 1.55, borderRadius: props.shape === 'circle' ? '50%' : props.shape === 'square' ? 12 : 0, color: themes[props.color], background: props.shape === 'none' ? 'transparent' : themes[props.background], fontSize: props.size }}>{props.icon}</span></StudioFrame>,
  },
  Badge: {
    label: 'Selo / Badge',
    fields: {
      text: textField('Texto'),
      color: selectField('Cor do texto', Object.keys(themes)),
      background: selectField('Fundo', Object.keys(themes)),
      radius: selectField('Arredondamento', Object.keys(radii)),
      size: selectField('Tamanho', ['sm', 'md', 'lg']),
      ...layoutFields,
    },
    defaultProps: { text: 'Novo', color: 'white', background: 'primary', radius: 'pill', size: 'md' } as BadgeProps,
    render: (props: BadgeProps) => <StudioFrame props={props} className="studio-widget-badge" shrinkWrap style={{ width: props.editorWidth ? undefined : 'fit-content' }}><span className="studio-widget-badge" style={{ color: themes[props.color], background: themes[props.background], borderRadius: radii[props.radius], padding: props.size === 'sm' ? '5px 9px' : props.size === 'lg' ? '10px 16px' : '7px 12px', fontSize: props.size === 'sm' ? 11 : props.size === 'lg' ? 15 : 13 }}>{props.text}</span></StudioFrame>,
  },
  List: {
    label: 'Lista',
    fields: {
      items: textField('Itens, um por linha', true),
      ordered: boolField('Lista numerada'),
      color: selectField('Cor', Object.keys(themes)),
      size: selectField('Tamanho', ['sm', 'md', 'lg']),
      ...layoutFields,
    },
    defaultProps: { items: 'Primeiro item\nSegundo item\nTerceiro item', ordered: false, color: 'secondary', size: 'md' } as ListProps,
    render: (props: ListProps) => {
      const items = props.items.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
      const Tag = props.ordered ? 'ol' : 'ul';
      return <StudioFrame props={props} className="studio-widget-list"><Tag className="studio-widget-list" style={{ color: themes[props.color], fontSize: props.size === 'sm' ? 14 : props.size === 'lg' ? 20 : 16 }}>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</Tag></StudioFrame>;
    },
  },
  Card: {
    label: 'Card',
    fields: {
      image: mediaField('Imagem'),
      title: textField('Título'),
      text: textField('Texto', true),
      url: textField('Link'),
      buttonText: textField('Texto do botão'),
      theme: selectField('Tema', Object.keys(themes)),
      radius: selectField('Arredondamento', Object.keys(radii)),
      shadow: boolField('Sombra'),
      ...layoutFields,
    },
    defaultProps: { image: '', title: 'Título do card', text: 'Use este card para destacar um serviço, benefício ou chamada.', url: '', buttonText: 'Saiba mais', theme: 'white', radius: 'md', shadow: true } as CardProps,
    render: (props: CardProps) => <StudioFrame props={props} className="studio-widget-card" style={{ background: themes[props.theme], borderRadius: radii[props.radius], boxShadow: props.shadow ? '0 14px 34px rgba(23,49,66,.12)' : 'none' }}>
      {props.image ? <img src={props.image} alt="" /> : null}
      <div className="studio-widget-card-body">
        <h3>{props.title}</h3>
        <p>{props.text}</p>
        {props.url ? <a href={props.url}>{props.buttonText || 'Saiba mais'}</a> : null}
      </div>
    </StudioFrame>,
  },
  Quote: {
    label: 'Depoimento / Citação',
    fields: {
      quote: textField('Citação', true),
      author: textField('Autor'),
      role: textField('Identificação'),
      align: selectField('Alinhamento', ['left', 'center', 'right']),
      accent: selectField('Cor de destaque', Object.keys(themes)),
      ...layoutFields,
    },
    defaultProps: { quote: 'Um atendimento que transmite confiança em cada etapa.', author: 'Nome do cliente', role: 'Cliente Odontoart', align: 'left', accent: 'primary' } as QuoteProps,
    render: (props: QuoteProps) => <StudioFrame props={props} className="studio-widget-quote" style={{ textAlign: props.align, borderLeftColor: themes[props.accent] }}><blockquote>“{props.quote}”</blockquote><cite><strong>{props.author}</strong>{props.role ? ` · ${props.role}` : ''}</cite></StudioFrame>,
  },
  Stat: {
    label: 'Número / Indicador',
    fields: {
      value: textField('Valor'),
      prefix: textField('Prefixo'),
      suffix: textField('Sufixo'),
      label: textField('Legenda'),
      accent: selectField('Cor', Object.keys(themes)),
      align: selectField('Alinhamento', ['left', 'center', 'right']),
      ...layoutFields,
    },
    defaultProps: { value: '4.000', prefix: '+', suffix: '', label: 'profissionais credenciados', accent: 'primary', align: 'left' } as StatProps,
    render: (props: StatProps) => <StudioFrame props={props} className="studio-widget-stat" style={{ textAlign: props.align }}><strong style={{ color: themes[props.accent] }}>{props.prefix}{props.value}{props.suffix}</strong><span>{props.label}</span></StudioFrame>,
  },
  Accordion: {
    label: 'Acordeão',
    fields: {
      title: textField('Título'),
      content: textField('Conteúdo', true),
      open: boolField('Aberto inicialmente'),
      ...layoutFields,
    },
    defaultProps: { title: 'Pergunta frequente', content: 'Escreva aqui a resposta ou conteúdo expansível.', open: false } as AccordionProps,
    render: (props: AccordionProps) => <StudioFrame props={props} className="studio-widget-accordion"><details className="studio-widget-accordion" open={props.open}><summary>{props.title}</summary><div>{props.content}</div></details></StudioFrame>,
  },
  Video: {
    label: 'Vídeo',
    fields: {
      src: mediaField('URL ou arquivo'),
      title: textField('Título acessível'),
      height: { type: 'number' as const, label: 'Altura (px)', min: 160, max: 1200 },
      rounded: boolField('Cantos arredondados'),
      ...layoutFields,
    },
    defaultProps: { src: '', title: 'Vídeo', height: 420, rounded: true } as VideoProps,
    render: (props: VideoProps) => {
      const embed = videoEmbedUrl(props.src);
      return <StudioFrame props={props} className="studio-widget-video" style={{ minHeight: props.editorHeight || props.height, borderRadius: props.rounded ? 12 : 0 }}>
        {embed ? <iframe src={embed} title={props.title || 'Vídeo'} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : props.src ? <video src={props.src} title={props.title} controls playsInline /> : <div className="odontoart-widget-placeholder">Informe uma URL do YouTube, Vimeo ou um arquivo de vídeo</div>}
      </StudioFrame>;
    },
  },
  Embed: {
    label: 'Embed / Iframe',
    fields: {
      url: textField('URL'),
      title: textField('Título acessível'),
      height: { type: 'number' as const, label: 'Altura (px)', min: 120, max: 1400 },
      ...layoutFields,
    },
    defaultProps: { url: '', title: 'Conteúdo incorporado', height: 420 } as EmbedProps,
    render: (props: EmbedProps) => <StudioFrame props={props} className="studio-widget-embed" style={{ minHeight: props.editorHeight || props.height }}>{props.url ? <iframe src={props.url} title={props.title || 'Conteúdo incorporado'} loading="lazy" allowFullScreen /> : <div className="odontoart-widget-placeholder">Informe a URL do conteúdo incorporado</div>}</StudioFrame>,
  },
  SocialLinks: {
    label: 'Redes sociais',
    fields: {
      instagram: textField('Instagram'),
      facebook: textField('Facebook'),
      linkedin: textField('LinkedIn'),
      whatsapp: textField('WhatsApp'),
      align: selectField('Alinhamento', ['left', 'center', 'right']),
      ...layoutFields,
    },
    defaultProps: { instagram: '', facebook: '', linkedin: '', whatsapp: '', align: 'left' } as SocialLinksProps,
    render: (props: SocialLinksProps) => {
      const links = [
        ['Instagram', props.instagram],
        ['Facebook', props.facebook],
        ['LinkedIn', props.linkedin],
        ['WhatsApp', props.whatsapp],
      ].filter((entry): entry is [string, string] => Boolean(entry[1]));
      return <StudioFrame props={props} className="studio-widget-social"><div className="studio-widget-social" style={{ justifyContent: props.align === 'center' ? 'center' : props.align === 'right' ? 'flex-end' : 'flex-start' }}>{links.length ? links.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer">{label}</a>) : <span>Adicione os links das redes sociais</span>}</div></StudioFrame>;
    },
  },
};

export const studioWidgetNames = Object.keys(studioComponents);

function extendSlotAllows(component: unknown): unknown {
  if (!component || typeof component !== 'object') return component;
  const typed = component as { fields?: Record<string, unknown> };
  if (!typed.fields) return component;

  const fields = Object.fromEntries(Object.entries(typed.fields).map(([key, value]) => {
    if (!value || typeof value !== 'object') return [key, value];
    const field = value as { type?: unknown; allow?: unknown };
    if (field.type !== 'slot' || !Array.isArray(field.allow)) return [key, value];
    return [key, { ...field, allow: Array.from(new Set([...field.allow, ...studioWidgetNames])) }];
  }));

  return { ...(component as Record<string, unknown>), fields };
}

const baseComponents = Object.fromEntries(
  Object.entries(puckConfig.components as Record<string, unknown>).map(([name, component]) => [name, extendSlotAllows(component)]),
);

const baseCategories = (puckConfig.categories || {}) as Record<string, { title?: string; components?: string[]; defaultExpanded?: boolean; visible?: boolean }>;

export const studioPuckConfig = {
  ...puckConfig,
  categories: {
    ...baseCategories,
    content: {
      ...baseCategories.content,
      title: baseCategories.content?.title || 'Conteúdo',
      components: Array.from(new Set([...(baseCategories.content?.components || []), 'Divider', 'Icon', 'Badge', 'List'])),
    },
    media: {
      ...baseCategories.media,
      title: baseCategories.media?.title || 'Mídia',
      components: Array.from(new Set([...(baseCategories.media?.components || []), 'Video', 'Embed'])),
    },
    marketing: {
      title: 'Marketing',
      components: ['Card', 'Quote', 'Stat', 'Accordion', 'SocialLinks'],
    },
  },
  components: {
    ...baseComponents,
    ...studioComponents,
  },
} as unknown as Config<any>;
