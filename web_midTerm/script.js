$(document).ready(function() {
    // --- PART 1: AJAX FETCH ---
    const apiUrl = 'https://fakestoreapi.com/products?limit=4';

    $.ajax({
        url: apiUrl,
        method: 'GET',
        success: function(products) {
            const container = $('#product-container');
            container.empty(); // Clear container as per task

            products.forEach(product => {
                // Reuse your 'insta-item' class for responsiveness
                const productHTML = `
                    <div class="insta-item" style="text-align:center; background:#f9f9f9; padding-bottom:15px; border:1px solid #eee;">
                        <img src="${product.image}" alt="${product.title}" style="height:200px; object-fit:contain; padding:10px;">
                        <h4 style="font-size:14px; padding:0 10px; height:40px; overflow:hidden;">${product.title}</h4>
                        <p style="color:#d9534f; font-weight:bold;">$${product.price}</p>
                        <button class="quick-view-btn" data-id="${product.id}">Quick View</button>
                    </div>
                `;
                container.append(productHTML);
            });
        },
        error: function() {
            $('#product-container').html('<p>Failed to load deals. Please try again later.</p>');
        }
    });

    // --- PART 2: MODAL INTERACTION ---
    // We use $(document).on because the buttons are added dynamically
    $(document).on('click', '.quick-view-btn', function() {
        const productId = $(this).data('id');
        
        // Fetch specific product details
        $.get(`https://fakestoreapi.com/products/${productId}`, function(data) {
            const details = `
                <img src="${data.image}">
                <h3>${data.title}</h3>
                <p style="font-size:14px; color:#555;">${data.description}</p>
                <p><strong>Rating:</strong> ${data.rating.rate} ⭐ (${data.rating.count} reviews)</p>
                <p style="font-size:20px; color:#d9534f; font-weight:bold;">$${data.price}</p>
            `;
            $('#modal-body').html(details);
            $('#product-modal').fadeIn();
        });
    });

    // Close Modal
    $('.close-button').click(function() {
        $('#product-modal').fadeOut();
    });

    // Close Modal if clicking outside the box
    $(window).click(function(event) {
        if (event.target.id === 'product-modal') {
            $('#product-modal').fadeOut();
        }
    });

    // --- YOUR EXISTING HAMBURGER CODE ---
    $('#hamburger').click(function() {
        $('#nav-menu').toggleClass('show');
    });
});