const puppeteer = require('puppeteer');
const fs = require('fs');

function sleep(seconds) {
  console.log(`Sleeping for ${seconds} seconds...`);
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function go() {
  console.log("Starting Indeed UK test");
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

  const browser = useScrapingBrowser
    ? await puppeteer.connect({
      browserWSEndpoint: `wss://${userNameAndPassword}@brd.superproxy.io:9222`,
    })
    : await puppeteer.launch();

  try {
    const page = await browser.newPage();

    if (blockImages) {
      console.log("Blocking images...");
      await page.setRequestInterception(true);

      // Listen for requests
      page.on('request', (request) => {
        if (request.resourceType() === 'image') {
          // If the request is for an image, block it
          console.log("  Blocked an image!");
          request.abort();
        } else {
          // If it's not an image request, allow it to continue
          request.continue();
        }
      });
    }

    console.log("Going to Indeed UK...");
    const client = await page.target().createCDPSession();
    await page.goto("https://indeed.co.uk");

    try {
      const {status} = await client.send('Captcha.solve', {detectTimeout: 30 * 1000});
      console.log(`Captcha solve status: ${status}`)
    } catch (e) {
      console.error('Captcha.solve failed:', e);
    }

    console.log('Taking screenshot...');
    const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, -5);
    await page.screenshot({path: `screenshot-2-${timestamp}.png`, fullPage: true});

    console.log('Saving source...');
    const html = await page.content();
    fs.writeFile(`source-2-${timestamp}.html`, html, err => {
      if (err) throw err;
      console.log('Source saved!');
    });

    /*
        console.log('Looking for \'what\' field...');
        const fieldWhat = await page.locator('#text-input-what');

        console.log('Entering data...');
        await fieldWhat.fill('java developer');

        console.log('Looking for \'where\' field...');
        const fieldWhere = await page.locator('#text-input-where');

        console.log('Submitting query...');
        await fieldWhere.submit();

        console.log('Looking for results...');
        const results = await page.locator('jobsearch-JobCountAndSortPane-jobCount');

        console.log("Results: " + await results.textContent());
    */

    await sleep(20);

  } finally {
    console.log("Closing browser...");
    await browser.close();
    console.log("");
    console.log("Done.");
  }

}

go();
