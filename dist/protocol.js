(function() {
  var EventEmitter, Protocol, crypto, q,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __slice = [].slice;

  q = require('q');

  crypto = require('crypto');

  EventEmitter = require('events').EventEmitter;

  Protocol = (function(_super) {
    __extends(Protocol, _super);

    function Protocol(driver, protocol) {
      this.driver = driver;
      this.protocol = protocol;
      this.protocol._send = this.send.bind(this);
      this.seq = crypto.randomBytes(2).readUInt16LE(0);
      this.handlers = {};
      this.events = {
        open: this.on_open.bind(this),
        error: this.on_error.bind(this),
        message: this.on_message.bind(this),
        close: this.on_close.bind(this)
      };
      this.bind();
    }

    Protocol.prototype.bind = function() {
      this.driver.on('open', this.events.open);
      this.driver.on('error', this.events.error);
      this.driver.messages.on('data', this.events.message);
      return this.driver.on('close', this.events.close);
    };

    Protocol.prototype.unbind = function() {
      this.driver.removeListener('open', this.events.open);
      this.driver.removeListener('error', this.events.error);
      this.driver.messages.removeListener('data', this.events.message);
      return this.driver.removeListener('close', this.events.close);
    };

    Protocol.prototype.on_open = function(event) {
      return this.emit('open');
    };

    Protocol.prototype.on_error = function(event) {
      return console.log('ERROR IN PROTOCOL', arguments);
    };

    Protocol.prototype.on_message = function(data) {
      var args, cmd, id, _ref,
        _this = this;
      this.emit('message', data);
      _ref = JSON.parse(data), id = _ref[0], cmd = _ref[1], args = 3 <= _ref.length ? __slice.call(_ref, 2) : [];
      if (cmd === 'ack') {
        return this.on_ack.apply(this, args);
      }
      if (cmd === 'nak') {
        return this.on_nak.apply(this, args);
      }
      if (this.protocol[cmd] == null) {
        return;
      }
      return q().then(function() {
        var _ref1;
        return (_ref1 = _this.protocol)[cmd].apply(_ref1, args);
      }).then(function(data) {
        return _this.send('ack', id, data);
      })["catch"](function(err) {
        return _this.send('nak', id, err.message);
      });
    };

    Protocol.prototype.on_close = function(event) {
      return this.emit('close', event.code, event.reason);
    };

    Protocol.prototype.on_ack = function() {
      var handler, res, res_id;
      res_id = arguments[0], res = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      handler = this.handlers[res_id];
      if (handler == null) {
        return;
      }
      if (res.length === 0) {
        handler.resolve();
      } else if (res.length === 1) {
        handler.resolve(res[0]);
      } else {
        handler.resolve(res);
      }
      return delete this.handlers[res_id];
    };

    Protocol.prototype.on_nak = function(res_id, error) {
      var err, handler, k, v;
      handler = this.handlers[res_id];
      if (handler == null) {
        return;
      }
      err = new Error();
      err.name = 'RemoteError';
      if (typeof error === 'string') {
        err.message = error;
      } else {
        for (k in error) {
          v = error[k];
          err[k] = v;
        }
      }
      handler.reject(err);
      return delete this.handlers[res_id];
    };

    Protocol.prototype.send = function() {
      var args, cmd, data, id;
      cmd = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      id = ++this.seq;
      this.handlers[id] = q.defer();
      data = JSON.stringify([id, cmd].concat(__slice.call(args)));
      this.driver.messages.write(data);
      return this.handlers[id].promise;
    };

    return Protocol;

  })(EventEmitter);

  module.exports = Protocol;

}).call(this);
