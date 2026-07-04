const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`HTTP ${response.status()} ${response.url()}`);
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  await page.evaluateOnNewDocument(() => {
    // Override navigate to dashboard for testing
    window.sessionStorage.setItem("isAdminMode", "false");
    window.sessionStorage.setItem("guest_redirect_path", "/dashboard");
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
