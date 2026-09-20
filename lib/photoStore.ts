/**
 * Progress photos, resolved per platform.
 *
 * Metro picks `.native` on a phone and `.web` in a browser; this file exists
 * so TypeScript and the editor have one module to point at, and so the choice
 * is visible rather than hidden in a resolver rule.
 */
export * from './photoStore.native';
