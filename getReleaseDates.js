const puppeteer = require('puppeteer');
const fs = require('fs');

let pages = [
    'https://yugipedia.com/wiki/Category:Yu-Gi-Oh!_Duel_Links_cards'
];

function getNextPageURL() {
    const anchorTags = document.querySelectorAll('#mw-pages a');

    let url = '';

    for (const tag of anchorTags) {
        if (tag.innerText === 'next page') {
            url = tag.href;
            break;
        }
    }

    return url;
}

function getCardLinks() {
    const cardElements = document.querySelectorAll('.mw-category-group a');
    let cardLinks = [];

    for (const element of cardElements) {
        const matches = element.title.match(/(.*) \(Duel Links\)/);
        if(matches && matches.length >= 2) {
            const name = matches[1];
            cardLinks.push({
                name,
                link: element.href
            });
        } else {
            console.log("Regex failed for " + element.title);
            cardLinks.push({
                name: element.title,
                link: element.href,
                missed: true
            });
        }
    }

    return cardLinks;
}

function getReleaseDate() {
    const tables = document.querySelectorAll('table.card-list');

    let releaseDate = '';

    if (tables.length > 0) {
        const table = tables[0];

        const body = table.querySelector('tbody');
        const rows = body.querySelectorAll('tr');
        if (rows.length > 0) {
            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                if (cells.length > 0) {
                    const releaseCell = cells[0];
                    releaseDate = releaseCell.innerText;
                }
            }
        }
    }

    return releaseDate;
}


(async () => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    let releaseDateCache = {};
    const releaseDateFilePath = 'data/releaseDates.json';
    if (fs.existsSync(releaseDateFilePath)) {
        releaseDateCache = JSON.parse(fs.readFileSync(releaseDateFilePath));
    }

    let missedCache = [];
    const missedCardsFilePath = 'data/missedCards.json';
    if (fs.existsSync(missedCardsFilePath)) {
        missedCache = JSON.parse(fs.readFileSync(missedCardsFilePath));
    }

    let index = 0;

    let releaseDates = [];

    while(index < pages.length)
    {
        // if (index > 2) {
        //     break;
        // }

        if (index > 0) {
            console.log("\n.............................................\n");
        }

        console.log("\nProcessing page: " + (index + 1) + "\n");
        const basePage = await browser.newPage();
        await basePage.goto(pages[index], {
            waitUntil: 'networkidle2',
            timeout: 0
        });
        basePage.on('console', msg => console.log('PAGE LOG:', msg.text()));

        const cardLinks = await basePage.evaluate(getCardLinks);

        const nextPageUrl = await basePage.evaluate(getNextPageURL);
        if (nextPageUrl) {
            pages.push(nextPageUrl);
        }

        await basePage.close();

        let cardIndex = 0;
        for (const linkData of cardLinks) {
            // if (cardIndex > 5) {
            //     break;
            // }

            if(cardIndex > 0) {
                console.log("\n\t-------------------------------------------------------------\n");
            }

            const name = linkData.name;
            const link = linkData.link;
            const missed = linkData.missed;
            console.log("\n\tProcessing card. [" + (cardIndex + 1) + "/" + cardLinks.length + "]\n");

            if (missed) {
                if (missedCache.indexOf(name) === -1) {
                    missedCache.push(name);

                    fs.writeFile(missedCardsFilePath, JSON.stringify(missedCache, null, ' '), error => {
                        if (error) {
                            console.log("\n\t\tError while writing missing card date cache. Error: " + error + "\n");
                        }
                    });
                }
            } else {
                if (!releaseDateCache.hasOwnProperty(name)) {
                    const cardPage = await browser.newPage();
                    await cardPage.goto(link, {
                        waitUntil: 'networkidle2',
                        timeout: 0
                    });
                    cardPage.on('console', msg => console.log('PAGE LOG:', msg.text()));

                    const releaseDate = await cardPage.evaluate(getReleaseDate);
                    releaseDateCache[name] = releaseDate;

                    fs.writeFile(releaseDateFilePath, JSON.stringify(releaseDateCache, null, ' '), error => {
                        if (error) {
                            console.log("\n\t\tError while writing release date cache. Error: " + error + "\n");
                        }
                    });

                    await cardPage.close();
                }
            }

            console.log("\n\tProcessed card. [" + (cardIndex + 1) + "/" + cardLinks.length + "]\n");
            cardIndex++;
        }

        console.log("\nProcessed page: " + (index + 1) + "\n");
        index++;
    }
    await browser.close();
})();