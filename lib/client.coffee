q = require 'q'
net = require 'net'
Protocol = require './protocol'
{EventEmitter} = require 'events'
websocket = require 'websocket-driver'

class Client extends EventEmitter
  constructor: (@url, @opts) ->
    @protocols = []
  
  connect: ->
    d = q.defer()
    
    parsed = require('url').parse(@url)
    unless parsed.port?
      if parsed.protocol is 'ws:'
        parsed.port = 80
      else if parsed.protocol is 'wss:'
        parsed.port = 443
    
    tcp = net.createConnection(parsed.port or 80, parsed.hostname)
    tcp.on 'error', (err) ->
      d.reject(err)
    tcp.on 'close', ->
      d.reject(new Error('Could not connect to server'))
    tcp.on 'connect', =>
      d.resolve(tcp)
    
    d.promise
  
  start: ->
    @connect()
    .then (tcp) =>
      @driver = websocket.client(@url)
      if @opts.headers?
        @driver.setHeader(k, v) for k, v of @opts.headers
      tcp.pipe(@driver.io).pipe(tcp)
      
      # not sure what should go in here
      context = {}
      
      @default_protocol = new Protocol(@driver, {})
      @protocols.forEach (protocol) =>
        p = if typeof protocol is 'function' then protocol(context) else protocol
        new Protocol(@driver, p)
      
      @driver.on 'error', (event) =>
        @emit('error', event.data)
      
      @driver.start()
      
      @emit('connect')
      @
  
  implement: (protocol) ->
    @protocols.push(protocol)
    if @driver?
      p = if typeof protocol is 'function' then protocol(context) else protocol
      new Protocol(@driver, p)
  
  send: ->
    @default_protocol.send(arguments...)

module.exports = Client
