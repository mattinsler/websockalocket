q = require 'q'
crypto = require 'crypto'
{EventEmitter} = require 'events'

class Protocol extends EventEmitter
  constructor: (@driver, @protocol) ->
    @protocol._send = @send.bind(@)
    
    @seq = crypto.randomBytes(2).readUInt16LE(0)
    @handlers = {}
    @events =
      open: @on_open.bind(@)
      error: @on_error.bind(@)
      message: @on_message.bind(@)
      close: @on_close.bind(@)
    
    @bind()
  
  bind: ->
    @driver.on('open', @events.open)
    @driver.on('error', @events.error)
    @driver.messages.on('data', @events.message)
    @driver.on('close', @events.close)
  
  unbind: ->
    @driver.removeListener('open', @events.open)
    @driver.removeListener('error', @events.error)
    @driver.messages.removeListener('data', @events.message)
    @driver.removeListener('close', @events.close)
  
  on_open: (event) ->
    @emit('open')
  
  on_error: (event) ->
    console.log 'ERROR IN PROTOCOL', arguments
    # @emit('error', event.data)
  
  on_message: (data) ->
    @emit('message', data)
    # console.log 'got a message', data
    
    [id, cmd, args...] = JSON.parse(data)
    return @on_ack(args...) if cmd is 'ack'
    return @on_nak(args...) if cmd is 'nak'
    
    # return @send('nak', id, "Command '#{cmd}' is not supported") unless @protocol[cmd]?
    return unless @protocol[cmd]?
    
    q()
    .then =>
      # console.log 'HANDLING', cmd
      @protocol[cmd](args...)
    .then (data) =>
      @send('ack', id, data)
    .catch (err) =>
      @send('nak', id, err.message)
  
  on_close: (event) ->
    @emit('close', event.code, event.reason)
  
  on_ack: (res_id, res...) ->
    handler = @handlers[res_id]
    return unless handler?
    
    if res.length is 0
      handler.resolve()
    else if res.length is 1
      handler.resolve(res[0])
    else
      handler.resolve(res)
    
    # console.log 'HANDLING ACK', res_id
    delete @handlers[res_id]
    
  on_nak: (res_id, error) ->
    handler = @handlers[res_id]
    return unless handler?
    
    err = new Error()
    err.name = 'RemoteError'
    
    if typeof error is 'string'
      err.message = error
    else
      err[k] = v for k, v of error
    
    # console.log 'HANDLING NAK', res_id
    handler.reject(err)
    
    delete @handlers[res_id]
  
  send: (cmd, args...) ->
    id = ++@seq
    @handlers[id] = q.defer()
    
    data = JSON.stringify([id, cmd, args...])
    @driver.messages.write(data)
    
    @handlers[id].promise

module.exports = Protocol
