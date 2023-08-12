const Campground = require('../models/campgroundModel.js');
const Notification = require('../models/notificationModel.js');
const User = require('../models/userModel.js');
const { cloudinary } = require('../cloudinary');
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mbxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mbxToken });

module.exports.index = async (req, res) => {
    if (!req.query.page) {
        const campgrounds = await Campground.paginate({});
        const campDocs = campgrounds.docs;
        const pageNext = campgrounds.nextPage;
        res.render('campgrounds/index.ejs', { campDocs, pageNext })
    } else {
        const { page } = req.query;
        const campgrounds = await Campground.paginate({}, {
            page
        });
        res.status(200).json(campgrounds);
    }
}

module.exports.renderNewForm = (req, res) => {
    res.render('campgrounds/create.ejs', {});
}

module.exports.createCampground = async (req, res) => {
    const geoData = await geocoder.forwardGeocode({
        query: req.body.location,
        limit: 1
    })
        .send()
    const campground = new Campground(req.body);
    campground.geometry = geoData.body.features[0].geometry;
    campground.author = req.user._id;
    campground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    await campground.save();
    const user = await User.findById(req.user._id).populate('followers');
    const newNotification = {
        username: req.user.username,
        notifType: 'post',
        notifId: campground._id
    }
    for (const follower of user.followers) {
        const notification = await Notification.create(newNotification);
        follower.notifications.push(notification);
        await follower.save();
    }
    req.flash('success', 'successfully created a new campground!!');
    res.redirect(`/campgrounds/${campground._id}`);
}

module.exports.showCampground = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    if (!campground) {
        req.flash('error', 'campground not found!!');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/view.ejs', { campground });
}

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id);
    if (!campground) {
        req.flash('error', 'campground not found!!');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/edit.ejs', { campground });
}

module.exports.updateCampground = async (req, res) => {
    const { id } = req.params;
    console.log(req.body);
    const campground = await Campground.findByIdAndUpdate(id, req.body);
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.images.push(...imgs);
    await campground.save();
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        await campground.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } });
    }
    req.flash('success', 'successfully updated campground!!');
    res.redirect(`/campgrounds/${id}`);
}

module.exports.deleteCampground = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndDelete(id);
    req.flash('success', 'successfully deleted a campground!!');
    res.redirect('/campgrounds');
}
