"use strict"
var
  AsyncIteratorMuxer= require( ".."),
  tape= require( "tape")

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

async function *asyncIter( ...inputs){
	// delay
	await new Promise( resolve=> setTimeout( resolve, 30))
	for( var input of inputs){
		// be really async please
		await Promise.resolve()
		yield input
	}
}

tape( "can pass through a synchronous iterable", async function( t){
	t.plan( 4)
	var
	  syncIterable= [ 1,2,3],
	  muxer= await muxerRun( null, syncIterable)
	t.equal( muxer.length, 3, "output is three elements")
	t.equal( muxer[ 0], 1, "first output is 1")
	t.equal( muxer[ 1], 2, "second output is 2")
	t.equal( muxer[ 2], 3, "third output is 3")
	t.end()
})

tape( "can pass through an asynchronous iterable", async function( t){
	t.plan( 4)
	var
	  asyncIterable= asyncIter( 4, 5, 6),
	  muxer= await muxerRun( null, asyncIterable)
	t.equal( muxer.length, 3, "output is three elements")
	t.equal( muxer[ 0], 4, "first output is 4")
	t.equal( muxer[ 1], 5, "second output is 5")
	t.equal( muxer[ 2], 6, "third output is 6")
	t.end()
})

tape( "can mux an async and a synchronous iterable", async function( t){
	t.plan( 5)
	var
	  syncIterable= [ 42, 43],
	  asyncIterable= asyncIter( 44, 45),
	  muxer= await muxerRun( null, asyncIterable, syncIterable)
	t.equal( muxer.length, 4, "output is 4 elements")
	t.equal( muxer[ 0], 42, "first output is 42")
	t.equal( muxer[ 1], 43, "second output is 43")
	t.equal( muxer[ 2], 44, "third output is 44")
	t.equal( muxer[ 3], 45, "third output is 45")
	t.end()
})
