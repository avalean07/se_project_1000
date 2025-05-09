import { toast } from "./utils.js";

document.addEventListener("DOMContentLoaded", function () {

    var taskCalendarEl = document.getElementById("taskCalendar");

    var isMobile = window.innerWidth < 768;
    var defaultView = isMobile ? "listWeek" : "dayGridMonth";

    var headerConfig = isMobile
        ? { left: "prev,next", right: "today" }
        : { left: "title", right: "prev,next,dayGridMonth,timeGridWeek,timeGridDay,listWeek" };
    var taskCalendar = new FullCalendar.Calendar(taskCalendarEl, {
        initialView: defaultView,
        headerToolbar: headerConfig,
        height: "auto",
        events: GET_TASKS_URL,

        eventDidMount: function (info) {
            if (info.event.extendedProps.description) {
                tippy(info.el, {
                    content: "Description: " + info.event.extendedProps.description,
                    placement: "top",
                    arrow: true,
                });
            }
        },
        eventContent: function (arg) {
            let title = document.createElement("div");
            title.classList.add("fc-event-title");
            title.innerText = arg.event.title;

            let assignedTo = document.createElement("div");
            assignedTo.classList.add("fc-event-requestedby");
            assignedTo.innerText = "Assigned to you";

            let status = document.createElement("div");
            status.classList.add("fc-event-approvedby");
            status.innerText = "Status: " + arg.event.extendedProps.status;

            return { domNodes: [title, assignedTo, status] };
        },
        // eventClick: function (info) {
        //     if (info.event.extendedProps.description) {
        //         alert("Description: " + info.event.extendedProps.description);
        //     }
        // }
    });

    taskCalendar.render();

    document.querySelector("form.task-form").addEventListener("submit", function (event) {
        const deadline = new Date(document.getElementById("deadline").value);
        const today = new Date();

        if (deadline < today) {
            event.preventDefault();
            toast("Deadline cannot be in the past.", "error");
            return;
        }
        toast("Task added successfully!", "success");
    });
});