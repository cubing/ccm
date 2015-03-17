MochaWeb.testOnly(function() {
  describe('Collections', function() {

    var Gizmos = new Mongo.Collection("gizmos");
    Gizmos.attachSchema({
      name: {
        type: String,
      },
      createdAt: createdAtSchemaField,
      updatedAt: updatedAtSchemaField,
    });

    it('createdAt & updatedAt autoValue functions', function() {
      var gid = Gizmos.insert({name: "Rune"});
      var inserted = Gizmos.findOne(gid);

      chai.expect(inserted.name).to.equal("Rune");
      chai.expect(inserted.createdAt).to.exist;
      chai.expect(inserted.updatedAt).to.not.exist;

      Gizmos.update({_id: gid}, { $set: {name: "Sven"}});
      var updated = Gizmos.findOne(gid);

      chai.expect(updated.name).to.equal("Sven");
      chai.expect(updated.createdAt.getTime()).to.exist;
      chai.expect(updated.updatedAt.getTime()).to.exist;

      chai.expect(updated.createdAt.getTime()).to.equal(inserted.createdAt.getTime());
      chai.expect(updated.createdAt.getTime()).to.not.be.greaterThan(inserted.createdAt.getTime());
    });
  });
});
