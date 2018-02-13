# async-iterator-muxer

> Mux/multiplex together multiple sync and async iterables or iterators into one async iterator.



# Usage

1. Create a new instance
2. Call `.add([iterable])` to add iterable things
3. Iterate over the muxer
4. Optionally, `.add` more iterables
5. Optionally, call `.done.get([iterable])` to see it's final result (if applicable)


```
import AsyncIteratorMuxer from "async-iterator-muxer"
var muxer= new AsyncIteratorMuxer()
// ....
muxer.add( myAsyncIterable)
muxer.add( myIterable)
muxer.add( anotherIterable)
for await( var output of muxer){ // for-await must be run inside an async-function, not shown here
	console.log( output)
}
muxer.dones.get( myAsyncIterable) // get the return value of myAsyncIterable
```

Please see [./.example/sample-generator.js](./.example/sample-generator.js) for a more complete, runnable, well-explained demonstration: it begins multiple asynchronous generators and multiplexes them together into one async iterable.

There's a variety of hooks and modes available, for coercing values during iteration.

