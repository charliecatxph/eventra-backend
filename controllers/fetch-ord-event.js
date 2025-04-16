const firestore = require("../deps/firestore");

async function fetchOrdEvent(req, res) {
  const { evId } = req.body;

  if (!evId)
    return res.status(400).json({
      success: false,
      msg: "",
      err: "Incomplete parameters.",
    });

  try {
    const reqx = await firestore.collection("ordinaryEvent").doc(evId).get();

    if (!reqx.exists) throw new Error("Event not found.");

    res.status(200).json({
      success: true,
      data: reqx.data(),
      err: "",
    });
  } catch (e) {
    return res.status(400).json({
      success: false,
      msg: "",
      err: e.message,
    });
  }
}

module.exports = { fetchOrdEvent };
