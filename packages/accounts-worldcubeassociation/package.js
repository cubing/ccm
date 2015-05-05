Package.describe({
  summary: "Login service for World Cube Association accounts",
  version: "0.0.1"
});

Package.onUse(function(api) {
  api.use('accounts-base', ['client', 'server']);
  // Export Accounts (etc) to packages using this one.
  api.imply('accounts-base', ['client', 'server']);
  api.use('accounts-oauth', ['client', 'server']);
  api.use('worldcubeassociation', ['client', 'server']);

  api.addFiles('worldcubeassociation_login_button.css', 'client');

  api.addFiles("worldcubeassociation.js");
});

