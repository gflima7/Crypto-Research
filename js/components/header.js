import { formatPrice } from '../utils/formatters.js';

export function updateHeaderMetadata(data) {
  const codeEl = document.getElementById('metaCftcCode');
  const dateEl = document.getElementById('metaReleaseDate');
  const spotEl = document.getElementById('metaSpotPrice');
  const domEl = document.getElementById('metaDominance');
  const changeEl = document.getElementById('metaPriceChange');

  if (codeEl) codeEl.textContent = data.cftcCode;
  if (dateEl) dateEl.textContent = data.releaseDate;
  if (spotEl) spotEl.textContent = formatPrice(data.spotPrice, data.decimals, data.prefix);
  if (domEl) domEl.textContent = `${data.dominance} (${data.rank} RANK)`;

  if (changeEl) {
    changeEl.textContent = data.priceChange;
    changeEl.className = 'text-xs font-bold px-1.5 py-0.5 bg-slate-900 text-slate-100 border border-slate-700';
  }
}
