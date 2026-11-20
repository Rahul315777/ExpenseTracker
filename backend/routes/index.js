const express = require("express");
const auth = require("../middleware/auth");
const user = require("../controllers/userController");
const dash = require("../controllers/dashboardController");
const makeTx = require("../controllers/transactionController");
const Income = require("../models/incomeModel");
const Expense = require("../models/expenseModel");

const router = express.Router();

router.post("/user/signup", user.signup);
router.post("/user/login", user.login);
router.get("/user/me", auth, user.getProfile);
router.put("/user/update", auth, user.updateProfile);
router.put("/user/password", auth, user.changePassword);

router.get("/dashboard", auth, dash.getDashboard);

const mount = (name, Model, label) => {
  const c = makeTx(Model, label);
  router.get(`/${name}/get`, auth, c.getAll);
  router.get(`/${name}/overview`, auth, c.overview);
  router.get(`/${name}/downloadexcel`, auth, c.downloadExcel);
  router.post(`/${name}/add`, auth, c.add);
  router.put(`/${name}/update/:id`, auth, c.update);
  router.delete(`/${name}/delete/:id`, auth, c.remove);
};
mount("income", Income, "Income");
mount("expense", Expense, "Expense");

module.exports = router;
