const puppeteer = require('puppeteer');
const fs = require('fs');

function sleep(seconds) {
  console.log(`Sleeping for ${seconds} seconds...`);
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function go() {
  console.log('Starting Indeed UK test');
  console.log('');

  const args = process.argv.slice(2);
  let blockImages = true;
  let useScrapingBrowser = false;
  let userNameAndPassword = null;

  args.forEach(arg => {
    if (arg === 'allow') {
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

  let page = null;

  try {
    page = await browser.newPage();

    if (blockImages) {
      console.log('Blocking images...');
      await page.setRequestInterception(true);

      // Listen for requests
      page.on('request', (request) => {
        if (request.resourceType() === 'image') {
          // If the request is for an image, block it
          console.log('  Blocked an image!');
          request.abort();
        } else {
          // If it's not an image request, allow it to continue
          request.continue();
        }
      });
    }

    console.log('Going to Indeed UK...');
    const client = await page.target().createCDPSession();
    await page.goto('https://indeed.co.uk');
    let goOn = false;

    try {
      const {status} = await client.send('Captcha.solve', {detectTimeout: 30 * 1000});
      console.log(`Captcha solve status: ${status}`)
      goOn = status === 'solve_finished' || status === 'not_detected';
    } catch (e) {
      console.error('Captcha.solve failed:', e);
    }

    if (goOn) {
      console.log('Looking for \'what\' field...');
      const fieldWhat = await page.locator('#text-input-what');

      console.log('Entering data...');
      await fieldWhat.fill('java developer');

      console.log('Looking for \'where\' field...');
      const fieldWhere = await page.focus('#text-input-where');

      console.log('Clearing out \'where\' field...');
      await page.keyboard.down('Control'); // Use 'Command' for macOS
      await page.keyboard.press('A');
      await page.keyboard.up('Control'); // Use 'Command' for macOS
      await page.keyboard.press('Backspace');

      console.log('Submitting query...');
      await page.keyboard.press('Enter');

      console.log('Looking for results...');
      const results = await page.locator('jobsearch-JobCountAndSortPane-jobCount');

      console.log('Results', results);
    } else {
      console.log('Captcha not solved, finishing up');
    }

  } catch (e) {
    console.log('Error happened when working on page', e);
  } finally {

    if (page !== null) {
      try {
        const timestamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, -5);
        const screenshotName = `screenshot-2-${timestamp}.png`;
        console.log(`Saving screenshot to ${screenshotName}...`);
        await page.screenshot({path: screenshotName, fullPage: true});

        const sourceName = `source-2-${timestamp}.html`;
        console.log(`Saving source to ${sourceName}...`);
        const html = await page.content();
        fs.writeFile(sourceName, html, err => {
          if (err) {
            console.log('Source NOT saved!');
          } else {
            console.log('Source saved!');
          }
        });
      } catch (e) {
        console.log('Error happened when taking screenshot & saving source', e);
      }
    } else {
      console.log('Got no page, skipping ');
    }

    await sleep(20);
    console.log('Closing browser...');
    await browser.close();
    console.log('');
    console.log('Done.');
  }

}

go();
