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
  const [gridMode, setGridMode] = useState<'GRID' | 'DOTS' | 'NONE'>('DOTS');

  // Candlestick Configuration State
  const [candleOpacity, setCandleOpacity] = useState<number>(1.0);
  const [candleWidth, setCandleWidth] = useState<number>(28);

  // Canvas Items
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

  // Selection, Dragging & Resizing States (Move tool handles both!)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDraggingSelected, setIsDraggingSelected] = useState<boolean>(false);
  const [dragStartCoord, setDragStartCoord] = useState<{ x: number; y: number } | null>(null);
  const [activeResizeHandle, setActiveResizeHandle] = useState<ResizeHandleType | null>(null);
  const [resizeStartCoord, setResizeStartCoord] = useState<{ x: number; y: number } | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandleType | null>(null);

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
  const [isErasing, setIsErasing] = useState(false);
  const erasedIdsRef = useRef<Set<string>>(new Set());

  // Active On-Chart Text Editor (Direct inline editing at clicked canvas coordinates)
  const [activeTextEditor, setActiveTextEditor] = useState<{
    id?: string;
    canvasX: number;
    canvasY: number;
    text: string;
    color: string;
  } | null>(null);
  const activeTextInputRef = useRef<HTMLInputElement | null>(null);

  // Focus and select input on editor activation
  useEffect(() => {
    if (activeTextEditor) {
      const timer = setTimeout(() => {
        if (activeTextInputRef.current) {
          activeTextInputRef.current.focus();
          activeTextInputRef.current.select();
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [activeTextEditor]);

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
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          'primepipfx_freehand_autosave',
          JSON.stringify({
            version: 4,
            savedAt: Date.now(),
            items,
          })
        );
        localStorage.setItem('primepipfx_freehand_outer_bg', outerBgColor);
        localStorage.setItem('primepipfx_freehand_inner_bg', innerBgColor);
        localStorage.setItem('primepipfx_freehand_background', outerBgColor);
        setAutoSavedNotice(true);
        const noticeTimer = window.setTimeout(() => setAutoSavedNotice(false), 1200);
        return () => window.clearTimeout(noticeTimer);
      } catch (e) {
        console.error('Freehand auto-save failed:', e);
      }
    }, 300);

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

  // Commit active on-chart text editor onto canvas
  const commitActiveText = useCallback(() => {
    if (!activeTextEditor) return;
    const txt = activeTextEditor.text.trim();
    if (txt) {
      pushHistory();
      const isLightBg =
        innerBgColor.toLowerCase().startsWith('#f') ||
        innerBgColor.toLowerCase() === '#ffffff' ||
        outerBgColor.toLowerCase().startsWith('#f') ||
        outerBgColor.toLowerCase() === '#ffffff';
      const textColor =
        activeTextEditor.color === '#FFFFFF' && isLightBg ? '#0F172A' : (activeTextEditor.color || '#10B981');

      if (activeTextEditor.id) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === activeTextEditor.id
              ? { ...it, text: txt, color: textColor }
              : it
          )
        );
        setSelectedItemId(activeTextEditor.id);
      } else {
        const newTextItem: CanvasItem = {
          id: `txt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          tool: 'TEXT',
          color: textColor,
          strokeWidth: Math.max(2, strokeWidth),
          x1: activeTextEditor.canvasX,
          y1: activeTextEditor.canvasY,
          text: txt,
        };
        setItems((prev) => [...prev, newTextItem]);
        setSelectedItemId(newTextItem.id);
      }
    } else if (activeTextEditor.id) {
      pushHistory();
      setItems((prev) => prev.filter((it) => it.id !== activeTextEditor.id));
      setSelectedItemId(null);
    }
    setActiveTextEditor(null);
  }, [activeTextEditor, innerBgColor, outerBgColor, strokeWidth, pushHistory]);

  const cancelActiveText = useCallback(() => {
    setActiveTextEditor(null);
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

  // Handle uploading of images (PNG, JPG, WEBP, SVG, GIF) and PDF files
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
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
      console.error('Failed to load image/PDF:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Tool Selection handler with direct tool switching (no separate popup boxes)
  const handleToolSelect = useCallback(
    (nextTool: Tool) => {
      if (activeTextEditor) commitActiveText();
      setTool(nextTool);
      if (nextTool !== 'SELECT') {
        setSelectedItemId(null);
      }
      if (nextTool !== 'ERASER') setIsErasing(false);
    },
    [activeTextEditor, commitActiveText]
  );

  // Standard Canvas Key Listeners (Escape, Undo/Redo, Delete, Arrow Nudges - all tool shortcut keys removed)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) &&
        target !== activeTextInputRef.current;

      if (isInput) return;

      // Escape key behavior
      if (e.key === 'Escape') {
        if (activeTextEditor) {
          cancelActiveText();
          return;
        }
        if (selectedItemId) {
          setSelectedItemId(null);
          return;
        }
        if (isFullscreen) {
          setIsFullscreen(false);
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
        if (selectedItemId && target !== activeTextInputRef.current) {
          e.preventDefault();
          handleDeleteSelected();
          return;
        }
      }

      // Arrow keys to nudge selected candle or object
      if (selectedItemId && target !== activeTextInputRef.current) {
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedItemId,
    isFullscreen,
    activeTextEditor,
    cancelActiveText,
    handleDeleteSelected,
    handleRedo,
    handleUndo,
    handleNudgeSelected,
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
        const fontSize = Math.max(16, (item.strokeWidth || 2) * 8 * dpr);
        const lineHeight = Math.max(20, (item.strokeWidth || 2) * 9 * dpr);
        const totalHeight = lines.length * lineHeight;
        const totalWidth = Math.max(48 * dpr, maxLen * (fontSize * 0.62));
        return {
          minX: item.x1,
          maxX: item.x1 + totalWidth,
          minY: item.y1,
          maxY: item.y1 + totalHeight,
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
      const fill = item.fillColor !== undefined ? item.fillColor : item.color + '25';

      if (fill && fill !== 'transparent') {
        ctx.fillStyle = fill;
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
      const fill = item.fillColor !== undefined ? item.fillColor : item.color + '25';

      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(2, rx), Math.max(2, ry), 0, 0, Math.PI * 2);
      if (fill && fill !== 'transparent') {
        ctx.fillStyle = fill;
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
      const isBull = item.candleType !== 'BEARISH';
      const defaultOutside = isBull ? '#10B981' : '#EF4444';
      const wickColor = item.color || defaultOutside;
      const bodyFill = item.fillColor !== undefined ? item.fillColor : defaultOutside;

      // Upper Wick (Outside Color)
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = Math.max(2 * dpr, item.strokeWidth * dpr);
      ctx.beginPath();
      ctx.moveTo(centerX, topY - upperWickHeight);
      ctx.lineTo(centerX, topY);
      ctx.stroke();

      // Lower Wick (Outside Color)
      ctx.beginPath();
      ctx.moveTo(centerX, botY);
      ctx.lineTo(centerX, botY + lowerWickHeight);
      ctx.stroke();

      // Candlestick Body Fill (Inside Color)
      if (bodyFill && bodyFill !== 'transparent') {
        ctx.fillStyle = bodyFill;
        ctx.fillRect(centerX - cWidth / 2, topY, cWidth, bodyHeight);
      }

      // Candlestick Body Border (Outside Color)
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = Math.max(1.5 * dpr, item.strokeWidth * dpr);
      ctx.strokeRect(centerX - cWidth / 2, topY, cWidth, bodyHeight);

      // Candlestick Direction Arrow Badge inside body
      if (bodyHeight >= 18 * dpr) {
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
      if (activeTextEditor && activeTextEditor.id === item.id) {
        // Handled by active inline DOM editor
      } else {
        ctx.save();
        ctx.fillStyle = item.color;
        const fontSize = Math.max(16, (item.strokeWidth || 2) * 8 * dpr);
        ctx.font = `bold ${fontSize}px 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textBaseline = 'top';
        const lines = item.text.split('\n');
        const lineHeight = Math.max(20, (item.strokeWidth || 2) * 9 * dpr);
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
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 28 * dpr;
      ctx.shadowOffsetY = 8 * dpr;
      ctx.fillRect(sheetX, sheetY, sheetW, sheetH);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(sheetX, sheetY, sheetW, sheetH);
      ctx.restore();
    }

    // 3. Grid or Dots
    if (gridMode !== 'NONE') {
      const step = 40;
      const gridBound = 5000;
      ctx.save();
      const isDark =
        innerBgColor.includes('#0') ||
        innerBgColor.includes('#1') ||
        innerBgColor.includes('#2');
      if (gridMode === 'GRID') {
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
        ctx.lineWidth = 1;
        for (let x = -gridBound; x <= gridBound; x += step) {
          ctx.beginPath();
          ctx.moveTo(x, -gridBound);
          ctx.lineTo(x, gridBound);
          ctx.stroke();
        }
        for (let y = -gridBound; y <= gridBound; y += step) {
          ctx.beginPath();
          ctx.moveTo(-gridBound, y);
          ctx.lineTo(gridBound, y);
          ctx.stroke();
        }
      } else if (gridMode === 'DOTS') {
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
        for (let x = -gridBound; x <= gridBound; x += step) {
          for (let y = -gridBound; y <= gridBound; y += step) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }

    // 4. Render All Drawn Items
    for (const it of items) {
      if (activeTextEditor && activeTextEditor.id === it.id) {
        continue;
      }
      const isSelected = it.id === selectedItemId;
      renderSingleItem(ctx, it, isSelected);
    }

    // 5. Render In-Progress Draft
    if (currentDraft) {
      renderSingleItem(ctx, currentDraft, false);
    }

    ctx.restore();
  }, [items, currentDraft, selectedItemId, gridMode, panOffset, zoom, outerBgColor, innerBgColor, activeTextEditor, strokeWidth]);

  useEffect(() => {
    redrawAll();
  }, [redrawAll, canvasSizeVersion]);

  // Pointer Down (Mouse / Touch)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle click or Pan tool or Space
    if (tool === 'PAN' || e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStartCoord({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const coords = getCanvasCoords(e);

    // 1. TEXT TOOL: Start typing directly on chart at clicked position
    if (tool === 'TEXT') {
      const hit = findItemAtCoord(coords.x, coords.y);
      if (hit && hit.tool === 'TEXT') {
        if (activeTextEditor) commitActiveText();
        setActiveTextEditor({
          id: hit.id,
          canvasX: hit.x1 ?? coords.x,
          canvasY: hit.y1 ?? coords.y,
          text: hit.text ?? '',
          color: hit.color,
        });
        setSelectedItemId(hit.id);
        return;
      }

      if (activeTextEditor) {
        commitActiveText();
      }
      const isLightBg =
        innerBgColor.toLowerCase().startsWith('#f') ||
        innerBgColor.toLowerCase() === '#ffffff' ||
        outerBgColor.toLowerCase().startsWith('#f') ||
        outerBgColor.toLowerCase() === '#ffffff';
      const initialColor =
        outsideColor === '#FFFFFF' && isLightBg ? '#0F172A' : (outsideColor || '#10B981');

      setActiveTextEditor({
        canvasX: coords.x,
        canvasY: coords.y,
        text: '',
        color: initialColor,
      });
      return;
    }

    // 2. ERASER TOOL: Click/drag to remove items
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

    // 3. MOVE TOOL: Check Resize Handle Interaction first
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

    // 4. MOVE TOOL: Select & Drag Object
    if (tool === 'SELECT') {
      const hit = findItemAtCoord(coords.x, coords.y);
      if (hit) {
        setSelectedItemId(hit.id);
        setIsDraggingSelected(true);
        setDragStartCoord({ x: coords.x, y: coords.y });
      } else {
        // Only deselect if clicked far away from selected item
        setSelectedItemId(null);
      }
      return;
    }

    // 5. CANDLE DRAWING (Bullish or Bearish - continuous drawing enabled!)
    if (tool === 'CANDLE_BULLISH' || tool === 'CANDLE_BEARISH' || tool === 'CANDLE') {
      setIsDrawing(true);
      pushHistory();

      const isBull = tool === 'CANDLE_BULLISH' || tool === 'CANDLE';
      const defOut = isBull ? '#10B981' : '#EF4444';
      const outC = outsideColor || defOut;
      const inC = isInsideTransparent ? 'transparent' : (insideColor || defOut);

      setCurrentDraft({
        id: `candle-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        tool,
        color: outC,
        fillColor: inC,
        strokeWidth,
        candleType: isBull ? 'BULLISH' : 'BEARISH',
        candleOpacity,
        candleWidth,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
      });
      return;
    }

    // 6. DRAWING TOOLS (Pencil, Rectangle, etc.)
    setIsDrawing(true);
    pushHistory();

    const baseDraft: CanvasItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      tool,
      color: outsideColor,
      fillColor: isInsideTransparent ? 'transparent' : insideColor,
      strokeWidth,
    };

    if (tool === 'PEN' || tool === 'HIGHLIGHTER' || tool === 'SMART_PENCIL') {
      setCurrentDraft({
        ...baseDraft,
        points: [{ x: coords.x, y: coords.y }],
      });
    } else if (tool === 'HORIZONTAL_LINE') {
      setCurrentDraft({
        ...baseDraft,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
      });
    } else if (tool === 'VERTICAL_LINE') {
      setCurrentDraft({
        ...baseDraft,
        x1: coords.x,
        y1: coords.y,
        x2: coords.x,
        y2: coords.y,
      });
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

    // Active Dragging of Selected Item
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

    // Update hovered resize handle for smart cursor change in Move tool
    if (tool === 'SELECT' && selectedItemId) {
      const selectedItem = items.find((it) => it.id === selectedItemId);
      if (selectedItem) {
        const handleHit = findHandleAtCoord(coords, selectedItem);
        setHoveredHandle(handleHit);
      }
    } else {
      setHoveredHandle(null);
    }

    // Normal drawing
    if (!isDrawing || !currentDraft) return;

    if (tool === 'PEN' || tool === 'HIGHLIGHTER' || tool === 'SMART_PENCIL') {
      setCurrentDraft((prev) =>
        prev
          ? {
              ...prev,
              points: [...(prev.points || []), { x: coords.x, y: coords.y }],
            }
          : null
      );
    } else if (tool === 'HORIZONTAL_LINE') {
      setCurrentDraft((prev) =>
        prev
          ? {
              ...prev,
              y1: coords.y,
              y2: coords.y,
            }
          : null
      );
    } else if (tool === 'VERTICAL_LINE') {
      setCurrentDraft((prev) =>
        prev
          ? {
              ...prev,
              x1: coords.x,
              x2: coords.x,
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

  // Pointer Up (Mouse / Touch)
  const handleMouseUp = () => {
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

    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentDraft) {
      // If candle was placed via single click (minimal drag distance), make it a full standard candlestick
      if (
        currentDraft.tool === 'CANDLE_BULLISH' ||
        currentDraft.tool === 'CANDLE_BEARISH' ||
        currentDraft.tool === 'CANDLE'
      ) {
        const dist = Math.hypot(
          (currentDraft.x2 || 0) - (currentDraft.x1 || 0),
          (currentDraft.y2 || 0) - (currentDraft.y1 || 0)
        );
        let finalCandle = currentDraft;
        if (dist < 8) {
          const startX = currentDraft.x1 || 100;
          const startY = currentDraft.y1 || 100;
          finalCandle = {
            ...currentDraft,
            x1: startX - candleWidth / 2,
            x2: startX + candleWidth / 2,
            y1: startY - 45,
            y2: startY + 45,
            candleWidth,
            candleOpacity,
          };
        }
        setItems((prev) => [...prev, finalCandle]);
        setSelectedItemId(finalCandle.id);
      } else if (currentDraft.tool === 'SMART_PENCIL' && currentDraft.points) {
        const smartItem = recognizeSmartShape(
          currentDraft.points,
          currentDraft.color,
          currentDraft.fillColor,
          currentDraft.strokeWidth
        );
        setItems((prev) => [...prev, smartItem]);
        setSelectedItemId(smartItem.id);
      } else if (currentDraft.tool === 'HORIZONTAL_LINE') {
        const hLine: CanvasItem = {
          ...currentDraft,
          x1: currentDraft.x1 ?? 80,
          y1: currentDraft.y1 ?? 100,
        };
        setItems((prev) => [...prev, hLine]);
        setSelectedItemId(hLine.id);
      } else if (currentDraft.tool === 'VERTICAL_LINE') {
        const vLine: CanvasItem = {
          ...currentDraft,
          x1: currentDraft.x1 ?? 100,
          y1: currentDraft.y1 ?? 80,
        };
        setItems((prev) => [...prev, vLine]);
        setSelectedItemId(vLine.id);
      } else {
        setItems((prev) => [...prev, currentDraft]);
        setSelectedItemId(currentDraft.id);
      }
      setCurrentDraft(null);
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
    if (tool === 'SELECT') return isDraggingSelected ? 'cursor-move' : 'cursor-default';
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
        {/* TOP FLOATING HEADER & TOOLBAR (STAYS PINNED AT TOP IN FULLSCREEN) */}
        {/* ============================================================== */}
        <div className="absolute top-2 left-2 right-2 z-50 flex items-center justify-between gap-2 pointer-events-none">
          {/* Top-Left: Menu & Show Tools Toggle */}
          <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
            <button
              type="button"
              onClick={() => setIsHamburgerOpen((prev) => !prev)}
              title="Workspace Menu (Clear, Export, Vault, Grid)"
              className="w-10 h-10 rounded-xl bg-white/95 text-slate-700 hover:bg-slate-50 border border-slate-200/90 shadow-md shadow-black/5 flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <Menu className="w-5 h-5 text-slate-700" />
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

          {/* Top-Center Floating Pill Toolbar (Exact 8 Tools: Pencil, Bullish Green, Bearish Green, Text, Rectangle, Mouse Cursor Arrow, Hand Tool, Eraser) */}
          {isToolbarVisible && (
            <div className="pointer-events-auto bg-white/95 text-slate-700 border border-slate-200/90 shadow-md shadow-black/5 rounded-2xl p-1 flex items-center gap-0.5 backdrop-blur-md shrink-0">
              {/* 1. Pencil */}
              <button
                type="button"
                onClick={() => handleToolSelect('PEN')}
                title="Pencil - Write and draw freely on chart"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  tool === 'PEN'
                    ? 'bg-[#ECE8FF] text-[#5B3FE4] shadow-xs font-bold ring-1.5 ring-indigo-400'
                    : 'hover:bg-slate-100 text-slate-700 font-semibold'
                }`}
              >
                <Pen className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-bold">Pencil</span>
              </button>

              {/* 2. Bullish Green */}
              <button
                type="button"
                onClick={() => {
                  setOutsideColor('#10B981');
                  setInsideColor('#10B981');
                  handleToolSelect('CANDLE_BULLISH');
                }}
                title="Bullish Green - Click & drag green candlesticks on chart"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 font-bold text-xs shrink-0 ${
                  tool === 'CANDLE_BULLISH'
                    ? 'bg-emerald-600 text-white shadow-xs ring-1.5 ring-emerald-400'
                    : 'hover:bg-emerald-50 text-emerald-800 bg-emerald-50/70 border border-emerald-300'
                }`}
              >
                <CandlestickChart className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                <span className="text-[11px]">Bullish</span>
              </button>

              {/* 3. Bearish Green / Bearish Red */}
              <button
                type="button"
                onClick={() => {
                  setOutsideColor('#EF4444');
                  setInsideColor('#EF4444');
                  handleToolSelect('CANDLE_BEARISH');
                }}
                title="Bearish - Click & drag bearish candlesticks on chart"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 font-bold text-xs shrink-0 ${
                  tool === 'CANDLE_BEARISH'
                    ? 'bg-rose-600 text-white shadow-xs ring-1.5 ring-rose-400'
                    : 'hover:bg-rose-50 text-rose-800 bg-rose-50/70 border border-rose-300'
                }`}
              >
                <CandlestickChart className="w-3.5 h-3.5 text-rose-600 fill-rose-600 rotate-180" />
                <span className="text-[11px]">Bearish</span>
              </button>

              {/* 4. Text */}
              <button
                type="button"
                onClick={() => handleToolSelect('TEXT')}
                title="Text - Click anywhere to type directly on chart"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  tool === 'TEXT'
                    ? 'bg-[#ECE8FF] text-[#5B3FE4] shadow-xs font-bold ring-1.5 ring-indigo-400'
                    : 'hover:bg-slate-100 text-slate-700 font-semibold'
                }`}
              >
                <Type className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-bold">Text</span>
              </button>

              {/* 5. Rectangle */}
              <button
                type="button"
                onClick={() => handleToolSelect('RECTANGLE')}
                title="Rectangle / Supply-Demand Zone"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  tool === 'RECTANGLE'
                    ? 'bg-[#ECE8FF] text-[#5B3FE4] shadow-xs font-bold ring-1.5 ring-indigo-400'
                    : 'hover:bg-slate-100 text-slate-700 font-semibold'
                }`}
              >
                <Square className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-bold">Rectangle</span>
              </button>

              {/* 6. Mouse Cursor (Arrow) */}
              <button
                type="button"
                onClick={() => handleToolSelect('SELECT')}
                title="Mouse Cursor Arrow - Select, move, and resize items"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  tool === 'SELECT'
                    ? 'bg-[#ECE8FF] text-[#5B3FE4] shadow-xs font-bold ring-1.5 ring-indigo-400'
                    : 'hover:bg-slate-100 text-slate-700 font-semibold'
                }`}
              >
                <MousePointer className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-bold">Select</span>
              </button>

              {/* 7. Hand Tool */}
              <button
                type="button"
                onClick={() => handleToolSelect('PAN')}
                title="Hand Tool - Pan canvas"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  tool === 'PAN'
                    ? 'bg-[#ECE8FF] text-[#5B3FE4] shadow-xs font-bold ring-1.5 ring-indigo-400'
                    : 'hover:bg-slate-100 text-slate-700 font-semibold'
                }`}
              >
                <Hand className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] font-bold">Hand</span>
              </button>

              {/* 8. Eraser */}
              <button
                type="button"
                onClick={() => handleToolSelect('ERASER')}
                title="Eraser - Click or drag to erase"
                className={`px-2 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0 ${
                  tool === 'ERASER'
                    ? 'bg-rose-100 text-rose-700 shadow-xs font-bold ring-1.5 ring-rose-400'
                    : 'hover:bg-slate-100 text-slate-700 font-semibold'
                }`}
              >
                <Eraser className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-[11px] font-bold">Eraser</span>
              </button>

              <div className="w-[1px] h-4 bg-slate-200 mx-0.5 shrink-0" />

              {/* Quick Out/In Color Indicator */}
              <div
                onClick={() => setIsLeftPanelOpen(true)}
                title="Click to adjust Colors in Studio Panel"
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 shrink-0"
              >
                <span
                  className="w-3 h-3 rounded-full border border-slate-400 shadow-xs"
                  style={{ backgroundColor: outsideColor }}
                  title={`Outside: ${outsideColor}`}
                />
                <span
                  className="w-3 h-3 rounded-full border border-slate-400 shadow-xs"
                  style={{
                    backgroundColor: isInsideTransparent ? 'transparent' : insideColor,
                    backgroundImage: isInsideTransparent
                      ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                      : undefined,
                    backgroundSize: '4px 4px',
                  }}
                  title={`Inside: ${isInsideTransparent ? 'Transparent' : insideColor}`}
                />
              </div>
            </div>
          )}

          {/* Top-Right: Show/Hide Tools Toggle, Export, Studio Panel, Fullscreen Toggle */}
          <div className="pointer-events-auto flex items-center gap-2 shrink-0">
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

            {/* Quick Export / Download Button */}
            <button
              type="button"
              onClick={handleExportPNG}
              title="Download Canvas (PNG Image)"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>

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

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
              className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer backdrop-blur-md ${
                isFullscreen
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-white/95 text-slate-800 border border-slate-200/90 hover:bg-slate-50'
              }`}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-rose-600" />
                  <span className="hidden sm:inline">Exit</span>
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
                  <span>Bullish (Green)</span>
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
                  <CandlestickChart className="w-3.5 h-3.5 text-rose-600 fill-rose-600 rotate-180" />
                  <span>Bearish (Red)</span>
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
                          setActiveTextEditor({
                            id: selectedItem.id,
                            canvasX: selectedItem.x1 ?? 0,
                            canvasY: selectedItem.y1 ?? 0,
                            text: selectedItem.text ?? '',
                            color: selectedItem.color,
                          });
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
        {/* INVISIBLE CAPTURE INPUT FOR CANVAS DIRECT TYPING (ZERO VISUAL BOX) */}
        {/* ============================================================== */}
        <input
          ref={hiddenTextInputRef}
          type="text"
          value={directTyping?.text || ''}
          onChange={(e) => {
            const val = e.target.value;
            setDirectTyping((prev) => (prev ? { ...prev, text: val } : null));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCommitDirectText();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setDirectTyping(null);
            }
          }}
          onBlur={() => {
            if (directTyping?.text.trim()) {
              handleCommitDirectText();
            } else {
              setDirectTyping(null);
            }
          }}
          style={{
            position: 'fixed',
            left: '-9999px',
            top: '-9999px',
            opacity: 0,
            width: '1px',
            height: '1px',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
          tabIndex={-1}
        />

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
            if (hit && hit.tool === 'TEXT' && hit.text) {
              setDirectTyping({
                x: hit.x1 || coords.x,
                y: hit.y1 || coords.y,
                text: hit.text,
                color: hit.color,
                existingId: hit.id,
              });
              setItems((prev) => prev.filter((it) => it.id !== hit.id));
              setTimeout(() => hiddenTextInputRef.current?.focus(), 20);
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
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

        {/* Bottom-Right: Help & Object Count */}
        <div className="absolute bottom-4 right-4 z-40 flex items-center gap-2 pointer-events-auto">
          <div className="bg-white/95 text-slate-600 border border-slate-200/90 shadow-lg shadow-black/5 rounded-2xl px-3 py-1.5 text-[11px] font-mono backdrop-blur-md hidden sm:flex items-center gap-1.5">
            <span>Objects:</span>
            <strong className="text-indigo-600">{items.length}</strong>
            {autoSavedNotice && (
              <span className="text-emerald-600 font-bold ml-1.5">✓ Saved</span>
            )}
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

        {/* Hidden Image & PDF Upload Input */}
        <input
          type="file"
          ref={imageUploadInputRef}
          onChange={handleImageUpload}
          accept="image/*,application/pdf,.pdf"
          className="hidden"
        />
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
            <span>Pencil (Write)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOutsideColor('#10B981');
              setInsideColor('#10B981');
              handleToolSelect('CANDLE_BULLISH');
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              tool === 'CANDLE_BULLISH'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/50'
            }`}
          >
            <CandlestickChart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>Bullish (Green)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOutsideColor('#EF4444');
              setInsideColor('#EF4444');
              handleToolSelect('CANDLE_BEARISH');
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              tool === 'CANDLE_BEARISH'
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/80 hover:bg-rose-900/50'
            }`}
          >
            <CandlestickChart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 rotate-180" />
            <span>Bearish (Red)</span>
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
            <span>Text (T)</span>
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
