const firestore = require("../deps/firestore");

async function getOrdEventData(req, res) {
  const { evId } = req.body;
  if (!evId) return res.sendStatus(400);

  try {
    const reqx = await firestore.collection("ordinaryEvent").doc(evId).get();
    res.status(200).json({
      success: true,
      data: reqx.data(),
      err: "",
    });
  } catch (e) {
    res.sendStatus(400);
    res.status(400).json({
      success: false,
      msg: "",
      err: "Server error.",
    });
  }
}

module.exports = { getOrdEventData };
