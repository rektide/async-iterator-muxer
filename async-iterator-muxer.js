import defer from "p-defer"

/**
* Unfold a promise into something which will always resolve, either with `value` or `error`.
* Additionall attach an `index` field with the index number of this item in a collection.
*/
async function resolveNext( iterator){
	if( iterator.then){
		// we only expect this the the first time we .add a promise
		// rather than an iterable
		iterator= await iterator
		// that promise is probably? an iterable - get iterator now
		iterator= findIterator( iterator)
	}
	try{
		var val= await iterator.next()
		val.iterator= iterator
		return val
	}catch( error){
		return {
			error,
			done: true,
			iterator
		}
	}
}

function findIterator( iterable){
	var iterator= iterable
	if( iterable[ Symbol.asyncIterator]){
		iterator= iterable[ Symbol.asyncIterator]()
	}else if( iterable[ Symbol.iterator]){
		iterator= iterable[ Symbol.iterator]()
	}
	if( !iterator&& iterable.next){
		// allow iterators directly to be passed in too
		iterator= iterable
	}
	return iterator
}

export class AsyncIteratorMuxer{
	/**
	* @param iterables - collection of async or sync iterables, or iterators
	*/
	constructor( options, iterables){
		//super( AsyncIteratorMuxer.prototype[ Symbol.asyncIterator])
		this.iterators= []
		this.nexts= []
		this.dones= new WeakMap()
		Object.defineProperties( this, {
			// reverse map from iterator to original iterable
			_iterables: {
				value: new WeakMap()
			}
		})
		Object.assign( this, options)
		for( var i of iterables|| []){
			this.add( i)
		}	
	}
	async *[ Symbol.asyncIterator](){
		while( true){
			if( this.awaitingIterable){
				// sleep until we have a new iterable to await
				await this.awaitingIterable.promise
				// resume normal looping now that we have something to iterate
				delete this.awaitingIterable
			}

			// get next element. because of resolveNext's nature this will never throw.
			var
			  cur= await Promise.race( this.nexts),
			  index= this.iterators.indexOf( cur.iterator)
			if( index=== -1){
				throw new Error("Could not find expected iterator")
			}

			// pre- hooks
			// spent a while getting fancy with interface & contract for how these might work
			// lower level than desireable, but modify in place vastly simplified this codebase &
			// no worse than almost all alternative ideas I cooked up
			if( cur.done&& this.ondone){
				await this.ondone( cur, this)
			}else if( cur.resolved&& this.onresolve){
				await this.onresolve( cur, this)
			}else if( cur.rejected&& this.onreject){
				await this.onreject( cur, this)
			}

			// handle end of whichever iterator
			// this first part must always be run- cleanup
			// `doneAndYield` allows ondone handlers to coerce `done` into a yielded result while still running essential logic
			if( cur.done|| cur.doneAndYield){
				// save return value
				// lookup the iterable or iterator the user added originally
				var iterable= this._iterables.get( cur.iterator)
				if( iterable){
					// save the return value for the iterable or iterator
					// note only most recent value for any given iterable is saved
					// but user can work-around by adding distinct iterators directly
					this.dones.set( iterable, cur.value)
				}

				// remove this iterator since it's done
				this.iterators.splice( index, 1)
				this.nexts.splice( index, 1)

				// handle running out of iterators, if we're in `leaveOpen` mode.
				await Promise.resolve()
				if( this.iterators.length=== 0){
					if( !this.leaveOpen&& !cur.leaveOpen){
						// terminate looping - default
						return this.dones
					}else{
						// in `leaveOpen` mode we await additional 
						// wait for a new iterator to be added
						this.awaitingIterable= this.awaitingIterable|| defer()
						await this.awaitingIterable.promise
						// cleanup
						this.awaitingIterable= null
					}
				}
			}else{
				// we've consumed the current "next", so advance
				this.nexts[ index]= resolveNext( this.iterators[ index])
			}

			// yield normal results
			if( !cur.skip&&( !cur.done|| this.yieldDones)){
				yield !this.leaveWrapped? cur.value: cur
			}
		}
		return this.dones
	}
	add( iterable){
		// find an iterator from whats passed in
		var iterator= findIterator( iterable)
		// wrap iterator (and resolve first, if iterable is a promise for an iterable)
		var next= resolveNext( iterator)

		// we're really waiting for an iterable atm
		if( iterable.then){
			// resolveNext takes care of awaiting the iterator such that .nexts works without issue
			// but we have to swap the iterator into .iterators once resolveNext resolves it
			next.then( cur=> {
				var index= this.iterators.indexOf( iterator)
				this.iterators[ index]= cur.iterator
			})
		}

		// add iterator/next to our collections of in-flight stuff
		this.iterators.push( iterator)
		this.nexts.push( next)
		// weak lookup of original iterable from an iterator, for `dones`
		this._iterables.set( iterator, iterable)

		// if we are iterating in `leaveOpen` mode & run out of stuff,
		// now is the time when we have new stuff! signal to it.
		if( this.awaitingIterable){
			this.awaitingIterable.resolve()
		}
		return this
	}
}
export default AsyncIteratorMuxer
