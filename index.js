"use strict"
var
  esm= require( "esm")( module),
  AsyncIteratorMuxer= esm( "./async-iterator-muxer.js")



module.exports= AsyncIteratorMuxer.default
console.log(exports)
Object.defineProperties( module.exports, {
	AsyncIteratorMuxer: {
		value: AsyncIteratorMuxer
	}
})
