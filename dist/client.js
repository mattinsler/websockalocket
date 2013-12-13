(function() {
  var Client, EventEmitter, Protocol, net, q, websocket,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  q = require('q');

  net = require('net');

  Protocol = require('./protocol');

  EventEmitter = require('events').EventEmitter;

  websocket = require('websocket-driver');

  Client = (function(_super) {
    __extends(Client, _super);

    function Client(url, opts) {
      this.url = url;
      this.opts = opts;
      this.protocols = [];
    }

    Client.prototype.connect = function() {
      var d, parsed, tcp,
        _this = this;
      d = q.defer();
      parsed = require('url').parse(this.url);
      if (parsed.port == null) {
        if (parsed.protocol === 'ws:') {
          parsed.port = 80;
        } else if (parsed.protocol === 'wss:') {
          parsed.port = 443;
        }
      }
      tcp = net.createConnection(parsed.port || 80, parsed.hostname);
      tcp.on('error', function(err) {
        return d.reject(err);
      });
      tcp.on('close', function() {
        return d.reject(new Error('Could not connect to server'));
      });
      tcp.on('connect', function() {
        return d.resolve(tcp);
      });
      return d.promise;
    };

    Client.prototype.start = function() {
      var _this = this;
      return this.connect().then(function(tcp) {
        var context, k, v, _ref;
        _this.driver = websocket.client(_this.url);
        if (_this.opts.headers != null) {
          _ref = _this.opts.headers;
          for (k in _ref) {
            v = _ref[k];
            _this.driver.setHeader(k, v);
          }
        }
        tcp.pipe(_this.driver.io).pipe(tcp);
        context = {};
        _this.default_protocol = new Protocol(_this.driver, {});
        _this.protocols.forEach(function(protocol) {
          var p;
          p = typeof protocol === 'function' ? protocol(context) : protocol;
          return new Protocol(_this.driver, p);
        });
        _this.driver.on('error', function(event) {
          return _this.emit('error', event.data);
        });
        _this.driver.start();
        _this.emit('connect');
        return _this;
      });
    };

    Client.prototype.implement = function(protocol) {
      var p;
      this.protocols.push(protocol);
      if (this.driver != null) {
        p = typeof protocol === 'function' ? protocol(context) : protocol;
        return new Protocol(this.driver, p);
      }
    };

    Client.prototype.send = function() {
      var _ref;
      return (_ref = this.default_protocol).send.apply(_ref, arguments);
    };

    return Client;

  })(EventEmitter);

  module.exports = Client;

}).call(this);
