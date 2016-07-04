// Copied from https://github.com/cubing/tnoodle/blob/master/scrambler-interface/WebContent/scrambler-interface/js/ui.js

function findStringsAndSurroundWith(str, encapsulator, newEncapsulator) {
  //assert(encapsulator.length == 1);
  //assert(newEncapsulator.length == 1);
  // Replace all strings in encapsulator with strings in newEncapsulator
  var stringRe = new RegExp(encapsulator + "([^" + encapsulator + "\\\\]|\\\\.)*" + encapsulator, "g");
  str = str.replace(stringRe, function(str) {
    // Remove beginning and ending encapsulator
    str = str.substring(1, str.length - 1);
    // Replace unescaped newEncapsulator with escaped
    // single quotes
    var escapedStr = "";
    for(var i = 0; i < str.length; i++) {
      if(str[i] == '\\') {
        // slurp up the escaped character as well
        i++;
        escapedStr += "\\" + str[i];
        continue;
      }
      if(str[i] == newEncapsulator) {
        // escape unescaped newEncapsulator
        escapedStr += "\\" + newEncapsulator;
      } else {
        escapedStr += str[i];
      }
    }
    return newEncapsulator + escapedStr + newEncapsulator;
  });
  return str;
}

function findNotInDoubleQuoteAndReplaceWith(str, findStr, replaceStr) {
  //assert(findStr.length == 1);
  //assert(replaceStr.length == 1);

  var inString = false;
  var newStr = "";
  for(var i = 0; i < str.length; i++) {
    if(inString) {
      if(str[i] == '"') {
        // this is the end, beautiful friend
        inString = false;
      } else if(str[i] == "\\") {
        // skip over the next character, since it's escaped
        newStr += "\\" + str[++i];
        continue;
      }
      newStr += str[i];
    } else {
      if(str[i] == '"') {
        inString = true;
      } else if(str[i] == findStr) {
        newStr += replaceStr;
        continue;
      }
      newStr += str[i];
    }
  }

  return newStr;
}

parseUrlPretty = function(urlPretty) {
  // Replace all strings in single quotes with strings in double quotes
  var json = findStringsAndSurroundWith(urlPretty, "'", '"');
  json = findNotInDoubleQuoteAndReplaceWith(json, "(", "{");
  json = findNotInDoubleQuoteAndReplaceWith(json, ")", "}");
  json = findNotInDoubleQuoteAndReplaceWith(json, "-", ":");

  json = findNotInDoubleQuoteAndReplaceWith(json, "_", ",");
  json = findNotInDoubleQuoteAndReplaceWith(json, "i", "[");
  json = findNotInDoubleQuoteAndReplaceWith(json, "!", "]");

  return JSON.parse(json);
};

toURLPretty = function(obj) {
  var json = JSON.stringify(obj);
  var urlPretty = findStringsAndSurroundWith(json, '"', "'");
  urlPretty = findNotInDoubleQuoteAndReplaceWith(urlPretty, "{", "(");
  urlPretty = findNotInDoubleQuoteAndReplaceWith(urlPretty, "}", ")");
  urlPretty = findNotInDoubleQuoteAndReplaceWith(urlPretty, ":", "-");

  urlPretty = findNotInDoubleQuoteAndReplaceWith(urlPretty, ",", "_");
  urlPretty = findNotInDoubleQuoteAndReplaceWith(urlPretty, "[", "i");
  urlPretty = findNotInDoubleQuoteAndReplaceWith(urlPretty, "]", "!");

  return urlPretty;
};
