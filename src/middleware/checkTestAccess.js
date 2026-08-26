import mongoose from "mongoose";

import PurchasedCourse from "../models/PurchasedCourse.js";
import Course from "../models/Course.js";
import { TestTemplate } from "../models/GGSschema/testTemplate.js";
import { TestSeries } from "../models/GGSschema/testSeriesSchema.js";
import { Test } from "../models/Content.js";

const { Types } = mongoose;

const isValidPurchase = (purchase) => {
  if (!purchase) return false;

  if (purchase.isActive !== true) {
    return false;
  }

  //   if (
  //     purchase.accessExpiresAt &&
  //     new Date(purchase.accessExpiresAt) <= new Date()
  //   ) {
  //     return false;
  //   }

  return true;
};

const getEffectiveExpiry = (purchase, accessDays = null) => {
  let expiry = purchase?.accessExpiresAt
    ? new Date(purchase.accessExpiresAt)
    : null;

  if (accessDays && purchase?.enrolledAt) {
    const itemExpiry = new Date(purchase.enrolledAt);
    itemExpiry.setDate(itemExpiry.getDate() + accessDays);

    if (!expiry || itemExpiry < expiry) {
      expiry = itemExpiry;
    }
  }
  return expiry;
};

const isExpired = (expiry) => {
  if (!expiry) return false;

  return new Date(expiry) <= new Date();
};

export const checkTestAccess = async ({ userId, testTemplateId }) => {
  if (!userId) {
    return {
      allowed: false,
      code: "AUTH_REQUIRED",
      message: "Authentication is required.",
    };
  }

  if (!testTemplateId || !Types.ObjectId.isValid(testTemplateId)) {
    return {
      allowed: false,
      code: "INVALID_TEST",
      message: "Invalid test template.",
    };
  }

  const [template, testSeries] = await Promise.all([
    TestTemplate.findById(testTemplateId)
      .lean(),
    TestSeries.find({
      "tests.test": testTemplateId,
      isActive: true,
      isPublished: true,
    }),
  ]);

  if (!template) {
    return {
      allowed: false,
      code: "TEST_NOT_FOUND",
      message: "Test not found.",
    };
  }

  if (!template.isActive) {
    return {
      allowed: false,
      code: "TEST_INACTIVE",
      message: "This test is currently inactive.",
    };
  }

  if (template.pricing?.isFree === true) {
    return {
      allowed: true,
      accessType: "test_free",
      testTemplate: template,
      expiresAt: null,
    };
  }

  const testContent = await Test.findOne({
    testId: template._id,
  })
    .select("_id course status isFree title")
    .lean();

  if (
    testContent &&
    testContent.isFree === true &&
    ["published", "live"].includes(testContent.status)
  ) {
    return {
      allowed: true,
      accessType: "content_free",
      testTemplate: template,
      content: testContent,
      expiresAt: null,
    };
  }

  if (testSeries?.length > 0) {
    for (const series of testSeries) {
      if (series.pricing?.isFree === true && series.isPublished !== false) {
        return {
          allowed: true,
          accessType: "free_test_series",
          testTemplate: template,
          series,
          expiresAt: null,
        };
      }
      const seriesTest = series.tests?.find(
        (item) =>
          String(item.test) === String(template._id) &&
          item.isMandatory === true,
      );

      if (seriesTest) {
        if (seriesTest.pricing?.isMandatory === true) {
          return {
            allowed: true,
            accessType: "free_test_series",
            testTemplate: template,
            series,
            seriesTest,
            expiresAt: null,
          };
        }
      }
      const seriesPurchase = await PurchasedCourse.findOne({
        user: userId,
        itemId: series._id,
        isActive: true,

        // $or: [
        //   { accessExpiresAt: null },
        //   { accessExpiresAt: { $exists: false } },
        //   { accessExpiresAt: { $gt: new Date() } },
        // ],
      }).lean();

      return {
        allowed: true,
        accessType: "test_series_purchase",
        testTemplate: template,
        series,
        seriesTest,
        purchase: seriesPurchase,
        expiresAt: null,
      };
    }
  }

  if (testContent?.course) {
    const course = await Course.findById(testContent.course)
      .select("_id title mode status isActive pricing")
      .lean();

    if (course) {
      if (course.mode === "free") {
        return {
          allowed: true,
          accessType: "free_course",
          testTemplate: template,
          content: testContent,
          course,
          expiresAt: null,
        };
      }

      const coursePurchase = await PurchasedCourse.findOne({
        user: userId,
        itemId: course._id,
        itemType: "Course",
        isActive: true,

        // $or: [
        //   { accessExpiresAt: null },
        //   { accessExpiresAt: { $exists: false } },
        //   { accessExpiresAt: { $gt: new Date() } },
        // ],
      }).lean();

      if (isValidPurchase(coursePurchase)) {
        return {
          allowed: true,
          accessType: "course_purchase",
          testTemplate: template,
          content: testContent,
          course,
          purchase: coursePurchase,
          expiresAt: getEffectiveExpiry(coursePurchase),
        };
      }
    }
  }

  if (template.pricing?.isFree != true) {
    const directPurchase = await PurchasedCourse.findOne({
      user: userId,
      itemId: template._id,
      isActive: true,
      //   $or: [
      //     { accessExpiresAt: null },
      //     { accessExpiresAt: { $exists: false } },
      //     { accessExpiresAt: { $gt: new Date() } },
      //   ],
    }).lean();

    if (isValidPurchase(directPurchase)) {
      return {
        allowed: true,
        accessType: "test_purchase",
        testTemplate: template,
        purchase: directPurchase,
        expiresAt: getEffectiveExpiry(directPurchase),
      };
    }
  }

  return {
    allowed: false,
    code: template.pricing?.seriesOnly
      ? "TEST_SERIES_ACCESS_REQUIRED"
      : "TEST_NOT_PURCHASED",

    message: template.pricing?.seriesOnly
      ? "This test can only be attempted through an eligible test series or course."
      : "Please purchase this test, test series, or course before attempting it.",

    testTemplate: template,
  };
};

export const checkTestAttemptAccess = async (req, res, next) => {
  try {
    const userId = req.user?._id;
    const testTemplateId =
      req.body?.testTemplateId || req.params?.testTemplateId || req.params?.id;

    const access = await checkTestAccess({
      userId,
      testTemplateId,
    });

    if (!access.allowed) {
      return res.status(access.code === "AUTH_REQUIRED" ? 401 : 403).json({
        success: false,
        message: access.message,
        code: access.code,
      });
    }
    req.testAccess = access;

    next();
  } catch (error) {
    console.error("checkTestAttemptAccess error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify test access.",
    });
  }
};
