'use client';

import { createUsePuck } from '@puckeditor/core';
import type { Data } from '@puckeditor/core';

const useLayoutPuck = createUsePuck();

function clearLayoutNode(value: unknown, id: string): unknown {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(item => clearLayoutNode(item, id));

  const nodeValue = value as { type?: unknown; props?: Record<string, unknown> };
  if (typeof nodeValue.type !== 'string' || !nodeValue.props) return value;

  const props = { ...nodeValue.props };
  if (props.id === id) {
    for (const key of ['editorWidth', 'editorHeight', 'editorPosition', 'editorX', 'editorY']) {
      delete props[key];
    }
    delete props.responsive;
  }

  for (const [key, child] of Object.entries(props)) {
    props[key] = clearLayoutNode(child, id);
  }

  return { ...nodeValue, props };
}

function clearLayoutData(data: Data, id: string): Data {
  return { ...data, content: clearLayoutNode(data.content, id) as Data['content'] };
}

export default function ResetLayoutField() {
  const dispatch = useLayoutPuck(state => state.dispatch);
  const data = useLayoutPuck(state => state.appState.data);
  const selectedItem = useLayoutPuck(state => state.selectedItem);
  const id = selectedItem?.props.id;

  return (
    <button
      type="button"
      className="puck-reset-layout"
      disabled={!id || !data}
      onClick={() => {
        if (!id || !data) return;
        const resetId = String(id);
        dispatch({ type: 'setData', recordHistory: true, data: previous => clearLayoutData(previous, resetId) });
      }}
    >
      Restaurar tamanho e posição original
    </button>
  );
}
