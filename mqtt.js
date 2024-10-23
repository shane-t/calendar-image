const host = 'mqtt.shanet.ie'
const port = 1883
const topic = "notifier/message"

const username = 'shanet'
const password = 'Squidgy302'

const mqtt = require('mqtt')

const client = mqtt.connect('mqtt://' + host, {
  clientId: 'calendar',
  username,
  password,
  port
})

console.log("connected flag  "+client.connected);


client.on('connect', () => {
  console.log('connected to mqtt');
});


client.on("error",function(error){ console.log("Can't connect"+error)});

module.exports = message => {
  client.publish(topic, message);
}
