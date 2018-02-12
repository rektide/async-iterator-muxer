import { Bound} from "extensible-function/async-generator.js"
import defer from "p-defer"

/**
* Unfold a promise into something which will always resolve, either with `value` or `error`.
* Additionall attach an `index` field with the index number of this item in a collection.
*/
async function resolveNext( iterator, index){
	try{
		var val= await iter.next()
		val.index= index
		val.iterator= iterator
		return val
	}catch( error){
		return {
			error,
			done: true,
			index,
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
			// get next element. because of resolveNext's nature this will never throw.
			// TODO - allow a "terminator" signal to cancel early
			var
			  cur= await Promise.race( this.nexts),
			  returnValue

			if( cur.rejected){
				// this will have hit above `done` logic
				try{
					returnValue= this.onreject&& this.onreject( cur, this)
				}catch(error){
					throw error
				}
			}

			// handle end of whichever iterator
			if( cur.done){
				// remove this iterator
				this.iterators.splice( cur.index, 1)
				this.nexts.splice( cur.index, 1)
				// handle running out of iterators
				if( this.iterators.length=== 1){
					if( !this.leaveOpen){
						// terminate looping
						/// UGH: need to handle rejected here too
						return returnValue
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
				yield this.resultWrapper? returnValue: returnValue.value
			}


			// get next
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
