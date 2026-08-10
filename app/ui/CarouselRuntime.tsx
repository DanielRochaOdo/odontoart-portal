'use client';

import { useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

export type RuntimeCarouselItem = { id: string; title?: string; text?: string; image?: string; alt?: string; link?: string };
export type RuntimeCarouselSettings = { loop?: string; autoplay?: string; autoplayDelay?: string; showArrows?: string; showDots?: string; visibleItems?: string };

export default function CarouselRuntime({ items, settings }: { items: RuntimeCarouselItem[]; settings: RuntimeCarouselSettings }) {
  const safeItems = items.length ? items : [{ id: 'empty', title: 'Nenhum item disponível', text: '' }];
  const [reducedMotion, setReducedMotion] = useState(false);
  const autoplay = useMemo(() => settings.autoplay === 'true' && !reducedMotion ? Autoplay({ delay: Math.max(1000, Number(settings.autoplayDelay) || 5000), stopOnInteraction: true, stopOnMouseEnter: true }) : undefined, [settings.autoplay, settings.autoplayDelay, reducedMotion]);
  const [viewportRef, api] = useEmblaCarousel({ loop: settings.loop === 'true', align: 'start', breakpoints: { '(min-width: 768px)': { slidesToScroll: 1 }, '(min-width: 1024px)': { slidesToScroll: 1 } } }, autoplay ? [autoplay] : []);
  const [active, setActive] = useState(0);
  const canNavigate = safeItems.length > 1;
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReducedMotion(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => { if (!api) return; const onSelect = () => setActive(api.selectedScrollSnap()); api.on('select', onSelect); api.on('reInit', onSelect); onSelect(); return () => { api.off('select', onSelect); api.off('reInit', onSelect); }; }, [api]);
  return <section className="runtime-carousel" aria-roledescription="carousel" aria-label="Carrossel"><div className="runtime-carousel-viewport" ref={viewportRef}><div className="runtime-carousel-container">{safeItems.map(item => <article className="runtime-carousel-slide" key={item.id} aria-label={item.title || 'Slide'}>{item.image && <img src={item.image} alt={item.alt || item.title || ''} loading="lazy" />}{item.title && <h3>{item.title}</h3>}{item.text && <p>{item.text}</p>}{item.link && <a href={item.link}>Saiba mais</a>}</article>)}</div></div>{settings.showArrows !== 'false' && <div className="runtime-carousel-controls"><button type="button" aria-label="Slide anterior" disabled={!canNavigate || (!settings.loop && active === 0)} onClick={() => api?.scrollPrev()}>‹</button><button type="button" aria-label="Próximo slide" disabled={!canNavigate || (!settings.loop && active === safeItems.length - 1)} onClick={() => api?.scrollNext()}>›</button></div>}{settings.showDots !== 'false' && canNavigate && <div className="runtime-carousel-dots" role="tablist" aria-label="Selecionar slide">{safeItems.map((item, index) => <button type="button" role="tab" aria-label={`Ir para o slide ${index + 1}`} aria-selected={active === index} key={item.id} onClick={() => api?.scrollTo(index)}>{index + 1}</button>)}</div>}</section>;
}
