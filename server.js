// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionSuccessStatus: 200}));  // some legacy browsers choke on 204

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});


// API Project: Timestamp Microservice 
app.get("/api/timestamp/:date_string?", function (req, res) {
  const userInput = req.params.date_string
  const unixDate = new RegExp('^\\d+$'); // Match Unix date in numbers
  const ISODate = new RegExp(/^(\d{4})-(\d{1,2})-(\d{1,2})/) // Match YYYY-MM-DD and YYYY-M-D
  
  let returnJSON = {"error" : "Invalid Date"}
  
  if ( unixDate.test(userInput) || ISODate.test(userInput)){
    
    // If the date is in unix format, convert to a number with parseInt
    let date = (unixDate.test(userInput)) ? new Date(parseInt(userInput)) : new Date(userInput);

    // If the date is in ISO format but incorrect, do not change the returnJSON
    if (typeof date === 'object' && new Date(date) == "Invalid Date") {
      null
    } 
    
    // If the date string is valid the api returns a JSON having the following structure
    else {
      returnJSON = {
        "unix": date.getTime(),
        "utc" : date.toUTCString()
      }  
    }
  }
  
  // console.log(unixDate.test(date))
  res.json(returnJSON);
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});