const container=document.querySelector(".container");
const chatsContainer=document.querySelector(".chats-container");
const promptForm=document.querySelector(".prompt-form");
const promptInput=promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

//API setup
const API_KEY="AIzaSyB6Yca0euXrwqmw8xsSIE7g99T5WUPqx8Q";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`

let typingInterval,controller;
const chatHistory=[];
let userData = {message:"",file:{}};

//function to create message elements
const createMsgElement=(content,...classes)=>{
    const div=document.createElement("div");
    div.classList.add("message", ...classes); 
    div.innerHTML=content;
    return div;
}

//Simulate typing effect for bot responses
const scrollToBottom=()=>container.scrollTo({top: container.scrollHeight,behavior:"smooth"});

//simulate typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    typingInterval = setInterval(() => {
        if (wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
            scrollToBottom();
        } else {
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading"); // ✅ now only once
            document.body.classList.remove("bot-responding");
        }
    }, 40);
};

//Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    if (!textElement) return console.error("Missing .message-text");

    controller = new AbortController();

    const parts = [
        { text: userData.userMessage }
    ];

    if (userData.file?.data) {
        parts.push({
            inline_data: {
                mime_type: userData.file.mime_type,
                data: userData.file.data
            }
        });
    }

    chatHistory.push({
        role: "user",
        parts
    });

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        typingEffect(responseText, textElement, botMsgDiv);

        chatHistory.push({
            role: "model",
            parts: [{ text: responseText }]
        });

    } catch (error) {
        textElement.style.color = "#d62939";
        textElement.textContent = error.name === "AbortError"
            ? "Response generation stopped."
            : error.message;

        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");

    } finally {
        userData.file = {};
    }
};


//handle the form submission
const handleFormSubmit = (e) => {
    e.preventDefault();

    const userMessage = promptInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding")) return;

    promptInput.value = "";
    userData.userMessage = userMessage;  // ✅ corrected key
    document.body.classList.add("bot-responding", "chats-active");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

    // Create user message
    const userMsgHTML = `<p class="message-text"></p>
        ${userData.file.data ? (
            userData.file.isImage
                ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment"/>`
                : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
        ) : ""}`;

    const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
    userMsgDiv.querySelector(".message-text").textContent = userMessage;
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() => {
        const botMsgHTML = `<img src="gemini.svg/gemini-chatbot-logo.svg" class="avatar"><p class="message-text">Just a sec...</p>`;
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();
        generateResponse(botMsgDiv);
    }, 600);
};


//Handle file input change (file upload)
fileInput.addEventListener("change",()=>{
    const file=fileInput.files[0];
    if(!file) return;
    
    // userData.file = {};  // ✅ Clear previous file data
    const isImage=file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);


    reader.onload=(e)=>{
        fileInput.value="";
        const base64string=e.target.result.split(",")[1];
         fileUploadWrapper.querySelector(".file-preview").src=e.target.result;
        // const previewEl = fileUploadWrapper.querySelector(".file-preview");
        // if (previewEl) previewEl.src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage?"img-attached":"file-attached");
        
        //store file data
        userData.file={filename:file.name,data:base64string,mime_type:file.type,isImage};
    };
});

//cancel file upload
document.querySelector('#cancel-file-btn').addEventListener("click",()=>{
    userData.file={};
     fileUploadWrapper.classList.remove("active", "img-attached","file-attached");
});

//Stop ongoing bot response 
document.querySelector('#stop-response-btn').addEventListener("click",()=>{
    userData.file={};
    controller?.abort();
    clearInterval(typingInterval);
    // chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
    const loadingMsg = chatsContainer.querySelector(".bot-message.loading");
    if (loadingMsg) loadingMsg.classList.remove("loading");
     document.body.classList.remove("bot-responding");
     
});

//Delete all chats
document.querySelector('#delete-chats-btn').addEventListener("click",()=>{
    chatHistory.length=0;
    chatsContainer.innerHTML="";
    document.body.classList.remove("bot-responding");
});

//Handle suggestions click
document.querySelectorAll(".suggestions-item").forEach(item=>{
    item.addEventListener("click",()=>{
        promptInput.value=item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    });
});

// show/hide controls for mobile and prompt input focus
document.addEventListener("click",({target})=>{
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide=target.classList.contains("prompt-input")||(wrapper.classList.contains("hide-controls")&&(target.id==="add-file-btn"||target.id==="stop-response-btn"));
    wrapper.classList.toggle("hide-controls",shouldHide);
});

// Toggle dark/light theme
themeToggle.addEventListener("click",()=>{
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

//set initial theme from local storage
const isLightTheme =localStorage.getItem("themeColor") === "light_mode";
 document.body.classList.toggle("light-theme", isLightTheme);
 themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";

promptForm.addEventListener("submit",handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click",()=>fileInput.click());
