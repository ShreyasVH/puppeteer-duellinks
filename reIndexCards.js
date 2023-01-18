'use strict';

const get = require('./api').get;
const fs = require('fs');
const path = require('path');

(async () => {
    const dataDir = path.resolve(__dirname, 'data/');

    let cardIds = [32, 6399, 6584, 6594, 6655];
    // for (let i = 4; i <= 6719; i++) {
    //     cardIds.push(i);
    // }

    let errors = [];
    let index = 0;
    for (const cardId of cardIds) {
        if (index > 0) {
            console.log('----------------------');
        }

        console.log('Processing card. [' + (index + 1) + '/' + cardIds.length + ']');

        try {
            const response = await get(process.env.DUEL_LINKS_API + 'cards/index/' + cardId);
            if (response.status !== 200) {
                errors.push({
                    id: cardId,
                    response: response.result
                });

                fs.writeFileSync(dataDir + '/reIndexErrors.json', JSON.stringify(errors, null, ' '));
            }
        } catch (e) {
            console.log(e);
            errors.push({
                id: cardId,
                response: 'Error while indexing'
            });

            fs.writeFileSync(dataDir + '/reIndexErrors.json', JSON.stringify(errors, null, ' '));
        }

        console.log('Processed card. [' + (index + 1) + '/' + cardIds.length + ']');
        index++;
    }
})();