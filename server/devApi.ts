/**
 * Vite plugin: serves /api/* from the same handlers the Netlify Functions use,
 * so `npm run dev` works without installing the Netlify CLI.
 * Reads .env from the project root. With no DVLA key it switches to MOCK_MODE.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { loadEnv, type Plugin, type ViteDevServer } from 'vite';

const ROUTES: Record<string, 'handleVehicle' | 'handleMot' | 'handleLinkPreview' | 'handleHealth'> = {
  '/api/vehicle': 'handleVehicle',
  '/api/mot': 'handleMot',
  '/api/link-preview': 'handleLinkPreview',
  '/api/health': 'handleHealth',
};

export function devApi(projectRoot: string): Plugin {
  return {
    name: 'hp-calc-dev-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      const fileEnv = loadEnv('development', projectRoot, '');
      for (const [k, v] of Object.entries(fileEnv)) if (process.env[k] === undefined) process.env[k] = v;
      if (!process.env.DVLA_API_KEY && process.env.MOCK_MODE === undefined) process.env.MOCK_MODE = '1';
      const mode = ['1', 'true', 'yes'].includes((process.env.MOCK_MODE ?? '').toLowerCase()) ? 'MOCK MODE (sample cars)' : 'LIVE APIs';
      server.config.logger.info(`  ➜  API:     /api/* running in ${mode}`);

      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const path = (req.url ?? '').split('?')[0];
        const handlerName = ROUTES[path];
        if (!handlerName) return next();
        try {
          const mod = await server.ssrLoadModule(resolve(projectRoot, 'server/handlers.ts'));
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
          const request = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          });
          const response: Response = await mod[handlerName](request, { ip: req.socket.remoteAddress ?? 'local' });
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          server.config.logger.error(`[dev-api] ${(e as Error).message}`);
          res.statusCode = 500;
          res.end('{"error":{"code":"UNAVAILABLE","message":"Dev API error"}}');
        }
      });
    },
  };
}
