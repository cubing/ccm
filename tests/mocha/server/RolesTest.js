MochaWeb.testOnly(function() {
  beforeEach(function() {
    [Competitions, Rounds, RoundProgresses, Registrations, Meteor.users].forEach(collection => {
      collection.remove({});
    });
  });

  describe('RoleHeirarchy', function() {
    describe('viewScrambles isOrIsDescendentOfAny', function() {
      let viewScramblesRole;
      beforeEach(function() {
        viewScramblesRole = RoleHeirarchy.roleByName.viewScrambles;
      });

      it('organizer', function() {
        chai.expect(viewScramblesRole.isOrIsDescendentOfAny({organizer: true})).to.eq(true);
      });
      it('manageScrambles', function() {
        chai.expect(viewScramblesRole.isOrIsDescendentOfAny({manageScrambles: true})).to.eq(true);
      });
      it('viewScrambles', function() {
        chai.expect(viewScramblesRole.isOrIsDescendentOfAny({viewScrambles: true})).to.eq(true);
      });
      it('manageSchedule', function() {
        chai.expect(viewScramblesRole.isOrIsDescendentOfAny({manageSchedule: true})).to.eq(false);
      });
      it('manageSchedule and manageScrambles', function() {
        chai.expect(viewScramblesRole.isOrIsDescendentOfAny({manageSchedule: true, manageScrambles: true})).to.eq(true);
      });
      it('manageSchedule and deleteCompetition', function() {
        chai.expect(viewScramblesRole.isOrIsDescendentOfAny({manageSchedule: true, deleteCompetition: true})).to.eq(false);
      });
    });
  });

  describe('setStaffRole', function() {
    let setStaffRole;
    let competition;
    let organizerUserId;
    let organizerStaffId;
    let nonOrganizerUserId;
    let nonOrganizerStaffId;
    beforeEach(function() {
      setStaffRole = Meteor.server.method_handlers.setStaffRole;
      competition = make(Competitions);

      organizerUserId = make(Meteor.users)._id;
      organizerStaffId = Registrations.insert({ uniqueName: "Mr. Organizer", competitionId: competition._id, userId: organizerUserId, roles: {organizer: true} });

      nonOrganizerUserId = make(Meteor.users)._id;
      nonOrganizerStaffId = Registrations.insert({ uniqueName: "Mr. Non Organizer", competitionId: competition._id, userId: nonOrganizerUserId });
    });

    it('organizer can set roles', function() {
      setStaffRole.call({ userId: organizerUserId }, nonOrganizerStaffId, 'organizer', true);
      chai.expect(Registrations.findOne(nonOrganizerStaffId).roles.organizer).to.eq(true);
    });

    it('non organizer cannot set roles', function() {
      chai.expect(function() {
        setStaffRole.call({ userId: nonOrganizerUserId }, organizerStaffId, 'organizer', false);
      }).to.throw(Meteor.Error);
      chai.expect(Registrations.findOne(organizerStaffId).roles.organizer).to.eq(true);
    });

    it('cannot demote oneself', function() {
      chai.expect(function() {
        setStaffRole.call({ userId: organizerUserId }, organizerStaffId, 'organizer', false);
      }).to.throw(Meteor.Error);
      chai.expect(Registrations.findOne(organizerStaffId).roles.organizer).to.eq(true);
    });
  });
});
