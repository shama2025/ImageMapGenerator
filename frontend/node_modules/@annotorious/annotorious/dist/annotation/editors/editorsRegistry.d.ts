import { SvelteComponent } from 'svelte';
import { ShapeType, Shape } from '../../model';
export declare const getEditor: (shape: Shape) => typeof SvelteComponent | undefined;
export declare const registerEditor: (shapeType: ShapeType, editor: typeof SvelteComponent) => Map<ShapeType, typeof SvelteComponent>;
