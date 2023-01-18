'use strict';

const put = require('./api').put;
const fs = require('fs');
const path = require('path');

const getSubTypes = (key) => {
    const subTypeMap = {
        EFFECT: [
            'EFFECT'
        ],
        TUNER_NORMAL: [
            'NORMAL',
            'TUNER'
        ],
        TUNER_EFFECT: [
            'TUNER',
            'EFFECT'
        ],
        TOON_EFFECT: [
            'TOON',
            'EFFECT'
        ],
        FLIP_EFFECT: [
            'FLIP',
            'EFFECT'
        ],
        UNION_EFFECT: [
            'UNION',
            'EFFECT'
        ],
        GEMINI_EFFECT: [
            'GEMINI',
            'EFFECT'
        ],
        SPIRIT_EFFECT: [
            'SPIRIT',
            'EFFECT'
        ]
    };

    return subTypeMap[key];
}

(async () => {
    const dataDir = path.resolve(__dirname, 'data/');

    let cardIdMap = JSON.parse(fs.readFileSync(dataDir + '/idsForUpdateSubType.json').toString());
    // console.log(cardIdMap);

    let errors = [];

    for (const [key, cardIds] of Object.entries(cardIdMap)) {



        let index = 0;
        for (const cardId of cardIds) {
            if (index > 0) {
                console.log('----------------------');
            }

            console.log('Processing card. [' + (index + 1) + '/' + cardIds.length + ']');

            try {
                const response = await put(process.env.DUEL_LINKS_API + 'cards', {
                    id: cardId,
                    cardSubTypes: getSubTypes(key)
                });

                if (response.status !== 200) {
                    errors.push({
                        id: cardId,
                        response: response.result
                    });

                    fs.writeFileSync(dataDir + '/updateSubTypeErrors.json', JSON.stringify(errors, null, ' '));
                }
            } catch (e) {
                console.log(e);
                errors.push({
                    id: cardId,
                    response: 'Error while indexing'
                });

                fs.writeFileSync(dataDir + '/updateSubTypeErrors.json', JSON.stringify(errors, null, ' '));
            }

            console.log('Processed card. [' + (index + 1) + '/' + cardIds.length + ']');
            index++;
        }
    }
})();