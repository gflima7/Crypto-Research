export function renderRiskProtocol(data) {
  const ex = data.exec;

  const entryEl = document.getElementById('execEntryText');
  const invEl = document.getElementById('execInvalidationText');
  const t1El = document.getElementById('execT1Val');
  const t2El = document.getElementById('execT2Val');

  if (entryEl) entryEl.textContent = ex.entry;
  if (invEl) invEl.textContent = ex.invalidation;
  if (t1El) t1El.textContent = ex.t1;
  if (t2El) t2El.textContent = ex.t2;

  const tt = data.tooltipData;
  const badgeEl = document.getElementById('tooltipMethodBadge');
  const typeEl = document.getElementById('tooltipFormulaType');
  const codeEl = document.getElementById('tooltipFormulaCode');
  const reasoningEl = document.getElementById('tooltipReasoningText');

  if (badgeEl) badgeEl.textContent = tt.methodBadge;
  if (typeEl) typeEl.textContent = tt.formulaType;
  if (codeEl) codeEl.textContent = tt.formulaCode;
  if (reasoningEl) reasoningEl.textContent = tt.reasoningText;
}
