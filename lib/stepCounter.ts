/**
 * The step counter, resolved per platform: Metro picks `.native` on a phone
 * and `.web` in a browser. This file exists so TypeScript has one module to
 * point at, and so the split is visible rather than hidden in a resolver rule.
 */
export * from './stepCounter.native';
