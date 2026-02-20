import { MultiPolygon, MultiPolygonElement, MultiPolygonGeometry } from './MultiPolygon';
export declare const boundsFromMultiPolygonElements: (elements: MultiPolygonElement[]) => import('../Shape').Bounds;
export declare const multipolygonElementToPath: (element: MultiPolygonElement) => string;
export declare const getAllCorners: (geom: MultiPolygonGeometry) => [number, number][];
export declare const simplifyMultiPolygon: (multi: MultiPolygon, tolerance?: number) => MultiPolygon;
