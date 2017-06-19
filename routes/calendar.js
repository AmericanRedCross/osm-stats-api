var ical = require('ical');
var Wreck = require('wreck');

function getGoogleCalendar (calendar, next) {
  const icalUrl = 'https://calendar.google.com/calendar/ical/' + calendar + '/public/basic.ics';
  Wreck.get(icalUrl, null, function (err, res, calEvents) {
    if (err) {
      return next(err);
    }
    if (res.statusCode !== 200) {
      return next(res.statusCode);
    }
    // parse ical string to jcal and return.
    next(null, ical.parseICS(calEvents.toString()));
  });
}

// dig into the lovely world of rrule
function parseJcal (Jcal) {
  return Object.keys(Jcal).map(function (key, val) {
    if (key.match(/google/)) {
      if (Jcal[key].rrule) {
        // TODO handle repeating code
      } else {
        return {
          'name': Jcal[key].summary,
          'time': [Jcal[key].start, Jcal[key].end],
          'location': Jcal[key].location,
          'description': Jcal[key].description
        };
      }
    } else {
      return {'timezone': Jcal[key].tzid};
    }
  });
}

module.exports = [
  {
    method: 'GET',
    path: '/calendar/{calendar}/events',
    handler: function (req, res) {
      return getGoogleCalendar(req.params.calendar, function (error, result) {
        if (error) {
          return res({
            error: error
          }).code(500);
        }
        var parsedJcal = parseJcal(result);
        return res(parsedJcal);
      });
    }
  }
]
