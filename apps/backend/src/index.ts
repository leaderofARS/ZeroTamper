import "dotenv/config";
import app from "./app";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`\n🔗 WitnessChain Backend running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`   Solana RPC  : ${process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"}\n`);
});
