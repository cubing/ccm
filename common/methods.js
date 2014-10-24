Meteor.methods({
  createCompetition: function(competitionName){
    check(competitionName, String);
    if(competitionName.trim().length === 0){
      throw new Meteor.Error(400, "Competition name must be nonempty");
    }

    if(!this.userId){
      throw new Meteor.Error(401, "Must log in");
    }

    Competitions.insert({
      competitionName: competitionName,
      organizers: [ this.userId ]
    });
  },
  deleteCompetition: function(competitionId){
    check(competitionId, String);
    throwUnlessOrganizer(this.userId, competitionId);

    Competitions.remove({ _id: competitionId });
    Rounds.remove({ competitionId: competitionId });
    Results.remove({ competitionId: competitionId });
    Groups.remove({ competitionId: competitionId });
  },
  addRound: function(competitionId, eventCode){
    if(!canAddRound(this.userId, competitionId, eventCode)){
      throw new Meteor.Error(400, "Cannot add another round");
    }

    // TODO - what happens if multiple users call this method at the same time?
    // It looks like meteor makes an effort to serve methods from a single user
    // in order, but I don't know if there is any guarantee of such across users
    // See http://docs.meteor.com/#method_unblock.

    var formatCode = wca.formatsByEventCode[eventCode][0];
    Rounds.insert({
      combined: false,

      competitionId: competitionId,
      eventCode: eventCode,
      formatCode: formatCode,

      // These will be filled in by refreshRoundCodes
      roundCode: null,
      nthRound: wca.maxRoundsPerEvent
    });

    Meteor.call('refreshRoundCodes', competitionId, eventCode);
  },
  removeRound: function(roundId){
    if(!canRemoveRound(this.userId, roundId)){
      throw new Meteor.Error(400, "Cannot remove round. Make sure it is the last round for this event, and has no times entered.");
    }

    var round = Rounds.findOne({ _id: roundId });
    Rounds.remove({ _id: roundId });
    Groups.remove({ roundId: roundId });

    Meteor.call('refreshRoundCodes', round.competitionId, round.eventCode);
  },
  refreshRoundCodes: function(competitionId, eventCode){
    var rounds = Rounds.find({
      competitionId: competitionId,
      eventCode: eventCode
    }, {
      sort: {
        "nthRound": 1
      }
    }).fetch();
    if(rounds.length > wca.maxRoundsPerEvent){
      throw new Meteor.Error(400, "Too many rounds");
    }
    rounds.forEach(function(round, nthRound){
      // Note that we ignore the actual value of nthRound, and instead use the
      // index into rounds as the nthRound. This defragments any missing
      // rounds (not that that's something we expect to ever happen, since
      // removeRound only allows removal of the latest round).
      var supportedRoundsIndex;
      if(nthRound == rounds.length - 1){
        supportedRoundsIndex = wca.maxRoundsPerEvent - 1;
      }else{
        supportedRoundsIndex = nthRound;
      }
      var roundCodes = wca.supportedRounds[supportedRoundsIndex];
      var roundCode = round.combined ? roundCodes.combined : roundCodes.uncombined;
      Rounds.update({
        _id: round._id
      }, {
        $set: {
          roundCode: roundCode,
          nthRound: nthRound
        }
      });
    });
  },
});

if(Meteor.isServer){
  var child_process = Npm.require('child_process');
  var path = Npm.require("path");
  var fs = Npm.require('fs');
  var os = Npm.require('os');
  var mkdirp = Meteor.npmRequire('mkdirp');

  var zipIdToFilename = function(zipId, userId){
    var tmpdir = os.tmpdir();
    var filename = path.join(tmpdir, "tnoodlezips", userId, zipId + ".zip");
    return filename;
  };

  Meteor.methods({
    'uploadTNoodleZip': function(zipData){
      // TODO - this is pretty janky. What if the folder we try to create
      // exists, but isn't a folder? Permissions could also screw us up.
      // Ideally we would just decompress the zip file client side, but
      // there aren't any libraries for that yet.
      var id = Date.now();
      var zipFilename = zipIdToFilename(id, this.userId);
      mkdirp.sync(path.join(zipFilename, ".."));
      fs.writeFileSync(zipFilename, zipData, 'binary');
      return id;
    },
    'unzipTNoodleZip': function(zipId, pw){
      var args = [];
      args.push('-p'); // extract to stdout
      if(pw){
        args.push('-P');
        args.push(pw);
      }
      var zipFilename = zipIdToFilename(zipId, this.userId);
      args.push(zipFilename);
      args.push('*.json'); // there should be exactly one json file in the zip
      function unzipAsync(cb){
        child_process.execFile('unzip', args, function(error, stdout, stderr){
          if(error){
            // Error code 82 indicates bad password
            // See http://www.info-zip.org/FAQ.html
            if(error.code == 82){
              console.log("INVALID PASSWORD");//<<<
              cb("INVALID PASSWORD");
            }else{
              cb("Unzip exited with error code " + error.code);
            }
          }else{
            cb(null, stdout);
          }
        });
      }
      var unzipSync = Meteor.wrapAsync(unzipAsync);
      try{
        var jsonStr = unzipSync();
        return jsonStr;
      }catch(e){
        console.log(e.stack);//<<<
        throw new Meteor.Error('unzip', e.toString());
      }
    }
  });
}
