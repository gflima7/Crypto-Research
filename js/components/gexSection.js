let chartInstanceGex = null;
let chartInstanceVol = null;

export function renderGexSection(gexData, volData, prefix) {
  // GEX Metrics
  const regEl = document.getElementById('gexRegimeBadge');
  const callEl = document.getElementById('gexCallWall');
  const zeroEl = document.getElementById('gexZeroPivot');
  const putEl = document.getElementById('gexPutWall');
  const netEl = document.getElementById('gexNetM');

  if (regEl) regEl.textContent = gexData.regime;
  if (callEl) callEl.textContent = gexData.callWall;
  if (zeroEl) zeroEl.textContent = gexData.zeroPivot;
  if (putEl) putEl.textContent = gexData.putWall;
  if (netEl) netEl.textContent = gexData.netM;

  renderGexStrikeChart(gexData.strikes, prefix);

  // Volatility Metrics
  const riskEl = document.getElementById('volRiskBadge');
  const ratioEl = document.getElementById('volRatio');
  const ivEl = document.getElementById('volIvRank');
  const hvEl = document.getElementById('volHvVal');

  if (riskEl) riskEl.textContent = volData.riskBadge;
  if (ratioEl) ratioEl.textContent = volData.ratio;
  if (ivEl) ivEl.textContent = volData.ivRank;
  if (hvEl) hvEl.textContent = volData.hvVal;

  renderVolChart(volData.history);
}

export function renderGexStrikeChart(strikes, prefix) {
  const chartCanvas = document.getElementById('gexStrikeChart');
  if (!chartCanvas) return;

  const ctx = chartCanvas.getContext('2d');
  if (chartInstanceGex) chartInstanceGex.destroy();

  const labels = strikes.map(s => prefix + s.strike.toLocaleString());
  const callData = strikes.map(s => s.call);
  const putData = strikes.map(s => s.put);

  chartInstanceGex = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Call GEX ($M)',
          data: callData,
          backgroundColor: '#166534',
          borderColor: '#0f172a',
          borderWidth: 1
        },
        {
          label: 'Put GEX ($M)',
          data: putData,
          backgroundColor: '#9f1239',
          borderColor: '#0f172a',
          borderWidth: 1
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { family: 'ui-monospace, SFMono-Regular, Menlo, monospace', size: 9.5 }, color: '#0f172a', boxWidth: 10 }
        }
      },
      scales: {
        x: {
          ticks: { font: { family: 'ui-monospace, SFMono-Regular, Menlo, monospace', size: 8.5 }, color: '#334155' },
          grid: { color: '#e2e8f0' }
        },
        y: {
          ticks: { font: { family: 'ui-monospace, SFMono-Regular, Menlo, monospace', size: 8.5 }, color: '#334155' }
        }
      }
    }
  });
}

export function renderVolChart(volHistory) {
  const chartCanvas = document.getElementById('volChart');
  if (!chartCanvas) return;

  const ctx = chartCanvas.getContext('2d');
  if (chartInstanceVol) chartInstanceVol.destroy();

  const labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];
  const hvSeries = volHistory.map(v => Math.round(v * 0.82));

  chartInstanceVol = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '30D Implied Vol (IV)',
          data: volHistory,
          borderColor: '#1e3a8a',
          backgroundColor: 'rgba(30, 58, 138, 0.04)',
          borderWidth: 2,
          tension: 0.2,
          pointRadius: 2
        },
        {
          label: '30D Realized Vol (HV)',
          data: hvSeries,
          borderColor: '#64748b',
          borderWidth: 1.5,
          borderDash: [4, 4],
          tension: 0.2,
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

export function resizeGexCharts() {
  if (chartInstanceGex) chartInstanceGex.resize();
  if (chartInstanceVol) chartInstanceVol.resize();
}
