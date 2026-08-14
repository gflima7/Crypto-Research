/**
 * Utility Formatting Functions
 */

export function formatPrice(val, decimals = 2, prefix = '$') {
  if (val === undefined || val === null || isNaN(val)) return '-';
  return prefix + val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatVolume(val) {
  if (val === undefined || val === null || isNaN(val)) return '0';
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
  return val.toString();
}

export function roundVal(val, decimals = 2) {
  if (val === undefined || val === null || isNaN(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

export function formatPercent(val, showSign = true) {
  if (val === undefined || val === null || isNaN(val)) return '0.00%';
  const formatted = val.toFixed(2) + '%';
  if (showSign && val > 0) return '+' + formatted;
  return formatted;
}
