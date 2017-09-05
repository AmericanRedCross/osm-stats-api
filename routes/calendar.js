const ical = require("ical");
const Wreck = require("wreck");

function getGoogleCalendar(calendar, next) {
  const icalUrl = `https://calendar.google.com/calendar/ical/${calendar}/public/basic.ics`;
  Wreck.get(icalUrl, null, (err, res, calEvents) => {
    if (err) {
      return next(err);
    }

    if (res.statusCode !== 200) {
      return next(res.statusCode);
    }

    // parse ical string to jcal and return.
    return next(null, ical.parseICS(calEvents.toString()));
  });
}

// dig into the lovely world of rrule
function parseJcal(Jcal) {
  return Object.keys(Jcal).map(key => {
    if (key.match(/google/)) {
      if (Jcal[key].rrule) {
        // TODO handle repeating code
        return {};
      }

      return {
        name: Jcal[key].summary,
        time: [Jcal[key].start, Jcal[key].end],
        location: Jcal[key].location,
        description: Jcal[key].description
      };
    }

    return { timezone: Jcal[key].tzid };
  });
}

module.exports = [
  {
    method: "GET",
    path: "/calendar/{calendar}/events",
    handler: (req, res) =>
      getGoogleCalendar(req.params.calendar, (error, result) => {
        if (error) {
          return res({
            error
          }).code(500);
        }

        return res(parseJcal(result));
      })
  }
];
