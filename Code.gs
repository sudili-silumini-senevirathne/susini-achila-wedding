// ==========================================================
// SUSINI & ACHILA
// WEDDING INVITATION - GOOGLE APPS SCRIPT
// ==========================================================
//
// GUESTS SHEET
// A = InvitationID
// B = GuestName
// C = MaxGuests
// D = InvitationLink
// E = RSVPStatus
// F = GuestsAttending
// G = RSVPMessage
// H = RSVPUpdatedAt
// I = WhatsAppShareLink
//
// RSVP SHEET
// A = Timestamp
// B = InvitationID
// C = GuestName
// D = MaxGuests
// E = Attendance
// F = NumberAttending
// G = Message
// ==========================================================


// ==========================================================
// 1. SETTINGS
// ==========================================================

const RSVP_SHEET_NAME =
  "RSVP";

const GUEST_SHEET_NAME =
  "Guests";

const SUMMARY_SHEET_NAME =
  "RSVP Summary";

const INVITATION_BASE_URL =
  "https://sudili-silumini-senevirathne.github.io/susini-achila-wedding/";

// The wedding date in the current project is already in the past.
// Therefore deadline enforcement is included but OFF by default so
// it does not block your testing. Change ENFORCE to true when needed.
const RSVP_DEADLINE = {
  ENFORCE: false,
  DATE: new Date("2027-04-30T23:59:59+05:30"),
  DISPLAY_TEXT: "Kindly RSVP by 30 April 2027."
};


// ==========================================================
// 2. GOOGLE SHEET MENU
// ==========================================================

function onOpen() {
  SpreadsheetApp
    .getUi()
    .createMenu("Wedding Tools")
    .addItem(
      "Generate Invitation Links",
      "generateInvitationLinks"
    )
    .addItem(
      "Refresh RSVP Summary",
      "refreshRsvpSummary"
    )
    .addToUi();
}


// ==========================================================
// 3. GET REQUEST
//
// /exec?action=guest&i=INVITATION_ID&callback=CALLBACK
// ==========================================================

function doGet(e) {
  try {
    const parameters =
      e && e.parameter
        ? e.parameter
        : {};

    const action =
      String(
        parameters.action || ""
      ).trim();

    if (action === "guest") {
      const invitationId =
        String(
          parameters.i || ""
        ).trim();

      const callback =
        String(
          parameters.callback || ""
        ).trim();

      if (!invitationId) {
        return jsonOrJsonp_(
          {
            success: false,
            message: "Invitation ID is missing."
          },
          callback
        );
      }

      const guest =
        findGuestByInvitationId_(
          invitationId
        );

      if (!guest) {
        return jsonOrJsonp_(
          {
            success: false,
            message: "Invalid invitation."
          },
          callback
        );
      }

      const rsvp =
        findRsvpByInvitationId_(
          invitationId
        );

      return jsonOrJsonp_(
        {
          success: true,
          invitationId: invitationId,
          guestName: guest.guestName,
          maxGuests: guest.maxGuests,
          rsvp: rsvp,
          deadline: getDeadlineInfo_()
        },
        callback
      );
    }

    return jsonResponse_(
      {
        success: true,
        message: "Wedding RSVP API is running."
      }
    );
  }
  catch (error) {
    return jsonResponse_(
      {
        success: false,
        message:
          error && error.message
            ? error.message
            : "Unexpected error."
      }
    );
  }
}


// ==========================================================
// 4. RECEIVE RSVP
//
// This returns a tiny HTML page inside the hidden iframe.
// The page uses postMessage() to give the website a REAL
// success/failure confirmation.
// ==========================================================

function doPost(e) {
  const lock =
    LockService.getScriptLock();

  let hasLock =
    false;

  const parameters =
    e && e.parameter
      ? e.parameter
      : {};

  const clientRequestId =
    cleanRequestId_(
      parameters.clientRequestId
    );

  try {
    hasLock =
      lock.tryLock(15000);

    if (!hasLock) {
      throw new Error(
        "The RSVP system is busy. Please try again."
      );
    }

    if (
      RSVP_DEADLINE.ENFORCE
      &&
      new Date().getTime()
        >
      RSVP_DEADLINE.DATE.getTime()
    ) {
      throw new Error(
        "RSVP is now closed."
      );
    }

    const invitationId =
      String(
        parameters.invitationId || ""
      ).trim();

    const attendance =
      String(
        parameters.attendance || ""
      ).trim();

    let numberAttending =
      parseInt(
        parameters.numberAttending,
        10
      );

    const message =
      cleanSheetText_(
        parameters.message,
        1000
      );

    if (!invitationId) {
      throw new Error(
        "Invitation ID is missing."
      );
    }

    const guest =
      findGuestByInvitationId_(
        invitationId
      );

    if (!guest) {
      throw new Error(
        "This invitation is not valid."
      );
    }

    if (
      attendance !== "Yes"
      &&
      attendance !== "No"
    ) {
      throw new Error(
        "Please select whether you will attend."
      );
    }

    if (attendance === "No") {
      numberAttending =
        0;
    }
    else {
      if (
        !Number.isInteger(
          numberAttending
        )
        ||
        numberAttending < 1
      ) {
        throw new Error(
          "Please select a valid number attending."
        );
      }

      if (
        numberAttending
          >
        guest.maxGuests
      ) {
        throw new Error(
          "Number attending exceeds the allowed guest limit."
        );
      }
    }

    const timestamp =
      new Date();

    saveOrUpdateRsvp_(
      {
        timestamp: timestamp,
        invitationId: invitationId,
        guestName: guest.guestName,
        maxGuests: guest.maxGuests,
        attendance: attendance,
        numberAttending: numberAttending,
        message: message
      }
    );

    updateGuestRsvpTracking_(
      guest.rowNumber,
      attendance,
      numberAttending,
      message,
      timestamp
    );

    refreshRsvpSummary();

    SpreadsheetApp.flush();

    return rsvpResultPage_(
      {
        type: "wedding-rsvp-result",
        requestId: clientRequestId,
        success: true,
        message: "RSVP saved successfully.",
        attendance: attendance,
        numberAttending: numberAttending,
        updatedAt: timestamp.toISOString()
      }
    );
  }
  catch (error) {
    console.error(error);

    return rsvpResultPage_(
      {
        type: "wedding-rsvp-result",
        requestId: clientRequestId,
        success: false,
        message:
          error && error.message
            ? error.message
            : "Your RSVP could not be saved."
      }
    );
  }
  finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}


// ==========================================================
// 5. FIND GUEST
// ==========================================================

function findGuestByInvitationId_(
  invitationId
) {
  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const guestSheet =
    spreadsheet.getSheetByName(
      GUEST_SHEET_NAME
    );

  if (!guestSheet) {
    throw new Error(
      'Guests sheet was not found.'
    );
  }

  ensureGuestSheetStructure_(
    guestSheet
  );

  const lastRow =
    guestSheet.getLastRow();

  if (lastRow < 2) {
    return null;
  }

  const rows =
    guestSheet
      .getRange(
        2,
        1,
        lastRow - 1,
        8
      )
      .getValues();

  for (
    let index = 0;
    index < rows.length;
    index++
  ) {
    const row =
      rows[index];

    const storedInvitationId =
      String(
        row[0] || ""
      ).trim();

    if (
      storedInvitationId
        !==
      invitationId
    ) {
      continue;
    }

    let maxGuests =
      parseInt(
        row[2],
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

    return {
      rowNumber: index + 2,
      invitationId: storedInvitationId,
      guestName:
        String(
          row[1] || ""
        ).trim(),
      maxGuests: maxGuests,
      rsvpStatus:
        String(
          row[4] || "Pending"
        ).trim(),
      guestsAttending:
        Number(
          row[5] || 0
        ),
      message:
        String(
          row[6] || ""
        ),
      updatedAt:
        row[7] || ""
    };
  }

  return null;
}


// ==========================================================
// 6. FIND EXISTING RSVP
// ==========================================================

function findRsvpByInvitationId_(
  invitationId
) {
  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      RSVP_SHEET_NAME
    );

  if (
    !sheet
    ||
    sheet.getLastRow() < 2
  ) {
    return {
      exists: false
    };
  }

  const rows =
    sheet
      .getRange(
        2,
        1,
        sheet.getLastRow() - 1,
        7
      )
      .getValues();

  for (
    let index = rows.length - 1;
    index >= 0;
    index--
  ) {
    const row =
      rows[index];

    if (
      String(
        row[1] || ""
      ).trim()
        !==
      invitationId
    ) {
      continue;
    }

    return {
      exists: true,
      attendance:
        String(
          row[4] || ""
        ).trim(),
      numberAttending:
        Number(
          row[5] || 0
        ),
      message:
        String(
          row[6] || ""
        ),
      updatedAt:
        row[0] instanceof Date
          ? row[0].toISOString()
          : String(row[0] || "")
    };
  }

  return {
    exists: false
  };
}


// ==========================================================
// 7. SAVE OR UPDATE RSVP
// ==========================================================

function saveOrUpdateRsvp_(data) {
  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  let sheet =
    spreadsheet.getSheetByName(
      RSVP_SHEET_NAME
    );

  if (!sheet) {
    sheet =
      spreadsheet.insertSheet(
        RSVP_SHEET_NAME
      );
  }

  ensureRsvpSheetStructure_(
    sheet
  );

  const lastRow =
    sheet.getLastRow();

  if (lastRow >= 2) {
    const ids =
      sheet
        .getRange(
          2,
          2,
          lastRow - 1,
          1
        )
        .getDisplayValues();

    for (
      let index = 0;
      index < ids.length;
      index++
    ) {
      if (
        String(
          ids[index][0] || ""
        ).trim()
          ===
        data.invitationId
      ) {
        sheet
          .getRange(
            index + 2,
            1,
            1,
            7
          )
          .setValues([
            [
              data.timestamp,
              data.invitationId,
              data.guestName,
              data.maxGuests,
              data.attendance,
              data.numberAttending,
              data.message
            ]
          ]);

        return;
      }
    }
  }

  sheet.appendRow([
    data.timestamp,
    data.invitationId,
    data.guestName,
    data.maxGuests,
    data.attendance,
    data.numberAttending,
    data.message
  ]);
}


// ==========================================================
// 8. UPDATE GUEST STATUS COLUMNS
// ==========================================================

function updateGuestRsvpTracking_(
  rowNumber,
  attendance,
  numberAttending,
  message,
  timestamp
) {
  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      GUEST_SHEET_NAME
    );

  ensureGuestSheetStructure_(
    sheet
  );

  const status =
    attendance === "Yes"
      ? "Attending"
      : "Not Attending";

  sheet
    .getRange(
      rowNumber,
      5,
      1,
      4
    )
    .setValues([
      [
        status,
        numberAttending,
        message,
        timestamp
      ]
    ]);
}


// ==========================================================
// 9. GENERATE INVITATION + WHATSAPP LINKS
// ==========================================================

function generateInvitationLinks() {
  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    spreadsheet.getSheetByName(
      GUEST_SHEET_NAME
    );

  if (!sheet) {
    spreadsheet.toast(
      'Please create a sheet named "Guests".',
      "Wedding Tools",
      5
    );

    return;
  }

  ensureGuestSheetStructure_(
    sheet
  );

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    spreadsheet.toast(
      "Please add at least one guest.",
      "Wedding Tools",
      5
    );

    return;
  }

  const rows =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        9
      )
      .getValues();

  const output =
    [];

  rows.forEach(
    function (row) {
      let invitationId =
        String(
          row[0] || ""
        ).trim();

      const guestName =
        String(
          row[1] || ""
        ).trim();

      let maxGuests =
        parseInt(
          row[2],
          10
        );

      const currentStatus =
        String(
          row[4] || "Pending"
        ).trim()
        ||
        "Pending";

      const currentGuestsAttending =
        Number(
          row[5] || 0
        );

      const currentMessage =
        String(
          row[6] || ""
        );

      const currentUpdatedAt =
        row[7] || "";

      if (!guestName) {
        output.push([
          invitationId,
          guestName,
          row[2],
          "",
          currentStatus,
          currentGuestsAttending,
          currentMessage,
          currentUpdatedAt,
          ""
        ]);

        return;
      }

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

      if (!invitationId) {
        invitationId =
          generateInvitationId_();
      }

      const encodedGuestName =
        Utilities.base64Encode(
          guestName,
          Utilities.Charset.UTF_8
        );

      const invitationLink =
        INVITATION_BASE_URL
        +
        "?i="
        +
        encodeURIComponent(
          invitationId
        )
        +
        "&n="
        +
        encodeURIComponent(
          encodedGuestName
        )
        +
        "&max="
        +
        encodeURIComponent(
          maxGuests
        );

      const whatsappMessage =
        "You are warmly invited to celebrate the wedding of Susini & Achila on 2027.05.16. "
        +
        "Your personal invitation: "
        +
        invitationLink;

      const whatsappLink =
        "https://wa.me/?text="
        +
        encodeURIComponent(
          whatsappMessage
        );

      output.push([
        invitationId,
        guestName,
        maxGuests,
        invitationLink,
        currentStatus,
        currentGuestsAttending,
        currentMessage,
        currentUpdatedAt,
        whatsappLink
      ]);
    }
  );

  sheet
    .getRange(
      2,
      1,
      output.length,
      9
    )
    .setValues(
      output
    );

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 3);
  sheet.setColumnWidth(4, 460);
  sheet.setColumnWidth(5, 130);
  sheet.setColumnWidth(6, 130);
  sheet.setColumnWidth(7, 260);
  sheet.setColumnWidth(8, 160);
  sheet.setColumnWidth(9, 460);

  refreshRsvpSummary();

  SpreadsheetApp.flush();

  spreadsheet.toast(
    output.length
      +
      " invitation link(s) and WhatsApp link(s) generated.",
    "Wedding Tools",
    5
  );
}


// ==========================================================
// 10. RSVP SUMMARY
// ==========================================================

function refreshRsvpSummary() {
  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  const guestSheet =
    spreadsheet.getSheetByName(
      GUEST_SHEET_NAME
    );

  if (!guestSheet) {
    return;
  }

  ensureGuestSheetStructure_(
    guestSheet
  );

  const lastRow =
    guestSheet.getLastRow();

  let totalInvitations =
    0;

  let totalInvitedSeats =
    0;

  let responses =
    0;

  let attendingInvitations =
    0;

  let notAttendingInvitations =
    0;

  let peopleAttending =
    0;

  if (lastRow >= 2) {
    const rows =
      guestSheet
        .getRange(
          2,
          1,
          lastRow - 1,
          8
        )
        .getValues();

    rows.forEach(
      function (row) {
        const guestName =
          String(
            row[1] || ""
          ).trim();

        if (!guestName) {
          return;
        }

        totalInvitations++;

        let maxGuests =
          parseInt(
            row[2],
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

        totalInvitedSeats +=
          maxGuests;

        const status =
          String(
            row[4] || "Pending"
          ).trim();

        if (status === "Attending") {
          responses++;
          attendingInvitations++;
          peopleAttending +=
            Math.max(
              0,
              Number(
                row[5] || 0
              )
            );
        }
        else if (
          status === "Not Attending"
        ) {
          responses++;
          notAttendingInvitations++;
        }
      }
    );
  }

  const pendingResponses =
    Math.max(
      0,
      totalInvitations - responses
    );

  let summarySheet =
    spreadsheet.getSheetByName(
      SUMMARY_SHEET_NAME
    );

  if (!summarySheet) {
    summarySheet =
      spreadsheet.insertSheet(
        SUMMARY_SHEET_NAME
      );
  }

  summarySheet.getDataRange().breakApart();
  summarySheet.clear();

  const summaryRows =
    [
      ["SUSINI & ACHILA - RSVP SUMMARY", ""],
      ["Last Updated", new Date()],
      ["Total Invitations", totalInvitations],
      ["Total Invited Seats", totalInvitedSeats],
      ["Responses Received", responses],
      ["Attending Invitations", attendingInvitations],
      ["Not Attending Invitations", notAttendingInvitations],
      ["Total People Attending", peopleAttending],
      ["Pending Responses", pendingResponses]
    ];

  summarySheet
    .getRange(
      1,
      1,
      summaryRows.length,
      2
    )
    .setValues(
      summaryRows
    );

  summarySheet
    .getRange("A1:B1")
    .merge()
    .setFontWeight("bold")
    .setFontSize(14);

  summarySheet
    .getRange("A2:A9")
    .setFontWeight("bold");

  summarySheet.setColumnWidth(1, 230);
  summarySheet.setColumnWidth(2, 180);
  summarySheet.setFrozenRows(1);
}


// ==========================================================
// 11. SHEET STRUCTURE
// ==========================================================

function ensureGuestSheetStructure_(sheet) {
  const headers =
    [
      "InvitationID",
      "GuestName",
      "MaxGuests",
      "InvitationLink",
      "RSVPStatus",
      "GuestsAttending",
      "RSVPMessage",
      "RSVPUpdatedAt",
      "WhatsAppShareLink"
    ];

  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ]);

  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setFontWeight(
      "bold"
    );

  sheet.setFrozenRows(1);
}

function ensureRsvpSheetStructure_(sheet) {
  const headers =
    [
      "Timestamp",
      "InvitationID",
      "GuestName",
      "MaxGuests",
      "Attendance",
      "NumberAttending",
      "Message"
    ];

  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ]);

  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setFontWeight(
      "bold"
    );

  sheet.setFrozenRows(1);
}


// ==========================================================
// 12. DEADLINE
// ==========================================================

function getDeadlineInfo_() {
  return {
    enabled:
      Boolean(
        RSVP_DEADLINE.ENFORCE
      ),
    closed:
      Boolean(
        RSVP_DEADLINE.ENFORCE
        &&
        new Date().getTime()
          >
        RSVP_DEADLINE.DATE.getTime()
      ),
    text:
      RSVP_DEADLINE.ENFORCE
        ? RSVP_DEADLINE.DISPLAY_TEXT
        : ""
  };
}


// ==========================================================
// 13. HELPERS
// ==========================================================

function generateInvitationId_() {
  return Utilities
    .getUuid()
    .replace(/-/g, "")
    .substring(0, 10)
    .toUpperCase();
}

function cleanSheetText_(
  value,
  maxLength
) {
  let text =
    String(
      value == null
        ? ""
        : value
    )
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
      " "
    )
    .trim();

  if (
    typeof maxLength === "number"
    &&
    maxLength > 0
  ) {
    text =
      text.substring(
        0,
        maxLength
      );
  }

  if (
    text.startsWith("=")
    ||
    text.startsWith("+")
    ||
    text.startsWith("-")
    ||
    text.startsWith("@")
  ) {
    text =
      "'" + text;
  }

  return text;
}

function cleanRequestId_(value) {
  return String(
    value || ""
  )
  .replace(
    /[^A-Za-z0-9_-]/g,
    ""
  )
  .substring(
    0,
    100
  );
}


// ==========================================================
// 14. JSON / JSONP
// ==========================================================

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}

function jsonOrJsonp_(
  data,
  callback
) {
  const json =
    JSON.stringify(data);

  if (callback) {
    if (
      !/^[A-Za-z_$][A-Za-z0-9_$]*$/
        .test(callback)
    ) {
      return ContentService
        .createTextOutput(
          "Invalid callback"
        )
        .setMimeType(
          ContentService.MimeType.TEXT
        );
    }

    return ContentService
      .createTextOutput(
        callback
        +
        "("
        +
        json
        +
        ");"
      )
      .setMimeType(
        ContentService.MimeType.JAVASCRIPT
      );
  }

  return jsonResponse_(data);
}


// ==========================================================
// 15. RELIABLE POST RESULT PAGE
// ==========================================================

function rsvpResultPage_(payload) {
  const safePayload =
    JSON.stringify(payload)
      .replace(
        /</g,
        "\\u003c"
      );

  const html =
    '<!doctype html>'
    +
    '<html><head><meta charset="utf-8"></head>'
    +
    '<body>'
    +
    '<script>'
    +
    'window.parent.postMessage('
    +
    safePayload
    +
    ', "*");'
    +
    '</script>'
    +
    '</body></html>';

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}
