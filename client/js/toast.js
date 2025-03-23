const ex = new Image();
ex.src = "/assets/toasticon.png";

function addToast(title, message) {
    // Select the toast container
    let toastContainer = document.getElementById("add-toasts-here");

    if (!toastContainer) {
        console.error("Toast container with ID 'add-toasts-here' not found!");
        return;
    }

    // Create a new toast element
    let toast = document.createElement("div");
    toast.classList.add("toast");
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");
    toast.setAttribute("data-autohide", "false"); // Set to "false" if you want it to stay until closed

    // Add toast content
    toast.innerHTML = `
        <div class="toast-header">
            <img src="/assets/toasticon.png" width="30px" height="30px" class="rounded mr-2" alt="...">
            <strong class="mr-auto">${title}</strong>
            <small class="text-muted"></small>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="ml-2 mb-1 close" data-bs-dismiss="toast" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;

    // Append the new toast inside the container
    toastContainer.appendChild(toast);

    // Initialize and show the toast
    let bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Remove toast from DOM after it's hidden
    toast.addEventListener("hidden.toast", function () {
        toast.remove();
        bsToast.hide();
    });
}

function addToastWithLink(title, message, link) {
    // Select the toast container
    let toastContainer = document.getElementById("add-toasts-here");

    if (!toastContainer) {
        console.error("Toast container with ID 'add-toasts-here' not found!");
        return;
    }

    // Create a new toast element
    let toast = document.createElement("div");
    toast.classList.add("toast");
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");
    toast.setAttribute("data-autohide", "false"); // Set to "false" if you want it to stay until closed

    // Add toast content
    toast.innerHTML = `
        <div class="toast-header">
            <img src="/assets/toasticon.png" width="30px" height="30px" class="rounded mr-2" alt="...">
            <strong class="mr-auto">${title}</strong>
            <small class="text-muted"></small>
            <button type="button" onclick="this.parentElement.parentElement.remove()" class="ml-2 mb-1 close" data-bs-dismiss="toast" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
        <div class="toast-body">
            ${message}
            <a href="${link}" class="btn btn-primary btn-sm">View Image</a>
        </div>
    `;

    // Append the new toast inside the container
    toastContainer.appendChild(toast);

    // Initialize and show the toast
    let bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Remove toast from DOM after it's hidden
    toast.addEventListener("hidden.toast", function () {
        toast.remove();
        bsToast.hide();
    });
}

function addToastWithCode(title, message, code) {
    // Select the toast container
    let toastContainer = document.getElementById("add-toasts-here");

    if (!toastContainer) {
        console.error("Toast container with ID 'add-toasts-here' not found!");
        return;
    }

    // Create a new toast element
    let toast = document.createElement("div");
    toast.classList.add("toast");
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
    toast.setAttribute("aria-atomic", "true");
    toast.setAttribute("data-autohide", "false"); // Set to "false" if you want it to stay until closed

    // Add toast content
    toast.innerHTML = `
    <div class="toast-header">
        <img src="/assets/toasticon.png" width="30px" height="30px" class="rounded mr-2" alt="...">
        <strong class="mr-auto">${title}</strong>
        <small class="text-muted"></small>
        <button type="button" onclick="this.parentElement.parentElement.remove()" class="ml-2 mb-1 close" data-bs-dismiss="toast" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    </div>
    <div class="toast-body">
        ${message}
        <pre><code>${code}</code></pre>
    </div>

        <style>
        .toast-body code {
            display: none; /* Hide the code by default */
        }

        .toast-body:hover code {
            display: block; /* Show the code when the toast body is hovered */
        }
        </style>
    `;

    // Append the new toast inside the container
    toastContainer.appendChild(toast);

    // Initialize and show the toast
    let bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Remove toast from DOM after it's hidden
    toast.addEventListener("hidden.toast", function () {
        toast.remove();
        bsToast.hide();
    });
}

// Example usage: Call this function to add a toast
// addToast("Notification", "This is a dynamically added toast!");
// addToastWithLink("Notification", "This is a dynamically added toast with a link!", "https://www.example.com");
// addToastWithCode("Notification", "Hover to view code!", "secret_token");