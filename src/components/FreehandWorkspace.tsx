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
  const isClosed = distEndpoints < 55 || distEndpoints / (totalPerimeter || 1) < 0.28;
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
        fillColor: fillColor && fillColor !== 'transparent' ? fillColor : color + '25',
        strokeWidth,
        x1: minX,
        y1: minY,
        x2: maxX,
        y2: maxY,
      };
    }

    // Snap to crisp Rectangle (Order Block / Supply-Demand Zone)
    return {
      id: `rect-${Date.now()}`,
      tool: 'RECTANGLE',
      color,
      fillColor: fillColor && fillColor !== 'transparent' ? fillColor : color + '25',
      strokeWidth,
      x1: minX,
      y1: minY,
      x2: maxX,
      y2: maxY,
    };
  }

  // Default: clean smooth freehand polyline
  return {
    id: `smart-${Date.now()}`,
    tool: 'PEN',
    color,
    fillColor,
    strokeWidth,
    points,
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
  const textInputRef = useRef<HTMLInputElement | null>(null);

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
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
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

  // Direct Interactive Text Typing State
  const [leftPanelText, setLeftPanelText] = useState<string>('');
  const [activeTextInput, setActiveTextInput] = useState<{
    canvasX: number;
    canvasY: number;
    screenX: number;
    screenY: number;
    text: string;
    existingId?: string;
  } | null>(null);

  // Auto-focus textarea when active text input opens
  useEffect(() => {
    if (activeTextInput && textInputRef.current) {
      textInputRef.current.focus();
      textInputRef.current.select();
    }
  }, [activeTextInput]);

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

  // Commit direct interactive text typing
  const handleCommitText = useCallback(() => {
    if (!activeTextInput) return;
    const txt = activeTextInput.text.trim();
    if (txt) {
      pushHistory();
      const isLightBg =
        innerBgColor.toLowerCase().startsWith('#f') ||
        innerBgColor.toLowerCase() === '#ffffff' ||
        outerBgColor.toLowerCase().startsWith('#f') ||
        outerBgColor.toLowerCase() === '#ffffff';
      const textColor = outsideColor === '#FFFFFF' && isLightBg ? '#0F172A' : outsideColor;

      const newTextItem: CanvasItem = {
        id: activeTextInput.existingId || `txt-${Date.now()}`,
        tool: 'TEXT',
        color: textColor,
        strokeWidth: Math.max(2, strokeWidth),
        x1: activeTextInput.canvasX,
        y1: activeTextInput.canvasY,
        text: txt,
      };

      if (activeTextInput.existingId) {
        setItems((prev) =>
          prev.map((it) => (it.id === activeTextInput.existingId ? newTextItem : it))
        );
      } else {
        setItems((prev) => [...prev, newTextItem]);
      }
      setSelectedItemId(newTextItem.id);
    }
    setActiveTextInput(null);
  }, [activeTextInput, innerBgColor, outerBgColor, outsideColor, strokeWidth, pushHistory]);

  // Place text on canvas directly from Left Studio Panel
  const handlePlaceTextFromPanel = useCallback(() => {
    const txt = leftPanelText.trim();
    if (!txt) return;
    pushHistory();
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const centerX = canvas ? (canvas.width / dpr / 2 - panOffset.x) / zoom : 200;
    const centerY = canvas ? (canvas.height / dpr / 2 - panOffset.y) / zoom : 200;

    const isLightBg =
      innerBgColor.toLowerCase().startsWith('#f') ||
      innerBgColor.toLowerCase() === '#ffffff' ||
      outerBgColor.toLowerCase().startsWith('#f') ||
      outerBgColor.toLowerCase() === '#ffffff';
    const textColor = outsideColor === '#FFFFFF' && isLightBg ? '#0F172A' : outsideColor;

    const newTextItem: CanvasItem = {
      id: `txt-${Date.now()}`,
      tool: 'TEXT',
      color: textColor,
      strokeWidth: Math.max(2, strokeWidth),
      x1: centerX,
      y1: centerY,
      text: txt,
    };
    setItems((prev) => [...prev, newTextItem]);
    setSelectedItemId(newTextItem.id);
    setLeftPanelText('');
  }, [leftPanelText, innerBgColor, outerBgColor, outsideColor, strokeWidth, panOffset, zoom, pushHistory]);

  // Tool Selection handler with auto-activating text input
  const handleToolSelect = useCallback(
    (nextTool: Tool) => {
      if (activeTextInput?.text.trim()) handleCommitText();
      setTool(nextTool);
      if (nextTool !== 'SELECT') {
        setSelectedItemId(null);
      }
      if (nextTool !== 'ERASER') setIsErasing(false);

      // If TEXT tool selected, immediately open text box in viewport center ready to type!
      if (nextTool === 'TEXT') {
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        const canvasW = canvas ? canvas.width / dpr : window.innerWidth;
        const canvasH = canvas ? canvas.height / dpr : window.innerHeight;
        const screenX = Math.round(canvasW / 2 - 140);
        const screenY = Math.round(canvasH / 2 - 60);
        const canvasX = (screenX * dpr - panOffset.x * dpr) / zoom;
        const canvasY = (screenY * dpr - panOffset.y * dpr) / zoom;
        setActiveTextInput({
          canvasX,
          canvasY,
          screenX,
          screenY,
          text: '',
        });
        setIsLeftPanelOpen(true);
      }
    },
    [activeTextInput, handleCommitText, panOffset, zoom]
  );

  // Keyboard Shortcuts (F1, F2, B, N, P, R, E, H, Space, V, M, T, F, Esc, Undo, Redo, Del, Nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (isInput) return;

      // Escape key behavior
      if (e.key === 'Escape') {
        if (activeTextInput) {
          setActiveTextInput(null);
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

      // Quick Tool Keys: F1 / B (Bullish), F2 / N (Bearish), P (Pencil), R (Rect), E (Eraser), H/Space (Hand), V/M (Move), T (Text), F (Fullscreen)
      const key = e.key;
      const keyLower = key.toLowerCase();

      if (key === 'F1' || keyLower === 'b') {
        e.preventDefault();
        setOutsideColor('#10B981');
        setInsideColor('#10B981');
        handleToolSelect('CANDLE_BULLISH');
        return;
      }

      if (key === 'F2' || keyLower === 'n') {
        e.preventDefault();
        setOutsideColor('#EF4444');
        setInsideColor('#EF4444');
        handleToolSelect('CANDLE_BEARISH');
        return;
      }

      if (keyLower === 'p' || key === '7') {
        e.preventDefault();
        handleToolSelect('PEN');
        return;
      }

      if (keyLower === 'r' || key === '4') {
        e.preventDefault();
        handleToolSelect('RECTANGLE');
        return;
      }

      if (keyLower === 'e' || key === '0') {
        e.preventDefault();
        handleToolSelect('ERASER');
        return;
      }

      if (keyLower === 'h' || e.code === 'Space') {
        e.preventDefault();
        handleToolSelect('PAN');
        return;
      }

      if (keyLower === 'v' || keyLower === 'm' || key === '1') {
        e.preventDefault();
        handleToolSelect('SELECT');
        return;
      }

      if (keyLower === 't' || key === '8') {
        e.preventDefault();
        handleToolSelect('TEXT');
        return;
      }

      if (keyLower === 'f') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedItemId,
    isFullscreen,
    activeTextInput,
    handleDeleteSelected,
    handleRedo,
    handleUndo,
    handleNudgeSelected,
    handleToolSelect,
    toggleFullscreen,
  ]);

  // Lock body scroll in fullscreen so entire application never shifts!
  useEffect(() => {
    if (isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
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
        const approxWidth = item.text.length * 10 * dpr;
        const approxHeight = 24 * dpr;
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

    // 2. RECTANGLE / ZONE (Outside border & Inside fill)
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
      ctx.fillStyle = item.color;
      ctx.font = `bold ${Math.max(16, item.strokeWidth * 8 * dpr)}px 'Inter', sans-serif`;
      const lines = item.text.split('\n');
      const lineHeight = Math.max(20, item.strokeWidth * 9 * dpr);
      lines.forEach((line, idx) => {
        ctx.fillText(line, item.x1!, item.y1! + idx * lineHeight);
      });
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
      const isSelected = it.id === selectedItemId;
      renderSingleItem(ctx, it, isSelected);
    }

    // 5. Render In-Progress Draft
    if (currentDraft) {
      renderSingleItem(ctx, currentDraft, false);
    }

    ctx.restore();
  }, [items, currentDraft, selectedItemId, gridMode, panOffset, zoom, outerBgColor, innerBgColor]);

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

    // 1. TEXT TOOL: Open interactive textarea at clicked position
    if (tool === 'TEXT') {
      if (activeTextInput && activeTextInput.text.trim()) {
        handleCommitText();
      }
      setActiveTextInput({
        canvasX: coords.x,
        canvasY: coords.y,
        screenX: coords.screenX,
        screenY: coords.screenY,
        text: '',
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

    if (tool === 'PEN' || tool === 'HIGHLIGHTER') {
      setCurrentDraft({
        ...baseDraft,
        points: [{ x: coords.x, y: coords.y }],
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

          // RECTANGLE Resizing
          if (
            it.tool === 'RECTANGLE' &&
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
        // CRITICAL: DO NOT switch to 'SELECT'! Keep candle tool active for continuous drawing!
      } else {
        setItems((prev) => [...prev, currentDraft]);
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
        className={`relative w-full h-full overflow-hidden select-none font-sans ${
          isFullscreen
            ? 'fixed inset-0 z-[999999] w-screen h-screen m-0 p-0 bg-slate-900'
            : 'h-[80vh] min-h-[580px] rounded-2xl border border-slate-800 bg-[#080C15]'
        }`}
      >
        {/* ============================================================== */}
        {/* TOP FLOATING TOOLBAR                                           */}
        {/* ============================================================== */}
        <div className="absolute top-3 left-0 right-0 z-40 flex items-center justify-between px-4 pointer-events-none">
          {/* Top-Left: Hamburger Action Menu */}
          <div className="relative pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsHamburgerOpen((prev) => !prev)}
              title="Workspace Menu (Clear, Export, Vault, Grid)"
              className="w-10 h-10 rounded-xl bg-white/95 text-slate-700 hover:bg-slate-50 border border-slate-200/90 shadow-md shadow-black/5 flex items-center justify-center transition active:scale-95 cursor-pointer backdrop-blur-md"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>

            {/* Hamburger Dropdown Menu */}
            {isHamburgerOpen && (
              <div className="absolute top-12 left-0 w-64 bg-white/98 text-slate-800 border border-slate-200 rounded-2xl shadow-2xl p-2.5 z-50 space-y-1.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 text-xs">
                <div className="px-3 py-1.5 font-bold text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100">
                  Workspace Actions
                </div>
                <button
                  onClick={() => {
                    handleInsertCandle('BULLISH');
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-emerald-50 text-emerald-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <CandlestickChart className="w-4 h-4 text-emerald-600" />
                  <span>Insert Bullish Candle</span>
                </button>
                <button
                  onClick={() => {
                    handleInsertCandle('BEARISH');
                    setIsHamburgerOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left rounded-xl hover:bg-rose-50 text-rose-700 font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <CandlestickChart className="w-4 h-4 text-rose-600" />
                  <span>Insert Bearish Candle</span>
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

          {/* Top-Center Floating Pill Toolbar */}
          <div className="pointer-events-auto bg-white/95 text-slate-700 border border-slate-200/90 shadow-lg shadow-black/5 rounded-2xl p-1.5 flex items-center gap-1 backdrop-blur-md">
            {/* Lock Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsLocked((prev) => !prev)}
              title={isLocked ? 'Unlock Canvas' : 'Lock Canvas (Prevent Edits)'}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isLocked
                  ? 'bg-amber-100 text-amber-700 font-bold'
                  : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>

            {/* Pan / Hand Tool */}
            <button
              type="button"
              onClick={() => handleToolSelect('PAN')}
              title="Hand Tool (Pan Canvas) [H / Space]"
              className={`p-2 rounded-xl transition cursor-pointer relative group ${
                tool === 'PAN'
                  ? 'bg-[#ECE8FF] text-[#5B3FE4] shadow-sm font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Hand className="w-4 h-4" />
              <span className="sr-only">Hand [H]</span>
            </button>

            <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

            {/* 1. MOVE TOOL (Select, Move, and drag handles to Resize!) */}
            <button
              type="button"
              onClick={() => handleToolSelect('SELECT')}
              title="Move & Resize Tool [V / M]"
              className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                tool === 'SELECT'
                  ? 'bg-[#ECE8FF] text-[#5B3FE4] shadow-sm font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <MousePointer className="w-4 h-4" />
              <span className="text-[11px] font-bold">Move</span>
              <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-slate-200/70 text-slate-600 font-mono font-bold">V</kbd>
            </button>

            {/* 2. RECTANGLE TOOL */}
            <button
              type="button"
              onClick={() => handleToolSelect('RECTANGLE')}
              title="Rectangle Tool [R]"
              className={`p-2 rounded-xl transition cursor-pointer relative ${
                tool === 'RECTANGLE'
                  ? 'bg-[#ECE8FF] text-[#5B3FE4] shadow-sm font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Square className="w-4 h-4" />
              <span className="sr-only">Rectangle [R]</span>
            </button>

            {/* 3. PENCIL / FREEHAND TOOL */}
            <button
              type="button"
              onClick={() => handleToolSelect('PEN')}
              title="Pencil Tool [P]"
              className={`p-2 rounded-xl transition cursor-pointer relative ${
                tool === 'PEN'
                  ? 'bg-[#ECE8FF] text-[#5B3FE4] shadow-sm font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Pen className="w-4 h-4" />
              <span className="sr-only">Pencil [P]</span>
            </button>

            {/* 4. TEXT / TYPING TOOL */}
            <button
              type="button"
              onClick={() => handleToolSelect('TEXT')}
              title="Text Tool [T] - Click to type"
              className={`p-2 rounded-xl transition cursor-pointer relative ${
                tool === 'TEXT'
                  ? 'bg-[#ECE8FF] text-[#5B3FE4] shadow-sm font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Type className="w-4 h-4" />
              <span className="sr-only">Text [T]</span>
            </button>

            {/* 5. ERASER TOOL */}
            <button
              type="button"
              onClick={() => handleToolSelect('ERASER')}
              title="Eraser Tool [E]"
              className={`p-2 rounded-xl transition cursor-pointer relative ${
                tool === 'ERASER'
                  ? 'bg-[#ECE8FF] text-[#5B3FE4] shadow-sm font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <Eraser className="w-4 h-4" />
              <span className="sr-only">Eraser [E]</span>
            </button>

            <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

            {/* 6. DISTINCT BULLISH CANDLE TOOL (Continuous drawing enabled) */}
            <button
              type="button"
              onClick={() => {
                setOutsideColor('#10B981');
                setInsideColor('#10B981');
                handleToolSelect('CANDLE_BULLISH');
              }}
              title="Bullish Candle [F1 or B] - Continuous drawing enabled"
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-bold text-xs ${
                tool === 'CANDLE_BULLISH'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                  : 'hover:bg-emerald-50 text-emerald-700 bg-white border border-emerald-200'
              }`}
            >
              <CandlestickChart className="w-4 h-4 text-emerald-500 fill-emerald-500" />
              <span>Bullish</span>
              <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-emerald-700/30 text-white font-mono font-bold">F1</kbd>
            </button>

            {/* 7. DISTINCT BEARISH CANDLE TOOL (Continuous drawing enabled) */}
            <button
              type="button"
              onClick={() => {
                setOutsideColor('#EF4444');
                setInsideColor('#EF4444');
                handleToolSelect('CANDLE_BEARISH');
              }}
              title="Bearish Candle [F2 or N] - Continuous drawing enabled"
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-bold text-xs ${
                tool === 'CANDLE_BEARISH'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400'
                  : 'hover:bg-rose-50 text-rose-700 bg-white border border-rose-200'
              }`}
            >
              <CandlestickChart className="w-4 h-4 text-rose-500 fill-rose-500 rotate-180" />
              <span>Bearish</span>
              <kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-rose-700/30 text-white font-mono font-bold">F2</kbd>
            </button>

            <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />

            {/* QUICK COLOR INDICATORS IN TOOLBAR */}
            <div
              onClick={() => setIsLeftPanelOpen(true)}
              title="Click to adjust Inside & Outside Colors in the Studio Panel"
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100"
            >
              <div className="flex flex-col items-center">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Out</span>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-400 shadow-xs"
                  style={{ backgroundColor: outsideColor }}
                />
              </div>
              <div className="flex flex-col items-center ml-1">
                <span className="text-[8px] font-bold text-slate-400 uppercase">In</span>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-400 shadow-xs"
                  style={{
                    backgroundColor: isInsideTransparent ? 'transparent' : insideColor,
                    backgroundImage: isInsideTransparent
                      ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)'
                      : undefined,
                    backgroundSize: '4px 4px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Top-Right: Export / Share & Fullscreen Toggle */}
          <div className="pointer-events-auto flex items-center gap-2">
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
              title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Enter Full Screen'}
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
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    tool === 'CANDLE_BULLISH'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <span>▲ Draw Bullish</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOutsideColor('#EF4444');
                    setInsideColor('#EF4444');
                    handleToolSelect('CANDLE_BEARISH');
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                    tool === 'CANDLE_BEARISH'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/30 ring-2 ring-rose-400'
                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <span>▼ Draw Bearish</span>
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

            {/* 4. TEXT ANNOTATION STUDIO CARD */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                <span className="flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-indigo-600" />
                  Text / Typing Tool
                </span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-mono font-bold px-1.5 py-0.5 rounded">
                  Shortcut: T
                </span>
              </div>
              <textarea
                value={leftPanelText}
                onChange={(e) => setLeftPanelText(e.target.value)}
                placeholder="Type technical notes, entry/stop levels..."
                rows={2}
                className="w-full p-2 bg-white border border-indigo-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 resize-none font-medium"
              />
              <button
                type="button"
                onClick={handlePlaceTextFromPanel}
                disabled={!leftPanelText.trim()}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>+ Place Text on Canvas</span>
              </button>
              <p className="text-[10px] text-slate-500">
                Tip: You can also click anywhere directly on the canvas with the Text tool to type!
              </p>
            </div>

            {/* 5. SELECTED OBJECT STUDIO (MOVE & RESIZE WITHIN MOVE TOOL) */}
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
        {/* INTERACTIVE TEXTAREA OVERLAY FOR RELIABLE TEXT TYPING          */}
        {/* ============================================================== */}
        {activeTextInput && (
          <div
            className="absolute z-50 pointer-events-auto"
            style={{
              left: `${Math.max(10, Math.min(window.innerWidth - 330, activeTextInput.screenX))}px`,
              top: `${Math.max(60, Math.min(window.innerHeight - 160, activeTextInput.screenY))}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="bg-white border-2 border-indigo-600 rounded-2xl shadow-2xl p-3 w-80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-indigo-600" />
                  Text Annotation
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTextInput(null)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <textarea
                ref={textInputRef}
                autoFocus
                value={activeTextInput.text}
                onChange={(e) =>
                  setActiveTextInput((prev) => (prev ? { ...prev, text: e.target.value } : null))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCommitText();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setActiveTextInput(null);
                  }
                }}
                placeholder="Type your text annotation here..."
                rows={2}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white resize-none"
                style={{
                  color: outsideColor === '#FFFFFF' ? '#0F172A' : outsideColor,
                }}
              />

              <div className="flex items-center justify-between text-[10px] pt-1">
                <span className="text-slate-400">Press <strong>Enter</strong> to save</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTextInput(null)}
                    className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitText}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
              setActiveTextInput({
                canvasX: hit.x1 || coords.x,
                canvasY: hit.y1 || coords.y,
                screenX: coords.screenX,
                screenY: coords.screenY,
                text: hit.text,
                existingId: hit.id,
              });
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
