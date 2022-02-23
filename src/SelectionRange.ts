class SelectionRange {
  readonly low: number;
  readonly high: number;
  readonly start: number;
  readonly end: number;

  get isNoop() {
    return this.start == null && this.end == null;
  }

  static Noop(): SelectionRange {
    return new SelectionRange(null, null);
  }

  constructor(start?: number, end?: number) {
    if (start > end) {
      this.high = start;
      this.low = end;
    } else {
      this.low = start;
      this.high = end;
    }
    this.start = start;
    this.end = end;
    if ((start == null && end != null) || (start != null && end == null)) {
      throw new Error();
    }
  }

  getForwardDelta(new_range: SelectionRange): [SelectionRange, "add" | "remove" | "noop"] {
    if (this.start == new_range.start) {
      if (this.end == new_range.end) {
        return [null, "noop"];
      }
      if (this.end == this.start) {
        // start with single wide selection
        if (new_range.end > this.end) {
          // extension
          return [new SelectionRange(this.end + 1, new_range.end), "add"];
        } else {
          // shrink
          return [new SelectionRange(this.end - 1, new_range.end), "remove"];
        }
      } else if (this.end > this.start) {
        // positive selection
        if (new_range.end > this.end) {
          // extension
          return [new SelectionRange(this.end + 1, new_range.end), "add"];
        } else {
          // shrink
          return [new SelectionRange(this.end, new_range.end), "remove"];
        }
      } else if (this.end < this.start) {
        // negative selection
        if (new_range.end < this.end) {
          // extennsion
          return [new SelectionRange(this.end - 1, new_range.end), "add"];
        } else {
          // shrink
          return [new SelectionRange(this.end, new_range.end), "remove"];
        }
      }
    } else {
      throw new Error();
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
