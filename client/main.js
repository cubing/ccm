import '/imports/vendor/jquery-3.0.0.min.js';
import '/imports/vendor/bootstrap.min.js';

// get rid of Maximum CallStack errors caused by bootbox and react-bootstrap modals
$.fn.modal.Constructor.prototype.enforceFocus = function() {};

import '/imports/startup/client/';
