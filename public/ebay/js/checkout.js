import { calculateCartTotals, formatCartTotals } from './cart.js';
import { parseStoredCart, renderCheckoutCart } from './checkoutCart.js';

function displayShippingData(container, entries) {
    container.replaceChildren();
    const displayData = document.createElement('div');
    displayData.classList.add('col-4');
    const heading = document.createElement('h3');
    heading.textContent = 'Ship To';
    displayData.appendChild(heading);
    for (const [key, value] of entries) {
        const row = document.createElement('p');
        row.className = 'shipping-info';
        const label = document.createElement('strong');
        label.textContent = `${key}:`;
        row.append(label, ` ${value}`);
        displayData.appendChild(row);
    }
    return displayData;
}

//toggle between ship to form and the displayed data
document.getElementById("checkoutForm").addEventListener("submit", function(event) {
    event.preventDefault(); // Prevent form submission

    // Get form data
    const formData = new FormData(event.target);
    const formDataObject = {};
    formData.forEach((value, key) => {
        formDataObject[key] = value;
    });

    // Display form data
    const displayContainer = document.querySelector('.form-container');
    const displayData = displayShippingData(displayContainer, Object.entries(formDataObject));

    // Add edit button
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', function() {
        displayContainer.replaceChildren(); // Clear the display
        displayContainer.appendChild(event.target); // Append the original form
    });
    displayData.appendChild(editButton);

    displayContainer.appendChild(displayData);
});

// Add event listener to the cancel button of the form
document.getElementById("cancelButton").addEventListener("submit", function(event) {
    event.preventDefault(); // Prevent form submission

    // Display the original form data
    const displayContainer = document.querySelector('.form-container');
    const formData = new FormData(document.getElementById("checkoutForm"));
    const displayData = displayShippingData(displayContainer, formData.entries());

    // Add edit button
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', function() {
        displayContainer.replaceChildren(); // Clear the display
        displayContainer.appendChild(document.getElementById("checkoutForm")); // Append the original form
    });
    displayData.appendChild(editButton);

    displayContainer.appendChild(displayData);
});

//Display from payment
document.querySelectorAll('input[name="paymentMethod"]').forEach(function(radioButton) {
    radioButton.addEventListener("change", function() {
        if (this.id === 'newCardOption') {
            document.querySelector('.payment-options').style.display = 'none';
            document.querySelector('.pay-with').style.display = 'none';
            document.querySelector('.card-form').style.display = 'block';
        } else {
            document.querySelector('.payment-options').style.display = 'block';
            document.querySelector('.pay-with').style.display = 'block';
            document.querySelector('.card-form').style.display = 'none';
        }
    });
});

document.getElementById("cancelButton").addEventListener("click", function() {
    document.querySelector('.card-form').style.display = 'none';
    document.querySelector('.pay-with').style.display = 'block';
    document.querySelector('.payment-options').style.display = 'block';
});



//Redirect to the final Page
document.addEventListener("DOMContentLoaded", function() {
    const checkoutButton = document.getElementById("confirm");
    if (checkoutButton) {
        checkoutButton.addEventListener("click", function () {
            window.location.href = "../pages/final.html";
        });
    } else {
        console.error("Button with ID 'confirm' not found.");
    }
});



//Redirect to fianl page
document.addEventListener("DOMContentLoaded", function() {
    const checkoutButton = document.getElementById("confirm");
    if (checkoutButton) {
        checkoutButton.addEventListener("click", function () {
            window.location.href = "../pages/final.html";
        });
    } else {
        console.error("Button with ID 'confirm' not found.");
    }
});

// Retrieve cart items from local storage
const items = parseStoredCart(localStorage.getItem('cartItems'));
// Select the cart container where you want to display the items
const cartContainer = document.getElementById('reviewCart');
if (cartContainer) renderCheckoutCart(cartContainer, items);
//Retrive the calculated data
const totalItems = items.reduce((sum, item) => sum + (Math.max(Math.floor(Number(item.quantity)), 1) || 1), 0);
document.getElementById('realQty').textContent = String(totalItems);

const totals = calculateCartTotals(items);
const subTotal = formatCartTotals(totals, 'subtotal');
const shipping = formatCartTotals(totals, 'shipping');
const total = formatCartTotals(totals, 'total');
document.getElementById('realP').textContent = subTotal;
document.getElementById('shipCharge').textContent = shipping;
document.getElementById('totalAmount').textContent = total;
localStorage.setItem('totalItems', String(totalItems));
localStorage.setItem('subTotal', subTotal);
localStorage.setItem('shipping', shipping);
localStorage.setItem('total', total);

document.addEventListener('DOMContentLoaded', function() {
    const confirmButton = document.getElementById('confirm');

    // Function to enable/disable confirm button based on form inputs
    function updateConfirmButton() {
        const inputs = document.querySelectorAll('#checkoutForm input, #checkoutForm select');
        let isValid = false;

        inputs.forEach(input => {
            if (input.type === 'radio' || input.type === 'checkbox') {
                if (input.checked) {
                    isValid = true;
                    // Add primary color to the selected option
                    input.closest('.payment-options').classList.add('selected-option');
                }
            } else if (input.value.trim() !== '') {
                isValid = true;
                // Add primary color to the input field
                input.classList.add('selected-option');
            }
        });

        if (isValid) {
            confirmButton.disabled = false;
        } else {
            confirmButton.disabled = true;
        }
    }

    // Listen for changes in form inputs
    const formInputs = document.querySelectorAll('#checkoutForm input, #checkoutForm select');
    formInputs.forEach(input => {
        input.addEventListener('change', updateConfirmButton);
    });

    // Cancel button functionality
    const cancelButton = document.getElementById('cancelButton');
    cancelButton.addEventListener('click', function(event) {
        event.preventDefault();
        // Reset form and disable confirm button
        document.getElementById('checkoutForm').reset();
        confirmButton.disabled = true;
    });
});


