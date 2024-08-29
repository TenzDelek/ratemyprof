"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello, I am Rate My Professor Support Assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const sendMessage = async () => {
    if (message.trim() === "") return; // Prevent sending empty messages
    setLoading(true);
    setMessage("");
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", content: message },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([...messages, { role: "user", content: message }]),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };


  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !loading) {
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <h1 className="text-2xl font-bold text-center py-4 bg-blue-500 text-white">
        Search For Professor of Your Type
      </h1>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`${
                message.role === "user" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block p-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-black"
                }`}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-left">
              <div className="inline-block p-2 rounded-lg bg-gray-200 text-black animate-pulse">
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 bg-white">
        <div className="flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            className="flex-1 text-black p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
