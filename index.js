"use strict"
var
  esm= require( "@std/esm")( module),
  AsyncIteratorMuxer= esm( "./async-iterator-muxer.js")

module.exports= AsyncIteratorMuxer.default
Object.defineProperties( module.exports, {
	AsyncIteratorMuxer: {
		value: AsyncIteratorMuxer
	}
})
