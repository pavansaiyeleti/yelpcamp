if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: '../.env' });
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const express = require('express');
const passport = require('passport');
const router = express.Router();
const catchAsync = require('../utils/catchAsync.js');
const users = require('../controllers/users.js');
const nodemailer = require('nodemailer');
const { promisify } = require('util')
const randomBytesAsync = promisify(require('crypto').randomBytes)
const User = require('../models/userModel.js');
const AppError = require('../utils/AppError.js');
const { isLoggedIn } = require('../middleware.js');
const Notification = require("../models/notificationModel.js");

const Campground = require('../models/campgroundModel');

router.route('/register')
    .get(users.renderRegister)
    .post(catchAsync(users.register));

router.route('/login')
    .get(users.renderLogin)
    .post(passport.authenticate('local', { failureFlash: true, keepSessionInfo: true, failureRedirect: '/login' }), catchAsync(users.login));

router.get('/logout', users.logout);

router.get('/forgot', (req, res) => {
    res.render('users/forgot.ejs');
})

router.post('/forgot', catchAsync(async (req, res) => {
    const email = req.body.email;
    const user = await User.findOne({ email });
    let token;
    if (!user) {
        req.flash('error', 'No user found with this id!');
        return res.redirect('/forgot');
    }
    token = (await randomBytesAsync(20)).toString('hex');
    const updatedUser = await User.findOneAndUpdate({ email }, { resetPasswordToken: token, resetpasswordExpires: Date.now() + 1000 * 60 * 10 }, { new: true });
    const smtpTransport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            type: 'OAuth2',
            user: 'likithbiyanii@gmail.com',
            clientId: '566006219594-st6qqhps8eeaa1igot4d54baeim1fl4t.apps.googleusercontent.com',
            clientSecret: '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',
            refreshToken: '1//04JjV71D5P3lgCgYIARAAGAQSNwF-L9IrZP-NgC4QS8URd8y2Tl_57397xHTtfZdfT6AxBw-pIT0ceqf22ih9yjL7Iu8n2vvavxQ',
            accessToken: 'ya29.A0ARrdaM-T0nWc_wkBUKrDs_ZwWqEwzB-9yxNPdyE-aAJsSjNrhlJDIx9kxZVUUvxGF_Vig7PcUXfGXXxBWj0TLMY65EFYOqbu54ZNc-IiPM-ZMD5ZsCYcFhQk6CXT5nsyOIlr8Wf_gstJUDlRmBOQn5rE_M5TYUNnWUtBVEFTQVRBU0ZRRl91NjFWcmtLdWcwb2NTa01MbVkyYTF5YWM1UQ0163'
        }
    });
    const mailOptions = {
        to: user.email,
        from: 'yelpCamp <likithbiyanii@gmail.com>',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
    };
    const resp = await smtpTransport.sendMail(mailOptions);
    if (resp) {
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        res.redirect('/forgot');
    }
}))

router.get('/reset/:token', catchAsync(async (req, res) => {
    if (req.isAuthenticated()) {
        req.flash('error', 'You do not have permission to do that!!');
        return res.redirect('/campgrounds');
    }
    const { token } = req.params;
    const user = await User.findOne({ resetPasswordToken: token });
    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
    }
    res.render('users/reset.ejs', { token });
}))

router.post('/reset/:token', catchAsync(async (req, res, next) => {
    if (req.isAuthenticated()) {
        req.flash('error', 'You do not have permission to do that!!');
        return res.redirect('/campgrounds');
    }
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body;
    User.findOne({ resetPasswordToken: token, resetpasswordExpires: { $gt: Date.now() } }, catchAsync(async function (err, user) {
        if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('/forgot');
        }
        if (newPassword !== confirmPassword) {
            req.flash('error', "Password doesn't match confirm password!");
            return res.redirect('/forgot');
        }
        user.resetPasswordToken = '';
        user.resetpasswordExpires = Date.now();
        await user.setPassword(req.body.newPassword);
        await user.save();
        const smtpTransport = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                type: 'OAuth2',
                user: 'likithbiyanii@gmail.com',
                clientId: '566006219594-st6qqhps8eeaa1igot4d54baeim1fl4t.apps.googleusercontent.com',
                clientSecret: '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',
                refreshToken: '1//04JjV71D5P3lgCgYIARAAGAQSNwF-L9IrZP-NgC4QS8URd8y2Tl_57397xHTtfZdfT6AxBw-pIT0ceqf22ih9yjL7Iu8n2vvavxQ',
                accessToken: 'ya29.A0ARrdaM-T0nWc_wkBUKrDs_ZwWqEwzB-9yxNPdyE-aAJsSjNrhlJDIx9kxZVUUvxGF_Vig7PcUXfGXXxBWj0TLMY65EFYOqbu54ZNc-IiPM-ZMD5ZsCYcFhQk6CXT5nsyOIlr8Wf_gstJUDlRmBOQn5rE_M5TYUNnWUtBVEFTQVRBU0ZRRl91NjFWcmtLdWcwb2NTa01MbVkyYTF5YWM1UQ0163'
            }
        });
        const mailOptions = {
            to: user.email,
            from: 'passwordreset@demo.com',
            subject: 'Your password has been changed',
            text: 'Hello,\n\n' +
                'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        const resp = await smtpTransport.sendMail(mailOptions);
        if (resp) {
            req.login(user, async function (err) {
                if (err)
                    throw new AppError(501, err.message);
                req.flash('success', 'Success! Your password has been changed.');
                res.redirect('/campgrounds');
            });
        }
    }));
}))

router.get('/users/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    const userData = await User.findById(id).populate('followers').populate('following');
    const userCampgrounds = await Campground.find({ author: id }).populate('images');
    if (!userData) {
        req.flash('error', 'User not found!!');
        return res.redirect('/campgrounds');
    }
    res.render('users/show.ejs', { userData, userCampgrounds });
}))

router.get('/users/:id/follow', isLoggedIn, catchAsync(async (req, res) => {
    const { id } = req.params;
    const fellowUser = await User.findById(id).populate('followers');
    let user = req.user;
    let isFollowing = false;
    for (let follower of fellowUser.followers) {
        if (follower.email === user.email) {
            isFollowing = true;
            user = follower;
            break;
        }
    }
    if (isFollowing) {
        req.flash('error', 'You are already following this user');
        return res.redirect(`/users/${id}`);
    }
    fellowUser.followers.push(user);
    user.following.push(fellowUser);
    await user.save();
    const newNotification = {
        username: user.username,
        notifType: 'follow',
        notifId: user._id
    }
    const notification = await Notification.create(newNotification);
    fellowUser.notifications.push(notification);
    await fellowUser.save();
    req.flash('success', 'You started following this user!');
    res.redirect(`/users/${id}`);
}))

router.get('/users/:id/followers', async (req, res) => {
    const { id } = req.params;
    const userData = await User.findById(id).populate('followers');
    res.render('users/followers.ejs', { userData });
})

router.get('/users/:id/following', async (req, res) => {
    const { id } = req.params;
    const userData = await User.findById(id).populate('following');
    res.render('users/following.ejs', { userData });
})

router.get('/notifications', isLoggedIn, catchAsync(async function (req, res) {
    const user = await User.findById(req.user._id).populate({
        path: 'notifications',
        options: { sort: { "_id": -1 } }
    });
    const allNotifications = user.notifications;
    res.render('users/notifications.ejs', { allNotifications });
}));

router.get('/notifications/readAll', isLoggedIn, catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id).populate('notifications');
    for (let notification of user.notifications) {
        notification.isRead = true;
        await notification.save();
    }
    res.redirect('/campgrounds');
}))

// handle notification
router.get('/notifications/:id', isLoggedIn, catchAsync(async function (req, res) {
    const notification = await Notification.findById(req.params.id);
    notification.isRead = true;
    notification.save();
    if (notification.notifType === 'post' || notification.notifType === 'review')
        res.redirect(`/campgrounds/${notification.notifId}`);
    else
        res.redirect(`/users/${notification.notifId}`);
}));

module.exports = router;