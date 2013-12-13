(function() {
  exports.Client = require('./client');

  exports.Protocol = require('./protocol');

  exports.Server = require('./server');

  exports.server = function(thing) {
    var server;
    server = new exports.Server(thing);
    server.start();
    return server;
  };

  exports.client = function(url, opts) {
    var client;
    client = new exports.Client(url, opts);
    client.start();
    return client;
  };

}).call(this);
