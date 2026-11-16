/** Netlify Function: POST /api/mot — see server/handlers.ts. */
import type { Config, Context } from '@netlify/functions';
import { handleMot } from '../../server/handlers';

export default (req: Request, context: Context) => handleMot(req, { ip: context.ip });

export const config: Config = { path: '/api/mot' };
