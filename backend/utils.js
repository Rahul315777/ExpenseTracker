// Returns { start, end } for a range keyword. Default: current month.
exports.getRange = (range) => {
  const now = new Date();
  let start, end;
  if (range === "weekly") {
    start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
    end = new Date(now); end.setHours(23, 59, 59, 999);
  } else if (range === "yearly") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (range === "all") {
    start = new Date(1970, 0, 1);
    end = new Date(2100, 0, 1);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  return { start, end };
};
