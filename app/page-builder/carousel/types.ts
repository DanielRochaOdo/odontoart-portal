export type MediaImageItem = {
  id: string;
  type: 'image';
  src: string;
  alt: string;
  caption?: string;
  href?: string;
  openInNewTab?: boolean;
};

export type MediaVideoItem = {
  id: string;
  type: 'video';
  src: string;
  poster?: string;
  title?: string;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
  playsInline?: boolean;
};

export type MediaCarouselItem = MediaImageItem | MediaVideoItem;

export type MediaCarouselDraftItem = {
  id: string;
  type: 'image' | 'video';
  src: string;
  alt: string;
  caption: string;
  href: string;
  openInNewTab: boolean;
  poster: string;
  title: string;
  muted: boolean;
  controls: boolean;
  loop: boolean;
  playsInline: boolean;
};

export type MediaCarouselProps = {
  editorWidth?: number;
  editorHeight?: number;
  editorPosition?: 'flow' | 'absolute';
  editorX?: number;
  editorY?: number;
  items: MediaCarouselDraftItem[];
  loop: boolean;
  autoplay: boolean;
  autoplayDelay: number;
  pauseOnHover: boolean;
  showArrows: boolean;
  showDots: boolean;
  draggable: boolean;
  touch: boolean;
  slidesDesktop: number;
  slidesTablet: number;
  slidesMobile: number;
  gap: number;
  align: 'start' | 'center' | 'end';
  aspectRatio: 'auto' | '16/9' | '4/3' | '1/1' | '3/2';
  objectFit: 'cover' | 'contain';
};

export function normalizeMediaItem(item: MediaCarouselDraftItem, index: number): MediaCarouselItem {
  const id = item.id || `media-${index + 1}`;
  if (item.type === 'video') return { id, type: 'video', src: item.src, poster: item.poster || undefined, title: item.title || undefined, muted: item.muted, controls: item.controls, loop: item.loop, playsInline: item.playsInline };
  return { id, type: 'image', src: item.src, alt: item.alt, caption: item.caption || undefined, href: item.href || undefined, openInNewTab: item.openInNewTab };
}

export const defaultMediaCarouselItem = (): MediaCarouselDraftItem => ({ id: `media-${Date.now()}`, type: 'image', src: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=1200&q=80', alt: 'Sorriso saudável', caption: '', href: '', openInNewTab: false, poster: '', title: '', muted: true, controls: true, loop: false, playsInline: true });
