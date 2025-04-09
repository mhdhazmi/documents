"use client";

import { FormEvent, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function App() {
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const sendPDF = useMutation(api.messages.sendPDF);

  const PDFInput = useRef<HTMLInputElement>(null);
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null);

  const [name] = useState(() => "User " + Math.floor(Math.random() * 10000));
  async function handleSendPDF(event: FormEvent) {
    event.preventDefault();

    // Step 1: Get a short-lived upload URL
    const postUrl = await generateUploadUrl();
    // Step 2: POST the file to the URL
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": selectedPDF!.type },
      body: selectedPDF,
    });
    const { storageId } = await result.json();
    // Step 3: Save the newly allocated storage id to the database
    await sendPDF({ storageId, author: name });

    setSelectedPDF(null);
    PDFInput.current!.value = "";
  }
  return (
    <form onSubmit={handleSendPDF}>
      <input
        type="file"
        accept="pdf/*"
        ref={PDFInput}
        onChange={(event) => setSelectedPDF(event.target.files![0])}
        disabled={selectedPDF !== null}
      />
      <input
        type="submit"
        value="Send File"
        disabled={selectedPDF === null}
      />
    </form>
  );
}