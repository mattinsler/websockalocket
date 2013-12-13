# socket = require('websockalocket').server(8000)

server = require('http').createServer().listen(8000)
socket = require('../lib/websockalocket').server(server)

socket.on 'authorization', (context, done) ->
  return done(false) unless context.req.headers.authorization?
  return done(false) unless /^Basic /.test(context.req.headers.authorization)
  
  [name, password] = Buffer(context.req.headers.authorization.replace(/^Basic /, ''), 'base64').toString().split(':')
  context.user =
    name: name
    password: password
  
  done(true)

socket.implement(
  (context) ->
    ping: ->
      console.log 'RECV ping'
      setTimeout =>
        @_send('pong')
      , 2000
      return 'pong ' + context.user.name
)

socket.on 'connection', (conn) ->
  console.log 'New Connection'
  conn.send('pong')
