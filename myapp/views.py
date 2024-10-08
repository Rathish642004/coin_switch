from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json, time, requests
from cryptography.hazmat.primitives.asymmetric import ed25519
from django.conf import settings

# Fetch environment variables
BASE_URL = "https://exchange.coinswitch.co"
PUBLIC_KEY = settings.COINSWITCH_PUBLIC_KEY
PRIVATE_KEY = settings.COINSWITCH_PRIVATE_KEY

def generate_signature(private_key: str, sign_params: dict) -> str:
    private_key_bytes = bytes.fromhex(private_key)
    message_str = json.dumps(sign_params["message"], sort_keys=True, separators=(',', ':'))
    message_bytes = f'{sign_params["timestamp"]}{sign_params["method"]}{sign_params["urlPath"]}{message_str}'.encode('utf-8')
    
    private_key_obj = ed25519.Ed25519PrivateKey.from_private_bytes(private_key_bytes)
    return private_key_obj.sign(message_bytes).hex()

def send_request(url_path, method, message=None):
    timestamp = int(time.time()) -10  # Use the exact current timestamp
    sign_params = {
        "timestamp": timestamp,
        "method": method,
        "urlPath": url_path,
        "message": message or {}
    }

    
    headers = {
        'Content-Type': 'application/json',
        'CSX-ACCESS-KEY': PUBLIC_KEY,
        'CSX-SIGNATURE': signature,
        'CSX-ACCESS-TIMESTAMP': str(timestamp),
    }

    try:
        response = getattr(requests, method.lower())(
            f"{BASE_URL}{url_path}",
            headers=headers,
            json=message if method == 'POST' else None
        )
        
        try:
            return response.json() if response.status_code == 200 else {'error': f"Error {response.status_code}: {response.text}"}
        except ValueError:
            return {'error': 'Invalid JSON response from server'}

    except requests.RequestException as e:
        return {'error': str(e)}




@csrf_exempt
def get_balance(request):
    if request.method == 'GET':
        result = send_request('/api/v2/me/balance/', 'GET')

        if 'data' in result:
            return JsonResponse({'data': result['data']})  # Make sure to wrap it in a dict with 'data'
        else:
            return JsonResponse({'error': 'Failed to fetch balance'}, status=500)

    return JsonResponse({'error': 'Invalid request'}, status=400)



@csrf_exempt
def withdraw_ajax(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        required_fields = ['assetName', 'amount', 'address']
        
        if not all(field in data for field in required_fields):
            return JsonResponse({'error': 'Missing withdrawal parameters'}, status=400)
        try:
            # Convert amount to float to meet the API requirements
            amount = int(data['amount'])
        except ValueError:
            return JsonResponse({'error': 'Invalid amount format, must be a number'}, status=400)

        message = {
            "assetName": data['assetName'],
            "chain": "mainnet",
            "amount": amount, 
            "address": data['address'],
            "subaddress": ""
        }
        result = send_request('/api/v1/me/withdrawal', 'POST', message)
        return JsonResponse(result)

    return JsonResponse({'error': 'Invalid request'}, status=400)


@csrf_exempt
def create_order_ajax(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        required_fields = ['type', 'side', 'instrument', 'quantity']
        
        if not all(field in data for field in required_fields):
            return JsonResponse({'error': 'Missing order parameters'}, status=400)
        print()
        message = {
            "type": data['type'],
            "side": data['side'],
            "instrument": data['instrument'],
            "quantityType": "quote",
            "tdsDeducted": True,
            "quantity": data['quantity'],
            "limitPrice": data.get('limitprice'),
            "username": "bnm29"
        }
        result = send_request('/api/v1/orders/', 'POST', message)
        return JsonResponse(result)
    return JsonResponse({'error': 'Invalid request'}, status=400)

@csrf_exempt
def cancel_order_ajax(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        order_id = data.get('orderId')
        
        if not order_id:
            return JsonResponse({'error': 'Order ID is required'}, status=400)

        result = send_request(f'/api/v1/orders/{order_id}', 'DELETE')
        return JsonResponse(result)
    return JsonResponse({'error': 'Invalid request'}, status=400)

@csrf_exempt
def orders(request):
    if request.method == 'GET':
        result = send_request('/api/v1/me/orders/?onlyOpen=false&type=LIMIT', 'GET')
        return JsonResponse(result)
    return JsonResponse({'error': 'Invalid request'}, status=400)

def dashboard(request):
    return render(request, 'crypto/dashboard.html')