var AgendaView = $.fullCalendar.GJCOMPSHACK_AgendaView;
var createObject = Object.create;

// Slightly modified version of AgendaWeekView from fullcalendar.js

$.fullCalendar.views.agendaDays = AgendaCustomWeekView; // register the view

function AgendaCustomWeekView(calendar) {
	AgendaView.call(this, calendar); // call the super-constructor
}


AgendaCustomWeekView.prototype = createObject(AgendaView.prototype); // define the super-class
$.extend(AgendaCustomWeekView.prototype, {

	name: 'agendaCustomWeek',


	incrementDate: function(date, delta) {
		return date.clone().stripTime().add(delta, 'weeks').startOf('week');
	},


	render: function(date) {

		this.intervalStart = date.clone().stripTime();
    var durationDays = this.opt('durationDays');
		this.intervalEnd = this.intervalStart.clone().add(durationDays, 'days');

		this.start = this.skipHiddenDays(this.intervalStart);
		this.end = this.skipHiddenDays(this.intervalEnd, -1, true);

		this.title = this.calendar.formatRange(
			this.start,
			this.end.clone().subtract(1), // make inclusive by subtracting 1 ms
			this.opt('titleFormat'),
			' \u2014 ' // emphasized dash
		);

		AgendaView.prototype.render.call(this, durationDays); // call the super-method
	}

});

;;

