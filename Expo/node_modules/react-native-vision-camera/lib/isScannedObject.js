/**
 * Returns `true` if the given {@linkcode ScannedObject}
 * is a {@linkcode ScannedCode} - a subclass of {@linkcode ScannedObject}
 * that provides a machine readable code with corner points.
 */
export function isScannedCode(object) {
    return 'value' in object;
}
/**
 * Returns `true` if the given {@linkcode ScannedObject}
 * is a {@linkcode ScannedFace} - a subclass of {@linkcode ScannedObject}
 * that provides face metadata.
 */
export function isScannedFace(object) {
    return 'faceID' in object;
}
