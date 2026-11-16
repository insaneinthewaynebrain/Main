/** Netlify Function: POST /api/link-preview — see server/handlers.ts. */
import type { Config, Context } from '@netlify/functions';
import { handleLinkPreview } from '../../server/handlers';

export default (req: Request, context: Context) => handleLinkPreview(req, { ip: context.ip });

export const config: Config = { path: '/api/link-preview' };
