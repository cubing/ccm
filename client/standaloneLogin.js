Template.standaloneLogin.events({
  'click button': function() {
    var vars = Object.keys(window).join(",");
    console.log("HIYA " + vars);//<<<
    AndroidFunction.log('HELLO ' + vars);//<<<
  },
});
