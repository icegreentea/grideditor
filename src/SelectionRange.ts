class SelectionRange {
  readonly low: number;
  readonly high: number;

  constructor(a, b) {
    if (a > b) {
      this.high = a;
      this.low = b;
    } else {
      this.low = a;
      this.high = b;
    }
  }

  incrementHigh(clamp?: number, step = 1): SelectionRange {
    if (clamp != null && this.high + step > clamp) {
      return new SelectionRange(this.low, clamp);
    } else {
      return new SelectionRange(this.low, this.high + step);
    }
  }

  decrementHigh(clamp?: number, step = 1): SelectionRange {
    if (clamp != null && this.high - step < clamp) {
      return new SelectionRange(this.low, clamp);
    } else {
      return new SelectionRange(this.low, this.high - step);
    }
  }

  incrementLow(clamp?: number, step = 1): SelectionRange {
    if (clamp != null && this.low + step > clamp) {
      return new SelectionRange(clamp, this.high);
    } else {
      return new SelectionRange(this.low + step, this.high);
    }
  }

  decrementLow(clamp?: number, step = 1): SelectionRange {
    if (clamp != null && this.low - step < clamp) {
      return new SelectionRange(clamp, this.high);
    } else {
      return new SelectionRange(this.low - step, this.high);
    }
  }

  extendLow(clamp?, step?) {
    return this.decrementLow(clamp, step);
  }

  shrinkLow(clamp?, step?) {
    return this.incrementLow(clamp, step);
  }

  extendHigh(clamp?, step?) {
    return this.incrementHigh(clamp, step);
  }

  shrinkHigh(clamp?, step?) {
    return this.decrementHigh(clamp, step);
  }

  contains(x: number) {
    return x >= this.low && x <= this.high;
  }
}

export default SelectionRange;
