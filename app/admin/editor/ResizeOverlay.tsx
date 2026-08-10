'use client';

import { createUsePuck } from '@puckeditor/core';
import { useLayoutEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { Data } from '@puckeditor/core';
import { getResponsiveBreakpoint, resolveResponsiveLayout, updateResponsiveLayout, type ResponsiveBreakpoint, type ResponsiveLayoutValues } from '../../page-builder/responsive';

type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
type BuilderNode = { type: string; props: Record<string, unknown> };

const useResizePuck = createUsePuck();
const MIN_WIDTH = 40;
const MIN_HEIGHT = 24;
const DEBUG_SELECTION = false;
const STRUCTURAL_TYPES = new Set(['Section', 'Container', 'Columns', 'Table', 'Div']);

function getMoveStartWidth(element: HTMLElement, parentWidth: number, type: string, hasExplicitWidth: boolean) {
  const renderedWidth = Math.max(MIN_WIDTH, Math.round(element.getBoundingClientRect().width));
  if (hasExplicitWidth || !Number.isFinite(parentWidth) || renderedWidth < parentWidth * 0.92 || STRUCTURAL_TYPES.has(type)) {
    return renderedWidth;
  }

  // Widgets de texto e controles HTML são blocos por natureza e, sem esta
  // redução inicial, ocupam 100% do pai. Ao iniciar o primeiro movimento o
  // Elementor transforma o widget em uma caixa independente; fazemos o mesmo
  // sem alterar o conteúdo nem os irmãos.
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

function updateNode(value: BuilderNode, id: string, patch: ResponsiveLayoutValues, breakpoint: ResponsiveBreakpoint): BuilderNode {
  const props = { ...value.props };
  if (value.props.id === id) Object.assign(props, updateResponsiveLayout(props, breakpoint, patch));

  for (const [key, child] of Object.entries(props)) {
    if (Array.isArray(child)) props[key] = child.map(item => (isBuilderNode(item) ? updateNode(item, id, patch, breakpoint) : item));
  }

  return { ...value, props };
}

function updateData(data: Data, id: string, patch: ResponsiveLayoutValues, breakpoint: ResponsiveBreakpoint): Data {
  return {
    ...data,
    content: data.content.map(item => (isBuilderNode(item) ? updateNode(item, id, patch, breakpoint) : item)),
  };
}

function stopOverlayEvent(event: ReactPointerEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export default function ResizeOverlay({
  children,
  isSelected,
  componentId,
}: {
  children: ReactNode;
  isSelected: boolean;
  componentId: string;
}) {
  const dispatch = useResizePuck(state => state.dispatch);
  const selectedItem = useResizePuck(state => state.selectedItem);
  const getParentById = useResizePuck(state => state.getParentById);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const activeBreakpointRef = useRef<ResponsiveBreakpoint>('desktop');
  const getActiveBreakpoint = (ownerDocument: Document): ResponsiveBreakpoint => {
    const canvas = ownerDocument.querySelector<HTMLElement>('#puck-canvas-root');
    const width = canvas?.clientWidth || ownerDocument.documentElement.clientWidth || '100%';
    return getResponsiveBreakpoint(width);
  };
  const startMove = (startX: number, startY: number, ownerDocument: Document, element: HTMLElement) => {
    activeBreakpointRef.current = getActiveBreakpoint(ownerDocument);
    const parentId = getParentById(componentId)?.props.id;
    const parent = parentId
      ? ownerDocument.querySelector<HTMLElement>(
          `[data-puck-component="${CSS.escape(String(parentId))}"]`,
        )
      : null;
    const fallbackParent = element.parentElement;
    const parentElement = parent || fallbackParent;
    const parentRect = parentElement?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      right: Number.POSITIVE_INFINITY,
      bottom: Number.POSITIVE_INFINITY,
      width: Number.POSITIVE_INFINITY,
      height: Number.POSITIVE_INFINITY,
    };
    const elementRect = element.getBoundingClientRect();
    const selectedProps = selectedItem?.props as Record<string, unknown> | undefined;
    const activeLayout = selectedProps ? resolveResponsiveLayout(selectedProps, getActiveBreakpoint(ownerDocument) === 'mobile' ? 360 : getActiveBreakpoint(ownerDocument) === 'tablet' ? 768 : 1280) : {};
    const initialWidth = getMoveStartWidth(
      element,
      parentRect.width,
      String(selectedItem?.type || ''),
      typeof activeLayout.editorWidth === 'number',
    );
    const initialHeight = Math.max(MIN_HEIGHT, Math.round(elementRect.height));
    const initialX = elementRect.left - parentRect.left;
    const initialY = elementRect.top - parentRect.top;
    const maxX = Number.isFinite(parentRect.width)
      ? Math.max(0, parentRect.width - initialWidth)
      : Number.POSITIVE_INFINITY;
    const maxY = Number.isFinite(parentRect.height)
      ? Math.max(0, parentRect.height - elementRect.height)
      : Number.POSITIVE_INFINITY;
    const clampX = (value: number) => Math.max(0, Math.min(maxX, value));
    const clampY = (value: number) => Math.max(0, Math.min(maxY, value));
    let latestX = Math.round(clampX(initialX));
    let latestY = Math.round(clampY(initialY));
    let moved = false;
    const ownerWindow = ownerDocument.defaultView;
    const frameElement = ownerWindow?.frameElement as HTMLIFrameElement | null;
    const hostDocument = frameElement?.ownerDocument;
    const hostWindow = hostDocument?.defaultView;
    const moveTargets = Array.from(
      new Set([ownerDocument, ownerWindow, hostDocument, hostWindow].filter(Boolean) as EventTarget[]),
    );
    const toOwnerPoint = (moveEvent: PointerEvent | MouseEvent) => {
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
    };

    const move = (moveEvent: PointerEvent | MouseEvent) => {
      const point = toOwnerPoint(moveEvent);
      const nextX = Math.round(clampX(initialX + point.x - startX));
      const nextY = Math.round(clampY(initialY + point.y - startY));
      if (nextX === latestX && nextY === latestY) return;
      latestX = nextX;
      latestY = nextY;
      moved = true;
      writePatch(
        {
          editorPosition: 'absolute',
          editorX: latestX,
          editorY: latestY,
          editorWidth: initialWidth,
          editorHeight: initialHeight,
        },
        false,
      );
    };

    let finished = false;
    const moveListener = (event: Event) => move(event as PointerEvent | MouseEvent);
    const finishListener = () => finish();
    const finish = () => {
      if (finished) return;
      finished = true;
      for (const target of moveTargets) {
        target.removeEventListener('pointermove', moveListener);
        target.removeEventListener('mousemove', moveListener);
        target.removeEventListener('pointerup', finishListener);
        target.removeEventListener('mouseup', finishListener);
        target.removeEventListener('pointercancel', finishListener);
      }
      if (moved) {
        writePatch(
          {
            editorPosition: 'absolute',
            editorX: latestX,
            editorY: latestY,
            editorWidth: initialWidth,
            editorHeight: initialHeight,
          },
          true,
        );
      }
    };

    for (const target of moveTargets) {
      target.addEventListener('pointermove', moveListener, { passive: false });
      target.addEventListener('mousemove', moveListener, { passive: false });
      target.addEventListener('pointerup', finishListener, { once: true });
      target.addEventListener('mouseup', finishListener, { once: true });
      target.addEventListener('pointercancel', finishListener, { once: true });
    }
  };

  // Puck coloca position: relative no elemento raiz para o DnD. Quando o
  // administrador solicita movimento livre, reaplicamos o modo com !important
  // somente no nó selecionado, sem alterar irmãos ou a árvore de dados.
  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const clearOverlayPosition = () => {
      for (const property of ['position', 'inset', 'left', 'top', 'width', 'height']) {
        surface.style.removeProperty(property);
      }
    };

    if (!isSelected) {
      clearOverlayPosition();
      return;
    }

    const element = surface.ownerDocument.querySelector<HTMLElement>(
      `[data-puck-component="${CSS.escape(componentId)}"]`,
    );
    if (!element) {
      clearOverlayPosition();
      return;
    }

    const syncOverlayPosition = () => {
      const currentElement = surface.ownerDocument.querySelector<HTMLElement>(
        `[data-puck-component="${CSS.escape(componentId)}"]`,
      );
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
  }, [componentId, isSelected, selectedItem]);

  useLayoutEffect(() => {
    if (!isSelected) return;

    const surface = surfaceRef.current;
    if (!surface) return;

    const element = surface.ownerDocument.querySelector<HTMLElement>(
      `[data-puck-component="${CSS.escape(componentId)}"]`,
    );
    if (!element) return;

    const previousTouchAction = element.style.touchAction;
    element.style.touchAction = 'none';

    // O overlay nativo do Puck fica acima da árvore para desenhar a seleção,
    // mas não deve ser o responsável pelo movimento. O componente real é o
    // alvo do gesto, preservando a seleção dos filhos aninhados.
    const handleElementPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;

      const target = event.target instanceof Element ? event.target : null;
      const eventElement = target || surface.ownerDocument.elementFromPoint(event.clientX, event.clientY);
      const closestComponent = eventElement?.closest<HTMLElement>('[data-puck-component]');
      if (closestComponent?.getAttribute('data-puck-component') !== componentId) return;
      if (eventElement?.closest('.puck-resize-surface, .puck-resize-handle, .puck-move-handle')) return;

      event.preventDefault();
      event.stopPropagation();
      const currentElement = surface.ownerDocument.querySelector<HTMLElement>(
        `[data-puck-component="${CSS.escape(componentId)}"]`,
      );
      if (currentElement) startMove(event.clientX, event.clientY, surface.ownerDocument, currentElement);
    };

    const view = surface.ownerDocument.defaultView;
    // Capturar na janela do iframe vem antes dos listeners de DnD do Puck
    // registrados no documento. Assim o gesto de movimento livre não vira um
    // reorder de slot. O teste de closest mantém filhos independentes.
    view?.addEventListener('pointerdown', handleElementPointerDown, true);

    return () => {
      view?.removeEventListener('pointerdown', handleElementPointerDown, true);
      element.style.touchAction = previousTouchAction;
    };
  }, [componentId, isSelected, selectedItem]);

  const writePatch = (patch: ResponsiveLayoutValues, recordHistory: boolean) => {
    dispatch({
      type: 'setData',
      recordHistory,
      data: previous => updateData(previous, componentId, patch, activeBreakpointRef.current),
    });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, direction: ResizeDirection) => {
    stopOverlayEvent(event);
    const surface = surfaceRef.current;
    if (!surface) return;

    const ownerDocument = surface.ownerDocument;
    activeBreakpointRef.current = getActiveBreakpoint(ownerDocument);
    const element = ownerDocument.querySelector<HTMLElement>(
      `[data-puck-component="${CSS.escape(componentId)}"]`,
    );
    if (!element) return;

    const parentId = getParentById(componentId)?.props.id;
    const parent = parentId
      ? ownerDocument.querySelector<HTMLElement>(
          `[data-puck-component="${CSS.escape(String(parentId))}"]`,
        )
      : null;
    const parentElement = parent || element.parentElement;
    const parentRect = parentElement?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: Number.POSITIVE_INFINITY,
      height: Number.POSITIVE_INFINITY,
    };
    const rect = element.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    const preserveAspectRatio = selectedItem?.type === 'Image';
    const aspectRatio = startWidth / Math.max(MIN_HEIGHT, startHeight);
    const initialX = rect.left - parentRect.left;
    const initialY = rect.top - parentRect.top;
    const startX = event.clientX;
    const startY = event.clientY;
    const maxWidth = Number.isFinite(parentRect.width)
      ? Math.max(MIN_WIDTH, parentRect.width - initialX)
      : Number.POSITIVE_INFINITY;
    const maxHeight = Number.isFinite(parentRect.height)
      ? Math.max(MIN_HEIGHT, parentRect.height - initialY)
      : Number.POSITIVE_INFINITY;
    let latestWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, Math.round(startWidth)));
    let latestHeight = Math.min(maxHeight, Math.max(MIN_HEIGHT, Math.round(startHeight)));
    let latestX = Math.max(0, Math.round(initialX));
    let latestY = Math.max(0, Math.round(initialY));
    let movedFromFlow = false;
    const ownerWindow = ownerDocument.defaultView;
    const frameElement = ownerWindow?.frameElement as HTMLIFrameElement | null;
    const hostDocument = frameElement?.ownerDocument;
    const hostWindow = hostDocument?.defaultView;
    const resizeTargets = Array.from(
      new Set([ownerDocument, ownerWindow, hostDocument, hostWindow].filter(Boolean) as EventTarget[]),
    );
    const toOwnerPoint = (resizeEvent: PointerEvent | MouseEvent) => {
      if (!frameElement || resizeEvent.view === ownerWindow) {
        return { x: resizeEvent.clientX, y: resizeEvent.clientY };
      }

      const frameRect = frameElement.getBoundingClientRect();
      const canvasWidth = ownerDocument.documentElement.clientWidth || frameRect.width;
      const canvasHeight = ownerDocument.documentElement.clientHeight || frameRect.height;
      return {
        x: (resizeEvent.clientX - frameRect.left) * (canvasWidth / frameRect.width),
        y: (resizeEvent.clientY - frameRect.top) * (canvasHeight / frameRect.height),
      };
    };

    const move = (moveEvent: PointerEvent | MouseEvent) => {
      const point = toOwnerPoint(moveEvent);
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
      const heightLimit = movingNorth ? initialY + startHeight : maxHeight;

      let nextWidth = Math.min(widthLimit, Math.max(MIN_WIDTH, Math.round(startWidth + widthDelta)));
      let nextHeight = Math.min(heightLimit, Math.max(MIN_HEIGHT, Math.round(startHeight + heightDelta)));

      if (preserveAspectRatio) {
        const horizontalResize = direction.includes('e') || direction.includes('w');
        const verticalResize = direction.includes('n') || direction.includes('s');
        const widthCandidate = Math.max(MIN_WIDTH, Math.round(startWidth + widthDelta));
        const heightCandidate = Math.max(MIN_HEIGHT, Math.round(startHeight + heightDelta));

        if (horizontalResize && !verticalResize) {
          nextWidth = Math.min(widthLimit, widthCandidate);
          nextHeight = Math.min(heightLimit, Math.max(MIN_HEIGHT, Math.round(nextWidth / aspectRatio)));
          nextWidth = Math.min(widthLimit, Math.max(MIN_WIDTH, Math.round(nextHeight * aspectRatio)));
        } else if (verticalResize && !horizontalResize) {
          nextHeight = Math.min(heightLimit, heightCandidate);
          nextWidth = Math.min(widthLimit, Math.max(MIN_WIDTH, Math.round(nextHeight * aspectRatio)));
          nextHeight = Math.min(heightLimit, Math.max(MIN_HEIGHT, Math.round(nextWidth / aspectRatio)));
        } else if (horizontalResize && verticalResize) {
          const widthScale = Math.abs(widthCandidate - startWidth) / Math.max(1, startWidth);
          const heightScale = Math.abs(heightCandidate - startHeight) / Math.max(1, startHeight);
          if (widthScale >= heightScale) {
            nextWidth = Math.min(widthLimit, widthCandidate);
            nextHeight = Math.min(heightLimit, Math.max(MIN_HEIGHT, Math.round(nextWidth / aspectRatio)));
            nextWidth = Math.min(widthLimit, Math.max(MIN_WIDTH, Math.round(nextHeight * aspectRatio)));
          } else {
            nextHeight = Math.min(heightLimit, heightCandidate);
            nextWidth = Math.min(widthLimit, Math.max(MIN_WIDTH, Math.round(nextHeight * aspectRatio)));
            nextHeight = Math.min(heightLimit, Math.max(MIN_HEIGHT, Math.round(nextWidth / aspectRatio)));
          }
        }
      }

      const finalX = movingWest ? initialX + startWidth - nextWidth : nextX;
      const finalY = movingNorth ? initialY + startHeight - nextHeight : nextY;
      latestX = Math.max(0, Math.round(finalX));
      latestY = Math.max(0, Math.round(finalY));
      latestWidth = Math.round(nextWidth);
      latestHeight = Math.round(nextHeight);
      movedFromFlow = movedFromFlow || movingWest || movingNorth;
      writePatch(
        {
          editorWidth: latestWidth,
          editorHeight: latestHeight,
          ...(movedFromFlow ? { editorPosition: 'absolute', editorX: latestX, editorY: latestY } : {}),
        },
        false,
      );
    };

    let finished = false;
    const moveListener = (moveEvent: Event) => move(moveEvent as PointerEvent | MouseEvent);
    const finishListener = () => finish();
    const finish = () => {
      if (finished) return;
      finished = true;
      for (const target of resizeTargets) {
        target.removeEventListener('pointermove', moveListener);
        target.removeEventListener('mousemove', moveListener);
        target.removeEventListener('pointerup', finishListener);
        target.removeEventListener('mouseup', finishListener);
        target.removeEventListener('pointercancel', finishListener);
      }
      writePatch(
        {
          editorWidth: latestWidth,
          editorHeight: latestHeight,
          ...(movedFromFlow ? { editorPosition: 'absolute', editorX: latestX, editorY: latestY } : {}),
        },
        true,
      );
    };

    for (const target of resizeTargets) {
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

    const element = surface.ownerDocument.querySelector<HTMLElement>(
      `[data-puck-component="${CSS.escape(componentId)}"]`,
    );
    if (!element) return;

    startMove(event.clientX, event.clientY, surface.ownerDocument, element);
  };

  // A superfície selecionada recebe o início do arraste. Se o alvo for outro
  // componente Puck aninhado, deixamos o evento seguir para que o filho seja
  // selecionado normalmente.
  const handles: ResizeDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
  const debugProps = selectedItem?.props as Record<string, unknown> | undefined;

  return (
    <div
      ref={surfaceRef}
      className={`puck-resize-surface${isSelected ? ' puck-resize-surface-selected' : ''}`}
    >
      {children}
      {isSelected && (
        <>
          <button
            type="button"
            className="puck-move-handle"
            aria-label="Mover elemento no canvas"
            title="Arrastar para mover o elemento no canvas"
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
          {DEBUG_SELECTION && (
            <output className="puck-selection-debug">
              {componentId} · {String(debugProps?.editorPosition || 'flow')}
            </output>
          )}
        </>
      )}
    </div>
  );
}
