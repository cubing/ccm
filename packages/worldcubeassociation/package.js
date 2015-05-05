Package.describe({
  summary: "World Cube Association OAuth flow",
  version: "0.0.1"
});

Package.onUse(function(api) {
  api.use('oauth2', ['client', 'server']);
  api.use('oauth', ['client', 'server']);
  api.use('http', ['server']);
  api.use('templating', 'client');
  api.use('underscore', 'server');
  api.use('random', 'client');
  api.use('service-configuration', ['client', 'server']);

  api.export('WorldCubeAssociation');

  api.addFiles(
    ['worldcubeassociation_configure.html', 'worldcubeassociation_configure.js'],
    'client');

  api.addFiles('worldcubeassociation_server.js', 'server');
  api.addFiles('worldcubeassociation_client.js', 'client');
});
