// ==UserScript==
// @name         Make correct locations clickable.
// @version      1.0
// @description  Make the correct locations clickable on end of round screens.
// @author       echandler
// @include      https://*geoguessr.com/*
// @grant        none
// ==/UserScript==


(function(){
    let _map = null;
    let markers = [];

    let _start = setInterval(function () {
        if (!window.google) return;

        clearInterval(_start);

        modifyGoogOverlay();
    }, 100);


    function modifyGoogOverlay() {
        if (google.maps.OverlayView.prototype.__originalSetMap) return;

        let originalSetMap = google.maps.OverlayView.prototype.setMap;

        google.maps.OverlayView.prototype.__originalSetMap = originalSetMap;

        google.maps.OverlayView.prototype.setMap = makeOverlayClickable;
    };

    function makeOverlayClickable(...args) {
        this.__originalSetMap.apply(this, args);

        if (!_map) {
            setMapListener(this.map);
            createOverlayConstructor();
            _map = this.map;
        }


        setTimeout(()=>{
            if (this.div) {
                if (!/correct/i.test(this.div.innerHTML)) return;

                let x = this.position.lng();
                let y = this.position.lat();

                set({lat:y, lng:x});

                this.div.style.cursor = 'pointer';
                this.div.addEventListener('click', function(){
                    window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${y},${x}`,'_blank');
                });
            }
        }, 100);
    }

    function setMapListener(map){
        let div = map.getDiv();
        div.addEventListener('auxclick', function(e){
            if (!markers.length){
                setMarkers(map);
                return;
            }
            removeMarkers(map);
        }, false);
    }

    function setMarkers(map){
        let locations = get();
        for(let n = 0; n < locations.length; n++){
            let overlay = new newOverlay(locations[n], n+1,null,'red','blue',false);
            overlay.map = map;
            overlay.setMap(map);
            markers.push( overlay);
        }
    }

    function removeMarkers(map){
        markers.forEach(overlay => overlay.setMap(null));
        markers = [];
    }

    function get(){
        let pathname =location.pathname.replace(/\/summary/,'');
        return JSON.parse(sessionStorage[pathname] || '[]');
    }

    function set(obj){
        let s = get();
        if (!s){
            s = [];
        }
        for (let n = 0; n < s.length; n++){
            let l = s[n];
            if (l.lat === obj.lat && l.lng === obj.lng){
                // Location already exists
                return;
            }
        }
        s.push(obj);

        sessionStorage[location.pathname] = JSON.stringify(s);

        return null;
    }
    let newOverlay = null;

    function createOverlayConstructor(){

        let createOverlay = function (location, num, countryCode, overlayColor, polyColor, forcePoly) {
            this.x = location.lng;
            this.y = location.lat;
            this.h = 28;
            this.w = 28;
            this.streak = true;
            this.num = num;
            this.countryCode = countryCode;
            this.color = overlayColor;
            this.polyColor = polyColor;
            this.forcePoly = forcePoly;
            this.dontAddToArr = true;
            this.point = new google.maps.LatLng(location.lat, location.lng);
            // window._overlay = this; // TODO: fix this.
            //console.log(_overlay, window, google);

            return this;
        };

        createOverlay.prototype = new google.maps.OverlayView();

        createOverlay.prototype.constructor = createOverlay;

        createOverlay.prototype.onAdd = function () {
            this.div = document.createElement("div");
            this.div.style.border = "5px solid " + (this.color || rgb(250, 250, 250));
            this.div.style.position = "absolute";
            this.div.style.background = "black";
            this.div.style.fontSize = "1rem";
            this.div.style.marginLeft = "-5px";
            this.div.style.marginTop = "-5px";
            this.div.style.display = "flex";
            this.div.style.alignItems = "center";
            this.div.style.fontWeight = "700";
            this.div.style.fontFamily = "var(--countryStreakFont)";
            this.div.style.width = this.w + "px";
            this.div.style.height = this.h + "px";
            this.div.style.cursor = "pointer";
            this.div.style.borderRadius = "50px";
            this.div.innerHTML = `<div style="text-align:center; width:100%;color:rgb(250,250,250);">${this.num}</div>`;
            this.div.classList.add("expando");

            this.div.addEventListener('click', ()=>{
                window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${this.y},${this.x}`,'_blank');
            });
            const panes = this.getPanes();
            panes.overlayMouseTarget.appendChild(this.div);

            this._map = this.map;

            //  if (this.countryCode !== "Error") {
            //  //    this.polygon = makePoly(this.countryCode, this.polyColor, this.map);
            //  //    highlightManager.add(this.polygon);
            //  }
        };

        createOverlay.prototype.onRemove = function () {
            this.div.parentElement.removeChild(this.div);
        };

        // createOverlay.prototype.setPosition = function(point){
        //     //Probably not ever called.
        //     console.log('overlay setPosition w;as called');
        //     this.draw();
        // }

        createOverlay.prototype.draw = function () {
            let proj = this.getProjection();
            let c = proj.fromLatLngToDivPixel(this.point);
            this.div.style.left = c.x - this.w / 2 + "px";
            this.div.style.top = c.y - this.h / 2 + "px";
        };

        newOverlay = createOverlay;
    }
})();
