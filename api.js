const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const cloudinary = require('cloudinary');

const get = async (url, headers) => {
    try {
        const response = await axios.get(url, {
            headers
        });

        return {
            status: response.status,
            result: response.data
        };
    } catch (e) {
        return {
            status: e.response.status,
            result: e.response.data
        };
    }
};

const post = async (url, payload, headers = {}) => {
    try {
        const response = await axios.post(url, payload, {
            headers
        });
console.log(url);
        return {
            status: response.status,
            result: response.data
        };
    } catch (e) {
        return {
            status: e.response.status,
            result: e.response.data
        };
    }
};

const put = async (url, payload, headers) => {
    try {
        const response = await axios.put(url, payload, {
            headers
        });

        return {
            status: response.status,
            result: response.data
        };
    } catch (e) {
        return {
            status: e.response.status,
            result: e.response.data
        };
    }
};

const download = async (url, path) => {
    try {
        const response = await axios.get(url, {
            responseType: 'stream'
        });

        response.data.pipe(fs.createWriteStream(path));
    } catch (e) {

    }
};

const upload = async (path, fileName, folder) => {
    let imageUrl = '';
    // try {
    //     // console.log(path);
    //     const url = 'http://host.docker.internal:9091/upload/file';
    //
    //
    //     const file = await fs.createReadStream(path);
    //     // const file = (fs.readFileSync(path));
    //
    //     const boundary = uniqid();
    //     const delimiter = '-------------' + boundary;
    //
    //     let payload = '';
    //     const eol = '\r\n';
    //
    //     payload += '--' + delimiter + eol + 'Content-Disposition: form-data; name="' + 'folderName' + '"' + eol + eol + folder + eol;
    //
    //     payload += '--' + delimiter + eol + 'Content-Disposition: form-data; name="' + fileName + '"; filename="' + fileName + '"' + eol + 'Content-Transfer-Encoding: binary' + eol;
    //     payload += eol;
    //     payload += file + eol;
    //     payload += '--' + delimiter + '--' + eol;
    //
    //
    //     // console.log(form_data.getHeaders());
    //
    //     const request_config = {
    //         headers: {
    //             'Content-Type': 'multipart/form-data; boundary=' + delimiter,
    //             'Content-Length': payload.length
    //         }
    //     };
    //     const response = await axios.post(url, payload, request_config);
    //     console.log(response.data);
    // } catch (e) {
    //     console.log('error', e);
    // }

    cloudinary.config({
        cloud_name: 'dyoxubvbg',
        api_key: '488511299236237',
        api_secret: '0OdBhSYSmt70YlrXYHv083cxF04'
    });

    try {
        const response = await cloudinary.v2.uploader.upload(path, {
            public_id: fileName,
            folder: folder
        });
        imageUrl = response.secure_url;
    } catch (e) {
        console.log(e);
    }

    return imageUrl;
}

const uniqid = (length) => {
    var dec2hex = [];
    for (var i=0; i<=15; i++) {
        dec2hex[i] = i.toString(16);
    }

    var uuid = '';
    for (var i=1; i<=36; i++) {
        if (i===9 || i===14 || i===19 || i===24) {
            uuid += '-';
        } else if (i===15) {
            uuid += 4;
        } else if (i===20) {
            uuid += dec2hex[(Math.random()*4|0 + 8)];
        } else {
            uuid += dec2hex[(Math.random()*16|0)];
        }
    }

    if(length) uuid = uuid.substring(0,length);
    return uuid;
}

exports.get = get;
exports.post = post;
exports.put = put;
exports.download = download;
exports.upload = upload;