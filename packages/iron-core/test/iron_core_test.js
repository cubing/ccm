Tinytest.add('Utils - inherits', function (test) {
  var calls = [];

  Parent = function () {};
  Parent.parentStaticProp = true;
  Parent.prototype.parentProp = true;

  Child = function () {};

  Iron.utils.inherits(Child, Parent, {
    childProp: true
  });

  test.equal(Child.__super__, Parent.prototype);
  test.isTrue(Child.prototype.childProp);
  test.isTrue(Child.parentStaticProp);

  var c = new Child;
  test.isTrue(c.childProp);
  test.isTrue(c.parentProp);
});

Tinytest.add('Utils - extend', function (test) {
  var calls = [];
  Parent = function () {
    calls.push('Parent');
  };
  Parent.parentStaticProp = true;
  Parent.prototype.parentProp = true;

  // test constructor overloading
  Child = Iron.utils.extend(Parent, {
    constructor: function () {
      calls.push('Child');
    },

    childProp: true
  });

  test.equal(Child.__super__, Parent.prototype);
  test.isTrue(Child.prototype.childProp);
  test.isTrue(Child.parentStaticProp);


  // test regular constructor
  calls = [];
  Child = Iron.utils.extend(Parent);
  var c = new Child;
  test.equal(calls.length, 1);
});

Tinytest.add('Utils - global', function (test) {
  var g = Iron.utils.global;

  if (Meteor.isClient)
    test.equal(g, window);
  if (Meteor.isServer)
    test.equal(g, global);
});

Tinytest.add('Utils - resolve', function (test) {
  var global = (function () { return this; })();

  global.outer = {
    inner: 'value'
  };

  var res = Iron.utils.resolve('outer.inner');
  test.equal(res, 'value', 'unable to resolve on global object');
});

Tinytest.add('Utils - capitalize', function (test) {
  test.equal(Iron.utils.capitalize('lower'), 'Lower');
  test.equal(Iron.utils.capitalize('Lower'), 'Lower');
  test.equal(Iron.utils.capitalize('lowerSomething'), 'LowerSomething');
  test.equal(Iron.utils.capitalize('lower-something'), 'Lower-something');
});

Tinytest.add('Utils - classCase', function (test) {
  test.equal(Iron.utils.classCase('postsShow'), 'PostsShow');
  test.equal(Iron.utils.classCase('posts-show'), 'PostsShow');
  test.equal(Iron.utils.classCase('posts_show'), 'PostsShow');
  test.equal(Iron.utils.classCase('/posts/show'), 'PostsShow');
});

Tinytest.add('Utils - default', function (test) {
  var target = {};
  Iron.utils.defaultValue(target, 'prop', true);
  test.isTrue(target.prop);

  Iron.utils.defaultValue(target, 'prop', false);
  test.isTrue(target.prop);

  var existingValue = Iron.utils.defaultValue(target, 'prop', false);
  test.isTrue(existingValue);
});
