const firestore = require("../deps/firestore");
const moment = require("moment");

async function fetchOrdEventAnalytics(req, res) {
  const { evId, offset, type } = req.body;

  if (!evId || !offset || !type)
    return res.status(400).json({
      success: false,
      msg: "",
      err: "Incomplete parameters.",
    });
  try {
    switch (type) {
      case "rpd": {
        const rqx = await firestore
          .collection("atendee-org")
          .where("evId", "==", evId)
          .orderBy("registeredOn", "asc")
          .get()
          .catch((e) => {
            console.log(e);
            throw new Error("Fetch error.");
          });

        let tmp = [];
        rqx.forEach((atendee) => {
          tmp.push(atendee.data());
        });

        const x = tmp.reduce((acc, reg) => {
          const date = moment
            .unix(reg.registeredOn._seconds)
            .utcOffset(parseInt(offset))
            .format("MMMM DD, YYYY");
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});
        return res.status(200).json({
          success: true,
          data: x,
          err: "",
        });
      }
    }
  } catch (e) {
    return res.status(400).json({
      success: false,
      msg: "",
      err: e.message,
    });
  }
}

module.exports = { fetchOrdEventAnalytics };
