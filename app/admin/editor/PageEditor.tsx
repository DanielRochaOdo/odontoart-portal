'use client';

import { useEffect, useRef, useState } from 'react';
import { Puck } from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import { puckConfig } from '../../page-builder/config';
import type { PageData, PageRecord } from '../../page-builder/types';
import { resolveResponsiveLayout } from '../../page-builder/responsive';
import ElementorFields, { getElementorFieldGroup } from './ElementorFields';
import ResizeOverlay from './ResizeOverlay';

type LayoutProps = Record<string, unknown>;
type LayoutNode = { type: string; props: LayoutProps };
type OriginalMinHeight = { value: string; priority: string };

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

function syncEditorLayout(frameDocument: Document, data: PageData) {
  const viewportWidth = getCanvasViewportWidth(frameDocument);
  const nodes = new Map<string, LayoutProps>();
  collectLayoutNodes(data.content, nodes, viewportWidth);
  restoreParentExpansions(frameDocument);
  const rootProperties = ['position', 'left', 'top', 'right', 'bottom', 'width', 'height', 'min-height', 'margin', 'z-index', 'box-sizing'];
  const innerProperties = ['position', 'left', 'top', 'right', 'bottom', 'width', 'max-width', 'height', 'min-height', 'z-index'];

  for (const element of frameDocument.querySelectorAll<HTMLElement>('[data-puck-component]')) {
    const id = element.dataset.puckComponent;
    if (!id) continue;

    const props = nodes.get(id);
    const renderedElement = element.firstElementChild ? element.firstElementChild as HTMLElement : null;
    const absolute = props?.editorPosition === 'absolute';
    // O tipo nem sempre está disponível no JSON normalizado pelo Puck. O
    // marcador visual também é uma fonte confiável para identificar imagens,
    // evitando que o wrapper continue preso à altura antiga do editor.
    const autoHeightImage = Boolean(props?.editorWidth) && (
      props?.__editorType === 'Image' || renderedElement?.classList.contains('page-builder-image-widget')
    );

    if (absolute) {
      element.dataset.editorLayoutApplied = 'true';
      element.style.setProperty('position', 'absolute', 'important');
      element.style.setProperty('left', `${Math.max(0, Number(props?.editorX) || 0)}px`, 'important');
      element.style.setProperty('top', `${Math.max(0, Number(props?.editorY) || 0)}px`, 'important');
      element.style.setProperty('width', props?.editorWidth ? `${Number(props.editorWidth)}px` : 'auto', 'important');
      element.style.setProperty('height', autoHeightImage ? 'auto' : props?.editorHeight ? `${Number(props.editorHeight)}px` : 'auto', 'important');
      element.style.setProperty('margin', '0', 'important');
      element.style.setProperty('z-index', '2', 'important');
      element.style.setProperty('box-sizing', 'border-box', 'important');

      if (renderedElement) {
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
      clearInlineLayout(element, rootProperties);
      if (renderedElement?.dataset.editorLayoutInner === 'true') {
        delete renderedElement.dataset.editorLayoutInner;
        clearInlineLayout(renderedElement, innerProperties);
      }
    }
  }

  expandParentsForAbsoluteChildren(frameDocument, nodes);
}

export default function PageEditor({ page }: { page: PageRecord }) {
  const [status, setStatus] = useState('Salvo');
  const latest = useRef(page);
  const latestEditorData = useRef<PageData>(page.draftContent);
  const pending = useRef<PageData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

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
    const root = editorRef.current;
    if (!root) return;

    const bindFrame = () => {
      const frame = root.querySelector('iframe');
      const document = frame?.contentDocument;
      if (!document || document.documentElement.dataset.editorLinksBlocked === 'true') return;
      document.addEventListener('click', blockEditorNavigation, true);
      document.documentElement.dataset.editorLinksBlocked = 'true';
    };

    bindFrame();
    const observer = new MutationObserver(bindFrame);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      const frame = root.querySelector('iframe');
      frame?.contentDocument?.removeEventListener('click', blockEditorNavigation, true);
    };
  }, []);

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
      if (frameDocument) syncEditorLayout(frameDocument, latestEditorData.current);
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
        apply();
        return;
      }

      frameDocument = nextDocument;
      apply();
      const canvas = frameDocument.querySelector<HTMLElement>('#puck-canvas-root');
      if (canvas && typeof ResizeObserver !== 'undefined') {
        viewportObserver = new ResizeObserver(() => {
          cancelAnimationFrame(frameRaf);
          frameRaf = requestAnimationFrame(apply);
        });
        viewportObserver.observe(canvas);
      }
      observer = new MutationObserver(() => {
        cancelAnimationFrame(frameRaf);
        frameRaf = requestAnimationFrame(apply);
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
        config={puckConfig}
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
            const frame = editorRef.current?.querySelector('iframe');
            if (frame?.contentDocument) syncEditorLayout(frame.contentDocument, data);
          }));
        }}
        onPublish={data => void save(data, true)}
        overrides={{
          header: ({ children }) => (
            <header className="page-builder-header">
              <a href="/admin/pages">← Páginas</a>
              <strong>{page.title}</strong>
              <span>{status}</span>
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
            <ResizeOverlay isSelected={isSelected} componentId={componentId}>
              {children}
            </ResizeOverlay>
          ),
        }}
      />
    </div>
  );
}
