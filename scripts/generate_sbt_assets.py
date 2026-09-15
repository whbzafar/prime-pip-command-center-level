#!/usr/bin/env python3
"""
Generates high-resolution source asset PNG files for all 10 SBT Models and their variations.
Matches the requested directory structure in public/SBT/
"""
import os, struct, zlib

FONT_5X7 = {
    'A': [0x0C, 0x12, 0x12, 0x1E, 0x12, 0x12, 0x12],
    'B': [0x1C, 0x12, 0x12, 0x1C, 0x12, 0x12, 0x1C],
    'C': [0x0E, 0x10, 0x10, 0x10, 0x10, 0x10, 0x0E],
    'D': [0x1C, 0x12, 0x12, 0x12, 0x12, 0x12, 0x1C],
    'E': [0x1E, 0x10, 0x10, 0x1C, 0x10, 0x10, 0x1E],
    'F': [0x1E, 0x10, 0x10, 0x1C, 0x10, 0x10, 0x10],
    'G': [0x0E, 0x10, 0x10, 0x16, 0x12, 0x12, 0x0E],
    'H': [0x12, 0x12, 0x12, 0x1E, 0x12, 0x12, 0x12],
    'I': [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
    'J': [0x06, 0x02, 0x02, 0x02, 0x12, 0x12, 0x0C],
    'K': [0x12, 0x14, 0x18, 0x10, 0x18, 0x14, 0x12],
    'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1E],
    'M': [0x11, 0x1B, 0x15, 0x11, 0x11, 0x11, 0x11],
    'N': [0x12, 0x16, 0x1A, 0x12, 0x12, 0x12, 0x12],
    'O': [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    'P': [0x1C, 0x12, 0x12, 0x1C, 0x10, 0x10, 0x10],
    'Q': [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D],
    'R': [0x1C, 0x12, 0x12, 0x1C, 0x14, 0x12, 0x11],
    'S': [0x0E, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E],
    'T': [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
    'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    'V': [0x11, 0x11, 0x11, 0x11, 0x0A, 0x0A, 0x04],
    'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
    'X': [0x11, 0x0A, 0x04, 0x04, 0x0A, 0x11, 0x11],
    'Y': [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
    'Z': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
    '0': [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
    '1': [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    '2': [0x0E, 0x11, 0x01, 0x06, 0x18, 0x10, 0x1F],
    '3': [0x1E, 0x01, 0x01, 0x0E, 0x01, 0x01, 0x1E],
    '4': [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
    '5': [0x1F, 0x10, 0x10, 0x1E, 0x01, 0x01, 0x1E],
    '6': [0x0E, 0x10, 0x10, 0x1E, 0x11, 0x11, 0x0E],
    '7': [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    '8': [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
    '9': [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x01, 0x0E],
    '-': [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00],
    ':': [0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00],
    '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
    ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
    '/': [0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00],
    '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x04],
    ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    '%': [0x12, 0x15, 0x02, 0x04, 0x08, 0x15, 0x09],
}

TEAL = (0, 163, 137, 255)
RED = (220, 38, 38, 255)
BLUE = (37, 99, 235, 255)
GOLD = (245, 158, 11, 255)
WHITE = (241, 245, 249, 255)
GRAY = (148, 163, 184, 255)
DARK_GRAY = (51, 65, 85, 255)
ZONE_FILL = (71, 85, 105, 120)
BG_COLOR = (15, 23, 42, 255)

def set_pixel(buf, w, h, x, y, color):
    if 0 <= x < w and 0 <= y < h:
        idx = (y * w + x) * 4
        a = color[3] / 255.0
        if a >= 1.0:
            buf[idx] = color[0]
            buf[idx+1] = color[1]
            buf[idx+2] = color[2]
            buf[idx+3] = 255
        else:
            buf[idx] = int(color[0] * a + buf[idx] * (1 - a))
            buf[idx+1] = int(color[1] * a + buf[idx+1] * (1 - a))
            buf[idx+2] = int(color[2] * a + buf[idx+2] * (1 - a))
            buf[idx+3] = 255

def draw_rect(buf, w, h, x, y, rw, rh, color, fill=True):
    for cy in range(y, y + rh):
        for cx in range(x, x + rw):
            if fill or (cy == y or cy == y + rh - 1 or cx == x or cx == x + rw - 1):
                set_pixel(buf, w, h, cx, cy, color)

def draw_line(buf, w, h, x1, y1, x2, y2, color, width=1):
    dx = abs(x2 - x1)
    dy = abs(y2 - y1)
    sx = 1 if x1 < x2 else -1
    sy = 1 if y1 < y2 else -1
    err = dx - dy
    cx, cy = x1, y1
    while True:
        for ox in range(-width // 2, width // 2 + 1):
            for oy in range(-width // 2, width // 2 + 1):
                set_pixel(buf, w, h, cx + ox, cy + oy, color)
        if cx == x2 and cy == y2:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            cx += sx
        if e2 < dx:
            err += dx
            cy += sy

def draw_text(buf, w, h, x, y, text, color=WHITE, scale=2):
    cx = x
    for ch in text.upper():
        bitmap = FONT_5X7.get(ch, FONT_5X7[' '])
        for row_idx, row in enumerate(bitmap):
            for col_idx in range(5):
                if (row >> (4 - col_idx)) & 1:
                    for sx in range(scale):
                        for sy in range(scale):
                            set_pixel(buf, w, h, cx + col_idx * scale + sx, y + row_idx * scale + sy, color)
        cx += (5 + 1) * scale

def draw_candle(buf, w, h, cx, open_y, close_y, high_y, low_y, is_bullish, width=14):
    color = TEAL if is_bullish else RED
    # Draw wick
    draw_line(buf, w, h, cx, high_y, cx, low_y, color, width=2)
    # Draw body
    top = min(open_y, close_y)
    body_h = max(abs(open_y - close_y), 3)
    draw_rect(buf, w, h, cx - width // 2, top, width, body_h, color, fill=True)

def draw_arrow(buf, w, h, from_x, from_y, to_x, to_y, color=BLUE, label="BUY"):
    draw_line(buf, w, h, from_x, from_y, to_x, to_y, color, width=3)
    # arrow head
    dx = to_x - from_x
    dy = to_y - from_y
    import math
    angle = math.atan2(dy, dx)
    head_len = 12
    a1 = angle + math.pi * 0.8
    a2 = angle - math.pi * 0.8
    p1x = int(to_x + head_len * math.cos(a1))
    p1y = int(to_y + head_len * math.sin(a1))
    p2x = int(to_x + head_len * math.cos(a2))
    p2y = int(to_y + head_len * math.sin(a2))
    draw_line(buf, w, h, to_x, to_y, p1x, p1y, color, width=2)
    draw_line(buf, w, h, to_x, to_y, p2x, p2y, color, width=2)
    if label:
        draw_text(buf, w, h, from_x - 10, from_y + 6, label, color=color, scale=2)

def save_png(filename, buf, w, h):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        start = y * w * 4
        raw.extend(buf[start:start + w * 4])
    def chunk(tag, data):
        c = tag + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)
    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', zlib.compress(bytes(raw), 6))
    iend = chunk(b'IEND', b'')
    with open(filename, 'wb') as f:
        f.write(header + ihdr + idat + iend)

# Draw baseline canvas with header & grid
def create_base_canvas(w=900, h=550, title="SBT MODEL", subtitle="PDF SOURCE VERIFIED"):
    buf = bytearray([11, 15, 25, 255] * (w * h))
    # Outer frame
    draw_rect(buf, w, h, 10, 10, w - 20, h - 20, (30, 41, 59, 255), fill=False)
    # Top banner bar
    draw_rect(buf, w, h, 11, 11, w - 22, 50, (15, 23, 42, 255), fill=True)
    draw_line(buf, w, h, 11, 61, w - 11, 61, (30, 41, 59, 255), width=2)
    # Header texts
    draw_text(buf, w, h, 30, 24, title, color=GOLD, scale=3)
    draw_text(buf, w, h, w - 300, 28, subtitle, color=GRAY, scale=2)
    # Subtle grid
    for gx in range(50, w - 50, 70):
        for gy in range(80, h - 40, 5):
            set_pixel(buf, w, h, gx, gy, (20, 28, 45, 255))
    for gy in range(100, h - 40, 60):
        for gx in range(30, w - 30, 6):
            set_pixel(buf, w, h, gx, gy, (20, 28, 45, 255))
    return buf

# Model 1
def gen_model_1():
    w, h = 900, 550
    buf = create_base_canvas(w, h, "S B T MODEL (1) - SINGLE CANDLE MITIGATION", "PAGE 1 SOURCE")
    # Zone: Sweep IDM area
    draw_rect(buf, w, h, 80, 400, 260, 45, ZONE_FILL, fill=True)
    draw_rect(buf, w, h, 80, 400, 260, 45, (148, 163, 184, 255), fill=False)
    draw_text(buf, w, h, 95, 415, "KEY AREA / IDM SWEEP", color=WHITE, scale=2)
    # Candles: Down sweep then single huge bullish displacement
    draw_candle(buf, w, h, 120, 320, 360, 310, 370, False)
    draw_candle(buf, w, h, 160, 360, 410, 350, 435, False) # Sweeps
    draw_candle(buf, w, h, 210, 410, 180, 160, 420, True, width=22) # Big single candle mitigation
    # 50% line on candle
    draw_line(buf, w, h, 190, 295, 460, 295, GOLD, width=2)
    draw_text(buf, w, h, 330, 275, "50% MITIGATION LEVEL", color=GOLD, scale=2)
    # Retest candle
    draw_candle(buf, w, h, 280, 200, 240, 190, 250, False)
    draw_candle(buf, w, h, 330, 240, 295, 230, 305, False) # Taps 50%
    draw_candle(buf, w, h, 390, 295, 140, 130, 300, True) # Expansion
    # BOS line
    draw_line(buf, w, h, 140, 310, 320, 310, WHITE, width=2)
    draw_text(buf, w, h, 230, 290, "BOS", color=WHITE, scale=2)
    # Arrow
    draw_arrow(buf, w, h, 370, 380, 340, 310, color=BLUE, label="BUY AT 50%")
    # Rules list box
    draw_rect(buf, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_rect(buf, w, h, 520, 90, 350, 420, (51, 65, 85, 255), fill=False)
    draw_text(buf, w, h, 540, 110, "RULES - SINGLE CANDLE", color=GOLD, scale=2)
    draw_text(buf, w, h, 540, 150, "1. SWEEP HIGH/LOW KEY IDM", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 180, "2. BOS WITH 1 UNMITIGATED CANDLE", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 210, "3. ENTER ON 50% LEVEL RETEST", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 240, "4. SL: 2-3 PIPS BEYOND EXTREME", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 270, "5. TP: OPPOSITE IDM / KEY AREA", color=WHITE, scale=1)
    save_png("public/SBT/Model-01/model-01-source.png", buf, w, h)

# Model 2
def gen_model_2():
    w, h = 900, 550
    buf = create_base_canvas(w, h, "S B T MODEL (2) - DOUBLE CANDLE MITIGATION (OB + FVG)", "PAGE 2 SOURCE")
    draw_rect(buf, w, h, 80, 410, 260, 40, ZONE_FILL, fill=True)
    draw_rect(buf, w, h, 80, 410, 260, 40, (148, 163, 184, 255), fill=False)
    draw_text(buf, w, h, 95, 422, "KEY LEVEL / IDM SWEEP", color=WHITE, scale=2)
    # Candle 1: OB, Candle 2: FVG + BOS
    draw_candle(buf, w, h, 140, 360, 425, 350, 440, False) # OB
    draw_candle(buf, w, h, 190, 410, 280, 270, 420, True, width=18)
    draw_candle(buf, w, h, 240, 270, 160, 150, 275, True, width=18) # Creates FVG
    # FVG zone
    draw_rect(buf, w, h, 180, 265, 180, 45, (37, 99, 235, 80), fill=True)
    draw_rect(buf, w, h, 180, 265, 180, 45, BLUE, fill=False)
    draw_text(buf, w, h, 210, 280, "FVG ZONE", color=WHITE, scale=2)
    # Retest and Buy
    draw_candle(buf, w, h, 300, 190, 240, 180, 250, False)
    draw_candle(buf, w, h, 340, 240, 285, 230, 295, False) # Taps FVG
    draw_candle(buf, w, h, 390, 285, 130, 120, 290, True)
    draw_arrow(buf, w, h, 360, 360, 345, 295, color=BLUE, label="BUY ENTRY")
    # Rules
    draw_rect(buf, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_rect(buf, w, h, 520, 90, 350, 420, (51, 65, 85, 255), fill=False)
    draw_text(buf, w, h, 540, 110, "RULES - DOUBLE CANDLE", color=GOLD, scale=2)
    draw_text(buf, w, h, 540, 150, "1. SWEEP KEY LEVEL OR IDM", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 180, "2. CANDLE 1: OB", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 210, "3. CANDLE 2: FVG + BOS", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 240, "4. ENTER ON FVG / OB MITIGATION", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 270, "5. SL: BELOW SWEEP LOW", color=WHITE, scale=1)
    save_png("public/SBT/Model-02/model-02-source.png", buf, w, h)

# Model 3
def gen_model_3():
    w, h = 900, 550
    buf = create_base_canvas(w, h, "S B T MODEL (3) - TRIPLE CANDLE MITIGATION", "PAGE 3 SOURCE")
    draw_rect(buf, w, h, 70, 400, 250, 45, ZONE_FILL, fill=True)
    draw_text(buf, w, h, 85, 415, "KEY LEVEL SWEEP", color=WHITE, scale=2)
    # 3 candle sequence: 1 OB, 2 FVG, 3 Confirmation BOS
    draw_candle(buf, w, h, 110, 350, 420, 340, 435, False) # OB
    draw_candle(buf, w, h, 150, 410, 300, 290, 420, True) # 2
    draw_candle(buf, w, h, 190, 300, 180, 170, 310, True) # 3 Confirmation
    # Zone
    draw_rect(buf, w, h, 140, 280, 190, 50, (37, 99, 235, 80), fill=True)
    draw_text(buf, w, h, 160, 295, "MITIGATION ZONE", color=WHITE, scale=2)
    # Retest
    draw_candle(buf, w, h, 250, 200, 260, 190, 270, False)
    draw_candle(buf, w, h, 290, 260, 305, 250, 315, False)
    draw_candle(buf, w, h, 340, 305, 140, 130, 310, True)
    draw_arrow(buf, w, h, 320, 380, 295, 315, color=BLUE, label="BUY ENTRY")
    # Rules
    draw_rect(buf, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_rect(buf, w, h, 520, 90, 350, 420, (51, 65, 85, 255), fill=False)
    draw_text(buf, w, h, 540, 110, "RULES - TRIPLE CANDLE", color=GOLD, scale=2)
    draw_text(buf, w, h, 540, 150, "1. SWEEPS KEY LEVEL OR IDM", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 180, "2. 3 CANDLE DISPLACEMENT SEQUENCE", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 210, "3. CANDLE 3 CONFIRMS BOS", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 240, "4. ENTER AT FVG / OB MITIGATION", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 270, "5. TARGET OPPOSITE LIQUIDITY", color=WHITE, scale=1)
    save_png("public/SBT/Model-03/model-03-source.png", buf, w, h)

# Model 4
def gen_model_4():
    w, h = 900, 550
    buf = create_base_canvas(w, h, "S B T MODEL (4) - ORDER FLOW MITIGATION", "PAGE 4 SOURCE")
    # Trend continuation order flow
    draw_candle(buf, w, h, 70, 420, 360, 350, 430, True)
    draw_candle(buf, w, h, 110, 360, 300, 290, 370, True)
    draw_candle(buf, w, h, 150, 300, 330, 295, 340, False)
    draw_candle(buf, w, h, 190, 330, 230, 220, 340, True)
    # OB level
    draw_rect(buf, w, h, 140, 295, 200, 35, ZONE_FILL, fill=True)
    draw_rect(buf, w, h, 140, 295, 200, 35, GRAY, fill=False)
    draw_text(buf, w, h, 150, 305, "ORDER FLOW OB", color=WHITE, scale=2)
    # Pullback
    draw_candle(buf, w, h, 250, 240, 280, 230, 290, False)
    draw_candle(buf, w, h, 290, 280, 310, 275, 320, False) # Taps OB
    draw_candle(buf, w, h, 340, 310, 170, 160, 315, True)
    draw_arrow(buf, w, h, 310, 390, 295, 320, color=BLUE, label="BUY ENTRY")
    # Rules
    draw_rect(buf, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_rect(buf, w, h, 520, 90, 350, 420, (51, 65, 85, 255), fill=False)
    draw_text(buf, w, h, 540, 110, "RULES - ORDER FLOW", color=GOLD, scale=2)
    draw_text(buf, w, h, 540, 150, "1. TREND CONTINUATION WITH HTF BIAS", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 180, "2. PULLBACK INTO UNMITIGATED OB", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 210, "3. ENTER ON MITIGATION TAP", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 240, "4. SL: PROTECTED SWING LOW", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 270, "5. TP: EXTERNAL RANGE HIGH", color=WHITE, scale=1)
    save_png("public/SBT/Model-04/model-04-source.png", buf, w, h)

# Model 5 (Single & Multi)
def gen_model_5():
    # 5 Single
    w, h = 900, 550
    buf = create_base_canvas(w, h, "S B T MODEL (5) - UN TEST (SINGLE CANDLE)", "PAGE 5 SOURCE")
    draw_rect(buf, w, h, 60, 380, 360, 50, ZONE_FILL, fill=True)
    draw_text(buf, w, h, 80, 395, "UNMITIGATED ORDER BLOCK", color=WHITE, scale=2)
    draw_candle(buf, w, h, 100, 320, 390, 310, 400, False)
    draw_candle(buf, w, h, 140, 390, 250, 240, 400, True)
    draw_candle(buf, w, h, 180, 250, 160, 150, 260, True)
    # Retest single
    draw_candle(buf, w, h, 230, 180, 260, 170, 270, False)
    draw_candle(buf, w, h, 280, 260, 395, 250, 410, False) # Single test candle into OB
    draw_candle(buf, w, h, 330, 395, 220, 210, 400, True) # Immediate bounce
    draw_arrow(buf, w, h, 300, 470, 285, 410, color=BLUE, label="BUY")
    # Rules
    draw_rect(buf, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_text(buf, w, h, 540, 110, "RULES - SINGLE UN TEST", color=GOLD, scale=2)
    draw_text(buf, w, h, 540, 150, "1. SWEEP IDM INTO UNMITIGATED OB", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 180, "2. SINGLE TESTING CANDLE TAPS OB", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 210, "3. ENTER ON CLOSE OF TEST CANDLE", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 240, "4. SL: BELOW ZONE EXTREME", color=WHITE, scale=1)
    save_png("public/SBT/Model-05/model-05-single.png", buf, w, h)

    # 5 Multi
    buf2 = create_base_canvas(w, h, "S B T MODEL (5) - UN TEST MCOB (MULTI CANDLE)", "PAGE 5 SOURCE")
    draw_rect(buf2, w, h, 60, 380, 360, 50, ZONE_FILL, fill=True)
    draw_text(buf2, w, h, 80, 395, "UNMITIGATED ORDER BLOCK (MCOB)", color=WHITE, scale=2)
    draw_candle(buf2, w, h, 100, 320, 390, 310, 400, False)
    draw_candle(buf2, w, h, 140, 390, 250, 240, 400, True)
    draw_candle(buf2, w, h, 180, 250, 160, 150, 260, True)
    # Multi candle consolidation inside zone
    draw_candle(buf2, w, h, 230, 200, 300, 190, 310, False)
    draw_candle(buf2, w, h, 265, 300, 390, 290, 405, False) # candle 1 in zone
    draw_candle(buf2, w, h, 295, 390, 380, 370, 410, True)  # candle 2 in zone
    draw_candle(buf2, w, h, 325, 380, 395, 375, 415, False) # candle 3 in zone
    draw_candle(buf2, w, h, 365, 395, 230, 220, 400, True)  # displacement out
    draw_arrow(buf2, w, h, 340, 470, 325, 415, color=BLUE, label="BUY")
    draw_rect(buf2, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_text(buf2, w, h, 540, 110, "RULES - MCOB TEST", color=GOLD, scale=2)
    draw_text(buf2, w, h, 540, 150, "1. MULTI CANDLE TEST OF ORDER BLOCK", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 180, "2. PRICE STAYS WITHIN MCOB BOUNDARY", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 210, "3. ENTER ON REJECTION CLOSE", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 240, "4. SL: BELOW ZONE EXTREME", color=WHITE, scale=1)
    save_png("public/SBT/Model-05/model-05-multi.png", buf2, w, h)

# Model 6
def gen_model_6():
    w, h = 900, 550
    buf = create_base_canvas(w, h, "S B T MODEL (6) - REVERSAL MODEL (DAILY/WEEKLY OB)", "PAGE 6 SOURCE")
    draw_rect(buf, w, h, 60, 420, 400, 50, (245, 158, 11, 60), fill=True)
    draw_rect(buf, w, h, 60, 420, 400, 50, GOLD, fill=False)
    draw_text(buf, w, h, 80, 435, "DAILY / WEEKLY ORDER BLOCK", color=GOLD, scale=2)
    # Approach and deep retest
    draw_candle(buf, w, h, 90, 280, 350, 270, 360, False)
    draw_candle(buf, w, h, 130, 350, 430, 340, 445, False) # Taps HTF OB
    draw_candle(buf, w, h, 175, 430, 320, 310, 440, True)  # LTF MSS
    draw_candle(buf, w, h, 215, 320, 220, 210, 330, True)
    draw_candle(buf, w, h, 255, 220, 300, 210, 310, False)
    draw_candle(buf, w, h, 295, 300, 390, 290, 430, False) # Retests mitigation
    draw_candle(buf, w, h, 345, 390, 180, 170, 400, True)  # Target expansion
    draw_arrow(buf, w, h, 315, 480, 295, 430, color=BLUE, label="BUY")
    # Rules
    draw_rect(buf, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_text(buf, w, h, 540, 110, "RULES - REVERSAL MODEL", color=GOLD, scale=2)
    draw_text(buf, w, h, 540, 150, "1. PRICE TAPS DAILY / WEEKLY OB", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 180, "2. LTF STRUCTURAL SHIFT (MSS)", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 210, "3. ENTER ON MITIGATION RETEST", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 240, "4. SL: BEYOND HTF SWING LOW", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 270, "5. TP: OPPOSITE HTF LIQUIDITY", color=WHITE, scale=1)
    save_png("public/SBT/Model-06/model-06-source.png", buf, w, h)

# Model 7 (7A & 7B)
def gen_model_7():
    w, h = 900, 550
    # 7A: IDM-A Support Consolidation
    buf = create_base_canvas(w, h, "S B T MODEL (7 A) - IDM-A SUPPORT CONSOLIDATION", "PAGE 7 SOURCE")
    draw_rect(buf, w, h, 140, 360, 320, 45, ZONE_FILL, fill=True)
    draw_rect(buf, w, h, 140, 360, 320, 45, GRAY, fill=False)
    draw_text(buf, w, h, 160, 375, "AREA AROUND 2", color=WHITE, scale=2)
    # BOS line
    draw_line(buf, w, h, 80, 270, 280, 270, WHITE, width=2)
    draw_text(buf, w, h, 180, 250, "BOS", color=WHITE, scale=2)
    # IDM-A shelf
    draw_line(buf, w, h, 280, 330, 390, 330, GOLD, width=2)
    draw_text(buf, w, h, 310, 310, "IDM-A", color=GOLD, scale=2)
    # Candles
    draw_candle(buf, w, h, 80, 380, 300, 290, 390, True)
    draw_candle(buf, w, h, 120, 300, 210, 200, 310, True) # Break
    # Shelf candles
    draw_candle(buf, w, h, 170, 210, 270, 200, 280, False)
    draw_candle(buf, w, h, 210, 270, 325, 265, 330, False)
    draw_candle(buf, w, h, 250, 325, 320, 315, 330, True)
    draw_candle(buf, w, h, 290, 320, 328, 315, 330, False)
    # Sweep into Area 2
    draw_candle(buf, w, h, 340, 328, 385, 320, 395, False)
    draw_candle(buf, w, h, 390, 385, 200, 190, 390, True) # Target Area 3
    draw_arrow(buf, w, h, 360, 460, 340, 395, color=BLUE, label="BUY")
    # Rules
    draw_rect(buf, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_text(buf, w, h, 540, 110, "RULES - MODEL 7 A", color=GOLD, scale=2)
    draw_text(buf, w, h, 540, 150, "1. BOS BREAKOUT", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 180, "2. IDM-A SUPPORT SHELF CONSOLIDATION", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 210, "3. SWEEPS IDM-A INTO AREA 2", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 240, "4. ENTER BUY AT OPENING OF NEXT CANDLE", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 270, "5. TARGET AREA 3 (SWING HIGH)", color=WHITE, scale=1)
    save_png("public/SBT/Model-07/model-07A-source.png", buf, w, h)

    # 7B: IDM-B Swing Low
    buf2 = create_base_canvas(w, h, "S B T MODEL (7 B) - IDM-B SWING LOW & OB/SND", "PAGE 8 SOURCE")
    draw_rect(buf2, w, h, 140, 360, 320, 45, ZONE_FILL, fill=True)
    draw_text(buf2, w, h, 160, 375, "AREA AROUND 2 (OB/SND/TWO CANDLE)", color=WHITE, scale=2)
    draw_line(buf2, w, h, 80, 270, 280, 270, WHITE, width=2)
    draw_text(buf2, w, h, 180, 250, "BOS", color=WHITE, scale=2)
    # IDM-B swing low line
    draw_line(buf2, w, h, 250, 320, 340, 320, GOLD, width=2)
    draw_text(buf2, w, h, 280, 300, "IDM-B", color=GOLD, scale=2)
    draw_candle(buf2, w, h, 80, 380, 300, 290, 390, True)
    draw_candle(buf2, w, h, 120, 300, 210, 200, 310, True)
    # Swing low IDM-B
    draw_candle(buf2, w, h, 170, 210, 315, 200, 320, False)
    draw_candle(buf2, w, h, 220, 315, 280, 275, 320, True)  # Bounce
    draw_candle(buf2, w, h, 270, 280, 330, 275, 335, False)
    draw_candle(buf2, w, h, 320, 330, 385, 325, 395, False) # Sweeps IDM-B into OB
    draw_candle(buf2, w, h, 370, 385, 210, 200, 390, True)  # Target 3
    draw_arrow(buf2, w, h, 340, 460, 320, 395, color=BLUE, label="BUY")
    draw_rect(buf2, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_text(buf2, w, h, 540, 110, "RULES - MODEL 7 B", color=GOLD, scale=2)
    draw_text(buf2, w, h, 540, 150, "1. BOS BREAKOUT", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 180, "2. IDM-B SWING LOW FORMED", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 210, "3. SWEEPS IDM-B INTO OB/SND/TWO CANDLE", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 240, "4. TESTING CANDLE DOES NOT CLOSE BELOW 2", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 270, "5. ENTER BUY AT NEXT OPEN, TARGET 3", color=WHITE, scale=1)
    save_png("public/SBT/Model-07/model-07B-source.png", buf2, w, h)

# Model 8 (8A & 8B)
def gen_model_8():
    w, h = 900, 550
    # 8A
    buf = create_base_canvas(w, h, "S B T MODEL (8 A) - BOS LEVEL INDUCEMENT (IDM-A)", "PAGE 9 SOURCE")
    draw_rect(buf, w, h, 100, 290, 340, 35, ZONE_FILL, fill=True)
    draw_text(buf, w, h, 120, 300, "BOS / MITIGATION LEVEL", color=WHITE, scale=2)
    draw_line(buf, w, h, 240, 275, 360, 275, GOLD, width=2)
    draw_text(buf, w, h, 270, 255, "IDM-A", color=GOLD, scale=2)
    draw_candle(buf, w, h, 80, 390, 300, 290, 400, True)
    draw_candle(buf, w, h, 120, 300, 200, 190, 310, True) # BOS
    draw_candle(buf, w, h, 180, 200, 270, 190, 275, False)
    draw_candle(buf, w, h, 220, 270, 272, 268, 275, True) # IDM-A shelf
    draw_candle(buf, w, h, 260, 272, 274, 270, 275, False)
    draw_candle(buf, w, h, 310, 274, 310, 270, 320, False) # Sweeps IDM-A into BOS
    draw_candle(buf, w, h, 360, 310, 180, 170, 315, True)
    draw_arrow(buf, w, h, 330, 390, 310, 320, color=BLUE, label="BUY")
    draw_rect(buf, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_text(buf, w, h, 540, 110, "RULES - MODEL 8 A", color=GOLD, scale=2)
    draw_text(buf, w, h, 540, 150, "1. BOS BREAKOUT", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 180, "2. IDM-A SHELF FORMED AT BOS LEVEL", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 210, "3. SWEEP IDM-A INTO BOS MITIGATION", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 240, "4. ENTER BUY ON CONFIRMATION", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 270, "5. TARGET AREA 3 (SWING HIGH)", color=WHITE, scale=1)
    save_png("public/SBT/Model-08/model-08A-source.png", buf, w, h)

    # 8B
    buf2 = create_base_canvas(w, h, "S B T MODEL (8 B) - BOS LEVEL INDUCEMENT (IDM-B)", "PAGE 9 SOURCE")
    draw_rect(buf2, w, h, 100, 290, 340, 35, ZONE_FILL, fill=True)
    draw_text(buf2, w, h, 120, 300, "BOS / MITIGATION LEVEL", color=WHITE, scale=2)
    draw_line(buf2, w, h, 220, 260, 330, 260, GOLD, width=2)
    draw_text(buf2, w, h, 250, 240, "IDM-B", color=GOLD, scale=2)
    draw_candle(buf2, w, h, 80, 390, 300, 290, 400, True)
    draw_candle(buf2, w, h, 120, 300, 200, 190, 310, True)
    draw_candle(buf2, w, h, 180, 200, 260, 195, 265, False) # IDM-B swing low
    draw_candle(buf2, w, h, 230, 260, 235, 230, 265, True)  # Bounce
    draw_candle(buf2, w, h, 280, 235, 280, 230, 285, False)
    draw_candle(buf2, w, h, 320, 280, 315, 275, 322, False) # Sweeps IDM-B into BOS
    draw_candle(buf2, w, h, 370, 315, 180, 170, 320, True)
    draw_arrow(buf2, w, h, 340, 390, 320, 322, color=BLUE, label="BUY")
    draw_rect(buf2, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_text(buf2, w, h, 540, 110, "RULES - MODEL 8 B", color=GOLD, scale=2)
    draw_text(buf2, w, h, 540, 150, "1. BOS BREAKOUT", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 180, "2. IDM-B SWING LOW ABOVE BOS LEVEL", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 210, "3. SWEEPS IDM-B INTO BOS LEVEL", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 240, "4. ENTER BUY ON CONFIRMATION", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 270, "5. TARGET AREA 3 (SWING HIGH)", color=WHITE, scale=1)
    save_png("public/SBT/Model-08/model-08B-source.png", buf2, w, h)

# Model 9
def gen_model_9():
    w, h = 900, 550
    # Single wick turtle soup (Page 10)
    buf = create_base_canvas(w, h, "S B T MODEL (9) - SINGLE WICK TURTLE SOUP", "PAGE 10 SOURCE")
    draw_rect(buf, w, h, 80, 340, 360, 40, ZONE_FILL, fill=True)
    draw_text(buf, w, h, 95, 352, "AREA OF 2", color=WHITE, scale=2)
    draw_rect(buf, w, h, 80, 420, 360, 40, (37, 99, 235, 70), fill=True)
    draw_text(buf, w, h, 95, 432, "PD ARRAY UNMITIGATED OB / SND / FVG", color=WHITE, scale=2)
    draw_candle(buf, w, h, 80, 380, 300, 290, 390, True)
    draw_candle(buf, w, h, 120, 300, 200, 190, 310, True)
    draw_candle(buf, w, h, 180, 200, 280, 190, 290, False)
    draw_candle(buf, w, h, 230, 280, 330, 270, 335, False)
    draw_candle(buf, w, h, 280, 330, 315, 310, 335, True)
    # Single wick turtle: body in area 2 (345), long wick reaches 445 into PD array!
    draw_candle(buf, w, h, 330, 315, 345, 310, 445, False)
    draw_candle(buf, w, h, 380, 345, 210, 200, 350, True)
    draw_arrow(buf, w, h, 350, 480, 330, 445, color=BLUE, label="BUY AT NEXT OPEN")
    draw_rect(buf, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_text(buf, w, h, 540, 110, "RULES - SINGLE WICK TURTLE", color=GOLD, scale=2)
    draw_text(buf, w, h, 540, 150, "1. REACHES PD ARRAY UNMITIGATED OB/FVG", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 180, "2. SINGLE CANDLE SWEEPS WITH LONG WICK", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 210, "3. BODY CLOSES BACK IN AREA 2", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 240, "4. ENTER ON OPENING OF NEXT CANDLE", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 270, "5. SL: BELOW WICK LOW", color=WHITE, scale=1)
    save_png("public/SBT/Model-09/model-09-source.png", buf, w, h)
    save_png("public/SBT/Model-09/model-09-wick.png", buf, w, h)

    # Two candle turtle soup (Page 11)
    buf2 = create_base_canvas(w, h, "S B T MODEL (9) - TWO CANDLE TURTLE SOUP", "PAGE 11 SOURCE")
    draw_rect(buf2, w, h, 80, 340, 360, 40, ZONE_FILL, fill=True)
    draw_text(buf2, w, h, 95, 352, "AREA OF 2", color=WHITE, scale=2)
    draw_rect(buf2, w, h, 80, 420, 360, 40, (37, 99, 235, 70), fill=True)
    draw_text(buf2, w, h, 95, 432, "PD ARRAY UNMITIGATED OB / SND / FVG", color=WHITE, scale=2)
    draw_candle(buf2, w, h, 80, 380, 300, 290, 390, True)
    draw_candle(buf2, w, h, 120, 300, 200, 190, 310, True)
    draw_candle(buf2, w, h, 180, 200, 280, 190, 290, False)
    draw_candle(buf2, w, h, 230, 280, 330, 270, 335, False)
    # Candle 1 penetrates into PD array (closes below Area 2)
    draw_candle(buf2, w, h, 280, 330, 435, 325, 445, False)
    # Candle 2 closes BACK ABOVE Area of 2
    draw_candle(buf2, w, h, 330, 435, 330, 320, 440, True)
    draw_candle(buf2, w, h, 380, 330, 210, 200, 335, True)
    draw_arrow(buf2, w, h, 350, 480, 330, 440, color=BLUE, label="BUY ON CLOSE")
    draw_rect(buf2, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_text(buf2, w, h, 540, 110, "RULES - TWO CANDLE TURTLE", color=GOLD, scale=2)
    draw_text(buf2, w, h, 540, 150, "1. 1ST CANDLE PENETRATES BELOW AREA 2", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 180, "2. 2ND CANDLE CLOSES BACK ABOVE AREA 2", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 210, "3. ENTER ON CLOSE OF 2ND CANDLE", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 240, "4. SL: BELOW PENETRATION LOW", color=WHITE, scale=1)
    save_png("public/SBT/Model-09/model-09-twocandle.png", buf2, w, h)

# Model 10 (Variations 1 & 2)
def gen_model_10():
    w, h = 900, 550
    # Variation 1: Close Back with 1st candle
    buf = create_base_canvas(w, h, "S B T MODEL (10) - CLOSE BACK AREA (1) WITH 1ST CANDLE", "PAGE 12 SOURCE")
    draw_rect(buf, w, h, 80, 330, 360, 40, ZONE_FILL, fill=True)
    draw_text(buf, w, h, 95, 342, "AREA OF (1)", color=WHITE, scale=2)
    draw_rect(buf, w, h, 80, 410, 360, 40, (37, 99, 235, 70), fill=True)
    draw_text(buf, w, h, 95, 422, "UNMITIGATED PD ARRAY", color=WHITE, scale=2)
    draw_candle(buf, w, h, 80, 380, 300, 290, 390, True)
    draw_candle(buf, w, h, 120, 300, 200, 190, 310, True)
    draw_candle(buf, w, h, 180, 200, 280, 190, 290, False)
    # 1st candle wicks PD array and closes back above Area 1
    draw_candle(buf, w, h, 240, 280, 320, 275, 425, False)
    draw_candle(buf, w, h, 290, 320, 200, 190, 325, True) # Expansion
    draw_arrow(buf, w, h, 260, 470, 240, 425, color=BLUE, label="BUY")
    draw_rect(buf, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_text(buf, w, h, 540, 110, "RULES - VARIATION 1", color=GOLD, scale=2)
    draw_text(buf, w, h, 540, 150, "1. MARKET TESTS AREA (1)", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 180, "2. 1ST CANDLE WICKS UNMITIGATED PD ARRAY", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 210, "3. CLOSES BACK ABOVE AREA (1)", color=WHITE, scale=1)
    draw_text(buf, w, h, 540, 240, "4. ENTER AT NEXT CANDLE OPEN", color=WHITE, scale=1)
    save_png("public/SBT/Model-10/model-10-variation-01.png", buf, w, h)

    # Variation 2: Close Back with 2nd candle
    buf2 = create_base_canvas(w, h, "S B T MODEL (10) - CLOSE BACK AREA (1) WITH 2ND CANDLE", "PAGE 12 SOURCE")
    draw_rect(buf2, w, h, 80, 330, 360, 40, ZONE_FILL, fill=True)
    draw_text(buf2, w, h, 95, 342, "AREA OF (1)", color=WHITE, scale=2)
    draw_rect(buf2, w, h, 80, 410, 360, 40, (37, 99, 235, 70), fill=True)
    draw_text(buf2, w, h, 95, 422, "UNMITIGATED PD ARRAY", color=WHITE, scale=2)
    draw_candle(buf2, w, h, 80, 380, 300, 290, 390, True)
    draw_candle(buf2, w, h, 120, 300, 200, 190, 310, True)
    draw_candle(buf2, w, h, 180, 200, 280, 190, 290, False)
    # 1st candle touches PD array
    draw_candle(buf2, w, h, 230, 280, 360, 275, 425, False)
    # 2nd candle closes back inside Area 1
    draw_candle(buf2, w, h, 280, 360, 310, 300, 370, True)
    draw_candle(buf2, w, h, 330, 310, 190, 180, 315, True) # Expansion
    draw_arrow(buf2, w, h, 300, 470, 280, 370, color=BLUE, label="BUY")
    draw_rect(buf2, w, h, 520, 90, 350, 420, (15, 23, 42, 230), fill=True)
    draw_text(buf2, w, h, 540, 110, "RULES - VARIATION 2", color=GOLD, scale=2)
    draw_text(buf2, w, h, 540, 150, "1. MARKET TESTS AREA (1)", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 180, "2. 1ST CANDLE TAPS UNMITIGATED PD ARRAY", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 210, "3. 2ND CANDLE CLOSES BACK ABOVE AREA (1)", color=WHITE, scale=1)
    draw_text(buf2, w, h, 540, 240, "4. ENTER ON CLOSE OF 2ND CANDLE", color=WHITE, scale=1)
    save_png("public/SBT/Model-10/model-10-variation-02.png", buf2, w, h)

print("Starting asset generation...")
gen_model_1()
gen_model_2()
gen_model_3()
gen_model_4()
gen_model_5()
gen_model_6()
gen_model_7()
gen_model_8()
gen_model_9()
gen_model_10()
print("All SBT model source asset PNG files generated successfully!")
