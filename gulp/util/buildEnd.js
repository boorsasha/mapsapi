var argv = require('minimist')(process.argv.slice(2));
var log = require('fancy-log');
var c = require('ansi-colors');

var stat = require('./stat');
var config = require('../../app/config');
var deps = require('../deps')(config);

module.exports = function() {
    log('Build contains the next modules:');

    deps.getModulesList(argv.pkg).forEach(function(module) {
        log('- ' + module);
    });

    if (argv.sprite == 'true') {
        log('Builded with sprites');
    } else if (argv.base64 != 'false' && typeof argv.base64 != 'undefined') {
        log('Builded with base64 encode');
    }

    log('\nDist files statistic:');

    var statValues = stat.get();

    Object.keys(statValues).forEach(function(file) {
        log('- ' + file + ': ' + statValues[file]);
    });

    log(c.green('Build successfully complete'));
};
