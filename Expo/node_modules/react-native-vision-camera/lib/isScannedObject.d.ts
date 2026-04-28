import type { ScannedCode, ScannedFace, ScannedObject } from './specs/instances/ScannedObject.nitro';
/**
 * Returns `true` if the given {@linkcode ScannedObject}
 * is a {@linkcode ScannedCode} - a subclass of {@linkcode ScannedObject}
 * that provides a machine readable code with corner points.
 */
export declare function isScannedCode(object: ScannedObject): object is ScannedCode;
/**
 * Returns `true` if the given {@linkcode ScannedObject}
 * is a {@linkcode ScannedFace} - a subclass of {@linkcode ScannedObject}
 * that provides face metadata.
 */
export declare function isScannedFace(object: ScannedObject): object is ScannedFace;
