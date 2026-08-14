import { MACRO_DOMINANCE_DATA } from '../data/dataset.js';

let chartInstanceDominance = null;
let selectedDomTimeframe = '5Y';

export function renderDominanceSection(key, data) {
  const tickerBase = key.replace('M', '');
  const labelEl = document.getElementById('selectedAssetDomLabel');
  const capEl = document.getElementById('domEstCap');

  if (labelEl) labelEl.textContent = `${tickerBase} DOMINANCE: ${data.dominance} (${data.rank} RANK)`;
  if (capEl) capEl.textContent = data.mcapEst;

  loadLiveStatisticalCorrelations();
}

export function setDominanceTimeframe(tf) {
  selectedDomTimeframe = tf;
  ['1Y', '3Y', '5Y'].forEach(t => {
    const btn = document.getElementById(`btnDom${t}`);
    if (btn) {
      if (t === tf) {
        btn.className = 'px-2 py-0.5 bg-slate-900 border border-slate-950 font-bold text-white cursor-pointer';
      } else {
        btn.className = 'px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 font-bold text-slate-700 cursor-pointer';
      }
    }
  });
  renderDominanceTimeSeriesChart();
}

export function renderDominanceTimeSeriesChart() {
  const chartCanvas = document.getElementById('dominanceTimeSeriesChart');
  if (!chartCanvas) return;

  const ctx = chartCanvas.getContext('2d');
  if (chartInstanceDominance) chartInstanceDominance.destroy();

  const dataset = MACRO_DOMINANCE_DATA[selectedDomTimeframe] || MACRO_DOMINANCE_DATA['5Y'];

  chartInstanceDominance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataset.labels,
      datasets: [
        {
          label: 'Bitcoin (BTC)',
          data: dataset.btc,
          borderColor: '#d97706',
          backgroundColor: 'rgba(217, 119, 6, 0.05)',
          borderWidth: 2.5,
          tension: 0.25,
          pointRadius: 3
        },
        {
          label: 'Ethereum (ETH)',
          data: dataset.eth,
          borderColor: '#2563eb',
          borderWidth: 2,
          tension: 0.25,
          pointRadius: 2
        },
        {
          label: 'Solana (SOL)',
          data: dataset.sol,
          borderColor: '#059669',
          borderWidth: 1.5,
          borderDash: [3, 3],
          tension: 0.25,
          pointRadius: 2
        },
        {
          label: 'Others (EX-TOP 3)',
          data: dataset.others,
          borderColor: '#64748b',
          borderWidth: 1.5,
          borderDash: [5, 5],
          tension: 0.25,
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'ui-monospace, SFMono-Regular, Menlo, monospace', size: 10 }, color: '#0f172a', boxWidth: 12 }
        }
      },
      scales: {
        x: { ticks: { font: { family: 'ui-monospace, SFMono-Regular, Menlo, monospace', size: 9 }, color: '#334155' } },
        y: { ticks: { font: { family: 'ui-monospace, SFMono-Regular, Menlo, monospace', size: 9 }, color: '#334155' } }
      }
    }
  });
}

function calculateLogReturns(prices) {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    } else {
      returns.push(0);
    }
  }
  return returns;
}

function computePearsonCorrelationAndBeta(returnsX, returnsY) {
  const n = Math.min(returnsX.length, returnsY.length);
  if (n < 3) return { r: 0, beta: 0, cov: 0, stdX: 0, stdY: 0 };

  const sliceX = returnsX.slice(returnsX.length - n);
  const sliceY = returnsY.slice(returnsY.length - n);

  const meanX = sliceX.reduce((a, b) => a + b, 0) / n;
  const meanY = sliceY.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = sliceX[i] - meanX;
    const dy = sliceY[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const stdX = Math.sqrt(denX / (n - 1));
  const stdY = Math.sqrt(denY / (n - 1));

  const den = Math.sqrt(denX * denY);
  const r = den === 0 ? 0 : num / den;

  const varX = denX / (n - 1);
  const cov = num / (n - 1);
  const beta = varX === 0 ? 0 : cov / varX;

  return { r, beta, cov, stdX, stdY };
}

export async function loadLiveStatisticalCorrelations() {
  const tbody = document.getElementById('correlationTableBody');
  if (!tbody) return;

  try {
    const ytdStartTime = new Date('2026-01-01T00:00:00Z').getTime();

    // Fetch live daily close from Binance
    const [btcRes, ethRes, solRes, xrpRes] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&startTime=${ytdStartTime}&limit=300`).then(r => r.json()),
      fetch(`https://api.binance.com/api/v3/klines?symbol=ETHUSDT&interval=1d&startTime=${ytdStartTime}&limit=300`).then(r => r.json()),
      fetch(`https://api.binance.com/api/v3/klines?symbol=SOLUSDT&interval=1d&startTime=${ytdStartTime}&limit=300`).then(r => r.json()),
      fetch(`https://api.binance.com/api/v3/klines?symbol=XRPUSDT&interval=1d&startTime=${ytdStartTime}&limit=300`).then(r => r.json())
    ]);

    const btcCloses = btcRes.map(k => parseFloat(k[4]));
    const ethCloses = ethRes.map(k => parseFloat(k[4]));
    const solCloses = solRes.map(k => parseFloat(k[4]));
    const xrpCloses = xrpRes.map(k => parseFloat(k[4]));

    const btcReturns = calculateLogReturns(btcCloses);
    const ethReturns = calculateLogReturns(ethCloses);
    const solReturns = calculateLogReturns(solCloses);
    const xrpReturns = calculateLogReturns(xrpCloses);

    const altIndexReturns = [];
    const minLen = Math.min(btcReturns.length, ethReturns.length, solReturns.length, xrpReturns.length);
    for (let i = 0; i < minLen; i++) {
      altIndexReturns.push(
        0.5 * ethReturns[ethReturns.length - minLen + i] +
        0.3 * solReturns[solReturns.length - minLen + i] +
        0.2 * xrpReturns[xrpReturns.length - minLen + i]
      );
    }

    const btcTrimmed = btcReturns.slice(btcReturns.length - minLen);

    const pairs = [
      { name: 'ETH / BTC PAIR', returns: ethReturns.slice(ethReturns.length - minLen), label: 'Ethereum' },
      { name: 'SOL / BTC PAIR', returns: solReturns.slice(solReturns.length - minLen), label: 'Solana' },
      { name: 'XRP / BTC PAIR', returns: xrpReturns.slice(xrpReturns.length - minLen), label: 'Ripple' },
      { name: 'ALTINDEX / BTC', returns: altIndexReturns, label: 'Top 100 Altcoins' }
    ];

    tbody.innerHTML = '';
    let altWarmingUpCount = 0;

    pairs.forEach(p => {
      const btc30D = btcTrimmed.slice(btcTrimmed.length - 30);
      const pair30D = p.returns.slice(p.returns.length - 30);
      const stats30D = computePearsonCorrelationAndBeta(btc30D, pair30D);

      const btc7D = btcTrimmed.slice(btcTrimmed.length - 7);
      const pair7D = p.returns.slice(p.returns.length - 7);
      const stats7D = computePearsonCorrelationAndBeta(btc7D, pair7D);

      const sumAlt7D = pair7D.reduce((a, b) => a + b, 0);
      const sumBtc7D = btc7D.reduce((a, b) => a + b, 0);
      const alpha7D = (Math.exp(sumAlt7D) - Math.exp(sumBtc7D)) * 100;

      const deltaR = stats7D.r - stats30D.r;

      let statusTag = 'NEUTRAL / COUPLED';
      let tagClass = 'text-slate-700 bg-slate-100 border-slate-300';

      if (deltaR < -0.10 && alpha7D > 0) {
        statusTag = 'OUTPERFORMING / WARMING UP';
        tagClass = 'text-emerald-900 bg-emerald-100 border-emerald-400 font-bold';
        altWarmingUpCount++;
      } else if (alpha7D > 2.0) {
        statusTag = 'OUTPERFORMING';
        tagClass = 'text-emerald-900 bg-emerald-100 border-emerald-400 font-bold';
        altWarmingUpCount++;
      } else if (deltaR < -0.15) {
        statusTag = 'DECOUPLING WEAKNESS';
        tagClass = 'text-rose-900 bg-rose-100 border-rose-400 font-bold';
      }

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition-colors font-mono text-xs';
      tr.innerHTML = `
        <td class="p-2.5 font-bold border-r border-slate-200 text-slate-950">
          ${p.name}
          <span class="block text-[10px] text-slate-500 font-normal font-sans">${p.label}</span>
        </td>
        <td class="p-2.5 text-center border-r border-slate-200 font-semibold text-slate-900">
          ${stats30D.beta.toFixed(2)}
        </td>
        <td class="p-2.5 text-right border-r border-slate-200 text-slate-900">
          ${stats30D.r >= 0 ? '+' : ''}${stats30D.r.toFixed(2)}
        </td>
        <td class="p-2.5 text-right border-r border-slate-200 font-bold text-slate-950">
          ${stats7D.r >= 0 ? '+' : ''}${stats7D.r.toFixed(2)}
        </td>
        <td class="p-2.5 text-right border-r border-slate-200">
          <span class="inline-block px-2 py-0.5 leading-tight font-bold border ${deltaR < 0 ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-slate-100 text-slate-900 border-slate-300'}">
            ${deltaR >= 0 ? '+' : ''}${deltaR.toFixed(2)}
          </span>
        </td>
        <td class="p-2.5 text-right border-r border-slate-200">
          <span class="inline-block px-2 py-0.5 leading-tight font-bold border ${alpha7D >= 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-rose-50 text-rose-900 border-rose-300'}">
            ${alpha7D >= 0 ? '+' : ''}${alpha7D.toFixed(2)}%
          </span>
        </td>
        <td class="p-2.5 text-center">
          <span class="inline-block px-2 py-0.5 leading-tight text-[10px] uppercase border ${tagClass}">
            ${statusTag}
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });

    const badge = document.getElementById('corrSentimentBadge');
    if (badge) {
      if (altWarmingUpCount >= 2) {
        badge.textContent = 'ALTCOIN ROTATION: WARMING UP (STATISTICAL DIVERGENCE DETECTED)';
        badge.className = 'font-mono text-xs font-bold px-2 py-0.5 bg-slate-900 text-amber-300 border border-slate-800 uppercase';
      } else {
        badge.textContent = 'SYSTEMIC BTC COUPLING (DOMINANCE REGIME)';
        badge.className = 'font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-900 border border-slate-300 uppercase';
      }
    }

    renderDominanceTimeSeriesChart();
    loadRegimeResearchJson();

  } catch (err) {
    console.warn('Error loading live statistical correlations:', err);
    tbody.innerHTML = '<tr><td colspan="7" class="text-center p-3 text-rose-700 font-mono text-xs">COULD NOT LOAD LIVE STATISTICAL CORRELATIONS</td></tr>';
  }
}

export async function loadRegimeResearchJson() {
  try {
    const res = await fetch('regime_research.json');
    if (!res.ok) throw new Error('regime_research.json not found');
    const json = await res.json();

    const titleEl = document.getElementById('jsonRegimeTitle');
    if (titleEl) titleEl.textContent = `FUNDAMENTAL CATALYSTS: ${json.regime_title || 'Altcoin Macro Motives'}`;

    if (json.key_drivers && json.key_drivers.length > 0) {
      const driversContainer = document.getElementById('jsonKeyDriversContainer');
      if (driversContainer) {
        driversContainer.innerHTML = json.key_drivers.map(d => `
          <div class="border border-slate-200 bg-slate-50 p-2.5 space-y-1">
            <h5 class="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span class="w-2 h-2 bg-slate-900 inline-block"></span>
              ${d.title}
            </h5>
            <p class="text-slate-700 text-xs leading-relaxed pl-3.5">
              ${d.description}
            </p>
          </div>
        `).join('');
      }
    }

    if (json.invalidation_triggers && json.invalidation_triggers.length > 0) {
      const triggersList = document.getElementById('jsonTriggersList');
      if (triggersList) {
        triggersList.innerHTML = json.invalidation_triggers.map(t => `<li>${t}</li>`).join('');
      }
    }
  } catch (err) {
    console.warn('Using static built-in research fallback:', err);
  }
}

export function resizeDominanceChart() {
  if (chartInstanceDominance) chartInstanceDominance.resize();
}
