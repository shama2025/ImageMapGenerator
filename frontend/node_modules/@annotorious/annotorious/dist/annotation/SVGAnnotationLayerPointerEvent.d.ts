import { Annotation } from '@annotorious/core';
import { SvelteImageAnnotationStore } from '../state';
export interface SVGAnnotationLayerPointerEvent<T extends Annotation> {
    originalEvent: PointerEvent;
    annotation?: T;
}
export declare const addEventListeners: <T extends Annotation>(svg: SVGSVGElement, store: SvelteImageAnnotationStore<T>) => {
    onPointerDown: () => number;
    onPointerUp: (evt: PointerEvent) => void;
};
export declare const getSVGPoint: (evt: PointerEvent, svg: SVGSVGElement) => DOMPoint;
