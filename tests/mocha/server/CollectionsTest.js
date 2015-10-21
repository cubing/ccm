MochaWeb.testOnly(function() {
  describe('Collections', function() {

    let Gizmos = new Mongo.Collection("gizmos");
    Gizmos.attachSchema({
      name: {
        type: String,
      },
      createdAt: createdAtSchemaField,
      updatedAt: updatedAtSchemaField,
    });

    describe('autoValue functions', function() {
      beforeEach(function() { this.clock = sinon.useFakeTimers(); });
      afterEach(function() { this.clock.restore(); });

      it('createdAt & updatedAt', function() {
        let gid = Gizmos.insert({name: "Rune"});
        let inserted = Gizmos.findOne(gid);

        chai.expect(inserted.name).to.equal("Rune");
        chai.expect(inserted.createdAt.getTime()).to.equal(0);
        chai.expect(inserted.updatedAt).to.not.exist;

        this.clock.tick(99);
        Gizmos.update(gid, { $set: {name: "Sven"}});
        let updated = Gizmos.findOne(gid);

        chai.expect(updated.name).to.equal("Sven");
        chai.expect(updated.createdAt.getTime()).to.equal(0);
        chai.expect(updated.updatedAt.getTime()).to.equal(99);
      });
    });
  });
});
