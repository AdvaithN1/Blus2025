let APP_ID = ""

let runningMode = "VIDEO";
var timer;

let isHost = false

let predictWebcamInterval = 70

let flagInterval = 3

var secondPersonDetectedBuffer = Array(Math.floor(flagInterval/(predictWebcamInterval*0.001))).fill(false);
var cellPhoneDetectedBuffer = Array(Math.floor(flagInterval/(predictWebcamInterval*0.001))).fill(false);

var nodebuffer = [];

var flags = {}
// var handout = 0


const client = AgoraRTC.createClient({mode:'rtc', codec:'vp8'});

var signalingEngine = null;
let channel;

let localTracks = [];
let remoteUsers = {};

var recogStopped = true

secondExternalWhiteboardHalf = ""
thirdExternalWhiteboardHalf = ""
fourthExternalWhiteboardHalf = ""
fifthExternalWhiteboardHalf = ""
sixthExternalWhiteboardHalf = ""
seventhExternalWhiteboardHalf = ""
eighthExternalWhiteboardHalf = ""

let username = "";
let unid = "";

const userCookie = document.cookie.split(';').find(cookie => cookie.trim().startsWith('user='));

if (userCookie) {
    const userData = JSON.parse(decodeURIComponent(userCookie.split('=')[1]));
    // document.getElementById('logintxt').innerText = `Welcome, ${userData.username}!`;
    username = userData.tempname;
    unid = userData.id+"="+userData.tempname;
    unid = unid.replaceAll(" ", "_")
    console.error("unid: "+unid+" username: "+username)
}
else{
    username="ERROR FETCHING DATA"
    unid="ERRORFETCHINGUNID"
}

var externalWhiteboardTrigger = false;

let speechRestartAttempts = 0;
const maxSpeechRestartAttempts = 100000;

const url = window.location.href;
const pathSegments = url.split("/");
const meetingId = pathSegments[pathSegments.length - 1];

var isScreenShared = false;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

var whiteboardOpen = false;

var whiteboardArr = [];

var canvas;
var dpr = window.devicePixelRatio || 1;
var ctx;

var currentcaps
var currentspeak

var langDict = {
    "1": "en-US",
    "2": "es-ES",
    "3": "fr-FR",
    "4": "zh-CN",
    "5": "ar-EG",
}

var currentlang = "en-US";



var startTime = performance.now();

function startSpeechRecognition() {
    document.querySelector(".lang") 
		.addEventListener("change", function(evt){ 
            console.error("LANGUAGE CHANGED TO: "+langDict[evt.target.value])
            currentlang = langDict[evt.target.value]
			recognition.lang = langDict[evt.target.value]
            try{
                recognition.stop();
                recognition.start();
            }
            catch(err){}
	})

    recogStopped = false
    recognition.lang = currentlang; // Set the language as needed en-US
    console.log("CHANGING LANG IN START RECOG")

    recognition.onresult = (event) => { // This used to be after recognition.start
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            // if(transcript!=""){updateCaptions(transcript)}
            if (event.results[i].isFinal && transcript!="") {
                updateCaptions(transcript);
            } else {
                interimTranscript += transcript;
            }
        }
        // Optionally display interim results
        // document.getElementById("interimCaptions").innerText = interimTranscript;
    };

    recognition.onended = (event) => {
        console.error("SPEECH RECOG ENDED")
        speechRestartAttempts++
        if(speechRestartAttempts<maxSpeechRestartAttempts && !recogStopped){
            startSpeechRecognition()
        }
    }

    recognition.start();

    recognition.onerror = (event) => {
        // console.error('Speech recognition error:', event.error, ' Attempting to restart');
        speechRestartAttempts++
        if(speechRestartAttempts<maxSpeechRestartAttempts){
            try{
                recognition.start();
            }
            catch(err){}
        }
    };
}

function stopSpeechRecognition() {
    recogStopped = true
    recognition.stop();
}

function getCompressedDataUrl(imageData, quality = 0.8, format = "image/jpeg") {
    return new Promise((resolve) => {
        // Create a temporary canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set canvas dimensions
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        // Draw ImageData onto canvas
        ctx.putImageData(imageData, 0, 0);

        // Convert to compressed data URL
        canvas.toBlob((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        }, format, quality);
    });
}

async function updateCaptions(newCaptions) {
    const captionsContainer = document.getElementById("captions");

    captionsContainer.innerHTML = captionsContainer.innerHTML + "\n\n<br>"+`${username}` + `: ${newCaptions}</br>\n`;
    
    /*
    const scrollCaps = document.getElementsByClassName("capContainer2");

    const currentPosition = captionsContainer.scrollTop;    
    console.error("CURRENT POSITION: "+ currentPosition);
    
    for (const scrollCap of scrollCaps) {        
        scrollCap.scroll(0, scrollCap.scrollHeight);    
    }*/

    const container = document.querySelector('.capContainer2');

                // Function to scroll to the bottom
                function scrollToBottom() {
                    container.scrollTop = container.scrollHeight;
                }

                // Scroll to bottom initially
                scrollToBottom();

                // Add event listener to scroll event
                container.addEventListener('scroll', () => {
                    // If the user scrolls up, disable auto-scroll to bottom
                    if (container.scrollTop + container.clientHeight < container.scrollHeight) {
                        container.classList.remove('scroll-lock');
                    } else {
                        // If the user scrolls back down, enable auto-scroll to bottom
                        container.classList.add('scroll-lock');
                        scrollToBottom();
                    }
                });
    
    
    for (const userId in remoteUsers) {
        try { 
            console.error("TRYING TO SEND MESSAGE TEXT: "+`${username}: ${newCaptions}`+" TO USER: "+userId);
            // await signalingEngine.sendMessageToPeer(meetingId, newCaptions);
            await channel.sendMessage({text: `${username}: ${newCaptions}`}, userId);
        } catch (err) {
        console.error("PUBLISH MESSAGE ERROR: "+err);
        }
    }
}

async function updateCaptionsCustom(newCaptions, display=true) {

    if (display){

        const captionsContainer = document.getElementById("captions");

        captionsContainer.innerHTML = captionsContainer.innerHTML + "\n\n<br>"+`\n${newCaptions}</br>`;


        const container = document.querySelector('.capContainer2');

        // Function to scroll to the bottom
        function scrollToBottom() {
            container.scrollTop = container.scrollHeight;
        }

        // Scroll to bottom initially
        scrollToBottom();
        

        // Add event listener to scroll event
        container.addEventListener('scroll', () => {
            // If the user scrolls up, disable auto-scroll to bottom
            if (container.scrollTop + container.clientHeight < container.scrollHeight) {
                container.classList.remove('scroll-lock');
            } else {
                // If the user scrolls back down, enable auto-scroll to bottom
                container.classList.add('scroll-lock');
                scrollToBottom();
            }
        });
    }

    console.error("TRYING TO SEND MESSAGE: "+newCaptions)
    for (const userId in remoteUsers) {
        try { 
            console.error("TRYING TO SEND MESSAGE TEXT: "+`\n${newCaptions}\n`+" TO USER: "+userId);
            // await signalingEngine.sendMessageToPeer(meetingId, newCaptions);
            await channel.sendMessage({text: newCaptions}, userId);
        } catch (err) {
        console.error("PUBLISH MESSAGE ERROR: "+err);
        }
    }
}

function updateExternalCaptions(user, caps){ // Incoming caption updates from another user
    const captionsContainer = document.getElementById("captions");
    captionsContainer.innerText = captionsContainer.innerText+"\n"+caps;

    // captionsContainer.innerHTML = captionsContainer.innerHTML + "\n\n<br>"+`${username}: ${newCaptions}</br>\n`;
    

    const container = document.querySelector('.capContainer2');

    // Function to scroll to the bottom
    function scrollToBottom() {
        container.scrollTop = container.scrollHeight;
    }

    // Scroll to bottom initially
    scrollToBottom();

    // Add event listener to scroll event
    container.addEventListener('scroll', () => {
        // If the user scrolls up, disable auto-scroll to bottom
        if (container.scrollTop + container.clientHeight < container.scrollHeight) {
            container.classList.remove('scroll-lock');
        } else {
            // If the user scrolls back down, enable auto-scroll to bottom
            container.classList.add('scroll-lock');
            scrollToBottom();
        }
    });
}

// setInterval(() => {
//     const exampleCaptions = " [ASL]: This is an example caption. " + Date.now();
//     updateCaptions(exampleCaptions); 
//   }, 5000); 

function setCss() {
    function countDirectDivs() {
        let parentElement = document.getElementById('video-streams');
        if (!parentElement) return 0;

        return Array.from(parentElement.children).filter(child => child.tagName === "DIV").length;
    }

    num_user_divs = countDirectDivs();
    var a = document.getElementById("stream-wrapper").clientWidth/2;
    document.getElementById("video-streams").style.setProperty('grid-template-columns', 'repeat(' + Math.ceil(num_user_divs/2).toString() + ', ' + a + 'px)');
    
}
let joinAndDisplayLocalStream = async (meetingId, token, rtmtoken) => {
    client.on('user-published', handleUserJoined);
    client.on('user-left', handleUserLeft);
    client.on('user-unpublished', handleUserUnpublished);
    console.log("joining with client...");
    // console.error("JOINING WITH CLIENT.JOIN WITH PARAMS: APPID: "+APP_ID+" MEETINGID: "+meetingId+" TOKEN: "+token+" UNID: "+unid)
    let UID = await client.join(APP_ID, meetingId, token, unid); //meetingId used to be Channel ("main")  client.join(APP ID, CHANNEL_NAME, TOKEN)
    console.log("UID: "+UID);
    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

    let player = `<div class="video-container" id="user-container-${UID}">
                        <div class="video-player" id="user-${UID}">
                            <div class="user-uid">Username: ${username} (You)</div> 
                        </div>
                        
                        <canvas class="output_canvas" id="output_canvas"></canvas>
                  </div>`;
    
    setCss();
    
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

    localTracks[1].play(`user-${UID}`);

    await client.publish([localTracks[0], localTracks[1]]);

    startSpeechRecognition();

    


    //INITIALIZING MESSAGING SYSTEM
    // signalingEngine = new AgoraRTM.RTM(APP_ID, unid, { token: rtmtoken });
     signalingEngine = AgoraRTM.createInstance(APP_ID);
    // signalingEngine = new AgoraRTM.RTM(APP_ID, unid)
    // signalingEngine = new AgoraRTM(APP_ID, uid);
    
    try{
        // await signalingEngine.login({'uid':username, 'token':token})
        // RTM TOKEN IS UNDEFINED
        console.error("APPID: "+APP_ID+" RTMTOKEN: "+rtmtoken+" UNID: "+unid)
        await signalingEngine.login({'token': rtmtoken, 'uid': unid});// GIVES ERROR
         console.error("LOGGED IN TO RTM");
    }

    catch(err){
        console.error({ err }, 'ERROR AT RTM LOGIN.'); 
    }

    channel = signalingEngine.createChannel(meetingId);
    await channel.join() 

    // channel.on('message', (eventArgs) => {
    //     // console.log(`${eventArgs.publisher}: ${eventArgs.message}`);
    //     updateExternalCaptions(eventArgs.publisher, eventArgs.message);
    //     console.error("RECEIVED MESSAGE: "+eventArgs);
    // })
    // channel.on('MessageFromPeer', (eventArgs) => {
    //     updateExternalCaptions(eventArgs.publisher, eventArgs.message);
    //     console.error("RECEIVED MESSAGE: "+eventArgs);
    // })



    channel.on('ChannelMessage', ({
        text
     }, senderId) => {
        // var senderName = senderId.split("=")[1].replaceAll("_", " ");
        var senderName;
        if(senderId == "ERRORFETCHINGUNID"){
            newName = "ERROR FETCHING DATA"
        }
        else{
            newName = senderId.split("=")[1].replaceAll("_", " ");
        }
         console.error("Sendername: "+senderName)
         if(text.trim() == senderName + " joined the call."){
             var audioPlayer = document.getElementById('audioPlayer');
             audioPlayer.play();
         }

         console.error("RECEIVED MESSAGE: "+text)
         console.error("SENDER ID: "+senderName)

        splitted = text.trim().split(" ");
        if(splitted[0] === "SECRETSENDING"){
            addToastWithCode("Code Received from "+newName, "Hover to view", splitted.slice(1, splitted.length).join(" "))
        }
        if(splitted[0] === "SecondEighth"){
            secondExternalWhiteboardHalf = splitted[1]
            return
        }
        if(splitted[0] === "ThirdEighth"){
            thirdExternalWhiteboardHalf = splitted[1]
            return
        }
        if(splitted[0] === "FourthEighth"){
            fourthExternalWhiteboardHalf = splitted[1]
            return
        }
        if(splitted[0] === "FifthEighth"){
            fifthExternalWhiteboardHalf = splitted[1]
            return
        }
        if(splitted[0] === "SixthEighth"){
            sixthExternalWhiteboardHalf = splitted[1]
            return
        }
        if(splitted[0] === "SeventhEighth"){
            seventhExternalWhiteboardHalf = splitted[1]
            return
        }
        if(splitted[0] === "EighthEighth"){
            eighthExternalWhiteboardHalf = splitted[1]
            return
        }

        if(splitted[splitted.length-1].substring(0, 10) === "data:image")
        {
            console.error("RECEIVED FRAME!!!!!!!!!!!!!!!!!!!!!: ")
            link = splitted[splitted.length-1];
            console.error(link+secondExternalWhiteboardHalf+thirdExternalWhiteboardHalf+fourthExternalWhiteboardHalf+fifthExternalWhiteboardHalf+sixthExternalWhiteboardHalf+seventhExternalWhiteboardHalf+eighthExternalWhiteboardHalf)
            // Remove last element and combine
            nameWithoutLink = splitted.slice(0, splitted.length-1).join(" ");
            addToastWithLink(nameWithoutLink+" has sent an image!", "", link+secondExternalWhiteboardHalf+thirdExternalWhiteboardHalf+fourthExternalWhiteboardHalf+fifthExternalWhiteboardHalf+sixthExternalWhiteboardHalf+seventhExternalWhiteboardHalf+eighthExternalWhiteboardHalf);
            flags[senderId].push(text.trim());
            console.error("ALL FLAGS: "+flags)
            return
        }

         if(text.trim() == "Whiteboard closed by "+senderName){
             if(whiteboardOpen){
                 console.error("TOGGLING WHITEBOARD EXTERNALLY")
                 // toggleWhiteboard();
                 externalWhiteboardTrigger = true;
                 const get= document.getElementById('whiteboard-btn');  
                 get.click();  
                
                 updateExternalCaptions(senderId, text)
                 setCss()
                 return
             }
         }
         if(text.trim() == "Whiteboard opened by "+senderName){
             if(!whiteboardOpen){
                 console.error("TOGGLING WHITEBOARD EXTERNALLY")
                 // toggleWhiteboard();
                 externalWhiteboardTrigger = true
                 const get= document.getElementById('whiteboard-btn');  
                 get.click();  
                 updateExternalCaptions(senderId, text)
                 setCss()
                 return
             }
         }
         if(text.trim() == senderId+" joined the call."){
             if(whiteboardOpen){
                 console.error("TOGGLING WHITEBOARD DUE TO USER JOIN")
                 updateExternalCaptions(senderId, text+" Closing whiteboard due to user joining.");
                 externalWhiteboardTrigger = true
                 const get= document.getElementById('whiteboard-btn');  
                 get.click();
                 return
             }
             updateExternalCaptions(senderId, text);
         }
         try{
             tempArr = JSON.parse(JSON.parse(text).whiteboardArr);
             for(var i = 0; i < tempArr.length; i++){
                 item = tempArr[i].text
                 console.error("THIS SHOULD BE A WHITEBOARD UPDATE LIST: "+JSON.stringify(item))
                 if (item.drawing == true) {
                     if (item.erasing == true) {
                         console.log("Erasing for others.");
                         color = "#FFFFFF";
                         ctx.strokeStyle = "#FFFFFF";
                         try{
                             ctx.lineWidth = 50;
                         }
                         catch(err){
                             console.error("ERROR IN ERASING LINEWIDTH: "+err);
                         }
                         ctx.beginPath();
                         ctx.moveTo(item.lastPosNow.x, item.lastPosNow.y);
                         ctx.lineTo(item.mousePosNow.x, item.mousePosNow.y);
                         ctx.stroke();
                         item.lastPosNow = item.mousePosNow;
                         ctx.closePath();
                         if(canvas!=null){
                             dataUrl = canvas.toDataURL();
                             whiteboardData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                         }
                     }
                     else {
                         console.log("Drawing for others.");
                         try{
                             ctx.lineWidth = 4;
                         }
                         catch(err){
                             console.error("ERROR IN Drawing LINEWIDTH: "+err);
                         }
                         ctx.strokeStyle = item.color;
                         ctx.beginPath();
                         ctx.moveTo(item.lastPosNow.x, item.lastPosNow.y);
                         ctx.lineTo(item.mousePosNow.x, item.mousePosNow.y);
                         ctx.stroke();
                         item.lastPosNow = item.mousePosNow;
                         ctx.closePath();
                         if(canvas!=null){
                             dataUrl = canvas.toDataURL();
                             whiteboardData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                         }
                     }
                 }
             }
         }

         catch(err){
             console.error("ERROR IN JSON PARSING: "+err);
             updateExternalCaptions(senderId, text);
         }
     });

    const captionsContainer = document.getElementById("captions");
    captionsContainer.innerText += `\n${username} joined the call.`;

    
    var audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.play();

    if (Object.keys(remoteUsers).length == 0) {
        isHost = true
    }

    for (const userId in remoteUsers) {
        try { 
            // console.error("TRYING TO SEND MESSAGE TEXT: "+`${username}: ${newCaptions}`+" TO USER: "+userId);
            await channel.sendMessage({text: `${username} joined the call.`}, userId);
        } catch (err) {
        console.error("PUBLISH MESSAGE ERROR: "+err);
        }
    }
}

let joinStream = async () => {
    console.log("Username: "+unid);
    var response;
    while(true){
        pass = prompt("Enter the password for the meeting: ");
        response = await fetch(`/rte/${meetingId}/publisher/uid/${unid}/${pass}`);  // CHANGE 0 TO ${meetingId}
        
        if(response.status == 401){
            alert("Incorrect password. Please try again.");
        }
        else if(response.status==404){
            alert("Channel doesn't exist. Please log in to create one.")
        }
        else{
            break
        }
    }
    const data = await response.json();
    console.log("RESPONSE FOR FETCHING IS "+data)
    const token = data.rtcToken;
    const rtmtoken = data.rtmToken;
    APP_ID = data.appid;
    console.log(rtmtoken)
    await joinAndDisplayLocalStream(meetingId, token, rtmtoken);

    document.getElementById('stream-controls').style.display = 'flex';
    setCss()
}

let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    flags[user.uid] = []
    // updateCaptions(`USER JOINED ${mediaType}`);
    await client.subscribe(user, mediaType);
    // checking if user is ERROR_FETCHING_DATA
    var newName
    if(user.uid == "ERRORFETCHINGUNID"){
        newName = "ERROR FETCHING DATA"
    }
    else{
        newName = user.uid.split("=")[1].replaceAll("_", " ");
    }
    console.error("NEW NAME: "+newName)
    if (mediaType === 'video'){
        let player = document.getElementById(`user-container-${user.uid}`);
        if (player != null){
            player.remove();
        }
        
        player = `<div class="video-container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}">
                            <div class="user-uid">Username: ${newName}</div> 
                        </div> 
                 </div>`

        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)

        user.videoTrack.play(`user-${user.uid}`)

        setCss()
    }

    if (mediaType === 'audio'){
        user.audioTrack.play()
    }
}

let handleUserLeft = async (user) => {
    delete remoteUsers[user.uid]
    
    document.getElementById(`user-container-${user.uid}`).remove()

    var audioPlayer = document.getElementById('audioPlayerLeave');
    audioPlayer.play();

    setCss();
}

let handleUserUnpublished = async (user, mediaType) => {

    if(mediaType == 'audio'){
        return
    }

    // delete remoteUsers[user.uid]
    // document.getElementById(`user-container-${user.uid}`).remove()
}

let leaveAndRemoveLocalStream = async () => {
    stopSpeechRecognition();
    const lan = document.getElementById('language');
    const capsT = document.getElementById('captionTitle');
    const chat = document.getElementById('chatbox');
    const caps = document.getElementById('captions');
    const capsC = document.getElementById('captions-column');
    lan.style.opacity = '0';
    caps.style.opacity = '0';
    capsC.style.opacity = '0';
    capsT.style.opacity = '0';
    chat.style.opacity = '0';

    if(isScreenShared){
        toggleScreenShare();
    }
    
    for(let i = 0; localTracks.length > i; i++){
        localTracks[i].stop()
        localTracks[i].close()
    }

    try{const currentPosition = captionsContainer.scrollTop;
    console.error("CURRENT POSITION: "+ currentPosition)

    for (const scrollCap of scrollCaps) {
        scrollCap.scroll(0, scrollCap.scrollHeight);
    }
        await client.leave()
        
        await channel.leave()
        await signalingEngine.logout()
    }
    
    catch(err){
        console.error(err)
    }

    remoteUsers = []

    // document.getElementById('join-btn').style.display = 'block'
    // document.getElementById('stream-controls').style.display = 'none'
    // document.getElementById('video-streams').innerHTML = ''

    // document.getElementById('stream-wrapper').style.display = 'none';
    window.location.href = "/";
}
const micOffImg = new Image();
micOffImg.src = "/assets/micoff.png";
const camOffImg = new Image();
camOffImg.src = "/assets/camoff.png";
const ssOffImg = new Image();
ssOffImg.src = "/assets/ssofff.png";
const wbOffImg = new Image();
wbOffImg.src = "/assets/wboff.png";
const eraseImg = new Image();
eraseImg.src = "/assets/erase.png";

const eraseAImg = new Image();
eraseAImg.src = "/assets/eraseon.png";

let toggleMic = async (e) => {
    if (localTracks[0].muted){
        
        e.target.style.backgroundColor = '#3D5154'
        e.target.style.backgroundImage = 'url("/assets/micon.png")'

        await localTracks[0].setMuted(false)
        startSpeechRecognition();
    } else{
        e.target.style.backgroundColor = '#FF3217'
        e.target.style.backgroundImage = 'url("/assets/micoff.png")'

        await localTracks[0].setMuted(true)
        stopSpeechRecognition();
    }
}

let toggleCamera = async (e) => {
    if(localTracks[1].muted){
        e.target.style.backgroundColor = '#3D5154'
        e.target.style.backgroundImage = 'url("/assets/camon.png")'

        await localTracks[1].setMuted(false)
    } else{
        e.target.style.backgroundColor = '#FF3217'
        e.target.style.backgroundImage = 'url("/assets/camoff.png")'

        await localTracks[1].setMuted(true)   
    }
}

let toggleScreenShare = async (e) => {
    if(isScreenShared){
        // for(let i = 0; localTracks.length > i; i++){
        //     localTracks[i].stop()
        //     localTracks[i].close()
        // }


        var localTracks2 = localTracks;

        isScreenShared = false;

        
        
        e.target.style.backgroundColor = '#3D5154'
        e.target.style.backgroundImage = 'url("/assets/sson.png")'
        
        localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        // chrome
        client.unpublish(localTracks2);

        document.getElementById(`user-container-${unid}`).remove();

        //document.getElementById('camera-btn').style.display = 'block';
        
        let player = `<div class="video-container" id="user-container-${unid}">
                        <div class="video-player" id="user-${unid}">
                            <div class="user-uid">Username: ${username} (You)</div> 
                        </div>
                  </div>`

        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)
        // for(let i = 0; localTracks.length > i; i++){
        //     localTracks[i].play(`user-${username}`)
        // }
        localTracks[1].play(`user-${unid}`)
        // localTracks[1].play(`user-${UID}`)
        // localTracks[0].play(`user-${UID}`)

        await client.publish([localTracks[0], localTracks[1]])
    }

    else{
        videoTrack = localTracks[1]

        try{
            localTracks[1] = await AgoraRTC.createScreenVideoTrack()
            localTracks[1].onended = function () {
                toggleScreenShare()
            };
            client.unpublish(videoTrack)
        }
        catch(err){
            console.error(`ERROR FOR SCREEN SHARING: ${err}`)
            updateCaptions(`ERROR FOR SCREEN SHARING: ${err}`)
            return
        }

        isScreenShared = true
        
        e.target.style.backgroundColor = '#FF3217'
        e.target.style.backgroundImage = 'url("/assets/ssofff.png")'
        
        // for(let i = 0; localTracks.length > i; i++){
        //     localTracks[i].stop()
        //     localTracks[i].close()
        // }

        document.getElementById(`user-container-${unid}`).remove();

        //document.getElementById('camera-btn').style.display = 'none';

        let player = `<div class="video-container" id="user-container-${unid}">
            <div class="video-player" id="user-${unid}">
                <div class="user-uid">Username: ${username} (You)</div> 
            </div>
        </div>`

        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)
        // for(let i = 0; localTracks.length > i; i++){
        //     localTracks[i].play(`user-${username}`)
        // }
        localTracks[1].play(`user-${unid}`)

        // localTracks[1].play(`user-${UID}`)
        // localTracks[0].play(`user-${UID}`)
        
        await client.publish(localTracks[1])
        
    }
}

// Color Variable
var color = "#000000";

// Set up the canvas
// var canvas = document.getElementById("whiteboard-canvas");
// var dpr = window.devicePixelRatio || 1;
// var ctx = canvas.getContext("2d");
// ctx.canvas.width = window.innerWidth * dpr;
// ctx.canvas.height = window.innerHeight * dpr;
// ctx.strokeStyle = color;
// ctx.lineWidth = 4;
// Color Variable

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}

// Set up mouse events for drawing
var drawing = false;
var erasing = false;
var x, y;
var mousePos = { x: x, y: y };
var lastPos = mousePos;

// Get the position of a touch relative to the canvas
function getTouchPos(canvasDom, touchEvent) {
    var rect = canvasDom.getBoundingClientRect();
    return {
        x: 2 * (touchEvent.touches[0].clientX - rect.left),
        y: touchEvent.touches[0].clientY - rect.top
    };
}

// Prevent scrolling when touching the canvas
document.body.addEventListener("touchstart", function (e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, false);

document.body.addEventListener("touchend", function (e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, false);

document.body.addEventListener("touchmove", function (e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, false);

var dataUrl;
var whiteboardData;

// Get a regular interval for drawing to the screen
window.requestAnimFrame = (function (callback) {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimaitonFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

// Draw to the canvas
function renderCanvas() {
    if (drawing) {
        console.error("CTX: "+ctx)
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.stroke();
        lastPos = mousePos;
        ctx.closePath();
    }
}

// Allow for animation
(function drawLoop() {
    window.requestAnimFrame(drawLoop);
    renderCanvas();
})();

// Color picker stroke color
function changeColor() {
    erasing = false;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    document.getElementById("colorPicker").click();
    document.getElementById("colorPicker").onchange = function () {
        color = this.value;
        console.log("Color changed to: " + color);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
    }
}

let toggleWhiteboard = async (e) => {
    if(whiteboardOpen){
        e.target.style.backgroundColor = '#3D5154'
        e.target.style.backgroundImage = 'url("/assets/wbon.png")'

        var canvas = document.getElementById("whiteboard-canvas");
        var dpr = window.devicePixelRatio || 1;
        // console.error("GETTING CTX")

        ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);


        console.error("WHITEBOARD CLOSED: "+dataUrl)
        if(externalWhiteboardTrigger){
            externalWhiteboardTrigger = false;
        }
        else{
            updateCaptionsCustom("Signature closed by "+username)
        }

        whiteboardOpen = false;
        
        document.getElementById('whiteboard').style.display = 'none';
        document.getElementById('erase-btn').style.display = 'none';
        document.getElementById('save-btn').style.display = 'none';
        document.getElementById('custom-upload-btn').style.display = 'none';
    }
    else{
        whiteboardOpen = true;

        if(externalWhiteboardTrigger){
            externalWhiteboardTrigger = false;
        }
        else{
            updateCaptionsCustom("Signature opened by "+username)
        }
        e.target.style.backgroundColor = '#FF3217'
        e.target.style.backgroundImage = 'url("/assets/wboff.png")'

        document.getElementById('erase-btn').style.display = 'flex';
        document.getElementById('save-btn').style.display = 'flex';
        document.getElementById('custom-upload-btn').style.display = 'flex';

        let whiteboard = `<div class="video-container" id="whiteboard">
        <canvas id="whiteboard-canvas" class="video-player white"></canvas>
        </div>`

        if(document.getElementById('whiteboard') == null) {
            console.error("CREATING NEW WHITEBOARD")
            document.getElementById('video-streams').insertAdjacentHTML('beforeend', whiteboard)
            document.getElementById('whiteboard').style.display = "initial";
        }
        else {
            document.getElementById('whiteboard').style.display = "initial";
        }
        setCss()
        
        var canvas = document.getElementById("whiteboard-canvas");
        var dpr = window.devicePixelRatio || 1;
        // console.error("GETTING CTX")

        ctx = canvas.getContext("2d");
        console.error(ctx);
        ctx.canvas.width = document.getElementById('whiteboard').clientWidth * dpr;
        ctx.canvas.height = document.getElementById('whiteboard').clientHeight * dpr;
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;

        canvas.addEventListener("mousedown", function () {
            // Mouse Move
            canvas.addEventListener("mousemove", function () {
                if (drawing == true) {
                    // Mouse Positions
                    var lastPosNow = { x: lastPos.x, y: lastPos.y };
                    var mousePosNow = { x: mousePos.x, y: mousePos.y };
                    // Final Message
                    var finalMsg = { lastPosNow: lastPosNow, mousePosNow: mousePosNow, drawing: drawing, color: color, erasing: erasing };
                    // console.log(finalMsg);
                    msg = { description: 'Coordinates where drawing is taking place.', messageType: 'TEXT', rawMessage: undefined, text: finalMsg }
                    whiteboardArr.push(msg);
                    // channel.sendMessage(msg).then(() => {
                    //     console.log("Your message was: " + JSON.stringify(finalMsg) + " by " + accountName);
                    // }).catch(error => {
                    //     console.log("Message wasn't sent due to an error: ", error);
                    // });
                }
            });
        });


        canvas.addEventListener("mousedown", function (e) {
            drawing = true;
            lastPos = getMousePos(canvas, e);
            canvas.addEventListener("mousemove", function (e) {
                mousePos = getMousePos(canvas, e);
            }, false);
            dataUrl = canvas.toDataURL();
            whiteboardData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }, false);
        canvas.addEventListener("mouseup", function (e) {
            drawing = false;
            dataUrl = canvas.toDataURL();
            whiteboardData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }, false);

        // Set up touch events for mobile, etc
        canvas.addEventListener("touchstart", function (e) {
            mousePos = getTouchPos(canvas, e);
            var touch = mousePos[0];
            var mouseEvent = new MouseEvent("mousedown", {
                clientX: touch[0],
                clientY: touch[1]
            });
            canvas.dispatchEvent(mouseEvent);
        }, false);
        canvas.addEventListener("touchend", function (e) {
            var mouseEvent = new MouseEvent("mouseup", {});
            canvas.dispatchEvent(mouseEvent);
            dataUrl = canvas.toDataURL();
            whiteboardData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }, false);
        canvas.addEventListener("touchmove", function (e) {
            var touch = mousePos[0];
            var mouseEvent = new MouseEvent("mousemove", {
                clientX: touch[0],
                clientY: touch[1]
            });
            canvas.dispatchEvent(mouseEvent);
        }, false);
        dataUrl = canvas.toDataURL();
        whiteboardData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setCss()
    }
}

// Eraser
function startErasing() {
    color = "#FFFFFF";
    console.log("Erasing.");
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 50;
    erasing = true;
}

function stopErasing() {
    color = "#000000";
    console.log("Stopped erasing.");
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    erasing = false;
}

let toggleErase = async (e) => {
    if(erasing){
        e.target.style.backgroundColor = '#3D5154'
        e.target.style.backgroundImage = 'url("/assets/eraseon.png")'
        stopErasing();
    }
    else{
        e.target.style.backgroundColor = '#FF3217'
        e.target.style.backgroundImage = 'url("/assets/erase.png")'
        startErasing();
    }
}

// function sendWhiteboard () {
//     if(whiteboardArr.length > 0){
//         for (const userId in remoteUsers) {
//             console.error("ATTEMPTING TO SEND WHITEBOARD INFO OF LENGTH "+whiteboardArr.length)
//             channel.sendMessage({text: JSON.stringify({"whiteboardArr": JSON.stringify(whiteboardArr)}), description: 'Coordinates where drawing is taking place.', messageType: 'TEXT', rawMessage: undefined})
//         }
//     }
//     whiteboardArr.length = 0;
// }

// var interval = setInterval(function () { 
//     sendWhiteboard(); 
//     // console.error("UPDATING WHITEBOARD IN SET INTERVAL")
// }, 10);



// function downloadURI(uri, name) {
//     var link = document.createElement("a");
//     link.download = name;
//     link.href = uri;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     link.remove()
//   }

// let saveWhiteboard = async (e) => {
//     // downloadURI(dataUrl, "whiteboard.png");
//     navigator.clipboard.writeText(dataUrl)
// }


function drawConnectors(recogCtx, landmarks, options){
    // console.error("DRAWING CONNECTORS in DRAWCONNECTORS")
    var fro = landmarks[0];
    // console.error(fro)
    // for(var i = 1; i<=4; i++){ // Drawing thumb
    //     fro=landmarks[i-1];
    //     t=landmarks[i];
    //     drawLine(recogCtx, fro, t, options)
    // }

    // Drawl every line

    // for (let i = 1; i < landmarks.length; i++) {
    //     fro = landmarks[i - 1];
    //     t = landmarks[i];
    //     drawLine(recogCtx, fro, t, options);
    // }
    for (let i = 0; i < landmarks.length; i++) {
        t = landmarks[i];
        drawDot(recogCtx, t, options);
    }

    // var data_aux = [];
    // for (let landmark in landmarks) {
    //     x_.append(landmark[0]);
    //     y_.append(landmark[1]);
    // }

    // for (let landmark in landmarks) {
    //     data_aux.append(landmark[0] - min(x_));
    //     data_aux.append(landmark[1] - min(y_));
    // }

    

    // drawLine(recogCtx, landmarks[0], landmarks[5], options) // Drawing pointer finger
    // drawLine(recogCtx, landmarks[5], landmarks[6], options)
    // drawLine(recogCtx, landmarks[6], landmarks[7], options)
    // drawLine(recogCtx, landmarks[7], landmarks[8], options)

    // drawLine(recogCtx, landmarks[5], landmarks[9], options)
    // drawLine(recogCtx, landmarks[9], landmarks[13], options)
    // drawLine(recogCtx, landmarks[13], landmarks[17], options)
    // drawLine(recogCtx, landmarks[0], landmarks[17], options)

    // drawLine(recogCtx, landmarks[9], landmarks[10], options)// Middle Finger
    // drawLine(recogCtx, landmarks[10], landmarks[11], options)
    // drawLine(recogCtx, landmarks[11], landmarks[12], options)

    // drawLine(recogCtx, landmarks[13], landmarks[14], options)// Ring Finger
    // drawLine(recogCtx, landmarks[14], landmarks[15], options)
    // drawLine(recogCtx, landmarks[15], landmarks[16], options)

    // drawLine(recogCtx, landmarks[17], landmarks[18], options)// Pinky Finger
    // drawLine(recogCtx, landmarks[18], landmarks[19], options)
    // drawLine(recogCtx, landmarks[19], landmarks[20], options)

    // for(const connection of landmarks){
    //     const t = connection;
    //     if (fro && t) {
    //         recogCtx.lineWidth = options.lineWidth;
    //         recogCtx.strokeStyle = options.color;
    //         recogCtx.beginPath();
    //         recogCtx.moveTo(fro.x*recogCtx.canvas.width, fro.y*recogCtx.canvas.height);
    //         recogCtx.lineTo(t.x*recogCtx.canvas.width, t.y*recogCtx.canvas.height);
    //         recogCtx.stroke();
    //     }
    // }
}

function drawDot(ct, landmark, options) {
    ct.beginPath();
    // console.error("CORRECT X: "+ct.canvas.width - landmark.x * ct.canvas.width)
    // console.error("CORRECT Y: "+landmark.y * ct.canvas.height)
    ct.arc(
        ct.canvas.width - landmark.x * ct.canvas.width,
        landmark.y * ct.canvas.height,
        options.radius || 2, // Default radius to 10 if not provided
        0,
        2 * Math.PI
    );
    ct.fillStyle = options.color || "red";
    ct.fill();
    // ct.strokeStyle = options.borderColor || "black"; // Optional border
    // ct.lineWidth = options.borderWidt\\\\\\\\\\\\h || 0
    // ct.stroke();
}

function drawLine(ct, landmark1, landmark2, options){
    fro=landmark1;
    t=landmark2;
    ct.lineWidth = options.lineWidth;
    ct.strokeStyle = options.color;
    ct.beginPath();
    // let {width, height} = localTracks[1].getSettings()
    // let canwidth = ct.canvas.width
    // let canheight = ct.canvas.height

    
    //const vid = document.getElementsByClassName("agora_video_player");

    ct.moveTo(ct.canvas.width-fro.x*ct.canvas.width, fro.y*ct.canvas.height);
    ct.lineTo(ct.canvas.width-t.x*ct.canvas.width, t.y*ct.canvas.height);
    // ct.moveTo(ct.canvas.width-fro.x*ct.canvas.width, fro.y*ct.canvas.height);
    // ct.lineTo(ct.canvas.width-t.x*ct.canvas.width, t.y*ct.canvas.height);
    ct.stroke();

    // ct.beginPath();
    // ct.arc(fro.x*ct.canvas.width, fro.y*ct.canvas.height, 5, 0, 2 * Math.PI);
    // ct.fillStyle = "red";
    // ct.fill();
    // // ct.lineWidth = 4;
    // // ct.strokeStyle = "blue";
    // ct.stroke();
}

async function sendCurrentFrame(){
    var canvasRecog;
    var recogCtx;
    try{
        canvasRecog = document.getElementById(
            "output_canvas"
        );
        recogCtx = canvasRecog.getContext("2d");
    } catch(err){
        // console.error("ERROR IN GETTING CANVAS CONTEXT HAND RECOG: "+err)
        window.requestAnimationFrame(predictWebcam);
        return
    }

    imgSource = localTracks[1].getCurrentFrameData();

    await getCompressedDataUrl(imgSource).then((url) => {
        console.error("FLAGGED FRAME: "+url)
        updateCaptionsCustom(username+" "+url) // Use imgSource.toDataURL() for without nodes TODO: UNCOMMENT
    })
}

async function base64ToImageData(base64String) {
    const img = new Image();
    img.src = base64String;
  
    await new Promise((resolve) => {
      img.onload = resolve;
    });
  
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
  
    return ctx.getImageData(0, 0, img.width, img.height);
}

async function sendWhiteboardSignatureFrame(){

    // imgSource = ;
    whiteboardData = await base64ToImageData(dataUrl);
    await getCompressedDataUrl(whiteboardData).then((url) => {
        console.error("FLAGGED FRAME: "+url)
        // Split url in 8 parts
        firstEighth = url.substring(0, Math.floor(url.length/8));
        secondEighth = url.substring(Math.floor(url.length/8), Math.floor(2*url.length/8));
        thirdEighth = url.substring(Math.floor(2*url.length/8), Math.floor(3*url.length/8));
        fourthEighth = url.substring(Math.floor(3*url.length/8), Math.floor(4*url.length/8));
        fifthEighth = url.substring(Math.floor(4*url.length/8), Math.floor(5*url.length/8));
        sixthEighth = url.substring(Math.floor(5*url.length/8), Math.floor(6*url.length/8));
        seventhEighth = url.substring(Math.floor(6*url.length/8), Math.floor(7*url.length/8));
        eighthEighth = url.substring(Math.floor(7*url.length/8));

        // firstFourth = url.substring(0, Math.floor(url.length/4));
        // secondFourth = url.substring(Math.floor(url.length/4), Math.floor(url.length/2));
        // thirdFourth = url.substring(Math.floor(url.length/2), Math.floor(3*url.length/4));
        // fourthFourth = url.substring(Math.floor(3*url.length/4));

        // firstHalf = url.substring(0, Math.floor(url.length/2));
        // secondHalf = url.substring(Math.floor(url.length/2));
        // updateCaptionsCustom("SecondFourth"+" "+secondFourth, display=false) // Use imgSource.toDataURL() for without nodes TODO: UNCOMMENT
        // updateCaptionsCustom("ThirdFourth"+" "+thirdFourth, display=false)
        // updateCaptionsCustom("FourthFourth"+" "+fourthFourth, display=false)
        // updateCaptionsCustom(username+" "+firstFourth, display=false)

        updateCaptionsCustom("SecondEighth "+secondEighth, display=false)
        updateCaptionsCustom("ThirdEighth "+thirdEighth, display=false)
        updateCaptionsCustom("FourthEighth "+fourthEighth, display=false)
        updateCaptionsCustom("FifthEighth "+fifthEighth, display=false)
        updateCaptionsCustom("SixthEighth "+sixthEighth, display=false)
        updateCaptionsCustom("SeventhEighth "+seventhEighth, display=false)
        updateCaptionsCustom("EighthEighth "+eighthEighth, display=false)
        updateCaptionsCustom(username+" "+firstEighth, display=false)

    })

    
    
    // updateCaptionsCustom(username+" "+dataUrl)
}

async function addImageToWhiteboard(event){

    if (!whiteboardOpen){
        return
    }
    var canvas;
    var ctx;
    try{
        canvas = document.getElementById(
            "whiteboard-canvas"
        );
        ctx = canvas.getContext("2d");
    } catch(err){
        console.error("ERROR IN RETRIEVING WHITEBOARD: "+err)
        return
    }

    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;

            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous image
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height); // Draw image on canvas
            };
        };

        reader.readAsDataURL(file);
    }
    
}


//DELETE THIS
let lastVideoTime = -1;
let results = undefined
async function predictWebcam() {
    var canvasRecog;
    var recogCtx;
    try{
        canvasRecog = document.getElementById(
            "output_canvas"
        );
        recogCtx = canvasRecog.getContext("2d");
    } catch(err){
        // console.error("ERROR IN GETTING CANVAS CONTEXT HAND RECOG: "+err)
        window.requestAnimationFrame(predictWebcam);
        return
    }

    let startTimeMs = performance.now();
    // if (lastVideoTime !== localTracks[1].currentTime) {
    //     lastVideoTime = localTracks[1].currentTime;
    //     results = handLandmarker.detectForVideo(localTracks[1], startTimeMs);
    // }
    imgSource = localTracks[1].getCurrentFrameData();
    // console.error("IMG SOURCE: "+imgSource)
    results = faceLandmarker.detectForVideo(imgSource, startTimeMs);
    startTimeMs = performance.now();
    poseResults = bodyLandmarker.detectForVideo(imgSource, startTimeMs)
    startTimeMs = performance.now();
    objectResults = objectDetector.detectForVideo(imgSource, startTimeMs)
    
    recogCtx.save();
    recogCtx.clearRect(0, 0, canvasRecog.width, canvasRecog.height);
    if (results.faceLandmarks) {
        if(results.faceLandmarks[0]!=null){
            // console.error("CONFIDENCE: "+(Math.round(parseFloat(results.categories[0].score) * 100)))
            for (var i = 0; i < results.faceLandmarks[0].length; i ++) {
                node = {'x': -results.faceLandmarks[0][i]['x'], 'y':results.faceLandmarks[0][i]['y']};
                
            }
            nodebuffer.push(results.faceLandmarks[0]);
            
            // console.error("PUTTING thingies")
        }
        for (const faceLandmarks of results.faceLandmarks) { // Each landmarks is a hand
            // console.error("LANDMARKS FOUND")
            drawConnectors(recogCtx, faceLandmarks, {
            color: "#00FF00",
            lineWidth: 1,
            radius: 0.5
        });
        // drawLandmarks(recogCtx, landmarks, {color: "#FF0000", lineWidth: 2});
        }
    } else{
        console.error("NO FACE LANDMARKS FOUND")
    }
    if (poseResults.landmarks) {
        if(poseResults.landmarks[0]!=null){
            // console.error("CONFIDENCE: "+(Math.round(parseFloat(results.categories[0].score) * 100)))
            for (var i = 0; i < poseResults.landmarks[0].length; i ++) {
                node = {'x': -poseResults.landmarks[0][i]['x'], 'y':poseResults.landmarks[0][i]['y']};
                
            }
            
            // console.error("PUTTING thingies")
        }
        // console.error("CORRECT ONES: X: "+recogCtx.width-poseResults.landmarks[0].x*recogCtx.width+" Y: "+recogCtx.height-poseResults.landmarks[0].y*recogCtx.height)
        for (const landmark of poseResults.landmarks) { // Each landmarks is a part
            // console.error("LANDMARKS FOUND")
            drawConnectors(recogCtx, landmark, {
            color: "#00FF00",
            lineWidth: 1,
            radius: 3
        });
    }
    }
    try{
        // console.error("NUM PERSONS: "+objectResults.detections.filter(x => x.categories[0]?.categoryName === "person").length)
        const hasTwoPersons = objectResults.detections.filter(x => x.categories[0]?.categoryName === "person").length >= 2;
        secondPersonDetectedBuffer.unshift(hasTwoPersons);
        secondPersonDetectedBuffer.pop();
        // Check if more than 50% of frames detected second person
        const secondPersonDetected = secondPersonDetectedBuffer.filter(x => x).length / secondPersonDetectedBuffer.length > 0.5;
        if (secondPersonDetected) {
            addToast("You've been flagged!", "A second person has been detected")
            secondPersonDetectedBuffer = Array(Math.floor(3/(predictWebcamInterval*0.001))).fill(false);
            cellPhoneDetectedBuffer = Array(Math.floor(3/(predictWebcamInterval*0.001))).fill(false)
            updateCaptionsCustom("2+ Persons Detected")
            await getCompressedDataUrl(imgSource).then((url) => {
                console.error("FLAGGED FRAME: "+url)
                updateCaptionsCustom(username+" "+url) // Use imgSource.toDataURL() for without nodes TODO: UNCOMMENT
            })
        }

        const hasCellPhone = objectResults.detections.filter(x => (x.categories[0]?.categoryName === "cell phone") || (x.categories[0]?.categoryName === "remote")).length > 0;
        // console.error("HAS CELL PHONE: "+hasCellPhone)
        cellPhoneDetectedBuffer.unshift(hasCellPhone);
        cellPhoneDetectedBuffer.pop();
        // Check if more than 50% of frames detected cell phone
        const cellPhoneDetected = cellPhoneDetectedBuffer.filter(x => x).length / cellPhoneDetectedBuffer.length > 0.5;
        if (cellPhoneDetected) {
            addToast("You've been flagged!", "A cell phone has been detected")
            cellPhoneDetectedBuffer = Array(Math.floor(3/(predictWebcamInterval*0.001))).fill(false)
            updateCaptionsCustom("Cell phone detected")
            console.error("FLAGGED FOR CELL PHONE")
            await getCompressedDataUrl(imgSource).then((url) => {
                console.error("FLAGGED FRAME: "+url)
                updateCaptionsCustom(username+" "+url) // Use imgSource.toDataURL() for without nodes TODO: UNCOMMENT
            })
        }

    }
    catch(err){}
    if (objectResults && objectResults.detections.length>0){
        // remove first element and add to end of secondPersonDetectedBuffer

        for (const detection of objectResults.detections) {
            // console.error("DETECTION: "+detection)
            x = detection.boundingBox.originX;
            y = detection.boundingBox.originY;
            width = detection.boundingBox.width;
            height = detection.boundingBox.height;
            // console.error(detection)

            x = recogCtx.canvas.width - x*recogCtx.canvas.width/imgSource.width;
            y = y*recogCtx.canvas.height/imgSource.height;
            width = -width*recogCtx.canvas.width/imgSource.width;
            height = height*recogCtx.canvas.height/imgSource.height;

            // console.error("x: "+x+" y: "+y+" width: "+width+" height: "+height)
            
            const text = detection.categories[0].categoryName + " " + Math.round(detection.categories[0].score * 100) + "%";
            // console.error("TEXT: "+text)
            
            recogCtx.strokeStyle = "#FF0000";
            recogCtx.font = "15px Arial";
            recogCtx.fillStyle = "#FF0000";
            recogCtx.fillText(text, x+width , y);
            recogCtx.strokeRect(x, y, width, height);
            
            // recogCtx.strokeStyle = "#00FF00";
            // recogCtx.font = "18px Arial";
            // recogCtx.fillStyle = "#00FF00";
            // recogCtx.fillText(text, x, y);
            // recogCtx.strokeRect(x, y, width, height);
        }
    }
    // if(nodebuffer.length>20){
    //     // sendPredictionDat()
    // }
    // recogCtx.restore();
    // window.requestAnimationFrame(predictWebcam);
}

// var intervalPredict = setInterval(function () { 
//     predictWebcam(); 
// }, predictWebcamInterval);

// async function sendPredictionDat(){
//     startTime = performance.now();
//     const xhr = new XMLHttpRequest();
//     xhr.open("POST", "https://pantheon-flask.fly.dev/recog", true);
//     xhr.setRequestHeader("Content-Type", "application/json");
//     xhr.setRequestHeader("dat", "hello world");
    
//     xhr.onreadystatechange = function () {
//         if (xhr.readyState === XMLHttpRequest.DONE) {
//             if (xhr.status === 200) {
//                 console.log(xhr.responseText); // Print received data
//                 if(xhr.responseText!=" default"){
//                     updateCaptions("[ASL]" + xhr.responseText);
//                 }
//                 // updateCaptions("[ASL]" + xhr.responseText.stringify().substring(responseText.toString().indexOf('[')+1, responseText.toString().indexOf(']')));
//                 // console.log("TIME TAKEN: "+(performance.now()-startTime))
//             } else {
//                 console.error('Error:', xhr.responseText);
//             }
//         }
//     };

//     console.error("SENT PRED DATA with unid: "+unid)
//     xhr.send(JSON.stringify({array: nodebuffer, uid: unid}));
//     endTime = performance.now();
//     console.log("TIME TAKEN: "+(endTime-startTime))
//     nodebuffer.length=0
// }

async function sendSecretCode(){
    a = prompt("Enter secure data to send")
    updateCaptionsCustom("SECRETSENDING "+a, display=false)
}

// document.getElementById('join-btn').addEventListener('click', joinStream)
document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('screenshare-btn').addEventListener('click', toggleScreenShare) //SCREEN SHARE HAS BEEN DISABLED

document.getElementById('whiteboard-btn').addEventListener('click', toggleWhiteboard) 
document.getElementById('erase-btn').addEventListener('click', toggleErase) 
document.getElementById('save-btn').addEventListener('click', sendWhiteboardSignatureFrame) 
document.getElementById('upload-btn').addEventListener('change', addImageToWhiteboard)

document.getElementById('transfer-btn').addEventListener('click', sendSecretCode)

joinStream(meetingId)