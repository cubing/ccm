// It might make sense to get rid of this in favor of the substringMatcher below.
typeaheadSubstringMatcher = function(collection, attribute, extraCriteria) {
  return function findMatches(q, cb) {
    var seenIds = {};
    var arr = [];
    var addResult = function(result) {
      if(seenIds[result._id]) {
        return;
      }
      seenIds[result._id] = true;
      arr.push(result);
    };

    // First search for strings that start with the query,
    // then search for strings that have words that start with the query,
    // then search for strings that have the query in them anywhere.
    _.each(["^", "\\b", ""], function(rePrefix) {
      var reStr = rePrefix + RegExp.escape(q);
      var criteria = {};
      criteria[attribute] = {
        $regex: reStr,
        $options: 'i'
      };
      criteria = _.extend({}, extraCriteria, criteria);
      var results = collection.find(criteria).fetch();
      for(var i = 0; i < results.length; i++) {
        addResult(results[i]);
      }
    });

    cb(arr);
  };
};

substringMatcher = function(getObjects, attribute) {
  return function(q, cb) {
    var seenIds = {};
    var arr = [];
    var addResult = function(object) {
      if(seenIds[object._id]) {
        return;
      }
      seenIds[object._id] = true;
      arr.push(object);
    };

    var objects = getObjects();
    // First search for strings that start with the query,
    // then search for strings that have words that start with the query,
    // then search for strings that have the query in them anywhere.
    _.each(["^", "\\b", ""], function(rePrefix) {
      var reStr = rePrefix + RegExp.escape(q);
      var re = new RegExp(reStr, 'i');

      var newMatches = [];
      for(var i = 0; i < objects.length; i++) {
        var object = objects[i];
        var str = object[attribute];
        if(re.test(str)) {
          newMatches.push(object);
        }
      }

      // Sort all matches for this category before adding them to the final array.
      newMatches.sort(function(o1, o2) {
        if(o1[attribute] > o2[attribute]) {
          return 1;
        } else if(o1[attribute] < o2[attribute]) {
          return -1;
        } else {
          return 0;
        }
      });
      _.each(newMatches, function(match) {
        addResult(match);
      });
    });

    cb(arr);
  };
};

// Monkeypatching the typeahead plugin to automatically
// highlight the first suggestion. This way the user can press enter
// to select it.
var oldTypeahead = $.fn.typeahead;
$.fn.typeahead = function(method) {
  if(!method || typeof(method) === "object" || method === "initialize") {
    var $typeahead = $(this);
    var ttTypeahead = $typeahead.data('ttTypeahead');
    if(!ttTypeahead) {
      $typeahead.keydown(function(e) {
        if(e.which >= 37 && e.which <= 40) {
          // For arrow keys, don't get in the way of typeahead.js,
          // it wants to highlight rows.
          // This fixes https://github.com/cubing/ccm/issues/112.
          return;
        }
        Meteor.defer(function() {
          var ttTypeahead = $typeahead.data('ttTypeahead');
          var dropdown = ttTypeahead.dropdown;
          if(dropdown._getCursor().length > 0) {
            return;
          }
          var silent = true; // prevent updating the text field
          dropdown._setCursor(dropdown._getSuggestions().first(), silent);
        });
      });
    }
  }
  return oldTypeahead.apply(this, arguments);
};
