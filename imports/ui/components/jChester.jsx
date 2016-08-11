/*
 *  jChester-react - v1.0.0
 *  A time entry component for speedcubing solves.
 *  https://github.com/jfly/jChester
 *
 *  Original Jquery component made by Jeremy Fleischman
 *  Rewritten in React by Caleb Hoover
 *  Under GPL-3.0 License
 */
import React from 'react';

var MILLIS_PER_SECOND = 1000;
var MILLIS_PER_MINUTE = 60 * MILLIS_PER_SECOND;
var MILLIS_PER_HOUR = 60 * MILLIS_PER_MINUTE;

global.jChester = {
  stopwatchFormatToSolveTime: function(stopwatchFormat, isMoveCount) {
    if(stopwatchFormat.length === 0) {
      return null;
    }
    if(stopwatchFormat.toUpperCase() === 'DNF') {
      return {
        puzzlesSolvedCount: 0,
        puzzlesAttemptedCount: 1,
      };
    }
    if(stopwatchFormat.toUpperCase() === 'DNS') {
      return {
        puzzlesSolvedCount: 0,
        puzzlesAttemptedCount: 0,
      };
    }

    if(isMoveCount) {
      if(!jChester._isInt(stopwatchFormat)) {
        throw "Invalid move count.";
      }
      var moveCount = parseInt(stopwatchFormat);
      if(moveCount <= 0) {
        throw "Move count must be greater than zero.";
      }
      return {
        moveCount: moveCount,
      };
    }

    var m = stopwatchFormat.match(/^(?:(\d*):)??(?:(\d*):)?(\d+)?(?:[.,](\d*))?$/);
    if(!m) {
      throw "Invalid stopwatch format.";
    }

    var hours = parseInt(m[1] || "0");
    var minutes = parseInt(m[2] || "0");
    var seconds = parseInt(m[3] || "0");
    var decimalStr = m[4] || "";
    var decimal = parseInt(decimalStr || "0");
    var denominator = Math.pow(10, decimalStr.length - 3); /* subtract 3 to get millis instead of seconds */
    var decimalValueInMillis = !decimal ? 0 : Math.round(decimal / denominator);

    var millis = hours * MILLIS_PER_HOUR + minutes * MILLIS_PER_MINUTE + seconds * MILLIS_PER_SECOND + decimalValueInMillis;
    if(millis <= 0) {
      throw "Time must be greater than zero.";
    }
    var decimals = Math.min(3, decimalStr.length); /* max allowed decimals is 3 */
    return {
      millis: millis,
      decimals: decimals,
    };
  },
  solveTimeIsDNF: function(solveTime) {
    if(typeof solveTime.puzzlesSolvedCount !== 'undefined' && typeof solveTime.puzzlesAttemptedCount !== 'undefined') {
      if(solveTime.puzzlesAttemptedCount === 1) {
        // This is *not* a multi attempt.
        if(solveTime.puzzlesSolvedCount === 0) {
          return true;
        }
      } else if(solveTime.puzzlesAttemptedCount > 1) {
        // By https://www.worldcubeassociation.org/regulations/#H1a,
        // multibld results must have at least 2 puzzles attempted.
        /* From https://www.worldcubeassociation.org/regulations/#9f12c
        9f12c) For Multiple Blindfolded Solving, rankings are
        assessed based on number of puzzles solved minus the number
        of puzzles not solved, where a greater difference is better.
        If the difference is less than 0, or if only 1 puzzle is
        solved, the attempt is considered unsolved (DNF). If
        competitors achieve the same result, rankings are assessed
        based on total time, where the shorter recorded time is
        better. If competitors achieve the same result and the same
        time, rankings are assessed based on the number of puzzles
        the competitors failed to solve, where fewer unsolved
        puzzles is better.
        */
        var puzzleUnsolved = solveTime.puzzlesAttemptedCount - solveTime.puzzlesSolvedCount;
        var solvedMinusUnsolved = solveTime.puzzlesSolvedCount - puzzleUnsolved;
        if(solvedMinusUnsolved < 0 || solveTime.puzzlesSolvedCount === 1) {
          return true;
        }
      }
    }
    return false;
  },
  solveTimeIsDNS: function(solveTime) {
    if(typeof solveTime.puzzlesAttemptedCount !== 'undefined') {
      if(solveTime.puzzlesAttemptedCount === 0) {
        return true;
      }
    }
    return false;
  },
  solveTimeIsDN: function(solveTime) {
    return jChester.solveTimeIsDNF(solveTime) || jChester.solveTimeIsDNS(solveTime);
  },
  solveTimeToStopwatchFormat: function(solveTime, ignoreDn) {
    if(!solveTime) {
      return "";
    }
    if(!ignoreDn) {
      if(jChester.solveTimeIsDNF(solveTime)) {
        return "DNF";
      } else if(jChester.solveTimeIsDNS(solveTime)) {
        return "DNS";
      }
    }

    if(solveTime.moveCount) {
      // jChester's solveTimeToStopwatchFormat doesn't handle FMC, which is fine,
      // FMC is *weird*.
      return solveTime.moveCount.toFixed(solveTime.decimals || 0);
    }

    var millis = solveTime.millis;

    var hoursField = Math.floor(millis / MILLIS_PER_HOUR);
    millis %= MILLIS_PER_HOUR;

    var minutesField = Math.floor(millis / MILLIS_PER_MINUTE);
    millis %= MILLIS_PER_MINUTE;

    var secondsField = Math.floor(millis / MILLIS_PER_SECOND);
    millis %= MILLIS_PER_SECOND;

    function pad(toPad, padVal, minLength) {
      var padded = toPad + "";
      while(padded.length < minLength) {
        padded = padVal + padded;
      }
      return padded;
    }

    var stopwatchFormat = "";
    if(stopwatchFormat.length > 0) {
      stopwatchFormat += ":" + pad(hoursField, "0", 2);
    } else if(hoursField) {
      stopwatchFormat += hoursField;
    }
    if(stopwatchFormat.length > 0) {
      stopwatchFormat += ":" + pad(minutesField, "0", 2);
    } else if(minutesField) {
      stopwatchFormat += minutesField;
    }
    if(stopwatchFormat.length > 0) {
      stopwatchFormat += ":" + pad(secondsField, "0", 2);
    } else {
      stopwatchFormat += secondsField;
    }
    var decimals = solveTime.decimals;
    if(decimals > 0) {
      // It doesn't make sense to format to more decimal places than the
      // accuracy we have.
      decimals = Math.min(3, decimals);
      var millisStr = pad(millis, "0", 3);
      stopwatchFormat += ".";
      for(var i = 0; i < decimals; i++) {
        stopwatchFormat += millisStr.charAt(i);
      }
    }
    return stopwatchFormat;
  },
  _isInt: function(n) {
    if(typeof n === 'number') {
      return true;
    }
    if(n === undefined || n === null) {
      return false;
    }
    if(n.length === 0) {
      return false;
    }
    return (+n % 1) === 0;
  },
};

const BaseTime = {
  millis: 0,
  decimals: 2,
  moveCount: 0,
  puzzlesSolvedCount: 0,
  puzzlesAttemptedCount: 0,
};

export default React.createClass({
  editableSolveTimeFieldOptions: [ 'millis', 'moveCount', 'puzzlesSolvedCount', 'puzzlesAttemptedCount' ],

  INPUT_WIDTH_PIXELS: 90,
  INTEGER_INPUT_WIDTH_PIXELS: 70, // Enough for 3 digits, which is *plenty*
  MAX_TIME_CHARACTERS: "1:00:00.00".length,

  solveTime: {},

  getDefaultProps() {
    return {
      millis: true,
      editableSolveTimeFields: {
        millis: true,
        moveCount: false,
        puzzlesSolvedCount: false,
        puzzlesAttemptedCount: false
      }
    };
  },

  getInitialState() {
    return {
      solveTime: {
        millis: '',
        decimals: 2,
        moveCount: '',
        puzzlesSolvedCount: '',
        puzzlesAttemptedCount: '',
      },
      errorByField: {
        millis: null,
        moveCount: null,
        puzzlesSolvedCount: null,
        puzzlesAttemptedCount: null,
      },
      hideField: {
        millis: false,
        moveCount: false,
        puzzlesSolvedCount: false,
        puzzlesAttemptedCount: false,
      },
      millisMask: '',
    };
  },

  componentWillReceiveProps(props) {
    if(this.props.solveTime.millis !== props.solveTime.millis) {
      this.setSolveTime(Object.assign({}, this.getInitialState().solveTime, props.solveTime));
    }
  },

  componentWillMount() {
    this.setSolveTime(Object.assign({}, this.getInitialState().solveTime, this.props.solveTime));
  },

  getSolveTime() {
    return Object.assign({}, BaseTime, this.solveTime);
  },

  setSolveTime(solveTime) {
    if(solveTime === null) {
      // If solveTime is explicitly set to null, clear
      // the current input and validation state.
      this.setState(this.getInitialState());
      this.solveTime = {};
    } else if(solveTime) {
      this.solveTime = solveTime;

      let dnStr = '';
      if(jChester.solveTimeIsDNF(solveTime)) {
        dnStr = 'DNF';
      } else if(jChester.solveTimeIsDNS(solveTime)) {
        dnStr = 'DNS';
      }

      this.state.solveTime.millis =
        solveTime.millis ? jChester.solveTimeToStopwatchFormat(solveTime, true) : dnStr;

      this.state.moveCount =
        solveTime.moveCount ? solveTime.moveCount : dnStr;

      this.state.solveTime.puzzlesSolvedCount = solveTime.puzzlesSolvedCount;
      this.state.solveTime.puzzlesAttemptedCount = solveTime.puzzlesAttemptedCount;

      this.forceUpdate();
    }
  },

  inputChanged(e, value) {
    let errorByField = {};
    let solveTime = null;

    if(this.props.editableSolveTimeFields.millis) {
      let millisStr = e.type === 'keydown' ? this.state.solveTime.millis : this.refs.millis.value;
      // Remove any spaces generated by "lazy" inputting
      millisStr = millisStr.replace(/ /g, "");
      // If the user inputed only digits, treat this as a "lazy" input.
      if(millisStr.match(/^\d+$/)) {
        // Only allow up to 1 digit for hours, 2 digits for minutes,
        // 2 digits for seconds, and 2 digits for decimal places.
        // The WCA doesn't allow times over an hour, and supporting
        // more digits would overflow the space allocated for our inputs,
        // which would require keeping $inputMillis and $inputMillisMask
        // horizontally scroll-locked, which seems really hard/annoying.
        let maxLength = 1 + 2 + 2 + 2;
        if(millisStr.length > maxLength) {
          millisStr = millisStr.substring(0, maxLength);
        }
        let len = millisStr.length;
        let decimalsStr = millisStr.substring(len - 2, len);
        let secondsStr = millisStr.substring(len - 4, len - 2);
        let minutesStr = millisStr.substring(len - 6, len - 4);
        let hoursStr = millisStr.substring(0, len - 6);

        let newClockFormat = "";
        let mask = "";
        let append = function(str, padding) {
          for(let i = 0; i < padding - str.length; i++) {
            newClockFormat += " ";
            mask += "0";
          }
          newClockFormat += str;
          mask += str;
        };
        if(hoursStr.length > 0) {
          append(hoursStr, 1);
          append(":", 0);
        }
        if(minutesStr.length > 0) {
          append(minutesStr, mask.length > 0 ? 2 : 1);
          append(":", 0);
        }
        append(secondsStr, mask.length > 0 ? 2 : 1);
        append(".", 0);
        append(decimalsStr, 2);
        // Make space for the colon and period. Note that we don't
        // actually make them part of the input, we just leave space
        // for them to be shown in the $inputMillisMask.
        this.state.solveTime.millis = newClockFormat.replace(/[.:]/g, " ");
        this.state.millisMask = mask;
        millisStr = newClockFormat.replace(/ /g, "0");
      } else {
        this.state.solveTime.millis = millisStr;
        this.state.millisMask = '';
        if(millisStr.length === 0) {
          errorByField.millis = "Please enter a time.";
        }
      }

      try {
        solveTime = jChester.stopwatchFormatToSolveTime(millisStr);
      } catch(e) {
        errorByField.millis = e;
      }
    }

    if(this.props.editableSolveTimeFields.moveCount) {
      let moveCountStr = e.type === 'keydown' ? this.state.solveTime.moveCount : this.refs.moveCount.value;
      this.state.solveTime.moveCount = moveCountStr;
      try {
        if(solveTime) {
          Object.assign(solveTime, jChester.stopwatchFormatToSolveTime(moveCountStr, true));
        } else {
          solveTime = jChester.stopwatchFormatToSolveTime(moveCountStr, true);
        }

        if(moveCountStr.length === 0) {
          errorByField.moveCount = "Please enter a number of moves.";
        }
      } catch(e) {
        errorByField.moveCount = e;
      }
    }

    var puzzlesSolvedCountStr;
    var puzzlesAttemptedCountStr;
    if(!solveTime) {
      puzzlesSolvedCountStr = null;
      puzzlesAttemptedCountStr = null;
      this.state.hideField.puzzlesSolvedCount = true;
      this.state.hideField.puzzlesAttemptedCount = true;
    } else if(jChester.solveTimeIsDNF(solveTime)) {
      puzzlesSolvedCountStr = "0";
      puzzlesAttemptedCountStr = "1";
      this.state.hideField.puzzlesSolvedCount = true;
      this.state.hideField.puzzlesAttemptedCount = true;
    } else if(jChester.solveTimeIsDNS(solveTime)) {
      puzzlesSolvedCountStr = "0";
      puzzlesAttemptedCountStr = "0";
      this.state.hideField.puzzlesSolvedCount = true;
      this.state.hideField.puzzlesAttemptedCount = true;
    } else if(this.props.editableSolveTimeFields.puzzlesSolvedCount || this.props.editableSolveTimeFields.puzzlesAttemptedCount) {
      puzzlesSolvedCountStr = this.refs.puzzlesSolvedCount ? this.refs.puzzlesSolvedCount.value : this.state.puzzlesSolvedCount;
      puzzlesAttemptedCountStr = this.refs.puzzlesAttemptedCount ? this.refs.puzzlesAttemptedCount.value : this.state.puzzlesAttemptedCount;
      this.state.hideField.puzzlesSolvedCount = false;
      this.state.hideField.puzzlesAttemptedCount = false;
    } else {
      puzzlesSolvedCountStr = "1";
      puzzlesAttemptedCountStr = "1";
    }

    if(solveTime) {
      if(jChester._isInt(puzzlesSolvedCountStr)) {
        let puzzlesSolvedCount = parseInt(puzzlesSolvedCountStr);
        solveTime.puzzlesSolvedCount = puzzlesSolvedCount;
      } else {
        errorByField.puzzlesSolvedCount = 'Invalid number of puzzles solved.';
      }

      if(jChester._isInt(puzzlesAttemptedCountStr)) {
        let puzzlesAttemptedCount = parseInt(puzzlesAttemptedCountStr);
        solveTime.puzzlesAttemptedCount = puzzlesAttemptedCount;
        if(!errorByField.puzzlesSolvedCount && solveTime.puzzlesSolvedCount > solveTime.puzzlesAttemptedCount) {
          errorByField.puzzlesAttemptedCount = 'Cannot have more puzzles solved than attemped.';
        }
      } else {
        errorByField.puzzlesAttemptedCount = 'Invalid number of puzzles attempted.';
      }
    }

    let getErrorForField = (field) => errorByField[field];
    this.state.validationErrors = this.editableSolveTimeFieldOptions.filter(getErrorForField).map(getErrorForField);
    if(this.state.validationErrors.length > 0) {
      solveTime = null;
    }

    this.solveTime = solveTime;

    // TODO - it would be nice if the errors lined up with the appropriate
    // inputs somehow. Perhaps we could have tooltips/popovers on each field?

    this.state.errorByField = errorByField;

    this.forceUpdate();
  },

  onKeyDown(e) {
    if(!e.altKey && !e.ctrlKey & !e.metaKey) {
      if(e.key === 'multiply' || e.key === '*' || e.key === 'd') { // asterisk or "d" key
        this.state.solveTime[e.target.name] = 'DNF';
        this.inputChanged(e);
        e.target.select(); // select all to make it easier to change
        if(this.props.solveTimeInput) {
          this.props.solveTimeInput(this.state.validationErrors, this.solveTime); // trigger external event
        }
        e.preventDefault();
      } else if(e.key === 'divide' || e.key === '/' || e.key === 's') { // forward slash or "s" key
        this.state.solveTime[e.target.name] = 'DNS';
        this.inputChanged(e);
        e.target.select(); // select all to make it easier to change
        if(this.props.solveTimeInput) {
          this.props.solveTimeInput(this.state.validationErrors, this.solveTime); // trigger external event
        }
        e.preventDefault();
      }
    }
  },

  input(e) {
    this.inputChanged(e);
    if(this.props.solveTimeInput) {
      this.props.solveTimeInput(this.state.validationErrors, this.solveTime);
    }
  },

  render() {
    let hasError = (field) => this.state.errorByField[field] ? 'has-error' : '';
    let visibleField = (field) => this.props.editableSolveTimeFields[field] && !this.state.hideField[field];

    return (
      <form className='form-inline' role='form'>
        {visibleField('millis') ?
          <div className='form-group' style={{display: 'inline-block'}}>
            <input type='text' name='millis-mask' ref='millisMask' value={this.state.millisMask} className='form-control' readOnly tabIndex='-1' style={{width: this.INPUT_WIDTH_PIXELS, position: 'absolute', backgroundColor: 'white', fontFamily: 'monospace', textAlign: 'right'}}/>
            <input name='millis' type='text' ref='millis' value={this.state.solveTime.millis} className={`form-control ${hasError('millis')}`} style={{width: this.INPUT_WIDTH_PIXELS, position: 'relative', backgroundColor: 'transparent', fontFamily: 'monospace', textAlign: 'right'}} maxLength={this.MAX_TIME_CHARACTERS} onKeyDown={this.onKeyDown} onChange={this.input}/>
          </div> : null
        }

        {visibleField('moveCount') ?
          <div className='form-group' style={{display: 'inline-block'}}>
            <input name='moveCount' type='text' ref='moveCount' value={this.state.solveTime.moveCount} className={`form-control ${hasError('moveCount')}`} style={{width: this.INPUT_WIDTH_PIXELS}} onKeyDown={this.onKeyDown} onChange={this.input}/>
          </div> : null
        }

        {visibleField('puzzlesSolvedCount') ?
          <div className='form-group' style={{display: 'inline-block'}}>
            <input name='puzzlesSolvedCount' min='0' type='number' ref='puzzlesSolvedCount' className={`form-control ${hasError('puzzlesSolvedCount')}`} style={{width: this.INTEGER_INPUT_WIDTH_PIXELS}} onKeyDown={this.onKeyDown} onChange={this.input}/>
          </div> : null
        }

        {visibleField('puzzlesSolvedCount') ? [
          <span name='puzzlesAttemptedCount'> / </span>,
          <div className='form-group' style={{display: 'inline-block'}}>
            <input name='puzzlesAttemptedCount' min='0' type='number' ref='puzzlesAttemptedCount' className={`form-control ${hasError('puzzlesAttemptedCount')}`} style={{width: this.INTEGER_INPUT_WIDTH_PIXELS}} onKeyDown={this.onKeyDown} onChange={this.input}/>
          </div>] : null
        }

        <span className='help-block'>{this.state.validationErrors}</span>
      </form>
    );
  }
});
