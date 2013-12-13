exports.Client = require './client'
exports.Protocol = require './protocol'
exports.Server = require './server'

exports.server = (thing) ->
  server = new exports.Server(thing)
  server.start()
  server

exports.client = (url, opts) ->
  client = new exports.Client(url, opts)
  client.start()
  client
