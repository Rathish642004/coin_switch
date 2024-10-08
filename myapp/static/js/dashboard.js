function showForm(formId) {
    hideForms();
    document.getElementById(formId).style.display = 'block';
}

function hideForms() {
    document.querySelectorAll('.input-form').forEach(form => {
        form.style.display = 'none';
    });
    document.querySelectorAll('.asset-balance').forEach(form => {
        form.style.display = 'none';
    });
}

function showLoading() {
    document.getElementById('loading-spinner').style.display = 'block';
}

function hideLoading() {
    document.getElementById('loading-spinner').style.display = 'none';
}

function displayResult(elementId, data) {
    const resultElement = document.getElementById(elementId);
    if (data.error) {
        resultElement.innerHTML = `<div class="error">${data.error}</div>`;
    } else {
        resultElement.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
}

async function fetchData(url, method = 'GET', body = null) {
    showLoading();
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : null,
        });
        const data = await response.json();
        return data;
    } catch (error) {
        return { error: error.message };
    } finally {
        hideLoading();
    }
}

async function getBalance() {
    try {
        const response = await fetch('/get-balance/', {
            method: 'GET',
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch balance');
        }
        
        const data = await response.json();
        console.log(data); // Debugging: Log the fetched data

        if (data.error) {
            $('#balance-result').html('Failed to fetch balance: ' + data.error);
        } else {
            displayBalances(data.data); // Ensure `data.data` contains the expected structure.
        }
    } catch (error) {
        $('#balance-result').html('Failed to fetch balance: ' + error.message);
    }
}



function displayBalances(data) {
    const availableBalances = data.Available;
    const lockedBalances = data.Locked;

    let html = '<table><tr><th>Asset</th><th>Available Balance</th><th>Locked Balance</th></tr>';

    // Create a set of all unique assets
    const allAssets = new Set([...Object.keys(availableBalances), ...Object.keys(lockedBalances)]);

    // Iterate through each asset
    allAssets.forEach(asset => {
        const availableAmount = availableBalances[asset] || 0; // Default to 0 if not available
        const lockedAmount = lockedBalances[asset] || 0; // Default to 0 if not locked

        html += `<tr><td>${asset.toUpperCase()}</td><td>${availableAmount}</td><td>${lockedAmount}</td></tr>`;
    });

    html += '</table>';

    $('#balance-result').html(html); // Display the table in the balance result div
}



async function getOrders() {
    const data = await fetchData('/orders/');
    showForm('ordersForm');
    displayResult('orders-result', data);
}

document.getElementById('withdrawalFormSubmit').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!confirm("Are you sure you want to submit this withdrawal?")) return;

    const body = {
        assetName: document.getElementById('assetName').value,
        amount: document.getElementById('amount').value,
        address: document.getElementById('address').value,
    };

    const data = await fetchData('/withdraw/', 'POST', body);
    displayResult('withdrawal-result', data);
});

document.getElementById('orderFormSubmit').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!confirm("Are you sure you want to place this order?")) return;

    const body = {
        type: document.getElementById('orderType').value,
        side: document.getElementById('side').value,
        instrument: document.getElementById('instrument').value,
        quantity: document.getElementById('quantity').value,
        limitprice: document.getElementById('limitPrice').value,
    };

    const data = await fetchData('/create-order/', 'POST', body);
    displayResult('order-result', data);
});

document.getElementById('cancelOrderFormSubmit').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!confirm("Are you sure you want to cancel this order?")) return;

    const body = {
        orderId: document.getElementById('orderId').value,
    };

    const data = await fetchData('/cancel-order/', 'POST', body);
    displayResult('cancel-order-result', data);
});