'use client';

import { createUsePuck } from '@puckeditor/core';
import { useLayoutEffect, useRef } from 'react';
import type { Data } from '@puckeditor/core';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import {
  getResponsiveBreakpoint,
  resolveResponsiveLayout,
  updateResponsiveLayout,
  type ResponsiveBreakpoint,
  type ResponsiveLayoutValues,
} from '../../page-builder/responsive';

type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
type BuilderNode = { type: string; props: Record<string, unknown> };
type MoveItem = {
  id: string;
  type: string;
  element: HTMLElement;
  parentElement: HTMLElement;
  parentRect: DOMRect;
  rect: DOMRect;
  initialX: number;
  initialY: number;
  width: number;
  height: number;
};
type StudioNudgeDetail = { ids?: string[]; dx?: number; dy?: number };

type ResizeOverlayProps = {
  children: ReactNode;
  isSelected: boolean;
  studioSelected?: boolean;
  isStudioPrimary?: boolean;
  selectedIds?: string[];
  snapEnabled?: boolean;
  componentId: string;
};

const useResizePuck = createUsePuck();
const MIN_WIDTH = 40;
const MIN_HEIGHT = 24;
const SNAP_GRID = 8;
const SNAP_THRESHOLD = 6;
const DEBUG_SELECTION = false;
const STRUCTURAL_TYPES = new Set(['Section', 'Container', 'Columns', 'Table', 'Div']);

function getMoveStartWidth(element: HTMLElement, parentWidth: number, type: string, hasExplicitWidth: boolean) {
  const renderedWidth = Math.max(MIN_WIDTH, Math.round(element.getBoundingClientRect().width));
  if (hasExplicitWidth || !Number.isFinite(parentWidth) || renderedWidth < parentWidth * 0.92 || STRUCTURAL_TYPES.has(type)) {
    return renderedWidth;
  }

  const preferredWidth = type === 'Text' ? 360 : type === 'Heading' ? 420 : 320;
  return Math.max(MIN_WIDTH, Math.min(renderedWidth, parentWidth, preferredWidth));
}

function isBuilderNode(value: unknown): value is BuilderNode {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as BuilderNode).type === 'string' &&
      (value as BuilderNode).props &&
      typeof (value as BuilderNode).props === 'object',
  );
}

function updateValue(
  value: unknown,
  patches: Map<string, ResponsiveLayoutValues>,
  breakpoint: ResponsiveBreakpoint,
): unknown {
  if (Array.isArray(value)) return value.map(item => updateValue(item, patches, breakpoint));
  if (!value || typeof value !== 'object') return value;

  if (isBuilderNode(value)) {
    let props = { ...value.props };
    const id = typeof props.id === 'string' ? props.id : null;
    if (id && patches.has(id)) {
      props = updateResponsiveLayout(props, breakpoint, patches.get(id) || {});
    }
    for (const [key, child] of Object.entries(props)) {
      props[key] = updateValue(child, patches, breakpoint);
    }
    return { ...value, props };
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, updateValue(child, patches, breakpoint)]),
  );
}

function updateData(data: Data, patches: Map<string, ResponsiveLayoutValues>, breakpoint: ResponsiveBreakpoint): Data {
  const next = {
    ...data,
    content: updateValue(data.content, patches, breakpoint) as Data['content'],
  } as Data;

  if ('zones' in data && data.zones) {
    (next as Data & { zones?: unknown }).zones = updateValue(data.zones, patches, breakpoint);
  }

  return next;
}

function findNode(value: unknown, id: string): BuilderNode | null {
  if (Array.isArray(value)) {
    for (const child of value) {
      const match = findNode(child, id);
      if (match) return match;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;

  if (isBuilderNode(value)) {
    if (value.props.id === id) return value;
    for (const child of Object.values(value.props)) {
      const match = findNode(child, id);
      if (match) return match;
    }
    return null;
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    const match = findNode(child, id);
    if (match) return match;
  }
  return null;
}

function findNodeInData(data: Data, id: string) {
  const contentMatch = findNode(data.content, id);
  if (contentMatch) return contentMatch;
  if ('zones' in data && data.zones) return findNode(data.zones, id);
  return null;
}

function asElement(target: EventTarget | null): Element | null {
  if (!target || typeof (target as Element).closest !== 'function') return null;
  return target as Element;
}

function stopOverlayEvent(event: ReactPointerEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function findComponentParent(element: HTMLElement) {
  let parent = element.parentElement;
  while (parent) {
    if (parent.dataset.puckComponent) return parent;
    parent = parent.parentElement;
  }
  return element.parentElement;
}

function getElement(frameDocument: Document, id: string) {
  return frameDocument.querySelector<HTMLElement>(`[data-puck-component="${CSS.escape(id)}"]`);
}

function getTopLevelSelection(frameDocument: Document, ids: string[]) {
  const elements = ids
    .map(id => ({ id, element: getElement(frameDocument, id) }))
    .filter((entry): entry is { id: string; element: HTMLElement } => Boolean(entry.element));

  return elements.filter(entry => !elements.some(other => other.id !== entry.id && other.element.contains(entry.element)));
}

function clearGuides(frameDocument: Document) {
  for (const guide of frameDocument.querySelectorAll('.odontoart-studio-guide, .odontoart-studio-guide-label')) {
    guide.remove();
  }
}

function drawGuide(frameDocument: Document, axis: 'x' | 'y', position: number) {
  const guide = frameDocument.createElement('div');
  guide.className = `odontoart-studio-guide odontoart-studio-guide-${axis}`;
  if (axis === 'x') guide.style.left = `${Math.round(position)}px`;
  else guide.style.top = `${Math.round(position)}px`;
  frameDocument.body.appendChild(guide);
}

function closestSnapAdjustment(moving: number[], targets: number[]) {
  let bestAdjustment: number | null = null;
  let guide: number | null = null;
  for (const source of moving) {
    for (const target of targets) {
      const adjustment = target - source;
      if (Math.abs(adjustment) > SNAP_THRESHOLD) continue;
      if (bestAdjustment === null || Math.abs(adjustment) < Math.abs(bestAdjustment)) {
        bestAdjustment = adjustment;
        guide = target;
      }
    }
  }
  return { adjustment: bestAdjustment, guide };
}

function calculateSnap(
  frameDocument: Document,
  movingRect: DOMRect,
  selectedIds: Set<string>,
  rawDx: number,
  rawDy: number,
) {
  const movingX = [movingRect.left + rawDx, movingRect.left + movingRect.width / 2 + rawDx, movingRect.right + rawDx];
  const movingY = [movingRect.top + rawDy, movingRect.top + movingRect.height / 2 + rawDy, movingRect.bottom + rawDy];
  const targetX: number[] = [];
  const targetY: number[] = [];
  const selectedElements = Array.from(selectedIds).map(id => getElement(frameDocument, id)).filter(Boolean) as HTMLElement[];

  for (const element of frameDocument.querySelectorAll<HTMLElement>('[data-puck-component]')) {
    const id = element.dataset.puckComponent;
    if (!id || selectedIds.has(id) || selectedElements.some(selected => selected.contains(element))) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    targetX.push(rect.left, rect.left + rect.width / 2, rect.right);
    targetY.push(rect.top, rect.top + rect.height / 2, rect.bottom);
  }

  const canvas = frameDocument.querySelector<HTMLElement>('#puck-canvas-root');
  const canvasRect = canvas?.getBoundingClientRect();
  if (canvasRect) {
    targetX.push(canvasRect.left, canvasRect.left + canvasRect.width / 2, canvasRect.right);
    targetY.push(canvasRect.top, canvasRect.bottom);
  }

  const xSnap = closestSnapAdjustment(movingX, targetX);
  const ySnap = closestSnapAdjustment(movingY, targetY);
  let dx = rawDx + (xSnap.adjustment || 0);
  let dy = rawDy + (ySnap.adjustment || 0);
  let xGuide = xSnap.guide;
  let yGuide = ySnap.guide;

  if (canvasRect) {
    const gridLeft = movingRect.left + dx - canvasRect.left;
    const gridTop = movingRect.top + dy - canvasRect.top;
    const gridDx = Math.round(gridLeft / SNAP_GRID) * SNAP_GRID - gridLeft;
    const gridDy = Math.round(gridTop / SNAP_GRID) * SNAP_GRID - gridTop;

    if (Math.abs(gridDx) <= SNAP_THRESHOLD && (xSnap.adjustment === null || Math.abs(gridDx) < Math.abs(xSnap.adjustment))) {
      dx += gridDx;
      xGuide = movingRect.left + dx;
    }
    if (Math.abs(gridDy) <= SNAP_THRESHOLD && (ySnap.adjustment === null || Math.abs(gridDy) < Math.abs(ySnap.adjustment))) {
      dy += gridDy;
      yGuide = movingRect.top + dy;
    }
  }

  clearGuides(frameDocument);
  if (xGuide !== null) drawGuide(frameDocument, 'x', xGuide);
  if (yGuide !== null) drawGuide(frameDocument, 'y', yGuide);
  return { dx, dy };
}

function toOwnerPoint(ownerDocument: Document, moveEvent: PointerEvent | MouseEvent) {
  const ownerWindow = ownerDocument.defaultView;
  const frameElement = ownerWindow?.frameElement as HTMLIFrameElement | null;
  if (!frameElement || moveEvent.view === ownerWindow) {
    return { x: moveEvent.clientX, y: moveEvent.clientY };
  }

  const frameRect = frameElement.getBoundingClientRect();
  const canvasWidth = ownerDocument.documentElement.clientWidth || frameRect.width;
  const canvasHeight = ownerDocument.documentElement.clientHeight || frameRect.height;
  return {
    x: (moveEvent.clientX - frameRect.left) * (canvasWidth / frameRect.width),
    y: (moveEvent.clientY - frameRect.top) * (canvasHeight / frameRect.height),
  };
}

function interactionTargets(ownerDocument: Document) {
  const ownerWindow = ownerDocument.defaultView;
  const frameElement = ownerWindow?.frameElement as HTMLIFrameElement | null;
  const hostDocument = frameElement?.ownerDocument;
  const hostWindow = hostDocument?.defaultView;
  return Array.from(new Set([ownerDocument, ownerWindow, hostDocument, hostWindow].filter(Boolean) as EventTarget[]));
}

export default function ResizeOverlay({
  children,
  isSelected,
  studioSelected = false,
  isStudioPrimary = false,
  selectedIds = [],
  snapEnabled = true,
  componentId,
}: ResizeOverlayProps) {
  const dispatch = useResizePuck(state => state.dispatch);
  const data = useResizePuck(state => state.appState.data);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const activeBreakpointRef = useRef<ResponsiveBreakpoint>('desktop');
  const selectedIdsRef = useRef(selectedIds);
  const snapEnabledRef = useRef(snapEnabled);
  const activePrimary = isStudioPrimary || (!selectedIds.length && isSelected);
  const visualSelected = studioSelected || activePrimary;
  selectedIdsRef.current = selectedIds;
  snapEnabledRef.current = snapEnabled;

  const getActiveBreakpoint = (ownerDocument: Document): ResponsiveBreakpoint => {
    const canvas = ownerDocument.querySelector<HTMLElement>('#puck-canvas-root');
    const width = canvas?.clientWidth || ownerDocument.documentElement.clientWidth || '100%';
    return getResponsiveBreakpoint(width);
  };

  const writePatches = (patches: Map<string, ResponsiveLayoutValues>, recordHistory: boolean) => {
    if (!patches.size) return;
    dispatch({
      type: 'setData',
      recordHistory,
      data: previous => updateData(previous, patches, activeBreakpointRef.current),
    });
  };

  const buildMoveItems = (ownerDocument: Document, ids: string[]) => {
    const breakpointWidth = ownerDocument.querySelector<HTMLElement>('#puck-canvas-root')?.clientWidth || ownerDocument.documentElement.clientWidth || '100%';
    const entries = getTopLevelSelection(ownerDocument, ids);
    const items: MoveItem[] = [];

    for (const { id, element } of entries) {
      const node = findNodeInData(data, id);
      if (!node) continue;
      const parentElement = findComponentParent(element) || element.parentElement;
      if (!parentElement) continue;
      const parentRect = parentElement.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const layout = resolveResponsiveLayout(node.props, breakpointWidth > 0 ? breakpointWidth : '100%');
      const width = getMoveStartWidth(element, parentRect.width, node.type, typeof layout.editorWidth === 'number');
      items.push({
        id,
        type: node.type,
        element,
        parentElement,
        parentRect,
        rect,
        initialX: rect.left - parentRect.left,
        initialY: rect.top - parentRect.top,
        width,
        height: Math.max(MIN_HEIGHT, Math.round(rect.height)),
      });
    }

    return items;
  };

  const startMove = (startX: number, startY: number, ownerDocument: Document, element: HTMLElement) => {
    activeBreakpointRef.current = getActiveBreakpoint(ownerDocument);
    const requestedIds = selectedIdsRef.current.includes(componentId) && selectedIdsRef.current.length
      ? selectedIdsRef.current
      : [componentId];
    const items = buildMoveItems(ownerDocument, requestedIds);
    if (!items.length) return;
    const primary = items.find(item => item.id === componentId) || items[0];
    const targets = interactionTargets(ownerDocument);
    const selectedSet = new Set(items.map(item => item.id));
    let latestDx = 0;
    let latestDy = 0;
    let moved = false;

    for (const item of items) item.element.dataset.studioDragging = 'true';

    const move = (moveEvent: PointerEvent | MouseEvent) => {
      moveEvent.preventDefault();
      const point = toOwnerPoint(ownerDocument, moveEvent);
      const rawDx = point.x - startX;
      const rawDy = point.y - startY;
      const snapped = snapEnabledRef.current
        ? calculateSnap(ownerDocument, primary.rect, selectedSet, rawDx, rawDy)
        : { dx: rawDx, dy: rawDy };
      latestDx = snapped.dx;
      latestDy = snapped.dy;
      moved = moved || Math.abs(latestDx) > 0.5 || Math.abs(latestDy) > 0.5;
      const patches = new Map<string, ResponsiveLayoutValues>();

      for (const item of items) {
        const maxX = Number.isFinite(item.parentRect.width)
          ? Math.max(0, item.parentRect.width - item.width)
          : Number.POSITIVE_INFINITY;
        const nextX = Math.round(Math.max(0, Math.min(maxX, item.initialX + latestDx)));
        const nextY = Math.round(Math.max(0, item.initialY + latestDy));
        patches.set(item.id, {
          editorPosition: 'absolute',
          editorX: nextX,
          editorY: nextY,
          editorWidth: Math.round(item.width),
          editorHeight: Math.round(item.height),
        });
      }
      writePatches(patches, false);
    };

    let finished = false;
    const moveListener = (event: Event) => move(event as PointerEvent | MouseEvent);
    const finish = () => {
      if (finished) return;
      finished = true;
      for (const target of targets) {
        target.removeEventListener('pointermove', moveListener);
        target.removeEventListener('mousemove', moveListener);
        target.removeEventListener('pointerup', finishListener);
        target.removeEventListener('mouseup', finishListener);
        target.removeEventListener('pointercancel', finishListener);
      }
      clearGuides(ownerDocument);
      for (const item of items) delete item.element.dataset.studioDragging;
      if (!moved) return;

      const patches = new Map<string, ResponsiveLayoutValues>();
      for (const item of items) {
        const maxX = Number.isFinite(item.parentRect.width)
          ? Math.max(0, item.parentRect.width - item.width)
          : Number.POSITIVE_INFINITY;
        patches.set(item.id, {
          editorPosition: 'absolute',
          editorX: Math.round(Math.max(0, Math.min(maxX, item.initialX + latestDx))),
          editorY: Math.round(Math.max(0, item.initialY + latestDy)),
          editorWidth: Math.round(item.width),
          editorHeight: Math.round(item.height),
        });
      }
      writePatches(patches, true);
    };
    const finishListener = () => finish();

    for (const target of targets) {
      target.addEventListener('pointermove', moveListener, { passive: false });
      target.addEventListener('mousemove', moveListener, { passive: false });
      target.addEventListener('pointerup', finishListener, { once: true });
      target.addEventListener('mouseup', finishListener, { once: true });
      target.addEventListener('pointercancel', finishListener, { once: true });
    }
  };

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const clearOverlayPosition = () => {
      for (const property of ['position', 'inset', 'left', 'top', 'width', 'height']) {
        surface.style.removeProperty(property);
      }
    };

    if (!visualSelected) {
      clearOverlayPosition();
      return;
    }

    const element = getElement(surface.ownerDocument, componentId);
    if (!element) {
      clearOverlayPosition();
      return;
    }

    const syncOverlayPosition = () => {
      const currentElement = getElement(surface.ownerDocument, componentId);
      if (!currentElement) return;
      const rect = currentElement.getBoundingClientRect();
      surface.style.setProperty('position', 'fixed', 'important');
      surface.style.setProperty('inset', 'auto', 'important');
      surface.style.setProperty('left', `${rect.left}px`, 'important');
      surface.style.setProperty('top', `${rect.top}px`, 'important');
      surface.style.setProperty('width', `${rect.width}px`, 'important');
      surface.style.setProperty('height', `${rect.height}px`, 'important');
    };

    syncOverlayPosition();
    const view = surface.ownerDocument.defaultView;
    const frame = view?.requestAnimationFrame(syncOverlayPosition);
    view?.addEventListener('resize', syncOverlayPosition);
    surface.ownerDocument.addEventListener('scroll', syncOverlayPosition, true);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncOverlayPosition);
    observer?.observe(element);

    return () => {
      if (frame !== undefined) view?.cancelAnimationFrame(frame);
      view?.removeEventListener('resize', syncOverlayPosition);
      surface.ownerDocument.removeEventListener('scroll', syncOverlayPosition, true);
      observer?.disconnect();
      clearOverlayPosition();
    };
  }, [componentId, visualSelected, data]);

  useLayoutEffect(() => {
    if (!visualSelected) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    const element = getElement(surface.ownerDocument, componentId);
    if (!element) return;

    const previousTouchAction = element.style.touchAction;
    element.style.touchAction = 'none';

    const handleElementPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.shiftKey || event.metaKey || event.ctrlKey) return;
      const target = asElement(event.target);
      const eventElement = target || surface.ownerDocument.elementFromPoint(event.clientX, event.clientY);
      const closestComponent = eventElement?.closest<HTMLElement>('[data-puck-component]');
      if (closestComponent?.getAttribute('data-puck-component') !== componentId) return;
      if (eventElement?.closest('.puck-resize-surface, .puck-resize-handle, .puck-move-handle')) return;

      event.preventDefault();
      event.stopPropagation();
      const currentElement = getElement(surface.ownerDocument, componentId);
      if (currentElement) startMove(event.clientX, event.clientY, surface.ownerDocument, currentElement);
    };

    const view = surface.ownerDocument.defaultView;
    view?.addEventListener('pointerdown', handleElementPointerDown, true);
    return () => {
      view?.removeEventListener('pointerdown', handleElementPointerDown, true);
      element.style.touchAction = previousTouchAction;
    };
  }, [componentId, data, visualSelected]);

  useLayoutEffect(() => {
    if (!activePrimary) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    const ownerDocument = surface.ownerDocument;

    const handleNudge = (event: Event) => {
      const detail = (event as CustomEvent<StudioNudgeDetail>).detail;
      const ids = Array.isArray(detail?.ids) && detail.ids.length ? detail.ids : [componentId];
      if (!ids.includes(componentId)) return;
      const dx = Number(detail?.dx) || 0;
      const dy = Number(detail?.dy) || 0;
      if (!dx && !dy) return;
      activeBreakpointRef.current = getActiveBreakpoint(ownerDocument);
      const items = buildMoveItems(ownerDocument, ids);
      const patches = new Map<string, ResponsiveLayoutValues>();

      for (const item of items) {
        const maxX = Number.isFinite(item.parentRect.width)
          ? Math.max(0, item.parentRect.width - item.width)
          : Number.POSITIVE_INFINITY;
        patches.set(item.id, {
          editorPosition: 'absolute',
          editorX: Math.round(Math.max(0, Math.min(maxX, item.initialX + dx))),
          editorY: Math.round(Math.max(0, item.initialY + dy)),
          editorWidth: Math.round(item.width),
          editorHeight: Math.round(item.height),
        });
      }
      writePatches(patches, true);
    };

    ownerDocument.addEventListener('odontoart-studio-nudge', handleNudge);
    return () => ownerDocument.removeEventListener('odontoart-studio-nudge', handleNudge);
  }, [activePrimary, componentId, data]);

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, direction: ResizeDirection) => {
    stopOverlayEvent(event);
    const surface = surfaceRef.current;
    if (!surface) return;

    const ownerDocument = surface.ownerDocument;
    activeBreakpointRef.current = getActiveBreakpoint(ownerDocument);
    const element = getElement(ownerDocument, componentId);
    if (!element) return;
    const node = findNodeInData(data, componentId);
    const parentElement = findComponentParent(element) || element.parentElement;
    if (!parentElement) return;
    const parentRect = parentElement.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    const preserveAspectRatio = node?.type === 'Image';
    const aspectRatio = startWidth / Math.max(MIN_HEIGHT, startHeight);
    const initialX = rect.left - parentRect.left;
    const initialY = rect.top - parentRect.top;
    const startX = event.clientX;
    const startY = event.clientY;
    const maxWidth = Number.isFinite(parentRect.width)
      ? Math.max(MIN_WIDTH, parentRect.width - initialX)
      : Number.POSITIVE_INFINITY;
    let latestWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, Math.round(startWidth)));
    let latestHeight = Math.max(MIN_HEIGHT, Math.round(startHeight));
    let latestX = Math.max(0, Math.round(initialX));
    let latestY = Math.max(0, Math.round(initialY));
    let movedFromFlow = false;
    const targets = interactionTargets(ownerDocument);
    element.dataset.studioResizing = 'true';

    const move = (moveEvent: PointerEvent | MouseEvent) => {
      moveEvent.preventDefault();
      const point = toOwnerPoint(ownerDocument, moveEvent);
      const deltaX = point.x - startX;
      const deltaY = point.y - startY;
      const movingWest = direction.includes('w');
      const movingNorth = direction.includes('n');
      const widthDelta = movingWest ? -deltaX : direction.includes('e') ? deltaX : 0;
      const heightDelta = movingNorth ? -deltaY : direction.includes('s') ? deltaY : 0;
      const nextX = movingWest
        ? Math.max(0, Math.min(initialX + startWidth - MIN_WIDTH, initialX + deltaX))
        : initialX;
      const nextY = movingNorth
        ? Math.max(0, Math.min(initialY + startHeight - MIN_HEIGHT, initialY + deltaY))
        : initialY;
      const widthLimit = movingWest ? initialX + startWidth : maxWidth;

      let nextWidth = Math.min(widthLimit, Math.max(MIN_WIDTH, Math.round(startWidth + widthDelta)));
      let nextHeight = Math.max(MIN_HEIGHT, Math.round(startHeight + heightDelta));

      if (preserveAspectRatio) {
        const horizontalResize = direction.includes('e') || direction.includes('w');
        const verticalResize = direction.includes('n') || direction.includes('s');
        if (horizontalResize && !verticalResize) nextHeight = Math.max(MIN_HEIGHT, Math.round(nextWidth / aspectRatio));
        else if (verticalResize && !horizontalResize) nextWidth = Math.min(widthLimit, Math.max(MIN_WIDTH, Math.round(nextHeight * aspectRatio)));
        else if (horizontalResize && verticalResize) {
          const widthScale = Math.abs(nextWidth - startWidth) / Math.max(1, startWidth);
          const heightScale = Math.abs(nextHeight - startHeight) / Math.max(1, startHeight);
          if (widthScale >= heightScale) nextHeight = Math.max(MIN_HEIGHT, Math.round(nextWidth / aspectRatio));
          else nextWidth = Math.min(widthLimit, Math.max(MIN_WIDTH, Math.round(nextHeight * aspectRatio)));
        }
      } else if (snapEnabledRef.current) {
        nextWidth = Math.max(MIN_WIDTH, Math.round(nextWidth / SNAP_GRID) * SNAP_GRID);
        nextHeight = Math.max(MIN_HEIGHT, Math.round(nextHeight / SNAP_GRID) * SNAP_GRID);
      }

      const finalX = movingWest ? initialX + startWidth - nextWidth : nextX;
      const finalY = movingNorth ? initialY + startHeight - nextHeight : nextY;
      latestX = Math.max(0, Math.round(finalX));
      latestY = Math.max(0, Math.round(finalY));
      latestWidth = Math.round(nextWidth);
      latestHeight = Math.round(nextHeight);
      movedFromFlow = movedFromFlow || movingWest || movingNorth;
      const patches = new Map<string, ResponsiveLayoutValues>();
      patches.set(componentId, {
        editorWidth: latestWidth,
        editorHeight: latestHeight,
        ...(movedFromFlow ? { editorPosition: 'absolute', editorX: latestX, editorY: latestY } : {}),
      });
      writePatches(patches, false);
    };

    let finished = false;
    const moveListener = (moveEvent: Event) => move(moveEvent as PointerEvent | MouseEvent);
    const finish = () => {
      if (finished) return;
      finished = true;
      for (const target of targets) {
        target.removeEventListener('pointermove', moveListener);
        target.removeEventListener('mousemove', moveListener);
        target.removeEventListener('pointerup', finishListener);
        target.removeEventListener('mouseup', finishListener);
        target.removeEventListener('pointercancel', finishListener);
      }
      delete element.dataset.studioResizing;
      const patches = new Map<string, ResponsiveLayoutValues>();
      patches.set(componentId, {
        editorWidth: latestWidth,
        editorHeight: latestHeight,
        ...(movedFromFlow ? { editorPosition: 'absolute', editorX: latestX, editorY: latestY } : {}),
      });
      writePatches(patches, true);
    };
    const finishListener = () => finish();

    for (const target of targets) {
      target.addEventListener('pointermove', moveListener, { passive: false });
      target.addEventListener('mousemove', moveListener, { passive: false });
      target.addEventListener('pointerup', finishListener, { once: true });
      target.addEventListener('mouseup', finishListener, { once: true });
      target.addEventListener('pointercancel', finishListener, { once: true });
    }
  };

  const onMovePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    stopOverlayEvent(event);
    const surface = surfaceRef.current;
    if (!surface) return;
    const element = getElement(surface.ownerDocument, componentId);
    if (!element) return;
    startMove(event.clientX, event.clientY, surface.ownerDocument, element);
  };

  const handles: ResizeDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
  const debugNode = findNodeInData(data, componentId);

  return (
    <div
      ref={surfaceRef}
      className={[
        'puck-resize-surface',
        activePrimary ? 'puck-resize-surface-selected' : '',
        visualSelected ? 'puck-resize-surface-studio-selected' : '',
      ].filter(Boolean).join(' ')}
    >
      {children}
      {activePrimary ? (
        <>
          <button
            type="button"
            className="puck-move-handle"
            aria-label={selectedIds.length > 1 ? `Mover ${selectedIds.length} elementos selecionados` : 'Mover elemento no canvas'}
            title={selectedIds.length > 1 ? 'Arrastar para mover a seleção' : 'Arrastar para mover o elemento no canvas'}
            onPointerDown={onMovePointerDown}
          >
            ✥
          </button>
          <div className="puck-resize-handles" aria-label="Redimensionar elemento">
            {handles.map(direction => (
              <button
                key={direction}
                type="button"
                className={`puck-resize-handle puck-resize-handle-${direction}`}
                aria-label={`Redimensionar pela alça ${direction}`}
                onPointerDown={event => onPointerDown(event, direction)}
                onClick={event => event.stopPropagation()}
              />
            ))}
          </div>
          {DEBUG_SELECTION ? (
            <output className="puck-selection-debug">
              {componentId} · {debugNode?.type || 'widget'} · {selectedIds.length || 1} selecionado(s)
            </output>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
