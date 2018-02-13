"use strict"
var
  AsyncIteratorMuxer= require( ".."),
  tape= require( "tape")

console.log(AsyncIteratorMuxer)

async function muxerRun( options, ...inputs){
	var
	  muxer= new AsyncIteratorMuxer( options),
	  outputs= []
	for( var input of inputs){
		muxer.add( input)
	}
	for await( var output of muxer){
		outputs.push( output)
	}
	return outputs
}

tape( "can pass through a synchronous iterable", async function( t){
	t.plan( 4)
	var
	  syncIterable= [ 1,2,3],
	  muxer= await muxerRun( null, syncIterable)
	t.equal( muxer.length, 3, "output is three elements")
	t.equal( muxer[0], 1, "first output is 1")
	t.equal( muxer[0], 2, "second output is 2")
	t.equal( muxer[0], 3, "third output is 3")
	t.end()
})

tape( "can pass through an asynchronous iterable", function( t){
	t.plan( 0)
	var muxer= new AsyncIterableMuxer()
	t.end()
})

tape( "can mux an async and a synchronous iterable", function( t){
	t.plan( 0)
	var muxer= new AsyncIterableMuxer()

	t.end()
})
