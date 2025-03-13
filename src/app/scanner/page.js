"use client";
import { useState } from 'react';
import { decode } from 'base-58'; // Assuming you're using 'base-58' package
import pako from 'pako'; // gzip library
import styles from './page.module.css';

export default function Scanner() {
  const [inputText, setInputText] = useState(""); // Text input state
  const [uploadStatus, setUploadStatus] = useState("");
  const [scannedData, setScannedData] = useState(null);

  // Handle the text box change
  const handleInputChange = (event) => {
    setInputText(event.target.value);
  };

  // Convert Base58 back to Uint8Array and un-gzip the data
  const handleBase58Submit = () => {
    setUploadStatus("Processing data...");
    try {
      // Sanitize the input by removing any non-Base58 characters (like newlines or spaces)
      const sanitizedInput = inputText.replace(/[^A-HJ-NP-Za-km-z1-9]/g, "");

      // Decode from Base58
      const decodedData = decode(sanitizedInput);

      // Un-gzip the decoded data
      const decompressedData = pako.ungzip(decodedData, { to: 'string' });

      // Parse the JSON from decompressed data
      const parsedData = JSON.parse(decompressedData);
      setScannedData(parsedData);

      // Upload the parsed data
      uploadFormData(parsedData);

      // Clear the input text after successful submission
      setInputText("");

    } catch (error) {
      console.error("Error processing data:", error);
      setUploadStatus("Error processing data. Please check the input.");
    }
  };

  // Upload the form data to your database
  const uploadFormData = async (data) => {
    setUploadStatus("Uploading data...");
    try {
      const response = await fetch('/api/add-match-data', {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Check if the response is not empty before calling response.json()
        const contentType = response.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          setUploadStatus(`Upload Status: ${errorData.message}`);
        } else {
          // If it's not JSON, assume the upload was successful
          setUploadStatus("Data uploaded successfully!");
        }
      } else {
        setUploadStatus("Upload failed. Server returned an error.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("Error uploading data. Please try again.");
    }
  };

  return (
    <div className={styles.MainDiv}>
      <h2>FRC Scouting Data Upload</h2>

      {/* Input field for Base58-encoded data */}
      <div className={styles.Intake}>
        <textarea
          value={inputText}
          onChange={handleInputChange}
          placeholder="Click text box and scan QR code!"
          className={styles.textarea}
        />
        <button onClick={handleBase58Submit} className={styles.submitButton}>
          Submit Base58 Data
        </button>
      </div>

      {/* Display the upload status */}
      <div className={styles.statusMessage}>{uploadStatus}</div>

      {scannedData && (
        <div className={styles.resultContainer}>
          <h2>Scanned Data</h2>
          <div className={styles.MatchInfo}>
            <p><strong>Team:</strong> {scannedData.team}</p>
            <p><strong>Match:</strong> {scannedData.match}</p>
            <p><strong>Scout:</strong> {scannedData.scoutname}</p>
            <p><strong>Timestamp:</strong> {new Date(scannedData.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
