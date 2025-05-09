import { toast } from "./utils.js";

document.addEventListener("DOMContentLoaded", function () {
    var calendarEl = document.getElementById("eventCalendar");

    var isMobile = window.innerWidth < 768;
    var defaultView = isMobile ? "listWeek" : "dayGridMonth";

    var headerConfig = isMobile
        ? { left: "prev,next", right: "today" }
        : { left: "title", right: "prev,next,dayGridMonth,timeGridWeek,timeGridDay,listWeek" };

    var calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: defaultView,
        headerToolbar: headerConfig,

        events: GET_EVENTS_URL,
        height: "auto",
        // eventClick: function (info) {
        //     if (info.event.extendedProps.description && info.event.extendedProps.approved_by_username) {
        //         alert("Description: " + info.event.extendedProps.description);
        //     }
        // },
        eventContent: function (arg) {
            let eventTitle = document.createElement("div");
            eventTitle.classList.add("fc-event-title");
            eventTitle.innerText = arg.event.title;

            let eventRequestedby = document.createElement("div");
            eventRequestedby.classList.add("fc-event-requestedby");
            eventRequestedby.innerText = "Requested by: " + arg.event.extendedProps.requested_by_username;

            let eventApprovedby = document.createElement("div");
            eventApprovedby.classList.add("fc-event-approvedby");
            eventApprovedby.id = arg.event.extendedProps.event_id;
            eventApprovedby.innerText = arg.event.extendedProps.approved_by_username
                ? "Approved by: " + arg.event.extendedProps.approved_by_username
                : "Pending approval";
            let userRole = USER_ROLE;
            if (!arg.event.extendedProps.approved_by_username && ["Admin", "Manager"].includes(userRole)) {
                let approveButton = document.createElement("button");
                approveButton.innerText = "Approve";
                approveButton.classList.add("fc-approve-btn");
                approveButton.onclick = function () {
                    approveEvent(arg.event.extendedProps.event_id, approveButton);
                };
                return { domNodes: [eventTitle, eventRequestedby, eventApprovedby, approveButton] };
            }
            return { domNodes: [eventTitle, eventRequestedby, eventApprovedby] };
        },
        eventDidMount: function (info) {
            if (info.event.extendedProps.description) {
                tippy(info.el, {
                    content: "Description: " + info.event.extendedProps.description,
                    placement: "top",
                    arrow: true,
                });
            }
        },
    });

    calendar.render();
    document.querySelector("form.event-form").addEventListener("submit", function (event) {
        const eventDate = new Date(document.getElementById("event_date").value);
        const today = new Date();

        if (eventDate < today) {
            event.preventDefault();
            toast("Event date cannot be in the past.", "error");
            return;
        }
        toast("Event created successfully!", "success");
    });
});
function approveEvent(eventId, button) {
    fetch(`${APPROVE_EVENT_URL_BASE}/${eventId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                button.innerText = "✅ Approved";
                let approvedByElement = document.getElementById(eventId);
                approvedByElement.innerText = "Approved by: " + CURRENT_USERNAME;
                button.disabled = true;
                button.classList.add("approved");
                toast("Event approved successfully!", "success");
            } else {
                toast(`Failed to approve the event.\n${data.error}`, "error");
            }
            console.log("Response data:", data);
        })
        .catch((error) => {
            console.error("Error approving event:", error);
            toast("An error occurred while approving the event.", "error");
        });
}