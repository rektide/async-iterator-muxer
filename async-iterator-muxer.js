import { Bound} from "extensible-function/async-generator.js"
import defer from "p-defer"

/**
* Unfold a promise into something which will always resolve, either with `value` or `error`.
* Additionall attach an `index` field with the index number of this item in a collection.
*/
async function resolveNext( iterator){
	try{
		var val= await iter.next()
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

export class AsyncIteratorMuxer extends Bound{
	/**
	* @param iterables - collection of async or sync iterables, or iterators
	*/
	constructor( iterables, options){
		super( AsyncIteratorMuxer.prototype[ Symbol.asyncIterator])
		this.iterators= []
		this.nexts= []
		Object.assign( this, options)
		for( var i of iterables|| {}){
			this.add( i)
		}	
	}
	async [ Symbol.asyncIterator]*(){
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
			  index= this.iterators.indexOf( cur.iterator),
			  // by default return the value
			  returnValue= !this.leaveWrapped? cur.value: cur

			// pre- hooks
			// spent a while getting fancy with interface & contract for how these might work
			// lower level than desireable, but modify in place vastly simplified this codebase &
			// no worse than almost all alternative ideas I cooked up
			if( cur.resolved&& this.onresolve){
				await this.onresolve( cur, this)
			}
			if( cur.rejected&& this.onreject){
				await this.onreject( cur, this)
			}

			// handle end of whichever iterator
			if( cur.done){
				// remove this iterator
				this.iterators.splice( index, 1)
				this.nexts.splice( index, 1)

				// handle running out of iterators
				if( this.iterators.length=== 0){
					if( !this.leaveOpen){
						// terminate looping - default
						done= true
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
				this.nexts[ index]= this.iterators[ index].next()
			}

			yield returnValue
		}
	}
	add( iterable){
		var
		  asyncIter= iterable[ Symbol.asyncIterator],
		  syncIter= iterable[ Symbol.iterator]
		  iterator= asyncIter|| syncIter|| iterable,
		  next= resolveNext( iterator)
		this.iterators.push( iterator)
		this.nexts.push( next)
		if( this.awaitingIterable){
			this.awaitingIterable.resolve()
		}
		return this
	}
}
export default AsyncIteratorMuxer