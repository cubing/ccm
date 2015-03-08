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
        },
      ]
    };
  },
});

Template.expandableListWithAutocomplete.events({
  'autocompleteselect input': function(event, template, doc) {
    template.newDocSelectedReact.set(doc);
  },
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
