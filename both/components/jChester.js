/*
 *  jChester - v0.4.6
 *  A time entry component for speedcubing solves.
 *  https://github.com/jfly/jChester
 *
 *  Made by Jeremy Fleischman
 *  Under GPL-3.0 License
 */
(function($) {

  var INPUT_WIDTH_PIXELS = 75;
  var INTEGER_INPUT_WIDTH_PIXELS = 45; // Enough for 3 digits, which is *plenty*

  function isInt(n) {
    if(n.length === 0) {
      return false;
    }
    return (+n % 1) === 0;
  }

  $.fn.jChester = function(method, _settings) {
    if(!this.is('div')) {
      throw "jChester can only be applied to divs";
    }
    if($.isPlainObject(method)) {
      _settings = method;
      method = null;
    }

    var editableSolveTimeFieldOptions = [ 'millis', 'moveCount', 'puzzlesSolvedCount', 'puzzlesAttemptedCount' ];

    var that = this;
    var settings = $.extend({}, $.fn.jChester.defaults, _settings);

    var data = this.data('datepicker');
    if(!data) {
      data = {};
      this.data('datepicker', data);

      data.$form = $('<form class="form-inline" role="form">');
      that.append(data.$form);

      // Create millis field
      data.$form.append($('<div class="form-group"><input name="millis" type="text" class="form-control"></input></div>'));

      // Create moveCount field
      data.$form.append($('<div class="form-group"><input name="moveCount" type="text" class="form-control"></input></div>'));

      data.$form.append(document.createTextNode(' '));

      // Create puzzlesSolvedCount field
      data.$form.append($('<div class="form-group"><input name="puzzlesSolvedCount" min="0" type="number" class="form-control"></input></div>'));

      // Create puzzlesAttemptedCount field
      data.$form.append($('<span name="puzzlesAttemptedCount">&nbsp;/&nbsp;</span>'));
      data.$form.append($('<div class="form-group"><input name="puzzlesAttemptedCount" min="0" type="number" class="form-control"></input></div>'));

      data.$form.append($('<span class="help-block">'));

      data.$form.find('input[type="text"]').width(INPUT_WIDTH_PIXELS);
      data.$form.find('input[type="number"]').width(INTEGER_INPUT_WIDTH_PIXELS);

      // Force form to be on one line. Bootstrap's .form-inline only applies
      // when the viewport is at least 768px wide.
      data.$form.find('.form-group').css({ display: 'inline-block' });

      data.inputChanged = function() {
        var errorByField = {};
        var solveTime = {};

        if(data.editableSolveTimeFields.millis) {
          var millisStr = data.$form.find('input[name="millis"]').val();
          try {
            $.extend(solveTime, $.stopwatchFormatToSolveTime(millisStr));
          } catch(e) {
            if(millisStr.length === 0) {
              errorByField.millis = "Please enter a time.";
            } else {
              errorByField.millis = e;
            }
          }
        }

        if(data.editableSolveTimeFields.moveCount) {
          var moveCountStr = data.$form.find('input[name="moveCount"]').val();
          try {
            $.extend(solveTime, $.stopwatchFormatToSolveTime(moveCountStr, true));
          } catch(e) {
            if(moveCountStr.length === 0) {
              errorByField.moveCount = "Please enter a number of moves.";
            } else {
              errorByField.moveCount = e;
            }
          }
        }

        var puzzlesSolvedCountStr;
        var puzzlesAttemptedCountStr;
        data.hideField = {};
        if($.solveTimeIsDNF(solveTime)) {
          puzzlesSolvedCountStr = "0";
          puzzlesAttemptedCountStr = "1";
          data.hideField.puzzlesSolvedCount = true;
          data.hideField.puzzlesAttemptedCount = true;
        } else if($.solveTimeIsDNS(solveTime)) {
          puzzlesSolvedCountStr = "0";
          puzzlesAttemptedCountStr = "0";
          data.hideField.puzzlesSolvedCount = true;
          data.hideField.puzzlesAttemptedCount = true;
        } else if(data.editableSolveTimeFields.puzzlesSolvedCount || data.editableSolveTimeFields.puzzlesAttemptedCount) {
          var $inputPuzzlesSolvedCount = data.$form.find('input[name="puzzlesSolvedCount"]');
          puzzlesSolvedCountStr = $inputPuzzlesSolvedCount.val();
          var $inputPuzzlesAttemptedCount = data.$form.find('input[name="puzzlesAttemptedCount"]');
          puzzlesAttemptedCountStr = $inputPuzzlesAttemptedCount.val();
        } else {
          puzzlesSolvedCountStr = "1";
          puzzlesAttemptedCountStr = "1";
        }

        if(isInt(puzzlesSolvedCountStr)) {
          var puzzlesSolvedCount = parseInt(puzzlesSolvedCountStr);
          solveTime.puzzlesSolvedCount = puzzlesSolvedCount;
        } else {
          errorByField.puzzlesSolvedCount = 'Invalid number of puzzles solved.';
        }

        if(isInt(puzzlesAttemptedCountStr)) {
          var puzzlesAttemptedCount = parseInt(puzzlesAttemptedCountStr);
          solveTime.puzzlesAttemptedCount = puzzlesAttemptedCount;
          if(!errorByField.puzzlesSolvedCount && solveTime.puzzlesSolvedCount > solveTime.puzzlesAttemptedCount) {
            errorByField.puzzlesAttemptedCount = 'Cannot have more puzzles solved than attemped.';
          }
        } else {
          errorByField.puzzlesAttemptedCount = 'Invalid number of puzzles attempted.';
        }

        var getErrorForField = function(field) {
          return errorByField[field];
        };
        var errors = editableSolveTimeFieldOptions.filter(getErrorForField).map(getErrorForField);
        if(errors.length > 0) {
          solveTime = null;
        }
        data.solveTime = solveTime;

        // TODO - it would be nice if the errors lined up with the appropriate
        // inputs somehow. Perhaps we could have tooltips/popovers on each field?
        data.$form.find('.help-block').text(errors.join(" "));
        data.$form.find('.input-group').removeClass('has-error');
        editableSolveTimeFieldOptions.forEach(function(field) {
          var $inputForField = data.$form.find('input[name="' + field + '"]');
          var $formGroupForField = $inputForField.parent('.form-group');
          var hasError = !!errorByField[field];
          $formGroupForField.toggleClass('has-error', hasError);
        });

        editableSolveTimeFieldOptions.forEach(function(field) {
          var fieldVisible = data.editableSolveTimeFields[field] && !data.hideField[field];
          fieldVisible = !!fieldVisible; // $.toggle requires a real boolean
          data.$form.find('input[name="' + field + '"]').parent().toggle(fieldVisible);
          data.$form.find('span[name="' + field + '"]').toggle(fieldVisible);
        });
      };

      data.$form.find("input").on("input", function() {
        data.inputChanged();
        that.trigger("solveTimeInput", [data.solveTime]);
      });

      data.$form.find("input").on('keydown', function(e) {
        var $target = $(e.currentTarget);
        if(($target.attr('name') === 'millis' || $target.attr('name') === 'moveCount') && !e.altKey && !e.ctrlKey & !e.metaKey) {
          if(e.which === 106 || e.which === 68) { // asterisk or "d" key
            $target.val("DNF");
            data.inputChanged();
            that.trigger("solveTimeInput", [data.solveTime]);
            e.preventDefault();
          } else if(e.which === 111 || e.which === 83) { // forward slash or "s" key
            $target.val("DNS");
            data.inputChanged();
            that.trigger("solveTimeInput", [data.solveTime]);
            e.preventDefault();
          }
        }
        if(e.which === 13) { // return
          data.inputChanged();
          that.trigger("solveTimeChange", [data.solveTime]);
        }
      });

      this.attr("tabindex", "-1");
      this.focus(function(e) {
        var $input = $(this).find('input:visible').first();
        $input.focus();
        $input.select();
      });
    }

    var setSolveTime = function(solveTime) {
      if(solveTime === null) {
        // If solveTime is explicitly set to null, clear
        // the current input and validation state.
        data.$form.find('input[name="millis"]').val('');
        data.$form.find('input[name="moveCount"]').val('');
        data.$form.find('input[name="puzzlesSolvedCount"]').val('');
        data.$form.find('input[name="puzzlesAttemptedCount"]').val('');
        data.inputChanged();
      } else if(solveTime) {
        var dnStr = "";
        if($.solveTimeIsDNF(solveTime)) {
          dnStr = "DNF";
        } else if($.solveTimeIsDNS(solveTime)) {
          dnStr = "DNS";
        }

        var millisStr;
        if(solveTime.millis) {
          millisStr = $.solveTimeToStopwatchFormat(solveTime, true);
        } else {
          millisStr = dnStr;
        }
        data.$form.find('input[name="millis"]').val(millisStr);

        var moveCountStr;
        if(solveTime.moveCount) {
          moveCountStr = solveTime.moveCount;
        } else {
          moveCountStr = dnStr;
        }
        data.$form.find('input[name="moveCount"]').val(moveCountStr);

        data.$form.find('input[name="puzzlesSolvedCount"]').val(solveTime.puzzlesSolvedCount);
        data.$form.find('input[name="puzzlesAttemptedCount"]').val(solveTime.puzzlesAttemptedCount);
        data.inputChanged();
      }
    };

    if(method === 'getSolveTime') {
      return data.solveTime;
    } else if(method === 'setSolveTime') {
      var solveTime = arguments[1];
      setSolveTime(solveTime);
      return;
    } else if(method) {
      throw "Unrecognized method: " + method;
    }

    data.editableSolveTimeFields = settings.editableSolveTimeFields;
    data.inputChanged();

    setSolveTime(settings.solveTime);
    return that;
  };

  $.fn.jChester.defaults = {
    solveTime: null,
    editableSolveTimeFields: {
      millis: true,
    }
  };

  var MILLIS_PER_SECOND = 1000;
  var MILLIS_PER_MINUTE = 60 * MILLIS_PER_SECOND;
  $.extend({
    stopwatchFormatToSolveTime: function(stopwatchFormat, isMoveCount) {
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
        if(!isInt(stopwatchFormat)) {
          throw "Invalid move count";
        }
        var moveCount = parseInt(stopwatchFormat);
        if(moveCount <= 0) {
          throw "Move count must be greater than zero";
        }
        return {
          moveCount: moveCount,
        };
      }

      var m = stopwatchFormat.match(/^(?:(\d*):)?(\d+)(?:[.,](\d*))?$/);
      if(!m) {
        throw "Invalid stopwatch format";
      }

      var minutes = parseInt(m[1] || "0");
      var seconds = parseInt(m[2]);
      var decimalStr = m[3] || "";
      var decimal = parseInt(decimalStr || "0");
      var denominator = Math.pow(10, decimal.toString().length - 3); /* subtract 3 to get millis instead of seconds */
      var decimalValueInMillis = !decimal ? 0 : Math.round(decimal / denominator);

      var millis = minutes * MILLIS_PER_MINUTE + seconds * MILLIS_PER_SECOND + decimalValueInMillis;
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
    solveTimeToStopwatchFormat: function(solveTime, ignoreDn) {
      if(!ignoreDn) {
        if($.solveTimeIsDNF(solveTime)) {
          return "DNF";
        } else if($.solveTimeIsDNS(solveTime)) {
          return "DNS";
        }
      }

      var millis = solveTime.millis;
      var minutesField = Math.floor(millis / (60*1000));
      millis %= (60*1000);

      var secondsField = Math.floor(millis / 1000);
      millis %= 1000;

      function pad(toPad, padVal, minLength) {
        var padded = toPad + "";
        while(padded.length < minLength) {
          padded = padVal + padded;
        }
        return padded;
      }

      var stopwatchFormat;
      if(minutesField) {
        stopwatchFormat = minutesField + ":" + pad(secondsField, "0", 2);
      } else {
        stopwatchFormat = "" + secondsField;
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
  });

}(jQuery));
