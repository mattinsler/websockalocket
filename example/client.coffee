socket = require('../lib/websockalocket').client(
  'ws://localhost:8000'
  headers:
    authorization: 'Basic ' + Buffer('foo:bar').toString('base64')
)

socket.implement(
  pong: ->
    console.log 'RECV pong'
    'ping'
)

socket.on 'connect', ->
  console.log 'Connected'
  socket.send('ping')
  .then (res) ->
    console.log res
