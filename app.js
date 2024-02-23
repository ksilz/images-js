import express from "express";
import fs from "fs";
import puppeteer from "puppeteer";
import {printIntro, printExtro, hasValue, hasText, clearField, submitField, isTrue} from './app-lib.js';

const app = express();
const port = process.env.JOB_SEARCHER_NODE_PORT || 4267;

const config = {
  useRemoteBrowser: false, // default value
  blockImages: false,      // default value
  remoteUserName: '',      // default value
  remotePassword: ''       // default value
};

const SearchResult = Object.freeze({
  NO_CURRENT_PAGE: "noCurrentPage",
  NO_CURRENT_URL: "noCurrentUrl",
  NO_INPUT: "noInput",
  FAILED_CAPTCHA: "failedCaptcha",
  NO_SEARCH_FIELD: "noSearchField",
  JOBS_FOUND: "jobsFound",
  JOBS_EMPTY: "jobsEmpty",
  NO_JOBS_FOUND_EXPECTED: "noJobsFoundExpected",
  NO_JOBS_FOUND_UNEXPECTED: "noJobsFoundUnexpected",
  ERROR: "error"
});

const ID_INPUT_WHAT = "text-input-what";
const ID_INPUT_WHERE = "text-input-where";
const CLASS_NUMBER_OF_RESULTS = ".jobsearch-JobCountAndSortPane-jobCount";
const CLASS_BAD_QUERY = "jobsearch-NoResult-messageContainer";

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

  try {
    await browser.close();
    feedback = true;
  } catch (e) {
    console.error("Error shutting down browser", e);
  }

  printExtro('shutting down browser', feedback);
  res.status(200).json({"success": feedback});

  console.log(`Exiting the application...`)
  process.nextTick(process.exit());
});

const CAPTCHA_TIMEOUT_GOTO_URL = 2 * 60 * 1000;
const CAPTCHA_TIMEOUT_SOLVE = 30 * 1000;
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
              // If the request is for an image, block it
              console.log(`  Blocked an ${resourceType}!`);
              request.abort();
            } else {
              // If it's not an image request, allow it to continue
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
  let returnValue = '';
  let returnStatus = SearchResult.ERROR;
  const {text} = req.body;

  if (hasValue(currentPage)) {
    const currentUrl = currentPage.url();

    if (hasText(currentUrl)) {

      if (hasText(text)) {
        console.info(`  Searching for text: ${text}...`);

        try {
          const searchField = currentPage.$(`#${ID_INPUT_WHAT}`);

          if (hasValue(searchField)) {
            console.info(`  Clearing search field...`);
            await clearField(currentPage, searchField);
            console.info(`  Entering data into search field...`);
            searchField.type(text);

            const locationField = currentPage.$(`#${ID_INPUT_WHERE}`);

            if (hasValue(locationField)) {
              console.info(`  Submitting form through location field...`);
              await clearField(currentPage, locationField);
              submitField(currentPage, locationField);
            } else {
              console.info(`  Submitting form through search field...`);
              submitField(currentPage, searchField);
            }

            const totalJobs = currentPage.$(CLASS_NUMBER_OF_RESULTS);

            if (hasValue(totalJobs)) {
              returnValue = await totalJobs.evaluate(node => node.innerHTML);

              if (hasText(returnValue)) {
                returnStatus = SearchResult.JOBS_FOUND;
                console.info(`  Total jobs raw: ${text}`);
              } else {
                returnStatus = SearchResult.JOBS_EMPTY;
                console.warn("  Total jobs has no content!");
              }

            } else {
              const noResults = currentPage.$(CLASS_BAD_QUERY);

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
    source = await currentPage.content();
    feedback = hasText(source);
  } catch (e) {
    console.error("Error getting source of current page", e);
  }

  printExtro('getting source of current page', feedback);
  res.send(source);
});

app.listen(port, () => {
  printIntro(`NodeJS Browser starting`);

  try {
    fs.writeFileSync('node-pid.txt', process.pid.toString());
  } catch (e) {
    console.error("Error writing PID to file", e)
  }

  console.info(`NodeJS Browser listening at http://localhost:${port}`);
});
