const puppeteer = require('puppeteer');
const fs = require('fs');

function getBoxNames () {
    let links = [];

    let boxElements =  document.querySelectorAll('.box-list ul li a');
    for (let index in boxElements) {
        if (boxElements.hasOwnProperty(index)) {
            const boxElement = boxElements[index];
            links.push(boxElement.querySelectorAll('.banner')[0].alt);
        }
    }

    return links;
}

let boxNames = [];

(async () => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true
    });

    const basePage = await browser.newPage();
    await basePage.goto('https://www.konami.com/yugioh/duel_links/en/box/', {
        waitUntil: 'networkidle2',
        timeout: 0
    });

    boxNames = await basePage.evaluate(getBoxNames);


    await basePage.close();

    await browser.close();

    fs.writeFile('data/boxNames.json', JSON.stringify(boxNames, null, ' '), error => {
        if (error) {
            console.log("\n\t\tError while writing box names. Error: " + error + "\n");
        }
    });
})();

