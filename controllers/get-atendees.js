const firestore = require("../deps/firestore");

async function getAtendees(req, res) {
  const { evId } = req.body;
  const { mode } = req.query;

  if (!evId || !mode) return res.sendStatus(400);

  try {
    const reqx = await firestore
      .collection("atendee-org")
      .where("evId", "==", evId)
      .orderBy("name", "asc")
      .get();

    if (mode === "count") {
      return res.status(200).json({
        success: true,
        data: reqx.size,
        err: "",
      });
    }

    let atendees = [];

    reqx.docs.forEach((atendee) => {
      atendees.push({
        id: atendee.id,
        ...atendee.data(),
      });
    });

    res.status(200).json({
      success: true,
      data: atendees,
      err: "",
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      msg: "",
      err: "Server error.",
    });
  }
}

module.exports = { getAtendees };
