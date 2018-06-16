const req = require(`request`);
const Jimp = require(`jimp`);
const Zip = require(`adm-zip`);

const xmlURL = `https://content.5thplanetgames.com/dotd_live/xml/xml.zip?v=${new Date().getTime()}`;
const magicURL = `https://content.5thplanetgames.com/dotd_live/images/items/magic/`;

/**
 * Handle magic image resize and composite on canvas
 * @param {Array} imgs Array with image data
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
            else console.log(`Error reading online data <${magicURL + mag.img}>`);
            setTimeout(addMagicSprite, 0, imgs, canvas);
        });
    }
    else canvas.write(`magic_sprite.png`);
}

const magReg = /<item.*?id="(\d+?)".+name="(.+?)"[\s\S]+?<icon>(.+?)</gu;

function handleResponse(data) {
    const imgs = [];
    new Zip(data).getEntries().forEach(entry => {
        if (entry.entryName.includes(`magic_data`)) {
            const magics = entry.getData().toString(); let magic;
            while ((magic = magReg.exec(magics))) imgs.push({ id: parseInt(magic[1]), name: magic[2], img: magic[3] });
        }
    });


    new Jimp(16, (imgs[imgs.length - 1].id + 5) * 16, (err, canv) => !err && addMagicSprite(imgs, canv));
}

req({ url: xmlURL, encoding: null }, (err, res, body) => !err && res.statusCode === 200 && handleResponse(body));
