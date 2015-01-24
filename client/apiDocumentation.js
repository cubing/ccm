var API_VERSION = "0";

var ajaxer = function(PATH, DATA, CALLBACK) {
  $.get(PATH, DATA).done(function(data) {
    CALLBACK(data);
  }).fail(function(xhr, textStatus, error) {
    CALLBACK(null, xhr.responseText);
  });
};

var descriptionByParam = {
  competitionUrlId: "WCA Id or _id of a competition",
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
      }
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

    var js = ajaxer.toString();
    var lines = js.split("\n");
    lines = lines.splice(1, lines.length - 2);
    js = lines.join("\n");
    js = js.replace(/PATH/g, JSON.stringify(this.path));
    js = js.replace(/CALLBACK/g, "console.log");
    js = js.replace(/null, /g, ""); // hacksss
    var paramValues = template.paramValuesReact.get();
    js = replaceParameters(js, paramValues);

    var queryData = getQueryData(this.queryParams, paramValues);
    if(_.keys(queryData).length > 0) {
      js = js.replace(/DATA/g, JSON.stringify(queryData));
    } else {
      js = js.replace(/, DATA/g, "");
    }

    return js;
  },
});

function getQueryData(queryParams, paramValues) {
  var queryData = {};
  if(queryParams) {
    queryParams.forEach(function(param) {
      if(paramValues[param]) {
        queryData[param] = paramValues[param];
      }
    });
  }
  return queryData;
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
    var data = getQueryData(this.queryParams, paramValues);
    ajaxer(path, data, function(data, error) {
      if(error) {
        $output.addClass("api-error");
        $output.text(error);
      } else {
        $output.removeClass("api-error");
        $output.text(JSON.stringify(data, null, 2));
        hljs.highlightBlock($output[0]);
      }
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
