if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const session = require("express-session");
const flash = require("connect-flash");
const mongoose = require("mongoose");
const AppError = require("./utils/AppError.js");
const campgrounds = require("./routes/campgrounds");
const reviews = require("./routes/reviews");
const users = require("./routes/users");
const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./models/userModel");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const catchAsync = require("./utils/catchAsync.js");

const MongoStore = require("connect-mongo")(session);
const dbUrl = process.env.DB_URL;

mongoose
  .connect(dbUrl)
  .then(console.log("Connection open!!"))
  .catch((err) => console.log(err));

const store = new MongoStore({
  url: dbUrl,
  secret: process.env.SECRET,
  touchAfter: 24 * 60 * 60,
});

store.on("error", function (e) {
  console.log("Session store error", e);
});

sessionConfig = {
  store,
  name: "modeOn",
  saveUninitialized: true,
  resave: false,
  secret: process.env.SECRET,
  SameSite: "None",
  cookie: {
    httpOnly: true,
    //secure:true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));
app.use(session(sessionConfig));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(mongoSanitize({ replaceWith: "_" }));
const scriptSrcUrls = [
  "https://stackpath.bootstrapcdn.com/",
  "https://api.tiles.mapbox.com/",
  "https://api.mapbox.com/",
  "https://kit.fontawesome.com/",
  "https://cdnjs.cloudflare.com/",
  "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
  "https://kit-free.fontawesome.com/",
  "https://stackpath.bootstrapcdn.com/",
  "https://api.mapbox.com/",
  "https://api.tiles.mapbox.com/",
  "https://fonts.googleapis.com/",
  "https://use.fontawesome.com/",
  "https://cdn.jsdelivr.net",
  "https://cdnjs.cloudflare.com",
];
const connectSrcUrls = [
  "https://api.mapbox.com/",
  "https://a.tiles.mapbox.com/",
  "https://b.tiles.mapbox.com/",
  "https://events.mapbox.com/",
];
const fontSrcUrls = [];
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: [],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", "blob:"],
      objectSrc: [],
      imgSrc: [
        "'self'",
        "blob:",
        "data:",
        "https://res.cloudinary.com/yelpcamplikith02/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT!
        "https://images.unsplash.com/",
        "https://encrypted-tbn0.gstatic.com/images",
        "https://cdn.icon-icons.com",
        "http://i.imgur.com",
      ],
      fontSrc: ["'self'", ...fontSrcUrls],
    },
  })
);

app.locals.moment = require("moment");

passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.set("views engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

app.use(
  catchAsync(async (req, res, next) => {
    res.locals.currentUser = req.user;
    if (req.user) {
      const user = await User.findById(req.user._id).populate(
        "notifications",
        null,
        { isRead: false }
      );
      res.locals.notifications = user.notifications.reverse();
    }
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
  })
);

app.get("/home", (req, res) => {
  res.render("home.ejs");
});

app.use("/", users);
app.use("/campgrounds", campgrounds);
app.use("/campgrounds/:id/reviews", reviews);

app.all("*", (req, res, next) => {
  next(new AppError(404, "Page not found!!"));
});

app.use((err, req, res, next) => {
  const { status = 500 } = err;
  if (!err.message) err.message = "Something went wrong!!";
  res.status(status).render("error.ejs", { err });
});

app.listen(3000, () => {
  console.log("Listening at portal 3000!!");
});
