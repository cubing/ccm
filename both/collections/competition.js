Competition = function(doc) {
  _.extend(this, doc);
};

_.extend(Competition.prototype, {
  endDate() {
    return new Date(this.startDate.getTime() + (this.numberOfDays - 1) * 24*60*60*1000);
  },
  userIsStaffMember(userId) {
    let user = Meteor.users.findOne(userId);
    if(!user) {
      return false;
    }
    if(user.siteAdmin) {
      return true;
    }
    let registration = Registrations.findOne({
      userId: userId,
      competitionId: this._id,
    });
    return registration && registration.roles;
  },
  userHasRole(userId, roleName) {
    let role = RoleHeirarchy.roleByName[roleName];
    if(!role) {
      throw new Error(`Unrecognized role name: ${roleName}`);
    }

    let user = Meteor.users.findOne(userId);
    if(user.siteAdmin) {
      return true;
    }
    // If the user is not a siteAdmin, then they must have a Registration for
    // this competition with the appropriate role.
    let registration = Registrations.findOne({
      competitionId: this._id,
      userId: userId,
    });
    return registration && role.isOrIsDescendentOfAny(registration.roles);
  },
});

_.extend(Competition, {
  create(userId, competitionName, startDate) {
    competitionName = competitionName.trim();
    if(competitionName.length === 0) {
      throw new Meteor.Error(400, "Competition name must be nonempty");
    }

    let stripTimeFromDate = function(date) {
      return moment(date).utc().startOf('day').toDate();
    };
    let competitionId = Competitions.insert({
      competitionName: competitionName,
      listed: false,
      startDate: stripTimeFromDate(startDate),
    });

    let user = Meteor.users.findOne(userId);
    let uniqueName = user.profile.name;
    Registrations.insert({
      competitionId: competitionId,
      userId: userId,
      uniqueName: uniqueName,
      registeredEvents: [],
      wcaId: user.profile.wcaId,
      countryId: user.profile.countryId,
      gender: user.profile.gender,
      dob: user.profile.dob,
      roles: {
        organizer: true,
      },
    });

    return Competitions.findOne(competitionId);
  },
});

RoleHeirarchy = class {
  constructor(roleName, parentRole) {
    this.name = roleName;
    this.parentRole = parentRole;
    this.childRoles = [];
    if(this.parentRole) {
      this.parentRole.childRoles.push(this);
    }
    assert(!RoleHeirarchy.roleByName[this.name]);
    RoleHeirarchy.roleByName[this.name] = this;
  }

  getAncestorRoles() {
    let ancestorRoles = [];
    let role = this.parentRole;
    while(role) {
      ancestorRoles.push(role);
      role = role.parentRole;
    }
    return ancestorRoles;
  }

  isDescendentOfAny(roleNames) {
    roleNames = roleNames || {};
    let potentialRole = this.parentRole;
    while(potentialRole) {
      if(roleNames[potentialRole.name]) {
        return true;
      }
      potentialRole = potentialRole.parentRole;
    }
    return false;
  }

  isOrIsDescendentOfAny(roleNames) {
    roleNames = roleNames || {};
    return roleNames[this.name] || this.isDescendentOfAny(roleNames);
  }

  static get roleByName() {
    this._roleByName = this._roleByName || {};
    return this._roleByName;
  }

  static get allRoles() {
    let roles = [];
    let fringe = [rootRole];
    while(fringe.length > 0) {
      let role = fringe.pop();
      roles.push(role);
      fringe = fringe.concat(role.childRoles);
    }
    return roles;
  }
};

let rootRole = new RoleHeirarchy('organizer', null);
/**/new RoleHeirarchy('manageEvents', rootRole);
/**/new RoleHeirarchy('dataEntry', rootRole);
/**/new RoleHeirarchy('deleteCompetition', rootRole);
/**/new RoleHeirarchy('manageCheckin', rootRole);
/**/let manageCompetitionMetadataRole = new RoleHeirarchy('manageCompetitionMetadata', rootRole);
/*  */new RoleHeirarchy('manageSchedule', manageCompetitionMetadataRole);
/**/let manageScramblesRole = new RoleHeirarchy('manageScrambles', rootRole);
/*  */new RoleHeirarchy('viewScrambles', manageScramblesRole);

DEFAULT_STAFF_ROLES = {
  viewScrambles: true,
  dataEntry: true,
};

Competitions = new Mongo.Collection("competitions", { transform: function(doc) { return new Competition(doc); } });
let schema = new SimpleSchema({
  competitionName: {
    type: String,
    label: "Competition name",
  },
  wcaCompetitionId: {
    type: String,
    label: "WCA competition id",
    optional: true,
  },
  listed: {
    type: Boolean,
    label: "Listed",
  },
  calendarStartMinutes: {
    type: Number,
    label: "Schedule start time",
    min: 0,
    max: 23*60,
    defaultValue: 0,
    autoform: {
      afFieldInput: {
        type: "timeOfDayMinutes"
      }
    },
    custom: function() {
      let obj = validationObject(this, ['calendarStartMinutes']);

      let events = ScheduleEvents.find({competitionId: obj.id}).fetch();
      if(_.any(events, function(event) { return event.startMinutes < obj.calendarStartMinutes; })) {
        return "earlierExistingEvents";
      }
    },
  },
  calendarEndMinutes: {
    type: Number,
    label: "Schedule end time",
    min: 0,
    max: 23.5*60,
    defaultValue: 23.5*60,
    custom: function() {
      let obj = validationObject(this, ['calendarStartMinutes', 'calendarEndMinutes']);

      if(obj.calendarEndMinutes <= obj.calendarStartMinutes) {
        return "calendarEndIsNotBeforeStart";
      }

      let events = ScheduleEvents.find({competitionId: obj.id}).fetch();
      if(_.any(events, function(event) { return event.endMinutes() > obj.calendarEndMinutes; })) {
        return "laterExistingEvents";
      }
    },
    autoform: {
      afFieldInput: {
        type: "timeOfDayMinutes"
      }
    }
  },
  startDate: {
    type: Date,
    autoform: {
      afFieldInput: {
        type: "date"
      }
    },
  },
  numberOfDays: {
    type: Number,
    min: 1,
    defaultValue: 1,
    custom: function() {
      let obj = validationObject(this, ['numberOfDays']);

      let events = ScheduleEvents.find({competitionId: obj.id}).fetch();
      if(_.any(events, function(event) { return event.nthDay >= obj.numberOfDays; })) {
        return "laterDayExistingEvents";
      }
    },
  },
  registrationOpenDate: {
    type: Date,
    optional: true,
    autoform: {
      afFieldInput: {
        type: "datetime-local"
      }
    },
    custom: function() {
      let obj = validationObject(this, ['registrationOpenDate', 'registrationCloseDate']);

      if(!obj.registrationCloseDate && !obj.registrationOpenDate) {
        // OK to have neither filled (esp. for competition creation)
        return null;
      }

      if(!obj.registrationCloseDate) {
        return "missingRegistrationCloseDate";
      }

      if(!obj.registrationOpenDate) {
        return "missingRegistrationOpenDate";
      }

      if(obj.registrationOpenDate.getTime() >= obj.registrationCloseDate.getTime()) {
        return "registrationCloseDateAfterRegistrationOpenDate";
      }
    },
  },
  registrationCloseDate: {
    type: Date,
    optional: true,
    autoform: {
      afFieldInput: {
        type: "datetime-local"
      }
    },
    custom: function() {
      // TODO require the registration close date to be before the competition starts?
      let obj = validationObject(this, ['registrationOpenDate', 'registrationCloseDate']);

      if(!obj.registrationCloseDate && !obj.registrationOpenDate) {
        // OK to have neither filled (esp. for competition creation)
        return null;
      }

      if(!obj.registrationCloseDate) {
        return "missingRegistrationCloseDate";
      }

      if(!obj.registrationOpenDate) {
        return "missingRegistrationOpenDate";
      }
    },
  },
  registrationAskAboutGuests: {
    type: Boolean,
    label: "Ask competitors if they are bringing guests",
    min: 0,
    optional: true,
  },
  registrationParticipantLimitCount: {
    type: Number, // empty = no limit
    label: "Maximum number of competitors (leave empty for no limit)",
    min: 1,
    optional: true,
  },
  registrationAttendeeLimitCount: {
    type: Number, // empty = no limit
    label: "Maximum number of attendees (guests + competitors; leave empty for no limit)",
    min: 1,
    optional: true,
  },
  createdAt: createdAtSchemaField,
  updatedAt: updatedAtSchemaField,
  // information about competition location
  location: {
    type: new SimpleSchema({
      addressText: {
        type: String,
        optional: true,
        autoform: {
          afFieldInput: {
            type: "hidden",
          }
        },
      },
      lat: {
        type: Number,
        optional: true,
        decimal: true,
        autoform: {
          afFieldInput: {
            type: "hidden",
          }
        },
      },
      lng: {
        type: Number,
        optional: true,
        decimal: true,
        autoform: {
          afFieldInput: {
            type: "hidden",
          }
        },
      },
      // city: {
      //   type: String,
      //   optional: true,
      //   autoform: {
      //     afFieldInput: {
      //       type: "hidden",
      //     }
      //   },
      // },
      // stateOrProvince: {
      //   type: String,
      //   optional: true,
      //   autoform: {
      //     afFieldInput: {
      //       type: "hidden",
      //     }
      //   },
      // },
      // countryId: {
      //   type: String,
      //   optional: true,
      //   allowedValues: wca.countryISO2Codes,
      //   autoform: {
      //     afFieldInput: {
      //       type: "hidden",
      //     }
      //   },
      // },
    }),
    optional: true,
  },
});

schema.messages({
  registrationCloseDateAfterRegistrationOpenDate: "Registration close date should be after the registration open date.",
  missingRegistrationOpenDate: "Please enter a registration open date.",
  missingRegistrationCloseDate: "Please enter a registration close date.",
  calendarEndIsNotBeforeStart: "End time must be after start time.",
  earlierExistingEvents: "There are events earlier in the day.",
  laterExistingEvents: "There are events later in the day.",
  laterDayExistingEvents: "There are events after the last day.",
});
Competitions.attachSchema(schema);

if(Meteor.isServer) {
  Competitions._ensureIndex({
    wcaCompetitionId: 1,
  }, {
    sparse: 1,
    unique: 1,
  });
}
