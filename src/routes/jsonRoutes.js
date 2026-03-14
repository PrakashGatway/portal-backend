import express from "express";
import { readAssignmentConfig, writeAssignmentConfig } from "../services/jsonFunction.js";

const router = express.Router();

router.get("/form",
  async (req, res) => {
    try {
      const config = readAssignmentConfig();

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.log(error)
      res.status(500).json({ success: false, message: "Failed to read config" });
    }
  }
);

router.post("/form", async (req, res) => {
  try {
    const { formId, campaign_id, counselors } = req.body;

    if (!formId || !Array.isArray(counselors)) {
      return res.status(400).json({
        success: false,
        message: "formId and counselors are required"
      });
    }

    const config = readAssignmentConfig();

    const exists = config.find((c) => c.formId === formId);

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Form already exists"
      });
    }

    config.push({
      formId,
      campaign_id,
      counselors,
      lastAssignedIndex: -1
    });

    writeAssignmentConfig(config);

    res.json({
      success: true,
      message: "Form assignment created"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create config" });
  }
});

router.put("/form/:formId", async (req, res) => {
  try {
    const { formId } = req.params;
    const { counselors, campaign_id } = req.body;

    const config = readAssignmentConfig();

    const index = config.findIndex((c) => c.formId === formId);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Form not found"
      });
    }

    if (counselors) config[index].counselors = counselors;
    if (campaign_id) config[index].campaign_id = campaign_id;

    writeAssignmentConfig(config);

    res.json({
      success: true,
      message: "Form assignment updated"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update config" });
  }
});

router.delete("/form/:formId", async (req, res) => {
  try {
    const { formId } = req.params;

    let config = readAssignmentConfig();

    config = config.filter((c) => c.formId !== formId);

    writeAssignmentConfig(config);

    res.json({
      success: true,
      message: "Form assignment deleted"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete config" });
  }
});

export default router;