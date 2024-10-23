const client = require('./client');
const moment = require('moment-timezone');
const fs = require('fs');
const { createCanvas } = require('canvas');
const { spawn } = require('child_process')
const bmp = require("./bmp");


const accounts = [
  { credentials : 'credentials-shane.odlum.json', token: 'token-shane.odlum.json' },
  { credentials : 'credentials-muldots.json', token: 'token-muldots.json' }
]

const CANVAS_WIDTH=800;
const CANVAS_HEIGHT=480;
const FONT='Helvetica'
const DATE_VERTICAL_PADDING=5;
const DATE_HORIZONTAL_PADDING=5;
const DATE_FONT_SIZE=24;
const DATE_HEIGHT = DATE_VERTICAL_PADDING + DATE_FONT_SIZE + DATE_VERTICAL_PADDING; // 30
const EVENT_VERTICAL_MARGIN=2; // before/after border
const EVENT_HORIZONTAL_MARGIN=5;
const EVENT_BORDER=1;
const EVENT_VERTICAL_PADDING=3;
const EVENT_HORIZONTAL_PADDING=5;
const EVENT_TITLE_FONT_SIZE=24;
const EVENT_MIDDLE_PADDING=3;
const EVENT_DETAIL_FONT_SIZE=16;
const EVENT_HEIGHT=EVENT_VERTICAL_MARGIN + EVENT_BORDER + EVENT_VERTICAL_PADDING + EVENT_TITLE_FONT_SIZE + EVENT_MIDDLE_PADDING + EVENT_DETAIL_FONT_SIZE + EVENT_VERTICAL_PADDING + EVENT_BORDER + EVENT_VERTICAL_MARGIN;
const EVENT_BOX_HEIGHT=EVENT_HEIGHT - (EVENT_VERTICAL_MARGIN * 2) // Total height including border
const EVENT_BOX_WIDTH=CANVAS_WIDTH - (EVENT_HORIZONTAL_MARGIN * 2) // Total width including border
const EVENT_TIME_FONT_SIZE=32;
const EVENT_TIME_RIGHT_OFFSET=200;
const DEBUG_FONT_SIZE=12;
const DEBUG_TOP_OFFSET=2;
const DEBUG_RIGHT_OFFSET=250;

console.log(`Event height: ${EVENT_HEIGHT}`)

function truncate(string, length) {
  if (string.length > length) {
    return string.substring(0, length) + '...'
  }
  return string
}

function filter(e) {
  return !/via Clockwise/.test(e.summary)
}

function sort(a, b) {
  return moment(a.start.dateTime || a.start.date).diff(b.start.dateTime || b.start.date);
}

function format(e) {
  let summary

  if (e.summary) {
    summary = e.summary
  } else {
    summary = "(No title)"
  }
  const obj = {
    summary: truncate(summary, 44),
    creator: e.creator,
    status: e.status,
    start: moment(e.start.dateTime || e.start.date).tz('Europe/Dublin'),
    end: moment(e.end.dateTime || e.end.date).tz('Europe/Dublin'),
    ongoing : moment(e.start.dateTime || e.start.date) < moment() && moment(e.end.dateTime || e.end.date) > moment(),
    day: moment(e.start.dateTime || e.start.date).format('YYYY-MM-DD - dddd'),
    attendees: e.attendees?.length
  }

  if (e.location) obj.location = truncate(e.location, 67);
  if (e.conferenceData?.conferenceId) obj.conferenceId = truncate(e.conferenceData.conferenceId, 67);

  return obj
}

function groupByDate(acc, curr) {
  let currDay = acc.find(day => day.day === curr.day)
  if (!currDay) {
    currDay = { day : curr.day, events : [] }
    acc.push(currDay)
  }

  currDay.events.push(curr)
  return acc
}

module.exports = async function go() {
  const events = await Promise.all(accounts.map(account => client(account.credentials, account.token, 20)));

  console.log(new Date())
  const merged = [].concat.apply([], events);
  console.log(merged.length, 'events retrieved');

  const grouped = merged.filter(filter).sort(sort).map(format).reduce(groupByDate, [])
  
  console.log(JSON.stringify(grouped, null, '  '));

  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);

  let remainingHeight = CANVAS_HEIGHT;

  const ctx = canvas.getContext('2d')
  ctx.antialias = 'none';

  // Fill with white
  ctx.fillStyle = '#FFF'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#000'

  //debug 
  ctx.font = `${DEBUG_FONT_SIZE}px ${FONT}`
  const debugYStart = (CANVAS_HEIGHT - remainingHeight) + DEBUG_FONT_SIZE + DEBUG_TOP_OFFSET;
  const debugXStart = CANVAS_WIDTH - DEBUG_RIGHT_OFFSET;
  ctx.fillText('gen:' + new Date().toLocaleString(), debugXStart, debugYStart)

  loop:
  for (const day of grouped) {
    // Write date
    
    if (remainingHeight < DATE_HEIGHT  + EVENT_HEIGHT) { // dont write date if there isn't enough room for another event
      console.log('Filled image during date');
      break
    }

    ctx.font = `${DATE_FONT_SIZE}px ${FONT}`;

    const yStart = (CANVAS_HEIGHT - remainingHeight) + DATE_VERTICAL_PADDING + DATE_FONT_SIZE; // text starts from bottom

    console.log(yStart)

    ctx.fillText(day.day, DATE_HORIZONTAL_PADDING, yStart)

    remainingHeight -= DATE_HEIGHT;

    console.log(`${remainingHeight} remains`)


    for (const ev of day.events) {
      if (remainingHeight < (EVENT_HEIGHT)) {
        console.log('Filled image during event')
        break loop;
      }

      // border / box

      const boxYStart = (CANVAS_HEIGHT - remainingHeight) + EVENT_VERTICAL_MARGIN
      ctx.beginPath();
      ctx.lineWidth = EVENT_BORDER + (!!ev.ongoing * 2);
      ctx.rect(EVENT_HORIZONTAL_MARGIN, boxYStart, EVENT_BOX_WIDTH, EVENT_BOX_HEIGHT);
      ctx.stroke()

      // Event title
      ctx.font = `${EVENT_TITLE_FONT_SIZE}px bold ${FONT}`
      const titleYStart = (CANVAS_HEIGHT - remainingHeight) + EVENT_VERTICAL_MARGIN + EVENT_VERTICAL_PADDING + EVENT_TITLE_FONT_SIZE;
      ctx.fillText(ev.summary, EVENT_HORIZONTAL_MARGIN + EVENT_HORIZONTAL_PADDING, titleYStart);

      // Event time
      ctx.font = `${EVENT_TIME_FONT_SIZE}px ${FONT}`
      const timeYStart = (CANVAS_HEIGHT - remainingHeight) + EVENT_VERTICAL_MARGIN + EVENT_VERTICAL_PADDING + EVENT_TIME_FONT_SIZE;
      const timeXStart = CANVAS_WIDTH - EVENT_TIME_RIGHT_OFFSET;
      ctx.fillText(ev.start.format('HH:mm-') + ev.end.format('HH:mm'), timeXStart, timeYStart)

      // Event detail
      ctx.font = `${EVENT_DETAIL_FONT_SIZE}px ${FONT}`
      const detailYStart = (CANVAS_HEIGHT - remainingHeight) + EVENT_VERTICAL_MARGIN + EVENT_VERTICAL_PADDING + EVENT_TITLE_FONT_SIZE + EVENT_MIDDLE_PADDING + EVENT_DETAIL_FONT_SIZE;
      const detailText = ev.location ? 
        ev.location : ev.conferenceId ? 
          ev.conferenceId : '';

      ctx.fillText(detailText, EVENT_HORIZONTAL_MARGIN + EVENT_HORIZONTAL_PADDING, detailYStart)

      remainingHeight -= EVENT_HEIGHT;
    }

  }

  const file = canvas.toBuffer('image/png')

  fs.writeFileSync('out.png', file);

  // convert out.png  -colors 2 +dither -type bilevel out.bmp
  
  const child = spawn('convert', ['out.png', '-colors', '2', '+dither', '-type', 'bilevel', 'out.bmp']);

  for await (const data of child.stdout) {
    console.log(`stdout from the child: ${data}`);
  }

  for await (const data of child.stderr) {
    console.log(`stderr from the child: ${data}`);
    throw(data)
  }

  console.log('Converted to bitmap');

  const bmpBuffer = fs.readFileSync('out.bmp');

  bmp(bmpBuffer, 'out.raw');
};

