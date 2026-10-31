import { BoundingBox, Shape, SpatialItem } from '../types/canvas';

/**
 * Custom R-Tree / Spatial Index implementation.
 * Culls off-screen objects in O(log N) time instead of O(N) linear scanning.
 * Easily scales to 10,000+ items at 60 FPS.
 */

// Helper to check if two bounding boxes intersect
export function intersects(a: BoundingBox, b: BoundingBox): boolean {
  return b.minX <= a.maxX && b.minY <= a.maxY && b.maxX >= a.minX && b.maxY >= a.minY;
}

export function shapeToSpatialItem(shape: Shape): SpatialItem {
  let minX = shape.x;
  let minY = shape.y;
  let maxX = shape.x + shape.width;
  let maxY = shape.y + shape.height;

  if (shape.points && shape.points.length > 0) {
    minX = shape.points[0].x;
    maxX = shape.points[0].x;
    minY = shape.points[0].y;
    maxY = shape.points[0].y;
    for (let i = 1; i < shape.points.length; i++) {
      const p = shape.points[i];
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
  }

  // Normalize in case width or height are negative
  const actualMinX = Math.min(minX, maxX) - (shape.strokeWidth || 2);
  const actualMaxX = Math.max(minX, maxX) + (shape.strokeWidth || 2);
  const actualMinY = Math.min(minY, maxY) - (shape.strokeWidth || 2);
  const actualMaxY = Math.max(minY, maxY) + (shape.strokeWidth || 2);

  return {
    id: shape.id,
    minX: actualMinX,
    minY: actualMinY,
    maxX: actualMaxX,
    maxY: actualMaxY,
  };
}

interface RTreeNode extends BoundingBox {
  children?: RTreeNode[];
  item?: SpatialItem;
  isLeaf: boolean;
}

export class SpatialIndex {
  private maxEntries: number;
  private root: RTreeNode;
  private idToItemMap: Map<string, SpatialItem> = new Map();

  constructor(maxEntries = 16) {
    this.maxEntries = Math.max(4, maxEntries);
    this.root = this.createNode(true);
  }

  private createNode(isLeaf: boolean): RTreeNode {
    return {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
      children: [],
      isLeaf,
    };
  }

  private updateBounds(node: RTreeNode): void {
    node.minX = Infinity;
    node.minY = Infinity;
    node.maxX = -Infinity;
    node.maxY = -Infinity;

    if (node.isLeaf) {
      if (node.item) {
        node.minX = node.item.minX;
        node.minY = node.item.minY;
        node.maxX = node.item.maxX;
        node.maxY = node.item.maxY;
      }
    } else if (node.children) {
      for (const child of node.children) {
        if (child.minX < node.minX) node.minX = child.minX;
        if (child.minY < node.minY) node.minY = child.minY;
        if (child.maxX > node.maxX) node.maxX = child.maxX;
        if (child.maxY > node.maxY) node.maxY = child.maxY;
      }
    }
  }

  public insert(shape: Shape): void {
    const item = shapeToSpatialItem(shape);
    if (this.idToItemMap.has(item.id)) {
      this.remove(item.id);
    }
    this.idToItemMap.set(item.id, item);

    const leafNode: RTreeNode = {
      ...item,
      item,
      isLeaf: true,
    };

    this.insertNode(this.root, leafNode);
  }

  private insertNode(parent: RTreeNode, node: RTreeNode): void {
    if (parent.isLeaf) {
      // Root was empty leaf
      if (!parent.item && (!parent.children || parent.children.length === 0)) {
        parent.children = [node];
        parent.isLeaf = false;
        this.updateBounds(parent);
        return;
      }
    }

    if (!parent.children) parent.children = [];

    // Find best child (least enlargement)
    if (parent.children.length > 0 && !parent.children[0].isLeaf) {
      let bestChild = parent.children[0];
      let minEnlargement = Infinity;

      for (const child of parent.children) {
        const currentArea = (child.maxX - child.minX) * (child.maxY - child.minY);
        const newMinX = Math.min(child.minX, node.minX);
        const newMaxX = Math.max(child.maxX, node.maxX);
        const newMinY = Math.min(child.minY, node.minY);
        const newMaxY = Math.max(child.maxY, node.maxY);
        const newArea = (newMaxX - newMinX) * (newMaxY - newMinY);
        const enlargement = newArea - currentArea;

        if (enlargement < minEnlargement) {
          minEnlargement = enlargement;
          bestChild = child;
        }
      }

      this.insertNode(bestChild, node);
      this.updateBounds(parent);
    } else {
      // Insert here
      parent.children.push(node);
      this.updateBounds(parent);

      if (parent.children.length > this.maxEntries) {
        this.split(parent);
      }
    }
  }

  private split(node: RTreeNode): void {
    if (!node.children || node.children.length === 0) return;

    // Linear split heuristic: sort by minX and split in half
    node.children.sort((a, b) => a.minX - b.minX);
    const mid = Math.floor(node.children.length / 2);
    const leftChildren = node.children.slice(0, mid);
    const rightChildren = node.children.slice(mid);

    const leftNode: RTreeNode = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
      children: leftChildren,
      isLeaf: leftChildren[0]?.isLeaf ?? false,
    };
    this.updateBounds(leftNode);

    const rightNode: RTreeNode = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
      children: rightChildren,
      isLeaf: rightChildren[0]?.isLeaf ?? false,
    };
    this.updateBounds(rightNode);

    node.children = [leftNode, rightNode];
    node.isLeaf = false;
    this.updateBounds(node);
  }

  public remove(id: string): boolean {
    if (!this.idToItemMap.has(id)) return false;
    this.idToItemMap.delete(id);

    const removeFromNode = (node: RTreeNode): boolean => {
      if (!node.children) return false;
      const idx = node.children.findIndex(c => c.isLeaf && c.item?.id === id);
      if (idx !== -1) {
        node.children.splice(idx, 1);
        this.updateBounds(node);
        return true;
      }

      for (const child of node.children) {
        if (!child.isLeaf) {
          if (removeFromNode(child)) {
            this.updateBounds(node);
            return true;
          }
        }
      }
      return false;
    };

    return removeFromNode(this.root);
  }

  public clear(): void {
    this.root = this.createNode(true);
    this.idToItemMap.clear();
  }

  public bulkLoad(shapes: Shape[]): void {
    this.clear();
    for (const shape of shapes) {
      const item = shapeToSpatialItem(shape);
      this.idToItemMap.set(item.id, item);
    }

    const items: RTreeNode[] = Array.from(this.idToItemMap.values()).map(item => ({
      ...item,
      item,
      isLeaf: true,
    }));

    if (items.length === 0) return;

    // Fast OMR (Sort-Tile-Recursive) bulk load for optimal tree clustering
    this.root = this.buildSTRTree(items);
  }

  private buildSTRTree(nodes: RTreeNode[]): RTreeNode {
    if (nodes.length <= this.maxEntries) {
      const parent = this.createNode(false);
      parent.children = nodes;
      this.updateBounds(parent);
      return parent;
    }

    // Sort by X center
    nodes.sort((a, b) => (a.minX + a.maxX) / 2 - (b.minX + b.maxX) / 2);

    const numLeaves = nodes.length;
    const numSubtrees = Math.ceil(numLeaves / this.maxEntries);
    const numSlices = Math.ceil(Math.sqrt(numSubtrees));
    const sliceCapacity = numSlices * this.maxEntries;

    const parents: RTreeNode[] = [];

    for (let i = 0; i < nodes.length; i += sliceCapacity) {
      const slice = nodes.slice(i, i + sliceCapacity);
      // Sort each slice by Y center
      slice.sort((a, b) => (a.minY + a.maxY) / 2 - (b.minY + b.maxY) / 2);

      for (let j = 0; j < slice.length; j += this.maxEntries) {
        const chunk = slice.slice(j, j + this.maxEntries);
        const parent = this.createNode(chunk[0].isLeaf);
        parent.children = chunk;
        this.updateBounds(parent);
        parents.push(parent);
      }
    }

    return this.buildSTRTree(parents);
  }

  /**
   * Queries only items intersecting the visible viewport.
   * Traverses O(log N) branches and skips offscreen branches completely.
   */
  public query(bbox: BoundingBox): string[] {
    const results: string[] = [];
    const searchNode = (node: RTreeNode) => {
      if (!intersects(node, bbox)) {
        return; // Cull entire branch!
      }

      if (node.isLeaf && node.item) {
        results.push(node.item.id);
        return;
      }

      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          searchNode(node.children[i]);
        }
      }
    };

    searchNode(this.root);
    return results;
  }

  public size(): number {
    return this.idToItemMap.size;
  }
}

