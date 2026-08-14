let chartInstanceCot = null;

export function renderCotSection(cotData) {

  const oiEl = document.getElementById('metricTotalOi');
  const retEl = document.getElementById('metricRetailNet');
  const top4El = document.getElementById('metricTop4Conc');
  const top8El = document.getElementById('metricTop8Conc');

  if (oiEl) oiEl.textContent = cotData.totalOi.toLocaleString();
  if (retEl) retEl.textContent = cotData.retailNet;
  if (top4El) top4El.textContent = cotData.top4;
  if (top8El) top8El.textContent = cotData.top8;

  renderCotTable(cotData.table);
  renderCotBarChart(cotData.table);
}

export function renderCotTable(tableData) {
  const tbody = document.getElementById('cotTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  tableData.forEach(row => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition-colors';

    const isNetPos = row.net >= 0;
    const netBadgeClass = isNetPos
      ? 'bg-slate-100 text-slate-900 border-slate-300'
      : 'bg-slate-100 text-slate-900 border-slate-300';

    tr.innerHTML = `
      <td class="p-2 font-bold border-r border-slate-200 text-slate-900">${row.category}</td>
      <td class="p-2 text-right border-r border-slate-200 text-slate-800">${row.long.toLocaleString()}</td>
      <td class="p-2 text-right border-r border-slate-200 text-slate-800">${row.short.toLocaleString()}</td>
      <td class="p-2 text-right border-r border-slate-200 text-slate-500">${row.spread > 0 ? row.spread.toLocaleString() : '-'}</td>
      <td class="p-2 text-right border-r border-slate-200">
        <span class="px-2 py-0.5 font-bold border ${netBadgeClass}">
          ${isNetPos ? '+' : ''}${row.net.toLocaleString()}
        </span>
      </td>
      <td class="p-2 text-right border-r border-slate-200 text-slate-700">${row.oiPct}</td>
      <td class="p-2">
        <div class="flex items-center gap-2 justify-center">
          <span class="w-8 text-right font-bold text-slate-800">${row.pctile}%</span>
          <div class="w-16 bg-slate-200 h-2 border border-slate-300">
            <div class="h-full bg-slate-700" style="width: ${row.pctile}%"></div>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

export function renderCotBarChart(tableData) {
  const chartCanvas = document.getElementById('cotBarChart');
  if (!chartCanvas) return;

  const ctx = chartCanvas.getContext('2d');
  if (chartInstanceCot) chartInstanceCot.destroy();

  const labels = tableData.map(r => r.category.split(' ')[0]);
  const longs = tableData.map(r => r.long);
  const shorts = tableData.map(r => r.short);

  chartInstanceCot = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Gross Long',
          data: longs,
          backgroundColor: '#166534',
          borderColor: '#0f172a',
          borderWidth: 1,
          barPercentage: 0.65,
        },
        {
          label: 'Gross Short',
          data: shorts,
          backgroundColor: '#9f1239',
          borderColor: '#0f172a',
          borderWidth: 1,
          barPercentage: 0.65,
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

export function resizeCotChart() {
  if (chartInstanceCot) chartInstanceCot.resize();
}
