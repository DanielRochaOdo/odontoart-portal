import { Render } from '@puckeditor/core';
import { studioPuckConfig } from './studio-config';
import type { PageData } from './types';

export function PageRenderer({ data }: { data: PageData }) {
  return <Render config={studioPuckConfig} data={data} />;
}
