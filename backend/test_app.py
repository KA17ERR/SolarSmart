import json
import os
import unittest
from unittest.mock import patch

import app


def sample_request():
    return {
        "schemaVersion": "1.0",
        "question": "Why do exports use a different rate?",
        "assessment": {
            "scenarioName": "Sample roof",
            "inputs": {
                "monthlyBill": 180, "utilityRate": 0.15, "sunHours": 5.2, "systemCost": 12800,
                "incentiveRate": 0, "electricityEscalation": 0.03, "targetAnnualOffsetRate": 0.82,
                "exportCompensationRate": 0, "roofAreaSqFt": 850,
                "usableRoofPercent": 70, "orientationFactor": 0.9, "shadingFactor": 0.95,
            },
            "outputs": {
                "systemKw": 9.1, "roofCapacityKw": 9.9, "roofLimited": False, "annualProductionKwh": 11808,
                "annualConsumptionKwh": 14400, "annualSelfConsumedKwh": 8856, "annualExportedKwh": 2952,
                "annualSavingsUsd": 1328, "annualRetailSavingsUsd": 1328, "annualExportRevenueUsd": 0,
                "installationCostLowUsd": 10880, "installationCostExpectedUsd": 12800, "installationCostHighUsd": 14720,
                "paybackYears": 8.7, "projectionHorizonYears": 25, "co2AvoidedKg": 4546,
                "gridEmissionsKgCo2PerKwh": 0.385, "physicalSelfConsumptionRate": 0.75,
            },
            "warnings": [], "limitations": ["No site survey is included."],
            "recommendations": [{"title": "Verify shade", "detail": "Ask for a site review."}],
            "scenarios": [],
        },
    }


class AssistantHandlerTests(unittest.TestCase):
    def event(self, payload):
        return {"body": json.dumps(payload)}

    def test_validates_bounded_summary_and_rejects_extra_personal_data(self):
        request = sample_request()
        self.assertTrue(app.validate_request(request))
        with_location = json.loads(json.dumps(request))
        with_location["assessment"]["cityOrPostcode"] = "Home location"
        self.assertFalse(app.validate_request(with_location))
        request["assessment"]["outputs"]["annualSavingsUsd"] = float("nan")
        self.assertFalse(app.validate_request(request))

    def test_no_credentials_returns_deterministic_fallback(self):
        with patch.dict(os.environ, {"STRANDS_ENABLED": "false"}, clear=False), patch.object(app, "invoke_strands") as invoke:
            response = app.handler(self.event(sample_request()), None)
        payload = json.loads(response["body"])
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(payload["mode"], "fallback")
        self.assertIn("exports", payload["narrative"])
        self.assertFalse(any(char.isdigit() for char in payload["narrative"]))
        invoke.assert_not_called()

    def test_mocked_strands_output_passes_only_non_numerical_narrative(self):
        with patch.dict(os.environ, {"STRANDS_ENABLED": "true", "STRANDS_MODEL_ID": "test-model"}, clear=False), patch.object(app, "invoke_strands", return_value="Exports use a separate configured credit, so they are not automatically valued at retail.") as invoke:
            response = app.handler(self.event(sample_request()), None)
        payload = json.loads(response["body"])
        self.assertEqual(payload["mode"], "strands")
        self.assertIn("separate configured credit", payload["narrative"])
        invoke.assert_called_once()

    def test_model_numbers_or_provider_failures_fall_back_without_leaking_errors(self):
        for answer in ("Savings are 42 percent.", RuntimeError("private provider detail")):
            with patch.dict(os.environ, {"STRANDS_ENABLED": "true", "STRANDS_MODEL_ID": "test-model"}, clear=False), patch.object(app, "invoke_strands", side_effect=answer if isinstance(answer, Exception) else None, return_value=None if isinstance(answer, Exception) else answer):
                response = app.handler(self.event(sample_request()), None)
            data = json.loads(response["body"])
            self.assertEqual(data["mode"], "fallback")
            self.assertNotIn("private provider detail", response["body"])

    def test_rejects_malformed_and_oversized_requests(self):
        self.assertEqual(app.handler({"body": "{"}, None)["statusCode"], 400)
        self.assertEqual(app.handler({"body": "x" * 16_001}, None)["statusCode"], 413)
        invalid = sample_request()
        invalid["question"] = " "
        self.assertEqual(app.handler(self.event(invalid), None)["statusCode"], 400)


if __name__ == "__main__":
    unittest.main()
