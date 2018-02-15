#!/usr/bin/env node
"use strict"
var
  generators= 4,
  minMs= 100,
  maxMs= 3000,
  results= 5

console.log("a SampleGenerator is an async-iterator delivering a series of results, waiting a random time between deliveries")
console.log("each result consists of:")
console.log("* t, total time since generator was constructed,")
console.log("* delay,  time since this generator last fired, and")
console.log("* remaining, the number of samples left to generate")
console.log("* name, a distinguishing name for this SampleGenerator")
console.log("")

console.log("first we'll run one SampleGenerator, to demonstrate what a SampleGenerator does:")
var proto= (async function(){
	for await( var result of SampleGenerator("prototype")){
		console.log( result)
	}
})()

proto.then(async function(){
	console.log("")
	console.log("ok SampleGenerator delivers some results over time")
	console.log("")
	console.log("lets see what happens when we feed multiple SampleGenerators into async-iterator-muxer")
	var
	  muxer= new (require( ".."))(),
	  alpha= SampleGenerator( "alpha")
	muxer.add( alpha)
	muxer.add( SampleGenerator( "beta"))
	// to be REALLY tricky we'll add this one late
	Delay( 4000, 4000).then( function( delay){
		console.log("adding \"omega\" generator now")
		muxer.add( SampleGenerator( "omega", delay))
	})
	// show results!
	for await( var result of muxer){
		console.log( result)
	}
	console.log("results are interleaved in the order they appears- muxed together")
	console.log("")
	console.log("as a final feature, results of each iterator are available (via a `dones` property):")
	console.log( muxer.dones.get( alpha))
})

async function Delay( min, max){
	min= min|| minMs
	max= max|| maxMs
	var delay= Math.floor( Math.random() *( max- min))+ min
	await new Promise( resolve=> setTimeout( resolve, delay))
	return delay
}

async function *SampleGenerator( name, t){
	t= t|| 0
	// iterate this many times
	var remaining= results

	// in each loop, delay, then produce a result
	async function loop(){
		var delay= await Delay()
		t+= delay
		return {t, delay, remaining, name}
	}
	// yield, for however many iterations we have
	while( remaining--){
		yield loop()
	}

	// return a final result
	var result= await loop()
	// mark it up just to be super clear
	result.isResult= true
	return result
}
