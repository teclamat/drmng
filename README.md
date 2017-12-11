[![](https://data.jsdelivr.com/v1/package/gh/mutik/drmng/badge)](https://www.jsdelivr.com/package/gh/mutik/drmng)

# DotD Raids Manager next gen

DRMng is ongoing project which aims to aid Dawn of the Dragons players with raids management and sharing.

Main features are:
* speed
* real time raids importing
* autojoining
* advanced searching
* delayed raids submission
* automatic raids definition update
* automatic raids tiers data update
* automatic keywords update
* UI theming
* alliance chat
* sidebar

## Installation

* Ensure you have userscripts manager addon installed. For old Firefox it's **Greasemonkey**, for all other browsers (Firefox Quantum/Chrome/Safari/Opera/Edge) you'll  be using **Tampermonkey**.

* Install script by opening **kong_ng.user.js** file. You have two options: 
  * For stable release - go to [Script CDN site](https://www.jsdelivr.com/package/gh/mutik/drmng) and click said filename,
  * For bleeding edge/experimental - open file on github from master branch and after that hit **RAW** button.
  
  In both scenarios userscripts manager should intercept URL and offer installation/update.
  
* Make sure you have **old script disabled** if you were still using it (they don't play nice when run together).

* **Reload tab** with game for changes to take effect.

## TODO

- [x] Sidebar configuration
- [ ] Options framework (partially implemented)
- [ ] Configuration stored on server
