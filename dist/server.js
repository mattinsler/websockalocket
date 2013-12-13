(function() {
  var EventEmitter, Protocol, Server, http, https, websocket,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  http = require('http');

  https = require('https');

  Protocol = require('./protocol');

  EventEmitter = require('events').EventEmitter;

  websocket = require('websocket-driver');

  Server = (function(_super) {
    __extends(Server, _super);

    function Server(thing) {
      this.protocols = [];
      if (thing instanceof http.Server || thing instanceof https.Server) {
        this.server = thing;
      } else if (typeof thing === 'number') {
        console.log('turn this into a tcp server');
      } else {
        throw new Error('Invalid argument to Server');
      }
    }

    Server.prototype.start = function() {
      var _this = this;
      return this.server.on('upgrade', function(req, socket, body) {
        var context, new_connection;
        if (!websocket.isWebSocket(req)) {
          return;
        }
        context = {
          req: req
        };
        new_connection = function() {
          var driver;
          driver = websocket.http(req);
          driver.io.write(body);
          socket.pipe(driver.io).pipe(socket);
          _this.protocols.forEach(function(protocol) {
            var p;
            p = typeof protocol === 'function' ? protocol(context) : protocol;
            return new Protocol(driver, p);
          });
          driver.on('open', function() {
            return _this.emit('connection', new Protocol(driver, {}));
          });
          return driver.start();
        };
        if (_this.listeners('authorization').length !== 1) {
          return new_connection();
        }
        return _this.listeners('authorization')[0](context, function(authenticated) {
          if (authenticated) {
            return new_connection();
          }
          return socket.end();
        });
      });
    };

    Server.prototype.implement = function(protocol_handler) {
      return this.protocols.push(protocol_handler);
    };

    return Server;

  })(EventEmitter);

  module.exports = Server;

}).call(this);
