async function logout(req, res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.MODE === "PRODUCTION",
    sameSite: process.env.MODE === "PRODUCTION" ? "none" : "Lax",
  });
  res.sendStatus(200);
}

module.exports = { logout };
