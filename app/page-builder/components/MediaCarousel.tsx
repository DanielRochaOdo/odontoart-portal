'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MutableRefObject } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import type { MediaCarouselItem, MediaCarouselProps } from '../carousel/types';
import { normalizeMediaItem } from '../carousel/types';

export default function MediaCarousel(props: MediaCarouselProps) {
  const items = (props.items || []).map(normalizeMediaItem).filter(item => item.src || item.type === 'video');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [active, setActive] = useState(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const autoplay = useMemo(() => props.autoplay && !isEditing && !reducedMotion ? Autoplay({ delay: Math.max(3000, props.autoplayDelay || 5000), stopOnInteraction: true, stopOnMouseEnter: false }) : undefined, [props.autoplay, props.autoplayDelay, isEditing, reducedMotion]);
  const [viewportRef, api] = useEmblaCarousel({ loop: props.loop, align: props.align, watchDrag: props.draggable && props.touch }, autoplay ? [autoplay] : []);
  const canNavigate = items.length > 1;
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReducedMotion(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => { setIsEditing(Boolean(document.querySelector('[data-puck-entry]'))); }, []);
  useEffect(() => { if (!api) return; const onSelect = () => { const next = api.selectedScrollSnap(); setActive(next); Object.entries(videoRefs.current).forEach(([id, video]) => { if (video && items[next]?.id !== id) { video.pause(); video.currentTime = 0; } }); }; api.on('select', onSelect); api.on('reInit', onSelect); onSelect(); return () => { api.off('select', onSelect); api.off('reInit', onSelect); }; }, [api, items]);
  const sizeStyle = { ...(props.editorWidth ? { width: `${props.editorWidth}px`, maxWidth: '100%' } : {}), ...(props.editorHeight ? { minHeight: `${props.editorHeight}px` } : {}), ...(props.editorPosition === 'absolute' ? { position: 'absolute' as const, left: props.editorX || 0, top: props.editorY || 0, margin: 0, zIndex: 2 } : {}) };
  if (!items.length) return <section className="media-carousel media-carousel-empty" style={sizeStyle} aria-label="Carrossel de mídia vazio"><strong>Carrossel vazio</strong><span>Adicione um item ao carrossel.</span></section>;
  const style = { '--media-slides-desktop': props.slidesDesktop, '--media-slides-tablet': props.slidesTablet, '--media-slides-mobile': props.slidesMobile, '--media-gap': `${props.gap}px`, '--media-ratio': props.aspectRatio === 'auto' ? 'auto' : props.aspectRatio } as CSSProperties;
  return <section className="media-carousel" style={sizeStyle} aria-roledescription="carousel" aria-label="Carrossel de mídia" onMouseEnter={() => { if (props.pauseOnHover) autoplay?.stop(); }} onMouseLeave={() => { if (props.pauseOnHover && props.autoplay && !reducedMotion) autoplay?.play(); }}><div className="media-carousel-viewport" ref={viewportRef}><div className="media-carousel-container" style={style}>{items.map((item, index) => <MediaCarouselSlide key={item.id} item={item} index={index} active={index === active} videoRefs={videoRefs} objectFit={props.objectFit} />)}</div></div>{props.showArrows && canNavigate && <div className="media-carousel-controls"><button type="button" aria-label="Slide anterior" onClick={() => api?.scrollPrev()} disabled={!props.loop && active === 0}>‹</button><button type="button" aria-label="Próximo slide" onClick={() => api?.scrollNext()} disabled={!props.loop && active === items.length - 1}>›</button></div>}{props.showDots && canNavigate && <div className="media-carousel-dots" role="tablist" aria-label="Selecionar slide">{items.map((item, index) => <button type="button" role="tab" key={item.id} aria-label={`Ir para o slide ${index + 1}`} aria-selected={active === index} onClick={() => api?.scrollTo(index)}>{index + 1}</button>)}</div>}</section>;
}

function MediaCarouselSlide({ item, index, active, videoRefs, objectFit }: { item: MediaCarouselItem; index: number; active: boolean; videoRefs: MutableRefObject<Record<string, HTMLVideoElement | null>>; objectFit: 'cover' | 'contain' }) {
  if (item.type === 'video') return <article className="media-carousel-slide" aria-label={item.title || `Slide ${index + 1}`}><video ref={node => { videoRefs.current[item.id] = node; }} src={item.src || undefined} poster={item.poster || undefined} title={item.title} muted={item.muted} controls={item.controls} loop={item.loop} playsInline={item.playsInline} preload={active ? 'metadata' : 'none'} style={{ objectFit }} /></article>;
  const image = <img src={item.src || undefined} alt={item.alt} loading={index === 0 ? 'eager' : 'lazy'} style={{ objectFit }} />;
  return <article className="media-carousel-slide" aria-label={item.caption || `Slide ${index + 1}`}>{item.href ? <a href={item.href} target={item.openInNewTab ? '_blank' : undefined} rel={item.openInNewTab ? 'noopener noreferrer' : undefined}>{image}</a> : image}{item.caption && <p>{item.caption}</p>}</article>;
}
