/*
 *  jChester - v0.3.0
 *  A time entry component for speedcubing solves.
 *  https://github.com/jfly/jChester
 *
 *  Made by Jeremy Fleischman
 *  Under GPL-3.0 License
 */
(function($) {

  $.fn.jChester = function(method, _settings) {
    if($.isPlainObject(method)) {
      _settings = method;
      method = null;
    }

    var that = this;
    var settings = $.extend({}, $.fn.jChester.defaults, _settings);

    var data = this.data('datepicker');
    if(!data) {
      data = {};
      this.data('datepicker', data);

      data.$formGroup = $('<div class="form-group">');
      that.append(data.$formGroup);

      data.$input = $('<input class="form-control">');
      data.$formGroup.append(data.$input);

      data.$helpBlock = $('<span class="help-block">');
      data.$formGroup.append(data.$helpBlock);

      var updateSolveTime = function() {
        var val = data.$input.val();
        try {
          var solveTime = $.stopwatchFormatToSolveTime(val);
          data.solveTime = solveTime;
          data.$helpBlock.text('');
          data.$formGroup.removeClass('has-warning');
        } catch(e) {
          data.solveTime = null;
          data.$helpBlock.text(e);
          data.$formGroup.addClass('has-warning');
        }
      };

      data.$input.on("input", function() {
        updateSolveTime();
        that.trigger("solveTimeInput", [data.solveTime]);
      });

      data.$input.on('keydown', function(e) {
        if(e.which === 13) {
          updateSolveTime();
          that.trigger("solveTimeChange", [data.solveTime]);
        }
      });

    }

    if(method === 'getSolveTime') {
      return data.solveTime;
    }

    if(settings.solveTime) {
      data.$input.val($.solveTimeToStopwatchFormat(settings.solveTime));
    }
    return that;
  };

  $.fn.jChester.defaults = {
    solveTime: null,
  };

  var MILLIS_PER_SECOND = 1000;
  var MILLIS_PER_MINUTE = 60 * MILLIS_PER_SECOND;
  $.extend({
    stopwatchFormatToSolveTime: function(stopwatchFormat) {
      if(stopwatchFormat.toUpperCase() === 'DNF') {
        return {
          penalties: 'DNF',
        };
      }
      if(stopwatchFormat.toUpperCase() === 'DNS') {
        return {
          penalties: 'DNS',
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
    solveTimeToStopwatchFormat: function(solveTime) {
      if(solveTime.penalties && solveTime.penalties.indexOf('DNF') >= 0) {
        return "DNF";
      }
      if(solveTime.penalties && solveTime.penalties.indexOf('DNS') >= 0) {
        return "DNS";
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
