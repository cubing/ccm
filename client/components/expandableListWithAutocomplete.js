Template.expandableListWithAutocomplete.created = function() {
  let template = this;
  template.newDocSelectedReact = new ReactiveVar(null);
};

Template.expandableListWithAutocomplete.helpers({
  newDocSelected: function() {
    let template = Template.instance();
    return template.newDocSelectedReact.get();
  },
  matchingDocs: function() {
    let collName = this.settings.collectionName;
    let collection = _.get(window, collName);
    let docs = collection.find(_.extend({}, this.settings.filter, this.settings.docCriteria));
    return docs;
  },
  isDeletable: function() {
    let data = Template.parentData(1);
    return data.settings.isDeletable(this);
  },
  autocompleteSettings: function() {
    let template = Template.instance();
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
    let form = e.currentTarget;
    form.name.value = '';

    let newDoc = template.newDocSelectedReact.get();
    template.newDocSelectedReact.set(null);
    this.settings.addDoc(newDoc._id);
  },
  'click button[name="buttonRemoveDoc"]': function(e) {
    let parentData = Template.currentData();
    parentData.settings.removeDoc(this._id);
  },
});
