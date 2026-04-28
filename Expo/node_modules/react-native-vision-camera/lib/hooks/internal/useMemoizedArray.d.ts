/**
 * Shallow-memoizes an array by flattening out
 * the useMemo `deps` to {@linkcode maxComparisonLength}.
 */
export declare function useMemoizedArray<T>(array: T[], maxComparisonLength?: number): T[];
