import { PolylineGeometry, PolylinePoint } from './Polyline';
export declare const approximateAsPolygon: (corners: PolylinePoint[], closed?: boolean) => [number, number][];
export declare const computeSVGPath: (geom: PolylineGeometry) => string;
