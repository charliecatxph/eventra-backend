const firestore = require("../deps/firestore");

async function fetchEvents(req, res) {
  const { mode } = req.query;
  try {
    const firequery = firestore
      .collection("ordinaryEvent")
      .where("organizationId", "==", "4QNL9wl9v98uw7hrFcbz")
      .orderBy("endT", "desc");

    const firequery2 = firestore
      .collection("bizmatch")
      .where("organizationId", "==", "4QNL9wl9v98uw7hrFcbz")
      .orderBy("endT", "desc");

    let payload = [];
    let payload2 = [];
    let snap1;
    let snap2;

    if (mode === "partial-ord") {
      snap1 = await firequery.get();
      for (const event of snap1.docs) {
        const fqAtn = await firestore
          .collection("atendee-org")
          .where("evId", "==", event.id)
          .get();

        const evData = event.data();
        payload.push({
          ...event.data(),
          startT: evData.startT._seconds,
          endT: evData.endT._seconds,
          date: evData.date._seconds,
          id: event.id,
          atnSz: fqAtn.size,
        });
      }
    } else if (mode === "partial-biz") {
      snap2 = await firequery2.get();
      snap2.forEach((doc) => {
        payload2.push({
          ...doc.data(),
          id: doc.id,
        });
      });
    } else if (mode === "full") {
      snap1 = await firequery.get();
      snap2 = await firequery2.get();

      for (const event of snap1.docs) {
        const fqAtn = await firestore
          .collection("atendee-org")
          .where("evId", "==", event.id)
          .get();

        const evData = event.data();
        payload.push({
          ...evData,
          startT: evData.startT._seconds,
          endT: evData.endT._seconds,
          date: evData.date._seconds,
          id: event.id,
          atnSz: fqAtn.size,
        });
      }
      snap2.forEach((doc) => {
        payload2.push({
          ...doc.data(),
          id: doc.id,
        });
      });
    } else {
      return res.status(403).json({
        success: false,
        data: [],
        bz: [],
        err: "",
      });
    }

    return res.status(200).json({
      success: true,
      data: payload,
      bz: payload2,
      err: "",
    });
  } catch (e) {
    console.log(e);
    res.status(403).json({
      success: false,
      data: [],
      bz: [],
      err: "",
    });
  }
}

module.exports = { fetchEvents };
