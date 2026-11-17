import { useEffect, useRef } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Diagram } from '../types';

export function DiagramPreview({ diagram, onDismiss }: { diagram: Diagram; onDismiss: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="diagram-preview-title"
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}
      onPointerDown={(event) => {
        pressedBackdrop.current = event.button === 0 && event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedBackdrop.current && event.target === event.currentTarget) onDismiss();
        pressedBackdrop.current = false;
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-5xl max-h-[90dvh] overflow-auto overscroll-contain rounded-lg border border-white/15 bg-navy-deep p-0 text-slate-200 shadow-2xl backdrop:bg-slate-950/90 backdrop:backdrop-blur-sm"
    >
      <div>
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-2">
          <h2 id="diagram-preview-title" className="text-xl font-semibold text-white">{diagram.title}</h2>
          <button type="button" aria-label="Close diagram preview" onClick={onDismiss}
            className="flex size-11 shrink-0 items-center justify-center rounded-sm text-slate-300 hover:bg-white/10 hover:text-white">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <figure>
          <img src={diagram.src} alt={diagram.alt} className="w-full max-h-[62dvh] object-contain bg-navy-midnight" />
          <figcaption className="px-5 pt-4 text-sm text-slate-300">{diagram.caption}</figcaption>
        </figure>
        <Link to={`/diagrams/${diagram.slug}`} onClick={onDismiss}
          className="mx-5 mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-copper-400 hover:text-copper-300">
          Open diagram note <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </dialog>
  );
}
