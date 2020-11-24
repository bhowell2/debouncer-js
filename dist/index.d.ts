export interface DebounceOptions {
    /**
     * How long to wait in milliseconds before allowing the function
     * to be called again. If {@link resetTimeout} is `true`, then
     * this is the interval that will be reset every time the function
     * is called, until it has elapsed without being called.
     */
    intervalMillis: number;
    /**
     * Whether or not to allow the operation to run on the trailing
     * edge of the debounce interval.
     *
     * This is the default operation when `trailing` or `leading` are
     * not specified.
     *
     * States:
     * Leading    |   Trailing    | Result
     * undefined  |   undefined   | trailing
     * undefined  |   false       | leading
     * undefined  |   true        | trailing
     * false      |   undefined   | trailing
     * false      |   false       | throws error
     * false      |   true        | trailing
     * true       |   undefined   | leading
     * true       |   false       | leading
     * true       |   true        | leading and trailing
     */
    trailing?: boolean;
    /**
     * Whether or not to allow the operation to run on the leading
     * edge of the debounce interval.
     *
     * This is only run if leading is set to true, or trailing is set
     * to false.
     *
     * States:
     * Leading    |   Trailing    | Result
     * undefined  |   undefined   | trailing
     * undefined  |   false       | leading
     * undefined  |   true        | trailing
     * false      |   undefined   | trailing
     * false      |   false       | throws error
     * false      |   true        | trailing
     * true       |   undefined   | leading
     * true       |   false       | leading
     * true       |   true        | leading and trailing
     */
    leading?: boolean;
    /**
     * Resets the interval every time the function is called until it
     * has not been called before the interval has elapsed.
     *
     * This is useful when it is desired to only call the function when
     * the operation completes.
     *
     * Note: if the debounced function is called continually before the
     * interval expires the function would never be called.
     */
    resetTimeout?: boolean;
}
/**
 * Wraps the provided function, providing a function that is debounced.
 * @param operation the function that should be debounced
 * @param options
 */
export declare function debounce<F extends (this: any, ...args: any[]) => any>(operation: F, options: DebounceOptions): F;
