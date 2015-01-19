var stickyTableById = {};
var stickyTableId = 0;

makeTableSticky = function($table) {
  stickyTableId++;

  $table.stickyTableHeaders();

  // React freaks out if it finds dom nodes that share a data-reactid.
  // Since $.stickyTableHeaders copies the <thead> we generated with react,
  // that copy has a data-reactid. Explicitly removing this attribute seems to
  // be enough to make react happy.
  var $floatingHead = $table.find("thead.tableFloatingHeader");
  $floatingHead.removeAttr('data-reactid');
};

makeTableNotSticky = function($table) {
  var id = $table.data("stickyTableId");
  var $storedTable = stickyTableById[id];
  delete stickyTableById[id];
  $table.stickyTableHeaders('destroy');
};
