Template.participantResults.helpers({
    results: function() {
	var results = Results.find({
	    competitionId: this.competitionId,
	    registrationId: this.registration._id,
	});
	return results;
    },
    roundId: function() {
	return this.roundId;
    },
    average: function() {
	return this.average;
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
