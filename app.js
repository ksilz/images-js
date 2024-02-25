import express from "express";
import fs from "fs";
import puppeteer from "puppeteer";
import {
  SearchResult,
  ID_INPUT_WHAT_SELECTOR,
  ID_INPUT_WHERE_SELECTOR,
  CLASS_NUMBER_OF_RESULTS_SELECTOR,
  CLASS_BAD_QUERY_SELECTOR,
  CAPTCHA_TIMEOUT_GOTO_URL,
  CAPTCHA_TIMEOUT_SOLVE,
  printIntro,
  printExtro,
  hasValue,
  hasText,
  clearField,
  submitField,
  isTrue,
  handleModalsAndCookies,
  getSource,
  saveScreenshotAndSources,
} from './app-lib.js';

const app = express();
const port = process.env.JOB_SEARCHER_NODE_PORT || 4267;

const config = {
  useRemoteBrowser: false,
  blockImages: false,
  remoteUserName: '',
  remotePassword: '',
};

let browser = null;
let currentPage = null;

app.use(express.json()); // Middleware to parse JSON bodies


app.post('/configure', async (req, res) => {
  let feedback = printIntro('Configuring browser');
  const {useRemoteBrowser, blockImages, remoteUserName, remotePassword} = req.body;

  config.useRemoteBrowser = useRemoteBrowser;
  config.blockImages = blockImages;
  config.remoteUserName = remoteUserName;
  config.remotePassword = remotePassword;

  const displayPassword = config.remotePassword !== null && config.remotePassword !== undefined && config.remotePassword.length > 0 ? '(yes)' : '(no)';

  console.info(`  useRemoteBrowser=${config.useRemoteBrowser}, blockImages=${config.blockImages}, remoteUserName=${config.remoteUserName}, remotePassword=${displayPassword}`);

  try {
    const userNameAndPassword = config.useRemoteBrowser ? config.remoteUserName + ":" + config.remotePassword : "";

    console.log(`  Starting browser...`)
    browser = config.useRemoteBrowser
      ? await puppeteer.connect({
        browserWSEndpoint: `wss://${userNameAndPassword}@brd.superproxy.io:9222`,
      })
      : await puppeteer.launch();

    console.log(`  Opening page...`)
    currentPage = await browser.newPage();
    feedback = true;
  } catch (e) {
    console.error("Error setting up browser", e);
  }

  printExtro('configuring browser', feedback);

  res.status(200).json({"success": feedback});
});


app.post('/shutDown', async (req, res) => {
  let feedback = printIntro('Shutting down browser');

  res.status(200).json({"success": feedback});

  await shutDownBrowser();

  feedback = true;

  printExtro('shutting down browser', feedback);

  process.nextTick(process.exit());
});

app.post('/goToUrl', async (req, res) => {
  let feedback = printIntro('Going to URL');
  const {url, solveCaptcha} = req.body;
  const reallySolveCaptcha = isTrue(solveCaptcha);

  if (hasValue(currentPage)) {

    if (hasText(url)) {

      try {
        console.info(`  URL: ${url}...`);
        let client = null;

        if (reallySolveCaptcha) {
          console.info('  USING captcha solver');
          client = await currentPage.target().createCDPSession();
          await client.send('Captcha.setAutoSolve', {autoSolve: false});
          await currentPage.goto(url, {timeout: CAPTCHA_TIMEOUT_GOTO_URL});
          const {status} = await client.send('Captcha.solve', {detectTimeout: CAPTCHA_TIMEOUT_SOLVE});
          console.log(`  Captcha solve status: ${status}`);
        } else {
          console.info('  NOT using captcha solver');
          await currentPage.goto(url);
        }

        console.info('  At URL.');

        if (config.blockImages) {
          console.info('  Blocking images...');
          await currentPage.setRequestInterception(true);

          // Listen for requests
          currentPage.on('request', (request) => {
            const resourceType = request.resourceType();

            if (resourceType === 'image' || resourceType === 'font') {
              /*
                            console.log(`  Blocked an ${resourceType}!`);
              */
              request.abort();
            } else {
              request.continue();
            }

          });
        }
        feedback = true;
      } catch (e) {
        console.error("  Error going to URL", e);
      }

    } else {
      console.error("  URL is empty");
    }

  } else {
    console.error("  No page active");
  }

  printExtro('going to URL', feedback);
  res.status(200).json({"success": feedback});
});


app.post('/searchForText', async (req, res) => {
  let feedback = printIntro('Searching for text');

  const {
    text,
    "configBeforeSearch": {
      "takeScreenshot": takeScreenshotBefore,
      "saveSource": saveSourceBefore,
      "label": labelBefore
    },
    "configAfterSearch": {"takeScreenshot": takeScreenshotAfter, "saveSource": saveSourceAfter, "label": labelAfter}
  } = req.body;

  let returnValue = '';
  let returnStatus = SearchResult.ERROR;

  if (hasValue(currentPage)) {
    const currentUrl = currentPage.url();

    if (hasText(currentUrl)) {

      if (hasText(text)) {
        console.info(`  Searching for text: ${text}...`);
        await handleModalsAndCookies(currentPage);

        try {
          const searchField = await currentPage.$(ID_INPUT_WHAT_SELECTOR);

          if (hasValue(searchField)) {
            console.info(`  Clearing search field...`);
            await clearField(currentPage, searchField);
            console.info(`  Entering data into search field...`);
            await searchField.type(text);

            const locationField = await currentPage.$(ID_INPUT_WHERE_SELECTOR);

            if (hasValue(locationField)) {
              await clearField(currentPage, locationField);
            }

            await saveScreenshotAndSources(takeScreenshotBefore, saveSourceBefore, labelBefore, currentPage);

            if (hasValue(locationField)) {
              console.info(`  Submitting form through location field...`);
              await submitField(currentPage, locationField);
            } else {
              console.info(`  Submitting form through search field...`);
              await submitField(currentPage, searchField);
            }

            const totalJobs = await currentPage.$(CLASS_NUMBER_OF_RESULTS_SELECTOR);

            if (hasValue(totalJobs)) {
              returnValue = await totalJobs.evaluate(node => node.innerHTML);

              if (hasText(returnValue)) {
                returnStatus = SearchResult.JOBS_FOUND;
                console.info(`  Got total jobs text`);
              } else {
                returnStatus = SearchResult.JOBS_EMPTY;
                console.warn("  Total jobs has no content!");
              }

            } else {
              const noResults = await currentPage.$(CLASS_BAD_QUERY_SELECTOR);

              if (hasValue(noResults)) {
                returnStatus = SearchResult.NO_JOBS_FOUND_EXPECTED;
                console.info("  Got expected 'No results' message");
              } else {
                returnStatus = SearchResult.NO_JOBS_FOUND_UNEXPECTED;
                console.warn("  Total jobs not found!");
              }

            }

          } else {
            returnStatus = SearchResult.NO_SEARCH_FIELD
            console.warn("  Search field not found");
          }

          await saveScreenshotAndSources(takeScreenshotAfter, saveSourceAfter, labelAfter, currentPage);

          feedback = true;
        } catch (e) {
          console.error("  Error searching for text", e);
          returnValue = e.toString();
        }

      } else {
        returnStatus = SearchResult.NO_INPUT;
        console.error("  Search text is empty");
      }

    } else {
      returnStatus = SearchResult.NO_CURRENT_URL;
      console.error("  No URL active");
    }

  } else {
    returnStatus = SearchResult.NO_CURRENT_PAGE;
    console.error("  No page active");
  }

  printExtro('Searching for text', feedback);
  res.status(200).json({"status": returnStatus, "value": returnValue});
});

app.get('/getSource', async (req, res) => {
  let feedback = printIntro('Getting source of current page');
  let source = null;

  try {
    source = await getSource(currentPage);
    feedback = hasText(source);
  } catch (e) {
    console.error("Error getting source of current page", e);
  }

  printExtro('getting source of current page', feedback);
  res.send(source);
});

app.listen(port, () => {
  printIntro(`Browser starting`);

  try {
    fs.writeFileSync('node-pid.txt', process.pid.toString());
  } catch (e) {
    console.error("Error writing PID to file", e)
  }

  printExtro(`starting browser: http://localhost:${port}`, true);
});

async function shutDownBrowser() {

  try {

    if (hasValue(browser)) {
      await browser.close();
      browser = null;
      console.info("  Browser instance shut down.");
    } else {
      console.info("  No browser instance to shut down ");
    }

  } catch (e) {
    console.error("Error shutting down browser instance", e);
  }
}

process.on('exit', async () => {
  await shutDownBrowser();
});