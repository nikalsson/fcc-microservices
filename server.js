// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();

// dns module needed in the URL shortener
const dns = require('dns')

// enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
// so that your API is remotely testable by FCC 
var cors = require('cors');
app.use(cors({optionSuccessStatus: 200}));  // some legacy browsers choke on 204


app.set('view engine', 'ejs');

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

// API Project: Request Header Parser Microservice
app.get('/api/whoami', (req, res) => {
  // Client IP from headers X-Forwarded-For: client, proxy1, proxy2 -- get the first address using split()
  const ipaddress = req.headers['x-forwarded-for'].split(',')[0]
  const language = req.headers['accept-language'];
  const software = req.headers['user-agent']
  
  const returnJSON = {"ipaddress": ipaddress, "language": language, "software": software}
  
  res.json(returnJSON);
})

// API Project: URL Shortener Microservice -- does not save the URLs to any DB!
let shortURLs = {1: "http://www.sodankyla.fi/Pages/Etusivu.aspx", 2: "https://luosto.fi/"}
let errorMessage = null;

// GET route for the input form and a list of shortened URLs
app.get('/api/shorturl', (req, res) => {
  errorMessage = null
  res.render('add-url.ejs', {shortURLs: shortURLs, errorMessage: errorMessage});
})

// GET route for shortcut URL, a hit redirects to the target page
app.get('/api/shorturl/:url', (req, res) => {
  const urlIndex = req.params.url
  if (shortURLs[urlIndex]) {
    res.redirect(shortURLs[urlIndex])
  }
  
  else { // If the shortcut does not exist, display error and render add page
    errorMessage = `Shortcut #${urlIndex} does not exist`;
    res.render('add-url.ejs', {shortURLs: shortURLs, errorMessage: errorMessage});
  }
})

// POST route for adding new URLs to the list
app.post('/api/shorturl/new', express.urlencoded({extended: true}), (req, res) => { // Use express.urlencoded({extended: true}) to extract the body of a POST request, not used as a middleware for all routes in this task just for experiment's sake
  if (/^http/.test(req.body.url)) { // Test if the given address starts with http
    
    let wwwAddress = req.body.url.split('//')[1].split('/')[0] // Get the address without https:// and without /xxx for dns module
    dns.lookup(wwwAddress, (error, address) => {
      if (address === undefined) { // dns.lookup does not recognize the accept -> invalid url
        errorMessage = 'Error: invalid URL, please try again';
        res.render('add-url.ejs', {shortURLs: shortURLs, errorMessage: errorMessage});
      } 

      else { // Add url to the URL KV pairs and re-load the page
        errorMessage = null;
        let urlIndex = Object.keys(shortURLs).length + 1;
        shortURLs[urlIndex] = req.body.url // Add the url to the shortURLs object
        res.render('add-url.ejs', {shortURLs: shortURLs, errorMessage: errorMessage}); // Re-render the add-url page to keep the list updated
      } 
    })  
  }
  
  else { // Address does not start with http -> invalid url
    errorMessage = 'Error: invalid URL, please try again';
    res.render('add-url.ejs', {shortURLs: shortURLs, errorMessage: errorMessage});
  }
})


// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});