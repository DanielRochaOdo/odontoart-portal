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

const DESKTOP_CANVAS_WIDTH = 1280;
const TABLET_CANVAS_WIDTH = 768;
const MOBILE_CANVAS_WIDTH = 360;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringValue<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  return typeof value === 'string' && options.includes(value as T) ? value as T : undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

export function getAutomaticResponsiveLayout(
  baseValue: ResponsiveLayoutValues,
  width: number | '100%',
): ResponsiveLayoutValues {
  const breakpoint = getResponsiveBreakpoint(width);
  if (breakpoint === 'desktop' || width === '100%') return {};

  const viewportWidth = Math.max(280, width);
  const automatic: ResponsiveLayoutValues = {};
  const isMobile = breakpoint === 'mobile';
  const horizontalPadding = isMobile ? 24 : 32;
  const safeWidth = Math.max(40, viewportWidth - horizontalPadding);

  if (baseValue.editorPosition === 'absolute') {
    automatic.editorPosition = 'absolute';

    const baseWidth = baseValue.editorWidth;
    const fittedWidth = baseWidth === undefined ? undefined : Math.min(baseWidth, safeWidth);
    if (fittedWidth !== undefined && fittedWidth !== baseWidth) automatic.editorWidth = Math.round(fittedWidth);

    const scaleX = Math.min(1, viewportWidth / DESKTOP_CANVAS_WIDTH);
    const effectiveWidth = fittedWidth ?? baseWidth ?? 0;
    const maxX = effectiveWidth > 0
      ? Math.max(0, viewportWidth - Math.round(horizontalPadding / 2) - effectiveWidth)
      : Math.max(0, viewportWidth - Math.round(horizontalPadding / 2));

    if (baseValue.editorX !== undefined) {
      automatic.editorX = Math.round(clamp(baseValue.editorX * scaleX, 0, maxX));
    }

    if (baseValue.editorY !== undefined) {
      const verticalScale = isMobile ? 0.72 : 0.88;
      automatic.editorY = Math.max(0, Math.round(baseValue.editorY * verticalScale));
    }
  } else if (baseValue.editorWidth !== undefined && baseValue.editorWidth > safeWidth) {
    automatic.editorWidth = Math.round(safeWidth);
  }

  if (baseValue.layoutDirection === 'row') {
    if (isMobile) {
      automatic.layoutDirection = 'column';
      automatic.layoutWrap = 'nowrap';
      automatic.layoutJustify = 'start';
      automatic.layoutAlignItems = 'stretch';
    } else {
      automatic.layoutWrap = 'wrap';
    }
  }

  if (baseValue.layoutGap !== undefined) {
    const maxGap = isMobile ? 24 : 48;
    if (baseValue.layoutGap > maxGap) automatic.layoutGap = maxGap;
  }

  return automatic;
}

export function resolveResponsiveLayout(props: Record<string, unknown>, width: number | '100%'): ResponsiveLayoutValues {
  const base = normalizeResponsiveLayout(props);
  const breakpoint = getResponsiveBreakpoint(width);
  const overrides = normalizeResponsiveOverrides(props.responsive);
  const automatic = getAutomaticResponsiveLayout(base, width);
  return { ...base, ...automatic, ...(overrides[breakpoint] || {}) };
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

function justifyValue(value: ResponsiveLayoutValues['layoutJustify'], fallback: string) {
  if (value === 'end') return 'flex-end';
  if (value === 'space-between') return 'space-between';
  if (value === 'center') return 'center';
  if (value === 'start') return 'flex-start';
  return fallback;
}

function alignValue(value: ResponsiveLayoutValues['layoutAlignItems'], fallback: string) {
  if (value === 'start') return 'flex-start';
  if (value === 'end') return 'flex-end';
  return value || fallback;
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

  const targets: Array<[Exclude<ResponsiveBreakpoint, 'desktop'>, number]> = [
    ['tablet', TABLET_CANVAS_WIDTH],
    ['mobile', MOBILE_CANVAS_WIDTH],
  ];

  for (const [breakpoint, targetWidth] of targets) {
    const prefix = `--pb-${breakpoint}`;
    const automatic = getAutomaticResponsiveLayout(props, targetWidth);
    const resolved = { ...automatic, ...(overrides[breakpoint] || {}) };

    if (resolved.editorPosition) {
      variables[`${prefix}-position`] = positionValue(resolved.editorPosition, basePosition);
      if (resolved.editorPosition === 'flow') {
        variables[`${prefix}-left`] = 'auto';
        variables[`${prefix}-top`] = 'auto';
      }
    }
    if (resolved.editorX !== undefined) setVariable(variables, `${prefix}-left`, resolved.editorX, baseLeft);
    if (resolved.editorY !== undefined) setVariable(variables, `${prefix}-top`, resolved.editorY, baseTop);
    if (resolved.editorWidth !== undefined) setVariable(variables, `${prefix}-width`, resolved.editorWidth, baseWidth);
    if (resolved.editorHeight !== undefined) {
      setVariable(variables, `${prefix}-height`, resolved.editorHeight, baseHeight);
      setVariable(variables, `${prefix}-min-height`, resolved.editorHeight, baseMinHeight);
    }
    if (resolved.layoutDirection) variables[`${prefix}-direction`] = resolved.layoutDirection === 'row' ? 'row' : 'column';
    if (resolved.layoutWrap) variables[`${prefix}-wrap`] = resolved.layoutWrap;
    if (resolved.layoutJustify) variables[`${prefix}-justify`] = justifyValue(resolved.layoutJustify, baseJustify);
    if (resolved.layoutAlignItems) variables[`${prefix}-align-items`] = alignValue(resolved.layoutAlignItems, baseAlignItems);
    if (resolved.layoutGap !== undefined) setVariable(variables, `${prefix}-gap`, resolved.layoutGap, baseGap);
  }

  const desktopOverride = overrides.desktop;
  if (desktopOverride) {
    if (desktopOverride.editorPosition) {
      variables['--pb-base-position'] = positionValue(desktopOverride.editorPosition, basePosition);
      if (desktopOverride.editorPosition === 'flow') {
        variables['--pb-base-left'] = 'auto';
        variables['--pb-base-top'] = 'auto';
      }
    }
    if (desktopOverride.editorX !== undefined) setVariable(variables, '--pb-base-left', desktopOverride.editorX, baseLeft);
    if (desktopOverride.editorY !== undefined) setVariable(variables, '--pb-base-top', desktopOverride.editorY, baseTop);
    if (desktopOverride.editorWidth !== undefined) setVariable(variables, '--pb-base-width', desktopOverride.editorWidth, baseWidth);
    if (desktopOverride.editorHeight !== undefined) {
      setVariable(variables, '--pb-base-height', desktopOverride.editorHeight, baseHeight);
      setVariable(variables, '--pb-base-min-height', desktopOverride.editorHeight, baseMinHeight);
    }
    if (desktopOverride.layoutDirection) variables['--pb-base-direction'] = desktopOverride.layoutDirection;
    if (desktopOverride.layoutWrap) variables['--pb-base-wrap'] = desktopOverride.layoutWrap;
    if (desktopOverride.layoutJustify) variables['--pb-base-justify'] = justifyValue(desktopOverride.layoutJustify, baseJustify);
    if (desktopOverride.layoutAlignItems) variables['--pb-base-align-items'] = alignValue(desktopOverride.layoutAlignItems, baseAlignItems);
    if (desktopOverride.layoutGap !== undefined) setVariable(variables, '--pb-base-gap', desktopOverride.layoutGap, baseGap);
  }

  return variables as CSSProperties;
}

export function responsiveLayoutKeys(): readonly string[] {
  return layoutKeys;
}
