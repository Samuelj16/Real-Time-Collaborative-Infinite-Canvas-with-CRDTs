import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera } from './engine/Camera';
import { SpatialIndex } from './spatial/spatialIndex';
import { CursorInterpolator } from './engine/LerpCursor';
import { CanvasRenderer } from './engine/CanvasRenderer';
import {
  currentUser,
  yShapes,
  wsProvider,
  awareness,
  addOrUpdateShape,
  bulkAddShapes,
  deleteShapes,
  clearCanvas,
  broadcastCursor,
  broadcastSelection,
} from './crdt/doc';
import { undo, redo, undoManager } from './crdt/undoManager';
import {
  Shape,
  ToolType,
  Point,
  UserPresence,
  PerformanceStats,
  BoundingBox,
} from './types/canvas';
import { Toolbar } from './components/Toolbar';
import { StylePicker } from './components/StylePicker';
import { PerformanceHUD } from './components/PerformanceHUD';
import { PresenceBar } from './components/PresenceBar';
import { ZoomControls } from './components/ZoomControls';
import { ShortcutsModal } from './components/ShortcutsModal';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Engine singletons
  const cameraRef = useRef<Camera>(new Camera());
  const spatialIndexRef = useRef<SpatialIndex>(new SpatialIndex(16));
  const cursorInterpolatorRef = useRef<CursorInterpolator>(new CursorInterpolator());
  const rendererRef = useRef<CanvasRenderer | null>(null);

  // Application state
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [strokeColor, setStrokeColor] = useState<string>('#38bdf8');
  const [fillColor, setFillColor] = useState<string>('#0284c7');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewShape, setPreviewShape] = useState<Shape | null>(null);
  const [canUndoState, setCanUndoState] = useState<boolean>(false);
  const [canRedoState, setCanRedoState] = useState<boolean>(false);

  // Multiplayer state
  const [peers, setPeers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Performance HUD stats
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 60,
    frameTimeMs: 0,
    totalShapes: 0,
    visibleShapes: 0,
    cullPercentage: 0,
    queryTimeMs: 0,
  });

  const [isSpawning, setIsSpawning] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Interactive interaction flags
  const isDraggingRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const isSpacePressedRef = useRef<boolean>(false);
  const dragStartWorldRef = useRef<Point>({ x: 0, y: 0 });
  const dragStartScreenRef = useRef<Point>({ x: 0, y: 0 });
  const dragInitialShapePosRef = useRef<Map<string, Point>>(new Map());
  const freehandPointsRef = useRef<Point[]>([]);

  // Throttled cursor broadcast
  const lastBroadcastTimeRef = useRef<number>(0);

  // 1. Initialize Canvas Renderer & Subscriptions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const camera = cameraRef.current;
    const spatialIndex = spatialIndexRef.current;
    const cursorInterpolator = cursorInterpolatorRef.current;

    rendererRef.current = new CanvasRenderer(canvas, camera, spatialIndex, cursorInterpolator);

    const handleResize = () => {
      rendererRef.current?.handleResize();
    };
    window.addEventListener('resize', handleResize);

    // Initial shape load from CRDT
    const shapesMap = new Map<string, Shape>();
    yShapes.forEach((shape, id) => {
      shapesMap.set(id, shape);
      spatialIndex.insert(shape);
    });

    // Listen to CRDT mutations
    const handleYShapesChange = () => {
      // Re-index mutated or deleted items in R-Tree
      const currentKeys = new Set(yShapes.keys());

      // Insert/update all current shapes
      yShapes.forEach(shape => {
        spatialIndex.insert(shape);
      });

      // Remove deleted shapes
      for (const id of Array.from(shapesMap.keys())) {
        if (!currentKeys.has(id)) {
          spatialIndex.remove(id);
          shapesMap.delete(id);
        }
      }

      setCanUndoState(undoManager.canUndo());
      setCanRedoState(undoManager.canRedo());
    };

    yShapes.observe(handleYShapesChange);

    // Track UndoManager stack updates
    const handleUndoManagerUpdate = () => {
      setCanUndoState(undoManager.canUndo());
      setCanRedoState(undoManager.canRedo());
    };
    undoManager.on('stack-item-added', handleUndoManagerUpdate);
    undoManager.on('stack-item-popped', handleUndoManagerUpdate);

    // WebSocket status
    const handleStatus = (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    };
    wsProvider.on('status', handleStatus);
    setIsConnected(wsProvider.wsconnected);

    // Awareness for peers
    const handleAwarenessChange = () => {
      const states = Array.from(awareness.getStates().values()) as Array<{ user?: UserPresence }>;
      const activePeers: UserPresence[] = [];

      for (const state of states) {
        if (state.user && state.user.id !== currentUser.id) {
          activePeers.push(state.user);
        }
      }

      setPeers(activePeers);
      cursorInterpolator.updatePeerState(activePeers, currentUser.id);
    };
    awareness.on('change', handleAwarenessChange);

    // 2. 60 FPS Render Loop with Frame Profiling
    let animationFrameId: number;
    let frameCount = 0;
    let fpsTimer = performance.now();

    const loop = (timestamp: number) => {
      frameCount++;

      // Update FPS every 30 frames
      if (timestamp - fpsTimer >= 500) {
        const computedFps = Math.round((frameCount * 1000) / (timestamp - fpsTimer));
        frameCount = 0;
        fpsTimer = timestamp;

        // Populate local map for renderer
        const activeShapes = new Map<string, Shape>();
        yShapes.forEach((shape, id) => activeShapes.set(id, shape));

        const visibleWorldBounds = camera.getVisibleWorldBounds();
        const visibleIds = spatialIndex.query(visibleWorldBounds);
        const total = yShapes.size;
        const visible = visibleIds.length;
        const cullPct = total > 0 ? Math.max(0, ((total - visible) / total) * 100) : 0;

        setStats(prev => ({
          ...prev,
          fps: Math.min(60, computedFps),
          totalShapes: total,
          visibleShapes: visible,
          cullPercentage: cullPct,
        }));
      }

      // Advance cursor interpolation
      cursorInterpolator.tick();

      // Collect shapes Map
      const currentShapesMap = new Map<string, Shape>();
      yShapes.forEach((shape, id) => currentShapesMap.set(id, shape));

      // Render
      if (rendererRef.current) {
        const renderResult = rendererRef.current.render(
          currentShapesMap,
          selectedIds,
          previewShape
        );

        // Update timing metrics
        setStats(prev => ({
          ...prev,
          frameTimeMs: renderResult.renderTimeMs,
          queryTimeMs: renderResult.queryTimeMs,
        }));
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      yShapes.unobserve(handleYShapesChange);
      undoManager.off('stack-item-added', handleUndoManagerUpdate);
      undoManager.off('stack-item-popped', handleUndoManagerUpdate);
      wsProvider.off('status', handleStatus);
      awareness.off('change', handleAwarenessChange);
    };
  }, [selectedIds, previewShape]);

  // 3. Pointer & Mouse Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    const camera = cameraRef.current;
    const screenPoint = { x: e.clientX, y: e.clientY };
    const worldPoint = camera.screenToWorld(screenPoint);

    dragStartScreenRef.current = screenPoint;
    dragStartWorldRef.current = worldPoint;

    // Pan mode (middle click, or Hand tool, or Space + Click)
    if (e.button === 1 || currentTool === 'pan' || isSpacePressedRef.current) {
      isPanningRef.current = true;
      return;
    }

    if (e.button !== 0) return; // Only primary mouse button

    if (currentTool === 'select') {
      // Hit test existing shapes in spatial index
      const hitTolerance = 10 / camera.state.zoom;
      const queryBox: BoundingBox = {
        minX: worldPoint.x - hitTolerance,
        minY: worldPoint.y - hitTolerance,
        maxX: worldPoint.x + hitTolerance,
        maxY: worldPoint.y + hitTolerance,
      };

      const candidateIds = spatialIndexRef.current.query(queryBox);
      let hitId: string | null = null;

      // Select top-most shape
      for (let i = candidateIds.length - 1; i >= 0; i--) {
        const shape = yShapes.get(candidateIds[i]);
        if (shape) {
          const minX = Math.min(shape.x, shape.x + shape.width);
          const maxX = Math.max(shape.x, shape.x + shape.width);
          const minY = Math.min(shape.y, shape.y + shape.height);
          const maxY = Math.max(shape.y, shape.y + shape.height);

          if (
            worldPoint.x >= minX - hitTolerance &&
            worldPoint.x <= maxX + hitTolerance &&
            worldPoint.y >= minY - hitTolerance &&
            worldPoint.y <= maxY + hitTolerance
          ) {
            hitId = shape.id;
            break;
          }
        }
      }

      if (hitId) {
        const newSelected = new Set(e.shiftKey ? selectedIds : []);
        newSelected.add(hitId);
        setSelectedIds(newSelected);
        broadcastSelection(Array.from(newSelected));

        // Prepare drag initial positions
        dragInitialShapePosRef.current.clear();
        newSelected.forEach(id => {
          const s = yShapes.get(id);
          if (s) dragInitialShapePosRef.current.set(id, { x: s.x, y: s.y });
        });
        isDraggingRef.current = true;
      } else {
        setSelectedIds(new Set());
        broadcastSelection([]);
      }
    } else {
      // Shape creation mode
      isDraggingRef.current = true;
      if (currentTool === 'freehand') {
        freehandPointsRef.current = [worldPoint];
      }

      const initialShape: Shape = {
        id: `shape_${Math.random().toString(36).substring(2, 9)}`,
        type: currentTool,
        x: worldPoint.x,
        y: worldPoint.y,
        width: 1,
        height: 1,
        strokeColor,
        fillColor,
        strokeWidth,
        text: currentTool === 'sticky' ? 'Sticky Note' : currentTool === 'text' ? 'Text label' : undefined,
        points: currentTool === 'freehand' ? [worldPoint] : undefined,
        authorId: currentUser.id,
        authorName: currentUser.name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setPreviewShape(initialShape);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const camera = cameraRef.current;
    const screenPoint = { x: e.clientX, y: e.clientY };
    const worldPoint = camera.screenToWorld(screenPoint);

    // Throttle cursor broadcast over WebSockets (~40ms / 25Hz to save bandwidth; lerp smooths client-side)
    const now = performance.now();
    if (now - lastBroadcastTimeRef.current > 35) {
      lastBroadcastTimeRef.current = now;
      broadcastCursor(worldPoint);
    }

    // Panning canvas
    if (isPanningRef.current) {
      const deltaX = screenPoint.x - dragStartScreenRef.current.x;
      const deltaY = screenPoint.y - dragStartScreenRef.current.y;
      camera.panBy(deltaX, deltaY);
      dragStartScreenRef.current = screenPoint;
      return;
    }

    // Dragging selected shapes
    if (isDraggingRef.current && currentTool === 'select') {
      const deltaX = worldPoint.x - dragStartWorldRef.current.x;
      const deltaY = worldPoint.y - dragStartWorldRef.current.y;

      selectedIds.forEach(id => {
        const initPos = dragInitialShapePosRef.current.get(id);
        const shape = yShapes.get(id);
        if (initPos && shape) {
          addOrUpdateShape({
            ...shape,
            x: initPos.x + deltaX,
            y: initPos.y + deltaY,
          });
        }
      });
      return;
    }

    // Creating new shape
    if (isDraggingRef.current && previewShape) {
      if (currentTool === 'freehand') {
        freehandPointsRef.current.push(worldPoint);
        setPreviewShape({
          ...previewShape,
          points: [...freehandPointsRef.current],
        });
      } else {
        const width = worldPoint.x - previewShape.x;
        const height = worldPoint.y - previewShape.y;
        setPreviewShape({
          ...previewShape,
          width,
          height,
        });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (isDraggingRef.current && previewShape) {
      let finalShape = { ...previewShape };

      // Normalization for negative width/height
      if (finalShape.type !== 'freehand' && finalShape.type !== 'arrow' && finalShape.type !== 'line') {
        const minX = Math.min(finalShape.x, finalShape.x + finalShape.width);
        const minY = Math.min(finalShape.y, finalShape.y + finalShape.height);
        const width = Math.abs(finalShape.width);
        const height = Math.abs(finalShape.height);

        // Discard accidental zero-size clicks
        if (width < 5 && height < 5) {
          // Default default size for quick-click creation
          finalShape = {
            ...finalShape,
            x: finalShape.x - 50,
            y: finalShape.y - 40,
            width: finalShape.type === 'sticky' ? 140 : 100,
            height: finalShape.type === 'sticky' ? 140 : 80,
          };
        } else {
          finalShape = {
            ...finalShape,
            x: minX,
            y: minY,
            width,
            height,
          };
        }
      }

      // Commit to CRDT
      addOrUpdateShape(finalShape);
      setSelectedIds(new Set([finalShape.id]));
      broadcastSelection([finalShape.id]);

      setPreviewShape(null);
      freehandPointsRef.current = [];
      setCurrentTool('select'); // Switch back to select tool after drawing
    }

    isDraggingRef.current = false;
    dragInitialShapePosRef.current.clear();
  };

  // 4. Wheel & Pinch Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const camera = cameraRef.current;
    const screenPoint = { x: e.clientX, y: e.clientY };

    if (e.ctrlKey || e.metaKey) {
      // Zoom centered on cursor
      const zoomFactor = Math.pow(0.993, e.deltaY);
      camera.zoomAt(screenPoint, zoomFactor);
    } else {
      // Pan
      camera.panBy(-e.deltaX, -e.deltaY);
    }
  };

  // 5. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in text input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space key for panning
      if (e.code === 'Space' && !e.repeat) {
        isSpacePressedRef.current = true;
      }

      // Undo / Redo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Delete selected
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (selectedIds.size > 0) {
          deleteShapes(Array.from(selectedIds));
          setSelectedIds(new Set());
          broadcastSelection([]);
        }
        return;
      }

      // Tool shortcut hotkeys
      switch (e.key.toLowerCase()) {
        case 'v': setCurrentTool('select'); break;
        case 'h': setCurrentTool('pan'); break;
        case 'r': setCurrentTool('rectangle'); break;
        case 'o': setCurrentTool('ellipse'); break;
        case 's': setCurrentTool('sticky'); break;
        case 'a': setCurrentTool('arrow'); break;
        case 'p': setCurrentTool('freehand'); break;
        case 't': setCurrentTool('text'); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedIds]);

  // 6. Stress Test Spawner (Demonstrating R-Tree spatial indexing with 1,000 to 10,000 shapes)
  const handleSpawnStressTest = useCallback((count: number) => {
    setIsSpawning(true);

    setTimeout(() => {
      const newShapes: Shape[] = [];
      const cols = Math.ceil(Math.sqrt(count));
      const spacing = 180;
      const startX = -((cols * spacing) / 2);
      const startY = -((cols * spacing) / 2);

      const shapeTypes: ToolType[] = ['rectangle', 'ellipse', 'sticky'];
      const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24'];

      for (let i = 0; i < count; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)] as any;
        const color = colors[Math.floor(Math.random() * colors.length)];

        newShapes.push({
          id: `stress_${Date.now()}_${i}`,
          type,
          x: startX + col * spacing + (Math.random() * 20 - 10),
          y: startY + row * spacing + (Math.random() * 20 - 10),
          width: 80 + Math.random() * 40,
          height: 60 + Math.random() * 40,
          strokeColor: color,
          fillColor: type === 'sticky' ? '#fef08a' : color,
          strokeWidth: 2,
          text: type === 'sticky' ? `Note #${i + 1}` : undefined,
          authorId: currentUser.id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Bulk add to CRDT
      bulkAddShapes(newShapes);
      setIsSpawning(false);
    }, 50);
  }, []);

  const handleFitToBounds = () => {
    if (yShapes.size === 0) {
      cameraRef.current.reset();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    yShapes.forEach(shape => {
      const sMinX = Math.min(shape.x, shape.x + shape.width);
      const sMaxX = Math.max(shape.x, shape.x + shape.width);
      const sMinY = Math.min(shape.y, shape.y + shape.height);
      const sMaxY = Math.max(shape.y, shape.y + shape.height);

      if (sMinX < minX) minX = sMinX;
      if (sMaxX > maxX) maxX = sMaxX;
      if (sMinY < minY) minY = sMinY;
      if (sMaxY > maxY) maxY = sMaxY;
    });

    cameraRef.current.fitToBounds({ minX, minY, maxX, maxY });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 2D Canvas */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full block touch-none ${
          currentTool === 'pan' || isSpacePressedRef.current
            ? 'cursor-grab active:cursor-grabbing'
            : currentTool === 'select'
            ? 'cursor-default'
            : 'cursor-crosshair'
        }`}
      />

      {/* Top Left Presence & Connection Status */}
      <PresenceBar
        currentUser={currentUser}
        peers={peers}
        isConnected={isConnected}
      />

      {/* Top Center Tool Bar */}
      <Toolbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        canUndo={canUndoState}
        canRedo={canRedoState}
        onUndo={undo}
        onRedo={redo}
        onClear={() => {
          if (confirm('Clear all shapes from collaborative canvas?')) {
            clearCanvas();
            setSelectedIds(new Set());
          }
        }}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Left Style Controls */}
      <StylePicker
        strokeColor={strokeColor}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
        onChangeStrokeColor={setStrokeColor}
        onChangeFillColor={setFillColor}
        onChangeStrokeWidth={setStrokeWidth}
      />

      {/* Top Right Live Spatial Engine HUD */}
      <PerformanceHUD
        stats={stats}
        onSpawnStressTest={handleSpawnStressTest}
        isSpawning={isSpawning}
      />

      {/* Bottom Right Zoom & Viewport Controls */}
      <ZoomControls
        zoom={cameraRef.current.state.zoom}
        onZoomIn={() => {
          cameraRef.current.zoomAt(
            { x: window.innerWidth / 2, y: window.innerHeight / 2 },
            1.25
          );
        }}
        onZoomOut={() => {
          cameraRef.current.zoomAt(
            { x: window.innerWidth / 2, y: window.innerHeight / 2 },
            0.8
          );
        }}
        onResetZoom={() => cameraRef.current.reset()}
        onFitToBounds={handleFitToBounds}
      />

      {/* Architecture & Interview Guide Modal */}
      <ShortcutsModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

