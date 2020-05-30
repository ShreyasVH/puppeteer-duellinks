const puppeteer = require('puppeteer');
const fs = require('fs');

function getAllCards () {
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
                let matches = levelString.match(/Level\/Rank ([0-9]+)/);
                details.level = parseInt(matches[1], 10);
            }

            const attributeTypeElement = document.querySelectorAll('.raceattribute a img');
            if (attributeTypeElement.length === 2) {
                const attributeElement = attributeTypeElement[0];
                details.attribute = attributeElement.title;

                const typeElement = attributeTypeElement[1];
                details.type = typeElement.title.toUpperCase().replace(/ |-/g, '_');
            }

            const atkDefElements = document.querySelectorAll('.card-set-atk');
            if (atkDefElements.length > 0) {
                const atkDefElement = atkDefElements[0];
                const atkDefString = atkDefElement.textContent;

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

    const imageElements = document.querySelectorAll('.card-set-img img');
    if (imageElements.length > 0) {
        details.imageUrl = imageElements[0].src;
    }

    details.link = location.href;

    return details;
}

(async () => {
    const browser  = await puppeteer.launch({
        headless: true,
        devtools: true
    });

    const formattedBoxName = process.argv[2].replace(/ /g, '_');

    let cards = {};
    if(fs.existsSync('data/cards_' + formattedBoxName + '.json'))
    {
        cards = JSON.parse(fs.readFileSync('data/cards_' + formattedBoxName + '.json'));
    }

    let failed = [];
    if(fs.existsSync('data/failedCards_' + formattedBoxName + '.json'))
    {
        failed = JSON.parse(fs.readFileSync('data/failedCards_' + formattedBoxName + '.json'));
    }

    const basePage = await browser.newPage();
    await basePage.goto('https://www.konami.com/yugioh/duel_links/en/box/', {
        waitUntil: 'networkidle2',
        timeout: 0
    });

    const boxLink = await basePage.evaluate(boxName => {
        let link = '';
        const bannerElement = document.querySelectorAll('.box-list ul li a img[alt="' + boxName + '"]');
        if (bannerElement.length > 0) {
            link = bannerElement[0].closest('a').href;
        }
        return link;
    }, process.argv[2]);

    const boxPage = await browser.newPage();
    await boxPage.goto(boxLink, {
        waitUntil: 'networkidle2',
        timeout: 0
    });

    const boxCards = await boxPage.evaluate(getAllCards);

    for (const cardIndexString in boxCards) {
        if (boxCards.hasOwnProperty(cardIndexString)) {
            let cardIndex = parseInt(cardIndexString, 10);

            if (cardIndex >= 0) {
                if (cardIndex > 0) {
                    console.log("\n----------------------------------------------------------\n");
                }

                console.log("\nProcessing card. [" + (cardIndex + 1) + "/" + boxCards.length + "]\n");

                let cardElement = boxCards[cardIndex];
                let cardName = cardElement.name;
                let areDetailsObtained = false;
                let retryCount = 1;


                if (!cards.hasOwnProperty(cardName)) {
                    while ((!areDetailsObtained) && (retryCount <= 5)) {
                        if (retryCount > 1) {
                            console.log("\n\tRetrying.......\n");
                        }

                        try {
                            const cardPage = await browser.newPage();
                            await cardPage.goto('https://db.ygoprodeck.com/card/?search=' + cardName, {
                                waitUntil: 'networkidle2',
                                timeout: 0
                            });

                            let cardDetails = await cardPage.evaluate(getCardDetails);
                            cardDetails = Object.assign({}, cardElement, cardDetails);

                            areDetailsObtained = (cardDetails.hasOwnProperty('cardType') && ('' !== cardDetails.cardType));

                            if (areDetailsObtained) {
                                cards[cardName] = cardDetails;
                                let failedIndex = failed.indexOf(cardName);
                                if(-1 !== failedIndex)
                                {
                                    failed.splice(failedIndex, 1);
                                }
                            }

                            await cardPage.close();
                            retryCount++;
                        } catch (error) {
                            console.log("\n\tError while getting details about card." + error + "\n");
                            retryCount++;
                        }
                    }

                    if (!areDetailsObtained) {
                        failed.push(cardName);
                    }
                }

                console.log("\nProcessed card. [" + (cardIndex + 1) + "/" + boxCards.length + "]\n");
            } else {
                break;
            }
        }
    }

    await boxPage.close();

    await basePage.close();

    await browser.close();

    fs.writeFile('data/cards_' + formattedBoxName + '.json', JSON.stringify(cards, null, ' '), error => {
        if (error) {
            console.log("\n\t\tError while writing card data. Error: " + error + "\n");
        }
    });

    fs.writeFile('data/failedCards_' + formattedBoxName + '.json', JSON.stringify(failed, null, ' '), error => {
        if (error) {
            console.log("\n\t\tError while writing card data status. Error: " + error + "\n");
        }
    });

})();
