DG.Map.mergeOptions({
    traffic: false
});

DG.Traffic = DG.Handler.extend({

    options: {
        disableLabel: false
    },

    initialize: function (map, options) { // (Object)
        this._map = map;
        DG.Util.setOptions(this, options);
    },

    addHooks: function () {
        this._map.on(this._mapEventsListeners, this);
        this._map.meta.enableTrafficListening();
        if (!this.options.disableLabel) {
            this._labelHelper = new DG.Label();
        }
    },

    removeHooks: function () {
        this._map.off(this._mapEventsListeners, this);
        this._map.off('mousemove', this._onMouseMove, this);
        this._map.meta.disableTrafficListening();
        if (this._labelHelper) {
            this._map.removeLayer(this._labelHelper);
            this._labelHelper = null;
        }
    },

    _mapEventsListeners : {
        traffichover: function (e) { // (Object)
            this._setCursor('pointer');
            if (this._labelHelper && e.traffic.speed) {
                this._labelHelper
                    .setPosition(e.latlng)
                    .setContent(e.traffic.speed + ' км/ч');
                // this._testL = e.traffic.geometry.addTo(this._map);
                this._map
                    .on('mousemove', this._onMouseMove, this)
                    .addLayer(this._labelHelper);
            }
        },

        trafficleave: function () {
            this._setCursor('auto');
            // this._testL && this._map.removeLayer(this._testL);
            if (this._labelHelper) {
                this._map
                    .off('mousemove', this._onMouseMove, this)
                    .removeLayer(this._labelHelper);
            }
        }
    },

    _onMouseMove: function (e) { // (Object)
        this._labelHelper.setPosition(e.latlng);
    },

    _setCursor: function (cursor) { // (String)
        this._map.getContainer().style.cursor = cursor;
    }

});

DG.Map.addInitHook('addHandler', 'traffic', DG.Traffic);
