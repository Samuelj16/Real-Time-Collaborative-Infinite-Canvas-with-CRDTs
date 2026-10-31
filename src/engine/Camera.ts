import { BoundingBox, CameraState, Point } from '../types/canvas';

export class Camera {
  public state: CameraState = {
    x: 0,
    y: 0,
    zoom: 1,
  };

  public viewportWidth = window.innerWidth;
  public viewportHeight = window.innerHeight;

  public updateViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public screenToWorld(screenPoint: Point): Point {
    return {
      x: (screenPoint.x - this.viewportWidth / 2) / this.state.zoom + this.state.x,
      y: (screenPoint.y - this.viewportHeight / 2) / this.state.zoom + this.state.y,
    };
  }

  public worldToScreen(worldPoint: Point): Point {
    return {
      x: (worldPoint.x - this.state.x) * this.state.zoom + this.viewportWidth / 2,
      y: (worldPoint.y - this.state.y) * this.state.zoom + this.viewportHeight / 2,
    };
  }

  public panBy(deltaScreenX: number, deltaScreenY: number): void {
    this.state.x -= deltaScreenX / this.state.zoom;
    this.state.y -= deltaScreenY / this.state.zoom;
  }

  public zoomAt(screenPoint: Point, deltaFactor: number): void {
    const minZoom = 0.05;
    const maxZoom = 15;
    const oldZoom = this.state.zoom;
    const newZoom = Math.min(maxZoom, Math.max(minZoom, oldZoom * deltaFactor));

    if (newZoom === oldZoom) return;

    // Anchor point in world coordinates before zoom
    const worldPoint = this.screenToWorld(screenPoint);

    this.state.zoom = newZoom;

    // Adjust camera position so worldPoint remains under screenPoint
    this.state.x = worldPoint.x - (screenPoint.x - this.viewportWidth / 2) / newZoom;
    this.state.y = worldPoint.y - (screenPoint.y - this.viewportHeight / 2) / newZoom;
  }

  public reset(): void {
    this.state.x = 0;
    this.state.y = 0;
    this.state.zoom = 1;
  }

  public fitToBounds(bounds: BoundingBox, padding = 80): void {
    const contentWidth = bounds.maxX - bounds.minX;
    const contentHeight = bounds.maxY - bounds.minY;

    if (contentWidth <= 0 || contentHeight <= 0) {
      this.reset();
      return;
    }

    const zoomX = (this.viewportWidth - padding * 2) / contentWidth;
    const zoomY = (this.viewportHeight - padding * 2) / contentHeight;
    const targetZoom = Math.min(1.5, Math.max(0.1, Math.min(zoomX, zoomY)));

    this.state.zoom = targetZoom;
    this.state.x = (bounds.minX + bounds.maxX) / 2;
    this.state.y = (bounds.minY + bounds.maxY) / 2;
  }

  public getVisibleWorldBounds(buffer = 50): BoundingBox {
    const halfWidth = (this.viewportWidth / 2 + buffer) / this.state.zoom;
    const halfHeight = (this.viewportHeight / 2 + buffer) / this.state.zoom;

    return {
      minX: this.state.x - halfWidth,
      minY: this.state.y - halfHeight,
      maxX: this.state.x + halfWidth,
      maxY: this.state.y + halfHeight,
    };
  }
}

