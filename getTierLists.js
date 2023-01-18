'use strict';

const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const getTierLists = () => {
	let tierLists = {

	};

	const decks = document.querySelectorAll('.btn-decktype');

	for (const deck of decks) {
		const parent = deck.closest('.row.button-row');
		const tierNameElement = parent.previousElementSibling;
		if (tierNameElement.tagName === 'H3') {
			const tierName = tierNameElement.innerHTML;

			if (!tierLists.hasOwnProperty(tierName)) {
				tierLists[tierName] = [];
			}

			const name = deck.querySelector('.decktype-display').innerHTML;
			const image = deck.querySelector('img').src;

			let data = {
				name,
				image
			};

			if (deck.tagName === 'A') {
				data.url = deck.href;
			}

			tierLists[tierName].push(data);
		}
	}

	return tierLists;
}

(async() => {

	const tierListDir = path.resolve(__dirname, 'data/tierLists');

	const manifestResponse = await axios('https://www.duellinksmeta.com/rev-manifest.json');
	const manifestData = manifestResponse.data;
	// console.log(manifestData);

	const articlesUrl = manifestData['search.json'];

	const articleResponse = await axios('https://www.duellinksmeta.com/data-hashed/' + articlesUrl);
	const articles = articleResponse.data;
	let tierLists = [];

	for (const article of articles) {
		if (article.url.indexOf('/tier-list/updates') !== -1) {
			tierLists.push(article.url);
		}
	}

	// console.log(JSON.stringify(tierLists));

    const browser = await puppeteer.launch({
		headless: true,
		devtools: true,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox'
		]
	});

    let index = 1;
    for (const url of tierLists) {
    	if (index > 1) {
    		console.log("\n--------------------------------------\n");
    	}
    	console.log("\nProcessing URL - " + url + "[" + index + "/" + tierLists.length + "]\n");
    	const page = await browser.newPage();
		page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    	const filenameParts = url.split('/');
    	const filename = filenameParts[filenameParts.length - 2];

    	// await page.setViewport({
    	// 	width: 1920,
    	// 	height: 1080
    	// });
    	await page.goto('https://www.duellinksmeta.com' + url, {
    	    waitUntil: 'networkidle2',
    	    timeout: 0
    	});
    	// await page.screenshot({
    	// 	path: 'data/tierLists/' + filename + '.png',
    	// 	fullPage: true
    	// });

		const list = await page.evaluate(getTierLists);

		const months = {
			january: '01',
			february: '02',
			march: '03',
			april: '04',
			may: '05',
			june: '06',
			july: '07',
			august: '08',
			september: '09',
			october: '10',
			november: '11',
			december: '12'
		};

		const parts = filename.split('-');
		const year = parts[2];
		const date = parts[1];
		const month = months[parts[0]];

		const finalName = tierListDir + '/' + year + '-' + month + '-' + date + '.json';
		// console.log(finalName);

		fs.writeFileSync(finalName, JSON.stringify(list, null, ' '));

		// process.exit(0);

    	await page.close();
    	console.log("\nProcessed URL - " + url + "[" + index + "/" + tierLists.length + "]\n");
    	index++;
    }
    
    await browser.close();
})();
