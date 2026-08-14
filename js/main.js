/**
 * Main Application Orchestrator
 */
import { TICKER_CONFIG } from './config/tickers.js';
import { CFTC_CRYPTO_CATALOG, fetchBinanceYtdCandles, buildAssetDataset } from './data/dataset.js';
import { updateHeaderMetadata } from './components/header.js';
import { renderExecutiveDirective } from './components/executiveDirective.js';
import { setupCanvasInteractivity, calculateAndRenderCandles, renderCandleCanvas, resetYAxisScale, setPriceTimeframe } from './components/priceCanvas.js';
import { renderCotSection, resizeCotChart } from './components/cotSection.js';
import { renderGexSection, resizeGexCharts } from './components/gexSection.js';
import { renderRiskProtocol } from './components/riskProtocol.js';
import { renderDominanceSection, setDominanceTimeframe, resizeDominanceChart } from './components/dominanceSection.js';
import { 
  exportGroup1, 
  exportGroup2, 
  exportGroup3, 
  exportAllGroupsBurst, 
  exportFullReportPng, 
  exportProgrammaticPdf 
} from './utils/exporter.js';

let currentTickerKey = 'BTC';
let candleData = [];

window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }

  setupCanvasInteractivity(() => currentTickerKey);
  loadTicker(currentTickerKey);

  window.addEventListener('resize', () => {
    if (candleData.length > 0) {
      const tData = TICKER_CONFIG[currentTickerKey] || TICKER_CONFIG['BTC'];
      renderCandleCanvas(candleData, tData.decimals, tData.prefix);
    }
    resizeCotChart();
    resizeGexCharts();
    resizeDominanceChart();
  });
});

export function changeTicker(key) {
  currentTickerKey = key;
  resetYAxisScale();
  loadTicker(key);
}

export async function syncData() {
  const icon = document.getElementById('syncIcon');
  if (icon) icon.classList.add('animate-spin');
  await loadTicker(currentTickerKey);
  setTimeout(() => {
    if (icon) icon.classList.remove('animate-spin');
  }, 600);
}

export async function loadTicker(key) {
  const assetConfig = CFTC_CRYPTO_CATALOG[key] || CFTC_CRYPTO_CATALOG['BTC'];

  candleData = await fetchBinanceYtdCandles(assetConfig.symbol, assetConfig.scaleRatio);

  let liveSpot = 65000;
  let live24hChange = 0.5;

  if (candleData && candleData.length > 0) {
    const latest = candleData[candleData.length - 1];
    const prev = candleData[candleData.length - 2] || latest;
    liveSpot = latest.close;
    live24hChange = ((latest.close - prev.close) / prev.close) * 100;
  }

  const data = buildAssetDataset(key, liveSpot, live24hChange);

  updateHeaderMetadata(data);
  renderExecutiveDirective(data);
  renderCotSection(data.cot);
  renderGexSection(data.gex, data.vol, data.prefix);
  renderRiskProtocol(data);
  renderDominanceSection(key, data);

  if (candleData && candleData.length > 0) {
    calculateAndRenderCandles(candleData, data.decimals, data.prefix, data.tradeLevels);
  }
}

// Global window bindings
window.changeTicker = changeTicker;
window.syncData = syncData;
window.resetYAxisScale = resetYAxisScale;
window.setDominanceTimeframe = setDominanceTimeframe;
window.setPriceTimeframe = setPriceTimeframe;

// Export bindings
window.exportGroup1 = () => exportGroup1(currentTickerKey);
window.exportGroup2 = () => exportGroup2(currentTickerKey);
window.exportGroup3 = () => exportGroup3(currentTickerKey);
window.exportAllGroupsBurst = () => exportAllGroupsBurst(currentTickerKey);
window.exportFullReportPng = () => exportFullReportPng(currentTickerKey);
window.exportProgrammaticPdf = () => exportProgrammaticPdf(currentTickerKey);
window.printReport = () => window.print();

window.toggleExportMenu = () => {
  const menu = document.getElementById('exportDropdownMenu');
  if (menu) menu.classList.toggle('hidden');
};

window.addEventListener('click', (e) => {
  const btn = document.getElementById('exportMenuBtn');
  const menu = document.getElementById('exportDropdownMenu');
  if (menu && !menu.classList.contains('hidden') && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
    menu.classList.add('hidden');
  }
});
