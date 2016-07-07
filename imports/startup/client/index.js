import './router';

// https://github.com/okgrow/analytics complains when
// Meteor.settings.public.analyticsSettings is unset. Velocity ensures that
// we see the message twice, which just drives me crazy. Here we just set
// Meteor.settings.public.analyticsSettings to an empty object to squelch this
// message.
Meteor.settings = Meteor.settings || {};
Meteor.settings.public = Meteor.settings.public || {};
Meteor.settings.public.analyticsSettings = {};
