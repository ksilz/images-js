## What's This?

This project demonstrates how to block image downloads with Selenium in Java. That's both for a headleass Chrome instance and a remote Bright Data Scraping Browser instance.

## How Does It Work?

You need NodeJS (tested with the current LTS 20.11.0). 

Before you start, run `npm install` to install the dependencies. Then run `npx playwright install` to install the headless browsers.

You start it in a terminal with `node index.js`. By default, that will launch open the English Wikipedia page in a headless Chrome instance, with images blocked. It takes a screenshot of the webpage and saves it to `screenshot-[current date and time].png` in the current directory.

You can optionally provide two parameters in any order without dashes or the colons used below.

- `allow`: Allow images.
- `(username:password)`: That's the username and password for the Scraping Browser. If provided, the Scraping Browser is used instead of a local Chrome.

Here's an example of allowing images with local Chrome: 

```
node index.js allow
```

Here's an example of blocking images with the Scraping Browser: 

```
node index.js asfaqdclgudkoi:kkodhcl
```

Here's an example of allowing images with the Scraping Browser: 

```
node index.js asfaqdclgudkoi:kkodhcl allow
```
