Package.describe({
  summary: 'Iron namespace and utilities.',
  version: '0.2.0',
  git: 'https://github.com/eventedmind/iron-core'
});

Package.on_use(function (api) {
  // dependencies
  api.use('underscore');

  // for cloning
  api.use('ejson');

  api.add_files('lib/iron_core.js');

  // symbol exports
  api.export('Iron');
});

Package.on_test(function (api) {
  api.use('iron-core');
  api.use('tinytest');
  api.use('test-helpers');
  api.add_files('test/iron_core_test.js');
});
