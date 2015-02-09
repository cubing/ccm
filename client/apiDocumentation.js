var API_VERSION = "0";

var descriptionByParam = {
  competitionUrlId: "WCA Id or _id of a competition",
  token: 'Meteor.loginWithPassword("ccm@ccm.com", "ccm", function(err) { if(err) { throw err; } console.log(Accounts._storedLoginToken()); })',
  solveTime: '<a href="http://www.jflei.com/jChester/" rel="external" target="_blank">SolveTime definition</a>',
};

Template.apiDocumentation.helpers({
  apiVersion: function() {
    return API_VERSION;
  },
  apiEndpoints: function() {
    return [
      {
        method: "GET",
        path: "/api/v0/competitions",
      },
      {
        method: "GET",
        path: "/api/v0/competitions/:competitionUrlId/rounds",
      },
      {
        method: "GET",
        path: "/api/v0/competitions/:competitionUrlId/registrations",
      },
      {
        method: "GET",
        path: "/api/v0/competitions/:competitionUrlId/rounds/:eventCode/:nthRound/results",
        queryParams: [ 'registrationId' ],
      },
      {
        method: "PUT",
        path: "/api/v0/competitions/:competitionUrlId/rounds/:eventCode/:nthRound/results?token=:token",
        queryParams: [ 'registrationId', 'solveIndex', 'solveTime' ],
        jsonData: true,
      },
    ];
  },
});

Template.apiEndpoint.created = function() {
  var template = this;
  template.paramValuesReact = new ReactiveVar({});
};

Template.apiEndpoint.helpers({
  params: function() {
    var params = this.path.match(/:[^/]+/g);
    if(!params) {
      return [];
    }
    params = params.map(function(param) {
      return param.substring(1);
    });
    return params;
  },
  paramDescription: function() {
    return descriptionByParam[this];
  },
  jsCode: function() {
    var template = Template.instance();

    var paramValues = template.paramValuesReact.get();
    var pathStr = replaceParameters(this.path, paramValues);
    var pathStrRepr = JSON.stringify(pathStr);

    var settingsStr = "";
    var data = getData.call(this, paramValues);
    if(data || this.method != "GET") {
      var settings = {};
      if(data) {
        settings.data = data;
      }
      if(this.method != "GET") {
        settings.type = this.method;
      }
      settingsStr = ", " + JSON.stringify(settings);
    }

    var js = "$.ajax(" + pathStrRepr + settingsStr + ").done(function(data) {\n" +
             "  console.log(data);\n" +
             "}).fail(function(xhr, textStatus, error) {\n" +
             "  console.log(xhr.responseText);\n" +
             "});";

    return js;
  },
});

function getData(paramValues) {
  if(this.queryParams) {
    var queryData = {};
    this.queryParams.forEach(function(param) {
      if(paramValues[param]) {
        var value = paramValues[param];
        if(param == "solveIndex") {//<<<
          value = parseInt(value);
        } else if(param == "solveTime") {//<<<
          try {
            value = JSON.parse(value);
          } catch(e) {
            value = e.message;
          }
        }
        queryData[param] = value;
      }
    });
    if(this.jsonData) {
      return JSON.stringify(queryData);
    } else {
      return queryData;
    }
  }

  return null;
}

function replaceParameters(js, paramValues) {
  for(var param in paramValues) {
    if(paramValues.hasOwnProperty(param)) {
      var value = paramValues[param];
      if(value) {
        js = js.replace(new RegExp(":" + param, 'g'), value);
      }
    }
  }
  return js;
}

Template.apiEndpoint.events({
  'click .js-run-api': function(e, template) {
    var $output = template.$('.js-api-output');
    $output.text('...');

    var paramValues = template.paramValuesReact.get();
    var path = replaceParameters(this.path, paramValues);
    var data = getData.call(this, paramValues);
    $.ajax(path, {
      type: this.method,
      data: data,
    }).done(function(data) {
      $output.removeClass("api-error");
      $output.text(JSON.stringify(data, null, 2));
      hljs.highlightBlock($output[0]);
    }).fail(function(xhr, textStatus, error) {
      $output.addClass("api-error");
      $output.text(xhr.responseText);
    });
  },
  'click .js-clear-api': function(e, template) {
    var $output = template.$('.js-api-output');
    $output.text('');
  },
  'input input': function(e, template) {
    var paramName = this.toString();
    var input = e.currentTarget;
    var paramValues = template.paramValuesReact.get();
    paramValues[paramName] = input.value;
    template.paramValuesReact.set(paramValues);
  },
});

Template.hljs.rendered = function() {
  var template = this;
  template.autorun(function() {
    var data = Template.currentData();
    var $code = template.$('code[class]');
    $code.text(data);
    hljs.highlightBlock($code[0]);
  });
};
