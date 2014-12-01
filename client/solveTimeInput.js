function getContainingDiv(template, data) {
  assert(data.name);
  var $div = template.$('div[name="' + data.name + '"]');
  return $div;
}

function updateAndGetTime(template, data) {
  var $input = template.$('input');
  if($input.val().length === 0) {
    time = null;
    template.warningReact.set("Enter a time");
  } else {
    try {
      time = parseClockFormat($input.val());
      template.warningReact.set(null);
    } catch(e) {
      template.warningReact.set(e);
      return;
    }
  }
  var $div = getContainingDiv(template, data);
  $div.data('time', time);
  return time;
}

Template.solveTimeInput.created = function() {
  var template = this;
  template.warningReact = new ReactiveVar(null);
};

Template.solveTimeInput.rendered = function() {
  var template = this;
  var data = Template.currentData();
  updateAndGetTime(template, data);
};

Template.solveTimeInput.helpers({
  warning: function() {
    var template = Template.instance();
    return template.warningReact.get();
  },
});

Template.solveTimeInput.events({
  'input input': function(e, t) {
    var time = updateAndGetTime(t, this);
    var $div = getContainingDiv(t, this);
    $div.trigger("gj.timeChanged", [ time ]);
  },
});
