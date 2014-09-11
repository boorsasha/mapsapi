DG.Geoclicker.Provider.CatalogApi = DG.Class.extend({
    options: {
        urlGeo: '__WEB_API_SERVER__/__WEB_API_VERSION__/geo/search',
        urlDetails: '__WEB_API_SERVER__/__WEB_API_VERSION__/catalog/branch/get',
        urlFirmsInHouse: '__WEB_API_SERVER__/__WEB_API_VERSION__/catalog/branch/list',
        data: {
            key: '__GEOCLICKER_CATALOG_API_KEY__'
        },
        geoFields: '__GEO_ADDITIONAL_FIELDS__',
        firmInfoFields: '__FIRM_INFO_FIELDS__',

        timeoutMs: 5000
    },

    initialize: function (map) { // (Object)
        this._map = map;
    },

    getLocations: function (options) { // (Object)
        // Callback will receive array of found results or void if errors occurred or nothing was found.
        var zoom = options.zoom,
            latlng = options.latlng,
            callback = options.callback,
            beforeRequest = options.beforeRequest || function () {},
            types = this.getTypesByZoom(zoom),
            q = latlng.lng + ',' + latlng.lat;

        if (!types) {
            callback({'error': 'no type'});
            return;
        }

        beforeRequest();
        this.geoSearch(q, types, zoom).then(DG.bind(function (result) {
            callback(this._filterResponse(result, types));
        }, this));
    },

    firmsInHouse: function (houseId, parameters) { // (String, Function, Number)
        parameters = parameters || {};

        var params = DG.extend(this.options.data, {
            building_id: houseId,
            page: parameters.page || 1
        });

        return this._performRequest(params, this.options.urlFirmsInHouse);
    },

    getFirmInfo: function (firmId) {
        return this._performRequest({
            type: 'filial',
            id: firmId,
            fields: this.options.firmInfoFields
        }, this.options.urlDetails);
    },

    geoSearch: function (q, types, zoomlevel) { // (String, String, Number)
        var params = {
            point: q,
            type: types,
            zoom_level: zoomlevel,
            fields: this.options.geoFields
        };

        return this._performRequest(params, this.options.urlGeo);
    },

    cancelLastRequest: function () {
        if (this._lastRequest) {
            this._lastRequest.abort();
        }
    },

    getTypesByZoom: function (zoom) { // (Number) -> String|Null
        var types = {
            'adm_div.settlement':   8,
            'adm_div.city':         8,
            'adm_div.division':     11,
            'adm_div.district':     12,
            'street':               14,
            'building':             14,
            'adm_div.place':        15,
            'poi':                  15,
            'attraction':           17
        },
        selectedTypes = [];

        Object.keys(types).forEach(function (type) {
            if (zoom >= types[type]) {
                selectedTypes.push(type);
            }
        });

        if (selectedTypes.length) {
            return selectedTypes.join(',');
        } else {
            return null;
        }
    },

    _performRequest: function (params, url) { // (Object, String, Function, Function)
        var source = this.options.data,
            data = DG.extend({ // TODO clone function should be used instead of manually copying
                key: source.key
            }, params),
            type = 'get';

        this.cancelLastRequest();

        if (!DG.ajax.corsSupport) {
            type = data.output = 'jsonp';
        }

        this._lastRequest = DG.ajax(url, {
            type: type,
            data: data,
            timeout: this.options.timeoutMs
        });

        return this._lastRequest.then(undefined, function () { return false; });
    },

    _filterResponse: function (response, allowedTypes) { // (Object, Array) -> Boolean|Object
        var result = {}, i, item, found, data, type;

        if (this._isNotFound(response)) {
            return false;
        }

        data = response.result.items;

        for (i = data.length - 1; i >= 0; i--) {
            item = data[i];

            type = item.type;
            if (item.subtype) {
                type += '.' + item.subtype;
            }

            if (allowedTypes && allowedTypes.indexOf(type) === -1) {
                continue;
            }

            result[type] = item;
            found = true;
        }

        if (found) {
            return result;
        } else {
            return false;
        }
    },

    _isNotFound: function (response) { // (Object) -> Boolean
        return !response ||
               !!response.meta && !!response.meta.error ||
               !response.result ||
               !response.result.items ||
               !response.result.items.length;
    }

});
