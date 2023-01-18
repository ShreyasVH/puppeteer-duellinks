'use strict';

const post = require('./api').post;
const download = require('./api').download;
const upload = require('./api').upload;
const fs = require('fs');
const path = require('path');

(async () => {
    const dataDir = path.resolve(__dirname, 'data/');

    const response = await upload(dataDir + '/abc.png', 'abc.png', 'cards');
    console.log(response);
})();