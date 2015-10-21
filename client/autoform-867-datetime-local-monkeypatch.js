// Dirty workaround for https://github.com/aldeed/meteor-autoform/issues/867
AutoForm.Utility.dateToNormalizedLocalDateAndTimeString = function dateToNormalizedLocalDateAndTimeString(date, timezoneId) {
  let m = moment(date);
  // by default, we assume local timezone; add moment-timezone to app and pass timezoneId
  // to use a different timezone
  if(typeof timezoneId === "string") {
    if(typeof m.tz !== "function") {
      throw new Error("If you specify a timezoneId, make sure that you've added a moment-timezone package to your app");
    }
    m.tz(timezoneId);
  }
  return m.format("YYYY-MM-DD[T]HH:mm");//CCM
  //CCM return m.format("YYYY-MM-DD[T]HH:mm:ss.SSS");
};
