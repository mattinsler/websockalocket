http = require 'http'
https = require 'https'
Protocol = require './protocol'
{EventEmitter} = require 'events'
websocket = require 'websocket-driver'

class Server extends EventEmitter
  constructor: (thing) ->
    @protocols = []
    
    if thing instanceof http.Server or thing instanceof https.Server
      @server = thing
    else if typeof thing is 'number'
      console.log 'turn this into a tcp server'
    else
      throw new Error('Invalid argument to Server')
  
  start: ->
    @server.on 'upgrade', (req, socket, body) =>
      return unless websocket.isWebSocket(req)
      
      context = {req: req}
      new_connection = =>
        driver = websocket.http(req)

        driver.io.write(body)
        socket.pipe(driver.io).pipe(socket)
        
        @protocols.forEach (protocol) ->
          p = if typeof protocol is 'function' then protocol(context) else protocol
          new Protocol(driver, p)
        
        driver.on 'open', =>
          @emit('connection', new Protocol(driver, {}))
      
        driver.start()
      
      return new_connection() unless @listeners('authorization').length is 1
      
      @listeners('authorization')[0] context, (authenticated) ->
        return new_connection() if authenticated
        socket.end()
  
  implement: (protocol_handler) ->
    @protocols.push(protocol_handler)

module.exports = Server
