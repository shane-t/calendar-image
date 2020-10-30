const app = require('express')();
const path = require('path')
const generate = require('./generate');

require('dotenv').configure()

const password = process.env.PASSWORD

app.get('/', async (req, res) => {

  if (!req.query?.password?.includes(PASSWORD)) {
    return res.status(401).end('nope');
  }

  res.sendFile(path.join(__dirname,'out.bmp'));

});

app.get('/raw', async (req, res) => {

  if (!req.query?.password?.includes(PASSWORD)) {
    return res.status(401).end('nope');
  }

  res.sendFile(path.join(__dirname,'out.bmp'));

});

app.listen(1984);

// Create a new image every 15 minutes
generate().then(() => {
  setInterval(generate, 900000)
})
