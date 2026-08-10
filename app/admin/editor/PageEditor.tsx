'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import './studio.css';
import { studioPuckConfig } from '../../page-builder/studio-config';
import type { PageData, PageRecord } from '../../page-builder/types';
import { resolveResponsiveLayout } from '../../page-builder/responsive';
import ElementorFields, { getElementorFieldGroup } from './ElementorFields';
import ResizeOverlay from './ResizeOverlay';
import StudioToolbar from './StudioToolbar';

type LayoutProps = Record<string, unknown>;
type LayoutNode = { type: string; props: LayoutProps };
type OriginalMinHeight = { value: string; priority: string };
type Point = { x: number; y: number };

const originalMinHeights = new WeakMap<HTMLElement, OriginalMinHeight>();

function blockEditorNavigation(event: MouseEvent) {
  const target = event.target;
  if (!target || typeof (target as Element).closest !== 'function') return;
  const link = (target as Element).closest('a');
  if (link) event.preventDefault();
}

function isLayoutNode(value: unknown): value is LayoutNode {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as LayoutNode).type === 'string' &&
      (value as LayoutNode).props &&
      typeof (value as LayoutNode).props === 'object',
  );
}

function collectLayoutNodes(value: unknown, nodes: Map<string, LayoutProps>, viewportWidth: number | '100%') {
  if (Array.isArray(value)) {
    for (const child of value) collectLayoutNodes(child, nodes, viewportWidth);
    return;
  }

  if (!value || typeof value !== 'object') return;

  if (isLayoutNode(value)) {
    const id = value.props.id;
    if (typeof id === 'string' && id) {
      nodes.set(id, { ...value.props, ...resolveResponsiveLayout(value.props, viewportWidth), __editorType: value.type });
    }
    for (const child of Object.values(value.props)) collectLayoutNodes(child, nodes, viewportWidth);
    return;
  }

  for (const child of Object.values(value)) collectLayoutNodes(child, nodes, viewportWidth);
}

function clearInlineLayout(element: HTMLElement, properties: string[]) {
  for (const property of properties) element.style.removeProperty(property);
}

function restoreParentExpansions(frameDocument: Document) {
  for (const element of frameDocument.querySelectorAll<HTMLElement>('[data-editor-parent-expanded="true"]')) {
    const original = originalMinHeights.get(element);
    if (original?.value) element.style.setProperty('min-height', original.value, original.priority);
    else element.style.removeProperty('min-height');
    delete element.dataset.editorParentExpanded;
    originalMinHeights.delete(element);
  }
}

function findComponentParent(element: HTMLElement) {
  let parent = element.parentElement;
  while (parent) {
    if (parent.dataset.puckComponent) return parent;
    parent = parent.parentElement;
  }
  return null;
}

function expandParentsForAbsoluteChildren(frameDocument: Document, nodes: Map<string, LayoutProps>) {
  const requiredHeights = new Map<HTMLElement, number>();

  for (const child of frameDocument.querySelectorAll<HTMLElement>('[data-puck-component]')) {
    const id = child.dataset.puckComponent;
    if (!id || nodes.get(id)?.editorPosition !== 'absolute') continue;

    const parent = findComponentParent(child);
    const inner = parent?.firstElementChild ? parent.firstElementChild as HTMLElement : null;
    if (!parent || !inner) continue;

    const parentRect = parent.getBoundingClientRect();
    const childRect = child.getBoundingClientRect();
    const neededHeight = Math.ceil(childRect.bottom - parentRect.top);
    if (neededHeight <= parentRect.height + 1) continue;

    requiredHeights.set(inner, Math.max(requiredHeights.get(inner) || 0, neededHeight));
  }

  for (const [inner, neededHeight] of requiredHeights) {
    if (!inner.dataset.editorParentExpanded) {
      originalMinHeights.set(inner, {
        value: inner.style.getPropertyValue('min-height'),
        priority: inner.style.getPropertyPriority('min-height'),
      });
    }
    inner.dataset.editorParentExpanded = 'true';
    inner.style.setProperty('min-height', `${neededHeight}px`, 'important');
  }
}

function getCanvasViewportWidth(frameDocument: Document): number | '100%' {
  const canvas = frameDocument.querySelector<HTMLElement>('#puck-canvas-root');
  if (canvas) {
    const width = canvas.clientWidth || Number.parseFloat(getComputedStyle(canvas).width);
    if (Number.isFinite(width) && width > 0) return width;
  }
  const width = frameDocument.documentElement.clientWidth;
  return width > 0 ? width : '100%';
}

function layoutSignature(props: LayoutProps | undefined, viewportWidth: number | '100%') {
  if (!props) return `${viewportWidth}:flow`;
  return [
    viewportWidth,
    props.editorPosition || 'flow',
    props.editorX ?? '',
    props.editorY ?? '',
    props.editorWidth ?? '',
    props.editorHeight ?? '',
    props.__editorType ?? '',
  ].join(':');
}

function syncEditorLayout(frameDocument: Document, data: PageData) {
  const viewportWidth = getCanvasViewportWidth(frameDocument);
  const nodes = new Map<string, LayoutProps>();
  collectLayoutNodes(data.content, nodes, viewportWidth);
  if ('zones' in data) collectLayoutNodes(data.zones, nodes, viewportWidth);
  restoreParentExpansions(frameDocument);
  const rootProperties = ['position', 'left', 'top', 'right', 'bottom', 'width', 'height', 'min-height', 'margin', 'z-index', 'box-sizing'];
  const innerProperties = ['position', 'left', 'top', 'right', 'bottom', 'width', 'max-width', 'height', 'min-height', 'z-index'];

  for (const element of frameDocument.querySelectorAll<HTMLElement>('[data-puck-component]')) {
    const id = element.dataset.puckComponent;
    if (!id) continue;

    const props = nodes.get(id);
    const renderedElement = element.firstElementChild ? element.firstElementChild as HTMLElement : null;
    const absolute = props?.editorPosition === 'absolute';
    const autoHeightImage = Boolean(props?.editorWidth) && (
      props?.__editorType === 'Image' || renderedElement?.classList.contains('page-builder-image-widget')
    );
    const signature = layoutSignature(props, viewportWidth);

    if (absolute) {
      if (element.dataset.editorLayoutSignature !== signature) {
        element.dataset.editorLayoutSignature = signature;
        element.dataset.editorLayoutApplied = 'true';
        element.style.setProperty('position', 'absolute', 'important');
        element.style.setProperty('left', `${Math.max(0, Number(props?.editorX) || 0)}px`, 'important');
        element.style.setProperty('top', `${Math.max(0, Number(props?.editorY) || 0)}px`, 'important');
        element.style.setProperty('width', props?.editorWidth ? `${Number(props.editorWidth)}px` : 'auto', 'important');
        element.style.setProperty('height', autoHeightImage ? 'auto' : props?.editorHeight ? `${Number(props.editorHeight)}px` : 'auto', 'important');
        element.style.setProperty('margin', '0', 'important');
        element.style.setProperty('z-index', '2', 'important');
        element.style.setProperty('box-sizing', 'border-box', 'important');
      }

      if (renderedElement && renderedElement.dataset.editorLayoutInner !== 'true') {
        renderedElement.dataset.editorLayoutInner = 'true';
        renderedElement.style.setProperty('position', 'relative', 'important');
        renderedElement.style.setProperty('left', '0', 'important');
        renderedElement.style.setProperty('top', '0', 'important');
        renderedElement.style.setProperty('right', 'auto', 'important');
        renderedElement.style.setProperty('bottom', 'auto', 'important');
        renderedElement.style.setProperty('width', '100%', 'important');
        renderedElement.style.setProperty('max-width', '100%', 'important');
        renderedElement.style.setProperty('height', 'auto', 'important');
        renderedElement.style.setProperty('min-height', '0', 'important');
        renderedElement.style.setProperty('z-index', 'auto', 'important');
      }
    } else if (element.dataset.editorLayoutApplied === 'true') {
      delete element.dataset.editorLayoutApplied;
      delete element.dataset.editorLayoutSignature;
      clearInlineLayout(element, rootProperties);
      if (renderedElement?.dataset.editorLayoutInner === 'true') {
        delete renderedElement.dataset.editorLayoutInner;
        clearInlineLayout(renderedElement, innerProperties);
      }
    }
  }

  expandParentsForAbsoluteChildren(frameDocument, nodes);
}

function mutationTouchesBuilder(records: MutationRecord[]) {
  return records.some(record => {
    const changed = [...record.addedNodes, ...record.removedNodes];
    return changed.some(node => {
      if (!(node instanceof Element)) return false;
      return node.matches('[data-puck-component]') || Boolean(node.querySelector('[data-puck-component]'));
    });
  });
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
}

function visibleComponentElements(frameDocument: Document) {
  return Array.from(frameDocument.querySelectorAll<HTMLElement>('[data-puck-component]')).filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
}

function leafMostComponents(elements: HTMLElement[]) {
  const set = new Set(elements);
  return elements.filter(element => {
    for (const candidate of set) {
      if (candidate !== element && element.contains(candidate)) return false;
    }
    return true;
  });
}

function intersectingComponents(frameDocument: Document, left: number, top: number, right: number, bottom: number) {
  const intersecting = visibleComponentElements(frameDocument).filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.right >= left && rect.left <= right && rect.bottom >= top && rect.top <= bottom;
  });
  return leafMostComponents(intersecting);
}

function idsFromElements(elements: HTMLElement[]) {
  return elements.map(element => element.dataset.puckComponent).filter((id): id is string => Boolean(id));
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}

function applySelectionMarkers(frameDocument: Document, selectedIds: string[], primaryId: string | null) {
  const selected = new Set(selectedIds);
  for (const element of frameDocument.querySelectorAll<HTMLElement>('[data-puck-component]')) {
    const id = element.dataset.puckComponent;
    if (id && selected.has(id)) element.dataset.studioSelected = 'true';
    else delete element.dataset.studioSelected;
    if (id && id === primaryId && selected.has(id)) element.dataset.studioPrimary = 'true';
    else delete element.dataset.studioPrimary;
  }
}

export default function PageEditor({ page }: { page: PageRecord }) {
  const [status, setStatus] = useState('Salvo');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const latest = useRef(page);
  const latestEditorData = useRef<PageData>(page.draftContent);
  const pending = useRef<PageData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const selectedIdsRef = useRef<string[]>([]);
  const primaryIdRef = useRef<string | null>(null);
  const gridEnabledRef = useRef(true);
  const snapEnabledRef = useRef(true);

  const setStudioSelection = useCallback((ids: string[], primary: string | null = ids[0] || null) => {
    const unique = Array.from(new Set(ids));
    selectedIdsRef.current = unique;
    primaryIdRef.current = primary && unique.includes(primary) ? primary : unique[0] || null;
    setSelectedIds(previous => sameIds(previous, unique) ? previous : unique);
    setPrimaryId(previous => previous === primaryIdRef.current ? previous : primaryIdRef.current);
    const frameDocument = editorRef.current?.querySelector('iframe')?.contentDocument;
    if (frameDocument) applySelectionMarkers(frameDocument, unique, primaryIdRef.current);
  }, []);

  const currentFrameDocument = useCallback(() => editorRef.current?.querySelector('iframe')?.contentDocument || null, []);

  const selectAll = useCallback(() => {
    const frameDocument = currentFrameDocument();
    if (!frameDocument) return;
    const ids = idsFromElements(leafMostComponents(visibleComponentElements(frameDocument)));
    setStudioSelection(ids, ids[0] || null);
  }, [currentFrameDocument, setStudioSelection]);

  const save = async (data: PageData, publish = false) => {
    latest.current = { ...latest.current, draftContent: data };
    setStatus(publish ? 'Publicando...' : 'Salvando...');
    const response = await fetch(`/api/admin/pages/${page.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftContent: data, publish }),
    });
    if (!response.ok) {
      setStatus('Erro ao salvar');
      return;
    }
    pending.current = null;
    setStatus(publish ? 'Publicado' : 'Salvo');
  };

  useEffect(() => {
    gridEnabledRef.current = gridEnabled;
    const frameDocument = currentFrameDocument();
    if (frameDocument) frameDocument.documentElement.dataset.studioGrid = gridEnabled ? 'true' : 'false';
  }, [currentFrameDocument, gridEnabled]);

  useEffect(() => {
    snapEnabledRef.current = snapEnabled;
    const frameDocument = currentFrameDocument();
    if (frameDocument) frameDocument.documentElement.dataset.studioSnap = snapEnabled ? 'true' : 'false';
  }, [currentFrameDocument, snapEnabled]);

  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;

    let boundDocument: Document | null = null;
    let cleanupDocument: (() => void) | null = null;

    const bindDocument = (frameDocument: Document) => {
      if (frameDocument === boundDocument) return;
      cleanupDocument?.();
      boundDocument = frameDocument;
      frameDocument.documentElement.dataset.studioGrid = gridEnabledRef.current ? 'true' : 'false';
      frameDocument.documentElement.dataset.studioSnap = snapEnabledRef.current ? 'true' : 'false';
      applySelectionMarkers(frameDocument, selectedIdsRef.current, primaryIdRef.current);

      const onPointerDown = (event: PointerEvent) => {
        if (event.button !== 0) return;
        const target = event.target instanceof Element ? event.target : null;
        if (!target || target.closest('.puck-resize-handle, .puck-move-handle')) return;

        const component = target.closest<HTMLElement>('[data-puck-component]');
        if (component?.dataset.puckComponent) {
          const id = component.dataset.puckComponent;
          if (event.shiftKey || event.metaKey || event.ctrlKey) {
            const current = selectedIdsRef.current;
            const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
            setStudioSelection(next, next.includes(id) ? id : next[0] || null);
          } else {
            setStudioSelection([id], id);
          }
          return;
        }

        const canvas = target.closest<HTMLElement>('#puck-canvas-root');
        if (!canvas || isEditableTarget(target)) return;

        event.preventDefault();
        event.stopPropagation();
        const start: Point = { x: event.clientX, y: event.clientY };
        const marquee = frameDocument.createElement('div');
        marquee.className = 'odontoart-selection-marquee';
        marquee.style.left = `${start.x}px`;
        marquee.style.top = `${start.y}px`;
        marquee.style.width = '0px';
        marquee.style.height = '0px';
        frameDocument.body.appendChild(marquee);
        let moved = false;
        let raf = 0;
        let latestPoint = start;

        const renderSelection = () => {
          raf = 0;
          const left = Math.min(start.x, latestPoint.x);
          const top = Math.min(start.y, latestPoint.y);
          const right = Math.max(start.x, latestPoint.x);
          const bottom = Math.max(start.y, latestPoint.y);
          marquee.style.left = `${left}px`;
          marquee.style.top = `${top}px`;
          marquee.style.width = `${right - left}px`;
          marquee.style.height = `${bottom - top}px`;
          const ids = idsFromElements(intersectingComponents(frameDocument, left, top, right, bottom));
          setStudioSelection(ids, ids[0] || null);
        };

        const move = (moveEvent: PointerEvent) => {
          latestPoint = { x: moveEvent.clientX, y: moveEvent.clientY };
          moved = moved || Math.abs(latestPoint.x - start.x) > 3 || Math.abs(latestPoint.y - start.y) > 3;
          if (!raf) raf = frameDocument.defaultView?.requestAnimationFrame(renderSelection) || 0;
        };

        const finish = () => {
          frameDocument.removeEventListener('pointermove', move, true);
          frameDocument.removeEventListener('pointerup', finish, true);
          frameDocument.removeEventListener('pointercancel', finish, true);
          if (raf) frameDocument.defaultView?.cancelAnimationFrame(raf);
          marquee.remove();
          if (!moved) setStudioSelection([], null);
        };

        frameDocument.addEventListener('pointermove', move, true);
        frameDocument.addEventListener('pointerup', finish, true);
        frameDocument.addEventListener('pointercancel', finish, true);
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (isEditableTarget(event.target)) return;
        const modifier = event.metaKey || event.ctrlKey;
        if (modifier && event.key.toLowerCase() === 'a') {
          event.preventDefault();
          const ids = idsFromElements(leafMostComponents(visibleComponentElements(frameDocument)));
          setStudioSelection(ids, ids[0] || null);
          return;
        }
        if (event.key === 'Escape') {
          setStudioSelection([], null);
          return;
        }
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || !selectedIdsRef.current.length) return;
        event.preventDefault();
        const distance = event.shiftKey ? 10 : 1;
        const detail = {
          ids: selectedIdsRef.current,
          dx: event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0,
          dy: event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0,
        };
        frameDocument.dispatchEvent(new CustomEvent('odontoart-studio-nudge', { detail }));
      };

      frameDocument.addEventListener('click', blockEditorNavigation, true);
      frameDocument.addEventListener('pointerdown', onPointerDown, true);
      frameDocument.addEventListener('keydown', onKeyDown, true);

      cleanupDocument = () => {
        frameDocument.removeEventListener('click', blockEditorNavigation, true);
        frameDocument.removeEventListener('pointerdown', onPointerDown, true);
        frameDocument.removeEventListener('keydown', onKeyDown, true);
      };
    };

    const bindFrame = () => {
      const frame = root.querySelector('iframe');
      if (frame?.contentDocument) bindDocument(frame.contentDocument);
    };

    bindFrame();
    const observer = new MutationObserver(bindFrame);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      cleanupDocument?.();
    };
  }, [setStudioSelection]);

  useEffect(() => {
    const root = editorRef.current;
    if (!root) return;

    let frameDocument: Document | null = null;
    let observer: MutationObserver | null = null;
    let frame: HTMLIFrameElement | null = null;
    let removeFrameLoadListener: (() => void) | null = null;
    let frameRaf = 0;
    let viewportObserver: ResizeObserver | null = null;

    const apply = () => {
      if (!frameDocument) return;
      syncEditorLayout(frameDocument, latestEditorData.current);
      applySelectionMarkers(frameDocument, selectedIdsRef.current, primaryIdRef.current);
    };

    const scheduleApply = () => {
      if (!frameDocument) return;
      cancelAnimationFrame(frameRaf);
      frameRaf = requestAnimationFrame(apply);
    };

    const bindFrame = () => {
      const nextFrame = root.querySelector('iframe');
      if (!nextFrame) return;

      if (nextFrame !== frame) {
        observer?.disconnect();
        observer = null;
        viewportObserver?.disconnect();
        viewportObserver = null;
        removeFrameLoadListener?.();
        frame = nextFrame;
        const handleFrameLoad = () => bindFrame();
        frame.addEventListener('load', handleFrameLoad);
        removeFrameLoadListener = () => frame?.removeEventListener('load', handleFrameLoad);
      }

      const nextDocument = frame.contentDocument;
      if (!nextDocument || nextDocument === frameDocument) {
        scheduleApply();
        return;
      }

      frameDocument = nextDocument;
      apply();
      const canvas = frameDocument.querySelector<HTMLElement>('#puck-canvas-root');
      if (canvas && typeof ResizeObserver !== 'undefined') {
        viewportObserver = new ResizeObserver(scheduleApply);
        viewportObserver.observe(canvas);
      }
      observer = new MutationObserver(records => {
        if (mutationTouchesBuilder(records)) scheduleApply();
      });
      observer.observe(frameDocument, { childList: true, subtree: true });
    };

    bindFrame();
    const hostObserver = new MutationObserver(bindFrame);
    hostObserver.observe(root, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frameRaf);
      hostObserver.disconnect();
      observer?.disconnect();
      viewportObserver?.disconnect();
      removeFrameLoadListener?.();
    };
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <div ref={editorRef} className="page-builder-editor">
      <Puck
        config={studioPuckConfig}
        viewports={[
          { width: 360, height: 'auto', icon: 'Smartphone', label: 'Mobile' },
          { width: 768, height: 'auto', icon: 'Tablet', label: 'Tablet' },
          { width: 1280, height: 'auto', icon: 'Monitor', label: 'Desktop' },
          { width: '100%', height: 'auto', icon: 'Monitor', label: 'Desktop amplo' },
        ]}
        dnd={{ behavior: 'fluid' }}
        data={page.draftContent}
        headerTitle={page.title}
        onChange={data => {
          latestEditorData.current = data;
          pending.current = data;
          setStatus('Alterações locais');
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            const next = pending.current;
            if (next) void save(next);
          }, 1400);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const frameDocument = editorRef.current?.querySelector('iframe')?.contentDocument;
            if (frameDocument) {
              syncEditorLayout(frameDocument, data);
              applySelectionMarkers(frameDocument, selectedIdsRef.current, primaryIdRef.current);
            }
          }));
        }}
        onPublish={data => void save(data, true)}
        overrides={{
          header: ({ children }) => (
            <header className="page-builder-header studio-header">
              <a href="/admin/pages">← Páginas</a>
              <div className="studio-header-title">
                <strong>{page.title}</strong>
                <small>Odontoart Studio · responsivo automático</small>
              </div>
              <StudioToolbar
                selectedCount={selectedIds.length}
                gridEnabled={gridEnabled}
                snapEnabled={snapEnabled}
                onToggleGrid={() => setGridEnabled(value => !value)}
                onToggleSnap={() => setSnapEnabled(value => !value)}
                onSelectAll={selectAll}
                onClearSelection={() => setStudioSelection([], null)}
              />
              <span className="studio-save-status">{status}</span>
              {children}
            </header>
          ),
          fields: ({ children, isLoading }) => <ElementorFields isLoading={isLoading}>{children}</ElementorFields>,
          fieldLabel: ({ children, icon, label, el = 'label', readOnly, className }) => {
            const Label = el === 'div' ? 'div' : 'label';
            const group = getElementorFieldGroup(label);
            return (
              <Label
                className={`${className || ''} elementor-field-label`.trim()}
                data-elementor-group={group}
                aria-disabled={readOnly || undefined}
              >
                <span className="elementor-field-label-text">
                  {icon}
                  {label}
                </span>
                {children}
              </Label>
            );
          },
          componentOverlay: ({ children, isSelected, componentId }) => (
            <ResizeOverlay
              isSelected={isSelected}
              studioSelected={selectedIds.includes(componentId)}
              isStudioPrimary={primaryId === componentId}
              selectedIds={selectedIds}
              snapEnabled={snapEnabled}
              componentId={componentId}
            >
              {children}
            </ResizeOverlay>
          ),
        }}
      />
    </div>
  );
}
