## What's This?

This project demonstrates how to block image downloads with Selenium in Java. That's both for a locally launched Chrome instance and a remote Bright Data Scraping Browser instance.

## How Does It Work?

You need NodeJS (tested withe the current LTS 20.11.0) and the Google Chrome browser installed.

You start it in a terminal with `node index.js`. By default, that will launch the English Wikipedia page in a **local** Chrome instance, with images blocked.

You can optionally provide two parameters in any order without dashes or the colons used below.

- `allow`: Allow images.
- `(username:password)`: That's the username and password for the Scraping Browser. If provided, the Scraping Browser is used instead of a local Chrome.

Here's an example of allowing images with local Chrome: 

```
node index.js allow
```

Here's an example of blocking images with the Scraping Browser: 

```
node index.js asfasdfsdfafd:asdfasdf
```

Here's an example of allowing images with the Scraping Browser: 

```
node index.js asfasdfsdfafd:asdfasdf allow
```
