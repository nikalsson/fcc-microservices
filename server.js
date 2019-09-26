// require components
const   express = require('express'),
        app = express(),
        dns = require('dns'), // dns module needed in the URL shortener
        cors = require('cors'), // enable CORS (https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) so that your API is remotely testable by FCC
        mongoose = require('mongoose'), // mongoose for MongoDB database usage
        multer = require('multer'); // middleware for handling multipart/form-data, which is primarily used for uploading files 

// configure the app
app.set('view engine', 'ejs');
app.use(cors({optionSuccessStatus: 200}));  // some legacy browsers choke on 204
app.use(express.static('public')); // http://expressjs.com/en/starter/static-files.html
app.use(express.urlencoded({extended: true})) // Use express.urlencoded({extended: true}) to extract the body of a POST request

mongoose.connect(process.env.MLABURI, {useNewUrlParser: true, useUnifiedTopology: true}); // connect to the MLab database
const Schema = mongoose.Schema


// configure multer for file upload
const storage = multer.diskStorage({ // configure storing files to disk - the files do not appear properly in Glitch GUI but console shows that they are uploaded successfully
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  }
})

const upload = multer({ 
  storage: storage,
  limits: {
    fieldSize: 1024 // 1 MB (max file size)
  }
})

// serve the index page
app.get("/", (req, res) => {
  res.render('index');
});


// API Project: File Metadata Microservice

// GET file upload page and form
app.get("/api/file-upload", (req, res) => {
  res.render('file-upload');
})

// POST post the file
app.post("/api/file-upload", upload.single('upfile'), async (req, res) => {
  const upfile = req.file;
  if (!upfile) { // If user did not select a file
    res.json({error: "No file was selected!"});
  } 
  
  // Display the information desired by freeCodeCamp task on successful upload
  else { 
    res.json({
      success: "The file was uploaded",
      filename: upfile.originalname,
      size: upfile.size
    })
  }
})


// API Project: Timestamp Microservice 
app.get("/api/timestamp/:date_string?", (req, res) => {
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
  res.render('add-url', {shortURLs: shortURLs, errorMessage: errorMessage});
})

// GET route for shortcut URL, a hit redirects to the target page
app.get('/api/shorturl/:url', (req, res) => {
  const urlIndex = req.params.url
  if (shortURLs[urlIndex]) {
    res.redirect(shortURLs[urlIndex])
  }
  
  else { // If the shortcut does not exist, display error and render add page
    errorMessage = `Shortcut #${urlIndex} does not exist`;
    res.render('add-url', {shortURLs: shortURLs, errorMessage: errorMessage});
  }
})

// POST route for adding new URLs to the list
app.post('/api/shorturl/new', (req, res) => {
  if (/^http/.test(req.body.url)) { // Test if the given address starts with http
    
    let wwwAddress = req.body.url.split('//')[1].split('/')[0] // Get the address without https:// and without /xxx for dns module
    dns.lookup(wwwAddress, (error, address) => {
      if (address === undefined) { // dns.lookup does not recognize the accept -> invalid url
        errorMessage = 'Error: invalid URL, please try again';
        res.render('add-url', {shortURLs: shortURLs, errorMessage: errorMessage});
      } 

      else { // Add url to the URL KV pairs and re-load the page
        errorMessage = null;
        let urlIndex = Object.keys(shortURLs).length + 1;
        shortURLs[urlIndex] = req.body.url // Add the url to the shortURLs object
        res.render('add-url', {shortURLs: shortURLs, errorMessage: errorMessage}); // Re-render the add-url page to keep the list updated
      } 
    })  
  }
  
  else { // Address does not start with http -> invalid url
    errorMessage = 'Error: invalid URL, please try again';
    res.render('add-url', {shortURLs: shortURLs, errorMessage: errorMessage});
  }
})


// API Project: Exercise Tracker
// First set up the user and exercise schemas, they are associated with each other
const userSchema = new Schema({
  username: String,
  exercises: [
    { // Associate Exercise from model with the user
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise"
    }
  ]
})

const exerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: Date,
  author: {
    id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // refers to the model that is referred to with ObjectId above - User model
      },
      username: String,
    }
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

// GET - Serve the form for adding users or exercies
app.get("/api/exercises", (req, res) => {
  res.render('exercise-tracker');
})

//GET - Get an array of all the users
app.get("/api/exercises/users", async (req, res) => {
  User.find({}, (error, foundUsers) => {
    res.json(foundUsers)
  })
})


// POST - Add a new user
app.post("/api/exercises/new/user", async (req, res) => {
  const username = req.body.username;
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };
  let tryToCreate = await User.findOneAndUpdate({username: username}, options, (error, result) => {
    if (!error) {
      // If the user exists, return error
      if (result) {
        res.json({error: 'username already exists'})
      } 
      
      // If the user doesn't exist, create it and save to DB
      else {
        result = new User({username: username});
        result.save((error) => {
          if (!error) {
              res.json({'new user': result})
          } else {
              throw error;
          }
        })
      }
    } else {
      throw error;
    }
  })
})

// POST - Add a new exercise for a user
app.post("/api/exercises/new/exercise", async (req, res) => {
  const query = {username: req.body.username}
  const exerciseDate = (req.body.date) ? req.body.date : new Date(); // If the date is not given, use the day of posting
  const exerciseObject = {description: req.body.description, duration: req.body.duration, date: exerciseDate}
  let tryToCreate = await User.findOne(query, (error, foundUser) => { // Find the user first
    if (error) {
      console.log(error)
      res.json({error: error})
    } else if (foundUser === null) { // If user is not found
      res.json({error: "User not found!"})
    }
    Exercise.create(exerciseObject, (error, createdExercise) => { // If all is well, create exercise
      if (error) {
        console.log(error)
        res.json({error: error})
      }
      // Add the author info to the created exercise and save the exercise to it's database and the reference to it to the user's data, save both
      createdExercise.author.id = foundUser._id
      createdExercise.author.username = foundUser.username
      createdExercise.save();
      foundUser.exercises.push(createdExercise)
      foundUser.save();
      res.json({Created: createdExercise})
    })
  })
})

// GET - Exercises for a specific user, possibility of filtering by date, from, to & limit are not mandatory
// use the following syntax for filtering log/user&from=2010-01-01&to=2019-10-01&limit=20
app.get("/api/exercises/log/:username", async (req, res) => {
  // Set default parameters for the query if user does not input them
  const username = req.params
  const fromDate = (req.query.from) ? new Date(req.query.from) : new Date('1900-01-01')
  const toDate = (req.query.to) ? new Date(req.query.to) : new Date('2100-01-01')
  const limit = (req.query.limit) ? req.query.limit : 10
  
  // First find the user based on the username, then find their exercises using populate, remove author, id and __v info using select, filter by date from, date to using match and limit the number of results 
  let tryToFind = await User.findOne(username)
    .populate({path: 'exercises', select: '-author -_id -__v', match: { date: { $gte: fromDate, $lte: toDate }}, options: {limit: limit}})
    .exec((error, foundPerson) => {
    if (error) {console.log(error)}
      else if (foundPerson === null) { res.json({error: "User not found!"}) }
      else {
        res.json({"Found exercises": foundPerson, "Exercise count": foundPerson.exercises.length})
      }
    })
})

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});