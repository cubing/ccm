const API_VERSION = "0";

const descriptionByParam = {
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
        method: "GET",
        path: "/api/v0/competitions/:competitionUrlId/groups?token=:token",
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
  let template = this;
  template.paramValuesReact = new ReactiveVar({
    token: Accounts._storedLoginToken(),
  });
};

Template.apiEndpoint.helpers({
  params: function() {
    let params = this.path.match(/:[^/]+/g);
    if(!params) {
      return [];
    }
    params = params.map(function(param) {
      return param.substring(1);
    });
    return params;
  },
  initialValue: function() {
    let param = this.toString();
    let template = Template.instance();
    let paramValues = template.paramValuesReact.get();
    return paramValues[param];
  },
  paramDescription: function() {
    return descriptionByParam[this];
  },
  jsCode: function() {
    let template = Template.instance();
    let paramValues = template.paramValuesReact.get();

    let pathStr = replaceParameters(this.path, paramValues);
    let pathStrRepr = JSON.stringify(pathStr);

    let settingsStr = "";
    let data = getData.call(this, paramValues);
    if(data || this.method != "GET") {
      let settings = {};
      if(data) {
        settings.data = data;
      }
      if(this.method != "GET") {
        settings.type = this.method;
      }
      settingsStr = ", " + JSON.stringify(settings);
    }

    let js = "$.ajax(" + pathStrRepr + settingsStr + ").done(function(data) {\n" +
             "  console.log(data);\n" +
             "}).fail(function(xhr, textStatus, error) {\n" +
             "  console.log(xhr.responseText);\n" +
             "});";

    return js;
  },
});

function getData(paramValues) {
  if(this.queryParams) {
    let queryData = {};
    this.queryParams.forEach(param => {
      if(paramValues[param]) {
        let value = paramValues[param];
        if(param == "solveIndex") {
          value = parseInt(value);
        } else if(param == "solveTime") {
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
  for(let param in paramValues) {
    if(paramValues.hasOwnProperty(param)) {
      let value = paramValues[param];
      if(value) {
        js = js.replace(new RegExp(":" + param, 'g'), value);
      }
    }
  }
  return js;
}

Template.apiEndpoint.events({
  'click .js-run-api': function(e, template) {
    let $output = template.$('.js-api-output');
    $output.text('...');

    let paramValues = template.paramValuesReact.get();
    let path = replaceParameters(this.path, paramValues);
    let data = getData.call(this, paramValues);
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
    let $output = template.$('.js-api-output');
    $output.text('');
  },
  'input input': function(e, template) {
    let paramName = this.toString();
    let input = e.currentTarget;
    let paramValues = template.paramValuesReact.get();
    paramValues[paramName] = input.value;
    template.paramValuesReact.set(paramValues);
  },
});

Template.hljs.rendered = function() {
  let template = this;
  template.autorun(function() {
    let data = Template.currentData();
    let $code = template.$('code[class]');
    $code.text(data);
    hljs.highlightBlock($code[0]);
  });
};
