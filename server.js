const express = require("express");
const bodyParser = require("body-parser");
const expressSession = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
//
const { mongoose } = require("./models/database.js");
const { User } = require("./models/user.js");

const app = express();

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true, limit: "10000mb", parameterLimit: 100000 }));

app.use(
  expressSession({
    key: "user_sid",
    secret: "iotelpiji",
    resave: true,
    saveUninitialized: true,
    cookie: {
      expires: 600000,
    },
  })
);

app.set("view engine", "ejs");

app.listen(3000, () => {
  console.log("Server started on http://localhost:3000");

  app.get("/", (req, res) => {
    res.render("index");
  });

  app.get("/spec", (req, res) => {
    res.render("spec");
  });

  app.get("/dashboard", (req, res) => {
    isLogin = req.session.user ? true : false;
    if (isLogin) {
      res.render("dashboard");
    } else {
      res.redirect("/login");
    }
  });

  app.get("/register", (req, res) => {
    res.render("register", {
      error: "",
      message: "",
    });
  });

  app.post("/register", async (req, res) => {
    try {
      const users = await User.findOne({ email: req.body.email });
      const names = await User.findOne({ name: req.body.name });
      if (users || names) {
        res.render("register", {
          error: "User already exists",
          message: "",
        });
      } else {
        bcrypt.hash(req.body.password, 10, async (err, hash) => {
          const user = new User({
            username: req.body.username,
            email: req.body.email,
            password: hash,
          });
          await user.save();
          res.redirect("/login");
        });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/login", (req, res) => {
    isLogin = req.session.user ? true : false;
    if (!isLogin) {
      res.render("login", {
        message: "",
        error: "",
      });
    } else {
      res.redirect("/dashboard");
    }

    app.post("/login", async (req, res) => {
      const user = await User.findOne({ email: req.body.email });
      if (!user) {
        res.render("login", {
          error: "Email does not exist",
          message: "",
        });
      } else {
        bcrypt.compare(req.body.password, user.password, (err, result) => {
          if (result) {
            req.session.user = user;
            res.redirect("/dashboard");
          } else {
            res.render("login", {
              message: "",
              error: "Wrong password",
            });
          }
        });
      }
    });

    app.get("/logout", (req, res) => {
      req.session.destroy((err) => {
        if (err) {
          return console.log(err);
        }
        res.redirect("/");
      });
    });
  });
});
