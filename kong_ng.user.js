// ==UserScript==
// @name           	DotD Raids Manager Next Gen
// @namespace      	tag://kongregate
// @description    	Makes managing raids a lot easier
// @author         	Mutik
// @version        	2.0.24
// @grant          	GM_xmlhttpRequest
// @grant          	unsafeWindow
// @include        	http://www.kongregate.com/games/5thPlanetGames/dawn-of-the-dragons*
// @include        	*50.18.191.15/kong/?DO_NOT_SHARE_THIS_LINK*
// @connect			50.18.191.15
// @connect         prnt.sc
// @hompage        	http://mutik.erley.org
// ==/UserScript==

//best loop atm: for(var i=0, l=obj.length; i<l; ++i) - for with caching and pre-increment

if(window.location.host == "www.kongregate.com") {
    if(window.top == window.self) {
        function main() {
            window.DEBUG = false;
            window.DRMng = {
                version: {major: '2', minor: '0', rev: '24', name: 'DotD Raids Manager next gen'},
                Util: {
                    // Sets or Destroys css Style in document head
                    // if 'content' is null, css with given ID is removed
                    cssStyle: function(id,content) {
                        let s = document.getElementById(id);
                        if (content !== null) {
                            if (!s) {
                                s = document.createElement('style');
                                s.setAttribute('type', 'text/css');
                                s.setAttribute('id', id);
                                document.head.appendChild(s);
                            }
                            s.innerHTML = content;
                        }
                        else if (s) s.parentNode.removeChild(s);
                    },
                    copyFields: function(src,dst,fields) {
                        for (let i = 0, l = fields.length; i < l; ++i)
                            if (src.hasOwnProperty(fields[i])) dst[fields[i]] = src[fields[i]];
                        return dst;
                    },
                    getQueryVariable: function(v,s) {
                        let query = String(s || window.location.search.substring(1));
                        if (query.indexOf('?') > -1) query = query.substring(query.indexOf('?') + 1);
                        let vars = query.split('&');
                        let i = vars.length;
                        while(i--) {
                            let pair = vars[i].split('=');
                            if (decodeURIComponent(pair[0]) == v) return decodeURIComponent(pair[1]);
                        }
                        return '';
                    },
                    crc32: function(str) {
                        let i, c, crcTable = [];
                        for (i = 0, c = i; i < 256; ++i, c = i) {
                            for(let k =0; k < 8; k++) c = ((c&1)?(0xEDB88320^(c>>>1)):(c>>>1));
                            crcTable[i] = c;
                        }
                        let crc = 0 ^ (-1);
                        for (i = 0; i < str.length; ++i) crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
                        return ((crc^(-1))>>>0).toString(16);
                    },
                    getRaidFromUrl: function(url, poster) {
                        let r = { createtime: new Date().getTime(), poster: poster || ''}, cnt = 0, i;
                        let reg = /[?&]([^=]+)=([^?&]+)/ig, p = url.replace(/&amp;/gi, '&').replace(/kv_&/gi, '&kv_').replace(/http:?/gi, '');
                        while ((i = reg.exec(p)) !== null) {
                            switch (i[1]) {
                                case 'kv_raid_id': case 'raid_id': 		r.id = i[2]; cnt++; break;
                                case 'kv_difficulty': case 'difficulty':r.diff = parseInt(i[2]); cnt++; break;
                                case 'kv_raid_boss': case 'raid_boss': 	r.boss = i[2]; cnt++; break;
                                case 'kv_hash': case 'hash': 			r.hash = i[2]; cnt++; break;
                                case 'kv_serverid': case 'serverid': 	r.sid = parseInt(i[2]); break;
                            }
                        }
                        if (cnt < 4) return null;
                        r.pid = r.sid === 2 ? 0 : 1;
                        return r;
                    },
                    getShortNum: function(num, p) {
                        p = p || 4;
                        if (isNaN(num) || num < 0) return num;
                        if (num >= 1000000000000) return (num / 1000000000000).toPrecision(p) + 't';
                        if (num >= 1000000000) return (num / 1000000000).toPrecision(p) + 'b';
                        if (num >= 1000000) return (num / 1000000).toPrecision(p) + 'm';
                        if (num >= 1000) return (num / 1000).toPrecision(p) + 'k';
                        return num + ''
                    },
                    getShortNumK: function(num, p) {
                        p = p || 4;
                        if (isNaN(num) || num < 0) return num;
                        if (num >= 1000000000000) return (num / 1000000000000).toPrecision(p) + 'q';
                        if (num >= 1000000000) return (num / 1000000000).toPrecision(p) + 't';
                        if (num >= 1000000) return (num / 1000000).toPrecision(p) + 'b';
                        if (num >= 1000) return (num / 1000).toPrecision(p) + 'm';
                        return num.toPrecision(p) + 'k'
                    },
                    getRand: function(i) {
                        return Math.round(Math.random()*(i+.5));
                    },
                    deRomanize: function(roman) {
                        let lut = {I:1, V:5, X:10, L:50, C:100, D:500, M:1000};
                        let arabic = 0, i = roman.length;
                        while (i--) {
                            if (lut[roman[i]] < lut[roman[i+1]]) arabic -= lut[roman[i]];
                            else arabic += lut[roman[i]];
                        }
                        return arabic;
                    },
                    Gate: {
                        lightShot: function(link, id) {
                            link = link.replace(/prntscr.com/,'prnt.sc');
                            let data = { eventName: 'DRMng.lightShot', url: link, method: 'GET', id: id, timeout: 10000 };
                            DRMng.postMessage(data);
                        },
                        lightShotCb: function(e) {
                            let d = JSON.parse(e.data);
                            let i = document.getElementById(d.id);
                            let l = /og:image.+?content="(.+?)"/.exec(d.responseText);
                            if (l) {
                                l = l[1];
                                if (i) {
                                    i.setAttribute('src', l);
                                    i.setAttribute('alt', l);
                                    i.removeAttribute('id');
                                }
                            }
                            else if (i) i.parentNode.removeChild(i);
                            setTimeout(DRMng.Alliance.scrollToBottom.bind(DRMng.Alliance), 10);
                        }
                    },
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
                        calc: function(e) {
                            if (this.pane === null) return false;
                            this.rect = this.pane.getBoundingClientRect();
                            this.x = e.clientX - this.rect.left;
                            this.left = this.regLeft && this.x < 6;
                            this.right = this.regRight && this.x >= this.rect.width - 6;
                            return true;
                        },
                        findPane: function(e) {
                            let p = e.target, idx;
                            while (p && p.nodeName !== 'BODY') {
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
                        onMouseDown: function(e) {
                            this.findPane(e);
                            if (this.calc(e)) this.onDown(e);
                        },
                        onDown: function(e) {
                            let isResizing = this.left || this.right;
                            if (isResizing) e.preventDefault();
                            this.clicked = {
                                x: this.x,
                                cx: e.clientX,
                                w: this.rect.width,
                                isResizing: isResizing,
                                left: this.left,
                                right: this.right
                            }
                        },
                        hold: false,
                        resetHold: function() {
                            this.hold = false;
                        },
                        onMove: function(e) {
                            if (this.hold) return;
                            if (this.clicked === null) {
                                this.findPane(e);
                                this.hold = true;
                                setTimeout(this.resetHold.bind(this),500);
                            }
                            this.onMoveProgress(e);
                        },
                        onMoveProgress: function(e) {
                            if(!this.calc(e)) return;
                            this.ev = e;
                            this.redraw = true;
                        },
                        onUp: function() {
                            if (this.pane) {
                                let p = this.pane;
                                switch(p.id) {
                                    case 'chat_container':
                                        let w = parseInt(p.style.width.replace('px',''));
                                        DRMng.Config.local.kong.chatWidth =
                                            DRMng.Config.local.alliance.sbs ? parseInt((w-7)/2) : w;
                                        DRMng.Config.saveLocal();
                                        DRMng.Kong.setHeaderWidth();
                                        break;
                                    case 'DRMng_main':
                                        DRMng.Config.local.scriptWidth = parseInt(p.style.width.replace('px',''));
                                        DRMng.Config.saveLocal();
                                        break;
                                }
                            }
                            this.clicked = null;
                            this.pane = null;
                        },
                        animate: function() {
                            requestAnimationFrame(this.animate.bind(this));
                            if (!this.redraw) return;
                            this.redraw = false;

                            if (this.clicked && this.clicked.isResizing) {

                                if (this.clicked.right)
                                    this.pane.style.width = parseInt(Math.max(this.x, 200)) + 'px';

                                if (this.clicked.left) {
                                    this.pane.style.width =
                                        parseInt(Math.max(this.clicked.cx - this.ev.clientX + this.clicked.w, 200)) + 'px';
                                }

                                return;
                            }
                            if (this.pane) {
                                if (this.right || this.left) this.pane.style.cursor = 'ew-resize';
                                else this.pane.style.cursor = 'default';
                            }
                        },
                        init: function() {
                            document.addEventListener('mousemove', this.onMove.bind(this));
                            document.addEventListener('mouseup', this.onUp.bind(this));
                            this.animate();
                        }
                    }
                },
                Gestures: {
                    Kiss: {
                        smittenAdjective: ['smitten','enamored','infatuated','taken','in love','inflamed'],
                        getSmittenAdjective: function() { return this.smittenAdjective[DRMng.Util.getRand(5)]; },
                        generate: function() {
                            let txt = '';
                            switch(DRMng.Util.getRand(8)) {
                                case 0: txt = '@from gives @who a puckered kiss on the lips.'; break;
                                case 1: txt = '@from plants a gentle kiss on the cheek of @who.'; break;
                                case 2: txt = '@from kisses @who... might have used tongue on that one.'; break;
                                case 3: case 4: txt = '@from seems ' + this.getSmittenAdjective() + ' with @who.'; break;
                                default: txt = '@from tickles the lips of @who with a sensual kiss.'; break;
                            }
                            return txt;
                        }
                    },
                    Poke: {
                        pokeBodyPlace:    ['on the cheek', 'on the navel', 'in the nose', 'in the belly button',
                                           'in the rib cage', 'in a really ticklish spot', 'square on the forehead',
                                           'with a wet willy in the ear', 'on the arm', 'on the shoulder',
                                           'on the chest', 'on the leg', 'in the face', 'on the neck', 'in the stomach',
                                           'up the butt'],
                        getPokeBodyPlace: function() { return this.pokeBodyPlace[DRMng.Util.getRand(14)]; },
                        generate: function() {
                            let txt = '';
                            switch(DRMng.Util.getRand(6)) {
                                case 0: txt = '@from with a tickling finger of doom, pokes @who '; break;
                                case 1: txt = '@from jumps out from the shadows and prods @who '; break;
                                case 2: txt = '@from playfully pokes @who '; break;
                                case 3: txt = '@from cheerfully pokes @who '; break;
                                case 4: txt = '@from gleefully pokes @who '; break;
                                case 5: txt = '@from pokes @who repeatedly '; break;
                                default: txt = '@from, with index finger stern and pointy, pokes @who '; break;
                            }
                            return txt + this.getPokeBodyPlace() + '.';
                        }
                    },
                    Hit: {
                        strikeAction:          ['clobber', 'subdue', 'hit', 'bash', 'pound', 'pelt', 'hammer', 'wallop',
                                                'swat', 'punish', 'pummel', 'strike', 'beat'],
                        leapingAction:         ['vaults', 'surges', 'hurdles', 'bounds', 'pounces', 'storms', 'leaps',
                                                'bolts', 'stampedes', 'sprints', 'dashes', 'charges', 'lunges'],
                        aimModifier:           ['a well placed', 'a pin-point accurate', 'a targeted', 'an aimed', 'a',
                                                'a', 'a', 'a', 'a', 'a', 'a'],
                        wrestlingMove:         [' haymaker punch', ' kitchen sink to the midsection', ' jumping DDT',
                                                ' cross body attack', ' flying forearm', ' low dropkick',
                                                ' jumping thigh kick', ' roundhouse', ' left and right hook combo',
                                                ' jab and middle kick combo', ' spinning backfist and shin kick combo',
                                                ' delayed backbrain wheel kick',
                                                ' somersault kick to an uppercut combo', ' jab to the face',
                                                ' stomping hook punch', ' palm thrust to the solar plexus',
                                                ' shin kick', ' side headbutt', ' fast lowerbody roundhouse kick',
                                                ' fast upperbody roundhouse kick', 'n uppercut palm strike',
                                                'n uppercut to midsection jab combo', ' downward chop'],
                        meal:                  ['midmorning snack', 'midnight snack', 'supper', 'breakfast', 'brunch',
                                                '2 o\'clock tea time', 'midafternoon snack', 'lunch'],
                        throwAction:           ['tosses', 'propels', 'throws', 'catapults', 'hurls', 'launches'],
                        crying:                ['shouting', 'screaming', 'hollering', 'yelling', 'crying out'],
                        sportsWeapon:          ['cricket paddle', 'lacrosse stick', 'hockey stick', 'croquet mallet',
                                                'baseball bat', 'yoga ball', 'barbell', 'folding lawn chair', 'caber',
                                                'shot put', 'bowling ball', 'lantern', 'tennis racket'],
                        midsectionStrikePlace: ['midsection', 'solar plexus', 'chest', 'abdomen', 'sternum'],
                        randomItemWeapon:      ['a giant frozen trout', 'an inflatable duck', 'a waffle iron',
                                                'a sponge brick', 'a board of education',
                                                'an unidentified implement of mayhem and destruction',
                                                'a rubber ducky *SQUEAK*', 'a rolling pin', 'a tire iron',
                                                'a sock full of oranges', 'a slinky, a slink [fun for a girl or a boy]',
                                                'a chinese finger puzzle', 'a whip of wet noodles',
                                                'a humungous spicey italian meatstick', 'a giant garlic dill',
                                                'an ACME hammer of pain'],
                        withDescriptors:       ['with lightning reflexes, ', 'with finesse and poise, ',
                                                'with mediocre skill, ', 'with half-cocked attitude, ',
                                                'with fervor and oomph, ', 'with vitality and gusto, ',
                                                'with ambition and enthusiasm, ', '', '', '', ''],
                        strikeActionVerb:      ['clobbers', 'subdues', 'hits', 'bashes', 'pounds', 'pelts', 'hammers',
                                                'wallops', 'swats', 'punishes', 'pummels', 'strikes', 'assaults',
                                                'beats'],
                        generate: function() {
                            let txt = '';
                            switch(DRMng.Util.getRand(7)) {
                                case 0: txt = '@from attempts to ' + this.strikeAction[DRMng.Util.getRand(12)] + ' @who but fails...'; break;
                                case 1: txt = '@from ' + this.leapingAction[DRMng.Util.getRand(12)] + ' towards @who and lands ' + this.aimModifier[DRMng.Util.getRand(10)] + this.wrestlingMove[DRMng.Util.getRand(20)] + '.'; break;
                                case 2: txt = '@from takes what\'s left of ' + this.meal[DRMng.Util.getRand(7)] + ', ' + this.throwAction[DRMng.Util.getRand(5)] + ' it towards @who ' + this.crying[DRMng.Util.getRand(4)] + ', \'FOOD FIGHT\'!'; break;
                                case 4: txt = '@from rolls up a magazine planting a blow upside the head of @who.'; break;
                                case 5: txt = '@from hits @who on the head with a frying pan.'; break;
                                case 6: txt = '@from plants a ' + this.sportsWeapon[DRMng.Util.getRand(12)] + ' to the ' + this.midsectionStrikePlace[DRMng.Util.getRand(4)] + ' of @who.'; break;
                                default: txt = '@from pulls out ' + this.randomItemWeapon[DRMng.Util.getRand(15)] + ' and ' + this.withDescriptors[DRMng.Util.getRand(10)] + this.strikeActionVerb[DRMng.Util.getRand(13)] + ' @who with it.'; break;
                            }
                            return txt;
                        }
                    },
                    Slap: {
                        slapWeapon:    ['white glove', 'rubber chicken', 'well placed backhand', 'failing Euryino',
                                        'piece of moldy pizza', 'big dildo', 'loaf of french bread',
                                        'smile of devious pleasure', 'dead >0))>-<', 'left over chicken drumstick',
                                        'limp and slightly dirty french fry', 'brick of moldy cheese', 'tickle me Elmo',
                                        'grilled cheese'],
                        targetAction:  ['deals', 'aims', 'inflicts', 'releases', 'dispatches', 'discharges', 'delivers',
                                        'unleashes'],
                        sassySynonym:  ['an audacious', 'an impudent', 'a bold', 'an overbold', 'an arrant', 'a brassy',
                                        'a sassy'],
                        place:         [['side', '\'s head.'], ['face', '.'], ['cheek', '.']],
                        leapingAction: ['vaults', 'surges', 'hurdles', 'bounds', 'pounces', 'storms', 'leaps', 'bolts',
                                        'stampedes', 'sprints', 'dashes', 'charges', 'lunges'],
                        leadSpeed:     [' sudden', ' spry', 'n abrupt', 'n energetic', ' hasty', 'n agile',
                                        'n accelerated', ' quick'],
                        generate: function() {
                            let txt = '';
                            switch(DRMng.Util.getRand(2)) {
                                case 0: txt = '@from slaps @who with a ' + this.slapWeapon[DRMng.Util.getRand(13)] + '.'; break;
                                case 1:
                                    let place = this.place[DRMng.Util.getRand(2)];
                                    txt = '@from ' + this.targetAction[DRMng.Util.getRand(7)] + ' ' + this.sassySynonym[DRMng.Util.getRand(6)] + ' slap to the ' + place[0] + ' of @who' + place[1];
                                    break;
                                default: txt = '@from ' + this.leapingAction[DRMng.Util.getRand(12)] + ' forward and with a ' + this.slapWeapon[DRMng.Util.getRand(13)] + ', deals a' + this.leadSpeed[DRMng.Util.getRand(7)] + ' slap to @who.';
                            }
                            return txt;
                        }
                    }
                },
                Config: {
                    local: {
                        kong: {
                            kongSlimHeader: false,
                            chatWidth: 250
                        },
                        server: 'Elyssa',
                        sortBy: 'hp',
                        scriptWidth: 300,
                        visited: { kasan: [], elyssa: [] },
                        raidData: {},
                        raidKeys: [],
                        filterData: {},
                        tiersData: {},
                        filterString: { kasan: '', elyssa: '' },
                        filterRaids: { kasan: {}, elyssa: {} },
                        hardFilter: { kasan: [], elyssa: [] },
                        checkSums: {
                            raidData: '',
                            filterData: '',
                            tiersData: '',
                        },
                        alliance: {
                            enabled: false,
                            channel: '',
                            pass: '',
                            sbs: false
                        }
                    },
                    remote: {},
                    loadLocal: function() {
                        let data = localStorage['DRMng'];
                        if (data) {
                            data = JSON.parse(data);
                            let keys = Object.keys(this.local);
                            for (let i = 0; i < keys.length; ++i)
                                if (data.hasOwnProperty(keys[i])) this.local[keys[i]] = data[keys[i]];
                            keys = Object.keys(data);
                            for (let i = 0; i < keys.length; ++i)
                                if (!this.local.hasOwnProperty(keys[i])) this.local[keys[i]] = data[keys[i]];
                        }
                        else this.saveLocal();
                        this.local.raidKeys = Object.keys(this.local.raidData);
                        // fixes for early testers, remove later
                        if (this.local.visited.elyssa === undefined) this.local.visited = { kasan: [], elyssa: [] };
                        if (this.local.filterString.elyssa === undefined) this.local.filterString = { kasan: '', elyssa: '' };
                        this.saveLocal();
                    },
                    saveLocal: function() {
                        localStorage['DRMng'] = JSON.stringify(this.local);
                    }
                },
                Kong:            {
                    killScripts: function() {
                        let scr = document.getElementsByTagName('script');
                        let counter = 0;
                        for (let i=0; i<scr.length; ++i) if(scr[i].src.indexOf('google') > 0) {
                            scr[i].parentNode.removeChild(scr[i]);
                            counter++;
                        }
                        console.info('[DRMng] {Kong} Removed unnecesary \<script\> tags (%d)', counter);
                    },
                    killAds: function() {
                        if(typeof kong_ads === 'object') {
                            console.info("[DRMng] {Kong} Killed 'kong_ads'!");
                            window.kong_ads = { displayAd: function(){} };
                        }
                        else setTimeout(DRMng.Kong.killAds, 50);
                    },
                    killBumper: function() {
                        if(typeof bumper === 'object') {
                            console.info("[DRMng] {Kong} Killed 'bumper'!");
                            window.bumper = { requestAd: function(){} };
                        }
                        else setTimeout(DRMng.Kong.killBumper, 50);
                    },
                    killFBlike: function() {
                        let like = document.getElementById('quicklinks_facebook');
                        if(like) {
                            console.info("[DRMng] {Kong} Killed 'FB like'!");
                            like.parentNode.removeChild(like);
                        }
                        else setTimeout(DRMng.Kong.killFBlike, 1000);
                    },
                    killDealSpot: function() {
                        let ds = document.getElementById('dealspot_banner_holder');
                        if (ds) {
                            console.info("[DRMng] {Kong} Killed 'DealSpot'!");
                            ds.parentNode.removeChild(ds);
                        }
                        else setTimeout(DRMng.Kong.killDealSpot, 1000);
                    },
                    addReloadButton: function() {
                        let li = document.createElement('li');
                        li.className = 'spritegame';
                        //li.innerHTML = '<a onclick="activateGame();">Reload</a>';
                        li.innerHTML = '<a onclick="DRMng.postGameMessage(\'gameReload\');">Reload Game</a>';
                        li.style.backgroundPosition = '0 -280px';
                        li.style.cursor = 'pointer';
                        document.getElementById('quicklinks').appendChild(li);

                        li = document.createElement('li');
                        li.className = 'spritegame';
                        li.innerHTML = '<a onclick="DRMng.postGameMessage(\'chatReload\');">Reload Chat</a>';
                        li.style.backgroundPosition = '0 -280px';
                        li.style.cursor = 'pointer';
                        document.getElementById('quicklinks').appendChild(li);

                        li = document.createElement('li');
                        li.className = 'spritegame';
                        li.innerHTML = '<a onclick="DRMng.Kong.hideWorldChat(this)">Hide WC</a>';
                        li.style.backgroundPosition = '0 -280px';
                        li.style.cursor = 'pointer';
                        document.getElementById('quicklinks').appendChild(li);
                    },
                    addSlimButton: function() {
                        // set body class name on script load
                        if (DRMng.Config.local.kong.kongSlimHeader) document.body.className += ' slim';
                        // configure new button
                        let li = document.createElement('li');
                        let a = document.createElement('a');
                        a.href = '';
                        a.id = 'DRMng_KongSlimHeader';
                        a.innerHTML = DRMng.Config.local.kong.kongSlimHeader ? 'Full' : 'Slim';
                        // configure switching event
                        a.addEventListener('click', function(e){
                            e.preventDefault();
                            let isSlim = !DRMng.Config.local.kong.kongSlimHeader;
                            document.getElementById('DRMng_KongSlimHeader').innerHTML = isSlim ? 'Full' : 'Slim';
                            let bodyClass = document.body.className;
                            DRMng.Config.local.kong.kongSlimHeader = isSlim;
                            DRMng.Config.saveLocal();
                            if (isSlim) bodyClass += ' slim';
                            else bodyClass = bodyClass.replace(/\sslim/g,'');
                            document.body.className = bodyClass;
                            return false;
                        });
                        // append new button to nav
                        li.appendChild(a);
                        document.getElementById('nav_welcome_box').appendChild(li);
                    },
                    addSbsChatContainer: function() {
                        let chat = document.getElementById('chat_window');
                        if (chat) {
                            let sbs = document.createElement('div');
                            sbs.setAttribute('id', 'alliance_chat_sbs');
                            sbs.setAttribute('style', 'display: none');
                            sbs.addEventListener('click', DRMng.Alliance.sbsEvent);
                            document.getElementById('chat_tab_pane').appendChild(sbs);
                        }
                        else setTimeout(this.addSbsChatContainer.bind(this), 10);
                    },
                    modifyElement: function() {
                        if (Element && Element.Methods && Element._insertionTranslations) {
                            Element._insertionTranslations.after = function (a, b) {
                                let c = a.parentNode; c && c.insertBefore(b, a.nextSibling)
                            };
                            Element.Methods.remove = function (a) {
                                a = $(a); let b = a.parentNode; b && b.removeChild(a);
                                return a
                            };
                            Element.addMethods(Element.Methods);
                            console.info("[DRMng] {Kong} Element patched!");
                        }
                        else setTimeout(this.modifyElement, 50);
                    },
                    modifyChatDialogue: function() {
                        if (ChatDialogue && ChatDialogue.prototype) {
                            ChatDialogue.DRM_MESSAGE_TEMPLATE = new Template(
                                '<p class="#{classNames}">' +
                                '<span class="timestamp">#{timestamp}</span>' +
                                '<span username="#{username}" class="username truncate #{userClassNames}">#{prefix}#{username}</span>' +
                                '<span class="#{characterClassNames}">#{characterName}</span>' +
                                '<span class="separator">: </span><span class="message hyphenate">#{message}</span>' +
                                '</p>'
                            );
                            ChatDialogue.DRM_RAID_TEMPLATE = new Template(
                                '<p class="raid #{classNames}">' +
                                '<span class="timestamp">#{timestamp}<span>#{raidInfo}</span></span>' +
                                '<span class="extraid">#{extRaidInfo}</span>' +
                                '<span username="#{username}" class="username truncate #{userClassNames}">#{prefix}#{username}</span>' +
                                '<span class="#{characterClassNames}">#{characterName}</span>' +
                                '<span class="separator">#{separator}</span><span class="message hyphenate">#{message}</span>' +
                                '</p>'
                            );
                            ChatDialogue.DRM_SCRIPT_TEMPLATE = new Template(
                                '<div class="#{classNames}" style="#{customStyle}">#{message}</div>'
                            );
                            ChatDialogue.prototype.displayUnsanitizedMessage = function (a, b, c, d) {
                                //console.info("user:",a,"extInfo:",d);
                                c || (c = {});
                                d || (d = {});
                                let active_room = this._holodeck.chatWindow().activeRoom();
                                let allow_mutes = active_room && !active_room.canUserModerate(active_room.self()) || d.whisper;
                                if (!allow_mutes || !this._user_manager.isMuted(a)) {
                                    let e = !d.non_user ? ["chat_message_window_username"] : ["chat_message_window_undecorated_username"],
                                        f = a == this._user_manager.username(),
                                        g = [],
                                        h = d["private"] ? "To " : ( d["whisper"] ? "From " : "" );

                                    // helper booleans
                                    let isWhisp = !!h;
                                    //isGuild = !isWhisp && d.room.type === 'guild',
                                    //isGame = !isWhisp && d.room.type === 'game';

                                    c["class"] && g.push(c["class"]);
                                    f && e.push("is_self");

                                    // proper timestamp handling

                                    if (!d.timestamp || !d.history) d.timestamp = new Date().getTime();
                                    d.formatted_timestamp = new Date(d.timestamp).format("mmm d, HH:MM");

                                    let raid = /(^.*?)(https?...www.kongregate.com.+?kv_action_type.raidhelp.+?)(\s[\s\S]*$|$)/.exec(b);
                                    let rData = null, cData = {};
                                    if (raid) {
                                        rData = DRMng.Util.getRaidFromUrl(raid[2], a);
                                        if (rData) {
                                            let server = DRMng.Config.local.server.toLowerCase();
                                            b = raid[1] + raid[3];
                                            g.push(['n', 'h', 'l', 'nm'][rData.diff - 1]);
                                            g.push(rData.id);
                                            DRMng.Config.local.visited[server].indexOf(rData.id) !== -1 && g.push('visited');
                                            cData.link = raid[2];
                                            let rInfo = DRMng.Config.local.raidData[rData.boss];
                                            let dName = [];
                                            dName.push(['N', 'H', 'L', 'NM'][rData.diff - 1]);
                                            dName.push(rInfo ? rInfo.sName : rData.boss.replace(/_/g, ' ').toUpperCase());
                                            cData.displayName = dName.join(' ');
                                            cData.extInfo = rInfo ?
                                                (rInfo.maxPlayers === 90000 ?
                                                    'WR/ER' :
                                                    'FS ' + DRMng.Util.getShortNumK(rInfo.hp[rData.diff - 1]*1000/rInfo.maxPlayers)) :
                                                '';
                                            //if (isGame && !h) setTimeout(DRMng.Raids.checkAndSend, 1000 + Math.random() * 2000, rData);
                                        }
                                    }
                                    else {
                                        let reg = /(https?\S+[^,\s])/g, l, link, start, end;
                                        while (l = reg.exec(b)) {
                                            link = /\.(jpe?g|png|gif)$/.test(l[1])
                                                ? '<img src="' + l[1] + '" alt="'+ l[1] +'" onclick="window.open(this.src)">'
                                                : '<a href="' + l[1] + '" target="_blank">' + l[1].replace(/^https?:\/\//,'') + '</a>';
                                            start = b.substr(0, reg.lastIndex - l[1].length);
                                            end = b.slice(reg.lastIndex);
                                            b = start + link + end;
                                            reg.lastIndex += link.length - l[1].length;
                                        }
                                    }
                                    if (raid && rData)
                                        a = ChatDialogue.DRM_RAID_TEMPLATE.evaluate({
                                            prefix: h,
                                            username: a,
                                            separator: b ? ': ' : '',
                                            message: b ? ('<br>' + b) : b,
                                            raidInfo: '<a href="'+cData.link+'" onclick="DRMng.Raids.joinOne({id:\''+rData.id+'\',hash:\''+rData.hash+'\',boss:\''+rData.boss+'\'});return false;">'+cData.displayName+'</a>',
                                            extRaidInfo: cData.extInfo,
                                            classNames: g.join(" "),
                                            userClassNames: e.join(" "),
                                            characterClassNames: d.characterName ? 'guildname truncate' : '',
                                            characterName: d.characterName || '',
                                            timestamp: d.formatted_timestamp
                                        });
                                    else
                                        a = ChatDialogue.DRM_MESSAGE_TEMPLATE.evaluate({
                                            prefix: h,
                                            username: a,
                                            message: b,
                                            classNames: g.join(" "),
                                            userClassNames: e.join(" "),
                                            characterClassNames: d.characterName ? 'guildname truncate' : '',
                                            characterName: d.characterName || '',
                                            timestamp: d.formatted_timestamp
                                        });
                                    //console.log(a);
                                    this.insert(a, null, {timestamp: d.timestamp});
                                    this._messages_count++
                                }
                            };
                            ChatDialogue.prototype.serviceMessage = function (msg, isRaidInfo) {
                                isRaidInfo = isRaidInfo || null;
                                msg = ChatDialogue.DRM_SCRIPT_TEMPLATE.evaluate({
                                    message: msg,
                                    classNames: 'script' + (isRaidInfo ? ' raidinfo' : ''),
                                    customStyle: isRaidInfo ? ('background-image: linear-gradient( rgba(0, 0, 0, 0.5), rgba(250, 250, 250, 0.9) 100px ), url(https://5thplanetdawn.insnw.net/dotd_live/images/bosses/' + isRaidInfo + '.jpg);') : ''
                                });
                                let d = this, e = this._message_window_node;
                                let node = document.createElement('div');
                                node.className = 'chat-message';
                                node.innerHTML = msg;
                                e.appendChild(node);
                                setTimeout(d.scrollToBottom.bind(d),10);
                                //this.insert(msg, null, {timestamp: new Date().getTime()});
                                this._messages_count++
                            };
                            ChatDialogue.prototype.displayMessage = function (a, b, c, d) {
                                this.displayUnsanitizedMessage(a, b, c, d)
                            };
                            ChatDialogue.prototype.receivedPrivateMessage = function (a) {
                                if (a.data.success) this.displayUnsanitizedMessage(a.data.from, a.data.message + ' &nbsp;<a class="reply_link" onclick="holodeck.insertPrivateMessagePrefixFor(\'' + a.data.from + '\');return false;" href="#">(reply)</a>', {"class": "whisper received_whisper"}, {whisper: true});
                                else this.kongBotMessage(a.data.to + " cannot be reached. Please try again later.");
                            };
                            ChatDialogue.prototype.sameTimestamps = function (a, b) {
                                a = new Date(a); b = new Date(b);
                                return a.getYear() === b.getYear() && a.getMonth() === b.getMonth() && a.getDay() === b.getDay() && a.getHours() === b.getHours() && a.getMinutes() === b.getMinutes()
                            };
                            ChatDialogue.prototype.insert = function (a, b, c) {
                                let d = this, e = this._message_window_node, f = this._holodeck;
                                f.scheduleRender(function () {
                                    let g = e.getHeight();
                                    //var h = g + e.scrollTop + ChatDialogue.SCROLL_FUDGE >= e.scrollHeight;
                                    // removed scroll fudge
                                    let h = g + e.scrollTop >= e.scrollHeight;
                                    let r = true; //0 !== g && h;
                                    f.scheduleRender(function () {
                                        if ("string" == typeof a || a instanceof String)a = $j("<div/>", {html: a, "class": "chat-message"});
                                        if (c && c.timestamp) {
                                            let f = $j(e).children(".chat-message").filter(function () {
                                                return $j(this).data("timestamp") > c.timestamp
                                            });
                                            0 < f.length ? ($j(a).data(c).insertBefore(f.first()), r = !1) : $j(a).data(c).appendTo(e)
                                        } else $j(a).appendTo(e);
                                        r && d.scrollToBottom();
                                        b && b()
                                    })
                                })
                            };
                            console.info("[DRMng] {Kong} ChatDialogue patched!");
                        }
                        else setTimeout(this.modifyChatDialogue, 50);
                    },
                    modifyChatRoom: function() {
                        if (ChatRoom && ChatRoom.prototype) {
                            ChatRoom.prototype.receivedMessage = function (a) {
                                //console.log("ReceivedMessage:",a.data);
                                this.isActive() || this._unread_message_node.show();
                                this.checkUserForModeration(a.data.user.username);
                                // magic shortcut! displayMessage -> displayUnsanitizedMessage,
                                // (eliminate double unnecessary function call)
                                this._chat_dialogue.displayUnsanitizedMessage(a.data.user.username, a.data.message, {}, {
                                    characterName: a.data.user.variables.game_character_name,
                                    timestamp: a.data.timestamp,
                                    // if message belongs to history load routine
                                    history: a.data.history,
                                    // some room info (name,type) needed,
                                    // to properly identify room to which message belongs
                                    room: { name: this._room.name, type: this._room.type }
                                })
                            };
                            console.info("[DRMng] {Kong} ChatRoom patched!");
                        }
                        else setTimeout(this.modifyChatRoom, 50);
                    },
                    modifyFayeEvent: function() {
                        if (FayeEventDispatcher && FayeEventDispatcher.prototype) {
                            FayeEventDispatcher.prototype.message = function (a, b) {
                                this.checkDuplicateMessage(b) || this._holodeckEventDispatcher.fire({
                                    type: KonduitEvent.ROOM_MESSAGE,
                                    data: {
                                        history: b.history,
                                        message: b.text,
                                        timestamp: b.timestamp * 1000,
                                        room: a,
                                        user: FayeUserTransformer.transformUser(b)
                                    }
                                })
                            };
                            console.info("[DRMng] {Kong} FayeEventDispatcher patched!");
                        }
                        else setTimeout(this.modifyFayeEvent, 50);
                    },
                    modifyFayeHistory: function() {
                        if (FayeHistoryService && FayeHistoryService.prototype) {
                            FayeHistoryService.prototype.fetchHistory = function (a, b, c) {
                                let d = this;
                                this._makeAjaxRequest(a, b, c).then(function (b) {
                                    $j.each(b.history, function (b, c) {
                                        c.push(true);
                                        d.trigger("message", a, FayeMessageTransformer.transform(c))
                                    });
                                    d.trigger("history", a, b.history.length)
                                })
                            };
                            console.info("[DRMng] {Kong} FayeHistory patched!");
                        }
                        else setTimeout(this.modifyFayeHistory, 50);
                    },
                    modifyFayeTransformer: function() {
                        if (FayeMessageTransformer && typeof FayeMessageTransformer.transform === 'function') {
                            FayeMessageTransformer.transform = function (a) {
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
                                    admin: 0 <= a[10].indexOf("a"),
                                    developer: 0 <= a[10].indexOf("d"),
                                    mobile: 0 <= a[10].indexOf("m"),
                                    premium: 0 <= a[10].indexOf("p"),
                                    guid: a[9],
                                    history: a[12] || false
                                }
                            };
                            console.info("[DRMng] {Kong} FayeTransformer patched!");
                        }
                        else setTimeout(this.modifyFayeTransformer, 50);
                    },
                    modifyHolodeck: function() {
                        if (Holodeck && Holodeck.prototype) {
                            Holodeck.prototype.processChatCommand = function(a,d) {
                                var b = ((a.match(/^\/([^\s]+)/) || [])[1] || "").toLowerCase();
                                if (this._chat_commands[b]) {
                                    var c = d ? DRMng.Alliance : this;
                                    return void 0 === this._chat_commands[b].detect(function (b) {
                                            return !1 === b(c, a)
                                        })
                                }
                                return !0
                            };
                            console.info("[DRMng] {Kong} Holodeck patched!");
                        }
                        else setTimeout(this.modifyHolodeck, 50);
                    },
                    addChatCommand: function(cmd, call) {
                        cmd = typeof cmd === 'object' ? cmd : [cmd];
                        for (let i = 0; i < cmd.length; ++i) holodeck.addChatCommand(cmd[i],call);
                    },
                    addChatCommands: function() {
                        if (holodeck && holodeck.ready) {
							/* Gestures Commands */
                            this.addChatCommand(['kiss','hit','poke','slap'],function(a,b) {
                                let tmp = /^\/(kiss|hit|poke|slap) (\w+)$/.exec(b),
                                    from = DRMng.UM.user.name,
                                    who = tmp[2],
                                    alliance = !(a instanceof Holodeck),
                                    chat = alliance ? a : a.activeDialogue();
                                if (from && who && chat && tmp[1]) {
                                    let mode = tmp[1].charAt(0).toUpperCase() + tmp[1].slice(1),
                                        gesture = `** ${DRMng.Gestures[mode].generate()
                                                                            .replace('@from',from)
                                                                            .replace('@who',who)} **`;
                                    //console.debug(`[DRMng] {Gesture} ${alliance?'Alliance':'Kong'} chat: ${gesture}`);
                                    if (alliance) DRMng.Alliance.send(gesture);
                                    else chat._holodeck.filterOutgoingMessage(gesture, chat._onInputFunction);
                                }
                                return false;
                            });
                            // TODO: /perc
                            /*1 : Brown/Grey<br>\
                             4k : Brown/Grey/Green<br>\
                             6k : Grey/Green<br>\
                             10k : Grey/Green/Blue<br>\
                             14k : Green/Blue<br>\
                             16k : Green/Blue/Purple<br>\
                             18k : Blue/Purple<br>\
                             22k : Blue/Purple/Orange<br>\
                             24k : Purple/Orange<br>\
                             30k : Orange<br>\
                             33k : Orange/Red (more orange)<br>\
                             36k : Orange/Red (more red)<br>\
                             50k : Orange/Red (even more red)<br>\
                             70k : Red<br>\
                             80k : Red/Bronze<br>\
                             90k : Red/Bronze<br>\
                             100k : ???<br>\
                             110k : Bronze/Silver<br>\
                             120k : Bronze/Silver<br>\
                             130k : Bronze/Silver<br>\
                             140k : Silver<br>\
                             150k : Silver/Gold<br>\
                             160k : Silver/Gold<br>\
                             170k : Silver/Gold";
                            * */
                            this.addChatCommand(['reload','reloaf','relaod','rl'],function(a,b){
                                let type = /^\/\w+\s?(.*)$/.exec(b);
                                type = type ? type[1] : '';
                                switch (type) {
                                    case 'game':
                                        DRMng.postGameMessage('gameReload');
                                        break;
                                    case 'chat':
                                        DRMng.postGameMessage('chatReload');
                                        break;
                                    default:
                                        window.activateGame();
                                }
                                return false;
                            });
                            this.addChatCommand('clear',function(a,b){
                                if (a instanceof Holodeck) holodeck._active_dialogue.clear();
                                else a.clear();
                                return false;
                            });
                            this.addChatCommand('kill',function(a,b){
                                let k = /^\/kill\s?(.*)$/.exec(b);
                                switch (k[1]) {
                                    case 'game':
                                        DRMng.postGameMessage('killGame');
                                        break;
                                    case 'chat':
                                        DRMng.postGameMessage('killChat');
                                        break;
                                    default:
                                        document.getElementById('gameiframe').src = "";
                                }
                                return false;
                            });
                            this.addChatCommand('wiki',function(a,b){
                                let l = /^\/wiki (.+)$/.exec(b);
                                if (l) window.open(`http://dotd.wikia.com/wiki/Special:Search?search=${l[1]}`);
                                return false;
                            });
                            this.addChatCommand('enc',function(a,b){
                                let l = /^\/enc (.+)$/.exec(b);
                                if (l) window.open(`http://mutik.erley.org/enc/#task=src_${encodeURI(`"${l[1]}"`)}`);
                                return false;
                            });
                            this.addChatCommand(['raid','rd'],function(a,b){
                                console.log("ChatCmdCtx:", a);
                                let raid = /^\/(raid|rd) (.+)$/.exec(b);
                                let chat = (a instanceof Holodeck) ? a.activeDialogue() : a;
                                if (raid) {
                                    raid = raid[2].toLowerCase();
                                    let keys = DRMng.Config.local.raidKeys,
                                        data = DRMng.Config.local.raidData,
                                        found = [], i, len;
                                    for (i = 0, len = keys.length; i < len; ++i) {
                                        if (keys[i].indexOf(raid) > -1 ||
                                            data[keys[i]].fName.toLowerCase().indexOf(raid) > -1)
                                            found.push([keys[i], data[keys[i]].fName]);
                                    }
                                    if (found.length > 1) {
                                        let raidPicker = '';
                                        for (i = 0, len = found.length; i < len; ++i)
                                            raidPicker += `<br><span class="DRMng_info_picker ${found[i][0]}">${found[i][1]} (${found[i][0]})</span>`;
                                        chat && chat.serviceMessage('Multiple results found, pick one:' + raidPicker);
                                    }
                                    else if (found.length === 1)
                                        chat && chat.serviceMessage(DRMng.UI.raidInfo(found[0][0]), data[found[0][0]].banner);
                                    else chat && chat.serviceMessage('No info found matching ' + raid);
                                }
                                else chat && chat.serviceMessage('Wrong /raid or /rd syntax');
                                return false;
                            });
                            console.info("[DRMng] {Kong} Chat commands added!");
                            //setTimeout(this.killScripts());
                        }
                        else setTimeout(this.addChatCommands.bind(this), 50);
                    },
                    moveChatOptions: function() {
                        let src = document.getElementById('chat_actions_container');
                        let dst = document.getElementById('chat_room_tabs');
                        if (src && dst) dst.appendChild(src);
                        else setTimeout(this.moveChatOptions.bind(this), 50);
                    },
                    modifyKongEngine: function() {
                        this.modifyHolodeck();
                        this.modifyChatRoom();
                        this.modifyChatDialogue();
                        this.modifyFayeEvent();
                        this.modifyFayeTransformer();
                        this.modifyFayeHistory();
                        this.modifyElement();
                        this.addChatCommands();
                        setTimeout(this.moveChatOptions.bind(this), 500);
                    },
                    setHeaderWidth: function() {
                        document.getElementById('header').style.width = document.getElementById('maingame').offsetWidth + 'px';
                    },
                    hideWorldChat: function(el) {
                        if (el) {
                            if (el.innerHTML === 'Hide WC') {
                                el.innerHTML = 'Show WC';
                                document.getElementById('game').style.width = '760px';
                            }
                            else {
                                el.innerHTML = 'Hide WC';
                                document.getElementById('game').style.width = '1025px';
                            }
                        }
                        return false;
                    },
                    killIframes: function() {
                        let ifr = document.querySelectorAll('iframe');
                        if (ifr) {
                            for (let i = 0; i < ifr.length; ++i)
                                if (ifr[i].id !== 'gameiframe') ifr[i].parentNode.removeChild(ifr[i]);
                            console.info("[DRMng] {Kong} All redundant iframes killed!");
                            if (document.querySelector('iframe#gameiframe') === null) {
                                console.info("Game needs forced loading!");
                                DRMng.Kong.forceGameLoad();
                            }
                        }
                        else setTimeout(DRMng.Kong.killIframes, 1000);
                    },
                    forceGameLoad: function() {
                        let game = document.getElementById('game');
                        console.info("Trying to force game loading");
                        if (typeof activateGame === 'function' && game) {
                            console.info("Running activateGame...");
                            activateGame();
                        }
                        else setTimeout(DRMng.Kong.forceGameLoad, 250);
                    },
                    CSS: {
                        rules: {},
                        elem: null,
                        add: function(alias, name, value) {
                            this.rules[alias] = {name: name, value: value};
                            this.compile(this.rules[alias]);
                        },
                        del: function(alias) {
                            if (this.rules[alias] !== undefined) delete this.rules[alias];
                            this.compile();
                        },
                        rpl: function(alias, name, value) {
                            if (this.rules[alias] !== undefined) delete this.rules[alias];
                            this.rules[alias] = {name: name, value: value};
                            this.compile();
                        },
                        compile: function(obj) {
                            if (this.elem === null) {
                                this.elem = document.createElement('style');
                                this.elem.setAttribute('type', 'text/css');
                                document.head.appendChild(this.elem);
                            }
                            if (obj) this.elem.innerHTML += obj.name + " { " + obj.value + " }\n";
                            else {
                                let content = "";
                                let k = Object.keys(this.rules);
                                for (let i = 0, l = k.length; i < l; ++i) {
                                    if (this.rules.hasOwnProperty(k[i]))
                                        content += this.rules[k[i]].name + " { " + this.rules[k[i]].value + " }\n";
                                }
                                this.elem.innerHTML = content;
                            }
                        },
                    },
                    init: function() {
                        if (document.body.className.indexOf('premium_user') === -1)
                            document.body.className += ' premium_user';
                        document.body.className = document.body.className.replace(' spotlight_ad_creative-control', '');
                        //this.killAds();
                        this.killBumper();
                        this.killFBlike();
                        this.killDealSpot();
                        //this.killIframes();
                        this.addSlimButton();
                        this.addReloadButton();
                        this.addSbsChatContainer();
                        this.modifyKongEngine();
                        //this.forceGameLoad();
                        setTimeout(this.killIframes, 2000);

                        // <link href="https://fonts.googleapis.com/css?family=Open+Sans" rel="stylesheet">
                        let link = document.createElement('link');
                        link.setAttribute('href', 'https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800');
                        link.setAttribute('rel', 'stylesheet');
                        document.head.appendChild(link);

                        let kongCSS = "\
					/* Cut out garbage */\
					html { margin: 0; }\
					body { height: 100%; background-color: #343546 !important; min-width: inherit !important; }\
					#play div#primarywrap { min-height: 100%; }\
					div#subwrap { display: none; }\
					#global, #ad_skip_controls, #ima_bumper, #ima_bumper_html5_api, #bumper_premium_header, #ima-ad-container, div.gamepage_categories_outer, div.ad, div.tracking_pixel_ad, #play #gamespotlight,\
					div#kong_bumper_preroll_600x400-ad-slot, #kong_game_ui div.room_description_rollover_container,\
					#kong_game_ui div#chat_default_content { display: none !important; }\
					div.gamepage_title_block h1 { height: 0 !important; overflow: hidden; }\
					#play.premium_user .gamepage_header_outer {\
						min-height: initial !important;\
						background-image: none !important;\
						margin: 0 !important;\
						padding: 0 !important;\
					}\
					#play table#primarylayout { padding-top: 60px; }\
					#play.slim table#primarylayout { padding-top: 32px; }\
					div#floating_game_holder {\
						display: flex;\
						padding-top: 0;\
					}\
					div#maingame, div#maingamecontent, div#flashframecontent, td#gameholder { width: auto\
					 !important; height: auto !important }\
					td#gameholder { overflow: hidden; }\
					div#maingamecontent table.game_table { position: inherit; }\
					/* TO RESIZER! td#gameholder, div#game { width: 760px !important; overflow: hidden; }*/\
					div#headerwrap {\
						width: 100%;\
						z-index: 10000;\
						background-color: rgba(0,0,0,0.75);\
						box-shadow: 0 0 10px -3px #000;\
						border-bottom: 1px solid #444;\
					}\
					div#header { height: 54px; }\
					#play.slim div#header { height: 27px; }\
					div#header_logo { display: none; } \
					ul#nav_welcome_box { left: 0; right: initial; border-bottom: 1px solid #444; height: 27px; }\
					ul#nav_welcome_box > li {\
						background-color: transparent;\
						margin-left: 0;\
						border-right: 1px solid #444;\
					}\
					ul#nav_welcome_box > li:first-child { border-left: 1px solid #444; }\
					ul#nav_welcome_box > li:hover { background-color: #444; }\
					ul#nav_welcome_box > li.settings ul { position: relative; top: 0; right: 1px; }\
					ul#nav_welcome_box > li > a { font-family: 'Open Sans', sans-serif; font-size: 12px; }\
					ul#nav_welcome_box > li > a span#mini-profile-level {\
						height: 1.1em;\
						top: -2px;\
						-webkit-filter: brightness(130%);\
					}\
					ul#nav_welcome_box > li > a span#profile_control_unread_message_count {\
						background-color: #700;\
						font-family: 'Open Sans', sans-serif;\
						font-size: 12px;\
						line-height: 13px;\
						padding: 0 4px;\
						margin-left: 3px;\
					}\
					ul#nav_welcome_box > li span.kong_ico:after { color: #fff; }\
					div#guest_user_welcome_content { left: 0; right: initial; }\
					div#header ul.main_navigation {\
						left: 0;\
						right: initial;\
						width: initial;\
						border-top: 1px solid #444;\
					}\
					div#header ul.main_navigation > li { margin: 0; height: 26px; overflow: hidden; }\
					div#header ul.main_navigation > li:first-child > a {border-left: 1px solid #444;}\
					div#header ul.main_navigation > li > a {\
						background: transparent;\
						border-right: 1px solid #444;\
						font-family: 'Open Sans', sans-serif;\
						font-size: 12px;\
						line-height: 27px;\
					}\
					div#header ul.main_navigation > li > a.active { background: rgba(255,255,255,0.1); }\
					div#header ul.main_navigation > li > a:after { color: #fff; }\
					div#header ul.main_navigation > li:hover > a { background: #444; }\
					div#header ul.main_navigation form#search {\
						background-color: transparent;\
						border-right: 1px solid #444;\
						padding: 5px;\
					}\
					div#header ul.main_navigation form#search dt input {\
						background: transparent;\
						font: italic 12px 'Open Sans';\
						letter-spacing: 0;\
						color: #fff;\
					}\
					#play.slim div#header ul.main_navigation { display: none; }\
					.main_nav_top_item.active { background: #500; color: #fff; }\
					/* Cobalt theme definition */\
					::-webkit-scrollbar {\
						width:12px; height: 12px;\
						border-style: solid;\
						border-color: rgba(0, 0, 0, 0.34);\
					}\
					::-webkit-scrollbar:vertical { border-width: 0 0 0 1px; }\
					::-webkit-scrollbar:horizontal { border-width: 1px 0 0 0; } \
					::-webkit-scrollbar-thumb { min-height: 30px; min-width: 30px; }\
					::-webkit-scrollbar-track { background-color: rgba(0,0,0,0.2); }\
					::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.2); }\
					::-webkit-scrollbar-thumb:hover { background-color: rgba(0,0,0,0.3); }\
					::-webkit-scrollbar-corner { background-color: transparent; }\
					::-webkit-resizer { background-color: transparent; }\
					\
					div#maingame, div.game_details_outer, div.game_page_wrap {\
						background-image: none;\
						background-color: rgba(0,0,0,0.5) !important;\
					}\
					div#maingame { border: 1px solid rgba(0,0,0,0.2); border-radius: 0; padding: 7px; }\
					div.upper_gamepage { padding: 0; }\
					div#maingame div.user_connection .logged_in_user { color: #ddd; }\
					\
					/* Chat tabs and main kong chat divs*/\
					td#chat_container_cell { display: flex; }\
					div#maingamecontent div#chat_container {\
						margin: 0;\
						background-color: #555;\
						border: 1px solid #151515;\
						height: 688px !important;\
						flex-grow: 0;\
						flex-shrink: 0;\
					}\
					div#kong_game_ui { overflow: hidden; }\
					div#kong_game_ui * { font-family: 'Open Sans', sans-serif; }\
					div#kong_game_ui ul.main_tabs {\
						display:flex;\
						margin: 0;\
						height: 27px;\
						background-color: #444;\
						border-bottom: 1px solid #151515;\
						width: calc(100% + 1px);\
					}\
					div#kong_game_ui ul.main_tabs li.tab { flex-grow: 1; margin: 0; float: none; }\
					div#kong_game_ui ul.main_tabs li.tab a {\
						background-color: #333;\
						color: #ddd;\
						padding: 7px 0 5px;\
						text-transform: none;\
						font-family: 'Open Sans', sans-serif;\
						font-size: 11px;\
						border: 1px solid #151515;\
						border-width: 0 0 1px 1px;\
						margin: 0;\
						display: flex;\
						justify-content: center;\
					}\
					div#kong_game_ui ul.main_tabs li.tab:first-child a { border-left: 0; }\
					div#kong_game_ui ul.main_tabs li.tab a:hover { background-color: #3a3a3a; }\
					div#kong_game_ui ul.main_tabs li.tab a.active {\
						background-color: #444;\
						color: #eee;\
						margin: 0;\
						padding: 7px 0 5px;\
						text-transform: uppercase;\
						border-bottom-color: #444;\
					}\
					div#kong_game_ui div.default_tab_pane_content {\
						background-color: #454545;\
						color: #eee;\
						height: calc(100% - 2px);\
						border: 1px solid #202020;\
						box-shadow: 0 0 10px -4px #000;\
					}\
					div#kong_game_ui div.tabpane {\
						background-color: #555;\
						padding: 0;\
						margin: 7px;\
						height: 646px !important;\
						width: calc(100% - 14px);\
					}\
					div#kong_game_ui div#chat_tab_pane.tabpane { display: flex; overflow: visible; }\
					div#kong_game_ui div#chat_tab_pane > div {\
					    flex-grow: 1;\
					    flex-shrink: 1;\
					    width: 1px;\
					}\
					div#kong_game_ui span.spinner_big {\
						width: 16px;\
						height: 16px;\
						background-position: 0 -32px;\
					}\
					div#kong_game_ui div.tabpane div.collapsible_panel {\
						margin-bottom: 10px !important;\
						border: 1px solid #202020;\
						box-shadow: 0 0 10px -4px #000;\
						padding: 0 !important;\
						margin-top: 0 !important;\
					}\
					div#kong_game_ui div#game_info .creatorinfo p, div#kong_game_ui p.gameplays {\
						white-space: nowrap;\
						text-overflow: ellipsis;\
						overflow: hidden;\
					}\
					div#kong_game_ui div.tabpane div.collapsible_panel p.panel_handle { \
						margin: 0 !important;\
						line-height: 24px;\
						background: none;\
						background-color: #404040;\
					}\
					div#kong_game_ui div.tabpane div.collapsible_panel p.panel_handle a {\
						font-family: 'Open Sans', sans-serif;\
						color: #ddd;\
						font-size: 10pt;\
						text-transform: none;\
						padding: 0 8px;\
					}\
					div#kong_game_ui div.tabpane div.collapsible_panel div.cntrToggle {\
						background-color: #494949 !important;\
						border-top: 1px solid #353535;\
						color: #eee;\
						margin: 0 !important;\
					}\
					div#kong_game_ui div#chat_room_chooser div.rooms_list {\
						background-color: transparent;\
						max-height: 566px;\
						margin: 10px 0 7px;\
					}\
					div#kong_game_ui div#chat_room_chooser div.return_to_room { text-align: center; }\
					div#kong_game_ui div#chat_room_chooser .choose_room_text {\
						margin: 8px 0 0;\
						color: #ddd;\
						padding: 5px 8px 4px;\
						background-color: #333;\
						border: 1px solid #202020;\
						border-bottom-color: #2c2c2c;\
					}\
					div#kong_game_ui div#chat_room_chooser div.room_list_header {\
						padding: 3px 8px 2px;\
						color: #ddd;\
						font-size: 8pt;\
						background-color: #3a3a3a;\
						border: 1px solid #202020;\
						border-top: 0;\
					}\
					div#kong_game_ui div#chat_room_chooser ul.rooms li.room {\
						display: flex;\
						padding: 2px 0;\
						justify-content: space-between;\
					}\
					div#kong_game_ui div#chat_room_chooser ul.rooms li.room p.name {\
						float: none;\
						margin-left: 7px;\
					    margin-right: 3px;\
						flex-grow: 1;\
						color: #ddd;\
						text-decoration: none;\
						white-space: nowrap;\
						overflow: hidden;\
						text-overflow: ellipsis;\
					}\
					div#kong_game_ui div#chat_room_chooser ul.rooms li.room p.name:hover { color: #f5f5f5 }\
					div#kong_game_ui div#chat_room_chooser ul.rooms li.room p.user_count {\
						float: none;\
						margin-right: 5px;\
						color: #fff;\
					}\
					div#chat_window {\
						border: 1px solid #202020;\
						box-shadow: 0 0 10px -4px #000;\
						background-color: #555;\
					}\
					div#kong_game_ui div.room_name_container {\
						margin: 0 !important;\
						color: #ddd;\
						font-size: 7pt;\
						background: #3a3a3a;\
						padding: 3px 6px;\
						display: flex;\
						border-bottom: 1px solid #202020;\
						font-family: 'Open Sans', sans-serif;\
						font-style: normal;\
					}\
					div#kong_game_ui div.room_name_container span.room_name {\
						margin-left: 3px;\
						text-transform: none;\
						color: #eee;\
						vertical-align: inherit;\
						font-size: 8pt;\
						flex-grow: 1;\
						max-width: none;\
					}\
					div#kong_game_ui a, div#kong_game_ui a:link,\
					div#kong_game_ui a:visited, div#kong_game_ui a:link:visited {\
						color: #ccc;\
						text-decoration: none;\
					}\
					div#kong_game_ui a:hover, div#kong_game_ui a:link:hover { color: #eee; }\
					div#chat_room_tabs {\
						display: flex;\
						/*width: calc(100% - 22px);*/\
						height: 22px;\
						background-color: #555;\
					}\
					div#chat_room_tabs > div.chat_room_tab {\
						flex-grow: 1;\
						width: 1px;\
						height: 16px;\
						border-right: 1px solid #202020;\
						border-bottom: 1px solid #202020;\
						background-color: #444;\
						color: #ccc;\
						padding-top: 2px;\
						z-index: 2;\
					}\
					div#chat_room_tabs > div.chat_room_tab:hover { background-color: #4c4c4c }\
					div#chat_room_tabs > div.chat_room_tab.active {\
						border-bottom-color: #555;\
						background-color: #555;\
						color: #fff;\
						text-transform: uppercase;\
					}\
					div#chat_room_tabs > div.chat_room_tab a {\
						font-size: 7pt;\
						display: flex;\
						justify-content: center;\
						float: none;\
						margin: 0;\
						padding: 0;\
						background-color: transparent !important;\
						text-decoration: none;\
					}\
					div#chat_room_tabs > div.chat_room_tab a span.unread_chat_messages {\
						flex-grow: 0;\
						right: 5px;\
						top: 3px;\
					}\
					div#kong_game_ui div#chat_window_header { position: relative; }\
					div#kong_game_ui div.chat_actions_container {\
						float: none;\
						/*position: absolute;\
						top: 22px;\
						right: 0;*/\
						z-index: 0;\
					}\
					div#kong_game_ui div.chat_actions_container span.btn_tools {\
						height: 18px;\
						line-height: 18px !important;\
						width: 23px;\
						background: none;\
						border: 0;\
						background-color: #444;\
						border-radius: 0;\
						color: #ddd !important;\
						border-bottom: 1px solid #202020;\
					}\
					div#kong_game_ui div.chat_actions_container span.btn_tools:hover {\
						background-color: #4c4c4c;\
					}\
					div#kong_game_ui div.chat_actions_container span.btn_tools span.kong_ico {\
						font-size: 12px;\
					}\
					div#kong_game_ui div.chat_actions_container ul.chat_actions_list {\
						background-color: #3a3a3a;\
						border: 1px solid #202020;\
						right: -1px;\
						border-radius: 0;\
						padding: 0;\
						box-shadow: 0 0 10px -3px #000;\
						top: 22px;\
						min-width: 140px;\
					}\
					div#kong_game_ui div.chat_actions_container ul.chat_actions_list li {\
						color: #ddd;\
						font-size: 10px;\
						line-height: 22px;\
					}\
					div#kong_game_ui div.chat_actions_container ul.chat_actions_list li:hover {\
						background-color: #4a4a4a;\
						color: #fff;\
					}\
					div#kong_game_ui div#accomplishments_tab_content {\
						border: 1px solid #202020;\
						background-color: #404040;\
						box-shadow: 0 0 10px -4px #000;\
						height: calc(100% - 4px);\
					}\
					div#kong_game_ui #accomplishments_pane_title {\
						font-family: 'Open Sans', sans-serif;\
						color: #ddd;\
						padding: 2px 4px;\
						white-space: nowrap;\
						overflow: hidden;\
						text-overflow: ellipsis;\
						float: none;\
						text-align: center;\
					}\
					div#kong_game_ui div.high_scores {\
						text-align: center;\
						background-color: #444;\
						border-top: 1px solid #353535;\
						margin: 0 !important;\
						padding: 2px 0 3px;\
					}\
					div#kong_game_ui ul.accomplishment_vtabs {\
						width: 60px;\
						margin: 0;\
						padding: 0;\
						z-index: 1;\
					}\
					div#kong_game_ui ul.accomplishment_vtabs li.vtab {\
						margin-bottom: 0;\
						border-bottom: 1px solid #202020;\
					}\
					div#kong_game_ui ul.accomplishment_vtabs li.vtab:first-child { border-top: 1px solid #202020; }\
					div#kong_game_ui ul.accomplishment_vtabs li.vtab a {\
						padding: 6px 0;\
						background-color: transparent;\
						margin: 0;\
						color: #bbb;\
					}\
					div#kong_game_ui ul.accomplishment_vtabs li.vtab a.active {\
						width: 61px;\
						margin: 0;\
						background-color: #505050;\
						color: #f0f0f0;\
						border: 0;\
						padding: 6px 0;\
					}\
					div#kong_game_ui ul.accomplishment_vtabs li.vtab a.active div.badge { margin: 2px 0 0 8px; }\
					div#kong_game_ui ul.accomplishment_vtabs li.vtab p {\
						margin: 0;\
						text-decoration: none;\
						padding: 0 !important;\
					}\
					div#kong_game_ui div.accomplishment_vtabpane_content {\
						background-color: #505050;\
						border: 0;\
						padding: 0 0 0 8px;\
						border-left: 1px solid #202020;\
						border-top: 1px solid #202020;\
						height: calc(100% - 66px) !important;\
						z-index: 0;\
					}\
					div#kong_game_ui div.accomplishment_vtabpane_inner {\
						padding: 0 8px 0 0;\
						color: #ddd;\
					}\
					div#kong_game_ui div.game_accomplishment em, div#game_info em	{ color: #aaa }\
					div#kong_game_ui a.show_more, div#kong_game_ui a.show_less { background: none; }\
					div#kong_game_ui div#holodeck_chat_promotion {\
						width: 100%;\
						background-color: #4a4a4a;\
						padding: 2px 0;\
						position: inherit;\
						border-top: 1px solid #202020;\
						height: 18px;\
					}\
					div#kong_game_ui div#holodeck_chat_promotion a {\
						text-overflow: ellipsis;\
						overflow-x: hidden;\
						white-space: nowrap;\
						width: calc(100% - 30px);\
					}\
					div#kong_game_ui div.users_in_room {\
						border-top: 1px solid #202020;\
						border-bottom: 1px solid #202020;\
						background-color: #606060;\
					}\
					div#kong_game_ui div.users_in_room > div { text-shadow: 0 0 3px #222; }\
					div#kong_game_ui div.users_in_room span.username { color: #fff; text-decoration: none; }\
					div#kong_game_ui div.users_in_room span.guild-name { color: #ddd; }\
					div#kong_game_ui div.users_in_room div.away span.username { color: #ddd }\
					div#kong_game_ui div.chat_message_window {\
						background-color: #464646;\
						border-top: 1px solid #202020;\
						border-bottom: 1px solid #202020;\
						height: 430px !important;\
					}\
					div#kong_game_ui div.chat_controls {\
						height: 56px;\
						margin-top: 3px;\
					}\
					div#kong_game_ui div.chat_controls textarea.chat_input {\
						height: 37px;\
						width: calc(100% - 8px);\
						background-color: #333;\
						outline: none;\
						margin: 0;\
						padding: 2px 4px;\
						color: #f5f5f5;\
						border-top: 1px solid #202020;\
						font-weight: 300;\
					}\
					div#kong_game_ui div.chat_controls span.chat_char_countdown {\
						background-color: #252525;\
						border-top: 1px solid #202020;\
						color: #bbb;\
						line-height: initial;\
					}\
					div#kong_game_ui div.chat_controls span.chat_char_countdown span.chat_chars_remaining {\
						color: #888;\
					}\
					div#kong_game_ui div.faye_disconnect_controls {\
						background-color: #752929;\
						border: 0;\
						color: #fff;\
						font-size: 8pt;\
						text-align: center;\
						height: 32px;\
						display: flex;\
						justify-content: center;\
						align-items: center;\
					}\
					div#kong_game_ui div.chat_message_window span.history-button {\
						border: 0;\
						background-color: #373737;\
						border-bottom: 1px solid #202020;\
						padding: 2px;\
						color: #ccc;\
						margin: 0;\
					}\
					div#kong_game_ui div.chat_message_window span.history-button:hover {\
						border-color: #202020;\
						background-color: #333;\
						color: #eee;\
					}\
					div#kong_game_ui div.chat_message_window span.history-spinner {\
						margin: 2px auto;\
						background-position-y: -32px;\
					}\
					div#kong_game_ui div.chat_message_window .even { background-color: transparent; }\
					div#kong_game_ui div.chat_message_window > div {\
						border-bottom: 1px solid #303030;\
						background-color: #3c3c3c;\
						color: #f5f5f5;\
						font-size: 11px;\
					}\
					div#kong_game_ui div.chat_message_window > div:nth-child(even) {\
						background-color: #404040;\
					}\
					div#kong_game_ui div.chat_message_window > div:last-child {\
						margin-bottom: -1px;\
					}\
					div#kong_game_ui div.chat-message > div.media {\
						background-color: #1a1a1a !important;\
					}\
					div#kong_game_ui div.chat_message_window > div > p {\
						margin: 0;\
						padding: 4px 5px;\
					}\
					div#kong_game_ui div.chat_message_window > div > p.whisper {\
						background-color: transparent;\
						font-style: normal;\
						margin: 0;\
						border-left: 4px solid #943;\
					}\
					div#kong_game_ui div.chat_message_window > div > div.script,\
					div#kong_game_ui div.chat_message_window > div > div.service {\
						border-left: 4px solid #69b;\
						text-align: center;\
						padding: 5px;\
						margin: 0;\
					}\
					div#kong_game_ui div.chat_message_window > div > p.raid {\
						border-right: 4px solid #777;\
					}\
					div#kong_game_ui div.chat_message_window > div > p.nm { border-right-color: #759 }\
					div#kong_game_ui div.chat_message_window > div > p.l { border-right-color: #855 }\
					div#kong_game_ui div.chat_message_window > div > p.h { border-right-color: #984 }\
					div#kong_game_ui div.chat_message_window > div > p.n { border-right-color: #795 }\
					div#kong_game_ui div.chat_message_window > div > p.visited.nm { border-right-color: #546; }\
					div#kong_game_ui div.chat_message_window > div > p.visited.l { border-right-color: #633; }\
					div#kong_game_ui div.chat_message_window > div > p.visited.h { border-right-color: #763; }\
					div#kong_game_ui div.chat_message_window > div > p.visited.n { border-right-color: #452; }\
					div#kong_game_ui div.chat_message_window > div > p.raid.dead { border-right-color: #555; }\
					div#kong_game_ui div.chat_message_window span.header {\
					    display: flex;\
					    margin-bottom: 1px;\
					    align-items: baseline;\
					}\
					div#kong_game_ui div.chat_message_window span.timestamp,\
					div#kong_game_ui div.chat_message_window span.extraid {\
						color: #ccc;\
						font-family: 'Open Sans', sans-serif;\
						font-weight: 300;\
					}\
					div#kong_game_ui div.chat_message_window span.timestamp > span,\
					div#kong_game_ui div.chat_message_window span.extraid { float: right; font-size: 10px; }\
					div#kong_game_ui div.chat_message_window p.raid.dead span.extraid,\
					div#kong_game_ui div.chat_message_window p.raid.dead span a { color: #888; }\
					div#kong_game_ui div.chat_message_window span.sticker {\
					    font-size: 9px;\
                        background-color: #888;\
                        color: #333;\
                        line-height: 11px;\
                        padding: 1px 0 0;\
                        font-weight: 800;\
                        width: 30px;\
                        text-align: center;\
					}\
					div#kong_game_ui div.chat_message_window span.username {\
						color: #8cf;\
						text-decoration: none;\
						text-shadow: 0 0 5px #111;\
						padding-right: 1px;\
					}\
					div#kong_game_ui div.chat_message_window span.username:hover { text-decoration: underline; }\
					div#kong_game_ui div.chat_message_window span.separator {\
						padding-right: 1px;\
					}\
					div#kong_game_ui div.chat_message_window p.service span.separator,\
					div#kong_game_ui div.chat_message_window p.service span.header,\
					div#kong_game_ui div.chat_message_window p.service span.username { display: none }\
					div#kong_game_ui div.chat_message_window span.username.is_self,\
					div#kong_game_ui div.chat_message_window .sent_whisper span.username { color: #e65; }\
					div#kong_game_ui div.chat_message_window span.guildname {\
						font-style: italic;\
						color: #ddd;\
						padding-left: 2px;\
					}\
					div#kong_game_ui div.chat_message_window span.guildname:before { content: '('; }\
					div#kong_game_ui div.chat_message_window span.guildname:after { content: ')'; }\
					div#kong_game_ui div.chat_message_window .message {\
					    max-width: 99%;\
					    font-weight: 300;\
                        color: #fff;\
					}\
					div#kong_game_ui div.chat_message_window .message img {\
						display: block;\
						margin: 5px auto 2px;\
						max-width: 100%;\
						max-height: 200px;\
						cursor: pointer\
					}\
					div#kong_game_ui div.chat_message_window .message embed {\
					    height: auto;\
                        margin: 4px auto -2px;\
                        display: inline-block;\
					}\
					div#kong_game_ui div.chat_message_window .message a {\
						color: #E29F1F;\
						text-shadow: 0 0 3px #111;\
					}\
					div#kong_game_ui div.chat_message_window .message a:hover { color: #FFB019; }\
					\
					/* Game datails field (1st one below game frame)*/\
					div.game_details_outer:before, div.game_details_outer:after { background-image: none !important; }\
					div.game_details_outer { color: #fff; border: 0; padding: 15px 18px 0; margin: 0 auto 20px; }\
					div.game_details_outer div.game_user_rating,\
					div.game_details_outer div.game_pub_plays { border-color: #bbb; border-style: solid; border-width: 0 1px; }\
					div.game_details_outer div.game_details_upper { border-bottom: 1px solid #bbb; } \
					div.game_details_outer > ul.game_stats_cont { right: 0; top: 0; } \
					div.game_details_outer li.game_stat { border: 0; margin: 0; padding: 4px 8px 0;}\
					div.game_details_outer .highcontrast { color: white !important; }\
					div.game_details_outer a:link,\
					div.game_details_outer a:link:visited { color: #ccc; text-decoration: none; }\
					div.game_details_outer a:link:hover  { color: #fff; text-decoration: none; }\
					div.game_details_outer div.game_tags > ul.tags { height: auto; }\
					div.game_details_outer div.game_tags > ul.tags > li.tag > a.term:link,\
					div.game_details_outer div.game_tags > ul.tags > li.tag > a.term:link:visited { background-color: #606060; box-shadow: none; padding: 2px 4px; color: #eee; }\
					div.game_details_outer div.game_tags > ul.tags > li.tag > a.term:link:hover { background-color: #404040; box-shadow: none; }\
					div.game_details_outer div.game_tags a.add_tags { background-color: #b34040; box-shadow: none; padding: 2px 4px;}\
					div.game_details_outer div.game_tags a.add_tags:hover { background-color: #710000; box-shadow: none; }\
					div.game_details_outer div.game_pub_plays { color: #bbb; }\
					ul#quicklinks li { background-color: transparent !important; }\
					\
					div#kong_game_ui div.chat_message_window div.raidinfo {\
						background-size: cover;\
						background-repeat: no-repeat;\
						background-position-x: 50%;\
						background-blend-mode: saturation;\
						border-left: 0 !important;\
					}\
					div.chat_message_window div.raidinfo div.name {\
						font-size: 12px;\
						text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;\
						color: #fff;\
						font-weight: bold;\
					}\
					div.chat_message_window div.raidinfo div.race {\
						color: #eee;\
						text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;\
						font-size: 10px;\
						font-weight: bold;\
						font-style: italic;\
					}\
					div.chat_message_window table.raidinfo {\
						width: 100%;\
						border-collapse: collapse;\
						font-size: 10px;\
						margin-top: 7px;\
					}\
					div.chat_message_window table.raidinfo td {\
						border-right: 1px solid #666;\
						border-bottom: 1px solid #666;\
						background-color: rgba(0, 0, 0, 0.7);\
					}\
					div.chat_message_window table.raidinfo tr:first-child td:first-child { background-color: transparent; }\
					div.chat_message_window table.raidinfo td:last-child { border-right: 0 }\
					div.chat_message_window table.raidinfo tr:last-child td { border-bottom: 0 }\
					div.chat_message_window table.raidinfo td:first-child,\
					div.chat_message_window table.raidinfo tr:first-child td { font-weight: 600 }\
					\
					";

                        DRMng.Util.cssStyle('DRMng_kongCSS',kongCSS);

                        setTimeout(DRMng.Kong.setHeaderWidth, 500);
                    }
                },
                Raids:           {
                    filter: '',
                    all: [],
                    deadCache: {},
                    locked: false,
                    bootstrap: true,
                    joinQueue: [],
                    joinLen: 0,
                    joined: 0,
                    isJoining: false,
                    isPreparing: false,
                    isJoiningOne: false,
                    isAuto: false,
                    count: 0,
                    server: null,
                    checkAndSend: function() {
                        let link = document.getElementById('DRMng_submitRaidLink');
                        let r = DRMng.Util.getRaidFromUrl(link.innerHTML, DRMng.UM.user.name);
                        if (r && !isNaN(+r.id) && r.hash.length === 10 && ['Kasan','Elyssa'][r.pid] === DRMng.Config.local.server)
                        {
                            let delay = parseInt(document.getElementById('DRMng_submitDelay').value);
                            let delayBase = document.querySelector('[group=DRMng_submitDelay].crimson').innerHTML;
                            //noinspection FallThroughInSwitchStatementJS
                            switch (delayBase) {
                                case 'day': delay *= 24;
                                case 'hr': delay *= 60;
                                default: delay *= 60000;
                            }
                            r.delay = delay;
                            delete r.sid;
                            DRMng.Engine.client.emit('service', { action: 'delayedSub', data: r });
                        }
                        else DRMng.UI.submitResponse(0,'Paste proper raid link before submitting');
                        link.innerHTML = 'Paste raid link here';
                        link.className = 'default';
                    },
                    cleanDeadCache: function() {
                        let deadThr = new Date().getTime() - 180000;
                        for (let dead in this.deadCache)
                            if (this.deadCache.hasOwnProperty(dead) && this.deadCache[dead] < deadThr)
                                delete this.deadCache[dead];
                        setTimeout(DRMng.Raids.cleanDeadCache.bind(this), 180000);
                    },
                    joinMsg: function(m) {
                        let msg = m ? m : "Joined " + this.joined + " out of " + this.joinLen;
                        DRMng.UI.displayStatus(msg);
                    },
                    join: function(r, multi) {
                        r = r && r.id ? r : DRMng.Raids.get(r);
                        multi = multi ? 's' : '';
                        if (r) {
                            let u = DRMng.UM.user;
                            if (u.qualified) {
                                let authData = 'kongregate_user_id=' + u.ID + '&kongregate_game_auth_token=' + u.authToken;
                                let raidData = '&kv_raid_id=' + r.id + '&kv_hash=' + r.hash + '&serverid=' + (r.sid || (DRMng.Config.local.server === 'Elyssa' ? '1' : '2'));
                                let data = {
                                    eventName: 'DRMng.joinRaid' + multi,
                                    url: 'http://50.18.191.15/kong/raidjoin.php?' + authData + raidData,
                                    method: 'GET',
                                    ext: r,
                                    timeout: 10000
                                };
                                DRMng.postMessage(data);
                            }
                            else {
                                console.warn("[DRMng] {Raids} User not qualified in join! How that happened huh?", DRMng.UM.user);
                                this.joined++;
                                DRMng.Raids.joinMsg();
                            }
                        }
                        else {
                            console.warn("[DRMng] {Raids} Bad data passed to join:", r);
                            this.joined++;
                            DRMng.Raids.joinMsg();
                        }
                    },
                    prepareJoining: function() {
                        if (this.isJoining) return;
                        this.isPreparing = true;
                        let i, l, name;
                        this.joinQueue = [];
                        for (i = 0, l = this.all.length; i < l; ++i) {
                            name = this.all[i].boss + '_' + this.all[i].diff;
                            if (!this.all[i].visited &&
                                !this.all[i].isFull &&
                                this.filter.indexOf('@'+name) !== -1) this.joinQueue.push(this.all[i]);
                        }
                        this.joinLen = this.joinQueue.length;
                        this.isPreparing = false;
                        if (this.joinLen > 0 && this.isAuto) this.joinAll();
                        else DRMng.UI.displayStatus();
                    },
                    pushToQueue: function(r, useFilter) {
                        useFilter = useFilter || false;
                        if (!useFilter || !r.isFull) {
                            this.joinQueue.push(r);
                            this.joinLen++;
                        }
                    },
                    switchAutoJoin: function() {
                        let button = document.getElementById('DRMng_autoJoin');
                        if (this.isAuto) {
                            this.isAuto = false;
                            button.className = '';
                        }
                        else {
                            this.joinAll();
                            this.isAuto = true;
                            button.className = 'crimson';
                        }
                    },
                    joinAll: function() {
                        if (this.isJoining || !this.joinLen) return;
                        if (this.isPreparing) {
                            setTimeout(this.joinAll.bind(this), 5);
                            return;
                        }
                        let i, l;
                        this.isJoining = true;
                        this.joined = 0;

                        for (i = 0, l = Math.min(this.joinLen, 10); i < l; ++i)
                            setTimeout(DRMng.Raids.join.bind(this, this.joinQueue.shift(), true), i);
                    },
                    joinOne: function(r) {
                        if (this.isJoining) this.pushToQueue(r);
                        else if (this.isPreparing) setTimeout(this.joinOne.bind(this, r), 5);
                        else setTimeout(DRMng.Raids.join.bind(this, r, false), 1);
                    },
                    processJoin: function(id, text) {
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
                    joinResponse: function(e) {
                        let data = JSON.parse(e.data);
                        if (data && data.status === 200 && data.responseText && data.url) {
                            let status = DRMng.Raids.processJoin(data.ext.id, data.responseText);
                            let name = DRMng.Config.local.raidData[data.ext.boss];
                            status = ['Unknown','Success','Dead','Already in','Wrong Guild','Invalid'][status];
                            name = name ? name.sName : data.ext.boss;
                            DRMng.Raids.joinMsg('Joining ' + name + ': ' + status);
                            setTimeout(DRMng.Raids.prepareJoining.bind(DRMng.Raids), 1);
                        }
                    },
                    joinMultiResponse: function(e) {
                        DRMng.Raids.joined++;
                        let data = JSON.parse(e.data);
                        if (data && data.status === 200 && data.responseText && data.url) {
                            let status = DRMng.Raids.processJoin(data.ext.id, data.responseText);

                            if (DRMng.Raids.joinLen > 1) DRMng.Raids.joinMsg();
                            else {
                                let name = DRMng.Config.local.raidData[data.ext.boss];
                                name = name ? name.sName : data.ext.boss;
                                status = ['Unknown','Success','Dead','Already in','Wrong Guild','Invalid'][status];
                                DRMng.Raids.joinMsg('Joining ' + name + ': ' + status);
                            }
                        }
                        let r = DRMng.Raids.joinQueue.shift();
                        if (r) setTimeout(DRMng.Raids.join.bind(this, r, true), 1);
                        else if (DRMng.Raids.joined === DRMng.Raids.joinLen) {
                            DRMng.Raids.isJoining = false;
                            setTimeout(DRMng.Raids.prepareJoining.bind(DRMng.Raids),1);
                        }
                    },
                    getDiff: function(d) {
                        let diff = d ? d.slice(1) : 0;
                        diff = isNaN(parseInt(diff)) ?
                            ({'n': 1, 'h': 2, 'l': 3, 'nm': 4, 'nnm': 5})[diff.toLowerCase()] || 0 : parseInt(diff);
                        return diff;
                    },
                    processFilter: function(filterTxt, loading) {
                        window.DEBUG && console.info('[DRMng] Raw filter data:', filterTxt);
                        let server = DRMng.Config.local.server.toLowerCase();
                        if (DRMng.Raids.isAuto) DRMng.Raids.switchAutoJoin();
                        if (loading) filterTxt = DRMng.Config.local.filterString[server];
                        else {
                            DRMng.Config.local.filterString[server] = filterTxt;
                            DRMng.Config.saveLocal();
                        }
                        let parts = filterTxt.split(/\s?\|\s?|\sor\s|\s?,\s?/ig);
                        let filters = {add :{raid: [], magic: []}, rem: {raid: [], magic: []}};
                        let raids, diff, r, reg, i, d, result = [];
                        // prepare filters
                        for (let p of parts) {
                            let mode = p[0] === '-' ? 'rem' : 'add';
                            p = mode === 'rem' ? p = p.slice(1) : p;
                            p = /(\w:)?([\w-]+)(:\w{1,5})?/.exec(p);
                            if (p) switch (p[1]) {
                                case 'm:':
                                    filters[mode].magic.push(p[2]);
                                    break;
                                case 'k:':
                                    reg = /z(\d{1,2})-(\d{1,2})/.exec(p[2]); raids = [];
                                    if (reg) for (i = reg[1]; i <= reg[2]; ++i) {
                                        d = DRMng.Config.local.filterData['z' + i];
                                        if (d) raids = raids.concat(d);
                                    }
                                    else raids = p[2] === 'all' ?
                                        Object.keys(DRMng.Config.local.raidData) : DRMng.Config.local.filterData[p[2]];

                                    if (raids) {
                                        diff = this.getDiff(p[3]);
                                        for (let r of raids) filters[mode].raid.push([r, diff]);
                                    }
                                    break;
                                default:
                                    raids = DRMng.Config.local.raidData;
                                    reg = new RegExp(p[2], "ig");
                                    diff = this.getDiff(p[3]);
                                    for (r in raids)
                                        if (raids.hasOwnProperty(r) && (r + ' ' + raids[r].sName).search(reg) !== -1)
                                            filters[mode].raid.push([r, diff]);
                                    break;
                            }
                        }
                        // merge
                        raids = DRMng.Config.local.raidData;
                        if (filters.add.raid.length > 0)
                            for (r of filters.add.raid) {
                                i = raids[r[0]]; i = i ? i.hp : [1,1,1,1];
                                if (i[3] !== undefined && [0,4,5].indexOf(r[1]) !== -1) result.push(r[0] + '_4');
                                if (i[2] !== undefined && [0,3].indexOf(r[1]) !== -1) result.push(r[0] + '_3');
                                if (i[1] !== undefined && [0,2].indexOf(r[1]) !== -1) result.push(r[0] + '_2');
                                if (i[0] !== undefined && [0,1,5].indexOf(r[1]) !== -1) result.push(r[0] + '_1');
                            }
                        else
                            for (r of DRMng.Config.local.raidKeys) {
                                i = raids[r]; i = i ? i.hp.length : 4;
                                for (d = 1; d <= i; ++d) result.push(r+'_'+d);
                            }
                        if (filters.rem.raid.length > 0)
                            for (r of filters.rem.raid) {
                                i = raids[r[0]]; i = i ? i.hp : [1,1,1,1];
                                let arr = [];
                                if (i[3] !== undefined && [0,4,5].indexOf(r[1]) !== -1) arr.push(r[0] + '_4');
                                if (i[2] !== undefined && [0,3].indexOf(r[1]) !== -1) arr.push(r[0] + '_3');
                                if (i[1] !== undefined && [0,2].indexOf(r[1]) !== -1) arr.push(r[0] + '_2');
                                if (i[0] !== undefined && [0,1,5].indexOf(r[1]) !== -1) arr.push(r[0] + '_1');
                                for (i of arr) {
                                    d = result.indexOf(i);
                                    if (d !== -1) result.splice(d, 1);
                                }
                            }

                        if (window.DEBUG) {
                            console.info("Add magic filters:", filters.add.magic.join(', '));
                            console.info("Remove magic filters:", filters.rem.magic.join(', '));
                            console.info("Add raid filters:", filters.add.raid.join(', '));
                            console.info("Remove raid filters:", filters.rem.raid.join(', '));
                            //console.info("Merged raid filters:", result.join(', .'));
                        }

                        // joining filter
                        this.filter = '@' + result.join('@');
                        if (!this.bootstrap && !this.isJoining) setTimeout(this.prepareJoining.bind(this), 10);

                        // UI filter
                        let content = '.drm_' + result.join(', .drm_') + ' { display: flex !important; }';
                        DRMng.Util.cssStyle('DRMng_RaidsCSS', content);
                    },
                    setChat: function(id,cls) {
                        let els = document.getElementsByClassName(id);
                        for (let i = 0; i < els.length; ++i)
                            if (els[i].className.indexOf(cls) === -1) els[i].className += ' ' + cls;
                    },
                    setVisited: function(id, drop) {
                        let server = DRMng.Config.local.server.toLowerCase();
                        let idx = DRMng.Config.local.visited[server].indexOf(id);
                        if (drop && idx !== -1) DRMng.Config.local.visited[server].splice(idx, 1);
                        else if (idx === -1) {
                            DRMng.Config.local.visited[server].push(id);
                            idx = this.getIdx(id);
                            if (idx !== -1) {
                                this.all[idx].visited = true;
                                let el = document.getElementById('DRMng_' + id);
                                if (el) el.className += ' visited';
                            }
                        }
                        if (!drop) this.setChat(id, 'visited');
                        DRMng.Config.saveLocal();
                    },
                    comp: function(a, b) { return a.hp - b.hp; },
                    _setComp: function(field) {
                        switch(field) {
                            case 'id':
                                this.comp = function (a, b) { return parseInt(a.id) - parseInt(b.id) };
                                break;
                            case 'health':
                                this.comp = function (a, b) { return a.hp - b.hp; };
                                break;
                            case 'name': /* by name then by hp */
                                this.comp = function (a, b) {
                                    let an = a.sname || a.boss;
                                    let bn = b.sname || b.boss;
                                    if (an < bn) return -1;
                                    if (an > bn) return 1;
                                    return a.hp - b.hp;
                                };
                                break;
                            case 'time':
                                this.comp = function (a, b) { return  a.createtime - b.createtime; };
                                break;
                            default:
                                field = 'health';
                                this.comp = function (a, b) { return a.hp - b.hp; };
                                DRMng.Config.local.sortBy = field;
                                DRMng.Config.saveLocal();
                        }
                    },
                    setComp: function(field) {
                        if (this.locked || this.bootstrap) {
                            setTimeout(DRMng.Raids.setComp.bind(this, field), 10);
                            return;
                        }
                        this.locked = true;

                        this._setComp(field);

                        DRMng.Config.local.sortBy = field;
                        DRMng.Config.saveLocal();
                        this.sort();
                        DRMng.UI.clearRaidList();
                        for (let i = 0, l = this.all.length; i < l; ++i) DRMng.UI.addRaidField(this.all[i]);
                        this.locked = false;
                    },
                    get: function(id) {
                        let i = this.getIdx(id);
                        return i !== -1 ? this.all[i] : null;
                    },
                    getIdx: function(id) {
                        for (let i = 0, len = this.all.length; i < len; ++i) if (this.all[i].id == id) return i;
                        return -1;
                    },
                    sort: function() {
                        this.all.sort(this.comp);
                    },
                    insertAll: function(val) {
                        if (this.locked) {
                            setTimeout(DRMng.Raids.insertAll.bind(this, val), 10);
                            return;
                        }
                        this.bootstrap = true;
                        this.server = DRMng.Config.local.server.toLowerCase();
                        this.all = [];
                        let newVisited = [], rd, hFilter;

                        for (let i = 0, l = val.length; i < l; ++i)
                        {
                            hFilter = DRMng.Config.local.filterRaids[this.server][val[i].boss] || null;
                            if (hFilter === null || !hFilter[val[i].diff-1])
                            {
                                val[i].createtime = new Date(val[i].createtime).getTime();
                                if (DRMng.Config.local.visited[this.server].indexOf(val[i].id) !== -1)
                                {
                                    newVisited.push(val[i].id);
                                    val[i].visited = true;
                                    this.setChat(val[i].id, 'visited');
                                }
                                rd = DRMng.Config.local.raidData[val[i].boss];
                                val[i].isFull = rd && val[i].participants && rd.maxPlayers == val[i].participants;
                                this.all.push(val[i]);
                            }
                        }

                        DRMng.Config.local.visited[this.server] = newVisited;

                        this._setComp(DRMng.Config.local.sortBy);
                        this.all.sort(this.comp);

                        this.count = this.all.length;
                        DRMng.UI.clearRaidList();
                        for (let i = 0, l = this.all.length; i < l; ++i) DRMng.UI.addRaidField(this.all[i]);

                        DRMng.UI.displayStatus();
                        setTimeout(this.prepareJoining.bind(this), 100);
                        this.bootstrap = false;
                    },
                    insert: function(raid) {
                        if (this.locked || this.bootstrap) {
                            setTimeout(DRMng.Raids.insert.bind(this, raid), 10);
                            return;
                        }
                        this.locked = true;

                        let hFilter = DRMng.Config.local.filterRaids[this.server][raid.boss];
                        if (hFilter === null || !hFilter[raid.diff-1]) {
                            if (this.getIdx(raid.id) === -1 && !this.deadCache.hasOwnProperty(raid.id)) {
                                let idx = this.location(raid) + 1;
                                raid.visited = DRMng.Config.local.visited[DRMng.Config.local.server.toLowerCase()].indexOf(raid.id) !== -1;
                                let rd = DRMng.Config.local.raidData[raid.boss];
                                raid.isFull = !!(rd && raid.participants && rd.maxPlayers == raid.participants);
                                this.all.splice(idx, 0, raid);
                                DRMng.UI.addRaidField(raid, idx);
                                this.count++;
                                DRMng.UI.displayStatus();
                                if (!raid.visited && !raid.isFull &&
                                    this.filter.indexOf('@' + raid.boss + '_' + raid.diff) !== -1)
                                {
                                    if (this.isJoining) setTimeout(this.pushToQueue.bind(this, raid), 1);
                                    else setTimeout(this.prepareJoining.bind(this), 1);
                                }
                            }
                        }

                        this.locked = false;
                    },
                    remove: function(id, serverNuke) {
                        if (this.locked || this.bootstrap) {
                            setTimeout(DRMng.Raids.remove.bind(this, id, serverNuke), 10);
                            return;
                        }
                        this.locked = true;

                        this.deadCache[id] = new Date().getTime();
                        let i = this.getIdx(id);
                        if (i !== -1) {
                            let r = this.get(id);
                            this.all.splice(i, 1);
                            this.count--;
                            if (!this.isJoining && this.filter.indexOf('@' + r.boss + '_' + r.diff) !== -1)
                                setTimeout(this.prepareJoining.bind(this), 10);
                        }
                        DRMng.UI.removeRaidField(id);

                        // visited strip
                        let server = DRMng.Config.local.server.toLowerCase();
                        i = DRMng.Config.local.visited[server].indexOf(id);
                        if (i !== -1) DRMng.Config.local.visited[server].splice(i, 1);
                        this.setChat(id, 'dead');
                        this.setVisited(id, true);
                        DRMng.UI.displayStatus();

                        if (serverNuke) DRMng.Engine.client.emit('service', { action: 'raidNuke', data: id });

                        this.locked = false;
                    },
                    update: function(raid, full) {
                        if (this.locked || this.bootstrap) {
                            setTimeout(DRMng.Raids.update.bind(this, raid, full), 10);
                            return;
                        }
                        this.locked = true;

                        let r = this.get(raid.id);
                        if (r && !this.deadCache.hasOwnProperty(raid.id))
                        {
                            let keys = ['hp','participants','m1','m2','m3','m4','m5','m6'];
                            let rd = DRMng.Config.local.raidData[raid.boss], markFull = false;
                            if (full) keys = keys.concat(['mnum','size']);
                            r = DRMng.Util.copyFields(raid,r,keys);

                            if (!r.isFull)
                            {
                                r.isFull = rd && r.participants && rd.maxPlayers == r.participants;
                                markFull = r.isFull;
                            }

                            // remove
                            let i = this.getIdx(raid.id);
                            if (i !== -1) this.all.splice(i, 1);
                            DRMng.UI.removeRaidField(raid.id);

                            // insert
                            i = this.location(r) + 1;
                            this.all.splice(i, 0, r);
                            DRMng.UI.addRaidField(r, i);

                            // handle raid becoming full on update
                            if (markFull && !this.isJoining
                                && this.filter.indexOf('@' + raid.boss + '_' + raid.diff) !== -1)
                                setTimeout(this.prepareJoining.bind(this), 1);
                        }

                        this.locked = false;
                    },
                    location: function(val, start, end) {
                        let len = this.all.length;
                        if (len === 0) return -1;

                        let s = start !== undefined ? start : 0;
                        let e = end !== undefined ? end : len;
                        let p = (s+e) >> 1;
                        let c = this.comp(val, this.all[p]);
                        if (e-s <= 1) return c < 0 ? p-1 : p;

                        if (c < 0) return this.location(val, s, p);
                        if (c === 0) return p;
                        if (c > 0) return this.location(val, p, e);
                    },
                    init: function() { setTimeout(this.cleanDeadCache, 180000); }
                },
                UM: {
                    numTries: 0,
                    knownUsers: {},
                    user: { qualified: false, ID: null, name: null, IGN: null, authToken: null, guild: null },
                    getBasicUserData: function() {
                        if (typeof active_user === 'object' && active_user.username().toLowerCase() !== 'guest') {
                            this.user.ID = active_user.id();
                            this.user.name = active_user.username();
                            this.user.authToken = active_user.gameAuthToken();
                            setTimeout(this.getExtendedUserData.bind(this), 1);
                        }
                        else {
                            console.info("[DRMng] {UserManager} User data not ready, trying again in .10 sec");
                            setTimeout(this.getBasicUserData.bind(this), 100);
                        }
                    },
                    getUserNode: function() {
                        let guild = holodeck._chat_window._rooms_by_type.guild,
                            users = guild.users();

                        if (users.length !== 0) {
                            // set IGN
                            for (let i = 0, l = users.length; i < l; ++i)
                                if (users[i].username === this.user.name)
                                { this.user.IGN = users[i]._game_character_name; break; }

                            // set guild
                            this.user.guild = guild._room.name;

                            // qualify user data
                            this.user.qualified = true;
                        }
                        else setTimeout(this.getUserNode.bind(this), 100);
                    },
                    getExtendedUserData: function() {
                        if (holodeck && holodeck.ready && holodeck._chat_window._rooms_by_type) {
                            if (holodeck._chat_window._rooms_by_type.guild) setTimeout(this.getUserNode.bind(this), 1);
                            else if (this.numTries++ < 20) {
                                console.info("[DRMng] {UserManager} Guild data missing, trying again in 1 sec" +
                                    " (%d/20)", this.numTries + 1);
                                setTimeout(this.getExtendedUserData.bind(this), 1000);
                            }
                            else {
                                console.warn('[DRMng] {UserManager} Guild info missing. Mutiks advice: "Join private' +
                                    ' guild!"');
                                this.user.guild = "";
                                this.user.IGN = "";
                                this.user.qualified = true;
                            }
                        }
                        else setTimeout(this.getExtendedUserData.bind(this), 100);
                    },
                    getUserData: function() {
                        // Needed to log into raids Engine
                        this.numTries = 0;
                        this.user.qualified = false;
                        setTimeout(this.getBasicUserData.bind(this), 1);
                    }
                },
                Engine:          {
                    client: null,
                    changeServer: function(server) {
                        server = server || (DRMng.Config.local.server === 'Elyssa' ? 'Kasan' : 'Elyssa');
                        this.client.disconnect();
                        DRMng.Config.local.server = server;
                        DRMng.Config.saveLocal();
                        this.client.nsp = '/' + server;
                        DRMng.Raids.processFilter('', true);
                        DRMng.UI.setupFilterBox();
                        DRMng.UI.setupFilterTab();
                        setTimeout(this.client.connect.bind(this.client),1000);
                        //this.client.connect('http://remote.erley.org:3000/' + server, {multiplex: false})
                    },
                    reconnect: function() {
                        this.client.disconnect();
                        setTimeout(this.client.connect.bind(this.client),1000);
                    },
                    init: function() {
                        if (typeof io === 'function' && DRMng.UM.user.qualified) {
                            this.client = io
                                .connect('http://remote.erley.org:3000/' + DRMng.Config.local.server, {multiplex: false})
                                .on('error', function(data) { console.warn('[DRMng] {Engine} Error:', data) })
                                .on('msg', this.handleMessage)
                                .on('service', this.handleService)
                                .on('disconnect', function() { console.warn('[DRMng] {Engine} Socket client' +
                                    ' disconnected.') })
                                .on('connect', function() {
                                    console.info('[DRMng] {Engine} Socket connection established, joining...');
                                    this.client.emit('join', {
                                        usr: DRMng.UM.user.name, ign: DRMng.UM.user.IGN, gld: DRMng.UM.user.guild,
                                        chk: DRMng.Config.local.checkSums });
                                }.bind(this));
                        }
                        else {
                            console.info("[DRMng] {Engine} Resources not ready, trying again in 1 sec...");
                            setTimeout(this.init.bind(this), 1000);
                        }
                    },
                    handleMessage: function(d) { console.info('[DRMng] {Engine} Message event:', d); },
                    handleService: function(d) {
                        switch(d.action) {
                            case 'raidData':
                                if (DRMng.Config.local.checkSums.raidData !== d.data.raidDataHash &&
                                    d.data.raidDataHash.length > 6) {
                                    console.info("[DRMng] {Engine} New raids data! Old hash: %s | New hash: %s",
                                        DRMng.Config.local.checkSums.raidData, d.data.raidDataHash);
                                    setTimeout(DRMng.UI.setupFilterTab.bind(DRMng.UI, d.data.raidData), 1);
                                    DRMng.Config.local.raidData = d.data.raidData;
                                    DRMng.Config.local.checkSums.raidData = d.data.raidDataHash;
                                    DRMng.Config.saveLocal();
                                    //console.info(d.data);
                                }
                                else setTimeout(DRMng.UI.setupFilterTab.bind(DRMng.UI), 1);
                                break;
                            case 'filterData':
                                if (DRMng.Config.local.checkSums.filterData !== d.data.filterDataHash &&
                                    d.data.filterDataHash.length > 6) {
                                    console.info("[DRMng] {Engine} New keywords data! Old hash: %s | New hash: %s",
                                        DRMng.Config.local.checkSums.filterData, d.data.filterDataHash);
                                    DRMng.Config.local.filterData = d.data.filterData;
                                    DRMng.Config.local.checkSums.filterData = d.data.filterDataHash;
                                    DRMng.Config.saveLocal();
                                }
                                //console.info(d.data);
                                break;
                            case 'tiersData':
                                if (DRMng.Config.local.checkSums.tiersData !== d.data.tiersDataHash &&
                                    d.data.tiersDataHash.length > 6) {
                                    console.info("[DRMng] {Engine} New tiers data! Old hash: %s | New hash: %s",
                                        DRMng.Config.local.checkSums.tiersData, d.data.tiersDataHash);
                                    DRMng.Config.local.tiersData = JSON.parse(d.data.tiersData);
                                    DRMng.Config.local.checkSums.tiersData = d.data.tiersDataHash;
                                    DRMng.Config.saveLocal();
                                }
                                //console.info(d.data);
                                break;
                            case 'bootStrap':
                                console.log("[DRMng] {Engine} Bootstrap:", d);
                                setTimeout(DRMng.Raids.insertAll.bind(DRMng.Raids,d.raids), 1);
                                break;
                            case 'newRaid':
                                setTimeout(DRMng.Raids.insert.bind(DRMng.Raids, d.data), 1);
                                break;
                            case 'nukedRaid':
                                setTimeout(DRMng.Raids.remove.bind(DRMng.Raids, d.data), 1);
                                break;
                            case 'partialUpdate':
                                setTimeout(DRMng.Raids.update.bind(DRMng.Raids, d.data, false), 1);
                                break;
                            case 'fullUpdate':
                                setTimeout(DRMng.Raids.update.bind(DRMng.Raids, d.data, true), 1);
                                break;
                            case 'delayedSub':
                                let mode = d.data.error ? 0 : 1;
                                setTimeout(DRMng.UI.submitResponse.bind(DRMng.UI, mode, d.data.msg), 1);
                                break;
                            default:
                                console.info('[DRMng] {Engine} Unknown data:', d);
                        }
                    }
                },
                Alliance: {
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
                        update: function() {
                            // update keys
                            this.keys = Object.keys(this.fields);
                            // sort userlist
                            this.keys.sort();
                            // clear list
                            while(this.html.firstChild) this.html.removeChild(this.html.firstChild);
                            // fill it up again
                            this.count = this.keys.length;

                            for (let i = 0; i < this.count; ++i)
                                this.html.appendChild(this.fields[this.keys[i]].html);

                            DRMng.Alliance.countUpdate();
                        },
                        add: function(user, noUpdate) {
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
                        del: function(name) {
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
                    User: function(name, ign, guild, socket) {
                        this.html = null;
                        this.name = name || null;
                        this.ign = ign || "";
                        this.guild = guild || "";
                        this.sock = socket || null;
                        this.setup = function() {
                            if (this.name) {
                                this.html = document.createElement('div');
                                this.html.setAttribute('style', 'display: flex; margin: 1px 2px; align-items: center;');
                                let span;
                                span = document.createElement('span');
                                span.setAttribute('style', 'font-size: 9px; background-color: #4a4a4a; color: #ddd;' +
                                    ' line-height: 11px; padding: 1px 0 0; font-weight: 700; width: 30px;' +
                                    ' text-align: center; text-shadow: 0 0 5px #333; flex-grow: 0; flex-shrink: 0;' +
                                    ' margin-right: 5px; border: 1px solid #363636;');
                                span.textContent = this.guild ? DRMng.Alliance.getGuildTag(this.guild) : '???';
                                this.html.appendChild(span);

                                span = document.createElement('span');
                                span.setAttribute('style','flex-grow: 0; flex-shrink: 0; color: #f0f0f9;' +
                                    ' margin-right: 4px; padding-bottom: 1px;');
                                span.textContent = this.name;
                                this.html.appendChild(span);

                                span = document.createElement('span');
                                span.setAttribute('style','flex-grow: 1; flex-shrink: 1; color: #ddd; font-style:' +
                                    ' italic; padding-bottom: 1px; text-overflow: ellipsis; overflow: hidden;');
                                span.textContent = '(' + this.ign + ')';
                                this.html.appendChild(span);
                            }
                            return this;
                        };
                        return this.setup();
                    },
                    countUpdate: function() {
                        if (this.active)
                            this.count.textContent = this.users.count;
                    },
                    nameUpdate: function() {
                        let name = this.conf.name ? this.conf.name : (this.conf.channel + ' alliance');
                        name = name.trim();
                        name = name.charAt(0).toUpperCase() + name.slice(1);
                        document.querySelector('.room_name.h6').textContent = name;
                    },
                    getGuildTag: function(guild) {
                        let roman = /^(.+\s)([IXV]+)$/.exec(guild);
                        if (roman) guild = roman[1] + DRMng.Util.deRomanize(roman[2]);
                        let reg = /([A-Z]+|\w)\w*/g;
                        let tag = '', part;
                        while (part = reg.exec(guild)) tag += part[1];
                        return tag
                    },
                    initConfig: function() {
                        this.conf = DRMng.Config.local.alliance;
                        //DRMng.Config.saveLocal();
                    },
                    setUnread: function(unset) {
                        if (this.unr) {
                            unset = unset || false;
                            this.unr.setAttribute('style', unset ? 'display: none' : '');
                        }
                    },
                    initTab: function() {
                        let actions = document.getElementById('chat_actions_container');
                        let tabs = document.getElementById('chat_room_tabs');
                        let gr = document.getElementById('guild_room_tab');
                        if (tabs && actions && gr && actions.parentNode === tabs) {
                            let tab = document.createElement('div');
                            tab.setAttribute('id', 'alliance_room_tab');
                            tab.setAttribute('class', 'chat_room_tab');
                            tab.style.setProperty('display', 'none');

                            let a = document.createElement('a');
                            a.setAttribute('href', '#');
                            a.innerHTML = 'Alliance';
                            a.addEventListener('click', function() {
                                holodeck._chat_window._active_room.hide();
                                if (this.tab) {
                                    this.tab.setAttribute('class', 'chat_room_tab active');
                                    this.tab.style.setProperty('border-right', '0');
                                }
                                if (this.body) this.body.style.removeProperty('display');
                                this.setUnread(true);
                                this.active = true;
                                setTimeout(this.nameUpdate.bind(this), 1);
                                setTimeout(this.countUpdate.bind(this), 1);
                                setTimeout(this.scrollToBottom.bind(this), 1);
                            }.bind(this));

                            let span = document.createElement('span');
                            span.setAttribute('class', 'unread_chat_messages spriteall spritegame');
                            span.setAttribute('style', 'display: none');
                            span.innerHTML = 'Unread';
                            this.unr = span;

                            a.appendChild(span);
                            tab.appendChild(a);

                            this.tab = tab;
                            this.tabs = tabs;

                            // modify kong function to include new Alliance tab
                            ChatRoom.prototype.show = function() {
                                if (DRMng.Alliance && !DRMng.Alliance.conf.sbs) {
                                    DRMng.Alliance.active = false;
                                    if (DRMng.Alliance.tab) {
                                        DRMng.Alliance.tab.setAttribute('class', 'chat_room_tab');
                                        DRMng.Alliance.tab.style.removeProperty('border-right');
                                    }
                                    if (DRMng.Alliance.body)
                                        DRMng.Alliance.body.style.setProperty('display', 'none');
                                }
                                this._node.show();
                                this.updateRoomHeader();
                                this._chat_actions_node.show();
                                this._tab_for_room.addClassName("active");
                                this._unread_message_node.hide();
                                this.scrollToBottom();
                            };
                            ChatRoom.prototype.isActive = function() {
                                let drm = DRMng ? (DRMng.Alliance.active && !DRMng.Alliance.conf.sbs) : false;
                                return !drm && this == this._chat_window.activeRoom()
                            };

                            this.tabs.insertBefore(this.tab, actions);

                            this.count = document.getElementsByClassName('number_in_room')[0];

                            console.info("[DRMng] {Alliance} Chat tab created.");

                            setTimeout(this.initBody.bind(this),1);
                        }
                        else setTimeout(this.initTab.bind(this), 100);
                    },
                    initBody: function() {
                        let container = document.getElementById(this.conf.sbs ? 'alliance_chat_sbs' : 'chat_rooms_container');
                        if (container) {
                            if (this.body === null) {
                                this.body = document.createElement('div');
                                this.body.style.setProperty('width', '100%');

                                if (!this.conf.sbs) this.body.style.setProperty('display', 'none');

                                let usr = document.createElement('div');
                                usr.setAttribute('class', 'chat_tabpane users_in_room clear');
                                this.users.html = usr;

                                let chat = document.createElement('div');
                                chat.setAttribute('class', 'chat_message_window');
                                this.chat = chat;

                                let inputDiv = document.createElement('div');
                                inputDiv.setAttribute('class', 'chat_controls');

                                let inputArea = document.createElement('textarea');
                                inputArea.setAttribute('class', 'chat_input');
                                inputArea.value = 'Enter text for chat here';
                                this.input = inputArea;

                                this.input.addEventListener('focus', function () {
                                    if (this.input.value === 'Enter text for chat here') {
                                        this.input.value = '';
                                        this.input.style.removeProperty('font-style');
                                    }
                                }.bind(this));
                                this.input.addEventListener('blur', function () {
                                    if (this.input.value === '') {
                                        this.input.value = 'Enter text for chat here';
                                        this.input.style.setProperty('font-style', 'italic');
                                    }
                                }.bind(this));
                                this.input.addEventListener('keydown', function (e) {
                                    //console.log(e.which, e.keyCode, e.charCode, e.key, e.shiftKey);
                                    switch (e.key) {
                                        case 'Enter':
                                            if (!e.shiftKey) {
                                                this.send();
                                                e.preventDefault();
                                            }
                                            break;
                                    }
                                }.bind(this));
                                this.input.addEventListener('keyup', function () {
                                    if (this.input.value !== 'Enter text for chat here') {
                                        let txt = /^(\/\w*\s?)?([\S\s]*)$/.exec(this.input.value);
                                        txt = txt[2] || "";
                                        if (this.inputCnt) this.inputCnt.textContent = txt.length;
                                    }
                                }.bind(this));

                                let cnt = document.createElement('span');
                                cnt.setAttribute('class', 'chat_chars_remaining');
                                cnt.textContent = '0';
                                this.inputCnt = cnt;

                                let cntCont = document.createElement('span');
                                cntCont.setAttribute('class', 'chat_char_countdown');
                                cntCont.appendChild(this.inputCnt);
                                cntCont.appendChild(document.createTextNode('/Inf'));

                                inputDiv.appendChild(this.input);
                                inputDiv.appendChild(cntCont);
                                this.body.appendChild(this.users.html);
                                this.body.appendChild(this.chat);
                                this.body.appendChild(inputDiv);

                                console.info("[DRMng] {Alliance} Chat body created.");
                            }

                            let sbs = document.getElementById('alliance_chat_sbs');
                            sbs.style.setProperty('display', 'none');
                            this.tab.style.setProperty('display', 'none');

                            if (this.client && this.client.connected) {
                                if (this.conf.sbs) sbs.style.removeProperty('display');
                                else this.tab.style.removeProperty('display');
                            }
                            else setTimeout(this.setup.bind(this), 1);

                            container.appendChild(this.body);
                            this.scrollToBottom();

                            console.info("[DRMng] {Alliance} Chat body attached to DOM.");
                        }
                        else setTimeout(this.initBody.bind(this), 100);
                    },
                    setup: function(channel, password) {
                        if (this.conf.enabled) {
                            if (typeof io === 'function' && this.tab && this.chat && DRMng.UM.user.qualified) {

                                if (DRMng.Alliance.conf.sbs)
                                    document.getElementById('alliance_chat_sbs').style.removeProperty('display');
                                else
                                    this.tab.style.removeProperty('display');

                                let usr = DRMng.UM.user;
                                let user = { usr: usr.name, ign: usr.IGN, gld: usr.guild };

                                let ch = channel || this.conf.channel;
                                let pass = password || this.conf.pass;

                                if (!ch || !pass) {
                                    this.conf.enabled = false;
                                    DRMng.Config.saveLocal();
                                    return;
                                }

                                if (this.client && this.client.connected) this.client.disconnect();
                                else this.client =
                                    io.connect(`http://remote.erley.org:3000/${ch}`,
                                        { query: `token=${DRMng.Util.crc32(pass)}`, multiplex: false });

                                this.client.on('error', function(d) {
                                    console.warn("[DRMng] {Alliance} Chat client error:", d);
                                    this.setButton();
                                    document.getElementById('alliance_chat_sbs').style.setProperty('display', 'none');
                                    this.tab.style.setProperty('display', 'none');
                                    //destroyChat();
                                }.bind(this));

                                this.client.on('disconnect', function() {
                                    console.warn('[DRMng] {Alliance} Chat client disconnected!');
                                    this.setButton();
                                }.bind(this));

                                this.client.on('connect', function() {
                                    //console.info('[DRMng] {Alliance} Socket connection established, joining...');
                                    // clear chat window
                                    this.clear();
                                    // login to server
                                    this.client.emit('join', user);
                                    console.info("[DRMng] {Alliance} User login data [%s|%s|%s]", user.usr, user.ign, user.gld);
                                    // save data if valid
                                    if (channel) this.conf.channel = channel;
                                    if (password) this.conf.pass = password;
                                    DRMng.Config.saveLocal();
                                    // set button in leave mode
                                    this.setButton(true);
                                }.bind(this));

                                this.client.on('msg', this.messageEvent.bind(this));
                                this.client.on('service', this.serviceEvent.bind(this));
                            }
                            else {
                                console.info('[DRMng] {Alliance} Resources not ready, trying again in 1 sec...');
                                setTimeout(this.setup.bind(this, channel, password), 1000);
                            }
                        }
                    },
                    clear: function() {
                        let c = DRMng.Alliance.chat;
                        while (c.firstChild) c.removeChild(c.firstChild);
                    },
                    send: function(msg) {
                        msg = msg || this.input.value;
                        if (msg && msg !== 'Enter text for chat here') {
                            let pm = /^\/w\s(\w+?)\s([\S\s]+)$/.exec(msg);
                            if (pm && pm[1] && pm[2]) this.client.emit('msg', {type: 1, user: pm[1], text: pm[2]});
                            else holodeck.processChatCommand(msg,true) && this.client.emit('msg', {type: 0, text: msg});
                            this.input.value = '';
                        }
                    },
                    serviceEvent: function(data) {
                        let usr;
                        switch (data.act) {
                            case 'loadData':
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
                                for (let i = 0, l = data.log.length; i < l; ++i) this.messageEvent(data.log[i], true);
                                if (this.messageBuffer.length > 0) {
                                    let data;
                                    while (data = this.messageBuffer.shift()) this.messageEvent(data, true);
                                }
                                this.messageLock = false;

                                console.log("[DRMng] {Alliance} LOAD:", data);
                                break;

                            case 'userJoin':
                                usr = data.user;
                                setTimeout(this.users.add(new this.User(usr.usr, usr.ign, usr.gld, usr.sid)), 1);
                                break;

                            case 'userLeave':
                                usr = data.user;
                                setTimeout(this.users.del(usr.usr), 1);
                                break;

                            default:
                                console.log("[DRMng] {Alliance} SRV:",data);
                        }
                    },
                    sbsEvent: function(e) {
                        //console.log(e.target);
                        /*
                        let usr = e.target.getAttribute('username');
                        if (usr) {
                            this.input.value = `/w ${usr} `;
                            this.input.focus();
                        }
                        */
                        setTimeout(DRMng.UI.handleChatClick.bind(DRMng.UI, e, true), 1);
                    },
                    messageTmpl: new Template(
                        '<p class="#{mainCls}">' +
                            '<span class="header">' +
                                '<span class="timestamp" style="flex-grow: 1">#{ts}</span>' +
                                '<span class="sticker">#{tag}</span>' +
                            '</span>' +
                            '<span style="display: block">' +
                                '<span username="#{user}" class="#{userCls}">#{pfx}#{user}</span>' +
                                '<span class="#{ignCls}">#{ign}</span>' +
                                '<span class="separator">: </span>' +
                                '<span class="message hyphenate">#{msg}</span>' +
                            '</span>' +
                        '</p>'
                    ),
                    serviceMessage: function(msg, ri) {
                        if (msg) {
                            let s = ri ? ` style="background-image: linear-gradient( rgba(0, 0, 0, 0.5), rgba(250, 250, 250, 0.9) 100px ), url(https://5thplanetdawn.insnw.net/dotd_live/images/bosses/${ri}.jpg);"` : '',
                                c = ri ? 'service raidinfo' : 'service',
                                d = document.createElement('div');
                            d.setAttribute('class', 'chat-message');
                            d.innerHTML = `<div class="${c}"${s}>${msg}</div>`;
                            if (this.chat.appendChild(d)) this.scrollToBottom();
                        }
                    },
                    raidMessage: function(data, pc, uc, pfx) {
                        let msg = /(^.*?)(https?...www.kongregate.com.+?action_type.raidhelp.+?)(\s[\s\S]*$|$)/.exec(data.txt);
                        if (msg) {
                            let r = DRMng.Util.getRaidFromUrl(msg[2], data.usr.usr);
                            if (r) {
                                let srv = DRMng.Config.local.server.toLowerCase(), g = this.getGuildTag(data.usr.gld),
                                    v = DRMng.Config.local.visited, l, m = msg[1] + msg[3],
                                    i = DRMng.Config.local.raidData[r.boss], n = [], s = m ? ':' : '',
                                    t = new Date(data.ts).format("mmm d, HH:MM"), u = data.usr.usr,
                                    ign = data.usr.ign;

                                pc.push('raid');
                                pc.push(['n', 'h', 'l', 'nm'][r.diff - 1]);
                                pc.push(r.id);
                                (v[srv].indexOf(r.id) > -1) && pc.push('visited');

                                n.push(['N', 'H', 'L', 'NM'][r.diff - 1]);
                                n.push(i ? i.sName : r.boss.replace(/_/g, ' ').toUpperCase());

                                l = `{id:'${r.id}',hash:'${r.hash}',boss:'${r.boss}',sid:'${r.sid}'}`;
                                l = `DRMng.Raids.joinOne(${l}); return false;`;

                                let f = i ? DRMng.Util.getShortNumK(i.hp[r.diff-1]*1000/i.maxPlayers) : '';
                                f = `${i && i.maxPlayers === 90000 ? 'ER/WR' : `FS ${f}`}`;

                                return `<p class="${pc.join(' ')}">
                                                    <span class="header">
                                                        <span class="sticker" style="line-height: 12px;margin-right: 3px;width: 26px;">${g}</span>
                                                        <span class="timestamp" style="flex-grow: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-right: 3px;">${t}</span>
                                                        <a href="${msg[2]}" onclick="${l}" style="font-size: 10px; text-transform: uppercase; flex-shrink: 0;">${n.join(' ')}</a>
                                                    </span>
                                                    <span style="display: flex">
                                                        <span username="${u}" class="${uc.join(' ')}">${pfx}${u}</span>
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
                    messageEvent: function(data, history) {
                        if (data.type === 4) this.serviceMessage(data.txt);
                        else if (!this.messageLock || history) {
                            let u = DRMng.UM.user,
                                t = data.type,
                                e = ['username', 'truncate'],
                                f = data.usr.usr === u.name,
                                h = ['', 'From ', 'To ', ''][t],
                                g = [];

                            e.push('chat_message_window' + (c ? '_undecorated' : '') + '_username');
                            h && g.push('whisper');
                            (t === 1) && g.push('received_whisper');
                            (t === 2) && g.push('sent_whisper');
                            f && e.push("is_self");

                            let content = this.raidMessage(data, g, e, h);
                            if (!content) {
                                let reg = /(https?\S+[^,\s])/g, l, link, start, end, msg = data.txt;

                                while (l = reg.exec(msg)) {
                                    if (/\.(jpe?g|a?png|gif)$/.test(l[1]))
                                        link = `<img src="${l[1]}" alt="${l[1]}" onclick="window.open(this.src)">`;
                                    else if (/(prntscr.com|prnt.sc)/.test(l[1])) {
                                        let id = `prntsc_${new Date().getTime()}`;
                                        link = `<img id="${id}" onclick="window.open(this.src)">`;
                                        setTimeout(DRMng.Util.Gate.lightShot.bind(DRMng.Util.Gate,l[1],id), 1);
                                    }
                                    else
                                        link = `<a href="${l[1]}" target="_blank">${l[1].replace(/^https?:\/\//, '')}</a>`;
                                    start = msg.substr(0, reg.lastIndex - l[1].length);
                                    end = msg.slice(reg.lastIndex);
                                    msg = start + link + end;
                                    reg.lastIndex += link.length - l[1].length;
                                }

                                content = this.messageTmpl.evaluate({
                                    mainCls: g.join(" "),
                                    ts:      new Date(data.ts).format("mmm d, HH:MM"),
                                    pfx:     h,
                                    user:    data.usr.usr,
                                    userCls: e.join(' '),
                                    ign:     data.usr.ign || '',
                                    ignCls:  data.usr.ign ? 'guildname truncate' : '',
                                    tag:     this.getGuildTag(t === 2 ? u.guild : data.usr.gld) || '???',
                                    msg:     msg
                                });
                            }
                            let msg = document.createElement('div');
                            msg.setAttribute('class', 'chat-message');
                            msg.innerHTML = content;
                            this.chat.appendChild(msg);
                            if (this.active || this.conf.sbs) this.scrollToBottom();
                            else this.setUnread();
                        }
                        else this.messageBuffer.push(data);
                    },
                    scrollToBottom: function() { this.chat.scrollTop = this.chat.scrollHeight; },
                    setButton: function(conn) {
                        let b = document.getElementById('DRMng_allianceJoin');
                        if (b) {
                            conn = conn || false;
                            if (conn) {
                                b.setAttribute('class', 'l');
                                b.textContent = 'Leave';
                            }
                            else {
                                b.setAttribute('class', 'n');
                                b.textContent = 'Join';
                                this.conf.enabled = false;
                            }
                            DRMng.UI.setChatWidth();
                        }
                    },
                    action: function(b) {
                        let a = DRMng.Alliance;
                        if (a.conf.enabled) {
                            a.conf.enabled = false;
                            if (a.client.connected) a.client.disconnect();
                            holodeck._chat_window.showActiveRoom();
                            if (DRMng.Alliance.conf.sbs)
                                document.getElementById('alliance_chat_sbs').style.setProperty('display', 'none');
                            else
                                this.tab.style.setProperty('display', 'none');
                        }
                        else {
                            let ch = document.getElementById('DRMng_allianceChnl'),
                                ps = document.getElementById('DRMng_alliancePass');
                            if (!ch.getAttribute('class') && !ps.getAttribute('class')) {
                                a.conf.enabled = true;
                                setTimeout(a.setup.bind(a, ch.value, ps.value), 1);
                            }
                        }
                    },
                    init: function() {
                        this.initConfig();
                        setTimeout(this.initTab.bind(this), 1000);
                    }
                },
                UI: {
                    Groups: {},
                    Group: function(alias, title, visible) {
                        this.fields = [];
                        this.html = null;
                        this.cont = null;
                        this.setup = function(alias, title, visible) {
                            if (alias && title) {
                                visible = visible || false;
                                let groupDiv = document.createElement('div');
                                groupDiv.setAttribute('class', visible ? 'group flex' : 'group flex hide');
                                groupDiv.setAttribute('group', 'option');
                                let titleDiv = document.createElement('div');
                                titleDiv.setAttribute('class', 'title');
                                titleDiv.addEventListener('click', DRMng.UI.roll.bind(this, titleDiv));
                                titleDiv.innerHTML = "" + title;
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
                        this.add = function(option) {
                            if (option && option instanceof DRMng.UI.Option) {
                                this.fields.push(option);
                                if (this.cont) this.cont.appendChild(option.html);
                            }
                            return this;
                        };
                        return this.setup(alias, title, visible);
                    },
                    Option: function() {
                        this.html = null;
                        this.conf = null;
                        this.cbFn = null;
                        this.group = "";
                        this.field = "";
                        let _title = "", _desc = "";
                        this.setup = function(alias, title, value) {
                            if (alias !== null) {
                                let name = alias.split('_');
                                this.group = name[0] || "other";
                                this.field = name[1] || alias;
                                _title = title || this.field;
                                if (DRMng.Config.local[this.group] === undefined) DRMng.Config.local[this.group] = {};
                                this.conf = DRMng.Config.local[this.group];
                                if (this.conf[this.field] === undefined) this.conf[this.field] = value || false;
                            }
                            return this;
                        };
                        this.getConf = function() { return this.conf[this.field]; };
                        this.flipConf = function() {
                            this.conf[this.field] = !this.conf[this.field];
                            DRMng.Config.saveLocal();
                        };
                        this.desc = function(desc) {
                            if (desc) _desc = desc;
                            return this;
                        };
                        this.event = function(callback) {
                            if (callback && typeof callback === 'function') this.cbFn = callback;
                            return this;
                        };
                        this.make = function(group) {
                            let optionDiv = document.createElement('div');
                            optionDiv.setAttribute('class', 'buttonStripe');
                            optionDiv.setAttribute('style', 'flex-wrap: wrap; overflow: hidden; max-height: 74px;');

                            let titleField = document.createElement('span');
                            titleField.setAttribute('style', 'background-color: #444; font-size: 9pt;');
                            titleField.innerHTML = "" + _title;

                            let button = document.createElement('button');
                            button.setAttribute('class', this.getConf() ? "n" : "l");
                            button.setAttribute('style', 'border-left-color: #3a3a3a;');
                            button.addEventListener('click', function(e) {
                                this.flipConf();
                                e.target.setAttribute('class', this.getConf() ? "n" : "l");
                                e.target.innerHTML = this.getConf() ? "On" : "Off";

                                console.info("Options button hit:", this);
                                console.info("And its event target:", e.target);

                                if (typeof this.cbFn === 'function') this.cbFn.call(this, e);

                            }.bind(this));
                            button.innerHTML = this.getConf() ? "On" : "Off";

                            optionDiv.appendChild(titleField);
                            optionDiv.appendChild(button);

                            if (typeof this.cbFn === 'function') this.cbFn.call(this, {target: button});

                            if (_desc) {
                                let descField = document.createElement('div');
                                descField.setAttribute('style', 'border-top: 1px solid #404040; background-color:' +
                                    ' #505050; padding: 3px 6px; border-left: 0; font-size: 10px; font-style:' +
                                    ' italic; max-height: 45px; overflow: hidden; color: #fff; font-weight: 300;');
                                descField.innerHTML = "" + _desc;
                                optionDiv.appendChild(descField);
                            }

                            this.html = optionDiv;

                            if (group && group instanceof DRMng.UI.Group) group.add(this);

                            return this;
                        };
                    },
                    addRaidField: function(r, idx) {
                        //console.log("UI adding elem %f, %d", r.hp, idx);
                        let div = document.createElement('div');
                        div.id = 'DRMng_' + r.id;
                        let diff = ['N', 'H', 'L', 'NM'][r.diff - 1];
                        // classes
                        let cls = [diff.toLowerCase()];
                        r.visited && cls.push('visited');
                        cls.push('drm_' + r.boss + '_' + r.diff);
                        div.className = cls.join(' ');
                        let extInfo = DRMng.Config.local.raidData[r.boss];
                        let name = extInfo ? extInfo.sName : r.boss.replace(/_/g,' ');
                        let isWER = extInfo && extInfo.maxPlayers === 90000;
                        div.innerHTML =
                            '<span>' + diff + ' ' + name + '</span>' +
                            '<span>' + (isWER ? 'Infinite HP' : 'HP: '+((r.hp * 100).toPrecision(3).slice(0,4))+'%') + '</span>';
                        div.addEventListener('mouseenter', DRMng.UI.infoEvent);
                        let list = document.getElementById('DRMng_RaidList');

                        if (idx === undefined) list.appendChild(div);
                        else {
                            let chLen = list.children.length;
                            if (idx === chLen) list.appendChild(div);
                            else list.insertBefore(div, list.children[idx]);
                        }

                        if (list.scrollTop < 30) list.scrollTop = 0;
                    },
                    removeRaidField: function(id) {
                        let r = document.getElementById('DRMng_' + id);
                        if (r) r.parentNode.removeChild(r);
                    },
                    clearRaidList: function() { document.getElementById('DRMng_RaidList').innerHTML = ''; },
                    statusTimer: null,
                    displayStatus: function(msg) {
                        let server = DRMng.Config.local.server;
                        let statusContainer = document.getElementById('DRMng_status');
                        if (!msg && (!this.statusTimer || this.statusTimer.getTimeLeft() <= 0)) {
                            if (DRMng.Raids.joinLen > 0)
                                statusContainer.innerHTML = server + ' | ' + DRMng.Raids.count + ' raids, ' + DRMng.Raids.joinLen + ' selected';
                            else statusContainer.innerHTML = server + ' | ' + DRMng.Raids.count + ' raids in list';
                            this.statusTimer = null;
                        }
                        else if (msg) {
                            statusContainer.innerHTML = server + ' | ' + msg;
                            if (this.statusTimer) this.statusTimer.restart();
                            else this.statusTimer = new DRMng.Timer(DRMng.UI.displayStatus.bind(this), 4000);
                        }
                    },
                    submitResponseTimeout: 0,
                    submitResponse: function(mode,msg) {
                        clearTimeout(this.submitResponseTimeout);
                        let respDiv = document.getElementById('DRMng_submitResponse');
                        msg = msg || 'Unidentified event occurred';
                        switch (mode) {
                            case 0: mode = ' error'; break;
                            case 1: mode = ' success'; break;
                            default: mode = ' regular'; break;
                        }
                        if (respDiv) {
                            respDiv.innerHTML = msg;
                            respDiv.className += mode;
                        }
                        this.submitResponseTimeout = setTimeout(function(){
                            document.getElementById('DRMng_submitResponse').className='textField';
                        },60000);
                    },
                    createCSS: function() {
                        let content = "\
					#DRMng_main {\
						height: 55px;\
						width: 250px;\
						position: fixed;\
						top: 0;\
						right: 0;\
						border-left: 1px solid #444;\
						background-color: transparent;\
						font-family: 'Open Sans', sans-serif;\
						z-index: 10001;\
						overflow: hidden;\
						transition: height .3s, border-color .3s, background-color 1s .3s linear, box-shadow .3s;\
					}\
					#play.slim #DRMng_main { height: 28px; }\
					#DRMng_main.active {\
						height: 100% !important;\
						border-left-color: #101010;\
						box-shadow: 0 0 10px -2px #000;\
						background-color: #3a3a3a;\
						transition: height .3s, border-color .3s, background-color .2s, box-shadow .3s;\
					}\
					#DRMng_header {\
						display: flex;\
						color: #fff;\
						height: 27px;\
						border-bottom: 1px solid #444;\
					}\
					#DRMng_main.active #DRMng_header {\
						color: #ddd;\
						border-bottom-color: #101010;\
					}\
					#DRMng_onoff {\
						flex-grow: 0;\
						flex-shrink: 0;\
						font-family: 'KongIco', sans-serif;\
						font-size: 11px;\
						padding: 7px 9px;\
						cursor: pointer;\
						border-left: 1px solid #444;\
					}\
					#DRMng_onoff:hover { background-color: #222; }\
					#DRMng_onoff > div {\
						transform: rotate(90deg);\
						transition: transform .5s;\
					}\
					#DRMng_main.active #DRMng_onoff > div {\
						transform: rotate(-90deg);\
					}\
					#DRMng_status {\
						flex-grow: 1;\
						font-size: 12px;\
						font-weight: 600;\
						padding: 6px 10px;\
						text-align: center;\
						white-space: nowrap;\
						overflow: hidden;\
						text-overflow: ellipsis;\
						text-shadow: 0 0 8px #000;\
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
						background-color: transparent;\
						padding: 6px 8px 5px;\
						border: 1px solid #444;\
						border-left: 0;\
						border-top: 0;\
						color: #fff;\
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
						background-color: rgba(255,255,255,0.1);\
						border-bottom-color: #444;\
						color: #fff;\
					}\
					#DRMng_main.active #DRMng_nav > div {\
						background-color: #303030;\
						border-color: #101010;\
						color: #d0d0d0;\
					}\
					#DRMng_main.active #DRMng_nav > div.active {\
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
						height: calc(100% - 58px);\
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
						background-color: #404040;\
						border-width: 1px 0;\
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
					#DRMng_RaidList > div.visited > span:first-child:before { content: '* '; }\
					/*#DRMng_RaidList > div:nth-child(odd) {\
						background-color: #404040;\
					}*/\
					#DRMng_RaidList > div:hover {\
						color: #f0f0f0;\
					}\
					#DRMng_RaidList > div.nm:hover {\
						background: linear-gradient(to right,#435,#333 25%);\
					}\
					#DRMng_RaidList > div.l:hover {\
						background: linear-gradient(to right,#533,#333 25%);\
					}\
					#DRMng_RaidList > div.h:hover {\
						background: linear-gradient(to right,#553,#333 25%);\
					}\
					#DRMng_RaidList > div.n:hover {\
						background: linear-gradient(to right,#353,#333 25%);\
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
						max-height: 22px;\
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
						padding: 4px 6px 3px;\
						text-align: center;\
						word-break: break-all;\
						background: #4c4c4c;\
						max-height: 76px;\
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
						background-image: url('http://mutik.erley.org/img/magics.png?" + (new Date().getTime()) + "');\
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
						width: 34px;\
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
					#alliance_chat_sbs {\
					    border: 1px solid #222;\
                        display: flex;\
                        align-items: flex-end;\
                        margin-left: 7px;\
                        box-shadow: 0 0 10px -4px #000;\
					}\
					#alliance_chat_sbs div.users_in_room { height: 145px; }\
					";

                        DRMng.Util.cssStyle('DRMng_CSS',content);

                        // raid list filtering css
                        DRMng.Util.cssStyle('DRMng_RaidsCSS','dummy');
                        DRMng.Raids.processFilter('', true);
                    },
                    setupFilterBox: function() {
                        let server = DRMng.Config.local.server.toLowerCase();
                        let el = document.getElementById('DRMng_txtFilter');
                        if (DRMng.Config.local.filterString[server]) {
                            el.innerHTML = DRMng.Config.local.filterString[server];
                            el.className = '';
                        }
                        else {
                            el.innerHTML = 'Filter raids here';
                            el.className = 'default';
                        }
                    },
                    setupFilterTab: function(raidData) {
                        let server = DRMng.Config.local.server.toLowerCase();
                        let filters = DRMng.Config.local.filterRaids[server];
                        let raids = raidData || DRMng.Config.local.raidData;
                        let fltDivs = [
                            document.getElementById('DRMng_filterSmall'),
                            document.getElementById('DRMng_filterMedium'),
                            document.getElementById('DRMng_filterLarge'),
                            document.getElementById('DRMng_filterEpic'),
                            document.getElementById('DRMng_filterColossal'),
                            undefined, //personal raids not supported
                            document.getElementById('DRMng_filterGigantic')
                        ];

                        let div = null;
                        for (div of fltDivs) if (div) div.innerHTML = '';

                        let i;
                        for (let r in raids) {
                            if (raids.hasOwnProperty(r)) {
                                i = raids[r];
                                if (!i.isGuild && !i.isEvent) {
                                    if (!filters.hasOwnProperty(r)) filters[r] = [false, false, false, false];
                                    div = document.createElement('div');
                                    div.className = "buttonStripe";
                                    div.id = 'DRMng_filter_' + r;
                                    div.innerHTML = '<span>' + i.fName + '</span>';
                                    for (let d = 0, flt; d < 4; d++) {
                                        flt = filters[r][d] ? 'Off' : 'On';
                                        div.innerHTML += '<button class="' + ['n ','h ','l ','nm '][d]
                                            + flt.toLowerCase() + '">' + flt + '</button>';
                                    }
                                    div.addEventListener('click', DRMng.UI.applyFilter);
                                    fltDivs[i.size].appendChild(div);
                                }
                            }
                        }
                    },
                    applyDiffFilter: function(id) {
                        let mode = id && id.split('_');
                        if (mode[0] === 'DRMngFilter') {
                            let diff = parseInt(mode[2]); mode = parseInt(mode[1]);
                            if (diff > 0 && mode > 0) {
                                mode = !!(mode-1); diff = diff-1;
                                let server = DRMng.Config.local.server.toLowerCase();
                                let flt = DRMng.Config.local.filterRaids[server];
                                let fk = Object.keys(flt);
                                for (let i = 0, len = fk.length; i < len; ++i) flt[fk[i]][diff] = mode;
                                DRMng.Config.saveLocal();
                                DRMng.UI.setupFilterTab();
                                document.getElementById('DRMng_filterApply').parentNode.removeAttribute('style');
                            }
                        }
                    },
                    applyFilter: function(e) {
                        let el = e.target; if (el.tagName !== 'SPAN' && el.tagName !== 'BUTTON') el = el.children[0];
                        let server = DRMng.Config.local.server.toLowerCase();
                        let btns = el.parentNode.getElementsByTagName('BUTTON');
                        let id = el.parentNode.id.substr(13);
                        let spanHit = el.tagName === 'SPAN';
                        let flt = DRMng.Config.local.filterRaids[server][id];
                        let i, diff;

                        if (spanHit) {
                            let flts = 0;
                            for (i = 0; i < 4; ++i) if (flt[i]) flts += 1 << i;
                            diff = (flts !== 15 && flts !== 0) ? flts : 15;
                        }
                        else diff = { n:1, h:2, l:4, nm:8 }[el.className.split(' ')[0]];

                        for (i = 0; i < 4; ++i) if (diff & (1 << i)) {
                            flt[i] = !flt[i];
                            btns[i].innerText = flt[i] ? 'Off' : 'On';
                            btns[i].className = btns[i].className.split(' ')[0] + ' ' + btns[i].innerText.toLowerCase();
                        }

                        document.getElementById('DRMng_filterApply').parentNode.removeAttribute('style');

                        DRMng.Config.saveLocal();
                    },
                    sidebarLabelOpen: function(e) {
                        let labels = document.querySelectorAll('#DRMng_Sidebar > div.label:not(.hidden)');
                        for (let i=0; i<labels.length; ++i) if (labels[i] !== e.target) labels[i].className += ' hidden';
                        e.target.className = 'label';
                    },
                    setupSidebarButton: function(button) {
                        if (!button || !button.name) return null;

                        let btn = document.createElement('button');
                        btn.innerText = button.name;

                        if (button.command) {
                            switch (button.action) {
                                case 'func':
                                    btn.setAttribute('onclick', button.command);
                                    break;
                                case 'chat':
                                    btn.setAttribute('onclick', "holodeck._active_dialogue._holodeck.processChatCommand('" + button.command + "')");
                                    break;
                                case 'www':
                                    btn.setAttribute('onclick', "window.open('" + button.command + "')");
                                    break;
                            }
                        }
                        return btn;
                    },
                    setupSidebar: function() {
                        let left = true;
                        let sb = document.createElement('div');
                        let scData = {
                            groups: [
                                { 	name: 'Raids', hidden: false,
                                    buttons: [
                                        {name: 'Emall', action: 'chat', command: '/raid elite mall'},
                                        {name: 'Cecil', action: 'chat', command: '/raid elite cecil'},
                                        {name: 'Mang', action: 'chat', command: '/raid elite manger'},
                                        {name: 'Whisp', action: 'chat', command: '/raid elite whisp'}
                                    ]
                                },
                                {	name: 'Sheet', hidden: true,
                                    buttons: [
                                        {
                                            name: 'Proc', action: 'www',
                                            command: 'https://docs.google.com/spreadsheets/d/1YTbJ0wgJUygdmix6a8BzLThrHhDINX943aadjboOTj8'
                                        },
                                        {
                                            name: 'Magic', action: 'www',
                                            command: 'https://docs.google.com/spreadsheets/d/1O0eVSnzlACP9XJDq0VN4kN51ESUusec3-gD4dKPHRNU'
                                        },
                                        {
                                            name: 'TiersI', action: 'www',
                                            command: 'https://docs.google.com/spreadsheets/d/10a8qCq5zgyR-kAOq-kuKuttADfU16aVWxgTCf9Eu4b8'
                                        },
                                        {
                                            name: 'TiersII', action: 'www',
                                            command: 'https://docs.google.com/spreadsheets/d/1Zgv90jaHZCSEvpYdG5BF42djCEcgPxjEdCwosQRTbIQ'
                                        },
                                        {
                                            name: 'Keyki', action: 'www',
                                            command: 'https://docs.google.com/spreadsheets/d/1ownIOYtDgha_5RwmVM_RfHIwk16WeMZJry5wz9-YNTI'
                                        }
                                    ]
                                }
                            ],
                            buttons: [
                                {name: 'Join', action: 'func', command: 'DRMng.Raids.joinAll()'},
                                {name: 'Kill', action: 'chat', command: '/kill'},
                                {name: 'Server', action: 'func', command: 'DRMng.Engine.changeServer()'}
                            ]
                        };
                        sb.id = 'DRMng_Sidebar';

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
                        if (left) parent.insertBefore(sb, parent.children[0]);
                        else parent.appendChild(sb);
                        let labels = document.querySelectorAll('#DRMng_Sidebar > div.label');
                        let labLen = labels.length;
                        for (let i=0; i<labLen; ++i) labels[i].addEventListener('click', this.sidebarLabelOpen);
                        let grpButtLen = document.querySelectorAll('#DRMng_Sidebar > div > button').length;
                        let staButtLen = document.querySelectorAll('#DRMng_Sidebar > button').length;
                        let sbLen = labLen * 26 + grpButtLen * 23 + staButtLen * 23;
                        if (sbLen > 690) sb.className = 'flex';
                    },
                    setChatWidth: function() {
                        let lc = DRMng.Config.local;
                        let el = document.getElementById('chat_container');
                        if (el) {
                            let w = lc.kong.chatWidth;
                            el.style.width = `${(lc.alliance.sbs && lc.alliance.enabled) ? (w*2+7) : w}px`;
                        }
                    },
                    loadDefaults: function() {
                        let lc = DRMng.Config.local, el;
                        // Chat width
                        this.setChatWidth();

                        // Script width
                        el = document.getElementById('DRMng_main');
                        if (el) el.style.width = lc.scriptWidth + 'px';

                        // Filtering
                        this.setupFilterBox();
                        this.setupFilterTab();

                        // Sorting
                        el = document.getElementById('DRMng_sortOrderBy').children;
                        for (let i = 0; i < el.length; ++i)
                            if (el[i].innerHTML.toLowerCase() === lc.sortBy)
                                el[i].className = 'active';

                        // Alliance
                        el = document.getElementById('DRMng_allianceChnl');
                        if (lc.alliance.channel) {
                            el.removeAttribute('class');
                            el.value = lc.alliance.channel;
                        }
                        el = document.getElementById('DRMng_alliancePass');
                        if (lc.alliance.pass) {
                            el.removeAttribute('class');
                            el.setAttribute('type', 'password');
                            el.value = lc.alliance.pass;
                        }
                    },
                    loadOptions: function() {
                        let group, opt;

                        /*
                         * kongui - Kongregate UI
                         * */

                        group = new this.Group('kongui', 'Kongregate UI', true);

                        opt = new this.Option();
                        opt.setup('kongui_stickyHeader', 'Sticky header', true)
                           .desc('Makes top header always visible on screen.')
                           .event(function () {
                               let mode = this.conf[this.field] ? 'fixed' : 'absolute';
                               DRMng.Kong.CSS.rpl(this.field, 'div#headerwrap', 'position: ' + mode);
                           })
                           .make(group);

                        opt = new this.Option();
                        opt.setup('kongui_hideToolbar', 'Hide game toolbar', false)
                           .desc('Hides toolbar located above game window (cinematic mode, rating, etc).')
                           .event(function () {
                               if (this.conf[this.field])
                                   DRMng.Kong.CSS.add(this.field, 'table.game_table > tbody > tr:first-child', 'display: none');
                               else DRMng.Kong.CSS.del(this.field);
                           })
                           .make(group);

                        opt = new this.Option();
                        opt.setup('kongui_hideFrame', 'Hide game frame', false)
                           .desc('Hides 7px wide frame around game window.')
                           .event(function () {
                               if (this.conf[this.field])
                                   DRMng.Kong.CSS.add(this.field, 'div#maingame', 'padding: 0');
                               else DRMng.Kong.CSS.del(this.field);
                           })
                           .make(group);

                        opt = new this.Option();
                        opt.setup('kongui_hideGameDetails', 'Hide game details', false)
                           .desc('Hides game details part located just below game window.')
                           .event(function () {
                               if (this.conf[this.field])
                                   DRMng.Kong.CSS.add(this.field, 'div.game_details_outer', 'display: none');
                               else DRMng.Kong.CSS.del(this.field);
                           })
                           .make(group);

                        opt = new this.Option();
                        opt.setup('kongui_hideForum', 'Hide forum area', true)
                           .desc('Hides forum part located below game window.')
                           .event(function () {
                               if (this.conf[this.field])
                                   DRMng.Kong.CSS.add(this.field, '#below_fold_content div.game_page_wrap', 'display: none');
                               else DRMng.Kong.CSS.del(this.field);
                           })
                           .make(group);

                        /*
                        * drmui - RaidsManager UI
                        * */

                        group = new this.Group('drmui', 'RaidsManager UI');

                        opt = new this.Option();
                        opt.setup('drmui_disableTransitions', 'Disable transitions', false)
                           .desc('Disables animated transitions for various UI elements to improve performance on' +
                               ' low-end hardware.')
                           .event(function () {
                               if (this.conf[this.field])
                                   DRMng.Kong.CSS.add(this.field, 'div#DRMng_main, div#DRMng_main *, div#DRMng_info,' +
                                       ' div#DRMng_info *', 'transition: initial !important');
                               else DRMng.Kong.CSS.del(this.field);
                           })
                           .make(group);

                        opt = new this.Option();
                        opt.setup('drmui_hideSideBar', 'Hide sidebar', false)
                           .desc('HIdes sidebar which is located between game window and kongregate chat.')
                           .event(function () {
                               if (this.conf[this.field])
                                   DRMng.Kong.CSS.add(this.field, 'div#DRMng_Sidebar', 'display: none');
                               else DRMng.Kong.CSS.del(this.field);
                           })
                           .make(group);

                        /*
                         * alliance - Alliance UI
                         * */

                        group = new this.Group('alliance', 'Alliance UI');

                        opt = new this.Option();
                        opt.setup('alliance_sbs', 'Side by side', false)
                           .desc('Makes alliance chat visible all the time along with regular kongregate chats' +
                               ' (doubles width taken by chat area).')
                           .event(function() {
                               // make sure initial variable setting wont fire this
                               if (DRMng.Alliance.tab) {
                                   let el = document.getElementById('chat_container'),
                                       a = DRMng.Alliance,
                                       w = DRMng.Config.local.kong.chatWidth;
                                   if (this.conf[this.field]) a.body.style.removeProperty('display');
                                   else a.tab.className = 'chat_room_tab';
                                   DRMng.UI.setChatWidth();
                                   a.active = false;
                                   holodeck._chat_window.showActiveRoom();
                                   a.initBody.call(a);
                               }
                           })
                           .make(group);

                        // Save all changes made to config file due to introducing new options
                        DRMng.Config.saveLocal();
                    },
                    raidInfo: function(boss) {
                        let txt = '';
                        if (boss) {
                            let r = DRMng.Config.local.raidData[boss];
                            if (r) {
                                txt += '<div class="name">' + r.fName + '</div>';
                                let race = r.race.join(', ');
                                if (race) txt += '<div class="race">(' + race + ')</div>';
                                let t = DRMng.Config.local.tiersData, rt;

                                txt += '<table class="raidinfo"><tr><td></td><td>N</td><td>H</td><td>L</td><td>NM</td></tr>';
                                txt += '<tr><td>HP</td>' +
                                    '<td>' + (r.hp[0] ? DRMng.Util.getShortNumK(r.hp[0] * 1000, 4) : '&mdash;') + '</td>' +
                                    '<td>' + (r.hp[1] ? DRMng.Util.getShortNumK(r.hp[1] * 1000, 4) : '&mdash;') + '</td>' +
                                    '<td>' + (r.hp[2] ? DRMng.Util.getShortNumK(r.hp[2] * 1000, 4) : '&mdash;') + '</td>' +
                                    '<td>' + (r.hp[3] ? DRMng.Util.getShortNumK(r.hp[3] * 1000, 4) : '&mdash;') + '</td></tr>';
                                txt += '<tr><td>FS</td>' +
                                    '<td>' + (r.hp[0] ? DRMng.Util.getShortNumK(r.hp[0] * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                                    '<td>' + (r.hp[1] ? DRMng.Util.getShortNumK(r.hp[1] * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                                    '<td>' + (r.hp[2] ? DRMng.Util.getShortNumK(r.hp[2] * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                                    '<td>' + (r.hp[3] ? DRMng.Util.getShortNumK(r.hp[3] * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td></tr>';
                                txt += '<tr><td>AP</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td>' +
                                    '<td>' + (r.hp[3] ? DRMng.Util.getShortNumK(r.hp[3] * 1000 / r.maxPlayers / 2, 4) : '&mdash;') + '</td></tr>';
                                if (t.nonTiered && t.nonTiered.raids.indexOf(boss) !== -1) {
                                    rt = t.nonTiered.ratio[r.size][3];
                                    txt += '<tr><td>OS</td>' +
                                        '<td>' + (r.hp[0] ? DRMng.Util.getShortNumK(r.hp[0] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                                        '<td>' + (r.hp[1] ? DRMng.Util.getShortNumK(r.hp[1] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                                        '<td>' + (r.hp[2] ? DRMng.Util.getShortNumK(r.hp[2] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                                        '<td>' + (r.hp[3] ? DRMng.Util.getShortNumK(r.hp[3] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td></tr>';
                                    rt = t.nonTiered.ratio[r.size][6];
                                    txt += '<tr><td>MS</td>' +
                                        '<td>' + (r.hp[0] ? DRMng.Util.getShortNumK(r.hp[0] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                                        '<td>' + (r.hp[1] ? DRMng.Util.getShortNumK(r.hp[1] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                                        '<td>' + (r.hp[2] ? DRMng.Util.getShortNumK(r.hp[2] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td>' +
                                        '<td>' + (r.hp[3] ? DRMng.Util.getShortNumK(r.hp[3] * rt * 1000 / r.maxPlayers, 4) : '&mdash;') + '</td></tr>';
                                }
                                txt += '</table>';

                                if (t.tiers && t.tiers[boss]) {
                                    t  = t.tiers[boss];
                                    rt = t.ratio[3];
                                    txt += '<table class="raidinfo"><tr><td></td><td>Tier</td><td>Stats</td><td>dmg/SP</td><td>dmg/E</td></tr>';
                                    // Stats OS
                                    if (t.spOS >= 0) txt += '<tr><td>Stats OS</td><td>' + DRMng.Util.getShortNumK(t.tiers[t.spOS]*rt*1000,4) + '</td>' +
                                        '<td>' + t.sp[t.spOS] + '</td>' +
                                        '<td>' + (t.tiers[t.spOS]*rt/t.sp[t.spOS]).toPrecision(4) + '</td>' +
                                        '<td>' + (t.hasCURE && t.e ? (t.tiers[t.spOS]*rt/t.e[t.spOS]).toPrecision(4) : '&mdash;') + '</td>';
                                    // Epics OS
                                    if (t.eOS >= 0) txt += '<tr><td>Epics OS</td><td>' + DRMng.Util.getShortNumK(t.tiers[t.eOS]*rt*1000,4) + '</td>' +
                                        '<td>' + t.sp[t.eOS] + '</td>' +
                                        '<td>' + (t.tiers[t.eOS]*rt/t.sp[t.eOS]).toPrecision(4) + '</td>' +
                                        '<td>' + (t.hasCURE && t.e ? (t.tiers[t.eOS]*rt/t.e[t.eOS]).toPrecision(4) : '&mdash;') + '</td>';
                                    // Max Tier
                                    let idx = t.tiers.length -1;
                                    txt += '<tr><td>Max Tier</td><td>' + DRMng.Util.getShortNumK(t.tiers[idx]*rt*1000,4) + '</td>' +
                                        '<td>' + t.sp[idx] + '</td>' +
                                        '<td>' + (t.tiers[idx]*rt/t.sp[idx]).toPrecision(4) + '</td>' +
                                        '<td>' + (t.hasCURE && t.e ? (t.tiers[idx]*rt/t.e[idx]).toPrecision(4) : '&mdash;') + '</td>';
                                    txt += '</table>';
                                }
                            }
                        }
                        return txt;
                    },
                    hideUITimeout: 0,
                    fillInfo: function(id) {
                        let ifo = document.getElementById('DRMng_info');
                        let r = DRMng.Raids.get(id);
                        ifo.className = ['','n','h','l','nm'][r.diff];
                        let ri = DRMng.Config.local.raidData[r.boss];
                        let name = ri ? ri.fName : r.boss.replace(/_/g,' ');
                        let magics = ri ? function(){let c = ''; for(let i=ri.numMagics; i !== 0; i--) c += '<div class="magic" style="background-position: -' + r['m'+i]*16 + 'px 0"></div>';return c;}() : '';
                        let race = ri && ri.race.length > 0 ? 'Race: ' + ri.race.reduce(function(a,b){return a + ', ' + b.replace(' ','&nbsp;')}) : '';
                        let status = 'Healthy', tp = 1.0;
                        if (ri && !ri.isEvent) {
                            tp = 1 - ((new Date().getTime() - r.createtime) / (3600000 * ri.timer));
                            if (tp+0.05 < r.hp) status = 'Behind timer';
                            if (tp+0.2 < r.hp) status = 'Failing';
                        }
                        if (r.isFull) status += ", Full";
                        let maxHP = ri.hp[r.diff-1]*1000;
                        let health = 'health ' + DRMng.Util.getShortNumK(maxHP*r.hp, 3) +
                            ' / ' + DRMng.Util.getShortNumK(maxHP, 3) + ' (' + Math.ceil(r.hp*100) + '%)';
                        let timer = 'timer ' + Math.round(tp*ri.timer) + 'h / ' + ri.timer + 'h (' + Math.ceil(tp*100) + '%)';
                        ifo.innerHTML = '<div><span class="title">' + name + '</span>' + magics + '</div>' +
                            '<div>' + race + '</div>' +
                            '<div class="status">Status: ' + status + (r.visited ? ', Visited' : '') + '</div>' +
                            '<div style="text-align: center; margin-top: 1px;"><label for="DRMng_progHP">' + health + '</label>' +
                            '<progress class="hp" id="DRMng_progHP" value="'+r.hp+'"></progress></div>'+
                            '<div style="text-align: center; margin-top: 2px;"><label for="DRMng_progTime">' + timer + '</label>' +
                            '<progress class="time" id="DRMng_progTime" value="'+tp+'"></progress></div>';
                    },
                    fillInfoTimeout: 0,
                    infoEvent: function(e) {
                        clearTimeout(DRMng.UI.fillInfoTimeout);
                        if (DRMng.Util.hResize.clicked) return;
                        let ifo = document.getElementById('DRMng_info');
                        let rdl = document.getElementById('DRMng_RaidList').getBoundingClientRect();
                        ifo.style.display = 'block';
                        let fld = e.target;
                        let id = fld.id.split('_')[1];
                        let d = fld.getBoundingClientRect();
                        ifo.style.left = d.left-ifo.offsetWidth+'px';
                        let wndHeight = document.documentElement.clientHeight;
                        if (d.top + ifo.offsetHeight > rdl.top + rdl.height/2) {
                            ifo.style.top = '';
                            ifo.style.bottom = Math.max(wndHeight - d.bottom, 0) + 'px';
                        }
                        else {
                            ifo.style.top = d.top-1+'px';
                            ifo.style.bottom = '';
                        }
                        DRMng.UI.fillInfoTimeout = setTimeout(DRMng.UI.fillInfo, 30, id);
                    },
                    handleChatClick: function(e, sbs) {
                        let el = e.target, usr;
                        sbs = sbs || false;
                        //console.log("Chat clicked on element [%s|%s|%s]", el.id, el.className,
                        // ['Left','Middle','Right','4th','5th'][e.button]);
                        if ((usr = el.getAttribute('username'))) {
                            e.stopPropagation(); e.preventDefault();
                            let a = DRMng.Alliance;
                            console.log(`[DRMng] {${a.active?'Alliance':'Kong'}} PM to ` + usr);
                            if (a.active || sbs) {
                                a.input.value = `/w ${usr} `;
                                a.input.focus();
                                a.input.dispatchEvent(new Event('focus'));
                            }
                            else holodeck._active_dialogue.setInput(`/w ${usr} `);
                        }
                        else if (el.className.indexOf('DRMng_info_picker') !== -1) {
                            let raid = el.className.split(' ')[1];
                            let info = DRMng.UI.raidInfo(raid);
                            let banner = DRMng.Config.local.raidData[raid]; banner = banner ? banner.banner : '';
                            let style = 'background-image: linear-gradient( rgba(0, 0, 0, 0.5), rgba(250, 250, 250, 0.9) 100px ), url(https://5thplanetdawn.insnw.net/dotd_live/images/bosses/' + banner + '.jpg);';
                            el = el.parentNode;
                            el.className += ' raidinfo';
                            el.setAttribute('style', style);
                            el.innerHTML = info;
                        }
                        return false;
                    },
                    addListenerToChat: function() {
                        let el = document.getElementById('chat_rooms_container');
                        if (el) el.addEventListener('click', DRMng.UI.handleChatClick, true);
                        else setTimeout(DRMng.UI.addListenerToChat, 250);
                    },
                    attachListeners: function() {
                        let i;

                        // Chat global listener
                        setTimeout(DRMng.UI.addListenerToChat, 1000);

                        // Message listeners
                        document.addEventListener("DRMng.joinRaid", DRMng.Raids.joinResponse, false);
                        document.addEventListener("DRMng.joinRaids", DRMng.Raids.joinMultiResponse, false);
                        document.addEventListener("DRMng.lightShot", DRMng.Util.Gate.lightShotCb, false);

                        // Script Hide/Show button
                        document.getElementById('DRMng_onoff').addEventListener('click', function(){
                            let el = document.getElementById('DRMng_main');
                            if (el.className.indexOf('active') === -1) el.className = 'active';
                            else el.className = '';
                        });

                        // Script Hide automation
                        document.getElementById('DRMng_main').addEventListener('mouseleave', function() {
                            //DRMng.UI.hideUITimeout = setTimeout(function(){document.getElementById('DRMng_main').className = ''}, 2500);
                        });
                        document.getElementById('DRMng_main').addEventListener('mouseenter', function() {
                            clearTimeout(DRMng.UI.hideUITimeout);
                        });

                        // menu buttons
                        let mnuItems = document.getElementById('DRMng_nav').children;
                        for(i = 0; i < mnuItems.length; ++i) {
                            mnuItems[i].addEventListener('click', function(e) {
                                document.getElementById('DRMng_main').className = 'active';
                                let mnuItems = document.getElementById('DRMng_nav').children;
                                let contItems = document.getElementById('DRMng_content').children;
                                for(let i = 0; i < mnuItems.length; ++i) {
                                    mnuItems[i].className = '';
                                    contItems[i].className = '';
                                }
                                document.getElementById('DRMng_'+e.target.innerHTML).className = 'active';
                                e.target.className = 'active';
                            });
                        }

                        // Sorting
                        document.getElementById('DRMng_sortOrderBy').addEventListener('click', function(e){
                            let el = e.target;
                            if (el.className.indexOf('active') === -1) {
                                let act = el.parentNode.getElementsByClassName('active');
                                if (act.length > 0) act[0].className = '';
                                el.className = 'active';
                                DRMng.Raids.setComp(el.innerHTML.toLowerCase());
                            }
                        });

                        // RaidList joining
                        document.getElementById('DRMng_RaidList').addEventListener('click', function(e){
                            let el = e.target;
                            if (el.nodeName !== 'DIV') el = el.parentNode;
                            if (el.id === 'DRMng_RaidList') return;
                            console.log("Sending for joining");
                            DRMng.Raids.joinOne(el.id.split('_')[1]);
                        });

                        // Info box hiding
                        document.getElementById('DRMng_RaidList').addEventListener('mouseleave', function(){
                            document.getElementById('DRMng_info').style.display = 'none';
                        });

                        // raids filtering field
                        let flt = document.getElementById('DRMng_txtFilter');
                        flt.addEventListener('focus', function() {
                            if (this.innerHTML === 'Filter raids here') {
                                this.innerHTML = '';
                                this.className = '';
                            }
                        });
                        flt.addEventListener('blur', function() {
                            if (this.innerHTML === '') {
                                this.innerHTML = 'Filter raids here';
                                this.className = 'default';
                            }
                        });
                        flt.addEventListener('keyup', function(e) {
                            if (window.filterTOut) clearTimeout(window.filterTOut);
                            let data = e.target.innerText;
                            if (e.target.innerHTML.charAt(0) === '<') e.target.innerHTML = data;
                            window.filterTOut = setTimeout(DRMng.Raids.processFilter.bind(DRMng.Raids,data), 500);
                        });

                        // Apply filter button
                        flt = document.getElementById('DRMng_filterApply');
                        flt.addEventListener('click', function(){
                            this.parentNode.style.display = 'none';
                            DRMng.Engine.reconnect();
                        });

                        // filter groups rollovers
                        let fltDivs = [
                            document.getElementById('DRMng_filterSmall'),
                            document.getElementById('DRMng_filterMedium'),
                            document.getElementById('DRMng_filterLarge'),
                            document.getElementById('DRMng_filterEpic'),
                            document.getElementById('DRMng_filterColossal'),
                            undefined, //personal raids not supported
                            document.getElementById('DRMng_filterGigantic')
                        ];
                        let div = null;
                        for (div of fltDivs) if (div)
                            div.parentNode.addEventListener('transitionend',function(e){
                                if (e.target.className.indexOf('hide') !== -1) e.target.children[1].style.display = 'none';
                            }, false);

                        // delayed submission
                        flt = document.getElementById('DRMng_submitRaidLink');
                        flt.addEventListener('focus', function() {
                            if (this.innerHTML === 'Paste raid link here') {
                                this.innerHTML = '';
                                this.className = '';
                            }
                        });
                        flt.addEventListener('blur', function() {
                            if (this.innerHTML === '') {
                                this.innerHTML = 'Paste raid link here';
                                this.className = 'default';
                            }
                        });
                        flt = document.querySelectorAll('[group=DRMng_submitDelay]');
                        for(i = 0; i < flt.length; ++i) {
                            flt[i].addEventListener('click', function(e) {
                                let items = document.querySelectorAll('[group=DRMng_submitDelay]');
                                for(let i = 0; i < items.length; ++i) items[i].className = '';
                                e.target.className = 'crimson';
                            });
                        }

                        // alliance chat
                        flt = document.getElementById('DRMng_allianceChnl');
                        flt.addEventListener('focus', function() {
                            if (this.getAttribute('class') === 'default') {
                                this.removeAttribute('class');
                                this.value = '';
                            }
                        });
                        flt.addEventListener('blur', function() {
                            this.value = this.value.trim();
                            let sv = this.value;
                            if (this.value == '') {
                                this.setAttribute('class', 'default');
                                this.value = 'Channel';
                            }
                            DRMng.Config.local.alliance.channel = sv;
                            DRMng.Config.saveLocal();
                        });

                        flt = document.getElementById('DRMng_alliancePass');
                        flt.addEventListener('focus', function() {
                            if (this.getAttribute('class') === 'default') {
                                this.removeAttribute('class');
                                this.setAttribute('type', 'password');
                                this.value = '';
                            }
                        });
                        flt.addEventListener('blur', function() {
                            this.value = this.value.trim();
                            let sv = this.value;
                            if (this.value == '') {
                                this.setAttribute('class', 'default');
                                this.setAttribute('type', 'text');
                                this.value = 'Password';
                            }
                            DRMng.Config.local.alliance.pass = sv;
                            DRMng.Config.saveLocal();
                        });

                        // resize listeners
                        DRMng.Util.hResize.regPanes.push('chat_container');
                        DRMng.Util.hResize.regSide.push(0);
                        document.getElementById('chat_container')
                                .addEventListener('mousedown', DRMng.Util.hResize.onMouseDown.bind(DRMng.Util.hResize));
                        DRMng.Util.hResize.regPanes.push('DRMng_main');
                        DRMng.Util.hResize.regSide.push(1);
                        document.getElementById('DRMng_main')
                                .addEventListener('mousedown', DRMng.Util.hResize.onMouseDown.bind(DRMng.Util.hResize));
                    },
                    roll: function(elem) {
                        let gr = elem ? elem.parentNode : null;
                        if (gr) {
                            if (gr.getAttribute('group')) {
                                let divs = gr.parentNode.children;
                                let group = gr.getAttribute('group');
                                for (let i=0; i<divs.length; ++i) if (divs[i] !== gr && divs[i].getAttribute('group') && divs[i].getAttribute('group') === group) {
                                    if (divs[i].className.indexOf('hide') === -1) divs[i].className += ' hide';
                                    divs[i].children[1].style.display = 'none';
                                }
                            }
                            if (gr.className.indexOf('group') === 0) {
                                if (gr.className.indexOf('hide') !== -1) {
                                    gr.children[1].removeAttribute('style');
                                    gr.className = gr.className.replace(' hide', '');
                                }
                                else {
                                    gr.className += ' hide';
                                    gr.children[1].style.display = 'none';
                                }
                            }
                        }
                    },
                    init: function() {
                        // create stylesheet
                        this.createCSS();

                        // script html code
                        let mainDiv = document.createElement('div');
                        mainDiv.id = 'DRMng_main';
                        mainDiv.innerHTML = '\
					<div id="DRMng_header">\
						<div id="DRMng_status">Raids Manager next gen is loading...</div>\
						<div id="DRMng_onoff"><div>p</div></div>\
					</div>\
					<div id="DRMng_wrapper">\
						<div id="DRMng_nav">\
							<div class="active">Raids</div><div>Filters</div><div>Tools</div><div>Options</div>\
						</div>\
						<div id="DRMng_spacer"></div>\
						<div id="DRMng_content">\
							<div class="active" id="DRMng_Raids">\
								<div class="group">\
									<div class="title">Searching & Joining</div>\
									<div class="txtInputStripe" style="max-height: inherit;">\
										<p contenteditable="true" spellcheck="false" class="default" id="DRMng_txtFilter">Filter raids here</p>\
										<!-- <input type="text" spellcheck="false" class="default" id="DRMng_txtFilter" value="Filter raids here"> -->\
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
							</div>\
							<div class="" id="DRMng_Tools">\
								<div class="group">\
									<div class="title">Delayed submission</div>\
									<div class="txtInputStripe">\
										<p contenteditable="true" spellcheck="false" class="default" id="DRMng_submitRaidLink">Paste raid link here</p>\
										<!-- <input type="text" spellcheck="false" class="default" id="DRMng_submitRaidLink" value="Paste raid link here"> -->\
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
								<div class="group">\
								    <div class="title">Alliance chat</div>\
								    <div class="buttonStripe">\
								        <input type="text" spellcheck="false" class="default" size="1"\
								            id="DRMng_allianceChnl" value="Channel">\
								        <input type="text" spellcheck="false" class="default" size="1"\
								            id="DRMng_alliancePass" value="Password">\
								        <button onclick="DRMng.Alliance.action(this)"\
								            id="DRMng_allianceJoin" class="n">Join</button>\
								    </div>\
								</div>\
							</div>\
							<div class="" id="DRMng_Options"></div>\
						</div>\
					</div>';
                        document.body.appendChild(mainDiv);

                        let infoDiv = document.createElement('div');
                        infoDiv.id = 'DRMng_info';
                        document.body.appendChild(infoDiv);

                        // load Sidebar
                        this.setupSidebar();

                        // load default values
                        this.loadDefaults();

                        // attach listeners to created elements
                        this.attachListeners();

                        // load options
                        this.loadOptions();
                    }
                },

                Timer: function(callback, delay) {
                    let id, started, remaining = delay, running, _delay = delay;

                    this.start = function() {
                        running = true;
                        started = new Date();
                        id = setTimeout(callback, remaining)
                    };
                    this.restart = function() {
                        this.pause();
                        remaining = _delay;
                        this.start();
                    };
                    this.pause = function() {
                        running = false;
                        clearTimeout(id);
                        remaining -= new Date() - started
                    };
                    this.getTimeLeft = function() {
                        if (running) {
                            this.pause();
                            this.start();
                        }
                        return remaining
                    };
                    this.getState = function() {
                        return running
                    };
                    this.start()
                },

                postMessage: function(data) {
                    document.dispatchEvent(
                        new MessageEvent("DRMng.xhrReq", {
                            origin: 		document.location.protocol + "//" + document.location.hostname,
                            lastEventId: 	0,
                            source: 		window,
                            data: 			JSON.stringify(data)
                        })
                    );
                },
                postGameMessage: function(type,data) {
                    let game = document.getElementById('gameiframe');
                    type = 'DRMng.' + type;
                    data = data || ''; data = typeof data === 'string' ? data : JSON.stringify(data);
                    type = data ? type + '#' + data : type;
                    if (game) game.contentWindow.postMessage(type,'http://50.18.191.15');
                },
                init:            function() {

                    // load localStorage
                    this.Config.loadLocal();

                    // init kong features
                    this.Kong.init();

                    // get user data
                    this.UM.getUserData();

                    // load UI
                    this.UI.init();

                    // resizer
                    this.Util.hResize.init();

                    // raids init
                    this.Raids.init();

                    // connect to Server
                    this.Engine.init();

                    // silently init alliance chat
                    // and connect if proper credentials are present
                    this.Alliance.init();
                }
            };
            console.log('[DRMng] Initialized. Checking for needed Kong resources ...');

            // include socket.io engine
            let socketIO = document.createElement('script');
            socketIO.setAttribute('type', 'text/javascript');
            socketIO.setAttribute('async', '');
            socketIO.setAttribute('src','http://cdn.socket.io/socket.io-1.3.6.js');
            document.head.appendChild(socketIO);

            DRMng.init();

            setTimeout(function(){
                let s = document.getElementById('DRMng_TempScriptField');
                s.parentNode.removeChild(s);
            }, 3000);
        }
        document.addEventListener('DRMng.xhrReq', function(param) {
            let p = JSON.parse(param.data);
            p.callback = function (e, r) {
                delete this.onload;
                delete this.onerror;
                delete this.ontimeout;
                this.event = e;
                this.status = r.status;
                this.responseText = r.responseText;
                document.dispatchEvent(new MessageEvent(
                    this.eventName, {
                        'origin': document.location.protocol + "//" + document.location.hostname,
                        'lastEventId': 1,
                        'source': unsafeWindow,
                        'data': JSON.stringify(this)
                    })
                );
            };
            p.onload = p.callback.bind(p, "load");
            p.onerror = p.callback.bind(p, "error");
            p.ontimeout = p.callback.bind(p, "timeout");
            setTimeout(GM_xmlhttpRequest, 1, p);
        });

        console.info('[DRMng] Bootstrap...');

        let scr = document.createElement('script');
        scr.id = 'DRMng_TempScriptField';
        scr.appendChild(document.createTextNode('(' + main + ')()'));
        document.head.appendChild(scr);
    }
}
else if(window.location.host === '50.18.191.15') {
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
            load: function () {
                let data = localStorage['DRMng'];
                if (data) {
                    data = JSON.parse(data);
                    let keys = Object.keys(this.config);
                    for (let i = 0; i < keys.length; ++i)
                        if (data.hasOwnProperty(keys[i])) this.config[keys[i]] = data[keys[i]];
                }
                this.save();
            },
            save: function () {
                localStorage['DRMng'] = JSON.stringify(DRMng.config);
            },
            getParamObject: function () {
                let u = DRMng.config.user;
                let textVars = 'kongregate_username=' + u.name +
                    '&kongregate_user_id=' + u.id +
                    '&kongregate_game_auth_token=' + u.auth +
                    '&kongregate_game_id=138636&kongregate_host=http%3A%2F%2Fwww.kongregate.com' +
                    '&kongregate_game_url=http%3A%2F%2Fwww.kongregate.com%2Fgames%2F5thPlanetGames%2Fdawn-of-the-dragons&kongregate_api_host=http%3A%2F%2Fapi.kongregate.com' +
                    '&kongregate_channel_id=1f6ce602-7a09-44db-9cc6-f3f10ff6229f' +
                    '&kongregate_api_path=http%3A%2F%2Fchat.kongregate.com%2Fflash%2FAPI_AS3_42f92095af0bcfd4bacd7564ed5324a5.swf' +
                    '&kongregate_ansible_path=%2F%2Fchat.kongregate.com%2Fflash%2Fansible_f47b7cf6f86f8324558b32d9f2915747.swf' +
                    '&kongregate_preview=false' +
                    '&kongregate_game_version=' + u.version +
                    '&kongregate_language=en' +
                    '&kongregate_split_treatments=dawn-of-the-dragons-skin%252Ccontrol' +
                    '&kongregate=true' +
                    '&kongregate_svid=7cc0eaba-d07e-4e85-8d7c-09a4f2f5fcfa' +
                    '&user_id=kong_' + u.name +
                    '&server_xml_url=https://web1.dawnofthedragons.com/kong/' +
                    '&content_url=https://5thplanetdawn.insnw.net/dotd_live/' +
                    '&xml_content_url=https://5thplanetdawn.insnw.net/dotd_live/xml/' +
                    '&app_id=138636&page_url=https://www.kongregate.com/games/5thPlanetGames/dawn-of-the-dragons' +
                    '&auth_url=https://web1.dawnofthedragons.com/kong/lib/authenticate.php&action_type=' +
                    '&raid_id=&hash=&queueid=&charter_id=&trk=&retrk=&fbuid=';
                return {
                    wmode: 'transparent',
                    allowscriptaccess: 'always',
                    flashvars: textVars
                }
            },
            createSwf: function (data, id, width, height) {
                let swf = document.getElementById(id);
                if (swf) swf.setAttribute('data', data);
                else {
                    let div = document.createElement('div');
                    let obj = document.createElement('object'), p;
                    div.style.position = 'absolute';
                    div.style.top = '0';
                    div.style.left = '0';
                    if (id === 'swfdiv' && this.config.leftWChat) div.style.left = '265px';
                    if (id === 'chatdiv' && !this.config.leftWChat) div.style.left = '760px';
                    obj.setAttribute('type', 'application/x-shockwave-flash');
                    obj.setAttribute('id', id);
                    obj.setAttribute('width', width);
                    obj.setAttribute('height', height);
                    let param = this.getParamObject();
                    for (let key in param) {
                        if (param.hasOwnProperty(key)) {
                            p = document.createElement('param');
                            p.setAttribute('name', key);
                            p.setAttribute('value', param[key]);
                            obj.appendChild(p);
                        }
                    }
                    obj.setAttribute('data', data);
                    div.appendChild(obj);
                    document.body.appendChild(div);
                    obj.style.visibility = 'visible';
                }
            },
            applyChatSettings: function () {
                let swfDiv = document.getElementById('swfdiv');
                let chatDiv = document.getElementById('chatdiv');
                if (this.config.removeWChat) {
                    if (swfDiv) swfDiv.parentNode.style.left = '0';
                    if (chatDiv) {
                        let remDiv = chatDiv.parentNode;
                        remDiv.parentNode.removeChild(remDiv);
                    }
                }
                else if (this.config.leftWChat && !this.config.hideWChat) {
                    if (chatDiv) chatDiv.parentNode.style.left = '0';
                    if (swfDiv) swfDiv.parentNode.style.left = '265px';
                }
                else {
                    if (chatDiv) chatDiv.parentNode.style.left = '760px';
                    if (swfDiv) swfDiv.parentNode.style.left = '0';
                }
            },
            reloadChat: function () {
                if (this.config.version.chat)
                    this.createSwf(
                        'https://5thplanetdawn.insnw.net/dotd_live/chat/' + this.config.version.chat + '/chatclient.swf',
                        'chatdiv', '265', '690'
                    );
                //swfobject.embedSWF("https://5thplanetdawn.insnw.net/dotd_live/chat/" + this.config.version.chat + "/chatclient.swf", "chatdiv", "265", "690", "10.0.0", false, kongregateAPI.flashVarsObject(), chatParams);
            },
            reloadGame: function () {
                //DRMng.loadCount = 0;
                if (this.config.version.game)
                    this.createSwf(
                        'https://5thplanetdawn.insnw.net/dotd_live/swf/' + this.config.version.game + '/dotd.swf',
                        'swfdiv', '760', '690'
                    );
                //swfobject.embedSWF("https://5thplanetdawn.insnw.net/dotd_live/swf/" + this.config.version.game + "/dotd.swf", "swfdiv", "760", "690", "10.0.0", false, kongregateAPI.flashVarsObject(), params);
                //swfobject.embedSWF("https://5thplanetdawn.insnw.net/dotd_live/swf/" + (parseInt(this.version.game) + 1) + "/dotd.swf", "swfdiv", "760", "690", "10.0.0", false, kongregateAPI.flashVarsObject(), params, false, DRMng.loadGameCB);
            },
			/*loadGameCB: function () {
			 var swf = document.getElementById('swfdiv');
			 if (swf && typeof swf.PercentLoaded === 'function' && swf.PercentLoaded() !== 0) {
			 console.info("[DRMng] New game version found, loading!");
			 DRMng.version.game++;
			 }
			 else if (DRMng.loadCount++ < 3) setTimeout(DRMng.loadGameCB, 300);
			 else {
			 console.info("[DRMng] New game version not found, loading last known.");
			 swfobject.embedSWF("https://5thplanetdawn.insnw.net/dotd_live/swf/" + DRMng.config.version.game + "/dotd.swf", "swfdiv", "760", "690", "10.0.0", false, kongregateAPI.flashVarsObject(), params);
			 }
			 },*/
            counter: 0,
            init: function () {
                let swfDiv = document.getElementById('swfdiv');
                let chatDiv = document.getElementById('chatdiv');
                this.load();
                if (swfDiv !== null && chatDiv !== null && swfDiv.data && chatDiv.data) {
                    this.config.version.game = /^.+\/(\d+?)\/.+$/.exec(swfDiv.data)[1];
                    this.config.version.chat = /^.+\/(\d+?)\/.+$/.exec(chatDiv.data)[1];
                    if (this.config.version.game === '13525') this.config.version.game = '13524';
                    if (kongregateAPI) {
                        let data = kongregateAPI._flashVarsObject;
                        this.config.user.name = data.kongregate_username;
                        this.config.user.id = data.kongregate_user_id;
                        this.config.user.auth = data.kongregate_game_auth_token;
                        this.config.user.version = data.kongregate_game_version;
                    }
                    console.info(
                        "[DRMng] GameFrame init done - game: %s, chat: %s, user: %s, id: %s, auth: %s",
                        this.config.version.game,
                        this.config.version.chat,
                        this.config.user.name,
                        this.config.user.id,
                        this.config.user.auth
                    );
                    this.save();
                    this.applyChatSettings();
                }
                else if (this.counter++ < 5) setTimeout(this.init.bind(this), 200);
                else {
                    this.reloadGame();
                    this.reloadChat();
                    console.warn("[DRMng] Game is probably in maintenance mode, generated missing data to fire up chat")
                }
            }
        };
        window.addEventListener('message', function(e) {
            console.log("[DRMng] Message received!", e.data, e.origin);
            let c = e.data.split('#');
            if(c[0].indexOf('DRMng.') === 0) {
                c[0] = c[0].substring(6);
                switch(c[0]) {
                    case 'chatSettings':
                        DRMng.applyChatSettings();
                        break;
                    case 'chatReload':
                        DRMng.reloadChat();
                        break;
                    case 'gameReload':
                        DRMng.reloadGame();
                        break;
                    case 'killGame':
                        document.getElementById('swfdiv').data = "";
                        break;
                    case 'killChat':
                        document.getElementById('chatdiv').data = "";
                }
            }
        },false);
        DRMng.init();
    }
    scr = document.createElement('script');
    scr.appendChild(document.createTextNode('(' + load + ')()'));
    document.head.appendChild(scr);
}
