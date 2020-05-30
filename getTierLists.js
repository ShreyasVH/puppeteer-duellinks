'use strict';

const puppeteer = require('puppeteer');
const axios = require('axios');

(async() => {

	const manifestResponse = await axios('https://www.duellinksmeta.com/rev-manifest.json');
	const manifestData = manifestResponse.data;

	const articlesUrl = manifestData['articles_full.json'];

	const articleResponse = await axios('https://www.duellinksmeta.com/data-hashed/' + articlesUrl);
	const articles = articleResponse.data;
	let tierLists = [];

	for (const article of articles) {
		if (article.url.indexOf('tier-list/updates') !== -1) {
			tierLists.push(article.url);
		}
	}

	// console.log(JSON.stringify(tierLists));

    const browser = await puppeteer.launch();

    let index = 1;
    for (const url of tierLists) {
    	if (index > 1) {
    		console.log("\n--------------------------------------\n");
    	}
    	console.log("\nProcessing URL - " + url + "[" + index + "/" + tierLists.length + "]\n");
    	const page = await browser.newPage();

    	const filenameParts = url.split('/');
    	const filename = filenameParts[filenameParts.length - 2];

    	await page.setViewport({
    		width: 1920,
    		height: 1080
    	});
    	await page.goto('https://www.duellinksmeta.com' + url, {
    	    waitUntil: 'networkidle2',
    	    timeout: 0
    	});
    	await page.screenshot({
    		path: 'data/tierLists/' + filename + '.png',
    		fullPage: true
    	});
    	await page.close();
    	console.log("\nProcessed URL - " + url + "[" + index + "/" + tierLists.length + "]\n");
    	index++;
    }
    
    await browser.close();
})();
