export default {
  managerTabs: [{
    route: 'manageCompetition',
    title: 'Change competition registration window, competition name, location, organizers, and staff',
    icon: 'fa fa-cog',
    text: 'Manage',
  }, {
    route: 'editStaff',
    title: 'Assign staff members',
    icon: 'fa fa-group',
    text: 'Staff',
  }, {
    route: 'editEvents',
    title: 'Add and remove rounds, change cutoffs, open and close rounds',
    icon: 'fa fa-cube',
    text: 'Events',
  }, {
    route: 'editSchedule',
    icon: 'glyphicon glyphicon-calendar',
    text: 'Schedule',
  }, {
    route: 'scrambles',
    title: 'Generate scrambles, manage groups, and view scrambles for open groups',
    icon: '/img/tnoodle_logo.svg',
    text: 'Scrambles',
    leaf: false,
  // Add back when it comes time
  // }, {
  //   route: 'scorecards',
  //   title: 'Manage and Generate individual scorecards',
  //   icon: '',
  //   text: 'Scorecards',
  //   leaf: false,
  }, {
    route: 'manageCheckin',
    title: 'Edit the list of registered competitors and copy competitors to the first rounds they will compete in (check-in)',
    icon: 'fa fa-check-square-o',
    text: 'Check-in',
  }, {
    route: 'dataEntry',
    icon: 'glyphicon glyphicon-edit',
    text: 'Data entry',
    leaf: false,
  }, {
    route: 'podiums',
    icon: 'fa fa-trophy',
    text: 'Podiums',
    leaf: false,
  }, {
    route: 'exportResults',
    title: 'Export results to WCA JSON',
    icon: '/img/WCAlogo_notext.svg',
    text: 'Export',
  },
],
  userTabs: [{
    route: 'competition',
    icon: 'glyphicon glyphicon-home',
    text: 'Home',
    otherClass: 'match-jumbotron',
  }, {
    route: 'competitionEvents',
    icon: 'fa fa-cube',
    text: 'Events',
  }, {
    route: 'competitionSchedule',
    icon: 'glyphicon glyphicon-calendar',
    text: 'Schedule',
  }, {
    route: 'roundResults',
    icon: 'fa fa-trophy',
    text: 'Results',
    leaf: false,
  },
],
  scrambleTabs: [{
    route: 'uploadScrambles',
    title: 'Generate scrambles with TNoodle and upload them',
    icon: 'fa fa-upload',
    text: 'Upload Scrambles',
  }, {
    route: 'manageScrambleGroups',
    title: 'Open and close scramble groups for ongoing rounds',
    icon: 'fa fa-group',
    text: 'Manage Scramble Groups',
    leaf: false,
  }, {
    route: 'viewScrambles',
    title: 'View scrambles for open groups',
    icon: 'fa fa-eye',
    text: 'View Scrambles',
  },
],
  podiumTabs: [{
    route: 'podiums',
    title: 'Show everyone who podiumed, grouped by event',
    icon: 'fa fa-trophy',
    text: 'Podiums By Event',
  }, {
    route: 'podiumsByPerson',
    title: 'Show everyone who podiumed, grouped by person',
    icon: 'fa fa-group',
    text: 'Podiums By Person',
  },
],
};
