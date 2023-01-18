const puppeteer = require('puppeteer');
const fs = require('fs');

const requiredBoxName = process.argv[2];

function getBoxLinks () {
    let boxes = {};

    const sections = document.querySelectorAll('.box-list');
    for(const index in sections) {
        if (sections.hasOwnProperty(index)) {
            const section = sections[index];

            let sectionName = '';
            const sectionNameElements = section.querySelectorAll('h2');
            if (sectionNameElements.length > 0) {
                sectionName = sectionNameElements[0].textContent;
            }

            let links = [];

            let boxElements =  section.querySelectorAll('ul li a');
            for (let index in boxElements) {
                if (boxElements.hasOwnProperty(index)) {
                    const boxElement = boxElements[index];

                    const boxName = boxElement.querySelectorAll('.banner')[0].alt;

                    console.log(boxName);

                    links.push({
                        url: boxElement.href,
                        name: boxName
                    });
                }
            }

            boxes[sectionName] = links;
        }
    }

    return boxes;
}

function getAllCardsOld () {
    let cards = [];
    let cardElements = document.querySelectorAll('.card-list.grid li a');

    for (let index in cardElements) {
        if (cardElements.hasOwnProperty(index)) {
            let cardElement = cardElements[index];

            const name = cardElement.querySelectorAll('dt')[0].textContent;

            let rarityString = cardElement.classList[0];

            let rarity = '';
            if (rarityString.indexOf('rare-ur') !== -1) {
                rarity = 'ULTRA_RARE';
            } else if (rarityString.indexOf('rare-sr') !== -1) {
                rarity = 'SUPER_RARE';
            } else if (rarityString.indexOf('rare-r') !== -1) {
                rarity = 'RARE';
            } else if (rarityString.indexOf('rare-n') !== -1) {
                rarity = 'NORMAL';
            }

            cards.push({
                name,
                rarity
            });
        }
    }
    return cards;
}

function getCardDetails () {
    let details = {};

    const nameElements = document.querySelectorAll('.card-name .heading-name');
    if (nameElements.length > 0) {
        const nameElement = nameElements[0];
        details.name = nameElement.textContent;
    }

    const cardTypeElements = document.querySelectorAll('.card-set-type');
    if (cardTypeElements.length > 0) {
        const cardTypeElement = cardTypeElements[0];
        const cardTypeString = cardTypeElement.textContent;

        let cardType = '';

        if (cardTypeString.toUpperCase().indexOf('MONSTER') !== -1) {
            cardType = 'MONSTER';
        } else if (cardTypeString.toUpperCase().indexOf('SPELL') !== -1) {
            cardType = 'SPELL';
        } else if (cardTypeString.toUpperCase().indexOf('TRAP') !== -1) {
            cardType = 'TRAP';
        }
        details.cardType = cardType;

        if ('MONSTER' === cardType) {
            const levelElements = document.querySelectorAll('.card-level img');
            if (levelElements.length > 0) {
                const levelElement = levelElements[0];
                const levelString = levelElement.alt;
                let matches = levelString.match(/Level ([0-9]+)/);
                details.level = parseInt(matches[1], 10);
            }

            const attributeElements = document.querySelectorAll('.card-set-att');
            if (attributeElements.length > 0) {
                const attributeElement = attributeElements[0];
                details.attribute = attributeElement.textContent;
            }

            const typeElements = document.querySelectorAll('.card-set-race');
            if (typeElements.length > 0) {
                const typeElement = typeElements[0];
                details.type = typeElement.textContent.replace(' ', '_').toUpperCase();
            }

            const atkDefElements = document.querySelectorAll('.card-set-atk');
            if (atkDefElements.length > 0) {
                const atkDefElement = atkDefElements[0];
                const atkDefString = atkDefElement.textContent;

                // const matches = atkDefString.match(/ATK: (([0-9?]{1,4})+) DEF: (([0-9?]{1,4})+)/);

                const parts = atkDefString.split(" ");

                details.attack = parts[1];
                details.defense = parts[3];
            }
        }
    }

    const descriptionElements = document.querySelectorAll('.card-set-desc');
    if (descriptionElements.length > 0) {
        const descriptionElement = descriptionElements[0];
        details.description = descriptionElement.textContent;
    }

    details.cardSubTypes = [
        'NORMAL'
    ];

    details.limitType = 'UNLIMITED';
    details.imageUrl = 'https://res.cloudinary.com/dyoxubvbg/image/upload/v1571554087/cards/p5zathr8gjqahfi19lft.png';

    return details;
}

function sleep (milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}

let data = {};

let failed = [];

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

    const boxLinksData = await basePage.evaluate(getBoxLinks);
    let sectionIndex = 1;
    for (const sectionName in boxLinksData) {
        if (boxLinksData.hasOwnProperty(sectionName)) {
            let boxLinks = boxLinksData[sectionName];

            if (sectionIndex >= 1) {
                if (sectionName !== Object.keys(boxLinksData)[0]) {
                    console.log("\n.................................................................\n");
                }

                console.log("\nProcessing section. [" + sectionIndex + "/" + (Object.keys(boxLinksData).length) + "]\n");

                for (const indexString in boxLinks) {
                    if (boxLinks.hasOwnProperty(indexString)) {
                        const index = parseInt(indexString, 10);

                        if (index >= 0) {

                            if (index > 0) {
                                console.log("\n\t-------------------------------------------------------------\n");
                            }

                            console.log("\n\tProcessing box: [" + (index + 1) + "/" + boxLinks.length + "]\n");

                            const boxLinkElement = boxLinks[index];
                            const boxLink = boxLinkElement.url;
                            const boxName = boxLinkElement.name;

                            const boxPage = await browser.newPage();
                            await boxPage.goto(boxLink, {
                                waitUntil: 'networkidle2',
                                timeout: 0
                            });

                            let boxCards = await boxPage.evaluate(getAllCardsOld);

                            let cardIndex = 0;
                            let retryCount = 1;
                            let cardDetails = {};
                            let cardName = '';

                            while (cardIndex < boxCards.length) {
                                if (cardIndex >= 0) {

                                    if ((cardIndex > 0) && (retryCount === 1)) {
                                        console.log("\n\t\t.........................\n");
                                    }

                                    if (retryCount === 1) {
                                        console.log("\n\t\tProcessing card. [" + (cardIndex + 1) + "/" + boxCards.length + "]\n");
                                    } else {
                                        console.log("\n\t\t\tRetrying...\n");
                                    }

                                    let cardElement = boxCards[cardIndex];
                                    cardName = cardElement.name;

                                    try {
                                        const cardPage = await browser.newPage();
                                        await cardPage.goto('https://db.ygoprodeck.com/card/?search=' + cardName, {
                                            waitUntil: 'networkidle2',
                                            timeout: 0
                                        });

                                        cardDetails = await cardPage.evaluate(getCardDetails);
                                        cardDetails = Object.assign({}, cardElement, cardDetails);

                                        await cardPage.close();
                                    } catch (error) {
                                        console.log("\n\t\t\tError while getting details about card." + error + "\n");
                                    }

                                } else {
                                    break;
                                }

                                if ((cardDetails.cardType || (retryCount > 5))) {
                                    console.log("\n\t\tProcessed card. [" + (cardIndex + 1) + "/" + boxCards.length + "]\n");

                                    cardIndex++;
                                    retryCount = 1;

                                    if (data.hasOwnProperty(sectionName)) {
                                        if (data[sectionName].hasOwnProperty(boxName)) {
                                            data[sectionName][boxName].push(cardDetails);
                                        } else {
                                            data[sectionName][boxName] = [
                                                cardDetails
                                            ];
                                        }
                                    } else {
                                        data[sectionName] = {};
                                        data[sectionName][boxName] = [
                                            cardDetails
                                        ];
                                    }

                                    fs.writeFile('data/allCards.json', JSON.stringify(data, null, ' '), error => {
                                        if (error) {
                                            console.log("\n\t\tError while writing card data. Error: " + error + "\n");
                                        }
                                    });


                                    let success = (cardDetails.hasOwnProperty('cardType') && (cardDetails.cardType !== ''));
                                    if (!success) {
                                        failed.push({
                                            cardName,
                                            boxName,
                                            sectionName
                                        });
                                    }

                                    fs.writeFile('data/statusData.json', JSON.stringify(failed, null, ' '), error => {
                                        if (error) {
                                            console.log("\n\t\tError while writing card data status. Error: " + error + "\n");
                                        }
                                    });

                                    sleep(500);

                                } else {
                                    retryCount++;
                                }
                            }

                            await boxPage.close();

                            console.log("\n\tProcessed box: [" + (index + 1) + "/" + boxLinks.length + "]\n");
                        } else {
                            break;
                        }
                    }
                }

                console.log("\nProcessed section. [" + sectionIndex + "/" + (Object.keys(boxLinksData).length) + "]\n");

            } else {
                break;
            }

            sectionIndex++;
        }
    }

    await basePage.close();

    await browser.close();

})();
