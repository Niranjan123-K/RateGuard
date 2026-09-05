import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

function App() {

    const [events, setEvents] = useState([]);

    const allowedCount = events.filter(
        event => event.status === "ALLOWED"
    ).length;

    const blockedCount = events.filter(
        event => event.status === "BLOCKED"
    ).length;

    const totalCount = events.length;

    useEffect(() => {

    // Load previous request history from MySQL
    fetch("http://localhost:8080/api/analytics/history")
        .then(response => response.json())
        .then(data => {
            setEvents(data.reverse());
        })
        .catch(error => {
            console.error("Failed to load history:", error);
        });

    const client = new Client({

        webSocketFactory: () =>
            new SockJS("http://localhost:8080/ws"),

        onConnect: () => {

            console.log("WebSocket connected!");

            client.subscribe(
                "/topic/rate-limit-events",
                (message) => {

                    const event = JSON.parse(message.body);

                    console.log("Received:", event);

                    setEvents((prev) => [
                        event,
                        ...prev
                    ]);
                }
            );
        },

        onStompError: (frame) => {
            console.error("STOMP error:", frame);
        }
    });

    client.activate();

    return () => {
        client.deactivate();
    };

}, []);

    return (
        <div className="dashboard">

            <div className="header">
                <h1>RateGuard Dashboard</h1>
                <p>Real-time API Rate Limiting Monitor</p>
            </div>

            <div className="stats">

                <div className="card">
                    <h3>Total Requests</h3>
                    <p>{totalCount}</p>
                </div>

                <div className="card">
                    <h3>Allowed</h3>
                    <p>{allowedCount}</p>
                </div>

                <div className="card">
                    <h3>Blocked</h3>
                    <p>{blockedCount}</p>
                </div>

            </div>

            <div className="events">

                <h2>Request Events</h2>

                {events.length === 0 ? (
                    <p>No events yet...</p>
                ) : (
                    events.map((event, index) => (

                        <div className="event" key={index}>

                            <span
                                className={`status ${
                                    event.status === "ALLOWED"
                                        ? "allowed"
                                        : "blocked"
                                }`}
                            >
                                {event.status}
                            </span>

                            <span>
                                {event.endpoint}
                            </span>

                            <span>
                                {event.clientId}
                            </span>

                        </div>

                    ))
                )}

            </div>

        </div>
    );
}

export default App;