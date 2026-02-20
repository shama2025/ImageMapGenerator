import { MultiPolygonGeometry } from '../../../model';
export interface MultipolygonMidpoint {
    point: [number, number];
    visible: boolean;
    elementIdx: number;
    ringIdx: number;
    pointIdx: number;
}
export declare const computeMidpoints: (geom: MultiPolygonGeometry, viewportScale: number) => MultipolygonMidpoint[];
