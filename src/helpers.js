class Helpers {
  async sleep(time) {
    return new Promise(resolve => {
      setTimeout(resolve, time);
    });
  }

  async retry(fnc, options) {
    let { maxTries, timeout, validateFnc, initialTimeout } = Object.assign({ maxTries: 3, timeout: 10000, initialTimeout:0, validateFnc: null, failFnc: null }, options || {});

    if (maxTries <= 0) {
      if (typeof options.failFnc === 'function') {
        options.failFnc();
      }
      return null;
    }

    if (typeof initialTimeout === 'number' && initialTimeout > 0) {
      await this.sleep(initialTimeout);
    }

    try {
      maxTries--;
      const result = await fnc(maxTries);
      let validationResult = typeof validateFnc === 'function' ? validateFnc(result, maxTries) : true;

      if (validationResult instanceof Promise) {
        validationResult = await validationResult;
      }

      if (validationResult) {
        return typeof validationResult !== 'boolean' ? validationResult : result;
      } else {
        await this.sleep(timeout);
        return this.retry(fnc, { maxTries, timeout, validateFnc });
      }
    } catch (err) {
      console.log([ 'api', 'retry' ], err);
      await this.sleep(timeout);
      return this.retry(fnc, { maxTries, timeout, validateFnc });
    }
  }
};

module.exports = new Helpers();
