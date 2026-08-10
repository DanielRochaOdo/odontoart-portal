'use client';

import { createUsePuck } from '@puckeditor/core';
import { useEffect, useState, type ChangeEvent } from 'react';
import {
  getResponsiveBreakpoint,
  normalizeResponsiveOverrides,
  responsiveBreakpoints,
  type ResponsiveBreakpoint,
  type ResponsiveLayoutValues,
  type ResponsiveOverrides,
} from '../responsive';

const useResponsiveFieldPuck = createUsePuck();
const parentTypes = new Set(['Section', 'Container', 'Div']);
const labels: Record<ResponsiveBreakpoint, string> = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };

function toNumber(event: ChangeEvent<HTMLInputElement>): number | undefined {
  if (!event.target.value) return undefined;
  const value = Number(event.target.value);
  return Number.isFinite(value) ? value : undefined;
}

export default function ResponsiveLayoutField({
  value,
  onChange,
}: {
  value: ResponsiveOverrides | undefined;
  onChange: (value: ResponsiveOverrides | undefined) => void;
}) {
  const selectedType = useResponsiveFieldPuck(state => state.selectedItem?.type);
  const viewportWidth = useResponsiveFieldPuck(state => state.appState.ui.viewports.current.width);
  const [active, setActive] = useState<ResponsiveBreakpoint>(getResponsiveBreakpoint(viewportWidth));
  const overrides = normalizeResponsiveOverrides(value);
  const current = overrides[active] || {};
  const isParent = typeof selectedType === 'string' && parentTypes.has(selectedType);

  useEffect(() => {
    setActive(getResponsiveBreakpoint(viewportWidth));
  }, [viewportWidth]);

  const update = (patch: ResponsiveLayoutValues) => {
    const next = { ...overrides };
    const layout = { ...current };
    for (const [key, patchValue] of Object.entries(patch)) {
      if (patchValue === undefined) delete layout[key as keyof ResponsiveLayoutValues];
      else layout[key as keyof ResponsiveLayoutValues] = patchValue as never;
    }
    if (Object.keys(layout).length) next[active] = layout;
    else delete next[active];
    onChange(Object.keys(next).length ? next : undefined);
  };

  const updateNumber = (key: 'editorWidth' | 'editorHeight' | 'editorX' | 'editorY' | 'layoutGap', event: ChangeEvent<HTMLInputElement>) => {
    update({ [key]: toNumber(event) });
  };

  return (
    <div className="responsive-layout-field">
      <div className="responsive-layout-tabs" role="tablist" aria-label="Versão responsiva">
        {responsiveBreakpoints.map(breakpoint => (
          <button
            key={breakpoint}
            type="button"
            role="tab"
            aria-selected={active === breakpoint}
            className={active === breakpoint ? 'is-active' : undefined}
            onClick={() => setActive(breakpoint)}
          >
            {labels[breakpoint]}
          </button>
        ))}
      </div>
      <p className="responsive-layout-help">
        O Studio adapta automaticamente largura, posição e layouts horizontais. Preencha abaixo somente quando quiser substituir a adaptação automática neste dispositivo.
      </p>
      <label className="responsive-layout-check">
        <input
          type="checkbox"
          checked={Boolean(overrides[active])}
          onChange={event => {
            if (event.target.checked) {
              onChange({ ...overrides, [active]: { ...current } });
            } else {
              const next = { ...overrides };
              delete next[active];
              onChange(Object.keys(next).length ? next : undefined);
            }
          }}
        />
        <span>Usar ajuste manual em {labels[active]}</span>
      </label>
      <div className="responsive-layout-grid">
        <label>
          <span>Posição</span>
          <select value={current.editorPosition || ''} onChange={event => update({ editorPosition: event.target.value ? event.target.value as 'flow' | 'absolute' : undefined })}>
            <option value="">Automático</option>
            <option value="flow">Fluxo normal</option>
            <option value="absolute">Livre no pai</option>
          </select>
        </label>
        <label>
          <span>Largura (px)</span>
          <input type="number" min={40} max={2400} value={current.editorWidth ?? ''} placeholder="Automática" onChange={event => updateNumber('editorWidth', event)} />
        </label>
        <label>
          <span>Altura (px)</span>
          <input type="number" min={24} max={2400} value={current.editorHeight ?? ''} placeholder="Automática" onChange={event => updateNumber('editorHeight', event)} />
        </label>
        <label>
          <span>Posição X (px)</span>
          <input type="number" min={0} max={2400} value={current.editorX ?? ''} placeholder="Automática" onChange={event => updateNumber('editorX', event)} />
        </label>
        <label>
          <span>Posição Y (px)</span>
          <input type="number" min={0} max={4000} value={current.editorY ?? ''} placeholder="Automática" onChange={event => updateNumber('editorY', event)} />
        </label>
        {isParent ? (
          <>
            <label>
              <span>Direção</span>
              <select value={current.layoutDirection || ''} onChange={event => update({ layoutDirection: event.target.value ? event.target.value as 'column' | 'row' : undefined })}>
                <option value="">Automática</option>
                <option value="column">Vertical</option>
                <option value="row">Horizontal</option>
              </select>
            </label>
            <label>
              <span>Quebra de linha</span>
              <select value={current.layoutWrap || ''} onChange={event => update({ layoutWrap: event.target.value ? event.target.value as 'nowrap' | 'wrap' : undefined })}>
                <option value="">Automática</option>
                <option value="nowrap">Não quebrar</option>
                <option value="wrap">Quebrar</option>
              </select>
            </label>
            <label>
              <span>Distribuição</span>
              <select value={current.layoutJustify || ''} onChange={event => update({ layoutJustify: event.target.value ? event.target.value as ResponsiveLayoutValues['layoutJustify'] : undefined })}>
                <option value="">Automática</option>
                <option value="start">Início</option>
                <option value="center">Centro</option>
                <option value="end">Fim</option>
                <option value="space-between">Espaço entre</option>
              </select>
            </label>
            <label>
              <span>Alinhamento</span>
              <select value={current.layoutAlignItems || ''} onChange={event => update({ layoutAlignItems: event.target.value ? event.target.value as ResponsiveLayoutValues['layoutAlignItems'] : undefined })}>
                <option value="">Automático</option>
                <option value="start">Início</option>
                <option value="center">Centro</option>
                <option value="end">Fim</option>
                <option value="stretch">Esticar</option>
              </select>
            </label>
            <label>
              <span>Gap (px)</span>
              <input type="number" min={0} max={240} value={current.layoutGap ?? ''} placeholder="Automático" onChange={event => updateNumber('layoutGap', event)} />
            </label>
          </>
        ) : null}
      </div>
      <button
        type="button"
        className="responsive-layout-clear"
        disabled={!overrides[active]}
        onClick={() => {
          const next = { ...overrides };
          delete next[active];
          onChange(Object.keys(next).length ? next : undefined);
        }}
      >
        Voltar ao responsivo automático em {labels[active]}
      </button>
    </div>
  );
}
