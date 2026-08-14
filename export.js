import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8000;

export async function generateExports(ticker = 'BTC', options = { burst: true, pdf: true, full: true }) {
  const outDir = path.resolve('output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0' });

  // Select ticker and load
  await page.evaluate((t) => {
    const sel = document.getElementById('tickerSelect');
    if (sel) {
      sel.value = t;
      if (window.changeTicker) window.changeTicker(t);
    }
  }, ticker);

  // Wait for fonts, live candles, and Chart.js to settle
  await page.evaluateHandle('document.fonts.ready');
  await new Promise(r => setTimeout(r, 1200));

  const dateStr = new Date().toISOString().split('T')[0];
  const results = {};

  // Clean UI for screenshot (hide no-print buttons and export toast)
  await page.evaluate(() => {
    document.querySelectorAll('.no-print').forEach(el => el.style.display = 'none');
    const toast = document.getElementById('exportToast');
    if (toast) toast.style.display = 'none';
  });

  const container = await page.$('#reportContainer');

  if (options.burst) {
    // === GROUP 1: Header + Section 1 & Price Chart ===
    await page.evaluate(() => {
      document.getElementById('sec1Block').style.display = 'block';
      document.getElementById('sec2Block').style.display = 'none';
      document.getElementById('sec3Block').style.display = 'none';
      document.getElementById('sec4And5Block').style.display = 'none';
      window.dispatchEvent(new Event('resize'));
    });
    await new Promise(r => setTimeout(r, 150));

    const g1Path = path.join(outDir, `THE_TRADE_CAT_${ticker}_1_Directive_Chart_${dateStr}.png`);
    await container.screenshot({ path: g1Path });
    results.group1 = g1Path;
    console.log(`[✓] Group 1 exported: ${g1Path}`);

    // === GROUP 2: Header + Section 2 (COT) + Section 3 (GEX) ===
    await page.evaluate(() => {
      document.getElementById('sec1Block').style.display = 'none';
      document.getElementById('sec2Block').style.display = 'block';
      document.getElementById('sec3Block').style.display = 'block';
      document.getElementById('sec4And5Block').style.display = 'none';
      window.dispatchEvent(new Event('resize'));
    });
    await new Promise(r => setTimeout(r, 150));

    const g2Path = path.join(outDir, `THE_TRADE_CAT_${ticker}_2_COT_GEX_${dateStr}.png`);
    await container.screenshot({ path: g2Path });
    results.group2 = g2Path;
    console.log(`[✓] Group 2 exported: ${g2Path}`);

    // === GROUP 3: Header + Section 4 (Risk) + Section 5 (Dominance) ===
    await page.evaluate(() => {
      document.getElementById('sec1Block').style.display = 'none';
      document.getElementById('sec2Block').style.display = 'none';
      document.getElementById('sec3Block').style.display = 'none';
      document.getElementById('sec4And5Block').style.display = 'block';
      window.dispatchEvent(new Event('resize'));
    });
    await new Promise(r => setTimeout(r, 150));

    const g3Path = path.join(outDir, `THE_TRADE_CAT_${ticker}_3_Risk_Dominance_${dateStr}.png`);
    await container.screenshot({ path: g3Path });
    results.group3 = g3Path;
    console.log(`[✓] Group 3 exported: ${g3Path}`);
  }

  // Restore all sections
  await page.evaluate(() => {
    document.getElementById('sec1Block').style.display = 'block';
    document.getElementById('sec2Block').style.display = 'block';
    document.getElementById('sec3Block').style.display = 'block';
    document.getElementById('sec4And5Block').style.display = 'block';
    window.dispatchEvent(new Event('resize'));
  });
  await new Promise(r => setTimeout(r, 150));

  if (options.full) {
    const fullPath = path.join(outDir, `THE_TRADE_CAT_${ticker}_Full_Tear_Sheet_${dateStr}.png`);
    await container.screenshot({ path: fullPath });
    results.full = fullPath;
    console.log(`[✓] Full report exported: ${fullPath}`);
  }

  if (options.pdf) {
    const pdfPath = path.join(outDir, `THE_TRADE_CAT_${ticker}_Institutional_Report_${dateStr}.pdf`);
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' }
    });
    results.pdf = pdfPath;
    console.log(`[✓] PDF report exported: ${pdfPath}`);
  }

  await browser.close();
  return results;
}

// CLI direct run
if (process.argv[1] && process.argv[1].endsWith('export.js')) {
  const args = process.argv.slice(2);
  const tickerArg = args[0] || 'BTC';
  console.log(`Starting headless Chrome export for ${tickerArg}...`);
  generateExports(tickerArg)
    .then((res) => console.log('Export complete:', res))
    .catch((err) => { console.error('Export failed:', err); process.exit(1); });
}
