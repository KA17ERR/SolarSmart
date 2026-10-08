"""Optional Strands explanation endpoint. Financial values are supplied by SolarSmart's calculator."""
import json
import os

ALLOWED = {"systemKw", "roofCapacityKw", "roofLimited", "annualProductionKwh", "annualSavings", "netCost", "paybackYears", "twentyFiveYearSavings", "monthlySavings", "co2AvoidedKg"}

def handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
        results = body.get("results") or {}
        invalid_value = any((key == "roofLimited" and type(value) is not bool) or (key != "roofLimited" and type(value) not in (int, float)) for key, value in results.items())
        if not results or set(results) - ALLOWED or invalid_value:
            return respond(400, {"error": "Provide calculated numeric results from SolarSmart."})
        if os.getenv("STRANDS_ENABLED", "false").lower() != "true" or not os.getenv("STRANDS_MODEL_ID"):
            return respond(200, {"mode": "fallback", "explanation": fallback(results)})
        # Strands is deliberately loaded only when explicitly enabled. It explains provided results;
        # it must never calculate or alter any financial value.
        from strands import Agent
        from strands.models import BedrockModel
        model = BedrockModel(model_id=os.environ["STRANDS_MODEL_ID"])
        agent = Agent(system_prompt=("Explain solar estimates in plain language. Use only the supplied results. "
            "Do not recalculate, change, or invent numbers, tariffs, incentives, approvals, or live readings. "
            "Mention that results are illustrative planning assumptions."), model=model)
        response = agent(f"Explain these already-calculated values briefly: {json.dumps(results)}")
        return respond(200, {"mode": "strands", "explanation": str(response)})
    except Exception:
        # Optional AI failures never block an estimate.
        try:
            return respond(200, {"mode": "fallback", "explanation": fallback(json.loads(event.get("body") or "{}").get("results") or {})})
        except Exception:
            return respond(500, {"error": "Unable to explain this estimate."})

def fallback(r):
    return (f"The model estimates a {r.get('systemKw', 0)} kW system and "
            f"{r.get('annualProductionKwh', 0):,.0f} kWh of annual production. "
            f"Estimated first-year savings are ${r.get('annualSavings', 0):,.0f}, with a "
            f"{r.get('paybackYears', 0)}-year simple payback based on the entered cost assumption. "
            "This is an illustrative planning estimate; verify tariffs, incentives, and quotes locally.")

def respond(status, payload):
    return {"statusCode": status, "headers": {"content-type": "application/json", "access-control-allow-origin": "*"}, "body": json.dumps(payload)}
