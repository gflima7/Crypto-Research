let isExporting = false;

function showExportToast(message) {
  let toast = document.getElementById('exportToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'exportToast';
    toast.className = 'fixed bottom-4 right-4 z-50 bg-slate-950 text-white font-mono text-xs px-4 py-2.5 border-2 border-slate-700 shadow-2xl flex items-center gap-2';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>${message}</span>`;
  toast.style.display = 'flex';
}

function hideExportToast() {
  const toast = document.getElementById('exportToast');
  if (toast) {
    setTimeout(() => {
      toast.style.display = 'none';
    }, 1500);
  }
}

async function downloadOutputFile(filePath, defaultFilename) {
  try {
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 2000);
  } catch (err) {
    console.warn('Direct blob download fallback:', err);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = filePath;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 1000);
  }
}

async function triggerBackendExport(ticker, type) {
  const res = await fetch(`/api/export?ticker=${ticker}&type=${type}`);
  if (!res.ok) throw new Error(`Backend export error HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Export error');
  return data.files;
}

export async function exportGroup1(symbol = 'BTC') {
  if (isExporting) return;
  isExporting = true;
  showExportToast('Working');

  try {
    const files = await triggerBackendExport(symbol, 'burst');
    if (files && files.group1) {
      const fileName = files.group1.split('/').pop();
      await downloadOutputFile(`/output/${fileName}`, fileName);
      showExportToast('Group 1 Exported!');
      hideExportToast();
      isExporting = false;
      return;
    }
  } catch (err) {
    console.error('Group 1 export error:', err);
    showExportToast('Export failed. Check console.');
    hideExportToast();
    isExporting = false;
  }
}

export async function exportGroup2(symbol = 'BTC') {
  if (isExporting) return;
  isExporting = true;
  showExportToast('Working');

  try {
    const files = await triggerBackendExport(symbol, 'burst');
    if (files && files.group2) {
      const fileName = files.group2.split('/').pop();
      await downloadOutputFile(`/output/${fileName}`, fileName);
      showExportToast('Group 2 Exported!');
      hideExportToast();
      isExporting = false;
      return;
    }
  } catch (err) {
    console.error('Group 2 export error:', err);
    showExportToast('Export failed.');
    hideExportToast();
    isExporting = false;
  }
}

export async function exportGroup3(symbol = 'BTC') {
  if (isExporting) return;
  isExporting = true;
  showExportToast('Working');

  try {
    const files = await triggerBackendExport(symbol, 'burst');
    if (files && files.group3) {
      const fileName = files.group3.split('/').pop();
      await downloadOutputFile(`/output/${fileName}`, fileName);
      showExportToast('Group 3 Exported!');
      hideExportToast();
      isExporting = false;
      return;
    }
  } catch (err) {
    console.error('Group 3 export error:', err);
    showExportToast('Export failed.');
    hideExportToast();
    isExporting = false;
  }
}

export async function exportAllGroupsBurst(symbol = 'BTC') {
  if (isExporting) return;
  isExporting = true;
  showExportToast('Working');

  try {
    const files = await triggerBackendExport(symbol, 'burst');
    if (files) {
      if (files.group1) {
        const fn1 = files.group1.split('/').pop();
        await downloadOutputFile(`/output/${fn1}`, fn1);
      }
      await new Promise(r => setTimeout(r, 600));

      if (files.group2) {
        const fn2 = files.group2.split('/').pop();
        await downloadOutputFile(`/output/${fn2}`, fn2);
      }
      await new Promise(r => setTimeout(r, 600));

      if (files.group3) {
        const fn3 = files.group3.split('/').pop();
        await downloadOutputFile(`/output/${fn3}`, fn3);
      }

      showExportToast('Exported!');
      hideExportToast();
      isExporting = false;
      return;
    }
  } catch (err) {
    console.error('Burst export error:', err);
    showExportToast('Burst export failed.');
    hideExportToast();
    isExporting = false;
  }
}

export async function exportFullReportPng(symbol = 'BTC') {
  if (isExporting) return;
  isExporting = true;
  showExportToast('Working');

  try {
    const files = await triggerBackendExport(symbol, 'full');
    if (files && files.full) {
      const fn = files.full.split('/').pop();
      await downloadOutputFile(`/output/${fn}`, fn);
      showExportToast('Full Tear Sheet Exported!');
      hideExportToast();
      isExporting = false;
      return;
    }
  } catch (err) {
    console.error('Full export error:', err);
    showExportToast('Full PNG export failed.');
    hideExportToast();
    isExporting = false;
  }
}

export async function exportProgrammaticPdf(symbol = 'BTC') {
  if (isExporting) return;
  isExporting = true;
  showExportToast('Working');

  try {
    const files = await triggerBackendExport(symbol, 'pdf');
    if (files && files.pdf) {
      const fn = files.pdf.split('/').pop();
      await downloadOutputFile(`/output/${fn}`, fn);
      showExportToast('Institutional PDF Exported!');
      hideExportToast();
      isExporting = false;
      return;
    }
  } catch (err) {
    console.error('PDF export error:', err);
    showExportToast('PDF export failed.');
    hideExportToast();
    isExporting = false;
  }
}
