# Multi-feature Debouncer (npm package name)
Javascript debouncer that allows for debouncing on the leading, trailing, and leading and trailing edges and also allows 
for resetting the debounce interval. Resetting the interval allows for indefinitely postponing an operation until no 
calls have been made to the debounced function within the interval (e.g., the interval is 200ms and a call comes in at 
80ms and another 80ms after that, resulting in the function not being called for 360ms (80ms + 80ms + 200ms)).

## Example usage
`npm install multifeature-debouncer`
```javascript
import {debounce} from "multifeature-debouncer";
// or
const debounce = require('multifeature-debouncer').debounce

function onScroll() { 
  // do some expensive operation on scrolling
}

const debouncedOnScroll = debounce(onScroll, {intervalMillis: 50});
// will be called on the trailing edge every 50ms
window.registerEventHandler('scroll', debouncedOnScroll);
```

## Options
| name | required | data type | description |
| ---- | -------- | --------- | ----------- |
| intervalMillis | true | number | how long to wait before calling the function (is the interval that is reset) |
| leading | false | boolean | whether or not to call the function on the leading edge of the debounce interval. **defaults to false**. |
| trailing | false | boolean | whether or not to call the function on the trailing edge of the debounce interval. **defaults to true**\*. |
| resetTimeout | false | boolean | whether or not to reset the interval when an event occurs before the interval has expired. |

*\* Though `trailing` defaults to true if `leading` is specified and `trailing` is not then it will be considered false. See matrix below.*

A matrix is the easiest way to ingest the leading-trailing edge options:

| Leading    |   Trailing    | Edge used |
| :---------- | :------------- | :-------: |
| undefined  |   undefined   | trailing
| undefined  |   false       | leading
| undefined  |   true        | trailing
| false      |   undefined   | trailing
| false      |   false       | throws error
| false      |   true        | trailing
| true       |   undefined   | leading
| true       |   false       | leading
| true       |   true        | leading and trailing

### Reset example
```javascript
// on scroll will NOT be called until the user has stopped scrolling for half a second (500ms)
debounce(onScroll, {intervalMillis: 500, resetTimeout: true})
/*
Alternatively, onScroll could be called on the leading edge when the user scrolls and not again 
until the user stops scrolling for 500ms and then resumes again.
*/
debounce(onScroll, {intervalMillis: 500, resetTimeout: true, leading: true})

// MORE CONCRETE EXAMPLE:
function delay(time) {
  return new Promise(resolve => {
    setTimeout(() => {

    }, time)
  })
}

function logI(i) {
  console.log(i);
}

const debouncedI = debounce(logI, {intervalMillis: 100, resetTimeout: true})

debouncedI(0)  // not logged
delay(50).then(() => {
  debouncedI(1)  // not logged, because next delay is not 100ms
  return delay(50);
}).then(() => {
  debouncedI(2) // not logged, because next delay is not 100ms
  return delay(50);
}).then(() => {
  // still nothing has been logged, even though 150ms have elapsed. 
  debouncedI(3) // logged, because debouncedI is not called again for 100ms
  // be careful with relying on debouncing right at the edge of the interval timeout..
  return delay(100);  
}).then(() => {
  debouncedI(4);
  return delay(100);
})
// only '3' and '4' area logged from the above chain
```

### Leading/Immediate
```javascript
// called immediately when the user scrolls and not again for 500ms.
debounce(onScroll, {intervalMillis: 500, leading: true});
```