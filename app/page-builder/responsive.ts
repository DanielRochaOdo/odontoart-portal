import type { CSSProperties } from 'react';

export const responsiveBreakpoints = ['desktop', 'tablet', 'mobile'] as const;
export type ResponsiveBreakpoint = (typeof responsiveBreakpoints)[number];

export type ResponsiveLayoutValues = {
  editorWidth?: number;
  editorHeight?: number;
  editorPosition?: 'flow' | 'absolute';
  editorX?: number;
  editorY?: number;
  layoutDirection?: 'column' | 'row';
  layoutWrap?: 'nowrap' | 'wrap';
  layoutJustify?: 'start' | 'center' | 'end' | 'space-between';
  layoutAlignItems?: 'start' | 'center' | 'end' | 'stretch';
  layoutGap?: number;
};

export type ResponsiveOverrides = Partial<Record<ResponsiveBreakpoint, ResponsiveLayoutValues>>;
export type ResponsiveProps = { responsive?: ResponsiveOverrides };

const layoutKeys = [
  'editorWidth',
  'editorHeight',
  'editorPosition',
  'editorX',
  'editorY',
  'layoutDirection',
  'layoutWrap',
  'layoutJustify',
  'layoutAlignItems',
  'layoutGap',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringValue<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  return typeof value === 'string' && options.includes(value as T) ? value as T : undefined;
}

export function normalizeResponsiveLayout(value: unknown): ResponsiveLayoutValues {
  if (!isRecord(value)) return {};

  const layout: ResponsiveLayoutValues = {};
  const width = numberValue(value.editorWidth);
  const height = numberValue(value.editorHeight);
  const x = numberValue(value.editorX);
  const y = numberValue(value.editorY);
  const gap = numberValue(value.layoutGap);
  const position = stringValue(value.editorPosition, ['flow', 'absolute'] as const);
  const direction = stringValue(value.layoutDirection, ['column', 'row'] as const);
  const wrap = stringValue(value.layoutWrap, ['nowrap', 'wrap'] as const);
  const justify = stringValue(value.layoutJustify, ['start', 'center', 'end', 'space-between'] as const);
  const alignItems = stringValue(value.layoutAlignItems, ['start', 'center', 'end', 'stretch'] as const);

  if (width !== undefined) layout.editorWidth = width;
  if (height !== undefined) layout.editorHeight = height;
  if (position !== undefined) layout.editorPosition = position;
  if (x !== undefined) layout.editorX = x;
  if (y !== undefined) layout.editorY = y;
  if (direction !== undefined) layout.layoutDirection = direction;
  if (wrap !== undefined) layout.layoutWrap = wrap;
  if (justify !== undefined) layout.layoutJustify = justify;
  if (alignItems !== undefined) layout.layoutAlignItems = alignItems;
  if (gap !== undefined) layout.layoutGap = gap;

  return layout;
}

export function normalizeResponsiveOverrides(value: unknown): ResponsiveOverrides {
  if (!isRecord(value)) return {};

  const overrides: ResponsiveOverrides = {};
  for (const breakpoint of responsiveBreakpoints) {
    if (!isRecord(value[breakpoint])) continue;
    const layout = normalizeResponsiveLayout(value[breakpoint]);
    overrides[breakpoint] = layout;
  }
  return overrides;
}

export function getResponsiveBreakpoint(width: number | '100%'): ResponsiveBreakpoint {
  if (width !== '100%' && width <= 767) return 'mobile';
  if (width !== '100%' && width <= 1023) return 'tablet';
  return 'desktop';
}

export function resolveResponsiveLayout(props: Record<string, unknown>, width: number | '100%'): ResponsiveLayoutValues {
  const base = normalizeResponsiveLayout(props);
  const breakpoint = getResponsiveBreakpoint(width);
  const overrides = normalizeResponsiveOverrides(props.responsive);
  return { ...base, ...(overrides[breakpoint] || {}) };
}

export function updateResponsiveLayout(
  props: Record<string, unknown>,
  breakpoint: ResponsiveBreakpoint,
  patch: ResponsiveLayoutValues,
): Record<string, unknown> {
  if (breakpoint === 'desktop') return { ...props, ...patch };

  const overrides = normalizeResponsiveOverrides(props.responsive);
  const current = overrides[breakpoint] || {};
  const nextLayout = { ...current, ...patch };
  return {
    ...props,
    responsive: {
      ...overrides,
      [breakpoint]: nextLayout,
    },
  };
}

function cssValue(value: unknown, fallback: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) return `${value}px`;
  return typeof value === 'string' && value ? value : fallback;
}

function positionValue(value: unknown, fallback: string): string {
  if (value === 'absolute') return 'absolute';
  if (value === 'flow') return 'relative';
  return fallback;
}

function setVariable(target: Record<string, string>, name: string, value: unknown, fallback: string) {
  target[name] = cssValue(value, fallback);
}

export function responsiveStyleVariables(
  props: ResponsiveLayoutValues,
  overridesValue: unknown,
  style: CSSProperties,
): CSSProperties {
  const overrides = normalizeResponsiveOverrides(overridesValue);
  const basePosition = positionValue(props.editorPosition, positionValue(style.position, 'relative'));
  const baseLeft = props.editorPosition === 'absolute' ? cssValue(props.editorX, cssValue(style.left, 'auto')) : 'auto';
  const baseTop = props.editorPosition === 'absolute' ? cssValue(props.editorY, cssValue(style.top, 'auto')) : 'auto';
  const baseWidth = props.editorWidth !== undefined ? cssValue(props.editorWidth, 'auto') : cssValue(style.width, 'auto');
  const baseHeight = cssValue(style.height, 'auto');
  const baseMinHeight = props.editorHeight !== undefined ? cssValue(props.editorHeight, 'auto') : cssValue(style.minHeight, 'auto');
  const baseMaxWidth = cssValue(style.maxWidth, '100%');
  const baseDirection = cssValue(style.flexDirection, 'row');
  const baseWrap = cssValue(style.flexWrap, 'nowrap');
  const baseJustify = cssValue(style.justifyContent, 'flex-start');
  const baseAlignItems = cssValue(style.alignItems, 'stretch');
  const baseGap = cssValue(style.gap, '0px');
  const variables: Record<string, string> = {};

  variables['--pb-base-position'] = basePosition;
  variables['--pb-base-left'] = baseLeft;
  variables['--pb-base-top'] = baseTop;
  variables['--pb-base-width'] = baseWidth;
  variables['--pb-base-height'] = baseHeight;
  variables['--pb-base-min-height'] = baseMinHeight;
  variables['--pb-base-max-width'] = baseMaxWidth;
  variables['--pb-base-direction'] = baseDirection;
  variables['--pb-base-wrap'] = baseWrap;
  variables['--pb-base-justify'] = baseJustify;
  variables['--pb-base-align-items'] = baseAlignItems;
  variables['--pb-base-gap'] = baseGap;

  for (const breakpoint of responsiveBreakpoints) {
    const override = overrides[breakpoint];
    if (!override) continue;
    const prefix = `--pb-${breakpoint}`;
    if (override.editorPosition) {
      variables[`${prefix}-position`] = positionValue(override.editorPosition, basePosition);
      if (override.editorPosition === 'flow') {
        variables[`${prefix}-left`] = 'auto';
        variables[`${prefix}-top`] = 'auto';
      }
    }
    if (override.editorX !== undefined) setVariable(variables, `${prefix}-left`, override.editorX, baseLeft);
    if (override.editorY !== undefined) setVariable(variables, `${prefix}-top`, override.editorY, baseTop);
    if (override.editorWidth !== undefined) setVariable(variables, `${prefix}-width`, override.editorWidth, baseWidth);
    if (override.editorHeight !== undefined) {
      setVariable(variables, `${prefix}-height`, override.editorHeight, baseHeight);
      setVariable(variables, `${prefix}-min-height`, override.editorHeight, baseMinHeight);
    }
    if (override.layoutDirection) variables[`${prefix}-direction`] = override.layoutDirection === 'row' ? 'row' : 'column';
    if (override.layoutWrap) variables[`${prefix}-wrap`] = override.layoutWrap;
    if (override.layoutJustify) variables[`${prefix}-justify`] = override.layoutJustify === 'end' ? 'flex-end' : override.layoutJustify === 'space-between' ? 'space-between' : override.layoutJustify === 'center' ? 'center' : 'flex-start';
    if (override.layoutAlignItems) variables[`${prefix}-align-items`] = override.layoutAlignItems === 'start' ? 'flex-start' : override.layoutAlignItems === 'end' ? 'flex-end' : override.layoutAlignItems;
    if (override.layoutGap !== undefined) setVariable(variables, `${prefix}-gap`, override.layoutGap, baseGap);
  }

  return variables as CSSProperties;
}

export function responsiveLayoutKeys(): readonly string[] {
  return layoutKeys;
}
