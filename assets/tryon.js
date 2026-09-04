/* Virtual try-on provider hook.
 *
 * The design prototype's version of this file waited through fake progress
 * steps and then returned the user's own photo, labelled `provider: 'mock'`.
 * That is fine in a prototype and not fine on a live shop: a visitor would
 * reasonably believe they were looking at an AI render of themselves in the
 * garment. So until a real provider is wired up this reports honestly that
 * nothing is connected, and the UI says so.
 *
 * To enable it, implement `callProvider` and set PROVIDER to its name. Keep the
 * signature: ({ photo, productId, mode, onProgress }) => Promise<{ image, provider }>
 *   photo      data URL of the visitor's photo
 *   mode       'day' | 'night'
 *   onProgress optional (stepLabel) => void, for UI feedback
 * Returning `image: null` makes the UI show the not-connected state.
 */

export const STEPS = ['Reading pose', 'Segmenting garment zone', 'Fetching pair', 'Draping', 'Relighting', 'Rendering'];

/** Set to a provider name once callProvider below actually calls one. */
export const PROVIDER = null;

async function callProvider(/* { photo, productId, mode, onProgress } */) {
  throw new Error('no try-on provider configured');
}

export async function renderTryOn(opts) {
  if (!PROVIDER) {
    return {
      image: null,
      provider: 'none',
      message: 'No try-on provider is connected yet.'
    };
  }
  const out = await callProvider(opts);
  return { image: out.image, provider: PROVIDER };
}
