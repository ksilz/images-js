const {Builder, By, Key, util} = require("selenium-webdriver");

// Sleep function
function sleep(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function go() {
  let driver = await new Builder().forBrowser("chrome").build();

  try {
    await driver.get("https://en.wikipedia.com");
    await sleep(10);

  } finally {
    await driver.quit();
  }

}

go();
