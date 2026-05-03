document.addEventListener("DOMContentLoaded",()=>{
    // Helper function for displaying messages (replicated from auth.html for consistency)
    const displayMessage = (element, message, isError = true) => {
        element.textContent = message;
        element.style.color = isError ? 'red' : 'green';
    };

    const contactForm=document.getElementById("contact-form");
    const messageDiv=document.getElementById("message"); // Using 'message' ID for consistency

    if(contactForm){
        contactForm.addEventListener("submit",async function(event){
            event.preventDefault();
            const name=document.getElementById("name").value;
            const email=document.getElementById("email").value;
            const message=document.getElementById("message").value; // Assuming textarea has ID 'message'

            const submitButton=contactForm.querySelector('button[type="submit"]');
            submitButton.disabled=true;
            submitButton.innerHTML='Sending... <span class="spinner"></span>';
            
            messageDiv.textContent=""; // Clear previous messages

            try{
                const response=await fetch("/api/contact",{
                    method:"POST",
                    headers:{"Content-Type":"application/json"},
                    body:JSON.stringify({name,email,message})
                });
                const data=await response.json();
                submitButton.disabled=false;
                submitButton.innerHTML="Send Message";

                if(response.ok){
                    displayMessage(messageDiv, "Message sent successfully! We'll get back to you soon.", false); // false for success
                    contactForm.reset();
                } else {
                    displayMessage(messageDiv, data.message || 'Failed to send message.');
                }
            } catch(error) {
                console.error("Error:",error);
                submitButton.disabled=false;
                submitButton.innerHTML="Send Message";
                displayMessage(messageDiv, "An unexpected error occurred. Please try again later.");
            }
        });
    }
});
