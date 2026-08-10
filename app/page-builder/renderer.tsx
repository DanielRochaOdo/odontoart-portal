import { Render } from '@puckeditor/core';
import { puckConfig } from './config';
import type { PageData } from './types';

export function PageRenderer({ data }: { data: PageData }) { return <Render config={puckConfig} data={data} />; }
