const User = require('../models/userModel.js');

module.exports.renderRegister = (req, res) => {
    res.render('users/register.ejs');
}

module.exports.register = async (req, res, next) => {
    try {
        const { firstName, lastName, avatar, phoneNo, username, email, password } = req.body;
        const user = new User({ firstName, lastName, avatar, phoneNo, username, email });
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash('success', 'Welcome to yelpCamp!!');
            res.redirect('/campgrounds');
        })
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
}

module.exports.renderLogin = (req, res) => {
    res.render('users/login.ejs');
}

module.exports.login = async (req, res) => {
    req.flash('success', 'Welcome back!!');
    const redirectUrl = req.session.returnTo || '/campgrounds';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}

module.exports.logout = (req, res, next) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        req.flash('success', 'successfully logged out!!');
        res.redirect('/campgrounds');
    });
}