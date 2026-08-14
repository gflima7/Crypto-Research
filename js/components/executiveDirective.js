export function evaluateRuleBasedDirectives(cotData, gexData, spotPrice, isLongDirection) {
  const ctaRow = cotData.table.find(r => r.category.includes('Managed Money')) || { pctile: 50, net: 0 };
  const ctaPercentile = ctaRow.pctile;

  let direction = isLongDirection ? 'LONG' : 'SHORT';
  let remark = '';

  if (isLongDirection) {
    remark = `Managed Money CTAs hold net long positioning at the ${ctaPercentile}th 52-week percentile. Dealer Long Gamma regime above pivot (${gexData.zeroPivot}) dampens downside volatility. Retail net bias (${cotData.retailNet}) provides liquidity support toward Call Wall resistance at ${gexData.callWall}.`;
  } else {
    remark = `Managed Money CTAs positioned defensive at the ${ctaPercentile}th percentile. Dealer Short Gamma regime below pivot (${gexData.zeroPivot}) amplifies downside price acceleration toward Put Wall support at ${gexData.putWall}. Retail net bias (${cotData.retailNet}) increases downside vulnerability.`;
  }

  return { direction, remark };
}

export function renderExecutiveDirective(data) {
  const ruleResult = evaluateRuleBasedDirectives(data.cot, data.gex, data.spotPrice, data.isLongDirection);
  const d = data.directive;

  const dirBadge = document.getElementById('directiveBadgeDirection');
  if (dirBadge) {
    dirBadge.textContent = ruleResult.direction === 'LONG' ? 'BULLISH / LONG' : 'BEARISH / SHORT';
    dirBadge.className = 'font-bold px-2 py-0.5 bg-slate-100 text-slate-900 border border-slate-300 uppercase';
  }

  const horizonEl = document.getElementById('directiveBadgeHorizon');
  if (horizonEl) horizonEl.textContent = 'HORIZON: ' + d.timeHorizon;

  const dirEl = document.getElementById('dirDirection');
  if (dirEl) dirEl.textContent = ruleResult.direction;

  const entryEl = document.getElementById('dirEntry');
  if (entryEl) entryEl.textContent = d.entry;

  const t1El = document.getElementById('dirTarget1');
  if (t1El) t1El.textContent = d.target1;

  const t2El = document.getElementById('dirTarget2');
  if (t2El) t2El.textContent = d.target2;

  const slEl = document.getElementById('dirStopLoss');
  if (slEl) slEl.textContent = d.stopLoss;

  const rrEl = document.getElementById('dirRR');
  if (rrEl) rrEl.textContent = d.rr;

  const remarkEl = document.getElementById('directiveFindingsText');
  if (remarkEl) remarkEl.textContent = ruleResult.remark;

  const rrBreakdownEl = document.getElementById('rrCalculationBreakdown');
  if (rrBreakdownEl) rrBreakdownEl.innerHTML = data.rrBreakdownHtml;
}
