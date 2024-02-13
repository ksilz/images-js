const {Builder, Browser, By} = require('selenium-webdriver');
const {Options} = require('selenium-webdriver/chrome');

function sleep(seconds) {
  console.log(`Sleeping for ${seconds} seconds...`);
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function go() {
  console.log("Starting image blocking test");
  console.log("");

  const args = process.argv.slice(2);

  console.log(`Parameters: ${args}`);

  let blockImages = true;
  let useScrapingBrowser = true;
  let userNameAndPassword = null;

// Check for specific command-line arguments to adjust the variables
  args.forEach(arg => {
    if (arg === "allow") {
      blockImages = false;
    } else if (arg === "local") {
      useScrapingBrowser = false;
    } else {
      userNameAndPassword = arg;
    }

  });

  console.log(`Block images: ${blockImages}, use Scraping Browser: ${useScrapingBrowser}`);

  if (useScrapingBrowser && !userNameAndPassword) {
    console.log("You must provide a username and password for the scraping browser");
    process.exit(1);
  }

  console.log("Setting up Selenium...")

  const chromeOptions = new Options();

  if (blockImages) {
    const prefs = {"profile.managed_default_content_settings.images": 2};
    chromeOptions.setUserPreferences(prefs);
  }

  const server = useScrapingBrowser ? `https://${userNameAndPassword}@brd.superproxy.io:9515` : "";
  const driver = await new Builder()
    .forBrowser(Browser.CHROME)
    .setChromeOptions(chromeOptions)
    .usingServer(server)
    .build();

  try {
    console.log("Going to Wikipedia...");
    await driver.get("https://en.wikipedia.com");
    await sleep(20);

  } finally {
    console.log("Closing browser...");
    await driver.quit();
    console.log("");
    console.log("Done.");
  }

}

go();
