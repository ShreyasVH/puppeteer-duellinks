'use strict';

const post = require('./api').post;
const upload = require('./api').upload;
const fs = require('fs');
const path = require('path');

const addImage = async (cardUrl, name) => {
    let imageUrl = process.env.DUEL_LINKS_DEFAULT_IMAGE_URL;
    try {
        const uploadedUrl = await upload(cardUrl, name, 'cards');
        if (uploadedUrl) {
            imageUrl = uploadedUrl;
        }
    } catch (e) {
        console.log(e);
    }
    return imageUrl;
}

(async () => {
    const dataDir = path.resolve(__dirname, 'data/');
    const cardsMap = JSON.parse(fs.readFileSync(dataDir + '/newCards.json').toString());

    let errors = [];

    const cards = Object.values(cardsMap);
    let index = 0;
    for (const card of cards) {
        if (index > 0) {
            console.log('----------------------');
        }

        console.log('Processing card. [' + (index + 1) + '/' + cards.length + ']');

        try {
            let payload = {
                name: card.name,
                rarity: card.rarity,
                cardType: card.cardType,
                cardSubTypes: card.cardSubTypes,
                description: card.description,
                limitType: card.limitType,
                releaseDate: card.releaseDate
            };

            const formattedName = card.name.toLowerCase().replace(/[ ~!@#$%^&*()_+`\-={}|:"<>?\[\]\\;',.\/]/ig, '_');

            let imageUrl = await addImage(card.imageUrl, formattedName);

            if (imageUrl) {
                payload.imageUrl = imageUrl;
            }

            if (card.cardType === 'MONSTER') {
                payload.level = card.level;
                payload.attribute = card.attribute;
                payload.type = card.type;
                payload.attack = card.attack;
                payload.defense = card.defense;
            }

            const response = await post(process.env.DUEL_LINKS_API + 'cards', payload);
            if (response.status !== 200) {
                errors.push({
                    payload,
                    response: response.result
                });

                fs.writeFileSync(dataDir + '/importErrors.json', JSON.stringify(errors, null, ' '));
            }
        } catch (e) {
            errors.push({
                name: card.name,
                response: 'Error while importing'
            });

            fs.writeFileSync(dataDir + '/importErrors.json', JSON.stringify(errors, null, ' '));
        }

        console.log('Processed card. [' + (index + 1) + '/' + cards.length + ']');
        index++;
    }
})();