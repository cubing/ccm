// A workaround for https://github.com/aldeed/meteor-autoform/issues/774
// Once this issue has been resolved, we can remove this.
AutoForm.Utility.dateToDateStringUTC = function(date) {
  return formatMomentDateIso8601(moment(date));
};
