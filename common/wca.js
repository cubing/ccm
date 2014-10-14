wca = {};

if(Meteor.isClient) {
  Template.registerHelper("roundName", function(roundCode) {
    return wca.roundByCode[roundCode].name;
  });
  Template.registerHelper("eventName", function(eventCode) {
    return wca.eventByCode[eventCode].name;
  });
  Template.registerHelper("formatName", function(eventCode) {
    return wca.formatByCode[eventCode].name;
  });
}

wca.roundByCode = {
  "0":{
    "name":"Qualification round",
    "code":"0",
    "roundType":0,
    "combined":false
  },
  "1":{
    "name":"First round",
    "code":"1",
    "roundType":1,
    "combined":false
  },
  "2":{
    "name":"Second round",
    "code":"2",
    "roundType":3,
    "combined":false
  },
  "3":{
    "name":"Semi Final",
    "code":"3",
    "roundType":5,
    "combined":false
  },
  "h":{
    "name":"Combined qualification",
    "code":"h",
    "roundType":0,
    "combined":true
  },
  "d":{
    "name":"Combined First round",
    "code":"d",
    "roundType":1,
    "combined":true
  },
  "b":{
    "name":"B Final",
    "code":"b",
    "roundType":2,
    "combined":false
  },
  "e":{
    "name":"Combined Second round",
    "code":"e",
    "roundType":3,
    "combined":true
  },
  "g":{
    "name":"Combined Third Round",
    "code":"g",
    "roundType":4,
    "combined":true
  },
  "c":{
    "name":"Combined Final",
    "code":"c",
    "roundType":6,
    "combined":true
  },
  "f":{
    "name":"Final",
    "code":"f",
    "roundType":6,
    "combined":false
  }
};

wca.eventByCode = {
  "222":{
    "code":"222",
    "name":"2x2 Cube",
    "index":3
  },
  "333":{
    "code":"333",
    "name":"Rubik's Cube",
    "index":0
  },
  "444":{
    "code":"444",
    "name":"4x4 Cube",
    "index":1
  },
  "555":{
    "code":"555",
    "name":"5x5 Cube",
    "index":2
  },
  "666":{
    "code":"666",
    "name":"6x6 Cube",
    "index":13
  },
  "777":{
    "code":"777",
    "name":"7x7 Cube",
    "index":14
  },
  "333bf":{
    "code":"333bf",
    "name":"Rubik's Cube: Blindfolded",
    "index":4
  },
  "333oh":{
    "code":"333oh",
    "name":"Rubik's Cube: One-handed",
    "index":5
  },
  "333fm":{
    "code":"333fm",
    "name":"Rubik's Cube: Fewest moves",
    "index":6
  },
  "333ft":{
    "code":"333ft",
    "name":"Rubik's Cube: With feet",
    "index":7
  },
  "minx":{
    "code":"minx",
    "name":"Megaminx",
    "index":8
  },
  "pyram":{
    "code":"pyram",
    "name":"Pyraminx",
    "index":9
  },
  "sq1":{
    "code":"sq1",
    "name":"Square-1",
    "index":10
  },
  "clock":{
    "code":"clock",
    "name":"Rubik's Clock",
    "index":11
  },
  "skewb":{
    "code":"skewb",
    "name":"Skewb",
    "index":12
  },
  "444bf":{
    "code":"444bf",
    "name":"4x4 Cube: Blindfolded",
    "index":15
  },
  "555bf":{
    "code":"555bf",
    "name":"4x4 Cube: Blindfolded",
    "index":16
  },
  "333mbf":{
    "code":"333mbf",
    "name":"Rubik's Cube: Multiple Blindfolded",
    "index":17
  }
};

wca.formatByCode = {
  "1":{
    "name":"Best of 1",
    "count":1,
    "code":"1"
  },
  "2":{
    "name":"Best of 2",
    "count":2,
    "code":"2"
  },
  "3":{
    "name":"Best of 3",
    "count":3,
    "code":"3"
  },
  "a":{
    "name":"Average of 5",
    "count":5,
    "code":"a"
  },
  "m":{
    "name":"Mean of 3",
    "count":3,
    "code":"m"
  },
};
