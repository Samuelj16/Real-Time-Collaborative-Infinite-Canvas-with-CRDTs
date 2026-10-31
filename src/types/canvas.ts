export type ShapeType =
  | 'rectangle'
  | 'ellipse'
  | 'sticky'
  | 'arrow'
  | 'line'
  | 'freehand'
  | 'text';

export type ToolType =
  | 'select'
  | 'pan'
  | ShapeType;

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  text?: string;
  points?: Point[]; // for freehand strokes
  authorId: string;
  authorName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CameraState {
  x: number; // camera center in world coordinates
  y: number;
  zoom: number; // 0.1 to 10
}

export interface UserPresence {
  id: string;
  name: string;
  color: string;
  cursor: Point | null; // world coordinates
  selectedShapeIds: string[];
  lastActive: number;
}

export interface PerformanceStats {
  fps: number;
  frameTimeMs: number;
  totalShapes: number;
  visibleShapes: number;
  cullPercentage: number;
  queryTimeMs: number;
}

export interface SpatialItem extends BoundingBox {
  id: string;
}

