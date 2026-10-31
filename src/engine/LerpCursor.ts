import { Point, UserPresence } from '../types/canvas';

interface InterpolatedCursor {
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
  name: string;
  color: string;
  selectedShapeIds: string[];
  lastUpdate: number;
}

export class CursorInterpolator {
  private remoteCursors: Map<string, InterpolatedCursor> = new Map();
  private readonly LERP_FACTOR = 0.28; // Balance between instant responsiveness and buttery smoothness

  public updatePeerState(presenceList: UserPresence[], localUserId: string): void {
    const activeIds = new Set<string>();

    for (const user of presenceList) {
      if (user.id === localUserId) continue; // Skip local user
      activeIds.add(user.id);

      if (!user.cursor) {
        this.remoteCursors.delete(user.id);
        continue;
      }

      const existing = this.remoteCursors.get(user.id);
      if (existing) {
        existing.targetX = user.cursor.x;
        existing.targetY = user.cursor.y;
        existing.name = user.name;
        existing.color = user.color;
        existing.selectedShapeIds = user.selectedShapeIds || [];
        existing.lastUpdate = Date.now();
      } else {
        // Initialize at target immediately on first packet
        this.remoteCursors.set(user.id, {
          currentX: user.cursor.x,
          currentY: user.cursor.y,
          targetX: user.cursor.x,
          targetY: user.cursor.y,
          name: user.name,
          color: user.color,
          selectedShapeIds: user.selectedShapeIds || [],
          lastUpdate: Date.now(),
        });
      }
    }

    // Prune stale cursors (disconnected or idle > 30 seconds)
    const now = Date.now();
    for (const [id, cursor] of this.remoteCursors.entries()) {
      if (!activeIds.has(id) || now - cursor.lastUpdate > 30000) {
        this.remoteCursors.delete(id);
      }
    }
  }

  /**
   * Advances the interpolation step each animation frame.
   */
  public tick(): void {
    for (const cursor of this.remoteCursors.values()) {
      // Lerp equation: v_new = v_cur + (v_target - v_cur) * factor
      cursor.currentX += (cursor.targetX - cursor.currentX) * this.LERP_FACTOR;
      cursor.currentY += (cursor.targetY - cursor.currentY) * this.LERP_FACTOR;
    }
  }

  public getCursors(): Array<{
    id: string;
    position: Point;
    name: string;
    color: string;
    selectedShapeIds: string[];
  }> {
    const list: Array<{
      id: string;
      position: Point;
      name: string;
      color: string;
      selectedShapeIds: string[];
    }> = [];

    for (const [id, cursor] of this.remoteCursors.entries()) {
      list.push({
        id,
        position: { x: cursor.currentX, y: cursor.currentY },
        name: cursor.name,
        color: cursor.color,
        selectedShapeIds: cursor.selectedShapeIds,
      });
    }

    return list;
  }
}

