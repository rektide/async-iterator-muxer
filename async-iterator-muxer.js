import defer from "p-defer"

/**
* Unfold a promise into something which will always resolve, either with `value` or `error`.
* Additionall attach an `index` field with the index number of this item in a collection.
*/
async function resolveNext( iterator){
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
		// find an iterator
		var iterator
		if( iterable[ Symbol.asyncIterator]){
			iterator= iterable[ Symbol.asyncIterator]()
		}else if( iterable[ Symbol.iterator]){
			iterator= iterable[ Symbol.iterator]()
		}
		if( !iterator&& iterable.next){
			// allow iterators directly to be passed in too
			iterator= iterable
		}

		// wrap iterator
		var next= resolveNext( iterator)

		// add it to our collection of iterators
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
