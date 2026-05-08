import { Router, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { supabase } from "../lib/supabase";
import { getIncident } from "../services/clustering";
import { legalAuth } from "../middleware/auth";
import { exportLimiter } from "../middleware/rateLimiter";
import { pinJSONToIPFS } from "../services/ipfs";

const router = Router();

/**
 * GET /api/export/:incidentId
 * Authorized-only endpoint returning a tamper-proof evidence bundle.
 * Optionally returns a signed PDF if ?format=pdf is set.
 */
router.get("/:incidentId", exportLimiter, legalAuth, async (req: Request, res: Response) => {
  const { incidentId } = req.params;
  const format = req.query.format as string | undefined;

  try {
    const incident = await getIncident(incidentId);
    const records = (incident as any).evidence_records ?? [];

    const bundle = {
      incidentId: incident.id,
      exportedAt: new Date().toISOString(),
      status: incident.status,
      witnessCount: incident.witness_count,
      firstSeenAt: incident.first_seen_at,
      location: { lat: incident.centroid_lat, lon: incident.centroid_lon },
      evidenceBundle: records.map((r: any) => ({
        sha256Hash: r.sha256_hash,
        ipfsCid: r.ipfs_cid,
        ipfsGatewayUrl: `https://gateway.pinata.cloud/ipfs/${r.ipfs_cid}`,
        solanaSignature: r.solana_signature,
        witnessWallet: r.witness_wallet,
        submittedAt: r.created_at,
      })),
      chainOfCustody: records.map((r: any, i: number) => ({
        step: i + 1,
        actor: r.witness_wallet,
        action: i === 0 ? "First Submission" : "Corroboration",
        timestamp: r.created_at,
        txSignature: r.solana_signature,
      })),
      verificationInstructions:
        "1. Compute SHA-256 of the original media file.\n" +
        "2. Compare with sha256Hash in this bundle — must match.\n" +
        "3. Look up the Solana transaction at https://explorer.solana.com/tx/{solanaSignature}.\n" +
        "4. Verify the on-chain hash matches sha256Hash.\n" +
        "5. Retrieve media from IPFS using the ipfsCid — content is immutable.",
    };

    // Log the export to Supabase
    await supabase.from("legal_exports").insert({
      incident_id: incidentId,
      exported_at: bundle.exportedAt,
      bundle_cid: null, // will be set below if pinned
    });

    // Optionally pin the bundle to IPFS for audit trail
    try {
      const bundleCid = await pinJSONToIPFS(bundle, `export-${incidentId}`);
      await supabase
        .from("legal_exports")
        .update({ bundle_cid: bundleCid })
        .eq("incident_id", incidentId);
      (bundle as any).bundleCid = bundleCid;
    } catch {
      // Non-fatal — export still succeeds without IPFS pin
    }

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="evidence-${incidentId}.pdf"`
      );

      const doc = new PDFDocument({ margin: 50 });
      doc.pipe(res);

      doc.fontSize(20).text("WitnessChain — Legal Evidence Bundle", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(`Incident ID: ${bundle.incidentId}`);
      doc.text(`Exported At: ${bundle.exportedAt}`);
      doc.text(`Status: ${bundle.status}`);
      doc.text(`Witness Count: ${bundle.witnessCount}`);
      doc.text(`First Seen: ${bundle.firstSeenAt}`);
      doc.text(`Location: ${bundle.location.lat}, ${bundle.location.lon}`);
      doc.moveDown();

      doc.fontSize(14).text("Evidence Records:");
      bundle.evidenceBundle.forEach((e: any, i: number) => {
        doc.moveDown(0.5);
        doc.fontSize(10)
          .text(`${i + 1}. Hash: ${e.sha256Hash}`)
          .text(`   IPFS: ${e.ipfsGatewayUrl}`)
          .text(`   Solana Tx: ${e.solanaSignature ?? "pending"}`)
          .text(`   Submitted: ${e.submittedAt}`);
      });

      doc.moveDown();
      doc.fontSize(10).text("Verification Instructions:", { underline: true });
      doc.text(bundle.verificationInstructions);
      doc.end();
    } else {
      res.json(bundle);
    }
  } catch (err: any) {
    console.error("[export]", err);
    res.status(404).json({ error: err.message });
  }
});

export default router;
