import { formatPrice, formatVolume } from '../utils/formatters.js';
import { TICKER_CONFIG } from '../config/tickers.js';

let customMinPrice = null;
let customMaxPrice = null;
let isDraggingYAxis = false;
let isDraggingCanvas = false;
let lastMouseY = 0;
let lastCandlesCache = null;
let selectedTimeframe = '90D';

export function setPriceTimeframe(tf) {
  selectedTimeframe = tf;
  ['60D', '90D', '180D', 'YTD'].forEach(t => {
    const btn = document.getElementById(`btnTf${t}`);
    if (btn) {
      if (t === tf) {
        btn.className = 'px-2 py-0.5 bg-slate-900 text-white font-bold border border-slate-950 transition-colors cursor-pointer text-[11px]';
      } else {
        btn.className = 'px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 transition-colors cursor-pointer text-[11px]';
      }
    }
  });

  if (lastCandlesCache) {
    renderCandleCanvas(
      lastCandlesCache.candles,
      lastCandlesCache.decimals,
      lastCandlesCache.prefix,
      lastCandlesCache.tradeLevels
    );
  }
}

export function resetYAxisScale() {
  customMinPrice = null;
  customMaxPrice = null;
  if (lastCandlesCache) {
    renderCandleCanvas(
      lastCandlesCache.candles,
      lastCandlesCache.decimals,
      lastCandlesCache.prefix,
      lastCandlesCache.tradeLevels
    );
  }
}

export function setupCanvasInteractivity(getCurrentTickerKey) {
  const canvas = document.getElementById('priceCanvas');
  if (!canvas) return;

  const paddingRight = 85;

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    lastMouseY = e.clientY;

    if (mouseX > canvas.clientWidth - paddingRight) {
      isDraggingYAxis = true;
      canvas.style.cursor = 'ns-resize';
    } else {
      isDraggingCanvas = true;
      canvas.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingYAxis && !isDraggingCanvas) return;
    if (!lastCandlesCache || !lastCandlesCache.candles || lastCandlesCache.candles.length === 0) return;

    const dy = e.clientY - lastMouseY;
    lastMouseY = e.clientY;

    const currentKey = typeof getCurrentTickerKey === 'function' ? getCurrentTickerKey() : 'BTC';
    const tData = TICKER_CONFIG[currentKey] || TICKER_CONFIG['BTC'];
    const decimals = tData.decimals;
    const prefix = tData.prefix;

    const displayCandles = getFilteredCandles(lastCandlesCache.candles);

    let defaultMin = Infinity;
    let defaultMax = -Infinity;
    displayCandles.forEach(c => {
      if (c.low < defaultMin) defaultMin = c.low;
      if (c.high > defaultMax) defaultMax = c.high;
    });

    if (lastCandlesCache.tradeLevels) {
      const tl = lastCandlesCache.tradeLevels;
      defaultMin = Math.min(defaultMin, tl.stopLoss, tl.entryMin, tl.target1, tl.target2, tl.putWall || Infinity);
      defaultMax = Math.max(defaultMax, tl.stopLoss, tl.entryMax, tl.target1, tl.target2, tl.callWall || -Infinity);
    }

    const defaultRange = defaultMax - defaultMin;
    const curMin = customMinPrice !== null ? customMinPrice : (defaultMin - defaultRange * 0.06);
    const curMax = customMaxPrice !== null ? customMaxPrice : (defaultMax + defaultRange * 0.06);
    const curRange = curMax - curMin;
    const center = (curMax + curMin) / 2;

    if (isDraggingYAxis) {
      const zoomFactor = 1 + (dy * 0.008);
      const newRange = Math.max(defaultRange * 0.05, curRange * zoomFactor);
      customMinPrice = center - newRange / 2;
      customMaxPrice = center + newRange / 2;
    } else if (isDraggingCanvas) {
      const priceShift = (dy / (canvas.clientHeight * 0.76)) * curRange;
      customMinPrice = curMin + priceShift;
      customMaxPrice = curMax + priceShift;
    }

    renderCandleCanvas(lastCandlesCache.candles, decimals, prefix, lastCandlesCache.tradeLevels);
  });

  window.addEventListener('mouseup', () => {
    isDraggingYAxis = false;
    isDraggingCanvas = false;
    canvas.style.cursor = 'crosshair';
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!lastCandlesCache || !lastCandlesCache.candles || lastCandlesCache.candles.length === 0) return;

    const currentKey = typeof getCurrentTickerKey === 'function' ? getCurrentTickerKey() : 'BTC';
    const tData = TICKER_CONFIG[currentKey] || TICKER_CONFIG['BTC'];
    const decimals = tData.decimals;
    const prefix = tData.prefix;

    const displayCandles = getFilteredCandles(lastCandlesCache.candles);

    let defaultMin = Infinity;
    let defaultMax = -Infinity;
    displayCandles.forEach(c => {
      if (c.low < defaultMin) defaultMin = c.low;
      if (c.high > defaultMax) defaultMax = c.high;
    });

    if (lastCandlesCache.tradeLevels) {
      const tl = lastCandlesCache.tradeLevels;
      defaultMin = Math.min(defaultMin, tl.stopLoss, tl.entryMin, tl.target1, tl.target2, tl.putWall || Infinity);
      defaultMax = Math.max(defaultMax, tl.stopLoss, tl.entryMax, tl.target1, tl.target2, tl.callWall || -Infinity);
    }

    const defaultRange = defaultMax - defaultMin;
    const curMin = customMinPrice !== null ? customMinPrice : (defaultMin - defaultRange * 0.06);
    const curMax = customMaxPrice !== null ? customMaxPrice : (defaultMax + defaultRange * 0.06);
    const curRange = curMax - curMin;
    const center = (curMax + curMin) / 2;

    const zoomDelta = e.deltaY > 0 ? 1.08 : 0.92;
    const newRange = Math.max(defaultRange * 0.05, curRange * zoomDelta);
    customMinPrice = center - newRange / 2;
    customMaxPrice = center + newRange / 2;

    renderCandleCanvas(lastCandlesCache.candles, decimals, prefix, lastCandlesCache.tradeLevels);
  }, { passive: false });

  canvas.addEventListener('dblclick', () => {
    resetYAxisScale();
  });
}

function getFilteredCandles(candles) {
  if (!candles || candles.length === 0) return [];
  if (selectedTimeframe === '60D') return candles.slice(-60);
  if (selectedTimeframe === '90D') return candles.slice(-90);
  if (selectedTimeframe === '180D') return candles.slice(-180);
  return candles; // YTD
}

export function calculateAndRenderCandles(candles, decimals, prefix, tradeLevels = null) {
  if (!candles || candles.length === 0) return;

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      candles[i].tr = candles[i].high - candles[i].low;
      candles[i].atr = candles[i].tr;
    } else {
      const tr = Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      );
      candles[i].tr = tr;
      const prevAtr = candles[i - 1].atr;
      candles[i].atr = (prevAtr * 13 + tr) / 14;
    }
  }

  const latest = candles[candles.length - 1];
  const atrVal = latest.atr;
  const atrPct = (atrVal / latest.close) * 100;

  const atrValEl = document.getElementById('atrValue');
  const atrPctEl = document.getElementById('atrRangePct');
  if (atrValEl) atrValEl.textContent = formatPrice(atrVal, decimals, prefix);
  if (atrPctEl) atrPctEl.textContent = `± ${atrPct.toFixed(2)}%`;

  updateOhlcStatusBar(latest, decimals, prefix);
  renderCandleCanvas(candles, decimals, prefix, tradeLevels);
}

export function updateOhlcStatusBar(candle, decimals, prefix) {
  const dateEl = document.getElementById('barDate');
  const openEl = document.getElementById('barOpen');
  const highEl = document.getElementById('barHigh');
  const lowEl = document.getElementById('barLow');
  const closeEl = document.getElementById('barClose');
  const volEl = document.getElementById('barVol');
  const atrEl = document.getElementById('barAtr');

  if (dateEl) dateEl.textContent = candle.date;
  if (openEl) openEl.textContent = formatPrice(candle.open, decimals, prefix);
  if (highEl) highEl.textContent = formatPrice(candle.high, decimals, prefix);
  if (lowEl) lowEl.textContent = formatPrice(candle.low, decimals, prefix);
  if (closeEl) closeEl.textContent = formatPrice(candle.close, decimals, prefix);
  if (volEl) volEl.textContent = formatVolume(candle.volume);
  if (atrEl) atrEl.textContent = formatPrice(candle.atr, decimals, prefix);
}

export function renderCandleCanvas(candles, decimals = 2, prefix = '$', tradeLevels = null) {
  if (candles) {
    lastCandlesCache = {
      candles,
      decimals,
      prefix,
      tradeLevels: tradeLevels !== null ? tradeLevels : (lastCandlesCache ? lastCandlesCache.tradeLevels : null)
    };
  }
  const effectiveTradeLevels = tradeLevels !== null ? tradeLevels : (lastCandlesCache ? lastCandlesCache.tradeLevels : null);

  const canvas = document.getElementById('priceCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  if (!container) return;

  const dpr = window.devicePixelRatio || 1;
  const width = container.clientWidth;
  const height = 420;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  ctx.scale(dpr, dpr);

  const priceHeight = height * 0.76;
  const volumeHeight = height * 0.18;
  const paddingRight = 85;

  // Filter by timeframe
  const displayCandles = getFilteredCandles(candles);
  if (displayCandles.length === 0) return;

  // Projection Zone
  const projectionPadding = 200;
  const chartWidth = width - paddingRight;
  const candleAreaWidth = Math.max(120, chartWidth - projectionPadding);

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let maxVol = 0;

  displayCandles.forEach(c => {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
    if (c.volume > maxVol) maxVol = c.volume;
  });

  if (effectiveTradeLevels) {
    minPrice = Math.min(minPrice, effectiveTradeLevels.stopLoss, effectiveTradeLevels.entryMin, effectiveTradeLevels.target1, effectiveTradeLevels.target2, effectiveTradeLevels.putWall || Infinity);
    maxPrice = Math.max(maxPrice, effectiveTradeLevels.stopLoss, effectiveTradeLevels.entryMax, effectiveTradeLevels.target1, effectiveTradeLevels.target2, effectiveTradeLevels.callWall || -Infinity);
  }

  const priceRange = maxPrice - minPrice;
  let paddedMin = customMinPrice !== null ? customMinPrice : (minPrice - priceRange * 0.06);
  let paddedMax = customMaxPrice !== null ? customMaxPrice : (maxPrice + priceRange * 0.06);
  let paddedRange = paddedMax - paddedMin;

  if (paddedRange <= 0) paddedRange = 1;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Grid Lines
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#f1f5f9';
  ctx.fillStyle = '#475569';
  ctx.font = '10px "ui-monospace, SFMono-Regular, Menlo, monospace"';

  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = (priceHeight / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(chartWidth, y);
    ctx.stroke();

    const priceVal = paddedMax - (paddedRange / gridSteps) * i;
    ctx.fillText(formatPrice(priceVal, decimals, prefix), chartWidth + 6, y + 3);
  }

  const candleCount = displayCandles.length;
  const candleGap = candleAreaWidth / candleCount;
  const candleWidth = Math.max(2.5, candleGap * 0.68);
  const lastCandleX = (candleCount - 1) * candleGap + candleGap / 2;

  // Vertical Month Markers
  let lastMonth = '';
  for (let i = 0; i < candleCount; i++) {
    const c = displayCandles[i];
    const monthStr = c.date.substring(0, 7);
    if (monthStr !== lastMonth) {
      lastMonth = monthStr;
      const x = i * candleGap + candleGap / 2;
      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, priceHeight);
      ctx.stroke();

      const monthName = new Date(c.date).toLocaleString('default', { month: 'short' }).toUpperCase();
      ctx.fillStyle = '#64748b';
      ctx.fillText(monthName, x + 2, 14);
    }
  }

  // Projection Zone Background & Separator Line
  ctx.fillStyle = 'rgba(248, 250, 252, 0.7)';
  ctx.fillRect(lastCandleX, 0, chartWidth - lastCandleX, priceHeight);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(lastCandleX, 0);
  ctx.lineTo(lastCandleX, priceHeight);
  ctx.stroke();
  ctx.setLineDash([]);

  // Forward Setup Area Header Label
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 9px "ui-monospace, SFMono-Regular, Menlo, monospace"';
  ctx.fillText('TARGET HORIZON (1-3W)', lastCandleX + 8, 14);

  // Render Trade Setup Projections
  const axisPills = [];
  const latestCandle = displayCandles[displayCandles.length - 1];
  const ySpot = priceHeight - ((latestCandle.close - paddedMin) / paddedRange) * priceHeight;

  if (effectiveTradeLevels) {
    const tl = effectiveTradeLevels;

    const yTp2 = priceHeight - ((tl.target2 - paddedMin) / paddedRange) * priceHeight;
    const yTp1 = priceHeight - ((tl.target1 - paddedMin) / paddedRange) * priceHeight;
    const yEntryMax = priceHeight - ((tl.entryMax - paddedMin) / paddedRange) * priceHeight;
    const yEntryMin = priceHeight - ((tl.entryMin - paddedMin) / paddedRange) * priceHeight;
    const ySl = priceHeight - ((tl.stopLoss - paddedMin) / paddedRange) * priceHeight;

    const entryTop = Math.min(yEntryMin, yEntryMax);
    const entryBottom = Math.max(yEntryMin, yEntryMax);
    const entryH = Math.max(3, entryBottom - entryTop);

    // Target Profit Region (TP2 to Entry Max)
    const tpTop = Math.min(yTp2, entryTop);
    const tpH = Math.max(0, entryTop - tpTop);
    if (tpH > 0) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
      ctx.fillRect(lastCandleX, tpTop, chartWidth - lastCandleX, tpH);
    }

    // Entry Region
    ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
    ctx.fillRect(lastCandleX, entryTop, chartWidth - lastCandleX, entryH);

    // Invalidation Risk Region (Entry Min to Stop Loss)
    const slTop = entryBottom;
    const slH = Math.max(0, ySl - entryBottom);
    if (slH > 0) {
      ctx.fillStyle = 'rgba(225, 29, 72, 0.06)';
      ctx.fillRect(lastCandleX, slTop, chartWidth - lastCandleX, slH);
    }

    // Level Lines
    const drawLevelLine = (y, color, dash = [5, 4], width = 1.2) => {
      if (y < 0 || y > priceHeight) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(lastCandleX, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawLevelLine(yTp2, '#059669', [6, 4], 1.5);
    drawLevelLine(yTp1, '#16a34a', [6, 4], 1.5);
    drawLevelLine(entryTop, '#2563eb', [4, 3], 1);
    drawLevelLine(entryBottom, '#2563eb', [4, 3], 1);
    drawLevelLine(ySl, '#e11d48', [6, 4], 1.5);

    // Spot Price Line across chart
    if (ySpot >= 0 && ySpot <= priceHeight) {
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(0, ySpot);
      ctx.lineTo(chartWidth, ySpot);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Call Wall
    if (tl.callWall) {
      const yCallWall = priceHeight - ((tl.callWall - paddedMin) / paddedRange) * priceHeight;
      if (yCallWall >= 0 && yCallWall <= priceHeight) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, yCallWall);
        ctx.lineTo(chartWidth, yCallWall);
        ctx.stroke();
        ctx.setLineDash([]);

        axisPills.push({ label: `CW  ${formatPrice(tl.callWall, decimals, prefix)}`, targetY: yCallWall, bg: '#78350f', fg: '#fef3c7' });
      }
    }

    // Put Wall
    if (tl.putWall) {
      const yPutWall = priceHeight - ((tl.putWall - paddedMin) / paddedRange) * priceHeight;
      if (yPutWall >= 0 && yPutWall <= priceHeight) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, yPutWall);
        ctx.lineTo(chartWidth, yPutWall);
        ctx.stroke();
        ctx.setLineDash([]);

        axisPills.push({ label: `PW  ${formatPrice(tl.putWall, decimals, prefix)}`, targetY: yPutWall, bg: '#4c1d95', fg: '#ede9fe' });
      }
    }

    // In-Canvas Label Badges 
    const drawInChartTag = (text, y, color) => {
      if (y < 12 || y > priceHeight - 6) return;
      ctx.font = 'bold 9px "ui-monospace, SFMono-Regular, Menlo, monospace"';
      const textW = ctx.measureText(text).width;
      const tagX = lastCandleX + 8;
      const tagY = y - 7;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tagX - 2, tagY - 1, textW + 6, 13);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(tagX - 2, tagY - 1, textW + 6, 13);

      ctx.fillStyle = color;
      ctx.fillText(text, tagX + 1, tagY + 9);
    };

    drawInChartTag('TP2 (+10.0%)', yTp2, '#059669');
    drawInChartTag('TP1 (+5.0%)', yTp1, '#16a34a');
    drawInChartTag('ENTRY ZONE', (entryTop + entryBottom) / 2, '#1e40af');
    drawInChartTag('STOP LOSS (-4.0%)', ySl, '#be123c');

    // Y-Axis Badges 
    axisPills.push({ label: `TP2 ${formatPrice(tl.target2, decimals, prefix)}`, targetY: yTp2, bg: '#059669', fg: '#ffffff' });
    axisPills.push({ label: `TP1 ${formatPrice(tl.target1, decimals, prefix)}`, targetY: yTp1, bg: '#16a34a', fg: '#ffffff' });
    axisPills.push({ label: `ENT ${formatPrice((tl.entryMin + tl.entryMax) / 2, decimals, prefix)}`, targetY: (entryTop + entryBottom) / 2, bg: '#1d4ed8', fg: '#ffffff' });
    axisPills.push({ label: `SL  ${formatPrice(tl.stopLoss, decimals, prefix)}`, targetY: ySl, bg: '#be123c', fg: '#ffffff' });
  }

  // Spot Price Badge to Y-Axis
  if (ySpot >= 0 && ySpot <= priceHeight) {
    axisPills.push({ label: `● ${formatPrice(latestCandle.close, decimals, prefix)}`, targetY: ySpot, bg: '#0f172a', fg: '#38bdf8' });
  }

  // Candlesticks & Volume Bars
  const candleCoords = [];

  for (let i = 0; i < candleCount; i++) {
    const c = displayCandles[i];
    const x = i * candleGap + candleGap / 2;

    const openY = priceHeight - ((c.open - paddedMin) / paddedRange) * priceHeight;
    const closeY = priceHeight - ((c.close - paddedMin) / paddedRange) * priceHeight;
    const highY = priceHeight - ((c.high - paddedMin) / paddedRange) * priceHeight;
    const lowY = priceHeight - ((c.low - paddedMin) / paddedRange) * priceHeight;

    const isUp = c.close >= c.open;
    const strokeColor = isUp ? '#166534' : '#9f1239';
    const fillColor = isUp ? '#166534' : '#9f1239';

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    ctx.fillStyle = fillColor;
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(1.8, Math.abs(closeY - openY));
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

    // Volume Bar
    const volH = (c.volume / maxVol) * volumeHeight;
    ctx.fillStyle = isUp ? 'rgba(22, 101, 52, 0.35)' : 'rgba(159, 18, 57, 0.35)';
    ctx.fillRect(x - candleWidth / 2, height - volH, candleWidth, volH);

    candleCoords.push({ x, candle: c });
  }

  // Y-Axis Price Scale Column
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartWidth, 0);
  ctx.lineTo(chartWidth, height);
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(chartWidth + 1, 0, paddingRight - 1, priceHeight);

  // Y-Axis Badges 
  if (axisPills.length > 0) {
    axisPills.sort((a, b) => a.targetY - b.targetY);

    const minSpacing = 19;
    for (let i = 0; i < axisPills.length; i++) {
      axisPills[i].y = Math.max(10, Math.min(priceHeight - 10, axisPills[i].targetY));
    }
    for (let i = 1; i < axisPills.length; i++) {
      if (axisPills[i].y - axisPills[i - 1].y < minSpacing) {
        axisPills[i].y = axisPills[i - 1].y + minSpacing;
      }
    }
    for (let i = axisPills.length - 2; i >= 0; i--) {
      if (axisPills[i + 1].y > priceHeight - 10) {
        axisPills[i + 1].y = priceHeight - 10;
      }
      if (axisPills[i + 1].y - axisPills[i].y < minSpacing) {
        axisPills[i].y = axisPills[i + 1].y - minSpacing;
      }
    }

    axisPills.forEach(p => {
      const badgeH = 16;
      const badgeY = p.y - badgeH / 2;
      const badgeX = chartWidth + 2;
      const badgeW = paddingRight - 4;

      ctx.fillStyle = p.bg;
      ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

      if (Math.abs(p.y - p.targetY) > 2) {
        ctx.strokeStyle = p.bg;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartWidth - 4, p.targetY);
        ctx.lineTo(badgeX, p.y);
        ctx.stroke();
      }

      ctx.fillStyle = p.fg;
      ctx.font = 'bold 9px "ui-monospace, SFMono-Regular, Menlo, monospace"';
      ctx.fillText(p.label, badgeX + 4, badgeY + 11.5);
    });
  }

  // Mouse Drag
  canvas.onmousemove = (e) => {
    if (isDraggingYAxis || isDraggingCanvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    if (mouseX > chartWidth) {
      canvas.style.cursor = 'ns-resize';
      return;
    }
    canvas.style.cursor = 'crosshair';

    let closest = candleCoords[0];
    let minDist = Math.abs(mouseX - closest.x);

    for (let i = 1; i < candleCoords.length; i++) {
      const dist = Math.abs(mouseX - candleCoords[i].x);
      if (dist < minDist) {
        minDist = dist;
        closest = candleCoords[i];
      }
    }

    if (closest) {
      updateOhlcStatusBar(closest.candle, decimals, prefix);
    }
  };

  canvas.onmouseleave = () => {
    if (!isDraggingYAxis && !isDraggingCanvas) {
      updateOhlcStatusBar(candles[candles.length - 1], decimals, prefix);
    }
  };
}
