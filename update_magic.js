const req = require(`request`);
const Jimp = require(`jimp`);

const jsonURL = `http://mutik.erley.org/enc/sqlbridge.php?task=magic`;
const magicURL = `https://5thplanetdawn.insnw.net/dotd_live/images/items/magic/`;

/**
 * Handle magic image resize and composite on canvas
 * @param {Array} imgs Array with image links
 * @param {Jimp} canvas Canvas for images
 */
function addMagicSprite(imgs, canvas) {
    const mag = imgs.shift();
    if (mag) {
        Jimp.read(magicURL + mag.img, (err, img) => {
            if (!err) {
                img.resize(16, 16, Jimp.RESIZE_HERMITE);
                canvas.composite(img, 0, 16 * mag.id);
                console.log(`${mag.id} => ${mag.name}`);
            }
            setTimeout(addMagicSprite, 0, imgs, canvas);
        });
    }
    else canvas.write(`magic_sprite.png`);
}

function handleResponse(data) {
    if (data.status === 1) {
        const imgs = data.data;
        new Jimp(16, (imgs[imgs.length-1].id+5) * 16, (err, canv) => !err && addMagicSprite(imgs, canv));
    }
}

req({ url: jsonURL, json: true }, (err, res, body) => !err && res.statusCode === 200 && handleResponse(body));
