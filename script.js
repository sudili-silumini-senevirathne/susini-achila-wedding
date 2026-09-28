// =========================================================
// SUSINI & ACHILA
// WEDDING INVITATION
// =========================================================


// =========================================================
// 1. GOOGLE APPS SCRIPT RSVP API
// =========================================================

const RSVP_API_URL =
    "https://script.google.com/macros/s/AKfycby78MD1C4SLoaTCHyNAsDTxDPlywVJ50zHVVmzzS2KgHtWvWkPDqo7X8XflBPe2SbZw/exec";


// =========================================================
// 2. WEDDING SETTINGS
// =========================================================

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
// ?i=5FB6B6DC6C
// &n=U3VkaWxpIFNlbmV2aXJhdGhuZQ==
// &max=1
//
// i   = Invitation ID
// n   = Guest-name display hint
// max = Guest-count display hint
//
// IMPORTANT:
// The website does NOT trust n or max.
// The real GuestName and MaxGuests are loaded from Google
// using InvitationID.
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
// 5. DEFAULT / TEMPORARY GUEST INFORMATION
// =========================================================

let guestName =
    "Our Dear Guest";

// If there is an Invitation ID, do not trust the max value
// from the URL. Start at 1 until Google verifies the invite.
let maxGuests =
    invitationId
        ? 1
        : (
            Number.isInteger(
                maxGuestsParameter
            )
                &&
                maxGuestsParameter > 0
                ? maxGuestsParameter
                : 1
        );

let guestIsVerified =
    false;

let verificationFailed =
    false;


// =========================================================
// 6. DECODE BASE64 GUEST NAME
// =========================================================

function decodeGuestName(value) {
    try {
        return decodeURIComponent(
            Array.prototype.map.call(
                atob(value),
                function (character) {
                    return "%"
                        +
                        (
                            "00"
                            +
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
// 7. TEMPORARY NAME DISPLAY FROM URL
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

guestNameElement.textContent =
    guestName;

rsvpName.value =
    guestName;


// =========================================================
// 8. CREATE GUEST COUNT OPTIONS
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
// 9. SUBMIT BUTTON AVAILABILITY
// =========================================================

function updateSubmitAvailability() {
    if (guestIsVerified) {
        submitButton.disabled =
            false;

        submitButton.textContent =
            "SEND RSVP";

        submitButton.style.opacity =
            "1";

        submitButton.style.cursor =
            "pointer";

        return;
    }

    submitButton.disabled =
        true;

    submitButton.style.opacity =
        "0.60";

    submitButton.style.cursor =
        "not-allowed";

    if (!invitationId) {
        submitButton.textContent =
            "PERSONAL INVITATION REQUIRED";
    }
    else if (verificationFailed) {
        submitButton.textContent =
            "INVITATION NOT VERIFIED";
    }
    else {
        submitButton.textContent =
            "VERIFYING INVITATION...";
    }
}

updateSubmitAvailability();


// =========================================================
// 10. LOAD TRUSTED GUEST INFORMATION FROM GOOGLE
// =========================================================
//
// Even if somebody changes:
//
// &max=1
//
// to:
//
// &max=10
//
// Google checks the InvitationID and returns the real
// GuestName and MaxGuests from the Guests sheet.
// =========================================================

function loadTrustedGuestInformation() {
    return new Promise(
        function (resolve) {
            if (!invitationId) {
                verificationFailed =
                    true;

                updateSubmitAvailability();

                resolve(false);

                return;
            }

            const callbackName =
                "weddingGuestCallback_"
                +
                Date.now()
                +
                "_"
                +
                Math.floor(
                    Math.random() * 100000
                );

            const googleScript =
                document.createElement(
                    "script"
                );

            let finished =
                false;

            const timeout =
                setTimeout(
                    function () {
                        if (finished) {
                            return;
                        }

                        finished =
                            true;

                        verificationFailed =
                            true;

                        guestIsVerified =
                            false;

                        cleanup();

                        updateSubmitAvailability();

                        showFormMessage(
                            "We could not verify this invitation. Please refresh the page and try again.",
                            false
                        );

                        resolve(false);
                    },
                    12000
                );

            function cleanup() {
                clearTimeout(
                    timeout
                );

                if (
                    googleScript.parentNode
                ) {
                    googleScript
                        .parentNode
                        .removeChild(
                            googleScript
                        );
                }

                try {
                    delete window[
                        callbackName
                    ];
                }
                catch {
                    window[
                        callbackName
                    ] = undefined;
                }
            }

            window[
                callbackName
            ] = function (data) {
                if (finished) {
                    return;
                }

                finished =
                    true;

                if (
                    data &&
                    data.success
                ) {
                    guestName =
                        String(
                            data.guestName || ""
                        ).trim();

                    maxGuests =
                        parseInt(
                            data.maxGuests,
                            10
                        );

                    if (
                        !Number.isInteger(
                            maxGuests
                        )
                        ||
                        maxGuests < 1
                    ) {
                        maxGuests =
                            1;
                    }

                    guestNameElement.textContent =
                        guestName;

                    rsvpName.value =
                        guestName;

                    createGuestOptions();

                    guestIsVerified =
                        true;

                    verificationFailed =
                        false;

                    cleanup();

                    updateSubmitAvailability();

                    resolve(true);

                    return;
                }

                guestIsVerified =
                    false;

                verificationFailed =
                    true;

                guestNameElement.textContent =
                    "Invitation not found";

                rsvpName.value =
                    "";

                cleanup();

                updateSubmitAvailability();

                showFormMessage(
                    "This invitation link could not be verified.",
                    false
                );

                resolve(false);
            };

            googleScript.onerror =
                function () {
                    if (finished) {
                        return;
                    }

                    finished =
                        true;

                    guestIsVerified =
                        false;

                    verificationFailed =
                        true;

                    cleanup();

                    updateSubmitAvailability();

                    showFormMessage(
                        "We could not verify this invitation. Please check your internet connection and refresh the page.",
                        false
                    );

                    resolve(false);
                };

            googleScript.src =
                RSVP_API_URL
                +
                "?action=guest"
                +
                "&i="
                +
                encodeURIComponent(
                    invitationId
                )
                +
                "&callback="
                +
                encodeURIComponent(
                    callbackName
                )
                +
                "&_="
                +
                Date.now();

            document.body
                .appendChild(
                    googleScript
                );
        }
    );
}

loadTrustedGuestInformation();
// =========================================================
// 11. OPEN INVITATION
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
// 12. SCROLL REVEAL
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
// 13. COUNTDOWN
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
                60
                *
                60
                *
                24
            )
        );

    const hours =
        Math.floor(
            (
                totalSeconds
                %
                (
                    60
                    *
                    60
                    *
                    24
                )
            )
            /
            (
                60
                *
                60
            )
        );

    const minutes =
        Math.floor(
            (
                totalSeconds
                %
                (
                    60
                    *
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
// 14. GOOGLE MAPS
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
// 15. ADD TO CALENDAR
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
                [
                    calendarContent
                ],
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
// 16. RSVP ATTENDANCE SELECTION
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
// 17. SHOW FORM MESSAGE
// =========================================================

function showFormMessage(
    message,
    success
) {
    formResult.textContent =
        message;

    formResult.style.display =
        "block";

    formResult.style.color =
        success
            ? "#52675a"
            : "#9a4d4d";
}


// =========================================================
// 18. ENABLE / DISABLE SUBMIT BUTTON
// =========================================================

function setSubmitState(
    isSending
) {
    if (isSending) {
        submitButton.disabled =
            true;

        submitButton.textContent =
            "SENDING...";

        submitButton.style.opacity =
            "0.65";

        submitButton.style.cursor =
            "not-allowed";

        return;
    }

    updateSubmitAvailability();
}


// =========================================================
// 19. SUBMIT RSVP TO GOOGLE SHEETS
// =========================================================

rsvpForm.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        if (!guestIsVerified) {
            showFormMessage(
                invitationId
                    ? "Please wait for your invitation to be verified. If this continues, refresh the page."
                    : "Please open your personal invitation link to send an RSVP.",
                false
            );

            return;
        }

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

        const guestMessageElement =
            document.getElementById(
                "guestMessage"
            );

        const guestMessage =
            guestMessageElement
                .value
                .trim();

        const formData =
            new URLSearchParams();

        formData.append(
            "invitationId",
            invitationId
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

        setSubmitState(
            true
        );

        formResult.style.display =
            "none";

        try {
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

            guestMessageElement.value =
                "";

            formResult.scrollIntoView(
                {
                    behavior:
                        "smooth",

                    block:
                        "center"
                }
            );
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