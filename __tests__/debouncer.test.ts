import { debounce, DebounceOptions } from "../index";

/**
 * Takes a number and adds it to the provided array. Useful for tracking
 * which function was called.
 * @param i number to add to the array when function is called
 * @param ary array for i to be added to when function is called
 */
const defaultTestFn = (i: number, ary: number[]) => {
  ary.push(i);
};

// Used to chain timeouts together
function getTimeoutPromise(timeout: number) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout)
  })
}

test("Disallow both leading and trailing to be set to false.", () => {
  expect(() => debounce(defaultTestFn, {intervalMillis: 1, leading: false, trailing: false})).toThrow();
});

/**
 *
 */
interface TestCall {
  /**
   * The ID of the call being made. This is used so that each call is
   * identifiable (go figure) when checking which calls have been
   * made by the debounced function.
   */
  id: number
  /**
   * How long to wait after the call to make the next call.
   */
  delay?: number
}

/**
 * The intermission is just the intervalCalls that are made before waiting
 * for a shorter amount of time than the interval actually expires.
 */
interface CallsBeforeIntervalExpiry {
  calls: TestCall[]
}

// Automates debouncer intervalCalls/tests for the expected output
interface DebounceTestOptions {
  expectLeading: boolean
  expectTrailing: boolean
  /**
   * The intervalCalls of each (inner) index are made before the interval expires.
   * This will be used to
   */
  intervalCalls: CallsBeforeIntervalExpiry[];
  withReset?: boolean
}

// checks that the interval calls are ascending to make tests less error prone and more understandable
function checkIdsAscending(intervalCalls: CallsBeforeIntervalExpiry[]) {
  let lastId = Number.MIN_SAFE_INTEGER;
  for (let i = 0; i < intervalCalls.length; i++) {
    const calls = intervalCalls[i];
    for (let j = 0; j < calls.calls.length; j++) {
      const nextId = calls.calls[j].id;
      if (lastId >= nextId) {
        throw new Error(`IDs of calls must be ascending. ${lastId} >= ${calls.calls[j].id}`);
      }
      lastId = nextId;
    }
  }
}

/**
 * Takes in
 * @param testOptions
 * @param debounceOptions
 */
function testDebounceOptions(testOptions: DebounceTestOptions, debounceOptions: DebounceOptions):
  Promise<{ actualCalls: number[], expectedCalls: number[] }> {
  checkIdsAscending(testOptions.intervalCalls);
  const actualCalls: number[] = [];
  const operation = debounce(defaultTestFn, debounceOptions);
  let promiseDelayChain: Promise<any> = Promise.resolve();
  const expectedCalls: number[] = [];
  for (let i = 0; i < testOptions.intervalCalls.length; i++) {

    // add the first and the last, because expecting leading and trailing edge calls
    // (will not happen on trailing if only 1 item is provided per interval)
    const callsForInterval = testOptions.intervalCalls[i];
    for (let j = 0; j < callsForInterval.calls.length; j++) {

      // needs to be if-else if to run first and last (last not run if length is 1)
      const call = callsForInterval.calls[j];
      const isLastInInterval = j === callsForInterval.calls.length - 1;
      if (testOptions.expectLeading && testOptions.expectTrailing) {
        if (j === 0) {
          expectedCalls.push(call.id);
        } else if (isLastInInterval) {
          expectedCalls.push(call.id);
        }
      } else if (testOptions.expectLeading) {
        if (j === 0) {
          expectedCalls.push(call.id);
        }
      } else {  // trailing edge
        if (isLastInInterval) {
          expectedCalls.push(call.id);
        }
      }
      /*
      * Initially this is run immediately and then the delay is introduced.
      * */
      promiseDelayChain = promiseDelayChain.then(() => {
        operation(call.id, actualCalls);
        if (isLastInInterval) {
          return getTimeoutPromise(debounceOptions.intervalMillis + 5);
        }
        return (call.delay && call.delay >= 0)
          ?
          getTimeoutPromise(call.delay)
          :
          getTimeoutPromise(0);
      });

    }
  }
  return promiseDelayChain.then(() => ({expectedCalls, actualCalls}));
}

test("Make sure ascending IDs are required.", () => {
  //  should be fine
  testDebounceOptions({
                        expectTrailing: true,
                        expectLeading: true,
                        intervalCalls: [
                          {
                            calls: [{id: 0, delay: 1}]
                          }
                        ]
                      },
                      {
                        intervalMillis: 10,
                      });
  // should throw error
  expect(() => {
    testDebounceOptions({
                          expectTrailing: true,
                          expectLeading: true,
                          intervalCalls: [
                            {
                              calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
                            },
                            // next interval
                            {
                              calls: [{id: 0, delay: 1}]
                            }
                          ]
                        },
                        {
                          intervalMillis: 10
                        });
  }).toThrow()
})

// simple test to make sure it is called at the beginning and not the end.
test("Test leading edge.", () => {
  const actualCalls: number[] = [];
  const operation = debounce(defaultTestFn, {intervalMillis: 10, leading: true, trailing: false});
  operation(1, actualCalls);
  operation(2, actualCalls);
  operation(3, actualCalls);
  return getTimeoutPromise(1).then(() => {
    operation(4, actualCalls);
    return getTimeoutPromise(15);
  }).then(() => {
    expect(actualCalls).toEqual([1]);
  })
});

// simple test to make sure it is called at the end and not the beginning.
test("Test trailing edge.", () => {
  const actualCalls: number[] = [];
  const operation = debounce(defaultTestFn, {intervalMillis: 10, leading: false, trailing: true});
  operation(1, actualCalls);
  operation(2, actualCalls);
  operation(3, actualCalls);
  return getTimeoutPromise(1).then(() => {
    operation(4, actualCalls);
    return getTimeoutPromise(15);
  }).then(() => {
    expect(actualCalls).toEqual([4]);
  });
})

/*
* There are 9 different combinations of leading-trailing options.
* |   Leading     |   Trailing    |   Result    |
* |   undefined   |   undefined   |   trailing  |
* |   undefined   |   false       |   leading   |
* |   undefined   |   true        |   trailing  |
* |   false       |   undefined   |   trailing  |
* |   false       |   false       | throw error |
* |   false       |   true        |   trailing  |
* |   true        |   undefined   |   leading   |
* |   true        |   false       |   leading   |
* |   true        |   true        | lead and trail |
* */
describe("Check option combinations without reset.", () => {

  /*
  *
  * ALL EQUALITY CHECKS HAVE BEEN DUPLICATED TO ENSURE SANITY. THIS ENSURES THE
  * TEST FUNCTION IS WORKING AS EXPECTED AS WELL.
  *
  * */

  test("Leading=undefined, trailing = undefined. Should only be run on trailing edge.", () => {
    return testDebounceOptions(
      {
        expectLeading: false,
        expectTrailing: true,
        intervalCalls: [
          {
            calls: [{id: 0, delay: 1}]
          }
        ]
      },
      {
        intervalMillis: 10
      }
    ).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0]);
      return testDebounceOptions(
        {
          expectLeading: false,
          expectTrailing: true,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
            },
            {
              calls: [{id: 2, delay: 1}]
            }
          ]
        },
        {
          intervalMillis: 10
        }
      )
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([1, 2]);
      return testDebounceOptions(
        {
          expectLeading: false,
          expectTrailing: true,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
            },
            {
              calls: [{id: 2, delay: 1}, {id: 3, delay: 1}]
            }
          ]
        },
        {
          intervalMillis: 10
        }
      )
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([1, 3]);
    })
  });

  test("Leading=undefined, trailing=false. Should be on leading.", () => {
    return testDebounceOptions(
      {
        expectLeading: true,
        expectTrailing: false,
        intervalCalls: [
          {
            calls: [{id: 0, delay: 1}]
          }
        ]
      },
      {
        intervalMillis: 10,
        trailing: false
      }
    ).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0]);
      return testDebounceOptions(
        {
          expectLeading: true,
          expectTrailing: false,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
            },
            {
              calls: [{id: 2, delay: 1}]
            }
          ]
        },
        {
          intervalMillis: 10,
          trailing: false
        }
      )
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0, 2]);
      return testDebounceOptions(
        {
          expectLeading: true,
          expectTrailing: false,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
            },
            {
              calls: [{id: 2, delay: 1}, {id: 3, delay: 1}]
            }
          ]
        },
        {
          intervalMillis: 10,
          trailing: false
        }
      )
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0, 2]);
    });
  });

  test("Leading=undefined, trailing=true. Should be on trailing.", () => {
    return testDebounceOptions(
      {
        expectLeading: false,
        expectTrailing: true,
        intervalCalls: [
          {
            calls: [{id: 0, delay: 1}]
          }
        ]
      },
      {
        intervalMillis: 10,
        trailing: true
      }
    ).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0]);
      return testDebounceOptions(
        {
          expectLeading: false,
          expectTrailing: true,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
            },
            {
              calls: [{id: 2, delay: 1}]
            }
          ]
        },
        {
          intervalMillis: 10,
          trailing: true
        }
      )
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([1, 2]);
      return testDebounceOptions(
        {
          expectLeading: false,
          expectTrailing: true,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
            },
            {
              calls: [{id: 2, delay: 1}, {id: 3, delay: 1}]
            }
          ]
        },
        {
          intervalMillis: 10,
          trailing: true
        }
      )
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([1, 3]);
    })
  });

  test("Leading=false, trailing=undefined. Should be run on trailing.", () => {
    return testDebounceOptions(
      {
        expectLeading: false,
        expectTrailing: true,
        intervalCalls: [
          {
            calls: [{id: 0, delay: 1}]
          }
        ]
      },
      {
        intervalMillis: 10,
        leading: false
      }
    ).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0]);
      return testDebounceOptions(
        {
          expectLeading: false,
          expectTrailing: true,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
            },
            {
              calls: [{id: 2, delay: 1}]
            }
          ]
        },
        {
          intervalMillis: 10,
          leading: false
        }
      )
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([1, 2]);
      return testDebounceOptions(
        {
          expectLeading: false,
          expectTrailing: true,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
            },
            {
              calls: [{id: 2, delay: 1}, {id: 3, delay: 1}]
            }
          ]
        },
        {
          intervalMillis: 10,
          leading: false
        }
      )
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([1, 3]);
    });
  });

  test("Leading=false, trailing=false. Should throw error.", () => {
    expect(() => {
      debounce(() => {
      }, {intervalMillis: 5, leading: false, trailing: false})
    }).toThrow();
  });

  test("Leading=false, trailing=true. Should run on trailing.", () => {
    return testDebounceOptions(
      {
        expectLeading: false,
        expectTrailing: true,
        intervalCalls: [
          {
            calls: [{id: 0, delay: 1}]
          }
        ]
      },
      {
        intervalMillis: 10,
        leading: false,
        trailing: true
      }
    ).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0]);
      return testDebounceOptions(
        {
          expectLeading: false,
          expectTrailing: true,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
            },
            {
              calls: [{id: 2, delay: 1}]
            }
          ]
        },
        {
          intervalMillis: 10,
          leading: false,
          trailing: true
        }
      )
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([1, 2]);
      return testDebounceOptions(
        {
          expectLeading: false,
          expectTrailing: true,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
            },
            {
              calls: [{id: 2, delay: 1}, {id: 3, delay: 1}]
            }
          ]
        },
        {
          intervalMillis: 10,
          leading: false,
          trailing: true
        }
      )
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([1, 3]);
    });
  });

  test("Leading=true, trailing=undefined. Should be on leading.", () => {
    return testDebounceOptions(
      {
        expectTrailing: false,
        expectLeading: true,
        intervalCalls: [
          {
            calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
          },
          {
            calls: [{id: 2, delay: 1}, {id: 3, delay: 1}]
          }
        ]
      },
      {
        intervalMillis: 10,
        leading: true
      }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0, 2]);
    });
  });

  test("Leading=true, trailing=false. Should be on leading.", () => {
    return testDebounceOptions(
      {
        expectTrailing: false,
        expectLeading: true,
        intervalCalls: [
          {
            calls: [{id: 0, delay: 1}, {id: 1, delay: 1}]
          },
          {
            calls: [{id: 2, delay: 1}, {id: 3, delay: 1}]
          }
        ]
      },
      {
        intervalMillis: 10,
        leading: true,
        trailing: false
      }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0, 2]);
    });
  });

  test("Leading=true and trailing=true. Should fire on both leading and trailing per interval.", () => {
    return testDebounceOptions(
      {
        expectLeading: true,
        expectTrailing: true,
        intervalCalls: [
          {
            calls: [{id: 0, delay: 1}, {id: 1, delay: 1}, {id: 2, delay: 1}]
          },
          {
            calls: [{id: 3, delay: 15}]
          }
        ]
      }, {
        intervalMillis: 15,
        trailing: true,
        leading: true
      }
    ).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0, 2, 3]);
      return testDebounceOptions(
        {
          expectLeading: true,
          expectTrailing: true,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}]
            },
            {
              calls: [{id: 3, delay: 1}, {id: 4, delay: 1}]
            }
          ]
        }, {
          intervalMillis: 15,
          trailing: true,
          leading: true
        }
      );
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0, 3, 4]);
      return testDebounceOptions(
        {
          expectLeading: true,
          expectTrailing: true,
          intervalCalls: [
            {
              calls: [{id: 0, delay: 1}]
            },
            {
              calls: [{id: 4, delay: 1}]
            }
          ]
        }, {
          intervalMillis: 15,
          trailing: true,
          leading: true
        }
      )
    }).then(resp => {
      const {expectedCalls, actualCalls} = resp;
      expect(actualCalls).toEqual(expectedCalls);
      expect(actualCalls).toEqual([0, 4]);
    })
  });

});

/**
 * As can be seen by the tests with the different options above,
 * there are really only 3 cases:
 * 1. leading edge only
 * 2. trailing edge only
 * 3. both
 */
describe("Test without reset", () => {

  // when reset is not true, make sure that the reset interval is not being pushed.
  test("Check not resetting on leading.", () => {
    const actualCalls: number[] = [];
    const operation = debounce(defaultTestFn, {intervalMillis: 20, leading: true, resetTimeout: false})
    operation(0, actualCalls);
    operation(1, actualCalls);
    operation(2, actualCalls);
    return getTimeoutPromise(5).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(3, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(4, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(5, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(6, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([0, 6]);
    });
  });

  test("Check not resetting on trailing.", () => {
    const actualCalls: number[] = [];
    const operation = debounce(defaultTestFn, {intervalMillis: 20, trailing: true, resetTimeout: false})
    operation(0, actualCalls);
    operation(1, actualCalls);
    operation(2, actualCalls);
    return getTimeoutPromise(5).then(() => {
      expect(actualCalls).toEqual([]);
      operation(3, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([]);
      operation(4, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([]);
      operation(5, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([5]);
      operation(6, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([5]);
      operation(7, actualCalls)
      return getTimeoutPromise(25);
    }).then(() => {
      expect(actualCalls).toEqual([5, 7]);
    })
  });

  test("Reset leading edge.", () => {
    const actualCalls: number[] = [];
    const operation = debounce(defaultTestFn, {intervalMillis: 20, leading: true, resetTimeout: true})
    operation(0, actualCalls);
    operation(1, actualCalls);
    operation(2, actualCalls);
    return getTimeoutPromise(5).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(3, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(4, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(5, actualCalls);
      return getTimeoutPromise(5);  // without reset, would reset here.
    }).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(6, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([0]);
      return getTimeoutPromise(25);
    }).then(() => {
      expect(actualCalls).toEqual([0]);
    });
  });

  test("Reset trailing edge.", () => {
    const actualCalls: number[] = [];
    const operation = debounce(defaultTestFn, {intervalMillis: 20, trailing: true, resetTimeout: true})
    operation(0, actualCalls);
    operation(1, actualCalls);
    operation(2, actualCalls);
    return getTimeoutPromise(5).then(() => {
      expect(actualCalls).toEqual([]);
      operation(3, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([]);
      operation(4, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([]);
      operation(5, actualCalls);
      return getTimeoutPromise(5);  // without reset, would reset here.
    }).then(() => {
      expect(actualCalls).toEqual([]);
      operation(6, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([]);
      operation(7, actualCalls);
      return getTimeoutPromise(25);
    }).then(() => {
      expect(actualCalls).toEqual([7]);
      operation(8, actualCalls);
      return getTimeoutPromise(25);
    }).then(() => {
      expect(actualCalls).toEqual([7, 8]);
    });
  });

  test("Reset leading and trailing.", () => {
    const actualCalls: number[] = [];
    const operation = debounce(defaultTestFn,
                               {
                                 intervalMillis: 20,
                                 trailing: true,
                                 leading: true,
                                 resetTimeout: true
                               })
    operation(0, actualCalls);
    operation(1, actualCalls);
    operation(2, actualCalls);
    return getTimeoutPromise(5).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(3, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(4, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(5, actualCalls);
      return getTimeoutPromise(5);  // without reset, would reset here.
    }).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(6, actualCalls);
      return getTimeoutPromise(5);
    }).then(() => {
      expect(actualCalls).toEqual([0]);
      operation(7, actualCalls);
      return getTimeoutPromise(25);
    }).then(() => {
      expect(actualCalls).toEqual([0, 7]);
      operation(8, actualCalls);
      operation(9, actualCalls);
      operation(10, actualCalls);
      return getTimeoutPromise(25);
    }).then(() => {
      expect(actualCalls).toEqual([0, 7, 8, 10]);
    });
  })

});
