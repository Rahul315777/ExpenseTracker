const express = require("express");
const auth = require("../middleware/auth");
const user = require("../controllers/userController");
const dash = require("../controllers/dashboardController");
const makeTx = require("../controllers/transactionController");
const budget = require("../controllers/budgetController");
const wallet = require("../controllers/walletController");
const analytics = require("../controllers/analyticsController");
const recurring = require("../controllers/recurringController");
const goal = require("../controllers/goalController");
const Income = require("../models/incomeModel");
const Expense = require("../models/expenseModel");

const router = express.Router();

router.post("/user/signup", user.signup);
router.post("/user/login", user.login);
router.get("/user/me", auth, user.getProfile);
router.put("/user/update", auth, user.updateProfile);
router.put("/user/password", auth, user.changePassword);

router.get("/dashboard", auth, dash.getDashboard);
router.get("/recurring/get", auth, recurring.list);
router.post("/recurring/add", auth, recurring.create);
router.put("/recurring/update/:id", auth, recurring.update);
router.delete("/recurring/delete/:id", auth, recurring.remove);
router.post("/recurring/process", auth, recurring.process);

router.get("/goal/get", auth, goal.list);
router.post("/goal/add", auth, goal.create);
router.put("/goal/update/:id", auth, goal.update);
router.delete("/goal/delete/:id", auth, goal.remove);
router.post("/goal/:id/contribute", auth, goal.contribute);
router.delete("/goal/:id/contribution/:cid", auth, goal.removeContribution);

router.get("/analytics/comparison", auth, analytics.comparison);
router.get("/analytics/trends", auth, analytics.trends);

router.get("/wallet/get", auth, wallet.getWallets);
router.post("/wallet/add", auth, wallet.createWallet);
router.put("/wallet/update/:id", auth, wallet.updateWallet);
router.delete("/wallet/delete/:id", auth, wallet.deleteWallet);
router.post("/wallet/transfer", auth, wallet.transfer);
router.delete("/wallet/transfer/:id", auth, wallet.deleteTransfer);

router.get("/budget/get", auth, budget.getBudgets);
router.post("/budget/set", auth, budget.setBudget);
router.delete("/budget/delete/:id", auth, budget.deleteBudget);

const mount = (name, Model, label) => {
  const c = makeTx(Model, label);
  router.get(`/${name}/get`, auth, c.getAll);
  router.get(`/${name}/overview`, auth, c.overview);
  router.get(`/${name}/search`, auth, c.search);
  router.post(`/${name}/bulk-delete`, auth, c.bulkDelete);
  router.post(`/${name}/bulk-update`, auth, c.bulkUpdate);
  router.get(`/${name}/downloadexcel`, auth, c.downloadExcel);
  router.post(`/${name}/add`, auth, c.add);
  router.put(`/${name}/update/:id`, auth, c.update);
  router.delete(`/${name}/delete/:id`, auth, c.remove);
};
mount("income", Income, "Income");
mount("expense", Expense, "Expense");

module.exports = router;
