// =========================================================
// SUSINI & ACHILA
// WEDDING INVITATION
// =========================================================


// =========================================================
// 1. SETTINGS
// =========================================================

const RSVP_API_URL =
    "https://script.google.com/macros/s/AKfycby78MD1C4SLoaTCHyNAsDTxDPlywVJ50zHVVmzzS2KgHtWvWkPDqo7X8XflBPe2SbZw/exec";

const WEDDING_DATE =
    new Date("2027-05-16T09:00:00+05:30");

const CHURCH_MAP_URL =
    "https://www.google.com/maps/search/?api=1&query=St.+Jude%27s+Church+Daluwakotuwa+Sri+Lanka";

const HOTEL_MAP_URL =
    "https://www.google.com/maps/search/?api=1&query=Olanro+Hotel+Negombo+Sri+Lanka";


// =========================================================
// WEDDING EXPERIENCE SETTINGS
// =========================================================

// Complete music + automatic-scroll experience:
// approximately 4 minutes 25.9 seconds from OPEN INVITATION.
//
// 0:00  Music starts softly
// 0:01  Cover opens
// 0:03  Slow automatic scroll begins
// 4:15  Music starts fading out
// 4:25.9 Page reaches the bottom and music ends softly
const EXPERIENCE_DURATION_MS = 265872; // Full uploaded song: about 4 minutes 25.9 seconds

const MUSIC_TARGET_VOLUME = 0.42;
const MUSIC_FADE_IN_MS = 3500;
const MUSIC_FADE_OUT_MS = 10000;

const AUTO_SCROLL_ENABLED = true;
const AUTO_SCROLL_START_DELAY_MS = 1800;
const AUTO_SCROLL_RESUME_DELAY_MS = 1600;
const AUTO_SCROLL_END_PADDING_PX = 20;

let experienceEndsAt = null;
let musicFadeOutTimer = null;
let musicStopTimer = null;


// =========================================================
// 2. PAGE ELEMENTS
// =========================================================

const cover =
    document.getElementById("cover");

const openButton =
    document.getElementById("openInvitation");

const guestNameElement =
    document.getElementById("guestName");

const rsvpName =
    document.getElementById("rsvpName");

const guestCount =
    document.getElementById("guestCount");

const guestCountGroup =
    document.getElementById("guestCountGroup");

const rsvpForm =
    document.getElementById("rsvpForm");

const formResult =
    document.getElementById("formResult");

const submitButton =
    rsvpForm.querySelector(".submit-button");

const guestMessageElement =
    document.getElementById("guestMessage");

const existingRsvpStatus =
    document.getElementById("existingRsvpStatus");

const existingRsvpMain =
    document.getElementById("existingRsvpMain");

const rsvpDeadlineText =
    document.getElementById("rsvpDeadlineText");

const churchLocation =
    document.getElementById("churchLocation");

const hotelLocation =
    document.getElementById("hotelLocation");

const addToCalendar =
    document.getElementById("addToCalendar");

const weddingAudio =
    document.getElementById("weddingAudio");

const musicToggle =
    document.getElementById("musicToggle");

const musicLabel =
    document.getElementById("musicLabel");


// =========================================================
// 3. URL PARAMETERS
// =========================================================

const params =
    new URLSearchParams(window.location.search);

const invitationId =
    String(params.get("i") || "").trim();

const encodedName =
    params.get("n");

const plainName =
    params.get("name");


// =========================================================
// 4. INVITATION STATE
// =========================================================

let guestName =
    "Our Dear Guest";

let maxGuests =
    1;

let guestIsVerified =
    false;

let verificationFailed =
    false;

let deadlineClosed =
    false;

let existingRsvp =
    null;

let submitInFlight =
    false;

let pendingSubmission =
    null;


// =========================================================
// 5. DECODE DISPLAY NAME FROM LINK
// =========================================================

function decodeGuestName(value) {
    if (!value) {
        return null;
    }

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

if (encodedName) {
    const decodedName =
        decodeGuestName(encodedName);

    if (decodedName) {
        guestName =
            decodedName;
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
// 6. GUEST COUNT OPTIONS
// =========================================================

function createGuestOptions(selectedValue = null) {
    guestCount.innerHTML =
        "";

    for (
        let number = 1;
        number <= maxGuests;
        number++
    ) {
        const option =
            document.createElement("option");

        option.value =
            String(number);

        option.textContent =
            number === 1
                ? "1 Guest"
                : `${number} Guests`;

        guestCount.appendChild(option);
    }

    if (
        selectedValue !== null
        &&
        Number(selectedValue) >= 1
        &&
        Number(selectedValue) <= maxGuests
    ) {
        guestCount.value =
            String(selectedValue);
    }
}

createGuestOptions();


// =========================================================
// 7. FORM HELPERS
// =========================================================

function showFormMessage(message, success) {
    formResult.textContent =
        message;

    formResult.style.display =
        "block";

    formResult.classList.toggle(
        "success",
        Boolean(success)
    );

    formResult.classList.toggle(
        "error",
        !success
    );
}

function setRsvpControlsDisabled(disabled) {
    const controls =
        rsvpForm.querySelectorAll(
            'input[name="attendance"], select, textarea'
        );

    controls.forEach(
        function (control) {
            control.disabled =
                disabled;
        }
    );
}

function getSubmitButtonText() {
    if (deadlineClosed) {
        return "RSVP CLOSED";
    }

    if (!invitationId) {
        return "PERSONAL INVITATION REQUIRED";
    }

    if (verificationFailed) {
        return "INVITATION NOT VERIFIED";
    }

    if (!guestIsVerified) {
        return "VERIFYING INVITATION...";
    }

    if (existingRsvp) {
        return "UPDATE RSVP";
    }

    return "SEND RSVP";
}

function updateSubmitAvailability() {
    const unavailable =
        !guestIsVerified
        ||
        verificationFailed
        ||
        deadlineClosed
        ||
        submitInFlight;

    submitButton.disabled =
        unavailable;

    submitButton.textContent =
        submitInFlight
            ? "SAVING..."
            : getSubmitButtonText();

    submitButton.style.opacity =
        unavailable
            ? "0.62"
            : "1";

    submitButton.style.cursor =
        unavailable
            ? "not-allowed"
            : "pointer";
}

function updateExistingRsvpBanner(rsvp) {
    if (!rsvp || !rsvp.exists) {
        existingRsvp =
            null;

        existingRsvpStatus.hidden =
            true;

        return;
    }

    existingRsvp =
        rsvp;

    const attendingText =
        rsvp.attendance === "Yes"
            ? (
                Number(rsvp.numberAttending) === 1
                    ? "Joyfully accepting • 1 guest"
                    : `Joyfully accepting • ${rsvp.numberAttending} guests`
            )
            : "Regretfully declining";

    existingRsvpMain.textContent =
        attendingText;

    existingRsvpStatus.hidden =
        false;
}

function applyExistingRsvp(rsvp) {
    updateExistingRsvpBanner(rsvp);

    if (!rsvp || !rsvp.exists) {
        return;
    }

    const attendanceRadio =
        document.querySelector(
            `input[name="attendance"][value="${rsvp.attendance}"]`
        );

    if (attendanceRadio) {
        attendanceRadio.checked =
            true;
    }

    if (rsvp.attendance === "Yes") {
        guestCountGroup.style.display =
            "block";

        createGuestOptions(
            rsvp.numberAttending
        );
    }
    else {
        guestCountGroup.style.display =
            "none";
    }

    guestMessageElement.value =
        String(rsvp.message || "");
}

function applyDeadline(deadline) {
    if (!deadline || !deadline.enabled) {
        rsvpDeadlineText.hidden =
            true;

        deadlineClosed =
            false;

        return;
    }

    rsvpDeadlineText.hidden =
        false;

    rsvpDeadlineText.textContent =
        deadline.text || "";

    deadlineClosed =
        Boolean(deadline.closed);

    if (deadlineClosed) {
        setRsvpControlsDisabled(true);

        showFormMessage(
            "RSVP is now closed. Please contact the couple directly if you need to make a change.",
            false
        );
    }
}

updateSubmitAvailability();


// =========================================================
// 8. VERIFY INVITATION WITH GOOGLE
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
                document.createElement("script");

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

                        guestIsVerified =
                            false;

                        verificationFailed =
                            true;

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
                clearTimeout(timeout);

                if (googleScript.parentNode) {
                    googleScript.parentNode.removeChild(
                        googleScript
                    );
                }

                try {
                    delete window[callbackName];
                }
                catch {
                    window[callbackName] =
                        undefined;
                }
            }

            window[callbackName] =
                function (data) {
                    if (finished) {
                        return;
                    }

                    finished =
                        true;

                    if (
                        data
                        &&
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
                            !Number.isInteger(maxGuests)
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

                        applyExistingRsvp(
                            data.rsvp
                        );

                        applyDeadline(
                            data.deadline
                        );

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
                encodeURIComponent(invitationId)
                +
                "&callback="
                +
                encodeURIComponent(callbackName)
                +
                "&_="
                +
                Date.now();

            document.body.appendChild(
                googleScript
            );
        }
    );
}

loadTrustedGuestInformation();


// =========================================================
// 9. MUSIC - A THOUSAND YEARS
// =========================================================

let musicFadeFrame = null;


function syncMusicButton() {
    const isPlaying =
        !weddingAudio.paused
        &&
        !weddingAudio.ended;

    musicToggle.setAttribute(
        "aria-pressed",
        isPlaying ? "true" : "false"
    );

    musicToggle.classList.toggle(
        "is-playing",
        isPlaying
    );

    musicLabel.textContent =
        isPlaying
            ? "Pause our song"
            : "Play our song";
}


function fadeMusicTo(
    targetVolume,
    durationMs
) {
    if (musicFadeFrame) {
        cancelAnimationFrame(
            musicFadeFrame
        );
    }

    const startVolume =
        weddingAudio.volume;

    const startTime =
        performance.now();

    function step(now) {
        const progress =
            Math.min(
                1,
                (now - startTime)
                /
                durationMs
            );

        weddingAudio.volume =
            startVolume
            +
            (
                targetVolume
                -
                startVolume
            )
            *
            progress;

        if (progress < 1) {
            musicFadeFrame =
                requestAnimationFrame(
                    step
                );
        }
        else {
            musicFadeFrame =
                null;
        }
    }

    musicFadeFrame =
        requestAnimationFrame(
            step
        );
}


async function startWeddingMusic() {
    try {
        musicToggle.disabled =
            false;

        musicToggle.classList.remove(
            "is-unavailable"
        );

        if (
            weddingAudio.readyState === 0
        ) {
            weddingAudio.load();
        }

        weddingAudio.volume =
            0;

        await weddingAudio.play();

        fadeMusicTo(
            MUSIC_TARGET_VOLUME,
            MUSIC_FADE_IN_MS
        );

        syncMusicButton();

        return true;
    }
    catch (error) {
        console.error(
            "Wedding music could not start. Make sure the file exists at audio/a-thousand-years.mp3",
            error
        );

        syncMusicButton();

        musicLabel.textContent =
            "Tap to play music";

        return false;
    }
}


musicToggle.addEventListener(
    "click",
    async function () {
        if (weddingAudio.paused) {
            await startWeddingMusic();
        }
        else {
            weddingAudio.pause();
            syncMusicButton();
        }
    }
);


weddingAudio.addEventListener(
    "play",
    syncMusicButton
);


weddingAudio.addEventListener(
    "pause",
    syncMusicButton
);


weddingAudio.addEventListener(
    "error",
    function () {
        musicToggle.disabled =
            false;

        musicToggle.classList.add(
            "is-unavailable"
        );

        musicLabel.textContent =
            "Song file missing";

        console.error(
            "Music file not found. Add your legally obtained MP3 as: audio/a-thousand-years.mp3"
        );
    }
);


// =========================================================
// 10. FIXED 3:30 EXPERIENCE TIMER
// =========================================================

function finishWeddingExperience() {
    if (musicFadeOutTimer) {
        clearTimeout(musicFadeOutTimer);
        musicFadeOutTimer = null;
    }

    if (musicStopTimer) {
        clearTimeout(musicStopTimer);
        musicStopTimer = null;
    }

    if (autoScrollResumeTimer) {
        clearTimeout(autoScrollResumeTimer);
        autoScrollResumeTimer = null;
    }

    if (autoScrollFrame) {
        cancelAnimationFrame(autoScrollFrame);
        autoScrollFrame = null;
    }

    // Finish exactly at the bottom together with the song.
    window.scrollTo(
        0,
        Math.max(
            0,
            document.documentElement.scrollHeight
            -
            window.innerHeight
            -
            AUTO_SCROLL_END_PADDING_PX
        )
    );

    document.documentElement
        .classList
        .remove(
            "auto-scroll-active"
        );

    weddingAudio.pause();

    try {
        weddingAudio.currentTime = 0;
    }
    catch {
        // Pausing is enough if seeking is unavailable.
    }

    weddingAudio.volume =
        MUSIC_TARGET_VOLUME;

    syncMusicButton();
}


function startFixedWeddingExperienceTimer() {
    experienceEndsAt =
        performance.now()
        +
        EXPERIENCE_DURATION_MS;

    if (musicFadeOutTimer) {
        clearTimeout(musicFadeOutTimer);
    }

    if (musicStopTimer) {
        clearTimeout(musicStopTimer);
    }

    musicFadeOutTimer =
        setTimeout(
            function () {
                if (!weddingAudio.paused) {
                    fadeMusicTo(
                        0,
                        MUSIC_FADE_OUT_MS
                    );
                }
            },
            Math.max(
                0,
                EXPERIENCE_DURATION_MS
                -
                MUSIC_FADE_OUT_MS
            )
        );

    musicStopTimer =
        setTimeout(
            finishWeddingExperience,
            EXPERIENCE_DURATION_MS
        );
}


// =========================================================
// 11. AUTOMATIC SLOW SCROLL
// =========================================================

let autoScrollFrame = null;
let autoScrollStarted = false;
let autoScrollPausedByGuest = false;
let autoScrollResumeTimer = null;


/*
    AUTO-SCROLL BEHAVIOR

    - Starts automatically after the invitation opens.
    - Starts a little faster than the previous version.
    - If the guest manually scrolls/swipes, auto-scroll pauses.
    - After the guest stops interacting for 1.6 seconds,
      auto-scroll automatically continues from the new position.
    - Remaining distance/time is recalculated so the page still
      reaches the bottom at the same time as the song ends.
*/


function getAutoScrollDurationMs() {
    if (
        Number.isFinite(
            experienceEndsAt
        )
    ) {
        return Math.max(
            1000,
            experienceEndsAt
            -
            performance.now()
        );
    }

    return EXPERIENCE_DURATION_MS;
}


function clearAutoScrollResumeTimer() {
    if (autoScrollResumeTimer) {
        clearTimeout(
            autoScrollResumeTimer
        );

        autoScrollResumeTimer =
            null;
    }
}


function scheduleAutoScrollResume() {
    clearAutoScrollResumeTimer();

    autoScrollResumeTimer =
        setTimeout(
            function () {
                autoScrollPausedByGuest =
                    false;

                startAutomaticSlowScroll(
                    true
                );
            },
            AUTO_SCROLL_RESUME_DELAY_MS
        );
}


function pauseAutoScrollForGuest() {
    /*
        Even if the auto-scroll has not started yet, remember
        the manual interaction and wait until the guest stops.
    */
    autoScrollPausedByGuest =
        true;

    if (autoScrollFrame) {
        cancelAnimationFrame(
            autoScrollFrame
        );

        autoScrollFrame =
            null;
    }

    document.documentElement
        .classList
        .remove(
            "auto-scroll-active"
        );

    scheduleAutoScrollResume();
}


function startAutomaticSlowScroll(
    isResume = false
) {
    if (
        !AUTO_SCROLL_ENABLED
        ||
        autoScrollPausedByGuest
    ) {
        return;
    }

    if (
        window.matchMedia
        &&
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        return;
    }

    clearAutoScrollResumeTimer();

    if (autoScrollFrame) {
        cancelAnimationFrame(
            autoScrollFrame
        );

        autoScrollFrame =
            null;
    }

    const startY =
        window.scrollY;

    const maxScroll =
        Math.max(
            0,
            document.documentElement.scrollHeight
            -
            window.innerHeight
            -
            AUTO_SCROLL_END_PADDING_PX
        );

    if (
        maxScroll <= startY + 5
    ) {
        window.scrollTo(
            0,
            maxScroll
        );

        return;
    }

    const duration =
        getAutoScrollDurationMs();

    if (
        duration <= 1000
    ) {
        window.scrollTo(
            0,
            maxScroll
        );

        return;
    }

    autoScrollStarted =
        true;

    const startTime =
        performance.now();

    document.documentElement
        .classList
        .add(
            "auto-scroll-active"
        );

    function frame(now) {
        if (
            autoScrollPausedByGuest
        ) {
            return;
        }

        const progress =
            Math.min(
                1,
                (
                    now
                    -
                    startTime
                )
                /
                duration
            );

        /*
            Faster/more natural at the beginning than the old
            cosine curve, but still soft near the end.
        */
        const eased =
            1
            -
            Math.pow(
                1 - progress,
                1.15
            );

        const currentMaxScroll =
            Math.max(
                0,
                document.documentElement.scrollHeight
                -
                window.innerHeight
                -
                AUTO_SCROLL_END_PADDING_PX
            );

        const targetY =
            startY
            +
            (
                currentMaxScroll
                -
                startY
            )
            *
            eased;

        window.scrollTo(
            0,
            targetY
        );

        if (
            progress < 1
            &&
            !autoScrollPausedByGuest
        ) {
            autoScrollFrame =
                requestAnimationFrame(
                    frame
                );
        }
        else {
            autoScrollFrame =
                null;

            document.documentElement
                .classList
                .remove(
                    "auto-scroll-active"
                );
        }
    }

    autoScrollFrame =
        requestAnimationFrame(
            frame
        );
}


/*
    Every manual movement resets the 1.6-second wait.
    Therefore auto-scroll restarts only after the guest has
    actually stopped scrolling/swiping.
*/

window.addEventListener(
    "wheel",
    pauseAutoScrollForGuest,
    {
        passive: true
    }
);


window.addEventListener(
    "touchstart",
    pauseAutoScrollForGuest,
    {
        passive: true
    }
);


window.addEventListener(
    "touchmove",
    pauseAutoScrollForGuest,
    {
        passive: true
    }
);


window.addEventListener(
    "keydown",
    function (event) {
        const manualScrollKeys = [
            "ArrowDown",
            "ArrowUp",
            "PageDown",
            "PageUp",
            "Home",
            "End",
            " "
        ];

        if (
            manualScrollKeys.includes(
                event.key
            )
        ) {
            pauseAutoScrollForGuest();
        }
    }
);


// =========================================================
// 10. OPEN INVITATION
// =========================================================

openButton.addEventListener(
    "click",
    function () {
        startFixedWeddingExperienceTimer();

        startWeddingMusic();

        cover.classList.add(
            "is-opening"
        );

        setTimeout(
            function () {
                cover.style.display =
                    "none";

                document.body.classList.remove(
                    "page-locked"
                );

                window.scrollTo(
                    0,
                    0
                );

                startRevealAnimations();

                musicToggle.hidden =
                    false;

                musicToggle.classList.add(
                    "music-enter"
                );

                setTimeout(
                    function () {
                        musicToggle.classList.remove(
                            "music-enter"
                        );
                    },
                    800
                );

                setTimeout(
                    startAutomaticSlowScroll,
                    AUTO_SCROLL_START_DELAY_MS
                );
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

    if (
        window.matchMedia
        &&
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches
    ) {
        revealElements.forEach(
            function (element) {
                element.classList.add(
                    "visible"
                );
            }
        );

        return;
    }

    const observer =
        new IntersectionObserver(
            function (
                entries,
                currentObserver
            ) {
                entries.forEach(
                    function (entry) {
                        if (entry.isIntersecting) {
                            entry.target.classList.add(
                                "visible"
                            );

                            currentObserver.unobserve(
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
            observer.observe(element);
        }
    );
}


// =========================================================
// 12. COUNTDOWN
// =========================================================

const daysElement =
    document.getElementById("days");

const hoursElement =
    document.getElementById("hours");

const minutesElement =
    document.getElementById("minutes");

const secondsElement =
    document.getElementById("seconds");

const countdownMessage =
    document.getElementById("countdownMessage");

function addLeadingZero(number) {
    return String(number).padStart(2, "0");
}

function updateCountdown() {
    const difference =
        WEDDING_DATE.getTime()
        -
        new Date().getTime();

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
        Math.floor(difference / 1000);

    const days =
        Math.floor(
            totalSeconds / 86400
        );

    const hours =
        Math.floor(
            (totalSeconds % 86400) / 3600
        );

    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    const seconds =
        totalSeconds % 60;

    daysElement.textContent =
        addLeadingZero(days);

    hoursElement.textContent =
        addLeadingZero(hours);

    minutesElement.textContent =
        addLeadingZero(minutes);

    secondsElement.textContent =
        addLeadingZero(seconds);

    countdownMessage.textContent =
        "Until we say “I do”.";
}

updateCountdown();

setInterval(
    updateCountdown,
    1000
);


// =========================================================
// 13. MAPS
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
UID:susini-achila-wedding-20270516
DTSTAMP:20270516T000000Z
DTSTART;VALUE=DATE:20270516
DTEND;VALUE=DATE:20270517
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
            document.createElement("a");

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
// 15. ATTENDANCE SELECTION
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
                guestCountGroup.style.display =
                    this.value === "No"
                        ? "none"
                        : "block";
            }
        );
    }
);


// =========================================================
// 16. RELIABLE RSVP SUBMISSION
// =========================================================

function createRequestId() {
    if (
        window.crypto
        &&
        typeof window.crypto.randomUUID === "function"
    ) {
        return window.crypto.randomUUID();
    }

    return "rsvp-"
        +
        Date.now()
        +
        "-"
        +
        Math.floor(
            Math.random() * 1000000
        );
}

function submitRsvpToGoogle(formData) {
    return new Promise(
        function (resolve, reject) {
            const requestId =
                createRequestId();

            formData.clientRequestId =
                requestId;

            const timeout =
                setTimeout(
                    function () {
                        if (
                            pendingSubmission
                            &&
                            pendingSubmission.requestId === requestId
                        ) {
                            pendingSubmission =
                                null;
                        }

                        reject(
                            new Error(
                                "RSVP confirmation timed out."
                            )
                        );
                    },
                    20000
                );

            pendingSubmission = {
                requestId:
                    requestId,
                resolve:
                    resolve,
                reject:
                    reject,
                timeout:
                    timeout
            };

            const postForm =
                document.createElement("form");

            postForm.method =
                "POST";

            postForm.action =
                RSVP_API_URL;

            postForm.target =
                "rsvpSubmitFrame";

            postForm.style.display =
                "none";

            Object.entries(formData).forEach(
                function ([key, value]) {
                    const input =
                        document.createElement("input");

                    input.type =
                        "hidden";

                    input.name =
                        key;

                    input.value =
                        String(value ?? "");

                    postForm.appendChild(input);
                }
            );

            document.body.appendChild(
                postForm
            );

            postForm.submit();

            document.body.removeChild(
                postForm
            );
        }
    );
}

window.addEventListener(
    "message",
    function (event) {
        const data =
            event.data;

        if (
            !data
            ||
            data.type !== "wedding-rsvp-result"
            ||
            !pendingSubmission
            ||
            data.requestId !== pendingSubmission.requestId
        ) {
            return;
        }

        clearTimeout(
            pendingSubmission.timeout
        );

        const resolver =
            pendingSubmission.resolve;

        pendingSubmission =
            null;

        resolver(data);
    }
);


// =========================================================
// 17. RSVP SUBMIT
// =========================================================

rsvpForm.addEventListener(
    "submit",
    async function (event) {
        event.preventDefault();

        if (submitInFlight) {
            return;
        }

        if (!guestIsVerified) {
            showFormMessage(
                "Please wait for your invitation to be verified.",
                false
            );

            return;
        }

        if (deadlineClosed) {
            showFormMessage(
                "RSVP is now closed.",
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

        if (attendance.value === "Yes") {
            numberAttending =
                parseInt(
                    guestCount.value,
                    10
                );

            if (
                !Number.isInteger(numberAttending)
                ||
                numberAttending < 1
            ) {
                showFormMessage(
                    "Please select the number attending.",
                    false
                );

                return;
            }

            if (numberAttending > maxGuests) {
                showFormMessage(
                    `Maximum allowed guests: ${maxGuests}.`,
                    false
                );

                return;
            }
        }

        submitInFlight =
            true;

        updateSubmitAvailability();

        formResult.style.display =
            "none";

        try {
            const response =
                await submitRsvpToGoogle(
                    {
                        invitationId:
                            invitationId,
                        attendance:
                            attendance.value,
                        numberAttending:
                            numberAttending,
                        message:
                            guestMessageElement.value.trim()
                    }
                );

            if (!response.success) {
                throw new Error(
                    response.message
                    ||
                    "Your RSVP could not be saved."
                );
            }

            const savedRsvp = {
                exists:
                    true,
                attendance:
                    response.attendance,
                numberAttending:
                    Number(response.numberAttending || 0),
                message:
                    guestMessageElement.value.trim(),
                updatedAt:
                    response.updatedAt || ""
            };

            updateExistingRsvpBanner(
                savedRsvp
            );

            if (response.attendance === "Yes") {
                showFormMessage(
                    "Thank you! Your RSVP has been saved successfully. We are delighted that you will be joining us.",
                    true
                );
            }
            else {
                showFormMessage(
                    "Thank you for letting us know. Your RSVP has been saved successfully, and you will be missed on our special day.",
                    true
                );
            }

            submitButton.textContent =
                "RSVP SAVED ✓";

            submitButton.classList.add(
                "is-saved"
            );

            formResult.scrollIntoView(
                {
                    behavior:
                        "smooth",
                    block:
                        "center"
                }
            );

            setTimeout(
                function () {
                    submitButton.classList.remove(
                        "is-saved"
                    );

                    updateSubmitAvailability();
                },
                2500
            );
        }
        catch (error) {
            console.error(
                "RSVP submission error:",
                error
            );

            showFormMessage(
                error.message
                ||
                "Sorry, we could not save your RSVP. Please try again.",
                false
            );
        }
        finally {
            submitInFlight =
                false;

            updateSubmitAvailability();
        }
    }
);
