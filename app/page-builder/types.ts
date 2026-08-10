import type { Data } from '@puckeditor/core';

export type PageStatus = 'draft' | 'published' | 'archived';
export type PageKind = 'SYSTEM' | 'CUSTOM';

export type PageRecord = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: PageStatus;
  kind: PageKind;
  draftContent: PageData;
  publishedContent: PageData | null;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  legacy?: { html?: string; css?: string; projectData?: Record<string, unknown> };
};

export type PageData = Data;

export const emptyPageData: PageData = { content: [], root: {} };
