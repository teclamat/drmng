// ==UserScript==
// @name            DotD Raids Manager Next Gen
// @namespace       tag://kongregate
// @description     Makes managing raids a lot easier
// @author          Mutik
// @version         2.1.16
// @grant           GM_xmlhttpRequest
// @grant           unsafeWindow
// @include         *www.kongregate.com/games/5thPlanetGames/dawn-of-the-dragons*
// @include         *50.18.191.15/kong/?DO_NOT_SHARE_THIS_LINK*
// @include         *dotd-web1.5thplanetgames.com/kong/?DO_NOT_SHARE_THIS_LINK*
// @connect         50.18.191.15
// @connect         dotd-web1.5thplanetgames.com
// @connect         prntscr.com
// @connect         prnt.sc
// @hompage         https://mutikt.ml
// ==/UserScript==

/**
 * Object containing raid info
 * @typedef {Object} raidObject
 * @property {string} id Raid id
 * @property {number} diff Raid difficulty [1-4]
 * @property {string} boss Raid boss name
 * @property {string} hash Raid hash
 * @property {number} sid Server ID [1-2]
 * @property {number} pid Platform ID [0-1]
 * @property {string} poster User name who posted raid link
 * @property {number} createtime Creation timestamp
 */

function main() {
    window.DRMng = {
        ServerWS: `wss://mutikt.ml:3000`,
        logColors: { debug: `purple`, info: `#1070f0`, log: `#108030` },
        log: function (...args) {
            const type = [`info`, `warn`, `error`, `debug`].indexOf(args[0]) > -1 ? args[0] : `log`;
            if (type !== `log`) args = args.slice(1);
            if ([`warn`, `error`].indexOf(type) === -1) {
                if (typeof args[0] === `string` && /%[csd]/.test(args[0])) {
                    args[0] = `%c[DRMng] ${args[0]}`;
                    args.splice(1, 0, `color:${DRMng.logColors[type]}`);
                }
                else {
                    const temp = [`%c[DRMng]`];
                    while (typeof args[0] === `string`) temp.push(args.shift());
                    args.unshift(temp.join(` `), `color:${DRMng.logColors[type]}`);
                }
            }
            console[type].apply(console, args);
        },
        About: {
            name: `DotD Raids Manager next gen`,
            major: `2`, minor: `1`, build: `16`,
            version: function () {
                return `<b>${this.name}</b><br>version: <b>${this.ver()}</b><br>` +
                       `<a href="https://cdn.jsdelivr.net/gh/mutik/drmng@2/kong_ng.user.js">click me to update</a>`;
            },
            ver: function () {
                return `${this.major}.${this.minor}.${this.build}`;
            }
        },
        /**
         * DOM Node manipulation class
         */
        Node: class {
            /**
             * Creates a Node
             * @param {(string|Node)} element Element to create or reference
             * @return {DRMng.Node} Custom Node instance
             */
            constructor(element) {
                this._el = null;
                if (typeof element === `string`)
                    this._el = element.charAt(0) === `#` ?
                               document.getElementById(element.slice(1)) :
                               document.createElement(element);
                else if (element instanceof Node) this._el = element;
            }

            get node() { return this._el; }

            get notNull() { return this._el !== null; }

            attr(param) {
                Object.keys(param).forEach(attr => this._el.setAttribute(attr, param[attr]));
                return this;
            }

            remove(param) {
                if (!(param instanceof Array)) param = [param];
                param.forEach(attr => this._el.removeAttribute(attr));
                return this;
            }

            style(param) {
                Object.keys(param).forEach(prop => this._el.style.setProperty(prop, param[prop]));
                return this;
            }

            clear() {
                while (this._el.firstChild) this._el.removeChild(this._el.firstChild);
                return this;
            }

            txt(text = ``, overwrite = false) {
                if (overwrite) this.clear();
                this._el.appendChild(document.createTextNode(text));
                return this;
            }

            html(text = ``, overwrite = false) {
                if (overwrite) this.clear();
                if (typeof text === `string`) this._el.innerHTML += text;
                else {
                    if (text instanceof DRMng.Node) text = text.node;
                    if (text instanceof Node) this._el.appendChild(text);
                }
                return this;
            }

            data(data) {
                if (data) {
                    if (typeof data === `string` && /<.{3,}?>/.test(data) === false) this.txt(data);
                    else this.html(data);
                }
                return this;
            }

            on(event, func, bubble) {
                this._el.addEventListener(event, func, bubble);
                return this;
            }

            off(event, func, bubble) {
                this._el.removeEventListener(event, func, bubble);
                return this;
            }

            detach() {
                if (this._el.parentNode) this._el = this._el.parentNode.removeChild(this._el);
                return this;
            }

            attach(method, dst) {
                if (typeof dst === `string`) dst = document.getElementById(dst);
                else if (dst instanceof DRMng.Node) dst = dst._el;
                if (!(dst instanceof Node)) {
                    DRMng.log(`warn`, `{Node:attach} Invalid destination : ${dst}`);
                    return this;
                }
                if (!/^(?:to|before|after)$/i.test(method)) {
                    DRMng.log(`warn`, `{Node:attach} Invalid method ${method}`);
                    return this;
                }
                if (method === `to`) dst.appendChild(this._el);
                else if (method === `before`) dst.parentNode.insertBefore(this._el, dst);
                else if (dst.nextSibling === null) dst.parentNode.appendChild(this._el);
                else dst.parentNode.insertBefore(this._el, dst.nextSibling);
                return this;
            }
        },
        /**
         * Factory class with various utils
         */
        Util: class {
            /**
             * Creates, updates or removes CSS stylesheet with given ID
             * @param {string} id Stylesheet id
             * @param {?string} [content] Stylesheet content to create/update
             */
            static cssStyle(id, content = null) {
                let s = new DRMng.Node(`#${id}`);
                if (content !== null) {
                    if (!s.notNull)
                        s = new DRMng.Node(`style`)
                            .attr({ type: `text/css`, id: id })
                            .attach(`to`, document.head);
                    s.txt(content, true);
                }
                else if (s.notNull) s.detach();
            }

            /**
             * Copies fields from src to dst. If fields is null, all fields from src are copied.
             * If additionally dst is not defined, method creates shallow copy of src.
             * @param {Object} src Source object
             * @param {Object} [dst] Destination object
             * @param {?Array.<string>} [fields] Fields to copy from source object
             * @return {Object} Merge of src and dst objects (shallow)
             */
            static copyFields(src, dst = {}, fields = null) {
                const keys = fields ? Object.keys(src).filter(f => fields.indexOf(f) > -1) : Object.keys(src);
                keys.forEach(field => dst[field] = src[field]);
                return dst;
            }

            /**
             * Returns value from given HTTP GET query string
             * @param {string} field Name of the field to search
             * @param {string} [query] HTTP GET query string. If not given,
             *                         [window.location.search] will be used
             * @return {string} Value of given field or empty string if field not found
             */
            static getQueryVariable(field, query = window.location.search) {
                const fldStart = query.indexOf(field);
                if (fldStart > -1) {
                    const valEnd = query.indexOf(`&`, fldStart);
                    if (valEnd < 0) return query.slice(fldStart + field.length + 1);
                    else return query.slice(fldStart + field.length + 1, valEnd);
                }
                return ``;
            }

            /**
             * Generates 32 bit Cyclic Redundancy Check
             * @param {Object} str Input data. Objects are JSON stringified before calculation
             * @return {string} Hex representation of CRC32 hash
             */
            static crc32(str = ``) {
                if (!DRMng.Util.crcTbl) DRMng.Util.crcTbl = new Uint32Array(256).map(
                    (itm, i) => new Array(8).fill(0).reduce(c => c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1, i));

                const crc = new Uint32Array(1);
                crc[0] = 0xffffffff;
                str = (typeof str !== `string` ? JSON.stringify(str) : str).split(``);
                str.forEach(c => crc[0] = (crc[0] >>> 8) ^ DRMng.Util.crcTbl[(crc[0] ^ c.charCodeAt(0)) & 0xff]);
                crc[0] ^= 0xffffffff;
                return crc[0].toString(16);
            }

            /**
             * Creates raid object from join url
             * @param {string} url Raid join url
             * @param {string} [poster] Optional poster of peocessed raid
             * @return {?raidObject} Filled raid object or null if parsing failed
             */
            static getRaidFromUrl(url, poster = ``) {
                const r = { createtime: new Date().getTime(), poster: poster };
                const reg = /[?&]([^=]+)=([^?&]+)/ig;
                const p = url.replace(/&amp;/gi, `&`).replace(/kv_&/gi, `&kv_`);
                let cnt = 0, i;
                while ((i = reg.exec(p))) {
                    switch (i[1]) {
                        case `kv_raid_id`:
                        case `raid_id`:
                            r.id = i[2];
                            cnt++;
                            break;
                        case `kv_difficulty`:
                        case `difficulty`:
                            r.diff = parseInt(i[2]);
                            cnt++;
                            break;
                        case `kv_raid_boss`:
                        case `raid_boss`:
                            r.boss = i[2];
                            cnt++;
                            break;
                        case `kv_hash`:
                        case `hash`:
                            r.hash = i[2];
                            cnt++;
                            break;
                        case `kv_serverid`:
                        case `serverid`:
                            r.sid = parseInt(i[2]);
                            break;
                    }
                }
                if (cnt < 4) return null;
                r.pid = r.sid === 2 ? 0 : 1;
                return r;
            }

            /**
             * Formats number to human readable form
             * @param {number} num Number to format
             * @param {number} [p] Precision (number of digits)
             * @return {string} Formatted number
             */
            static getShortNum(num, p = 4) {
                num = parseInt(num);
                if (isNaN(num) || num < 0) return num;
                if (num >= 1000000000000000) return (num / 1000000000000000).toPrecision(p) + `q`;
                if (num >= 1000000000000) return (num / 1000000000000).toPrecision(p) + `t`;
                if (num >= 1000000000) return (num / 1000000000).toPrecision(p) + `b`;
                if (num >= 1000000) return (num / 1000000).toPrecision(p) + `m`;
                if (num >= 1000) return (num / 1000).toPrecision(p) + `k`;
                return num + ``;
            }

            /**
             * Formats number to human readable form, lowest number is in kilos
             * @param {number} num Number to format
             * @param {number} [p=4] Precision (number of digits)
             * @return {string} Formatted number
             */
            static getShortNumK(num, p = 4) {
                num = parseInt(num);
                if (isNaN(num) || num < 0) return num + ``;
                if (num >= 1000000000000) return (num / 1000000000000).toPrecision(p) + `q`;
                if (num >= 1000000000) return (num / 1000000000).toPrecision(p) + `t`;
                if (num >= 1000000) return (num / 1000000).toPrecision(p) + `b`;
                if (num >= 1000) return (num / 1000).toPrecision(p) + `m`;
                return num.toPrecision(p) + `k`;
            }

            /**
             * Returns random integer number between selected minimum and maximum (inclusive)
             * @param {number} [max=1] Highest possible integer
             * @param {number} [min=0] Lowest possible integer
             * @return {number} Pseudorandom integer between selected constraints
             */
            static getRand(max = 1, min = 0) {
                return Math.floor(min + Math.random() * (max + 1));
            }

            /**
             * Converts Roman numbers to Arabic
             * @param {string} roman String with roman number
             * @return {number} Arabic number
             */
            static deRomanize(roman) {
                const lut = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
                let arabic = 0, i = roman.length;
                while (i--) {
                    if (lut[roman[i]] < lut[roman[i + 1]]) arabic -= lut[roman[i]];
                    else arabic += lut[roman[i]];
                }
                return arabic;
            }
        },
        // TODO: Remove when new one's ready
        hResize: {
            ev: null,
            regPanes: [],
            regSide: [],
            regLeft: false,
            regRight: false,
            pane: null,
            rect: null,
            x: 0,
            y: 0,
            left: false,
            right: false,
            redraw: false,
            clicked: null,
            calc: function (e) {
                if (this.pane === null) return false;
                this.rect = this.pane.getBoundingClientRect();
                this.x = e.clientX - this.rect.left;
                this.left = this.regLeft && this.x > -7 && this.x < 7;
                this.right = this.regRight && this.x > this.rect.width - 7 && this.x < this.rect.width + 7;
                return true;
            },
            findPane: function (e) {
                let p = e.target, idx;
                while (p && p.nodeName !== `BODY`) {
                    idx = this.regPanes.indexOf(p.id);
                    if (idx > -1) {
                        this.pane = p;
                        if (this.regSide[idx]) {
                            this.regLeft = true;
                            this.regRight = false;
                        }
                        else {
                            this.regLeft = false;
                            this.regRight = true;
                        }
                        break;
                    }
                    p = p.parentNode;
                }
            },
            onMouseDown: function (e) {
                this.findPane(e);
                if (this.calc(e)) this.onDown(e);
            },
            onDown: function (e) {
                let isResizing = this.left || this.right;
                if (isResizing) e.preventDefault();
                this.clicked = {
                    x: this.x,
                    cx: e.clientX,
                    w: this.rect.width,
                    isResizing: isResizing,
                    left: this.left,
                    right: this.right
                };
                if (this.pane.id === `DRMng_main`) {
                    this.pane.style.setProperty(`transition`, `none`);
                    document.getElementById(`primarywrap`).style.setProperty(`transition`, `none`);
                    document.getElementById(`headerwrap`).style.setProperty(`transition`, `none`);
                }
                this.animate();
            },
            hold: false,
            resetHold: function () {
                this.hold = false;
                //console.log(this);
                if (!(this.right || this.left)) document.body.style.removeProperty(`cursor`);
            },
            onMove: function (e) {
                if (this.hold) return;
                if (this.clicked === null) {
                    this.findPane(e);
                    this.hold = true;
                    setTimeout(this.resetHold.bind(this), 300);
                }
                this.onMoveProgress(e);
            },
            onMoveProgress: function (e) {
                if (!this.calc(e)) return;
                if (this.right || this.left) document.body.style.cursor = `ew-resize`;
                //if (this.right || this.left) this.pane.style.cursor = `ew-resize`;
                //else this.pane.style.cursor = `default`;


                this.ev = e;
                this.redraw = true;
            },
            onUp: function () {
                document.body.style.removeProperty(`cursor`);
                if (this.pane) {
                    const p = this.pane;
                    let w;
                    switch (p.id) {
                        case `chat_container`:
                            w = parseInt(p.style.width.replace(`px`, ``));
                            DRMng.Config.local.kong.chatWidth =
                                DRMng.Config.local.alliance.sbs ? parseInt((w - 7) / 2) : w;
                            DRMng.Config.saveLocal();
                            DRMng.Kong.setHeaderWidth();
                            break;
                        case `DRMng_main`:
                            DRMng.Config.local.scriptWidth = parseInt(p.style.width.replace(`px`, ``));
                            DRMng.Config.saveLocal();
                            p.style.removeProperty(`transition`);
                            document.getElementById(`primarywrap`).style.removeProperty(`transition`);
                            document.getElementById(`headerwrap`).style.removeProperty(`transition`);
                            break;
                    }
                }
                this.clicked = null;
                this.pane = null;
            },
            animate: function () {
                if (this.clicked) requestAnimationFrame(this.animate.bind(this));
                if (!this.redraw) return;
                this.redraw = false;
                if (this.clicked && this.clicked.isResizing) {
                    if (this.clicked.right)
                        this.pane.style.width = parseInt(Math.max(this.x, 200)) + `px`;
                    const w = parseInt(Math.max(this.clicked.cx - this.ev.clientX + this.clicked.w, 200));
                    if (this.clicked.left) {
                        this.pane.style.width = w + `px`;
                    }
                    if (this.pane.id === `DRMng_main`) DRMng.Kong.setWrapperWidth(w);
                }
            },
            init: function () {
                document.addEventListener(`mousemove`, this.onMove.bind(this));
                document.addEventListener(`mouseup`, this.onUp.bind(this));
                //this.animate();
            }
        },
        // TODO: Finish new resizer
        Resizer: class {
            constructor() {
                this.ev = null;
                this.pane = null;
                this.side = [];
                this.regLeft = false;
                this.regRight = false;
                this.left = false;
                this.right = false;
                this.rect = null;
                this.posX = 0;
                this.redraw = false;
                this.clicked = null;
            }

            calc(e) {
                if (this.pane) {
                    this.rect = this.pane.getBoundingClientRect();
                    this.posX = e.clientX - this.rect.left;
                    this.left = this.regLeft && this.x < 6;
                    this.right = this.regRight && this.x >= this.rect.width - 6;
                    return true;
                }
            }
        },
        /**
         * XHR calls gateway
         */
        Gate: {
            /**
             * Calls lightshot service to get real image url
             * @param {string} link Link with obfuscated image url
             * @param {string} id ID of destination Node
             * @param {string} ch Channel
             * @param {boolean} arr request array buffer type
             */
            lightShot: (link, id, ch, arr = false) => {
                const req = {
                    eventName: `DRMng.lightShot`,
                    url: link,
                    method: `GET`,
                    id: id,
                    ch: ch,
                    timeout: 10000
                };
                if (arr) req.responseType = `arraybuffer`;
                DRMng.postMessage(req);
            },
            // TODO: Add support for regular kong chat as well
            /**
             * Lightshot callback
             * @param {Object} e returned data
             */
            lightShotCb: e => {
                const d = JSON.parse(e && e.data);
                const i = new DRMng.Node(`#${d.id}`);
                const c = d.ch;
                if (i.notNull) {
                    let img = /og:image.+?content="(.+?)"/.exec(d.responseText);
                    if (img && img[1] && img[1].indexOf(`image.prntscr.com`) > 0) {
                        setTimeout(() => DRMng.Gate.lightShot(img[1], d.id, d.ch, true), 0);
                        return;
                    }
                    img = d.responseType === `arraybuffer` ? `data:image/png;base64,${btoa(d.responseText)}` : img[1];
                    if (img && c)
                        i.on(`load`,
                             () => { setTimeout(() => DRMng.PrivateChat.getChat(c).scrollToBottom(), 250); })
                         .attr({ src: img })
                         .remove(`id`);
                    else i.detach();
                }
            }
        },
        /**
         * Gestures class
         */
        Gestures: {
            Kiss: {
                smittenAdjective: [`smitten`, `enamored`, `infatuated`, `taken`, `in love`, `inflamed`],
                getSmittenAdjective: function () { return this.smittenAdjective[DRMng.Util.getRand(5)]; },
                generate: function () {
                    let txt = ``;
                    switch (DRMng.Util.getRand(8)) {
                        case 0:
                            txt = `@from gives @who a puckered kiss on the lips.`;
                            break;
                        case 1:
                            txt = `@from plants a gentle kiss on the cheek of @who.`;
                            break;
                        case 2:
                            txt = `@from kisses @who... might have used tongue on that one.`;
                            break;
                        case 3:
                        case 4:
                            txt = `@from seems ` + this.getSmittenAdjective() + ` with @who.`;
                            break;
                        default:
                            txt = `@from tickles the lips of @who with a sensual kiss.`;
                    }
                    return txt;
                }
            },
            Poke: {
                pokeBodyPlace: [
                    `on the cheek`, `on the navel`, `in the nose`, `in the belly button`, `in the rib cage`,
                    `in a really ticklish spot`, `square on the forehead`, `with a wet willy in the ear`, `on the arm`,
                    `on the shoulder`, `on the chest`, `on the leg`, `in the face`, `on the neck`, `in the stomach`,
                    `up the butt`
                ],
                getPokeBodyPlace: function () { return this.pokeBodyPlace[DRMng.Util.getRand(14)]; },
                generate: function () {
                    let txt = ``;
                    switch (DRMng.Util.getRand(6)) {
                        case 0:
                            txt = `@from with a tickling finger of doom, pokes @who `;
                            break;
                        case 1:
                            txt = `@from jumps out from the shadows and prods @who `;
                            break;
                        case 2:
                            txt = `@from playfully pokes @who `;
                            break;
                        case 3:
                            txt = `@from cheerfully pokes @who `;
                            break;
                        case 4:
                            txt = `@from gleefully pokes @who `;
                            break;
                        case 5:
                            txt = `@from pokes @who repeatedly `;
                            break;
                        default:
                            txt = `@from, with index finger stern and pointy, pokes @who `;
                            break;
                    }
                    return txt + this.getPokeBodyPlace() + `.`;
                }
            },
            Hit: {
                strikeAction: [
                    `clobber`, `subdue`, `hit`, `bash`, `pound`, `pelt`, `hammer`, `wallop`, `swat`, `punish`, `pummel`,
                    `strike`, `beat`
                ],
                leapingAction: [
                    `vaults`, `surges`, `hurdles`, `bounds`, `pounces`, `storms`, `leaps`, `bolts`, `stampedes`,
                    `sprints`, `dashes`, `charges`, `lunges`
                ],
                aimModifier: [
                    `a well placed`, `a pin-point accurate`, `a targeted`, `an aimed`, `a`, `a`, `a`, `a`, `a`, `a`, `a`
                ],
                wrestlingMove: [
                    ` haymaker punch`, ` kitchen sink to the midsection`, ` jumping DDT`, ` cross body attack`,
                    ` flying forearm`, ` low dropkick`, ` jumping thigh kick`, ` roundhouse`,
                    ` left and right hook combo`, ` jab and middle kick combo`,
                    ` spinning backfist and shin kick combo`, ` delayed backbrain wheel kick`,
                    ` somersault kick to an uppercut combo`, ` jab to the face`, ` stomping hook punch`,
                    ` palm thrust to the solar plexus`, ` shin kick`, ` side headbutt`,
                    ` fast lowerbody roundhouse kick`, ` fast upperbody roundhouse kick`, `n uppercut palm strike`,
                    `n uppercut to midsection jab combo`, ` downward chop`
                ],
                meal: [
                    `midmorning snack`, `midnight snack`, `supper`, `breakfast`, `brunch`, `2 o'clock tea time`,
                    `midafternoon snack`, `lunch`
                ],
                throwAction: [`tosses`, `propels`, `throws`, `catapults`, `hurls`, `launches`],
                crying: [`shouting`, `screaming`, `hollering`, `yelling`, `crying out`],
                sportsWeapon: [
                    `cricket paddle`, `lacrosse stick`, `hockey stick`, `croquet mallet`, `baseball bat`, `yoga ball`,
                    `barbell`, `folding lawn chair`, `caber`, `shot put`, `bowling ball`, `lantern`, `tennis racket`
                ],
                midsectionStrikePlace: [`midsection`, `solar plexus`, `chest`, `abdomen`, `sternum`],
                randomItemWeapon: [
                    `a giant frozen trout`, `an inflatable duck`, `a waffle iron`, `a sponge brick`,
                    `a board of education`, `an unidentified implement of mayhem and destruction`,
                    `a rubber ducky *SQUEAK*`, `a rolling pin`, `a tire iron`, `a sock full of oranges`,
                    `a slinky, a slink [fun for a girl or a boy]`, `a chinese finger puzzle`, `a whip of wet noodles`,
                    `a humungous spicey italian meatstick`, `a giant garlic dill`, `an ACME hammer of pain`
                ],
                withDescriptors: [
                    `with lightning reflexes, `, `with finesse and poise, `, `with mediocre skill, `,
                    `with half-cocked attitude, `, `with fervor and oomph, `, `with vitality and gusto, `,
                    `with ambition and enthusiasm, `, ``, ``, ``, ``
                ],
                strikeActionVerb: [
                    `clobbers`, `subdues`, `hits`, `bashes`, `pounds`, `pelts`, `hammers`, `wallops`, `swats`,
                    `punishes`, `pummels`, `strikes`, `assaults`, `beats`
                ],
                generate: function () {
                    let txt = ``;
                    switch (DRMng.Util.getRand(7)) {
                        case 0:
                            txt += `@from attempts to `;
                            txt += this.strikeAction[DRMng.Util.getRand(12)] + ` @who but fails...`;
                            break;
                        case 1:
                            txt += `@from ` + this.leapingAction[DRMng.Util.getRand(12)];
                            txt += ` towards @who and lands ` + this.aimModifier[DRMng.Util.getRand(10)];
                            txt += this.wrestlingMove[DRMng.Util.getRand(20)] + `.`;
                            break;
                        case 2:
                            txt += `@from takes what's left of ` + this.meal[DRMng.Util.getRand(7)] + `, `;
                            txt += this.throwAction[DRMng.Util.getRand(5)] + ` it towards @who `;
                            txt += this.crying[DRMng.Util.getRand(4)] + `, 'FOOD FIGHT'!`;
                            break;
                        case 4:
                            txt = `@from rolls up a magazine planting a blow upside the head of @who.`;
                            break;
                        case 5:
                            txt = `@from hits @who on the head with a frying pan.`;
                            break;
                        case 6:
                            txt += `@from plants a ` + this.sportsWeapon[DRMng.Util.getRand(12)] + ` to the `;
                            txt += this.midsectionStrikePlace[DRMng.Util.getRand(4)] + ` of @who.`;
                            break;
                        default:
                            txt += `@from pulls out ` + this.randomItemWeapon[DRMng.Util.getRand(15)];
                            txt += ` and ` + this.withDescriptors[DRMng.Util.getRand(10)];
                            txt += this.strikeActionVerb[DRMng.Util.getRand(13)] + ` @who with it.`;
                    }
                    return txt;
                }
            },
            Slap: {
                slapWeapon: [
                    `white glove`, `rubber chicken`, `well placed backhand`, `failing Euryino`, `piece of moldy pizza`,
                    `big dildo`, `loaf of french bread`, `smile of devious pleasure`, `dead >0))>-<`,
                    `left over chicken drumstick`, `limp and slightly dirty french fry`, `brick of moldy cheese`,
                    `tickle me Elmo`, `grilled cheese`
                ],
                targetAction: [
                    `deals`, `aims`, `inflicts`, `releases`, `dispatches`, `discharges`, `delivers`, `unleashes`
                ],
                sassySynonym: [
                    `an audacious`, `an impudent`, `a bold`, `an overbold`, `an arrant`, `a brassy`, `a sassy`
                ],
                place: [[`side`, `'s head.`], [`face`, `.`], [`cheek`, `.`]],
                leapingAction: [
                    `vaults`, `surges`, `hurdles`, `bounds`, `pounces`, `storms`, `leaps`, `bolts`, `stampedes`,
                    `sprints`, `dashes`, `charges`, `lunges`
                ],
                leadSpeed: [
                    ` sudden`, ` spry`, `n abrupt`, `n energetic`, ` hasty`, `n agile`, `n accelerated`, ` quick`
                ],
                generate: function () {
                    let txt = ``, place;
                    switch (DRMng.Util.getRand(2)) {
                        case 0:
                            txt = `@from slaps @who with a ` + this.slapWeapon[DRMng.Util.getRand(13)] + `.`;
                            break;
                        case 1:
                            place = this.place[DRMng.Util.getRand(2)];
                            txt += `@from ` + this.targetAction[DRMng.Util.getRand(7)];
                            txt += ` ` + this.sassySynonym[DRMng.Util.getRand(6)] + ` slap to the `;
                            txt += place[0] + ` of @who` + place[1];
                            break;
                        default:
                            txt += `@from ` + this.leapingAction[DRMng.Util.getRand(12)] + ` forward and with a `;
                            txt += this.slapWeapon[DRMng.Util.getRand(13)] + `, deals a`;
                            txt += this.leadSpeed[DRMng.Util.getRand(7)] + ` slap to @who.`;
                    }
                    return txt;
                }
            }
        },
        Config: {
            /**
             * Default local config data
             */
            local: {
                kong: {
                    kongSlimHeader: false,
                    chatWidth: 250
                },
                server: `Elyssa`,
                sortBy: `hp`,
                scriptWidth: 300,
                visited: { kasan: [], elyssa: [] },
                dead: { kasan: {}, elyssa: {} },
                raidData: {},
                raidKeys: [],
                filterData: {},
                tiersData: {},
                filterString: { kasan: ``, elyssa: `` },
                filterRaids: { kasan: {}, elyssa: {} },
                hardFilter: { kasan: [], elyssa: [] },
                checkSums: {
                    raidData: ``,
                    filterData: ``,
                    tiersData: ``,
                },
                alliance: {
                    //enabled: false,
                    //channel: ``,
                    //pass: ``,
                    sbs: false,
                    rooms: []
                },
                gameFrame: {
                    removeWChat: false,
                    leftWChat: false,
                    hideWChat: false
                },
                sidebar: {}
            },
            /**
             * TODO: Add remote configuration storage
             * Default remote config data
             */
            remote: {},
            /**
             * Returns config value of given property name
             * @param {string} key Property name
             * @return {*} Data from selected property
             */
            get: key => key.split(`::`).reduce((t, l) => t[l], DRMng.Config.local),
            /**
             * Sets config parameters. Saves local configuration afterwards
             * @param {Object} params Parameters as object properties with values
             */
            set: params => {
                if (params) {
                    const loc = DRMng.Config.local;
                    Object.keys(params).forEach(key => {
                        if (key.indexOf(`::` > -1)) {
                            const keys = key.split(`::`);
                            const sub = keys.reduce((t, l, i) => (i < keys.length - 1 ? t[l] : t), loc);
                            const lastKey = keys[keys.length - 1];
                            sub[lastKey] = params[key];
                        }
                        else loc[key] = params[key];
                    });
                    setTimeout(DRMng.Config.saveLocal, 0);
                }
            },
            /**
             * Loads local config to object
             */
            loadLocal: () => {
                const data = localStorage[`DRMng`] ? JSON.parse(localStorage[`DRMng`]) : {};
                const loc = DRMng.Config.local;
                if (data) {
                    Object.keys(loc).forEach(key => { if (data[key]) loc[key] = data[key]; });
                    // TODO: Remove after 3 consecutive versions (chat options migration)
                    if (loc.alliance.rooms === undefined && loc.alliance.pass) {
                        loc.alliance.rooms = [];
                        loc.alliance.rooms.push({
                                                    name: loc.alliance.channel.charAt(0).toUpperCase() +
                                                          loc.alliance.channel.slice(1),
                                                    channel: loc.alliance.channel, pass: loc.alliance.pass,
                                                    color: `336699`, enabled: true
                                                });
                        delete loc.alliance.pass;
                        delete loc.alliance.channel;
                        delete loc.alliance.enabled;
                    }
                    Object.keys(data).forEach(key => { if (loc[key] === undefined) loc[key] = data[key]; });
                }
                //else DRMng.Config.saveLocal();
                loc.raidKeys = Object.keys(loc.raidData);
                DRMng.Config.saveLocal();
            },
            /**
             * Saves config to local storage
             */
            saveLocal: () => localStorage[`DRMng`] = JSON.stringify(DRMng.Config.local)
        },
        /**
         * Chat message class
         */
        Message: class {
            /**
             * Creates message
             * @param {string|Node|DRMng.Node} message Message content
             * @param {string} [user] User name and optional ign
             * @param {string} [props] Various message properties
             */
            constructor(message, user, props) {
                //console.log(props);
                this._node = new DRMng.Node(`div`).attr({ class: `chat-message` });
                this._class = { main: [], msg: [`username`, `truncate`] };
                this._prefix = ``;
                this._addClass = ``;
                this._addStyle = ``;
                this._raid = null;
                // Setters
                this.type = props.type;
                this.room = props.room;
                this.pm = props.pm;
                this.self = props.self;
                this.ign = props.characterName;
                this.ts = props.timestamp;
                this.user = user;
                this.msg = message;
            }

            set pm(val) {
                this._pm = val || { any: false, sent: false, recv: false };
                if (this._pm.any) {
                    this._class.main.push(`whisper`);
                    if (this._pm.recv) {
                        this._class.main.push(`received_whisper`);
                        this._prefix = `from `;
                    }
                    else {
                        this._class.main.push(`sent_whisper`);
                        this._prefix = `to `;
                    }
                }
            }

            set type(val) {
                this._type = val || `game`;
            }

            set room(val) {
                this._room = val || `none`;
            }

            set user(val) {
                if (val) this._user = val.toString();
                else this._user = `Unknown`;
                if ((this._user === this._self) || this._pm.sent) this._class.msg.push(`is_self`);
            }

            set self(val) {
                if (val) this._self = val;
                else this._self = DRMng.UM.user.name;
            }

            set ign(val) {
                if (val) this._ign = val;
                else this._ign = null;
            }

            get time() {
                return this._ts.format(`mmm d, HH:MM`);
            }

            get ts() {
                return this._ts.getTime();
            }

            set ts(val) {
                if (val instanceof Date) this._ts = val;
                else if (typeof val === `number`)
                    this._ts = new Date(val.toString().length < 12 ? val * 1000 : val);
                else this._ts = new Date();
            }

            set msg(val) {
                if (typeof val === `string`) {
                    if (this.getRaid(val)) this._msg = this._raid.text;
                    else this._msg = this.formatLinks(val).trim();
                    if (!this._msg) this._msg = null;
                }
                else {
                    if (val instanceof DRMng.Node) val = val.node;
                    if (val instanceof Node) this._msg = val;
                    else this._msg = null;
                }
            }

            get html() {
                if (this._type !== `service`) {
                    const p = new DRMng.Node(`p`).attr({ timestamp: this.ts });
                    if (this._class.main.length > 0) p.attr({ class: this._class.main.join(` `) });
                    // Time field + raid link
                    new DRMng.Node(`span`).attr({ class: `timestamp` }).txt(this.time)
                                          .data(this._raid ? new DRMng.Node(`span`).data(this._raid.link) : null)
                                          .attach(`to`, p);
                    // Extra raid data field
                    if (this._raid && this._raid.extra) this._raid.extra.attach(`to`, p);
                    // User field
                    new DRMng.Node(`span`)
                        .attr({ username: this._user, class: this._class.msg.join(` `) })
                        .txt(this._prefix + this._user).attach(`to`, p);
                    // IGN field
                    if (this._ign)
                        new DRMng.Node(`span`).attr({ class: `guildname truncate` }).txt(this._ign).attach(`to`, p);
                    if (this._msg) {
                        // Separator field
                        new DRMng.Node(`span`).attr({ class: `separator` }).txt(`: `).attach(`to`, p);
                        // Message field
                        new DRMng.Node(`span`).attr({ class: `message hyphenate` }).data(this._msg).attach(`to`, p);
                    }
                    p.attach(`to`, this._node);
                }
                else new DRMng.Node(`div`)
                    .attr({ class: `script` + this._addClass, style: this._addStyle })
                    .data(this._msg).attach(`to`, this._node);

                return this._node.node;
            }

            getRaid(link) {
                let retVal = false;
                const match = /(^.*?)(http.+?action_type.raidhelp.+?)(\s[\s\S]*$|$)/.exec(link);
                if (match) {
                    const r = DRMng.Util.getRaidFromUrl(match[2], this._user);
                    if (r) {
                        const config = DRMng.Config;
                        const srv = config.get(`server`).toLowerCase();
                        const vis = config.get(`visited::${srv}`).indexOf(r.id) > -1;
                        const ded = config.get(`dead::${srv}`).hasOwnProperty(r.id);
                        const flt = config.get(`filterRaids_${srv}_${r.boss}`);
                        const ifo = config.get(`raidData::${r.boss}`);
                        const rnm = [
                            [`n`, `h`, `l`, `nm`][r.diff - 1],
                            ifo ? ifo.sName : r.boss.replace(/_/g, ` `)
                        ];
                        this._class.main.push(`raid`, r.id, rnm[0]);
                        ded && this._class.main.push(`dead`);
                        vis && this._class.main.push(`visited`);

                        this._raid = {
                            link: new DRMng.Node(`a`)
                                .attr({ href: match[2].replace(/&amp;/g, `&`), data: JSON.stringify(r) })
                                .on(`click`, DRMng.Raids.joinClick)
                                .txt(rnm.join(` `).toUpperCase()),
                            text: (match[1] + match[3]).trim(),
                            extra: new DRMng.Node(`span`)
                                .attr({ class: `extraid` })
                                .txt(ifo ? (ifo.isEvent ? (ifo.isGuild ? `Guild ER` : `WR/ER`) :
                                            `FS ${DRMng.Util.getShortNumK(
                                                ifo.hp[r.diff - 1] * 1000 / ifo.maxPlayers)}`) : ``)
                        };

                        if (this._room === `none` || this._type !== `game`) {
                            const filter = flt ? !flt[r.diff - 1] : true;
                            if (!ded && !vis && filter && DRMng.Raids.filter.indexOf(`@${r.boss}_${r.diff}`) > -1) {
                                if (DRMng.Raids.isJoining)
                                    setTimeout(DRMng.Raids.pushToQueue.bind(DRMng.Raids, r), 1);
                                else
                                    setTimeout(DRMng.Raids.prepareJoining.bind(DRMng.Raids), 1);
                            }
                        }

                        retVal = true;
                    }
                }
                return retVal;
            }

            formatLinks(msg) {
                const regLink = /(^|[^"])(https?\S+[^,\s])/g;
                const regImg = /\.(jpe?g|png|gif)$/;
                let l, link, prefix, suffix;
                while ((l = regLink.exec(msg))) {
                    link = regImg.test(l[2]) ?
                           `<img src="${l[2]}" alt="${l[2]}" onclick="window.open(this.src)">` :
                           `<a href="${l[2]}" target="_blank">${l[2].replace(/^https?:\/\//, ``)}</a>`;
                    prefix = msg.slice(0, regLink.lastIndex - l[2].length);
                    suffix = msg.slice(regLink.lastIndex);
                    msg = prefix + link + suffix;
                    regLink.lastIndex += link.length - l[2].length;
                }
                return msg;
            }
        },
        /**
         * Handles dynamic css rules
         */
        CSS: class {
            static add(alias, name, value) {
                if (DRMng.CSS.rules === undefined) DRMng.CSS.rules = {};
                const repl = DRMng.CSS.rules.hasOwnProperty(alias);
                DRMng.CSS.rules[alias] = { name: name, value: value };
                if (repl) DRMng.CSS.compile();
                else DRMng.CSS.compile(DRMng.CSS.rules[alias]);
            }

            static del(alias) {
                if (DRMng.CSS.rules) {
                    if (DRMng.CSS.rules[alias] !== undefined) delete DRMng.CSS.rules[alias];
                    DRMng.CSS.compile();
                }
            }

            static compile(obj) {
                if (DRMng.CSS.node === undefined)
                    DRMng.CSS.node = new DRMng.Node(`style`).attr({ type: `text/css` }).attach(`to`, document.head);
                if (obj) DRMng.CSS.node.txt(`${obj.name} {${obj.value}}\n`);
                else {
                    DRMng.CSS.node.clear();
                    Object.keys(DRMng.CSS.rules || {}).forEach(r =>
                                                                   DRMng.CSS.node.txt(
                                                                       `${DRMng.CSS.rules[r].name} {${DRMng.CSS.rules[r].value}}\n`));
                }
            }

            static remove() {
                DRMng.CSS.node.detach();
            }
        },
        /**
         * Kongregate module
         */
        Kong: {
            /**
             * Removes google spying scripts
             */
            killScripts: () => {
                const scr = document.querySelectorAll(`script`);
                let counter = 0;
                scr.forEach(s => {
                    if (s.src && s.src.indexOf(`google`) > 0) {
                        s.parentNode.removeChild(s);
                        counter++;
                    }
                });
                DRMng.log(`debug`, `{Kong} Removed intrusive script tags (${counter})`);
            },
            /**
             * Adjusts kong_ads object
             */
            killAds: () => {
                if (typeof window.kong_ads === `object`) {
                    window.kong_ads._slots = {};
                    window.kong_ads._refreshAds = false;
                    DRMng.log(`debug`, `{Kong::kong_ads} Adjusted`);
                }
                else setTimeout(DRMng.Kong.killAds, 10);
            },
            /**
             * Removes FB Like button placed just above kong chat
             */
            killFBlike: () => {
                const like = document.getElementById(`quicklinks_facebook`);
                if (like) {
                    like.parentNode.removeChild(like);
                    DRMng.log(`debug`, `{Kong} Removed 'FB like'`);
                }
                else setTimeout(DRMng.Kong.killFBlike, 50);
            },
            /**
             * Removes dealspot object
             */
            killDealSpot: () => {
                const ds = document.getElementById(`dealspot_banner_holder`);
                if (ds) {
                    ds.parentNode.removeChild(ds);
                    DRMng.log(`debug`, `{Kong} Removed 'Dealspot banner'`);
                }
                else setTimeout(DRMng.Kong.killDealSpot, 50);
            },
            /**
             * Adds reload game and reload chat buttons at the top of the game window
             */
            addReloadButton: () => {
                new DRMng.Node(`li`)
                    .attr({ class: `spritegame` })
                    .style({ 'background-position': `0 -280px`, 'cursor': `pointer` })
                    .html(`<a onclick="DRMng.postGameMessage('gameReload');">Reload Game</a>`, true)
                    .attach(`to`, `quicklinks`);

                new DRMng.Node(`li`)
                    .attr({ class: `spritegame` })
                    .style({ 'background-position': `0 -280px`, 'cursor': `pointer` })
                    .html(`<a onclick="DRMng.postGameMessage('chatReload');">Reload Chat</a>`, true)
                    .attach(`to`, `quicklinks`);
            },
            /**
             * Add Slim button to kong user bar
             */
            addSlimButton: () => {
                if (DRMng.Config.local.kong.kongSlimHeader && document.body.className.indexOf(`slim`) === -1)
                    document.body.className += ` slim`;

                if (document.getElementById(`DRMng_header`)) {
                    new DRMng.Node(`li`)
                        .data(new DRMng.Node(`a`)
                                  .attr({ id: `DRMng_KongSlimHeader`, href: `` })
                                  .txt(DRMng.Config.local.kong.kongSlimHeader ? `Full` : `Slim`)
                                  .on(`click`, e => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const isSlim = !DRMng.Config.get(`kong::kongSlimHeader`);
                                      DRMng.Config.set({ 'kong::kongSlimHeader': isSlim });
                                      if (isSlim) document.body.className += ` slim`;
                                      else document.body.className = document.body.className.replace(/\s?slim/g, ``);
                                      new DRMng.Node(`#DRMng_KongSlimHeader`).txt(isSlim ? `Full` : `Slim`, true);
                                      return false;
                                  }))
                        .attach(`to`, `nav_welcome_box`);
                }
                else setTimeout(DRMng.Kong.addSlimButton, 1000);
            },
            searchFieldIcon: () => {
                const el = document.getElementById(`nav_search_submit_button`);
                if (el) el.value = `\uf1c3`;
                else setTimeout(DRMng.Kong.searchFieldIcon, 100);
            },
            /**
             * Add container for Side-by-Side alliance chat window
             */
            addSbsChatContainer: () => {
                if (document.getElementById(`chat_window`))
                    new DRMng.Node(`div`)
                        .attr({ id: `alliance_chat_sbs` })
                        .style({ display: `none` })
                        .on(`click`, DRMng.PrivateChat.sbsEvent)
                        .attach(`to`, `chat_tab_pane`);
                else setTimeout(DRMng.Kong.addSbsChatContainer, 10);
            },
            /**
             * Modifies Element object
             */
            modifyElement: () => {
                if (Element && Element.Methods) {
                    Element._insertionTranslations.after = (a, b) => {
                        const c = a.parentNode;
                        c && c.insertBefore(b, a.nextSibling);
                    };
                    Element.Methods.remove = a => {
                        a = $(a);
                        const b = a.parentNode;
                        b && b.removeChild(a);
                        return a;
                    };
                    Element.addMethods(Element.Methods);
                    DRMng.log(`debug`, `{Kong::Element} Patched`);
                }
                else setTimeout(DRMng.Kong.modifyElement, 10);
            },
            /**
             * Modifies ChatDialogue prototype
             */
            modifyChatDialogue: () => {
                if (ChatDialogue) {
                    ChatDialogue.prototype.displayUnsanitizedMessage = function (a, b, c, d) {
                        // ActiveRoom
                        const ar = this._holodeck.chatWindow().activeRoom();
                        // AllowMutes
                        const am = ar && !ar.canUserModerate(ar.self()) || d.whisper;

                        if (!am || !this._user_manager.isMuted(a)) {
                            d.self = this._user_manager.username();
                            d.pm = { sent: d.private || false, recv: d.whisper || false };
                            d.pm.any = d.pm.sent || d.pm.recv;

                            const msg = new DRMng.Message(b, a, d); // b.a.d message :)

                            this.insert(msg.html, null, d.history ? { timestamp: msg.ts } : null);
                            this._messages_count++;
                        }
                    };
                    ChatDialogue.prototype.displayMessage = ChatDialogue.prototype.displayUnsanitizedMessage;
                    ChatDialogue.prototype.serviceMessage = function (cont, raidInfo = null) {
                        const msg = new DRMng.Message(cont, null, { type: `service` });
                        if (raidInfo) {
                            msg._addClass = ` raidinfo`;
                            msg._addStyle = `background-image: url(https://content.5thplanetgames.com/dotd_live/images/bosses/${raidInfo}.jpg);`;
                        }
                        this.insert(msg.html, null, null);
                        this._messages_count++;
                    };
                    ChatDialogue.prototype.receivedPrivateMessage = function (a) {
                        if (a.data.success) this.displayUnsanitizedMessage(
                            a.data.from,
                            `${a.data.message} &nbsp;<a class="reply_link" onclick="holodeck.` +
                            `insertPrivateMessagePrefixFor('${a.data.from}');return false;" href="#">(reply)</a>`,
                            { class: `whisper received_whisper` },
                            { whisper: true }
                        );
                        else this.serviceMessage(`${a.data.to} cannot be reached. Please try again later.`);
                    };
                    ChatDialogue.prototype.sendPrivateMessage = function (a, b) {
                        this._user_manager.sendPrivateMessage(a, b);
                        this.displayUnsanitizedMessage(a, b,
                                                       { class: `whisper sent_whisper` },
                                                       { private: true }
                        );
                    };
                    ChatDialogue.prototype.sameTimestamps = (a, b) => parseInt(a / 60000) === parseInt(b / 60000);
                    ChatDialogue.prototype.insert = function (msg, b, opts) {
                        const dialogue = this, chat = this._message_window_node;
                        const height = chat.getHeight();
                        let doScroll = (height > 0) &&
                                       (height + chat.scrollTop + ChatDialogue.SCROLL_FUDGE >= chat.scrollHeight);

                        holodeck.scheduleRender(() => {
                            if (opts && opts.timestamp) {
                                const newer = Array.from(chat.querySelectorAll(`div > p`))
                                                   .filter(node => node.getAttribute(`timestamp`) > opts.timestamp);

                                if (newer.length > 0) {
                                    chat.insertBefore(msg, newer[0].parentNode);
                                    doScroll = false;
                                }
                                else chat.appendChild(msg);
                            }
                            else chat.appendChild(msg);
                            doScroll && dialogue.scrollToBottom();
                        });
                    };
                    ChatDialogue.prototype.earliestTimestamp = function () {
                        const node = this._message_window_node.querySelectorAll(`div > p`);
                        if (node && node.length > 0) return parseInt(node[0].getAttribute(`timestamp`)) / 1000;
                        return parseInt(new Date().getTime() / 1000);
                    };
                    ChatDialogue.prototype.clear = function () {
                        const c = this._message_window_node;
                        while (c.lastChild && c.lastChild.nodeName === `DIV`) c.removeChild(c.lastChild);
                        this._messages_count = 0;
                    };
                    DRMng.log(`debug`, `{Kong::ChatDialogue} Patched`);
                }
                else setTimeout(DRMng.Kong.modifyChatDialogue, 10);
            },
            /**
             * Modifies ChatRoom prototype
             */
            modifyChatRoom: () => {
                if (ChatRoom) {
                    ChatRoom.prototype.receivedMessage = function (a) {
                        this.isActive() || this._unread_message_node.show();
                        this.checkUserForModeration(a.data.user.username);
                        this._chat_dialogue.displayUnsanitizedMessage(
                            a.data.user.username, a.data.message, {},
                            {
                                characterName: a.data.user.variables.game_character_name,
                                timestamp: a.data.timestamp,
                                history: a.data.history,
                                room: this._room.name,
                                type: this._room.type
                            }
                        );
                    };
                    ChatRoom.prototype.show = function () {
                        if (DRMng && DRMng.PrivateChat.anyActive()) DRMng.PrivateChat.getActive().deactivate();
                        this._node.show();
                        this.updateRoomHeader();
                        this._chat_actions_node.show();
                        this._tab_for_room.addClassName(`active`);
                        this._unread_message_node.hide();
                        this.scrollToBottom();
                    };
                    ChatRoom.prototype.isActive = function () {
                        return !(DRMng && DRMng.PrivateChat.anyActive()) && this === this._chat_window.activeRoom();
                    };
                    DRMng.log(`debug`, `{Kong::ChatRoom} Patched`);
                }
                else setTimeout(DRMng.Kong.modifyChatRoom, 10);
            },
            /**
             * Modifies FayeEvent (part of guild chat API)
             */
            modifyFayeEvent: () => {
                if (FayeEventDispatcher) {
                    FayeEventDispatcher.prototype.message = function (a, b) {
                        this.checkDuplicateMessage(b) || this._holodeckEventDispatcher.fire({
                                                                                                type: KonduitEvent.ROOM_MESSAGE,
                                                                                                data: {
                                                                                                    history: b.history,
                                                                                                    message: b.text,
                                                                                                    timestamp: b.timestamp *
                                                                                                               1000,
                                                                                                    room: a,
                                                                                                    user: FayeUserTransformer.transformUser(
                                                                                                        b)
                                                                                                }
                                                                                            });
                    };
                    DRMng.log(`debug`, `{Kong::FayeEventDispatcher} Patched`);
                }
                else setTimeout(DRMng.Kong.modifyFayeEvent, 10);
            },
            /**
             * Modifies FayeHistory (part of guild chat API)
             */
            modifyFayeHistory: () => {
                if (FayeHistoryService) {
                    FayeHistoryService.prototype.fetchHistory = function (a, b, c) {
                        const self = this;
                        this._makeAjaxRequest(a, b, c).then(b => {
                            $j.each(b.history, (b, c) => {
                                c.push(true);
                                self.trigger(`message`, a, FayeMessageTransformer.transform(c));
                            });
                            self.trigger(`history`, a, b.history.length);
                        });
                    };
                    DRMng.log(`debug`, `{Kong::FayeHistory} Patched`);
                }
                else setTimeout(DRMng.Kong.modifyFayeHistory, 10);
            },
            /**
             * Modifiees FayeTransformer function (part of guild chat API)
             */
            modifyFayeTransformer: () => {
                if (FayeMessageTransformer) {// && typeof FayeMessageTransformer.transform === `function`) {
                    FayeMessageTransformer.transform = a => {
                        return {
                            version: a[0],
                            kuid: a[1],
                            uuid: a[2],
                            text: a[3],
                            timestamp: a[4],
                            user_id: a[5],
                            username: a[6],
                            character_name: a[7],
                            level: a[8],
                            admin: 0 <= a[10].indexOf(`a`),
                            developer: 0 <= a[10].indexOf(`d`),
                            mobile: 0 <= a[10].indexOf(`m`),
                            premium: 0 <= a[10].indexOf(`p`),
                            guid: a[9],
                            history: a[12] || false
                        };
                    };
                    DRMng.log(`debug`, `{Kong::FayeTransformer} Patched`);
                }
                else setTimeout(DRMng.Kong.modifyFayeTransformer, 10);
            },
            /**
             * Modifies chat commands processing inside Holodeck
             */
            modifyHolodeck: function () {
                if (Holodeck) {
                    Holodeck.prototype.processChatCommand = function (command, ally) {
                        const cmd = ((command.match(/^\/([^\s]+)/) || [])[1] || ``).toLowerCase();
                        if (this._chat_commands[cmd]) {
                            const chat = ally ? DRMng.PrivateChat.getChat(ally) : this;
                            return this._chat_commands[cmd].detect(b => !b(chat, command)) === undefined;
                        }
                        return true;
                    };
                    DRMng.log(`debug`, `{Kong::Holodeck} Patched`);
                }
                else setTimeout(this.modifyHolodeck, 10);
            },
            /**
             * Custom chat commands injector
             */
            addChatCommand: (cmd, call) => {
                cmd = cmd instanceof Array ? cmd : [cmd];
                cmd.forEach(c => holodeck.addChatCommand(c, call));
            },
            /**
             * Definition of all supported chat commands
             */
            addChatCommands: () => {
                const self = DRMng.Kong;
                if (holodeck && holodeck.ready) {
                    /* Gestures Commands */
                    self.addChatCommand([`kiss`, `hit`, `poke`, `slap`], (chat, cmd) => {
                        const part = /^\/(kiss|hit|poke|slap) (\w+)$/.exec(cmd);
                        if (part) {
                            const gesture = `** ${DRMng.Gestures[part[1].charAt(0).toUpperCase() + part[1].slice(1)]
                                .generate().replace(`@from`, DRMng.UM.user.name).replace(`@who`, part[2])} **`;
                            if (chat instanceof Holodeck)
                                chat.filterOutgoingMessage(gesture, chat._active_dialogue._onInputFunction);
                            else chat.send(gesture);
                            //alliance = !(a instanceof Holodeck),
                            //chat = alliance ? a : a.activeDialogue();
                            //if (alliance) DRMng.Alliance.send(gesture);
                            //else chat._holodeck.filterOutgoingMessage(gesture, chat._onInputFunction);
                        }
                        return false;
                    });
                    // TODO: /perc WIP HALP!
                    self.addChatCommand(`perc`, (a, b) => {
                        let pval = /.+\s(\d+)(\w?)/.exec(b);
                        if (pval) {
                            let mul = 1;
                            switch (pval[2]) {
                                case `k`:
                                    mul *= 1000;
                                    break;
                                case `m`:
                                    mul *= 1000000;
                                    break;
                            }
                            pval = parseInt(pval[1]) || 0;
                            pval *= mul;
                        }
                        else pval = 0;

                        const D = [
                            { val: 1, bok: [`Brown`, `Grey`], bokp: [50, 50] },
                            { val: 4000, bok: [`Brown`, `Grey`, `Green`], bokp: [33, 34, 33] },
                            { val: 6000, bok: [`Grey`, `Green`], bokp: [50, 50] },
                            { val: 10000, bok: [`Grey`, `Green`, `Blue`], bokp: [33, 34, 33] },
                            { val: 14000, bok: [`Green`, `Blue`], bokp: [50, 50] },
                            { val: 16000, bok: [`Green`, `Blue`, `Purple`], bokp: [33, 34, 33] },
                            { val: 18000, bok: [`Blue`, `Purple`], bokp: [50, 50] },
                            { val: 22000, bok: [`Blue`, `Purple`, `Orange`], bokp: [33, 34, 33] },
                            { val: 24000, bok: [`Purple`, `Orange`], bokp: [50, 50] },
                            { val: 30000, bok: [`Orange`], bokp: [100] },
                            { val: 33000, bok: [`Orange`, `Red`], bokp: [75, 25] },
                            { val: 36000, bok: [`Orange`, `Red`], bokp: [50, 50] },
                            { val: 50000, bok: [`Orange`, `Red`], bokp: [25, 75] },
                            { val: 70000, bok: [`Red`], bokp: [100] },
                            { val: 80000, bok: [`Red`, `Bronze`], bokp: [75, 25] },
                            { val: 90000, bok: [`Red`, `Bronze`], bokp: [50, 50] },
                            { val: 100000, bok: [`Red`, `Bronze`], bokp: [25, 75] },
                            { val: 110000, bok: [`Bronze`, `Silver`], bokp: [75, 25] },
                            { val: 120000, bok: [`Bronze`, `Silver`], bokp: [50, 50] },
                            { val: 130000, bok: [`Bronze`, `Silver`], bokp: [25, 75] },
                            { val: 140000, bok: [`Silver`], bokp: [100] },
                            { val: 150000, bok: [`Silver`, `Gold`], bokp: [75, 25] },
                            { val: 160000, bok: [`Silver`, `Gold`], bokp: [50, 50] },
                            { val: 170000, bok: [`Silver`, `Gold`], bokp: [25, 75] },
                        ];

                        let t = document.createElement(`table`), row, cell, s;
                        t.setAttribute(`cellspacing`, `0`);
                        t.style.setProperty(`width`, `100%`);
                        t.style.setProperty(`font-weight`, `300`);
                        t.style.setProperty(`font-size`, `10px`);

                        for (let i = 0, l = D.length; i < l; ++i) {
                            if (D[i].val >= pval || i === l - 1) {
                                row = document.createElement(`tr`);
                                cell = document.createElement(`td`);
                                cell.style.setProperty(`background`, `#303030`);
                                cell.style.setProperty(`border-right`, `1px solid #000000`);
                                cell.style.setProperty(`border-bottom`, `1px solid #000000`);
                                cell.style.setProperty(`padding-right`, `5px`);
                                cell.style.setProperty(`text-align`, `right`);
                                cell.style.setProperty(`width`, `30px`);
                                cell.textContent = D[i].val > 1000 ? `${D[i].val / 1000}k` : D[i].val;
                                row.appendChild(cell);
                                cell = document.createElement(`td`);
                                cell.style.setProperty(`border-bottom`, `1px solid #000000`);
                                cell.style.setProperty(`border-right`, `1px solid #000000`);
                                cell.style.setProperty(`width`, `80%`);
                                for (let j = 0; j < D[i].bok.length; j++) {
                                    s = document.createElement(`span`);
                                    s.style.setProperty(`width`, D[i].bokp[j] + `%`);
                                    s.style.setProperty(`background-color`, D[i].bok[j]);
                                    s.style.setProperty(`display`, `inline-block`);
                                    s.textContent = D[i].bok[j];
                                    cell.appendChild(s);
                                }
                                row.appendChild(cell);
                                t.appendChild(row);
                            }
                        }

                        let chat = (a instanceof Holodeck) ? a.activeDialogue() : a;
                        if (chat) chat.serviceMessage(t);

                        return false;
                    });
                    self.addChatCommand([`reload`, `reloaf`, `relaod`, `rl`], (_, cmd) => {
                        const type = /^\/\w+\s?(.*)$/.exec(cmd)[1];
                        switch (type) {
                            case `game`:
                                DRMng.postGameMessage(`gameReload`);
                                break;
                            case `chat`:
                                DRMng.postGameMessage(`chatReload`);
                                break;
                            default:
                                window.gameLoader.loadGame(``);
                        }
                        return false;
                    });
                    self.addChatCommand(`clear`, chat => {
                        chat = chat instanceof Holodeck ? chat._active_dialogue : chat;
                        chat.clear();
                        return false;
                    });
                    self.addChatCommand(`kill`, (_, cmd) => {
                        const mode = /^\/kill\s?(.*)$/.exec(cmd)[1];
                        switch (mode) {
                            case `game`:
                                DRMng.postGameMessage(`killGame`);
                                break;
                            case `chat`:
                                DRMng.postGameMessage(`killChat`);
                                break;
                            default:
                                new DRMng.Node(`#gameiframe`).attr({ src: `` });
                        }
                        return false;
                    });
                    self.addChatCommand(`wiki`, (_, cmd) => {
                        const val = /^\/wiki (.+)$/.exec(cmd);
                        if (val) window.open(`http://dotd.wikia.com/wiki/Special:Search?search=${val[1]}`);
                        return false;
                    });
                    self.addChatCommand(`enc`, (_, cmd) => {
                        const val = /^\/enc (.+)$/.exec(cmd);
                        if (val) window.open(`https://mutikt.ml/encyclopedia/#src_${encodeURI(`${val[1]}`)}`, `_blank`);
                        return false;
                    });
                    self.addChatCommand([`ver`, `version`, `update`], chat => {
                        if (chat instanceof Holodeck) chat = chat._active_dialogue;
                        DRMng.Kong.serviceMsg(DRMng.About.version(), chat);
                        return false;
                    });
                    self.addChatCommand([`raid`, `rd`], (chat, cmd) => {
                        const comm = /^\/(raid|rd) (.+)$/.exec(cmd);
                        if (chat instanceof Holodeck) chat = chat._active_dialogue;
                        if (comm) {
                            const raid = comm[2].toLowerCase();
                            const rarr = raid.split(` `);
                            const data = DRMng.Config.get(`raidData`);
                            const fnd = [];

                            Object.keys(data).forEach(rd => {
                                const rn = data[rd].fName.toLowerCase();
                                if (rarr.reduce((a, v) => a && rd.indexOf(v) > -1, true) ||
                                    rarr.reduce((a, v) => a && rn.indexOf(v) > -1, true)) fnd.push(
                                    [rd, data[rd].fName]);
                            });

                            if (fnd.length > 1) {
                                const raidPicker = fnd.reduce((a, f) =>
                                                                  `${a}<br><span class="DRMng_info_picker ${f[0]}">${f[1]} (${f[0]})</span>`,
                                                              ``);
                                chat && chat.serviceMessage(`Multiple results found, pick one:` + raidPicker);
                            }
                            else if (fnd.length === 1)
                                chat && chat.serviceMessage(DRMng.UI.raidInfo(fnd[0][0]), data[fnd[0][0]].banner);
                            else chat && chat.serviceMessage(`No info found matching ` + raid);
                        }
                        else chat && chat.serviceMessage(`Wrong /raid or /rd syntax`);
                        return false;
                    });
                    DRMng.log(`debug`, `{Kong} Chat commands added`);
                }
                else setTimeout(self.addChatCommands, 100);
            },
            /**
             * Relocates Chat options button
             */
            moveChatOptions: () => {
                const src = document.getElementById(`chat_actions_container`);
                const dst = document.getElementById(`chat_room_tabs`);
                if (src && dst) dst.appendChild(src);
                else setTimeout(DRMng.Kong.moveChatOptions, 10);
            },
            /**
             * Meta function to fire all modifications
             */
            modifyKongEngine: function () {
                this.modifyHolodeck();
                this.modifyChatRoom();
                this.modifyChatDialogue();
                this.modifyFayeEvent();
                this.modifyFayeTransformer();
                this.modifyFayeHistory();
                this.modifyElement();
            },
            /**
             * Sets kongregate header width to match game frame
             */
            setHeaderWidth: () => {
                document.getElementById(`header`).style.width = document.getElementById(`maingame`).offsetWidth + `px`;
            },
            /**
             * Resize game frame to account for inactive/hidden world chat
             */
            hideWorldChat: () => {
                const opts = DRMng.Config.get(`gameFrame`);
                new DRMng.Node(`#game`).style({ width: (opts.hideWChat || opts.removeWChat) ? `760px` : `1025px` });
            },
            setWrapperWidth: w => {
                const width = w ? `calc(100% - ${w}px)` : `100%`;
                new DRMng.Node(`#primarywrap`).style({ width: width });
                new DRMng.Node(`#headerwrap`).style({ width: width });
            },
            /**
             * Removes iFrames leaving only one with game
             */
            killIframes: () => {
                document.querySelectorAll(`iframe`).forEach(ifr =>
                                                                ifr.id !== `gameiframe` &&
                                                                ifr.parentNode.removeChild(ifr));
                DRMng.log(`debug`, `{Kong} Removed all redundant iFrames`);
            },
            serviceMsg: (msg, chat) => {
                chat = chat ||
                       (DRMng.PrivateChat.anyActive() ? DRMng.PrivateChat.getActive() : holodeck._active_dialogue);
                if (chat) chat.serviceMessage(msg);
                else if (!holodeck) setTimeout(DRMng.Kong.serviceMsg, 50, msg);
            },
            init: function () {
                if (document.body.className.indexOf(`premium_user`) === -1) document.body.className += ` premium_user`;
                document.body.className = document.body.className.replace(` spotlight_ad_creative-control`, ``);
                this.killAds();
                this.killScripts();
                this.killFBlike();
                this.killDealSpot();
                this.addSlimButton();
                this.addReloadButton();
                this.addSbsChatContainer();
                this.searchFieldIcon();
                this.modifyKongEngine();
                this.addChatCommands();
                this.setWrapperWidth();
                setTimeout(this.moveChatOptions, 500);
                //setTimeout(this.killIframes, 5000);

                // Open Sans font used by scripts theme
                new DRMng.Node(`link`)
                    .attr({
                              href: `https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800`,
                              rel: `stylesheet`
                          })
                    .attach(`to`, document.head);

                // Kong theme
                new DRMng.Node(`link`)
                    .attr({
                              id: `DRMng_kongCSS`,
                              href: `https://cdn.jsdelivr.net/gh/mutik/drmng@2/kong_dark.css`,
                              rel: `stylesheet`
                          })
                    .on(`load`, DRMng.Kong.setHeaderWidth)
                    .attach(`to`, document.head);

                DRMng.log(`{Kong} Module loaded`);
            }
        },
        /**
         * Raids module
         * All raids management related methods
         */
        Raids: {
            srv: `elyssa`,
            flt: {},
            filter: ``,
            all: [],
            locked: false,
            bootstrap: true,
            joinQueue: [],
            ids: [],
            joinLen: 0,
            joined: 0,
            isJoining: false,
            isPreparing: false,
            isJoiningOne: false,
            isAuto: false,
            count: 0,
            /**
             * Checks and sends direct submission
             */
            checkAndSend: () => {
                const link = document.getElementById(`DRMng_submitRaidLink`);
                const r = DRMng.Util.getRaidFromUrl(link.textContent, DRMng.UM.user.name);
                if (r && !isNaN(+r.id) && r.hash.length === 10 && [`kasan`, `elyssa`][r.pid] === DRMng.Raids.srv) {
                    const delayBase = document.querySelector(`[group=DRMng_submitDelay].crimson`).textContent;
                    let delay = parseInt(document.getElementById(`DRMng_submitDelay`).value);
                    switch (delayBase) {
                        case `day`:
                            delay *= 24;    // break omitted
                        case `hr`:
                            delay *= 60;     // break omitted
                        default:
                            delay *= 60000;
                    }
                    r.delay = delay;
                    delete r.sid;
                    DRMng.Engine.client.emit(`service`, { action: `delayedSub`, data: r });
                }
                else DRMng.UI.submitResponse(0, `Paste proper raid link before submitting`);
                link.textContent = `Paste raid link here`;
                link.className = `default`;
            },
            /**
             * Removes old raids from dead cache
             */
            cleanDeadCache: function () {
                const dead = DRMng.Config.get(`dead::${this.srv}`);
                const deadThr = Date.now() - 129600000; // 3 days old

                Object.keys(dead).forEach(d => (dead[d] < deadThr) && delete dead[d]);

                setTimeout(() => this.cleanDeadCache(), 3600000); // run each 1h

            },
            /**
             * Format message while joining raids
             * @param {string} [m] Message to show
             */
            joinMsg: function (m) {
                DRMng.UI.displayStatus(m ? m : `Joined ${this.joined} out of ${this.joinLen}`);
            },
            /**
             * Joins raids
             * @param {raidObject} r Raid data
             * @param {boolean} [multi=false] Switches between single and multi joining callbacks
             */
            join: (r, multi = false) => {
                r = r && r.id ? r : DRMng.Raids.get(r);
                if (r) {
                    const u = DRMng.UM.user;
                    if (u.qualified) {
                        const authData = `kongregate_user_id=${u.ID}&kongregate_game_auth_token=${u.authToken}`;
                        const raidData = `&kv_raid_id=${r.id}&kv_hash=${r.hash}` +
                                         `&serverid=${r.sid || (DRMng.Config.get(`server`) === `Elyssa` ? `1` : `2`)}`;
                        const data = {
                            eventName: `DRMng.joinRaid${multi ? `s` : ``}`,
                            url: `https://dotd-web1.5thplanetgames.com/kong/raidjoin.php?${authData}${raidData}`,
                            method: `GET`, ext: r, timeout: 10000
                        };
                        DRMng.postMessage(data);
                    }
                    else {
                        DRMng.log(`warn`, `{Raids::join} User not qualified to join`, u);
                        DRMng.Raids.joined++;
                        DRMng.Raids.joinMsg();
                    }
                }
                else {
                    DRMng.log(`warn`, `{Raids::join} Bad data`, r);
                    DRMng.Raids.joined++;
                    DRMng.Raids.joinMsg();
                }
            },
            prepareJoining: function () {
                if (this.isJoining) return;
                this.isPreparing = true;
                this.ids = [];
                let i, l, name;
                this.joinQueue = [];
                for (i = 0, l = this.all.length; i < l; ++i) {
                    name = this.all[i].boss + `_` + this.all[i].diff;
                    if (!this.all[i].visited &&
                        !this.all[i].isFull &&
                        this.filter.indexOf(`@` + name) !== -1) {
                        this.joinQueue.push(this.all[i]);
                        this.ids.push(this.all[i].id);
                    }
                }
                // chat raids
                let cr = document.querySelectorAll(`p.raid:not(.dead):not(.visited) a`),
                    s  = DRMng.Config.local.server.toLowerCase(),
                    f  = DRMng.Config.local.filterRaids[s], r, hf;
                for (i = 0, l = cr.length; i < l; ++i) {
                    r = DRMng.Util.getRaidFromUrl(cr[i].search);
                    if (r) {
                        hf = f[r.boss] ? !f[r.boss][r.diff - 1] : true;
                        if (hf) {
                            name = `${r.boss}_${r.diff}`;
                            if (this.ids.indexOf(r.id) === -1 &&
                                this.filter.indexOf(`@` + name) !== -1) {
                                this.joinQueue.push(r);
                                this.ids.push(r.id);
                            }
                        }
                    }
                }
                this.joinLen = this.joinQueue.length;
                this.isPreparing = false;
                if (this.joinLen > 0 && this.isAuto) this.joinAll();
                else DRMng.UI.displayStatus();
            },
            pushToQueue: function (r, useFilter = false) {
                if (this.ids.indexOf(r.id) === -1 && (!useFilter || !r.isFull)) {
                    this.joinQueue.push(r);
                    this.joinLen++;
                    DRMng.UI.displayStatus();
                }
            },
            switchAutoJoin: function () {
                const button = document.getElementById(`DRMng_autoJoin`);
                if (this.isAuto) {
                    this.isAuto = false;
                    button.className = ``;
                }
                else {
                    this.joinAll();
                    this.isAuto = true;
                    button.className = `crimson`;
                }
            },
            joinAll: function () {
                if (this.isJoining || !this.joinLen) return;
                if (this.isPreparing) {
                    setTimeout(this.joinAll.bind(this), 5);
                    return;
                }
                let i, l;
                this.isJoining = true;
                this.joined = 0;

                for (i = 0, l = Math.min(this.joinLen, 10); i < l; ++i)
                    setTimeout(DRMng.Raids.join, i, this.joinQueue.shift(), true);
            },
            joinClick: e => {
                e.preventDefault();
                if (e && e.target) {
                    const r = JSON.parse(e.target.getAttribute(`data`) || `false`);
                    if (r) setTimeout(DRMng.Raids.joinOne.bind(DRMng.Raids, r), 1);
                }
                return false;
            },
            joinOne: function (r) {
                if (this.isJoining) this.pushToQueue(r);
                else if (this.isPreparing) setTimeout(this.joinOne.bind(this, r), 5);
                else setTimeout(this.join, 0, r, false);
                return false;
            },
            processJoin: function (id, text) {
                let status = 0;
                if (/successfully (re-)?joined/i.test(text)) {
                    setTimeout(this.setVisited.bind(this, id), 1);
                    status = 1;
                }
                else if (/already completed/i.test(text)) {
                    setTimeout(this.remove.bind(this, id, true), 1);
                    status = 2;
                }
                else if (/already a member/i.test(text)) {
                    setTimeout(this.setVisited.bind(this, id), 1);
                    status = 3;
                }
                else if (/not a member of the guild/i.test(text)) {
                    setTimeout(this.remove.bind(this, id), 1);
                    status = 4;
                }
                else if (/(invalid|find) raid (hash|ID)/i.test(text)) {
                    setTimeout(this.remove.bind(this, id), 1);
                    status = 5;
                }
                return status;
            },
            joinResponse: e => {
                const data = JSON.parse(e.data);

                if (data && data.status === 200 && data.responseText && data.url) {
                    let status = DRMng.Raids.processJoin(data.ext.id, data.responseText);
                    let name = DRMng.Config.local.raidData[data.ext.boss];
                    status = [`Unknown`, `Success`, `Dead`, `Already in`, `Wrong Guild`, `Invalid`][status];
                    name = name ? name.sName : data.ext.boss;
                    DRMng.Raids.joinMsg(`Joining ${name} :: ${status}`);
                    setTimeout(DRMng.Raids.prepareJoining.bind(DRMng.Raids), 0);
                }
            },
            joinMultiResponse: e => {
                DRMng.Raids.joined++;
                const data = JSON.parse(e.data);
                if (data && data.status === 200 && data.responseText && data.url) {
                    let status = DRMng.Raids.processJoin(data.ext.id, data.responseText);
                    if (DRMng.Raids.joinLen > 1) DRMng.Raids.joinMsg();
                    else {
                        let name = DRMng.Config.local.raidData[data.ext.boss];
                        name = name ? name.sName : data.ext.boss;
                        status = [`Unknown`, `Success`, `Dead`, `Already in`, `Wrong Guild`, `Invalid`][status];
                        DRMng.Raids.joinMsg(`Joining ${name} :: ${status}`);
                    }
                }
                const r = DRMng.Raids.joinQueue.shift();
                if (r) setTimeout(DRMng.Raids.join.bind(DRMng.Raids, r, true), 1);
                else if (DRMng.Raids.joined === DRMng.Raids.joinLen) {
                    DRMng.Raids.isJoining = false;
                    setTimeout(DRMng.Raids.prepareJoining.bind(DRMng.Raids), 1);
                }
            },
            getDiff: diff => {
                diff = diff ? diff.slice(1) : 0;
                return isNaN(+diff) ? ({ 'n': 1, 'h': 2, 'l': 3, 'nm': 4, 'nnm': 5 })[diff.toLowerCase()] || 0 : +diff;
            },
            processFilter: function (filterTxt, loading) {
                DRMng.Raids.isAuto && DRMng.Raids.switchAutoJoin();
                if (loading) filterTxt = DRMng.Config.get(`filterString::${this.srv}`) || ``;
                else DRMng.Config.set({ [`filterString::${this.srv}`]: filterTxt });

                const parts = filterTxt.split(/\s?\|\s?|\sor\s|\s?,\s?/ig);
                const regChk = /(\w:)?([\w-]+)(:\w{1,5})?/;
                const regZone = /z(\d{1,2})-(\d{1,2})/;
                const flt = { add: { raid: [], magic: [] }, rem: { raid: [], magic: [] } };
                let mode, raids, diff, reg, i, d, result = [];
                // prepare filters
                parts.forEach(p => {
                    mode = p[0] === `-` ? `rem` : `add`;
                    if (mode === `rem`) p = p.slice(1);
                    p = regChk.exec(p);
                    if (p) switch (p[1]) {
                        case `m:`:
                            flt[mode].magic.push(p[2]);
                            break;
                        case `k:`:
                            reg = regZone.exec(p[2]);
                            raids = [];
                            if (reg) for (i = reg[1]; i <= reg[2]; ++i) {
                                d = DRMng.Config.get(`filterData::z${i}`);
                                if (d) raids = raids.concat(d);
                            }
                            else raids = p[2] === `all` ?
                                         Object.keys(DRMng.Config.get(`raidData`)) :
                                         DRMng.Config.get(`filterData::${p[2]}`);

                            if (raids) {
                                diff = this.getDiff(p[3]);
                                raids.forEach(r => flt[mode].raid.push([r, diff]));
                            }
                            break;
                        default:
                            raids = DRMng.Config.get(`raidData`);
                            reg = new RegExp(p[2], `ig`);
                            diff = this.getDiff(p[3]);
                            Object.keys(raids).forEach(r =>
                                                           `${r} ${raids[r].sName}`.search(reg) > -1 &&
                                                           flt[mode].raid.push([r, diff]));
                            break;
                    }
                });
                // merge
                //DRMng.log(`debug`, `FILTERS`, filters);
                raids = DRMng.Config.get(`raidData`);
                if (flt.add.raid.length > 0)
                    flt.add.raid.forEach(r => {
                        i = raids[r[0]];
                        i = i ? i.hp : [1, 1, 1, 1];
                        if (i[3] !== undefined && [0, 4, 5].indexOf(r[1]) !== -1) result.push(r[0] + `_4`);
                        if (i[2] !== undefined && [0, 3].indexOf(r[1]) !== -1) result.push(r[0] + `_3`);
                        if (i[1] !== undefined && [0, 2].indexOf(r[1]) !== -1) result.push(r[0] + `_2`);
                        if (i[0] !== undefined && [0, 1, 5].indexOf(r[1]) !== -1) result.push(r[0] + `_1`);
                    });
                else Object.keys(raids).forEach(r => {
                    i = raids[r];
                    i = i ? i.hp.length : 4;
                    for (d = 1; d <= i; ++d) result.push(r + `_` + d);
                });

                if (flt.rem.raid.length > 0)
                    flt.rem.raid.forEach(r => {
                        i = raids[r[0]];
                        i = i ? i.hp : [1, 1, 1, 1];
                        const arr = [];
                        if (i[3] !== undefined && [0, 4, 5].indexOf(r[1]) !== -1) arr.push(r[0] + `_4`);
                        if (i[2] !== undefined && [0, 3].indexOf(r[1]) !== -1) arr.push(r[0] + `_3`);
                        if (i[1] !== undefined && [0, 2].indexOf(r[1]) !== -1) arr.push(r[0] + `_2`);
                        if (i[0] !== undefined && [0, 1, 5].indexOf(r[1]) !== -1) arr.push(r[0] + `_1`);
                        arr.forEach(r => {
                            d = result.indexOf(r);
                            d > -1 && result.splice(d, 1);
                        });
                    });

                DRMng.log(`debug`, `{Raid::Filter} Add filters ::`, flt.add.raid.join(`, `));
                DRMng.log(`debug`, `{Raid::Filter} Sub filters ::`, flt.rem.raid.join(`, `));

                // joining filter
                this.filter = `@${result.join(`@`)}`;
                if (!this.bootstrap && !this.isJoining) setTimeout(this.prepareJoining.bind(this), 10);

                // UI filter
                const content = `.drm_${result.join(`, .drm_`)} { display: flex !important; }`;
                DRMng.Util.cssStyle(`DRMng_RaidsCSS`, content);
            },
            setChat: (id, cls) => {
                const list = document.getElementsByClassName(id);
                for (let i = 0, len = list.length; i < len; ++i) list[i].classList.add(cls);
            },
            setVisited: function (id, drop) {
                const srv = DRMng.Config.get(`server`).toLowerCase();
                let idx = DRMng.Config.get(`visited::${srv}`).indexOf(id);
                if (drop && idx > -1) DRMng.Config.local.visited[srv].splice(idx, 1);
                else if (idx === -1) {
                    DRMng.Config.local.visited[srv].push(id);
                    idx = this.getIdx(id);
                    if (idx > -1) {
                        this.all[idx].visited = true;
                        const el = document.getElementById(`DRMng_${id}`);
                        if (el) el.className += ` visited`;
                    }
                }
                if (!drop) this.setChat(id, `visited`);
                DRMng.Config.saveLocal();
            },
            comp: (a, b) => a.hp - b.hp,
            _setComp: function (field) {
                switch (field) {
                    case `id`:
                        this.comp = (a, b) => parseInt(a.id) - parseInt(b.id);
                        break;
                    case `health`:
                        this.comp = (a, b) => a.hp - b.hp;
                        break;
                    case `name`: /* by name then by hp */
                        this.comp = (a, b) => {
                            const an = a.sname || a.boss;
                            const bn = b.sname || b.boss;
                            if (an < bn) return -1;
                            if (an > bn) return 1;
                            return a.hp - b.hp;
                        };
                        break;
                    case `time`:
                        this.comp = (a, b) => a.createtime - b.createtime;
                        break;
                    default:
                        field = `health`;
                        this.comp = (a, b) => a.hp - b.hp;
                        DRMng.Config.set({ sortBy: field });
                }
            },
            setComp: function (field) {
                if (this.locked || this.bootstrap) {
                    setTimeout(DRMng.Raids.setComp.bind(this, field), 10);
                    return;
                }
                this.locked = true;

                this._setComp(field);
                DRMng.Config.set({ sortBy: field });
                this.sort();

                DRMng.UI.clearRaidList();
                this.all.forEach(r => DRMng.UI.addRaidField(r));

                this.locked = false;
            },
            get: function (id) {
                return this.all[this.getIdx(id)] || null;
            },
            getIdx: function (id) {
                for (let i = 0, len = this.all.length; i < len; ++i) if (this.all[i].id == id) return i;
                return -1;
            },
            sort: function () {
                this.all.sort(this.comp);
            },
            insertAll: function (raids) {
                if (this.locked) {
                    setTimeout(this.insertAll.bind(this, raids), 10);
                    return;
                }
                this.bootstrap = true;

                this.all = [];
                this.srv = DRMng.Config.get(`server`).toLowerCase();
                this.flt = DRMng.Config.get(`filterRaids::${this.srv}`);

                const vis = DRMng.Config.get(`visited::${this.srv}`);
                const rDat = DRMng.Config.get(`raidData`);
                const newVis = [];
                let rd, hf;

                raids.forEach(r => {
                    hf = this.flt[r.boss] || null;
                    if (hf === null || !hf[r.diff - 1]) {
                        r.createtime = new Date(r.createtime).getTime();
                        if (vis.indexOf(r.id) > -1) {
                            newVis.push(r.id);
                            r.visited = true;
                            this.setChat(r.id, `visited`);
                        }
                        rd = rDat[r.boss];
                        r.isFull = rd && r.participants && rd.maxPlayers === r.participants;
                        DRMng.Raids.all.push(r);
                    }
                });

                DRMng.Config.set({ [`visited::${this.srv}`]: newVis });

                this._setComp(DRMng.Config.get(`sortBy`));
                this.all.sort(this.comp);

                this.count = this.all.length;

                DRMng.UI.clearRaidList();
                this.all.forEach(r => DRMng.UI.addRaidField(r));

                setTimeout(this.prepareJoining.bind(this), 0);
                this.bootstrap = false;
            },
            insert: function (raid) {
                if (this.locked || this.bootstrap) {
                    setTimeout(this.insert.bind(this, raid), 10);
                    return;
                }
                this.locked = true;

                const hf = this.flt[raid.boss] || null;
                if (hf === null || !hf[raid.diff - 1]) {
                    if (this.getIdx(raid.id) === -1 && !this.getDead(raid.id)) {
                        const idx = this.location(raid) + 1;
                        const rd = DRMng.Config.get(`raidData::${raid.boss}`);
                        raid.visited = DRMng.Config.get(`visited::${this.srv}`).indexOf(raid.id) > -1;
                        raid.isFull = rd && raid.participants && rd.maxPlayers === raid.participants;
                        this.all.splice(idx, 0, raid);
                        DRMng.UI.addRaidField(raid, idx);
                        this.count++;
                        DRMng.UI.displayStatus();
                        if (!raid.visited && !raid.isFull && this.filter.indexOf(`@${raid.boss}_${raid.diff}`) > -1) {
                            if (this.isJoining) setTimeout(this.pushToQueue.bind(this, raid), 0);
                            else setTimeout(this.prepareJoining.bind(this), 0);
                        }
                    }
                }

                this.locked = false;
            },
            setDead: function (id, save) {
                if (!this.getDead(id)) {
                    DRMng.Config.local.dead[this.srv][id] = new Date().getTime();
                    if (save) DRMng.Config.saveLocal();
                }
            },
            getDead: function (id) {
                return id && DRMng.Config.get(`dead::${this.srv}`).hasOwnProperty(id);
            },
            remove: function (id, serverNuke) {
                if (this.locked || this.bootstrap) {
                    setTimeout(this.remove.bind(this, id, serverNuke), 10);
                    return;
                }
                this.locked = true;

                serverNuke && DRMng.Engine.client.emit(`service`, { action: `raidNuke`, data: id });

                const cfg = DRMng.Config.local;

                this.setDead(id);
                //this.deadCache[id] = new Date().getTime();
                let i = this.getIdx(id);
                if (i > -1) {
                    const r = this.get(id);
                    this.all.splice(i, 1);
                    this.count--;
                    if (!this.isJoining && this.filter.indexOf(`@` + r.boss + `_` + r.diff) > -1)
                        setTimeout(this.prepareJoining.bind(this), 10);
                }
                DRMng.UI.removeRaidField(id);

                // visited strip
                i = cfg.visited[this.srv].indexOf(id);
                i > -1 && cfg.visited[this.srv].splice(i, 1);

                this.setChat(id, `dead`);
                this.setVisited(id, true);
                DRMng.UI.displayStatus();

                this.locked = false;
            },
            update: function (raid, full) {
                if (this.locked || this.bootstrap) {
                    setTimeout(DRMng.Raids.update.bind(this, raid, full), 10);
                    return;
                }
                this.locked = true;

                const cfg = DRMng.Config.local;

                let r = this.get(raid.id);
                if (r && !this.getDead(raid.id)) {
                    const keys = [`hp`, `participants`, `m1`, `m2`, `m3`, `m4`, `m5`, `m6`];
                    full && keys.push(`mnum`, `size`);

                    const rd = cfg.raidData[r.boss];

                    r = DRMng.Util.copyFields(raid, r, keys);

                    if (r.isFull !== true) r.isFull = rd && r.participants && rd.maxPlayers === r.participants;

                    // first remove
                    let i = this.getIdx(r.id);
                    i > -1 && this.all.splice(i, 1);
                    DRMng.UI.removeRaidField(r.id);

                    // then insert back
                    i = this.location(r) + 1;
                    this.all.splice(i, 0, r);
                    DRMng.UI.addRaidField(r, i);

                    // handle raid becoming full on update
                    if (r.isFull && !this.isJoining && this.filter.indexOf(`@` + r.boss + `_` + r.diff) > -1)
                        setTimeout(this.prepareJoining.bind(this), 0);
                }

                this.locked = false;
            },
            location: function (val, start = 0, end) {
                const len = this.all.length;

                if (len === 0) return -1;
                if (end === undefined) end = len;

                const pos = (start + end) >> 1;
                const c = this.comp(val, this.all[pos]);

                if (end - start <= 1) return c < 0 ? pos - 1 : pos;
                if (c < 0) return this.location(val, start, pos);
                if (c > 0) return this.location(val, pos, end);
                return pos;
            },
            init: function () {
                DRMng.log(`{Raids} This`, this);
                setTimeout(() => this.cleanDeadCache(), 60000);
                DRMng.log(`{Raids} Module loaded`);
            }
        },
        /**
         * User Manager module
         * Keeps user and friends data
         */
        UM: {
            numTries: 0,
            knownUsers: {},
            user: { qualified: false, ID: null, name: null, IGN: null, authToken: null, guild: null },
            getBasicUserData: function () {
                if (active_user && active_user.username().toLowerCase() !== `guest`) {
                    this.user.ID = active_user.id();
                    this.user.name = active_user.username();
                    this.user.authToken = active_user.gameAuthToken();
                    setTimeout(this.getExtendedUserData.bind(this), 0);
                }
                else {
                    DRMng.log(`debug`, `{UserManager} User data not ready, trying again in .1 sec`);
                    setTimeout(this.getBasicUserData.bind(this), 100);
                }
            },
            getUserNode: function () {
                const guild = holodeck._chat_window._rooms_by_type.guild;
                const users = guild.users();
                if (users.length > 0) {
                    // set IGN
                    for (let i = 0, l = users.length; i < l; ++i)
                        if (users[i].username === this.user.name) {
                            this.user.IGN = users[i]._game_character_name;
                            break;
                        }
                    // set guild
                    this.user.guild = guild._room.name;
                    // qualify user data
                    this.user.qualified = true;
                }
                else setTimeout(this.getUserNode.bind(this), 100);
            },
            getExtendedUserData: function () {
                if (holodeck && holodeck.ready && holodeck._chat_window._rooms_by_type) {
                    if (holodeck._chat_window._rooms_by_type.guild) setTimeout(this.getUserNode.bind(this), 0);
                    else if (this.numTries++ <= 20) {
                        DRMng.log(`debug`, `{UserManager} Guild data missing, trying again in 2 sec (%d/20)`,
                                  this.numTries);
                        setTimeout(this.getExtendedUserData.bind(this), 2000);
                    }
                    else {
                        DRMng.log(`warn`, `{UserManager} Guild info missing. Protip: Join private guild.`);
                        this.user.guild = ``;
                        this.user.IGN = ``;
                        this.user.qualified = true;
                    }
                }
                else setTimeout(this.getExtendedUserData.bind(this), 100);
            },
            getUserData: function () {
                this.numTries = 0;
                this.user.qualified = false;
                setTimeout(this.getBasicUserData.bind(this), 0);
            }
        },
        /**
         * Engine module
         * Backend event driven communication
         */
        Engine: {
            client: null,
            changeServer: server => {
                if (typeof server !== `string`) server = (DRMng.Config.get(`server`) === `Elyssa` ? `Kasan` : `Elyssa`);
                DRMng.log(`info`, `{Engine} Changing server to <%s>`, server);
                DRMng.Engine.client.disconnect();
                DRMng.Config.set({ server: server });
                DRMng.Engine.client.nsp = `/` + server;
                DRMng.Raids.processFilter(``, true);
                DRMng.UI.setupFilterBox();
                DRMng.UI.setupFilterTab();
                document.getElementById(`DRMng_server`).innerText = server;
                DRMng.UI.displayStatus(`Loading...`);
                setTimeout(DRMng.Engine.client.connect.bind(DRMng.Engine.client), 1000);
            },
            reconnect: () => {

                DRMng.Engine.client.disconnect();
                setTimeout(DRMng.Engine.client.connect.bind(DRMng.Engine.client), 1000);
            },
            init: () => {
                if (typeof io === `function` && DRMng.UM.user.qualified) {
                    DRMng.Engine.client = io
                        .connect(`${DRMng.ServerWS}/${DRMng.Config.local.server}`,
                                 {
                                     secure: true,
                                     transports: [`websocket`],
                                     query: { user: DRMng.UM.user.name }
                                 })
                        .on(`error`, data => DRMng.log(`warn`, `{Engine} Error ::`, data))
                        .on(`msg`, DRMng.Engine.handleMessage)
                        .on(`service`, DRMng.Engine.handleService)
                        .on(`disconnect`, () => DRMng.log(`warn`, `{Engine} Socket client disconnected.`))
                        .on(`connect`, () => {
                            DRMng.log(`{Engine} Socket connection established, joining...`);
                            DRMng.Engine.client.emit(`join`, {
                                usr: DRMng.UM.user.name,
                                ign: DRMng.UM.user.IGN,
                                gld: DRMng.UM.user.guild,
                                chk: DRMng.Config.local.checkSums
                            });
                        });
                }
                else {
                    DRMng.log(`debug`, `{Engine} Resources not ready, trying again in 1 sec...`);
                    setTimeout(DRMng.Engine.init, 1000);
                }
            },
            //handleMessage: msg => DRMng.Kong.serviceMsg(msg.txt),
            handleMessage: msg => DRMng.log(`info`, `{Engine::Message} ${msg.txt}`),
            handleService: d => {
                if (!d) return;
                const config = DRMng.Config;
                const action = d.action;
                const data = d.data;

                switch (action) {
                    case `raidData`:
                        if (config.get(`checkSums::raidData`) !== data.raidDataHash && data.raidDataHash.length > 6) {
                            DRMng.log(`info`, `{Engine::Service} New raids data. Old hash ` +
                                              `<${config.get(
                                                  `checkSums::raidData`)}> | New hash <${data.raidDataHash}>`);
                            config.set({
                                           raidData: data.raidData,
                                           'checkSums::raidData': data.raidDataHash
                                       });
                        }
                        setTimeout(DRMng.UI.setupFilterTab.bind(DRMng.UI), 0);
                        break;
                    case `filterData`:
                        if (config.get(`checkSums::filterData`) !== data.filterDataHash &&
                            data.filterDataHash.length > 6) {
                            DRMng.log(`info`, `{Engine::Service} New keywords data. Old hash ` +
                                              `<${config.get(
                                                  `checkSums::filterData`)}> | New hash <${data.filterDataHash}>`);
                            config.set({
                                           filterData: data.filterData,
                                           'checkSums::filterData': data.filterDataHash
                                       });
                        }
                        break;
                    case `tiersData`:
                        if (DRMng.Config.local.checkSums.tiersData !== d.data.tiersDataHash &&
                            d.data.tiersDataHash.length > 6) {
                            DRMng.log(`info`, `{Engine::Service} New tiers data. Old hash <%s> | New hash <%s>`,
                                      config.get(`checkSums::tiersData`), data.tiersDataHash);
                            config.set({
                                           tiersData: JSON.parse(data.tiersData),
                                           'checkSums::tiersData': data.tiersDataHash
                                       });
                        }
                        break;
                    case `bootStrap`:
                        DRMng.log(`{Engine::Service} Raids feed <${d.raids.length}>`);
                        setTimeout(DRMng.Raids.insertAll.bind(DRMng.Raids, d.raids), 0);
                        break;
                    case `newRaid`:
                        setTimeout(DRMng.Raids.insert.bind(DRMng.Raids, d.data), 0);
                        break;
                    case `nukedRaid`:
                        setTimeout(DRMng.Raids.remove.bind(DRMng.Raids, d.data), 0);
                        break;
                    case `partialUpdate`:
                        setTimeout(DRMng.Raids.update.bind(DRMng.Raids, d.data, false), 0);
                        break;
                    case `fullUpdate`:
                        setTimeout(DRMng.Raids.update.bind(DRMng.Raids, d.data, true), 0);
                        break;
                    case `delayedSub`:
                        setTimeout(DRMng.UI.submitResponse.bind(DRMng.UI, d.data.error ? 0 : 1, d.data.msg), 0);
                        break;
                    default:
                        DRMng.log(`warn`, `{Engine::Service} Unknown action => `, action);
                }
            }
        },
        PrivateChat: class {

            constructor(config) {

                if (DRMng.PrivateChat.Rooms === undefined) DRMng.PrivateChat.Rooms = {};

                this.users = {
                    html: null,
                    count: 0,
                    keys: [],
                    fields: {},
                    add: function (user) {
                        if (user.usr) {
                            const el = {
                                html: null,
                                name: user.usr || null,
                                ign: user.ign || ``,
                                guild: user.gld || ``,
                                sock: user.sid || null
                            };

                            el.html = document.createElement(`div`);
                            el.html.setAttribute(`style`, `display: flex; margin: 1px 2px; align-items: center;`);

                            let span = document.createElement(`span`);
                            span.setAttribute(`style`, `font-size: 9px; background-color: #4a4a4a; color: #ddd;` +
                                                       ` line-height: 11px; padding: 1px 0 0; font-weight: 700; width: 30px;` +
                                                       ` text-align: center; text-shadow: 0 0 5px #333; flex-grow: 0; flex-shrink: 0;` +
                                                       ` margin-right: 5px; border: 1px solid #363636;`);
                            span.textContent = el.guild ? DRMng.PrivateChat.getGuildTag(el.guild) : `???`;
                            el.html.appendChild(span);

                            span = document.createElement(`span`);
                            span.setAttribute(`style`, `flex-grow: 0; flex-shrink: 0; color: #f0f0f9;` +
                                                       ` margin-right: 4px; padding-bottom: 1px;`);
                            span.textContent = el.name;
                            el.html.appendChild(span);

                            span = document.createElement(`span`);
                            span.setAttribute(`style`, `flex-grow: 1; flex-shrink: 1; color: #ddd; font-style:` +
                                                       ` italic; padding-bottom: 1px; text-overflow: ellipsis; overflow: hidden;`);
                            span.textContent = `(` + el.ign + `)`;
                            el.html.appendChild(span);

                            this.fields[el.name] = el;
                        }
                    },
                };

                this.active = false;
                this.count = null;
                this.conf = config;
                this.unr = null;
                this.tabs = null;
                this.tab = null;
                this.body = null;
                this.input = null;
                this.inputCnt = null;
                this.client = null;
                this.userLock = false;
                this.messageLock = false;
                this.messageBuffer = [];

                DRMng.PrivateChat.Rooms[this.conf.channel] = this;

                setTimeout(() => this.initTab(), 10);
            }

            get name() {
                return this.conf.name;
            }

            set name(val) {
                if (this.conf.name === val) return;
                this.conf.name = val;
                this.tab.firstChild.textContent = val;
                this.nameUpdate();
            }

            set pass(val) {
                if (this.conf.pass === val) return;
                this.conf.pass = val;
                this.client.query.token = DRMng.Util.crc32(val);
                setTimeout(() => this.reconnect(), 1000);
            }

            configUpdate(conf) {
                this.name = conf.name;
                this.pass = conf.pass;
            }

            connect() {
                if (typeof io === `function` && this.tab && this.chat &&
                    DRMng.UM.user.qualified && !DRMng.Raids.bootstrap) {

                    if (DRMng.Config.local.alliance.sbs)
                        document.getElementById(`alliance_chat_sbs`).style.removeProperty(`display`);
                    else
                        this.tab.style.removeProperty(`display`);

                    const usr = DRMng.UM.user;
                    const user = { usr: usr.name, ign: usr.IGN, gld: usr.guild };

                    this.client =
                        io.connect(`${DRMng.ServerWS}/${this.conf.channel}`, {
                            query: {
                                user: DRMng.UM.user.name,
                                token: DRMng.Util.crc32(this.conf.pass)
                            },
                            secure: true,
                            transports: [`websocket`]
                        });

                    this.client.on(`error`, err => {
                        DRMng.log(`warn`, `{PrivateChat} Client error:`, err);
                        document.getElementById(`alliance_chat_sbs`).style.setProperty(`display`, `none`);
                        this.tab.style.setProperty(`display`, `none`);
                        //destroyChat();
                    });

                    this.client.on(`disconnect`, () => {
                        console.warn(`warn`, `{PrivateChat} Client disconnected!`);
                    });

                    this.client.on(`connect`, () => {
                        this.clearUsers();              // clear user list
                        this.clear();                   // clear chat
                        this.client.emit(`join`, user); // login to server
                        DRMng.log(`info`, `{PrivateChat} User login data [%s|%s|%s]`, user.usr, user.ign, user.gld);
                    });

                    this.client.on(`msg`, data => this.messageEvent(data));
                    this.client.on(`service`, data => this.serviceEvent(data));
                }
                else {
                    DRMng.log(`info`, `{PrivateChat} Resources not ready, trying again in 1 sec...`);
                    setTimeout(() => this.connect(), 1000);
                }
            }

            reconnect() {
                if (!this.client) setTimeout(() => this.connect(), 0);
                else {
                    if (this.client.connected) {
                        this.client.disconnect();
                        setTimeout(() => this.reconnect(), 3000);
                    }
                    else this.client.connect();
                }
            }

            updateUsers() {
                // update keys
                this.users.keys = Object.keys(this.users.fields);
                // sort userlist
                this.users.keys.sort();
                // clear list
                while (this.users.html.firstChild) this.users.html.removeChild(this.users.html.firstChild);
                // fill it up again
                this.users.count = this.users.keys.length;

                for (let i = 0; i < this.users.count; ++i)
                    this.users.html.appendChild(this.users.fields[this.users.keys[i]].html);

                this.countUpdate();
            }

            addUser(user, noUpdate = false) {
                if (!this.userLock) {
                    this.userLock = true;
                    // TODO: Stop using update and inject field into sorted array
                    this.users.add(user);
                    if (!noUpdate) this.updateUsers();
                    this.userLock = false;
                }
                else setTimeout(() => this.addUser(user, noUpdate), 10);
            }

            delUser(name) {
                if (!this.userLock) {
                    this.userLock = true;
                    if (this.users.fields.hasOwnProperty(name)) {
                        this.users.html.removeChild(this.users.fields[name].html);
                        delete this.users.fields[name];
                        const idx = this.users.keys.indexOf(name);
                        if (idx !== -1) this.users.keys.splice(idx, 1);
                        this.users.count--;
                        this.countUpdate();
                    }
                    this.userLock = false;
                }
                else setTimeout(() => this.delUser(name), 10);
            }

            clearUsers() {
                this.users.keys = [];
                this.users.count = 0;
                this.users.fields = {};
                if (this.users.html)
                    while (this.users.html.firstChild) this.users.html.removeChild(this.users.html.firstChild);
            }

            countUpdate() {
                if (this.active) this.count.textContent = this.users.count;
            }

            nameUpdate() {
                if (DRMng.Config.local.alliance.sbs || !this.active) return;
                document.querySelector(`.room_name.h6`).textContent = this.name;
            }

            static getGuildTag(guild) {
                const roman = /^(.+\s)([IXV]+)$/.exec(guild);
                if (roman) guild = roman[1] + DRMng.Util.deRomanize(roman[2]);
                const reg = /([A-Z]+|\w)\w*/g;
                let tag = ``, part;
                while ((part = reg.exec(guild))) tag += part[1];
                return tag;
            }

            setUnread(unset = false) {
                if (this.unr) this.unr.setAttribute(`style`, unset ? `display: none` : ``);
            }

            activate() {
                if (!DRMng.Config.local.alliance.sbs) holodeck._chat_window._active_room.hide();
                if (DRMng.PrivateChat.getActive()) DRMng.PrivateChat.getActive().deactivate();
                this.tab.classList.add(`active`);
                //this.tab.style.setProperty(`border-right`, `0`);
                this.body.style.removeProperty(`display`);
                this.setUnread(true);
                this.active = true;
                this.nameUpdate();
                this.countUpdate();
                setTimeout(() => this.scrollToBottom(true), 100);
            }

            deactivate() {
                if (!this.active) return;
                this.active = false;
                this.tab.classList.remove(`active`);
                this.body.style.display = `none`;
            }

            tabClick(e) {
                e.preventDefault();
                e.stopPropagation();
                this.activate();
                return false;
            }

            clear() {
                while (this.chat.firstChild) this.chat.removeChild(this.chat.firstChild);
            }

            send(msg) {
                msg = msg || this.input.value;
                if (msg && msg !== `Enter text for chat here`) {
                    let pm = /^\/w\s(\w+?)\s([\S\s]+)$/.exec(msg);
                    if (pm && pm[1] && pm[2]) this.client.emit(`msg`, { type: 1, user: pm[1], text: pm[2] });
                    else holodeck.processChatCommand(msg, this.conf.channel) &&
                         this.client.emit(`msg`, { type: 0, text: msg });
                    this.input.value = ``;
                }
            }

            scrollToBottom(force = false) {
                if (!this.chat) return;
                const elHeight = this.chat.lastChild ? this.chat.lastChild.offsetHeight : 0;
                const chatHeight = this.chat.scrollHeight - this.chat.offsetHeight - this.chat.scrollTop;
                if (chatHeight <= elHeight || force) this.chat.scrollTop = this.chat.scrollHeight;
            }

            initTab() {
                this.tabs = document.getElementById(`chat_room_tabs`);
                const actions = document.getElementById(`chat_actions_container`);
                const gr = document.getElementById(`guild_room_tab`);
                if (this.tabs && actions && gr && actions.parentNode === this.tabs) {
                    this.tab = document.createElement(`div`);
                    this.tab.setAttribute(`id`, `drmng_${this.conf.channel}_room_tab`);
                    this.tab.setAttribute(`class`, `chat_room_tab drmng_room_tab`);
                    this.tab.style.setProperty(`display`, `none`);

                    this.unr = document.createElement(`span`);
                    this.unr.setAttribute(`class`, `unread_chat_messages spriteall spritegame`);
                    this.unr.setAttribute(`style`, `display: none`);
                    this.unr.innerHTML = `Unread`;

                    const a = document.createElement(`a`);
                    a.setAttribute(`href`, `#`);
                    a.textContent = this.conf.name;
                    a.addEventListener(`click`, e => this.tabClick(e));
                    a.appendChild(this.unr);

                    this.tab.appendChild(a);
                    this.tabs.insertBefore(this.tab, actions);
                    this.count = document.querySelector(`.number_in_room`);

                    console.info(`[DRMng] {PrivateChat} Chat tab created.`);

                    setTimeout(() => this.initBody(), 0);
                }
                else setTimeout(() => this.initTab(), 50);
            }

            initBody() {
                if (!DRMng.PrivateChat.container) {
                    DRMng.PrivateChat.container = document.getElementById(
                        this.conf.sbs ? `alliance_chat_sbs` : `chat_rooms_container`);
                    if (!DRMng.PrivateChat.container) return setTimeout(() => this.initBody(), 100);
                }

                if (this.body === null) {
                    this.body = document.createElement(`div`);
                    this.body.style.setProperty(`width`, `100%`);

                    if (!this.conf.sbs) this.body.style.setProperty(`display`, `none`);

                    const usr = document.createElement(`div`);
                    usr.setAttribute(`class`, `chat_tabpane users_in_room clear`);
                    this.users.html = usr;

                    const chat = document.createElement(`div`);
                    chat.setAttribute(`class`, `chat_message_window`);
                    this.chat = chat;

                    const inputDiv = document.createElement(`div`);
                    inputDiv.setAttribute(`class`, `chat_controls`);

                    this.input = document.createElement(`textarea`);
                    this.input.setAttribute(`class`, `chat_input`);
                    this.input.value = `Enter text for chat here`;

                    this.input.addEventListener(`focus`, () => {
                        if (this.input.value === `Enter text for chat here`) {
                            this.input.value = ``;
                            this.input.style.removeProperty(`font-style`);
                        }
                    });
                    this.input.addEventListener(`blur`, () => {
                        if (this.input.value === ``) {
                            this.input.value = `Enter text for chat here`;
                            this.input.style.setProperty(`font-style`, `italic`);
                        }
                    });
                    this.input.addEventListener(`keydown`, e => {
                        //console.log(e.which, e.keyCode, e.charCode, e.key, e.shiftKey);
                        if (e.key === `Enter` && !e.shiftKey) {
                            this.send();
                            e.preventDefault();
                        }
                    });
                    this.input.addEventListener(`keyup`, () => {
                        if (this.input.value !== `Enter text for chat here`) {
                            let txt = /^(\/\w*\s?)?([\S\s]*)$/.exec(this.input.value);
                            txt = txt[2] || ``;
                            if (this.inputCnt) this.inputCnt.textContent = txt.length;
                        }
                    });

                    const cnt = document.createElement(`span`);
                    cnt.setAttribute(`class`, `chat_chars_remaining`);
                    cnt.textContent = `0`;
                    this.inputCnt = cnt;

                    const cntCont = document.createElement(`span`);
                    cntCont.setAttribute(`class`, `chat_char_countdown`);
                    cntCont.appendChild(this.inputCnt);
                    cntCont.appendChild(document.createTextNode(`/Inf`));

                    inputDiv.appendChild(this.input);
                    inputDiv.appendChild(cntCont);
                    this.body.appendChild(this.users.html);
                    this.body.appendChild(this.chat);
                    this.body.appendChild(inputDiv);

                    console.info(`[DRMng] {PrivateChat} Chat body created.`);


                }

                const sbs = document.getElementById(`alliance_chat_sbs`);
                if (!this.conf.sbs) sbs.style.setProperty(`display`, `none`);

                DRMng.PrivateChat.container.appendChild(this.body);

                console.info(`[DRMng] {PrivateChat} Chat body attached to DOM.`);

                setTimeout(() => this.connect(), 0);
            }

            remove() {
                if (this.active) {
                    if (holodeck._chat_window._rooms_by_type.guild)
                        holodeck._chat_window._rooms_by_type.guild.show();
                    else holodeck._chat_window._rooms_by_type.game.show();
                }
                this.client.disconnect();
                this.tabs.removeChild(this.tab);
                DRMng.PrivateChat.container.removeChild(this.body);
            }

            static sbsEvent(e) {
                DRMng.UI.handleChatClick(e, true);
            }

            /**
             * Service event handler
             * @param {object} data
             * @param {string} data.act
             * @param {string} data.action
             * @param {object} data.users
             * @param {Array} data.raids
             * @param {object} data.data
             */
            serviceEvent(data) {
                // TODO: remove act when users move to new version
                if (data.act) data.action = data.act;
                switch (data.action) {
                    case `loadData`:
                        // load users
                        this.userLock = true;
                        this.clearUsers();
                        this.userLock = false;

                        Object.keys(data.users).forEach(u => this.addUser(data.users[u], true));

                        this.userLock = true;
                        this.updateUsers();
                        this.userLock = false;

                        // load history
                        if (data.log.length > 0 && this.chat.childElementCount < 2) {
                            this.messageLock = true;
                            data.log.forEach(log => this.messageEvent(log, true));
                            while (this.messageBuffer.length) this.messageEvent(this.messageBuffer.shift(), true);
                            this.messageLock = false;
                            setTimeout(() => this.scrollToBottom(true), 1000);
                        }

                        break;

                    case `userJoin`:
                        setTimeout(() => this.addUser(data.user), 0);
                        break;

                    case `userLeave`:
                        setTimeout(() => this.delUser(data.user.usr), 0);
                        break;

                    case `allianceRaids`:
                        data.raids.forEach(raid => {
                            raid.createtime = new Date(raid.createtime).getTime();
                            DRMng.Raids.insert(raid);
                        });
                        break;

                    case `newRaid`:
                        setTimeout(DRMng.Raids.insert.bind(DRMng.Raids, data.data), 0);
                        break;

                    case `fullUpdate`:
                        setTimeout(DRMng.Raids.update.bind(DRMng.Raids, data.data, true), 0);
                        break;

                    case `partialUpdate`:
                        setTimeout(DRMng.Raids.update.bind(DRMng.Raids, data.data, false), 0);
                        break;

                    case `nukedRaid`:
                        setTimeout(DRMng.Raids.remove.bind(DRMng.Raids, data.data), 0);
                        break;

                    default:
                        console.log(`[DRMng] {PrivateChat} SRV:`, data);
                }
            }

            messageEvent(data, history = false) {
                if (data.type === 4) this.serviceMessage(data.txt);
                else if (!this.messageLock || history) {
                    let u = DRMng.UM.user,
                        t = data.type,
                        e = [`username`, `truncate`],
                        f = data.usr.usr === u.name,
                        h = [``, `From `, `To `, ``][t],
                        g = [];

                    e.push(`chat_message_window` + (c ? `_undecorated` : ``) + `_username`);
                    h && g.push(`whisper`);
                    (t === 1) && g.push(`received_whisper`);
                    (t === 2) && g.push(`sent_whisper`);
                    f && e.push(`is_self`);

                    let content = DRMng.PrivateChat.raidMessage(data, g, e, h);
                    if (!content) {
                        let reg = /(https?\S+[^,\s])/g, l, link, start, end, msg = data.txt;

                        while ((l = reg.exec(msg))) {
                            if (/\.(jpe?g|a?png|gif)$/.test(l[1]))
                                link = `<img src="${l[1]}" alt="${l[1]}" onclick="window.open(this.src)">`;
                            else if (/(prntscr.com|prnt.sc)/.test(l[1])) {
                                let id = `prntsc_${new Date().getTime()}`;
                                link = `<img id="${id}" onclick="window.open(this.src)">`;
                                DRMng.Gate.lightShot(l[1], id, this.conf.channel);
                            }
                            else if ((link = /.+youtube.+watch.+?v=([^&]{11})/.exec(l[1])))
                                link = `<iframe width="480" height="auto" src="https://www.youtube.com/embed/${link[1]}" frameborder="0"></iframe>`;
                            else
                                link = `<a href="${l[1]}" target="_blank">${l[1].replace(/^https?:\/\//, ``)}</a>`;
                            start = msg.substr(0, reg.lastIndex - l[1].length);
                            end = msg.slice(reg.lastIndex);
                            msg = start + link + end;
                            reg.lastIndex += link.length - l[1].length;
                        }
                        content = DRMng.PrivateChat.getMessageHTML({
                                                                       mainCls: g.join(` `),
                                                                       ts: new Date(data.ts).format(
                                                                           `mmm d, HH:MM`),
                                                                       pfx: h,
                                                                       user: data.usr.usr,
                                                                       userCls: e.join(` `),
                                                                       ign: data.usr.ign || ``,
                                                                       ignCls: data.usr.ign ? `guildname truncate` :
                                                                               ``,
                                                                       tag: DRMng.PrivateChat.getGuildTag(
                                                                           t === 2 ? u.guild : data.usr.gld) || `???`,
                                                                       msg: msg
                                                                   });
                    }
                    const msg = document.createElement(`div`);
                    msg.setAttribute(`class`, `chat-message`);
                    if (content instanceof HTMLElement) msg.appendChild(content);
                    else msg.innerHTML = content;
                    this.chat.appendChild(msg);
                    if (this.active || this.conf.sbs) this.scrollToBottom(f);
                    else this.setUnread();
                }
                else this.messageBuffer.push(data);
            }

            serviceMessage(msg, ri) {
                if (msg) {
                    const p = new DRMng.Node(`div`).attr({ class: `chat-message` });
                    new DRMng.Node(`div`)
                        .attr({ class: `service${ri ? ` raidinfo` : ``}` })
                        .style(ri ?
                                   { 'background-image': `url(https://content.5thplanetgames.com/dotd_live/images/bosses/${ri}.jpg)` } :
                                   {})
                        .data(msg).attach(`to`, p);
                    if (this.chat.appendChild(p.node)) this.scrollToBottom(true);
                }
            }

            static getMessageHTML(d) {
                let p = new DRMng.Node(`p`);
                if (d) {
                    if (d.mainCls) p.attr({ class: d.mainCls });

                    // 1st row (header)
                    let hdr = new DRMng.Node(`span`).attr({ class: `header` });

                    // Time field
                    new DRMng.Node(`span`)
                        .attr({ class: `timestamp` })
                        .style({ 'flex-grow': `1` })
                        .txt(d.ts).attach(`to`, hdr);
                    // Guild tag
                    new DRMng.Node(`span`)
                        .attr({ class: `sticker` })
                        .txt(d.tag).attach(`to`, hdr);

                    hdr.attach(`to`, p);

                    // 2nd row
                    hdr = new DRMng.Node(`span`).style({ display: `block` });

                    // Username
                    new DRMng.Node(`span`)
                        .attr({ class: d.userCls, username: d.user, ign: d.ign })
                        .txt((d.pfx || ``) + d.user).attach(`to`, hdr);
                    // IGN
                    new DRMng.Node(`span`)
                        .attr({ class: d.ignCls })
                        .txt(d.ign).attach(`to`, hdr);
                    // Separator
                    new DRMng.Node(`span`)
                        .attr({ class: `separator` })
                        .txt(`: `).attach(`to`, hdr);
                    // Message
                    new DRMng.Node(`span`)
                        .attr({ class: `message hyphenate` })
                        .html(d.msg).attach(`to`, hdr);

                    hdr.attach(`to`, p);
                }
                return p.node;
            }

            static raidMessage(data, pc, uc, pfx) {
                let msg = /(^.*?)(https?...www.kongregate.com.+?action_type.raidhelp.+?)(\s[\s\S]*$|$)/.exec(data.txt);
                if (msg) {
                    let r = DRMng.Util.getRaidFromUrl(msg[2], data.usr.usr);
                    if (r) {
                        let srv                                                = DRMng.Config.local.server.toLowerCase(), g   = this.getGuildTag(data.usr.gld),
                            v                                                  = DRMng.Config.local.visited[srv].indexOf(r.id) > -1,
                            d                                                  = DRMng.Config.local.dead[srv].hasOwnProperty(r.id),
                            l, m                                               = msg[1] + msg[3],
                            i = DRMng.Config.local.raidData[r.boss], n = [], s = m ? `:` : ``,
                            t                                                  = new Date(data.ts).format(`mmm d, HH:MM`), u    = data.usr.usr,
                            ign                                                = data.usr.ign;

                        pc.push(`raid`);
                        pc.push([`n`, `h`, `l`, `nm`][r.diff - 1]);
                        pc.push(r.id);
                        d ? pc.push(`dead`) : v && pc.push(`visited`);

                        n.push([`N`, `H`, `L`, `NM`][r.diff - 1]);
                        n.push(i ? i.sName : r.boss.replace(/_/g, ` `).toUpperCase());

                        l = `{id:'${r.id}',hash:'${r.hash}',boss:'${r.boss}',sid:'${r.sid}'}`;
                        l = `return DRMng.Raids.joinOne(${l});`;

                        let f = i ? DRMng.Util.getShortNumK(i.hp[r.diff - 1] * 1000 / i.maxPlayers) : ``;
                        f = `${i && i.maxPlayers === 90000 ? `ER/WR` : `FS ${f}`}`;

                        return `<p class="${pc.join(` `)}">
                                    <span class="header">
                                        <span class="sticker" style="line-height: 12px;margin-right: 3px;width: 26px;">${g}</span>
                                        <span class="timestamp" style="flex-grow: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-right: 3px;">${t}</span>
                                        <a href="${msg[2]}" onclick="${l}" style="font-size: 10px; text-transform: uppercase; flex-shrink: 0;">${n.join(
                            ` `)}</a>
                                    </span>
                                    <span style="display: flex">
                                        <span username="${u}" class="${uc.join(` `)}">${pfx}${u}</span>
                                        <span class="guildname truncate">${ign}</span>
                                        <span class="separator">${s}</span>
                                        <span class="extraid" style="flex-grow: 1; text-align: right; white-space: nowrap;">${f}</span>
                                    </span>
                                    <span class="message hyphenate">${m}</span>
                                </p>`;
                    }
                }
                return null;
            }

            static getChat(name) {
                if (this.Rooms === undefined) return null;
                return Object.keys(this.Rooms).includes(name) ? this.Rooms[name] : null;
            }

            static getActive(nameOnly = false) {
                if (this.Rooms === undefined) return null;
                const r = Object.keys(this.Rooms);
                for (let i = 0; i < r.length; ++i)
                    if (this.Rooms[r[i]].active) return nameOnly ? r[i] : this.Rooms[r[i]];
                return null;
            }

            static anyActive() {
                if (DRMng.Config.local.alliance.sbs || this.Rooms === undefined) return false;
                const r = Object.keys(this.Rooms);
                for (let i = 0; i < r.length; ++i) if (this.Rooms[r[i]].active) return true;
                return false;
            }

            static createAll() {
                const rooms = DRMng.Config.local.alliance.rooms;
                rooms.forEach(room => {
                    if (room.enabled) {
                        if (this.getChat(room.channel) === null) new this(room);
                    }
                });
            }

            static add() {
                const elChannel = document.getElementById(`DRMng_allianceChnl`);
                const elPasswd = document.getElementById(`DRMng_alliancePass`);

                if (elChannel.classList.contains(`default`) || elPasswd.classList.contains(`default`)) return;

                const rooms = DRMng.Config.local.alliance.rooms;
                let replace = -1;
                rooms.forEach((room, i) => {
                    if (room.channel === elChannel.value) replace = i;
                });

                const elName = document.getElementById(`DRMng_allianceName`);
                const elColor = document.getElementById(`DRMng_allianceColor`);
                const room = {
                    channel: elChannel.value,
                    pass: elPasswd.value,
                    name: elName.classList.contains(`default`) ?
                          elChannel.value.charAt(0).toUpperCase() + elChannel.value.slice(1) : elName.value,
                    color: elColor.classList.contains(`default`) ? `#336699` : elColor.value,
                    enabled: true
                };

                this.addOption(room);

                if (replace > -1) {
                    DRMng.Config.local.alliance.rooms[replace] = room;
                    const r = this.getChat(room.channel);
                    if (r) r.configUpdate(room);
                    else this.createAll();
                }
                else {
                    DRMng.Config.local.alliance.rooms.push(room);
                    this.createAll();
                }
                DRMng.Config.saveLocal();
            }

            static addOption(room) {
                const id = `DRMng_privateChat_room_${room.channel}`;
                const el = new DRMng.Node(`#${id}`);
                if (el.notNull) el.node.firstChild.textContent = room.name;
                else new DRMng.Node(`div`)
                    .attr({ class: `buttonStripe`, id: id })
                    .data(new DRMng.Node(`span`).txt(room.name))
                    .data(
                        new DRMng.Node(`button`).attr({ class: `l` }).txt(`Del`).on(`click`, () => this.removeChat(id)))
                    .attach(`to`, `DRMng_privateChat`);
            }

            static removeChat(chatID) {
                const id = chatID.split(`_`)[3];
                new DRMng.Node(`#${chatID}`).detach();
                const chat = this.getChat(id);
                if (chat) {
                    this.Rooms[id].remove();
                    delete this.Rooms[id];
                }
            }

        },
        /*Alliance: {
         tabs: null,
         tab: null,
         unr: null,
         body: null,
         chat: null,
         conf: null,
         input: null,
         inputCnt: null,
         client: null,
         active: false,
         count: null,
         users: {
         html: null,
         count: 0,
         keys: [],
         fields: {},
         lock: false,
         update: function () {
         // update keys
         this.keys = Object.keys(this.fields);
         // sort userlist
         this.keys.sort();
         // clear list
         while (this.html.firstChild) this.html.removeChild(this.html.firstChild);
         // fill it up again
         this.count = this.keys.length;

         for (let i = 0; i < this.count; ++i)
         this.html.appendChild(this.fields[this.keys[i]].html);

         DRMng.Alliance.countUpdate();
         },
         add: function (user, noUpdate) {
         if (!this.lock) {
         this.lock = true;
         // TODO: Stop using update and inject field into sorted array
         if (user instanceof DRMng.Alliance.User) {
         this.fields[user.name] = user;
         if (!noUpdate) this.update();
         }
         this.lock = false;
         }
         else setTimeout(this.add.bind(this, user, noUpdate), 10);
         },
         del: function (name) {
         if (!this.lock) {
         this.lock = true;
         if (this.fields.hasOwnProperty(name)) {
         this.html.removeChild(this.fields[name].html);
         delete this.fields[name];
         let idx = this.keys.indexOf(name);
         if (idx !== -1) this.keys.splice(idx, 1);
         this.count--;
         DRMng.Alliance.countUpdate();
         //this.update();
         }
         this.lock = false;
         }
         else setTimeout(this.del.bind(this, name), 10);
         }
         },
         User: function (name, ign, guild, socket) {
         this.html = null;
         this.name = name || null;
         this.ign = ign || ``;
         this.guild = guild || ``;
         this.sock = socket || null;
         this.setup = function () {
         if (this.name) {
         this.html = document.createElement(`div`);
         this.html.setAttribute(`style`, `display: flex; margin: 1px 2px; align-items: center;`);
         let span;
         span = document.createElement(`span`);
         span.setAttribute(`style`, `font-size: 9px; background-color: #4a4a4a; color: #ddd;` +
         ` line-height: 11px; padding: 1px 0 0; font-weight: 700; width: 30px;` +
         ` text-align: center; text-shadow: 0 0 5px #333; flex-grow: 0; flex-shrink: 0;` +
         ` margin-right: 5px; border: 1px solid #363636;`);
         span.textContent = this.guild ? DRMng.Alliance.getGuildTag(this.guild) : `???`;
         this.html.appendChild(span);

         span = document.createElement(`span`);
         span.setAttribute(`style`, `flex-grow: 0; flex-shrink: 0; color: #f0f0f9;` +
         ` margin-right: 4px; padding-bottom: 1px;`);
         span.textContent = this.name;
         this.html.appendChild(span);

         span = document.createElement(`span`);
         span.setAttribute(`style`, `flex-grow: 1; flex-shrink: 1; color: #ddd; font-style:` +
         ` italic; padding-bottom: 1px; text-overflow: ellipsis; overflow: hidden;`);
         span.textContent = `(` + this.ign + `)`;
         this.html.appendChild(span);
         }
         return this;
         };
         return this.setup();
         },
         countUpdate: function () {
         if (this.active) this.count.textContent = this.users.count;
         },
         nameUpdate: function () {
         let name = this.conf.name ? this.conf.name : (this.conf.channel + ` alliance`);
         name = name.trim();
         name = name.charAt(0).toUpperCase() + name.slice(1);
         document.querySelector(`.room_name.h6`).textContent = name;
         },
         getGuildTag: function (guild) {
         const roman = /^(.+\s)([IXV]+)$/.exec(guild);
         if (roman) guild = roman[1] + DRMng.Util.deRomanize(roman[2]);
         const reg = /([A-Z]+|\w)\w*!/g;
         let tag = ``, part;
         while ((part = reg.exec(guild))) tag += part[1];
         return tag;
         },
         initConfig: function () {
         this.conf = DRMng.Config.local.alliance;
         //DRMng.Config.saveLocal();
         },
         setUnread: function (unset) {
         if (this.unr) {
         unset = unset || false;
         this.unr.setAttribute(`style`, unset ? `display: none` : ``);
         }
         },
         initTab: function () {
         let actions = document.getElementById(`chat_actions_container`);
         let tabs = document.getElementById(`chat_room_tabs`);
         let gr = document.getElementById(`guild_room_tab`);
         if (tabs && actions && gr && actions.parentNode === tabs) {
         let tab = document.createElement(`div`);
         tab.setAttribute(`id`, `alliance_room_tab`);
         tab.setAttribute(`class`, `chat_room_tab`);
         tab.style.setProperty(`display`, `none`);

         let a = document.createElement(`a`);
         a.setAttribute(`href`, `#`);
         a.innerHTML = `Alliance`;
         a.addEventListener(`click`, function (e) {
         e.preventDefault(); e.stopPropagation();
         holodeck._chat_window._active_room.hide();
         if (this.tab) {
         this.tab.setAttribute(`class`, `chat_room_tab active`);
         this.tab.style.setProperty(`border-right`, `0`);
         }
         if (this.body) this.body.style.removeProperty(`display`);
         this.setUnread(true);
         this.active = true;
         setTimeout(this.nameUpdate.bind(this), 0);
         setTimeout(this.countUpdate.bind(this), 0);
         setTimeout(this.scrollToBottom.bind(this, true), 0);
         return false;
         }.bind(this));

         let span = document.createElement(`span`);
         span.setAttribute(`class`, `unread_chat_messages spriteall spritegame`);
         span.setAttribute(`style`, `display: none`);
         span.innerHTML = `Unread`;
         this.unr = span;

         a.appendChild(span);
         tab.appendChild(a);

         this.tab = tab;
         this.tabs = tabs;

         this.tabs.insertBefore(this.tab, actions);

         this.count = document.getElementsByClassName(`number_in_room`)[0];

         console.info(`[DRMng] {Alliance} Chat tab created.`);

         setTimeout(this.initBody.bind(this), 0);
         }
         else setTimeout(this.initTab.bind(this), 50);
         },
         initBody: function () {
         let container = document.getElementById(this.conf.sbs ? `alliance_chat_sbs` : `chat_rooms_container`);
         if (container) {
         if (this.body === null) {
         this.body = document.createElement(`div`);
         this.body.style.setProperty(`width`, `100%`);

         if (!this.conf.sbs) this.body.style.setProperty(`display`, `none`);

         let usr = document.createElement(`div`);
         usr.setAttribute(`class`, `chat_tabpane users_in_room clear`);
         this.users.html = usr;

         let chat = document.createElement(`div`);
         chat.setAttribute(`class`, `chat_message_window`);
         this.chat = chat;

         let inputDiv = document.createElement(`div`);
         inputDiv.setAttribute(`class`, `chat_controls`);

         let inputArea = document.createElement(`textarea`);
         inputArea.setAttribute(`class`, `chat_input`);
         inputArea.value = `Enter text for chat here`;
         this.input = inputArea;

         this.input.addEventListener(`focus`, function () {
         if (this.input.value === `Enter text for chat here`) {
         this.input.value = ``;
         this.input.style.removeProperty(`font-style`);
         }
         }.bind(this));
         this.input.addEventListener(`blur`, function () {
         if (this.input.value === ``) {
         this.input.value = `Enter text for chat here`;
         this.input.style.setProperty(`font-style`, `italic`);
         }
         }.bind(this));
         this.input.addEventListener(`keydown`, function (e) {
         //console.log(e.which, e.keyCode, e.charCode, e.key, e.shiftKey);
         switch (e.key) {
         case `Enter`:
         if (!e.shiftKey) {
         this.send();
         e.preventDefault();
         }
         break;
         }
         }.bind(this));
         this.input.addEventListener(`keyup`, function () {
         if (this.input.value !== `Enter text for chat here`) {
         let txt = /^(\/\w*\s?)?([\S\s]*)$/.exec(this.input.value);
         txt = txt[2] || ``;
         if (this.inputCnt) this.inputCnt.textContent = txt.length;
         }
         }.bind(this));

         let cnt = document.createElement(`span`);
         cnt.setAttribute(`class`, `chat_chars_remaining`);
         cnt.textContent = `0`;
         this.inputCnt = cnt;

         let cntCont = document.createElement(`span`);
         cntCont.setAttribute(`class`, `chat_char_countdown`);
         cntCont.appendChild(this.inputCnt);
         cntCont.appendChild(document.createTextNode(`/Inf`));

         inputDiv.appendChild(this.input);
         inputDiv.appendChild(cntCont);
         this.body.appendChild(this.users.html);
         this.body.appendChild(this.chat);
         this.body.appendChild(inputDiv);

         console.info(`[DRMng] {Alliance} Chat body created.`);
         }

         let sbs = document.getElementById(`alliance_chat_sbs`);
         sbs.style.setProperty(`display`, `none`);
         this.tab.style.setProperty(`display`, `none`);

         if (this.client && this.client.connected) {
         if (this.conf.sbs) sbs.style.removeProperty(`display`);
         else this.tab.style.removeProperty(`display`);
         }
         else setTimeout(this.setup.bind(this), 1);

         container.appendChild(this.body);

         this.scrollToBottom(true);

         console.info(`[DRMng] {Alliance} Chat body attached to DOM.`);
         }
         else setTimeout(this.initBody.bind(this), 100);
         },
         setup: function (channel, password) {
         if (!this.conf.enabled) return;
         if (typeof io === `function` && this.tab && this.chat &&
         DRMng.UM.user.qualified && !DRMng.Raids.bootstrap) {

         if (DRMng.Alliance.conf.sbs)
         document.getElementById(`alliance_chat_sbs`).style.removeProperty(`display`);
         else
         this.tab.style.removeProperty(`display`);

         const usr = DRMng.UM.user;
         const user = { usr: usr.name, ign: usr.IGN, gld: usr.guild };
         const ch = channel || this.conf.channel;
         const pass = password || this.conf.pass;

         if (!ch || !pass) {
         this.conf.enabled = false;
         DRMng.Config.saveLocal();
         return;
         }

         if (this.client && this.client.connected) this.client.disconnect();
         else this.client =
         io.connect(`wss://mutikt.ml:3000/${ch}`, {
         query: {
         user: DRMng.UM.user.name,
         token: DRMng.Util.crc32(pass)
         },
         secure: true,
         transports: [`websocket`]
         });

         this.client.on(`error`, function (d) {
         console.warn(`[DRMng] {Alliance} Chat client error:`, d);
         this.setButton();
         document.getElementById(`alliance_chat_sbs`).style.setProperty(`display`, `none`);
         this.tab.style.setProperty(`display`, `none`);
         //destroyChat();
         }.bind(this));

         this.client.on(`disconnect`, function () {
         console.warn(`[DRMng] {Alliance} Chat client disconnected!`);
         this.setButton();
         }.bind(this));

         this.client.on(`connect`, function () {
         //console.info('[DRMng] {Alliance} Socket connection established, joining...');
         // clear chat window
         this.clear();
         // login to server
         this.client.emit(`join`, user);
         console.info(`[DRMng] {Alliance} User login data [%s|%s|%s]`, user.usr, user.ign, user.gld);
         // save data if valid
         if (channel) this.conf.channel = channel;
         if (password) this.conf.pass = password;
         DRMng.Config.saveLocal();
         // set button in leave mode
         this.setButton(true);
         }.bind(this));

         this.client.on(`msg`, this.messageEvent.bind(this));
         this.client.on(`service`, this.serviceEvent.bind(this));
         }
         else {
         console.info(`[DRMng] {Alliance} Resources not ready, trying again in 1 sec...`);
         setTimeout(this.setup.bind(this, channel, password), 1000);
         }
         },
         clear: function () {
         let c = DRMng.Alliance.chat;
         while (c.firstChild) c.removeChild(c.firstChild);
         },
         send: function (msg) {
         msg = msg || this.input.value;
         if (msg && msg !== `Enter text for chat here`) {
         let pm = /^\/w\s(\w+?)\s([\S\s]+)$/.exec(msg);
         if (pm && pm[1] && pm[2]) this.client.emit(`msg`, { type: 1, user: pm[1], text: pm[2] });
         else holodeck.processChatCommand(msg, true) && this.client.emit(`msg`, { type: 0, text: msg });
         this.input.value = ``;
         }
         },
         /!**
         * Service event handler
         * @param {object} data
         * @param {string} data.act
         * @param {string} data.action
         * @param {object} data.users
         * @param {Array} data.raids
         * @param {object} data.data
         *!/
         serviceEvent: function (data) {
         let usr;
         // TODO: remove act when users move to new version
         if (data.act) data.action = data.act;
         switch (data.action) {
         case `loadData`:
         // load users
         for (let u in data.users) {
         if (data.users.hasOwnProperty(u)) {
         usr = data.users[u];
         this.users.add(new this.User(usr.usr, usr.ign, usr.gld, usr.sid), true);
         }
         }
         this.users.lock = true;
         this.users.update();
         this.users.lock = false;

         // load history
         this.messageLock = true;
         data.log.forEach(log => this.messageEvent(log, true));
         if (this.messageBuffer.length > 0) {
         let data;
         while ((data = this.messageBuffer.shift())) this.messageEvent(data, true);
         }
         this.messageLock = false;
         this.scrollToBottom(true);
         break;

         case `userJoin`:
         usr = data.user;
         setTimeout(this.users.add(new this.User(usr.usr, usr.ign, usr.gld, usr.sid)), 1);
         break;

         case `userLeave`:
         usr = data.user;
         setTimeout(this.users.del(usr.usr), 1);
         break;

         case `allianceRaids`:
         //console.info("[DRMng] {Alliance} Batch raids object:", data);
         for (let i = 0, l = data.raids.length; i < l; ++i) {
         data.raids[i].createtime = new Date(data.raids[i].createtime).getTime();
         //console.log("[DRMng] {Alliance} Batch raid:", data.raids[i]);
         DRMng.Raids.insert(data.raids[i]);
         }
         break;

         case `newRaid`:
         setTimeout(DRMng.Raids.insert.bind(DRMng.Raids, data.data), 1);
         break;

         case `fullUpdate`:
         setTimeout(DRMng.Raids.update.bind(DRMng.Raids, data.data, true), 1);
         break;

         case `partialUpdate`:
         setTimeout(DRMng.Raids.update.bind(DRMng.Raids, data.data, false), 1);
         break;

         case `nukedRaid`:
         setTimeout(DRMng.Raids.remove.bind(DRMng.Raids, data.data), 1);
         break;

         default:
         console.log(`[DRMng] {Alliance} SRV:`, data);
         }
         },
         sbsEvent: e => DRMng.UI.handleChatClick(e, true),
         getMessageHTML: function (d) {
         let p = new DRMng.Node(`p`);
         if (d) {
         if (d.mainCls) p.attr({ class: d.mainCls });

         // 1st row (header)
         let hdr = new DRMng.Node(`span`).attr({ class: `header` });

         // Time field
         new DRMng.Node(`span`)
         .attr({ class: `timestamp` })
         .style({ 'flex-grow': `1` })
         .txt(d.ts).attach(`to`, hdr);
         // Guild tag
         new DRMng.Node(`span`)
         .attr({ class: `sticker` })
         .txt(d.tag).attach(`to`, hdr);

         hdr.attach(`to`, p);

         // 2nd row
         hdr = new DRMng.Node(`span`).style({ display: `block` });

         // Username
         new DRMng.Node(`span`)
         .attr({ class: d.userCls, username: d.user, ign: d.ign })
         .txt((d.pfx || ``) + d.user).attach(`to`, hdr);
         // IGN
         new DRMng.Node(`span`)
         .attr({ class: d.ignCls })
         .txt(d.ign).attach(`to`, hdr);
         // Separator
         new DRMng.Node(`span`)
         .attr({ class: `separator` })
         .txt(`: `).attach(`to`, hdr);
         // Message
         new DRMng.Node(`span`)
         .attr({ class: `message hyphenate` })
         .html(d.msg).attach(`to`, hdr);

         hdr.attach(`to`, p);
         }
         return p.node;
         },
         serviceMessage: function (msg, ri) {
         if (msg) {
         const p = new DRMng.Node(`div`).attr({ class: `chat-message` });
         new DRMng.Node(`div`)
         .attr({ class: `service${ri ? ` raidinfo` : ``}` })
         .style(ri ? { 'background-image': `url(https://content.5thplanetgames.com/dotd_live/images/bosses/${ri}.jpg)` } : {})
         .data(msg).attach(`to`, p);
         if (this.chat.appendChild(p.node)) this.scrollToBottom(true);
         }
         },
         raidMessage: function (data, pc, uc, pfx) {
         let msg = /(^.*?)(https?...www.kongregate.com.+?action_type.raidhelp.+?)(\s[\s\S]*$|$)/.exec(data.txt);
         if (msg) {
         let r = DRMng.Util.getRaidFromUrl(msg[2], data.usr.usr);
         if (r) {
         let srv = DRMng.Config.local.server.toLowerCase(), g = this.getGuildTag(data.usr.gld),
         v = DRMng.Config.local.visited[srv].indexOf(r.id) > -1,
         d = DRMng.Config.local.dead[srv].hasOwnProperty(r.id),
         l, m = msg[1] + msg[3],
         i = DRMng.Config.local.raidData[r.boss], n = [], s = m ? `:` : ``,
         t = new Date(data.ts).format(`mmm d, HH:MM`), u = data.usr.usr,
         ign = data.usr.ign;

         pc.push(`raid`);
         pc.push([`n`, `h`, `l`, `nm`][r.diff - 1]);
         pc.push(r.id);
         d ? pc.push(`dead`) : v && pc.push(`visited`);

         n.push([`N`, `H`, `L`, `NM`][r.diff - 1]);
         n.push(i ? i.sName : r.boss.replace(/_/g, ` `).toUpperCase());

         l = `{id:'${r.id}',hash:'${r.hash}',boss:'${r.boss}',sid:'${r.sid}'}`;
         l = `return DRMng.Raids.joinOne(${l});`;

         let f = i ? DRMng.Util.getShortNumK(i.hp[r.diff - 1] * 1000 / i.maxPlayers) : ``;
         f = `${i && i.maxPlayers === 90000 ? `ER/WR` : `FS ${f}`}`;

         return `<p class="${pc.join(` `)}">
         <span class="header">
         <span class="sticker" style="line-height: 12px;margin-right: 3px;width: 26px;">${g}</span>
         <span class="timestamp" style="flex-grow: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-right: 3px;">${t}</span>
         <a href="${msg[2]}" onclick="${l}" style="font-size: 10px; text-transform: uppercase; flex-shrink: 0;">${n.join(` `)}</a>
         </span>
         <span style="display: flex">
         <span username="${u}" class="${uc.join(` `)}">${pfx}${u}</span>
         <span class="guildname truncate">${ign}</span>
         <span class="separator">${s}</span>
         <span class="extraid" style="flex-grow: 1; text-align: right; white-space: nowrap;">${f}</span>
         </span>
         <span class="message hyphenate">${m}</span>
         </p>`;
         }
         }
         return null;
         },
         messageLock: true,
         messageBuffer: [],
         messageEvent: function (data, history) {
         if (data.type === 4) this.serviceMessage(data.txt);
         else if (!this.messageLock || history) {
         let u = DRMng.UM.user,
         t = data.type,
         e = [`username`, `truncate`],
         f = data.usr.usr === u.name,
         h = [``, `From `, `To `, ``][t],
         g = [];

         e.push(`chat_message_window` + (c ? `_undecorated` : ``) + `_username`);
         h && g.push(`whisper`);
         (t === 1) && g.push(`received_whisper`);
         (t === 2) && g.push(`sent_whisper`);
         f && e.push(`is_self`);

         let content = this.raidMessage(data, g, e, h);
         if (!content) {
         let reg = /(https?\S+[^,\s])/g, l, link, start, end, msg = data.txt;

         while ((l = reg.exec(msg))) {
         if (/\.(jpe?g|a?png|gif)$/.test(l[1]))
         link = `<img src="${l[1]}" alt="${l[1]}" onclick="window.open(this.src)">`;
         else if (/(prntscr.com|prnt.sc)/.test(l[1])) {
         let id = `prntsc_${new Date().getTime()}`;
         link = `<img id="${id}" onclick="window.open(this.src)">`;
         setTimeout(DRMng.Gate.lightShot.bind(DRMng.Gate, l[1], id), 1);
         }
         else if ((link = /.+youtube.+watch.+?v=([^&]{11})/.exec(l[1])))
         link = `<iframe width="480" height="auto" src="https://www.youtube.com/embed/${link[1]}" frameborder="0"></iframe>`;
         else
         link = `<a href="${l[1]}" target="_blank">${l[1].replace(/^https?:\/\//, ``)}</a>`;
         start = msg.substr(0, reg.lastIndex - l[1].length);
         end = msg.slice(reg.lastIndex);
         msg = start + link + end;
         reg.lastIndex += link.length - l[1].length;
         }
         content = this.getMessageHTML({
         mainCls: g.join(` `),
         ts: new Date(data.ts).format(`mmm d, HH:MM`),
         pfx: h,
         user: data.usr.usr,
         userCls: e.join(` `),
         ign: data.usr.ign || ``,
         ignCls: data.usr.ign ? `guildname truncate` : ``,
         tag: this.getGuildTag(t === 2 ? u.guild : data.usr.gld) || `???`,
         msg: msg
         });
         }
         const msg = document.createElement(`div`);
         msg.setAttribute(`class`, `chat-message`);
         if (content instanceof HTMLElement) msg.appendChild(content);
         else msg.innerHTML = content;
         this.chat.appendChild(msg);
         if (this.active || this.conf.sbs) this.scrollToBottom(f);
         else this.setUnread();
         }
         else this.messageBuffer.push(data);
         },
         scrollToBottom: function (force = false) {
         const elHeight = this.chat.lastChild ? this.chat.lastChild.offsetHeight : 0;
         const chatHeight = this.chat.scrollHeight - this.chat.offsetHeight - this.chat.scrollTop;
         if (chatHeight <= elHeight || force) this.chat.scrollTop = this.chat.scrollHeight;
         },
         setButton: function (conn = false) {
         const b = document.getElementById(`DRMng_allianceJoin`);
         if (b) {
         if (conn) {
         b.setAttribute(`class`, `l`);
         b.textContent = `Leave`;
         }
         else {
         b.setAttribute(`class`, `n`);
         b.textContent = `Join`;
         }
         DRMng.UI.setChatWidth();
         }
         },
         action: function () {
         const a = DRMng.Alliance;
         if (a.conf.enabled) {
         a.conf.enabled = false;
         if (a.client.connected) a.client.disconnect();
         holodeck._chat_window.showActiveRoom();
         if (DRMng.Alliance.conf.sbs)
         document.getElementById(`alliance_chat_sbs`).style.setProperty(`display`, `none`);
         else
         this.tab.style.setProperty(`display`, `none`);
         }
         else {
         const ch = document.getElementById(`DRMng_allianceChnl`);
         const ps = document.getElementById(`DRMng_alliancePass`);
         if (!ch.getAttribute(`class`) && !ps.getAttribute(`class`)) {
         a.conf.enabled = true;
         setTimeout(a.setup.bind(a, ch.value, ps.value), 1);
         }
         }
         },
         init: function () {
         this.initConfig();
         setTimeout(this.initTab.bind(this), 1000);
         }
         },*/
        UI: {
            Groups: {},
            Group: function (alias, title, visible) {
                this.fields = [];
                this.html = null;
                this.cont = null;
                this.setup = function (alias, title, visible) {
                    if (alias && title) {
                        visible = visible || false;
                        let groupDiv = document.createElement(`div`);
                        groupDiv.setAttribute(`class`, visible ? `group flex` : `group flex hide`);
                        groupDiv.setAttribute(`group`, `option`);
                        let titleDiv = document.createElement(`div`);
                        titleDiv.setAttribute(`class`, `title`);
                        titleDiv.addEventListener(`click`, DRMng.UI.roll.bind(this, titleDiv));
                        titleDiv.innerHTML = `` + title;
                        let contentDiv = document.createElement(`div`);
                        groupDiv.appendChild(titleDiv);
                        groupDiv.appendChild(contentDiv);
                        this.cont = contentDiv;
                        this.html = groupDiv;
                        DRMng.UI.Groups[alias] = this;
                        document.getElementById(`DRMng_Options`).appendChild(this.html);
                    }
                    return this;
                };
                this.add = function (option) {
                    if (option && (option instanceof DRMng.UI.Option || option instanceof DRMng.UI.SidebarConfig)) {
                        this.fields.push(option);
                        if (this.cont) this.cont.appendChild(option.html);
                    }
                    return this;
                };
                return this.setup(alias, title, visible);
            },
            Option: function () {
                this.html = null;
                this.conf = null;
                this.cbFn = null;
                this.group = ``;
                this.field = ``;
                this.type = ``;
                let _title = ``, _desc = ``;
                this.setup = function (alias, title, type = `bool`, value) {
                    if (alias !== null) {
                        const defaults = {
                            bool: false,
                            number: 0,
                            object: {}
                        };
                        let name = alias.split(`_`);
                        this.group = name[0] || `other`;
                        this.field = name[1] || alias;
                        this.type = type;
                        _title = title || this.field;
                        if (type !== `action`) {
                            if (DRMng.Config.local[this.group] === undefined) DRMng.Config.local[this.group] = {};
                            this.conf = DRMng.Config.local[this.group];
                            if (this.conf[this.field] === undefined) this.conf[this.field] = value || defaults[type];
                        }
                    }
                    return this;
                };
                this.getConf = function () { return this.conf[this.field]; };
                this.flipConf = function () {
                    this.conf[this.field] = !this.conf[this.field];
                    DRMng.Config.saveLocal();
                };
                this.desc = function (desc) {
                    if (desc) _desc = desc;
                    return this;
                };
                this.event = function (callback) {
                    if (callback && typeof callback === `function`) this.cbFn = callback;
                    return this;
                };
                this.make = function (group, skipCb = false, name = `Apply`) {

                    let optionDiv = document.createElement(`div`);
                    optionDiv.setAttribute(`class`, `buttonStripe`);
                    optionDiv.setAttribute(`style`, `flex-wrap: wrap; overflow: hidden; max-height: 74px;`);

                    let titleField = document.createElement(`span`);
                    titleField.setAttribute(`style`, `background-color: #444; font-size: 9pt;`);
                    titleField.innerHTML = `` + _title;

                    let button = document.createElement(`button`);
                    if (this.type === `bool`) {
                        button.setAttribute(`class`, this.getConf() ? `n` : `l`);
                        button.textContent = this.getConf() ? `On` : `Off`;
                    }
                    else {
                        button.classList.add(`n`);
                        button.textContent = name;
                    }
                    button.setAttribute(`style`, `border-left-color: #3a3a3a;`);
                    button.addEventListener(`click`, function (e) {
                        if (this.type === `bool`) {
                            this.flipConf();
                            e.target.setAttribute(`class`, this.getConf() ? `n` : `l`);
                            e.target.innerHTML = this.getConf() ? `On` : `Off`;
                        }
                        if (typeof this.cbFn === `function`) this.cbFn.call(this, e);

                    }.bind(this));

                    optionDiv.appendChild(titleField);
                    optionDiv.appendChild(button);

                    if (typeof this.cbFn === `function` && !skipCb) this.cbFn.call(this, { target: button });

                    if (_desc) {
                        let descField = document.createElement(`div`);
                        descField.setAttribute(`style`, `border-top: 1px solid #404040; background-color:` +
                                                        ` #505050; padding: 3px 6px; border-left: 0; font-size: 10px; font-style:` +
                                                        ` italic; max-height: 45px; overflow: hidden; color: #fff; font-weight: 300;`);
                        descField.innerHTML = `` + _desc;
                        optionDiv.appendChild(descField);
                    }

                    this.html = optionDiv;

                    if (group && group instanceof DRMng.UI.Group) group.add(this);

                    return this;
                };
                this.makeSbButton = btn => {
                    btn = btn || { name: `X`, command: `` };
                    return new DRMng.Node(`div`)
                        .data(new DRMng.Node(`span`).txt(`\uf2f9`).on(`click`, e => {
                            const el = e.target.parentNode;
                            el.parentNode.insertBefore(el.nextSibling, el);
                        }))
                        .data(new DRMng.Node(`span`).txt(`\uf2fc`).on(`click`, e => {
                            const el = e.target.parentNode;
                            el.parentNode.insertBefore(el, el.previousSibling);
                        }))
                        .data(new DRMng.Node(`input`).attr({ type: `text`, value: btn.name, class: `inp_fld` }))
                        .data(new DRMng.Node(`input`).attr({ type: `text`, value: btn.command, class: `inp_cmd` }))
                        .data(new DRMng.Node(`span`).attr({ class: `red` }).txt(`\uf270`).on(`click`, e => {
                            const el = e.target.parentNode;
                            el.parentNode.removeChild(el);
                        }));
                };
                this.makeSbGroup = grp => {
                    grp = grp || { name: `Group` };
                    const el = new DRMng.Node(`div`)
                        .attr({ class: `drmng_config_sb` })
                        .data(new DRMng.Node(`div`)
                                  .data(new DRMng.Node(`span`).txt(`\uf2f9`).on(`click`, e => {
                                      const el = e.target.parentNode.parentNode;
                                      el.parentNode.insertBefore(el.nextSibling, el);
                                  }))
                                  .data(new DRMng.Node(`span`).txt(`\uf2fc`).on(`click`, e => {
                                      const el = e.target.parentNode.parentNode;
                                      el.parentNode.insertBefore(el, el.previousSibling);
                                  }))
                                  .data(
                                      new DRMng.Node(`input`).attr({ type: `text`, value: grp.name, class: `inp_grp` }))
                                  .data(new DRMng.Node(`span`).attr({ class: `del_grp red` }).txt(`\uf272`)
                                                              .on(`click`, e => {
                                                                  const el = e.target.parentNode.parentNode;
                                                                  el.parentNode.removeChild(el);
                                                              }))
                                  .data(new DRMng.Node(`span`).attr({ class: `add_grp` }).txt(`\uf277`)
                                                              .on(`click`, e => this.makeSbGroup().attach(`before`,
                                                                                                          e.target.parentNode.parentNode)))
                                  .data(new DRMng.Node(`span`).txt(`\uf275`)
                                                              .on(`click`, e => this.makeSbButton().attach(`to`,
                                                                                                           e.target.parentNode.parentNode)))
                        );
                    if (grp.buttons) grp.buttons.forEach(btn => el.data(this.makeSbButton(btn)));
                    else el.data(this.makeSbButton());
                    return el;
                };
                this.makeSb = function (group, data) {
                    /*const grp = new DRMng.Node(`div`)
                     .attr({class: `drmng_config_sb`})
                     .data(new DRMng.Node(`div`)
                     .data(new DRMng.Node(`span`).txt(`\uf2f9`))
                     .data(new DRMng.Node(`span`).txt(`\uf2fc`))
                     .data(new DRMng.Node(`input`).attr({type: `text`, value: data.name, class: `inp_grp`}))
                     .data(new DRMng.Node(`span`).attr({class: `del_grp red`}).txt(`\uf272`)
                     .on(`click`, () => this.html.parentNode.removeChild(this.html)))
                     .data(new DRMng.Node(`span`).txt(`\uf275`)
                     .on(`click`, () => this.makeSbButton({name: `X`, command: ``}).attach(`to`, this.html)))
                     );
                     data.buttons.forEach(btn => grp.data(this.makeSbButton(btn)));*/
                    this.html = this.makeSbGroup(data).node;
                    if (group && group instanceof DRMng.UI.Group) group.add(this);
                    //return this;
                };
            },
            SidebarConfig: class {
                constructor() {
                    this.html = null;
                    this.conf = DRMng.Config.local.sidebar.data;
                    if (this.conf === undefined) {
                        this.conf = {
                            groups: [
                                {
                                    name: `Info`, hidden: false,
                                    buttons: [
                                        { name: `Emall`, action: `chat`, command: `/raid elite mall` },
                                        { name: `Cecil`, action: `chat`, command: `/raid elite cecil` },
                                        { name: `Mang`, action: `chat`, command: `/raid elite mangler` }
                                    ]
                                },
                                {
                                    name: `Sheet`, hidden: true,
                                    buttons: [
                                        {
                                            name: `Proc`, action: `www`,
                                            command: `https://docs.google.com/spreadsheets/d/1YTbJ0wgJUygdmix6a8BzLThrHhDINX943aadjboOTj8`
                                        },
                                        {
                                            name: `Magic`, action: `www`,
                                            command: `https://docs.google.com/spreadsheets/d/1O0eVSnzlACP9XJDq0VN4kN51ESUusec3-gD4dKPHRNU`
                                        },
                                        {
                                            name: `TiersI`, action: `www`,
                                            command: `https://docs.google.com/spreadsheets/d/10a8qCq5zgyR-kAOq-kuKuttADfU16aVWxgTCf9Eu4b8`
                                        },
                                        {
                                            name: `TiersII`, action: `www`,
                                            command: `https://docs.google.com/spreadsheets/d/1Zgv90jaHZCSEvpYdG5BF42djCEcgPxjEdCwosQRTbIQ`
                                        },
                                        {
                                            name: `Keyki`, action: `www`,
                                            command: `https://docs.google.com/spreadsheets/d/1ownIOYtDgha_5RwmVM_RfHIwk16WeMZJry5wz9-YNTI`
                                        }
                                    ]
                                }
                            ],
                            buttons: [
                                { name: `Join`, action: `func`, command: `DRMng.Raids.joinAll` },
                                { name: `Kill`, action: `chat`, command: `/kill` },
                                { name: `Server`, action: `func`, command: `DRMng.Engine.changeServer` }
                            ]
                        };
                        DRMng.Config.local.sidebar.data = this.conf;
                        DRMng.Config.saveLocal();
                    }
                    setTimeout(DRMng.UI.setupSidebar.bind(DRMng.UI), 0);
                }

                make(group) {
                    this.conf.groups.forEach(grp => new DRMng.UI.Option().makeSb(group, grp));
                    new DRMng.UI.Option().makeSb(group, { name: `Buttons`, buttons: this.conf.buttons });
                }
            },
            addRaidField: function (r, idx) {
                const ifo = DRMng.Config.local.raidData[r.boss];
                // classes
                const cls = [`drm_` + r.boss + `_` + r.diff];
                cls.push([`n`, `h`, `l`, `nm`][r.diff - 1]);
                r.visited && cls.push(`visited`);
                r.isFull && cls.push(`full`);

                const hp = ifo && ifo.isEvent ? `\u221e` : `HP: ${(r.hp * 100).toPrecision(3).slice(0, 4)}%`;

                // main elem
                const div = new DRMng.Node(`div`)
                    .attr({ id: `DRMng_${r.id}`, class: cls.join(` `) })
                    .data(new DRMng.Node(`span`).txt(ifo ? ifo.sName : r.boss.replace(/_/g, ` `)))
                    .data(new DRMng.Node(`span`).txt(hp))
                    .on(`mouseenter`, DRMng.UI.infoEvent);

                const list = document.getElementById(`DRMng_RaidList`);
                if (idx === undefined) list.appendChild(div.node);
                else {
                    const chLen = list.childNodes.length;
                    if (idx === chLen) list.appendChild(div.node);
                    else list.insertBefore(div.node, list.childNodes[idx]);
                }
                if (list.scrollTop < 20) list.scrollTop = 0;
            },
            removeRaidField: function (id) {
                let r = document.getElementById(`DRMng_` + id);
                if (r) r.parentNode.removeChild(r);
            },
            clearRaidList: function () { document.getElementById(`DRMng_RaidList`).innerHTML = ``; },
            statusTimer: null,
            displayStatus: function (msg) {
                const status = document.getElementById(`DRMng_status`);
                if (!msg && (!this.statusTimer || this.statusTimer.timeLeft <= 0)) {
                    if (DRMng.Raids.joinLen > 0)
                        status.textContent = DRMng.Raids.count + ` raids, ` + DRMng.Raids.joinLen + ` selected`;
                    else status.textContent = DRMng.Raids.count + ` raids in list`;
                    this.statusTimer = null;
                }
                else if (msg) {
                    status.innerText = msg;
                    if (this.statusTimer) this.statusTimer.restart();
                    else this.statusTimer = new DRMng.Timer(DRMng.UI.displayStatus.bind(this), 4000);
                }
            },
            submitResponseTimeout: 0,
            submitResponse: function (mode, msg) {
                clearTimeout(this.submitResponseTimeout);
                let respDiv = document.getElementById(`DRMng_submitResponse`);
                msg = msg || `Unidentified event occurred`;
                switch (mode) {
                    case 0:
                        mode = ` error`;
                        break;
                    case 1:
                        mode = ` success`;
                        break;
                    default:
                        mode = ` regular`;
                        break;
                }
                if (respDiv) {
                    respDiv.innerHTML = msg;
                    respDiv.className += mode;
                }
                this.submitResponseTimeout = setTimeout(function () {
                    document.getElementById(`DRMng_submitResponse`).className = `textField`;
                }, 60000);
            },
            createCSS: function () {
                let content = `\
                @font-face {\
                    font-family: 'Material-Design';\
                    src: url('https://cdnjs.cloudflare.com/ajax/libs/material-design-iconic-font/2.2.0/fonts/Material-Design-Iconic-Font.woff2') format('woff2'), url('https://cdnjs.cloudflare.com/ajax/libs/material-design-iconic-font/2.2.0/fonts/Material-Design-Iconic-Font.woff') format('woff');\
                    font-weight: normal;\
                    font-style: normal;\
                  }\
            #DRMng_main {\
                height: 100%;\
                position: fixed;\
                top: 0;\
                right: 0;\
                border-left: 1px solid #222;\
                background-color: #3a3a3a;\
                font-family: 'Open Sans', sans-serif;\
                z-index: 10001;\
                overflow: hidden;\
                box-shadow: 0 0 10px -2px #000;\
                transition: width .3s, border .3s, box-shadow .3s;\
            }\
            #DRMng_main.hidden {\
                width: 0 !important;\
                border-left: 0;\
                box-shadow: none;
            }\
            #DRMng_header {\
                display: flex;\
                color: #fff;\
                height: 27px;\
                position: absolute;\
                top: 0;\
                right: 0;\
                z-index: 9999;\
                font-family: 'Open Sans', sans-serif;\
            }\
            #DRMng_header > div {\
                background-color: #333;
            }\
            #DRMng_onoff {\
                flex-grow: 0;\
                flex-shrink: 0;\
                font-family: 'Material-Design', sans-serif;\
                font-size: 21px;\
                padding: 6px 9px;\
                cursor: pointer;\
                margin-left: 1px;\
            }\
            #DRMng_onoff > div {\
                transition: transform .3s;\
            }\
            #DRMng_onoff.hidden > div {\
                transform: scale(-1,1);\
            }\
            #DRMng_server {\
                font-size: 12px;\
                font-weight: 600;\
                padding: 6px 15px;\
                cursor: default;\
                user-select: none\
            }\
            #DRMng_onoff:hover,\
            #DRMng_server:hover { background-color: #444; }\
            #DRMng_status {\
                margin-left: 1px;\
                flex-grow: 1;\
                font-size: 12px;\
                font-weight: 600;\
                padding: 6px 10px;\
            }\
            #DRMng_main.active #DRMng_status { text-align: center; }\
            #DRMng_wrapper { height: 100%; }\
            #DRMng_nav {\
                display: flex;\
                font-size: 9pt;\
            }\
            #DRMng_nav > div {\
                width: 60px;\
                flex-shrink: 1;\
                flex-grow: 1;\
                text-align: center;\
                background-color: #303030;\
                padding: 6px 8px 5px;\
                border: 1px solid #444;\
                border-left: 0;\
                border-top: 0;\
                border-color: #101010;\
                color: #d0d0d0;\
                cursor: pointer;\
                -webkit-user-select: none;\
                -moz-user-select: none;\
            }\
            #DRMng_nav > div:last-child {\
                border-right-width: 0;\
            }\
            #DRMng_nav > div:hover {\
                background-color: #353535;\
            }\
            #DRMng_nav > div.active {\
                text-transform: uppercase;\
                background-color: #404040;\
                border-bottom-color: #404040;\
                color: #e0e0e0;\
            }\
            #DRMng_spacer {\
                height: 3px;\
                border-bottom: 1px solid #101010;\
                background-color: #404040;\
            }\
            #DRMng_content {\
                display: flex;\
                background-color: #555;\
                height: calc(100% - 31px);\
            }\
            #DRMng_content > div {\
                height: 100%;\
                width: 0;\
                overflow-y: auto;\
                overflow-x: hidden;\
                flex-grow: 0;\
                transition: flex-grow .3s ease-in;\
                display: flex;\
                flex-direction: column;\
            }\
            #DRMng_content div.group {\
                margin: 0 6px 6px;\
                box-shadow: 0 0 10px -4px #000;\
                border: 1px solid #151515 !important;\
                background-color: #4a4a4a;\
                overflow: hidden;\
                flex-grow: 0;\
                flex-shrink: 0;\
                max-height: 110%;\
            }\
            #DRMng_content div.group.flex {\
                flex-shrink: 1;\
                display: flex;\
                flex-direction: column;\
            }\
            #DRMng_content div.group.hide {\
                max-height: 23px;\
                flex-shrink: 0;\
            }\
            #DRMng_content div.group.flexible {\
                flex-grow: 1;\
                overflow: auto;\
            }\
            #DRMng_content div.group:first-of-type {\
                margin-top: 6px\
            }\
            #DRMng_content div.group.flex > div:last-child {\
                overflow-y: auto;\
            }\
            #DRMng_content > div.active {\
                flex-grow: 1;\
            }\
            #DRMng_RaidList {\
                overflow-x: hidden;\
                overflow-y: auto;\
                height: 100px;\
                display: flex;\
                flex-direction: column;\
            }\
            #DRMng_RaidList > div {\
                width: 100%;\
                height: 23px;\
                box-sizing: border-box;\
                background-color: #404040;\
                border-width: 1px 0 1px 4px;\
                border-style: solid;\
                border-top-color: transparent;\
                border-bottom-color: #2c2c2c;\
                color: #ddd;\
                display: none;\
                flex-shrink: 0;\
                flex-grow: 0;\
                justify-content: space-between;\
                align-items: center;\
                white-space: nowrap;\
                cursor: pointer;\
            }\
            #DRMng_RaidList > div.nm {\
                border-left-color: #759;\
            }\
            #DRMng_RaidList > div.l {\
                border-left-color: #855;\
            }\
            #DRMng_RaidList > div.h {\
                border-left-color: #984;\
            }\
            #DRMng_RaidList > div.n {\
                border-left-color: #795;\
            }\
            #DRMng_RaidList > div.visited > span:first-child:before,\
            #DRMng_RaidList > div.full > span:first-child:before {\
                font: normal 15px 'Material-Design';\
                margin-right: 5px;\
                color: #ccc;\
                vertical-align: text-bottom;\
            }\
            #DRMng_RaidList > div.visited > span:first-child:before {\
                content: '\uf15c';\
            }\
            #DRMng_RaidList > div.full > span:first-child:before {\
                content: '\uf135';\
            }\
            #DRMng_RaidList > div.visited.full > span:first-child:before {\
                content: '\uf15c\xa0\xa0\uf135';\
            }\
            #DRMng_RaidList > div:hover {\
                color: #f0f0f0;\
                background: #333;\
            }\
            #DRMng_RaidList > div > span:first-child {\
                margin-left: 6px;\
                margin-right: 3px;\
                text-overflow: ellipsis;\
                overflow: hidden;\
            }\
            #DRMng_RaidList > div > span:last-child {\
                margin-right: 7px;\
            }\
            \
            #DRMng_main div.group > div.title {\
                border-bottom: 1px solid #222;\
                text-align: center;\
                color: #ccc;\
                font-weight: 600;\
                font-size: 10pt;\
                padding: 4px 0;\
                background-color: #333;\
                white-space: nowrap;\
                cursor: pointer;\
                height: 15px;\
            }\
            #DRMng_main div.group.hide > div.title {\
                background-color: #3a3a3a;\
            }\
            #DRMng_main div.group > div.title:hover {\
                background-color: #303030;\
            }\
            #DRMng_main div.textField {\
                display: none;\
                text-align: center;\
                padding: 4px 5px;\
                color: #ccc;\
            }\
            #DRMng_main div.textField.regular { background: #3c3c3c; display:block; }\
            #DRMng_main div.textField.success { background: #404a40; display:block; }\
            #DRMng_main div.textField.error { background: #504040; display:block; }\
            #DRMng_main div.buttonStripe,\
            #DRMng_main div.txtInputStripe {\
                display: flex;\
                border-bottom: 1px solid #303030;\
                cursor: pointer;\
            }\
            #DRMng_main div.buttonStripe:last-child,\
            #DRMng_main div.txtInputStripe:last-child {\
                border: 0;\
            }\
            #DRMng_main div.buttonStripe > *,\
            #DRMng_main div.txtInputStripe > * {\
                min-width: 24px;\
                flex-grow: 1;\
                border: 0;\
                border-left: 1px solid #303030;\
                background: #454545;\
                font-family: 'Open Sans', sans-serif;\
                font-size: 8pt;\
                color: #e0e0e0;\
                outline: none;\
                overflow: hidden;\
            }\
            #DRMng_main div.buttonStripe > span {\
                flex-grow: 2;\
                width: 50%;\
                color: #eee;\
                padding: 4px 5px 2px;\
                white-space: nowrap;\
                overflow: hidden;\
                text-overflow: ellipsis;\
                background: transparent;\
            }\
            #DRMng_main div.buttonStripe:hover { background-color: #404040 }\
            #DRMng_main div.txtInputStripe > input[type=text] { flex-grow: 2; }\
            #DRMng_main div.buttonStripe > input[type=text],\
            #DRMng_main div.buttonStripe > input[type=password] { flex-grow: 1; }\
            #DRMng_main div.buttonStripe > :first-child,\
            #DRMng_main div.txtInputStripe > :first-child { border-left: 0; }\
            #DRMng_main div.txtInputStripe > p {\
                padding: 4px 6px;\
                text-align: center;\
                word-break: break-all;\
                background: #4c4c4c;\
                min-height: 15px;\
                max-height: 90px;\
            }\
            #DRMng_main div > button {\
                height: 21px;\
                cursor: pointer;\
            }\
            #DRMng_main div > button:hover {\
                background: #404040;\
            }\
            #DRMng_main div > button.active {\
                background: #3a3a3a\
            }\
            #DRMng_main div > button.crimson {\
                background: #533\
            }\
            #DRMng_main div > button.double {\
                flex-grow: 2;\
            }\
            #DRMng_main div.buttonStripe > button.n { background-color: #405040; }\
            #DRMng_main div.buttonStripe > button.h { background-color: #555040; }\
            #DRMng_main div.buttonStripe > button.l { background-color: #504040; }\
            #DRMng_main div.buttonStripe > button.nm { background-color: #504055; }\
            #DRMng_main div.buttonStripe > button.off { background-color: #404040; }\
            #DRMng_main div.buttonStripe > button.n:hover { background-color: #463; }\
            #DRMng_main div.buttonStripe > button.h:hover { background-color: #763; }\
            #DRMng_main div.buttonStripe > button.l:hover { background-color: #743; }\
            #DRMng_main div.buttonStripe > button.nm:hover { background-color: #648; }\
            #DRMng_main div.buttonStripe > button.single:hover { background-color: #353; }\
            #DRMng_main div > input[type=text], #DRMng_main div > input[type=password] {\
                height: 19px;\
                padding: 1px 7px;\
                text-align: center;\
            }\
            #DRMng_main div > input[type=text]:hover, #DRMng_main div > input[type=password]:hover,\
            #DRMng_main div.txtInputStripe > p:hover { background: #404040; cursor: text }\
            #DRMng_main div > input[type=text]:focus, #DRMng_main div > input[type=password]:focus,\
            #DRMng_main div.txtInputStripe > p:focus { background: #3a3a3a; }\
            #DRMng_main div > input[type=text].default,\
            #DRMng_main div.txtInputStripe > p.default { font-style: italic; }\
            #DRMng_info {\
                width: 200px;\
                border: 1px solid #111;\
                background: #333;\
                position: fixed;\
                z-index: 10002;\
                box-shadow: -2px 0 6px -1px #1a1a1a;\
                transition: top .1s ease-out, bottom .1s ease-out;\
                font: 10px 'Open Sans', sans-serif;\
                color: #eee;\
                text-shadow: 0 0 3px #111;\
                padding: 3px 7px 4px;\
            }\
            #DRMng_info.nm { background: linear-gradient(186deg,#435,#333 40%); }\
            #DRMng_info.l { background: linear-gradient(186deg,#533,#333 40%); }\
            #DRMng_info.h { background: linear-gradient(186deg,#553,#333 40%); }\
            #DRMng_info.n { background: linear-gradient(186deg,#353,#333 40%); }\
            #DRMng_info > div:first-child { display: flex; }\
            #DRMng_info span.title {\
                font-size: 12px;\
                font-weight: 600;\
                flex-shrink:1;\
                white-space: nowrap;\
                text-overflow: ellipsis;\
                overflow: hidden;\
                margin-right: auto;\
                padding-right: 3px;\
            }\
            #DRMng_info div.magic {\
                background-image: url('https://cdn.jsdelivr.net/gh/mutik/drmng@latest/magic_sprite.png');\
                width: 16px;\
                height: 16px;\
                flex-shrink: 0;\
                flex-grow: 0;\
                margin-left: 2px;\
                background-color: rgba(0,0,0,.15);\
            }\
            #DRMng_info div.status {\
                border-top: 1px solid #555;\
                margin-top: 3px;\
                padding-top: 1px;\
            }\
            #DRMng_info label {\
                position: relative;\
                z-index: 1;\
                font-size: 7pt;\
                font-weight: 300;\
                color: #fff;\
            }\
            #DRMng_info progress {\
                border: 0;\
                height: 13px;\
                width: 100%;\
                position: relative;\
                margin-top: -13px;\
                display: block;\
                background: linear-gradient(to Bottom, #111, transparent 1px, transparent 3px, #262626 12px, #090909);\
            }\
            span.DRMng_info_picker:hover {\
                cursor: pointer;\
                text-decoration: underline;\
            }\
            #DRMng_info progress::-webkit-progress-bar {\
                background: linear-gradient(to Bottom, #111, transparent 1px, transparent 3px, #262626 12px, #090909);\
            }\
            #DRMng_info progress.hp::-webkit-progress-value {\
                background: linear-gradient(to Bottom, #b11, #522 1px, transparent 11px);\
            }\
            #DRMng_info progress.hp::-moz-progress-bar {\
                background: linear-gradient(to Bottom, #b11, #522 1px, transparent 11px);\
            }\
            #DRMng_info progress.time::-moz-progress-bar {\
                background: linear-gradient(to Bottom, #09f, #146 1px, transparent 11px);\
            }\
            #DRMng_info progress.time::-webkit-progress-value {\
                background: linear-gradient(to Bottom, #09f, #146 1px, transparent 11px);\
            }\
            #DRMng_Sidebar {\
                display: flex;\
                flex-direction: column;\
                width: 40px;\
                background: #4c4c4c;\
                border-left: 1px solid #000;\
            }\
            #DRMng_Sidebar.flex {\
                height: 690px;\
            }\
            #DRMng_Sidebar * {\
                font: 10px 'Open Sans', sans-serif;\
                -webkit-user-select: none;\
                -moz-user-select: none;\
                user-select: none;\
            }\
            #DRMng_Sidebar > div.label {\
                background: #303030;\
                flex-grow: 0;\
                flex-shrink: 0;\
                border-bottom: 1px solid #111;\
                color: #ddd;\
                padding: 7px 0 6px;\
                cursor: default;\
                text-transform: uppercase;\
            }\
            #DRMng_Sidebar.flex > div.label.hidden {\
                background: #333;\
                color: #aaa;\
                cursor: pointer;\
            }\
            #DRMng_Sidebar > div:first-child {\
                border-top: 1px solid #111;\
            }\
            #DRMng_Sidebar > div.group {\
                display: flex;\
                flex-direction: column;\
                border-bottom: 1px solid #111;\
            }\
            #DRMng_Sidebar.flex > div.group {\
                border: 0;\
                max-height: 700px;\
                transition: max-height .2s ease-out;\
            }\
            #DRMng_Sidebar.flex > div.label.hidden + div.group {\
                max-height: 0;\
                overflow: hidden;\
                border: 0;\
            }\
            #DRMng_Sidebar button {\
                height: 22px;\
                background: #444;\
                color: #ccc;\
                cursor: pointer;\
                border: 0;\
                outline: none;\
            }\
            #DRMng_Sidebar.flex > div > button {\
                height: 29px;\
            }\
            #DRMng_Sidebar > div > button {\
                flex-shrink: 1;\
                border-bottom: 1px solid #2c2c2c;\
            }\
            #DRMng_Sidebar > div > button:last-child {\
                border: 0;\
            }\
            #DRMng_Sidebar.flex > div > button:last-child {\
                border-bottom: 1px solid #111;\
            }\
            #DRMng_Sidebar > div > button:hover {\
                color: #ddd;\
                background: #363636;\
            }\
            #DRMng_Sidebar > button {\
                height: 25px;\
                background: #3a3a3a;\
                flex-grow: 0;\
                flex-shrink: 0;\
                border-bottom: 1px solid #111;\
            }\
            #DRMng_Sidebar > button:hover {\
                background: #2a2a2a;\
                color: #ddd;\
            }\
            #DRMng_Sidebar > button:first-of-type {\
                margin-top: auto;\
                border-top: 1px solid #111;\
            }\
            div#chat_room_tabs > div.drmng_room_tab:nth-last-child(2) {\
                border-right: 0;\
            }\
            #alliance_chat_sbs {\
                border: 1px solid #222;\
                display: flex;\
                align-items: flex-end;\
                margin-left: 7px;\
                box-shadow: 0 0 10px -4px #000;\
            }\
            #alliance_chat_sbs div.users_in_room { height: 145px; }\
            .drmng_scroll_wrapper {\
                overflow: hidden;\
                width: 100%;\
                height: 100%;\
                position: relative;\
                z-index: 1;\
                float: left;\
            }\
            .drmng_scroll_content {\
                height: 100%;\
                width: 100%;\
                padding: 0 32px 0 0;\
                position: relative;\
                right: -18px;\
                overflow: auto;\
                box-sizing: border-box;\
            }\
            .drmng_scroll_bar {\
                position: relative;\
                background: rgba(0, 0, 0, 0.1);\
                width: 9px;\
                border-radius: 4px;\
                top: 0;\
                z-index: 2;\
                cursor: pointer;\
                opacity: 0;\
                transition: opacity 0.25s linear;\
            }\
            .drmng_scroll_hidden {\
                display: none;\
            }\
            .drmng_scroll_container:hover .drmng_scroll_bar {\
                opacity: 1;\
            }\
            .drmng_scroll_grabbed {\
                -o-user-select: none;\
                -ms-user-select: none;\
                -moz-user-select: none;\
                -webkit-user-select: none;\
                user-select: none;\
            }\
            #DRMng_main div.drmng_config_sb {\
                margin: 7px;\
                border: 1px solid #303030;\
            }\
            #DRMng_main div.drmng_config_sb > div {\
                display: flex;\
                align-items: center;\
                padding: 0 3px;\
                background: #555;\
                border-bottom: 1px solid #444;\
            }\
            #DRMng_main div.drmng_config_sb > div:first-child {\
                background: #3a3a3a;\
                border-bottom: 1px solid #333;\
            }\
            #DRMng_main div.drmng_config_sb > div:last-child {\
                border: 0;\
            }\
            #DRMng_main div.drmng_config_sb span {\
                font-family: 'Material-Design';\
                font-size: 15px;\
                text-align: center;\
                padding: 0;\
                width: 14px;\
                color: #fff;\
                cursor: default;\
            }\
            #DRMng_main div.drmng_config_sb span.del_grp,\
            #DRMng_main div.drmng_config_sb span.add_grp {\
                margin: 0 5px;\
                color: #ddd;\
            }\
            #DRMng_main div.drmng_config_sb span:hover {\
                color: #4f7;\
            }\
            #DRMng_main div.drmng_config_sb span.red:hover {\
                color: #f42;\
            }\
            #DRMng_main div.drmng_config_sb span:last-child {\
                width: 20px;\
                text-align: right;\
            }\
            #DRMng_main div.drmng_config_sb:nth-child(4) > div:first-child > span:first-child,\
            #DRMng_main div.drmng_config_sb > div:nth-child(2) > span:first-child,\
            #DRMng_main div.drmng_config_sb:nth-last-child(2) > div:first-child > span:nth-child(2),\
            #DRMng_main div.drmng_config_sb > div:last-child > span:nth-child(2) {\
                padding-right: 14px;\
            }\
            #DRMng_main div.drmng_config_sb:nth-child(4) > div:first-child > span:nth-child(2),\
            #DRMng_main div.drmng_config_sb > div:nth-child(2) > span:nth-child(2),\
            #DRMng_main div.drmng_config_sb:nth-last-child(2) > div:first-child > span:first-child,\
            #DRMng_main div.drmng_config_sb > div:last-child > span:first-child,\
            #DRMng_main div.drmng_config_sb:last-child > div:first-child > span:first-child,\
            #DRMng_main div.drmng_config_sb:last-child > div:first-child > span:nth-child(2),\
            #DRMng_main div.drmng_config_sb:last-child > div:first-child > span.red {\
                display: none;\
            }\
            #DRMng_main div.drmng_config_sb input {\
                background: transparent;\
                border: 0;\
                font-size: 11px;\
                color: #fff;\
                font-family: 'Open Sans';\
                width: 45px;\
                outline: none;\
            }\
            #DRMng_main div.drmng_config_sb input:hover,\
            #DRMng_main div.drmng_config_sb input:focus {\
                background: #4a4a4a\
            }\
            #DRMng_main div.drmng_config_sb input.inp_grp {\
                padding: 1px;\
                width: 60px;\
                margin: 0 auto;\
            }\
            #DRMng_main div.drmng_config_sb input.inp_fld {\
                padding: 0;\
                margin-left: 3px;\
            }\
            #DRMng_main div.drmng_config_sb input.inp_cmd {
                padding: 0 0 0 5px;\
                flex-grow: 1;\
                flex-shrink: 1;\
                text-align: left;\
                border-left: 1px solid #444;\
            }\
            `;

                DRMng.Util.cssStyle(`DRMng_CSS`, content);

                // raid list filtering css
                DRMng.Util.cssStyle(`DRMng_RaidsCSS`, `dummy`);
                DRMng.Raids.processFilter(``, true);
            },
            setupFilterBox: () => {
                const srv = DRMng.Config.get(`server`).toLowerCase();
                const fst = DRMng.Config.get(`filterString::${srv}`);
                new DRMng.Node(`#DRMng_txtFilter`)
                    .attr({ class: fst ? `` : `default` }).txt(fst || `Filter raids here`, true);
            },
            setupFilterTab: raidData => {
                const srv = DRMng.Config.get(`server`).toLowerCase();
                const flt = DRMng.Config.get(`filterRaids::${srv}`);
                const raids = raidData || DRMng.Config.get(`raidData`);
                const fltDivs = [
                    document.getElementById(`DRMng_filterSmall`),
                    document.getElementById(`DRMng_filterMedium`),
                    document.getElementById(`DRMng_filterLarge`),
                    document.getElementById(`DRMng_filterEpic`),
                    document.getElementById(`DRMng_filterColossal`),
                    document.getElementById(`DRMng_filterGuild`),
                    document.getElementById(`DRMng_filterGigantic`)
                ];
                fltDivs.forEach(div => { if (div) while (div.firstChild) div.removeChild(div.firstChild); });

                Object.keys(raids).forEach(k => {
                    const r = raids[k];
                    if (!r.isEvent || r.isGuild) {
                        if (flt[k] === undefined) flt[k] = new Array(4).fill(false);
                        const el = new DRMng.Node(`div`)
                            .attr({ class: `buttonStripe`, id: `DRMng_filter_${k}` })
                            .data(new DRMng.Node(`span`).txt(r.fName))
                            .on(`click`, DRMng.UI.applyFilter)
                            .attach(`to`, fltDivs[r.isGuild ? 5 : r.size]);

                        new Array(4).fill(0).forEach((_, d) => new DRMng.Node(`button`)
                            .attr({ class: `${[`n`, `h`, `l`, `nm`][d]} ${flt[k][d] ? `off` : `on`}` })
                            .txt(flt[k][d] ? `Off` : `On`).attach(`to`, el));
                    }
                });
            },
            applyDiffFilter: function (id) {
                let mode = id && id.split(`_`);
                if (mode[0] === `DRMngFilter`) {
                    let diff = parseInt(mode[2]);
                    mode = parseInt(mode[1]);
                    if (diff > 0 && mode > 0) {
                        mode = !!(mode - 1);
                        diff = diff - 1;
                        let server = DRMng.Config.local.server.toLowerCase();
                        let flt = DRMng.Config.local.filterRaids[server];
                        let fk = Object.keys(flt);
                        for (let i = 0, len = fk.length; i < len; ++i) flt[fk[i]][diff] = mode;
                        DRMng.Config.saveLocal();
                        DRMng.UI.setupFilterTab();
                        document.getElementById(`DRMng_filterApply`).parentNode.removeAttribute(`style`);
                    }
                }
            },
            applyFilter: function (e) {
                let el = e.target;
                if (el.tagName !== `SPAN` && el.tagName !== `BUTTON`) el = el.children[0];
                let server = DRMng.Config.local.server.toLowerCase();
                let btns = el.parentNode.getElementsByTagName(`BUTTON`);
                let id = el.parentNode.id.substr(13);
                let spanHit = el.tagName === `SPAN`;
                let flt = DRMng.Config.local.filterRaids[server][id];
                let i, diff;

                if (spanHit) {
                    let flts = 0;
                    for (i = 0; i < 4; ++i) if (flt[i]) flts += 1 << i;
                    diff = (flts !== 15 && flts !== 0) ? flts : 15;
                }
                else diff = { n: 1, h: 2, l: 4, nm: 8 }[el.className.split(` `)[0]];

                for (i = 0; i < 4; ++i) if (diff & (1 << i)) {
                    flt[i] = !flt[i];
                    btns[i].innerText = flt[i] ? `Off` : `On`;
                    btns[i].className = btns[i].className.split(` `)[0] + ` ` + btns[i].innerText.toLowerCase();
                }

                document.getElementById(`DRMng_filterApply`).parentNode.removeAttribute(`style`);

                DRMng.Config.saveLocal();
            },
            sidebarLabelOpen: e => {
                document.querySelectorAll(`#DRMng_Sidebar > div.label:not(.hidden)`)
                        .forEach(lbl => lbl.className += ` hidden`);
                e.target.className = `label`;
            },
            setupSidebarButton: button => {
                if (!button || !button.name) return null;

                const btn = new DRMng.Node(`button`).txt(button.name);
                let fn, th;
                if (button.command) {
                    switch (button.action) {
                        case `func`:
                            fn = button.command.split(`,`);
                            th = fn[0].split(`.`).reduce((a, v, i, o) => (i < o.length - 1 ? a[v] : a), window);
                            btn.on(`click`, (fn[0].split(`.`).reduce((a, v) => a[v], window)).bind(th, ...fn.slice(1)));
                            break;
                        case `chat`:
                            btn.on(`click`, () =>
                                holodeck.processChatCommand(button.command, DRMng.PrivateChat.getActive(true)));
                            break;
                        case `www`:
                            btn.on(`click`, () => window.open(button.command));
                            break;
                    }
                }
                return btn.node;
            },
            setupSidebar: function () {
                let left = true;
                let sb = document.getElementById(`DRMng_Sidebar`);
                if (sb) new DRMng.Node(sb).clear();
                else sb = new DRMng.Node(`div`).attr({ id: `DRMng_Sidebar` }).node;
                const scData = DRMng.Config.local.sidebar.data;

                // sidebar buttons routine
                let div, button;
                for (let group of scData.groups) {
                    div = document.createElement(`div`);
                    div.className = `label`;
                    if (group.hidden) div.className += ` hidden`;
                    div.innerText = group.name;
                    sb.appendChild(div);
                    div = document.createElement(`div`);
                    div.className = `group`;
                    for (let btn of group.buttons) {
                        button = this.setupSidebarButton(btn);
                        if (button) div.appendChild(button);
                    }
                    sb.appendChild(div);
                }
                for (let btn of scData.buttons) {
                    button = this.setupSidebarButton(btn);
                    if (button) sb.appendChild(button);
                }

                let parent = document.querySelector(`#chat_container_cell`);
                if (left) parent.insertBefore(sb, parent.children[0]);
                else parent.appendChild(sb);
                let labels = document.querySelectorAll(`#DRMng_Sidebar > div.label`);
                let labLen = labels.length;
                for (let i = 0; i < labLen; ++i) labels[i].addEventListener(`click`, this.sidebarLabelOpen);
                let grpButtLen = document.querySelectorAll(`#DRMng_Sidebar > div > button`).length;
                let staButtLen = document.querySelectorAll(`#DRMng_Sidebar > button`).length;
                let sbLen = labLen * 26 + grpButtLen * 23 + staButtLen * 23;
                if (sbLen > 690) sb.className = `flex`;
            },
            setChatWidth: () => {
                const el = document.getElementById(`chat_container`);
                if (el) {
                    const a = DRMng.Config.get(`alliance::sbs`) && DRMng.Config.get(`alliance::enabled`);
                    const w = DRMng.Config.get(`kong::chatWidth`);
                    el.style.width = `${a ? (w * 2 + 7) : w}px`;
                }
            },
            loadDefaults: function () {
                let val;

                // Chat width
                this.setChatWidth();

                // Script width
                val = document.getElementById(`DRMng_main`);
                if (val) {
                    val.className = `hidden`;
                    val.style.width = `${DRMng.Config.get(`scriptWidth`)}px`;
                }

                // Filtering
                this.setupFilterBox();
                this.setupFilterTab();

                // Sorting
                document.querySelectorAll(`#DRMng_sortOrderBy > button`).forEach(el => {
                    if (el.textContent.toLowerCase() === DRMng.Config.get(`sortBy`)) el.className = `active`;
                });

                // Private Chats
                DRMng.Config.local.alliance.rooms.forEach(room => DRMng.PrivateChat.addOption(room));
            },
            loadOptions: function () {
                let group, opt;

                group = new this.Group(`kongui`, `Kongregate`, true);

                opt = new this.Option();
                opt.setup(`kongui_stickyHeader`, `Sticky header`, `bool`, true)
                   .desc(`Makes top header always visible on screen.`)
                   .event(function () {
                       if (this.conf[this.field]) {
                           new DRMng.Node(`#headerwrap`).detach().attach(`before`, `primarywrap`);
                           DRMng.CSS.del(this.field);
                           DRMng.CSS.del(this.field + `b`);
                       }
                       else {
                           new DRMng.Node(`#headerwrap`).detach().attach(`before`, `tr8n_language_selector_trigger`);
                           DRMng.CSS.add(this.field, `div#headerwrap`, `width: 100% !important`);
                           DRMng.CSS.add(this.field + `b`, `div#primarywrap`, `height: 100% !important`);
                       }
                   })
                   .make(group);

                opt = new this.Option();
                opt.setup(`kongui_hideToolbar`, `Hide game toolbar`, `bool`, false)
                   .desc(`Hides toolbar located above game window (cinematic mode, rating, etc).`)
                   .event(function () {
                       if (this.conf[this.field])
                           DRMng.CSS.add(this.field, `table.game_table > tbody > tr:first-child`, `display: none`);
                       else DRMng.CSS.del(this.field);
                   })
                   .make(group);

                opt = new this.Option();
                opt.setup(`kongui_hideFrame`, `Hide game frame`, `bool`, false)
                   .desc(`Hides 7px wide frame around game window.`)
                   .event(function () {
                       if (this.conf[this.field])
                           DRMng.CSS.add(this.field, `div#maingame`, `padding: 0`);
                       else DRMng.CSS.del(this.field);
                   })
                   .make(group);

                opt = new this.Option();
                opt.setup(`kongui_hideGameDetails`, `Hide game details`, `bool`, false)
                   .desc(`Hides game details part located just below game window.`)
                   .event(function () {
                       if (this.conf[this.field])
                           DRMng.CSS.add(this.field, `div.game_details_outer`, `display: none`);
                       else DRMng.CSS.del(this.field);
                   })
                   .make(group);

                opt = new this.Option();
                opt.setup(`kongui_hideForum`, `Hide forum area`, `bool`, true)
                   .desc(`Hides forum part located below game window.`)
                   .event(function () {
                       if (this.conf[this.field])
                           DRMng.CSS.add(this.field, `#below_fold_content div.game_page_wrap`, `display: none`);
                       else DRMng.CSS.del(this.field);
                   })
                   .make(group);

                /**
                 * RaidsManager UI
                 */
                group = new this.Group(`drmui`, `RaidsManager`);

                opt = new this.Option();
                opt.setup(`drmui_disableTransitions`, `Disable transitions`, `bool`, false)
                   .desc(`Disables animated transitions for various UI elements to improve performance on` +
                         ` low-end hardware.`)
                   .event(function () {
                       if (this.conf[this.field])
                           DRMng.CSS.add(this.field, `div#DRMng_main, div#DRMng_main *, div#DRMng_info,` +
                                                     ` div#DRMng_info *`, `transition: initial !important`);
                       else DRMng.CSS.del(this.field);
                   })
                   .make(group);

                opt = new this.Option();
                opt.setup(`drmui_hideSideBar`, `Hide sidebar`, `bool`, false)
                   .desc(`Hides sidebar which is located between game window and kongregate chat.`)
                   .event(function () {
                       if (this.conf[this.field])
                           DRMng.CSS.add(this.field, `div#DRMng_Sidebar`, `display: none`);
                       else DRMng.CSS.del(this.field);
                   })
                   .make(group);

                /**
                 * Alliance UI
                 */
                group = new this.Group(`alliance`, `Alliance`);

                opt = new this.Option();
                opt.setup(`alliance_sbs`, `Side by side`, `bool`, false)
                   .desc(`Makes alliance chat visible all the time along with regular kongregate chats` +
                         ` (doubles width taken by chat area).`)
                   .event(function () {
                       // make sure initial variable setting wont fire this
                       if (DRMng.Alliance.tab) {
                           const a = DRMng.Alliance;
                           if (this.conf[this.field]) a.body.style.removeProperty(`display`);
                           else a.tab.className = `chat_room_tab`;
                           DRMng.UI.setChatWidth();
                           a.active = false;
                           holodeck._chat_window.showActiveRoom();
                           a.initBody.call(a);
                       }
                   })
                   .make(group, true);

                /**
                 * Game frame UI
                 */
                group = new this.Group(`gameFrame`, `Game`);

                opt = new this.Option();
                opt.setup(`gameFrame_removeWChat`, `Disable World Chat`, `bool`, false)
                   .desc(`Disables World Chat located next to game window.`)
                   .event(function () {
                       DRMng.postGameMessage(`chatSettings`, DRMng.Config.local.gameFrame);
                       DRMng.Kong.hideWorldChat();
                   })
                   .make(group, true);

                opt = new this.Option();
                opt.setup(`gameFrame_leftWChat`, `World Chat on left side`, `bool`, false)
                   .desc(`Moves World Chat to the left side of game window.`)
                   .event(DRMng.postGameMessage.bind(this, `chatSettings`, DRMng.Config.local.gameFrame))
                   .make(group, true);

                opt = new this.Option();
                opt.setup(`gameFrame_hideWChat`, `Hide World Chat`, `bool`, false)
                   .desc(`Hides World Chat (without disabling it completely).`)
                   .event(function () {
                       DRMng.postGameMessage(`chatSettings`, DRMng.Config.local.gameFrame);
                       DRMng.Kong.hideWorldChat();
                   })
                   .make(group, true);

                group = new this.Group(`sidebar`, `Sidebar`);

                new this.Option()
                    .setup(`sidebar_apply`, `Apply changes`, `action`)
                    .desc(`Applies sidebar layout changes as defined below.`)
                    .event(function () {
                        const sb = document.getElementsByClassName(`drmng_config_sb`);
                        const dat = { groups: [], buttons: [] };
                        for (let i = 0; i < sb.length; ++i) {
                            const inp = Array.from(sb[i].querySelectorAll(`input`));
                            const grp = { name: inp.shift().value, hidden: i > 0, buttons: [] };
                            while (inp.length) {
                                const btn = { name: inp.shift().value, command: inp.shift().value, action: `func` };
                                if (btn.command.indexOf(`/`) === 0) btn.action = `chat`;
                                else if (btn.command.indexOf(`http`) === 0) btn.action = `www`;
                                if (i < sb.length - 1) grp.buttons.push(btn);
                                else dat.buttons.push(btn);
                            }
                            if (i < sb.length - 1) dat.groups.push(grp);
                        }
                        DRMng.Config.local.sidebar.data = dat;
                        DRMng.Config.saveLocal();
                        DRMng.UI.setupSidebar();
                    })
                    .make(group, true);

                new this.Option()
                    .setup(`sidebar_export`, `Export configuration`, `action`)
                    .desc(`Exports sidebar configuration to JSON file.`)
                    .event(() => {
                        const a = document.createElement(`a`);
                        a.setAttribute(`href`, `data:text,${JSON.stringify(DRMng.Config.local.sidebar.data)}`);
                        a.setAttribute(`download`, `sidebar_config.json`);
                        a.dispatchEvent(new MouseEvent(`click`));
                    })
                    .make(group, true, `Export`);

                new this.Option()
                    .setup(`sidebar_import`, `Import configuration`, `action`)
                    .desc(`Imports sidebar configuration from JSON file.`)
                    .event(() => {
                        const a = document.createElement(`input`);
                        a.setAttribute(`type`, `file`);
                        a.setAttribute(`accept`, `.json`);
                        a.addEventListener(`change`, e => {
                            if (e.target.files instanceof FileList && e.target.files.length > 0) {
                                const reader = new FileReader();
                                reader.addEventListener(`load`, e => {
                                    const res = `${e.target.result}`;
                                    let data = null;
                                    try { data = JSON.parse(res); }
                                    catch (e) { DRMng.log(`error`, `{Sidebar::Import} Wrong data format ::`, res); }
                                    if (data && data.groups && data.buttons) {
                                        DRMng.Config.local.sidebar.data = data;
                                        DRMng.Config.saveLocal();
                                        DRMng.log(`debug`, `{Sidebar::Import} Data ::`, data);
                                        // clear old fields
                                        group.fields = group.fields.filter(fld => {
                                            if (fld.html.className === `drmng_config_sb`) {
                                                fld.html.parentNode.removeChild(fld.html);
                                                return false;
                                            }
                                            return true;
                                        });
                                        // recreate sidebar ui and config fields
                                        new DRMng.UI.SidebarConfig().make(group);
                                    }
                                });
                                reader.readAsText(e.target.files[0]);
                            }
                        });
                        a.dispatchEvent(new MouseEvent(`click`));
                    })
                    .make(group, true, `Import`);
                new this.SidebarConfig().make(group);

                DRMng.Kong.hideWorldChat();

                // Save all changes made to config file due to introducing new options
                DRMng.Config.saveLocal();
            },
            raidInfo: function (boss) {
                let txt = ``;
                if (boss) {
                    let r = DRMng.Config.local.raidData[boss];
                    if (r) {
                        txt += `<div class="name">` + r.fName + `</div>`;
                        let race = r.race.join(`, `);
                        if (race) txt += `<div class="race">(` + race + `)</div>`;
                        let t = DRMng.Config.local.tiersData, rt;
                        const Diff = [0, 1, 2, 3];

                        txt += `<table class="raidinfo"><tr><td></td><td>N</td><td>H</td><td>L</td><td>NM</td></tr>`;
                        txt += Diff.reduce((acc, d) => acc + `<td>` +
                               (r.hp[d] ? DRMng.Util.getShortNumK(r.hp[d] * 1000, 4) : `&mdash;`) + `</td>`,
                                           `<tr><td>HP</td>`) + `</tr>`;
                        txt += Diff.reduce((acc, d) => acc + `<td>` +
                               (r.hp[d] ? DRMng.Util.getShortNumK(r.hp[d] * 1000 / r.maxPlayers, 4) : `&mdash;`) +
                               `</td>`, `<tr><td>FS</td>`) + `</tr>`;
                        txt += `<tr><td>AP</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td>` + `<td>` +
                               (r.hp[3] ? DRMng.Util.getShortNumK(r.hp[3] * 1000 / r.maxPlayers / 2, 4) : `&mdash;`) +
                               `</td></tr>`;
                        if (t.nonTiered && t.nonTiered.raids.indexOf(boss) !== -1) {
                            rt = t.nonTiered.ratio[r.size][3];
                            txt += `<tr><td>OS</td>` +
                                   `<td>` + (r.hp[0] ? DRMng.Util.getShortNumK(r.hp[0] * rt * 1000 / r.maxPlayers, 4) :
                                             `&mdash;`) + `</td>` +
                                   `<td>` + (r.hp[1] ? DRMng.Util.getShortNumK(r.hp[1] * rt * 1000 / r.maxPlayers, 4) :
                                             `&mdash;`) + `</td>` +
                                   `<td>` + (r.hp[2] ? DRMng.Util.getShortNumK(r.hp[2] * rt * 1000 / r.maxPlayers, 4) :
                                             `&mdash;`) + `</td>` +
                                   `<td>` + (r.hp[3] ? DRMng.Util.getShortNumK(r.hp[3] * rt * 1000 / r.maxPlayers, 4) :
                                             `&mdash;`) + `</td></tr>`;
                            rt = t.nonTiered.ratio[r.size][6];
                            txt += `<tr><td>MS</td>` +
                                   `<td>` + (r.hp[0] ? DRMng.Util.getShortNumK(r.hp[0] * rt * 1000 / r.maxPlayers, 4) :
                                             `&mdash;`) + `</td>` +
                                   `<td>` + (r.hp[1] ? DRMng.Util.getShortNumK(r.hp[1] * rt * 1000 / r.maxPlayers, 4) :
                                             `&mdash;`) + `</td>` +
                                   `<td>` + (r.hp[2] ? DRMng.Util.getShortNumK(r.hp[2] * rt * 1000 / r.maxPlayers, 4) :
                                             `&mdash;`) + `</td>` +
                                   `<td>` + (r.hp[3] ? DRMng.Util.getShortNumK(r.hp[3] * rt * 1000 / r.maxPlayers, 4) :
                                             `&mdash;`) + `</td></tr>`;
                        }
                        txt += `</table>`;

                        if (t.tiers && t.tiers[boss]) {
                            t = t.tiers[boss];
                            rt = t.ratio[3];
                            txt += `<table class="raidinfo"><tr><td></td><td>Tier</td><td>Stats</td><td>dmg/SP</td><td>dmg/E</td></tr>`;
                            // Stats OS
                            if (t.spOS >= 0) txt += `<tr><td>Stats OS</td><td>` +
                                                    DRMng.Util.getShortNumK(t.tiers[t.spOS] * rt * 1000, 4) + `</td>` +
                                                    `<td>` + DRMng.Util.getShortNum(t.sp[t.spOS]) + `</td>` +
                                                    `<td>` + (t.tiers[t.spOS] * rt / t.sp[t.spOS]).toPrecision(4) +
                                                    `</td>` +
                                                    `<td>` + (t.hasCURE && t.e ?
                                                              (t.tiers[t.spOS] * rt / t.e[t.spOS]).toPrecision(4) :
                                                              `&mdash;`) + `</td>`;
                            // Epics OS
                            if (t.eOS >= 0) txt += `<tr><td>Epics OS</td><td>` +
                                                   DRMng.Util.getShortNumK(t.tiers[t.eOS] * rt * 1000, 4) + `</td>` +
                                                   `<td>` + DRMng.Util.getShortNum(t.sp[t.eOS]) + `</td>` +
                                                   `<td>` + (t.tiers[t.eOS] * rt / t.sp[t.eOS]).toPrecision(4) +
                                                   `</td>` +
                                                   `<td>` + (t.hasCURE && t.e ?
                                                             (t.tiers[t.eOS] * rt / t.e[t.eOS]).toPrecision(4) :
                                                             `&mdash;`) + `</td>`;
                            // Max Tier
                            let idx = t.tiers.length - 1;
                            txt += `<tr><td>Max Tier</td><td>` + DRMng.Util.getShortNumK(t.tiers[idx] * rt * 1000, 4) +
                                   `</td>` +
                                   `<td>` + DRMng.Util.getShortNum(t.sp[idx]) + `</td>` +
                                   `<td>` + (t.tiers[idx] * rt / t.sp[idx]).toPrecision(4) + `</td>` +
                                   `<td>` +
                                   (t.hasCURE && t.e ? (t.tiers[idx] * rt / t.e[idx]).toPrecision(4) : `&mdash;`) +
                                   `</td>`;
                            txt += `</table>`;
                        }
                    }
                }
                return txt;
            },
            hideUITimeout: 0,
            fillInfoTimeout: 0,
            fillInfo: id => {
                // Get info div and clear its content
                const ifo = document.getElementById(`DRMng_info`);
                while (ifo.firstChild) ifo.removeChild(ifo.firstChild);

                const rd = DRMng.Raids.get(id);
                const ri = DRMng.Config.local.raidData[rd.boss];
                const hpMax = ri ? ri.hp[rd.diff - 1] * 1000 : Infinity;
                const data = {
                    nam: rd.boss.replace(/_/g, ` `), mag: ``, rac: ``, sta: `Healthy`, ptm: 1.0, hpi: `?`, tmi: `?`
                };

                if (ri) {
                    // Name
                    data.nam = ri.fName;
                    // Magic
                    data.mag = JSON.parse(rd.magic).reduce(
                        (a, v) => `${a}<div class="magic" style="background-position: 0 -${v * 16}px"></div>`, ``);
                    //data.mag = new Array(ri.numMagics).fill(0).reduce((a,_,i) =>
                    //    `${a}<div class="magic" style="background-position: 0 -${rd[`m`+(i+1)]*16}px"></div>`,``);
                    // Race
                    if (ri.race.length > 0)
                        data.rac = `Race: ` + ri.race.map(v => v.replace(/ /g, `&nbsp;`)).join(`, `);
                    // Timer
                    if (!ri.isEvent) {
                        data.ptm = 1.0 - ((new Date().getTime() - rd.createtime) / (3600000 * ri.timer));
                        if (data.ptm + 0.05 < rd.hp) data.sta = `Behind timer`;
                        if (data.ptm + 0.2 < rd.hp) data.sta = `Failing`;
                    }
                }

                // Status
                data.sta += rd.isFull ? `, Full (${rd.participants})` :
                            `, ${rd.participants}${ri ? ` / ${ri.maxPlayers}` : ``}`;
                data.sta += rd.visited ? `, Visited` : ``;

                // Health text
                data.hpi = `health ${DRMng.Util.getShortNumK(hpMax * rd.hp, 3)} / ` +
                           `${DRMng.Util.getShortNumK(hpMax, 3)} (${Math.ceil(rd.hp * 100)}%)`;

                // Time text
                data.tmi = `timer ${ri ? `${Math.round(data.ptm * ri.timer)}h / ${ri.timer}h ` : ``}` +
                           `(${Math.ceil(data.ptm * 100)}%)`;

                // Generate info field
                ifo.className = [``, `n`, `h`, `l`, `nm`][rd.diff];
                ifo.innerHTML = `<div><span class="title">${data.nam}</span>${data.mag}</div><div>${data.rac}</div>` +
                                `<div class="status">Status: ${data.sta}</div>` +
                                `<div style="text-align: center; margin-top: 1px;"><label for="DRMng_progHP">${data.hpi}</label>` +
                                `<progress class="hp" id="DRMng_progHP" value="${rd.hp}"></progress></div>` +
                                `<div style="text-align: center; margin-top: 2px"><label for="DRMng_progTime">${data.tmi}</label>` +
                                `<progress class="time" id="DRMng_progTime" value="${data.ptm}"></progress></div>`;
            },
            infoEvent: function (e) {
                clearTimeout(DRMng.UI.fillInfoTimeout);
                if (DRMng.hResize.clicked) return;

                const rdl = document.getElementById(`DRMng_RaidList`).getBoundingClientRect();
                const wnd = document.documentElement.clientHeight;
                const id = e.target.id.split(`_`)[1];
                const d = e.target.getBoundingClientRect();
                const ifo = document.getElementById(`DRMng_info`);
                ifo.style.display = `block`;
                ifo.style.left = d.left - ifo.offsetWidth + `px`;

                if (d.top + ifo.offsetHeight > rdl.top + rdl.height / 2) {
                    ifo.style.top = ``;
                    ifo.style.bottom = Math.max(wnd - d.bottom, 0) + `px`;
                }
                else {
                    ifo.style.top = d.top - 1 + `px`;
                    ifo.style.bottom = ``;
                }
                DRMng.UI.fillInfoTimeout = setTimeout(DRMng.UI.fillInfo, 30, id);
            },
            handleChatClick: (e, sbs) => {
                const usr = e.target.getAttribute(`username`);
                if (usr) {
                    const a = DRMng.PrivateChat.getActive();
                    e.stopPropagation();
                    e.preventDefault();
                    DRMng.log(`info`, `{${a ? `Private::${a.conf.channel}` : `Kong`}::PM} User <${usr}>`);
                    if (a || sbs) {
                        a.input.focus();
                        a.input.dispatchEvent(new Event(`focus`));
                        a.input.value = `/w ${usr} `;
                    }
                    else holodeck._active_dialogue.setInput(`/w ${usr} `);
                }
                else if (e.target.className.indexOf(`DRMng_info_picker`) > -1) {
                    e = e.target;
                    const raid = e.className.split(` `)[1];
                    if (!raid) return false;
                    const data = DRMng.Config.get(`raidData::${raid}`);
                    if (!data) return false;

                    e = e.parentNode;
                    e.style.backgroundImage = `url(https://content.5thplanetgames.com/dotd_live/images/bosses/${data ?
                                                                                                                data.banner :
                                                                                                                ``}.jpg)`;
                    e.classList.add(`raidinfo`);
                    e.innerHTML = DRMng.UI.raidInfo(raid);
                    setTimeout(() => e.parentNode.parentNode.scrollTop = 500000, 10); //131072
                }
                return false;
            },
            addListenerToChat: () => {
                const el = document.getElementById(`chat_rooms_container`);
                if (el) el.addEventListener(`click`, DRMng.UI.handleChatClick, true);
                else setTimeout(DRMng.UI.addListenerToChat, 250);
            },
            attachListeners: function () {
                // Chat global listener
                setTimeout(DRMng.UI.addListenerToChat, 1000);

                // Message listeners
                document.addEventListener(`DRMng.joinRaid`, DRMng.Raids.joinResponse, false);
                document.addEventListener(`DRMng.joinRaids`, DRMng.Raids.joinMultiResponse, false);
                document.addEventListener(`DRMng.lightShot`, DRMng.Gate.lightShotCb, false);

                // Script Hide automation
                /*new DRMng.Node(`#DRMng_main`)
                 .on(`mouseleave`, () =>
                 DRMng.UI.hideUITimeout = setTimeout(() => {
                 new DRMng.Node(`#DRMng_main`).attr({class: `hidden`});
                 new DRMng.Node(`#DRMng_onoff`).attr({class: `hidden`});
                 DRMng.Kong.setWrapperWidth();
                 }, 2500))
                 .on(`mouseenter`, () => clearTimeout(DRMng.UI.hideUITimeout));*/

                // menu buttons
                document.querySelectorAll(`#DRMng_nav > div`).forEach(mnuItem => {
                    mnuItem.addEventListener(`click`, e => {
                        document.getElementById(`DRMng_main`).className = `active`;
                        const contItems = document.getElementById(`DRMng_content`).children;
                        document.querySelectorAll(`#DRMng_nav > div`).forEach((item, i) => {
                            item.className = ``;
                            contItems[i].className = ``;
                        });
                        document.getElementById(`DRMng_${e.target.innerHTML}`).className = `active`;
                        e.target.className = `active`;
                    });
                });

                // Sorting
                new DRMng.Node(`#DRMng_sortOrderBy`).on(`click`, e => {
                    const el = e.target;
                    if (el.className.indexOf(`active`) === -1) {
                        const act = el.parentNode.getElementsByClassName(`active`);
                        if (act.length > 0) act[0].className = ``;
                        el.className = `active`;
                        DRMng.Raids.setComp(el.innerHTML.toLowerCase());
                    }
                });

                // RaidList joining
                new DRMng.Node(`#DRMng_RaidList`).on(`click`, e => {
                    let el = e.target;
                    if (el.nodeName !== `DIV`) el = el.parentNode;
                    if (el.id === `DRMng_RaidList`) return;
                    DRMng.Raids.joinOne(el.id.split(`_`)[1]);
                });

                // Info box hiding
                new DRMng.Node(`#DRMng_RaidList`).on(`mouseleave`, () =>
                    document.getElementById(`DRMng_info`).style.display = `none`);

                // raids filtering field
                new DRMng.Node(`#DRMng_txtFilter`)
                    .on(`focus`, e => {
                        if (e.target.textContent === `Filter raids here`) {
                            e.target.textContent = ``;
                            e.target.className = ``;
                        }
                    })
                    .on(`blur`, e => {
                        if (e.target.textContent === ``) {
                            e.target.textContent = `Filter raids here`;
                            e.target.className = `default`;
                        }
                    })
                    .on(`keyup`, e => {
                        if (window.filterTOut) clearTimeout(window.filterTOut);
                        const data = e.target.textContent.replace(/[\n\r\t]/g, ``).trim();
                        window.filterTOut = setTimeout(DRMng.Raids.processFilter.bind(DRMng.Raids, data), 500);
                    });

                // Apply filter button
                new DRMng.Node(`#DRMng_filterApply`).on(`click`, e => {
                    e.target.parentNode.style.display = `none`;
                    DRMng.Engine.reconnect();
                });

                // filter groups rollovers
                [
                    document.getElementById(`DRMng_filterSmall`),
                    document.getElementById(`DRMng_filterMedium`),
                    document.getElementById(`DRMng_filterLarge`),
                    document.getElementById(`DRMng_filterEpic`),
                    document.getElementById(`DRMng_filterColossal`),
                    document.getElementById(`DRMng_filterGuild`),
                    document.getElementById(`DRMng_filterGigantic`)
                ].forEach(div => {
                    if (div) {
                        div.parentNode.addEventListener(`transitionend`, e => {
                            if (e.target.className.indexOf(`hide`) !== -1)
                                e.target.children[1].style.display = `none`;
                        }, false);
                    }
                });

                // delayed submission
                new DRMng.Node(`#DRMng_submitRaidLink`)
                    .on(`focus`, e => {
                        if (e.target.innerHTML === `Paste raid link here`) {
                            e.target.innerHTML = ``;
                            e.target.className = ``;
                        }
                    })
                    .on(`blur`, e => {
                        if (e.target.innerHTML === ``) {
                            e.target.innerHTML = `Paste raid link here`;
                            e.target.className = `default`;
                        }
                    });

                document.querySelectorAll(`[group=DRMng_submitDelay]`).forEach(flt => {
                    flt.addEventListener(`click`, e => {
                        document.querySelectorAll(`[group=DRMng_submitDelay]`).forEach(item => item.className = ``);
                        e.target.className = `crimson`;
                    });
                });

                // alliance chat
                new DRMng.Node(`#DRMng_allianceChnl`)
                    .on(`focus`, e => {
                        if (e.target.getAttribute(`class`) === `default`) {
                            e.target.removeAttribute(`class`);
                            e.target.value = ``;
                        }
                    })
                    .on(`blur`, e => {
                        if (e.target.value === ``) {
                            e.target.setAttribute(`class`, `default`);
                            e.target.value = `Channel`;
                        }
                    });

                new DRMng.Node(`#DRMng_alliancePass`)
                    .on(`focus`, e => {
                        if (e.target.getAttribute(`class`) === `default`) {
                            e.target.removeAttribute(`class`);
                            e.target.setAttribute(`type`, `password`);
                            e.target.value = ``;
                        }
                    })
                    .on(`blur`, e => {
                        if (e.target.value === ``) {
                            e.target.setAttribute(`class`, `default`);
                            e.target.setAttribute(`type`, `text`);
                            e.target.value = `Password`;
                        }
                    });

                new DRMng.Node(`#DRMng_allianceName`)
                    .on(`focus`, e => {
                        if (e.target.getAttribute(`class`) === `default`) {
                            e.target.removeAttribute(`class`);
                            e.target.value = ``;
                        }
                    })
                    .on(`blur`, e => {
                        if (e.target.value === ``) {
                            e.target.setAttribute(`class`, `default`);
                            e.target.value = `Name`;
                        }
                    });

                new DRMng.Node(`#DRMng_allianceColor`)
                    .on(`focus`, e => {
                        if (e.target.getAttribute(`class`) === `default`) {
                            e.target.removeAttribute(`class`);
                            e.target.value = ``;
                        }
                    })
                    .on(`blur`, e => {
                        if (e.target.value === ``) {
                            e.target.setAttribute(`class`, `default`);
                            e.target.value = `Color`;
                        }
                    });

                // resize listeners
                DRMng.hResize.regPanes.push(`chat_container`);
                DRMng.hResize.regSide.push(0);
                document.getElementById(`chat_container`)
                        .addEventListener(`mousedown`, DRMng.hResize.onMouseDown.bind(DRMng.hResize));
                DRMng.hResize.regPanes.push(`DRMng_main`);
                DRMng.hResize.regSide.push(1);
                document.getElementById(`DRMng_main`)
                        .addEventListener(`mousedown`, DRMng.hResize.onMouseDown.bind(DRMng.hResize));
            },
            roll: function (elem) {
                const gr = elem ? elem.parentNode : null;
                if (gr) {
                    const group = gr.getAttribute(`group`);
                    if (group) {
                        gr.parentNode.childNodes.forEach(d => {
                            if (d.tagName === undefined) return;
                            if (d !== `gr` && d.getAttribute(`group`) === group) {
                                if (d.className.indexOf(`hide`) === -1) d.className += ` hide`;
                                d.children[1].style.display = `none`;
                            }
                        });
                    }
                    if (gr.className.indexOf(`group`) === 0) {
                        if (gr.className.indexOf(`hide`) > -1) {
                            gr.children[1].removeAttribute(`style`);
                            gr.className = gr.className.replace(` hide`, ``);
                        }
                        else {
                            gr.className += ` hide`;
                            gr.children[1].style.display = `none`;
                        }
                    }
                }
            },
            init: function () {
                // create stylesheet
                this.createCSS();

                // script html code
                new DRMng.Node(`div`).attr({ id: `DRMng_main` }).html(`\
                    <div id="DRMng_wrapper">\
                        <div id="DRMng_nav">\
                            <div class="active">Raids</div><div>Filters</div><div>Tools</div><div>Options</div>\
                        </div>\
                        <div id="DRMng_spacer"></div>\
                        <div id="DRMng_content">\
                            <div class="active" id="DRMng_Raids">\
                                <div class="group">\
                                    <div class="title">Searching & Joining</div>\
                                    <div class="txtInputStripe">\
                                        <p contenteditable="true" spellcheck="false" class="default" id="DRMng_txtFilter">Filter raids here</p>\
                                    </div>\
                                    <div class="buttonStripe">\
                                        <button onclick="DRMng.Raids.joinAll()">Join</button>\
                                        <button id="DRMng_autoJoin" onclick="DRMng.Raids.switchAutoJoin()">Auto Join</button>\
                                    </div>\
                                </div>\
                                <div class="group">\
                                    <div class="title">Sorting</div>\
                                    <div id="DRMng_sortAscDesc" class="buttonStripe">\
                                        <button class="active">Ascending</button>\
                                        <button>Descending</button>\
                                    </div>\
                                    <div id="DRMng_sortOrderBy" class="buttonStripe">\
                                        <button>ID</button>\
                                        <button>Name</button>\
                                        <button>Health</button>\
                                        <button>Time</button>\
                                    </div>\
                                </div>\
                                <div class="group flexible" id="DRMng_RaidList"></div>\
                            </div>\
                            <div class="" id="DRMng_Filters">\
                                <div class="group">\
                                    <div class="title">Options</div>\
                                    <div class="buttonStripe" style="display: none">\
                                        <button class="single" id="DRMng_filterApply">Apply selected filters now</button>\
                                    </div>\
                                    <div class="buttonStripe">\
                                        <span>Turn off difficulty</span>\
                                        <button id="DRMngFilter_2_1" onclick="DRMng.UI.applyDiffFilter(this.id)">N</button>\
                                        <button id="DRMngFilter_2_2" onclick="DRMng.UI.applyDiffFilter(this.id)">H</button>\
                                        <button id="DRMngFilter_2_3" onclick="DRMng.UI.applyDiffFilter(this.id)">L</button>\
                                        <button id="DRMngFilter_2_4" onclick="DRMng.UI.applyDiffFilter(this.id)">NM</button>\
                                    </div>\
                                    <div class="buttonStripe">\
                                        <span>Turn on difficulty</span>\
                                        <button id="DRMngFilter_1_1" onclick="DRMng.UI.applyDiffFilter(this.id)">N</button>\
                                        <button id="DRMngFilter_1_2" onclick="DRMng.UI.applyDiffFilter(this.id)">H</button>\
                                        <button id="DRMngFilter_1_3" onclick="DRMng.UI.applyDiffFilter(this.id)">L</button>\
                                        <button id="DRMngFilter_1_4" onclick="DRMng.UI.applyDiffFilter(this.id)">NM</button>\
                                    </div>\
                                </div>\
                                <div class="group flex hide" group="filter">\
                                    <div class="title" onclick="DRMng.UI.roll(this);">Small Raids</div>\
                                    <div id="DRMng_filterSmall" style="display: none;"></div>\
                                </div>\
                                <div class="group flex hide" group="filter">\
                                    <div class="title" onclick="DRMng.UI.roll(this);">Medium Raids</div>\
                                    <div id="DRMng_filterMedium" style="display: none;"></div>\
                                </div>\
                                <div class="group flex hide" group="filter">\
                                    <div class="title" onclick="DRMng.UI.roll(this);">Large Raids</div>\
                                    <div id="DRMng_filterLarge" style="display: none;"></div>\
                                </div>\
                                <div class="group flex hide" group="filter">\
                                    <div class="title" onclick="DRMng.UI.roll(this);">Epic Raids</div>\
                                    <div id="DRMng_filterEpic" style="display: none;"></div>\
                                </div>\
                                <div class="group flex hide" group="filter">\
                                    <div class="title" onclick="DRMng.UI.roll(this);">Colossal Raids</div>\
                                    <div id="DRMng_filterColossal" style="display: none;"></div>\
                                </div>\
                                <div class="group flex hide" group="filter">\
                                    <div class="title" onclick="DRMng.UI.roll(this);">Gigantic Raids</div>\
                                    <div id="DRMng_filterGigantic" style="display: none;"></div>\
                                </div>\
                                <div class="group flex hide" group="filter">\
                                    <div class="title" onclick="DRMng.UI.roll(this);">Guild Raids</div>\
                                    <div id="DRMng_filterGuild" style="display: none;"></div>\
                                </div>\
                            </div>\
                            <div class="" id="DRMng_Tools">\
                                <div class="group">\
                                    <div class="title">Delayed submission</div>\
                                    <div class="txtInputStripe">\
                                        <p contenteditable="true" spellcheck="false" class="default" id="DRMng_submitRaidLink">Paste raid link here</p>\
                                    </div>\
                                    <div class="buttonStripe">\
                                        <input type="text" size="1" spellcheck="false" id="DRMng_submitDelay" value="1">\
                                        <button group="DRMng_submitDelay">min</button>\
                                        <button group="DRMng_submitDelay" class="crimson">hr</button>\
                                        <button group="DRMng_submitDelay">day</button>\
                                        <button class="double" onclick="DRMng.Raids.checkAndSend()">Submit</button>\
                                    </div>\
                                    <div id="DRMng_submitResponse" class="textField"></div>\
                                </div>\
                                <div class="group" id="DRMng_privateChat">\
                                    <div class="title">Private chat</div>\
                                    <div class="buttonStripe">\
                                        <input type="text" spellcheck="false" class="default" size="1"\
                                            id="DRMng_allianceChnl" value="Channel">\
                                        <input type="text" spellcheck="false" class="default" size="1"\
                                            id="DRMng_alliancePass" value="Password">\                    
                                    </div>\
                                    <div class="buttonStripe">\
                                        <input type="text" spellcheck="false" class="default" size="1"\
                                            id="DRMng_allianceName" value="Name">\
                                        <input type="text" spellcheck="false" class="default" size="1"\
                                            id="DRMng_allianceColor" value="Color">\
                                    </div>\
                                    <div class="buttonStripe">
                                        <button onclick="DRMng.PrivateChat.add()"
                                            id="DRMng_allianceAdd" class="n">Add</button>
                                    </div>\
                                </div>\
                            </div>\
                            <div class="" id="DRMng_Options"></div>\
                        </div>\
                    </div>`)
                                     .attach(`to`, document.body);

                // Info dialog
                new DRMng.Node(`div`).attr({ id: `DRMng_info` }).attach(`to`, document.body);

                // Status bar
                new DRMng.Node(`#headerwrap`)
                    .data(new DRMng.Node(`div`).attr({ id: `DRMng_header` })
                                               .data(new DRMng.Node(`div`).attr({ id: `DRMng_server` })
                                                                          .txt(DRMng.Config.local.server)
                                                                          .on(`click`, DRMng.Engine.changeServer))
                                               .data(new DRMng.Node(`div`).attr({ id: `DRMng_status` })
                                                                          .txt(`DRMng Loading...`))
                                               .data(new DRMng.Node(`div`).attr({ id: `DRMng_onoff`, class: `hidden` })
                                                                          .data(new DRMng.Node(`div`).txt(`\uf1cc`))
                                                                          .on(`click`, () => {
                                                                              clearTimeout(DRMng.UI.hideUITimeout);
                                                                              const el = document.getElementById(
                                                                                  `DRMng_main`);
                                                                              if (el.className === `hidden`) {
                                                                                  el.removeAttribute(`class`);
                                                                                  new DRMng.Node(`#DRMng_onoff`).remove(
                                                                                      `class`);
                                                                                  DRMng.Kong.setWrapperWidth(
                                                                                      DRMng.Config.get(`scriptWidth`));
                                                                              }
                                                                              else {
                                                                                  el.className = `hidden`;
                                                                                  new DRMng.Node(`#DRMng_onoff`).attr(
                                                                                      { class: `hidden` });
                                                                                  DRMng.Kong.setWrapperWidth();
                                                                              }
                                                                          })));

                // load default values
                this.loadDefaults();

                // attach listeners to created elements
                this.attachListeners();

                // load options
                this.loadOptions();
            }
        },
        /**
         * Timer class
         */
        Timer: class {
            /**
             * Creates a timer
             * @param {function(...args)} callback Function to invoke after timer completes
             * @param {number} delay Timer duration
             */
            constructor(callback, delay) {
                this.started = null;
                this.remaining = delay;
                this.running = false;
                this.delay = delay;
                this.start();
                this.cb = callback;
            }

            start() {
                this.running = true;
                this.started = new Date();
                this.id = setTimeout(this.cb, this.remaining);
            }

            restart() {
                this.pause();
                this.remaining = this.delay;
                this.start();
            }

            pause() {
                this.running = false;
                clearTimeout(this.id);
                this.remaining -= new Date() - this.started;
            }

            get timeLeft() {
                if (this.running) {
                    this.pause();
                    this.start();
                }
                return this.remaining;
            }

            get state() {
                return this.running;
            }
        },
        postMessage: function (data) {
            document.dispatchEvent(
                new MessageEvent(`DRMng.xhrReq`, {
                    origin: `${document.location.protocol}//${document.location.hostname}`,
                    lastEventId: 0,
                    source: window,
                    data: JSON.stringify(data)
                })
            );
        },
        postGameMessage: function (type, data = ``) {
            const game = document.getElementById(`gameiframe`);
            if (game) {
                type = `DRMng.${type}`;
                data = typeof data === `string` ? data : JSON.stringify(data);
                type = data ? type + `#` + data : type;
                game.contentWindow.postMessage(type, `https://dotd-web1.5thplanetgames.com`);
            }
        },
        init: function () {

            // load localStorage
            this.Config.loadLocal();

            // init kong features
            this.Kong.init();

            // get user data
            this.UM.getUserData();

            // load UI
            this.UI.init();

            // resizer
            this.hResize.init();

            // raids init
            this.Raids.init();

            // connect to Server
            this.Engine.init();

            // silently init alliance chat
            // and connect if proper credentials are present
            // this.Alliance.init();
            this.PrivateChat.createAll();
        }
    };

    DRMng.log(`Main class created. Initializing components`);

    // include socket.io engine
    new DRMng.Node(`script`)
        .attr({
                  type: `text/javascript`,
                  async: ``,
                  src: `https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.1.1/socket.io.js`
              })
        .attach(`to`, document.head);

    DRMng.init();

    setTimeout(() => {
        const s = document.getElementById(`DRMng_TempScriptField`);
        s.parentNode.removeChild(s);
    }, 10000);
}

function load() {
    window.DRMng = {
        config: {
            version: {
                game: `0`,
                chat: `0`
            },
            user: {
                name: ``,
                id: ``,
                auth: ``,
                version: ``
            },
            removeWChat: false,
            leftWChat: false,
            hideWChat: false
        },
        loadCount: 0,
        counter: 0,
        load: () => {
            const data = JSON.parse(localStorage[`DRMng`] || `{}`);
            Object.keys(data).forEach(key => DRMng.config[key] = data[key]);
            DRMng.save();
        },
        save: () => {
            localStorage[`DRMng`] = JSON.stringify(DRMng.config);
        },
        getParamObject: () => {
            const u = DRMng.config.user;
            const vars = {
                kongregate_username: u.name,
                kongregate_user_id: u.id,
                kongregate_game_auth_token: u.auth,
                kongregate_game_id: 138636,
                kongregate_host: `https://www.kongregate.com`,
                kongregate_game_url: `https://www.kongregate.com/games/5thPlanetGames/dawn-of-the-dragons`,
                kongregate_api_host: `https://api.kongregate.com`,
                kongregate_channel_id: `b1388511-e7e4-4c62-92fa-e6852fea27aa`,
                kongregate_api_path: `https://chat.kongregate.com/flash/API_AS3_c1822959535ef5eff514ac20899abf96.swf`,
                kongregate_ansible_path: `https://chat.kongregate.com/flash/ansible_68b66936d53ca6dd18a685bfcb55b2cf.swf`,
                kongregate_preview: false,
                kongregate_game_version: u.version,
                kongregate_language: `en`,
                kongregate_split_treatments: `dawn-of-the-dragons-skin%2Ccontrol`,
                kongregate: true,
                kongregate_svid: `7cc0eaba-d07e-4e85-8d7c-09a4f2f5fcfa`,
                kongregate_js_api: true,
                kongregate_flash_postmessage: true,
                user_id: `kong_${u.name}`,
                server_xml_url: `https://web1.dawnofthedragons.com/kong/`,
                content_url: `https://content.5thplanetgames.com/dotd_live/`,
                xml_content_url: `https://content.5thplanetgames.com/dotd_live/xml/`,
                app_id: 138636,
                page_url: `https://www.kongregate.com/games/5thPlanetGames/dawn-of-the-dragons`,
                auth_url: `https://web1.dawnofthedragons.com/kong/lib/authenticate.php`,
                action_type: ``,
                raid_id: ``,
                hash: ``,
                queueid: ``,
                charter_id: ``,
                trk: ``,
                retrk: ``,
                fbuid: ``
            };
            return {
                wmode: `transparent`,
                allowscriptaccess: `always`,
                flashvars: Object.keys(vars).reduce((a, v) => `${a}&${v}=${encodeURIComponent(vars[v])}`, ``)
            };
        },
        createSwf: function (data, id, width, height) {
            const swf = document.getElementById(id);
            if (swf) swf.setAttribute(`data`, data);
            else {
                const div = document.createElement(`div`);
                const obj = document.createElement(`object`);
                const param = this.getParamObject();
                div.style.position = `absolute`;
                div.style.top = `0`;
                div.style.left = `0`;
                if (id === `swfdiv` && this.config.leftWChat) div.style.left = `265px`;
                if (id === `chatdiv` && !this.config.leftWChat) div.style.left = `760px`;
                obj.setAttribute(`type`, `application/x-shockwave-flash`);
                obj.setAttribute(`id`, id);
                obj.setAttribute(`width`, width);
                obj.setAttribute(`height`, height);
                Object.keys(param).forEach(key => {
                    const p = document.createElement(`param`);
                    p.setAttribute(`name`, key);
                    p.setAttribute(`value`, param[key]);
                    obj.appendChild(p);
                });
                obj.setAttribute(`data`, data);
                div.appendChild(obj);
                document.body.appendChild(div);
                obj.style.visibility = `visible`;
            }
        },
        applyChatSettings: function () {
            const swfDiv = document.getElementById(`swfdiv`);
            const chatDiv = document.getElementById(`chatdiv`);
            if (this.config.removeWChat) {
                if (swfDiv) swfDiv.parentNode.style.left = `0`;
                if (chatDiv) {
                    const remDiv = chatDiv.parentNode;
                    remDiv.parentNode.removeChild(remDiv);
                }
            }
            else if (this.config.leftWChat && !this.config.hideWChat) {
                if (chatDiv) chatDiv.parentNode.style.left = `0`;
                else {
                    setTimeout(this.reloadChat.bind(this), 0);
                    return;
                }
                if (swfDiv) swfDiv.parentNode.style.left = `265px`;
            }
            else {
                if (chatDiv) chatDiv.parentNode.style.left = `760px`;
                else {
                    setTimeout(this.reloadChat.bind(this), 0);
                    return;
                }
                if (swfDiv) swfDiv.parentNode.style.left = `0`;
            }
        },
        reloadChat: function () {
            if (this.config.version.chat)
                this.createSwf(
                    `https://content.5thplanetgames.com/dotd_live/chat/` + this.config.version.chat + `/chatclient.swf`,
                    `chatdiv`, `265`, `690`
                );
            setTimeout(this.applyChatSettings.bind(this), 100);
        },
        reloadGame: function () {
            if (this.config.version.game)
                this.createSwf(
                    `https://content.5thplanetgames.com/dotd_live/swf/` + this.config.version.game + `/dotd.swf`,
                    `swfdiv`, `760`, `690`
                );
        },
        init: function () {
            const swfDiv = document.getElementById(`swfdiv`);
            const chatDiv = document.getElementById(`chatdiv`);
            this.load();
            if (swfDiv && chatDiv && swfDiv.data && chatDiv.data) {
                this.config.version.game = /^.+\/([\da-z]+?)\/.+$/.exec(swfDiv.data)[1];
                this.config.version.chat = /^.+\/([\da-z]+?)\/.+$/.exec(chatDiv.data)[1];
                //if (this.config.version.game === `13525`) this.config.version.game = `13524`;
                if (kongregateAPI) {
                    const data = kongregateAPI._flashVarsObject;
                    this.config.user.name = data.kongregate_username;
                    this.config.user.id = data.kongregate_user_id;
                    this.config.user.auth = data.kongregate_game_auth_token;
                    this.config.user.version = data.kongregate_game_version;
                }
                console.log(`%c[DRMng] {GameFrame} Loaded <game:%s> <chat:%s> <user:%s> <id:%s>`,
                            `color: #108030`, this.config.version.game, this.config.version.chat,
                            this.config.user.name, this.config.user.id
                );
                this.save();
                this.applyChatSettings();
            }
            else if (this.counter++ < 5) setTimeout(this.init.bind(this), 200);
            else {
                this.reloadGame();
                this.reloadChat();
                console.warn(`[DRMng] Game is probably in maintenance mode, generated missing data to fire up chat`);
            }
        }
    };

    window.addEventListener(`message`, e => {
        if (!e.data || typeof e.data !== `string`) return;
        const c = e.data.split(`#`);
        if (c.length > 0 && c[0].indexOf(`DRMng.`) === 0) {
            switch (c[0].slice(6)) {
                case `chatSettings`:
                    if (c[1]) {
                        const data = JSON.parse(c[1] || `{}`);
                        DRMng.config.removeWChat = data.removeWChat || false;
                        DRMng.config.hideWChat = data.hideWChat || false;
                        DRMng.config.leftWChat = data.leftWChat || false;
                        DRMng.save();
                        DRMng.applyChatSettings();
                    }
                    break;
                case `chatReload`:
                    DRMng.reloadChat();
                    break;
                case `gameReload`:
                    DRMng.reloadGame();
                    break;
                case `killGame`:
                    document.getElementById(`swfdiv`).data = ``;
                    break;
                case `killChat`:
                    document.getElementById(`chatdiv`).data = ``;
            }
        }
    }, false);

    DRMng.init();
}

if (window.location.host === `www.kongregate.com`) {
    if (window.top === window.self) {
        document.addEventListener(`DRMng.xhrReq`, param => {
            const p = JSON.parse(param.data);
            p.callback = function (e, r) {
                delete this.onload;
                delete this.onerror;
                delete this.ontimeout;
                this.event = e;
                this.status = r.status;
                this.responseText = r.responseText;
                document.dispatchEvent(new MessageEvent(this.eventName, {
                    origin: `${document.location.protocol}//${document.location.hostname}`,
                    lastEventId: 1,
                    source: unsafeWindow,
                    data: JSON.stringify(this)
                }));
            };
            p.onload = p.callback.bind(p, `load`);
            p.onerror = p.callback.bind(p, `error`);
            p.ontimeout = p.callback.bind(p, `timeout`);
            setTimeout(GM_xmlhttpRequest, 1, p);
        });

        console.log(`%c[DotD Raids Manager] Bootstrap`, `color: #108030`);

        const scr = document.createElement(`script`);
        scr.id = `DRMng_TempScriptField`;
        scr.appendChild(document.createTextNode(`(${main})()`));
        document.head.appendChild(scr);
    }
}
else if (window.location.host === `dotd-web1.5thplanetgames.com`) {
    const scr = document.createElement(`script`);
    scr.appendChild(document.createTextNode(`(${load})()`));
    document.head.appendChild(scr);
}
