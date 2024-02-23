export function printIntro(message) {
  console.info(`****************************************************`)
  console.info(`${message}...`);

  return false;
}

export function printExtro(message, feedback) {
  console.info(`Done ${message}. Success: ${feedback}`);
  console.info(`****************************************************`)
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
  const enteredData = await currentPage.evaluate(() => field.value);

  if (hasText(enteredData)) {
    field.click();
    await currentPage.keyboard.down('Control');
    await currentPage.press('A');
    await currentPage.keyboard.up('Control');
    await currentPage.press('Backspace');
  }

}

export function submitField(currentPage, field) {
  currentPage.waitForNavigation();
  field.type('\n');
}
