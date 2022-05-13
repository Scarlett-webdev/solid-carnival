//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const https = require("https");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
  secret: process.env.PP_SECRT,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect(process.env.DB_URL, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// });
// mongoose.set("useCreateIndex", true);


// connect to Mongoose
mongoose.connect("mongodb+srv://ScarlettAdmin:" + process.env.MONPASS +"@cluster0.rxqdw.mongodb.net/"+ process.env.MONDBNAME +"?retryWrites=true&w=majority");



// Schemas

const profileSchema = new mongoose.Schema({
  username: String,
  password: String,
});

profileSchema.plugin(passportLocalMongoose);

const Profile = mongoose.model("Profile", profileSchema);

passport.use(Profile.createStrategy());

passport.serializeUser(Profile.serializeUser());
passport.deserializeUser(Profile.deserializeUser());

const userSchema = new mongoose.Schema({
  fName: String,
  lName: String,
  email: String,
  age: {
        type: Boolean,
        default: false
      },
});

const User = mongoose.model("User", userSchema);


//Routes
//function to redirect to login
// function reLogin(req, res) {
//   res.redirect("/login");
// }

app.get("/", function(req, res) {
  res.render("mailing-list");
});

app.post("/mailing-list", function(req, res) {


  //attempt to create profile (copied)
  if (req.body.age == "on") {
    age = true;
  } else {
    age = false;
  }

  const user = new User({
    fName: _.toLower(req.body.fName),
    lName: _.toLower(req.body.lName),
    email: _.toLower(req.body.email),
    age: age,
  });

  user.save();

  Profile.register({
    username: _.toLower(req.body.email)
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.render("failed");
    } else {
      console.log("user created");
      req.login(user, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("user isAuthenticated");
          if (req.body.authCheck == "on") {

            const fName = req.body.fName;
            const lName = req.body.lName;
            const email = req.body.email;

            const mailingData = {
              members: [{
                email_address: email,
                status: "subscribed",
                merge_fields: {
                  FNAME: fName,
                  LNAME: lName,
                }
              }]
            };

            const jsonMailData = JSON.stringify(mailingData);

            const options = {
              method: "POST",
              auth: process.env.MX_AUTH
            };

            const request = https.request(process.env.MX_URL, options, function(response) {

              if (response.statusCode === 200) {
                res.render("success");
              } else {
                res.render("failed");
              }
            });

            request.write(jsonMailData);
            request.end();

          } else {
            res.render("nmSuccess");
          }
        }
      });
    }
  });
});

app.get("/success", function(req, res) {
  res.render("success");
});
app.get("/failed", function(req, res) {
  res.render("failed");
});

app.get("/outline", function(req, res) {
  res.render("outline");
});

app.get("/home", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "welcome";
    res.render("core", {
      guts: guts
    });
  } else {
    res.render("events");
  }
});

//function username to lower case before login
function lowerLogin(req, res, next) {
  req.body.username = _.toLower(req.body.username);
  next();
}

app.post("/login", lowerLogin,
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login"
  }),
  function(req, res) {
    console.log("user isAuthenticated");
  }
);

app.post("/register", function(req, res) {

  if (req.body.age == "on") {
    age = true;
  } else {
    age = false;
  }

  const user = new User({
    fName: _.toLower(req.body.fName),
    lName: _.toLower(req.body.lName),
    email: _.toLower(req.body.username),
    age: age,
  });

  user.save();

  Profile.register({
    username: _.toLower(req.body.username)
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/login");
    } else {
      console.log("user created");
      req.login(user, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("user isAuthenticated");
          res.redirect("/home");
        }
      });
    }
  });
});

app.get("/logster", function(req, res) {
  var formName = "register";
  res.render("logster", {
    formName: formName
  });
});
app.get("/register", function(req, res) {
  var formName = "register";
  res.render("logster", {
    formName: formName
  });
});
app.get("/login", function(req, res) {
  var formName = "login";
  res.render("logster", {
    formName: formName
  });
});

app.post("/logster", function(req, res) {
  const toLog = req.body.toLog;
  const toReg = req.body.toReg;

  if (toLog === "switchButtonPressed") {
    console.log("switch button pressed");
    fmName = "login";
  } else if (toReg === "switchBackButtonPressed") {
    console.log("switch back button pressed");
    fmName = "register";
  } else {
    console.log("somptin wrong");
  }

  formName = fmName;
  res.render("logster", {
    formName: formName
  });
});

app.get("/donate", function(req, res) {
  res.render("donate");
});

app.get("/logout", function(req, res) {
  req.logout();
  res.render("logout");
});

app.get("/sters", function(req, res) {
  res.render("sters");
});

app.get("/profile", function(req, res) {
  if (req.isAuthenticated()) {
    console.log("user isAuthenticated");
    User.find({
      email: _.toLower(req.user.username)
    }, function(err, doc) {
      if (err) {
        console.log(err);
      } else {
        doc.forEach(function(info) {
            fName = _.upperFirst(info.fName);
            lName= _.upperFirst(info.lName);
            email = info.email;
            if (info.age == true) {
              ageVer = "are";
            } else {
              ageVer = "are not";
            }
          res.render("profile", {
            fName:fName,
            lName:lName,
            email:email,
            ageVer:ageVer,
          });
        });
      }
    });
  } else {
    // console.log("Does not compute...");
    res.redirect("/login");
  }
});



//The guts

//function to authenticate and render core with guts
// function renderCore(req, res) {
//   if (req.isAuthenticated()) {
//     console.log("user isAuthenticated");
//     res.render("core", {
//       guts: guts
//     });
//   } else {
//     res.redirect("/login");
//   }
// }

// function renderCore(req, res){
//   console.log("user isAuthenticated");
//   res.render("core", {guts:guts});
// }

app.get("/bar", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "barOptions";
    console.log("user isAuthenticated");
    res.render("core", {guts:guts});
  } else {
    res.redirect("/login");
  }
});
app.post("/bar", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "barVideo";
    console.log("user isAuthenticated");
    res.render("core", {guts:guts});
  } else {
    res.redirect("/login");
  }
});
app.get("/stage", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "stage";
    console.log("user isAuthenticated");
    res.render("core", {guts:guts});
  } else {
    res.redirect("/login");
  }
});
app.get("/merch", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "merch";
    console.log("user isAuthenticated");
    res.render("core", {guts:guts});
  } else {
    res.redirect("/login");
  }
});
app.get("/chat", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "chat";
    console.log("user isAuthenticated");
    res.render("core", {guts:guts});
  } else {
    res.redirect("/login");
  }
});
app.get("/insideChat", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "insideChat";
    console.log("user isAuthenticated");
    res.render("core", {guts:guts});
  } else {
    res.redirect("/login");
  }
});
app.get("/food", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "food";
    console.log("user isAuthenticated");
    res.render("core", {guts:guts});
  } else {
    res.redirect("/login");
  }
});
app.get("/events", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "events";
    console.log("user isAuthenticated");
    res.render("core", {guts:guts});
  } else {
    res.redirect("/login");
  }
});
app.get("/backstage", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "backstage";
    console.log("user isAuthenticated");
    res.render("core", {guts:guts});
  } else {
    res.redirect("/login");
  }
});
app.get("/arcade", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "arcade";
    console.log("user isAuthenticated");
    res.render("core", {guts:guts});
  } else {
    res.redirect("/login");
  }
});
app.get("/bathroom", function(req, res) {
  if (req.isAuthenticated()) {
    guts = "bathroom";
    console.log("user isAuthenticated");
    res.render("core", {guts:guts});
  } else {
    res.redirect("/login");
  }
});


//Ports

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("App is running on port whatever");
});
