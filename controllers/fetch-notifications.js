const firestore = require("../deps/firestore");

async function fetchNotifications(req, res) {
  try {
    const rx = await firestore
      .collection("notifications")
      .where("orgId", "==", "4QNL9wl9v98uw7hrFcbz")
      .orderBy("stamp", "desc")
      .get();

    let notifs = [];

    rx.forEach((notification) => {
      notifs.push(notification.data());
    });
    res.status(200).json({
      success: true,
      data: notifs,
      err: "",
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      msg: "",
      err: e.message,
    });
  }
}

module.exports = { fetchNotifications };
