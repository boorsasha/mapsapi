DG.Meta.PoiStorage = DG.Meta.Storage.extend({

    _data: {},
    _tilesData: {},

    _addEntity: function (id, entity, zoom) { //(String, Object, String)
        var randomEntityLink = entity.links[Math.floor(Math.random() * entity.links.length)];

        entity.linked = {};
        Object.keys(randomEntityLink).forEach(function (prop) {
            entity.linked[prop] = randomEntityLink[prop];
        });

        entity.links.length = 0;
        delete entity.links;

        // entity.geometry = DG.geoJsonLayer(entity.hover);
        entity = this._wktToBound(entity, zoom);
        // entity = this._wktToVert(entity, zoom);
        // entity.bound = DG.geoJsonLayer(entity.hover).getBounds();
        // delete entity.hover;

        // if (!this._data[id]) { this._data[id] = {}; }
        // this._data[id] = DG.extend(this._data[id], entity);
        this._data[id] = DG.extend(this._data[id] || {}, entity);
    }

});
