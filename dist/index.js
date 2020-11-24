"use strict";
/*
* Multi-feature debouncer. Allows for debouncing on the leading,
* trailing, or leading and trailing edge of the debounce interval.
* The debouncer is also able to reset the interval such that the
* operation will NOT be run until no events have fired until the
* interval has elapsed (indefinitely debouncing the function).
* */
Object.defineProperty(exports, "__esModule", { value: true });
exports.debounce = void 0;
/**
 * Wraps the provided function, providing a function that is debounced.
 * @param operation the function that should be debounced
 * @param options
 */
function debounce(operation, options) {
    var timeout, callOp;
    var intervalMillis = options.intervalMillis, _a = options.resetTimeout, resetTimeout = _a === void 0 ? false : _a;
    var leading, trailing;
    /*
    * This is a bit verbose, but allows for a bit better default options/assumptions
    * to be made about how the function will be debounced. This could be removed in
    * the future to force the user to specify on what edge the function is to be
    * debounced.
    * */
    if (options.leading === undefined) {
        if (options.trailing === undefined) {
            leading = false;
            trailing = true;
        }
        else if (options.trailing) {
            leading = false;
            trailing = true;
        }
        else {
            // trailing set to FALSE, therefore leading must be TRUE
            leading = true;
            trailing = false;
        }
    }
    else if (options.leading) {
        if (options.trailing === undefined) {
            leading = true;
            trailing = false;
        }
        else if (options.trailing) {
            leading = true;
            trailing = true;
        }
        else {
            // trailing set to FALSE, therefore leading must be TRUE
            leading = true;
            trailing = false;
        }
    }
    else { // options.leading === false
        if (options.trailing === undefined) { // default to leading false, trailing true.
            leading = false;
            trailing = true;
        }
        else if (options.trailing) { //
            leading = false;
            trailing = true;
        }
        else {
            throw new Error("Leading and trailing options cannot both be false for the debouncer.");
        }
    }
    /*
    * Wraps the function, copying the context and arguments for every call to the
    * returned function and making them when appropriate based on the options provided.
    * */
    return function () {
        var context = this;
        var args = arguments; // arguments to call the operation with.
        callOp = function () {
            operation.apply(context, args);
        };
        /*
        * In the case that the function should be called on the leading edge and it has
        * not already been called within the timeout, then call it. This will only call
        * the function on the leading edge of the interval, even with reset, as the
        * timeout will be reset below every time.
        * */
        if (leading && !timeout) { // if no timeout has been set, call it (it's first call for interval)
            callOp();
            callOp = undefined;
        }
        /*
        * Resetting the timeout causes the event to be pushed to later. This is
        * useful when the user only wants the operation to finally be called when
        * it has not been triggered WITHIN the debounce interval.
        * */
        if (resetTimeout && timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        /*
        * The timeout will be set whenever it is undefined, so it will work on the first call or
        * the Nth call with resetting (as it is cleared and set to undefined just above this).
        * */
        if (!timeout) {
            timeout = setTimeout(function () {
                if (callOp && trailing) {
                    callOp();
                }
                timeout = undefined;
                callOp = undefined;
            }, intervalMillis);
        }
    };
}
exports.debounce = debounce;
