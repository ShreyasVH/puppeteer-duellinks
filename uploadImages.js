'use strict';

const fs = require('fs');
const path = require('path');
const upload = require('./api').upload;
const get = require('./api').get;
const mysql = require(`mysql-await`);

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

    const connection = mysql.createConnection({
        host     : 'host.docker.internal',
        user     : 'root',
        password : 'password',
        database : 'duel_links',
        port: 3307
    });

    const result = await connection.awaitQuery('SELECT id, name FROM cards where image_url = "https://res.cloudinary.com/dyoxubvbg/image/upload/v1571554087/cards/p5zathr8gjqahfi19lft.png" order by id desc');

    let cardIdMap = result.reduce((map, row) => {
        map[row.name] = row.id;
        return map;
    }, {});

    // console.log(cardIdMap);

    const cards = Object.values(cardsMap);
    let index = 0;
    for (const card of cards) {
        try {
            if (index > 0) {
                console.log('----------------------');
            }

            console.log('Processing card. [' + (index + 1) + '/' + cards.length + ']');
            console.log(card.name);

            const id = cardIdMap[card.name];
            if (id) {
                const formattedName = card.name.toLowerCase().replace(/[ ~!@#$%^&*()_+`\-={}|:"<>?\[\]\\;',.\/]/ig, '_');

                let imageUrl = await addImage(card.imageUrl, formattedName);

                await connection.awaitQuery('UPDATE cards set image_url = "' + imageUrl + '" where id = "' + id + '"');
                const response = await get(process.env.DUEL_LINKS_API + 'cards/index/' + id);
                console.log(response);
            }

            console.log('Processed card. [' + (index + 1) + '/' + cards.length + ']');
            index++;
        } catch (e) {

        }
    }

    connection.awaitEnd();
})();