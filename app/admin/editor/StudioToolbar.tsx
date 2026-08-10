'use client';

type StudioToolbarProps = {
  selectedCount: number;
  gridEnabled: boolean;
  snapEnabled: boolean;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
};

export default function StudioToolbar({
  selectedCount,
  gridEnabled,
  snapEnabled,
  onToggleGrid,
  onToggleSnap,
  onSelectAll,
  onClearSelection,
}: StudioToolbarProps) {
  return (
    <div className="studio-toolbar" aria-label="Ferramentas do canvas">
      <div className="studio-selection-summary" aria-live="polite">
        <strong>{selectedCount}</strong>
        <span>{selectedCount === 1 ? 'elemento selecionado' : 'elementos selecionados'}</span>
      </div>
      <button type="button" onClick={onSelectAll} title="Selecionar todos os elementos visíveis (Ctrl/Cmd + A)">
        Selecionar tudo
      </button>
      <button
        type="button"
        aria-pressed={gridEnabled}
        className={gridEnabled ? 'is-active' : undefined}
        onClick={onToggleGrid}
        title="Mostrar ou ocultar a grade de 8 px"
      >
        Grade 8 px
      </button>
      <button
        type="button"
        aria-pressed={snapEnabled}
        className={snapEnabled ? 'is-active' : undefined}
        onClick={onToggleSnap}
        title="Encaixar em grade, centros e bordas"
      >
        Snap + guias
      </button>
      {selectedCount > 0 ? (
        <button type="button" onClick={onClearSelection} title="Limpar seleção (Esc)">
          Limpar
        </button>
      ) : null}
      <span className="studio-toolbar-help" title="Shift + clique adiciona à seleção; arraste no vazio cria uma seleção por área; setas movem 1 px e Shift + setas movem 10 px.">
        Shift + clique · área · setas
      </span>
    </div>
  );
}
