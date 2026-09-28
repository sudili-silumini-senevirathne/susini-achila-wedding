// =========================================================
// SUSINI & ACHILA
// WEDDING INVITATION
// =========================================================


// =========================================================
// 1. GOOGLE APPS SCRIPT RSVP API
// =========================================================

// IMPORTANT:
// Replace this with your REAL Google Apps Script Web App URL.
//
// It must end with:
//
// /exec
//
// Example:
// https://script.google.com/macros/s/AKfycbxxxxxxxxxxxx/exec

const RSVP_API_URL =
    "https://script.google.com/macros/s/AKfycby78MD1C4SLoaTCHyNAsDTxDPlywVJ50zHVVmzzS2KgHtWvWkPDqo7X8XflBPe2SbZw/exec";

// =========================================================
// 2. WEDDING SETTINGS
// =========================================================

// Sri Lanka timezone:
// UTC +05:30

const WEDDING_DATE =
    new Date(
        "2026-05-16T09:00:00+05:30"
    );



const CHURCH_MAP_URL =
    "https://www.google.com/maps/search/?api=1&query=St.+Jude%27s+Church+Daluwakotuwa+Sri+Lanka";



const HOTEL_MAP_URL =
    "https://www.google.com/maps/search/?api=1&query=Olanro+Hotel+Negombo+Sri+Lanka";



// =========================================================
// 3. PAGE ELEMENTS
// =========================================================

const cover =
    document.getElementById(
        "cover"
    );


const openButton =
    document.getElementById(
        "openInvitation"
    );


const guestNameElement =
    document.getElementById(
        "guestName"
    );


const rsvpName =
    document.getElementById(
        "rsvpName"
    );


const guestCount =
    document.getElementById(
        "guestCount"
    );


const guestCountGroup =
    document.getElementById(
        "guestCountGroup"
    );


const rsvpForm =
    document.getElementById(
        "rsvpForm"
    );


const formResult =
    document.getElementById(
        "formResult"
    );


const churchLocation =
    document.getElementById(
        "churchLocation"
    );


const hotelLocation =
    document.getElementById(
        "hotelLocation"
    );


const addToCalendar =
    document.getElementById(
        "addToCalendar"
    );


const submitButton =
    rsvpForm.querySelector(
        ".submit-button"
    );



// =========================================================
// 4. READ URL PARAMETERS
// =========================================================
//
// Example:
//
// ?i=431E0FF70B
// &n=TWlzcy5TdWRpbGkgU2VuZXZpcmF0aG5l
// &max=1
//
// i   = Invitation ID
// n   = Encoded guest name
// max = Maximum guests
//
// Plain name is also supported:
//
// ?name=Miss%20Sudili
// =========================================================

const params =
    new URLSearchParams(
        window.location.search
    );


const invitationId =
    params.get("i") || "";


const encodedName =
    params.get("n");


const plainName =
    params.get("name");


const maxGuestsParameter =
    parseInt(
        params.get("max"),
        10
    );



// =========================================================
// 5. DEFAULT GUEST INFORMATION
// =========================================================

let guestName =
    "Our Dear Guest";


let maxGuests =

    Number.isInteger(
        maxGuestsParameter
    )
        &&
        maxGuestsParameter > 0

        ? maxGuestsParameter

        : 1;



// =========================================================
// 6. DECODE BASE64 GUEST NAME
// =========================================================

function decodeGuestName(value) {

    try {

        return decodeURIComponent(

            Array.prototype.map.call(

                atob(value),

                function (character) {

                    return "%" +

                        (
                            "00" +

                            character
                                .charCodeAt(0)
                                .toString(16)

                        ).slice(-2);

                }

            ).join("")

        );

    }
    catch (error) {

        try {

            return atob(value);

        }
        catch {

            return null;

        }

    }

}



// =========================================================
// 7. GET GUEST NAME
// =========================================================

if (encodedName) {

    const decoded =
        decodeGuestName(
            encodedName
        );


    if (decoded) {

        guestName =
            decoded;

    }

}
else if (plainName) {

    guestName =
        plainName;

}



// =========================================================
// 8. DISPLAY PERSONALIZED NAME
// =========================================================

guestNameElement.textContent =
    guestName;


rsvpName.value =
    guestName;



// =========================================================
// 9. CREATE MAXIMUM GUEST OPTIONS
// =========================================================

function createGuestOptions() {

    guestCount.innerHTML =
        "";


    for (
        let number = 1;
        number <= maxGuests;
        number++
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            number;


        option.textContent =

            number === 1

                ? "1 Guest"

                : `${number} Guests`;


        guestCount.appendChild(
            option
        );

    }

}


createGuestOptions();



// =========================================================
// 10. OPEN INVITATION
// =========================================================

openButton.addEventListener(

    "click",

    function () {

        cover.classList.add(
            "is-opening"
        );


        setTimeout(

            function () {

                cover.style.display =
                    "none";


                document.body
                    .classList
                    .remove(
                        "page-locked"
                    );


                window.scrollTo(
                    0,
                    0
                );


                startRevealAnimations();

            },

            1050

        );

    }

);



// =========================================================
// 11. SCROLL REVEAL
// =========================================================

function startRevealAnimations() {

    const revealElements =
        document.querySelectorAll(
            ".reveal"
        );


    const observer =
        new IntersectionObserver(

            function (
                entries,
                currentObserver
            ) {

                entries.forEach(

                    function (entry) {

                        if (
                            entry.isIntersecting
                        ) {

                            entry.target
                                .classList
                                .add(
                                    "visible"
                                );


                            currentObserver
                                .unobserve(
                                    entry.target
                                );

                        }

                    }

                );

            },

            {
                threshold: 0.12
            }

        );


    revealElements.forEach(

        function (element) {

            observer.observe(
                element
            );

        }

    );

}



// =========================================================
// 12. COUNTDOWN
// =========================================================

const daysElement =
    document.getElementById(
        "days"
    );


const hoursElement =
    document.getElementById(
        "hours"
    );


const minutesElement =
    document.getElementById(
        "minutes"
    );


const secondsElement =
    document.getElementById(
        "seconds"
    );


const countdownMessage =
    document.getElementById(
        "countdownMessage"
    );



function addLeadingZero(number) {

    return String(number)
        .padStart(
            2,
            "0"
        );

}



function updateCountdown() {

    const now =
        new Date();


    const difference =
        WEDDING_DATE.getTime()
        -
        now.getTime();


    // Wedding date has already passed.

    if (difference <= 0) {

        daysElement.textContent =
            "00";


        hoursElement.textContent =
            "00";


        minutesElement.textContent =
            "00";


        secondsElement.textContent =
            "00";


        countdownMessage.textContent =

            "Our wedding day has arrived — thank you for celebrating this beautiful chapter with us.";


        return;

    }


    const totalSeconds =
        Math.floor(
            difference / 1000
        );


    const days =
        Math.floor(

            totalSeconds
            /
            (
                60 *
                60 *
                24
            )

        );


    const hours =
        Math.floor(

            (
                totalSeconds
                %
                (
                    60 *
                    60 *
                    24
                )
            )

            /

            (
                60 *
                60
            )

        );


    const minutes =
        Math.floor(

            (
                totalSeconds
                %
                (
                    60 *
                    60
                )
            )

            /

            60

        );


    const seconds =
        totalSeconds
        %
        60;


    daysElement.textContent =
        addLeadingZero(
            days
        );


    hoursElement.textContent =
        addLeadingZero(
            hours
        );


    minutesElement.textContent =
        addLeadingZero(
            minutes
        );


    secondsElement.textContent =
        addLeadingZero(
            seconds
        );


    countdownMessage.textContent =
        "Until we say “I do”.";

}



updateCountdown();


setInterval(
    updateCountdown,
    1000
);



// =========================================================
// 13. GOOGLE MAPS
// =========================================================

churchLocation.addEventListener(

    "click",

    function () {

        window.open(
            CHURCH_MAP_URL,
            "_blank",
            "noopener,noreferrer"
        );

    }

);



hotelLocation.addEventListener(

    "click",

    function () {

        window.open(
            HOTEL_MAP_URL,
            "_blank",
            "noopener,noreferrer"
        );

    }

);



// =========================================================
// 14. ADD TO CALENDAR
// =========================================================

addToCalendar.addEventListener(

    "click",

    function () {


        const calendarContent =

            `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Susini and Achila Wedding//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:susini-achila-wedding-20260516
DTSTAMP:20260516T000000Z
DTSTART;VALUE=DATE:20260516
DTEND;VALUE=DATE:20260517
SUMMARY:Susini & Achila's Wedding
LOCATION:Negombo, Sri Lanka
DESCRIPTION:Susini & Achila's Wedding\\n\\nChurch Mass - 9:00 AM\\nSt. Jude's Church, Daluwakotuwa\\n\\nWedding Reception - 11:00 AM\\nOlanro Hotel, Negombo
END:VEVENT
END:VCALENDAR`;


        const calendarBlob =
            new Blob(

                [calendarContent],

                {
                    type:
                        "text/calendar;charset=utf-8"
                }

            );


        const calendarUrl =
            URL.createObjectURL(
                calendarBlob
            );


        const downloadLink =
            document.createElement(
                "a"
            );


        downloadLink.href =
            calendarUrl;


        downloadLink.download =
            "Susini-Achila-Wedding.ics";


        document.body.appendChild(
            downloadLink
        );


        downloadLink.click();


        document.body.removeChild(
            downloadLink
        );


        URL.revokeObjectURL(
            calendarUrl
        );

    }

);



// =========================================================
// 15. RSVP ATTENDANCE SELECTION
// =========================================================

const attendanceOptions =
    document.querySelectorAll(
        'input[name="attendance"]'
    );


attendanceOptions.forEach(

    function (radio) {

        radio.addEventListener(

            "change",

            function () {

                if (
                    this.value === "No"
                ) {

                    guestCountGroup
                        .style
                        .display =
                        "none";

                }
                else {

                    guestCountGroup
                        .style
                        .display =
                        "block";

                }

            }

        );

    }

);



// =========================================================
// 16. SHOW FORM MESSAGE
// =========================================================

function showFormMessage(
    message,
    success
) {

    formResult.textContent =
        message;


    formResult.style.display =
        "block";


    if (success) {

        formResult.style.color =
            "#52675a";

    }
    else {

        formResult.style.color =
            "#9a4d4d";

    }

}



// =========================================================
// 17. ENABLE / DISABLE SUBMIT BUTTON
// =========================================================

function setSubmitState(
    isSending
) {

    submitButton.disabled =
        isSending;


    if (isSending) {

        submitButton.textContent =
            "SENDING...";


        submitButton.style.opacity =
            "0.65";


        submitButton.style.cursor =
            "not-allowed";

    }
    else {

        submitButton.textContent =
            "SEND RSVP";


        submitButton.style.opacity =
            "1";


        submitButton.style.cursor =
            "pointer";

    }

}



// =========================================================
// 18. SUBMIT RSVP TO GOOGLE SHEETS
// =========================================================

rsvpForm.addEventListener(

    "submit",

    async function (event) {

        event.preventDefault();


        // ---------------------------------------------
        // Get selected attendance
        // ---------------------------------------------

        const attendance =
            document.querySelector(
                'input[name="attendance"]:checked'
            );


        if (!attendance) {

            showFormMessage(
                "Please select whether you will be attending.",
                false
            );


            return;

        }


        // ---------------------------------------------
        // Determine number attending
        // ---------------------------------------------

        let numberAttending =
            0;


        if (
            attendance.value === "Yes"
        ) {

            numberAttending =
                parseInt(
                    guestCount.value,
                    10
                );


            if (
                !Number.isInteger(
                    numberAttending
                )
                ||
                numberAttending < 1
            ) {

                showFormMessage(
                    "Please select the number attending.",
                    false
                );


                return;

            }


            // Extra protection:
            // Never allow more than maxGuests.

            if (
                numberAttending >
                maxGuests
            ) {

                showFormMessage(
                    `Maximum allowed guests: ${maxGuests}.`,
                    false
                );


                return;

            }

        }


        // ---------------------------------------------
        // Guest message
        // ---------------------------------------------

        const guestMessageElement =
            document.getElementById(
                "guestMessage"
            );


        const guestMessage =
            guestMessageElement
                .value
                .trim();


        // ---------------------------------------------
        // Prepare data for Google Apps Script
        // ---------------------------------------------

        const formData =
            new URLSearchParams();


        formData.append(
            "invitationId",
            invitationId
        );


        formData.append(
            "guestName",
            guestName
        );


        formData.append(
            "maxGuests",
            maxGuests
        );


        formData.append(
            "attendance",
            attendance.value
        );


        formData.append(
            "numberAttending",
            numberAttending
        );


        formData.append(
            "message",
            guestMessage
        );


        // ---------------------------------------------
        // UI state
        // ---------------------------------------------

        setSubmitState(
            true
        );


        formResult.style.display =
            "none";


        // ---------------------------------------------
        // Send to Google Apps Script
        // ---------------------------------------------

        try {

            /*
             * Google Apps Script Web Apps can be awkward
             * with browser CORS handling.
             *
             * "no-cors" allows our static invitation
             * website to submit the RSVP directly.
             *
             * The response becomes opaque, so we cannot
             * read Google's returned JSON here.
             *
             * But the POST request is still sent.
             */

            await fetch(

                RSVP_API_URL,

                {

                    method:
                        "POST",

                    mode:
                        "no-cors",

                    headers: {

                        "Content-Type":
                            "application/x-www-form-urlencoded"

                    },

                    body:
                        formData.toString()

                }

            );


            // -----------------------------------------
            // Show success
            // -----------------------------------------

            if (
                attendance.value === "Yes"
            ) {

                showFormMessage(

                    "Thank you! Your RSVP has been received. We are delighted that you will be joining us.",

                    true

                );

            }
            else {

                showFormMessage(

                    "Thank you for letting us know. Your RSVP has been received, and you will be missed on our special day.",

                    true

                );

            }


            // -----------------------------------------
            // Keep name but clear message
            // -----------------------------------------

            guestMessageElement.value =
                "";


            // -----------------------------------------
            // Scroll confirmation into view
            // -----------------------------------------

            formResult.scrollIntoView({

                behavior:
                    "smooth",

                block:
                    "center"

            });

        }
        catch (error) {

            console.error(
                "RSVP submission error:",
                error
            );


            showFormMessage(

                "Sorry, we could not send your RSVP. Please check your internet connection and try again.",

                false

            );

        }
        finally {

            setSubmitState(
                false
            );

        }

    }

);