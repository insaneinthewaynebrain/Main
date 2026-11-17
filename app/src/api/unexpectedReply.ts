/**
 * Explains a reply from /api/* that isn't the JSON our functions send.
 * Plain logic so it can be unit tested.
 */
import type { ApiError } from '../domain/vehicle/types';

export function explainUnexpectedReply(status: number, body: string, hostname: string): ApiError {
  // The GitHub Pages copy has no server functions at all.
  if (/\.github\.io$/i.test(hostname)) {
    return {
      code: 'NOT_CONFIGURED',
      message: "Registration lookup isn't available on this copy of the app. Enter the registration date manually below.",
    };
  }
  // Netlify "Visitor access" / site protection answers with a login page.
  if (/edge-access|Login Redirect|Password Protected|app\.netlify\.com/i.test(body) || (status === 401 && /<html/i.test(body))) {
    return {
      code: 'NOT_CONFIGURED',
      message:
        "Netlify's site protection (visitor login) is blocking lookups. In Netlify, turn off Visitor access → Site protection for this site — the app's own passcode still protects lookups.",
    };
  }
  if (status === 404) {
    return {
      code: 'NOT_CONFIGURED',
      message: "The lookup service wasn't found on this site (404). In Netlify, check the latest deploy lists the vehicle, mot and link-preview functions.",
    };
  }
  if (status >= 500) {
    return { code: 'UNAVAILABLE', message: `The lookup service failed (error ${status}). Try again shortly; if it keeps happening, check Netlify's function logs.` };
  }
  return { code: 'UNAVAILABLE', message: `The lookup service gave an unexpected reply (error ${status}). Please try again.` };
}
