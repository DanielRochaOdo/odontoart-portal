import type { CSSProperties } from 'react';

export type AdvancedCodeProps = {
  html: string;
  css: string;
  js: string;
  title: string;
  height: number;
  editorWidth?: number;
  editorHeight?: number;
  editorPosition?: 'flow' | 'absolute';
  editorX?: number;
  editorY?: number;
};

function escapeTagContent(value: string, tag: 'style' | 'script') {
  return value.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);
}

function buildDocument({ html, css, js }: Pick<AdvancedCodeProps, 'html' | 'css' | 'js'>) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${escapeTagContent(css, 'style')}</style></head><body>${html}<script>(() => { try { ${escapeTagContent(js, 'script')} } catch (error) { document.body.insertAdjacentHTML('beforeend', '<pre style="color:#b42318;white-space:pre-wrap">Erro no código JavaScript: ' + String(error) + '</pre>'); } })();</script></body></html>`;
}

export default function AdvancedCode(props: AdvancedCodeProps) {
  const frameStyle = {
    display: 'block',
    width: props.editorWidth ? `${props.editorWidth}px` : '100%',
    maxWidth: '100%',
    height: `${Math.max(120, props.height || 320)}px`,
    minHeight: props.editorHeight ? `${props.editorHeight}px` : undefined,
    border: '1px solid #d7e5e0',
    borderRadius: 8,
    background: '#fff',
    ...(props.editorPosition === 'absolute' ? { position: 'absolute' as const, left: props.editorX || 0, top: props.editorY || 0, margin: 0, zIndex: 2 } : {}),
  } as CSSProperties;

  return <iframe title={props.title || 'Código avançado'} sandbox="allow-scripts" srcDoc={buildDocument(props)} style={frameStyle} />;
}
