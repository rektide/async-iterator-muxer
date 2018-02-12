"use strict"
var
  esm= require( "@std/esm"),
  AsyncIteratorMuxer= esm( "./async-iterator-muxer.js")

module.exports= AsyncIteratorMuxer
Object.defineProperties( module.exports, {
	AsyncIteratorMuxer: {
		value: AsyncIteratorMuxer
	}
})
