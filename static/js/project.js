

import { toast, confirmBox, isMobile } from "./utils.js";

function htmlTitle(html) {
    const container = document.createElement("div");
    container.style.fontFamily = window.getComputedStyle(document.body).fontFamily;
    container.innerHTML = html;
    return container;
}


document.addEventListener("DOMContentLoaded", function () {

    document.querySelector(".project-form").addEventListener("submit", function (event) {
        var startDate = new Date(document.getElementById("start_date").value);
        var endDate = new Date(document.getElementById("end_date").value);
        if (startDate > endDate) {
            event.preventDefault();
            toast('End date must be after start date', 'error');
        }
    });
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    fetch(PROJECTS_URL)
        .then((response) => response.json())
        .then((data) => {
            let nodes = [];
            let edges = [];

            data.forEach((project) => {
                if (!project.tasks || project.tasks.length === 0) {
                    return;
                }
                let projectId = "p" + project.project_id;
                nodes.push({
                    id: projectId,
                    label: project.project_name,
                    title: htmlTitle(
                        "<span style='color: #e91e63;'><i class='fas fa-info-circle'></i> Project Description: " +
                        project.description +
                        "</span><br>" +
                        "<span style='color: #3f51b5;'><i class='fas fa-calendar-alt'></i> Start: " +
                        project.start +
                        "</span><br>" +
                        "<span style='color: #4caf50;'><i class='fas fa-calendar-check'></i> End: " +
                        project.end +
                        "</span><br>" +
                        `<span style="color: ${isDark ? '#f5f5f5' : '#000'};"><i class='fas fa-user'></i> Manager: ` +
                        project.manager +
                        "</span>",
                    ),
                    //title: "Project Description: " + project.description + "\nStart: " + project.start + "\nEnd: " + project.end + "\nManager: " + project.manager,
                    shape: "box",
                    color: "#a069ed",
                    font: { color: "#ffffff", size: 16 },
                    borderWidth: 2,
                    margin: 10,
                });

                project.tasks.forEach((task) => {
                    let taskId = "t" + task.task_id;
                    nodes.push({
                        id: taskId,
                        label: task.task_name,
                        title: htmlTitle(
                            "<span style='color: #e91e63;'><i class='fas fa-info-circle'></i> Task Description: " +
                            task.description +
                            "</span><br>" +
                            "<span style='color: #3f51b5;'><i class='fas fa-calendar-alt'></i> Deadline: " +
                            task.end +
                            "</span><br>" +
                            "<span style='color: " +
                            (task.status === "Completed"
                                ? "#4caf50"
                                : task.status === "Pending"
                                    ? "#ff9800"
                                    : "#2196f3") +
                            ";'><i class='fas fa-check'></i> Status: " +
                            task.status +
                            "</span>",
                        ),
                        shape: "box",
                        color:
                            task.status === "Completed"
                                ? "#4caf50"
                                : task.status === "Pending"
                                    ? "#ff9800"
                                    : "#2196f3",
                        font: { color: "#ffffff", size: 14 },
                        borderWidth: 1,
                    });
                    edges.push({
                        from: projectId,
                        to: taskId,
                        arrows: "to",
                        color: { color: "#848484" },
                        smooth: { enabled: true, type: "cubicBezier", roundness: 0.5 },
                    });
                });
            });

            let container = document.getElementById("projectGraph");
            let visData = {
                nodes: new vis.DataSet(nodes),
                edges: new vis.DataSet(edges),
            };

            let options = {
                layout: {
                    improvedLayout: true
                },
                physics: {
                    enabled: true,
                    solver: "forceAtlas2Based",
                    forceAtlas2Based: {
                        gravitationalConstant: -50,
                        centralGravity: 0.02,
                        springConstant: 0.02,
                        springLength: 40,
                        damping: 0.8,
                        avoidOverlap: 0.5
                    },
                    maxVelocity: 50,
                    minVelocity: 0.75,
                    timestep: 0.35
                },
                interaction: {
                    hover: true,
                    zoomView: isMobile(),
                    dragView: true
                },
                edges: {
                    smooth: {
                        type: "cubicBezier",
                        forceDirection: "horizontal",
                        roundness: 0.4
                    }
                }
            };
            // let options = { physics: { enabled: true }, interaction: { hover: true, zoomView: false, dragView: false } };

            let network = new vis.Network(container, visData, options);

            document.getElementById("resetLayoutBtn").addEventListener("click", function () {
                network.fit({
                    animation: {
                        duration: 800,
                        easingFunction: "easeInOutQuad",
                    },
                });
            });
        })
        .catch((error) => console.error("Error fetching project data:", error));
    document.querySelector("form").addEventListener("submit", function (event) {
        const startDate = new Date(document.getElementById("start_date").value);
        const endDate = new Date(document.getElementById("end_date").value);

        if (startDate > endDate) {
            event.preventDefault();
            toast('Start date cannot be after the end date', 'error');
            return;
        }
        toast('Project created successfully!', 'success');

    });
    document.querySelector(".projects-table").addEventListener("click", async function (event) {
        if (event.target.classList.contains("btn-neutral")) {
            const button = event.target;
            const row = button.closest("tr");
            const projectName = row.querySelector("td").innerText;
            event.target
                .closest("tr")
                .querySelectorAll("td:first-child, td:nth-child(2)")
                .forEach((td) => {
                    td.contentEditable = true;
                    td.classList.add("editable");
                });
            const firstEditableTd = row.querySelector("td.editable");
            if (firstEditableTd) {
                firstEditableTd.focus();
            }
            button.classList.replace("btn-neutral", "btn-success");
            button.textContent = "Save";
            // if click outside of the current row, cancel the edit
            function cleanUp() {
                row.querySelectorAll('.editable').forEach(td => {
                    td.contentEditable = false;
                    td.classList.remove('editable');
                });
                button.classList.replace('btn-success', 'btn-neutral');
                button.textContent = 'Edit';
                // capture:true so we fire before table’s own click handler
                document.removeEventListener('click', handleOutsideClick, true);
                document.removeEventListener('keydown', handleKeydown);
            }
            function handleOutsideClick(e) {
                if (row.contains(e.target)) return;
                cleanUp();
            }
            function handleKeydown(e) {
                if (e.key === 'Escape') {
                    cleanUp();
                }
            }
            document.addEventListener('click', handleOutsideClick, true);
            document.addEventListener('keydown', handleKeydown);

        }
        else if (event.target.classList.contains("btn-danger")) {
            const projectName = event.target.closest("tr").querySelector("td").innerText;
            if (!(await confirmBox(`Delete ${projectName}?`, 'Delete'))) {
                return;
            }
            fetch(DELETE_PROJECT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    project_id: event.target.closest("tr").dataset.projectId,
                }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        event.target.closest("tr").remove();
                        toast('Project deleted');
                    } else {
                        toast(`Failed to delete project\n${data.error}`, 'error');
                    }
                })
                .catch((error) => {
                    toast('Failed to delete project', 'error');
                });
        }
        else if (event.target.classList.contains("btn-success")) {
            event.target
                .closest("tr")
                .querySelectorAll("td.editable")
                .forEach((td) => {
                    td.contentEditable = false;
                    td.classList.remove("editable");
                });
            event.target.innerText = "Edit";
            event.target.classList.remove("btn-success");
            event.target.classList.add("btn-neutral");
            const updatedProjectName = event.target.closest("tr").querySelector("td").innerText;
            const updatedDescription = event.target.closest("tr").querySelector("td:nth-child(2)").innerText;
            const project_id = event.target.closest("tr").dataset.projectId;
            fetch(EDIT_PROJECT_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    project_name: updatedProjectName,
                    description: updatedDescription,
                    project_id: project_id,
                }),
            })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        toast('Project updated');
                    } else {
                        toast(`Failed to update project\n${data.error}`, 'error');
                    }
                })
                .catch((error) => {
                    console.error("Error:", error);
                    toast('Failed to update project', 'error');
                });
        }

    });
});