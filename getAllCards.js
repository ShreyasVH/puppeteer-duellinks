'use strict';

const get = require('./api').get;
const fs = require('fs');
const path = require('path');

const getCardDetailsFromYGO = async name => {
    let details = {};
    let tryCount = 1;

    while (Object.keys(details).length === 0 && tryCount <= 5) {
        if (tryCount > 1) {
            console.log('\tRetrying for ' + name + '....');
        }

        const url = 'https://db.ygoprodeck.com/api_internal/v7/cardinfo.php?name=' + encodeURI(name);
        const response = await get(url);
        if (response.status === 200) {
            details = response.result.data[0];
        }

        tryCount++;
    }

    return details;
}

const formatDetails = (dlmDetails, ygoDetails) => {
    const rarityMap = {
        N: 'NORMAL',
        R: 'RARE',
        SR: 'SUPER_RARE',
        UR: 'ULTRA_RARE'
    };
    const rarity = rarityMap[dlmDetails.rarity];

    const cardTypeMap = {
        Monster: 'MONSTER',
        Spell: 'SPELL',
        Trap: 'TRAP'
    };
    const cardType = cardTypeMap[dlmDetails.type];

    let details = {
        name: dlmDetails.name,
        rarity,
        cardType,
        description: ygoDetails.desc,
        limitType: 'UNLIMITED'
    };

    if (dlmDetails.release) {
        details.releaseDate = dlmDetails.release;
    }

    let cardSubTypes = [
        'NORMAL'
    ];

    const race = ygoDetails.race;
    const formattedRace = race.replace(/[- ]/, '_').toUpperCase();

    if ('MONSTER' === cardType) {
        details.level = ygoDetails.level;
        details.attribute = ygoDetails.attribute;
        details.type = formattedRace;
        details.attack = ygoDetails.atk;
        details.defense = ygoDetails.def;
    } else {
        cardSubTypes = [
            formattedRace
        ];
    }

    details.cardSubTypes = cardSubTypes;
    let images = ygoDetails.card_images.map(image => image.image_url);
    if (images.length > 1) {
        details.images = images;
    }

    if (images.length > 0) {
        details.imageUrl = images[0];
    }
    return details;
}

(async () => {

    const dataDir = path.resolve(__dirname, 'data/');

    let newCards = {};
    let errorCards = [];
    fs.writeFileSync(dataDir + '/newCards.json', JSON.stringify(newCards, null, ' '));

    let existingCardsMap = JSON.parse(fs.readFileSync(dataDir + '/existingCards.json'));

    const ignoredCards = JSON.parse(fs.readFileSync(dataDir + '/ignoredCards.json'));

    let totalCount = 0;

    const countResponse = await get ('https://www.duellinksmeta.com/api/v1/cards?obtain.0[$exists]=true&cardSort=release&count=true');
    if (countResponse.status === 200) {
        totalCount = parseInt(countResponse.result);
    }
    let offset = 0;
    const limit = 1000;

    while (offset < totalCount) {
        const page = (offset / limit) + 1;
        if (page > 1) {
            console.log('--------------------------------');
        }

        console.log('Processing page. [' + page + '/' + Math.ceil(totalCount / limit) + ']');
        console.log('https://www.duellinksmeta.com/api/v1/cards?obtain.0[$exists]=true&cardSort=release&page=' + page + '&limit=' + limit);
        const cardResponse = await get ('https://www.duellinksmeta.com/api/v1/cards?obtain.0[$exists]=true&cardSort=release&page=' + page + '&limit=' + limit);
        if (cardResponse.status === 200) {
            let cardList = (cardResponse.result);
            let index = 0;
            for (const card of cardList) {
                if (index > 0) {
                    console.log('\t........................')
                }

                console.log('\tProcessing card. [' + (offset + index + 1) + '/' + totalCount + ']');
                if (card.release && Array.isArray(card.obtain) && (card.obtain.length > 0) && !ignoredCards.includes(card.name)) {
                    let isNewCard = !existingCardsMap.hasOwnProperty(card.name);
                    if (card.release) {
                        const releaseDate = new Date(card.release);
                        isNewCard = (isNewCard && (releaseDate.getTime() < Date.now()));

                        if (isNewCard) {
                            try {
                                console.log('\t\tGetting YGO Details');

                                let details = await getCardDetailsFromYGO(card.name);
                                let formattedDetails = formatDetails(card, details);

                                existingCardsMap[card.name] = formattedDetails;
                                fs.writeFileSync(dataDir + '/existingCards.json', JSON.stringify(existingCardsMap, null, ' '));
                                newCards[card.name] = formattedDetails;
                                fs.writeFileSync(dataDir + '/newCards.json', JSON.stringify(newCards, null, ' '));

                                console.log('\t\tGot YGO Details');
                            } catch (e) {
                                errorCards.push(card.name);
                                fs.writeFileSync(dataDir + '/errorCards.json', JSON.stringify(errorCards, null, ' '));
                            }
                        }
                    }
                }
                console.log('\tProcessed card. [' + (offset + index + 1) + '/' + totalCount + ']');
                index++;
            }
            offset += limit;
        }
        console.log('Processed page. [' + page + '/' + Math.ceil(totalCount / limit) + ']');

    }
})();