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
      field.click();
      await currentPage.keyboard.down('Control');
      await currentPage.keyboard.press('A');
      await currentPage.keyboard.up('Control');
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
