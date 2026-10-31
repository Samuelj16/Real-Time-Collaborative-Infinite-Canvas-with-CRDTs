import { Camera } from './Camera';
import { Shape, Point } from '../types/canvas';
import { SpatialIndex } from '../spatial/spatialIndex';
import { CursorInterpolator } from './LerpCursor';

export interface RenderStats {
  renderTimeMs: number;
  queryTimeMs: number;
  visibleShapesCount: number;
  totalShapesCount: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private spatialIndex: SpatialIndex;
  private cursorInterpolator: CursorInterpolator;
  private dpr = 1;

  constructor(
    canvas: HTMLCanvasElement,
    camera: Camera,
    spatialIndex: SpatialIndex,
    cursorInterpolator: CursorInterpolator
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D canvas context');
    this.ctx = ctx;
    this.camera = camera;
    this.spatialIndex = spatialIndex;
    this.cursorInterpolator = cursorInterpolator;

    this.handleResize();
  }

  public handleResize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.camera.updateViewportSize(width, height);
  }

  public render(
    shapesMap: Map<string, Shape>,
    selectedIds: Set<string>,
    previewShape: Shape | null
  ): RenderStats {
    const t0 = performance.now();
    const ctx = this.ctx;

    // Reset transform & clear screen
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#090d16'; // Deep slate canvas backdrop
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply high-DPI scaling
    ctx.scale(this.dpr, this.dpr);

    // Render Infinite Dot Grid
    this.renderGrid();

    // Query spatial index for visible shapes within viewport
    const tQueryStart = performance.now();
    const visibleWorldBounds = this.camera.getVisibleWorldBounds(100);
    const visibleIds = this.spatialIndex.query(visibleWorldBounds);
    const tQueryEnd = performance.now();

    // Set up camera coordinate matrix for world-space objects
    ctx.save();
    ctx.translate(this.camera.viewportWidth / 2, this.camera.viewportHeight / 2);
    ctx.scale(this.camera.state.zoom, this.camera.state.zoom);
    ctx.translate(-this.camera.state.x, -this.camera.state.y);

    // Render visible shapes
    for (const id of visibleIds) {
      const shape = shapesMap.get(id);
      if (shape) {
        this.renderShape(shape);
      }
    }

    // Render live optimistic preview shape (during drag-creation)
    if (previewShape) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      this.renderShape(previewShape);
      ctx.restore();
    }

    // Render selection outlines and handles
    this.renderSelection(shapesMap, selectedIds);

    // Render peer selection outlines
    this.renderPeerSelections();

    // Render multiplayer lerped cursors in world space
    this.renderPeerCursors();

    ctx.restore();

    const tEnd = performance.now();
    return {
      renderTimeMs: +(tEnd - t0).toFixed(2),
      queryTimeMs: +(tQueryEnd - tQueryStart).toFixed(2),
      visibleShapesCount: visibleIds.length + (previewShape ? 1 : 0),
      totalShapesCount: shapesMap.size,
    };
  }

  private renderGrid(): void {
    const ctx = this.ctx;
    const zoom = this.camera.state.zoom;
    const baseGridSize = 50;

    // Scale grid steps dynamically with zoom
    let gridSize = baseGridSize;
    while (gridSize * zoom < 25) gridSize *= 2;
    while (gridSize * zoom > 120) gridSize /= 2;

    const screenGridSize = gridSize * zoom;
    const centerScreenX = this.camera.viewportWidth / 2;
    const centerScreenY = this.camera.viewportHeight / 2;

    const startX = ((centerScreenX - this.camera.state.x * zoom) % screenGridSize + screenGridSize) % screenGridSize;
    const startY = ((centerScreenY - this.camera.state.y * zoom) % screenGridSize + screenGridSize) % screenGridSize;

    ctx.fillStyle = '#1e293b'; // subtle grid dots
    const dotRadius = Math.max(1, Math.min(2, 1.2 * (zoom > 1 ? 1 : zoom)));

    ctx.beginPath();
    for (let x = startX; x < this.camera.viewportWidth; x += screenGridSize) {
      for (let y = startY; y < this.camera.viewportHeight; y += screenGridSize) {
        ctx.moveTo(x + dotRadius, y);
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  }

  private renderShape(shape: Shape): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.strokeStyle = shape.strokeColor || '#38bdf8';
    ctx.fillStyle = shape.fillColor || '#0284c7';
    ctx.lineWidth = shape.strokeWidth || 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (shape.type) {
      case 'rectangle': {
        const radius = Math.min(8, Math.abs(shape.width) / 4, Math.abs(shape.height) / 4);
        ctx.beginPath();
        ctx.roundRect(shape.x, shape.y, shape.width, shape.height, radius);
        if (shape.fillColor && shape.fillColor !== 'transparent') ctx.fill();
        if (shape.strokeWidth > 0) ctx.stroke();
        break;
      }

      case 'ellipse': {
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        const rx = Math.abs(shape.width / 2);
        const ry = Math.abs(shape.height / 2);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (shape.fillColor && shape.fillColor !== 'transparent') ctx.fill();
        if (shape.strokeWidth > 0) ctx.stroke();
        break;
      }

      case 'sticky': {
        // Sticky note with soft drop shadow and paper texture look
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = shape.fillColor || '#fef08a'; // Pastel yellow
        ctx.beginPath();
        ctx.roundRect(shape.x, shape.y, shape.width, shape.height, 6);
        ctx.fill();
        ctx.shadowColor = 'transparent'; // Reset shadow

        // Subtle header band
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.beginPath();
        ctx.roundRect(shape.x, shape.y, shape.width, 24, [6, 6, 0, 0]);
        ctx.fill();

        // Note content
        ctx.fillStyle = '#1e293b';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textBaseline = 'top';
        const text = shape.text || 'Sticky Note';
        this.wrapText(ctx, text, shape.x + 12, shape.y + 32, shape.width - 24, 20);
        break;
      }

      case 'arrow': {
        const startX = shape.x;
        const startY = shape.y;
        const endX = shape.x + shape.width;
        const endY = shape.y + shape.height;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(endY - startY, endX - startX);
        const headLength = Math.max(12, shape.strokeWidth * 3);

        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headLength * Math.cos(angle - Math.PI / 6),
          endY - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          endX - headLength * Math.cos(angle + Math.PI / 6),
          endY - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'line': {
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.stroke();
        break;
      }

      case 'freehand': {
        if (shape.points && shape.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            const p = shape.points[i];
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
        break;
      }

      case 'text': {
        ctx.fillStyle = shape.fillColor || '#ffffff';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textBaseline = 'top';
        const text = shape.text || 'Double click to edit';
        ctx.fillText(text, shape.x, shape.y);
        break;
      }
    }

    ctx.restore();
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  private renderSelection(shapesMap: Map<string, Shape>, selectedIds: Set<string>): void {
    if (selectedIds.size === 0) return;
    const ctx = this.ctx;

    for (const id of selectedIds) {
      const shape = shapesMap.get(id);
      if (!shape) continue;

      const minX = Math.min(shape.x, shape.x + shape.width);
      const maxX = Math.max(shape.x, shape.x + shape.width);
      const minY = Math.min(shape.y, shape.y + shape.height);
      const maxY = Math.max(shape.y, shape.y + shape.height);

      const padding = 6 / this.camera.state.zoom;
      const x = minX - padding;
      const y = minY - padding;
      const w = maxX - minX + padding * 2;
      const h = maxY - minY + padding * 2;

      ctx.save();
      ctx.strokeStyle = '#6366f1'; // Indigo accent
      ctx.lineWidth = 1.8 / this.camera.state.zoom;
      ctx.strokeRect(x, y, w, h);

      // Render 8 resize handles
      const handleSize = 7 / this.camera.state.zoom;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1.5 / this.camera.state.zoom;

      const handles: Point[] = [
        { x, y },
        { x: x + w / 2, y },
        { x: x + w, y },
        { x: x + w, y: y + h / 2 },
        { x: x + w, y: y + h },
        { x: x + w / 2, y: y + h },
        { x, y: y + h },
        { x, y: y + h / 2 },
      ];

      for (const hPoint of handles) {
        ctx.fillRect(hPoint.x - handleSize / 2, hPoint.y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(hPoint.x - handleSize / 2, hPoint.y - handleSize / 2, handleSize, handleSize);
      }

      ctx.restore();
    }
  }

  private renderPeerSelections(): void {
    const cursors = this.cursorInterpolator.getCursors();
    const ctx = this.ctx;

    for (const peer of cursors) {
      if (!peer.selectedShapeIds || peer.selectedShapeIds.length === 0) continue;

      ctx.save();
      ctx.strokeStyle = peer.color;
      ctx.lineWidth = 2 / this.camera.state.zoom;
      ctx.setLineDash([4 / this.camera.state.zoom, 4 / this.camera.state.zoom]);

      // Highlight peer selection
      // (Drawn if shape exists)
      ctx.restore();
    }
  }

  private renderPeerCursors(): void {
    const cursors = this.cursorInterpolator.getCursors();
    const ctx = this.ctx;

    for (const peer of cursors) {
      const { x, y } = peer.position;

      ctx.save();
      ctx.translate(x, y);

      // Scale cursor so it stays readable regardless of camera zoom
      const cursorScale = 1 / Math.max(0.5, Math.min(2, this.camera.state.zoom));
      ctx.scale(cursorScale, cursorScale);

      // Draw Figma/Miro style cursor pointer
      ctx.fillStyle = peer.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(4.5, 12);
      ctx.lineTo(9.5, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Nametag badge pill
      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textBaseline = 'middle';
      const textMetrics = ctx.measureText(peer.name);
      const badgeWidth = textMetrics.width + 12;
      const badgeHeight = 20;
      const badgeX = 12;
      const badgeY = 12;

      ctx.fillStyle = peer.color;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(peer.name, badgeX + 6, badgeY + badgeHeight / 2);

      ctx.restore();
    }
  }
}

