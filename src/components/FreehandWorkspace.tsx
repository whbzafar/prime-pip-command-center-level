import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  FileCode,
  Upload,
  AlertTriangle,
  Layers,
  ZoomIn,
  ZoomOut,
  Compass,
  CandlestickChart,
  Keyboard,
  GraduationCap,
  ExternalLink,
  Menu,
  Copy,
  PanelLeftClose,
  PanelLeft,
  Lock,
  Unlock,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Palette,
  Check,
  X,
  Share2,
  Eye,
  EyeOff,
  Wand2,
  Sparkles,
  Image as ImageIcon,
  FileText,
  Split,
} from 'lucide-react';

export type Tool =
  | 'SELECT'
  | 'PAN'
  | 'CANDLE'
  | 'CANDLE_BULLISH'
  | 'CANDLE_BEARISH'
  | 'PEN'
  | 'HIGHLIGHTER'
  | 'LINE'
  | 'HORIZONTAL_LINE'
  | 'VERTICAL_LINE'
  | 'RAY'
  | 'ARROW'
  | 'RECTANGLE'
  | 'CIRCLE'
  | 'FIBONACCI'
  | 'TEXT'
  | 'ERASER'
  | 'SMART_PENCIL'
  | 'IMAGE';

export interface CanvasItem {
  id: string;
  tool: Tool;
  color: string; // Outside Color: Outline, border, wicks
  fillColor?: string; // Inside Color: Body fill, rectangle interior
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
  fillOpacity?: number;
  outlineOpacity?: number;
  smartShape?: 'RECTANGLE' | 'CIRCLE' | 'LINE' | 'HORIZONTAL_LINE' | 'VERTICAL_LINE' | 'POLYGON';
  imageDataUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
}

// Automatic Freehand Shape Recognition Engine
// Analyzes user hand strokes and automatically snaps into clean cohesive shapes:
// Circle, Rectangle (Order block / Zone), Clean Trendline, or Horizontal/Vertical Level!
export const recognizeSmartShape = (
  points: Array<{ x: number; y: number }>,
  color: string,
  fillColor?: string,
  strokeWidth: number = 2
): CanvasItem => {
  if (!points || points.length < 3) {
    return {
      id: `smart-${Date.now()}`,
      tool: 'PEN',
      color,
      fillColor,
      strokeWidth,
      points,
    };
  }

  const p0 = points[0];
  const pN = points[points.length - 1];
  const distEndpoints = Math.hypot(pN.x - p0.x, pN.y - p0.y);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let totalPerimeter = 0;

  for (let i = 0; i < points.length; i++) {
    minX = Math.min(minX, points[i].x);
    maxX = Math.max(maxX, points[i].x);
    minY = Math.min(minY, points[i].y);
    maxY = Math.max(maxY, points[i].y);
    if (i > 0) {
      totalPerimeter += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
  }

  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);

  // 1. Open strokes that are nearly straight: Trend Line or Horizontal / Vertical Level
  if (distEndpoints / (totalPerimeter || 1) > 0.78) {
    if (Math.abs(pN.y - p0.y) < 16) {
      // Clean Horizontal Price Level
      return {
        id: `hline-${Date.now()}`,
        tool: 'HORIZONTAL_LINE',
        color,
        strokeWidth,
        x1: p0.x,
        y1: (p0.y + pN.y) / 2,
      };
    }
    if (Math.abs(pN.x - p0.x) < 16) {
      // Clean Vertical Session Separator
      return {
        id: `vline-${Date.now()}`,
        tool: 'VERTICAL_LINE',
        color,
        strokeWidth,
        x1: (p0.x + pN.x) / 2,
        y1: p0.y,
      };
    }
    // Clean Trendline
    return {
      id: `line-${Date.now()}`,
      tool: 'LINE',
      color,
      strokeWidth,
      x1: p0.x,
      y1: p0.y,
      x2: pN.x,
      y2: pN.y,
    };
  }

  // 2. Closed loops: Circle / Ellipse or Rectangle (Order block / Zone)
  const isClosed = distEndpoints < 65 || distEndpoints / (totalPerimeter || 1) < 0.35;
  const effectiveFill = fillColor && fillColor !== 'transparent' ? fillColor : color + '25';

  if (isClosed) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const avgRadius = (w + h) / 4;

    let radiusVariance = 0;
    for (const pt of points) {
      const r = Math.hypot(pt.x - cx, pt.y - cy);
      radiusVariance += Math.abs(r - avgRadius);
    }
    const avgVariance = radiusVariance / points.length;

    if (avgVariance < avgRadius * 0.38 && w / h > 0.55 && w / h < 1.75) {
      // Snap to crisp Circle / Ellipse
      return {
        id: `circle-${Date.now()}`,
        tool: 'CIRCLE',
        color,
        fillColor: effectiveFill,
        strokeWidth,
        x1: minX,
        y1: minY,
        x2: maxX,
        y2: maxY,
      };
    }

    // Check if points form rectangle / order block
    let edgeDistSum = 0;
    for (const pt of points) {
      const distToEdge = Math.min(
        Math.abs(pt.x - minX),
        Math.abs(pt.x - maxX),
        Math.abs(pt.y - minY),
        Math.abs(pt.y - maxY)
      );
      edgeDistSum += distToEdge;
    }
    const avgEdgeDist = edgeDistSum / points.length;
    if (avgEdgeDist < Math.min(w, h) * 0.22) {
      // Snap to crisp Rectangle (Order Block / Supply-Demand Zone)
      return {
        id: `rect-${Date.now()}`,
        tool: 'RECTANGLE',
        color,
        fillColor: effectiveFill,
        strokeWidth,
        x1: minX,
        y1: minY,
        x2: maxX,
        y2: maxY,
      };
    }
  }

  // 3. Freehand cohesive closed shape: automatically closes strokes into a cohesive polygon object with interior fill and clean stroke!
  const closedPoints = [...points];
  if (Math.hypot(pN.x - p0.x, pN.y - p0.y) > 2) {
    closedPoints.push({ x: p0.x, y: p0.y });
  }

  return {
    id: `shape-${Date.now()}`,
    tool: 'SMART_PENCIL',
    color,
    fillColor: effectiveFill,
    strokeWidth,
    points: closedPoints,
    smartShape: 'POLYGON',
  };
};

const FIB_LEVELS = [
  { level: 0.0, label: '0.0% (1.000)', color: '#94A3B8' },
  { level: 0.236, label: '23.6% (0.764)', color: '#38BDF8' },
  { level: 0.382, label: '38.2% (0.618)', color: '#34D399' },
  { level: 0.5, label: '50.0% (EQ)', color: '#F59E0B' },
  { level: 0.618, label: '61.8% Golden Pocket', color: '#F59E0B' },
  { level: 0.786, label: '78.6% (0.214)', color: '#A78BFA' },
  { level: 1.0, label: '100.0% (0.000)', color: '#94A3B8' },
];

type ResizeHandleType = 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w';

interface FreehandWorkspaceProps {
  userKey?: string;
  onNavigateTab?: (tab: any) => void;
}

export const FreehandWorkspace: React.FC<FreehandWorkspaceProps> = ({
  userKey = 'guest',
  onNavigateTab,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const handleNavigate = (tabName: string) => {
    if (onNavigateTab) {
      onNavigateTab(tabName);
    } else {
      window.dispatchEvent(
        new CustomEvent('primepipfx:navigate-tab', { detail: { tab: tabName } })
      );
    }
  };

  // Primary Tool State
  const [tool, setTool] = useState<Tool>('SELECT');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(true);

  // Outside Color (Outline / Border / Wicks) & Inside Color (Body Fill / Interior)
  const [outsideColor, setOutsideColor] = useState<string>('#10B981');
  const [insideColor, setInsideColor] = useState<string>('#10B981');
  const [isInsideTransparent, setIsInsideTransparent] = useState<boolean>(false);

  // Background Colors: Outer area & Inner canvas/sheet area
  const [outerBgColor, setOuterBgColor] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('primepipfx_freehand_outer_bg') ||
        localStorage.getItem('primepipfx_freehand_background') ||
        '#FFFFFF'
      );
    } catch {
      return '#FFFFFF';
    }
  });

  const [innerBgColor, setInnerBgColor] = useState<string>(() => {
    try {
      return localStorage.getItem('primepipfx_freehand_inner_bg') || '#FFFFFF';
    } catch {
      return '#FFFFFF';
    }
  });

  // UI Panels State
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isBgMenuOpen, setIsBgMenuOpen] = useState<boolean>(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const prevToolBeforeSpaceRef = useRef<Tool | null>(null);
  const [gridMode, setGridMode] = useState<'GRID' | 'DOTS' | 'NONE'>('DOTS');

  // Candlestick Configuration State
  const [candleOpacity, setCandleOpacity] = useState<number>(1.0);
  const [candleWidth, setCandleWidth] = useState<number>(28);

  // Canvas Items
  const [items, setItems] = useState<CanvasItem[]>(() => {
    try {
      const saved =
        localStorage.getItem('primepipfx_freehand_autosave_v1') ||
        localStorage.getItem('primepipfx_freehand_autosave');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.items)) return parsed.items;
      return [];
    } catch {
      return [];
    }
  });

  // Selection, Dragging & Resizing States (Move tool handles both!)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDraggingSelected, setIsDraggingSelected] = useState<boolean>(false);
  const [dragStartCoord, setDragStartCoord] = useState<{ x: number; y: number } | null>(null);
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandleType | null>(null);
  const [resizeStartCoord, setResizeStartCoord] = useState<{ x: number; y: number } | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandleType | null>(null);
  const [isHoveringMovableItem, setIsHoveringMovableItem] = useState<boolean>(false);

  // Pan & Zoom Infinite Canvas
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [canvasSizeVersion, setCanvasSizeVersion] = useState(0);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStartCoord, setPanStartCoord] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Undo / Redo History
  const [history, setHistory] = useState<CanvasItem[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasItem[][]>([]);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentDraft, setCurrentDraft] = useState<CanvasItem | null>(null);
  const [autoSavedNotice, setAutoSavedNotice] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string>(() => {
    try {
      return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  });
  const [isErasing, setIsErasing] = useState(false);
  const erasedIdsRef = useRef<Set<string>>(new Set());

  // Active Direct On-Chart Text Session (Immediate live typing right on chart, zero popup box)
  const [activeTextSession, setActiveTextSession] = useState<{
    id?: string;
    canvasX: number;
    canvasY: number;
    text: string;
    color: string;
    cursorIndex: number;
  } | null>(null);
  const activeTextInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursorVisible, setCursorVisible] = useState<boolean>(true);
  const draftRef = useRef<CanvasItem | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const rafRedrawIdRef = useRef<number | null>(null);

  // Helper to accurately locate character index from canvas click coordinates
  const getCharIndexFromClick = useCallback(
    (
      text: string,
      clickX: number,
      clickY: number,
      startX: number,
      startY: number,
      fontSize: number,
      lineHeight: number,
      dpr: number
    ): number => {
      const lines = text.split('\n');
      const relY = Math.max(0, clickY - startY);
      const targetLineIdx = Math.max(0, Math.min(lines.length - 1, Math.floor(relY / lineHeight)));
      const targetLine = lines[targetLineIdx] || '';

      const relX = Math.max(0, clickX - startX);
      let bestCol = 0;
      let minDiff = Infinity;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.font = `600 ${fontSize}px 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`;
        for (let i = 0; i <= targetLine.length; i++) {
          const measured = ctx.measureText(targetLine.slice(0, i)).width;
          const diff = Math.abs(measured - relX);
          if (diff < minDiff) {
            minDiff = diff;
            bestCol = i;
          }
        }
        ctx.restore();
      } else {
        const approxCharW = (fontSize * 0.58) / dpr;
        bestCol = Math.max(0, Math.min(targetLine.length, Math.round(relX / approxCharW)));
      }

      let charOffset = 0;
      for (let l = 0; l < targetLineIdx; l++) {
        charOffset += lines[l].length + 1;
      }
      return charOffset + bestCol;
    },
    []
  );

  // Smooth blinking caret timer when text tool is active
  useEffect(() => {
    if (!activeTextSession) return;
    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 480);
    return () => clearInterval(interval);
  }, [activeTextSession]);

  // Focus and sync selection range on session activation
  useEffect(() => {
    if (activeTextSession && activeTextInputRef.current) {
      activeTextInputRef.current.focus();
      const pos = activeTextSession.cursorIndex ?? activeTextSession.text.length;
      activeTextInputRef.current.setSelectionRange(pos, pos);
    }
  }, [activeTextSession?.canvasX, activeTextSession?.canvasY]);

  // Modals & Vault
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
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

  // Push to history
  const pushHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-30), items]);
    setRedoStack([]);
  }, [items]);

  // Debounced auto-save
  useEffect(() => {
    setAutoSaveStatus('saving');
    const timer = window.setTimeout(() => {
      try {
        const payload = JSON.stringify({
          version: 5,
          savedAt: Date.now(),
          items,
        });
        localStorage.setItem('primepipfx_freehand_autosave', payload);
        localStorage.setItem('primepipfx_freehand_autosave_v1', payload);
        localStorage.setItem('primepipfx_freehand_outer_bg', outerBgColor);
        localStorage.setItem('primepipfx_freehand_inner_bg', innerBgColor);
        localStorage.setItem('primepipfx_freehand_background', outerBgColor);
        setAutoSavedNotice(true);
        setAutoSaveStatus('saved');
        setLastAutoSaveTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
        const noticeTimer = window.setTimeout(() => setAutoSavedNotice(false), 1500);
        return () => window.clearTimeout(noticeTimer);
      } catch (e) {
        console.error('Freehand auto-save failed:', e);
        setAutoSaveStatus('saved');
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [items, outerBgColor, innerBgColor]);

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

  // Duplicate selected item
  const handleDuplicateSelected = useCallback(() => {
    if (!selectedItemId) return;
    const found = items.find((it) => it.id === selectedItemId);
    if (!found) return;
    pushHistory();
    const offset = 30;
    const newItem: CanvasItem = {
      ...found,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      x1: found.x1 !== undefined ? found.x1 + offset : undefined,
      y1: found.y1 !== undefined ? found.y1 + offset : undefined,
      x2: found.x2 !== undefined ? found.x2 + offset : undefined,
      y2: found.y2 !== undefined ? found.y2 + offset : undefined,
      points: found.points ? found.points.map((p) => ({ x: p.x + offset, y: p.y + offset })) : undefined,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  }, [selectedItemId, items, pushHistory]);

  // Quick Candle Injector: Drops a realistic candlestick in the center of the viewport
  const handleInsertCandle = useCallback(
    (type: 'BULLISH' | 'BEARISH') => {
      pushHistory();
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      const centerX = canvas ? (canvas.width / dpr / 2 - panOffset.x) / zoom : 200;
      const centerY = canvas ? (canvas.height / dpr / 2 - panOffset.y) / zoom : 200;
      const defaultColor = type === 'BULLISH' ? '#10B981' : '#EF4444';
      const outC = outsideColor || defaultColor;
      const inC = isInsideTransparent ? 'transparent' : (insideColor || defaultColor);

      const newCandle: CanvasItem = {
        id: `candle-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        tool: type === 'BULLISH' ? 'CANDLE_BULLISH' : 'CANDLE_BEARISH',
        color: outC,
        fillColor: inC,
        strokeWidth: 2,
        x1: centerX - candleWidth / 2,
        y1: centerY - 45,
        x2: centerX + candleWidth / 2,
        y2: centerY + 45,
        candleType: type,
        candleWidth,
        candleOpacity,
      };

      setItems((prev) => [...prev, newCandle]);
      setSelectedItemId(newCandle.id);
    },
    [candleWidth, candleOpacity, outsideColor, insideColor, isInsideTransparent, panOffset, zoom, pushHistory]
  );

  // Resize Selected Item via Left Panel
  const handleAdjustSelectedSize = useCallback(
    (dw: number, dh: number) => {
      if (!selectedItemId) return;
      pushHistory();
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== selectedItemId) return it;
          if (it.tool === 'CANDLE' || it.tool === 'CANDLE_BULLISH' || it.tool === 'CANDLE_BEARISH') {
            const nextWidth = Math.max(8, (it.candleWidth || 28) + dw);
            const currentHeight = Math.abs((it.y2 || 0) - (it.y1 || 0));
            const nextHeight = Math.max(16, currentHeight + dh);
            const centerY = ((it.y1 || 0) + (it.y2 || 0)) / 2;
            return {
              ...it,
              candleWidth: nextWidth,
              y1: centerY - nextHeight / 2,
              y2: centerY + nextHeight / 2,
            };
          }
          if (it.tool === 'TEXT') {
            const currentStroke = it.strokeWidth || 2;
            const delta = dw !== 0 ? (dw > 0 ? 0.5 : -0.5) : dh > 0 ? 0.5 : -0.5;
            const nextStroke = Math.max(1, Math.min(24, currentStroke + delta));
            return {
              ...it,
              strokeWidth: Number(nextStroke.toFixed(2)),
            };
          }
          if (it.x1 !== undefined && it.y1 !== undefined && it.x2 !== undefined && it.y2 !== undefined) {
            const currentW = Math.abs(it.x2 - it.x1);
            const currentH = Math.abs(it.y2 - it.y1);
            const nextW = Math.max(10, currentW + dw);
            const nextH = Math.max(10, currentH + dh);
            const cx = (it.x1 + it.x2) / 2;
            const cy = (it.y1 + it.y2) / 2;
            return {
              ...it,
              x1: cx - nextW / 2,
              x2: cx + nextW / 2,
              y1: cy - nextH / 2,
              y2: cy + nextH / 2,
            };
          }
          return it;
        })
      );
    },
    [selectedItemId, pushHistory]
  );

  // Move Selected Item Nudge
  const handleNudgeSelected = useCallback(
    (dx: number, dy: number) => {
      if (!selectedItemId) return;
      pushHistory();
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
    },
    [selectedItemId, pushHistory]
  );

  // Update selected item's Outside or Inside color
  const handleUpdateSelectedColors = useCallback(
    (newOutside?: string, newInside?: string) => {
      if (!selectedItemId) return;
      pushHistory();
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== selectedItemId) return it;
          return {
            ...it,
            color: newOutside !== undefined ? newOutside : it.color,
            fillColor: newInside !== undefined ? newInside : it.fillColor,
          };
        })
      );
    },
    [selectedItemId, pushHistory]
  );

  // Resize canvas according to container
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
    }
  }, []);

  // Full-Screen Toggle: true 100vw x 100vh overlay + browser native fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        try {
          if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } catch {}
      } else {
        try {
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
        } catch {}
      }
      setTimeout(resizeCanvas, 150);
      return next;
    });
  }, [resizeCanvas]);

  // Commit active on-chart text session directly into items array
  const commitActiveText = useCallback(() => {
    if (!activeTextSession) return;
    const txt = activeTextSession.text;
    if (txt && txt.trim().length > 0) {
      pushHistory();
      const isLightBg =
        innerBgColor.toLowerCase().startsWith('#f') ||
        innerBgColor.toLowerCase() === '#ffffff' ||
        outerBgColor.toLowerCase().startsWith('#f') ||
        outerBgColor.toLowerCase() === '#ffffff';
      const textColor =
        activeTextSession.color === '#FFFFFF' && isLightBg ? '#0F172A' : (activeTextSession.color || '#10B981');

      if (activeTextSession.id) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === activeTextSession.id
              ? { ...it, text: txt, color: textColor }
              : it
          )
        );
        setSelectedItemId(activeTextSession.id);
      } else {
        const newTextItem: CanvasItem = {
          id: `txt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          tool: 'TEXT',
          color: textColor,
          strokeWidth: Math.max(2, strokeWidth),
          x1: activeTextSession.canvasX,
          y1: activeTextSession.canvasY,
          text: txt,
        };
        setItems((prev) => [...prev, newTextItem]);
        setSelectedItemId(newTextItem.id);
      }
    } else if (activeTextSession.id) {
      pushHistory();
      setItems((prev) => prev.filter((it) => it.id !== activeTextSession.id));
      setSelectedItemId(null);
    }
    setActiveTextSession(null);
  }, [activeTextSession, innerBgColor, outerBgColor, strokeWidth, pushHistory]);

  const cancelActiveText = useCallback(() => {
    setActiveTextSession(null);
  }, []);


  // Place an image or PDF render onto canvas as an interactive object
  const placeImageOnCanvas = useCallback(
    (dataUrl: string, origW: number, origH: number) => {
      pushHistory();
      const canvas = canvasRef.current;
      const dpr = window.devicePixelRatio || 1;
      const canvasW = canvas ? canvas.width / dpr : 800;
      const canvasH = canvas ? canvas.height / dpr : 600;
      const centerX = (canvasW / 2 - panOffset.x) / zoom;
      const centerY = (canvasH / 2 - panOffset.y) / zoom;

      const maxW = 560;
      const maxH = 460;
      let finalW = origW || 400;
      let finalH = origH || 300;

      if (finalW > maxW || finalH > maxH) {
        const scale = Math.min(maxW / finalW, maxH / finalH);
        finalW = Math.round(finalW * scale);
        finalH = Math.round(finalH * scale);
      }

      const newImgItem: CanvasItem = {
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        tool: 'IMAGE',
        color: '#6366F1',
        strokeWidth: 2,
        imageDataUrl: dataUrl,
        imageWidth: finalW,
        imageHeight: finalH,
        x1: centerX - finalW / 2,
        y1: centerY - finalH / 2,
        x2: centerX + finalW / 2,
        y2: centerY + finalH / 2,
      };

      setItems((prev) => [...prev, newImgItem]);
      setSelectedItemId(newImgItem.id);
      setTool('SELECT');
    },
    [panOffset, zoom, pushHistory]
  );

  // CorelDRAW (.CDR) parser: extracts embedded preview graphics and vector elements
  const parseCorelDrawFile = async (
    file: File
  ): Promise<{ dataUrl: string; width: number; height: number } | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const u8 = new Uint8Array(arrayBuffer);

      // 1. CorelDRAW X4+ (v14+) are standard ZIP files (PK\x03\x04 = 0x50, 0x4B, 0x03, 0x04)
      if (u8[0] === 0x50 && u8[1] === 0x4b) {
        const JSZipModule = await import('jszip');
        const JSZip = (JSZipModule.default || JSZipModule) as any;
        const zip = await JSZip.loadAsync(arrayBuffer);

        const candidates = [
          'previews/thumbnail.png',
          'previews/preview.png',
          'metadata/thumbnail.png',
          'metadata/preview.bmp',
          'previews/preview.bmp',
        ];

        for (const p of candidates) {
          const entry = zip.file(p);
          if (entry) {
            const base64 = await entry.async('base64');
            const mime = p.endsWith('.bmp') ? 'image/bmp' : 'image/png';
            const dataUrl = `data:${mime};base64,${base64}`;
            return await new Promise((resolve) => {
              const img = new Image();
              img.onload = () =>
                resolve({ dataUrl, width: img.naturalWidth || 900, height: img.naturalHeight || 650 });
              img.onerror = () => resolve({ dataUrl, width: 900, height: 650 });
              img.src = dataUrl;
            });
          }
        }

        for (const [name, entry] of Object.entries(zip.files)) {
          const zipEntry = entry as any;
          if (!zipEntry?.dir && /\.(png|jpe?g|bmp|svg)$/i.test(name)) {
            const base64 = await zipEntry.async('base64');
            const mime = name.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
            const dataUrl = `data:${mime};base64,${base64}`;
            return await new Promise((resolve) => {
              const img = new Image();
              img.onload = () =>
                resolve({ dataUrl, width: img.naturalWidth || 900, height: img.naturalHeight || 650 });
              img.onerror = () => resolve({ dataUrl, width: 900, height: 650 });
              img.src = dataUrl;
            });
          }
        }
      }

      // 2. Older RIFF CorelDRAW files (v3 - v13)
      for (let i = 0; i < u8.length - 8; i++) {
        if (u8[i] === 0x89 && u8[i + 1] === 0x50 && u8[i + 2] === 0x4e && u8[i + 3] === 0x47) {
          for (let j = i + 8; j < Math.min(u8.length - 4, i + 8 * 1024 * 1024); j++) {
            if (u8[j] === 0x49 && u8[j + 1] === 0x45 && u8[j + 2] === 0x4e && u8[j + 3] === 0x44) {
              const slice = u8.subarray(i, j + 8);
              let bin = '';
              for (let k = 0; k < slice.length; k++) bin += String.fromCharCode(slice[k]);
              const dataUrl = `data:image/png;base64,${btoa(bin)}`;
              return await new Promise((resolve) => {
                const img = new Image();
                img.onload = () =>
                  resolve({ dataUrl, width: img.naturalWidth || 900, height: img.naturalHeight || 650 });
                img.onerror = () => resolve(null);
                img.src = dataUrl;
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('CorelDRAW file parse error:', err);
    }
    return null;
  };

  // Handle uploading of images (PNG, JPG, WEBP, SVG, GIF), PDF, and CorelDRAW CDR files
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (
        file.name.toLowerCase().endsWith('.cdr') ||
        file.type.includes('cdr') ||
        file.type.includes('coreldraw')
      ) {
        const cdrResult = await parseCorelDrawFile(file);
        if (cdrResult) {
          placeImageOnCanvas(cdrResult.dataUrl, cdrResult.width, cdrResult.height);
          setSaveToast('CorelDRAW (.CDR) file imported successfully!');
          setTimeout(() => setSaveToast(null), 3000);
          return;
        } else {
          alert(
            'Could not extract graphics from this CorelDRAW file. Modern CorelDRAW files (version X4 and newer) with standard preview thumbnails are supported. If using another version, export as PDF, SVG, or PNG.'
          );
          return;
        }
      }

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '4.10.38'}/build/pdf.worker.min.mjs`;
        }
        const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const offCanvas = document.createElement('canvas');
        offCanvas.width = viewport.width;
        offCanvas.height = viewport.height;
        const offCtx = offCanvas.getContext('2d');
        if (offCtx) {
          await page.render({ canvasContext: offCtx, viewport }).promise;
          const dataUrl = offCanvas.toDataURL('image/png');
          placeImageOnCanvas(dataUrl, viewport.width, viewport.height);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          const tempImg = new Image();
          tempImg.onload = () => {
            placeImageOnCanvas(dataUrl, tempImg.naturalWidth, tempImg.naturalHeight);
          };
          tempImg.src = dataUrl;
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Failed to load image/PDF/CDR:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Tool Selection handler with instant text activation (zero popup boxes)
  const handleToolSelect = useCallback(
    (nextTool: Tool) => {
      if (activeTextSession) commitActiveText();
      setTool(nextTool);
      if (nextTool !== 'SELECT') {
        setSelectedItemId(null);
      }
      if (nextTool !== 'ERASER') setIsErasing(false);

      if (nextTool === 'TEXT') {
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        const screenW = canvas ? canvas.width / dpr : window.innerWidth;
        const screenH = canvas ? canvas.height / dpr : window.innerHeight;
        const initX = Math.round((screenW / 2 - panOffset.x) / zoom);
        const initY = Math.round((screenH / 2 - panOffset.y) / zoom);

        const isLightBg =
          innerBgColor.toLowerCase().startsWith('#f') ||
          innerBgColor.toLowerCase() === '#ffffff' ||
          outerBgColor.toLowerCase().startsWith('#f') ||
          outerBgColor.toLowerCase() === '#ffffff';
        const initialColor =
          outsideColor === '#FFFFFF' && isLightBg ? '#0F172A' : (outsideColor || '#10B981');

        setActiveTextSession({
          canvasX: initX,
          canvasY: initY,
          text: '',
          color: initialColor,
          cursorIndex: 0,
        });
        setTimeout(() => {
          activeTextInputRef.current?.focus();
        }, 30);
      } else {
        setActiveTextSession(null);
      }
    },
    [activeTextSession, commitActiveText, panOffset, zoom, innerBgColor, outerBgColor, outsideColor]
  );

  // Standard Canvas Key Listeners:
  // F3 for Pencil, F4 for Rectangle, Spacebar for Hand (Pan), Escape, Undo/Redo, Delete, Arrow Nudges
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (isInput) {
        if (e.key === 'Escape') {
          if (activeTextSession) {
            commitActiveText();
          }
        }
        return;
      }

      // F3: Pencil tool
      if (e.key === 'F3') {
        e.preventDefault();
        handleToolSelect('PEN');
        return;
      }

      // F4: Rectangle tool
      if (e.key === 'F4') {
        e.preventDefault();
        handleToolSelect('RECTANGLE');
        return;
      }

      // Spacebar: Hand tool (Pan) - tap or hold to navigate
      if ((e.code === 'Space' || e.key === ' ') && !e.repeat) {
        e.preventDefault();
        if (tool !== 'PAN') {
          prevToolBeforeSpaceRef.current = tool;
          setTool('PAN');
        }
        return;
      }

      // Escape key behavior
      if (e.key === 'Escape') {
        if (activeTextSession) {
          commitActiveText();
          return;
        }
        if (selectedItemId) {
          setSelectedItemId(null);
          return;
        }
        if (isFullscreen) {
          setIsFullscreen(false);
          if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          }
          setTimeout(resizeCanvas, 150);
          return;
        }
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedItemId) {
          e.preventDefault();
          handleDeleteSelected();
          return;
        }
      }

      // Arrow keys to nudge selected candle or object
      if (selectedItemId) {
        const step = e.shiftKey ? 10 : 2;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleNudgeSelected(0, -step);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleNudgeSelected(0, step);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleNudgeSelected(-step, 0);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNudgeSelected(step, 0);
          return;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        if (prevToolBeforeSpaceRef.current) {
          setTool(prevToolBeforeSpaceRef.current);
          prevToolBeforeSpaceRef.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    tool,
    selectedItemId,
    isFullscreen,
    activeTextSession,
    commitActiveText,
    handleDeleteSelected,
    handleRedo,
    handleUndo,
    handleNudgeSelected,
    handleToolSelect,
  ]);

  // Lock body scroll in fullscreen and toggle classes so header stays at the top without filter interference
  useEffect(() => {
    if (isFullscreen) {
      document.documentElement.classList.add('freehand-fullscreen');
      document.body.classList.add('freehand-fullscreen');
      document.getElementById('root')?.classList.add('freehand-fullscreen-active');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.documentElement.classList.remove('freehand-fullscreen');
        document.body.classList.remove('freehand-fullscreen');
        document.getElementById('root')?.classList.remove('freehand-fullscreen-active');
        document.body.style.overflow = prevOverflow;
      };
    } else {
      document.documentElement.classList.remove('freehand-fullscreen');
      document.body.classList.remove('freehand-fullscreen');
      document.getElementById('root')?.classList.remove('freehand-fullscreen-active');
    }
  }, [isFullscreen]);

  // Keep isFullscreen in sync with native browser fullscreen changes (e.g. Esc, F11, or browser exit)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFs = Boolean(document.fullscreenElement);
      if (!isNativeFs && isFullscreen) {
        setIsFullscreen(false);
        setTimeout(resizeCanvas, 150);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, resizeCanvas]);

  // Native Non-Passive Wheel Listener:
  // Seamlessly pans canvas background and objects without moving parent browser/app!
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Zoom in/out smoothly
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        setZoom((z) => Math.min(3.0, Math.max(0.2, Number((z + delta).toFixed(2)))));
      } else {
        // Smooth pan of canvas background & drawings
        const dx = e.shiftKey ? e.deltaY : e.deltaX;
        const dy = e.shiftKey ? 0 : e.deltaY;
        setPanOffset((prev) => ({
          x: prev.x - dx,
          y: prev.y - dy,
        }));
      }
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleNativeWheel);
    };
  }, [canvasSizeVersion, isFullscreen]);

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

  useEffect(() => {
    let frame = 0;
    const syncCanvasSize = () => {
      resizeCanvas();
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setCanvasSizeVersion((v) => v + 1);
      });
    };

    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);
    return () => {
      window.removeEventListener('resize', syncCanvasSize);
      window.cancelAnimationFrame(frame);
    };
  }, [isFullscreen, resizeCanvas]);

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

    if (item.tool === 'HORIZONTAL_LINE' && item.y1 !== undefined) {
      return {
        minX: -50000,
        maxX: 50000,
        minY: item.y1 - 12,
        maxY: item.y1 + 12,
      };
    }

    if (item.tool === 'VERTICAL_LINE' && item.x1 !== undefined) {
      return {
        minX: item.x1 - 12,
        maxX: item.x1 + 12,
        minY: -50000,
        maxY: 50000,
      };
    }

    if (item.x1 !== undefined && item.y1 !== undefined) {
      if (
        (item.tool === 'CANDLE' ||
          item.tool === 'CANDLE_BULLISH' ||
          item.tool === 'CANDLE_BEARISH') &&
        item.x2 !== undefined &&
        item.y2 !== undefined
      ) {
        const topY = Math.min(item.y1, item.y2);
        const botY = Math.max(item.y1, item.y2);
        const bodyHeight = Math.max(10, botY - topY);
        const centerX = (item.x1 + item.x2) / 2;
        const cWidth = item.candleWidth || 28;
        const wickHeight = Math.max(14, bodyHeight * 0.45);
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
        const lines = item.text.split('\n');
        const maxLen = Math.max(...lines.map((l) => l.length), 1);
        const fontSize = Math.max(14 * dpr, (item.strokeWidth || 2) * 8 * dpr);
        const lineHeight = fontSize * 1.25;
        const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
        const totalWidth = Math.max(60 * dpr, maxLen * (fontSize * 0.65));
        const pad = 10 * dpr;
        return {
          minX: item.x1 - pad,
          maxX: item.x1 + totalWidth + pad,
          minY: item.y1 - pad - 18 * dpr, // Include move header badge area
          maxY: item.y1 + totalHeight + pad,
        };
      }
    }
    return null;
  };

  // Get 8 Resize Handles for a selected bounding box
  const getHandlePositions = (
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    pad: number
  ) => {
    const minX = bounds.minX - pad;
    const maxX = bounds.maxX + pad;
    const minY = bounds.minY - pad;
    const maxY = bounds.maxY + pad;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    return [
      { type: 'nw' as const, x: minX, y: minY },
      { type: 'ne' as const, x: maxX, y: minY },
      { type: 'se' as const, x: maxX, y: maxY },
      { type: 'sw' as const, x: minX, y: maxY },
      { type: 'n' as const, x: midX, y: minY },
      { type: 's' as const, x: midX, y: maxY },
      { type: 'e' as const, x: maxX, y: midY },
      { type: 'w' as const, x: minX, y: midY },
    ];
  };

  // Hit-test for resize handle of selected item
  const findHandleAtCoord = (
    coords: { x: number; y: number },
    item: CanvasItem
  ): ResizeHandleType | null => {
    const bounds = getItemBoundingBox(item);
    if (!bounds) return null;
    const pad = 6;
    const handles = getHandlePositions(bounds, pad);
    const hitRadius = 16 / zoom;
    for (const h of handles) {
      if (Math.hypot(coords.x - h.x, coords.y - h.y) <= hitRadius) {
        return h.type;
      }
    }
    return null;
  };

  // Hit-test for selecting an item on canvas
  const findItemAtCoord = (x: number, y: number): CanvasItem | null => {
    const dpr = window.devicePixelRatio || 1;
    const hitTolerance = 14 * dpr;

    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];

      // Instant horizontal line test
      if (it.tool === 'HORIZONTAL_LINE' && it.y1 !== undefined) {
        if (Math.abs(y - it.y1) <= hitTolerance) return it;
      }

      // Instant vertical line test
      if (it.tool === 'VERTICAL_LINE' && it.x1 !== undefined) {
        if (Math.abs(x - it.x1) <= hitTolerance) return it;
      }

      // Instant trend line segment distance test
      if (
        it.tool === 'LINE' &&
        it.x1 !== undefined &&
        it.y1 !== undefined &&
        it.x2 !== undefined &&
        it.y2 !== undefined
      ) {
        const l2 = (it.x2 - it.x1) ** 2 + (it.y2 - it.y1) ** 2;
        let d = 0;
        if (l2 === 0) {
          d = Math.hypot(x - it.x1, y - it.y1);
        } else {
          const t = Math.max(
            0,
            Math.min(1, ((x - it.x1) * (it.x2 - it.x1) + (y - it.y1) * (it.y2 - it.y1)) / l2)
          );
          d = Math.hypot(x - (it.x1 + t * (it.x2 - it.x1)), y - (it.y1 + t * (it.y2 - it.y1)));
        }
        if (d <= hitTolerance) return it;
      }

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

  // Render a Single Canvas Item with Outside (Outline/Wick) & Inside (Body Fill) Colors
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

    // 2. COHESIVE SMART SHAPE (Freehand strokes forming a cohesive smoothed closed polygon/object)
    else if (
      (item.tool === 'SMART_PENCIL' || item.smartShape === 'POLYGON') &&
      item.points &&
      item.points.length > 2
    ) {
      ctx.beginPath();
      ctx.moveTo(item.points[0].x, item.points[0].y);
      for (let i = 1; i < item.points.length; i++) {
        ctx.lineTo(item.points[i].x, item.points[i].y);
      }
      ctx.closePath();
      const fill = item.fillColor !== undefined ? item.fillColor : item.color + '25';
      if (fill && fill !== 'transparent') {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      ctx.strokeStyle = item.color;
      ctx.lineWidth = Math.max(2 * dpr, item.strokeWidth * dpr);
      ctx.stroke();
    }

    // 3. RECTANGLE / ZONE (Outside border & Inside fill)
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
      const shouldFill = item.isFilled !== false && item.fillColor !== 'transparent';

      if (shouldFill) {
        ctx.fillStyle = (item.fillColor && item.fillColor !== 'transparent') ? item.fillColor : (item.color + '25');
        ctx.fillRect(x, y, w, h);
      }
      ctx.strokeStyle = item.color;
      ctx.strokeRect(x, y, w, h);
    }

    // 4. CIRCLE / ELLIPSE
    else if (
      item.tool === 'CIRCLE' &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.x2 !== undefined &&
      item.y2 !== undefined
    ) {
      const cx = (item.x1 + item.x2) / 2;
      const cy = (item.y1 + item.y2) / 2;
      const rx = Math.abs(item.x2 - item.x1) / 2;
      const ry = Math.abs(item.y2 - item.y1) / 2;
      const shouldFill = item.isFilled !== false && item.fillColor !== 'transparent';

      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(2, rx), Math.max(2, ry), 0, 0, Math.PI * 2);
      if (shouldFill) {
        ctx.fillStyle = (item.fillColor && item.fillColor !== 'transparent') ? item.fillColor : (item.color + '25');
        ctx.fill();
      }
      ctx.strokeStyle = item.color;
      ctx.stroke();
    }

    // 5. TREND LINE (Straight trend line between points with anchor endpoints)
    else if (
      item.tool === 'LINE' &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.x2 !== undefined &&
      item.y2 !== undefined
    ) {
      ctx.strokeStyle = item.color;
      ctx.lineWidth = Math.max(2 * dpr, item.strokeWidth * dpr);
      ctx.beginPath();
      ctx.moveTo(item.x1, item.y1);
      ctx.lineTo(item.x2, item.y2);
      ctx.stroke();

      // Anchor endpoint dots
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2 * dpr;
      [
        { x: item.x1, y: item.y1 },
        { x: item.x2, y: item.y2 },
      ].forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }

    // 6. HORIZONTAL PRICE LEVEL LINE
    else if (item.tool === 'HORIZONTAL_LINE' && item.y1 !== undefined) {
      const y = item.y1;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = Math.max(1.8 * dpr, item.strokeWidth * dpr);
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(-50000, y);
      ctx.lineTo(50000, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Institutional Price Level Badge
      const labelX = item.x1 !== undefined ? item.x1 : 80;
      ctx.font = `bold ${10 * dpr}px 'JetBrains Mono', monospace`;
      const text = `PRICE LEVEL: ${Math.round(y)}`;
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = item.color;
      ctx.fillRect(labelX, y - 9 * dpr, tw + 10 * dpr, 18 * dpr);
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, labelX + 5 * dpr, y);
    }

    // 7. VERTICAL TIME / SESSION DIVIDER LINE
    else if (item.tool === 'VERTICAL_LINE' && item.x1 !== undefined) {
      const x = item.x1;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = Math.max(1.8 * dpr, item.strokeWidth * dpr);
      ctx.setLineDash([6 * dpr, 4 * dpr]);
      ctx.beginPath();
      ctx.moveTo(x, -50000);
      ctx.lineTo(x, 50000);
      ctx.stroke();
      ctx.setLineDash([]);

      // Session Tag Badge
      const labelY = item.y1 !== undefined ? item.y1 : 80;
      ctx.font = `bold ${10 * dpr}px 'JetBrains Mono', monospace`;
      const text = `SESSION DIVIDER`;
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = item.color;
      ctx.fillRect(x - (tw + 10 * dpr) / 2, labelY, tw + 10 * dpr, 18 * dpr);
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x - tw / 2, labelY + 9 * dpr);
    }

    // 8. IMAGE / PDF RENDER ON CANVAS
    else if (
      item.tool === 'IMAGE' &&
      item.imageDataUrl &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.x2 !== undefined &&
      item.y2 !== undefined
    ) {
      let img = imageCacheRef.current.get(item.imageDataUrl);
      if (!img) {
        img = new Image();
        img.src = item.imageDataUrl;
        img.onload = () => {
          redrawAll();
        };
        imageCacheRef.current.set(item.imageDataUrl, img);
      }
      const x = Math.min(item.x1, item.x2);
      const y = Math.min(item.y1, item.y2);
      const w = Math.abs(item.x2 - item.x1);
      const h = Math.abs(item.y2 - item.y1);

      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x, y, w, h);
      } else {
        // Placeholder while image is decoding
        ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
        ctx.fillRect(x, y, w, h);
      }
      ctx.strokeStyle = item.color || '#6366F1';
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(x, y, w, h);
    }

    // 3. CANDLESTICK TOOL (Bullish & Bearish with Outside wicks/border and Inside body fill)
    else if (
      (item.tool === 'CANDLE' ||
        item.tool === 'CANDLE_BULLISH' ||
        item.tool === 'CANDLE_BEARISH') &&
      item.x1 !== undefined &&
      item.y1 !== undefined &&
      item.x2 !== undefined &&
      item.y2 !== undefined
    ) {
      const topY = Math.min(item.y1, item.y2);
      const botY = Math.max(item.y1, item.y2);
      const bodyHeight = Math.max(12 * dpr, botY - topY);
      const centerX = (item.x1 + item.x2) / 2;
      const cWidth = (item.candleWidth || 28) * dpr;
      const upperWickHeight = Math.max(14 * dpr, bodyHeight * 0.45);
      const lowerWickHeight = Math.max(14 * dpr, bodyHeight * 0.45);
      const opacity = item.candleOpacity ?? 1.0;

      ctx.save();
      ctx.globalAlpha = opacity;
      const isRed =
        item.candleType === 'BEARISH' ||
        item.tool === 'CANDLE_BEARISH' ||
        (item.color && ['#ef4444', '#f43f5e', '#dc2626', '#e11d48', 'red'].includes(item.color.toLowerCase()));
      const isBull = !isRed;
      const candleColor = isBull ? '#10B981' : '#EF4444';
      const wickColor = candleColor;
      const bodyFill = item.fillColor === 'transparent' ? 'transparent' : candleColor;

      // Upper Wick (Respective Candle Color)
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = Math.max(2 * dpr, item.strokeWidth * dpr);
      ctx.beginPath();
      ctx.moveTo(centerX, topY - upperWickHeight);
      ctx.lineTo(centerX, topY);
      ctx.stroke();

      // Lower Wick (Respective Candle Color)
      ctx.beginPath();
      ctx.moveTo(centerX, botY);
      ctx.lineTo(centerX, botY + lowerWickHeight);
      ctx.stroke();

      // Candlestick Body Fill (Respective Candle Color)
      if (bodyFill && bodyFill !== 'transparent') {
        ctx.fillStyle = bodyFill;
        ctx.fillRect(centerX - cWidth / 2, topY, cWidth, bodyHeight);
      }

      // Candlestick Body Border (Respective Candle Color)
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = Math.max(1.5 * dpr, item.strokeWidth * dpr);
      ctx.strokeRect(centerX - cWidth / 2, topY, cWidth, bodyHeight);

      // Candlestick Direction Arrow Badge inside body:
      // UPWARDS '▲' for Bullish (Green), DOWNWARDS '▼' for Bearish (Red)
      if (bodyHeight >= 16 * dpr) {
        ctx.font = `bold ${Math.min(13 * dpr, bodyHeight * 0.45)}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = bodyFill === 'transparent' ? wickColor : '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isBull ? '▲' : '▼', centerX, topY + bodyHeight / 2);
      }

      ctx.restore();
    }

    // 4. TEXT ANNOTATION
    else if (item.tool === 'TEXT' && item.x1 !== undefined && item.y1 !== undefined && item.text) {
      if (activeTextSession && activeTextSession.id === item.id) {
        // Handled live by direct on-chart canvas renderer below
      } else {
        ctx.save();
        ctx.fillStyle = item.color;
        const fontSize = Math.max(14 * dpr, (item.strokeWidth || 2) * 8 * dpr);
        ctx.font = `600 ${fontSize}px 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textBaseline = 'top';
        const lines = item.text.split('\n');
        const lineHeight = fontSize * 1.25;
        lines.forEach((line, idx) => {
          ctx.fillText(line, item.x1!, item.y1! + idx * lineHeight);
        });
        ctx.restore();
      }
    }

    // IF SELECTED: Draw high-visibility selection bounding box & 8 interactive resize handles
    if (isSelected) {
      const bounds = getItemBoundingBox(item);
      if (bounds) {
        const pad = 6 * dpr;
        const selW = bounds.maxX - bounds.minX + pad * 2;
        const selH = bounds.maxY - bounds.minY + pad * 2;

        ctx.save();
        ctx.strokeStyle = '#6366F1'; // Vibrant indigo selection
        ctx.lineWidth = 2 * dpr;
        ctx.setLineDash([5 * dpr, 4 * dpr]);
        ctx.strokeRect(bounds.minX - pad, bounds.minY - pad, selW, selH);
        ctx.setLineDash([]);

        // Subtle glowing backdrop for selected item
        ctx.fillStyle = 'rgba(99, 102, 241, 0.04)';
        ctx.fillRect(bounds.minX - pad, bounds.minY - pad, selW, selH);

        // 8 Interactive Resize Handles
        const handleSize = 9 * dpr;
        const handles = getHandlePositions(bounds, pad);
        handles.forEach((h) => {
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = '#4F46E5';
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.rect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
          ctx.fill();
          ctx.stroke();
        });

        // Intuitive Drag-to-Move badge for selected text
        if (item.tool === 'TEXT') {
          ctx.save();
          ctx.fillStyle = '#4F46E5';
          const badgeText = '✥ Drag to Reposition (Double-Click to Edit)';
          ctx.font = `bold ${10 * dpr}px 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`;
          const tw = ctx.measureText(badgeText).width;
          const badgeX = bounds.minX - pad;
          const badgeY = bounds.minY - pad - 18 * dpr;
          ctx.fillRect(badgeX, badgeY, tw + 12 * dpr, 16 * dpr);
          ctx.fillStyle = '#FFFFFF';
          ctx.textBaseline = 'middle';
          ctx.fillText(badgeText, badgeX + 6 * dpr, badgeY + 8 * dpr);
          ctx.restore();
        }
        ctx.restore();
      }
    }

    ctx.restore();
  };

  // Full Canvas Redraw
  const redrawAll = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    // 1. Fill Outer Canvas Background
    ctx.fillStyle = outerBgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(panOffset.x * dpr, panOffset.y * dpr);
    ctx.scale(zoom, zoom);

    // 2. Draw Inner Working Sheet / Canvas if different from outer
    if (innerBgColor.toLowerCase() !== outerBgColor.toLowerCase()) {
      const sheetW = 3800;
      const sheetH = 2600;
      const sheetX = -sheetW / 2;
      const sheetY = -sheetH / 2;

      ctx.save();
      ctx.fillStyle = innerBgColor;
      if (!isDrawingRef.current) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 16 * dpr;
        ctx.shadowOffsetY = 6 * dpr;
      }
      ctx.fillRect(sheetX, sheetY, sheetW, sheetH);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(sheetX, sheetY, sheetW, sheetH);
      ctx.restore();
    }

    // 3. Grid or Dots (Ultra-fast visible viewport culling + batched paths, zero lag)
    if (gridMode !== 'NONE') {
      const step = 40;
      ctx.save();
      const isDark =
        innerBgColor.includes('#0') ||
        innerBgColor.includes('#1') ||
        innerBgColor.includes('#2');

      const viewLeft = -panOffset.x / zoom;
      const viewTop = -panOffset.y / zoom;
      const viewRight = (canvas.width / dpr - panOffset.x) / zoom;
      const viewBottom = (canvas.height / dpr - panOffset.y) / zoom;

      const startX = Math.floor((viewLeft - step) / step) * step;
      const endX = Math.ceil((viewRight + step) / step) * step;
      const startY = Math.floor((viewTop - step) / step) * step;
      const endY = Math.ceil((viewBottom + step) / step) * step;

      if (gridMode === 'GRID') {
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += step) {
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += step) {
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
        }
        ctx.stroke();
      } else if (gridMode === 'DOTS') {
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
        ctx.beginPath();
        const dotRadius = 1.2 * dpr;
        for (let x = startX; x <= endX; x += step) {
          for (let y = startY; y <= endY; y += step) {
            ctx.moveTo(x + dotRadius, y);
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          }
        }
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Render All Drawn Items
    for (const it of items) {
      if (activeTextSession && activeTextSession.id === it.id) {
        continue;
      }
      const isSelected = it.id === selectedItemId;
      renderSingleItem(ctx, it, isSelected);
    }

    // 5. Render Active Direct On-Chart Text (Live, zero-box, blinking institutional cursor)
    if (activeTextSession) {
      const isLightBg =
        innerBgColor.toLowerCase().startsWith('#f') ||
        innerBgColor.toLowerCase() === '#ffffff' ||
        outerBgColor.toLowerCase().startsWith('#f') ||
        outerBgColor.toLowerCase() === '#ffffff';
      const textColor =
        activeTextSession.color === '#FFFFFF' && isLightBg ? '#0F172A' : (activeTextSession.color || '#10B981');

      const fontSize = Math.max(14 * dpr, (strokeWidth || 2) * 8 * dpr);
      const lineHeight = fontSize * 1.25;
      ctx.save();
      ctx.fillStyle = textColor;
      ctx.font = `600 ${fontSize}px 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textBaseline = 'top';

      const lines = (activeTextSession.text || '').split('\n');
      lines.forEach((line, idx) => {
        ctx.fillText(line, activeTextSession.canvasX, activeTextSession.canvasY + idx * lineHeight);
      });

      // Blinking Caret '|' on canvas at active text cursor position (supports arrow keys and click positioning)
      if (cursorVisible && tool === 'TEXT') {
        const fullText = activeTextSession.text || '';
        const cIdx = Math.max(
          0,
          Math.min(
            fullText.length,
            activeTextSession.cursorIndex !== undefined
              ? activeTextSession.cursorIndex
              : fullText.length
          )
        );

        let runningLen = 0;
        let cursorLineIdx = 0;
        let cursorColIdx = 0;
        for (let l = 0; l < lines.length; l++) {
          const lineLen = lines[l].length;
          if (cIdx <= runningLen + lineLen) {
            cursorLineIdx = l;
            cursorColIdx = cIdx - runningLen;
            break;
          }
          runningLen += lineLen + 1; // +1 for newline '\n'
          if (l === lines.length - 1) {
            cursorLineIdx = l;
            cursorColIdx = lineLen;
          }
        }

        const textBeforeCursor = (lines[cursorLineIdx] || '').slice(0, cursorColIdx);
        const cursorX = activeTextSession.canvasX + ctx.measureText(textBeforeCursor).width;
        const cursorY = activeTextSession.canvasY + cursorLineIdx * lineHeight;

        ctx.strokeStyle = textColor;
        ctx.lineWidth = Math.max(2, 2 * dpr);
        ctx.beginPath();
        ctx.moveTo(cursorX, cursorY);
        ctx.lineTo(cursorX, cursorY + fontSize);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 6. Render In-Progress Draft (Smooth 120fps render from draftRef or state)
    const activeDraft = draftRef.current || currentDraft;
    if (activeDraft) {
      renderSingleItem(ctx, activeDraft, false);
    }

    ctx.restore();
  }, [items, currentDraft, selectedItemId, gridMode, panOffset, zoom, outerBgColor, innerBgColor, activeTextSession, cursorVisible, strokeWidth, tool]);

  useEffect(() => {
    redrawAll();
  }, [redrawAll, canvasSizeVersion]);

  // Pointer Down (Mouse / Touch)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Right-click: Automatically select the "Hand" (PAN) tool and begin panning
    if (e.button === 2) {
      handleToolSelect('PAN');
      setIsPanning(true);
      setPanStartCoord({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    // Middle click or Pan tool or Space
    if (tool === 'PAN' || e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStartCoord({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const coords = getCanvasCoords(e);
    const dpr = window.devicePixelRatio || 1;

    // Double-click on existing text (e.detail === 2): Automatically select TEXT tool and edit
    if (e.detail === 2) {
      const textHit = findItemAtCoord(coords.x, coords.y);
      if (textHit && textHit.tool === 'TEXT') {
        draftRef.current = null;
        setCurrentDraft(null);
        isDrawingRef.current = false;
        setIsDrawing(false);
        handleToolSelect('TEXT');
        setSelectedItemId(textHit.id);
        const itemFontSize = Math.max(14 * dpr, (textHit.strokeWidth || 2) * 8 * dpr);
        const itemLineHeight = itemFontSize * 1.25;
        const charIdx = getCharIndexFromClick(
          textHit.text || '',
          coords.x,
          coords.y,
          textHit.x1 ?? coords.x,
          textHit.y1 ?? coords.y,
          itemFontSize,
          itemLineHeight,
          dpr
        );
        setActiveTextSession({
          id: textHit.id,
          canvasX: textHit.x1 ?? coords.x,
          canvasY: textHit.y1 ?? coords.y,
          text: textHit.text ?? '',
          color: textHit.color,
          cursorIndex: charIdx,
        });
        setTimeout(() => {
          if (activeTextInputRef.current) {
            activeTextInputRef.current.focus();
            activeTextInputRef.current.setSelectionRange(charIdx, charIdx);
          }
        }, 20);
        return;
      }
    }

    // 1. MOVE / SELECT TOOL: Check Resize Handle Interaction first
    if (tool === 'SELECT' && selectedItemId) {
      const selectedItem = items.find((it) => it.id === selectedItemId);
      if (selectedItem) {
        const handleHit = findHandleAtCoord(coords, selectedItem);
        if (handleHit) {
          pushHistory();
          setActiveResizeHandle(handleHit);
          setResizeStartCoord({ x: coords.x, y: coords.y });
          return;
        }
      }
    }

    // 2. MOVE / SELECT TOOL: Select & Drag Object (written text, shapes, candles, lines)
    if (tool === 'SELECT') {
      if (activeTextSession) {
        commitActiveText();
      }
      const hit = findItemAtCoord(coords.x, coords.y);
      if (hit) {
        pushHistory();
        setSelectedItemId(hit.id);
        setIsDraggingSelected(true);
        setDragStartCoord({ x: coords.x, y: coords.y });
      } else {
        setSelectedItemId(null);
      }
      return;
    }

    // 3. TEXT TOOL: Direct on-chart typing, cursor navigation, and in-place repositioning
    if (activeTextSession) {
      const fontSize = Math.max(14 * dpr, (strokeWidth || 2) * 8 * dpr);
      const lineHeight = fontSize * 1.25;
      const lines = (activeTextSession.text || '').split('\n');
      const maxLen = Math.max(...lines.map((l) => l.length), 1);
      const sessionW = Math.max(60, maxLen * fontSize * 0.65 + 40);
      const sessionH = Math.max(lineHeight, lines.length * lineHeight + 20);

      const withinSession =
        coords.x >= activeTextSession.canvasX - 10 &&
        coords.x <= activeTextSession.canvasX + sessionW &&
        coords.y >= activeTextSession.canvasY - 18 * dpr &&
        coords.y <= activeTextSession.canvasY + sessionH;

      if (withinSession) {
        const charIdx = getCharIndexFromClick(
          activeTextSession.text,
          coords.x,
          coords.y,
          activeTextSession.canvasX,
          activeTextSession.canvasY,
          fontSize,
          lineHeight,
          dpr
        );
        setActiveTextSession((prev) => (prev ? { ...prev, cursorIndex: charIdx } : null));
        if (activeTextInputRef.current) {
          activeTextInputRef.current.focus();
          activeTextInputRef.current.setSelectionRange(charIdx, charIdx);
        }
        if (activeTextSession.id) {
          setSelectedItemId(activeTextSession.id);
        }
        setIsDraggingSelected(true);
        setDragStartCoord({ x: coords.x, y: coords.y });
        return;
      } else {
        commitActiveText();
      }
    }

    if (tool === 'TEXT') {
      const textHit = findItemAtCoord(coords.x, coords.y);
      if (textHit && textHit.tool === 'TEXT') {
        const itemFontSize = Math.max(14 * dpr, (textHit.strokeWidth || 2) * 8 * dpr);
        const itemLineHeight = itemFontSize * 1.25;
        const charIdx = getCharIndexFromClick(
          textHit.text || '',
          coords.x,
          coords.y,
          textHit.x1 ?? coords.x,
          textHit.y1 ?? coords.y,
          itemFontSize,
          itemLineHeight,
          dpr
        );

        setSelectedItemId(textHit.id);
        setIsDraggingSelected(true);
        setDragStartCoord({ x: coords.x, y: coords.y });

        setActiveTextSession({
          id: textHit.id,
          canvasX: textHit.x1 ?? coords.x,
          canvasY: textHit.y1 ?? coords.y,
          text: textHit.text ?? '',
          color: textHit.color,
          cursorIndex: charIdx,
        });

        setTimeout(() => {
          if (activeTextInputRef.current) {
            activeTextInputRef.current.focus();
            activeTextInputRef.current.setSelectionRange(charIdx, charIdx);
          }
        }, 25);
        return;
      }

      const isLightBg =
        innerBgColor.toLowerCase().startsWith('#f') ||
        innerBgColor.toLowerCase() === '#ffffff' ||
        outerBgColor.toLowerCase().startsWith('#f') ||
        outerBgColor.toLowerCase() === '#ffffff';
      const initialColor =
        outsideColor === '#FFFFFF' && isLightBg ? '#0F172A' : (outsideColor || '#10B981');

      setActiveTextSession({
        canvasX: coords.x,
        canvasY: coords.y,
        text: '',
        color: initialColor,
        cursorIndex: 0,
      });
      setTimeout(() => {
        if (activeTextInputRef.current) {
          activeTextInputRef.current.focus();
          activeTextInputRef.current.setSelectionRange(0, 0);
        }
      }, 25);
      return;
    }

    // 4. ERASER TOOL: Click/drag to remove items
    if (tool === 'ERASER') {
      setIsErasing(true);
      erasedIdsRef.current = new Set();
      const hit = findItemAtCoord(coords.x, coords.y);
      if (hit) {
        pushHistory();
        erasedIdsRef.current.add(hit.id);
        setItems((prev) => prev.filter((it) => it.id !== hit.id));
      }
      return;
    }

    // 5. CANDLE DRAWING (Bullish or Bearish - continuous drawing enabled!)
    if (tool === 'CANDLE_BULLISH' || tool === 'CANDLE_BEARISH' || tool === 'CANDLE') {
      setIsDrawing(true);
      pushHistory();

      const isBull = tool === 'CANDLE_BULLISH' || tool === 'CANDLE';
      const candleColor = isBull ? '#10B981' : '#EF4444';

      const draft: CanvasItem = {
        id: `candle-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        tool,
        color: candleColor,
        fillColor: candleColor,
        strokeWidth: 2,
        candleType: isBull ? 'BULLISH' : 'BEARISH',
        candleOpacity: 1.0,
        candleWidth,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
      };
      draftRef.current = draft;
      setCurrentDraft(draft);
      return;
    }

    // 6. DRAWING TOOLS (Pencil, Rectangle, Lines, etc.)
    isDrawingRef.current = true;
    setIsDrawing(true);
    pushHistory();

    const isFilled = !isInsideTransparent;
    const baseDraft: CanvasItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      tool,
      color: outsideColor,
      fillColor: isFilled ? (insideColor || outsideColor + '30') : 'transparent',
      isFilled,
      strokeWidth,
    };

    let draft: CanvasItem;
    if (tool === 'PEN' || tool === 'HIGHLIGHTER' || tool === 'SMART_PENCIL') {
      draft = {
        ...baseDraft,
        points: [{ x: coords.x, y: coords.y }],
      };
    } else if (tool === 'HORIZONTAL_LINE') {
      draft = {
        ...baseDraft,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
      };
    } else if (tool === 'VERTICAL_LINE') {
      draft = {
        ...baseDraft,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
      };
    } else {
      draft = {
        ...baseDraft,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
      };
    }
    draftRef.current = draft;
    setCurrentDraft(draft);
  };

  // Pointer Move (Mouse / Touch)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // If panning
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStartCoord.x,
        y: e.clientY - panStartCoord.y,
      });
      return;
    }

    const coords = getCanvasCoords(e);

    // Eraser dragging
    if (tool === 'ERASER' && isErasing) {
      const hit = findItemAtCoord(coords.x, coords.y);
      if (hit && !erasedIdsRef.current.has(hit.id)) {
        if (erasedIdsRef.current.size === 0) pushHistory();
        erasedIdsRef.current.add(hit.id);
        setItems((prev) => prev.filter((it) => it.id !== hit.id));
      }
      return;
    }

    // Active Resizing of Selected Item via Move Tool handles
    if (activeResizeHandle && selectedItemId && resizeStartCoord) {
      const dx = coords.x - resizeStartCoord.x;
      const dy = coords.y - resizeStartCoord.y;

      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== selectedItemId) return it;

          // CANDLE Resizing
          if (
            it.tool === 'CANDLE' ||
            it.tool === 'CANDLE_BULLISH' ||
            it.tool === 'CANDLE_BEARISH'
          ) {
            const h = activeResizeHandle;
            let nextWidth = it.candleWidth || 28;
            let nextY1 = it.y1 !== undefined ? it.y1 : 0;
            let nextY2 = it.y2 !== undefined ? it.y2 : 0;

            if (h === 'e' || h === 'se' || h === 'ne') {
              nextWidth = Math.max(8, nextWidth + dx * 2);
            } else if (h === 'w' || h === 'sw' || h === 'nw') {
              nextWidth = Math.max(8, nextWidth - dx * 2);
            }

            if (h === 's' || h === 'se' || h === 'sw') {
              nextY2 += dy;
            } else if (h === 'n' || h === 'ne' || h === 'nw') {
              nextY1 += dy;
            }

            return {
              ...it,
              candleWidth: nextWidth,
              y1: nextY1,
              y2: nextY2,
            };
          }

          // TEXT Resizing via mouse handles
          if (it.tool === 'TEXT') {
            const h = activeResizeHandle;
            let factor = 0;
            if (h === 'se' || h === 'e' || h === 's') {
              factor = (dx + dy) / 25;
            } else if (h === 'nw' || h === 'w' || h === 'n') {
              factor = -(dx + dy) / 25;
            } else if (h === 'ne') {
              factor = (dx - dy) / 25;
            } else if (h === 'sw') {
              factor = (-dx + dy) / 25;
            }
            const currentStroke = it.strokeWidth || 2;
            const nextStroke = Math.max(1, Math.min(24, currentStroke + factor));
            return {
              ...it,
              strokeWidth: Number(nextStroke.toFixed(2)),
            };
          }

          // RECTANGLE, CIRCLE, IMAGE Resizing
          if (
            (it.tool === 'RECTANGLE' || it.tool === 'CIRCLE' || it.tool === 'IMAGE') &&
            it.x1 !== undefined &&
            it.y1 !== undefined &&
            it.x2 !== undefined &&
            it.y2 !== undefined
          ) {
            const h = activeResizeHandle;
            let x1 = it.x1;
            let y1 = it.y1;
            let x2 = it.x2;
            let y2 = it.y2;

            if (h.includes('e')) x2 += dx;
            if (h.includes('w')) x1 += dx;
            if (h.includes('s')) y2 += dy;
            if (h.includes('n')) y1 += dy;

            return { ...it, x1, y1, x2, y2 };
          }

          // LINE (Trend Line) Resizing
          if (
            it.tool === 'LINE' &&
            it.x1 !== undefined &&
            it.y1 !== undefined &&
            it.x2 !== undefined &&
            it.y2 !== undefined
          ) {
            const h = activeResizeHandle;
            if (h === 'nw' || h === 'w' || h === 'n') {
              return { ...it, x1: it.x1 + dx, y1: it.y1 + dy };
            } else {
              return { ...it, x2: it.x2 + dx, y2: it.y2 + dy };
            }
          }

          return it;
        })
      );

      setResizeStartCoord({ x: coords.x, y: coords.y });
      return;
    }

    // Active Dragging of Selected Item (Move tool or direct text drag)
    if (isDraggingSelected && selectedItemId && dragStartCoord) {
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

      if (activeTextSession && activeTextSession.id === selectedItemId) {
        setActiveTextSession((prev) =>
          prev ? { ...prev, canvasX: prev.canvasX + dx, canvasY: prev.canvasY + dy } : null
        );
      }

      setDragStartCoord({ x: coords.x, y: coords.y });
      return;
    }

    // Update hovered resize handle & hovered item for smart cursor change in Move tool
    if (tool === 'SELECT') {
      if (selectedItemId) {
        const selectedItem = items.find((it) => it.id === selectedItemId);
        if (selectedItem) {
          const handleHit = findHandleAtCoord(coords, selectedItem);
          setHoveredHandle(handleHit);
        } else {
          setHoveredHandle(null);
        }
      } else {
        setHoveredHandle(null);
      }
      if (!isDraggingSelected) {
        const itemHit = findItemAtCoord(coords.x, coords.y);
        setIsHoveringMovableItem(Boolean(itemHit));
      }
    } else {
      setHoveredHandle(null);
      if (isHoveringMovableItem) setIsHoveringMovableItem(false);
    }

    // Lag-free drawing using draftRef + direct incremental canvas rendering
    if ((!isDrawing && !isDrawingRef.current) || (!draftRef.current && !currentDraft)) return;
    const cur = draftRef.current || currentDraft;
    if (!cur) return;

    if (tool === 'PEN' || tool === 'HIGHLIGHTER' || tool === 'SMART_PENCIL') {
      const pts = cur.points || [];
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(coords.x - last.x, coords.y - last.y) >= 1.2) {
        pts.push({ x: coords.x, y: coords.y });
        cur.points = pts;

        // DIRECT HARDWARE-ACCELERATED INCREMENTAL STROKE (Zero latency, stroke appears instantly under pen tip)
        if (last && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            const dpr = window.devicePixelRatio || 1;
            ctx.save();
            ctx.translate(panOffset.x * dpr, panOffset.y * dpr);
            ctx.scale(zoom, zoom);
            ctx.strokeStyle = cur.color;
            ctx.lineWidth = (tool === 'HIGHLIGHTER' ? cur.strokeWidth * 6 : cur.strokeWidth) * dpr;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (tool === 'HIGHLIGHTER') ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.moveTo(last.x, last.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      return;
    } else if (tool === 'HORIZONTAL_LINE') {
      cur.y1 = coords.y;
      cur.y2 = coords.y;
    } else if (tool === 'VERTICAL_LINE') {
      cur.x1 = coords.x;
      cur.x2 = coords.x;
    } else {
      cur.x2 = coords.x;
      cur.y2 = coords.y;
    }

    if (rafRedrawIdRef.current === null) {
      rafRedrawIdRef.current = requestAnimationFrame(() => {
        rafRedrawIdRef.current = null;
        redrawAll();
      });
    }
  };

  // Pointer Up (Mouse / Touch)
  const handleMouseUp = () => {
    isDrawingRef.current = false;
    if (rafRedrawIdRef.current !== null) {
      cancelAnimationFrame(rafRedrawIdRef.current);
      rafRedrawIdRef.current = null;
    }

    if (tool === 'ERASER') {
      setIsErasing(false);
      erasedIdsRef.current.clear();
      return;
    }
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (activeResizeHandle) {
      setActiveResizeHandle(null);
      setResizeStartCoord(null);
      return;
    }
    if (isDraggingSelected) {
      setIsDraggingSelected(false);
      setDragStartCoord(null);
      return;
    }

    if (!isDrawing && !draftRef.current) return;
    setIsDrawing(false);

    const finalDraft = draftRef.current || currentDraft;
    draftRef.current = null;
    setCurrentDraft(null);

    if (finalDraft) {
      // If candle was placed via single click (minimal drag distance), make it a full standard candlestick
      if (
        finalDraft.tool === 'CANDLE_BULLISH' ||
        finalDraft.tool === 'CANDLE_BEARISH' ||
        finalDraft.tool === 'CANDLE'
      ) {
        const isBull = finalDraft.tool === 'CANDLE_BULLISH' || finalDraft.candleType === 'BULLISH';
        const candleColor = isBull ? '#10B981' : '#EF4444';
        const dist = Math.hypot(
          (finalDraft.x2 || 0) - (finalDraft.x1 || 0),
          (finalDraft.y2 || 0) - (finalDraft.y1 || 0)
        );
        let finalCandle = finalDraft;
        if (dist < 8) {
          const startX = finalDraft.x1 || 100;
          const startY = finalDraft.y1 || 100;
          finalCandle = {
            ...finalDraft,
            color: candleColor,
            fillColor: candleColor,
            x1: startX - candleWidth / 2,
            x2: startX + candleWidth / 2,
            y1: startY - 45,
            y2: startY + 45,
            candleWidth,
            candleOpacity: 1.0,
          };
        } else {
          finalCandle = {
            ...finalDraft,
            color: candleColor,
            fillColor: candleColor,
          };
        }
        setItems((prev) => [...prev, finalCandle]);
        // Continuous creation: Do NOT select so next click immediately drops another candle
        setSelectedItemId(null);
      } else if (finalDraft.tool === 'SMART_PENCIL' && finalDraft.points) {
        const smartItem = recognizeSmartShape(
          finalDraft.points,
          finalDraft.color,
          finalDraft.fillColor,
          finalDraft.strokeWidth
        );
        setItems((prev) => [...prev, smartItem]);
        setSelectedItemId(smartItem.id);
      } else if (finalDraft.tool === 'HORIZONTAL_LINE') {
        const hLine: CanvasItem = {
          ...finalDraft,
          x1: finalDraft.x1 ?? 80,
          y1: finalDraft.y1 ?? 100,
        };
        setItems((prev) => [...prev, hLine]);
        setSelectedItemId(hLine.id);
      } else if (finalDraft.tool === 'VERTICAL_LINE') {
        const vLine: CanvasItem = {
          ...finalDraft,
          x1: finalDraft.x1 ?? 100,
          y1: finalDraft.y1 ?? 80,
        };
        setItems((prev) => [...prev, vLine]);
        setSelectedItemId(vLine.id);
      } else {
        setItems((prev) => [...prev, finalDraft]);
        setSelectedItemId(finalDraft.id);
      }
      redrawAll();
    }
  };

  // Clear canvas action
  const confirmClearWorkspace = () => {
    pushHistory();
    setItems([]);
    setSelectedItemId(null);
    setIsClearModalOpen(false);
  };

  // Center View & Reset Pan
  const handleResetView = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Scroll back to content: auto-centers on all drawn objects
  const handleScrollBackToContent = () => {
    if (items.length === 0) {
      handleResetView();
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    items.forEach((it) => {
      const b = getItemBoundingBox(it);
      if (b) {
        minX = Math.min(minX, b.minX);
        minY = Math.min(minY, b.minY);
        maxX = Math.max(maxX, b.maxX);
        maxY = Math.max(maxY, b.maxY);
      }
    });

    if (minX !== Infinity && canvasRef.current) {
      const dpr = window.devicePixelRatio || 1;
      const contentCenterX = (minX + maxX) / 2;
      const contentCenterY = (minY + maxY) / 2;
      const canvasCenterX = canvasRef.current.width / dpr / 2;
      const canvasCenterY = canvasRef.current.height / dpr / 2;

      setPanOffset({
        x: canvasCenterX - contentCenterX,
        y: canvasCenterY - contentCenterY,
      });
      setZoom(1.0);
    } else {
      handleResetView();
    }
  };

  // Export 1: High-Resolution PNG
  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `primepipfx-technical-analysis-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  // Export 2: Vector SVG
  const handleExportSVG = () => {
    if (!canvasRef.current) return;
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    let svgElements = `<rect width="${width}" height="${height}" fill="${outerBgColor}" />\n`;

    items.forEach((it) => {
      if (
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
        const fill = it.fillColor && it.fillColor !== 'transparent' ? it.fillColor : 'none';
        svgElements += `<rect x="${x}" y="${y}" width="${w}" height="${h}" stroke="${it.color}" stroke-width="${it.strokeWidth}" fill="${fill}" />\n`;
      } else if (it.tool === 'TEXT' && it.x1 !== undefined && it.y1 !== undefined && it.text) {
        svgElements += `<text x="${it.x1}" y="${it.y1}" fill="${it.color}" font-family="sans-serif" font-size="${it.strokeWidth * 8}">${it.text}</text>\n`;
      }
    });

    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n${svgElements}</svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.download = `primepipfx-vector-${Date.now()}.svg`;
    link.href = URL.createObjectURL(blob);
    link.click();
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

  // Dynamic Cursor Calculation (Move tool handles both moving and resizing!)
  const getCanvasCursor = () => {
    if (tool === 'PAN') return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    if (hoveredHandle) {
      if (hoveredHandle === 'nw' || hoveredHandle === 'se') return 'cursor-nwse-resize';
      if (hoveredHandle === 'ne' || hoveredHandle === 'sw') return 'cursor-nesw-resize';
      if (hoveredHandle === 'n' || hoveredHandle === 's') return 'cursor-ns-resize';
      if (hoveredHandle === 'e' || hoveredHandle === 'w') return 'cursor-ew-resize';
    }
    if (isDraggingSelected) return 'cursor-move';
    if (tool === 'SELECT') return isHoveringMovableItem ? 'cursor-move' : 'cursor-default';
    if (tool === 'TEXT') return 'cursor-text';
    if (tool === 'ERASER') return 'cursor-pointer';
    return 'cursor-crosshair';
  };

  // Selected item object reference
  const selectedItem = items.find((it) => it.id === selectedItemId);

  // Background color preset palettes
  const outerBgPresets = [
    { label: 'Crisp White', hex: '#FFFFFF' },
    { label: 'Soft Canvas', hex: '#F8FAFC' },
    { label: 'Light Slate', hex: '#F1F5F9' },
    { label: 'Chalkboard', hex: '#1E293B' },
    { label: 'Command Dark', hex: '#080C15' },
    { label: 'Pitch Black', hex: '#000000' },
  ];

  const innerBgPresets = [
    { label: 'Pure White', hex: '#FFFFFF' },
    { label: 'Warm Ivory', hex: '#FEFCE8' },
    { label: 'Pale Mint', hex: '#F0FDF4' },
    { label: 'Soft Sky', hex: '#EFF6FF' },
    { label: 'Midnight Sheet', hex: '#0F172A' },
    { label: 'Dark Slate', hex: '#1E293B' },
  ];

  // Professional drawing colors
  const paletteColors = [
    '#10B981', // Bullish Green
    '#EF4444', // Bearish Red
    '#F59E0B', // Gold / Key Level
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#0F172A', // Dark Ink
    '#FFFFFF', // White
  ];

  // RENDER INTERFACE (Full-Screen Portal vs Standard View)
  const renderWorkspaceContent = () => {
    return (
      <div
        ref={containerRef}
        style={
          isFullscreen
            ? {
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2147483647,
                margin: 0,
                padding: 0,
                overflow: 'hidden',
              }
            : undefined
        }
        className={`relative w-full h-full overflow-hidden select-none font-sans ${
          isFullscreen
            ? 'fixed inset-0 top-0 left-0 right-0 bottom-0 z-[2147483647] w-screen h-screen m-0 p-0 bg-slate-900'
            : 'h-[80vh] min-h-[580px] rounded-2xl border border-slate-800 bg-[#080C15]'
        }`}
      >
        {/* ============================================================== */}
        {/* DEDICATED FULLSCREEN CONTROLS: DELETE ALL & MINIMIZE BUTTONS   */}
        {/* ============================================================== */}
        {isFullscreen && (
          <div className="fixed top-3 right-3 z-[2147483647] pointer-events-auto flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Dedicated Fullscreen Delete All Button (Prominent & Clear) */}
            <button
              type="button"
              onClick={() => {
                if (items.length === 0) return;
                setIsClearModalOpen(true);
              }}
              title="Delete All - Clear everything drawn on canvas (Full-Screen)"
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 shadow-2xl flex items-center gap-1.5 font-bold text-xs cursor-pointer backdrop-blur-md transition-all active:scale-95 shrink-0"
            >
              <Trash2 className="w-4 h-4 text-white" />
              <span>Delete All</span>
            </button>

            {/* Minimize Full Screen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Minimize Full Screen (Esc)"
              className="px-3.5 py-2 rounded-xl bg-slate-900/95 hover:bg-rose-600 text-white border border-slate-700 hover:border-rose-500 shadow-2xl flex items-center gap-2 font-bold text-xs cursor-pointer backdrop-blur-md transition-all active:scale-95 group shrink-0"
            >
              <Minimize2 className="w-4 h-4 text-rose-400 group-hover:text-white transition-colors" />
              <span className="tracking-wide">Minimize</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 group-hover:bg-black/20 text-slate-300 group-hover:text-white font-mono">
                Esc
              </span>
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TOP FLOATING HEADER & TOOLBAR (OFFSET IN FULLSCREEN SO IT WON'T BE OBSCURED) */}
        {/* ============================================================== */}
        <div
          className={`absolute top-2 left-2 ${
            isFullscreen ? 'right-72' : 'right-2'
          } z-50 flex items-center justify-between gap-2 pointer-events-none transition-all duration-150`}
        >
          {/* Top-Left: Menu, Dedicated Upload Image (Visible in Fullscreen), & Show Tools Toggle */}
          <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsHamburgerOpen((prev) => !prev)}
              title="Workspace Menu (Clear, Export, Vault, Grid)"
              className="w-10 h-10 rounded-xl bg-white/95 text-slate-700 hover:bg-slate-50 border border-slate-200/90 shadow-md shadow-black/5 flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>

            {/* Dedicated Upload Image Button (Always Visible in Fullscreen & Standard Mode) */}
            <button
              type="button"
              onClick={() => imageUploadInputRef.current?.click()}
              title="Upload Image or PDF Chart (PNG, JPG, WEBP, PDF)"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition active:scale-95 cursor-pointer backdrop-blur-md text-xs font-bold shrink-0"
            >
              <ImageIcon className="w-4 h-4 text-white" />
              <span className="whitespace-nowrap">Upload Image</span>
            </button>

            {/* Quick Show Tools Button when toolbar is hidden */}
            {!isToolbarVisible && (
              <button
                type="button"
                onClick={() => setIsToolbarVisible(true)}
                title="Show Drawing Tools Toolbar"
                className="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-slate-50 text-indigo-600 border border-slate-200/90 shadow-md shadow-black/5 flex items-center gap-1.5 transition active:scale-95 cursor-pointer backdrop-blur-md text-xs font-bold"
              >
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Show Tools</span>
              </button>
            )}

            {/* Hamburger Dropdown Menu */}
            {isHamburgerOpen && (
              <div className="absolute top-12 left-0 w-64 bg-white/98 text-slate-800 border border-slate-200 rounded-2xl shadow-2xl p-2.5 z-50 space-y-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 text-xs">
                <div className="px-3 py-1.5 font-bold text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100">
                  Drawing Tools &amp; Candles
                </div>
                <button
                  onClick={() => {
                    handleToolSelect('PEN');
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 text-slate-800 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Pen className="w-4 h-4 text-indigo-600" />
                  <span>Pencil (Write / Draw)</span>
                </button>
                <button
                  onClick={() => {
                    setOutsideColor('#10B981');
                    setInsideColor('#10B981');
                    handleToolSelect('CANDLE_BULLISH');
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <CandlestickChart className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  <span>Bullish Candle (Green)</span>
                </button>
                <button
                  onClick={() => {
                    setOutsideColor('#EF4444');
                    setInsideColor('#EF4444');
                    handleToolSelect('CANDLE_BEARISH');
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 text-rose-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <CandlestickChart className="w-4 h-4 text-rose-600 fill-rose-600 rotate-180" />
                  <span>Bearish Candle (Red)</span>
                </button>
                <button
                  onClick={() => {
                    handleToolSelect('TEXT');
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-indigo-50 text-indigo-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Type className="w-4 h-4 text-indigo-600" />
                  <span>Text Annotation Tool</span>
                </button>
                <button
                  onClick={() => {
                    handleToolSelect('RECTANGLE');
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Square className="w-4 h-4 text-indigo-600" />
                  <span>Rectangle / Zone</span>
                </button>
                <button
                  onClick={() => {
                    handleToolSelect('LINE');
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>Trend Line</span>
                </button>
                <button
                  onClick={() => {
                    handleToolSelect('HORIZONTAL_LINE');
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Minus className="w-4 h-4 text-indigo-600 stroke-[3]" />
                  <span>Horizontal Price Level</span>
                </button>
                <button
                  onClick={() => {
                    handleToolSelect('VERTICAL_LINE');
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 text-slate-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Split className="w-4 h-4 text-indigo-600" />
                  <span>Vertical Time Line</span>
                </button>
                <button
                  onClick={() => {
                    handleToolSelect('SMART_PENCIL');
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-purple-50 text-purple-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Cohesive Smart Shape</span>
                </button>
                <button
                  onClick={() => {
                    imageUploadInputRef.current?.click();
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-indigo-50 text-indigo-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Upload Image or PDF Chart</span>
                </button>
                <a
                  href="https://www.tradingview.com/pricing/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsHamburgerOpen(false)}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-sky-50 text-sky-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-sky-600" />
                  <span>TradingView Pro / Premium</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto text-sky-500" />
                </a>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setIsClearModalOpen(true);
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Clear Canvas</span>
                </button>
                <button
                  onClick={() => {
                    handleResetView();
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Reset Pan &amp; Zoom (100%)</span>
                </button>
                <button
                  onClick={() => {
                    setGridMode((m) => (m === 'GRID' ? 'DOTS' : m === 'DOTS' ? 'NONE' : 'GRID'));
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Grid className="w-4 h-4 text-indigo-600" />
                  <span>Toggle Grid ({gridMode})</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    setIsSaveModalOpen(true);
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Save className="w-4 h-4 text-slate-600" />
                  <span>Save Drawing to Vault</span>
                </button>
                <button
                  onClick={() => {
                    setIsLoadModalOpen(true);
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-sky-600" />
                  <span>Saved Vault Drawings ({savedWorkspaces.length})</span>
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Import JSON Drawing</span>
                </button>
              </div>
            )}
          </div>

          {/* Top-Center Floating Pill Toolbar (Exact Requested Order: Pencil, Text, Rectangle, Candles [Green & Red], Select, Hand, Eraser) */}
          {isToolbarVisible && (
            <div className="pointer-events-auto bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-black/10 rounded-2xl p-1 flex items-center gap-0.5 backdrop-blur-md shrink-0">
              {/* 1. Pencil (F3) */}
              <button
                type="button"
                onClick={() => handleToolSelect('PEN')}
                title="Pencil (F3) - Freehand draw and annotate"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  tool === 'PEN'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold ring-1.5 ring-indigo-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold'
                }`}
              >
                <Pen className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Pencil</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono">F3</span>
              </button>

              {/* 2. Text Tool */}
              <button
                type="button"
                onClick={() => handleToolSelect('TEXT')}
                title="Text - Type directly on chart"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  tool === 'TEXT'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold ring-1.5 ring-indigo-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Text</span>
              </button>

              {/* 3. Rectangle (F4) + Fill/Unfill Sub-Control */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleToolSelect('RECTANGLE')}
                  title="Rectangle (F4) - Draw zones with custom outline and fill"
                  className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    tool === 'RECTANGLE'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold ring-1.5 ring-indigo-400'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">Rectangle</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono">F4</span>
                </button>
                {/* Dot labeled "Fill/Unfill" right below the rectangle tool */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const willBeFilled = isInsideTransparent;
                    setIsInsideTransparent(!willBeFilled);
                    if (selectedItemId) {
                      handleUpdateSelectedColors(undefined, willBeFilled ? (insideColor || outsideColor) : 'transparent');
                    }
                  }}
                  title={!isInsideTransparent ? 'Fill is ON (Click to unfill / hollow)' : 'Fill is OFF (Click to fill shape interior)'}
                  className="flex items-center gap-1 px-1.5 py-0.5 mt-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer select-none"
                >
                  <span
                    className={`w-2 h-2 rounded-full border transition-all ${
                      !isInsideTransparent
                        ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.8)] scale-110'
                        : 'bg-transparent border-slate-400 dark:border-slate-500'
                    }`}
                  />
                  <span
                    className={`text-[9px] leading-none ${
                      !isInsideTransparent
                        ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'text-slate-500 dark:text-slate-400 font-medium'
                    }`}
                  >
                    Fill/Unfill
                  </span>
                </button>
              </div>

              {/* 4. Bullish Candle (Green #10B981) - Upward Arrow */}
              <button
                type="button"
                onClick={() => handleToolSelect('CANDLE_BULLISH')}
                title="Green Candle (Bullish ▲) - Click repeatedly on chart to continuously place bullish candles"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 font-bold text-xs shrink-0 ${
                  tool === 'CANDLE_BULLISH'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                    : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800'
                }`}
              >
                <CandlestickChart className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                <ArrowUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                <span className="text-[11px]">Green ▲</span>
              </button>

              {/* 5. Bearish Candle (Red #EF4444) - Downward Arrow */}
              <button
                type="button"
                onClick={() => handleToolSelect('CANDLE_BEARISH')}
                title="Red Candle (Bearish ▼) - Click repeatedly on chart to continuously place bearish candles"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 font-bold text-xs shrink-0 ${
                  tool === 'CANDLE_BEARISH'
                    ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400'
                    : 'hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800'
                }`}
              >
                <CandlestickChart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <ArrowDown className="w-3 h-3 text-rose-600 dark:text-rose-400 stroke-[3]" />
                <span className="text-[11px]">Red ▼</span>
              </button>

              {/* 6. Mouse Cursor (Select / Move / Resize) */}
              <button
                type="button"
                onClick={() => handleToolSelect('SELECT')}
                title="Cursor / Pointer - Select, move, and resize items"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  tool === 'SELECT'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold ring-1.5 ring-indigo-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold'
                }`}
              >
                <MousePointer className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Select</span>
              </button>

              {/* 7. Hand Tool (Spacebar) */}
              <button
                type="button"
                onClick={() => handleToolSelect('PAN')}
                title="Hand Tool (Spacebar) - Pan and move around the canvas"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  tool === 'PAN'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold ring-1.5 ring-indigo-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold'
                }`}
              >
                <Hand className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Hand</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-black/10 dark:bg-white/10 font-mono">Space</span>
              </button>

              {/* 8. Eraser */}
              <button
                type="button"
                onClick={() => handleToolSelect('ERASER')}
                title="Eraser - Click or drag to erase"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  tool === 'ERASER'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 shadow-xs font-bold ring-1.5 ring-rose-400'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold'
                }`}
              >
                <Eraser className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-[11px] font-bold">Eraser</span>
              </button>

              {/* 9. Delete All / Clear Canvas */}
              <button
                type="button"
                onClick={() => {
                  if (items.length === 0) return;
                  if (window.confirm('Delete everything on the canvas?')) {
                    confirmClearWorkspace();
                  }
                }}
                title="Delete All - Clear everything drawn on the canvas"
                className="px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-[11px] font-bold">Delete</span>
              </button>

              <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

              {/* Outline & Fill Color Quick Indicator & Toggle */}
              <div
                onClick={() => setIsLeftPanelOpen((prev) => !prev)}
                title="Border Outline & Inside Fill Colors (Click to open studio panel)"
                className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-400 shadow-xs"
                  style={{ backgroundColor: outsideColor }}
                  title={`Outline / Border Color: ${outsideColor}`}
                />
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-400 shadow-xs"
                  style={{
                    backgroundColor: isInsideTransparent ? 'transparent' : insideColor,
                    backgroundImage: isInsideTransparent
                      ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                      : undefined,
                    backgroundSize: '4px 4px',
                  }}
                  title={`Fill / Inside Color: ${isInsideTransparent ? 'Transparent' : insideColor}`}
                />
              </div>

              {/* Background Color Quick Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsBgMenuOpen((prev) => !prev)}
                  title="Change Canvas Background Color"
                  className={`p-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 text-slate-700 dark:text-slate-300 ${
                    isBgMenuOpen ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                  <span
                    className="w-3 h-3 rounded-full border border-slate-400"
                    style={{ backgroundColor: outerBgColor }}
                  />
                </button>
                {isBgMenuOpen && (
                  <div className="absolute top-10 right-0 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2.5 z-50 space-y-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      <span>Canvas Background</span>
                      <span className="font-mono text-[10px] text-slate-400">{outerBgColor}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: 'Pitch Black', hex: '#000000' },
                        { label: 'Command Dark', hex: '#080C15' },
                        { label: 'Trading Dark', hex: '#131722' },
                        { label: 'Slate Charcoal', hex: '#1E293B' },
                        { label: 'Pure White', hex: '#FFFFFF' },
                        { label: 'Soft Canvas', hex: '#F8FAFC' },
                        { label: 'Light Slate', hex: '#F1F5F9' },
                      ].map((bg) => (
                        <button
                          key={bg.hex}
                          type="button"
                          onClick={() => {
                            setOuterBgColor(bg.hex);
                            setInnerBgColor(bg.hex);
                            try {
                              localStorage.setItem('primepipfx_freehand_outer_bg', bg.hex);
                              localStorage.setItem('primepipfx_freehand_inner_bg', bg.hex);
                              localStorage.setItem('primepipfx_freehand_background', bg.hex);
                            } catch {}
                            setIsBgMenuOpen(false);
                          }}
                          title={bg.label}
                          style={{ backgroundColor: bg.hex }}
                          className={`w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-700 shadow-xs transition hover:scale-110 cursor-pointer ${
                            outerBgColor.toLowerCase() === bg.hex.toLowerCase()
                              ? 'ring-2 ring-indigo-600 ring-offset-1 scale-105'
                              : ''
                          }`}
                        />
                      ))}
                      <label
                        title="Pick Custom Background Color"
                        className="w-7 h-7 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center cursor-pointer shadow-xs bg-gradient-to-tr from-pink-500 via-amber-400 to-indigo-500 hover:scale-110 transition"
                      >
                        <input
                          type="color"
                          value={outerBgColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOuterBgColor(val);
                            setInnerBgColor(val);
                            try {
                              localStorage.setItem('primepipfx_freehand_outer_bg', val);
                              localStorage.setItem('primepipfx_freehand_inner_bg', val);
                              localStorage.setItem('primepipfx_freehand_background', val);
                            } catch {}
                          }}
                          className="sr-only"
                        />
                        <span className="text-[10px] text-white font-bold">+</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

              {/* 1-Click Quick Save to Vault */}
              <button
                type="button"
                onClick={() => {
                  pushHistory();
                  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  const name = `Drawing ${new Date().toLocaleDateString('en-GB')} ${time}`;
                  const updated = [
                    ...savedWorkspaces,
                    {
                      name,
                      date: new Date().toLocaleDateString('en-GB'),
                      data: items,
                    },
                  ];
                  setSavedWorkspaces(updated);
                  try {
                    localStorage.setItem('primepipfx_freehand_saved', JSON.stringify(updated));
                  } catch {}
                  setSaveToast('Saved to Vault!');
                  setTimeout(() => setSaveToast(null), 2000);
                }}
                title="Save Drawing to Vault"
                className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span className="hidden sm:inline">Save</span>
              </button>

              {/* Download / Export Dropdown - Prominent, Large & Always Visible */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDownloadMenuOpen((prev) => !prev)}
                  title="Download Canvas (PNG, SVG, JSON)"
                  className="px-3.5 py-1.5 min-w-[105px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download</span>
                </button>
                {isDownloadMenuOpen && (
                  <div className="absolute top-10 right-0 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        handleExportPNG();
                        setIsDownloadMenuOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Download PNG Image</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportSVG();
                        setIsDownloadMenuOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-sky-600" />
                      <span>Download SVG Vector</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportJSON();
                        setIsDownloadMenuOpen(false);
                      }}
                      className="w-full px-2.5 py-1.5 text-left rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Download JSON File</span>
                    </button>
                  </div>
                )}
              </div>

              {/* TradingView Pro Link in Toolbar */}
              <a
                href="https://www.tradingview.com/pricing/"
                target="_blank"
                rel="noopener noreferrer"
                title="Open TradingView Pro / Premium Platform"
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              >
                <TrendingUp className="w-3.5 h-3.5 text-sky-200" />
                <span className="hidden md:inline">TradingView Pro</span>
                <ExternalLink className="w-3 h-3 text-sky-200" />
              </a>

              {/* Upload Dropdown */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload Saved Drawing JSON"
                className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>
          )}

          {/* Top-Right: Show/Hide Tools Toggle, Prominent Download, TradingView Pro, Studio Panel, Fullscreen Toggle */}
          <div className="pointer-events-auto flex items-center gap-2 shrink-0">
            {/* Auto-Save Status Badge */}
            <div
              title={`Continuous Auto-Save: ${
                autoSaveStatus === 'saving'
                  ? 'Saving changes to local storage...'
                  : `All changes auto-saved (${lastAutoSaveTime || 'just now'})`
              }`}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-sm text-[11px] font-semibold text-slate-700 dark:text-slate-300 backdrop-blur-md"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoSaveStatus === 'saving' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'
                }`}
              />
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300">
                {autoSaveStatus === 'saving' ? 'Auto-saving...' : 'Auto-saved'}
              </span>
            </div>

            {/* Show / Hide Tools Option */}
            <button
              type="button"
              onClick={() => setIsToolbarVisible((prev) => !prev)}
              title={isToolbarVisible ? 'Hide Tools to maximize workspace' : 'Show Tools'}
              className="px-3 py-2 rounded-xl bg-white/95 text-slate-700 hover:bg-slate-50 border border-slate-200/90 shadow-md shadow-black/5 flex items-center gap-1.5 transition active:scale-95 cursor-pointer backdrop-blur-md text-xs font-bold"
            >
              {isToolbarVisible ? (
                <>
                  <EyeOff className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Hide Tools</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Show Tools</span>
                </>
              )}
            </button>

            {/* Prominent Large Download Button */}
            <button
              type="button"
              onClick={handleExportPNG}
              title="Download Canvas Image (PNG)"
              className="px-4 py-2 min-w-[110px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition active:scale-95 cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Download</span>
            </button>

            {/* TradingView Pro / Premium Direct Link */}
            <a
              href="https://www.tradingview.com/pricing/"
              target="_blank"
              rel="noopener noreferrer"
              title="Open TradingView Pro / Premium Platform"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer shrink-0"
            >
              <TrendingUp className="w-4 h-4 text-sky-200" />
              <span className="hidden md:inline">TradingView Pro</span>
              <ExternalLink className="w-3.5 h-3.5 text-sky-200" />
            </a>

            {/* Left Sidebar Toggle Button */}
            <button
              type="button"
              onClick={() => setIsLeftPanelOpen((prev) => !prev)}
              title={isLeftPanelOpen ? 'Hide Left Options Panel' : 'Show Left Options Panel'}
              className="w-10 h-10 rounded-xl bg-white/95 text-slate-700 hover:bg-slate-50 border border-slate-200/90 shadow-md shadow-black/5 flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
            >
              {isLeftPanelOpen ? (
                <PanelLeftClose className="w-4 h-4 text-slate-700" />
              ) : (
                <PanelLeft className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Fullscreen / Minimize Toggle Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Minimize / Exit Full Screen (Esc)' : 'Enter Full Screen'}
              className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer backdrop-blur-md ${
                isFullscreen
                  ? 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                  : 'bg-white/95 text-slate-800 border border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span className="font-bold text-rose-700 dark:text-rose-300">Minimize</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Full Screen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* LEFT-SIDE OPTIONS PANEL - OBJECT COLORS & PROPERTIES          */}
        {/* ============================================================== */}
        {isLeftPanelOpen && (
          <div className="absolute top-16 left-4 bottom-16 z-30 w-72 max-w-[85vw] bg-white/95 text-slate-800 border border-slate-200/90 rounded-2xl shadow-xl backdrop-blur-xl p-4 overflow-y-auto space-y-4 animate-in fade-in slide-in-from-left-4 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-600" />
                Object &amp; Canvas Studio
              </span>
              <button
                type="button"
                onClick={() => setIsLeftPanelOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* 1. OUTSIDE COLOR (BORDER, WICKS, OUTLINE) */}
            <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Outside Color (Border / Wicks)</span>
                <span className="w-4 h-4 rounded-full border border-slate-400" style={{ backgroundColor: outsideColor }} />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {paletteColors.map((c) => (
                  <button
                    key={`out-${c}`}
                    type="button"
                    onClick={() => {
                      setOutsideColor(c);
                      handleUpdateSelectedColors(c, undefined);
                    }}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border border-slate-300 shadow-xs transition hover:scale-110 cursor-pointer ${
                      outsideColor === c ? 'ring-2 ring-indigo-600 scale-110' : ''
                    }`}
                  />
                ))}
                {/* Native Picker for Outside Color */}
                <label
                  title="Pick Any Outside Color"
                  className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center cursor-pointer shadow-xs bg-gradient-to-tr from-pink-500 via-amber-400 to-indigo-500"
                >
                  <input
                    type="color"
                    value={outsideColor}
                    onChange={(e) => {
                      setOutsideColor(e.target.value);
                      handleUpdateSelectedColors(e.target.value, undefined);
                    }}
                    className="sr-only"
                    aria-label="Pick custom outside color"
                  />
                </label>
              </div>
            </div>

            {/* 2. INSIDE COLOR (BODY FILL, INTERIOR) */}
            <div className="space-y-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Inside Color (Body Fill)</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isInsideTransparent;
                      setIsInsideTransparent(next);
                      handleUpdateSelectedColors(undefined, next ? 'transparent' : insideColor);
                    }}
                    className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${
                      isInsideTransparent
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {isInsideTransparent ? 'Hollow / Transparent' : 'Filled'}
                  </button>
                  <span
                    className="w-4 h-4 rounded-full border border-slate-400"
                    style={{ backgroundColor: isInsideTransparent ? 'transparent' : insideColor }}
                  />
                </div>
              </div>

              {!isInsideTransparent && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {paletteColors.map((c) => (
                    <button
                      key={`in-${c}`}
                      type="button"
                      onClick={() => {
                        setInsideColor(c);
                        setIsInsideTransparent(false);
                        handleUpdateSelectedColors(undefined, c);
                      }}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-full border border-slate-300 shadow-xs transition hover:scale-110 cursor-pointer ${
                        insideColor === c ? 'ring-2 ring-indigo-600 scale-110' : ''
                      }`}
                    />
                  ))}
                  <label
                    title="Pick Any Inside Color"
                    className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center cursor-pointer shadow-xs bg-gradient-to-tr from-cyan-400 via-emerald-400 to-indigo-500"
                  >
                    <input
                      type="color"
                      value={insideColor}
                      onChange={(e) => {
                        setInsideColor(e.target.value);
                        setIsInsideTransparent(false);
                        handleUpdateSelectedColors(undefined, e.target.value);
                      }}
                      className="sr-only"
                      aria-label="Pick custom inside color"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* 3. CANDLESTICK SETTINGS & CONTINUOUS PLACER */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <CandlestickChart className="w-3.5 h-3.5 text-emerald-600" />
                  Candlesticks
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">Continuous Draw Active</span>
              </div>

              {/* Quick Draw Triggers */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setOutsideColor('#10B981');
                    setInsideColor('#10B981');
                    handleToolSelect('CANDLE_BULLISH');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    tool === 'CANDLE_BULLISH'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  <CandlestickChart className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                  <ArrowUp className="w-3 h-3 text-emerald-600 stroke-[3]" />
                  <span>Bullish ▲</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOutsideColor('#EF4444');
                    setInsideColor('#EF4444');
                    handleToolSelect('CANDLE_BEARISH');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    tool === 'CANDLE_BEARISH'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/30 ring-2 ring-rose-400'
                      : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                  }`}
                >
                  <CandlestickChart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
                  <ArrowDown className="w-3 h-3 text-rose-600 stroke-[3]" />
                  <span>Bearish ▼</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-500 italic">
                Tip: When Bullish or Bearish is selected, keep clicking or dragging to place as many candles as you want!
              </p>

              {/* Candlestick Width Selector */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Candle Width</span>
                  <span className="font-mono text-slate-700 font-bold">{candleWidth}px</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: '16px', w: 16 },
                    { label: '28px', w: 28 },
                    { label: '40px', w: 40 },
                    { label: '56px', w: 56 },
                  ].map((preset) => (
                    <button
                      key={preset.w}
                      type="button"
                      onClick={() => setCandleWidth(preset.w)}
                      className={`py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        candleWidth === preset.w
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Candle Opacity</span>
                  <span className="font-mono text-slate-700 font-bold">
                    {Math.round(candleOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={candleOpacity}
                  onChange={(e) => setCandleOpacity(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                />
              </div>

              {/* Quick Place Candle Buttons */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleInsertCandle('BULLISH')}
                  className="py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold shadow-xs flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <span>+ Bullish</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertCandle('BEARISH')}
                  className="py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-bold shadow-xs flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <span>+ Bearish</span>
                </button>
              </div>
            </div>

            {/* 4. PENCIL WRITING TOOL STUDIO CARD */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Pen className="w-3.5 h-3.5 text-indigo-600" />
                  Pencil (Freehand Writing)
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToolSelect('PEN')}
                className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                  tool === 'PEN'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Pen className="w-3.5 h-3.5" />
                <span>{tool === 'PEN' ? '✓ Pencil Writing Active' : 'Select Pencil (Write)'}</span>
              </button>
            </div>

            {/* 5. DIRECT TEXT TYPING TOOL */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                <span className="flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-indigo-600" />
                  Text Annotation Tool
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Direct on-chart typing: Click anywhere directly on the chart to type or edit text labels.
              </p>
              <button
                type="button"
                onClick={() => handleToolSelect('TEXT')}
                className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                  tool === 'TEXT'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>{tool === 'TEXT' ? '✓ Text Tool Active (Click on Chart)' : 'Select Text Tool'}</span>
              </button>
            </div>

            {/* 6. SELECTED OBJECT STUDIO (MOVE & RESIZE WITHIN MOVE TOOL) */}
            {selectedItem && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                  <span className="flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-indigo-600" />
                    Selected: {selectedItem.tool.replace('CANDLE_', '')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedItemId(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                  >
                    Deselect
                  </button>
                </div>

                {/* In-Panel Text Editing for Selected Text Item */}
                {selectedItem.tool === 'TEXT' && (
                  <div className="space-y-1.5 p-2 bg-white rounded-xl border border-indigo-200 shadow-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Edit Text Content:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setTool('TEXT');
                          setActiveTextSession({
                            id: selectedItem.id,
                            canvasX: selectedItem.x1 ?? 0,
                            canvasY: selectedItem.y1 ?? 0,
                            text: selectedItem.text ?? '',
                            color: selectedItem.color,
                          });
                          setTimeout(() => activeTextInputRef.current?.focus(), 20);
                        }}
                        className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        Edit on Canvas ➔
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={selectedItem.text ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItems((prev) =>
                          prev.map((it) => (it.id === selectedItem.id ? { ...it, text: val } : it))
                        );
                      }}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 resize-none"
                      placeholder="Type text..."
                    />
                  </div>
                )}

                {/* Live Size Adjusters */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Width</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAdjustSelectedSize(-4, 0)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustSelectedSize(4, 0)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Height / Length</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAdjustSelectedSize(0, -10)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustSelectedSize(0, 10)}
                      className="w-6 h-6 rounded-md bg-white border border-slate-300 hover:bg-slate-100 font-bold text-slate-700 flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Move Nudge Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-medium">Nudge (or Arrow keys)</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleNudgeSelected(-10, 0)}
                      className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeSelected(0, -10)}
                      className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeSelected(0, 10)}
                      className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgeSelected(10, 0)}
                      className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Duplicate & Delete */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-indigo-100">
                  <button
                    type="button"
                    onClick={handleDuplicateSelected}
                    className="flex-1 py-1.5 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="flex-1 py-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )}

            {/* 5. CANVAS BACKGROUND COLORS */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Outer Background</span>
                <span className="text-[10px] text-slate-400 font-mono">{outerBgColor}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {outerBgPresets.map((bg) => (
                  <button
                    key={bg.hex}
                    type="button"
                    onClick={() => {
                      setOuterBgColor(bg.hex);
                      try {
                        localStorage.setItem('primepipfx_freehand_outer_bg', bg.hex);
                        localStorage.setItem('primepipfx_freehand_background', bg.hex);
                      } catch {}
                    }}
                    title={bg.label}
                    style={{ backgroundColor: bg.hex }}
                    className={`w-6 h-6 rounded-full border border-slate-300 shadow-xs transition hover:scale-110 cursor-pointer ${
                      outerBgColor.toLowerCase() === bg.hex.toLowerCase()
                        ? 'ring-2 ring-indigo-600 ring-offset-1 scale-110'
                        : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Inner Sheet Color</span>
                <span className="text-[10px] text-slate-400 font-mono">{innerBgColor}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {innerBgPresets.map((bg) => (
                  <button
                    key={bg.hex}
                    type="button"
                    onClick={() => {
                      setInnerBgColor(bg.hex);
                      try {
                        localStorage.setItem('primepipfx_freehand_inner_bg', bg.hex);
                      } catch {}
                    }}
                    title={bg.label}
                    style={{ backgroundColor: bg.hex }}
                    className={`w-6 h-6 rounded-full border border-slate-300 shadow-xs transition hover:scale-110 cursor-pointer ${
                      innerBgColor.toLowerCase() === bg.hex.toLowerCase()
                        ? 'ring-2 ring-indigo-600 ring-offset-1 scale-110'
                        : ''
                    }`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setInnerBgColor(outerBgColor);
                    try {
                      localStorage.setItem('primepipfx_freehand_inner_bg', outerBgColor);
                    } catch {}
                  }}
                  className="text-[10px] text-indigo-600 font-semibold hover:underline ml-1 cursor-pointer"
                >
                  Sync Outer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* INTERACTIVE DIRECT ON-CHART TEXT EDITOR (WITH PRECISION CARET) */}
        {/* ============================================================== */}
        {activeTextSession && (() => {
          const isLightBg =
            innerBgColor.toLowerCase().startsWith('#f') ||
            innerBgColor.toLowerCase() === '#ffffff' ||
            outerBgColor.toLowerCase().startsWith('#f') ||
            outerBgColor.toLowerCase() === '#ffffff';
          const textColor =
            activeTextSession.color === '#FFFFFF' && isLightBg ? '#0F172A' : (activeTextSession.color || '#10B981');

          const targetStrokeWidth =
            items.find((i) => i.id === activeTextSession.id)?.strokeWidth || strokeWidth || 2;
          const screenFontSize = Math.max(14, targetStrokeWidth * 8) * zoom;
          const screenLineHeight = screenFontSize * 1.25;
          const screenX = activeTextSession.canvasX * zoom + panOffset.x;
          const screenY = activeTextSession.canvasY * zoom + panOffset.y;

          return (
            <textarea
              ref={activeTextInputRef}
              autoFocus
              aria-label="Direct on-chart typing"
              value={activeTextSession.text}
              onChange={(e) => {
                const val = e.target.value;
                const sel = e.target.selectionStart ?? val.length;
                setActiveTextSession((prev) => (prev ? { ...prev, text: val, cursorIndex: sel } : null));
              }}
              onSelect={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const sel = target.selectionStart ?? target.value.length;
                setActiveTextSession((prev) => (prev ? { ...prev, cursorIndex: sel } : null));
              }}
              onKeyUp={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const sel = target.selectionStart ?? target.value.length;
                setActiveTextSession((prev) => (prev ? { ...prev, cursorIndex: sel } : null));
              }}
              onClick={(e) => {
                e.stopPropagation();
                const target = e.target as HTMLTextAreaElement;
                const sel = target.selectionStart ?? target.value.length;
                setActiveTextSession((prev) => (prev ? { ...prev, cursorIndex: sel } : null));
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={() => {
                commitActiveText();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  commitActiveText();
                  return;
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  commitActiveText();
                  return;
                }
                setTimeout(() => {
                  if (activeTextInputRef.current) {
                    const sel =
                      activeTextInputRef.current.selectionStart ?? activeTextInputRef.current.value.length;
                    setActiveTextSession((prev) => (prev ? { ...prev, cursorIndex: sel } : null));
                  }
                }, 0);
              }}
              style={{
                position: 'absolute',
                left: `${Math.round(screenX)}px`,
                top: `${Math.round(screenY)}px`,
                minWidth: '140px',
                width: 'auto',
                minHeight: `${Math.round(screenLineHeight * 1.4)}px`,
                fontSize: `${Math.round(screenFontSize)}px`,
                lineHeight: 1.25,
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 600,
                color: textColor,
                caretColor: textColor,
                backgroundColor: isLightBg ? 'rgba(255, 255, 255, 0.94)' : 'rgba(15, 23, 42, 0.94)',
                border: '1.5px dashed #6366f1',
                borderRadius: '6px',
                padding: '2px 6px',
                margin: 0,
                outline: 'none',
                resize: 'both',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                zIndex: 60,
                pointerEvents: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            />
          );
        })()}

        {/* ============================================================== */}
        {/* INTERACTIVE HTML5 CANVAS AREA (EDGE-TO-EDGE IN FULLSCREEN)     */}
        {/* ============================================================== */}
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
          onDoubleClick={(e) => {
            const coords = getCanvasCoords(e);
            const hit = findItemAtCoord(coords.x, coords.y);
            if (hit && hit.tool === 'TEXT') {
              draftRef.current = null;
              setCurrentDraft(null);
              isDrawingRef.current = false;
              setIsDrawing(false);
              handleToolSelect('TEXT');
              setSelectedItemId(hit.id);
              const dpr = window.devicePixelRatio || 1;
              const itemFontSize = Math.max(14 * dpr, (hit.strokeWidth || 2) * 8 * dpr);
              const itemLineHeight = itemFontSize * 1.25;
              const charIdx = getCharIndexFromClick(
                hit.text || '',
                coords.x,
                coords.y,
                hit.x1 ?? coords.x,
                hit.y1 ?? coords.y,
                itemFontSize,
                itemLineHeight,
                dpr
              );
              setActiveTextSession({
                id: hit.id,
                canvasX: hit.x1 ?? coords.x,
                canvasY: hit.y1 ?? coords.y,
                text: hit.text ?? '',
                color: hit.color,
                cursorIndex: charIdx,
              });
              setTimeout(() => {
                if (activeTextInputRef.current) {
                  activeTextInputRef.current.focus();
                  activeTextInputRef.current.setSelectionRange(charIdx, charIdx);
                }
              }, 20);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            handleToolSelect('PAN');
          }}
          style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
          className={`w-full h-full block select-none ${getCanvasCursor()}`}
        />

        {/* ============================================================== */}
        {/* BOTTOM FLOATING CONTROLS                                       */}
        {/* ============================================================== */}

        {/* Bottom-Left Pill: Zoom [- 100% +] and Undo / Redo */}
        <div className="absolute bottom-4 left-4 z-40 flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/95 text-slate-700 border border-slate-200/90 shadow-lg shadow-black/5 rounded-2xl p-1 flex items-center gap-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.2, Number((z - 0.1).toFixed(2))))}
              title="Zoom Out"
              className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600 transition cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            <span
              onClick={handleResetView}
              title="Click to reset zoom to 100%"
              className="px-2 text-xs font-bold font-mono text-slate-700 hover:text-indigo-600 cursor-pointer"
            >
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
              title="Zoom In"
              className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600 transition cursor-pointer"
            >
              <span className="text-base font-bold">+</span>
            </button>
          </div>

          {/* Undo / Redo Pill */}
          <div className="bg-white/95 text-slate-700 border border-slate-200/90 shadow-lg shadow-black/5 rounded-2xl p-1 flex items-center gap-1 backdrop-blur-md">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Undo (Ctrl+Z)"
              className="w-8 h-8 rounded-xl hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center text-slate-600 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Y)"
              className="w-8 h-8 rounded-xl hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center text-slate-600 transition cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom-Center Pill: Scroll Back to Content Button */}
        <div className="absolute bottom-4 left-0 right-0 z-40 flex items-center justify-center pointer-events-none">
          <button
            type="button"
            onClick={handleScrollBackToContent}
            title="Recenter view on your drawings and candles"
            className="pointer-events-auto px-4 py-2 bg-white/95 hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-lg shadow-black/5 rounded-xl text-xs font-semibold backdrop-blur-md transition active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>Scroll back to content</span>
          </button>
        </div>

        {/* Bottom-Right: Help, Minimize & Object Count */}
        <div className="absolute bottom-4 right-4 z-40 flex items-center gap-2 pointer-events-auto">
          {isFullscreen && (
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Minimize Full Screen (Esc)"
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 shadow-md flex items-center gap-1.5 font-bold text-xs cursor-pointer transition active:scale-95 backdrop-blur-md"
            >
              <Minimize2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Minimize</span>
            </button>
          )}
          <div className="bg-white/95 text-slate-600 border border-slate-200/90 shadow-lg shadow-black/5 rounded-2xl px-3 py-1.5 text-[11px] font-mono backdrop-blur-md hidden sm:flex items-center gap-1.5">
            <span>Objects:</span>
            <strong className="text-indigo-600">{items.length}</strong>
            <span className="text-slate-300 mx-0.5">•</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  autoSaveStatus === 'saving' ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'
                }`}
              />
              <span>{autoSaveStatus === 'saving' ? 'Auto-saving...' : `Auto-saved ${lastAutoSaveTime}`}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsHelpOpen((prev) => !prev)}
            title="Canvas Quick Guide"
            className="w-9 h-9 rounded-xl bg-white/95 hover:bg-slate-50 text-slate-600 border border-slate-200/90 shadow-lg shadow-black/5 flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <HelpCircle className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Help Popover */}
        {isHelpOpen && (
          <div className="absolute bottom-16 right-4 w-72 bg-white/98 text-slate-800 border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-2 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="font-bold text-slate-700">Canvas Tips &amp; Tools</span>
              <button onClick={() => setIsHelpOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-[11px] text-slate-600">
              • <strong>Move Tool</strong>: Click any object or candle to move it. Drag corner handles to resize it.
            </p>
            <p className="text-[11px] text-slate-600">
              • <strong>Bullish &amp; Bearish Candles</strong>: Select Bullish or Bearish to draw multiple candlesticks continuously with your mouse!
            </p>
            <p className="text-[11px] text-slate-600">
              • <strong>Inside &amp; Outside Colors</strong>: Customize outside outline/wicks and inside body fill in the Left Studio Panel.
            </p>
            <p className="text-[11px] text-slate-600">
              • <strong>Text Tool</strong>: Click anywhere on the canvas to open a live text box with real-time typing.
            </p>
            <p className="text-[11px] text-slate-600">
              • <strong>Arrow Keys</strong>: Nudge selected candle or shape by 2px (or 10px with Shift).
            </p>
          </div>
        )}

        {/* Clear Confirmation Modal */}
        {isClearModalOpen && (
          <div className="fixed inset-0 z-[1000000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-rose-200 p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl text-xs">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h4 className="font-bold text-base text-slate-900">Clear All Drawings?</h4>
                <p className="text-slate-600 text-xs">
                  This will wipe all candles and drawings on this canvas.
                </p>
                <p className="text-slate-400 text-[11px]">You can still press Ctrl+Z to undo.</p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsClearModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearWorkspace}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Canvas</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Drawing Modal */}
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-[1000000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
              <h4 className="text-sm font-bold text-slate-900">Save Workspace Drawing</h4>
              <input
                type="text"
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. Gold Weekly Liquidity Sweep"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-600"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWorkspace}
                  className="px-4 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Drawings Modal */}
        {isLoadModalOpen && (
          <div className="fixed inset-0 z-[1000000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl max-w-md w-full space-y-4 max-h-[80vh] overflow-y-auto shadow-2xl">
              <h4 className="text-sm font-bold text-slate-900">Saved Drawings Vault</h4>
              {savedWorkspaces.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No saved drawings found in local storage.
                </p>
              ) : (
                <div className="space-y-2">
                  {savedWorkspaces.map((sw, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleLoadWorkspace(sw.data)}
                      className="p-3 bg-slate-50 border border-slate-200 hover:border-indigo-500 rounded-xl cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{sw.name}</div>
                        <div className="text-[10px] text-slate-400">{sw.date}</div>
                      </div>
                      <span className="text-xs text-indigo-600 font-bold">LOAD ➔</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => setIsLoadModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Import File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportJSON}
          accept=".json"
          className="hidden"
        />

        {/* Hidden Image, PDF & CorelDRAW (.CDR) Upload Input */}
        <input
          type="file"
          ref={imageUploadInputRef}
          onChange={handleImageUpload}
          accept="image/*,application/pdf,.pdf,.cdr,application/vnd.corel-draw,application/coreldraw,application/x-cdr"
          className="hidden"
        />
        {/* Quick Save Toast Notification */}
        {saveToast && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xl animate-in fade-in zoom-in-95 duration-150 flex items-center gap-2">
            <Check className="w-4 h-4 text-white" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>
    );
  };

  // If in fullscreen, mount directly into document.body via Portal to guarantee 100vw x 100vh!
  if (isFullscreen) {
    return createPortal(renderWorkspaceContent(), document.body);
  }

  // Standard (Embedded) View
  return (
    <div className="space-y-3 font-sans">
      {/* Quick Navigation Links */}
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800/80 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-bold">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            Freehand Canvas
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            Technical analysis drawing board with candlestick objects
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Tool Triggers */}
          <button
            type="button"
            onClick={() => handleToolSelect('PEN')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              tool === 'PEN'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Pen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pencil (F3)</span>
          </button>
          <button
            type="button"
            onClick={() => handleToolSelect('TEXT')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              tool === 'TEXT'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-indigo-400" />
            <span>Text</span>
          </button>
          <button
            type="button"
            onClick={() => handleToolSelect('RECTANGLE')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              tool === 'RECTANGLE'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Square className="w-3.5 h-3.5 text-indigo-400" />
            <span>Rectangle (F4)</span>
          </button>
          <button
            type="button"
            onClick={() => handleToolSelect('CANDLE_BULLISH')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              tool === 'CANDLE_BULLISH'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/50'
            }`}
          >
            <CandlestickChart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <ArrowUp className="w-3 h-3 text-emerald-400 stroke-[3]" />
            <span>Bullish (Green ▲)</span>
          </button>
          <button
            type="button"
            onClick={() => handleToolSelect('CANDLE_BEARISH')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              tool === 'CANDLE_BEARISH'
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/80 hover:bg-rose-900/50'
            }`}
          >
            <CandlestickChart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
            <ArrowDown className="w-3 h-3 text-rose-400 stroke-[3]" />
            <span>Bearish (Red ▼)</span>
          </button>
          <button
            type="button"
            onClick={() => handleToolSelect('SELECT')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              tool === 'SELECT'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select</span>
          </button>
          <button
            type="button"
            onClick={() => handleToolSelect('PAN')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              tool === 'PAN'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Hand className="w-3.5 h-3.5 text-indigo-400" />
            <span>Hand (Space)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (items.length === 0) return;
              if (window.confirm('Delete everything on the canvas?')) {
                confirmClearWorkspace();
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition cursor-pointer"
            title="Delete All - Clear everything drawn on the canvas"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete All</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-indigo-500/50 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95"
            title="Open True Edge-to-Edge Full Screen View"
          >
            <Maximize2 className="w-4 h-4" />
            <span>ENTER FULL SCREEN</span>
          </button>
          <a
            href="https://www.tradingview.com/pricing/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25 text-sky-300 font-bold text-xs transition cursor-pointer"
            title="Open TradingView Pro / Premium"
          >
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span>TradingView Pro</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
          <button
            type="button"
            onClick={() => handleNavigate('SBT_MODELS')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Supply &amp; Demand</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </button>
          <button
            type="button"
            onClick={() => handleNavigate('PRO_LEARNING')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/25 text-indigo-300 font-bold text-xs transition cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pro Learning</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Render Workspace Content Inside Container */}
      {renderWorkspaceContent()}
    </div>
  );
};
