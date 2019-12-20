// ==UserScript==
// @name            DotD Raids Manager Next Gen
// @namespace       tag://kongregate
// @description     Makes managing raids a lot easier
// @author          Mutik
// @version         2.3.0
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
 * @typedef {object} raidObject
 * @property {string} id Raid id
 * @property {number} diff Raid difficulty [1-4]
 * @property {string} boss Raid boss name
 * @property {string} hash Raid hash
 * @property {number} sid Server ID [1-2]
 * @property {number} pid Platform ID [0-1]
 * @property {string} poster User name who posted raid link
 * @property {number} createtime Creation timestamp
 */

/**
 * @typedef {object} Holodeck
 * @property {object} Holodeck._chat_window
 * @property {object} Holodeck._chat_window._rooms_by_type
 * @property {function(*)} Holodeck.scheduleRender
 */

/**
 * @typedef {Holodeck} holodeck
 */

/**
 * @typedef {object} active_user
 * @property {function():string} active_user.username
 * @property {function():string} active_user.id
 * @property {function():string} active_user.gameAuthToken
 */

function main() {
  /**
   * Custom logger class
   * @type {Log}
   */
  class Log {
    /**
     * Format log message with DRMng specific badge and colors
     * @param {?string} color Custom message color or null for default
     * @param {Array} args Input arguments array
     * @returns {Array} Modified arguments array
     */
    static drmngify(color, args) {
      const drmngBadge = color ? '%c[DRMng]' : '[DRMng]';
      if ((typeof args[0] === 'string') && /%[csd]/.test(args[0])) {
        args[0] = `${drmngBadge} ${args[0]}`;
        if (color) args.splice(1, 0, `color:${color}`);
      } else {
        if (color) {
          const temp = [drmngBadge];
          while (typeof args[0] === 'string') {
            temp.push(args.shift());
          }
          args.unshift(temp.join(' '), `color:${color}`);
        } else {
          args.unshift(drmngBadge);
        }
      }
      return args;
    }

    /**
     * Log to console regular message
     * @param {...*} args
     */
    static out(...args) {
      console.log.apply(console, this.drmngify(null, args));
    }

    /**
     * Log to console debug message
     * @param {...*} args
     */
    static debug(...args) {
      console.debug.apply(console, this.drmngify('purple', args));
    }

    /**
     * Log to console inform message
     * @param {...*} args
     */
    static info(...args) {
      console.info.apply(console, this.drmngify('#1070f0', args));
    }

    /**
     * Log to console warning message
     * @param {...*} args
     */
    static warn(...args) {
      console.warn.apply(console, this.drmngify(null, args));
    }

    /**
     * Log to console error message
     * @param {...*} args
     */
    static error(...args) {
      console.error.apply(console, this.drmngify(null, args));
    }
  }

  window.Log = Log;

  /**
   * Enumeration member
   * @typedef {Symbol} EnumSymbol
   */

  /**
   * Enumeration class
   * @type {Enum}
   * @property {EnumSymbol} unknown
   */
  class Enum {
    /**
     * Constructs enumeration
     * @param {...string} keys Enumeration keys
     */
    constructor(...keys) {
      keys.push('unknown');
      keys.forEach(key => this[key] = Symbol(key));
      Object.freeze(this);
    }

    /**
     * Converts provided key into enum member (returns unknown symbol if key not found)
     * @param {string} key String key to convert
     * @returns {EnumSymbol}
     */
    fromString(key) {
      if (this[key]) return this[key];
      Log.warn(`{Enum} Unknown key requested: ${key}`);
      return this[key] || this.unknown;
    }
  }

  window.Enum = Enum;

  /**
   * DOM nodes creation and manipulation
   * @type {DomNode}
   */
  class DomNode {
    /**
     * Creates a Node
     * @param {(string|Node)} element Element to create or reference
     */
    constructor(element) {
      this._node = null;
      if (typeof element === 'string') {
        this._node =
          ((element.charAt(0) === '#') ? document.getElementById(element.slice(1)) : document.createElement(element)) ||
          null;
      } else if (element instanceof Node) {
        this._node = element;
      }
    }

    /**
     * @type {?Node} HTML Node object or null
     */
    get node() {
      return this._node;
    }

    /**
     * @type {boolean} Indicates if underlying data is empty
     */
    get empty() {
      return this._node === null;
    }

    attr(param) {
      Object.keys(param).forEach(attr => this._node.setAttribute(attr, param[attr]));
      return this;
    }

    remove(param) {
      if (!(param instanceof Array)) param = [param];
      param.forEach(attr => this._node.removeAttribute(attr));
      return this;
    }

    style(param) {
      Object.keys(param).forEach(prop => this._node.style.setProperty(prop, param[prop]));
      return this;
    }

    clear() {
      if (!this.empty) {
        while (this._node.firstChild) {
          this._node.removeChild(this._node.firstChild);
        }
      }
      return this;
    }

    /**
     * Appends text node to this instance
     * @param {string} [text=''] - Text content to append
     * @param {boolean} [overwrite=false] - If true, clears container content before appending
     * @returns {DomNode}
     */
    text(text = '', overwrite = false) {
      if (typeof text === 'string') {
        if (overwrite) this.clear();
        this._node.appendChild(document.createTextNode(text));
      } else {
        Log.warn('{DomNode::text} Attempted to create text node with non string content:\n', text);
      }
      return this;
    }

    /**
     * Appends any HTML element to this instance
     * @param {(string|Node|DomNode)} [element=''] - HTML element(s) to append
     * @param {boolean} [overwrite=false] - If true, clears container content before appending
     * @returns {DomNode}
     */
    html(element = '', overwrite = false) {
      if (overwrite) this.clear();
      if (typeof element === 'string') {
        this._node.innerHTML += element;
      } else {
        if (element instanceof DomNode) element = element.node;
        if (element instanceof Node) this._node.appendChild(element);
      }
      return this;
    }

    /**
     * Appends any valid data to this instance
     * @param {(string|Node|DomNode)} data - Any valid data to append
     * @param {boolean} [overwrite=false] - If true, clears container content before appending
     * @returns {DomNode}
     */
    data(data, overwrite = false) {
      if (data) {
        if ((typeof data === 'string') && (/<.{3,}?>/.test(data) === false)) {
          this.text(data, overwrite);
        } else {
          this.html(data, overwrite);
        }
      }
      return this;
    }

    on(event, callback, bubble) {
      this._node.addEventListener(event, callback, bubble);
      return this;
    }

    off(event, callback, bubble) {
      this._node.removeEventListener(event, callback, bubble);
      return this;
    }

    detach() {
      if (this._node && this._node.parentNode) {
        this._node = this._node.parentNode.removeChild(this._node);
      }
      return this;
    }

    attach(method, target) {
      if (typeof target === 'string') {
        target = document.getElementById(target);
      } else if (target instanceof DomNode) {
        target = target.node;
      }
      if (!(target instanceof Node)) {
        Log.warn(`{DomNode::attach} Invalid destination: ${target}`);
        return this;
      }
      switch (method) {
        case 'to':
          target.appendChild(this._node);
          break;
        case 'before':
          target.parentNode.insertBefore(this._node, target);
          break;
        case 'after':
          if (target.nextSibling === null) {
            target.parentNode.appendChild(this._node);
          } else {
            target.parentNode.insertBefore(this._node, target.nextSibling);
          }
          break;
        default:
          Log.warn(`{DomNode::attach} Invalid method: ${method}`);
      }
      return this;
    }
  }

  window.DomNode = DomNode;

  /**
   * Utility class
   * @type {Util}
   */
  class Util {
    /**
     * Creates, updates or removes CSS stylesheet with given ID
     * @param {string} id - Stylesheet id
     * @param {string} [content] - Stylesheet content to create/update
     */
    static style(id, content) {
      let s = new DomNode(`#${id}`);
      if (content) {
        if (s.empty) {
          s = new DomNode('style')
            .attr({
              type: 'text/css',
              id: id
            })
            .attach('to', document.head);
        }
        s.text(content, true);
      } else {
        s.detach();
      }
    }

    /**
     * Copies fields from source to destination. If fields argument is null, all fields from source are copied.
     * If additionally destination is not defined, shallow copy of source is created.
     * @param {Object} src - Source object
     * @param {Object} [dst = {}] - Destination object
     * @param {?string[]} [fields] - Fields to copy from source object
     * @returns {Object}
     */
    static copyFields(src, dst = {}, fields = null) {
      const keys = fields ? Object.keys(src).filter(f => fields.indexOf(f) > -1) : Object.keys(src);
      keys.forEach(field => dst[field] = src[field]);
      return dst;
    }

    /**
     * Returns value from given HTTP GET query string
     * @param {string} parameter - Name of the parameter to search
     * @param {string} [query=window.location.search] - HTTP GET query string
     * @returns {string}
     */
    static getQueryVariable(parameter, query = window.location.search) {
      const paramBegin = query.indexOf(parameter);
      let value = '';
      if (paramBegin > -1) {
        const paramEnd = query.indexOf('&', paramBegin);
        value =
          paramEnd < 0 ? query.slice(paramBegin + parameter.length + 1) : query.slice(paramBegin + parameter.length + 1,
            paramEnd);
      }
      return value;
    }

    /**
     * Generates 32 bit Cyclic Redundancy Check (CRC32)
     * @param {*} [str=''] - Input data. Non string data is JSON stringified before calculation
     * @returns {string}
     */
    static crc32(str = '') {
      if (!Util.crcTbl) Util.crcTbl = new Uint32Array(256).map(
        (itm, i) => new Array(8).fill(0).reduce(c => c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1, i));

      const crc = new Uint32Array(1);
      crc[0] = 0xffffffff;
      str = (typeof str !== 'string' ? JSON.stringify(str) : str).split('');
      str.forEach(c => crc[0] = (crc[0] >>> 8) ^ Util.crcTbl[(crc[0] ^ c.charCodeAt(0)) & 0xff]);
      crc[0] ^= 0xffffffff;
      return crc[0].toString(16);
    }

    /**
     * Creates raid object from join url
     * @param {string} url - Raid join url
     * @param {string} [poster=''] - User name posting the raid
     * @returns {?raidObject}
     */
    static getRaidFromUrl(url, poster = '') {
      const raid = {
        id: '',
        diff: -1,
        boss: '',
        hash: '',
        sid: -1,
        pid: -1,
        createtime: -1,
        poster: poster
      };
      const reg = /[?&]([^=]+)=([^?&]+)/gui;
      const p = url.replace(/&amp;/gui, '&').replace(/kv_&/gui, '&kv_');
      let cnt = 0, i;
      while ((i = reg.exec(p))) {
        switch (i[1]) {
          case 'kv_raid_id':
          case 'raid_id':
            raid.id = i[2];
            ++cnt;
            break;
          case 'kv_difficulty':
          case 'difficulty':
            raid.diff = parseInt(i[2]);
            ++cnt;
            break;
          case 'kv_raid_boss':
          case 'raid_boss':
            raid.boss = i[2];
            ++cnt;
            break;
          case 'kv_hash':
          case 'hash':
            raid.hash = i[2];
            ++cnt;
            break;
          case 'kv_serverid':
          case 'serverid':
            raid.sid = parseInt(i[2]);
            ++cnt;
            break;
        }
      }
      if (cnt === 5) {
        raid.pid = (raid.sid === 2) ? 0 : 1;
        raid.createtime = new Date().getTime();
        return raid;
      }
      return null;
    }

    /**
     * Formats number to human readable form
     * @param {(number|string)} number - Number to format
     * @param {number} [precision=4] - Precision (number of digits)
     * @param {string[]} [order] - Order array
     * @returns {string}
     */
    static toShortNumber(number, precision = 4, order = ['', 'k', 'm', 'b', 't', 'q', 'Q']) {
      let value = parseInt(number);
      if (isNaN(value) || value < 0) return number;
      let count = 0;
      while (value > 1000) {
        value /= 1000;
        ++count;
      }
      return value.toPrecision(precision) + order[count];
    }

    /**
     * Formats number to human readable format, lowest number is in kilos
     * @param {(number|string)} number - Number to format
     * @param {number} [precision=4] - Precision (number of digits)
     * @returns {string}
     */
    static getShortNumK(number, precision = 4) {
      return this.toShortNumber(number, precision, ['k', 'm', 'b', 't', 'q', 'Q']);
    }

    /**
     * Returns random integer number between selected minimum and maximum (inclusive)
     * @param {number} [max=1] - Highest possible integer
     * @param {number} [min=0] - Lowest possible integer
     * @returns {number}
     */
    static random(max = 1, min = 0) {
      if (max < 1) return 0;
      return Math.floor(min + Math.random() * (max + 1));
    }

    /**
     * Returns random element from given array
     * @param {Array} array - Input array
     * @returns {*}
     */
    static randomFromArray(array) {
      return array[this.random(array.length - 1)];
    }

    /**
     * Converts roman numbers to arabic
     * @param {string} roman - String representing roman number
     * @returns {number}
     */
    static romanToArabic(roman) {
      const lut = {
        I: 1,
        V: 5,
        X: 10,
        L: 50,
        C: 100,
        D: 500,
        M: 1000
      };
      let arabic = 0;
      let i = roman.length;
      while (i--) {
        if (this.hasProperty(lut, roman[i])) {
          if (lut[roman[i]] < lut[roman[i + 1]]) {
            arabic -= lut[roman[i]];
          } else {
            arabic += lut[roman[i]];
          }
        }
      }
      return arabic;
    }

    /**
     * Converts first letter of a text uppercase
     * @param {string} text - Text to process
     * @return {string}
     */
    static capitalize(text) {
      if ((typeof text === 'string') && (text.length > 1)) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
      }
      return text;
    }

    /**
     * Determines whether an object has a property with the specified name
     * @param {Object} object - Object to test for property
     * @param {(string|number|Symbol)} property - Property being tested
     * @returns {boolean}
     */
    static hasProperty(object, property) {
      return Object.prototype.hasOwnProperty.call(object, property);
    }
  }

  window.Util = Util;

  /**
   * Timer class
   * @type {Timer}
   */
  class Timer {
    /**
     * Creates a timer
     * @param {function(*)} callback Function to invoke after timer completes
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
  }

  window.Timer = Timer;

  /**
   * Gestures classes group
   */
  window.Gestures = {
    Kiss: class {
      static get SmittenAdjective() {
        const smittenAdjective = ['smitten', 'enamored', 'infatuated', 'taken', 'in love', 'inflamed'];
        return Util.randomFromArray(smittenAdjective);
      }

      static generate() {
        switch (Util.random(6)) {
          case 0:
            return '@from gives @who a puckered kiss on the lips.';
          case 1:
            return '@from plants a gentle kiss on the cheek of @who.';
          case 2:
            return '@from kisses @who... might have used tongue on that one.';
          case 3:
            return `@from seems ${this.SmittenAdjective} with @who.`;
          default:
            return '@from tickles the lips of @who with a sensual kiss.';
        }
      }
    },
    Poke: class {
      static get PokeBodyPlace() {
        const pokeBodyPlace = [
          'on the cheek', 'on the navel', 'in the nose', 'in the belly button', 'in the rib cage',
          'in a really ticklish spot', 'square on the forehead', 'with a wet willy in the ear', 'on the arm',
          'on the shoulder', 'on the chest', 'on the leg', 'in the face', 'on the neck', 'in the stomach', 'up the butt'
        ];
        return Util.randomFromArray(pokeBodyPlace);
      }

      static generate() {
        let txt = '';
        switch (Util.random(6)) {
          case 0:
            txt = '@from with a tickling finger of doom, pokes @who ';
            break;
          case 1:
            txt = '@from jumps out from the shadows and prods @who ';
            break;
          case 2:
            txt = '@from playfully pokes @who ';
            break;
          case 3:
            txt = '@from cheerfully pokes @who ';
            break;
          case 4:
            txt = '@from gleefully pokes @who ';
            break;
          case 5:
            txt = '@from pokes @who repeatedly ';
            break;
          default:
            txt = '@from, with index finger stern and pointy, pokes @who ';
            break;
        }
        return `${txt}${this.PokeBodyPlace}.`;
      }
    },
    Hit: class {
      static get StrikeAction() {
        const strikeAction = [
          'clobber', 'subdue', 'hit', 'bash', 'pound', 'pelt', 'hammer', 'wallop', 'swat', 'punish', 'pummel', 'strike',
          'beat'
        ];
        return Util.randomFromArray(strikeAction);
      }

      static get LeapingAction() {
        const leapingAction = [
          'vaults', 'surges', 'hurdles', 'bounds', 'pounces', 'storms', 'leaps', 'bolts', 'stampedes', 'sprints',
          'dashes', 'charges', 'lunges'
        ];
        return Util.randomFromArray(leapingAction);
      }

      static get AimModifier() {
        const aimModifier = [
          'a well placed', 'a pin-point accurate', 'a targeted', 'an aimed', 'a', 'a', 'a', 'a', 'a', 'a', 'a'
        ];
        return Util.randomFromArray(aimModifier);
      }

      static get WrestlingMove() {
        const wrestlingMove = [
          ' haymaker punch', ' kitchen sink to the midsection', ' jumping DDT', ' cross body attack', ' flying forearm',
          ' low dropkick', ' jumping thigh kick', ' roundhouse', ' left and right hook combo',
          ' jab and middle kick combo', ' spinning backfist and shin kick combo', ' delayed backbrain wheel kick',
          ' somersault kick to an uppercut combo', ' jab to the face', ' stomping hook punch',
          ' palm thrust to the solar plexus', ' shin kick', ' side headbutt', ' fast lowerbody roundhouse kick',
          ' fast upperbody roundhouse kick', 'n uppercut palm strike', 'n uppercut to midsection jab combo',
          ' downward chop'
        ];
        return Util.randomFromArray(wrestlingMove);
      }

      static get Meal() {
        const meal = [
          'midmorning snack', 'midnight snack', 'supper', 'breakfast', 'brunch', '2 o\'clock tea time',
          'midafternoon snack', 'lunch'
        ];
        return Util.randomFromArray(meal);
      }

      static get ThrowAction() {
        const throwAction = ['tosses', 'propels', 'throws', 'catapults', 'hurls', 'launches'];
        return Util.randomFromArray(throwAction);
      }

      static get Crying() {
        const crying = ['shouting', 'screaming', 'hollering', 'yelling', 'crying out'];
        return Util.randomFromArray(crying);
      }

      static get SportsWeapon() {
        const sportsWeapon = [
          'cricket paddle', 'lacrosse stick', 'hockey stick', 'croquet mallet', 'baseball bat', 'yoga ball', 'barbell',
          'folding lawn chair', 'caber', 'shot put', 'bowling ball', 'lantern', 'tennis racket'
        ];
        return Util.randomFromArray(sportsWeapon);
      }

      static get MidsectionStrikePlace() {
        const midsectionStrikePlace = ['midsection', 'solar plexus', 'chest', 'abdomen', 'sternum'];
        return Util.randomFromArray(midsectionStrikePlace);
      }

      static get RandomItemWeapon() {
        const randomItemWeapon = [
          'a giant frozen trout', 'an inflatable duck', 'a waffle iron', 'a sponge brick', 'a board of education',
          'an unidentified implement of mayhem and destruction', 'a rubber ducky *SQUEAK*', 'a rolling pin',
          'a tire iron', 'a sock full of oranges', 'a slinky, a slink [fun for a girl or a boy]',
          'a chinese finger puzzle', 'a whip of wet noodles', 'a humungous spicey italian meatstick',
          'a giant garlic dill', 'an ACME hammer of pain'
        ];
        return Util.randomFromArray(randomItemWeapon);
      }

      static get WithDescriptors() {
        const withDescriptors = [
          'with lightning reflexes, ', 'with finesse and poise, ', 'with mediocre skill, ',
          'with half-cocked attitude, ', 'with fervor and oomph, ', 'with vitality and gusto, ',
          'with ambition and enthusiasm, ', '', '', '', ''
        ];
        return Util.randomFromArray(withDescriptors);
      }

      static get StrikeActionVerb() {
        const strikeActionVerb = [
          'clobbers', 'subdues', 'hits', 'bashes', 'pounds', 'pelts', 'hammers', 'wallops', 'swats', 'punishes',
          'pummels', 'strikes', 'assaults', 'beats'
        ];
        return Util.randomFromArray(strikeActionVerb);
      }

      static generate() {
        switch (Util.random(8)) {
          case 0:
          case 3:
            return `@from attempts to ${this.StrikeAction} @who but fails...`;
          case 1:
            return `@from ${this.LeapingAction} towards @who and lands ${this.AimModifier}${this.WrestlingMove}.`;
          case 2:
            return `@from takes what's left of ${this.Meal}, ${this.ThrowAction} it towards @who ${this.Crying}, 'FOOD FIGHT'!`;
          case 4:
            return '@from rolls up a magazine planting a blow upside the head of @who.';
          case 5:
            return '@from hits @who on the head with a frying pan.';
          case 6:
            return `@from plants a ${this.SportsWeapon} to the ${this.MidsectionStrikePlace} of @who.`;
          default:
            return `@from pulls out ${this.RandomItemWeapon} and ${this.WithDescriptors}${this.StrikeActionVerb} @who with it.`;
        }
      }
    },
    Slap: class {
      static get SlapWeapon() {
        const slapWeapon = [
          'white glove', 'rubber chicken', 'well placed backhand', 'piece of moldy pizza', 'big dildo',
          'loaf of french bread', 'smile of devious pleasure', 'dead >0))>-<', 'left over chicken drumstick',
          'limp and slightly dirty french fry', 'brick of moldy cheese', 'grilled cheese', 'big dildo'
        ];
        return Util.randomFromArray(slapWeapon);
      }

      static get TargetAction() {
        const targetAction = [
          'deals', 'aims', 'inflicts', 'releases', 'dispatches', 'discharges', 'delivers', 'unleashes'
        ];
        return Util.randomFromArray(targetAction);
      }

      static get SassySynonym() {
        const sassySynonym = [
          'an audacious', 'an impudent', 'a bold', 'an overbold', 'an arrant', 'a brassy', 'a sassy'
        ];
        return Util.randomFromArray(sassySynonym);
      }

      static get Place() {
        const place = [['side', '\'s head.'], ['face', '.'], ['cheek', '.']];
        return Util.randomFromArray(place);
      }

      static get LeapingAction() {
        const leapingAction = [
          'vaults', 'surges', 'hurdles', 'bounds', 'pounces', 'storms', 'leaps', 'bolts', 'stampedes', 'sprints',
          'dashes', 'charges', 'lunges'
        ];
        return Util.randomFromArray(leapingAction);
      }

      static get LeadSpeed() {
        const leadSpeed = [
          ' sudden', ' spry', 'n abrupt', 'n energetic', ' hasty', 'n agile', 'n accelerated', ' quick'
        ];
        return Util.randomFromArray(leadSpeed);
      }

      static generate() {
        switch (Util.random(3)) {
          case 0:
          case 2:
            return `@from slaps @who with a ${this.SlapWeapon}.`;
          case 1:
            return `@from ${this.TargetAction} ${this.SassySynonym} slap to the ${this.Place.join(' of @who')}`;
          default:
            return `@from ${this.LeapingAction} forward and with a ${this.SlapWeapon}, deals a${this.LeadSpeed} slap to @who.`;
        }
      }
    }
  };

  /**
   * Handles dynamic CSS rules
   * @type {Css}
   */
  class Css {
    /**
     * Adds new CSS rule
     * @param {string} alias - alias for the rule
     * @param {string} selector - css selector(s)
     * @param {string} definitions - rules definition for given selector(s)
     */
    static add(alias, selector, definitions) {
      if (this.rules === undefined) this.rules = {};
      const replace = Util.hasProperty(this.rules, alias);
      this.rules[alias] = {
        name: selector,
        value: definitions
      };
      if (replace) {
        this.compile();
      } else {
        this.compile(this.rules[alias]);
      }
    }

    /**
     * Removes CSS rule with given alias
     * @param {string} alias - alias of the rule to remove
     */
    static del(alias) {
      if (this.rules) {
        if (this.rules[alias] !== undefined) delete this.rules[alias];
        this.compile();
      }
    }

    /**
     * Puts added rules together into one script tag and adds to document head
     * @param {{name: string, value: string}} [obj] - Optional object with rule to compile
     */
    static compile(obj) {
      if (this.node === undefined) {
        this.node = new DomNode('style')
          .attr({ type: 'text/css' })
          .attach('to', document.head);
      }
      if (obj) {
        this.node.text(`${obj.name} {${obj.value}}\n`);
      } else {
        this.node.clear();
        Object.keys(this.rules || {}).forEach(key => {
          const rule = this.rules[key];
          this.node.text(`${rule.name} {${rule.value}}\n`);
        });
      }
    }

    /**
     * Removes whole style entry from HTML documents head
     */
    static remove() {
      this.node.detach();
    }
  }

  window.Css = Css;

  /**
   * XHR calls proxy
   * @type {Proxy}
   */
  class Proxy {
    /**
     * Calls lightshot service to get real image url
     * @param {string} link - Link with obfuscated lightshot image url
     * @param {string} id - ID of destination node for image
     * @param {string} chat - Name of private chat with placeholder for image
     * @param {boolean} [getBuffer=false] - request array buffer type
     */
    static lightShot(link, id, chat, getBuffer = false) {
      const req = {
        eventName: 'DRMng.lightShot',
        url: link,
        method: 'GET',
        id: id,
        ch: chat,
        timeout: 10000
      };
      if (getBuffer) req.responseType = 'arraybuffer';
      DRMng.postMessage(req);
    }

    // TODO: Add support for regular kong chat as well
    /**
     * Lightshot callback
     * @param {Object} e returned data
     */
    static lightShotCallback(e) {
      const d = JSON.parse(e && e.data);
      const i = new DomNode(`#${d.id}`);
      const c = d.ch;
      if (!i.empty) {
        let img = /og:image.+?content="(.+?)"/.exec(d.responseText);
        if (img && img[1] && img[1].indexOf('image.prntscr.com') > 0) {
          setTimeout(() => Proxy.lightShot(img[1], d.id, d.ch, true), 0);
          return;
        }
        if (d.responseType === 'arraybuffer') {
          img = `data:image/png;base64,${btoa(d.responseText)}`;
        } else if (img instanceof Array && img.length > 1) {
          img = img[1];
        } else {
          i.detach();
          return;
        }
        if (img && c) {
          i.on('load', () => {
            setTimeout(() => PrivateChat.getChat(c).scrollToBottom(), 250);
          })
            .attr({ src: img })
            .remove('id');
        } else {
          i.detach();
        }
      }
    }
  }

  window.Proxy = Proxy;

  /**
   * Script configuration management
   * @type {Config}
   */
  class Config {
    /**
     * Configuration data object
     * @type {Object}
     */
    static get data() {
      return this.local;
    }

    /**
     * Current server mode
     * @type {string}
     */
    static get server() {
      return this.local.server;
    }

    /**
     * Current server mode as server id
     * @type {number}
     */
    static get serverId() {
      return (this.server === 'Elyssa') ? 1 : 2;
    }

    /**
     * Visited raids IDs from selected server
     * @type {number[]}
     */
    static get visited() {
      return this.local.visited[this.server.toLowerCase()];
    }

    /**
     * Dead raids objects with IDs as keys and completion timestamp as values
     * @type {Object.<string, number>}
     */
    static get dead() {
      return this.local.dead[this.server.toLowerCase()];
    }

    /**
     * String with filtered raid types
     * @type {string}
     */
    static get filterString() {
      return this.local.filterString[this.server.toLowerCase()];
    }

    static set filterString(value) {
      this.local.filterString[this.server.toLowerCase()] = value;
    }

    static get filterRaids() {
      return this.local.filterRaids[this.server.toLowerCase()];
    }

    static get hardFilter() {
      return this.local.hardFilter[this.server.toLowerCase()];
    }

    /**
     * Contains raid info from server
     * @typedef {Object} RaidData
     * @property {string} fName Full raid name
     * @property {string} sName Short raid name
     * @property {number[]} hp Health of raid for each difficulty
     * @property {number} maxPlayers Maximum number of available slots in raid
     * @property {boolean} isEvent Indicates event raid
     * @property {boolean} isGuild Indicates guild raid
     * @property {string} banner Banner image name
     */

    /**
     * @type {Object.<string, RaidData>}
     */
    static get raidData() {
      return this.local.raidData;
    }

    /**
     * Loads localstorage config into data object
     */
    static load() {
      this.local = {
        kong: {
          kongSlimHeader: false,
          chatWidth: 250
        },
        server: 'Elyssa',
        sortBy: 'hp',
        scriptWidth: 300,
        visited: {
          kasan: [],
          elyssa: []
        },
        dead: {
          kasan: {},
          elyssa: {}
        },
        raidData: {},
        raidKeys: [],
        filterData: {},
        tiersData: {},
        filterString: {
          kasan: '',
          elyssa: ''
        },
        filterRaids: {
          kasan: {},
          elyssa: {}
        },
        hardFilter: {
          kasan: [],
          elyssa: []
        },
        checkSums: {
          raidData: '',
          filterData: '',
          tiersData: ''
        },
        alliance: {
          sbs: false,
          rooms: []
        },
        gameFrame: {
          removeWChat: false,
          leftWChat: false,
          hideWChat: false
        },
        sidebar: {}
      };

      const data = localStorage['DRMng'] ? JSON.parse(localStorage['DRMng']) : {};
      if (data) {
        Object.keys(this.local).forEach(key => {
          if (data[key]) this.local[key] = data[key];
        });
        Object.keys(data).forEach(key => {
          if (this.local[key] === undefined) this.local[key] = data[key];
        });
      }
      this.local.raidKeys = Object.keys(this.local.raidData);
      this.save();
    }

    /**
     * Saves config to localstorage
     */
    static save() {
      localStorage['DRMng'] = JSON.stringify(this.local);
    }
  }

  window.Config = Config;

  /**
   * User Manager module
   * @type {UserManager}
   */
  class UserManager {
    static basicData() {
      if (active_user && active_user.username().toLowerCase() !== 'guest') {
        this.user.ID = active_user.id();
        this.user.name = active_user.username();
        this.user.authToken = active_user.gameAuthToken();
        setTimeout(() => this.extendedData(), 0);
      } else {
        Log.debug('{UserManager} User data not ready, trying again in .1 sec');
        setTimeout(() => this.basicData(), 100);
      }
    }

    static userNode() {
      const guild = holodeck._chat_window._rooms_by_type.guild;
      const users = guild.users();
      if (users.length > 0) {
        for (let i = 0, l = users.length; i < l; ++i) {
          if (users[i].username === this.user.name) {
            this.user.IGN = users[i]._game_character_name;
            break;
          }
        }
        this.user.guild = guild._room.name;
        this.user.qualified = true;
        Log.info('{UserManager} Module loaded');
      } else {
        setTimeout(() => this.userNode(), 100);
      }
    }

    static extendedData() {
      if (holodeck && holodeck.ready && holodeck._chat_window._rooms_by_type) {
        if (holodeck._chat_window._rooms_by_type.guild) {
          return setTimeout(() => this.userNode(), 0);
        } else if (++this.numTries < 20) {
          Log.debug(`{UserManager} Guild data missing, trying again in 2 sec (${this.numTries}/20)`);
          return setTimeout(() => this.extendedData(), 2000);
        } else {
          Log.warn('{UserManager} Guild info missing.');
          this.user.guild = '';
          this.user.IGN = '';
          this.user.qualified = true;
          Log.info('{UserManager} Module loaded');
        }
      } else {
        Log.debug('{UserManager} Holodeck not ready, trying again in .1 sec');
        return setTimeout(() => this.extendedData(), 100);
      }
    }

    static load() {
      this.numTries = 0;
      this.user = {
        qualified: false,
        ID: null,
        name: null,
        IGN: null,
        authToken: null,
        guild: null
      };
      this.knownUsers = {};
      Log.debug('{UserManager} Loading user data');
      setTimeout(() => this.basicData(), 0);
    }
  }

  window.UserManager = UserManager;

  /**
   * Chat message class
   * @type {ChatMessage}
   */
  class ChatMessage {
    /**
     * Private message flags
     * @typedef PrivateFlags
     * @type {Object}
     * @property {boolean} any - Indicates any private message activity
     * @property {boolean} sent - Indicates outgoing private message
     * @property {boolean} recv - Indicates incoming private message
     */

    /**
     * Creates message
     * @param {string|Node|Window.DomNode} message Message content
     * @param {?string} [user] User name and optional ign
     * @param {Object} [props={}] Message properties
     * @param {EnumSymbol} [props.type] Message type
     * @param {string} [props.room] Target chat room for message
     * @param {PrivateFlags} [props.pm] Private message flags
     * @param {(number|Date)} [props.timestamp] Message timestamp
     */
    constructor(message, user, props = {}) {
      this.body = new DomNode('div').attr({ class: 'chat-message' });
      this.classes = {
        main: [],
        msg: ['username', 'truncate']
      };
      this.prefix = '';
      this.addClass = '';
      this.addStyle = '';
      this.raid = null;
      // Setters
      this.type = props;
      this.room = props;
      this.whisper = props;
      this.self = props;
      this.gameName = props;
      this.timestamp = props;
      this.user = user;
      this.message = message;
    }

    /**
     * @type {EnumSymbol}
     */
    get type() {
      return this._type;
    }

    set type(value) {
      this._type = value.type && (value.type !== ChatMessage.Type.unknown) ? value.type : ChatMessage.Type.game;
    }

    get room() {
      return this._room;
    }

    set room(value) {
      this._room = value.room || 'none';
    }

    /**
     * @type {PrivateFlags}
     */
    get whisper() {
      return this._whisper;
    }

    set whisper(value) {
      this._whisper = value.pm || {
        any: false,
        sent: false,
        recv: false
      };
      if (this._whisper.any) {
        this.classes.main.push('whisper');
        if (this._whisper.recv) {
          this.classes.main.push('received_whisper');
          this.prefix = 'from ';
        } else {
          this.classes.main.push('sent_whisper');
          this.prefix = 'to ';
        }
      }
    }

    /**
     * @type {string}
     */
    get user() {
      return this._user;
    }

    set user(value) {
      this._user = value || 'Unknown';
      if ((this._user === this.self) || this.whisper.sent) {
        this.classes.msg.push('is_self');
      }
    }

    get self() {
      return this._self;
    }

    set self(value) {
      this._self = value.self || UserManager.user.name;
    }

    get gameName() {
      return this._gameName;
    }

    set gameName(value) {
      this._gameName = value.characterName || null;
    }

    get time() {
      return this._timestamp.format('mmm d, HH:MM');
    }

    get timestamp() {
      return this._timestamp.getTime();
    }

    set timestamp(value) {
      const ts = value.timestamp;
      if (ts instanceof Date) {
        this._timestamp = ts;
      } else if (typeof ts === 'number') {
        this._timestamp = new Date(ts.toString().length < 12 ? ts * 1000 : ts);
      } else {
        this._timestamp = new Date();
      }
    }

    /**
     * @type {?(string|Node)}
     */
    get message() {
      return this._message;
    }

    set message(value) {
      if (typeof value === 'string') {
        this.raid = value;
        if (this.raid) {
          this._message = this.raid.text;
        } else {
          this._message = ChatMessage.formatLinks(value);
        }
        if (!this._message) this._message = null;
      } else {
        if (value instanceof DomNode) {
          value = value.node;
        }
        this._message = value instanceof Node ? value : null;
      }
    }

    get html() {
      if (this.type !== ChatMessage.Type.service) {
        const p = new DomNode('p').attr({ timestamp: this.timestamp });
        if (this.classes.main.length > 0) p.attr({ class: this.classes.main.join(' ') });
        // Time field + raid link
        new DomNode('span').attr({ class: 'timestamp' }).text(this.time)
          .data(this.raid ? new DomNode('span').data(this.raid.link) : null)
          .attach('to', p);
        // Extra raid data field
        if (this.raid && this.raid.extra) this.raid.extra.attach('to', p);
        // User field
        new DomNode('span')
          .attr({
            username: this.user,
            class: this.classes.msg.join(' ')
          })
          .text(this.prefix + this.user).attach('to', p);
        // IGN field
        if (this.gameName) {
          new DomNode('span').attr({ class: 'guildname truncate' }).text(this.gameName).attach('to', p);
        }
        if (this.message) {
          // Separator field
          new DomNode('span').attr({ class: 'separator' }).text(': ').attach('to', p);
          // Message field
          new DomNode('span').attr({ class: 'message hyphenate' }).data(this.message).attach('to', p);
        }
        p.attach('to', this.body);
      } else {
        new DomNode('div').attr({
          class: 'script' + this.addClass,
          style: this.addStyle
        })
          .data(this.message).attach('to', this.body);
      }

      return this.body.node;
    }

    /**
     * @type {?{text: string, link: DomNode, extra: DomNode}}
     */
    get raid() {
      return this._raid;
    }

    set raid(link) {
      this._raid = null;

      const match = /(^.*?)(http.+?action_type.raidhelp.+?)(\s[\s\S]*$|$)/.exec(link);
      if (!match) return;

      const raid = Util.getRaidFromUrl(match[2], this.user);
      if (!raid) return;

      const visited = Config.visited.indexOf(parseInt(raid.id)) > -1;
      const dead = Util.hasProperty(Config.dead, raid.id);
      const info = Config.raidData[raid.boss];
      const diff = ['n', 'h', 'l', 'nm'][raid.diff - 1];
      const name = info ? info.sName : raid.boss.replace(/_/g, ' ');

      this.classes.main.push('raid', raid.id, diff);
      if (dead) this.classes.main.push('dead');
      if (visited) this.classes.main.push('visited');

      this._raid = {
        text: (match[1] + match[3]).trim(),

        link: new DomNode('a')
          .attr({
            href: match[2].replace(/&amp;/g, '&'),
            data: JSON.stringify(raid)
          })
          .on('click', DRMng.Raids.joinClick)
          .text(`${diff} ${name}`.toUpperCase()),

        extra: new DomNode('span')
          .attr({ class: 'extraid' })
          .text(info ? (info.isEvent ? (info.isGuild ? 'Guild ER' : 'WR/ER') :
            `AP ${Util.getShortNumK(info.hp[raid.diff - 1] * 1000 / info.maxPlayers / 2)}`) : '')
      };

      if (this.room === 'none' || this.type !== ChatMessage.Type.game) {
        const filterData = Config.filterRaids[raid.boss];
        const filter = filterData ? !filterData[raid.diff - 1] : true;
        if (!dead && !visited && filter && DRMng.Raids.filter.indexOf(`@${raid.boss}_${raid.diff}`) > -1) {
          if (DRMng.Raids.isJoining) {
            setTimeout(DRMng.Raids.pushToQueue.bind(DRMng.Raids, raid), 1);
          } else {
            setTimeout(DRMng.Raids.prepareJoining.bind(DRMng.Raids), 1);
          }
        }
      }
    }

    static formatLinks(message) {
      const regLink = /(^|[^"])(https?:\/\/\S+[^,\s])/g;
      const regImg = /\.(jpe?g|png|gif)$/i;
      const regHttpReplace = /^https?:\/\//;
      let l;
      while ((l = regLink.exec(message))) {
        let link = `<a href="${l[2]}" target="_blank">${l[2].replace(regHttpReplace, '')}</a>`;
        if (regImg.test(l[2])) {
          link += `<br><img src="${l[2]}" alt="image" onclick="window.open(this.src)">`;
        }
        const prefix = message.slice(0, regLink.lastIndex - l[2].length);
        const suffix = message.slice(regLink.lastIndex);
        message = prefix + link + suffix;
        regLink.lastIndex += link.length - l[2].length;
      }
      return message.trim();
    }
  }

  /**
   * @type {Enum}
   * @property {EnumSymbol} game
   * @property {EnumSymbol} guild
   * @property {EnumSymbol} service
   */
  ChatMessage.Type = new Enum('game', 'guild', 'service');

  window.ChatMessage = ChatMessage;

  class PrivateChat {

    constructor(config, forceActive = false) {

      if (PrivateChat.Rooms === undefined) {
        PrivateChat.Rooms = new Map();
        PrivateChat.initSbsContainer();
      }

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
              ign: user.ign || '',
              guild: user.gld || '',
              sock: user.sid || null
            };

            el.html = document.createElement('div');
            el.html.setAttribute('class', 'userlist');

            let span = document.createElement('span');
            span.setAttribute('class', 'guildtag');
            span.textContent = PrivateChat.getGuildTag(el.guild) || '\u2014';
            el.html.appendChild(span);

            span = document.createElement('span');
            span.setAttribute('class', 'username');
            span.textContent = el.name;
            el.html.appendChild(span);

            span = document.createElement('span');
            span.setAttribute('class', 'userign');
            if (el.ign) span.textContent = '(' + el.ign + ')';
            el.html.appendChild(span);

            this.fields[el.name] = el;
          }
        }
      };
      this.active = forceActive;
      this.count = null;
      this.conf = config;
      this.unr = null;
      this.tabs = null;
      this.tabActions = null;
      this.tab = null;
      this.body = null;
      this.input = null;
      this.inputCnt = null;
      this.client = null;
      this.userLock = false;
      this.messageLock = false;
      this.messageBuffer = [];

      PrivateChat.Rooms.set(this.conf.channel, this);

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
      this.client.query.token = Util.crc32(val);
      setTimeout(() => this.reconnect(), 1000);
    }

    get ready() {
      return (typeof io === 'function') && this.tab && this.chat && UserManager.user.qualified &&
        !DRMng.Raids.bootstrap;
    }

    configUpdate(conf) {
      this.name = conf.name;
      this.pass = conf.pass;
    }

    connect() {
      if (this.ready) {

        if (Config.data.alliance.sbs) {
          document.getElementById('private_chat_sbs').style.removeProperty('display');
        } else {
          this.tab.style.removeProperty('display');
        }

        const usr = UserManager.user;
        const user = {
          usr: usr.name,
          ign: usr.IGN,
          gld: usr.guild
        };

        this.client = io.connect(`${DRMng.serverAddress}/${this.conf.channel}`, {
          query: {
            user: UserManager.user.name,
            token: Util.crc32(this.conf.pass)
          },
          secure: true,
          transports: ['websocket']
        });

        this.client.on('error', err => {
          Log.warn('{PrivateChat} Client error:', err);
          document.getElementById('private_chat_sbs').style.setProperty('display', 'none');
          this.tab.style.setProperty('display', 'none');
          //destroyChat();
        });

        this.client.on('disconnect', () => {
          Log.warn('{PrivateChat} Client disconnected!');
        });

        this.client.on('connect', () => {
          this.clearUsers();              // clear user list
          this.clear();                   // clear chat
          this.client.emit('join', user); // login to server
          Log.info('{PrivateChat} User login data [%s|%s|%s]', user.usr, user.ign, user.gld);
        });

        this.client.on('msg', data => this.messageEvent(data));
        this.client.on('service', data => this.serviceEvent(data));
      } else {
        Log.debug('{PrivateChat} Resources not ready, trying again in 1 sec...');
        setTimeout(() => this.connect(), 1000);
      }
    }

    reconnect() {
      if (!this.client) {
        setTimeout(() => this.connect(), 0);
      } else if (this.client.connected) {
        this.client.disconnect();
        setTimeout(() => this.reconnect(), 3000);
      } else {
        this.client.connect();
      }
    }

    updateUsers() {
      // update keys
      this.users.keys = Object.keys(this.users.fields);
      // sort userlist
      this.users.keys.sort();
      // clear list
      while (this.users.html.firstChild) {
        this.users.html.removeChild(this.users.html.firstChild);
      }
      // fill it up again
      this.users.count = this.users.keys.length;

      for (let i = 0; i < this.users.count; ++i) {
        this.users.html.appendChild(this.users.fields[this.users.keys[i]].html);
      }

      this.countUpdate();
    }

    addUser(user, noUpdate = false) {
      if (!this.userLock) {
        this.userLock = true;
        // TODO: Stop using update and inject field into sorted array
        this.users.add(user);
        if (!noUpdate) this.updateUsers();
        this.userLock = false;
      } else {
        setTimeout(() => this.addUser(user, noUpdate), 10);
      }
    }

    delUser(name) {
      if (!this.userLock) {
        this.userLock = true;
        if (Util.hasProperty(this.users.fields, name)) {
          this.users.html.removeChild(this.users.fields[name].html);
          delete this.users.fields[name];
          const idx = this.users.keys.indexOf(name);
          if (idx !== -1) this.users.keys.splice(idx, 1);
          this.users.count--;
          this.countUpdate();
        }
        this.userLock = false;
      } else {
        setTimeout(() => this.delUser(name), 10);
      }
    }

    clearUsers() {
      this.users.keys = [];
      this.users.count = 0;
      this.users.fields = {};
      if (this.users.html) {
        while (this.users.html.firstChild) {
          this.users.html.removeChild(this.users.html.firstChild);
        }
      }
    }

    countUpdate() {
      if (this.active && !PrivateChat.sbsActive) {
        this.count.textContent = this.users.count;
      }
    }

    nameUpdate() {
      if (Config.data.alliance.sbs || !this.active) return;
      document.querySelector('.room_name.h6').textContent = this.name;
    }

    static getGuildTag(guild) {
      const roman = /^(.+\s)([IXV]+)$/.exec(guild);
      if (roman) guild = roman[1] + Util.romanToArabic(roman[2]);
      const reg = /([A-Z]+|[\w'`´])[\w'`´]*/g;
      let tag = '', part;
      while ((part = reg.exec(guild))) {
        tag += part[1];
      }
      return tag;
    }

    setUnread(unset = false) {
      if (this.unr) this.unr.setAttribute('style', unset ? 'display: none' : '');
    }

    activate() {
      if (!Config.data.alliance.sbs) holodeck._chat_window._active_room.hide();
      if (PrivateChat.getActive()) PrivateChat.getActive().deactivate();
      this.tab.classList.add('active');
      //this.tab.style.setProperty(`border-right`, `0`);
      this.body.style.removeProperty('display');
      this.setUnread(true);
      this.active = true;
      this.nameUpdate();
      this.countUpdate();
      setTimeout(() => this.scrollToBottom(true), 100);
    }

    deactivate() {
      if (!this.active) return;
      this.active = false;
      this.tab.classList.remove('active');
      this.body.style.display = 'none';
    }

    tabClick(e) {
      e.preventDefault();
      e.stopPropagation();
      this.activate();
      return false;
    }

    clear() {
      while (this.chat.firstChild) {
        this.chat.removeChild(this.chat.firstChild);
      }
    }

    send(msg) {
      msg = msg || this.input.value;
      if (msg && msg !== 'Enter text for chat here') {
        let pm = /^\/w\s(\w+?)\s([\S\s]+)$/.exec(msg);
        if (pm && pm[1] && pm[2]) {
          this.client.emit('msg', {
            type: 1,
            user: pm[1],
            text: pm[2]
          });
        } else if (holodeck.processChatCommand(msg, this.conf.channel)) {
          this.client.emit('msg', {
            type: 0,
            text: msg
          });
        }
        this.input.value = '';
      }
    }

    scrollToBottom(force = false) {
      if (!this.chat) return;
      const elHeight = this.chat.lastChild ? this.chat.lastChild.offsetHeight : 0;
      const chatHeight = this.chat.scrollHeight - this.chat.offsetHeight - this.chat.scrollTop;
      if (chatHeight <= elHeight || force) {
        this.chat.scrollTop = this.chat.scrollHeight;
      }
    }

    static initSbsContainer() {
      if (!this.sbsCreated) {
        if (document.getElementById('chat_window')) {
          this.sbsContainer = new DomNode('div')
            .attr({ id: 'private_chat_sbs' })
            .style({ display: 'none' })
            .on('click', e => this.sbsEvent(e))
            .attach('to', 'chat_tab_pane').node;

          this.sbsTabs = new DomNode('div')
            .attr({ id: 'private_chat_sbs_tabs' })
            .attach('to', this.sbsContainer).node;

          this.sbsCreated = true;
          this.sbsActive = Config.data.alliance.sbs || false;

          DRMng.UI.setChatWidth();

          Log.debug('SBS Container initialized');
        } else {
          Log.debug('SBS Container failed to init, retry in 10ms');
          return setTimeout(() => this.initSbsContainer(), 10);
        }
      }
    }

    initTab() {
      this.tabs = document.getElementById('chat_room_tabs');
      this.tabActions = document.getElementById('chat_actions_container');
      const gr = document.getElementById('guild_room_tab');
      if (PrivateChat.sbsCreated && this.tabs && this.tabActions && gr && this.tabActions.parentNode === this.tabs) {
        this.tab = document.createElement('div');
        this.tab.setAttribute('id', `drmng_${this.conf.channel}_room_tab`);
        this.tab.setAttribute('class', 'chat_room_tab drmng_room_tab');
        //this.tab.style.setProperty('display', 'none');

        this.unr = document.createElement('span');
        this.unr.setAttribute('class', 'unread_chat_messages spriteall spritegame');
        this.unr.setAttribute('style', 'display: none');
        this.unr.innerHTML = 'Unread';

        const a = document.createElement('a');
        a.setAttribute('href', '#');
        a.textContent = this.conf.name;
        a.addEventListener('click', e => this.tabClick(e));
        a.appendChild(this.unr);

        this.tab.appendChild(a);

        if (PrivateChat.sbsActive) {
          if (this.active) this.tab.classList.add('active');
          PrivateChat.sbsTabs.appendChild(this.tab);
        } else {
          this.tabs.insertBefore(this.tab, this.tabActions);
        }

        this.count = document.querySelector('.number_in_room');

        Log.info(`{PrivateChat::${this.name}} Chat tab created.`);
        setTimeout(() => this.initBody(), 0);
      } else {
        Log.debug('{PrivateChat} Tab failed to init, retry in 50ms');
        setTimeout(() => this.initTab(), 50);
      }
    }

    initBody() {
      if (!PrivateChat.container) {
        PrivateChat.container = document.getElementById('chat_rooms_container');
        if (!PrivateChat.container) return setTimeout(() => this.initBody(), 100);
      }

      if (this.body === null) {
        this.body = document.createElement('div');
        this.body.style.setProperty('width', '100%');
        this.body.style.setProperty('display', 'none');

        this.users.html = document.createElement('div');
        this.users.html.classList.add('chat_tabpane', 'users_in_room', 'clear');

        this.chat = document.createElement('div');
        this.chat.classList.add('chat_message_window');

        const inputDiv = document.createElement('div');
        inputDiv.setAttribute('class', 'chat_controls');

        this.input = document.createElement('textarea');
        this.input.setAttribute('class', 'chat_input');
        this.input.value = 'Enter text for chat here';

        this.input.addEventListener('focus', () => {
          if (this.input.value === 'Enter text for chat here') {
            this.input.value = '';
            this.input.style.removeProperty('font-style');
          }
        });
        this.input.addEventListener('blur', () => {
          if (this.input.value === '') {
            this.input.value = 'Enter text for chat here';
            this.input.style.setProperty('font-style', 'italic');
          }
        });
        this.input.addEventListener('keydown', e => {
          //console.log(e.which, e.keyCode, e.charCode, e.key, e.shiftKey);
          if (e.key === 'Enter' && !e.shiftKey) {
            this.send();
            e.preventDefault();
          }
        });
        this.input.addEventListener('keyup', () => {
          if (this.input.value !== 'Enter text for chat here') {
            let txt = /^(\/\w*\s?)?([\S\s]*)$/.exec(this.input.value);
            txt = txt[2] || '';
            if (this.inputCnt) this.inputCnt.textContent = txt.length;
          }
        });

        const cnt = document.createElement('span');
        cnt.setAttribute('class', 'chat_chars_remaining');
        cnt.textContent = '0';
        this.inputCnt = cnt;

        const cntCont = document.createElement('span');
        cntCont.setAttribute('class', 'chat_char_countdown');
        cntCont.appendChild(this.inputCnt);
        cntCont.appendChild(document.createTextNode('/2000'));

        inputDiv.appendChild(this.input);
        inputDiv.appendChild(cntCont);
        this.body.appendChild(this.users.html);
        this.body.appendChild(this.chat);
        this.body.appendChild(inputDiv);

        Log.info(`{PrivateChat::${this.name}} Chat body created`);
      }

      if (PrivateChat.sbsActive) {
        if (this.active) this.body.style.removeProperty('display');
        PrivateChat.sbsContainer.style.removeProperty('display');
        PrivateChat.sbsContainer.appendChild(this.body);
      } else {
        PrivateChat.sbsContainer.style.setProperty('display', 'none');
        PrivateChat.container.appendChild(this.body);
      }

      Log.info(`{PrivateChat::${this.name}} Chat body attached to DOM`);

      DRMng.UI.setChatWidth();

      setTimeout(() => this.connect(), 0);
    }

    remove() {
      if (!PrivateChat.sbsActive && this.active) {
        if (holodeck._chat_window._rooms_by_type.guild) {
          holodeck._chat_window._rooms_by_type.guild.show();
        } else {
          holodeck._chat_window._rooms_by_type.game.show();
        }
      }

      this.client.disconnect();

      if (PrivateChat.sbsActive) {
        PrivateChat.sbsTabs.removeChild(this.tab);
        PrivateChat.sbsContainer.removeChild(this.body);
      } else {
        this.tabs.removeChild(this.tab);
        PrivateChat.container.removeChild(this.body);
      }

      for (let i = 0, len = Config.data.alliance.rooms.length; i < len; ++i) {
        if (Config.data.alliance.rooms[i].channel === this.conf.channel) {
          Config.data.alliance.rooms.splice(i, 1);
          Config.save();
          break;
        }
      }
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
        case 'loadData':
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
            while (this.messageBuffer.length) {
              this.messageEvent(this.messageBuffer.shift(), true);
            }
            this.messageLock = false;
            setTimeout(() => this.scrollToBottom(true), 1000);
          }

          break;

        case 'userJoin':
          setTimeout(() => this.addUser(data.user), 0);
          break;

        case 'userLeave':
          setTimeout(() => this.delUser(data.user.usr), 0);
          break;

        case 'allianceRaids':
          data.raids.forEach(raid => {
            raid.createtime = new Date(raid.createtime).getTime();
            DRMng.Raids.insert(raid);
          });
          break;

        case 'newRaid':
          setTimeout(DRMng.Raids.insert.bind(DRMng.Raids, data.data), 0);
          break;

        case 'fullUpdate':
          setTimeout(DRMng.Raids.update.bind(DRMng.Raids, data.data, true), 0);
          break;

        case 'partialUpdate':
          setTimeout(DRMng.Raids.update.bind(DRMng.Raids, data.data, false), 0);
          break;

        case 'nukedRaid':
          setTimeout(DRMng.Raids.remove.bind(DRMng.Raids, data.data), 0);
          break;

        default:
          Log.warn('{PrivateChat} Unhandled service data:', data);
      }
    }

    messageEvent(data, history = false) {
      if (data.type === 4) {
        this.serviceMessage(data.txt);
      } else if (!this.messageLock || history) {
        let u = UserManager.user,
          t = data.type,
          e = ['username', 'truncate'],
          f = data.usr.usr === u.name,
          h = ['', 'From ', 'To ', ''][t],
          g = [];

        e.push('chat_message_window' + (c ? '_undecorated' : '') + '_username');
        h && g.push('whisper');
        (t === 1) && g.push('received_whisper');
        (t === 2) && g.push('sent_whisper');
        f && e.push('is_self');

        let content = PrivateChat.raidMessage(data, g, e, h);
        if (!content) {
          let reg = /(https?\S+[^,\s])/g, l, link, start, end, msg = data.txt;

          while ((l = reg.exec(msg))) {
            if (/\.(jpe?g|a?png|gif)$/.test(l[1])) {
              link = `<img src="${l[1]}" alt="${l[1]}" onclick="window.open(this.src)">`;
            } else if (/(prntscr.com|prnt.sc)/.test(l[1])) {
              let id = `prntsc_${new Date().getTime()}`;
              link = `<img id="${id}" onclick="window.open(this.src)">`;
              Proxy.lightShot(l[1], id, this.conf.channel);
            } else if ((link = /.+youtube.+watch.+?v=([^&]{11})/.exec(l[1]))) {
              link =
                `<iframe width="480" height="auto" src="https://www.youtube.com/embed/${link[1]}" frameborder="0"></iframe>`;
            } else {
              link = `<a href="${l[1]}" target="_blank">${l[1].replace(/^https?:\/\//, '')}</a>`;
            }
            start = msg.substr(0, reg.lastIndex - l[1].length);
            end = msg.slice(reg.lastIndex);
            msg = start + link + end;
            reg.lastIndex += link.length - l[1].length;
          }
          content = PrivateChat.getMessageHTML({
            mainCls: g.join(' '),
            ts: new Date(data.ts).format('mmm d, HH:MM'),
            pfx: h,
            user: data.usr.usr,
            userCls: e.join(' '),
            ign: data.usr.ign || '',
            ignCls: data.usr.ign ? 'guildname truncate' : '',
            tag: PrivateChat.getGuildTag(t === 2 ? u.guild : data.usr.gld),
            msg: msg
          });
        }
        const msg = document.createElement('div');
        msg.setAttribute('class', 'chat-message');
        if (content instanceof HTMLElement) {
          msg.appendChild(content);
        } else {
          msg.innerHTML = content;
        }
        this.chat.appendChild(msg);

        if (this.active) {
          this.scrollToBottom(f);
        } else {
          this.setUnread();
        }
      } else {
        this.messageBuffer.push(data);
      }
    }

    serviceMessage(msg, ri) {
      if (msg) {
        const p = new DomNode('div').attr({ class: 'chat-message' });
        new DomNode('div')
          .attr({ class: `service${ri ? ' raidinfo' : ''}` })
          .style(
            ri ? { 'background-image': `url(https://content.5thplanetgames.com/dotd_live/images/bosses/${ri}.jpg)` } : {})
          .data(msg).attach('to', p);
        if (this.chat.appendChild(p.node)) this.scrollToBottom(true);
      }
    }

    static getMessageHTML(d) {
      let p = new DomNode('p');
      if (d) {
        if (d.mainCls) p.attr({ class: d.mainCls });

        // 1st row (header)
        let hdr = new DomNode('span').attr({ class: 'header' });

        // Time field
        new DomNode('span')
          .attr({ class: 'timestamp' })
          .style({ 'flex-grow': '1' })
          .text(d.ts).attach('to', hdr);
        // Guild tag
        if (d.tag) {
          new DomNode('span')
            .attr({ class: 'sticker' })
            .text(d.tag).attach('to', hdr);
        }

        hdr.attach('to', p);

        // 2nd row
        hdr = new DomNode('span').style({ display: 'block' });

        // Username
        new DomNode('span')
          .attr({
            class: d.userCls,
            username: d.user,
            ign: d.ign
          })
          .text((d.pfx || '') + d.user).attach('to', hdr);
        // IGN
        new DomNode('span')
          .attr({ class: d.ignCls })
          .text(d.ign).attach('to', hdr);
        // Separator
        new DomNode('span')
          .attr({ class: 'separator' })
          .text(': ').attach('to', hdr);
        // Message
        new DomNode('span')
          .attr({ class: 'message hyphenate' })
          .html(d.msg).attach('to', hdr);

        hdr.attach('to', p);
      }
      return p.node;
    }

    static raidMessage(data, pc, uc, pfx) {
      const msg = /(^.*?)(https?...www.kongregate.com.+?action_type.raidhelp.+?)(\s[\s\S]*$|$)/.exec(data.txt);
      if (msg) {
        const r = Util.getRaidFromUrl(msg[2], data.usr.usr);
        if (r) {
          const g = this.getGuildTag(data.usr.gld);
          const v = Config.visited.indexOf(r.id) > -1;
          const d = Util.hasProperty(Config.dead, r.id);
          const m = msg[1] + msg[3];
          const i = Config.data.raidData[r.boss];
          const n = [];
          const s = m ? ':' : '';
          const t = new Date(data.ts).format('mmm d, HH:MM');
          const u = data.usr.usr;
          const ign = data.usr.ign;

          pc.push('raid');
          pc.push(['n', 'h', 'l', 'nm'][r.diff - 1]);
          pc.push(r.id);
          d ? pc.push('dead') : v && pc.push('visited');

          n.push(['N', 'H', 'L', 'NM'][r.diff - 1]);
          n.push(i ? i.sName : r.boss.replace(/_/g, ' ').toUpperCase());

          let l = `{id:'${r.id}',hash:'${r.hash}',boss:'${r.boss}',sid:'${r.sid}'}`;
          l = `return DRMng.Raids.joinOne(${l});`;

          let f = i ? Util.getShortNumK(i.hp[r.diff - 1] * 1000 / i.maxPlayers) : '';
          f = `${i && i.maxPlayers === 90000 ? 'ER/WR' : `FS ${f}`}`;

          return `<p class="${pc.join(' ')}">
                                    <span class="header">
                                        ${g ? `<span class="sticker" style="line-height: 12px;margin-right: 3px;width: 26px;">${g}</span>` : ''}
                                        <span class="timestamp" style="flex-grow: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-right: 3px;">${t}</span>
                                        <a href="${msg[2]}" onclick="${l}" style="font-size: 10px; text-transform: uppercase; flex-shrink: 0;">${n.join(
            ' ')}</a>
                                    </span>
                                    <span style="display: flex">
                                        <span username="${u}" class="${uc.join(' ')}">${pfx}${u}</span>
                                        ${ign ? `<span class="guildname truncate">${ign}</span>` : ''}
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
      if (this.Rooms === undefined) {
        return null;
      } else {
        return this.Rooms.get(name) || null;
      }
    }

    static getActive(nameOnly = false) {
      if (this.Rooms === undefined) {
        return null;
      }
      for (let [name, room] of this.Rooms) {
        if (room.active) return nameOnly ? name : room;
      }
      return null;
    }

    static anyActive() {
      if (this.Rooms === undefined) {
        return false;
      }
      for (let room of this.Rooms.values()) {
        if (room.active) return true;
      }
      return false;
    }

    static createAll() {
      const rooms = Config.data.alliance.rooms;
      rooms.forEach((room, index) => {
        if (room.enabled && this.getChat(room.channel) === null) {
          if (index === 0 && Config.data.alliance.sbs) {
            Log.debug('Setting up default sbs room');
            new this(room, true);
          } else {
            new this(room);
          }
        }
      });
    }

    static add() {
      const elChannel = document.getElementById('DRMng_allianceChnl');
      const elPasswd = document.getElementById('DRMng_alliancePass');

      if (elChannel.classList.contains('default') || elPasswd.classList.contains('default')) {
        return;
      }

      const rooms = Config.data.alliance.rooms;
      let replace = -1;
      rooms.forEach((room, i) => {
        if (room.channel === elChannel.value) replace = i;
      });

      const elName = document.getElementById('DRMng_allianceName');
      const elColor = document.getElementById('DRMng_allianceColor');
      const isDefaultName = elName.classList.contains('default');
      const isDefaultColor = elColor.classList.contains('default');
      const room = {
        channel: elChannel.value,
        pass: elPasswd.value,
        name: isDefaultName ? Util.capitalize(elChannel.value) : elName.value,
        color: isDefaultColor ? '#336699' : elColor.value,
        enabled: true
      };

      this.addOption(room);

      if (replace > -1) {
        Config.data.alliance.rooms[replace] = room;
        const r = this.getChat(room.channel);
        if (r) {
          r.configUpdate(room);
        } else {
          this.createAll();
        }
      } else {
        Config.data.alliance.rooms.push(room);
        this.createAll();
      }
      Config.save();
    }

    static addOption(room) {
      const id = `DRMng_privateChat_room_${room.channel}`;
      const el = new DomNode(`#${id}`);
      if (!el.empty) {
        el.node.firstChild.textContent = room.name;
      } else {
        new DomNode('div')
          .attr({
            class: 'buttonStripe',
            id: id
          })
          .data(new DomNode('span').text(room.name))
          .data(new DomNode('button')
            .attr({ class: 'l' }).text('Del')
            .on('click', () => this.removeChat(id)))
          .attach('to', 'DRMng_privateChat');
      }
    }

    static moveChats() {
      PrivateChat.sbsActive = Config.data.alliance.sbs;

      for (let room of PrivateChat.Rooms.values()) {
        if (PrivateChat.sbsActive) {
          PrivateChat.sbsTabs.appendChild(room.tab);
          PrivateChat.sbsContainer.appendChild(room.body);
        } else {
          room.deactivate();
          room.tabs.insertBefore(room.tab, room.tabActions);
          PrivateChat.container.appendChild(room.body);
        }
      }

      if (PrivateChat.sbsActive) {
        holodeck._chat_window._active_room.show();
        if (!PrivateChat.anyActive()) {
          PrivateChat.Rooms.values().next().value.activate();
        }
      }

      DRMng.UI.setChatWidth();
    }

    static removeChat(chatID) {
      const id = chatID.split('_')[3];
      new DomNode(`#${chatID}`).detach();
      const chat = this.getChat(id);
      if (chat) {
        chat.remove();
        this.Rooms.delete(id);
      }
    }
  }

  window.PrivateChat = PrivateChat;

  /**
   * Kongregate module
   * @type {Kong}
   */
  class Kong {
    /**
     * Removes google spying scripts
     */
    static killScripts() {
      const scripts = document.querySelectorAll('script');
      let counter = 0;
      scripts.forEach(script => {
        if (script.src && script.src.indexOf('google') > 0) {
          script.parentNode.removeChild(script);
          ++counter;
        }
      });
      Log.debug(`{Kong} Removed intrusive script tags (${counter})`);
    }

    /**
     * @typedef {object} kong_ads
     * @property {object} kong_ads._slots
     * @property {boolean} kong_ads._refreshAds
     */

    /**
     * Adjusts kong_ads object
     */
    static killAds() {
      if (typeof kong_ads === 'object') {
        kong_ads._slots = {};
        kong_ads._refreshAds = false;
        Log.debug('{Kong::kong_ads} Adjusted');
      } else {
        setTimeout(() => this.killAds(), 10);
      }
    }

    /**
     * Removes FB Like button placed just above kong chat
     */
    static killFbLike() {
      const like = document.getElementById('quicklinks_facebook');
      if (like) {
        like.parentNode.removeChild(like);
        Log.debug(`{Kong} Removed 'FB like'`);
      } else {
        setTimeout(() => this.killFbLike(), 50);
      }
    }

    /**
     * Removes dealspot object
     */
    static killDealSpot() {
      const dealSpot = document.getElementById('dealspot_banner_holder');
      if (dealSpot) {
        dealSpot.parentNode.removeChild(dealSpot);
        Log.debug(`{Kong} Removed 'Dealspot banner'`);
      } else {
        setTimeout(() => this.killDealSpot(), 50);
      }
    }

    /**
     * Adds reload game and reload chat buttons at the top of the game window
     */
    static addReloadButton() {
      new DomNode('li')
        .attr({ class: 'spritegame' })
        .style({
          'background-position': '0 -280px',
          'cursor': 'pointer'
        })
        .html(`<a onclick="DRMng.postGameMessage('gameReload');">Reload Game</a>`, true)
        .attach('to', 'quicklinks');

      new DomNode('li')
        .attr({ class: 'spritegame' })
        .style({
          'background-position': '0 -280px',
          'cursor': 'pointer'
        })
        .html(`<a onclick="DRMng.postGameMessage('chatReload');">Reload Chat</a>`, true)
        .attach('to', 'quicklinks');
    }

    /**
     * Add Slim button to kong user bar
     */
    static addSlimButton() {
      if (Config.data.kong.kongSlimHeader) {
        document.body.classList.add('slim');
      }
      if (document.getElementById('DRMng_header')) {
        new DomNode('li')
          .data(new DomNode('a')
            .attr({
              id: 'DRMng_KongSlimHeader',
              href: ''
            })
            .text(Config.data.kong.kongSlimHeader ? 'Full' : 'Slim')
            .on('click', this.handleSlimButtonClick))
          .attach('to', 'nav_welcome_box');
      } else {
        setTimeout(() => this.addSlimButton(), 1000);
      }
    }

    static handleSlimButtonClick(event) {
      event.preventDefault();
      event.stopPropagation();
      const isSlim = !Config.data.kong.kongSlimHeader;
      if (isSlim) {
        document.body.classList.add('slim');
        new DomNode('#DRMng_KongSlimHeader').text('Full', true);
      } else {
        document.body.classList.remove('slim');
        new DomNode('#DRMng_KongSlimHeader').text('Slim', true);
      }
      Config.data.kong.kongSlimHeader = isSlim;
      return false;
    }

    static searchFieldIcon() {
      const element = document.getElementById('nav_search_submit_button');
      if (element) {
        element.value = '\uf1c3';
      } else {
        setTimeout(() => this.searchFieldIcon(), 100);
      }
    }

    /**
     * Add container for Side-by-Side private chat window
     */
    static addSbsChatContainer() {
      if (document.getElementById('chat_window')) {
        new DomNode('div')
          .attr({ id: 'private_chat_sbs' })
          .style({ display: 'none' })
          .on('click', PrivateChat.sbsEvent)
          .attach('to', 'chat_tab_pane');
      } else {
        setTimeout(() => this.addSbsChatContainer(), 10);
      }
    }

    /**
     * @typedef {function(*):Node} $
     */

    /**
     * @typedef {object} Element
     * @property {object} Element._insertionTranslations
     * @property {function(Node, Node)} Element._insertionTranslations.after
     * @property {object} Element.Methods
     * @property {function(Node)} Element.Methods.remove
     * @property {function(Element.Methods)} Element.addMethods
     */

    /**
     * Modifies Element object
     */
    static modifyElement() {
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
        Log.debug('{Kong::Element} Patched');
      } else {
        setTimeout(() => this.modifyElement(), 10);
      }
    }

    /**
     * @typedef {object} ChatDialogue
     * @property {number} ChatDialogue.SCROLL_FUDGE
     * @property {number} ChatDialogue._messages_count
     * @property {holodeck} ChatDialogue._holodeck
     * @property {object} ChatDialogue._message_window_node
     * @property {function():number} ChatDialogue._message_window_node.getHeight
     * @property {object} ChatDialogue._user_manager
     * @property {function(string):boolean} ChatDialogue._user_manager.isMuted
     */

    /**
     * Modifies ChatDialogue prototype
     */
    static modifyChatDialogue() {
      if (ChatDialogue) {
        ChatDialogue.prototype.displayUnsanitizedMessage = function (a, b, c, d) {
          // ActiveRoom
          const ar = this._holodeck.chatWindow().activeRoom();
          // AllowMutes
          const am = ar && !ar.canUserModerate(ar.self()) || d.whisper;

          if (!am || !this._user_manager.isMuted(a)) {
            d.self = this._user_manager.username();
            d.pm = {
              sent: d.private || false,
              recv: d.whisper || false
            };
            d.pm.any = d.pm.sent || d.pm.recv;

            const msg = new ChatMessage(b, a, d); // b.a.d message :)

            this.insert(msg.html, null, d.history ? { timestamp: msg.timestamp } : null);
            this._messages_count++;
          }
        };
        ChatDialogue.prototype.displayMessage = ChatDialogue.prototype.displayUnsanitizedMessage;
        ChatDialogue.prototype.serviceMessage = function (cont, raidInfo = null) {
          const msg = new ChatMessage(cont, null, { type: ChatMessage.Type.service });
          if (raidInfo) {
            const FPG_CDN_BASE = 'https://content.5thplanetgames.com/dotd_live/images';
            msg.addClass = ' raidinfo';
            msg.addStyle = `background-image: url(${FPG_CDN_BASE}/bosses/${raidInfo}.jpg);`;
          }
          this.insert(msg.html, null, null);
          this._messages_count++;
        };
        ChatDialogue.prototype.receivedPrivateMessage = function (a) {
          if (a.data.success) {
            this.displayUnsanitizedMessage(a.data.from,
              `${a.data.message} &nbsp;<a class="reply_link" onclick="holodeck.insertPrivateMessagePrefixFor('${a.data.from}');return false;" href="#">(reply)</a>`,
              { class: 'whisper received_whisper' }, { whisper: true });
          } else {
            this.serviceMessage(`${a.data.to} cannot be reached. Please try again later.`);
          }
        };
        ChatDialogue.prototype.sendPrivateMessage = function (a, b) {
          this._user_manager.sendPrivateMessage(a, b);
          this.displayUnsanitizedMessage(a, b, { class: 'whisper sent_whisper' }, { private: true });
        };
        ChatDialogue.prototype.sameTimestamps = (a, b) => Math.trunc(a / 60000) === Math.trunc(b / 60000);
        ChatDialogue.prototype.insert = function (msg, b, opts) {
          const dialogue = this, chat = this._message_window_node;
          const height = chat.getHeight();
          let doScroll = (height > 0) && (height + chat.scrollTop + ChatDialogue.SCROLL_FUDGE >= chat.scrollHeight);

          holodeck.scheduleRender(() => {
            if (opts && opts.timestamp) {
              const newer = Array.from(chat.querySelectorAll('div > p'))
                .filter(node => node.getAttribute('timestamp') > opts.timestamp);

              if (newer.length > 0) {
                chat.insertBefore(msg, newer[0].parentNode);
                doScroll = false;
              } else {
                chat.appendChild(msg);
              }
            } else {
              chat.appendChild(msg);
            }
            doScroll && dialogue.scrollToBottom();
          });
        };
        ChatDialogue.prototype.earliestTimestamp = function () {
          const node = this._message_window_node.querySelectorAll('div > p');
          if (node && node.length > 0) {
            return parseInt(node[0].getAttribute('timestamp')) / 1000;
          } else {
            return Math.trunc(new Date().getTime() / 1000);
          }
        };
        ChatDialogue.prototype.clear = function () {
          const c = this._message_window_node;
          while (c.lastChild && c.lastChild.nodeName === 'DIV') {
            c.removeChild(c.lastChild);
          }
          this._messages_count = 0;
        };
        Log.debug('{Kong::ChatDialogue} Patched');
      } else {
        setTimeout(() => this.modifyChatDialogue(), 10);
      }
    }

    /**
     * @typedef {object} ChatRoom
     * @property {function():boolean} ChatRoom.isActive
     * @property {function()} ChatRoom.updateRoomHeader
     * @property {function(string)} ChatRoom.prototype.checkUserForModeration
     * @property {ChatDialogue} ChatRoom._chat_dialogue
     * @property {object} ChatRoom._unread_message_node
     * @property {function()} ChatRoom._unread_message_node.show
     */

    /**
     * Modifies ChatRoom prototype
     */
    static modifyChatRoom() {
      if (ChatRoom) {
        ChatRoom.prototype.receivedMessage = function (a) {
          this.isActive() || this._unread_message_node.show();
          this.checkUserForModeration(a.data.user.username);
          this._chat_dialogue.displayUnsanitizedMessage(a.data.user.username, a.data.message, {}, {
            characterName: a.data.user.variables.game_character_name,
            timestamp: a.data.timestamp,
            history: a.data.history,
            room: this._room.name,
            type: ChatMessage.Type.fromString(this._room.type)
          });
        };
        ChatRoom.prototype.show = function () {
          if (!PrivateChat.sbsActive && PrivateChat.anyActive()) {
            PrivateChat.getActive().deactivate();
          }
          this._node.show();
          this.updateRoomHeader();
          this._chat_actions_node.show();
          this._tab_for_room.addClassName('active');
          this._unread_message_node.hide();
          this.scrollToBottom();
        };
        ChatRoom.prototype.isActive = function () {
          return !(!PrivateChat.sbsActive && PrivateChat.anyActive()) && (this === this._chat_window.activeRoom());
        };
        Log.debug('{Kong::ChatRoom} Patched');
      } else {
        setTimeout(() => this.modifyChatRoom(), 10);
      }
    }

    /**
     * @typedef {object} KonduitEvent
     * @property {string} ROOM_MESSAGE
     */

    /**
     * @typedef {object} FayeEventDispatcher
     * @property {function(*):boolean} FayeEventDispatcher.checkDuplicateMessage
     * @property {object} FayeEventDispatcher._holodeckEventDispatcher
     * @property {function(object)} FayeEventDispatcher._holodeckEventDispatcher.fire
     */

    /**
     * Modifies FayeEvent (part of guild chat API)
     */
    static modifyFayeEvent() {
      if (FayeEventDispatcher) {
        FayeEventDispatcher.prototype.message = function (a, b) {
          if (this.checkDuplicateMessage(b)) {
            return;
          }
          if (b.kuid === '0') {
            this._holodeckEventDispatcher.fire({
              type: KonduitEvent.SYSTEM_MESSAGE,
              data: {
                data: b.data,
                timestamp: b.timestamp * 1000,
                room: a
              }
            });
          } else {
            this._holodeckEventDispatcher.fire({
              type: KonduitEvent.ROOM_MESSAGE,
              data: {
                history: b.history,
                message: b.text,
                timestamp: b.timestamp * 1000,
                room: a,
                user: FayeUserTransformer.transformUser(b)
              }
            });
          }
        };
        Log.debug('{Kong::FayeEventDispatcher} Patched');
      } else {
        setTimeout(() => this.modifyFayeEvent(), 10);
      }
    }

    /**
     * Modifies FayeHistory (part of guild chat API)
     */
    static modifyFayeHistory() {
      if (FayeHistoryService) {
        FayeHistoryService.prototype.fetchHistory = function (a, b, c) {
          const self = this;
          this._makeAjaxRequest(a, b, c).then(b => {
            $j.each(b.history, (b, c) => {
              c.push(true);
              self.trigger('message', a, FayeMessageTransformer.transform(c));
            });
            self.trigger('history', a, b.history.length);
          });
        };
        Log.debug('{Kong::FayeHistory} Patched');
      } else {
        setTimeout(() => this.modifyFayeHistory(), 10);
      }
    }

    /**
     * Modifies FayeTransformer function (part of guild chat API)
     */
    static modifyFayeTransformer() {
      if (FayeMessageTransformer) {
        FayeMessageTransformer.transform = a => {
          a = {
            version: a[0],
            kuid: a[1],
            uuid: a[2],
            text: a[3],
            timestamp: a[4],
            user_id: a[5],
            username: a[6],
            character_name: a[7],
            level: a[8],
            admin: 0 <= a[10].indexOf('a'),
            developer: 0 <= a[10].indexOf('d'),
            mobile: 0 <= a[10].indexOf('m'),
            premium: 0 <= a[10].indexOf('p'),
            guid: a[9],
            history: a[12] || false,
            type: 'chat'
          };
          if (a.kuid === '0') {
            a.data = JSON.parse(a.text);
            a.type = a.data.type;
          }
          return a;
        };
        Log.debug('{Kong::FayeTransformer} Patched');
      } else {
        setTimeout(() => this.modifyFayeTransformer(), 10);
      }
    }

    /**
     * Modifies chat commands processing inside Holodeck
     */
    static modifyHolodeck() {
      if (Holodeck) {
        Holodeck.prototype.processChatCommand = function (command, ally) {
          const cmd = ((command.match(/^\/([^\s]+)/) || [])[1] || '').toLowerCase();
          if (this._chat_commands[cmd]) {
            const chat = ally ? PrivateChat.getChat(ally) : this;
            return this._chat_commands[cmd].detect(b => !b(chat, command)) === undefined;
          } else {
            return true;
          }
        };
        Log.debug('{Kong::Holodeck} Patched');
      } else {
        setTimeout(() => this.modifyHolodeck(), 10);
      }
    }

    /**
     * Custom chat commands injector
     */
    static addChatCommand(cmd, call) {
      cmd = cmd instanceof Array ? cmd : [cmd];
      cmd.forEach(c => holodeck.addChatCommand(c, call));
    }

    static handleGestureCommand(chat, inputText) {
      const input = /^\/(kiss|hit|poke|slap) (\w+)$/.exec(inputText);
      if (chat && input) {
        const command = Util.capitalize(input[1]);
        const gesture = Gestures[command].generate()
          .replace('@from', UserManager.user.name)
          .replace('@who', input[2]);
        const gestureText = `** ${gesture} **`;

        if (chat instanceof Holodeck) {
          chat.filterOutgoingMessage(gestureText, chat._active_dialogue._onInputFunction);
        } else if (chat instanceof PrivateChat) {
          chat.send(gestureText);
        }
      }
      return false;
    }

    static handlePerceptionCommand(chat, inputText) {
      const input = /.+\s(\d+)(\w?)/.exec(inputText);

      let level = 0;
      if (input) {
        let order = 1;
        if (input[2] === 'k') {
          order = 1000;
        } else if (input[2] === 'm') {
          order = 1000000;
        }
        level = parseInt(input[1]) * order;
      }

      const PERC_DROPS = [
        { val: 1, drop: { color: ['Brown', 'Grey'], perc: [50, 50] } },
        { val: 4000, drop: { color: ['Brown', 'Grey', 'Green'], perc: [33, 34, 33] } },
        { val: 6000, drop: { color: ['Grey', 'Green'], perc: [50, 50] } },
        { val: 10000, drop: { color: ['Grey', 'Green', 'Blue'], perc: [33, 34, 33] } },
        { val: 14000, drop: { color: ['Green', 'Blue'], perc: [50, 50] } },
        { val: 16000, drop: { color: ['Green', 'Blue', 'Purple'], perc: [33, 34, 33] } },
        { val: 18000, drop: { color: ['Blue', 'Purple'], perc: [50, 50] } },
        { val: 22000, drop: { color: ['Blue', 'Purple', 'Orange'], perc: [33, 34, 33] } },
        { val: 24000, drop: { color: ['Purple', 'Orange'], perc: [50, 50] } },
        { val: 30000, drop: { color: ['Orange'], perc: [100] } },
        { val: 33000, drop: { color: ['Orange', 'Red'], perc: [75, 25] } },
        { val: 36000, drop: { color: ['Orange', 'Red'], perc: [50, 50] } },
        { val: 50000, drop: { color: ['Orange', 'Red'], perc: [25, 75] } },
        { val: 70000, drop: { color: ['Red'], perc: [100] } },
        { val: 80000, drop: { color: ['Red', 'Bronze'], perc: [75, 25] } },
        { val: 90000, drop: { color: ['Red', 'Bronze'], perc: [50, 50] } },
        { val: 100000, drop: { color: ['Red', 'Bronze'], perc: [25, 75] } },
        { val: 110000, drop: { color: ['Bronze', 'Silver'], perc: [75, 25] } },
        { val: 120000, drop: { color: ['Bronze', 'Silver'], perc: [50, 50] } },
        { val: 130000, drop: { color: ['Bronze', 'Silver'], perc: [25, 75] } },
        { val: 140000, drop: { color: ['Silver'], perc: [100] } },
        { val: 150000, drop: { color: ['Silver', 'Gold'], perc: [75, 25] } },
        { val: 160000, drop: { color: ['Silver', 'Gold'], perc: [50, 50] } },
        { val: 170000, drop: { color: ['Silver', 'Gold'], perc: [25, 75] } }
      ];

      const COLORS = {
        Brown: '#654737',
        Grey: '#494c53',
        Green: '#106b21',
        Blue: '#31639c',
        Purple: '#684d77',
        Orange: '#d9863a',
        Red: '#be2535',
        Bronze: '#655138',
        Silver: '#6c7a86',
        Gold: '#908059'
      };

      const table = new DomNode('table')
        .attr({ 'cellspacing': '0' })
        .style({ 'width': '100%', 'font-weight': '300', 'font-size': '10px' });

      const lastElement = PERC_DROPS.length - 1;

      PERC_DROPS.forEach((data, index) => {
        if ((data.val >= level) || (index === lastElement)) {
          const row = new DomNode('tr').attach('to', table);

          new DomNode('td')
            .style({
              'background': '#303030',
              'border-right': '1px solid #000000',
              'border-bottom': '1px solid #000000',
              'padding-right': '5px',
              'text-align': 'right',
              'width': '30px'
            })
            .text(data.val > 1000 ? `${data.val / 1000}k` : `${data.val}`)
            .attach('to', row);

          const cell = new DomNode('td')
            .style({ 'border-bottom': '1px solid #000000', 'border-right': '1px solid #000000', 'width': '80%' })
            .attach('to', row);

          const drop = data.drop;

          for (let i = 0; i < drop.color.length; ++i) {
            new DomNode('span')
              .style({
                'width': `${drop.perc[i]}%`,
                'background-color': COLORS[drop.color[i]],
                'display': 'inline-block'
              })
              .text(drop.color[i])
              .attach('to', cell);
          }
        }
      });

      if (chat instanceof Holodeck) {
        chat._active_dialogue.serviceMessage(table.node);
      } else if (chat instanceof PrivateChat) {
        chat.serviceMessage(table.node);
      }

      return false;
    }

    static handleReloadCommand(chat, inputText) {
      const type = /^\/\w+\s?(.*)$/.exec(inputText)[1];
      switch (type) {
        case 'game':
          DRMng.postGameMessage('gameReload');
          break;
        case 'chat':
          DRMng.postGameMessage('chatReload');
          break;
        default:
          window.gameLoader.loadGame('');
      }
      return false;
    }

    static handleGameKillCommand(chat, inputText) {
      const mode = /^\/kill\s?(.*)$/.exec(inputText)[1];
      switch (mode) {
        case 'game':
          DRMng.postGameMessage('killGame');
          break;
        case 'chat':
          DRMng.postGameMessage('killChat');
          break;
        default:
          new DomNode('#gameiframe').attr({ src: '' });
      }
      return false;
    }

    static handleClearChatCommand(chat, inputText) {
      if (chat instanceof Holodeck) {
        chat._active_dialogue.clear();
      } else if (chat instanceof PrivateChat) {
        chat.clear();
      }
      return false;
    }

    static handleWikiCommand(chat, inputText) {
      const searchItem = /^\/wiki (.+)$/.exec(inputText);
      if (searchItem) {
        window.open(`http://dotd.wikia.com/wiki/Special:Search?search=${encodeURI(searchItem[1])}`, '_blank');
      }
      return false;
    }

    static handleEncyclopediaCommand(chat, inputText) {
      const searchItem = /^\/enc (.+)$/.exec(inputText);
      if (searchItem) {
        window.open(`https://mutikt.ml/encyclopedia/#src_${encodeURI(searchItem[1])}`, '_blank');
      }
      return false;
    }

    static handleScriptVersionCommand(chat, inputText) {
      if (chat instanceof Holodeck) {
        chat._active_dialogue.serviceMessage(DRMng.About.versionHtml);
      } else if (chat instanceof PrivateChat) {
        chat.serviceMessage(DRMng.About.versionHtml);
      }
      return false;
    }

    static handleRaidInfoCommand(chat, inputText) {
      const input = /^\/(raid|rd) (.+)$/.exec(inputText);
      let message = 'Wrong /raid or /rd syntax';
      let banner = null;
      if (input) {
        const raidText = input[2].toLowerCase();
        const raidArray = raidText.split(' ');
        const raidData = Config.data.raidData;
        const raidsFound = [];

        Object.entries(raidData).forEach(([linkName, raidData]) => {
          const fullName = raidData.fName.toLowerCase();
          const nameMatch = raidArray.some(name => fullName.includes(name) || linkName.includes(name));
          if (nameMatch) raidsFound.push([linkName, raidData.fName]);
        });

        if (raidsFound.length > 1) {
          message = raidsFound.reduce((msg, raid) =>
            `${msg}<br><span class="DRMng_info_picker ${raid[0]}">${raid[1]} (${raid[0]})</span>`,
            'Multiple results found, pick one:');
        } else if (raidsFound.length === 1) {
          message = DRMng.UI.raidInfo(raidsFound[0][0]);
          banner = data[raidsFound[0][0]].banner;
        } else {
          message = `No info found matching ${raidText}`;
        }
      }

      if (chat instanceof Holodeck) {
        chat._active_dialogue.serviceMessage(message, banner);
      } else if (chat instanceof PrivateChat) {
        chat.serviceMessage(message, banner);
      }

      return false;
    }

    /**
     * Definition of all supported chat commands
     */
    static addChatCommands() {
      if (holodeck && holodeck.ready) {
        this.addChatCommand(['kiss', 'hit', 'poke', 'slap'], this.handleGestureCommand);
        this.addChatCommand('perc', this.handlePerceptionCommand);
        this.addChatCommand(['reload', 'reloaf', 'relaod', 'rl'], this.handleReloadCommand);
        this.addChatCommand('kill', this.handleGameKillCommand);
        this.addChatCommand('clear', this.handleClearChatCommand);
        this.addChatCommand('wiki', this.handleWikiCommand);
        this.addChatCommand('enc', this.handleEncyclopediaCommand);
        this.addChatCommand(['ver', 'version', 'update', 'about'], this.handleScriptVersionCommand);
        this.addChatCommand(['raid', 'rd'], this.handleRaidInfoCommand);
        Log.debug('{Kong} Chat commands added');
      } else {
        setTimeout(() => this.addChatCommands(), 100);
      }
    }

    /**
     * Relocates Chat options button
     */
    static moveChatOptions() {
      const src = document.getElementById('chat_actions_container');
      const dst = document.getElementById('chat_room_tabs');
      if (src && dst) {
        dst.appendChild(src);
      } else {
        setTimeout(() => this.moveChatOptions(), 10);
      }
    }

    /**
     * Call all modifications
     */
    static modifyKongEngine() {
      this.modifyHolodeck();
      this.modifyChatRoom();
      this.modifyChatDialogue();
      this.modifyFayeEvent();
      this.modifyFayeTransformer();
      this.modifyFayeHistory();
      this.modifyElement();
    }

    /**
     * Sets kongregate header width to match game frame
     */
    static setHeaderWidth() {
      document.getElementById('header').style.width = `${document.getElementById('maingame').offsetWidth}px`;
    }

    /**
     * Resize game frame to account for inactive/hidden world chat
     */
    static hideWorldChat() {
      const opts = Config.data.gameFrame;
      new DomNode('#game')
        .style({ width: (opts.hideWChat || opts.removeWChat) ? '760px' : '1025px' });
    }

    static setWrapperWidth(w) {
      const width = w ? `calc(100% - ${w}px)` : '100%';
      new DomNode('#primarywrap').style({ width: width });
      new DomNode('#headerwrap').style({ width: width });
    }

    /**
     * Removes iFrames leaving only one with game
     */
    static killIFrames() {
      document.querySelectorAll('iframe').forEach(ifr => {
        if (ifr.id !== 'gameiframe') ifr.parentNode.removeChild(ifr);
      });
      Log.debug('{Kong} Removed all redundant iFrames');
    }

    static load() {
      document.body.classList.add('premium_user');
      document.body.classList.remove('spotlight_ad_creative-control');
      this.killAds();
      this.killScripts();
      this.killFbLike();
      this.killDealSpot();
      this.addSlimButton();
      this.addReloadButton();
      //this.addSbsChatContainer();
      this.searchFieldIcon();
      this.modifyKongEngine();
      this.addChatCommands();
      this.setWrapperWidth();
      setTimeout(() => this.moveChatOptions(), 500);
      //setTimeout(this.killIframes, 5000);

      // Open Sans font used by scripts theme
      new DomNode('link')
        .attr({
          href: 'https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800',
          rel: 'stylesheet'
        })
        .attach('to', document.head);

      // Kong theme
      new DomNode('link')
        .attr({
          id: 'DRMng_kongCSS',
          href: 'https://cdn.jsdelivr.net/gh/mutik/drmng@2.2.1/kong_dark.css', //href:
          // 'https://mutikt.ml/kong_dark.css',
          rel: 'stylesheet'
        })
        .on('load', () => this.setHeaderWidth())
        .attach('to', document.head);

      Log.info('{Kong} Module loaded');
    }
  }

  window.Kong = Kong;

  window.DRMng = {
    serverAddress: 'wss://mutikt.ml:3000',
    About: class {
      /**
       * @type {string}
       */
      static get name() {
        return 'DotD Raids Manager next gen';
      }

      /**
       * @type {string}
       */
      static get version() {
        return '2.3.0';
      }

      /**
       * @type {string}
       */
      static get versionHtml() {
        return `<b>${this.name}</b><br>version: <b>${this.version}</b><br>` +
          '<a href="https://cdn.jsdelivr.net/gh/mutik/drmng@2/kong_ng.user.js">click me to update</a>';
      }
    }, // TODO: Remove when new one's ready
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
        while (p && p.nodeName !== 'BODY') {
          idx = this.regPanes.indexOf(p.id);
          if (idx > -1) {
            this.pane = p;
            if (this.regSide[idx]) {
              this.regLeft = true;
              this.regRight = false;
            } else {
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
        if (this.pane.id === 'DRMng_main') {
          this.pane.style.setProperty('transition', 'none');
          document.getElementById('primarywrap').style.setProperty('transition', 'none');
          document.getElementById('headerwrap').style.setProperty('transition', 'none');
        }
        this.animate();
      },
      hold: false,
      resetHold: function () {
        this.hold = false;
        //console.log(this);
        if (!(this.right || this.left)) document.body.style.removeProperty('cursor');
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
        if (this.right || this.left) document.body.style.cursor = 'ew-resize';
        //if (this.right || this.left) this.pane.style.cursor = `ew-resize`;
        //else this.pane.style.cursor = `default`;

        this.ev = e;
        this.redraw = true;
      },
      onUp: function () {
        document.body.style.removeProperty('cursor');
        if (this.pane) {
          const p = this.pane;
          let w;
          switch (p.id) {
            case 'chat_container':
              w = parseInt(p.style.width.replace('px', ''));
              Config.data.kong.chatWidth = Config.data.alliance.sbs ? Math.trunc((w - 7) / 2) : w;
              Config.save();
              Kong.setHeaderWidth();
              break;
            case 'DRMng_main':
              Config.data.scriptWidth = parseInt(p.style.width.replace('px', ''));
              Config.save();
              p.style.removeProperty('transition');
              document.getElementById('primarywrap').style.removeProperty('transition');
              document.getElementById('headerwrap').style.removeProperty('transition');
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
          if (this.clicked.right) this.pane.style.width = `${Math.max(Math.trunc(this.x), 200)}px`;
          const w = Math.max(Math.trunc(this.clicked.cx - this.ev.clientX + this.clicked.w), 200);
          if (this.clicked.left) {
            this.pane.style.width = w + 'px';
          }
          if (this.pane.id === 'DRMng_main') Kong.setWrapperWidth(w);
        }
      },
      init: function () {
        document.addEventListener('mousemove', this.onMove.bind(this));
        document.addEventListener('mouseup', this.onUp.bind(this));
        //this.animate();
      }
    }, // TODO: Finish new resizer
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
     * Raids module
     * All raids management related methods
     */
    Raids: {
      flt: {},
      filter: '',
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
        const link = document.getElementById('DRMng_submitRaidLink');
        const r = Util.getRaidFromUrl(link.textContent, UserManager.user.name);
        if (r && !isNaN(+r.id) && r.hash.length === 10) {
          const delayBase = document.querySelector('[group=DRMng_submitDelay].crimson').textContent;
          let delay = parseInt(document.getElementById('DRMng_submitDelay').value);
          switch (delayBase) {
            case 'day':
              delay *= 24;    // break omitted
            case 'hr':
              delay *= 60;     // break omitted
            default:
              delay *= 60000;
          }
          r.delay = delay;
          delete r.sid;
          DRMng.Engine.client.emit('service', {
            action: 'delayedSub',
            data: r
          });
        } else DRMng.UI.submitResponse(0, 'Paste proper raid link before submitting');
        link.textContent = 'Paste raid link here';
        link.className = 'default';
      },
      /**
       * Removes old raids from dead cache
       */
      cleanDeadCache: function () {
        const dead = Config.dead;
        const deadThr = Date.now() - 129600000; // 3 days old

        Object.keys(dead).forEach(d => {
          if (dead[d] < deadThr) {
            delete dead[d];
            this.setVisited(d, true);
          }
        });

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
          const u = UserManager.user;
          if (u.qualified) {
            const authData = `kongregate_user_id=${u.ID}&kongregate_game_auth_token=${u.authToken}`;
            const raidData = `&kv_raid_id=${r.id}&kv_hash=${r.hash}&serverid=${r.sid || (Config.server ===
              'Elyssa' ? '1' : '2')}`;
            const data = {
              eventName: `DRMng.joinRaid${multi ? 's' : ''}`,
              url: `https://dotd-web1.5thplanetgames.com/kong/raidjoin.php?${authData}${raidData}`,
              method: 'GET',
              ext: r,
              timeout: 10000
            };
            DRMng.postMessage(data);
          } else {
            Log.warn('{Raids::join} User not qualified to join', u);
            DRMng.Raids.joined++;
            DRMng.Raids.joinMsg();
          }
        } else {
          Log.warn('{Raids::join} Bad data', r);
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
          name = this.all[i].boss + '_' + this.all[i].diff;
          if (!this.all[i].visited && !this.all[i].isFull && this.filter.indexOf('@' + name) !== -1) {
            this.joinQueue.push(this.all[i]);
            this.ids.push(this.all[i].id);
          }
        }
        // chat raids
        let cr = document.querySelectorAll('p.raid:not(.dead):not(.visited) a'),
          s = Config.data.server.toLowerCase(),
          f = Config.data.filterRaids[s],
          r,
          hf;
        for (i = 0, l = cr.length; i < l; ++i) {
          r = Util.getRaidFromUrl(cr[i].search);
          if (r) {
            hf = f[r.boss] ? !f[r.boss][r.diff - 1] : true;
            if (hf) {
              name = `${r.boss}_${r.diff}`;
              if (this.ids.indexOf(r.id) === -1 && this.filter.indexOf('@' + name) !== -1) {
                this.joinQueue.push(r);
                this.ids.push(r.id);
              }
            }
          }
        }
        this.joinLen = this.joinQueue.length;
        this.isPreparing = false;
        if (this.joinLen > 0 && this.isAuto) this.joinAll(); else DRMng.UI.displayStatus();
      },
      pushToQueue: function (r, useFilter = false) {
        if (this.ids.indexOf(r.id) === -1 && (!useFilter || !r.isFull)) {
          this.joinQueue.push(r);
          this.joinLen++;
          DRMng.UI.displayStatus();
        }
      },
      switchAutoJoin: function () {
        const button = document.getElementById('DRMng_autoJoin');
        if (this.isAuto) {
          this.isAuto = false;
          button.classList.remove('crimson');
        } else {
          this.isAuto = true;
          button.classList.add('crimson');
          setTimeout(() => this.joinAll(), 0);
        }
      },
      joinAll: function () {
        if (this.isJoining || !this.joinLen) {
          return;
        } else if (this.isPreparing) {
          return setTimeout(() => this.joinAll(), 5);
        }

        this.isJoining = true;
        this.joined = 0;

        for (let i = 0, l = Math.min(this.joinLen, 10); i < l; ++i) {
          setTimeout(() => DRMng.Raids.join(this.joinQueue.shift(), true), i);
        }
      },
      joinClick: e => {
        e.preventDefault();
        if (e && e.target) {
          const r = JSON.parse(e.target.getAttribute('data') || 'null');
          if (r) setTimeout(DRMng.Raids.joinOne.bind(DRMng.Raids, r), 0);
        }
        return false;
      },
      joinOne: function (r) {
        if (this.isJoining) {
          setTimeout(() => this.pushToQueue(r), 0);
        } else if (this.isPreparing) {
          setTimeout(() => this.joinOne(r), 5);
        } else {
          setTimeout(() => this.join(r, false), 0);
        }
        return false;
      },
      processJoin: function (id, text) {
        let status = 0;
        if (/successfully (re-)?joined/i.test(text)) {
          setTimeout(() => this.setVisited(id), 0);
          status = 1;
        } else if (/already completed/i.test(text)) {
          setTimeout(() => this.remove(id, true), 0);
          status = 2;
        } else if (/already a member/i.test(text)) {
          setTimeout(() => this.setVisited(id), 0);
          status = 3;
        } else if (/not a member of the guild/i.test(text)) {
          setTimeout(() => this.remove(id, true), 0);
          status = 4;
        } else if (/(invalid|find) raid (hash|ID)/i.test(text)) {
          setTimeout(() => this.remove(id, true), 0);
          status = 5;
        }
        return status;
      },
      joinResponse: e => {
        const data = JSON.parse(e.data);

        if (data && data.status === 200 && data.responseText && data.url) {
          let status = DRMng.Raids.processJoin(data.ext.id, data.responseText);
          let name = Config.data.raidData[data.ext.boss];
          status = ['Unknown', 'Success', 'Dead', 'Already in', 'Wrong Guild', 'Invalid'][status];
          name = name ? name.sName : data.ext.boss;
          DRMng.Raids.joinMsg(`Joining ${name} :: ${status}`);
          Config.save();
          setTimeout(DRMng.Raids.prepareJoining.bind(DRMng.Raids), 0);
        }
      },
      joinMultiResponse: e => {
        DRMng.Raids.joined++;
        const data = JSON.parse(e.data);
        if (data && data.status === 200 && data.responseText && data.url) {
          let status = DRMng.Raids.processJoin(data.ext.id, data.responseText);
          if (DRMng.Raids.joinLen > 1) DRMng.Raids.joinMsg(); else {
            let name = Config.data.raidData[data.ext.boss];
            name = name ? name.sName : data.ext.boss;
            status = ['Unknown', 'Success', 'Dead', 'Already in', 'Wrong Guild', 'Invalid'][status];
            DRMng.Raids.joinMsg(`Joining ${name} :: ${status}`);
          }
        }
        const r = DRMng.Raids.joinQueue.shift();
        if (r) {
          setTimeout(DRMng.Raids.join.bind(DRMng.Raids, r, true), 0);
        } else if (DRMng.Raids.joined === DRMng.Raids.joinLen) {
          DRMng.Raids.isJoining = false;
          Config.save();
          setTimeout(DRMng.Raids.prepareJoining.bind(DRMng.Raids), 0);
        }
      },
      getDiff: diff => {
        diff = diff ? diff.slice(1) : 0;
        return isNaN(+diff) ? ({
          'n': 1,
          'h': 2,
          'l': 3,
          'nm': 4,
          'nnm': 5
        })[diff.toLowerCase()] || 0 : +diff;
      },
      processFilter: function (filterTxt, loading) {
        DRMng.Raids.isAuto && DRMng.Raids.switchAutoJoin();
        if (loading) {
          filterTxt = Config.filterString || '';
        } else {
          Config.filterString = filterTxt;
        }

        const parts = filterTxt.split(/\s?\|\s?|\sor\s|\s?,\s?/ig);
        const regChk = /(\w:)?([\w-]+)(:\w{1,5})?/;
        const regZone = /z(\d{1,2})-(\d{1,2})/;
        const flt = {
          add: {
            raid: [],
            magic: []
          },
          rem: {
            raid: [],
            magic: []
          }
        };
        let mode, raids, diff, reg, i, d, result = [];
        // prepare filters
        parts.forEach(p => {
          mode = p[0] === '-' ? 'rem' : 'add';
          if (mode === 'rem') p = p.slice(1);
          p = regChk.exec(p);
          if (p) switch (p[1]) {
            case 'm:':
              flt[mode].magic.push(p[2]);
              break;
            case 'k:':
              reg = regZone.exec(p[2]);
              raids = [];
              if (reg) for (i = reg[1]; i <= reg[2]; ++i) {
                d = Config.data.filterData[`z${i}`];
                if (d) raids = raids.concat(d);
              } else raids = p[2] === 'all' ? Object.keys(Config.data.raidData) : Config.data.filterData[`${p[2]}`];

              if (raids) {
                diff = this.getDiff(p[3]);
                raids.forEach(r => flt[mode].raid.push([r, diff]));
              }
              break;
            default:
              raids = Config.data.raidData;
              reg = new RegExp(p[2], 'ig');
              diff = this.getDiff(p[3]);
              Object.keys(raids)
                .forEach(r => `${r} ${raids[r].sName}`.search(reg) > -1 && flt[mode].raid.push([r, diff]));
              break;
          }
        });
        // merge
        //Log.out(`debug`, `FILTERS`, filters);
        raids = Config.data.raidData;
        if (flt.add.raid.length > 0) flt.add.raid.forEach(r => {
          i = raids[r[0]];
          i = i ? i.hp : [1, 1, 1, 1];
          if (i[3] !== undefined && [0, 4, 5].indexOf(r[1]) !== -1) result.push(r[0] + '_4');
          if (i[2] !== undefined && [0, 3].indexOf(r[1]) !== -1) result.push(r[0] + '_3');
          if (i[1] !== undefined && [0, 2].indexOf(r[1]) !== -1) result.push(r[0] + '_2');
          if (i[0] !== undefined && [0, 1, 5].indexOf(r[1]) !== -1) result.push(r[0] + '_1');
        }); else Object.keys(raids).forEach(r => {
          i = raids[r];
          i = i ? i.hp.length : 4;
          for (d = 1; d <= i; ++d) {
            result.push(r + '_' + d);
          }
        });

        if (flt.rem.raid.length > 0) flt.rem.raid.forEach(r => {
          i = raids[r[0]];
          i = i ? i.hp : [1, 1, 1, 1];
          const arr = [];
          if (i[3] !== undefined && [0, 4, 5].indexOf(r[1]) !== -1) arr.push(r[0] + '_4');
          if (i[2] !== undefined && [0, 3].indexOf(r[1]) !== -1) arr.push(r[0] + '_3');
          if (i[1] !== undefined && [0, 2].indexOf(r[1]) !== -1) arr.push(r[0] + '_2');
          if (i[0] !== undefined && [0, 1, 5].indexOf(r[1]) !== -1) arr.push(r[0] + '_1');
          arr.forEach(r => {
            d = result.indexOf(r);
            d > -1 && result.splice(d, 1);
          });
        });

        Log.debug('{Raid::Filter} Add filters ::', flt.add.raid.join(', '));
        Log.debug('{Raid::Filter} Sub filters ::', flt.rem.raid.join(', '));

        // UI filter
        const content = `.drm_${result.join(', .drm_')} { display: flex !important; }`;
        Util.style('DRMng_RaidsCSS', content);

        // joining filter
        this.filter = `@${result.join('@')}`;
        if (!this.bootstrap && !this.isJoining) setTimeout(() => this.prepareJoining(), 0);
      },
      setChat: (id, cls) => {
        const list = document.getElementsByClassName(id);
        for (let i = 0, len = list.length; i < len; ++i) {
          list[i].classList.add(cls);
        }
      },
      setVisited: function (id, drop) {
        let idx = Config.visited.indexOf(id);
        if (drop && (idx > -1)) {
          Config.visited.splice(idx, 1);
        } else if (idx === -1) {
          Config.visited.push(id);
          idx = this.getIdx(id);
          if (idx > -1) {
            this.all[idx].visited = true;
            const el = document.getElementById(`DRMng_${id}`);
            if (el) el.className += ' visited';
          }
        }
        if (!drop) this.setChat(id, 'visited');
        Config.save();
      },
      comp: (a, b) => a.hp - b.hp,
      _setComp: function (field) {
        switch (field) {
          case 'id':
            this.comp = (a, b) => parseInt(a.id) - parseInt(b.id);
            break;
          case 'health':
            this.comp = (a, b) => a.hp - b.hp;
            break;
          case 'name': /* by name then by hp */
            this.comp = (a, b) => {
              const an = a.sname || a.boss;
              const bn = b.sname || b.boss;
              if (an < bn) return -1;
              if (an > bn) return 1;
              return a.hp - b.hp;
            };
            break;
          case 'time':
            this.comp = (a, b) => a.createtime - b.createtime;
            break;
          default:
            field = 'health';
            this.comp = (a, b) => a.hp - b.hp;
            Config.data.sortBy = field;
        }
      },
      setComp: function (field) {
        if (this.locked || this.bootstrap) {
          setTimeout(DRMng.Raids.setComp.bind(this, field), 10);
          return;
        }
        this.locked = true;

        this._setComp(field);
        Config.data.sortBy = field;
        this.sort();

        DRMng.UI.clearRaidList();
        this.all.forEach(r => DRMng.UI.addRaidField(r));

        this.locked = false;
      },
      get: function (id) {
        return this.all[this.getIdx(id)] || null;
      },
      getIdx: function (id) {
        for (let i = 0, len = this.all.length; i < len; ++i) {
          if (this.all[i].id == id) return i;
        }
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
        this.flt = Config.filterRaids;

        const visitedData = Config.visited;
        const raidsData = Config.data.raidData;

        raids.forEach(raid => {
          const hf = this.flt[raid.boss] || false;
          if (!hf || !hf[raid.diff - 1]) {
            raid.createtime = new Date(raid.createtime).getTime();
            if (visitedData.indexOf(raid.id) > -1) {
              raid.visited = true;
              this.setChat(raid.id, 'visited');
            }
            const raidData = raidsData[raid.boss];
            raid.isFull = raidData && raid.participants && (raidData.maxPlayers === raid.participants);
            DRMng.Raids.all.push(raid);
          }
        });

        this._setComp(Config.data.sortBy);
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
            const rd = Config.data.raidData[raid.boss];
            raid.visited = Config.visited.indexOf(raid.id) > -1;
            raid.isFull = rd && raid.participants && (rd.maxPlayers === raid.participants);
            this.all.splice(idx, 0, raid);
            DRMng.UI.addRaidField(raid, idx);
            this.count++;
            DRMng.UI.displayStatus();
            if (!raid.visited && !raid.isFull && this.filter.indexOf(`@${raid.boss}_${raid.diff}`) > -1) {
              if (this.isJoining) setTimeout(this.pushToQueue.bind(this, raid), 0); else setTimeout(
                this.prepareJoining.bind(this), 0);
            }
          }
        }

        this.locked = false;
      },
      setDead: function (id, save) {
        if (!this.getDead(id)) {
          Config.dead[id] = new Date().getTime();
          if (save) Config.save();
        }
      },
      getDead: function (id) {
        return Util.hasProperty(Config.dead, id);
      },
      remove: function (id, serverNuke) {
        if (this.locked || this.bootstrap) {
          setTimeout(this.remove.bind(this, id, serverNuke), 10);
          return;
        }
        this.locked = true;

        serverNuke && DRMng.Engine.client.emit('service', {
          action: 'raidNuke',
          data: id
        });

        this.setDead(id);

        let i = this.getIdx(id);
        if (i > -1) {
          const r = this.get(id);
          this.all.splice(i, 1);
          this.count--;
          if (!this.isJoining && this.filter.indexOf('@' + r.boss + '_' + r.diff) > -1) setTimeout(
            this.prepareJoining.bind(this), 10);
        }
        DRMng.UI.removeRaidField(id);

        this.setChat(id, 'dead');
        DRMng.UI.displayStatus();

        this.locked = false;
      },
      update: function (raid, full) {
        if (this.locked || this.bootstrap) {
          setTimeout(DRMng.Raids.update.bind(this, raid, full), 10);
          return;
        }
        this.locked = true;

        let r = this.get(raid.id);
        if (r && !this.getDead(raid.id)) {
          const keys = ['hp', 'participants', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'];
          full && keys.push('mnum', 'size');

          const rd = Config.data.raidData[r.boss];

          r = Util.copyFields(raid, r, keys);

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
          if (r.isFull && !this.isJoining && this.filter.indexOf('@' + r.boss + '_' + r.diff) > -1) setTimeout(
            this.prepareJoining.bind(this), 0);
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
        setTimeout(() => this.cleanDeadCache(), 60000);
        Log.info('{Raids} Module loaded');
      }
    },
    /**
     * Engine module
     * Backend event driven communication
     */
    Engine: {
      client: null,
      changeServer: server => {
        if (typeof server !== 'string') {
          server = (Config.server === 'Elyssa' ? 'Kasan' : 'Elyssa');
        }
        Log.info('{Engine} Changing server to <%s>', server);
        DRMng.Engine.client.disconnect();
        Config.data.server = server;
        DRMng.Engine.client.nsp = `/${server}`;
        DRMng.Raids.processFilter('', true);
        DRMng.UI.setupFilterBox();
        DRMng.UI.setupFilterTab();
        DRMng.UI.displayStatus('Loading...');
        document.getElementById('DRMng_server').innerText = server;
        setTimeout(DRMng.Engine.client.connect.bind(DRMng.Engine.client), 1000);
      },
      reconnect: () => {
        DRMng.Engine.client.disconnect();
        setTimeout(DRMng.Engine.client.connect.bind(DRMng.Engine.client), 1000);
      },
      init: () => {
        if (typeof io === 'function' && UserManager.user.qualified) {
          DRMng.Engine.client = io
            .connect(`${DRMng.serverAddress}/${Config.data.server}`, {
              secure: true,
              transports: ['websocket'],
              query: { user: UserManager.user.name }
            })
            .on('error', data => Log.warn('{Engine} Error ::', data))
            .on('msg', DRMng.Engine.handleMessage)
            .on('service', DRMng.Engine.handleService)
            .on('disconnect', () => Log.warn('{Engine} Socket client disconnected.'))
            .on('connect', () => {
              Log.info('{Engine} Socket connection established, joining...');
              DRMng.Engine.client.emit('join', {
                usr: UserManager.user.name,
                ign: UserManager.user.IGN,
                gld: UserManager.user.guild,
                chk: Config.data.checkSums
              });
            });
        } else {
          Log.debug('{Engine} Resources not ready, trying again in 1 sec...');
          setTimeout(DRMng.Engine.init, 1000);
        }
      },
      handleMessage: message => Log.info(`{Engine::Message} ${message.txt}`),
      handleService: d => {
        if (!d) return;
        const config = Config.data;
        const action = d.action;
        const data = d.data;

        switch (action) {
          case 'raidData':
            if (config.checkSums.raidData !== data.raidDataHash && data.raidDataHash.length > 6) {
              Log.info('{Engine::Service} New raids data. Old hash ' +
                `<${config.checkSums.raidData}> | New hash <${data.raidDataHash}>`);
              config.raidData = data.raidData;
              config.checkSums.raidData = data.raidDataHash;
            }
            setTimeout(DRMng.UI.setupFilterTab.bind(DRMng.UI), 0);
            break;
          case 'filterData':
            if (config.checkSums.filterData !== data.filterDataHash && data.filterDataHash.length > 6) {
              Log.info('{Engine::Service} New keywords data. Old hash ' +
                `<${config.checkSums.filterData}> | New hash <${data.filterDataHash}>`);
              config.filterData = data.filterData;
              config.checkSums.filterData = data.filterDataHash;
            }
            break;
          case 'tiersData':
            if (config.checkSums.tiersData !== d.data.tiersDataHash && d.data.tiersDataHash.length > 6) {
              Log.info('{Engine::Service} New tiers data. Old hash <%s> | New hash <%s>', config.checkSums.tiersData,
                data.tiersDataHash);
              config.tiersData = JSON.parse(data.tiersData);
              config.checkSums.tiersData = data.tiersDataHash;
            }
            break;
          case 'bootStrap':
            Log.info(`{Engine::Service} Raids feed <${d.raids.length}>`);
            setTimeout(DRMng.Raids.insertAll.bind(DRMng.Raids, d.raids), 0);
            break;
          case 'newRaid':
            setTimeout(DRMng.Raids.insert.bind(DRMng.Raids, d.data), 0);
            break;
          case 'nukedRaid':
            setTimeout(DRMng.Raids.remove.bind(DRMng.Raids, d.data), 0);
            break;
          case 'partialUpdate':
            setTimeout(DRMng.Raids.update.bind(DRMng.Raids, d.data, false), 0);
            break;
          case 'fullUpdate':
            setTimeout(DRMng.Raids.update.bind(DRMng.Raids, d.data, true), 0);
            break;
          case 'delayedSub':
            setTimeout(DRMng.UI.submitResponse.bind(DRMng.UI, d.data.error ? 0 : 1, d.data.msg), 0);
            break;
          default:
            Log.warn('{Engine::Service} Unknown action => ', action);
        }
      }
    },
    UI: {
      Groups: {},
      Group: function (alias, title, visible) {
        this.fields = [];
        this.html = null;
        this.cont = null;
        this.setup = function (alias, title, visible) {
          if (alias && title) {
            visible = visible || false;
            let groupDiv = document.createElement('div');
            groupDiv.setAttribute('class', visible ? 'group flex' : 'group flex hide');
            groupDiv.setAttribute('group', 'option');
            let titleDiv = document.createElement('div');
            titleDiv.setAttribute('class', 'title');
            titleDiv.addEventListener('click', DRMng.UI.roll.bind(this, titleDiv));
            titleDiv.innerHTML = '' + title;
            let contentDiv = document.createElement('div');
            groupDiv.appendChild(titleDiv);
            groupDiv.appendChild(contentDiv);
            this.cont = contentDiv;
            this.html = groupDiv;
            DRMng.UI.Groups[alias] = this;
            document.getElementById('DRMng_Options').appendChild(this.html);
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
        this.group = '';
        this.field = '';
        this.type = '';
        let _title = '', _desc = '';
        this.setup = function (alias, title, type = 'bool', value) {
          if (alias !== null) {
            const defaults = {
              bool: false,
              number: 0,
              object: {}
            };
            let name = alias.split('_');
            this.group = name[0] || 'other';
            this.field = name[1] || alias;
            this.type = type;
            _title = title || this.field;
            if (type !== 'action') {
              if (Config.data[this.group] === undefined) Config.data[this.group] = {};
              this.conf = Config.data[this.group];
              if (this.conf[this.field] === undefined) this.conf[this.field] = value || defaults[type];
            }
          }
          return this;
        };
        this.getConf = function () {
          return this.conf[this.field];
        };
        this.flipConf = function () {
          this.conf[this.field] = !this.conf[this.field];
          Config.save();
        };
        this.desc = function (desc) {
          if (desc) _desc = desc;
          return this;
        };
        this.event = function (callback) {
          if (callback && typeof callback === 'function') this.cbFn = callback;
          return this;
        };
        this.make = function (group, skipCb = false, name = 'Apply') {

          let optionDiv = document.createElement('div');
          optionDiv.setAttribute('class', 'buttonStripe');
          optionDiv.setAttribute('style', 'flex-wrap: wrap; overflow: hidden; max-height: 74px;');

          let titleField = document.createElement('span');
          titleField.setAttribute('style', 'background-color: #444; font-size: 9pt;');
          titleField.innerHTML = '' + _title;

          let button = document.createElement('button');
          if (this.type === 'bool') {
            button.setAttribute('class', this.getConf() ? 'n' : 'l');
            button.textContent = this.getConf() ? 'On' : 'Off';
          } else {
            button.classList.add('n');
            button.textContent = name;
          }
          button.setAttribute('style', 'border-left-color: #3a3a3a;');
          button.addEventListener('click', function (e) {
            if (this.type === 'bool') {
              this.flipConf();
              e.target.setAttribute('class', this.getConf() ? 'n' : 'l');
              e.target.innerHTML = this.getConf() ? 'On' : 'Off';
            }
            if (typeof this.cbFn === 'function') this.cbFn.call(this, e);

          }.bind(this));

          optionDiv.appendChild(titleField);
          optionDiv.appendChild(button);

          if (typeof this.cbFn === 'function' && !skipCb) this.cbFn.call(this, { target: button });

          if (_desc) {
            let descField = document.createElement('div');
            descField.setAttribute('style', 'border-top: 1px solid #404040; background-color:' +
              ' #505050; padding: 3px 6px; border-left: 0; font-size: 10px; font-style:' +
              ' italic; max-height: 45px; overflow: hidden; color: #fff; font-weight: 300;');
            descField.innerHTML = '' + _desc;
            optionDiv.appendChild(descField);
          }

          this.html = optionDiv;

          if (group && group instanceof DRMng.UI.Group) group.add(this);

          return this;
        };
        this.makeSbButton = btn => {
          btn = btn || {
            name: 'X',
            command: ''
          };
          return new DomNode('div')
            .data(new DomNode('span').text('\uf2f9').on('click', e => {
              const el = e.target.parentNode;
              el.parentNode.insertBefore(el.nextSibling, el);
            }))
            .data(new DomNode('span').text('\uf2fc').on('click', e => {
              const el = e.target.parentNode;
              el.parentNode.insertBefore(el, el.previousSibling);
            }))
            .data(new DomNode('input').attr({
              type: 'text',
              value: btn.name,
              class: 'inp_fld'
            }))
            .data(new DomNode('input').attr({
              type: 'text',
              value: btn.command,
              class: 'inp_cmd'
            }))
            .data(new DomNode('span').attr({ class: 'red' }).text('\uf270').on('click', e => {
              const el = e.target.parentNode;
              el.parentNode.removeChild(el);
            }));
        };
        this.makeSbGroup = grp => {
          grp = grp || { name: 'Group' };
          const el = new DomNode('div')
            .attr({ class: 'drmng_config_sb' })
            .data(new DomNode('div')
              .data(new DomNode('span').text('\uf2f9').on('click', e => {
                const el = e.target.parentNode.parentNode;
                el.parentNode.insertBefore(el.nextSibling, el);
              }))
              .data(new DomNode('span').text('\uf2fc').on('click', e => {
                const el = e.target.parentNode.parentNode;
                el.parentNode.insertBefore(el, el.previousSibling);
              }))
              .data(new DomNode('input').attr({
                type: 'text',
                value: grp.name,
                class: 'inp_grp'
              }))
              .data(new DomNode('span').attr({ class: 'del_grp red' }).text('\uf272')
                .on('click', e => {
                  const el = e.target.parentNode.parentNode;
                  el.parentNode.removeChild(el);
                }))
              .data(new DomNode('span').attr({ class: 'add_grp' }).text('\uf277')
                .on('click', e => this.makeSbGroup()
                  .attach('before', e.target.parentNode.parentNode)))
              .data(new DomNode('span').text('\uf275')
                .on('click', e => this.makeSbButton()
                  .attach('to', e.target.parentNode.parentNode))));
          if (grp.buttons) grp.buttons.forEach(btn => el.data(this.makeSbButton(btn))); else el.data(
            this.makeSbButton());
          return el;
        };
        this.makeSb = function (group, data) {
          /*const grp = new DomNode(`div`)
           .attr({class: `drmng_config_sb`})
           .data(new DomNode(`div`)
           .data(new DomNode(`span`).text(`\uf2f9`))
           .data(new DomNode(`span`).text(`\uf2fc`))
           .data(new DomNode(`input`).attr({type: `text`, value: data.name, class: `inp_grp`}))
           .data(new DomNode(`span`).attr({class: `del_grp red`}).text(`\uf272`)
           .on(`click`, () => this.html.parentNode.removeChild(this.html)))
           .data(new DomNode(`span`).text(`\uf275`)
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
          this.conf = Config.data.sidebar.data;
          if (this.conf === undefined) {
            this.conf = {
              groups: [
                {
                  name: 'Info',
                  hidden: false,
                  buttons: [
                    {
                      name: 'Emall',
                      action: 'chat',
                      command: '/raid elite mall'
                    },
                    {
                      name: 'Cecil',
                      action: 'chat',
                      command: '/raid elite cecil'
                    },
                    {
                      name: 'Mang',
                      action: 'chat',
                      command: '/raid elite mangler'
                    }
                  ]
                }, {
                  name: 'Sheet',
                  hidden: true,
                  buttons: [
                    {
                      name: 'Proc',
                      action: 'www',
                      command: 'https://docs.google.com/spreadsheets/d/1YTbJ0wgJUygdmix6a8BzLThrHhDINX943aadjboOTj8'
                    }, {
                      name: 'Magic',
                      action: 'www',
                      command: 'https://docs.google.com/spreadsheets/d/1O0eVSnzlACP9XJDq0VN4kN51ESUusec3-gD4dKPHRNU'
                    }, {
                      name: 'TiersI',
                      action: 'www',
                      command: 'https://docs.google.com/spreadsheets/d/10a8qCq5zgyR-kAOq-kuKuttADfU16aVWxgTCf9Eu4b8'
                    }, {
                      name: 'TiersII',
                      action: 'www',
                      command: 'https://docs.google.com/spreadsheets/d/1Zgv90jaHZCSEvpYdG5BF42djCEcgPxjEdCwosQRTbIQ'
                    }, {
                      name: 'Keyki',
                      action: 'www',
                      command: 'https://docs.google.com/spreadsheets/d/1ownIOYtDgha_5RwmVM_RfHIwk16WeMZJry5wz9-YNTI'
                    }
                  ]
                }
              ],
              buttons: [
                {
                  name: 'Join',
                  action: 'func',
                  command: 'DRMng.Raids.joinAll'
                },
                {
                  name: 'Kill',
                  action: 'chat',
                  command: '/kill'
                },
                {
                  name: 'Server',
                  action: 'func',
                  command: 'DRMng.Engine.changeServer'
                }
              ]
            };
            Config.data.sidebar.data = this.conf;
            Config.save();
          }
          setTimeout(DRMng.UI.setupSidebar.bind(DRMng.UI), 0);
        }

        make(group) {
          this.conf.groups.forEach(grp => new DRMng.UI.Option().makeSb(group, grp));
          new DRMng.UI.Option().makeSb(group, {
            name: 'Buttons',
            buttons: this.conf.buttons
          });
        }
      },
      addRaidField: function (r, idx) {
        const raidInfo = Config.data.raidData[r.boss];
        // classes
        const cls = ['drm_' + r.boss + '_' + r.diff];
        cls.push(['n', 'h', 'l', 'nm'][r.diff - 1]);
        r.visited && cls.push('visited');
        r.isFull && cls.push('full');

        const hp = raidInfo && raidInfo.isEvent ? '\u221e' : `HP: ${(r.hp * 100).toPrecision(3).slice(0, 4)}%`;

        // main elem
        const raidElement = new DomNode('div')
          .attr({
            id: `DRMng_${r.id}`,
            class: cls.join(' ')
          })
          .data(new DomNode('span').text(raidInfo ? raidInfo.sName : r.boss.replace(/_/g, ' ')))
          .data(new DomNode('span').text(hp))
          .on('mouseenter', DRMng.UI.infoEvent);

        const list = new DomNode('#DRMng_RaidList');
        if (list.empty) return;

        const childLength = list.node.childNodes.length;
        if ((idx === undefined) || (idx === childLength)) {
          raidElement.attach('to', list);
        } else {
          raidElement.attach('before', list.node.childNodes[idx]);
        }

        if (list.node.scrollTop < 20) {
          list.node.scrollTop = 0;
        }
      },
      removeRaidField: id => {
        new DomNode(`#DRMng_${id}`).detach();
      },
      clearRaidList: () => {
        new DomNode('#DRMng_RaidList').clear();
      },
      statusTimer: null,
      displayStatus: function (msg) {
        const status = document.getElementById('DRMng_status');
        if (!msg && (!this.statusTimer || this.statusTimer.timeLeft <= 0)) {
          if (DRMng.Raids.joinLen > 0) status.textContent =
            DRMng.Raids.count + ' raids, ' + DRMng.Raids.joinLen + ' selected'; else status.textContent =
              DRMng.Raids.count + ' raids in list';
          this.statusTimer = null;
        } else if (msg) {
          status.innerText = msg;
          if (this.statusTimer) this.statusTimer.restart(); else this.statusTimer =
            new Timer(DRMng.UI.displayStatus.bind(this), 4000);
        }
      },
      submitResponseTimeout: 0,
      submitResponse: function (mode, msg) {
        clearTimeout(this.submitResponseTimeout);
        let respDiv = document.getElementById('DRMng_submitResponse');
        msg = msg || 'Unidentified event occurred';
        switch (mode) {
          case 0:
            mode = ' error';
            break;
          case 1:
            mode = ' success';
            break;
          default:
            mode = ' regular';
            break;
        }
        if (respDiv) {
          respDiv.innerHTML = msg;
          respDiv.className += mode;
        }
        this.submitResponseTimeout = setTimeout(function () {
          document.getElementById('DRMng_submitResponse').className = 'textField';
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
                #DRMng_RaidList > div.visited {\
                    display: none;\
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
                div#chat_room_tabs > div.drmng_room_tab.active:nth-last-child(2),
                div#private_chat_sbs_tabs > div:last-child {\
                    border-right: 0;\
                }\
                #private_chat_sbs {\
                    border: 1px solid #222;\
                    display: flex;\
                    align-items: flex-end;\
                    margin-left: 7px;\
                    box-shadow: 0 0 10px -4px #000;\
                    flex-direction: column;\
                }\
                #private_chat_sbs div.users_in_room { height: 123px; }\
                .drmng_scroll_wrapper {\
                    overflow: hidden;\
                    width: 100%;\
                    height: 100%;\
                    position: relative;\
                    z-index: 1;\
                    float: left;\
                }\
                div#private_chat_sbs_tabs {\
                    padding-bottom: 3px;
                    width: 100%;
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
                div.userlist {\
                    display: flex;\
                    margin: 1px 2px;\
                    align-items: center;\
                }\
                div.userlist > span.guildtag {\
                    font-size: 9px;\
                    background-color: #4a4a4a;\
                    color: #ddd;\
                    line-height: 11px;\
                    padding: 1px 0 0;\
                    font-weight: 700;\
                    width: 30px;\
                    text-align: center;\
                    text-shadow: 0 0 5px #333;\
                    flex-grow: 0;\
                    flex-shrink: 0;\
                    margin-right: 5px;\
                    border: 1px solid #363636;\
                }\
                div.userlist > span.username {\
                    flex-grow: 0;
                    flex-shrink: 0;
                    color: #f0f0f9;
                    margin-right: 4px;
                    padding-bottom: 1px;
                }\
                div.userlist > span.userign {
                    flex-grow: 1;
                    flex-shrink: 1;
                    color: #ddd;
                    font-style: italic;
                    padding-bottom: 1px;
                    text-overflow: ellipsis;
                    overflow: hidden;
                }
                `;
        const isFF = navigator.userAgent.match(/Firefox\/(\d+)/);
        if (isFF && parseInt(isFF[1]) > 64) {
          content += '\
                    div#kong_game_ui div.chat_message_window,\
                    div#kong_game_ui div.users_in_room,\
                    div#kong_game_ui div.chat_controls textarea.chat_input,\
                    #DRMng_content div.group.flex > div:last-child,\
                    #DRMng_content div.group.flexible {\
                        scrollbar-color: #4a4a4a #2a2a2a;\
                        scrollbar-width: thin;\
                    }\
                    ';
        }

        Util.style('DRMng_CSS', content);

        // raid list filtering css
        Util.style('DRMng_RaidsCSS', 'dummy');
        DRMng.Raids.processFilter('', true);
      },
      setupFilterBox: () => {
        const fst = Config.filterString;
        new DomNode('#DRMng_txtFilter')
          .attr({ class: fst ? '' : 'default' }).text(fst || 'Filter raids here', true);
      },
      setupFilterTab: raidData => {
        const flt = Config.filterRaids;
        const raids = raidData || Config.data.raidData;
        const fltDivs = [
          document.getElementById('DRMng_filterSmall'), document.getElementById('DRMng_filterMedium'),
          document.getElementById('DRMng_filterLarge'), document.getElementById('DRMng_filterEpic'),
          document.getElementById('DRMng_filterColossal'), document.getElementById('DRMng_filterGuild'),
          document.getElementById('DRMng_filterGigantic')
        ];
        fltDivs.forEach(div => {
          if (div) {
            while (div.firstChild) {
              div.removeChild(div.firstChild);
            }
          }
        });

        Object.keys(raids).forEach(k => {
          const r = raids[k];
          if (!r.isEvent || r.isGuild) {
            if (flt[k] === undefined) flt[k] = new Array(4).fill(false);
            const el = new DomNode('div')
              .attr({
                class: 'buttonStripe',
                id: `DRMng_filter_${k}`
              })
              .data(new DomNode('span').text(r.fName))
              .on('click', DRMng.UI.applyFilter)
              .attach('to', fltDivs[r.isGuild ? 5 : r.size]);

            new Array(4).fill(0).forEach((_, d) => new DomNode('button')
              .attr({ class: `${['n', 'h', 'l', 'nm'][d]} ${flt[k][d] ? 'off' : 'on'}` })
              .text(flt[k][d] ? 'Off' : 'On').attach('to', el));
          }
        });
      },
      applyDiffFilter: function (id) {
        let mode = id && id.split('_');
        if (mode[0] === 'DRMngFilter') {
          let diff = parseInt(mode[2]);
          mode = parseInt(mode[1]);
          if (diff > 0 && mode > 0) {
            mode = !!(mode - 1);
            diff = diff - 1;
            let server = Config.data.server.toLowerCase();
            let flt = Config.data.filterRaids[server];
            let fk = Object.keys(flt);
            for (let i = 0, len = fk.length; i < len; ++i) {
              flt[fk[i]][diff] = mode;
            }
            Config.save();
            DRMng.UI.setupFilterTab();
            document.getElementById('DRMng_filterApply').parentNode.removeAttribute('style');
          }
        }
      },
      applyFilter: function (e) {
        let el = e.target;
        if (el.tagName !== 'SPAN' && el.tagName !== 'BUTTON') el = el.children[0];
        let server = Config.data.server.toLowerCase();
        let btns = el.parentNode.getElementsByTagName('BUTTON');
        let id = el.parentNode.id.substr(13);
        let spanHit = el.tagName === 'SPAN';
        let flt = Config.data.filterRaids[server][id];
        let i, diff;

        if (spanHit) {
          let flts = 0;
          for (i = 0; i < 4; ++i) {
            if (flt[i]) flts += 1 << i;
          }
          diff = (flts !== 15 && flts !== 0) ? flts : 15;
        } else diff = {
          n: 1,
          h: 2,
          l: 4,
          nm: 8
        }[el.className.split(' ')[0]];

        for (i = 0; i < 4; ++i) {
          if (diff & (1 << i)) {
            flt[i] = !flt[i];
            btns[i].innerText = flt[i] ? 'Off' : 'On';
            btns[i].className = btns[i].className.split(' ')[0] + ' ' + btns[i].innerText.toLowerCase();
          }
        }

        document.getElementById('DRMng_filterApply').parentNode.removeAttribute('style');

        Config.save();
      },
      sidebarLabelOpen: e => {
        document.querySelectorAll('#DRMng_Sidebar > div.label:not(.hidden)')
          .forEach(lbl => lbl.className += ' hidden');
        e.target.className = 'label';
      },
      setupSidebarButton: button => {
        if (!button || !button.name) return null;

        const btn = new DomNode('button').text(button.name);
        let fn, th;
        if (button.command) {
          switch (button.action) {
            case 'func':
              fn = button.command.split(',');
              th = fn[0].split('.').reduce((a, v, i, o) => (i < o.length - 1 ? a[v] : a), window);
              btn.on('click', (fn[0].split('.').reduce((a, v) => a[v], window)).bind(th, ...fn.slice(1)));
              break;
            case 'chat':
              btn.on('click', () => holodeck.processChatCommand(button.command, PrivateChat.getActive(true)));
              break;
            case 'www':
              btn.on('click', () => window.open(button.command));
              break;
          }
        }
        return btn.node;
      },
      setupSidebar: function () {
        let left = true;
        let sb = document.getElementById('DRMng_Sidebar');
        if (sb) new DomNode(sb).clear(); else sb = new DomNode('div').attr({ id: 'DRMng_Sidebar' }).node;
        const scData = Config.data.sidebar.data;

        // sidebar buttons routine
        let div, button;
        for (let group of scData.groups) {
          div = document.createElement('div');
          div.className = 'label';
          if (group.hidden) div.className += ' hidden';
          div.innerText = group.name;
          sb.appendChild(div);
          div = document.createElement('div');
          div.className = 'group';
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

        let parent = document.querySelector('#chat_container_cell');
        if (left) parent.insertBefore(sb, parent.children[0]); else parent.appendChild(sb);
        let labels = document.querySelectorAll('#DRMng_Sidebar > div.label');
        let labLen = labels.length;
        for (let i = 0; i < labLen; ++i) {
          labels[i].addEventListener('click', this.sidebarLabelOpen);
        }
        let grpButtLen = document.querySelectorAll('#DRMng_Sidebar > div > button').length;
        let staButtLen = document.querySelectorAll('#DRMng_Sidebar > button').length;
        let sbLen = labLen * 26 + grpButtLen * 23 + staButtLen * 23;
        if (sbLen > 690) sb.className = 'flex';
      },
      setChatWidth: () => {
        const el = document.getElementById('chat_container');
        if (el) {
          const sc = PrivateChat.sbsContainer;
          const a = Config.data.alliance.sbs && sc && sc.childElementCount > 1;
          const width = Config.data.kong.chatWidth;
          if (a) {
            if (sc) sc.style.removeProperty('display');
            el.style.width = `${width * 2 + 7}px`;
          } else {
            if (sc) sc.style.setProperty('display', 'none');
            el.style.width = `${width}px`;
          }
        }
      },
      loadDefaults: function () {
        let val;

        // Chat width
        this.setChatWidth();

        // Script width
        val = document.getElementById('DRMng_main');
        if (val) {
          val.className = 'hidden';
          val.style.width = `${Config.data.scriptWidth}px`;
        }

        // Filtering
        this.setupFilterBox();
        this.setupFilterTab();

        // Sorting
        document.querySelectorAll('#DRMng_sortOrderBy > button').forEach(el => {
          if (el.textContent.toLowerCase() === Config.data.sortBy) {
            el.className = 'active';
          }
        });

        // Private Chats
        Config.data.alliance.rooms.forEach(room => PrivateChat.addOption(room));
      },
      loadOptions: function () {
        let group, opt;

        group = new this.Group('kongui', 'Kongregate', true);

        opt = new this.Option();
        opt.setup('kongui_stickyHeader', 'Sticky header', 'bool', true)
          .desc('Makes top header always visible on screen.')
          .event(function () {
            if (this.conf[this.field]) {
              new DomNode('#headerwrap').detach().attach('before', 'primarywrap');
              Css.del(this.field);
              Css.del(this.field + 'b');
            } else {
              new DomNode('#headerwrap').detach().attach('before', 'tr8n_language_selector_trigger');
              Css.add(this.field, 'div#headerwrap', 'width: 100% !important');
              Css.add(this.field + 'b', 'div#primarywrap', 'height: 100% !important');
            }
          })
          .make(group);

        opt = new this.Option();
        opt.setup('kongui_hideToolbar', 'Hide game toolbar', 'bool', false)
          .desc('Hides toolbar located above game window (cinematic mode, rating, etc).')
          .event(function () {
            if (this.conf[this.field]) Css.add(this.field, 'table.game_table > tbody > tr:first-child',
              'display: none'); else Css.del(this.field);
          })
          .make(group);

        opt = new this.Option();
        opt.setup('kongui_hideFrame', 'Hide game frame', 'bool', false)
          .desc('Hides 7px wide frame around game window.')
          .event(function () {
            if (this.conf[this.field]) Css.add(this.field, 'div#maingame', 'padding: 0'); else Css.del(this.field);
          })
          .make(group);

        opt = new this.Option();
        opt.setup('kongui_hideGameDetails', 'Hide game details', 'bool', false)
          .desc('Hides game details part located just below game window.')
          .event(function () {
            if (this.conf[this.field]) Css.add(this.field, 'div.game_details_outer', 'display: none'); else Css.del(
              this.field);
          })
          .make(group);

        opt = new this.Option();
        opt.setup('kongui_hideForum', 'Hide forum area', 'bool', true)
          .desc('Hides forum part located below game window.')
          .event(function () {
            if (this.conf[this.field]) Css.add(this.field, '#below_fold_content div.game_page_wrap',
              'display: none'); else Css.del(this.field);
          })
          .make(group);

        /**
         * RaidsManager UI
         */
        group = new this.Group('drmui', 'RaidsManager');

        opt = new this.Option();
        opt.setup('drmui_disableTransitions', 'Disable transitions', 'bool', false)
          .desc(
            'Disables animated transitions for various UI elements to improve performance on' + ' low-end hardware.')
          .event(function () {
            if (this.conf[this.field]) Css.add(this.field, 'div#DRMng_main, div#DRMng_main *, div#DRMng_info,' +
              ' div#DRMng_info *',
              'transition: initial !important'); else Css.del(this.field);
          })
          .make(group);

        opt = new this.Option();
        opt.setup('drmui_hideSideBar', 'Hide sidebar', 'bool', false)
          .desc('Hides sidebar which is located between game window and kongregate chat.')
          .event(function () {
            if (this.conf[this.field]) Css.add(this.field, 'div#DRMng_Sidebar', 'display: none'); else Css.del(
              this.field);
          })
          .make(group);

        /**
         * Alliance UI
         */
        group = new this.Group('alliance', 'Alliance');

        opt = new this.Option();
        opt.setup('alliance_sbs', 'Side by side', 'bool', false)
          .desc('Makes alliance chat visible all the time along with regular kongregate chats' +
            ' (doubles width taken by chat area).')
          .event(() => PrivateChat.moveChats())
          .make(group, true);

        /**
         * Game frame UI
         */
        group = new this.Group('gameFrame', 'Game');

        opt = new this.Option();
        opt.setup('gameFrame_removeWChat', 'Disable World Chat', 'bool', false)
          .desc('Disables World Chat located next to game window.')
          .event(function () {
            DRMng.postGameMessage('chatSettings', Config.data.gameFrame);
            Kong.hideWorldChat();
          })
          .make(group, true);

        opt = new this.Option();
        opt.setup('gameFrame_leftWChat', 'World Chat on left side', 'bool', false)
          .desc('Moves World Chat to the left side of game window.')
          .event(DRMng.postGameMessage.bind(this, 'chatSettings', Config.data.gameFrame))
          .make(group, true);

        opt = new this.Option();
        opt.setup('gameFrame_hideWChat', 'Hide World Chat', 'bool', false)
          .desc('Hides World Chat (without disabling it completely).')
          .event(function () {
            DRMng.postGameMessage('chatSettings', Config.data.gameFrame);
            Kong.hideWorldChat();
          })
          .make(group, true);

        group = new this.Group('sidebar', 'Sidebar');

        new this.Option()
          .setup('sidebar_apply', 'Apply changes', 'action')
          .desc('Applies sidebar layout changes as defined below.')
          .event(function () {
            const sb = document.getElementsByClassName('drmng_config_sb');
            const dat = {
              groups: [],
              buttons: []
            };
            for (let i = 0; i < sb.length; ++i) {
              const inp = Array.from(sb[i].querySelectorAll('input'));
              const grp = {
                name: inp.shift().value,
                hidden: i > 0,
                buttons: []
              };
              while (inp.length) {
                const btn = {
                  name: inp.shift().value,
                  command: inp.shift().value,
                  action: 'func'
                };
                if (btn.command.indexOf('/') === 0) btn.action = 'chat'; else if (btn.command.indexOf('http') ===
                  0) btn.action = 'www';
                if (i < sb.length - 1) grp.buttons.push(btn); else dat.buttons.push(btn);
              }
              if (i < sb.length - 1) dat.groups.push(grp);
            }
            Config.data.sidebar.data = dat;
            Config.save();
            DRMng.UI.setupSidebar();
          })
          .make(group, true);

        new this.Option()
          .setup('sidebar_export', 'Export configuration', 'action')
          .desc('Exports sidebar configuration to JSON file.')
          .event(() => {
            const a = document.createElement('a');
            a.setAttribute('href', `data:text,${JSON.stringify(Config.data.sidebar.data)}`);
            a.setAttribute('download', 'sidebar_config.json');
            a.dispatchEvent(new MouseEvent('click'));
          })
          .make(group, true, 'Export');

        new this.Option()
          .setup('sidebar_import', 'Import configuration', 'action')
          .desc('Imports sidebar configuration from JSON file.')
          .event(() => {
            const a = document.createElement('input');
            a.setAttribute('type', 'file');
            a.setAttribute('accept', '.json');
            a.addEventListener('change', e => {
              if (e.target.files instanceof FileList && e.target.files.length > 0) {
                const reader = new FileReader();
                reader.addEventListener('load', e => {
                  const res = `${e.target.result}`;
                  let data = null;
                  try {
                    data = JSON.parse(res);
                  } catch (e) {
                    Log.error('{Sidebar::Import} Wrong data format ::', res);
                  }
                  if (data && data.groups && data.buttons) {
                    Config.data.sidebar.data = data;
                    Config.save();
                    Log.debug('{Sidebar::Import} Data ::', data);
                    // clear old fields
                    group.fields = group.fields.filter(fld => {
                      if (fld.html.className === 'drmng_config_sb') {
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
            a.dispatchEvent(new MouseEvent('click'));
          })
          .make(group, true, 'Import');
        new this.SidebarConfig().make(group);

        Kong.hideWorldChat();

        // Save all changes made to config file due to introducing new options
        Config.save();
      },
      raidInfo: function (boss) {
        let txt = '';
        if (boss) {
          let r = Config.data.raidData[boss];
          if (r) {
            txt += '<div class="name">' + r.fName + '</div>';
            let race = r.race.join(', ');
            if (race) txt += '<div class="race">(' + race + ')</div>';
            let t = Config.data.tiersData, rt;
            const Diff = [0, 1, 2, 3];

            txt += '<table class="raidinfo"><tr><td></td><td>N</td><td>H</td><td>L</td><td>NM</td></tr>';
            txt += Diff.reduce(
              (acc, d) => acc + '<td>' + (r.hp[d] ? Util.getShortNumK(r.hp[d] * 1000, 4) : '&mdash;') + '</td>',
              '<tr><td>HP</td>') + '</tr>';
            txt += Diff.reduce(
              (acc, d) => acc + '<td>' + (r.hp[d] ? Util.getShortNumK(r.hp[d] * 1000 / r.maxPlayers, 4) : '&mdash;') +
                '</td>', '<tr><td>FS</td>') + '</tr>';
            txt += '<tr><td>AP</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td>' + '<td>' +
              (r.hp[3] ? Util.getShortNumK(r.hp[3] * 1000 / r.maxPlayers / 2, 4) : '&mdash;') + '</td></tr>';
            if (t.nonTiered && t.nonTiered.raids.indexOf(boss) !== -1) {
              rt = t.nonTiered.ratio[r.size][3];
              txt += '<tr><td>OS</td>' + '<td>' +
                (r.hp[0] ? Util.getShortNumK(r.hp[0] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                '<td>' + (r.hp[1] ? Util.getShortNumK(r.hp[1] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') +
                '</td>' + '<td>' +
                (r.hp[2] ? Util.getShortNumK(r.hp[2] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                '<td>' + (r.hp[3] ? Util.getShortNumK(r.hp[3] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') +
                '</td></tr>';
              rt = t.nonTiered.ratio[r.size][6];
              txt += '<tr><td>MS</td>' + '<td>' +
                (r.hp[0] ? Util.getShortNumK(r.hp[0] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                '<td>' + (r.hp[1] ? Util.getShortNumK(r.hp[1] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') +
                '</td>' + '<td>' +
                (r.hp[2] ? Util.getShortNumK(r.hp[2] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                '<td>' + (r.hp[3] ? Util.getShortNumK(r.hp[3] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') +
                '</td></tr>';
            }
            txt += '</table>';

            if (t.tiers && t.tiers[boss]) {
              t = t.tiers[boss];
              rt = t.ratio[3];
              txt +=
                '<table class="raidinfo"><tr><td></td><td>Tier</td><td>Stats</td><td>dmg/SP</td><td>dmg/E</td></tr>';
              // Stats OS
              if (t.spOS >= 0) txt +=
                '<tr><td>Stats OS</td><td>' + Util.getShortNumK(t.tiers[t.spOS] * rt * 1000, 4) + '</td>' + '<td>' +
                Util.toShortNumber(t.sp[t.spOS]) + '</td>' + '<td>' +
                (t.tiers[t.spOS] * rt / t.sp[t.spOS]).toPrecision(4) + '</td>' + '<td>' +
                (t.hasCURE && t.e ? (t.tiers[t.spOS] * rt / t.e[t.spOS]).toPrecision(4) : '&mdash;') + '</td>';
              // Epics OS
              if (t.eOS >= 0) txt +=
                '<tr><td>Epics OS</td><td>' + Util.getShortNumK(t.tiers[t.eOS] * rt * 1000, 4) + '</td>' + '<td>' +
                Util.toShortNumber(t.sp[t.eOS]) + '</td>' + '<td>' +
                (t.tiers[t.eOS] * rt / t.sp[t.eOS]).toPrecision(4) + '</td>' + '<td>' +
                (t.hasCURE && t.e ? (t.tiers[t.eOS] * rt / t.e[t.eOS]).toPrecision(4) : '&mdash;') + '</td>';
              // Max Tier
              let idx = t.tiers.length - 1;
              txt += '<tr><td>Max Tier</td><td>' + Util.getShortNumK(t.tiers[idx] * rt * 1000, 4) + '</td>' + '<td>' +
                Util.toShortNumber(t.sp[idx]) + '</td>' + '<td>' + (t.tiers[idx] * rt / t.sp[idx]).toPrecision(4) +
                '</td>' + '<td>' + (t.hasCURE && t.e ? (t.tiers[idx] * rt / t.e[idx]).toPrecision(4) : '&mdash;') +
                '</td>';
              txt += '</table>';
            }
          }
        }
        return txt;
      },
      hideUITimeout: 0,
      fillInfoTimeout: 0,
      fillInfo: id => {
        // Get info div and clear its content
        const ifo = document.getElementById('DRMng_info');
        while (ifo.firstChild) {
          ifo.removeChild(ifo.firstChild);
        }

        const rd = DRMng.Raids.get(id);
        const ri = Config.data.raidData[rd.boss];
        const hpMax = ri ? ri.hp[rd.diff - 1] * 1000 : Infinity;
        const data = {
          nam: rd.boss.replace(/_/g, ' '),
          mag: '',
          rac: '',
          sta: 'Healthy',
          ptm: 1.0,
          hpi: '?',
          tmi: '?'
        };

        if (ri) {
          // Name
          data.nam = ri.fName;
          // Magic
          data.mag = JSON.parse(rd.magic)
            .reduce((a, v) => `${a}<div class="magic" style="background-position: 0 -${v * 16}px"></div>`,
              '');
          //data.mag = new Array(ri.numMagics).fill(0).reduce((a,_,i) =>
          //    `${a}<div class="magic" style="background-position: 0 -${rd[`m`+(i+1)]*16}px"></div>`,``);
          // Race
          if (ri.race.length > 0) data.rac = 'Race: ' + ri.race.map(v => v.replace(/ /g, '&nbsp;')).join(', ');
          // Timer
          if (!ri.isEvent) {
            data.ptm = 1.0 - ((new Date().getTime() - rd.createtime) / (3600000 * ri.timer));
            if (data.ptm + 0.05 < rd.hp) data.sta = 'Behind timer';
            if (data.ptm + 0.2 < rd.hp) data.sta = 'Failing';
          }
        }

        // Status
        data.sta +=
          rd.isFull ? `, Full (${rd.participants})` : `, ${rd.participants}${ri ? ` / ${ri.maxPlayers}` : ''}`;
        data.sta += rd.visited ? ', Visited' : '';

        // Health text
        data.hpi = `health ${Util.getShortNumK(hpMax * rd.hp, 3)} / ` +
          `${Util.getShortNumK(hpMax, 3)} (${Math.ceil(rd.hp * 100)}%)`;

        // Time text
        data.tmi = `timer ${ri ? `${Math.round(data.ptm * ri.timer)}h / ${ri.timer}h ` : ''}` +
          `(${Math.ceil(data.ptm * 100)}%)`;

        // Generate info field
        ifo.className = ['', 'n', 'h', 'l', 'nm'][rd.diff];
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

        const rdl = document.getElementById('DRMng_RaidList').getBoundingClientRect();
        const wnd = document.documentElement.clientHeight;
        const id = e.target.id.split('_')[1];
        const d = e.target.getBoundingClientRect();
        const ifo = document.getElementById('DRMng_info');
        ifo.style.display = 'block';
        ifo.style.left = d.left - ifo.offsetWidth + 'px';

        if (d.top + ifo.offsetHeight > rdl.top + rdl.height / 2) {
          ifo.style.top = '';
          ifo.style.bottom = Math.max(wnd - d.bottom, 0) + 'px';
        } else {
          ifo.style.top = d.top - 1 + 'px';
          ifo.style.bottom = '';
        }
        DRMng.UI.fillInfoTimeout = setTimeout(DRMng.UI.fillInfo, 30, id);
      },
      handleChatClick: (e, sbs) => {
        const usr = e.target.getAttribute('username');
        if (usr) {
          e.stopPropagation();
          e.preventDefault();
          if ((PrivateChat.anyActive() && !PrivateChat.sbsActive) || sbs) {
            const a = PrivateChat.getActive();
            Log.info(`{${a ? `Private::${a.conf.channel}` : 'Kong'}::PM} User <${usr}>`);
            a.input.focus();
            a.input.dispatchEvent(new Event('focus'));
            a.input.value = `/w ${usr} `;
          } else {
            Log.info(`{Kong::PM} User <${usr}>`);
            holodeck._active_dialogue.setInput(`/w ${usr} `);
          }
        } else if (e.target.className.indexOf('DRMng_info_picker') > -1) {
          e = e.target;
          const raid = e.className.split(' ')[1];
          if (!raid) return false;
          const data = Config.data.raidData[raid];
          if (!data) return false;

          e = e.parentNode;
          e.style.backgroundImage =
            `url(https://content.5thplanetgames.com/dotd_live/images/bosses/${data ? data.banner : ''}.jpg)`;
          e.classList.add('raidinfo');
          e.innerHTML = DRMng.UI.raidInfo(raid);
          setTimeout(() => e.parentNode.parentNode.scrollTop = 500000, 10); //131072
        }
        return false;
      },
      addListenerToChat: () => {
        const element = document.getElementById('chat_rooms_container');
        if (element) {
          element.addEventListener('click', DRMng.UI.handleChatClick, true);
        } else {
          setTimeout(DRMng.UI.addListenerToChat, 250);
        }
      },
      attachListeners: function () {
        // Chat global listener
        setTimeout(DRMng.UI.addListenerToChat, 1000);

        // Message listeners
        document.addEventListener('DRMng.joinRaid', DRMng.Raids.joinResponse, false);
        document.addEventListener('DRMng.joinRaids', DRMng.Raids.joinMultiResponse, false);
        document.addEventListener('DRMng.lightShot', Proxy.lightShotCallback, false);

        // Script Hide automation
        /*new DomNode(`#DRMng_main`)
         .on(`mouseleave`, () =>
         DRMng.UI.hideUITimeout = setTimeout(() => {
         new DomNode(`#DRMng_main`).attr({class: `hidden`});
         new DomNode(`#DRMng_onoff`).attr({class: `hidden`});
         DRMng.Kong.setWrapperWidth();
         }, 2500))
         .on(`mouseenter`, () => clearTimeout(DRMng.UI.hideUITimeout));*/

        // menu buttons
        document.querySelectorAll('#DRMng_nav > div').forEach(mnuItem => {
          mnuItem.addEventListener('click', e => {
            document.getElementById('DRMng_main').className = 'active';
            const contItems = document.getElementById('DRMng_content').children;
            document.querySelectorAll('#DRMng_nav > div').forEach((item, i) => {
              item.className = '';
              contItems[i].className = '';
            });
            document.getElementById(`DRMng_${e.target.innerHTML}`).className = 'active';
            e.target.className = 'active';
          });
        });

        // Sorting
        new DomNode('#DRMng_sortOrderBy').on('click', e => {
          const el = e.target;
          if (el.className.indexOf('active') === -1) {
            const act = el.parentNode.getElementsByClassName('active');
            if (act.length > 0) act[0].className = '';
            el.className = 'active';
            DRMng.Raids.setComp(el.innerHTML.toLowerCase());
          }
        });

        // RaidList joining
        new DomNode('#DRMng_RaidList').on('click', e => {
          let el = e.target;
          if (el.nodeName !== 'DIV') el = el.parentNode;
          if (el.id === 'DRMng_RaidList') return;
          DRMng.Raids.joinOne(el.id.split('_')[1]);
        });

        // Info box hiding
        new DomNode('#DRMng_RaidList').on('mouseleave',
          () => document.getElementById('DRMng_info').style.display = 'none');

        // raids filtering field
        new DomNode('#DRMng_txtFilter')
          .on('focus', e => {
            if (e.target.textContent === 'Filter raids here') {
              e.target.textContent = '';
              e.target.className = '';
            }
          })
          .on('blur', e => {
            if (e.target.textContent === '') {
              e.target.textContent = 'Filter raids here';
              e.target.className = 'default';
            }
          })
          .on('keyup', e => {
            if (window.filterTOut) clearTimeout(window.filterTOut);
            const data = e.target.textContent.replace(/[\n\r\t]/g, '').trim();
            window.filterTOut = setTimeout(DRMng.Raids.processFilter.bind(DRMng.Raids, data), 500);
          });

        // Apply filter button
        new DomNode('#DRMng_filterApply').on('click', e => {
          e.target.parentNode.style.display = 'none';
          DRMng.Engine.reconnect();
        });

        // filter groups rollovers
        [
          document.getElementById('DRMng_filterSmall'), document.getElementById('DRMng_filterMedium'),
          document.getElementById('DRMng_filterLarge'), document.getElementById('DRMng_filterEpic'),
          document.getElementById('DRMng_filterColossal'), document.getElementById('DRMng_filterGuild'),
          document.getElementById('DRMng_filterGigantic')
        ].forEach(div => {
          if (div) {
            div.parentNode.addEventListener('transitionend', e => {
              if (e.target.className.indexOf('hide') !== -1) e.target.children[1].style.display = 'none';
            }, false);
          }
        });

        // delayed submission
        new DomNode('#DRMng_submitRaidLink')
          .on('focus', e => {
            if (e.target.innerHTML === 'Paste raid link here') {
              e.target.innerHTML = '';
              e.target.className = '';
            }
          })
          .on('blur', e => {
            if (e.target.innerHTML === '') {
              e.target.innerHTML = 'Paste raid link here';
              e.target.className = 'default';
            }
          });

        document.querySelectorAll('[group=DRMng_submitDelay]').forEach(flt => {
          flt.addEventListener('click', e => {
            document.querySelectorAll('[group=DRMng_submitDelay]').forEach(item => item.className = '');
            e.target.className = 'crimson';
          });
        });

        // alliance chat
        new DomNode('#DRMng_allianceChnl')
          .on('focus', e => {
            if (e.target.getAttribute('class') === 'default') {
              e.target.removeAttribute('class');
              e.target.value = '';
            }
          })
          .on('blur', e => {
            if (e.target.value === '') {
              e.target.setAttribute('class', 'default');
              e.target.value = 'Channel';
            }
          });

        new DomNode('#DRMng_alliancePass')
          .on('focus', e => {
            if (e.target.getAttribute('class') === 'default') {
              e.target.removeAttribute('class');
              e.target.setAttribute('type', 'password');
              e.target.value = '';
            }
          })
          .on('blur', e => {
            if (e.target.value === '') {
              e.target.setAttribute('class', 'default');
              e.target.setAttribute('type', 'text');
              e.target.value = 'Password';
            }
          });

        new DomNode('#DRMng_allianceName')
          .on('focus', e => {
            if (e.target.getAttribute('class') === 'default') {
              e.target.removeAttribute('class');
              e.target.value = '';
            }
          })
          .on('blur', e => {
            if (e.target.value === '') {
              e.target.setAttribute('class', 'default');
              e.target.value = 'Name';
            }
          });

        new DomNode('#DRMng_allianceColor')
          .on('focus', e => {
            if (e.target.getAttribute('class') === 'default') {
              e.target.removeAttribute('class');
              e.target.value = '';
            }
          })
          .on('blur', e => {
            if (e.target.value === '') {
              e.target.setAttribute('class', 'default');
              e.target.value = 'Color';
            }
          });

        // resize listeners
        DRMng.hResize.regPanes.push('chat_container');
        DRMng.hResize.regSide.push(0);
        document.getElementById('chat_container')
          .addEventListener('mousedown', DRMng.hResize.onMouseDown.bind(DRMng.hResize));
        DRMng.hResize.regPanes.push('DRMng_main');
        DRMng.hResize.regSide.push(1);
        document.getElementById('DRMng_main')
          .addEventListener('mousedown', DRMng.hResize.onMouseDown.bind(DRMng.hResize));
      },
      roll: function (elem) {
        const gr = elem ? elem.parentNode : null;
        if (gr) {
          const group = gr.getAttribute('group');
          if (group) {
            gr.parentNode.childNodes.forEach(d => {
              if (d.tagName === undefined) return;
              if (d !== gr && d.getAttribute('group') === group) {
                if (d.className.indexOf('hide') === -1) d.className += ' hide';
                d.children[1].style.display = 'none';
              }
            });
          }
          if (gr.className.indexOf('group') === 0) {
            if (gr.className.indexOf('hide') > -1) {
              gr.children[1].removeAttribute('style');
              gr.className = gr.className.replace(' hide', '');
            } else {
              gr.className += ' hide';
              gr.children[1].style.display = 'none';
            }
          }
        }
      },
      init: function () {
        // create stylesheet
        this.createCSS();

        // script html code
        new DomNode('div').attr({ id: 'DRMng_main' }).html(`\
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
                                        <button onclick="PrivateChat.add()"
                                            id="DRMng_allianceAdd" class="n">Add</button>
                                    </div>\
                                </div>\
                            </div>\
                            <div class="" id="DRMng_Options"></div>\
                        </div>\
                    </div>`)
          .attach('to', document.body);

        // Info dialog
        new DomNode('div').attr({ id: 'DRMng_info' }).attach('to', document.body);

        // Status bar
        new DomNode('#headerwrap')
          .data(new DomNode('div').attr({ id: 'DRMng_header' })
            .data(new DomNode('div').attr({ id: 'DRMng_server' })
              .text(Config.data.server)
              .on('click', DRMng.Engine.changeServer))
            .data(new DomNode('div').attr({ id: 'DRMng_status' })
              .text('DRMng Loading...'))
            .data(new DomNode('div').attr({
              id: 'DRMng_onoff',
              class: 'hidden'
            })
              .data(new DomNode('div').text('\uf1cc'))
              .on('click', () => {
                clearTimeout(DRMng.UI.hideUITimeout);
                const el = document.getElementById('DRMng_main');
                if (el.className === 'hidden') {
                  el.removeAttribute('class');
                  new DomNode('#DRMng_onoff').remove('class');
                  Kong.setWrapperWidth(Config.data.scriptWidth);
                } else {
                  el.className = 'hidden';
                  new DomNode('#DRMng_onoff').attr({ class: 'hidden' });
                  Kong.setWrapperWidth();
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
    postMessage: function (data) {
      document.dispatchEvent(new MessageEvent('DRMng.xhrReq', {
        origin: `${document.location.protocol}//${document.location.hostname}`,
        lastEventId: 0,
        source: window,
        data: JSON.stringify(data)
      }));
    },
    postGameMessage: function (type, data = '') {
      const game = document.getElementById('gameiframe');
      if (game) {
        type = `DRMng.${type}`;
        data = typeof data === 'string' ? data : JSON.stringify(data);
        type = data ? type + '#' + data : type;
        game.contentWindow.postMessage(type, 'https://dotd-web1.5thplanetgames.com');
      }
    },
    init: function () {

      // load localStorage
      Config.load();

      // init kong features
      Kong.load();

      // load user manager
      UserManager.load();

      // load UI
      this.UI.init();

      // resizer
      this.hResize.init();

      // raids init
      this.Raids.init();

      // connect to Server
      this.Engine.init();

      // create and connect private chats
      PrivateChat.createAll();
    }
  };

  Log.info('Main class created. Initializing components');

  // include socket.io engine
  new DomNode('script')
    .attr({
      type: 'text/javascript',
      async: '',
      src: 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.1.1/socket.io.js'
    })
    .attach('to', document.head);

  DRMng.init();

  setTimeout(() => {
    const s = document.getElementById('DRMng_TempScriptField');
    s.parentNode.removeChild(s);
  }, 10000);
}

function load() {
  window.DRMng = {
    config: {
      version: {
        game: '0',
        chat: '0'
      },
      user: {
        name: '',
        id: '',
        auth: '',
        version: ''
      },
      removeWChat: false,
      leftWChat: false,
      hideWChat: false
    },
    loadCount: 0,
    counter: 0,
    load: () => {
      const data = JSON.parse(localStorage['DRMng'] || '{}');
      Object.keys(data).forEach(key => DRMng.config[key] = data[key]);
      DRMng.save();
    },
    save: () => {
      localStorage['DRMng'] = JSON.stringify(DRMng.config);
    },
    getParamObject: () => {
      const u = DRMng.config.user;
      const vars = {
        kongregate_username: u.name,
        kongregate_user_id: u.id,
        kongregate_game_auth_token: u.auth,
        kongregate_game_id: 138636,
        kongregate_host: 'https://www.kongregate.com',
        kongregate_game_url: 'https://www.kongregate.com/games/5thPlanetGames/dawn-of-the-dragons',
        kongregate_api_host: 'https://api.kongregate.com',
        kongregate_channel_id: 'b1388511-e7e4-4c62-92fa-e6852fea27aa',
        kongregate_api_path: 'https://chat.kongregate.com/flash/API_AS3_c1822959535ef5eff514ac20899abf96.swf',
        kongregate_ansible_path: 'https://chat.kongregate.com/flash/ansible_68b66936d53ca6dd18a685bfcb55b2cf.swf',
        kongregate_preview: false,
        kongregate_game_version: u.version,
        kongregate_language: 'en',
        kongregate_split_treatments: 'dawn-of-the-dragons-skin%2Ccontrol',
        kongregate: true,
        kongregate_svid: '7cc0eaba-d07e-4e85-8d7c-09a4f2f5fcfa',
        kongregate_js_api: true,
        kongregate_flash_postmessage: true,
        user_id: `kong_${u.name}`,
        server_xml_url: 'https://web1.dawnofthedragons.com/kong/',
        content_url: 'https://content.5thplanetgames.com/dotd_live/',
        xml_content_url: 'https://content.5thplanetgames.com/dotd_live/xml/',
        app_id: 138636,
        page_url: 'https://www.kongregate.com/games/5thPlanetGames/dawn-of-the-dragons',
        auth_url: 'https://web1.dawnofthedragons.com/kong/lib/authenticate.php',
        action_type: '',
        raid_id: '',
        hash: '',
        queueid: '',
        charter_id: '',
        trk: '',
        retrk: '',
        fbuid: ''
      };
      return {
        wmode: 'transparent',
        allowscriptaccess: 'always',
        flashvars: Object.keys(vars).reduce((a, v) => `${a}&${v}=${encodeURIComponent(vars[v])}`, '')
      };
    },
    createSwf: function (data, id, width, height) {
      const swf = document.getElementById(id);
      if (swf) swf.setAttribute('data', data); else {
        const div = document.createElement('div');
        const obj = document.createElement('object');
        const param = this.getParamObject();
        div.style.position = 'absolute';
        div.style.top = '0';
        div.style.left = '0';
        if (id === 'swfdiv' && this.config.leftWChat) div.style.left = '265px';
        if (id === 'chatdiv' && !this.config.leftWChat) div.style.left = '760px';
        obj.setAttribute('type', 'application/x-shockwave-flash');
        obj.setAttribute('id', id);
        obj.setAttribute('width', width);
        obj.setAttribute('height', height);
        Object.keys(param).forEach(key => {
          const p = document.createElement('param');
          p.setAttribute('name', key);
          p.setAttribute('value', param[key]);
          obj.appendChild(p);
        });
        obj.setAttribute('data', data);
        div.appendChild(obj);
        document.body.appendChild(div);
        obj.style.visibility = 'visible';
      }
    },
    applyChatSettings: function () {
      const swfDiv = document.getElementById('swfdiv');
      const chatDiv = document.getElementById('chatdiv');
      if (this.config.removeWChat) {
        if (swfDiv) swfDiv.parentNode.style.left = '0';
        if (chatDiv) {
          const remDiv = chatDiv.parentNode;
          remDiv.parentNode.removeChild(remDiv);
        }
      } else if (this.config.leftWChat && !this.config.hideWChat) {
        if (chatDiv) chatDiv.parentNode.style.left = '0'; else {
          setTimeout(this.reloadChat.bind(this), 0);
          return;
        }
        if (swfDiv) swfDiv.parentNode.style.left = '265px';
      } else {
        if (chatDiv) chatDiv.parentNode.style.left = '760px'; else {
          setTimeout(this.reloadChat.bind(this), 0);
          return;
        }
        if (swfDiv) swfDiv.parentNode.style.left = '0';
      }
    },
    reloadChat: function () {
      if (this.config.version.chat) this.createSwf(
        'https://content.5thplanetgames.com/dotd_live/chat/' + this.config.version.chat + '/chatclient.swf', 'chatdiv',
        '265', '690');
      setTimeout(this.applyChatSettings.bind(this), 100);
    },
    reloadGame: function () {
      if (this.config.version.game) this.createSwf(
        'https://content.5thplanetgames.com/dotd_live/swf/' + this.config.version.game + '/dotd.swf', 'swfdiv', '760',
        '690');
    },
    init: function () {
      const swfDiv = document.getElementById('swfdiv');
      const chatDiv = document.getElementById('chatdiv');
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
        console.log('%c[DRMng] {GameFrame} Loaded <game:%s> <chat:%s> <user:%s> <id:%s>', 'color: #108030',
          this.config.version.game, this.config.version.chat, this.config.user.name, this.config.user.id);
        this.save();
        this.applyChatSettings();
      } else if (this.counter++ < 5) setTimeout(this.init.bind(this), 200); else {
        this.reloadGame();
        this.reloadChat();
        console.warn('[DRMng] Game is probably in maintenance mode, generated missing data to fire up chat');
      }
    }
  };

  window.addEventListener('message', e => {
    if (!e.data || typeof e.data !== 'string') return;
    const c = e.data.split('#');
    if (c.length > 0 && c[0].indexOf('DRMng.') === 0) {
      switch (c[0].slice(6)) {
        case 'chatSettings':
          if (c[1]) {
            const data = JSON.parse(c[1] || '{}');
            DRMng.config.removeWChat = data.removeWChat || false;
            DRMng.config.hideWChat = data.hideWChat || false;
            DRMng.config.leftWChat = data.leftWChat || false;
            DRMng.save();
            DRMng.applyChatSettings();
          }
          break;
        case 'chatReload':
          DRMng.reloadChat();
          break;
        case 'gameReload':
          DRMng.reloadGame();
          break;
        case 'killGame':
          document.getElementById('swfdiv').data = '';
          break;
        case 'killChat':
          document.getElementById('chatdiv').data = '';
      }
    }
  }, false);

  DRMng.init();
}

if (window.location.host === 'www.kongregate.com') {
  if (window.top === window.self) {
    document.addEventListener('DRMng.xhrReq', param => {
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
      p.onload = p.callback.bind(p, 'load');
      p.onerror = p.callback.bind(p, 'error');
      p.ontimeout = p.callback.bind(p, 'timeout');
      setTimeout(GM_xmlhttpRequest, 1, p);
    });

    console.log('%c[DotD Raids Manager] Bootstrap', 'color: #108030');

    const scr = document.createElement('script');
    scr.id = 'DRMng_TempScriptField';
    scr.appendChild(document.createTextNode(`(${main})()`));
    document.head.appendChild(scr);
  }
} else if (window.location.host === 'dotd-web1.5thplanetgames.com') {
  const scr = document.createElement('script');
  scr.appendChild(document.createTextNode(`(${load})()`));
  document.head.appendChild(scr);
}
