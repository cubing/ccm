var url = Npm.require('url');

Meteor.startup(function() {
  // Announce ourselves via Zeroconf
  var mdns = Meteor.npmRequire('mdns-js');

  // Wow, this is so gross. I couldn't find any way to get to
  // our "runner" though.
  // See https://github.com/meteor/meteor/blob/devel/tools/run-all.js#L344
  var port = url.parse(process.env.ROOT_URL).port || 80;
  var service = new mdns.createAdvertisement(
    mdns.tcp('_http'),
    "" + port,
    {
      name: 'ccm',
      txt: {
        txtvers: '1'
      }
    }
  );
  service.start();
});
