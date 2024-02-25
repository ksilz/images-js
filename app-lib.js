import fs from "fs";

export const SearchResult = Object.freeze({
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

export const ID_INPUT_WHAT_SELECTOR = "#text-input-what";
export const ID_INPUT_WHERE_SELECTOR = "#text-input-where";
export const CLASS_NUMBER_OF_RESULTS_SELECTOR = ".jobsearch-JobCountAndSortPane-jobCount";
export const CLASS_BAD_QUERY_SELECTOR = ".jobsearch-NoResult-messageContainer";
export const CAPTCHA_TIMEOUT_GOTO_URL = 2 * 60 * 1000;
export const CAPTCHA_TIMEOUT_SOLVE = 30 * 1000;


export function printIntro(message) {
  console.info(`*************************************************************`)
  console.info(`${message.toUpperCase()}...`);

  return false;
}

export function printExtro(message, feedback) {
  console.info(`Done ${message}. Success: ${feedback}`);
  console.info(`*************************************************************`)
  console.info(``)
}

export function hasValue(thing) {
  return thing !== null && thing !== undefined;
}

export function hasElements(thing) {
  return hasValue(thing) && thing.length > 0;
}

export function hasText(thing) {
  return thing !== null && thing !== undefined && thing.length > 0;
}

export function isTrue(thing) {
  return hasValue(thing) && thing === true;
}

export async function clearField(currentPage, field) {
  let enteredData = " ";

  if (hasValue(field)) {
    const fieldId = await currentPage.evaluate(element => element.id, field);

    if (hasValue(fieldId)) {
      enteredData = await currentPage.evaluate((id) => {
        return document.getElementById(id).value;
      }, fieldId);
    } else {
      console.warn("  Field has no ID");
    }

    if (hasText(enteredData)) {
      await field.click();
      await currentPage.keyboard.down('ControlLeft');
      await currentPage.keyboard.press('KeyA');
      await currentPage.keyboard.up('ControlLeft');
      await currentPage.keyboard.press('Backspace');
    }

  } else {
    console.warn("  Field is empty, not clearing");
  }

}

export async function submitField(currentPage, field) {
  currentPage.waitForNavigation();
  await field.type('\n');
}

export async function handleModalsAndCookies(currentPage) {

  try {
    const closeButtons = await currentPage.$$("button[aria-label='close'], button[aria-label='Close']");
    const cookieButtons = await currentPage.$$(`xpath/.//button[@id='onetrust-accept-btn-handler' or contains(text(), 'Accept All Cookies')]`);

    const allButtons = [...closeButtons, ...cookieButtons];

    if (hasElements(allButtons)) {
      console.info(`  Handling ${allButtons.length} modals and cookies...`);

      for (let button of allButtons) {

        try {
          await button.click();
          console.info("  Done clicking button for modals and cookies");
        } catch (e) {
          /*
                    console.error(`  Error clicking button for modals and cookies: ${e.toString()}`);
          */
          await saveScreenshotAndSources(false, true, "modal-error", currentPage);
        }

      }

    } else {
      console.info(`  NO modals and cookies found`);
    }

  } catch (e) {
    console.error("  Error handling modals and cookies", e);
  }

}

export function createFileName(isScreenshot, isBefore, label) {
  const prefix = isScreenshot ? "screenshot" : "source";
  const pointInTime = isBefore ? "before" : "after";
  const extension = isScreenshot ? "png" : "html";
  const realLabel = hasText(label) ? `-${label}` : "";
  const now = new Date();
  const timestamp = now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, '0') + "-" +
    String(now.getDate()).padStart(2, '0') + "-" +
    String(now.getHours()).padStart(2, '0') + "-" +
    String(now.getMinutes()).padStart(2, '0') + "-" +
    String(now.getSeconds()).padStart(2, '0');

  return `${prefix}-${pointInTime}${realLabel}-${timestamp}.${extension}`;
}

export async function getSource(currentPage) {
  return await currentPage.content();
}

export async function saveScreenshotAndSources(takeScreenshot, saveSource, label, currentPage) {

  if (isTrue(takeScreenshot)) {
    const fileName = createFileName(true, true, label);
    console.info(`  Taking screenshot before search: ${fileName}...`);
    await currentPage.screenshot(fileName);
  }

  if (isTrue(saveSource)) {
    const fileName = createFileName(false, true, label);
    console.info(`  Saving source before search: ${fileName}...`);
    const source = await getSource(currentPage);
    fs.writeFileSync(fileName, source);
  }

}
