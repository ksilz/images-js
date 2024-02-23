const express = require('express');
const app = express();
const port = process.env.JOB_SEARCHER_NODE_PORT || 4267; // Configurable port
const fs = require('fs');
const puppeteer = require("puppeteer");


const config = {
  useRemoteBrowser: false, // default value
  blockImages: false,      // default value
  remoteUserName: '',      // default value
  remotePassword: ''       // default value
};

let browser = null;
let currentPage = null;

app.use(express.json()); // Middleware to parse JSON bodies

function printIntro(message) {
  console.info(`****************************************************`)
  console.info(message);
}

function printExtro(message, feedback) {
  console.info(`Done ${message}. Success: ${feedback}`);
  console.info(`****************************************************`)
  console.info(``)
}

app.post('/configure', async (req, res) => {
  printIntro('Configuring browser...');
  const {useRemoteBrowser, blockImages, remoteUserName, remotePassword} = req.body;

  config.useRemoteBrowser = useRemoteBrowser;
  config.blockImages = blockImages;
  config.remoteUserName = remoteUserName;
  config.remotePassword = remotePassword;

  const displayPassword = config.remotePassword !== null && config.remotePassword !== undefined && config.remotePassword.length > 0 ? '(yes)' : '(no)';

  console.info(`  useRemoteBrowser=${config.useRemoteBrowser}, blockImages=${config.blockImages}, remoteUserName=${config.remoteUserName}, remotePassword=${displayPassword}`);
  let feedback = false;

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
  printIntro('Shutting down browser...');
  let feedback = false;

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

app.post('/goToUrl', async (req, res) => {
  printIntro('Going to URL...');
  const {url} = req.body;
  let feedback = false;

  if (url !== null && url !== undefined && url.length > 0) {
    try {
      console.info(`  URL: ${url}...`);
      await currentPage.goto(url);
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
      console.error("Error going to URL", e);
    }

  }

  printExtro('going to URL', feedback);
  res.status(200).json({"success": feedback});
});

app.post('/searchForText', (req, res) => {
  const {text} = req.body;
  // Implement search logic here
  res.send("Search results or error message");
});

app.get('/getSource', (req, res) => {
  // Implement logic to return the HTML source code of the current page
  res.send("HTML page source code");
});

app.listen(port, () => {

  try {
    fs.writeFileSync('node-pid.txt', process.pid.toString());
  } catch (e) {
    console.error("Error writing PID to file", e)
  }


  console.info(`NodeJS Browser listening at http://localhost:${port}`);
});
