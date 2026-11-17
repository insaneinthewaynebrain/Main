/** Netlify Function: GET /api/health — confirms the functions are deployed (no secrets shown). */
import type { Config } from '@netlify/functions';
import { handleHealth } from '../../server/handlers';

export default (req: Request) => handleHealth(req);

export const config: Config = { path: '/api/health' };
