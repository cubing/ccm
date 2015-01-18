Template.expandableListWithAutocomplete.created = function() {
  var template = this;
  template.newDocSelectedReact = new ReactiveVar(null);
};

Template.expandableListWithAutocomplete.helpers({
  newDocSelected: function() {
    var template = Template.instance();
    return template.newDocSelectedReact.get();
  },
  matchingDocs: function() {
    var collName = this.settings.collectionName;
    var collection = window;
    collName.split(".").forEach(function(part) {
      collection = collection[part];
    });
    var docs = collection.find(_.extend({}, this.settings.filter, this.settings.docCriteria));
    return docs;
  },
  isDeletable: function() {
    var data = Template.parentData(1);
    return data.settings.isDeletable(this);
  },
  autocompleteSettings: function() {
    var template = Template.instance();
    return {
      position: "top",
      limit: 5,
      rules: [
        {
          collection: this.settings.collectionName,
          filter: this.settings.filter,
          subscription: "autocompleteSubscription",
          field: this.settings.field,
          template: Template[this.settings.pillTemplateName],
          callback: function(doc, element) {
            template.newDocSelectedReact.set(doc);
          },
        },
      ]
    };
  },
});

Template.expandableListWithAutocomplete.events({
  'input input[name="name"]': function(e, template) {
    template.newDocSelectedReact.set(null);
  },
  'submit form[name="newDocForm"]': function(e, template) {
    e.preventDefault();
    var form = e.currentTarget;
    form.name.value = '';

    var newDoc = template.newDocSelectedReact.get();
    template.newDocSelectedReact.set(null);
    this.settings.addDoc(newDoc._id);
  },
  'click button[name="buttonRemoveDoc"]': function(e) {
    var parentData = Template.currentData();
    parentData.settings.removeDoc(this._id);
  },
});

// Hacky workaround for https://github.com/mizzao/meteor-autocomplete/issues/75
function isWholeField() {
  return true;
}
AutoComplete.prototype.positionContainer = function() {
  var offset, pos, position, rule;
  position = this.$element.position();
  rule = this.matchedRule();
  if((rule !== null) && isWholeField(rule)) {
    pos = {
      left: position.left,
      //JFLY top: position.top + this.$element.outerHeight(),
      width: this.$element.outerWidth()
    };
    //JFLY
    offset = { top: 0 };
    if(this.position === "top") {
      pos.bottom = this.$element.offsetParent().height() - position.top - offset.top;
    } else {
      pos.top = position.top + offset.top + parseInt(this.$element.css('font-size'));
    }
    //JFLY
  } else {
    offset = getCaretCoordinates(this.element, this.element.selectionStart);
    pos = {
      left: position.left + offset.left,
    };
    if(this.position === "top") {
      pos.bottom = this.$element.offsetParent().height() - position.top - offset.top;
    } else {
      pos.top = position.top + offset.top + parseInt(this.$element.css('font-size'));
    }
  }
  return this.tmplInst.$(".-autocomplete-container").css(pos);
};
