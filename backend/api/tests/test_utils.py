from django.test import TestCase

from ..utils import safe_int_param


class SafeIntParamTests(TestCase):
    def test_valid_value(self):
        request = type('Request', (), {'query_params': {'limit': '50'}})()
        result = safe_int_param(request, 'limit', 20, 0, 100)
        self.assertEqual(result, 50)

    def test_default_when_missing(self):
        request = type('Request', (), {'query_params': {}})()
        result = safe_int_param(request, 'limit', 20, 0, 100)
        self.assertEqual(result, 20)

    def test_clamp_below_min(self):
        request = type('Request', (), {'query_params': {'limit': '-5'}})()
        result = safe_int_param(request, 'limit', 20, 1, 100)
        self.assertEqual(result, 1)

    def test_clamp_above_max(self):
        request = type('Request', (), {'query_params': {'limit': '999'}})()
        result = safe_int_param(request, 'limit', 20, 1, 100)
        self.assertEqual(result, 100)

    def test_invalid_value_returns_default(self):
        request = type('Request', (), {'query_params': {'limit': 'abc'}})()
        result = safe_int_param(request, 'limit', 20)
        self.assertEqual(result, 20)
