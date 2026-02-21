from typing import Any, Dict


def make_response(data: Any = None, message: str = "got the response", success: bool = True) -> Dict[str, Any]:
	"""Return a standardized response dict for API endpoints.

	Example:
		make_response(data={"id": 1}, message="ok", success=True)
		-> {"success": True, "message": "ok", "data": {"id":1}}
	"""
	return {
		"success": bool(success),
		"message": str(message),
		"data": data,
	}

