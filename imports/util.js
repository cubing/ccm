import jstz from 'jstz';

export function roundName(roundCode) {
  return wca.roundByCode[roundCode].name;
};

export function eventName(eventCode) {
  return wca.eventByCode[eventCode].name;
};

export function formatName(formatCode) {
  return wca.formatByCode[formatCode].name;
};

export function formatShortName(formatCode) {
  return wca.formatByCode[formatCode].shortName;
};

export function wcaFormats() {
  return wca.formats;
};

export function softCutoffFormatName(softCutoffFormatCode) {
  return wca.softCutoffFormatByCode[softCutoffFormatCode].name;
};

export function eventAllowsCutoffs(eventCode) {
  return wca.eventAllowsCutoffs(eventCode);
};

export function competitionAttr(attribute) {
  let competition = Competitions.findOne(this.competitionId);
  return competition ? competition[attribute] : null;
};

export function roundEventCode() {
  return getRound(this.roundId).eventCode;
};
export function roundRoundCode() {
  return getRound(this.roundId).roundCode();
};
export function roundFormatCode() {
  return getRound(this.roundId).formatCode;
};

export function userIsSiteAdmin() {
  return Meteor.user() && Meteor.user().siteAdmin;
};

export function toAtMostFixed(n, fixed) {
  // Neat trick from http://stackoverflow.com/a/18358056
  return +(n.toFixed(fixed));
};


clockFormat = function(solveTime) {
  return jChester.solveTimeToStopwatchFormat(solveTime);
};

export function clockFormat(solveTime) {
  return clockFormat(solveTime);
};

isRegisteredForCompetition = function(userId, competitionId) {
  let competition = Registrations.findOne({
    competitionId: competitionId,
    userId: userId,
  }, {
    fields: { _id: 1 }
  });
  return !!competition;
};

export function isRegisteredForCompetition(userId) {
  return isRegisteredForCompetition(userId, this.competitionId);
};

minutesToPrettyTime = function(timeMinutes) {
  let duration = moment.duration(timeMinutes, 'minutes');
  let timeMoment = moment({
    hour: duration.hours(),
    minutes: duration.minutes(),
  });
  return timeMoment.format("h:mma");
};
export function minutesToPrettyTime(timeMinutes) {
  return minutesToPrettyTime(timeMinutes);
};

const LOCAL_TIMEZONE = jstz.determine().name();

const DATE_FORMAT = "LL";
const ISO_DATE_FORMAT = "YYYY-MM-DD";
const DATETIME_FORMAT = "LLLL z";

formatMomentDate = function(m) {
  return m.utc().format(DATE_FORMAT);
};

formatMomentDateIso8601 = function(m) {
  let iso8601Date = m.utc().format(ISO_DATE_FORMAT);
  return iso8601Date;
};

formatMomentDateTime = function(m) {
  return m.tz(LOCAL_TIMEZONE).format(DATETIME_FORMAT);
};

export function formatMomentDate(m) {
  return formatMomentDate(m);
};

export function formatMomentDateTime(m) {
  return formatMomentDateTime(m);
};
