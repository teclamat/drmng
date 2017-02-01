// ==UserScript==
// @name           	DotD Raids Manager Next Gen
// @namespace      	tag://kongregate
// @description    	Makes managing raids a lot easier
// @author         	Mutik
// @version        	2.0.15
// @grant          	GM_xmlhttpRequest
// @grant          	unsafeWindow
// @include        	http://www.kongregate.com/games/5thPlanetGames/dawn-of-the-dragons*
// @include        	*50.18.191.15/kong/?DO_NOT_SHARE_THIS_LINK*
// @connect			50.18.191.15
// @hompage        	http://mutik.erley.org
// ==/UserScript==

//best loop atm: for(var i=0, l=obj.length; i<l; ++i) - for with caching and pre-increment

if(window.location.host == "www.kongregate.com") {
	if(window.top == window.self) {
	function main() {
		window.DRMng = {
			version: {major: '2', minor: '0', rev: '15', name: 'DotD Raids Manager Next Gen'},
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
							case 'kv_serverid': case 'serverid': 	r.pid = parseInt(i[2]); break;
						}
					}
					if (cnt < 4) return null;
					r.pid = r.pid === 2 ? 0 : 1;
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
						if (DRMng.Util.hResize.pane === null) return false;
						DRMng.Util.hResize.rect = DRMng.Util.hResize.pane.getBoundingClientRect();
						DRMng.Util.hResize.x = e.clientX - DRMng.Util.hResize.rect.left;
						DRMng.Util.hResize.left = DRMng.Util.hResize.regLeft && DRMng.Util.hResize.x < 6;
						DRMng.Util.hResize.right = DRMng.Util.hResize.regRight && DRMng.Util.hResize.x >= DRMng.Util.hResize.rect.width - 6;
						return true;
					},
					findPane: function(e) {
						let p = e.target, idx;
						while (p && p.nodeName !== 'BODY') {
							idx = DRMng.Util.hResize.regPanes.indexOf(p.id);
							if (idx > -1) {
								DRMng.Util.hResize.pane = p;
								if (DRMng.Util.hResize.regSide[idx]) {
									DRMng.Util.hResize.regLeft = true;
									DRMng.Util.hResize.regRight = false;
								}
								else {
									DRMng.Util.hResize.regLeft = false;
									DRMng.Util.hResize.regRight = true;
								}
								//console.log("Found pane! [%s]", DRMng.Util.hResize.regPanes[idx]);
								break;
							}
							p = p.parentNode;
						}
					},
					onMouseDown: function(e) {
						//console.log(e);
						DRMng.Util.hResize.findPane(e);
						if (DRMng.Util.hResize.calc(e)) DRMng.Util.hResize.onDown(e);
					},
					onDown: function(e) {
						let isResizing = DRMng.Util.hResize.left || DRMng.Util.hResize.right;
						if (isResizing) e.preventDefault();
						DRMng.Util.hResize.clicked = {
							x: DRMng.Util.hResize.x,
							cx: e.clientX,
							w: DRMng.Util.hResize.rect.width,
							isResizing: isResizing,
							left: DRMng.Util.hResize.left,
							right: DRMng.Util.hResize.right
						}
					},
					hold: false,
					resetHold: function() {
						DRMng.Util.hResize.hold = false;
					},
					onMove: function(e) {
						if (DRMng.Util.hResize.hold) return;
						if (DRMng.Util.hResize.clicked === null) {
							DRMng.Util.hResize.findPane(e);
							DRMng.Util.hResize.hold = true;
							setTimeout(DRMng.Util.hResize.resetHold,500);
						}
						DRMng.Util.hResize.onMoveProgress(e);
					},
					onMoveProgress: function(e) {
						if(!DRMng.Util.hResize.calc(e)) return;
						DRMng.Util.hResize.ev = e;
						DRMng.Util.hResize.redraw = true;
					},
					onUp: function() {
						if (DRMng.Util.hResize.pane) {
							let p = DRMng.Util.hResize.pane;
							switch(p.id) {
								case 'chat_container':
									DRMng.Config.local.kong.chatWidth = parseInt(p.style.width.replace('px',''));
									DRMng.Config.saveLocal();
									DRMng.Kong.setHeaderWidth();
									break;
								case 'DRMng_main':
									DRMng.Config.local.scriptWidth = parseInt(p.style.width.replace('px',''));
									DRMng.Config.saveLocal();
									break;
							}
						}
						DRMng.Util.hResize.clicked = null;
						DRMng.Util.hResize.pane = null;
					},
					animate: function() {
						requestAnimationFrame(DRMng.Util.hResize.animate);
						if (!DRMng.Util.hResize.redraw) return;
						DRMng.Util.hResize.redraw = false;

						if (DRMng.Util.hResize.clicked && DRMng.Util.hResize.clicked.isResizing) {

							if (DRMng.Util.hResize.clicked.right)
								DRMng.Util.hResize.pane.style.width = parseInt(Math.max(DRMng.Util.hResize.x, 200)) + 'px';

							if (DRMng.Util.hResize.clicked.left) {
								DRMng.Util.hResize.pane.style.width =
									parseInt(Math.max(DRMng.Util.hResize.clicked.cx - DRMng.Util.hResize.ev.clientX + DRMng.Util.hResize.clicked.w, 200)) + 'px';
							}

							return;
						}
						if (DRMng.Util.hResize.pane) {
							if (DRMng.Util.hResize.right || DRMng.Util.hResize.left) DRMng.Util.hResize.pane.style.cursor = 'ew-resize';
							else DRMng.Util.hResize.pane.style.cursor = 'default';
						}
					},
					init: function() {
						document.addEventListener('mousemove', DRMng.Util.hResize.onMove);
						document.addEventListener('mouseup', DRMng.Util.hResize.onUp);
						DRMng.Util.hResize.animate();
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
					pokeBodyPlace: ['on the cheek','on the navel','in the nose','in the belly button','in the rib cage','in a really ticklish spot','square on the forehead','with a wet willy in the ear','on the arm','on the shoulder','on the chest','on the leg','in the face','on the neck','in the stomach','up the butt'],
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
					strikeAction: ['clobber','subdue','hit','bash','pound','pelt','hammer','wallop','swat','punish','pummel','strike','beat'],
					leapingAction: ['vaults','surges','hurdles','bounds','pounces','storms','leaps','bolts','stampedes','sprints','dashes','charges','lunges'],
					aimModifier: ['a well placed','a pin-point accurate','a targeted','an aimed','a','a','a','a','a','a','a'],
					wrestlingMove: [' haymaker punch',' kitchen sink to the midsection',' jumping DDT',' cross body attack',' flying forearm',' low dropkick',' jumping thigh kick',' roundhouse',' left and right hook combo',' jab and middle kick combo',' spinning backfist and shin kick combo',' delayed backbrain wheel kick',' somersault kick to an uppercut combo',' jab to the face',' stomping hook punch',' palm thrust to the solar plexus',' shin kick',' side headbutt',' fast lowerbody roundhouse kick',' fast upperbody roundhouse kick','n uppercut palm strike','n uppercut to midsection jab combo',' downward chop'],
					meal: ['midmorning snack','midnight snack','supper','breakfast','brunch','2 o\'clock tea time','midafternoon snack','lunch'],
					throwAction: ['tosses','propels','throws','catapults','hurls','launches'],
					crying: ['shouting','screaming','hollering','yelling','crying out'],
					sportsWeapon: ['cricket paddle','lacrosse stick','hockey stick','croquet mallet','baseball bat','yoga ball','barbell','folding lawn chair','caber','shot put','bowling ball','lantern','tennis racket'],
					midsectionStrikePlace: ['midsection','solar plexus','chest','abdomen','sternum'],
					randomItemWeapon: ['a giant frozen trout','an inflatable duck','a waffle iron','a sponge brick','a board of education','an unidentified implement of mayhem and destruction','a rubber ducky *SQUEAK*','a rolling pin','a tire iron','a sock full of oranges','a slinky, a slink [fun for a girl or a boy]','a chinese finger puzzle','a whip of wet noodles','a humungous spicey italian meatstick','a giant garlic dill','an ACME hammer of pain'],
					withDescriptors: ['with lightning reflexes, ','with finesse and poise, ','with mediocre skill, ','with half-cocked attitude, ','with fervor and oomph, ','with vitality and gusto, ','with ambition and enthusiasm, ','','','',''],
					strikeActionVerb: ['clobbers','subdues','hits','bashes','pounds','pelts','hammers','wallops','swats','punishes','pummels','strikes','assaults','beats'],
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
					slapWeapon: ['white glove','rubber chicken','well placed backhand','failing Euryino','piece of moldy pizza','big dildo','loaf of french bread','smile of devious pleasure','dead >0))>-<','left over chicken drumstick','limp and slightly dirty french fry','brick of moldy cheese','tickle me Elmo','grilled cheese'],
					targetAction: ['deals','aims','inflicts','releases','dispatches','discharges','delivers','unleashes'],
					sassySynonym: ['an audacious','an impudent','a bold','an overbold','an arrant','a brassy','a sassy'],
					place: [['side','\'s head.'],['face','.'],['cheek','.']],
					leapingAction: ['vaults','surges','hurdles','bounds','pounces','storms','leaps','bolts','stampedes','sprints','dashes','charges','lunges'],
					leadSpeed: [' sudden',' spry','n abrupt','n energetic',' hasty','n agile','n accelerated',' quick'],
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
					}
					else this.saveLocal();
					this.local.raidKeys = Object.keys(this.local.raidData);
					// fixes for early testers, remove later
					if (this.local.visited.elyssa === undefined) this.local.visited = { kasan: [], elyssa: [] };
					if (this.local.filterString.elyssa === undefined) this.local.filterString = { kasan: '', elyssa: '' };
					this.saveLocal();
				},
				saveLocal: function() {
					localStorage['DRMng'] = JSON.stringify(DRMng.Config.local);
				}
			},
			Kong: {
				killScripts: function() {
					let scr = document.getElementsByTagName('script');
					let counter = 0;
					for (let i=0; i<scr.length; ++i) if(scr[i].src.indexOf('google') > 0) {
						scr[i].parentNode.removeChild(scr[i]);
						counter++;
					}
					console.info('[DRMng] Removed unnecesary script tags (%d)', counter);
				},
				killAds: function() {
					if(typeof kong_ads === 'object') {
						console.info("[DRMng] Killed 'kong_ads'!");
						window.kong_ads = { displayAd: function(){} };
					}
					else setTimeout(DRMng.Kong.killAds, 50);
				},
				killBumper: function() {
					if(typeof bumper === 'object') {
						console.info("[DRMng] Killed 'bumper'!");
						window.bumper = { requestAd: function(){} };
					}
					else setTimeout(DRMng.Kong.killBumper, 50);
				},
				killFBlike: function() {
					let like = document.getElementById('quicklinks_facebook');
					if(like) {
						console.info("[DRMng] Killed 'FB like'!");
						like.parentNode.removeChild(like);
					}
					else setTimeout(DRMng.Kong.killFBlike, 1000);
				},
				killDealSpot: function() {
					let ds = document.getElementById('dealspot_banner_holder');
					if (ds) {
						console.info("[DRMng] Killed 'DealSpot'!");
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
						console.info("[DRMng] Element patched!");
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
								if (raid) {
									let rData = DRMng.Util.getRaidFromUrl(raid[2], a);
									let cData = {};
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
						ChatDialogue.prototype.displayScriptMessage = function (msg, isRaidInfo) {
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
						console.info("[DRMng] ChatDialogue patched!");
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
						console.info("[DRMng] ChatRoom patched!");
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
						console.info("[DRMng] FayeEventDispatcher patched!");
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
						console.info("[DRMng] FayeHistory patched!");
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
						console.info("[DRMng] FayeTransformer patched!");
					}
					else setTimeout(this.modifyFayeTransformer, 50);
				},
				addChatCommand: function(cmd, call) {
					cmd = typeof cmd === 'object' ? cmd : [cmd];
					for (let i = 0; i < cmd.length; ++i) holodeck.addChatCommand(cmd[i],call);
				},
				addChatCommands: function() {
					if (holodeck && holodeck.ready) {
						/* Gestures Commands */
						this.addChatCommand('kiss',function(a,b){
							let from = DRMng.UserManager.user.name, who = /^\/kiss (\w+)$/.exec(b), chat = a.activeDialogue();
							if (from && who && chat) {
								let gesture = '** ' + DRMng.Gestures.Kiss.generate().replace('@from',from).replace('@who',who[1]) + ' **';
								chat._holodeck.filterOutgoingMessage(gesture, chat._onInputFunction);
							}
							return false;
						});
						this.addChatCommand('hit',function(a,b){
							let from = DRMng.UserManager.user.name, who = /^\/hit (\w+)$/.exec(b), chat = a.activeDialogue();
							if (from && who && chat) {
								let gesture = '** ' + DRMng.Gestures.Hit.generate().replace('@from',from).replace('@who',who[1]) + ' **';
								chat._holodeck.filterOutgoingMessage(gesture, chat._onInputFunction);
							}
							return false;
						});
						this.addChatCommand('poke',function(a,b){
							let from = DRMng.UserManager.user.name, who = /^\/poke (\w+)$/.exec(b), chat = a.activeDialogue();
							if (from && who && chat) {
								let gesture = '** ' + DRMng.Gestures.Poke.generate().replace('@from',from).replace('@who',who[1]) + ' **';
								chat._holodeck.filterOutgoingMessage(gesture, chat._onInputFunction);
							}
							return false;
						});
						this.addChatCommand('slap',function(a,b){
							let from = DRMng.UserManager.user.name, who = /^\/slap (\w+)$/.exec(b), chat = a.activeDialogue();
							if (from && who && chat) {
								let gesture = '** ' + DRMng.Gestures.Slap.generate().replace('@from',from).replace('@who',who[1]) + ' **';
								chat._holodeck.filterOutgoingMessage(gesture, chat._onInputFunction);
							}
							return false;
						});
						this.addChatCommand(['reload','reloaf','relaod','rl'],function(a,b){
							let type = /^\/(reload|reloaf|relaod|rl) (.+)$/.exec(b);
							type = type ? type[2] : '';
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
							let room = active_room._chat_dialogue;
							let chat = room._message_window_node;
							let nodes = chat.getElementsByClassName('chat-message');
							while (nodes.length) {
								nodes[0].parentNode.removeChild(nodes[0]);
								room._messages_count--;
							}
							return false;
						});
						this.addChatCommand(['raid','rd'],function(a,b){
							let raid = /^\/(raid|rd) (.+)$/.exec(b);
							let chat = a.activeDialogue();
							if (raid) {
								raid = raid[2].toLowerCase();
								let keys = DRMng.Config.local.raidKeys,
									data = DRMng.Config.local.raidData,
									found = [], i, len;
								for (i = 0, len = keys.length; i < len; ++i) {
									if (keys[i].indexOf(raid) > -1 || data[keys[i]].fName.toLowerCase().indexOf(raid) > -1)
										found.push([keys[i], data[keys[i]].fName]);
								}
								if (found.length > 1) {
									let raidPicker = '';
									for (i = 0, len = found.length; i < len; ++i)
										raidPicker += '<br><span class="DRMng_info_picker ' + found[i][0] + '">' + found[i][1] + ' (' + found[i][0] + ')</span>';
									chat && chat.displayScriptMessage('Multiple results found, pick one:' + raidPicker);
								}
								else if (found.length === 1)
									chat && chat.displayScriptMessage(DRMng.UI.raidInfo(found[0][0]), data[found[0][0]].banner);
								else chat && chat.displayScriptMessage('No info found matching ' + raid);
							}
							else chat && chat.displayScriptMessage('Wrong /raid or /rd syntax');
							return false;
						});
						console.info("[DRMng] Chat commands added!");
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
						console.info("[DRMng] All redundant iframes killed!");
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
					this.modifyKongEngine();
					//this.forceGameLoad();
					setTimeout(this.killIframes, 2000);

					// <link href="https://fonts.googleapis.com/css?family=Open+Sans" rel="stylesheet">
					let link = document.createElement('link');
					link.setAttribute('href', 'https://fonts.googleapis.com/css?family=Open+Sans');
					link.setAttribute('rel', 'stylesheet');
					document.head.appendChild(link);

					let kongCSS = "\
					/* Cut out garbage */\
					html { margin: 0; }\
					body { height: 100%; background-color: #343546 !important; min-width: inherit !important; }\
					#play div#primarywrap { min-height: 100%; }\
					div#subwrap { display: none; }\
					#global, #ad_skip_controls, #ima_bumper, #ima_bumper_html5_api, #bumper_premium_header, #ima-ad-container, div.gamepage_categories_outer, div.ad, div.tracking_pixel_ad, #play #gamespotlight,\
					div#kong_bumper_preroll_600x400-ad-slot, #kong_game_ui div.room_description_rollover_container\
					{ display: none !important; }\
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
					div#maingame, div#maingamecontent, div#flashframecontent, td#gameholder { width: auto !important; }\
					td#gameholder { overflow: hidden; }\
					div#maingamecontent table.game_table { position: inherit; }\
					/* TO RESIZER! td#gameholder, div#game { width: 760px !important; overflow: hidden; }*/\
					div#headerwrap {\
						position: fixed;\
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
					div#maingame { border: 1px solid rgba(0,0,0,0.2); border-radius: 0; }\
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
						padding: 3px 5px;\
					}\
					div#kong_game_ui div.chat_message_window > div > p.whisper {\
						background-color: transparent;\
						font-style: normal;\
						margin: 0;\
						border-left: 4px solid #943;\
					}\
					div#kong_game_ui div.chat_message_window > div > div.script {\
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
					div#kong_game_ui div.chat_message_window span.timestamp,\
					div#kong_game_ui div.chat_message_window span.extraid {\
						color: #bbb;\
						font-family: 'Open Sans', sans-serif;\
					}\
					div#kong_game_ui div.chat_message_window span.timestamp > span,\
					div#kong_game_ui div.chat_message_window span.extraid { float: right; font-size: 10px; }\
					div#kong_game_ui div.chat_message_window p.raid.dead span.extraid,\
					div#kong_game_ui div.chat_message_window p.raid.dead span.timestamp > span a { color: #888; }\
					div#kong_game_ui div.chat_message_window span.username {\
						color: #8cf;\
						text-decoration: none;\
						text-shadow: 0 0 5px #111;\
						padding-right: 1px;\
					}\
					div#kong_game_ui div.chat_message_window span.separator {\
						padding-right: 1px;\
					}\
					div#kong_game_ui div.chat_message_window span.username.is_self,\
					div#kong_game_ui div.chat_message_window .sent_whisper span.username { color: #e65; }\
					div#kong_game_ui div.chat_message_window span.guildname {\
						font-style: italic;\
						color: #ddd;\
						padding-left: 2px;\
					}\
					div#kong_game_ui div.chat_message_window span.guildname:before { content: '('; }\
					div#kong_game_ui div.chat_message_window span.guildname:after { content: ')'; }\
					div#kong_game_ui div.chat_message_window .message { max-width: 99%; }\
					div#kong_game_ui div.chat_message_window .message img {\
						display: block;\
						margin: 5px auto 2px;\
						max-width: 100%;\
						cursor: pointer\
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
					div#kong_game_ui div.chat_message_window div.script.raidinfo {\
						background-size: cover;\
						background-repeat: no-repeat;\
						background-position-x: 50%;\
						background-blend-mode: saturation;\
						border-left: 0 !important;\
					}\
					div.chat_message_window div.script.raidinfo div.name {\
						font-size: 12px;\
						text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;\
						color: #fff;\
						font-weight: bold;\
					}\
					div.chat_message_window div.script.raidinfo div.race {\
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
					div.chat_message_window table.raidinfo tr:first-child td { font-weight: bold }\
					\
					/* Temporary disable lower body (forum etc) */\
					div.game_page_wrap { display: none }\
					";

					DRMng.Util.cssStyle('DRMng_kongCSS',kongCSS);

					setTimeout(DRMng.Kong.setHeaderWidth, 500);
				}
			},
			Raids: {
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
					let r = DRMng.Util.getRaidFromUrl(link.innerHTML, DRMng.UserManager.user.name);
					if (r && !isNaN(+r.id) && r.hash.length === 10 && ['Kasan','Elyssa'][r.pid] === DRMng.Config.local.server) {
						let delay = parseInt(document.getElementById('DRMng_submitDelay').value);
						let delayBase = document.querySelector('[group=DRMng_submitDelay].crimson').innerHTML;
						//noinspection FallThroughInSwitchStatementJS
						switch (delayBase) {
							case 'day': delay *= 24;
							case 'hr': delay *= 60;
							default: delay *= 60000;
						}
						r.delay = delay;
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
						let u = DRMng.UserManager.user;
						if (u.qualified) {
							let authData = 'kongregate_user_id=' + u.ID + '&kongregate_game_auth_token=' + u.authToken;
							let raidData = '&kv_raid_id=' + r.id + '&kv_hash=' + r.hash + '&serverid=' + (DRMng.Config.local.server === 'Elyssa' ? '1' : '2');
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
							console.warn("[DRMng] User not qualified in join! How that happened huh?", DRMng.UserManager.user);
							this.joined++;
							DRMng.Raids.joinMsg();
						}
					}
					else {
						console.warn("[DRMng] Bad raid passed to join!", r);
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
					if (/successfully (re-)?joined/i.test(text)) { setTimeout(this.setVisited.bind(this,id),1); status = 1; }
					else if (/already completed/i.test(text)) { setTimeout(this.remove.bind(this, id, true), 1); status = 2; }
					else if (/already a member/i.test(text)) { setTimeout(this.setVisited.bind(this, id), 1); status = 3; }
					else if (/not a member of the guild/i.test(text)) { setTimeout(this.remove.bind(this, id), 1); status = 4; }
					else if (/(invalid|find) raid (hash|ID)/i.test(text)) { setTimeout(this.remove.bind(this, id), 1); status = 5; }
					return status;
				},
				joinResponse: function(e) {
					let data = JSON.parse(e.data);
					if (data && data.status === 200 && data.responseText && data.url) {
						let status = DRMng.Raids.processJoin(data.ext.id, data.responseText);
						status = ['Unknown','Success','Dead','Already in','Wrong Guild','Invalid'][status];
						let name = DRMng.Config.local.raidData[data.ext.boss];
						name = name ? name.sName : data.ext.boss;
						DRMng.Raids.joinMsg('Joining ' + name + ': ' + status);
						setTimeout(DRMng.Raids.prepareJoining.bind(DRMng.Raids),1);
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
					diff = isNaN(parseInt(diff)) ? ({'n': 1, 'h': 2, 'l': 3, 'nm': 4, 'nnm': 5})[diff.toLowerCase()] || 0 : parseInt(diff);
					return diff;
				},
				processFilter: function(filterTxt, loading) {
					console.info('[DRMng] Raw filter data:',filterTxt);
					if (DRMng.Raids.isAuto) DRMng.Raids.switchAutoJoin();
					let server = DRMng.Config.local.server.toLowerCase();
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
								else raids = p[2] === 'all' ? Object.keys(DRMng.Config.local.raidData) : DRMng.Config.local.filterData[p[2]];

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


					console.info("Add magic filters:", filters.add.magic.join(', '));
					console.info("Remove magic filters:", filters.rem.magic.join(', '));
					console.info("Add raid filters:", filters.add.raid.join(', '));
					console.info("Remove raid filters:", filters.rem.raid.join(', '));
					//console.info("Merged raid filters:", result.join(', .'));

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
						if (els[i].className.indexOf(cls) === -1) els[i].className += ' '+cls;
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
					if (!drop) this.setChat(id,'visited');
					DRMng.Config.saveLocal();
				},
				comp: function(a, b) { return a.hp - b.hp; },
				_setComp: function(field) {
					switch(field) {
						case 'id':
							this.comp = function (a, b) {
								return parseInt(a.id) - parseInt(b.id)
							};
							break;
						case 'health':
							this.comp = function (a, b) {
								return a.hp - b.hp;
							};
							break;
						case 'name': /* by name then by hp */
							this.comp = function (a, b) {
								let an = a.sname || a.boss;
								let bn = b.sname || b.boss;
								if (an < bn) return -1;
								if (an > bn) return 1;
								return a.hp-b.hp;
							};
							break;
						case 'time':
							this.comp = function (a, b) {
								return  a.createtime - b.createtime;
							};
							break;
						default:
							field = 'health';
							this.comp = function (a, b) {
								return a.hp - b.hp;
							};
							DRMng.Config.local.sortBy = field;
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
					for (let i = 0, len = this.all.length; i < len; ++i)
						if (this.all[i].id == id) return i;
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
					let newVisited = [], rd, hFilter;
					this.all = [];
					for (let i = 0, l = val.length; i < l; ++i)
					{
						hFilter = DRMng.Config.local.filterRaids[this.server][val[i].boss] || null;
						if (hFilter === null || !hFilter[val[i].diff-1]) {
							val[i].createtime = new Date(val[i].createtime).getTime();
							if (DRMng.Config.local.visited[this.server].indexOf(val[i].id) !== -1) {
								newVisited.push(val[i].id);
								val[i].visited = true;
								this.setChat(val[i].id, 'visited');
							}
							rd = DRMng.Config.local.raidData[val[i].boss];
							val[i].isFull = !!(rd && val[i].participants && rd.maxPlayers == val[i].participants);
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
					setTimeout(this.prepareJoining.bind(this),100);
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
							if (!raid.visited && !raid.isFull && this.filter.indexOf('@' + raid.boss + '_' + raid.diff) !== -1) {
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
					let doLog = false;
					if (r && r.isFull) {
						console.log("Updating:",raid,r);
						doLog = true;
					}
					if (r && !this.deadCache.hasOwnProperty(raid.id)) {
						let keys = ['hp','participants','m1','m2','m3','m4','m5','m6'];
						if (full) keys = keys.concat(['mnum','size']);
						r = DRMng.Util.copyFields(raid,r,keys);
						let rd = DRMng.Config.local.raidData[raid.boss];
						let markFull = false;
						if (!r.isFull) {
							r.isFull = !!(rd && r.participants && rd.maxPlayers == r.participants);
							if (r.isFull) markFull = true;
						}

						if (doLog) console.log("Updated:",r);
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
				init: function() {
					setTimeout(this.cleanDeadCache, 180000);

				}
			},
			UserManager: {
				numTries: 0,
				knownUsers: {},
				user: {
					qualified: false,
					ID: null,
					name: null,
					IGN: null,
					authToken: null,
					guild: null
				},
				getCrucialUserData: function()
				{
					if (typeof active_user === 'object' && active_user.username().toLowerCase() !== 'guest') {
						DRMng.UserManager.user.ID = active_user.id();
						DRMng.UserManager.user.name = active_user.username();
						DRMng.UserManager.user.authToken = active_user.gameAuthToken();
						let usr = DRMng.UserManager.user;
						if(usr.ID && usr.name && usr.authToken) {
							DRMng.UserManager.user.qualified = true;
							return
						}
					}
					console.warn("[DRMng] Missing active user data, retrying in .25 sec...");
					setTimeout(DRMng.UserManager.getCrucialUserData,250);
				},
				getUserNode: function()
				{
					DRMng.UserManager.user.guild = holodeck._chat_window._rooms_by_type.guild._room.name;
					let usrNode = holodeck._chat_window._rooms_by_type.guild.users();

					if(usrNode.length === 0) {
						setTimeout(DRMng.UserManager.getUserNode,100);
						return
					}

					for(let i = 0; i < usrNode.length; ++i)
					if (usrNode[i].username === DRMng.UserManager.user.name) {
						DRMng.UserManager.user.IGN = usrNode[i]._game_character_name;
						break;
					}
				},
				getExtendedUserData: function()
				{
					if(holodeck && holodeck.ready && holodeck._chat_window._rooms_by_type) {
						if(holodeck._chat_window._rooms_by_type.guild) DRMng.UserManager.getUserNode();
						else if(DRMng.UserManager.numTries++ < 10) {
							console.warn("[DRMng] Missing game guild data, retrying in 2 sec... (%d)",DRMng.UserManager.numTries);
							setTimeout(DRMng.UserManager.getExtendedUserData,2000);
						}
						else console.info("[DRMng] No guild information found! Guild info omitted.");

					}
					else setTimeout(DRMng.UserManager.getExtendedUserData,500);
				},
				getUserData: function()
				{
					// Needed to log into raids Engine
					DRMng.UserManager.getCrucialUserData();

					// Assures validity of IGN/Guild information
					DRMng.UserManager.getExtendedUserData();
				}
			},
			Engine: {
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
				init: function()
				{
					if(typeof io === 'function' && DRMng.UserManager.user.qualified) {
						let user = DRMng.UserManager.user;
						DRMng.Engine.client = io
							.connect('http://remote.erley.org:3000/' + DRMng.Config.local.server, {multiplex: false})
							.on('error', function (data) {
								console.warn(data)
							})
							.on('msg', DRMng.Engine.handleMessage)
							.on('service', DRMng.Engine.handleService)
							.on('disconnect', function () {
								console.warn('[DRMng] Socket client disconnected!')
							})
							.on('connect', function () {
								console.info('[DRMng] Chat socket connection established, joining...');
								DRMng.Engine.client.emit('join', {
									usr: user.name,
									ign: user.IGN,
									gld: user.guild,
									chk: DRMng.Config.local.checkSums});
							});
					}
					else {
						console.warn("[DRMng] Missing data to start engine, retrying in 1 sec...");
						setTimeout(DRMng.Engine.init,1000);
					}
				},
				handleMessage: function(d) {
					console.log(d)
				},
				handleService: function(d) {
					switch(d.action) {
						case 'raidData':
							if (DRMng.Config.local.checkSums.raidData !== d.data.raidDataHash &&
								d.data.raidDataHash.length > 6) {
								console.info("[DRMng] New raids data! Old hash: %s, new hash: %s",
									DRMng.Config.local.checkSums.raidData,
									d.data.raidDataHash);
								setTimeout(DRMng.UI.setupFilterTab.bind(DRMng.UI, d.data.raidData), 1);
								DRMng.Config.local.raidData = d.data.raidData;
								DRMng.Config.local.checkSums.raidData = d.data.raidDataHash;
								DRMng.Config.saveLocal();
								console.info(d.data);
							}
							else setTimeout(DRMng.UI.setupFilterTab.bind(DRMng.UI), 1);
							break;
						case 'filterData':
							if (DRMng.Config.local.checkSums.filterData !== d.data.filterDataHash &&
								d.data.filterDataHash.length > 6) {
								console.info("[DRMng] New keywords data! Old hash: %s, new hash: %s",
									DRMng.Config.local.checkSums.filterData,
									d.data.filterDataHash);
								DRMng.Config.local.filterData = d.data.filterData;
								DRMng.Config.local.checkSums.filterData = d.data.filterDataHash;
								DRMng.Config.saveLocal();
							}
							console.info(d.data);
							break;
						case 'tiersData':
							if (DRMng.Config.local.checkSums.tiersData !== d.data.tiersDataHash &&
								d.data.tiersDataHash.length > 6) {
								console.info("[DRMng] New tiers data! Old hash: %s, new hash: %s",
									DRMng.Config.local.checkSums.tiersData,
									d.data.tiersDataHash);
								DRMng.Config.local.tiersData = JSON.parse(d.data.tiersData);
								DRMng.Config.local.checkSums.tiersData = d.data.tiersDataHash;
								DRMng.Config.saveLocal();
							}
							console.info(d.data);
							break;
						case 'bootStrap':
							console.info("Bootstrap:", d);
							DRMng.Raids.insertAll(d.raids);
							break;
						case 'newRaid': DRMng.Raids.insert(d.data); break;
						case 'nukedRaid': DRMng.Raids.remove(d.data); break;
						case 'partialUpdate': DRMng.Raids.update(d.data,false); break;
						case 'fullUpdate': DRMng.Raids.update(d.data,true); break;
						case 'delayedSub':
							let mode = d.data.error ? 0 : 1;
							DRMng.UI.submitResponse(mode, d.data.msg);
							break;
						default: console.info(d);
					}
				}
			},
			UI: {
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
				clearRaidList: function() {
					document.getElementById('DRMng_RaidList').innerHTML = '';
				},
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
						font-weight: bold;\
						padding: 6px 10px;\
						text-align: center;\
						white-space: nowrap;\
						overflow: hidden;\
						text-overflow: ellipsis;\
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
						padding: 6px 2px 5px;\
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
						transition: max-height .5s linear .1s;\
						overflow: hidden;\
						flex-grow: 0;\
						flex-shrink: 0;\
						max-height: 110%;\
					}\
					#DRMng_content div.group.hide {\
						max-height: 23px;\
						transition: max-height .2s;\
					}\
					#DRMng_content div.group.flexible {\
						flex-grow: 1;\
						overflow: auto;\
					}\
					#DRMng_content div.group:first-of-type {\
						margin-top: 6px\
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
						font-weight: bold;\
						font-size: 10pt;\
						padding: 4px 0;\
						background-color: #333;\
						white-space: nowrap;\
						cursor: pointer;\
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
						margin: 3px 5px;\
						white-space: nowrap;\
						overflow: hidden;\
						text-overflow: ellipsis;\
						background: transparent;\
					}\
					#DRMng_main div.buttonStripe:hover { background-color: #404040 }\
					#DRMng_main div.txtInputStripe > input[type=text] { flex-grow: 2; }\
					#DRMng_main div.buttonStripe > input[type=text] { flex-grow: 1; }\
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
					#DRMng_main div > input[type=text] {\
						height: 19px;\
						padding: 1px 7px;\
						text-align: center;\
					}\
					#DRMng_main div > input[type=text]:hover,\
					#DRMng_main div.txtInputStripe > p:hover { background: #404040; cursor: text }\
					#DRMng_main div > input[type=text]:focus,\
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
						font-weight: bold;\
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
						font-size: 9px;\
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
					let el = e.target;
					if (el.tagName !== 'SPAN' && el.tagName !== 'BUTTON') el = el.children[0];
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
								btn.setAttribute('onclick', "active_room._chat_dialogue._holodeck.processChatCommand('" + button.command + "')");
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
				loadDefaults: function() {
					// Chat width
					var el = document.getElementById('chat_container');
					if (el) el.style.width = DRMng.Config.local.kong.chatWidth + 'px';

					// Script width
					el = document.getElementById('DRMng_main');
					if (el) el.style.width = DRMng.Config.local.scriptWidth + 'px';

					// Filtering
					this.setupFilterBox();
					this.setupFilterTab();

					// Sorting
					el = document.getElementById('DRMng_sortOrderBy').children;
					for (let i = 0; i < el.length; ++i)
						if (el[i].innerHTML.toLowerCase() === DRMng.Config.local.sortBy)
							el[i].className = 'active';

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
				handleChatClick: function(e) {
					let el = e.target;
					console.log("Chat clicked on element [%s|%s|%s]", el.id, el.className, ['Left','Middle','Right','4th','5th'][e.button]);
					if (el.className.indexOf('chat_message_window_username') !== -1) {
						e.stopPropagation(); e.preventDefault();
						console.log("Handle whisping to " + el.getAttribute('username'));
						active_room.insertInChatInput('/w ' + el.getAttribute('username') + ' ');
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


					// resize listeners
					DRMng.Util.hResize.regPanes.push('chat_container');
					DRMng.Util.hResize.regSide.push(0);
					document.getElementById('chat_container').addEventListener('mousedown', DRMng.Util.hResize.onMouseDown);
					DRMng.Util.hResize.regPanes.push('DRMng_main');
					DRMng.Util.hResize.regSide.push(1);
					document.getElementById('DRMng_main').addEventListener('mousedown', DRMng.Util.hResize.onMouseDown);
				},
				roll: function(elem) {
					let gr = elem ? elem.parentNode : null;
					if (gr && gr.getAttribute('group')) {
						let divs = gr.parentNode.children;
						let group = gr.getAttribute('group');
						for (let i=0; i<divs.length; ++i) if (divs[i] !== gr && divs[i].getAttribute('group') && divs[i].getAttribute('group') === group) {
							divs[i].className = 'group hide';
							divs[i].children[1].style.display = '';
						}
					}
					if (gr && gr.className.indexOf('group') === 0) {
						gr.className = gr.className.indexOf('hide') !== -1 ? 'group' : 'group hide';
						if (gr.className.indexOf('hide') == -1) gr.children[1].style.display = '';
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
							<div class="active">Raids</div><div>Filters</div><div>Tasks</div><div>Options</div>\
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
								<div class="group hide" group="filter">\
									<div class="title" onclick="DRMng.UI.roll(this);">Small Raids</div>\
									<div id="DRMng_filterSmall" style="display: none;"></div>\
								</div>\
								<div class="group hide" group="filter">\
									<div class="title" onclick="DRMng.UI.roll(this);">Medium Raids</div>\
									<div id="DRMng_filterMedium" style="display: none;"></div>\
								</div>\
								<div class="group hide" group="filter">\
									<div class="title" onclick="DRMng.UI.roll(this);">Large Raids</div>\
									<div id="DRMng_filterLarge" style="display: none;"></div>\
								</div>\
								<div class="group hide" group="filter">\
									<div class="title" onclick="DRMng.UI.roll(this);">Epic Raids</div>\
									<div id="DRMng_filterEpic" style="display: none;"></div>\
								</div>\
								<div class="group hide" group="filter">\
									<div class="title" onclick="DRMng.UI.roll(this);">Colossal Raids</div>\
									<div id="DRMng_filterColossal" style="display: none;"></div>\
								</div>\
								<div class="group hide" group="filter">\
									<div class="title" onclick="DRMng.UI.roll(this);">Gigantic Raids</div>\
									<div id="DRMng_filterGigantic" style="display: none;"></div>\
								</div>\
							</div>\
							<div class="" id="DRMng_Tasks">\
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
			init: function() {

				// load localStorage
				this.Config.loadLocal();

				// init kong features
				this.Kong.init();

				// get user data
				this.UserManager.getUserData();

				// load UI
				this.UI.init();

				// resizer
				this.Util.hResize.init();

				// raids init
				this.Raids.init();

				// connect to Server
				this.Engine.init();
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
						var data = kongregateAPI._flashVarsObject;
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
				}
			}
		},false);
		DRMng.init();
	}
	scr = document.createElement('script');
	scr.appendChild(document.createTextNode('(' + load + ')()'));
	document.head.appendChild(scr);
}