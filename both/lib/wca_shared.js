// File name starts with "_" so it loads first

// Force filter to be false. I really wish this was the default for SimpleSchema.
var oldClean = SimpleSchema.prototype.clean;
SimpleSchema.prototype.clean = function(doc, options) {
  options = options || {};
  options.filter = false;
  return oldClean.call(this, doc, options);
};

GenderType = {
  type: String,
  allowedValues: _.keys(wca.genderByValue),
  autoform: {
    type: "select",
    options: function() {
      return wca.genders;
    }
  },
};

DobType = {
  type: Date,
  label: "Birthdate",
  autoform: {
    afFieldInput: {
      type: "date",
      placeholder: "MM/DD/YYYY",
    }
  },
};

CountryIdType = {
  type: String,
  allowedValues: wca.countryISO2Codes,
  autoform: {
    type: "selectize",
    options: wca.countryISO2AutoformOptions,
  },
};

WcaIdType = {
  label: "WCA id",
  type: String,
  regEx: /^(19|20)\d{2}[A-Z]{4}\d{2}$/,
};

// This is a copy of jChester's SolveTime schema
//  http://www.jflei.com/jChester/
SolveTime = new SimpleSchema({
  millis: {
    // The solve time in milliseconds, *with* any penalties applied
    type: Number,
    min: 0,
    optional: true,
  },
  decimals: {
    type: Number,
    min: 0,
    max: 3,
    optional: true,
  },
  moveCount: {
    type: Number,
    decimal: true, // To support FMC average, which contains decimals
    min: 0,
    optional: true,
  },
  penalties: {
    type: [String],
    allowedValues: _.keys(wca.penalties),
    optional: true,
  },
  puzzlesSolvedCount: {
    type: Number,
    min: 0,
    optional: true,
  },
  puzzlesAttemptedCount: {
    type: Number,
    min: 0,
    optional: true,
  },
  // Note that we don't use an autovalue for this. This is because we do
  // trust clients to send us timestamps if they want to.
  updatedAt: {
    type: Date,
    optional: true
  },
});

console.log("INSIDE _SHARED YO");//<<<
// Force value to be current date (on server) upon insert
// and prevent updates thereafter.
createdAtSchemaField = {
  type: Date,
  autoValue: function() {
    if(this.isInsert) {
      return new Date();
    }
    if(this.isUpsert) {
      return {$setOnInsert: new Date()};
    }
    this.unset();
  }
};

// Force value to be current date (on server) upon update
// and don't allow it to be set upon insert.
updatedAtSchemaField = {
  type: Date,
  denyInsert: true,
  optional: true,
  autoValue: function() {
    if(this.isUpdate) {
      return new Date();
    }
  },
};

validationObject = function(simpleSchemaObject, fields) {
  var result = { id: simpleSchemaObject.docId };
  fields.forEach(function(field) {
    result[field] = simpleSchemaObject.field(field).value;
  });
  return result;
};

isSiteAdmin = function(userId) {
  var user = Meteor.users.findOne(userId, { fields: { siteAdmin: 1 } });
  return user.siteAdmin;
};

getRound = function(roundId) {
  return Rounds.findOne(roundId);
};
