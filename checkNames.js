'use strict';

const fs = require('fs');
const path = require('path');

(async () => {
    const dataDir = path.resolve(__dirname, 'data/');
    const cardsMap = JSON.parse(fs.readFileSync(dataDir + '/existingCards.json').toString());

    let errors = [];

    const cards = Object.values(cardsMap);
    let index = 0;
    for (const card of cards) {
        if (index > 0) {
            console.log('----------------------');
        }

        console.log('Processing card. [' + (index + 1) + '/' + cards.length + ']');

        let isError = false;
        const formattedName = card.name.toLowerCase().replace(/[ ~!@#$%^&*()_+`\-={}|:"<>?\[\]\\;',.\/]/ig, '_');

        for (let ch of formattedName) {
            if (!ch.match(/[a-z_0-9]/)) {
                isError = true;
                break;
            }
        }

        if (isError) {
            errors.push(card.name);
            fs.writeFileSync(dataDir + '/errorNames.json', JSON.stringify(errors, null, ' '));
        }

        console.log('Processed card. [' + (index + 1) + '/' + cards.length + ']');
        index++;
    }
})();