const mongoose = require("mongoose");
const Wallet = require("../models/walletModel");
const Income = require("../models/incomeModel");
const Expense = require("../models/expenseModel");

// ---------- keyword rules (English + Hinglish) ----------
const RULES = {
  expense: {
    Food: "lunch dinner breakfast snack snacks pizza burger chai tea coffee zomato swiggy restaurant food khana biryani maggi grocery groceries vegetables sabzi dominos kfc mcdonalds cafe canteen juice icecream thali momos samosa fruits milk doodh",
    Transport: "petrol diesel fuel auto rickshaw cab uber ola rapido metro bus train taxi parking toll flight ticket cng",
    Rent: "rent kiraya pg hostel",
    Shopping: "amazon flipkart myntra meesho shirt shoes clothes shopping kapde jeans dress watch bag mall",
    Bills: "electricity bijli wifi internet recharge broadband bill jio airtel vi gas cylinder water insurance emi",
    Health: "doctor medicine medicines medical pharmacy hospital dawai dawa clinic checkup dentist gym",
    Entertainment: "movie movies netflix spotify prime hotstar cinema game games party outing concert youtube",
    Education: "book books course fees fee tuition udemy exam college stationery notebook coaching",
  },
  income: {
    Salary: "salary stipend payroll wages",
    Freelance: "freelance freelancing gig",
    Business: "business sales",
    Investments: "dividend interest stocks stock mutual sip profit returns",
    Gift: "gift gifted shagun pocket",
  },
};
const LOOKUP = {};
for (const kind of Object.keys(RULES)) {
  LOOKUP[kind] = {};
  for (const [cat, words] of Object.entries(RULES[kind])) words.split(" ").forEach((w) => (LOOKUP[kind][w] = cat));
}

const INCOME_WORDS = new Set("salary stipend received credited earned income mila mili aaya aayi dividend bonus payroll refund".split(" "));
const EXPENSE_WORDS = new Set("spent spend paid bought kharch kharcha diya diye khareed kharida purchase purchased bill".split(" "));
const STOP = new Set(("aaj today kal yesterday parso ka ki ke ko kiya kiye kia hua hai tha the mein me par pe on for of via using through from to a an the i my with and " +
  "spent spend paid pay received credited earned got rs rupees rupee inr ago day days kharch kharcha mila mili aaya aayi diya diye bought purchased by at in").split(" "));
const WALLET_HINTS = [["upi", /\b(upi|gpay|google pay|phonepe|paytm|bhim)\b/], ["cash", /\b(cash|naqad)\b/], ["bank", /\b(bank|card|debit|credit|netbanking)\b/]];

const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const words = (t) => t.toLowerCase().match(/[a-z\u0900-\u097f]+/g) || [];

function classify(kind, text) {
  for (const w of words(text)) if (LOOKUP[kind][w]) return LOOKUP[kind][w];
  return null;
}

function parseAmount(text) {
  let t = text.toLowerCase()
    .replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g, " ")      // dates like 12/11
    .replace(/\b\d+\s*(?:days?|din)\s*(?:ago|pehle)\b/g, " ")          // "3 days ago"
    .replace(/\b\d+(?:st|nd|rd|th)\b/g, " ");                          // "5th"
  const re = /(₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|lakh|lac|thousand|hazar|hazaar)?(?![a-z0-9])/g;
  let m, best = null;
  while ((m = re.exec(t))) {
    const num = parseFloat(m[2].replace(/,/g, ""));
    if (!num) continue;
    const mult = m[3] ? (/^(k|thousand|hazar|hazaar)$/.test(m[3]) ? 1000 : 100000) : 1;
    const cand = { amount: num * mult, hasCurrency: !!m[1], raw: m[0] };
    if (!best || (cand.hasCurrency && !best.hasCurrency)) best = cand;
  }
  return best;
}

const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function parseDate(text, today) {
  const t = text.toLowerCase();
  let m;
  if ((m = t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/))) {
    const dd = Number(m[1]), mm = Number(m[2]);
    let yy = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
    if (yy < 100) yy += 2000;
    const iso = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && !Number.isNaN(new Date(iso))) return iso;
  }
  if ((m = t.match(/\b(\d+)\s*(?:days?|din)\s*(?:ago|pehle)\b/))) return addDays(today, -Number(m[1]));
  if (/\b(parso|day before yesterday)\b/.test(t)) return addDays(today, -2);
  if (/\b(kal|yesterday)\b/.test(t)) return addDays(today, -1);
  return today;
}

function pickWallet(text, wallets) {
  const t = text.toLowerCase();
  const named = wallets.find((w) => new RegExp(`\\b${escapeRegex(w.name.toLowerCase())}\\b`).test(t));
  if (named) return named._id;
  for (const [type, re] of WALLET_HINTS) if (re.test(t)) { const w = wallets.find((x) => x.type === type); if (w) return w._id; }
  return null;
}

function parseText(text, today, wallets = []) {
  const amt = parseAmount(text);
  if (!amt) return { error: "I couldn't find an amount. Try something like “Aaj ₹250 ka lunch kiya”." };

  const toks = words(text);
  // income words (received, salary, freelance...) vs expense words (spent, paid, bill...)
  const inc = toks.filter((w) => INCOME_WORDS.has(w) || (LOOKUP.income[w] && !LOOKUP.expense[w])).length;
  const exp = toks.filter((w) => EXPENSE_WORDS.has(w)).length;
  const hasRuleExpense = toks.some((w) => LOOKUP.expense[w]);
  const kind = inc > exp || (inc > 0 && inc === exp && !hasRuleExpense) ? "income" : "expense";

  // description = what is left after removing the amount, date words and filler words
  let rest = text.toLowerCase().replace(amt.raw.trim(), " ")
    .replace(/\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b/g, " ").replace(/\b\d+\s*(?:days?|din)\s*(?:ago|pehle)\b/g, " ").replace(/[₹,.]/g, " ").replace(/\b(google pay|debit card|credit card)\b/g, " ");
  wallets.forEach((w) => { rest = rest.replace(new RegExp(`\\b${escapeRegex(w.name.toLowerCase())}\\b`, "g"), " "); });
  const kept = (rest.match(/[a-z\u0900-\u097f]+/g) || []).filter((w) => !STOP.has(w) && !WALLET_HINTS.some(([, re]) => re.test(w)));
  const description = kept.length ? kept.join(" ").replace(/^./, (c) => c.toUpperCase()) : null;

  return { kind, amount: Math.round(amt.amount * 100) / 100, description, category: classify(kind, text), date: parseDate(text, today), walletId: pickWallet(text, wallets) };
}

// learn from the user's own past entries: same word used before -> same category
async function suggestFromHistory(userId, kind, description) {
  const toks = [...new Set(words(description).filter((w) => w.length >= 3 && !STOP.has(w)))].slice(0, 5);
  if (!toks.length) return null;
  const Model = kind === "income" ? Income : Expense;
  const docs = await Model.find({ userId, description: { $regex: toks.map(escapeRegex).join("|"), $options: "i" } }).select("category").limit(200).lean();
  if (!docs.length) return null;
  const count = {};
  docs.forEach((d) => (count[d.category] = (count[d.category] || 0) + 1));
  const [category, n] = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return n / docs.length >= 0.5 ? { category, source: "history", count: n } : null;
}

async function suggest(userId, kind, description) {
  const fromHistory = await suggestFromHistory(userId, kind, description);
  if (fromHistory) return fromHistory;
  const rule = classify(kind, description);
  return rule ? { category: rule, source: "rules" } : null;
}

exports.suggest = async (req, res) => {
  try {
    const kind = req.query.kind === "income" ? "income" : "expense";
    const description = (req.query.description || "").trim();
    if (description.length < 2) return res.json({ success: true, data: null });
    res.json({ success: true, data: await suggest(req.user._id, kind, description) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.parse = async (req, res) => {
  try {
    const text = String(req.body.text || "").trim();
    const today = /^\d{4}-\d{2}-\d{2}$/.test(req.body.today || "") ? req.body.today : new Date().toISOString().slice(0, 10);
    if (text.length < 3) return res.status(400).json({ success: false, message: "Type what you spent or earned" });
    if (text.length > 200) return res.status(400).json({ success: false, message: "Please keep it under 200 characters" });
    const wallets = await Wallet.find({ userId: req.user._id }).lean();
    const out = parseText(text, today, wallets);
    if (out.error) return res.status(400).json({ success: false, message: out.error });
    // the user's own history beats the generic keyword rules
    if (out.description) { const s = await suggest(req.user._id, out.kind, out.description); if (s) out.category = s.category; }
    res.json({ success: true, data: out });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports._parseText = parseText;
exports._classify = classify;
