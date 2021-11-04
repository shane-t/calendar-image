const app = require('express')();
const path = require('path')
const generate = require('./generate');

require('dotenv').config()

const password = process.env.PASSWORD

app.get('/bmp', async (req, res) => {
  console.log(new Date(), 'bmp');

  if (!req.query?.password?.includes(password)) {
    return res.status(401).end('nope');
  }

  res.sendFile(path.join(__dirname,'out.bmp'));

});

app.get('/raw', async (req, res) => {
  console.log(new Date(), req.url);

  if (!req.query?.password?.includes(password)) {
    return res.status(401).end('nope');
  }

  res.sendFile(path.join(__dirname,'out.raw'));

});

app.get('/success', (req, res) => {
  console.log(new Date(), req.url);
  return res.send("OK");
})

app.listen(process.env.PORT);

// Create a new image every 15 minutes
generate().then(() => {
  setInterval(generate, 900000)
})
