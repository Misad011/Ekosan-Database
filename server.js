import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Ekosan is alive! 💗");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Ekosan is running on port ${PORT}`);
});
