'use strict';

const puppeteer = require('puppeteer');
const axios = require('axios');

(async() => {

	const articleResponse = await axios('https://www.duellinksmeta.com/data-hashed/articles_full-47411b1d8c.json');
	const articles = articleResponse.data;
	let tierLists = [];

	for (const article of articles) {
		if (article.url.indexOf('tier-list/updates') !== -1) {
			tierLists.push(article.url);
		}
	}

	// console.log(JSON.stringify(tierLists));

    const browser = await puppeteer.launch();

    for (const url of tierLists) {
    	console.log("\nProcessing URL - " + url + "\n");
    	const page = await browser.newPage();

    	const filenameParts = url.split('/');
    	const filename = filenameParts[filenameParts.length - 2];

    	await page.goto('https://www.duellinksmeta.com' + url, {
    	    waitUntil: 'networkidle2',
    	    timeout: 0
    	});
    	await page.screenshot({
    		path: 'data/tierLists/' + filename + '.png',
    		fullPage: true
    	});
    	await page.close();
    	console.log("\nProcessed URL - " + url + "\n");
    }
    
    await browser.close();
})();
