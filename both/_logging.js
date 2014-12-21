/* A 2 dimensional logging framework. To log something, you first
 * define a handle by name. Each handle can log at different levels.
 * log level 0 is enabled by default for all handles, ever other level
 * is disabled by default.
 *
 * Example use:

    var log = logging.handle("main");
    log.l1("can't see me!");
    log.l1.enable();
    log.l1("can see me!");
    log.l1.disable();
    log.l1("can't see me!");

    logging.settingIs("main/1");
    log.l0("can't see me!");
    log.l1("can see me!");

*/

var wildcardMatch = function(wildcard, toMatch) {
  var asteriskIndex = wildcard.indexOf("*");
  if(asteriskIndex == -1) {
    return wildcard == toMatch;
  }
  var wildcardPrefix = wildcard.substring(0, asteriskIndex);
  var toMatchPrefix = toMatch.substring(0, asteriskIndex);
  return wildcardPrefix == toMatchPrefix;
};

logging = {
  LEVELS: [ 0, 1, 2, 3 ],
  handles_: {},
  setting_: "*/0",
  doEnableDisableHandle_: function(handle) {
    // First, disable all log levels for this handle
    logging.LEVELS.forEach(function(level) {
      handle['l' + level].disable();
    });

    logging.setting_.split(",").forEach(function(handleLevel) {
      var handle_levels = handleLevel.split("/");
      var handleDesc = handle_levels[0];
      var levels = handle_levels[1] || "";
      if(!wildcardMatch(handleDesc, handle.name)) {
        return;
      }
      if(levels == "*") {
        levels = logging.LEVELS.join("");
      }
      levels.split("").forEach(function(levelStr) {
        var level = parseInt(levelStr);
        var log = handle['l' + level];
        if(log) {
          log.enable();
        }
      });
    });
  },
  settingIs: function(setting) {
    logging.setting_ = setting;
    for(var handleName in logging.handles_) {
      if(logging.handles_.hasOwnProperty(handleName)) {
        var handle = logging.handles_[handleName];
        logging.doEnableDisableHandle_(handle);
      }
    }
  },
  setting: function() {
    return logging.setting_;
  },
  handle: function(handleName) {
    assert(handleName.match(/^\w+$/));
    if(logging.handles_[handleName]) {
      return logging.handles_[handleName];
    }

    function createLogLevel(level) {
      var log = function() {
        if(!log.enabled) {
          return;
        }
        var args = Array.prototype.slice.call(arguments, 0);
        var timeStr = new Date().toISOString();
        args.unshift(performance.now() + " " + timeStr + " " + handleName + "/" + level);
        console.log.apply(console, args);
      };
      log.enabled = false;
      log.enable = function() {
        log.enabled = true;
      };
      log.disable = function() {
        log.enabled = false;
      };
      return log;
    }

    var handle = {};
    handle.name = handleName;
    logging.LEVELS.forEach(function(level) {
      handle['l' + level] = createLogLevel(level);
    });

    logging.handles_[handleName] = handle;
    logging.doEnableDisableHandle_(handle);
    return handle;
  }
};
