
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showModal() {
    document.getElementById('modalOverlay').style.display = 'block';
}

function hideModal() {
    document.getElementById('modalOverlay').style.display = 'none';
}

function showForm(formId) {
    hideAllForms();
    showModal();
    document.getElementById(formId).style.display = 'block';
}

function hideForm(formId) {
    document.getElementById(formId).style.display = 'none';
    hideModal();
}

function hideAllForms() {
    const forms = document.querySelectorAll('.modal');
    forms.forEach(form => form.style.display = 'none');
}

// Data fetching function
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
        console.error('Error:', error);
        return { error: error.message };
    } finally {
        hideLoading();
    }
}

// Balance handling
async function getBalance() {
    const result = await fetchData('/get-balance/');
    if (result.data) {
        displayBalances(result.data);
    } else {
        showError('Failed to fetch balances');
    }
}

async function cancelOrder(orderId) {
    const cancelButton = document.querySelector(`button[onclick="cancelOrder('${orderId}')"]`);
    
    try {
        // Ask for confirmation before disabling the button
        if (!confirm('Are you sure you want to cancel this order?')) {
            return;
        }

        // Disable button and show loading state
        if (cancelButton) {
            cancelButton.disabled = true;
            cancelButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';
        }
    
        showLoading(); // Show global loading indicator
        
        const result = await fetchData('/cancel-order/', 'POST', { orderId });
        
        if (result.error) {
            showError(result.error);
        } else {
            showSuccess('Order cancelled successfully');
            await refreshOrders();
        }
    } catch (error) {
        showError('Failed to cancel order: ' + error.message);
    } finally {
        hideLoading(); // Hide global loading indicator
        
        // Reset button state
        if (cancelButton) {
            cancelButton.disabled = false;
            cancelButton.innerHTML = 'Cancel';
        }
    }
}

function displayBalances(data) {
    const availableBalances = data.Available || {};
    const lockedBalances = data.Locked || {};
    
    const container = document.getElementById('balanceTableContainer');
    
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Asset</th>
                    <th>Available</th>
                    <th>Locked</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const allAssets = new Set([...Object.keys(availableBalances), ...Object.keys(lockedBalances)]);
    
    allAssets.forEach(asset => {
        const available = parseFloat(availableBalances[asset] || 0);
        const locked = parseFloat(lockedBalances[asset] || 0);
        const total = available + locked;
        
        if (total > 0) {
            tableHTML += `
                <tr>
                    <td>${asset.toUpperCase()}</td>
                    <td>${formatNumber(available)}</td>
                    <td>${formatNumber(locked)}</td>
                    <td>${formatNumber(total)}</td>
                </tr>
            `;
        }
    });
    
    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
}

// Order handling
function showOrdersSection() {
    showForm('ordersSection');
    refreshOrders();
}

async function refreshOrders() {
    const statusFilter = document.getElementById('statusFilter').value;
    const sourceFilter = document.getElementById('sourceFilter').value;
    
    const result = await fetchData(`/orders/?status=${statusFilter}&source=${sourceFilter}`);
    
    if (result.error) {
        showError(result.error);
        return;
    }
    
    displayOrders(result.data);
}

function displayOrders(orders) {
    const tableBody = document.getElementById('ordersTableBody');
    tableBody.innerHTML = '';
    
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="scrollable-id">${formatOrderId(order.order_id)}</div> 
            </td>
            <td>${order.instrument}</td>
            <td>${order.type || 'LIMIT'}</td>
            <td class="${order.side.toLowerCase()}">${order.side}</td>
            <td>${formatNumber(order.quantity)} / ${formatNumber(order.filled_quantity)}</td>
            <td>${formatNumber(order.limit_price)}</td>
            <td><span class="status-pill status-${order.status.toLowerCase()}">${order.status}</span></td>
            <td>
                ${order.status === 'OPEN' ? 
                    `<button class="secondary-btn" onclick="cancelOrder('${order.order_id}')">Cancel</button>` 
                    : '-'}
            </td>
        `;
        tableBody.appendChild(row);
    });
}



// Form handling
document.getElementById('withdrawalFormSubmit').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!confirm('Are you sure you want to process this withdrawal?')) return;
    
    const formData = {
        assetName: document.getElementById('assetName').value,
        amount: document.getElementById('amount').value,
        address: document.getElementById('address').value,
        chain: document.getElementById('chain').value,
    };
    
    const result = await fetchData('/withdraw/', 'POST', formData);
    handleFormResult(result, 'withdrawal-result');
});

document.getElementById('orderFormSubmit').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!confirm('Are you sure you want to place this order?')) return;
    
    const formData = {
        type: document.getElementById('orderType').value,
        side: document.getElementById('side').value,
        instrument: document.getElementById('instrument').value,
        quantity: document.getElementById('quantity').value,
        limitPrice: document.getElementById('limitPrice').value,
    };
    
    const result = await fetchData('/create-order/', 'POST', formData);
    handleFormResult(result, 'order-result');
});

document.getElementById('cancelOrderFormSubmit').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const orderId = document.getElementById('orderId').value;
    if (!orderId) {
        showError('Please enter an order ID');
        return;
    }
    
    await cancelOrder(orderId);
    hideForm('cancelOrderForm');
});

// Handle order type change
document.getElementById('orderType').addEventListener('change', function(e) {
    const limitPriceGroup = document.getElementById('limitPriceGroup');
    limitPriceGroup.style.display = e.target.value === 'LIMIT' ? 'block' : 'none';
});

// Utility functions
function handleFormResult(result, resultElementId) {
    const resultElement = document.getElementById(resultElementId);
    if (result.error) {
        resultElement.innerHTML = `<div class="error">${result.error}</div>`;
    } else {
        resultElement.innerHTML = `<div class="success">Operation successful!</div>`;
        setTimeout(() => {
            hideAllForms();
            refreshOrders();
        }, 2000);
    }
}

function formatNumber(num) {
    if (!num) return '0';
    return parseFloat(num).toFixed(8);
}

function formatOrderId(orderId) {
    return orderId.substring(0, 8) + '...';
}

function showError(message) {
    // You can implement a toast or notification system here
    console.error(message);
    alert(message);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    getBalance();
});


// Format currency amounts nicely
function formatCurrency(amount, decimals = 8) {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    
    if (num < 0.00000001) return '0';
    if (num < 0.0001) return num.toFixed(8);
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    if (num < 100) return num.toFixed(2);
    
    return num.toFixed(2);
}

// Debounce function for input handlers
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add commas to large numbers
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Validate input as numeric
function validateNumericInput(event) {
    const charCode = (event.which) ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57) && charCode !== 46) {
        event.preventDefault();
        return false;
    }
    return true;
}

// Handle websocket connection for real-time updates
let ws;
function connectWebSocket() {
    ws = new WebSocket('wss://your-websocket-url');
    
    ws.onopen = function() {
        console.log('WebSocket connected');
    };
    
    ws.onmessage = function(event) {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };
    
    ws.onclose = function() {
        console.log('WebSocket disconnected');
        setTimeout(connectWebSocket, 5000);
    };
}

function handleWebSocketMessage(data) {
    if (data.type === 'balance_update') {
        updateBalance(data.balance);
    } else if (data.type === 'order_update') {
        updateOrder(data.order);
    }
}

function updateBalance(balance) {
    // Update balance in UI without refreshing everything
    const balanceElement = document.querySelector(`[data-asset="${balance.asset}"]`);
    if (balanceElement) {
        balanceElement.querySelector('.available').textContent = formatCurrency(balance.available);
        balanceElement.querySelector('.locked').textContent = formatCurrency(balance.locked);
    }
}

function updateOrder(order) {
    // Update order in UI without refreshing everything
    const orderRow = document.querySelector(`[data-order-id="${order.id}"]`);
    if (orderRow) {
        orderRow.querySelector('.status').textContent = order.status;
        orderRow.querySelector('.filled').textContent = formatCurrency(order.filled_quantity);
    } else {
        refreshOrders(); // If we can't find the order, refresh the whole list
    }
}

// Export functions if using modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCurrency,
        debounce,
        numberWithCommas,
        validateNumericInput,
        connectWebSocket
    };
}

function showSuccess(message) {
    const resultElement = document.getElementById('cancel-order-result');
    resultElement.innerHTML = `<div class="success">${message}</div>`;
    setTimeout(() => {
        resultElement.innerHTML = '';
    }, 3000);
}