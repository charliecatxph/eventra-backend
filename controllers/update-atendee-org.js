const firestore = require("../deps/firestore");

async function updateAtendeeOrg(req, res) {
  const { id, data } = req.body;

  if (!id || !data)
    return res.status(400).json({
      success: false,
      msg: "",
      err: "Incomplete parameters.",
    });
  try {
    const rq = await firestore
      .collection("atendee-org")
      .doc(id)
      .get()
      .catch((e) => {
        throw new Error("Fetch 1 fail.");
      });

    if (!rq.exists) throw new Error("Atendee doesn't exist.");

    await firestore
      .collection("atendee-org")
      .doc(id)
      .update({
        ...data,
      })
      .catch((e) => {
        throw new Error("Update fail.");
      });

    res.status(200).json({
      success: true,
      data: {
        msg: "Atendee updated.",
        ...rq.data(),
        attended: true,
        id: rq.id,
      },
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

module.exports = { updateAtendeeOrg };
