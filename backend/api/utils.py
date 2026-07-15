def safe_int_param(request, param_name, default_value, min_value=None, max_value=None):
    """Safely parse integer parameters from request with validation."""
    try:
        value = int(request.query_params.get(param_name, default_value))

        if min_value is not None:
            value = max(min_value, value)
        if max_value is not None:
            value = min(max_value, value)

        return value
    except (ValueError, TypeError):
        return default_value
