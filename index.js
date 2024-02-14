const {chromium} = require('playwright');

function sleep(seconds) {
  console.log(`Sleeping for ${seconds} seconds...`);
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function go() {
  console.log("Starting image blocking test");
  console.log("");

  const args = process.argv.slice(2);
  let blockImages = true;
  let useScrapingBrowser = false;
  let userNameAndPassword = null;

  args.forEach(arg => {
    if (arg === "allow") {
      blockImages = false;
    } else {
      userNameAndPassword = arg;
      useScrapingBrowser = true;
    }
  });

  console.log(`Block images: ${blockImages}, use Scraping Browser: ${useScrapingBrowser}`);
  console.log(`Setting up browser...`)

  /*
    const chromeOptions = new Options();

    if (blockImages) {
      const prefs = {"profile.managed_default_content_settings.images": 2};
      chromeOptions.setUserPreferences(prefs);
    }

  */

  const browser = useScrapingBrowser
    ? await chromium.connectOverCDP(`wss://${userNameAndPassword}@brd.superproxy.io:9222`)
    : await chromium.launch();


  try {
    let page = null;

    if (blockImages) {
      console.log(`Configuring browser to block images...`)
      const context = await browser.newContext({
        fetchResourceTypesToBlock: ['image', 'font']
      });
      page = await context.newPage();
    } else {
      page = await browser.newPage();
    }

    console.log("Going to Wikipedia...");
    await page.goto("https://en.wikipedia.com");

    console.log('Taking screenshot...');
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, -5);
    await page.screenshot({path: `screenshot-${timestamp}.png`, fullPage: true});

    await sleep(20);

  } finally {
    console.log("Closing browser...");
    await browser.close();
    console.log("");
    console.log("Done.");
  }

}

go();
