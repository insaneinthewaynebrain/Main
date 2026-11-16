/** Netlify Function: POST /api/vehicle — see server/handlers.ts. */
import type { Config, Context } from '@netlify/functions';
import { handleVehicle } from '../../server/handlers';

export default (req: Request, context: Context) => handleVehicle(req, { ip: context.ip });

export const config: Config = { path: '/api/vehicle' };
