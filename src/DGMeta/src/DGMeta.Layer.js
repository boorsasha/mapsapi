DG.Meta = {};

DG.Meta.Layer = DG.Layer.extend({

    options: {
        tileSize: 256,

        minZoom: 0,
        maxZoom: 19,
        zoomOffset: 0,
        eventBubbling: 'transparent'
        // maxNativeZoom: <Number>,
        // detectRetina: <Number>,
        // zoomReverse: <Number>
        // attribution: <String>,
        // zIndex: <Number>,
        // bounds: <LatLngBounds>
    },

    initialize: function (source, options) { // (String, Object)
        DG.TileLayer.prototype.initialize.call(this, null, options);
        delete this._url;

        this._currentTile = false;
        this._currentTileData = false;
        this._hoveredObject = null;

        this._origin = DG.Meta.origin(source, {
            dataFilter: this.options.dataFilter
        });
    },

    getOrigin: function () { // () -> Object
        return this._origin;
    },

    onAdd: function (map) {
        this._viewReset();
        this._addDomEvents();

        map.on('rulerstart', this._removeDomEvents, this);
        map.on('rulerend', this._addDomEvents, this);
    },

    onRemove: function (map) {
        this._removeDomEvents();
        this._tileZoom = null;

        map.off('rulerstart', this._removeDomEvents, this);
        map.off('rulerend', this._addDomEvents, this);
    },

    getEvents: function () {
        return {
            viewreset: this._viewReset
        };
    },

    _addDomEvents: function () {
        DG.DomEvent.on(this._map.getPane('tilePane'), this._domEvents, this);
    },

    _removeDomEvents: function () {
        DG.DomEvent.off(this._map.getPane('tilePane'), this._domEvents, this);
    },

    _getZoomForUrl: DG.TileLayer.prototype._getZoomForUrl,
    _getTileSize: DG.TileLayer.prototype._getTileSize,
    _isValidTile: DG.GridLayer.prototype._isValidTile,
    _wrapCoords: DG.GridLayer.prototype._wrapCoords,
    _viewReset: DG.GridLayer.prototype._viewReset,
    _resetGrid: DG.GridLayer.prototype._resetGrid,
    _pxBoundsToTileRange: DG.GridLayer.prototype._pxBoundsToTileRange,

    _domEvents: {
        mousemove: function (event) { // (MouseEvent)
            var tileSize = this._getTileSize(),
                layerPoint = this._map.mouseEventToLayerPoint(event),
                tileOriginPoint = this._map.getPixelOrigin().add(layerPoint),
                tileCoord = tileOriginPoint.divideBy(tileSize).floor(),
                mouseTileOffset,
                tileKey,
                hoveredObject,
                zoom = this._map.getZoom();

            if (zoom > (this.options.maxZoom + this.options.zoomOffset) ||
                zoom < (this.options.minZoom - this.options.zoomOffset) ||
                !this._isValidTile(tileCoord)) {
                return;
            }

            this._wrapCoords(tileCoord);

            tileCoord.z = this._getZoomForUrl();
            tileCoord.key = tileSize;
            tileKey = this._origin.getTileKey(tileCoord);

            if (tileKey !== this._currentTile) {
                this._currentTile = tileKey;
                this._currentTileData = false;
            }

            if (this._currentTileData === false) {
                this._currentTileData = this._origin.getTileData(tileCoord);
            } else {
                mouseTileOffset = DG.point(tileOriginPoint.x % tileSize, tileOriginPoint.y % tileSize);
                hoveredObject = this._getHoveredObject(tileCoord, mouseTileOffset);

                if (this._hoveredEntity !== hoveredObject) {
                    this._fireMouseEvent('mouseout', event);

                    this._hoveredEntity = hoveredObject;
                    this._fireMouseEvent('mouseover', event);
                }

                this._fireMouseEvent('mousemove', event);
            }
        },
        mouseout: function (event) {
            this._fireMouseEvent('mouseout', event);
            this._hoveredEntity = null;
            this._currentTile = false;
        },

        click: function (event) {
            this._fireMouseEvent('click', event);
        },

        dblclick: function (event) {
            this._fireMouseEvent('dblclick', event);
        },

        mousedown: function (event) {
            this._fireMouseEvent('mousedown', event);
        },

        contextmenu: function (event) {
            this._fireMouseEvent('contextmenu', event);
        }
    },

    _fireMouseEvent: function (type, mouseEvent) {
        if (this._hoveredEntity) {
            this.fire(type, {
                meta: this._hoveredEntity,
                latlng: this._map.mouseEventToLatLng(mouseEvent)
            });
            if (this.options.eventBubbling === 'layer') {
                DG.DomEvent.stop(mouseEvent);
            }
        }
    },

    _getHoveredObject: function (coords, mouseTileOffset) {
        for (var i = this._currentTileData.length - 1; i >= 0; i--) {
            if (DG.PolyUtil.contains(mouseTileOffset, this._currentTileData[i].geometry.coordinates[0])) {
                return this._currentTileData[i];
            }
        }

        return null;
    },

    _reset: function (center, zoom, hard, noPrune, noUpdate) {
        var tileZoom = Math.round(zoom),
            tileZoomChanged = this._tileZoom !== tileZoom;

        if (!noUpdate && (hard || tileZoomChanged)) {
            this._tileZoom = tileZoom;
            this._resetGrid();
        }
    }

});

DG.Meta.layer = function (source, options) {
    return new DG.Meta.Layer(source, options);
};
