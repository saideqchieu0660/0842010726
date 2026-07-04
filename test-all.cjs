const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('response', response => {
    if (response.url().includes('StudentDashboard')) {
      console.log(`Loaded ${response.url()}`);
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  await page.evaluateOnNewDocument(() => {
    window.sessionStorage.setItem("isAdminMode", "false");
    window.sessionStorage.setItem("guest_redirect_path", "/dashboard");
  });

  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
