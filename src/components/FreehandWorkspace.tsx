import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer,
  Hand,
  Pen,
  Highlighter,
  Square,
  Circle,
  Minus,
  MoveRight,
  TrendingUp,
  Percent,
  Type,
  Eraser,
  RotateCcw,
  RotateCw,
  Trash2,
  Download,
  Save,
  FolderOpen,
  Maximize2,
  Minimize2,
  Grid,
  FileJson,
  FileCode,
  FileText,
  Upload,
  Check,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  Compass,
  CandlestickChart,
} from 'lucide-react';

export type Tool =
  | 'SELECT'
  | 'PAN'
  | 'CANDLE'
  | 'PEN'
  | 'HIGHLIGHTER'
  | 'LINE'
  | 'HORIZONTAL_LINE'
  | 'RAY'
  | 'ARROW'
  | 'RECTANGLE'
  | 'CIRCLE'
  | 'FIBONACCI'
  | 'TEXT'
  | 'ERASER';

export interface CanvasItem {
  id: string;
  tool: Tool;
  color: string;
  strokeWidth: number;
  points?: Array<{ x: number; y: number }>;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  text?: string;
  isFilled?: boolean;
  candleType?: 'BULLISH' | 'BEARISH';
  candleOpacity?: number;
  candleWidth?: number;
}

const FIB_LEVELS = [
  { level: 0.0, label: '0.0% (1.000)', color: '#94A3B8' },
  { level: 0.236, label: '23.6% (0.764)', color: '#38BDF8' },
  { level: 0.382, label: '38.2% (0.618)', color: '#34D399' },
  { level: 0.5, label: '50.0% (EQ)', color: '#F59E0B' },
  { level: 0.618, label: '61.8% Golden Pocket', color: '#F59E0B' },
  { level: 0.786, label: '78.6% (0.214)', color: '#A78BFA' },
  { level: 1.0, label: '100.0% (0.000)', color: '#94A3B8' },
];

export const FreehandWorkspace: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [tool, setTool] = useState<Tool>('LINE');
  const [color, setColor] = useState<string>('#F59E0B'); // Key-level gold default
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [isFilled, setIsFilled] = useState<boolean>(true);
  const [gridMode, setGridMode] = useState<'GRID' | 'DOTS' | 'NONE'>('GRID');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Candle Drawing Tool configuration states
  const [candleType, setCandleType] = useState<'BULLISH' | 'BEARISH'>('BULLISH');
  const [candleOpacity, setCandleOpacity] = useState<number>(1.0);
  const [candleWidth, setCandleWidth] = useState<number>(24);

  // Canvas items with persistent auto-save
  const [items, setItems] = useState<CanvasItem[]>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_freehand_autosave');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.items)) return parsed.items;
      return [];
    } catch {
      return [];
    }
  });

  // Selection & dragging state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDraggingSelected, setIsDraggingSelected] = useState<boolean>(false);
  const [dragStartCoord, setDragStartCoord] = useState<{ x: number; y: number } | null>(null);

  // Pan & Zoom Infinite Canvas state (Master Prompt Requirement 17)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStartCoord, setPanStartCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // History for Undo/Redo
  const [history, setHistory] = useState<CanvasItem[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasItem[][]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentDraft, setCurrentDraft] = useState<CanvasItem | null>(null);
  const [autoSavedNotice, setAutoSavedNotice] = useState<boolean>(false);

  // Direct on-canvas inline typing state (display coords in CSS pixels)
  const [inlineTextInput, setInlineTextInput] = useState<{
    canvasX: number;
    canvasY: number;
    screenX: number;
    screenY: number;
    text: string;
    existingId?: string;
  } | null>(null);

  // Clear confirmation modal
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Vault save/load
  const [savedWorkspaces, setSavedWorkspaces] = useState<
    Array<{ name: string; date: string; data: CanvasItem[] }>
  >(() => {
    try {
      const raw = localStorage.getItem('primepipfx_freehand_saved');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Push to history before modifying items
  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-30), items]);
    setRedoStack([]);
  }, [items]);

  // Reliable debounced auto-save. Writing on every pointer movement can
  // freeze the canvas, especially while dragging selected objects.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          'primepipfx_freehand_autosave',
          JSON.stringify({
            version: 2,
            savedAt: Date.now(),
            items,
          })
        );
        setAutoSavedNotice(true);
        const noticeTimer = window.setTimeout(() => setAutoSavedNotice(false), 1200);
        return () => window.clearTimeout(noticeTimer);
      } catch (e) {
        console.error('Freehand auto-save failed:', e);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [items]);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setRedoStack((prev) => [...prev, items]);
    setItems(previous);
    setHistory((prev) => prev.slice(0, -1));
    setSelectedItemId(null);
  }, [history, items]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, items]);
    setItems(next);
    setRedoStack((prev) => prev.slice(0, -1));
    setSelectedItemId(null);
  }, [redoStack, items]);

  // Delete selected item
  const handleDeleteSelected = useCallback(() => {
    if (!selectedItemId) return;
    pushHistory();
    setItems((prev) => prev.filter((it) => it.id !== selectedItemId));
    setSelectedItemId(null);
  }, [selectedItemId, pushHistory]);

  // Global keyboard shortcuts: Delete, Ctrl+Z, Ctrl+Y, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (inlineTextInput) {
        if (e.key === 'Escape') {
          setInlineTextInput(null);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
        if (selectedItemId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        setSelectedItemId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, inlineTextInput, handleDeleteSelected, handleUndo, handleRedo]);

  // Coordinate transforms with pan & zoom support
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0, screenX: 0, screenY: 0, rawX: 0, rawY: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const rawX = (e.clientX - rect.left) * dpr;
    const rawY = (e.clientY - rect.top) * dpr;
    return {
      x: (rawX - panOffset.x * dpr) / zoom,
      y: (rawY - panOffset.y * dpr) / zoom,
      screenX: e.clientX - rect.left,
      screenY: e.clientY - rect.top,
      rawX,
      rawY,
    };
  };

  // Resize canvas
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
    }
  }, []);

  useEffect(() => {
    let frame = 0;
    const syncCanvasSize = () => {
      resizeCanvas();
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => redrawAll());
    };

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    const observer =
      typeof ResizeObserver !== 'undefined' && containerRef.current
        ? new ResizeObserver(syncCanvasSize)
        : null;

    if (observer && containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', syncCanvasSize);
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [isFullscreen, resizeCanvas, redrawAll]);

  // Drawing rendering routines
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (gridMode === 'NONE') return;

    const step = 32 * (window.devicePixelRatio || 1);
    ctx.save();

    if (gridMode === 'GRID') {
      ctx.strokeStyle = '#151C2C';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (gridMode === 'DOTS') {
      ctx.fillStyle = '#263349';
      for (let x = step / 2; x < width; x += step) {
        for (let y = step / 2; y < height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5 * (window.devicePixelRatio || 1), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  };

  const renderSingleItem = (
    ctx: CanvasRenderingContext2D,
    item: CanvasItem,
    isSelected: boolean = false
  ) => {
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.strokeWidth * dpr;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (item.tool === 'HIGHLIGHTER') {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = item.strokeWidth * 6 * dpr;
    }

    // 1. PEN / HIGHLIGHTER
    if (item.tool === 'PEN' || item.tool === 'HIGHLIGHTER') {
      if (item.points && item.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (let i = 1; i < item.points.length; i++) {
          ctx.lineTo(item.points[i].x, item.points[i].y);
        }
        ctx.stroke();
      }
    }

    // 2. TRENDLINE
    else if (
      item.tool === 'LINE' &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.x2 !== undefined &&
      item.y2 !== undefined
    ) {
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.stroke();
    }

    // 3. HORIZONTAL LINE
    else if (
      item.tool === 'HORIZONTAL_LINE' &&
      item.y1 !== undefined &&
      canvasRef.current
    ) {
      const y = item.y1;
      ctx.beginPath();
      ctx.setLineDash([4 * dpr, 4 * dpr]);
      ctx.moveTo(0, y);
      ctx.lineTo(canvasRef.current.width, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label badge at right edge
      ctx.fillStyle = item.color;
      ctx.font = `bold ${10 * dpr}px 'JetBrains Mono', monospace`;
      const badgeText = `LEVEL: ${Math.round(y / dpr)}`;
      const textWidth = ctx.measureText(badgeText).width;
      const badgeX = canvasRef.current.width - textWidth - 24 * dpr;
      ctx.fillRect(badgeX, y - 9 * dpr, textWidth + 14 * dpr, 18 * dpr);
      ctx.fillStyle = '#090D16';
      ctx.fillText(badgeText, badgeX + 7 * dpr, y + 4 * dpr);
    }

    // 4. RAY
    else if (
      item.tool === 'RAY' &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.x2 !== undefined &&
      item.y2 !== undefined &&
      canvasRef.current
    ) {
      const dx = item.x2 - item.x1;
      const dy = item.y2 - item.y1;
      const len = Math.hypot(dx, dy);
      const extend = Math.max(canvasRef.current.width, canvasRef.current.height) * 2;
      const ex = len > 0 ? item.x1 + (dx / len) * extend : item.x1;
      const ey = len > 0 ? item.y1 + (dy / len) * extend : item.y1;

      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    // 5. ARROW
    else if (
      item.tool === 'ARROW' &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.x2 !== undefined &&
      item.y2 !== undefined
    ) {
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.stroke();

      const angle = Math.atan2(item.y2 - item.y1, item.x2 - item.x1);
      const headLen = 14 * dpr;
      ctx.beginPath();
      ctx.moveTo(item.x2, item.y2);
      ctx.lineTo(
        item.x2 - headLen * Math.cos(angle - Math.PI / 6),
        item.y2 - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(item.x2, item.y2);
      ctx.lineTo(
        item.x2 - headLen * Math.cos(angle + Math.PI / 6),
        item.y2 - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    }

    // 6. RECTANGLE / ZONE
    else if (
      item.tool === 'RECTANGLE' &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.x2 !== undefined &&
      item.y2 !== undefined
    ) {
      const x = Math.min(item.x1, item.x2);
      const y = Math.min(item.y1, item.y2);
      const w = Math.abs(item.x2 - item.x1);
      const h = Math.abs(item.y2 - item.y1);
      if (item.isFilled) {
        ctx.fillStyle = item.color + '25';
        ctx.fillRect(x, y, w, h);
      }
      ctx.strokeRect(x, y, w, h);
    }

    // 7. CIRCLE / LIQUIDITY POOL
    else if (
      item.tool === 'CIRCLE' &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.x2 !== undefined &&
      item.y2 !== undefined
    ) {
      const rx = Math.abs(item.x2 - item.x1) / 2;
      const ry = Math.abs(item.y2 - item.y1) / 2;
      const cx = (item.x1 + item.x2) / 2;
      const cy = (item.y1 + item.y2) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      if (item.isFilled) {
        ctx.fillStyle = item.color + '25';
        ctx.fill();
      }
      ctx.stroke();
    }

    // 8. FIBONACCI RETRACEMENT
    else if (
      item.tool === 'FIBONACCI' &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.x2 !== undefined &&
      item.y2 !== undefined
    ) {
      const minX = Math.min(item.x1, item.x2);
      const maxX = Math.max(item.x1, item.x2);
      const yTop = item.y1;
      const yBottom = item.y2;
      const heightDiff = yBottom - yTop;

      // Golden Pocket zone shading (0.5 to 0.618)
      const y50 = yTop + heightDiff * 0.5;
      const y618 = yTop + heightDiff * 0.618;
      ctx.fillStyle = '#F59E0B20';
      ctx.fillRect(
        minX,
        Math.min(y50, y618),
        Math.max(maxX - minX, 10),
        Math.abs(y618 - y50)
      );

      // Baseline trend connection line
      ctx.strokeStyle = '#64748B80';
      ctx.setLineDash([3 * dpr, 3 * dpr]);
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw each Fib level line
      FIB_LEVELS.forEach((fib) => {
        const yLevel = yTop + heightDiff * fib.level;
        ctx.strokeStyle = fib.color;
        ctx.lineWidth = (fib.level === 0.618 || fib.level === 0.5 ? 2 : 1) * dpr;
        ctx.beginPath();
        ctx.moveTo(minX, yLevel);
        ctx.lineTo(maxX, yLevel);
        ctx.stroke();

        // Level text label
        ctx.fillStyle = fib.color;
        ctx.font = `${10 * dpr}px 'JetBrains Mono', monospace`;
        ctx.fillText(fib.label, minX + 6 * dpr, yLevel - 4 * dpr);
      });
    }

    // 9. TEXT ANNOTATION
    else if (
      item.tool === 'TEXT' &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.text
    ) {
      ctx.fillStyle = item.color;
      ctx.font = `bold ${Math.max(14, item.strokeWidth * 6 * dpr)}px 'JetBrains Mono', monospace`;
      const lines = item.text.split('\n');
      const lineHeight = Math.max(16, item.strokeWidth * 7 * dpr);
      lines.forEach((line, idx) => {
        ctx.fillText(line, item.x1!, item.y1! + idx * lineHeight);
      });
    }

    // 10. CANDLESTICK TOOL (Bullish / Bearish with upper and lower wicks & custom opacity)
    else if (
      item.tool === 'CANDLE' &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.x2 !== undefined &&
      item.y2 !== undefined
    ) {
      const topY = Math.min(item.y1, item.y2);
      const botY = Math.max(item.y1, item.y2);
      const bodyHeight = Math.max(10 * dpr, botY - topY);
      const centerX = (item.x1 + item.x2) / 2;
      const cWidth = (item.candleWidth || 24) * dpr;
      const upperWickHeight = Math.max(12 * dpr, bodyHeight * 0.45);
      const lowerWickHeight = Math.max(12 * dpr, bodyHeight * 0.45);
      const opacity = item.candleOpacity ?? 1.0;

      ctx.save();
      ctx.globalAlpha = opacity;
      const isBull = item.candleType !== 'BEARISH';
      const candleColor = item.color || (isBull ? '#10B981' : '#EF4444');
      ctx.strokeStyle = candleColor;
      ctx.fillStyle = candleColor;

      // Upper Wick
      ctx.lineWidth = Math.max(2 * dpr, item.strokeWidth * dpr);
      ctx.beginPath();
      ctx.moveTo(centerX, topY - upperWickHeight);
      ctx.lineTo(centerX, topY);
      ctx.stroke();

      // Lower Wick
      ctx.beginPath();
      ctx.moveTo(centerX, botY);
      ctx.lineTo(centerX, botY + lowerWickHeight);
      ctx.stroke();

      // Candlestick Body (Filled + crisp border)
      ctx.fillRect(centerX - cWidth / 2, topY, cWidth, bodyHeight);
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeRect(centerX - cWidth / 2, topY, cWidth, bodyHeight);

      // High contrast direction arrow glyph inside body
      if (bodyHeight >= 18 * dpr) {
        ctx.font = `bold ${Math.min(12 * dpr, bodyHeight * 0.5)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = '#080C15';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isBull ? '▲' : '▼', centerX, topY + bodyHeight / 2);
      }

      ctx.restore();
    }

    // If item is currently selected, draw high-contrast selection bounds & handles
    if (isSelected) {
      const bounds = getItemBoundingBox(item);
      if (bounds) {
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 1.5 * dpr;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        const pad = 6 * dpr;
        ctx.strokeRect(
          bounds.minX - pad,
          bounds.minY - pad,
          bounds.maxX - bounds.minX + pad * 2,
          bounds.maxY - bounds.minY + pad * 2
        );
        ctx.setLineDash([]);

        // Four corner handles
        const handleSize = 6 * dpr;
        ctx.fillStyle = '#38BDF8';
        const corners = [
          { x: bounds.minX - pad, y: bounds.minY - pad },
          { x: bounds.maxX + pad, y: bounds.minY - pad },
          { x: bounds.maxX + pad, y: bounds.maxY + pad },
          { x: bounds.minX - pad, y: bounds.maxY + pad },
        ];
        corners.forEach((c) => {
          ctx.fillRect(
            c.x - handleSize / 2,
            c.y - handleSize / 2,
            handleSize,
            handleSize
          );
        });
      }
    }

    ctx.restore();
  };

  // Calculate bounding box for hit-testing and selection box
  const getItemBoundingBox = (
    item: CanvasItem
  ): { minX: number; minY: number; maxX: number; maxY: number } | null => {
    if (item.points && item.points.length > 0) {
      let minX = item.points[0].x;
      let maxX = item.points[0].x;
      let minY = item.points[0].y;
      let maxY = item.points[0].y;
      item.points.forEach((p) => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });
      return { minX, minY, maxX, maxY };
    }

    if (item.x1 !== undefined && item.y1 !== undefined) {
      if (item.tool === 'HORIZONTAL_LINE' && canvasRef.current) {
        return {
          minX: 0,
          maxX: canvasRef.current.width,
          minY: item.y1 - 10,
          maxY: item.y1 + 10,
        };
      }
      if (item.tool === 'CANDLE' && item.x2 !== undefined && item.y2 !== undefined) {
        const topY = Math.min(item.y1, item.y2);
        const botY = Math.max(item.y1, item.y2);
        const bodyHeight = Math.max(10, botY - topY);
        const centerX = (item.x1 + item.x2) / 2;
        const cWidth = item.candleWidth || 24;
        const wickHeight = Math.max(12, bodyHeight * 0.45);
        return {
          minX: centerX - cWidth / 2,
          maxX: centerX + cWidth / 2,
          minY: topY - wickHeight,
          maxY: botY + wickHeight,
        };
      }
      if (item.x2 !== undefined && item.y2 !== undefined) {
        return {
          minX: Math.min(item.x1, item.x2),
          maxX: Math.max(item.x1, item.x2),
          minY: Math.min(item.y1, item.y2),
          maxY: Math.max(item.y1, item.y2),
        };
      }
      if (item.tool === 'TEXT' && item.text) {
        const dpr = window.devicePixelRatio || 1;
        const approxWidth = item.text.length * 9 * dpr;
        const approxHeight = 20 * dpr;
        return {
          minX: item.x1,
          maxX: item.x1 + approxWidth,
          minY: item.y1 - approxHeight,
          maxY: item.y1 + approxHeight,
        };
      }
    }
    return null;
  };

  // Hit-test for selecting an item
  const findItemAtCoord = (x: number, y: number): CanvasItem | null => {
    const dpr = window.devicePixelRatio || 1;
    const hitTolerance = 16 * dpr;

    // Iterate backwards so top-most item is selected first
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const box = getItemBoundingBox(it);
      if (!box) continue;

      if (
        x >= box.minX - hitTolerance &&
        x <= box.maxX + hitTolerance &&
        y >= box.minY - hitTolerance &&
        y <= box.maxY + hitTolerance
      ) {
        return it;
      }
    }
    return null;
  };

  // Full Canvas Redraw
  const redrawAll = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    // Dark sleek background
    ctx.fillStyle = '#080C15';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(panOffset.x * dpr, panOffset.y * dpr);
    ctx.scale(zoom, zoom);

    // Draw infinite grid in world coordinates
    const viewWidth = Math.max(canvas.width / zoom, 2000);
    const viewHeight = Math.max(canvas.height / zoom, 2000);
    drawGrid(ctx, viewWidth, viewHeight);

    // Draw all items
    for (const it of items) {
      const isSelected = it.id === selectedItemId;
      renderSingleItem(ctx, it, isSelected);
    }

    // Draw in-progress draft
    if (currentDraft) {
      renderSingleItem(ctx, currentDraft, false);
    }
    ctx.restore();
  }, [items, currentDraft, selectedItemId, gridMode, panOffset, zoom]);

  useEffect(() => {
    redrawAll();
  }, [redrawAll]);

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Check if PAN tool or middle mouse or Space/Alt key
    if (tool === 'PAN' || e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStartCoord({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const coords = getCanvasCoords(e);

    // 1. TEXT TOOL: Click directly to place inline text note
    if (tool === 'TEXT') {
      setInlineTextInput({
        canvasX: coords.x,
        canvasY: coords.y,
        screenX: coords.screenX,
        screenY: coords.screenY,
        text: '',
      });
      return;
    }

    // 2. ERASER TOOL: Click on any item to delete it immediately
    if (tool === 'ERASER') {
      const hit = findItemAtCoord(coords.x, coords.y);
      if (hit) {
        pushHistory();
        setItems((prev) => prev.filter((it) => it.id !== hit.id));
      }
      return;
    }

    // 3. SELECT TOOL: Select item and start dragging
    if (tool === 'SELECT') {
      const hit = findItemAtCoord(coords.x, coords.y);
      if (hit) {
        setSelectedItemId(hit.id);
        setIsDraggingSelected(true);
        setDragStartCoord({ x: coords.x, y: coords.y });
      } else {
        setSelectedItemId(null);
      }
      return;
    }

    // 4. DRAWING TOOLS
    setIsDrawing(true);
    pushHistory();

    const baseDraft: CanvasItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      tool,
      color: tool === 'CANDLE' ? (candleType === 'BULLISH' ? '#10B981' : '#EF4444') : color,
      strokeWidth,
      isFilled,
      candleType: tool === 'CANDLE' ? candleType : undefined,
      candleOpacity: tool === 'CANDLE' ? candleOpacity : undefined,
      candleWidth: tool === 'CANDLE' ? candleWidth : undefined,
    };

    if (tool === 'PEN' || tool === 'HIGHLIGHTER') {
      setCurrentDraft({
        ...baseDraft,
        points: [{ x: coords.x, y: coords.y }],
      });
    } else if (tool === 'HORIZONTAL_LINE') {
      // Horizontal line snaps to clicked Y across the chart
      const finishedItem: CanvasItem = {
        ...baseDraft,
        y1: coords.y,
        x1: 0,
        x2: canvasRef.current?.width || 1000,
        y2: coords.y,
      };
      setItems((prev) => [...prev, finishedItem]);
      setIsDrawing(false);
    } else {
      setCurrentDraft({
        ...baseDraft,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // If currently panning with Hand tool
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStartCoord.x,
        y: e.clientY - panStartCoord.y,
      });
      return;
    }

    const coords = getCanvasCoords(e);

    // If dragging selected item in SELECT mode
    if (tool === 'SELECT' && isDraggingSelected && selectedItemId && dragStartCoord) {
      const dx = coords.x - dragStartCoord.x;
      const dy = coords.y - dragStartCoord.y;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== selectedItemId) return it;

          if (it.points) {
            return {
              ...it,
              points: it.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
            };
          }
          return {
            ...it,
            x1: it.x1 !== undefined ? it.x1 + dx : undefined,
            y1: it.y1 !== undefined ? it.y1 + dy : undefined,
            x2: it.x2 !== undefined ? it.x2 + dx : undefined,
            y2: it.y2 !== undefined ? it.y2 + dy : undefined,
          };
        })
      );
      setDragStartCoord({ x: coords.x, y: coords.y });
      return;
    }

    // Normal drawing
    if (!isDrawing || !currentDraft) return;

    if (tool === 'PEN' || tool === 'HIGHLIGHTER') {
      setCurrentDraft((prev) =>
        prev
          ? {
              ...prev,
              points: [...(prev.points || []), { x: coords.x, y: coords.y }],
            }
          : null
      );
    } else {
      setCurrentDraft((prev) =>
        prev
          ? {
              ...prev,
              x2: coords.x,
              y2: coords.y,
            }
          : null
      );
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (tool === 'SELECT') {
      setIsDraggingSelected(false);
      setDragStartCoord(null);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentDraft) {
      setItems((prev) => [...prev, currentDraft]);
      setCurrentDraft(null);
    }
  };

  // Commit direct inline text annotation
  const handleCommitInlineText = () => {
    if (!inlineTextInput) return;
    const trimmed = inlineTextInput.text.trim();
    if (trimmed) {
      pushHistory();
      setItems((prev) => [
        ...prev,
        {
          id: `txt-${Date.now()}`,
          tool: 'TEXT',
          color,
          strokeWidth,
          x1: inlineTextInput.canvasX,
          y1: inlineTextInput.canvasY,
          text: trimmed,
        },
      ]);
    }
    setInlineTextInput(null);
  };

  // Clear canvas action
  const confirmClearWorkspace = () => {
    pushHistory();
    setItems([]);
    setSelectedItemId(null);
    setIsClearModalOpen(false);
  };

  // Full-Screen Toggle
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
    setTimeout(resizeCanvas, 150);
  };

  // Export 1: High-Resolution PNG
  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `primepipfx-technical-analysis-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    setIsExportMenuOpen(false);
  };

  // Export 2: Vector SVG
  const handleExportSVG = () => {
    if (!canvasRef.current) return;
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    let svgElements = `<rect width="${width}" height="${height}" fill="#080C15" />\n`;

    items.forEach((it) => {
      if (
        (it.tool === 'PEN' || it.tool === 'HIGHLIGHTER') &&
        it.points &&
        it.points.length > 1
      ) {
        const d = it.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ');
        const opacity = it.tool === 'HIGHLIGHTER' ? '0.35' : '1';
        const sw = it.tool === 'HIGHLIGHTER' ? it.strokeWidth * 6 : it.strokeWidth;
        svgElements += `<path d="${d}" stroke="${it.color}" stroke-width="${sw}" fill="none" stroke-linecap="round" opacity="${opacity}" />\n`;
      } else if (
        it.tool === 'LINE' &&
        it.x1 !== undefined &&
        it.y1 !== undefined &&
        it.x2 !== undefined &&
        it.y2 !== undefined
      ) {
        svgElements += `<line x1="${it.x1}" y1="${it.y1}" x2="${it.x2}" y2="${it.y2}" stroke="${it.color}" stroke-width="${it.strokeWidth}" stroke-linecap="round" />\n`;
      } else if (
        it.tool === 'RECTANGLE' &&
        it.x1 !== undefined &&
        it.y1 !== undefined &&
        it.x2 !== undefined &&
        it.y2 !== undefined
      ) {
        const x = Math.min(it.x1, it.x2);
        const y = Math.min(it.y1, it.y2);
        const w = Math.abs(it.x2 - it.x1);
        const h = Math.abs(it.y2 - it.y1);
        const fill = it.isFilled ? it.color + '25' : 'none';
        svgElements += `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${it.color}" stroke-width="${it.strokeWidth}" fill="${fill}" />\n`;
      } else if (
        it.tool === 'TEXT' &&
        it.x1 !== undefined &&
        it.y1 !== undefined &&
        it.text
      ) {
        svgElements += `<text x="${it.x1}" y="${it.y1}" fill="${it.color}" font-family="monospace" font-size="${it.strokeWidth * 6}">${it.text}</text>\n`;
      }
    });

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n${svgElements}</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `primepipfx-vector-${Date.now()}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setIsExportMenuOpen(false);
  };

  // Export 3: JSON Canvas State
  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(items, null, 2));
    const link = document.createElement('a');
    link.download = `primepipfx-workspace-${Date.now()}.json`;
    link.href = dataStr;
    link.click();
    setIsExportMenuOpen(false);
  };

  // Import JSON Canvas State
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          pushHistory();
          setItems(parsed);
        }
      } catch (err) {
        console.error('Failed to parse workspace JSON:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Saved workspace presets
  const handleSaveWorkspace = () => {
    if (!saveName.trim()) return;
    const updated = [
      ...savedWorkspaces,
      {
        name: saveName.trim(),
        date: new Date().toLocaleDateString('en-GB'),
        data: items,
      },
    ];
    setSavedWorkspaces(updated);
    localStorage.setItem('primepipfx_freehand_saved', JSON.stringify(updated));
    setSaveName('');
    setIsSaveModalOpen(false);
  };

  const handleLoadWorkspace = (data: CanvasItem[]) => {
    pushHistory();
    setItems(data);
    setSelectedItemId(null);
    setIsLoadModalOpen(false);
  };

  // Professional trading palette
  const professionalColors = [
    { hex: '#10B981', label: 'Bullish / TP Green' },
    { hex: '#EF4444', label: 'Bearish / SL Red' },
    { hex: '#F59E0B', label: 'Key Level / Gold' },
    { hex: '#06B6D4', label: 'Neutral Structure / Cyan' },
    { hex: '#E2E8F0', label: 'Clean White / Slate' },
    { hex: '#8B5CF6', label: 'Liquidity / Purple' },
  ];

  const toolsList: Array<{ id: Tool; label: string; icon: any }> = [
    { id: 'SELECT', label: 'Select / Move', icon: MousePointer },
    { id: 'PAN', label: 'Pan / Hand', icon: Hand },
    { id: 'CANDLE', label: 'Candle Tool', icon: CandlestickChart },
    { id: 'LINE', label: 'Trendline', icon: TrendingUp },
    { id: 'HORIZONTAL_LINE', label: 'Horizontal Level', icon: Minus },
    { id: 'RAY', label: 'Ray', icon: MoveRight },
    { id: 'ARROW', label: 'Arrow', icon: MoveRight },
    { id: 'RECTANGLE', label: 'Order Block / Zone', icon: Square },
    { id: 'CIRCLE', label: 'Liquidity Pool', icon: Circle },
    { id: 'FIBONACCI', label: 'Fibonacci Retracement', icon: Percent },
    { id: 'PEN', label: 'Freehand Brush', icon: Pen },
    { id: 'HIGHLIGHTER', label: 'Marker', icon: Highlighter },
    { id: 'TEXT', label: 'Type Text', icon: Type },
    { id: 'ERASER', label: 'Eraser', icon: Eraser },
  ];

  return (
    <div
      ref={containerRef}
      className={`space-y-3 font-mono-code ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#080C15] p-4 flex flex-col justify-between'
          : ''
      }`}
    >
      {/* Primary Toolbar */}
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        {/* Shape & Drawing Tools */}
        <div className="flex items-center gap-1 flex-wrap">
          {toolsList.map((t) => {
            const Icon = t.icon;
            const isActive = tool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTool(t.id);
                  if (t.id !== 'SELECT') setSelectedItemId(null);
                }}
                title={t.label}
                className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-blue-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-[11px] font-military tracking-wide">
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Professional Color Controls & Options */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
            {professionalColors.map((c) => (
              <button
                key={c.hex}
                onClick={() => {
                  setColor(c.hex);
                  if (selectedItemId) {
                    setItems((prev) =>
                      prev.map((it) =>
                        it.id === selectedItemId ? { ...it, color: c.hex } : it
                      )
                    );
                  }
                }}
                title={c.label}
                style={{ backgroundColor: c.hex }}
                className={`w-5 h-5 rounded-full transition transform cursor-pointer ${
                  color === c.hex
                    ? 'ring-2 ring-white scale-110 shadow-md'
                    : 'opacity-70 hover:opacity-100'
                }`}
              />
            ))}
          </div>

          {/* Stroke Width Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800">
            {[
              { size: 1, label: 'Thin' },
              { size: 2, label: 'Med' },
              { size: 4, label: 'Thick' },
            ].map((s) => (
              <button
                key={s.size}
                onClick={() => {
                  setStrokeWidth(s.size);
                  if (selectedItemId) {
                    setItems((prev) =>
                      prev.map((it) =>
                        it.id === selectedItemId ? { ...it, strokeWidth: s.size } : it
                      )
                    );
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                  strokeWidth === s.size
                    ? 'bg-blue-500/20 border-blue-500 text-amber-300'
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Fill Toggle for Shapes */}
          {(tool === 'RECTANGLE' || tool === 'CIRCLE') && (
            <button
              onClick={() => setIsFilled(!isFilled)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                isFilled
                  ? 'bg-blue-500/20 border-blue-500 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              {isFilled ? 'FILL: ON' : 'FILL: OFF'}
            </button>
          )}

          {/* Delete Selected Button (visible when an object is selected) */}
          {selectedItemId && (
            <button
              onClick={handleDeleteSelected}
              className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
              title="Delete Selected Object (Del / Backspace)"
            >
              <Trash2 className="w-3 h-3" />
              <span>DELETE SELECTED</span>
            </button>
          )}
        </div>

        {/* Global Action Controls: Undo, Redo, Clear, Grid, Save, Export, Fullscreen */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-emerald-400 font-mono-code hidden xl:inline mr-1">
            {autoSavedNotice ? '✓ Autosaved' : '● Autosave On'}
          </span>

          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Undo (Ctrl+Z)"
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsClearModalOpen(true)}
            title="Clear Workspace"
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => {
              const next =
                gridMode === 'GRID' ? 'DOTS' : gridMode === 'DOTS' ? 'NONE' : 'GRID';
              setGridMode(next);
            }}
            title="Toggle Grid Style"
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition text-xs flex items-center gap-1 cursor-pointer"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden md:inline">{gridMode}</span>
          </button>

          {/* Save / Load */}
          <button
            onClick={() => setIsSaveModalOpen(true)}
            title="Save Drawing to Vault"
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-400 transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsLoadModalOpen(true)}
            title="Open Saved Drawings"
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-sky-400 transition cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>

          {/* Import JSON */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportJSON}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import Workspace JSON"
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Controls & Pan Reset (Requirement 17) */}
          <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(0.3, Number((z - 0.15).toFixed(2))))}
              title="Zoom Out"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              onClick={() => { setZoom(1.0); setPanOffset({ x: 0, y: 0 }); }}
              title="Click to reset zoom to 100% and center view"
              className="px-1.5 font-mono-code text-[11px] text-cyan-400 font-bold cursor-pointer hover:underline"
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
              title="Zoom In"
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setZoom(1.0); setPanOffset({ x: 0, y: 0 }); }}
              title="Center View & Reset Pan"
              className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Full Screen Mode'}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-400 transition cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Export Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              title="Export Drawing"
              className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>EXPORT</span>
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-950 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 text-xs">
                <button
                  onClick={handleExportPNG}
                  className="w-full px-3 py-2 text-left rounded-lg text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>High-Res PNG</span>
                </button>
                <button
                  onClick={handleExportSVG}
                  className="w-full px-3 py-2 text-left rounded-lg text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span>Vector SVG</span>
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full px-3 py-2 text-left rounded-lg text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <FileJson className="w-4 h-4 text-sky-400" />
                  <span>Workspace JSON</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Candlestick Tool Dedicated Properties Panel */}
      {tool === 'CANDLE' && (
        <div className="bg-slate-950/95 border border-blue-500/40 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-military font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
              <CandlestickChart className="w-4 h-4 text-cyan-400" />
              CANDLESTICK MODEL:
            </span>
            {/* Bullish vs Bearish */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setCandleType('BULLISH');
                  setColor('#10B981');
                }}
                className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  candleType === 'BULLISH'
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-emerald-400 hover:bg-slate-800'
                }`}
              >
                <span>▲ BULLISH (GREEN)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCandleType('BEARISH');
                  setColor('#EF4444');
                }}
                className={`px-3 py-1 rounded-md font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                  candleType === 'BEARISH'
                    ? 'bg-rose-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-rose-400 hover:bg-slate-800'
                }`}
              >
                <span>▼ BEARISH (RED)</span>
              </button>
            </div>
          </div>

          {/* Candle Width Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">WIDTH:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {[
                { label: 'Slim (16px)', w: 16 },
                { label: 'Standard (24px)', w: 24 },
                { label: 'Wide (36px)', w: 36 },
                { label: 'Macro (48px)', w: 48 },
              ].map((item) => (
                <button
                  key={item.w}
                  type="button"
                  onClick={() => setCandleWidth(item.w)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    candleWidth === item.w
                      ? 'bg-blue-500/20 text-amber-300 border border-blue-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity / Intensity Slider */}
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400 text-[11px]">INTENSITY / OPACITY:</span>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={candleOpacity}
              onChange={(e) => setCandleOpacity(parseFloat(e.target.value))}
              className="w-24 accent-cyan-400 cursor-pointer"
            />
            <span className="font-mono-code text-slate-300 text-[11px] w-9">
              {Math.round(candleOpacity * 100)}%
            </span>
          </div>

          {/* Drawing Instruction Tip */}
          <div className="text-[11px] text-amber-300/80 italic hidden lg:block">
            Tip: Click & drag vertically on the canvas to place candle body — upper & lower wicks generate automatically!
          </div>
        </div>
      )}

      {/* Main Interactive Canvas Area */}
      <div
        className={`relative border border-slate-800/80 rounded-2xl overflow-hidden bg-[#080C15] shadow-2xl ${
          isFullscreen ? 'flex-1 h-full min-h-[85vh]' : 'h-[74vh] min-h-[540px]'
        }`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            handleMouseDown(e as unknown as React.MouseEvent<HTMLCanvasElement>);
          }}
          onPointerMove={(e) =>
            handleMouseMove(e as unknown as React.MouseEvent<HTMLCanvasElement>)
          }
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            handleMouseUp();
          }}
          onPointerCancel={() => handleMouseUp()}
          onMouseDown={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onWheel={(e) => {
            if (e.ctrlKey || tool === 'PAN') {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.1 : 0.1;
              setZoom((z) => Math.min(3.0, Math.max(0.3, Number((z + delta).toFixed(2)))));
            } else {
              // Normal scroll pans vertically
              setPanOffset((prev) => ({
                x: prev.x - e.deltaX * 0.5,
                y: prev.y - e.deltaY * 0.5,
              }));
            }
          }}
          style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
          className={`w-full h-full block select-none ${
            tool === 'PAN'
              ? isPanning
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : tool === 'SELECT'
              ? 'cursor-default'
              : tool === 'TEXT'
              ? 'cursor-text'
              : tool === 'ERASER'
              ? 'cursor-pointer'
              : 'cursor-crosshair'
          }`}
        />

        {/* Direct on-canvas inline typing textarea */}
        {inlineTextInput && (
          <div
            style={{
              position: 'absolute',
              left: `${inlineTextInput.screenX}px`,
              top: `${inlineTextInput.screenY}px`,
              transform: 'translate(0, -6px)',
              zIndex: 40,
            }}
            className="flex flex-col gap-1"
          >
            <textarea
              ref={textInputRef}
              autoFocus
              value={inlineTextInput.text}
              onChange={(e) =>
                setInlineTextInput((prev) => (prev ? { ...prev, text: e.target.value } : null))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCommitInlineText();
                } else if (e.key === 'Escape') {
                  setInlineTextInput(null);
                }
              }}
              placeholder="Type note & press Enter..."
              style={{ color }}
              rows={2}
              className="px-2 py-1 bg-slate-950/90 border border-blue-500/80 rounded-lg text-xs font-mono-code shadow-2xl focus:outline-none min-w-[220px] resize-both backdrop-blur-sm"
            />
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 bg-slate-950/90 px-2 py-0.5 rounded border border-slate-800 w-fit">
              <span>Press <strong className="text-amber-300">Enter</strong> to place • <strong className="text-slate-300">Esc</strong> to cancel</span>
              <button
                onClick={handleCommitInlineText}
                className="ml-1 text-emerald-400 hover:text-emerald-300 font-bold"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Tooltip hint bar at bottom of canvas */}
        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-slate-500 font-mono-code pointer-events-none">
          <div className="bg-slate-950/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800/80 flex items-center gap-2">
            <span className="text-cyan-400 font-bold uppercase">{tool.replace(/_/g, ' ')}</span>
            <span>•</span>
            <span>
              {tool === 'SELECT'
                ? 'Click object to select. Drag to move. Press Del or Backspace to delete.'
                : tool === 'TEXT'
                ? 'Click anywhere on canvas to type text directly.'
                : tool === 'FIBONACCI'
                ? 'Drag from swing high to swing low to plot retracement levels & golden pocket.'
                : tool === 'HORIZONTAL_LINE'
                ? 'Click at target price level to draw an infinite horizontal reference.'
                : 'Click and drag to draw on canvas.'}
            </span>
          </div>
          <div className="bg-slate-950/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800/80 hidden sm:block">
            <span>Objects: <strong className="text-slate-300">{items.length}</strong></span>
          </div>
        </div>
      </div>

      {/* CLEAR CANVAS CONFIRMATION MODAL */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-rose-500/40 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl text-xs">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h4 className="font-military font-bold text-base text-slate-100 tracking-wider">
                CLEAR ALL DRAWINGS?
              </h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                This will wipe the current workspace canvas completely.
              </p>
              <p className="text-slate-500 text-[11px]">
                You can still use Undo (Ctrl+Z) if you change your mind.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={confirmClearWorkspace}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>CLEAR WORKSPACE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <h4 className="text-sm font-military font-bold text-slate-100 uppercase">
              Save Workspace Drawing
            </h4>
            <input
              type="text"
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g. Gold Weekly Liquidity Sweep"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-mono-code focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWorkspace}
                className="px-4 py-1.5 bg-blue-500 text-slate-950 font-bold text-xs rounded-lg cursor-pointer font-military"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-700 p-5 rounded-2xl max-w-md w-full space-y-4 max-h-[80vh] overflow-y-auto shadow-2xl">
            <h4 className="text-sm font-military font-bold text-slate-100 uppercase">
              Saved Workspace Drawings
            </h4>
            {savedWorkspaces.length === 0 ? (
              <p className="text-xs text-slate-400 font-mono-code py-6 text-center">
                No saved drawings found in local vault.
              </p>
            ) : (
              <div className="space-y-2">
                {savedWorkspaces.map((sw, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleLoadWorkspace(sw.data)}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-blue-500/60 rounded-xl cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-200">{sw.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono-code">{sw.date}</div>
                    </div>
                    <span className="text-xs font-mono-code text-cyan-400 font-bold">LOAD ➔</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setIsLoadModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 text-xs rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
