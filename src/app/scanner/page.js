"use client";
import { useState } from 'react';
import { decode } from 'base-58';
import pako from 'pako';
import styles from './page.module.css';

export default function Scanner() {
  const [inputText, setInputText] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [scannedData, setScannedData] = useState(null);

  const handleInputChange = (event) => {
    setInputText(event.target.value);
  };

  const processScannedData = async () => {
    setUploadStatus("Processing data...");
    try {
      // Sanitize and decode
      const sanitizedInput = inputText.replace(/[^A-HJ-NP-Za-km-z1-9]/g, "");
      const decodedData = decode(sanitizedInput);
      
      // Decompress
      const decompressedData = pako.ungzip(decodedData, { to: 'string' });
      const parsedData = JSON.parse(decompressedData);

      // Handle both single and triple forms
      const dataArray = Array.isArray(parsedData) ? parsedData : [parsedData];
      setScannedData(dataArray);

      // Upload all entries
      await uploadFormData(dataArray);
      
      setInputText("");
      setUploadStatus("Data processed successfully!");
    } catch (error) {
      console.error("Processing error:", error);
      setUploadStatus(`Error: ${error.message}`);
    }
  };

  const uploadFormData = async (dataArray) => {
    try {
      for (const data of dataArray) {
        // Validate form type
        if (data.formType === 'tripleQualitative') {
          // Handle qualitative-specific validation
          if (data.team === undefined) {
            throw new Error("Invalid qualitative data format");
          }
        }

        const response = await fetch('/api/add-match-data', {
          method: "POST",
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  };

  return (
    <div className={styles.MainDiv}>
      <h2>FRC Scouting Data Upload</h2>

      <div className={styles.Intake}>
        <textarea
          value={inputText}
          onChange={handleInputChange}
          placeholder="Scan QR code here..."
          className={styles.textarea}
          rows="5"
        />
        <button 
          onClick={processScannedData} 
          className={styles.submitButton}
          disabled={!inputText}
        >
          Process Data
        </button>
      </div>

      <div className={styles.statusMessage}>{uploadStatus}</div>

      {scannedData && (
        <div className={styles.resultContainer}>
          <h3>Scanned Data Preview</h3>
          <div className={styles.dataGrid}>
            {scannedData.map((data, index) => (
              <div key={index} className={styles.dataCard}>
                <p><strong>Form Type:</strong> {data.formType || 'standard'}</p>
                <p><strong>Team:</strong> {data.team || 'N/A'}</p>
                <p><strong>Match:</strong> {data.match || 'N/A'}</p>
                <p><strong>Scout:</strong> {data.scoutname || 'Anonymous'}</p>
                {data.formType === 'tripleQualitative' && (
                  <>
                    <p><strong>Maneuverability:</strong> {data.coralspeed || 'N/A'}</p>
                    <p><strong>Defense:</strong> {data.defense ? "Yes" : "No"}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}