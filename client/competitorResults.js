Template.participantResults.helpers({
    results: function() {
	var results = Results.find({
	    competitionId: this.competitionId,
	    registrationId: this.registration._id,
	}, { 
	    sort: {
		sortableBestValue: 1,
	    }
	});
	return results;
    },
    roundName: function() {
	var round = Rounds.findOne({_id:this.roundId});
	return round.nthRound; 
    },
    best: function() {
	return this.solves[this.bestIndex];
    },
    competitorName: function() {
	return this.registration.uniqueName;
    },
    numSolves: function() {
	return 5;
    },
    wcaProfileUrl: function() {
	var wcaId = this.registration.wcaId;
	return 'https://www.worldcubeassociation.org/results/p.php?i='+wcaId;
    }
});
