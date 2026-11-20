const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email });

exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: "All fields are required" });
    if (password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ success: false, message: "Email already registered" });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ success: true, token: sign(user._id), user: pub(user) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Invalid email or password" });
    res.json({ success: true, token: sign(user._id), user: pub(user) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getProfile = (req, res) => res.json({ success: true, user: pub(req.user) });

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);
    if (email && email.toLowerCase() !== user.email) {
      if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ success: false, message: "Email already in use" });
      user.email = email;
    }
    if (name) user.name = name;
    await user.save();
    res.json({ success: true, user: pub(user) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });
    const user = await User.findById(req.user._id);
    if (!(await bcrypt.compare(currentPassword || "", user.password))) return res.status(401).json({ success: false, message: "Current password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: "Password updated" });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
