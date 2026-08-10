'use client';

import { createUsePuck } from '@puckeditor/core';
import { useEffect, useState, type ReactNode } from 'react';

type PanelTab = 'content' | 'style' | 'advanced';

const useElementorFieldsPuck = createUsePuck();

export function getElementorFieldGroup(label: string): PanelTab {
  const normalized = label.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (
    normalized.includes('posicao') ||
    normalized.includes('deslocamento') ||
    normalized.includes('dimensoes e posicao') ||
    normalized.includes('modo avancado') ||
    normalized === 'javascript' ||
    normalized === 'html' ||
    normalized === 'css' ||
    normalized.includes('titulo acessivel')
  ) {
    return 'advanced';
  }

  if (
    normalized.includes('fundo') ||
    normalized.includes('espacamento') ||
    normalized.includes('tamanho') ||
    normalized.includes('cor') ||
    normalized.includes('largura') ||
    normalized.includes('altura') ||
    normalized.includes('arredondamento') ||
    normalized.includes('raio') ||
    normalized.includes('borda') ||
    normalized.includes('alinhamento') ||
    normalized.includes('proporcao') ||
    normalized.includes('object fit') ||
    normalized.includes('variante') ||
    normalized.includes('destino') ||
    normalized.includes('direcao dos elementos') ||
    normalized.includes('quebra de linha') ||
    normalized.includes('distribuicao') ||
    normalized.includes('alinhamento dos itens') ||
    normalized.includes('gap entre elementos') ||
    normalized.includes('responsividade')
  ) {
    return 'style';
  }

  return 'content';
}

export default function ElementorFields({ children, isLoading }: { children: ReactNode; isLoading: boolean }) {
  const selectedId = useElementorFieldsPuck(state => state.selectedItem?.props.id);
  const [activeTab, setActiveTab] = useState<PanelTab>('content');

  useEffect(() => {
    setActiveTab('content');
  }, [selectedId]);

  return (
    <section
      className="elementor-fields-panel"
      data-elementor-active-tab={activeTab}
      aria-busy={isLoading || undefined}
    >
      <div className="elementor-fields-tabs" role="tablist" aria-label="Propriedades do elemento">
        {([
          ['content', 'Conteúdo'],
          ['style', 'Estilo'],
          ['advanced', 'Avançado'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            className={activeTab === value ? 'is-active' : undefined}
            onClick={() => setActiveTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="elementor-fields-body">{children}</div>
    </section>
  );
}
