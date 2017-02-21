export default {
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
